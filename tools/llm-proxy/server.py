#!/usr/bin/env python3
"""Candidate, explicit loopback proxy. Keys and bodies are never logged."""
import argparse
import json
import re
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit
from pathlib import Path

PRESETS = json.loads((Path(__file__).resolve().parents[2] / 'modules/history-demo/ocr/api-presets.json').read_text())
OFFICIAL = {p['baseUrl'].rstrip('/') + ('/messages' if p['protocol']=='anthropic' else '/chat/completions') for p in PRESETS if p['id'] not in ('local','custom','qwen')}

def official_target(url):
    parts=urlsplit(url)
    return not(parts.username or parts.password or parts.query or parts.fragment) and (url in OFFICIAL or bool(re.fullmatch(r'https://[a-zA-Z0-9-]+\.cn-beijing\.maas\.aliyuncs\.com/compatible-mode/v1/chat/completions',url)))

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        return None

class Handler(BaseHTTPRequestHandler):
    server_version='Week06LocalProxy/1'
    def log_message(self,*args):
        pass
    def reply(self,status,body):
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8')
        if self.headers.get('Origin')==self.server.allowed_origin:self.send_header('Access-Control-Allow-Origin',self.server.allowed_origin)
        self.send_header('Vary','Origin');self.end_headers();self.wfile.write(body)
    def do_OPTIONS(self):
        if self.headers.get('Origin')!=self.server.allowed_origin:return self.reply(403,b'{"error":"origin denied"}')
        self.send_response(204);self.send_header('Access-Control-Allow-Origin',self.server.allowed_origin);self.send_header('Access-Control-Allow-Methods','POST');self.send_header('Access-Control-Allow-Headers','Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access');self.end_headers()
    def do_POST(self):
        if self.path!='/forward' or self.headers.get('Origin')!=self.server.allowed_origin:return self.reply(403,b'{"error":"origin/path denied"}')
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=32*1024*1024:raise ValueError('request size refused')
            data=json.loads(self.rfile.read(size));target=data['target']
            if target not in self.server.targets or not official_target(target):raise ValueError('target not selected at startup')
            headers={'Content-Type':'application/json'}
            for key in ['Authorization','x-api-key','anthropic-version']:
                if self.headers.get(key):headers[key]=self.headers[key]
            payload=data['payload']
            if payload.get('stream') is True:raise ValueError('this teaching proxy uses non-stream responses')
            request=urllib.request.Request(target,data=json.dumps(payload).encode(),headers=headers,method='POST')
            try:
                with urllib.request.build_opener(NoRedirect()).open(request,timeout=180) as response:
                    self.reply(response.status,response.read(32*1024*1024))
            except urllib.error.HTTPError as e:
                self.reply(e.code,e.read(32*1024*1024))
        except (ValueError,KeyError,json.JSONDecodeError) as e:
            self.reply(400,json.dumps({'error':str(e)}).encode())
        except Exception as e:
            self.reply(502,json.dumps({'error':type(e).__name__,'detail':'upstream connection failed; request body and keys are not logged'}).encode())

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow',action='append',required=True,help='Exact official endpoint selected by teacher; repeat for multiple providers')
    parser.add_argument('--origin',default='http://127.0.0.1:8776');parser.add_argument('--port',type=int,default=8796)
    args=parser.parse_args()
    if not all(official_target(url) for url in args.allow):parser.error('Only registered official endpoints are allowed')
    if urlsplit(args.origin).hostname not in ('127.0.0.1','localhost','::1'):parser.error('Origin must be loopback')
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler);server.targets=set(args.allow);server.allowed_origin=args.origin
    print('Week06 proxy listening on loopback; no request, response or key logging.');server.serve_forever()
if __name__=='__main__':main()
