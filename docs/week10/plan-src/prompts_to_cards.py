#!/usr/bin/env python3
"""prompts.json → 条件卡（模板＋材料编号）｜候选，未经教师确认｜2026-11-16｜第一步
用法：python3 docs/week10/plan-src/prompts_to_cards.py <第十周/demo> <输出 JSON>
做法：把每个条件提示中逐字出现的材料正文换成 {{material:ID}}，卡里只留模板、问题与材料编号，不留正文；
回填（apps/week10/prototype/w10-lib.js 的 fillTemplate）后与原提示逐字相同（tests/local.test.mjs 检查）。
输出只含问题、说明性前言与材料编号，可以入库；材料正文在史料包（公开包或本机材料包）里。"""
import json, sys, pathlib, hashlib

DEMO = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2])
IDS = {
    '茅海建_学术史一节_页198-208.txt': ('mao-history', '茅海建 2002 学术史一节（第 4 期第 198—208 页）'),
    '茅海建_结论一节_页174-176.txt': ('mao-conclusion', '茅海建 2002 结论一节（第 6 期第 174—176 页）'),
    '演示2_稲田年表1890录文.md': ('inada-chronology-1890', '稲田 1971 年表 1890 年条（原书第 396—398 页）录文'),
    '演示4_稲田先行研究pp3-4录文.md': ('inada-pp3-4', '稲田 1971 第 3—4 页录文'),
    '埃姆斯_甲_阿贝肯原电.txt': ('ems-a', '埃姆斯电报甲本：阿贝肯原电（GHDI 德文页）'),
    '埃姆斯_乙_新闻稿.txt': ('ems-b', '埃姆斯电报乙本：俾斯麦新闻稿（GHDI 德文页）'),
    '埃姆斯_对齐表.md': ('ems-align-table', '埃姆斯两本程序对齐表（difflib，2026-11-15）'),
}
META = {  # 讲义位置、演示页、问题（与 prompts.json 同文，取自扩充部分乙四 @fig-cards）
    'D1A': ('导入·演示①', 'D01'), 'D1B': ('导入·演示①', 'D01'),
    'D2A': ('2.2·演示②', 'D06'), 'D2B': ('2.2·演示②', 'D06'), 'D2C': ('2.3·演示②', 'D06、D07'),
    'D3': ('4.2·演示③', 'D12'), 'D4A': ('4.4·演示④', 'D14'), 'D4B': ('4.4·演示④', 'D14'),
    'C02A': ('3.3·课前记录', 'D10、D09'), 'C02B': ('3.3·课前记录', 'D10'),
}

def body(f):
    t = (DEMO / '材料' / f).read_text(encoding='utf-8')
    if f.endswith('.md') and '\n---\n' in t: t = t.split('\n---\n', 1)[1]
    t = t.strip()
    if f == '埃姆斯_对齐表.md': t = t[t.index('| 编号'):].strip()
    return t

P = json.loads((DEMO / 'prompts.json').read_text(encoding='utf-8'))
cards = []
for c in P['conditions']:
    tpl = c['messages'][0]['content']
    mats = []
    for f in c.get('materials', []):
        mid, label = IDS[f]; t = body(f)
        if t not in tpl: raise SystemExit(f'{c["id"]}：{f} 的正文不在提示中，不能模板化')
        tpl = tpl.replace(t, '{{material:%s}}' % mid); mats.append({'entry_id': mid, 'label': label})
    lec, page = META[c['id']]
    q = tpl.rsplit('\n\n', 1)[-1] if mats else tpl
    cards.append({
        'card_id': c['id'], 'title': c['title'], 'lecture_ref': lec, 'page': page,
        'question': q, 'materials': mats, 'user_template': tpl, 'system_prompt': None,
        'models': ['deepseek', 'kimi'], 'samples': 3,
        'settings': {'_note': '待教师定（第一步待决 1）：第九周课件实际做法是 DeepSeek 关思考、温度 0.7；Kimi 固定温度、reasoning_effort low。记录写实际传了什么。'},
        'web_prompt_file': f'{c["id"]}.txt',
        'source': f'{P["version"]}（{P["date"]}）；原提示 sha256 {hashlib.sha256(c["messages"][0]["content"].encode()).hexdigest()[:16]}',
    })
OUT.write_text(json.dumps({'_note': '候选，未经教师确认。由 prompts_to_cards.py 生成；不含材料正文。', 'cards': cards}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(cards), 'cards →', OUT, '｜模板最长', max(len(x['user_template']) for x in cards), '字')
