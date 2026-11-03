#!/usr/bin/env python3
"""第八周 D18、D22：用本地开源模型（tools/local-llm，Qwen3-4B-Instruct-2507 Q4_K_M）实际运行一次，保存运行记录供课件回放。
用法：python3 run_llm_w8.py geo|chrono <文本 JSON：{"title","text","ref"}> <输出 JSON>
geo：从史料中找出指地点的词，给出原文引句、今地与坐标、误差半径（照 His-Geo“坐标附最大误差”的设计）。
chrono：把史料中的事件排成年表，每行附原文引句与原文中的纪年写法、模型换算的公元年。
需先起服务：sh tools/local-llm/serve.sh &"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / 'tools/local-llm'))
from llmrun import chat, record

GEO = ('下面是一段宋代史料。请找出其中所有指称地点的词语（包括州县、地区、山川、国名），逐一列出。\n'
       '每一项给出：name（原文写法）、quote（含该词的原文短句，逐字照抄）、kind（“地名”“政区”“国名或族名”“封号或爵号中的地名”之一）、'
       'modern（今地，不确定就写“不详”）、lat、lng（十进制度数，WGS 84）、radius_km（你对这个坐标把握的误差半径，公里）。\n'
       '只输出 JSON：{"places": [ ... ]}。\n\n史料：\n')
CHRONO = ('下面是一段宋代史料。请把其中提到的事件排成一张年表，按时间先后。\n'
          '每一行给出：date_raw（原文中的纪年写法，原文没有写年份就写“原文未记”）、year_ad（换算的公元年，整数；无法确定就写 null）、'
          'event（用一句话概括事件）、quote（支持这一行的原文短句，逐字照抄）。\n'
          '只输出 JSON：{"rows": [ ... ]}。\n\n史料：\n')

def parse_lenient(text):
    """取第一个 { 到最后一个 }；若回复因词元上限被截断，只保留截断前完整的各行，并注明 truncated。"""
    t = text[text.find('{'): text.rfind('}') + 1]
    try: return json.loads(t)
    except Exception as e:
        s = text[text.find('{'):]; k = s.rfind('},')
        while k > 0:
            try:
                r = json.loads(s[:k + 1] + ']}'); r['truncated'] = True; r['parse_note'] = '回复在词元上限处被截断，只保留截断前完整的各项（原错误：' + str(e) + '）'; return r
            except Exception: k = s.rfind('},', 0, k)
        return {'parse_error': str(e)}

def main():
    task, src, out = sys.argv[1], json.loads(pathlib.Path(sys.argv[2]).read_text(encoding='utf-8')), sys.argv[3]
    prompt = (GEO if task == 'geo' else CHRONO) + src['text']
    # 不用 response_format（llama.cpp 的 JSON 语法约束在 CPU 上很慢）；提示已要求只输出 JSON，这里取第一个 { 到最后一个 }。
    c = chat([{'role': 'user', 'content': prompt}], max_tokens=1800)
    t = c['text']; t = t[t.find('{'): t.rfind('}') + 1]
    parsed = parse_lenient(c['text'])
    record([c], out, kind='llm-' + task, source={k: src[k] for k in ('title', 'ref') if k in src}, prompt=prompt, parsed=parsed)
    print(json.dumps(parsed, ensure_ascii=False)[:1500])

if __name__ == '__main__':
    if sys.argv[1] == 'reparse':  # 重新解析已有运行记录：python3 run_llm_w8.py reparse <运行记录>
        p = pathlib.Path(sys.argv[2]); r = json.loads(p.read_text(encoding='utf-8')); r['parsed'] = parse_lenient(r['calls'][0]['text']); p.write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8'); print({k: (len(v) if isinstance(v, list) else v) for k, v in r['parsed'].items()})
    else: main()
