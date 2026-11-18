#!/usr/bin/env python3
"""用 w10-structures.schema.json 校验 examples/ 下的示例，并确认两个反例被拒｜候选，2026-11-16｜第一步
用法：python3 docs/week10/plan-src/validate_examples.py（仓库根目录）。jsonschema 3.2 只认到 draft-07，
本 schema 只用 draft-07 也有的关键字，$defs 以 JSON 指针引用，校验结果相同。"""
import json, sys, pathlib
from jsonschema import Draft7Validator, RefResolver
D = pathlib.Path('docs/week10')
S = json.loads((D / 'schemas/w10-structures.schema.json').read_text())
R = RefResolver.from_schema(S)
def check(defname, obj):
    v = Draft7Validator({'$ref': '#/$defs/' + defname}, resolver=R)
    return [e.message for e in v.iter_errors(obj)]
E = lambda n: json.loads((D / 'examples' / n).read_text())
plan = [
    ('alignTable', [E('align-table.ems.example.json')]),
    ('witness', E('witness.ems.example.json')['witnesses']),
    ('timelineStep', E('timeline.example.json')['steps']),
    ('baseRow', E('timeline.example.json')['base']),
    ('chengwenRow', E('chengwen.example.json')['rows']),
    ('labelPair', E('label-pairs.example.json')['pairs']),
    ('runRecord', [E('run-record.pending.example.json')]),
    ('sheetRow', E('sheet.example.json')['rows']),
    ('conditionCard', E('condition-cards.w10.json')['cards']),
]
bad = 0
for d, objs in plan:
    errs = [m for o in objs for m in check(d, o)]
    print(f'{d:14s} {len(objs):3d} 条  {"通过" if not errs else "失败：" + "；".join(errs[:3])}'); bad += bool(errs)
# 反例：运行记录带 apiKey；不可送的条目标成公开
neg1 = dict(E('run-record.pending.example.json'), apiKey='sk-test')
neg2 = {'id': 'x', 'title': 'x', 'citation': 'x', 'text_kind': '录文', 'sendable': False, 'visibility': '公开'}
for name, d, o in [('运行记录带 apiKey', 'runRecord', neg1), ('不可送条目标成公开', 'sourceEntry', neg2)]:
    ok = bool(check(d, o)); print(f'反例 {name}：{"被拒（正确）" if ok else "未被拒（错误）"}'); bad += (not ok)
sys.exit(1 if bad else 0)
