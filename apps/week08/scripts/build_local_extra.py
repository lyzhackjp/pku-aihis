#!/usr/bin/env python3
"""第八周本机材料包补充（D15—D22）：CHGIS TGAZ 查询快照、Kanripo《宋史》卷三一二王珪传两个数字本、JBDB 年号表、王珪边表上的智能体运行记录。
再发布许可未见说明或含 CBDB 记录，只进本机材料包。用法：python3 build_local_extra.py <原始数据目录> <week08-pack.json>"""
import json, pathlib, sys, hashlib
raw, packp = map(pathlib.Path, sys.argv[1:3])
pack = json.loads(packp.read_text(encoding='utf-8')); files = pack.setdefault('files', [])
def reg(p, note): files.append({'file': p.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'note': note}); return p
x = pack.setdefault('extra', {})
t = raw / 'tgaz_20261103' / 'tgaz_queries.json'
if t.exists(): x['tgaz'] = json.loads(reg(t, 'CHGIS TGAZ 接口查询快照（D16、D18）').read_text(encoding='utf-8'))
k = raw / 'kanripo_songshi' / 'wanggui_zhuan.json'
if k.exists():
    w = json.loads(reg(k, 'Kanripo KR2a0032 卷312 王珪传（WYG 与 master 两个分支）').read_text(encoding='utf-8'))
    x['kanripo_wanggui'] = {'title': '《宋史》卷三一二王珪传（漢籍リポジトリ Kanripo KR2a0032）', 'witnesses': {'WYG': {'label': 'Kanripo WYG 分支（文淵閣四庫全書本录文）', 'text': w['WYG']}, 'master': {'label': 'Kanripo master 分支（以 WYG 为底本的规范化本）', 'text': w['master']}},
                            'url': 'https://github.com/kanripo/KR2a0032', 'obtained': '2026-11-03 经 raw.githubusercontent.com 取得 KR2a0032_312.txt', 'license': '仓库未见许可证文件，只在本机使用'}
n = raw / 'jbdb_20261102' / 'nengocodes_240_260.json'
if n.exists(): x['jbdb_nengo'] = json.loads(reg(n, 'JBDB NengoCodes 240—260（D21 和暦换算）').read_text(encoding='utf-8'))
lr = raw / 'llm_20261103'
if lr.exists():
    x['runs'] = {}
    for p in sorted(lr.glob('agent_*cbdb*.json')):
        r = json.loads(reg(p, '王珪边表上的智能体运行记录').read_text(encoding='utf-8'))
        for c in r.get('calls', []): c.pop('response', None)
        x['runs'][p.stem] = r
    if (lr / 'tasks').exists(): x['agent_tasks_cbdb'] = {k: (lr / 'tasks' / f'{k}_cbdb.md').read_text(encoding='utf-8') for k in ('bad', 'good')}
packp.write_text(json.dumps(pack, ensure_ascii=False), encoding='utf-8')
print(packp, f'{packp.stat().st_size / 1e6:.1f} MB', list(x))
