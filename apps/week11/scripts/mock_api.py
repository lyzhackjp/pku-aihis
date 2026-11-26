#!/usr/bin/env python3
"""本机模拟接口（只回固定文字，不是模型）｜第十周课前运行面板的失败续跑测试用｜2026-11-16
用法：python3 apps/week10/scripts/mock_api.py [端口，默认 8790] [--fail-every N]
OpenAI 兼容 /v1/chat/completions；每第 N 次请求返回 500，用来测"失败—续跑"。允许跨源（课件在 8780 端口）。
请求里的 Authorization 头只用于检查"带了 Key"，不打印、不记录。"""
import sys, json, http.server
PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8790
FAIL = int(sys.argv[sys.argv.index('--fail-every') + 1]) if '--fail-every' in sys.argv else 0
N = {'n': 0}
class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    def do_OPTIONS(self): self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
        N['n'] += 1
        if FAIL and N['n'] % FAIL == 0:
            self.send_response(500); self._cors(); self.end_headers(); self.wfile.write(b'{"error":{"message":"mock failure"}}'); return
        user = body.get('messages', [{}])[-1].get('content', '')
        reply = f'（模拟接口固定回答，第 {N["n"]} 次；提示 {len(user)} 字）\n| 编号 | 甲本文字 | 乙本文字 | 类型 |\n|---|---|---|---|\n| 1 | zu sagen | mitzuteilen | 改 |\n| 2 | （无） | vom Dienst | 增 |'
        out = {'id': f'mock-{N["n"]}', 'model': 'mock-model', 'choices': [{'index': 0, 'message': {'role': 'assistant', 'content': reply}, 'finish_reason': 'stop'}], 'usage': {'prompt_tokens': len(user), 'completion_tokens': len(reply)}}
        self.send_response(200); self._cors(); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(json.dumps(out, ensure_ascii=False).encode())
    def log_message(self, *a): pass
print(f'mock api on http://127.0.0.1:{PORT}/v1  fail-every={FAIL}'); http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
