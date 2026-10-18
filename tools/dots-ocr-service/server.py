"""候选，未经教师确认。Offline, loopback-only dots.ocr service; never downloads weights."""
from __future__ import annotations
import argparse, base64, hashlib, io, json, multiprocessing as mp, os, queue, re, threading, time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from resize import smart_resize

HERE = Path(__file__).resolve().parent
COURSE = HERE.parents[2]
MANIFEST = json.loads((HERE / 'model-manifest.json').read_text())
PROMPTS = json.loads((HERE / 'prompts.json').read_text())
CATEGORIES = ['Caption','Footnote','Formula','List-item','Page-footer','Page-header','Picture','Section-header','Table','Text','Title']
ORIGINS = {'http://127.0.0.1:8776','http://localhost:8776','http://127.0.0.1:3336','http://localhost:3336','https://lyzhackjp.github.io'}
MAX_BODY = 32 * 1024 * 1024
def now(): return datetime.now(timezone.utc).isoformat()

def verify_model(path):
    """Verify all pinned files before executing any model code. No network fallback."""
    for entry in MANIFEST['files']:
        f = path / entry['path']
        if not f.is_file(): raise ValueError('missing model file: ' + entry['path'])
        h = hashlib.sha256()
        with f.open('rb') as stream:
            for chunk in iter(lambda:stream.read(1024 * 1024), b''): h.update(chunk)
        if h.hexdigest() != entry['sha256']: raise ValueError('sha256 mismatch: ' + entry['path'])
    # Every executable Python file must be pinned as well.
    pinned = {x['path'] for x in MANIFEST['files']}
    if any(str(f.relative_to(path)) not in pinned for f in path.rglob('*.py')):
        raise ValueError('unverified Python source in model directory')

