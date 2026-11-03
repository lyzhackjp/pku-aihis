#!/usr/bin/env python3
"""课程通用的最小智能体：模型写 Python，代码在本机子进程中运行（有超时、限定工作目录），结果回给模型，直到给出最终回答。
不依赖模型的工具调用格式（小模型常不稳定），只约定两种回复：```python …``` 代码块，或以“最终回答：”开头的文字。
每一步（提示、模型原样回复、执行的代码、标准输出与错误、用时）都写进运行记录，供课件“保存结果回放”。

用法：python3 agent.py --task task.md --workdir 目录 --out run.json [--max-steps 6]
工作目录里放任务要用的数据文件；代码只能读写该目录（以 cwd 运行；本脚本不做系统级沙箱，只在教学环境中使用）。"""
import argparse, json, pathlib, re, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from llmrun import chat, record

SYSTEM = ('你是协助历史研究者做数据分析的助手。你可以编写 Python 代码，代码会在一个工作目录中运行，你会看到输出。'
          '每次回复只做一件事：要么给出一个 ```python 代码块（用 print 输出你需要看的结果），要么以“最终回答：”开头给出结论。'
          '结论中的每个数字都必须来自你实际运行得到的输出；没有运行过的，不要写。可用的库：Python 标准库' + '、networkx' + '。')

def run_code(code, workdir, timeout=120):
    t0 = time.time()
    p = subprocess.run([sys.executable, '-I', '-c', code], cwd=workdir, capture_output=True, text=True, timeout=timeout)
    return {'stdout': p.stdout[-6000:], 'stderr': p.stderr[-3000:], 'returncode': p.returncode, 'seconds': round(time.time() - t0, 2)}

def main():
    a = argparse.ArgumentParser(); a.add_argument('--task', required=True); a.add_argument('--workdir', required=True); a.add_argument('--out', required=True); a.add_argument('--max-steps', type=int, default=6); a.add_argument('--max-tokens', type=int, default=900)
    x = a.parse_args(); task = pathlib.Path(x.task).read_text(encoding='utf-8')
    msgs = [{'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': task + '\n\n工作目录中的文件：' + '、'.join(sorted(p.name for p in pathlib.Path(x.workdir).iterdir()))}]
    steps, final = [], None
    for i in range(x.max_steps):
        c = chat(msgs, max_tokens=x.max_tokens); text = c['text']; step = {'step': i + 1, 'reply': text, 'usage': c['usage'], 'seconds': c['seconds']}
        m = re.search(r'```python\s*(.*?)```', text, re.S)
        if not m and '```python' in text and '最终回答' not in text[:text.find('```python')]:  # 代码块没有闭合：回复在词元上限处被截断
            step['truncated'] = True; steps.append(step); print(f'第 {i + 1} 步：代码被截断', flush=True)
            msgs += [{'role': 'assistant', 'content': text}, {'role': 'user', 'content': '你的代码超过长度上限被截断，没有运行。请分几步做，每次只写一小段代码。'}]
            continue
        if m and '最终回答' not in text[:m.start()]:
            res = run_code(m.group(1), x.workdir); step.update(code=m.group(1), result=res)
            fed = (res['stdout'][-2500:] + ('\n' + res['stderr'][-800:] if res['stderr'] else '')).strip()  # 回给模型的输出截短，免得小上下文溢出；记录里保留全文
            msgs += [{'role': 'assistant', 'content': text}, {'role': 'user', 'content': f'运行结果（返回码 {res["returncode"]}）：\n{fed}'}]
        else:
            final = text; steps.append(step); break
        steps.append(step); print(f'第 {i + 1} 步：{len(step.get("code", ""))} 字代码，{step["seconds"]} 秒', flush=True)
    if final is None:  # 步数用完：再问一次，要求不写代码、只据已有输出作答（记录为额外一步）
        msgs.append({'role': 'user', 'content': '步数已用完。请不要再写代码，只根据以上实际运行得到的输出，以“最终回答：”开头给出结论；没有算出的数字不要写。'})
        c = chat(msgs, max_tokens=x.max_tokens); final = c['text']; steps.append({'step': len(steps) + 1, 'reply': final, 'usage': c['usage'], 'seconds': c['seconds'], 'forced_final': True})
    record(steps, x.out, kind='agent', task=task, system=SYSTEM, final=final, finished=not any(st.get('forced_final') for st in steps), max_steps=x.max_steps)
    print(final or '（未在步数上限内给出最终回答）')

if __name__ == '__main__': main()
