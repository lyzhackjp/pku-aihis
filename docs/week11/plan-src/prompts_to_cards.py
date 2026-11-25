#!/usr/bin/env python3
"""prompts.json → 条件卡｜候选，未经教师确认｜2026-11-25｜第一步
用法（仓库根目录）：python3 docs/week11/plan-src/prompts_to_cards.py <课程文件夹/第十一周/demo/prompts.json> docs/week11/examples/condition-cards.w11.json
第十一周的 prompts.json 本身就是模板（{{material:ID}}），不含材料正文；这里去掉本机路径与生成状态，补 question 与 settings，写成可入库的条件卡。
检查：模板里出现的材料编号与 materials 一一对应；sendable=false 的卡标出"发不出"。"""
import json, sys, re, hashlib, pathlib
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
P = json.loads(src.read_text(encoding='utf-8'))
cards = []
for c in P['conditions']:
    ids_t = re.findall(r'\{\{material:([^}]+)\}\}', c['template']); ids_m = [x['entry_id'] for x in c['materials']]
    if sorted(set(ids_t)) != sorted(ids_m): raise SystemExit(f"{c['id']}：模板中的材料 {ids_t} 与 materials {ids_m} 不一致")
    q = re.sub(r'\{\{material:[^}]+\}\}', '', c['template']).strip().split('\n\n')
    question = max(q, key=len) if c['id'] in ('S1', 'S2', 'S1J', 'W3a') else q[-1]
    cards.append({
        'card_id': c['id'], 'title': c['title'], 'lecture_ref': c['lecture_ref'], 'page': c['page'], 'question': question,
        'materials': [{'entry_id': x['entry_id'], 'label': x['label'], 'sendable': x['sendable'], 'sendable_basis': x['sendable_basis'], 'visibility': x['visibility']} for x in c['materials']],
        'user_template': c['template'], 'system_prompt': c.get('system_prompt'), 'models': c['models'], 'samples': c['samples'], 'optional': c.get('optional', False),
        'settings': {'_note': P['settings_pending']}, 'web_prompt_file': f"{c['id']}.txt" if 'web' in c['models'] else None,
        'sources': c['sources'], 'wording_status': c['wording_status'],
        'source': f"{P['version']}（{P['date']}）；模板 sha256 {hashlib.sha256(c['template'].encode()).hexdigest()[:16]}",
        'blocked_until': None if all(x['sendable'] for x in c['materials']) else '有材料 sendable=false，发不出',
    })
out.write_text(json.dumps({'_note': '候选，未经教师确认。由 prompts_to_cards.py 从课程文件夹 第十一周/demo/prompts.json 生成；不含材料正文与本机路径。', 'cards': cards}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(cards), 'cards →', out, '｜调用（必跑）', sum(len([m for m in x['models'] if m != 'web']) * x['samples'] for x in cards if not x['optional']),
      '｜可选', sum(len([m for m in x['models'] if m != 'web']) * x['samples'] for x in cards if x['optional']))
