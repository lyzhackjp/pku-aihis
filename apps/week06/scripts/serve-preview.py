"""Loopback preview. Private files are read by an explicit allowlist outside Git."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,unquote
import json,argparse,functools,hashlib
APP=Path(__file__).resolve().parents[1];COURSE=APP.parents[2]
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  path=urlsplit(self.path).path
  if path=='/local-materials/manifest':
   try:
    fixed=json.loads((COURSE/'第六周/demo/codex/fixed-values.json').read_text());items=[]
    for id in ['shide','ogai']:
     spec=fixed['files'][id+'_png'];items.append({'id':id,'image':{'name':id,'sha256':spec['sha256'],'width':spec['size'][0],'height':spec['size'][1],'source':{'material_id':id,'identity':spec['identity'],'page_systems':{'位置':spec['identity']}},'local_only':True},'image_url':'/local-materials/'+id+'_png','xml_url':'/local-materials/'+id+'_xml'})
    body=json.dumps(items,ensure_ascii=False).encode();self.send_response(200);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
   except Exception:return self.send_error(404)
  return super().do_GET()
 def translate_path(self,url):
  path=unquote(urlsplit(url).path)
  if path.startswith('/local-materials/'):
   key=path.split('/')[-1]
   if key not in ('shide_png','shide_xml','ogai_png','ogai_xml','ogai2_xml'):return str(APP/'not-found')
   data=json.loads((COURSE/'第六周/demo/codex/fixed-values.json').read_text());return str(COURSE/data['files'][key]['path'])
  rel='/pku-aihis/week06/' if path=='/' else path
  candidate=(APP/'www'/rel.lstrip('/')).resolve();base=(APP/'www').resolve()
  return str(candidate) if candidate.is_relative_to(base) else str(base/'not-found')
 def end_headers(self):
  self.send_header('Cache-Control','no-store');super().end_headers()
 def log_message(self,*args):pass
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8776);a=p.parse_args();print(f'http://127.0.0.1:{a.port}/pku-aihis/week06/?local=1',flush=True)
 ThreadingHTTPServer(('127.0.0.1',a.port),functools.partial(Handler,directory=str(APP/'www'))).serve_forever()
