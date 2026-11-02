#!/usr/bin/env python3
"""课程通用的模型调用与运行记录（只用标准库）。
连接任何 OpenAI 兼容的 /v1/chat/completions：本目录 serve.sh 起的 llama.cpp 服务、课程 Ollama（127.0.0.1:11435/v1）、或云端 API。
每次调用写一份运行记录：请求（不含密钥）、原始回复、usage、用时、模型文件 SHA-256（本地模型时）、日期。

作为库：  from llmrun import chat, record
作为命令：python3 llmrun.py --prompt-file p.txt [--system s.txt] [--json] --out run.json
环境变量：LLM_BASE（默认 http://127.0.0.1:8090/v1）、LLM_MODEL（默认 qwen3-4b-instruct-2507）、LLM_KEY（云端 API 时用，不写入记录）。"""
import argparse, datetime, json, os, pathlib, time, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
BASE = os.environ.get('LLM_BASE', 'http://127.0.0.1:8090/v1').rstrip('/')
MODEL = os.environ.get('LLM_MODEL', 'qwen3-4b-instruct-2507')

def chat(messages, *, temperature=0, max_tokens=1024, json_mode=False, base=None, model=None, timeout=1800, **extra):
    body = {'model': model or MODEL, 'messages': messages, 'temperature': temperature, 'max_tokens': max_tokens, **extra}
    if json_mode: body['response_format'] = {'type': 'json_object'}
    req = urllib.request.Request((base or BASE) + '/chat/completions', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + os.environ['LLM_KEY']} if os.environ.get('LLM_KEY') else {})})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r: resp = json.loads(r.read())
    return {'request': body, 'response': resp, 'text': resp['choices'][0]['message'].get('content') or '', 'usage': resp.get('usage'), 'seconds': round(time.time() - t0, 1)}

def model_identity(model=None):
    m = json.loads((HERE / 'models.json').read_text()).get(model or MODEL)
    return {'key': model or MODEL, 'file': m['file'], 'sha256': m['sha256'], 'runtime': 'llama-cpp-python 0.3.36（llama_cpp.server）'} if m else {'key': model or MODEL, 'note': '非本目录登记的本地模型'}

def record(calls, out, **meta):
    rec = {'date': datetime.datetime.now().astimezone().isoformat(timespec='seconds'), 'endpoint': BASE, 'model': model_identity(), 'calls': calls, **meta}
    pathlib.Path(out).write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding='utf-8'); return rec

if __name__ == '__main__':
    a = argparse.ArgumentParser(); a.add_argument('--prompt-file', required=True); a.add_argument('--system'); a.add_argument('--json', action='store_true'); a.add_argument('--max-tokens', type=int, default=1024); a.add_argument('--out', required=True)
    x = a.parse_args(); msgs = ([{'role': 'system', 'content': pathlib.Path(x.system).read_text()}] if x.system else []) + [{'role': 'user', 'content': pathlib.Path(x.prompt_file).read_text()}]
    c = chat(msgs, json_mode=x.json, max_tokens=x.max_tokens); record([c], x.out); print(c['text'])
