#!/usr/bin/env python3
"""第八周 D07：把三种语言语料的主题模型运行结果并入本机材料包（pack.topics）。语料录文版权情况不一，只进本机材料包，不入 Git。
用法：python3 build_topics_pack.py <主题结果目录> <ballard_entries.json> <qingshilu_tw_entries.json> <baishi_entries.json> <week08-pack.json>
结果由 run_topics.py 生成（scikit-learn LDA）。只用标准库。"""
import json, pathlib, sys, hashlib

tdir, en, zh, ja, packp = map(pathlib.Path, sys.argv[1:6])
MODE = {'en-word': '按词（去 scikit-learn 英文停用词）', 'zh-char': '按字（去虚词与出现在过半条目中的字，照 Miller 2013 按字计）',
        'zh-bigram': '相邻二字串', 'ja-bigram': '相邻二字串（含汉字者）', 'names': '只用人名（JBDB 事件所涉人物），照山田等 2014'}
CORP = {
    'ballard': dict(src=en, title='Martha Ballard 日记（DoHistory 在线录文，1785—1812，9,999 条）', lang='en',
                    license='录文有版权（Robert and Cynthia McCausland，Picton Press）；只供本课堂分析，不分发',
                    runs=[('en_k30_s1', 'K＝30，种子 1（与 Blevins 同为 30 个主题）'), ('en_k30_s2', 'K＝30，种子 2'), ('en_k20_s1', 'K＝20，种子 1'), ('en_k10_s1', 'K＝10，种子 1'), ('en_bertopic_s42', 'BERTopic（all-MiniLM-L6-v2；HDBSCAN 最小类 30、leaf）'), ('en_bertopic_s42_eom40', 'BERTopic（同一嵌入；最小类 40、eom）')],
                    pick=lambda t: len({'birth', 'deld', 'safe', 'morn', 'calld', 'left', 'receivd', 'shee', 'born', 'labour'} & {w for w, _ in t['words']})),
    'qingshilu': dict(src=zh, title='《清实录》台湾资料选辑（9 种，1644—1895，6,184 条；殆知阁简体录文）', lang='zh',
                      license='实录原文为公有领域；此本为台湾文献丛刊选辑的简体录文，录入者与许可未详，只在本机使用',
                      note='年份由条目开头的年号推出并向后沿用；录文偶有错字（如道光九年误注“一九二九”），未改。',
                      runs=[('zh_char_k20_s1', 'K＝20，按字，种子 1'), ('zh_char_k20_s2', 'K＝20，按字，种子 2'), ('zh_bi_k20_s1', 'K＝20，按二字串，种子 1'), ('zh_char_k10_s1', 'K＝10，按字，种子 1'), ('zh_bertopic_s42', 'BERTopic（bge-small-zh-v1.5；HDBSCAN 最小类 30；第④步按字计数）')],
                      pick=lambda t: dict(t['words']).get('贼', 0) + dict(t['words']).get('匪', 0) + dict(t['words']).get('剿', 0)),
    'meishi': dict(src=ja, title='JBDB『梅颸日記』事件注记（2026-11-02 查询，20,033 条）', lang='ja',
                   license='JBDB 数据的再发布许可未见说明，只在本机使用',
                   note='每条事件注记为一篇；只用人名的运行以该事件所涉 JBDB 人物为词（不含日记作者以外的缺省编号 -1）。',
                   runs=[('ja_names_k10_s1', 'K＝10，只用人名，种子 1（照山田等 2014）'), ('ja_names_k10_s2', 'K＝10，只用人名，种子 2'), ('ja_bi_k20_s1', 'K＝20，按二字串，种子 1'), ('ja_bi_k20_s2', 'K＝20，按二字串，种子 2')],
                   pick=lambda t: t['share']),
}
pack = json.loads(packp.read_text(encoding='utf-8'))
pack['topics'] = {}; files = pack.setdefault('files', [])
for cid, c in CORP.items():
    docs = {d['id']: d for d in json.loads(c['src'].read_text(encoding='utf-8'))}
    runs, need = [], set()
    for f, label in c['runs']:
        p = tdir / (f + '.json')
        if not p.exists(): print('缺', p); continue
        r = json.loads(p.read_text(encoding='utf-8'))
        files.append({'file': p.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'note': f'D07 主题模型运行结果（{label}）'})
        r.update(id=f, label=label, mode_label=MODE[r['mode']] + ('（第④步分词计数；第①步嵌入读原文）' if r['kind'] == 'bertopic' else ''), exercise=max(r['topics'], key=c['pick'])['k'])
        for t in r['topics']: need.update(i for i, _ in t['top_docs'])
        runs.append(r)
    keep = {i: {k: docs[i].get(k) for k in ('text', 'date', 'year', 'wareki', 'ref') if docs[i].get(k) is not None} for i in need if i in docs}
    for i, d in keep.items():
        if 'ref' not in d and docs[i].get('page'): d['ref'] = 'DoHistory ' + docs[i]['page']
        if cid == 'meishi': d['ref'] = 'JBDB 事件 ' + i.split('-')[1] + '（' + ('『梅颸日記』' if i.startswith('J9') else '') + '）'
    pack['topics'][cid] = {'id': cid, 'title': c['title'], 'lang': c['lang'], 'license': c['license'], 'note': c.get('note', ''), 'runs': runs, 'docs': keep}
    print(cid, len(runs), '次运行；原文', len(keep), '条')
packp.write_text(json.dumps(pack, ensure_ascii=False), encoding='utf-8')
print(packp, f'{packp.stat().st_size / 1e6:.1f} MB')
