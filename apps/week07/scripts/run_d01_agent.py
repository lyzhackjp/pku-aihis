#!/usr/bin/env python3
"""第七讲 D01：让一个智能体经 CBDB 公共接口“查一下王珪”，完整记录一次实际运行。

模型：Qwen3-4B-Instruct-2507，GGUF Q4_K_M（与讲义 4.2 同一文件），llama-cpp-python 0.3.36，CPU 2 线程，温度 0。
工具：cbdb_search_by_name(name)、cbdb_get_person(person_id)。对应的接口地址为
      https://cbdb.fas.harvard.edu/cbdbapi/person.php（o=json）。本机运行时接口对脚本请求返回 403（第一次尝试，记录另存），
      因此工具回放 2026-10-28 11:49 用 curl 正常请求所得的原始返回（RAW_DIR 中的文件），原样交给模型（超长时截断并在记录中注明）；
      预存范围外的查询如实返回“未预存”。教师电脑上可设 LIVE=1 直接请求接口。
提示格式：Qwen3 官方聊天模板的工具调用写法（<tools> 定义，模型输出 <tool_call>{json}</tool_call>）。
用法：python3 run_d01_agent.py <gguf 路径> <输出 json>
"""
import json, sys, time, hashlib, urllib.parse, urllib.request, re, platform

MODEL, OUT = sys.argv[1], sys.argv[2]
API = "https://cbdb.fas.harvard.edu/cbdbapi/person.php"
MAX_TOOL_CHARS = 6000  # 交给模型的接口返回上限（上下文 8192 词元）；原样全文另存记录
SEED, N_CTX, MAX_TURNS = 20261028, 8192, 6

SYSTEM = "你是一个帮助历史研究者查询资料的智能体。需要时调用工具查询中国历代人物传记资料库（CBDB），再根据查询结果用中文回答。"
USER = "我在读《宋史》，想了解神宗朝宰相王珪的生平。请去中国历代人物传记资料库（CBDB）查一下王珪，告诉我他的籍贯、生卒年和主要任官。"
TOOLS = [
    {"type": "function", "function": {"name": "cbdb_search_by_name", "description": "按人名查询 CBDB，返回机器可读的人物记录（JSON）。",
        "parameters": {"type": "object", "properties": {"name": {"type": "string", "description": "人名，如“王安石”"}}, "required": ["name"]}}},
    {"type": "function", "function": {"name": "cbdb_get_person", "description": "按 CBDB 人物编号查询完整的人物记录（JSON）。",
        "parameters": {"type": "object", "properties": {"person_id": {"type": "integer", "description": "CBDB 人物编号"}}, "required": ["person_id"]}}},
]

import os
RAW_DIR = os.environ.get("RAW_DIR", "")
LIVE = os.environ.get("LIVE") == "1"
def call_api(name, args):
    q = {"name": args["name"], "o": "json"} if name == "cbdb_search_by_name" else {"id": str(args["person_id"]), "o": "json"}
    url = API + "?" + urllib.parse.urlencode(q)
    t0 = time.time()
    if LIVE:
        with urllib.request.urlopen(url, timeout=60) as r: raw = r.read().decode("utf8")
        return url, raw, round(time.time() - t0, 2), "live"
    f = os.path.join(RAW_DIR, "name_wanggui.json" if q.get("name") == "王珪" else f"cbdb_{q.get('id')}.json")
    raw = open(f, encoding="utf8").read() if os.path.exists(f) and os.path.getsize(f) else '{"note": "该查询不在本次预存的接口返回中"}'
    return url, raw, 0.0, "replay:" + os.path.basename(f)

def prompt(msgs):
    tools = "\n".join(json.dumps(t, ensure_ascii=False) for t in TOOLS)
    s = ("<|im_start|>system\n" + SYSTEM + "\n\n# Tools\n\nYou may call one or more functions to assist with the user query.\n\n"
         "You are provided with function signatures within <tools></tools> XML tags:\n<tools>\n" + tools + "\n</tools>\n\n"
         "For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n"
         "<tool_call>\n{\"name\": <function-name>, \"arguments\": <args-json-object>}\n</tool_call><|im_end|>\n")
    for m in msgs:
        if m["role"] == "tool":
            s += "<|im_start|>user\n<tool_response>\n" + m["content"] + "\n</tool_response><|im_end|>\n"
        else:
            s += f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n"
    return s + "<|im_start|>assistant\n"

from llama_cpp import Llama, __version__ as LV
sha = hashlib.sha256(open(MODEL, "rb").read()).hexdigest()
llm = Llama(model_path=MODEL, n_ctx=N_CTX, n_threads=2, seed=SEED, verbose=False)
rec = {"purpose": "第七讲 D01：智能体经 CBDB 接口查“王珪”的一次实际运行",
       "date": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "model": {"file": MODEL.split("/")[-1], "sha256": sha, "runtime": f"llama-cpp-python {LV}", "n_threads": 2, "n_ctx": N_CTX, "temperature": 0, "seed": SEED},
       "machine": platform.platform(), "tool_mode": "live" if LIVE else "replay of curl responses fetched 2026-10-28 11:49 +08:00", "system": SYSTEM, "user": USER, "tools": TOOLS, "max_tool_chars": MAX_TOOL_CHARS, "steps": []}
msgs = [{"role": "user", "content": USER}]
t_all = time.time()
for turn in range(MAX_TURNS):
    p = prompt(msgs)
    t0 = time.time()
    out = llm.create_completion(p, max_tokens=1024, temperature=0, seed=SEED, stop=["<|im_end|>"])
    text = out["choices"][0]["text"]
    step = {"turn": turn + 1, "prompt_tokens": out["usage"]["prompt_tokens"], "completion_tokens": out["usage"]["completion_tokens"],
            "seconds": round(time.time() - t0, 1), "assistant_raw": text, "tool_calls": []}
    msgs.append({"role": "assistant", "content": text})
    calls = re.findall(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", text, re.S)
    if not calls:
        rec["steps"].append(step); rec["final_answer"] = text.strip(); break
    for c in calls:
        try:
            j = json.loads(c); url, raw, sec, how = call_api(j["name"], j["arguments"])
            given = raw if len(raw) <= MAX_TOOL_CHARS else raw[:MAX_TOOL_CHARS]
            step["tool_calls"].append({"call": j, "url": url, "http_seconds": sec, "source": how, "response_chars": len(raw), "truncated_for_model": len(raw) > MAX_TOOL_CHARS,
                                       "response_raw": raw})
            msgs.append({"role": "tool", "content": given})
        except Exception as e:
            step["tool_calls"].append({"call_raw": c, "error": repr(e)}); msgs.append({"role": "tool", "content": "ERROR: " + repr(e)})
    rec["steps"].append(step)
else:
    rec["final_answer"] = None; rec["note"] = f"达到 {MAX_TURNS} 轮上限仍未给出最终回答"
rec["total_seconds"] = round(time.time() - t_all, 1)
json.dump(rec, open(OUT, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(json.dumps({k: rec[k] for k in ("total_seconds",)}, ensure_ascii=False))
for s in rec["steps"]:
    print("—— 第", s["turn"], "轮", s["seconds"], "秒"); print(s["assistant_raw"][:1500])
    for c in s["tool_calls"]: print("   工具：", c.get("url"), c.get("response_chars"), "字符")
