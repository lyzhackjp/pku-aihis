#!/usr/bin/env python3
"""接口测试替身（仅供自动验收，不是模型）：在 127.0.0.1 上模拟 OpenAI 兼容的 /v1/chat/completions。
按提示类型返回固定写法的回复：A 型 persons、B 型 mentions/events、LangExtract 的 extractions（在本块原文中找固定词表）。
用于检查页面的请求组装、回复解析、schema 校验、对齐与写入证据表；验收记录中一律标为“接口测试替身”，不得当作模型实测。
用法：python3 fake_openai_server.py [端口，默认 11499]"""
import json, re, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 11499
WORDS = [("人物", "王珪"), ("人物", "禹玉"), ("地点", "成都華陽"), ("人物", "曾祖永"), ("官职", "右補闕"), ("时间", "熙寧三年"), ("官职", "參知政事"),
         ("人物", "足利義尹"), ("地点", "和泉堺"), ("人物", "大内義興"), ("人物", "九州大樹"), ("时间", "八日"), ("人物", "畠山尾州"), ("人物", "王安石"), ("人物", "介甫"), ("地点", "撫州臨川")]
LOG = []

def reply(messages):
    user = "\n".join(m["content"] if isinstance(m["content"], str) else "" for m in messages if m["role"] == "user")
    if "Examples" in user and "Q:" in user:  # LangExtract 提示：最后一个 Q: 之后是本块原文
        chunk = user.rsplit("Q:", 1)[1].rsplit("A:", 1)[0]
        ex = [{c: w, f"{c}_attributes": {"refers_to": None}} for c, w in WORDS if w in chunk]
        return json.dumps({"extractions": ex}, ensure_ascii=False)
    text = user.split("原文：\n", 1)[-1]
    if "persons" in user or "生年（birth_year" in user:
        return json.dumps({"persons": [{"name": "王珪", "aliases": ["禹玉"], "native_place": "成都華陽", "birth_year": 1000, "death_year": 1085,
                                        "offices": [{"title": "參知政事", "year": 1053}, {"title": "右補闕", "year": 1053}]}]}, ensure_ascii=False)
    ms = [{"surface": w, "entity_type": c, "refers_to": None, "evidence": next((s for s in re.split(r"(?<=[。、，])", text) if w in s), w), "basis": "原文直接记载"} for c, w in WORDS if w in text]
    return json.dumps({"mentions": ms, "events": [{"who": "王珪", "what": "拜參知政事", "when_text": "熙寧三年", "when_ce": 1070, "where": None, "evidence": "熙寧三年，拜參知政事。", "basis": "推定"}] if "熙寧三年" in text else []}, ensure_ascii=False)

class H(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Headers", "*"); self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        LOG.append({"path": self.path, "model": body.get("model"), "response_format": body.get("response_format"), "max_tokens": body.get("max_tokens") or body.get("max_completion_tokens"), "temperature": body.get("temperature")})
        content = reply(body.get("messages", []))
        out = {"id": "test-double", "object": "chat.completion", "created": int(time.time()), "model": body.get("model", "test-double"),
               "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
               "usage": {"prompt_tokens": sum(len(str(m.get("content", ""))) for m in body.get("messages", [])), "completion_tokens": len(content), "total_tokens": 0}}
        data = json.dumps(out, ensure_ascii=False).encode()
        self.send_response(200); self.cors(); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        data = json.dumps(LOG, ensure_ascii=False).encode()
        self.send_response(200); self.cors(); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(data)
    def log_message(self, *a): pass

ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
