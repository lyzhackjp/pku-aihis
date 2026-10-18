"""Protocol-only surrogate. No model import, download, loading, or OCR inference."""
import base64,io,json,tempfile,unittest,sys
from pathlib import Path
from PIL import Image
from server import process_request,parse_reply,save_log,Engine,MANIFEST,PROMPTS,ORIGINS,verify_model,make_handler,ThreadingHTTPServer
class ProtocolSurrogate:
 backend='test-surrogate-only'
 def __init__(self,raw='[{"bbox":[0,0,28,28],"category":"Text","text":"protocol fixture"}]'):self.raw=raw
 def infer(self,*args):return {'raw':self.raw}
class Protocol(unittest.TestCase):
 def request(self,mode='layout_all'):
  out=io.BytesIO();Image.new('RGB',(40,60),'white').save(out,format='PNG')
  return {'image_b64':base64.b64encode(out.getvalue()).decode(),'prompt_mode':mode,'page_id':'protocol-unit-test','max_new_tokens':32}
 def test_success_coordinate_restoration_and_prompt(self):
  r=process_request(self.request(),ProtocolSurrogate());self.assertTrue(r['ok']);self.assertEqual(r['backend'],'test-surrogate-only');self.assertEqual(r['prompt_text'],PROMPTS['layout_all']);self.assertEqual(r['regions'][0]['bbox'],[0,0,20,20]);self.assertEqual(r['image']['width'],40)
 def test_malformed_json_is_preserved(self):
  r=process_request(self.request(),ProtocolSurrogate('```json\n[]\n```'));self.assertFalse(r['ok']);self.assertEqual(r['error'],'parse_error');self.assertEqual(r['raw'],'```json\n[]\n```')
 def test_hash_mismatch_and_unloaded(self):
  q=self.request();q['image_sha256']='a'*64;r=process_request(q,ProtocolSurrogate());self.assertEqual(r['error'],'bad_image');r=process_request(self.request(),Engine(Path('/not-present'),'cpu'));self.assertEqual(r['error'],'not_loaded')
 def test_ocr_only_plaintext(self):
  r=process_request(self.request('ocr_only'),ProtocolSurrogate('plain text'));self.assertTrue(r['ok']);self.assertEqual(r['regions'][0]['bbox'],[0,0,40,60])
 def test_reject_invalid_category(self):
  r=process_request(self.request(),ProtocolSurrogate('[{"bbox":[0,0,1,1],"category":"Invented"}]'));self.assertEqual(r['error'],'parse_error')
 def test_logs_exclude_image(self):
  with tempfile.TemporaryDirectory() as tmp:
   q=self.request();r=process_request(q,ProtocolSurrogate());save_log(Path(tmp),q,r);f=next(Path(tmp).rglob('*.json'));content=f.read_text();self.assertNotIn('image_b64',content);self.assertIn(r['image']['sha256'],content)
 def test_http_unloaded_and_cors(self):
  import threading,urllib.request,urllib.error
  with tempfile.TemporaryDirectory() as tmp:
   http=ThreadingHTTPServer(('127.0.0.1',0),make_handler(Engine(Path('/not-present'),'cpu'),Path(tmp)))
   thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
   url='http://127.0.0.1:'+str(http.server_port)
   opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
   try:
    with opener.open(url+'/health') as r:self.assertFalse(json.load(r)['loaded'])
    req=urllib.request.Request(url+'/health',headers={'Origin':'https://example.invalid'})
    with self.assertRaises(urllib.error.HTTPError) as caught:opener.open(req)
    self.assertEqual(caught.exception.code,403)
    req=urllib.request.Request(url+'/parse',data=json.dumps(self.request()).encode(),headers={'Content-Type':'application/json','Origin':'http://127.0.0.1:8776'})
    with self.assertRaises(urllib.error.HTTPError) as caught:opener.open(req)
    self.assertEqual(json.loads(caught.exception.read())['error'],'not_loaded')
    self.assertEqual(len(list(Path(tmp).rglob('*.json'))),1)
   finally:http.shutdown();http.server_close();thread.join()
 def test_pinned_source_and_loopback_contract(self):
  self.assertEqual(len(MANIFEST['revision']),40);self.assertTrue(any(x['path'].endswith('.safetensors') for x in MANIFEST['files']));self.assertTrue(any(x['path']=='modeling_dots_ocr.py' for x in MANIFEST['files']));self.assertNotIn('*',ORIGINS);self.assertIn('https://lyzhackjp.github.io',ORIGINS)
  with tempfile.TemporaryDirectory() as tmp:self.assertRaises(ValueError,verify_model,Path(tmp))
if __name__=='__main__':unittest.main(verbosity=2)
