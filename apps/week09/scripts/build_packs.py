#!/usr/bin/env python3
# 第九周：由课程文件夹的史料包生成课件的公开材料与本机材料包｜候选，未经教师确认｜2026-11-11
# 用法：python3 apps/week09/scripts/build_packs.py <第九周/demo/史料包/week09-sources.json> [<本机运行记录目录>]
# 输出：prototype/data/w09-public.js（随课件发布）、prototype/data/w09-kinds.js、local-only/week09-pack.json（不入 Git、不发布）
# 规则：visibility=公开材料包 的条目全文进公开包；本机条目在公开包里只留元数据（text 置空，注明"录文在本机材料包"），全文只进本机包。
import json, sys, os, glob, copy
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(APP))
src = json.load(open(sys.argv[1], encoding='utf-8'))
runs_dir = sys.argv[2] if len(sys.argv) > 2 else None

pub_packs, loc_packs = [], []
for p in src['packs']:
    pp, lp = {k: v for k, v in p.items() if k != 'entries'}, {k: v for k, v in p.items() if k != 'entries'}
    pp['entries'], lp['entries'] = [], []
    for e in p['entries']:
        if e['visibility'] == '公开材料包':
            pp['entries'].append(e)
        else:
            stub = copy.deepcopy(e)
            if stub.get('text'):
                stub['text'] = ''; stub['text_kind'] = '仅元数据'; stub['note'] = (stub.get('note', '') + ' 录文在本机材料包（教师材料，不公开）。').strip()
            pp['entries'].append(stub)
            if e.get('text'): lp['entries'].append(e)
    pub_packs.append(pp)
    if lp['entries']: loc_packs.append(lp)
for p in pub_packs:
    for e in p['entries']:
        assert e['visibility'] == '公开材料包' or not e.get('text'), e['id']

# WarAgent 战国情景 Q 国设定（讲义附录"课堂材料"；原文据官方仓库，中译为本课所作）
QIN = [
 ('Leadership', 'A powerful and ambitious state with a centralized authoritarian rule', '强大而有野心的国家，实行中央集权的专制统治'),
 ('Military Capability', 'Highly efficient and disciplined military, known for its innovative tactics', '军队高效而有纪律，以战术创新著称'),
 ('Resources', 'Rich in natural resources, including significant mineral deposits', '自然资源丰富，包括大量矿藏'),
 ('History Background', 'Country Q located in the west, was initially somewhat isolated but grew in power over time.', 'Q 国位于西方，起初较为孤立，后来逐渐强大。'),
 ('History Background', 'It was known for its military reforms and expansionist policies.', '它以军事改革与扩张政策著称。'),
 ('History Background', 'Country Q often engaged in wars with its neighbors, particularly with Country W, Country Z and Country C.', 'Q 国常与邻国交战，尤其是 W 国、Z 国与 C 国。'),
 ('Key Policy', 'Aggressive expansionist policy, with a focus on military strength', '激进的扩张政策，注重军事实力'),
]
resources = {
  'qin': [{'id': f'qin-{i+1}', 'field': f, 'sentence': s, 'translation': t} for i, (f, s, t) in enumerate(QIN)],
  'qr_steer': 'assets/qr/NeuronpediaSteer.svg',
}
os.makedirs(os.path.join(APP, 'prototype/data'), exist_ok=True)
with open(os.path.join(APP, 'prototype/data/w09-public.js'), 'w', encoding='utf-8') as f:
    f.write('/* 由 scripts/build_packs.py 生成，请勿手改。公开材料：公有领域文本、NDL 公开本录文与元数据；教师材料只留元数据。 */\n')
    f.write('window.W9_PUBLIC = ' + json.dumps({'generated': src.get('generated'), 'packs': pub_packs, 'replays': [], 'resources': resources}, ensure_ascii=False, indent=0) + ';\n')
kinds = json.load(open(os.path.join(ROOT, 'docs/week09/schemas/importer-kinds.w09.json'), encoding='utf-8'))
with open(os.path.join(APP, 'prototype/data/w09-kinds.js'), 'w', encoding='utf-8') as f:
    f.write('/* 由 scripts/build_packs.py 据 docs/week09/schemas/importer-kinds.w09.json 生成。 */\nwindow.W9_KINDS = ' + json.dumps(kinds, ensure_ascii=False) + ';\n')

replays = []
if runs_dir and os.path.isdir(runs_dir):
    for fn in sorted(glob.glob(os.path.join(runs_dir, '**', '*.json'), recursive=True)):
        if any(part.startswith('_') for part in os.path.relpath(fn, runs_dir).split(os.sep)): continue  # 以 _ 开头的子目录是已替换的旧记录，留档不回放
        j = json.load(open(fn, encoding='utf-8'))
        for r in (j if isinstance(j, list) else [j]):
            s = json.dumps(r)
            assert 'apiKey' not in s and 'Bearer ' not in s, fn
            replays.append(r)
os.makedirs(os.path.join(APP, 'local-only'), exist_ok=True)
json.dump({'format': 'w09-pack/v1', 'generated': src.get('generated'), 'note': '本机材料包：教师材料录文与课前运行记录。不入 Git、不发布。', 'packs': loc_packs, 'replays': replays},
          open(os.path.join(APP, 'local-only/week09-pack.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('公开：', {p['id']: sum(1 for e in p['entries'] if e.get('text')) for p in pub_packs}, '本机：', {p['id']: len(p['entries']) for p in loc_packs}, '回放', len(replays))
