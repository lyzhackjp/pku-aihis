#!/usr/bin/env python3
"""给步数用完、未自行收尾的智能体运行记录补一步“据已有输出作答”（与 agent.py 中的收尾步相同），不重跑前面各步。
用法：python3 agent_finish.py <运行记录.json> --workdir <原工作目录>"""
import argparse, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from llmrun import chat

a = argparse.ArgumentParser(); a.add_argument('rec'); a.add_argument('--workdir', required=True); a.add_argument('--max-tokens', type=int, default=700)
x = a.parse_args()
p = pathlib.Path(x.rec); r = json.loads(p.read_text(encoding='utf-8'))
if r.get('final') or any(s.get('forced_final') for s in r['calls']): sys.exit('已有最终回答')
msgs = [{'role': 'system', 'content': r['system']}, {'role': 'user', 'content': r['task'] + '\n\n工作目录中的文件：' + '、'.join(sorted(q.name for q in pathlib.Path(x.workdir).iterdir()))}]
for s in r['calls']:
    res = s.get('result') or {}
    fed = (res.get('stdout', '')[-2500:] + ('\n' + res.get('stderr', '')[-800:] if res.get('stderr') else '')).strip()
    msgs += [{'role': 'assistant', 'content': s['reply']}, {'role': 'user', 'content': f'运行结果（返回码 {res.get("returncode")}）：\n{fed}'}]
msgs.append({'role': 'user', 'content': '步数已用完。请不要再写代码，只根据以上实际运行得到的输出，以“最终回答：”开头给出结论；没有算出的数字不要写。'})
c = chat(msgs, max_tokens=x.max_tokens)
r['calls'].append({'step': len(r['calls']) + 1, 'reply': c['text'], 'usage': c['usage'], 'seconds': c['seconds'], 'forced_final': True, 'note': '补跑于原记录之后（agent_finish.py）'})
r['final'] = c['text']; r['finished'] = False
p.write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8'); print(c['text'][:600])
