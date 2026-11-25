#!/usr/bin/env python3
"""用 w11-structures.schema.json 校验 examples/ 下的示例，并确认三个反例被拒｜候选，2026-11-25｜第一步
用法（仓库根目录）：python3 docs/week11/plan-src/validate_examples.py。jsonschema 3.2 只认 draft-07，本 schema 只用 draft-07 的关键字。"""
import json, sys, pathlib
from jsonschema import Draft7Validator, RefResolver
D = pathlib.Path('docs/week11')
S = json.loads((D / 'schemas/w11-structures.schema.json').read_text())
def check(defname, obj):
    w = {'$defs': S['$defs'], 'allOf': [{'$ref': '#/$defs/' + defname}]}
    return [e.message for e in Draft7Validator(w, resolver=RefResolver.from_schema(w)).iter_errors(obj)]
E = lambda n: json.loads((D / 'examples' / n).read_text())
plan = [
    ('paragraph', E('paragraphs.jia.example.json')['paragraphs']),
    ('footnote', E('footnotes.jia.example.json')['footnotes']),
    ('matrixRow', E('matrix.wuxu.example.json')['rows']),
    ('registerRow', E('register.fig-reg.example.json')['rows']),
    ('editRow', E('edits.fig10.example.json')['edits']),
    ('implant', E('implants-findings.toy.example.json')['implants']),
    ('finding', E('implants-findings.toy.example.json')['findings']),
    ('styleRule', E('style.toy.example.json')['rules']),
    ('paragraphPair', E('style.toy.example.json')['pairs']),
    ('ledgerEntry', E('ledger.jia2.example.json')['entries']),
    ('bibEntry', E('bib.jia.example.json')['bib']),
    ('declaration', E('declaration.example.json')['declarations']),
    ('runRecord', [E('run-record.pending.example.json')]),
    ('sourcePage', E('source-page.example.json')['pages']),
]
cc = D / 'examples/condition-cards.w11.json'
if cc.exists(): plan.append(('conditionCard', json.loads(cc.read_text())['cards']))
bad = 0
for d, objs in plan:
    errs = [m for o in objs for m in check(d, o)]
    print(f'{d:14s} {len(objs):3d} 条  {"通过" if not errs else "失败：" + "；".join(errs[:3])}'); bad += bool(errs)
neg = [('运行记录带 apiKey', 'runRecord', dict(E('run-record.pending.example.json'), apiKey='sk-test')),
       ('不可送条目标成公开', 'sourceEntry', {'id': 'x', 'title': 'x', 'citation': 'x', 'text_kind': '录文', 'sendable': False, 'visibility': '公开'}),
       ('"待课前运行"占位却带回答', 'runRecord', dict(E('run-record.pending.example.json'), reply='（伪造的回答）'))]
for name, d, o in neg:
    ok = bool(check(d, o)); print(f'反例 {name}：{"被拒（正确）" if ok else "未被拒（错误）"}'); bad += (not ok)
sys.exit(1 if bad else 0)
