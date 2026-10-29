#!/usr/bin/env python3
"""第七讲 D25：LangExtract（提交 3a68580）在古汉语与日文史料上的实际对齐，默认分词与按字分词各一次。

模型：Qwen3-4B-Instruct-2507 Q4_K_M（与讲义 4.2 同一文件），经 llama-cpp-python 0.3.36 包成 LangExtract 的自定义模型类，
      以 JSON 模式生成（response_format=json_object，对应 Ollama provider 的 format=json），温度 0。
输入：甲 《宋史·王珪传》选段（讲义附录练习材料一，维基文库录文）；乙 『大日本史料』9-1 本文第 1 页（讲义 @fig-dnsr 所录綱文与史料节录）。
示例：各取一条输入之外的原文（王安石传首句；『新増補浮世絵類考』豐國条一句）。
对每份输入：先以 UnicodeTokenizer、max_char_buffer=200 分块调用模型一次（第一次尝试以 1000 字一块、上限 3072 词元，
输出被截断、整块丢弃，记录另存 d25_attempt1_truncated.log）；再把同一批模型抽取分别用 RegexTokenizer（默认）与
UnicodeTokenizer 对全文重新对齐（resolver.WordAligner），记录每项的 alignment_status 与 char_interval。用法：python3 run_d25_langextract.py <gguf> <输出目录>
"""
import json, sys, time, hashlib, os, collections
import langextract as lx
from langextract.core import base_model, types as core_types, tokenizer as tk, data
from langextract import resolver as RES
from llama_cpp import Llama

GGUF, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
llm = Llama(model_path=GGUF, n_ctx=8192, n_threads=2, seed=20261028, verbose=False)
CACHE = {}

class LlamaCppModel(base_model.BaseLanguageModel):
    def infer(self, batch_prompts, **kw):
        for p in batch_prompts:
            if p not in CACHE:
                t0 = time.time()
                r = llm.create_chat_completion(messages=[{"role": "user", "content": p}], temperature=0, seed=20261028,
                                               max_tokens=2048, response_format={"type": "json_object"})
                CACHE[p] = {"output": r["choices"][0]["message"]["content"], "finish_reason": r["choices"][0]["finish_reason"],
                            "usage": r["usage"], "seconds": round(time.time() - t0, 1)}
            yield [core_types.ScoredOutput(score=1.0, output=CACHE[p]["output"])]

PROMPT = ("从史料原文中按出现顺序抽取人物、地点、官职、时间。extraction_text 必须照录原文中的字，不改字、不意译、不重叠；"
          "attributes 中写 refers_to（所指，原文未明示时写 null）。")
EX_ZH = lx.data.ExampleData(text="王安石，字介甫，撫州臨川人。", extractions=[
    lx.data.Extraction("人物", "王安石", attributes={"refers_to": "王安石"}),
    lx.data.Extraction("人物", "介甫", attributes={"refers_to": "王安石（字）"}),
    lx.data.Extraction("地点", "撫州臨川", attributes={"refers_to": None})])
EX_JA = lx.data.ExampleData(text="天保十五辰年師の名を繼て一陽齋豐國と號す", extractions=[
    lx.data.Extraction("时间", "天保十五辰年", attributes={"refers_to": None}),
    lx.data.Extraction("人物", "師", attributes={"refers_to": None}),
    lx.data.Extraction("人物", "一陽齋豐國", attributes={"refers_to": None})])

INPUTS = {
 "songshi_wanggui": (open(os.path.join(os.path.dirname(__file__), "input_songshi_wanggui.txt"), encoding="utf8").read().strip(), [EX_ZH]),
 "dnsr_9-1_p1": (open(os.path.join(os.path.dirname(__file__), "input_dnsr_p1.txt"), encoding="utf8").read().strip(), [EX_JA]),
}
TOKS = {"RegexTokenizer（默认）": tk.RegexTokenizer(), "UnicodeTokenizer（按字）": tk.UnicodeTokenizer()}
summary = {"langextract_commit": "3a68580", "model_sha256": hashlib.sha256(open(GGUF, "rb").read()).hexdigest(), "max_char_buffer": 200, "runs": []}
for name, (text, ex) in INPUTS.items():
    t0 = time.time()
    res = lx.extract(text_or_documents=text, prompt_description=PROMPT, examples=ex, model=LlamaCppModel(),
                     tokenizer=tk.UnicodeTokenizer(), extraction_passes=1, max_workers=1, max_char_buffer=200, show_progress=False,
                     fence_output=False, use_schema_constraints=False)
    model_secs = round(time.time() - t0, 1)
    base = [(e.extraction_class, e.extraction_text, e.attributes) for e in res.extractions]
    for tname, tok in TOKS.items():
        exs = [data.Extraction(c, t, attributes=a) for c, t, a in base]
        out = RES.WordAligner().align_extractions([exs], text, tokenizer_impl=tok)
        rows = []
        for e in out[0]:
            ci = e.char_interval
            rows.append({"class": e.extraction_class, "text": e.extraction_text, "attributes": e.attributes,
                         "status": e.alignment_status.value if e.alignment_status else None,
                         "start": ci.start_pos if ci else None, "end": ci.end_pos if ci else None,
                         "source_span": text[ci.start_pos:ci.end_pos] if ci and ci.start_pos is not None else None})
        dist = collections.Counter(r["status"] or "无位置" for r in rows)
        run = {"input": name, "tokenizer": tname, "input_chars": len(text), "model_seconds": model_secs,
               "n_tokens_input": len(tok.tokenize(text).tokens), "status_distribution": dict(dist), "extractions": rows}
        summary["runs"].append(run)
        print(name, tname, "词元数", run["n_tokens_input"], len(rows), dict(dist), flush=True)
summary["model_calls"] = [{"prompt_chars": len(k), **v} for k, v in CACHE.items()]
json.dump(summary, open(os.path.join(OUT, "d25_langextract_run_20261028.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
