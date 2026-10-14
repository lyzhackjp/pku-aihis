"""Loopback-only preview; local originals and weights stay outside the repository."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,unquote
import argparse,json
APP=Path(__file__).resolve().parents[1]
COURSE=APP.parents[2]
LOCAL=COURSE/'第五周/demo/修订_20261013'
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,url):
  path=unquote(urlsplit(url).path)
  if path.startswith('/local-materials/'):
   key=path.removeprefix('/local-materials/')
   if key not in ('shide.pdf','acton.pdf','ogai.pdf'):return str(LOCAL/'not-found')
   return str(LOCAL/'本地原件'/key)
  if path.startswith('/models/'):
   name=path.removeprefix('/models/');p=(LOCAL/'模型/cached'/name).resolve();root=(LOCAL/'模型/cached').resolve()
   if not p.is_relative_to(root):return str(LOCAL/'not-found')
   return str(p)
  return super().translate_path(url)
 def log_message(self,format,*args):
  # Serve paths only; never capture file contents, API keys, or model payloads.
  if len(args)>1 and str(args[1]) not in ('200','304'):super().log_message(format,*args)
 def end_headers(self):
  self.send_header('Cache-Control','no-cache')
  super().end_headers()
if __name__=='__main__':
 import functools
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8775);a=p.parse_args()
 handler=functools.partial(Handler,directory=str(APP/'www'))
 print('Fifth-week local preview: http://127.0.0.1:%s/pku-aihis/week05/'%a.port,flush=True)
 ThreadingHTTPServer(('127.0.0.1',a.port),handler).serve_forever()