def model_worker(path, device, commands, replies):
    os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
    try:
        verify_model(Path(path))
        import torch
        from PIL import Image
        from transformers import AutoModelForCausalLM, AutoProcessor
        if device == 'mps' and not torch.backends.mps.is_available(): raise RuntimeError('MPS unavailable')
        dtype = torch.float32  # Conservative candidate; no untested bfloat16 claim.
        model = AutoModelForCausalLM.from_pretrained(path, local_files_only=True, trust_remote_code=True,
                torch_dtype=dtype, attn_implementation='eager').to(device).eval()
        processor = AutoProcessor.from_pretrained(path, local_files_only=True, trust_remote_code=True)
        replies.put({'ready':True, 'backend':'transformers-'+device, 'device':device, 'dtype':'float32'})
    except Exception as exc:
        replies.put({'ready':False,'error':str(exc)}); return
    while True:
        job = commands.get()
        if job is None: return
        try:
            img = Image.open(io.BytesIO(job['image'])).convert('RGB')
            messages = [{'role':'user','content':[{'type':'image','image':img},{'type':'text','text':job['prompt']}]}]
            text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            inputs = processor(text=[text], images=[img], padding=True, return_tensors='pt').to(device)
            with torch.inference_mode(): ids = model.generate(**inputs, max_new_tokens=job['max_new_tokens'], do_sample=False)
            trimmed = [out[len(inp):] for inp,out in zip(inputs.input_ids,ids)]
            raw = processor.batch_decode(trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
            replies.put({'raw':raw})
        except Exception as exc:
            replies.put({'error':'oom' if 'out of memory' in str(exc).lower() else 'inference_error','detail':str(exc)})

class Engine:
    def __init__(self, model_dir, device, load=False, timeout=180):
        self.loaded=False; self.loading=False; self.error=None; self.backend='not_loaded'
        self.device='none'; self.dtype='none'; self.started_at=now(); self.timeout=timeout
        self.lock=threading.Lock(); self.process=None
        if load:
            self.loading=True
            self.commands=mp.Queue(); self.replies=mp.Queue()
            self.process=mp.Process(target=model_worker,args=(str(model_dir),device,self.commands,self.replies),daemon=True)
            self.process.start(); threading.Thread(target=self._watch_load,daemon=True).start()
    def _watch_load(self):
        try:
            result=self.replies.get(timeout=900); self.loaded=result.get('ready',False)
            if self.loaded:
                self.backend=result['backend']; self.device=result['device']; self.dtype=result['dtype']
            else: self.error=result.get('error','model worker exited')
        except queue.Empty: self.error='model load timeout'; self.process.terminate()
        finally: self.loading=False
    def health(self):
        return {'ok':True,'model':MANIFEST['model'],'revision':MANIFEST['revision'],'backend':self.backend,
                'device':self.device,'dtype':self.dtype,'loaded':self.loaded,'loading':self.loading,
                'started_at':self.started_at,'version':'week06-dots-1','error':self.error}
    def infer(self,image,prompt,max_new_tokens):
        if not self.loaded: return {'error':'not_loaded','detail':self.error or '模型尚未加载'}
        if not self.lock.acquire(blocking=False): return {'error':'busy','detail':'正在处理另一请求'}
        try:
            self.commands.put({'image':image,'prompt':prompt,'max_new_tokens':max_new_tokens})
            try: return self.replies.get(timeout=self.timeout)
            except queue.Empty:
                self.process.terminate(); self.process.join(5); self.loaded=False; self.error='timeout'
                return {'error':'timeout','detail':'推理超时，工作进程已终止；重新启动服务后再运行'}
        finally: self.lock.release()

def parse_reply(raw, mode, width, height, resized):
    if mode == 'ocr_only': return [{'bbox':[0,0,width,height],'category':'Text','text':raw,'order':0}]
    obj=json.loads(raw)  # Do not remove fences, repair, or guess malformed JSON.
    if not isinstance(obj,list): raise ValueError('expected the official layout array')
    sx,sy=width/resized[0],height/resized[1]; result=[]
    for i,r in enumerate(obj):
        box=r.get('bbox'); cat=r.get('category')
        if cat not in CATEGORIES or not isinstance(box,list) or len(box)!=4: raise ValueError('invalid category or bbox')
        if any(not isinstance(v,(int,float)) or not __import__('math').isfinite(v) for v in box): raise ValueError('nonfinite coordinates')
        x,y,x2,y2=box
        if x2<x or y2<y: raise ValueError('negative extent')
        text=r.get('text')
        if text is not None and not isinstance(text,str): raise ValueError('invalid text')
        result.append({'bbox':[x*sx,y*sy,(x2-x)*sx,(y2-y)*sy],'category':cat,'text':text,'order':i})
    return result

def process_request(request,engine):
    start=time.monotonic(); stamp=now(); mode=request.get('prompt_mode'); raw=''
    result={'ok':False,'raw':'','started_at':stamp,'model':MANIFEST['model'],'revision':MANIFEST['revision'],'backend':engine.backend,'prompt_mode':mode}
    try:
        if mode not in PROMPTS: raise ValueError('invalid prompt_mode')
        tokens=request.get('max_new_tokens',8192)
        if type(tokens) is not int or not 1<=tokens<=32768: raise ValueError('invalid max_new_tokens')
        from PIL import Image, ImageOps
        Image.MAX_IMAGE_PIXELS=40_000_000
        encoded=request['image_b64']
        if encoded.startswith('data:'): encoded=encoded.split(',',1)[1]
        data=base64.b64decode(encoded,validate=True); sha=hashlib.sha256(data).hexdigest()
        if request.get('image_sha256') and request['image_sha256']!=sha: raise ValueError('image_sha256 mismatch')
        with Image.open(io.BytesIO(data)) as source:
            if source.format not in ('PNG','JPEG'): raise ValueError('only PNG/JPEG supported')
            # Keep original pixel-coordinate system: do not silently apply EXIF rotations.
            img=source.convert('RGBA'); base=Image.new('RGBA',img.size,'white');base.alpha_composite(img);img=base.convert('RGB')
        w,h=img.size; rh,rw=smart_resize(h,w)
        resized=img.resize((rw,rh)); buf=io.BytesIO();resized.save(buf,format='PNG')
        result.update(image={'sha256':sha,'width':w,'height':h,'scale':min(rw/w,rh/h),'scale_x':rw/w,'scale_y':rh/h,'resized_width':rw,'resized_height':rh},prompt_text=PROMPTS[mode])
    except Exception as exc:
        result.update(error='bad_image',detail=str(exc));result['elapsed_ms']=round((time.monotonic()-start)*1000);return result
    answer=engine.infer(buf.getvalue(),PROMPTS[mode],tokens);raw=answer.get('raw','');result['raw']=raw
    if 'error' in answer: result.update(error=answer['error'],detail=answer.get('detail',''))
    else:
        try: result.update(ok=True,regions=parse_reply(raw,mode,w,h,(rw,rh)))
        except Exception as exc: result.update(error='parse_error',detail=str(exc))
    result['elapsed_ms']=round((time.monotonic()-start)*1000);return result

def save_log(root,request,result):
    day=datetime.now().strftime('%Y-%m-%d'); dest=root/day;dest.mkdir(parents=True,exist_ok=True)
    page=re.sub(r'[^\w.-]','_',str(request.get('page_id','page')))[:100]
    mode=re.sub(r'[^\w.-]','_',str(request.get('prompt_mode','invalid')))[:32]
    name=f'{page}-{mode}-{time.time_ns()}.json'
    metadata={k:v for k,v in request.items() if k!='image_b64'}
    metadata['image_sha256']=result.get('image',{}).get('sha256',request.get('image_sha256'))
    # Exclusive creation; logs contain replies, never the input image or a secret.
    with (dest/name).open('x',encoding='utf-8') as f: json.dump({'request':metadata,'response':result},f,ensure_ascii=False,indent=2)

def make_handler(engine,log_root):
    class Handler(BaseHTTPRequestHandler):
        def allowed(self): return self.headers.get('Origin') in ORIGINS or not self.headers.get('Origin')
        def reply(self,status,data):
            body=json.dumps(data,ensure_ascii=False).encode();self.send_response(status)
            origin=self.headers.get('Origin')
            if origin in ORIGINS: self.send_header('Access-Control-Allow-Origin',origin);self.send_header('Vary','Origin')
            self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        def do_OPTIONS(self):
            if not self.allowed(): return self.reply(403,{'ok':False,'error':'origin_denied'})
            self.send_response(204);self.send_header('Access-Control-Allow-Origin',self.headers.get('Origin',''))
            self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS');self.send_header('Access-Control-Allow-Headers','Content-Type');self.send_header('Access-Control-Allow-Private-Network','true');self.end_headers()
        def do_GET(self):
            if not self.allowed(): return self.reply(403,{'ok':False,'error':'origin_denied'})
            self.reply(200,engine.health()) if self.path=='/health' else self.reply(404,{'ok':False,'error':'not_found'})
        def do_POST(self):
            if not self.allowed(): return self.reply(403,{'ok':False,'error':'origin_denied'})
            if self.path!='/parse': return self.reply(404,{'ok':False,'error':'not_found'})
            request={}
            try:
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=MAX_BODY: return self.reply(413,{'ok':False,'error':'bad_image','detail':'request too large or empty'})
                request=json.loads(self.rfile.read(length))
                if not isinstance(request,dict): raise ValueError('request must be an object')
                result=process_request(request,engine)
            except Exception as exc: result={'ok':False,'error':'bad_image','detail':str(exc),'raw':''};request={}
            save_log(log_root,request,result);self.reply(200 if result['ok'] else 400,result)
        def log_message(self,*args): pass
    return Handler

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=int(os.getenv('WEEK06_DOTS_PORT','8786')))
    p.add_argument('--model-dir',type=Path,default=COURSE/'第六周/demo/模型/dots.ocr');p.add_argument('--device',choices=['cpu','mps'],default='cpu')
    p.add_argument('--load',action='store_true',help='Load already present, verified files; never download')
    p.add_argument('--log-dir',type=Path,default=COURSE/'第六周/demo/运行记录/dots');p.add_argument('--timeout',type=int,default=180);a=p.parse_args()
    engine=Engine(a.model_dir,a.device,a.load,a.timeout)
    print(f'dots.ocr service http://127.0.0.1:{a.port}; model loading requested: {a.load}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',a.port),make_handler(engine,a.log_dir)).serve_forever()
