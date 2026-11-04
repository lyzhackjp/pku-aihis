#!/usr/bin/env python3
"""由 page-map.json 生成 docs/week08/逐页内容.md（改页表后重新运行）。"""
import json, pathlib
here = pathlib.Path(__file__).resolve().parents[1]
P = json.loads((here / 'page-map.json').read_text(encoding='utf-8'))
L = {'hero': '封面／结语（hero）', 'flow4': '四栏流程（flow4）', 'diagram': '图解（diagram）', 'through': '贯穿页（through）', 'concepts': '概念页（concepts）', 'workbench': '工作台（workbench）'}
out = ['# 第八讲演示：逐页内容稿（候选，待教师确认）', '',
       '版本：2026-11-02。依据：第八周 `讲义.typ` 第三版 R6（净教学 172 分钟）、《讲义附录：扩充部分》第二版、《案例整理》第二版。本稿由 `page-map.json` 生成（`plan-src/make_pages_md.py`），改页表后重新生成。',
       '状态：prototype＝已实现并经浏览器验收；planned＝规划页（页面上显示页表内容，不冒充实现）。', '']
for p in P:
    out += [f"## {p['id']}　{p['title']}", '',
            f"- **节次／锚点**：{p['section']}／{p['anchor']}　**版式**：{L.get(p['layout'], p['layout'])}　**建议时长**：{p['minutes']} 分　**状态**：{p['status']}",
            f"- **对应扩充部分／案例**：{p.get('extension') or '—'}／{'、'.join(p.get('cases') or []) or '—'}",
            f"- **过渡句**：{p['transition']}", f"- **本页问题**：{p['question']}"]
    if p.get('steps'): out.append(f"- **步骤**：{' → '.join(p['steps'])}")
    if p.get('demo'): out.append(f"- **演示区**：{p['demo']}")
    out += [f"- **学生操作**：{p['student_operation']}", f"- **可见结果**：{p['observable_output']}"]
    lay = p.get('layers') or {}
    if lay.get('basic') or lay.get('advanced'): out.append(f"- **课上基础层／课后进阶层**：{lay.get('basic') or '—'}／{lay.get('advanced') or '—'}")
    out += [f"- **运行模式**：{p['mode']}", f"- **讲义依据**：{p['lesson_evidence']}"]
    if p.get('data'): out.append(f"- **数据**：{p['data']}")
    if p.get('concepts'): out.append(f"- **首次出现的概念**：{'、'.join(p['concepts'])}")
    if p.get('through'): out.append(f"- **贯穿阶段**：{p['through']}")
    n = p['notes']; out += [f"- **备注·目的**：{n['purpose']}", f"- **备注·引导**：{n['guide']}", f"- **备注·机制**：{n['mechanism']}", f"- **页脚**：{p['footer']}", '']
(here / '逐页内容.md').write_text('\n'.join(out), encoding='utf-8'); print('ok', len(P))
