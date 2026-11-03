#!/usr/bin/env python3
"""第八周公开材料包：生成 prototype/data/public/week08-public-pack.js。
只收许可允许公开再发布的材料与教学构造；CBDB 记录、『梅颸日記』、JBDB 查询结果只进本机材料包（build_week08_pack.py）。
用法：python3 build_public_pack.py <原始数据目录> <讲义.typ> <输出 .js>
原始数据目录即课程文件夹 第八周/research/原始数据/，需含 huayangji/、wang2022/、padgett/、chengning/。只用标准库。"""
import csv, hashlib, json, pathlib, re, sys, datetime

raw, typ, out = map(pathlib.Path, sys.argv[1:4])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
sources = []
def src(p, note):
    sources.append({'file': str(p.relative_to(raw)), 'sha256': sha(p), 'note': note}); return p

# ---------- 教学构造的网络 ----------
toy7 = {'id': 'toy7', 'kind': 'network', 'title': '七人小网（讲义 @fig-toy）',
        'card': {'unit': '人（甲至庚，虚构）', 'edge_meaning': '有记录的关系（不分类型）', 'missing': '无：完整的教学构造', 'time_precision': '无时间',
                 'author': '讲义', 'version': '第八讲讲义 @fig-toy', 'nature': '教学构造', 'license': '课程材料', 'visibility': '公开'},
        'declare': {'directed': False},
        'nodes': [{'id': x, 'label': x} for x in '甲乙丙丁戊己庚'],
        'edges': [{'s': a, 't': b} for a, b in ['甲乙', '甲丙', '乙丙', '丙丁', '丁戊', '戊己', '戊庚', '己庚']]}
adj4 = {'id': 'adj4', 'kind': 'network', 'title': '四人网络（讲义 @fig-adj）',
        'card': {'unit': '人（虚构）', 'edge_meaning': '同僚、推荐、书信三种关系', 'missing': '无：教学构造', 'time_precision': '无时间',
                 'author': '讲义', 'version': '第八讲讲义 @fig-adj', 'nature': '教学构造', 'license': '课程材料', 'visibility': '公开'},
        'declare': {'directed': False},
        'nodes': [{'id': x, 'label': x} for x in '甲乙丙丁'],
        'edges': [{'s': '甲', 't': '乙', 'type': '同僚'}, {'s': '甲', 't': '丙', 'type': '推荐'}, {'s': '乙', 't': '丙', 'type': '同僚'}, {'s': '丙', 't': '丁', 'type': '书信'}]}
temporal = {'id': 'toy-temporal', 'kind': 'network', 'title': '小型时序网（教学构造）',
            'card': {'unit': '人（虚构）', 'edge_meaning': '某年有一次往来', 'missing': '无：教学构造', 'time_precision': '年',
                     'author': '本课', 'version': '2026-11-02', 'nature': '教学构造', 'license': '课程材料', 'visibility': '公开'},
            'declare': {'directed': False},
            'nodes': [{'id': x, 'label': x} for x in '甲乙丙丁'],
            'edges': [{'s': '甲', 't': '乙', 'time': 1060, 'time_raw': '1060'}, {'s': '乙', 't': '丙', 'time': 1055, 'time_raw': '1055'},
                      {'s': '乙', 't': '丙', 'time': 1070, 'time_raw': '1070'}, {'s': '丙', 't': '丁', 'time': 1065, 'time_raw': '1065'}]}

# ---------- Padgett ----------
p = src(raw / 'padgett/padgett_florentine_marriage.csv', 'NetworkX florentine_families_graph 导出')
rows = list(csv.DictReader(p.open(encoding='utf-8')))
names = sorted({r['source'] for r in rows} | {r['target'] for r in rows})
padgett = {'id': 'padgett', 'kind': 'network', 'title': '佛罗伦萨家族婚姻网（Padgett）',
           'card': {'unit': '家族', 'edge_meaning': '两家之间有婚姻', 'missing': '只有婚姻网（经济、庇护关系未收）；数据由 Padgett 等据二手研究编码；Pucci 家族无婚姻边，未收',
                    'time_precision': '约 1400—1434 年，不分年', 'author': 'Padgett & Ansell 1993；Breiger & Pattison 1986 整理', 'version': 'NetworkX 3.x florentine_families_graph',
                    'nature': '实际数据（二手编码）', 'license': 'NetworkX BSD-3-Clause', 'visibility': '公开'},
           'declare': {'directed': False}, 'nodes': [{'id': n, 'label': n} for n in names],
           'edges': [{'s': r['source'], 't': r['target'], 'type': '婚姻'} for r in rows]}

# ---------- 王裕华 2022 复制数据（CC0） ----------
W = raw / 'wang2022'
ed = list(csv.DictReader(src(W / 'shenzong officials and kin edgelist.csv', 'Dataverse 5375317 原始格式').open(encoding='utf-8-sig')))
vx = list(csv.DictReader(src(W / 'Shenzong vertex attributes.csv', 'Dataverse 5375359 原始格式（latin-1）').open(encoding='latin-1')))
ref = list(csv.DictReader(src(W / 'Wang Anshi reform data_wk_fixed.csv', 'Dataverse 5375344 .dta 转 CSV，人名 latin-1→utf-8 转码（转码脚本见同目录 README）').open(encoding='utf-8')))
egos = {r['c_personid_ego'] for r in ed}
shenzong = {'id': 'wang2022-shenzong', 'kind': 'network', 'title': '神宗朝官员及其亲属网（王裕华 2022 复制数据）',
            'card': {'unit': '人（官员与其亲属，按 CBDB 人物编号）', 'edge_meaning': '官员（ego）与其亲属（target）之间的亲属或婚姻关系，据墓志等重建',
                     'missing': f'只为 {len(egos)} 名官员重建了亲属（ego）；亲属彼此之间的关系不录；原表有 {len(ed) - len({(r["c_personid_ego"], r["c_personid_target"]) for r in ed})} 行重复；137 名主要官员中多人不在 ego 之列',
                     'time_precision': '神宗朝（1067—1085），不分年', 'author': 'Yuhua Wang', 'version': 'Harvard Dataverse doi:10.7910/DVN/KER9GK，V1',
                     'location': '"shenzong officials and kin edgelist"（文件 5375317）与 "Shenzong vertex attributes"（5375359）', 'obtained': '2026-11-02 经 Dataverse API 下载原始格式',
                     'nature': '实际数据', 'license': 'CC0 1.0', 'visibility': '公开'},
            'declare': {'directed': True, 'note': '边表列名为 ego→target；原书按无向网络计算'},
            'nodes': [{'id': r['c_personid'], 'label': r['name_pinyin'], 'attrs': {'lng': float(r['x']), 'lat': float(r['y'])}} for r in vx],
            'edges': [{'s': r['c_personid_ego'], 't': r['c_personid_target'], 'type': '亲属', 'ref': 'Wang 2022 复制数据 5375317 第 %d 行' % (i + 2)} for i, r in enumerate(ed)]}
keep = ['politician_id', 'name_fanti', 'name_pinyin', 'kin_node', 'hometown_prefecture_name', 'support_dummy', 'support_continuous', 'kinproximity', 'degree', 'betweenness', 'newparty', 'father_exam']
reform = {'id': 'wang2022-reform', 'kind': 'table', 'title': '神宗朝 137 名主要官员的属性（王裕华 2022 复制数据）',
          'card': {'unit': '人（137 名副部级以上官员）', 'edge_meaning': '—（属性表）', 'missing': 'support_continuous（变法立场）空缺者多；kinproximity 空缺者为亲属无法定位者',
                   'time_precision': '神宗朝', 'author': 'Yuhua Wang', 'version': 'doi:10.7910/DVN/KER9GK，"Wang Anshi reform data_wk"（5375344）',
                   'obtained': '2026-11-02 下载', 'nature': '实际数据', 'license': 'CC0 1.0', 'visibility': '公开'},
          'columns': keep, 'rows': [[r.get(k, '') for k in keep] for r in ref]}

# ---------- 程宁 2023 表 2 ----------
cn = list(csv.DictReader(src(raw / 'chengning/chengning2023_table2.csv', '据原刊第 79 页录入并目验').open(encoding='utf-8')))
pairs = {'id': 'chengning-t2', 'kind': 'pairs', 'title': '程宁 2023 表 2：《文选》句与李白句',
         'card': {'unit': '句对', 'edge_meaning': '模型判为语义相近的一对诗句', 'missing': '只列 10 组示例；全库 1 万对未公开', 'time_precision': '—',
                  'author': '程宁', 'version': '《清华大学学报（哲学社会科学版）》2023 年第 6 期，表 2', 'location': '原刊第 79 页', 'nature': '保存结果回放（分数照录原文）',
                  'license': '引用原文表格（10 组句对与分数）', 'visibility': '公开'},
         'rows': [{'id': r['id'], 'a': r['wenxuan'], 'b': r['libai'], 'model': float(r['bert_ccpoem']), 'paper_edit': float(r['edit_sim']), 'label': '化用（论文判为相似）',
                   'ref_a': '《文选》', 'ref_b': '李白诗'} for r in cn] +
                 [{'id': 'CN11', 'a': '余霞散成绮', 'b': '落霞沉绿绮', 'model': 0.88, 'paper_edit': None, 'label': '化用（仇兆鳌注杜引此）', 'ref_a': '谢朓《晚登三山还望京邑》', 'ref_b': '杜甫《大历三年春白帝城放船出瞿塘峡……》', 'note': '原刊第 79—80 页正文所举，阈值 0.9 下被排除'}]}
constructed = {'id': 'topic-only', 'kind': 'pairs', 'title': '题材相近而无引用关系的句对（教学构造）',
               'card': {'unit': '句对', 'edge_meaning': '本课构造：同写春景或离别，字面与意思都不来自对方', 'missing': '—', 'time_precision': '—', 'author': '本课', 'version': '2026-11-02',
                        'nature': '教学构造', 'license': '课程材料', 'visibility': '公开'},
               'rows': [{'id': 'TC01', 'a': '春风吹野草', 'b': '细雨湿庭花', 'label': '仅题材相近（构造）'}, {'id': 'TC02', 'a': '送君南浦外', 'b': '别酒故人前', 'label': '仅题材相近（构造）'},
                        {'id': 'TC03', 'a': '明月照高楼', 'b': '清光满画堂', 'label': '仅题材相近（构造）'}]}

# ---------- 文本：练习材料与《華陽集》 ----------
t = typ.read_text(encoding='utf-8')
def block_after(head):
    i = t.index(head); j = t.index('#block(', i); k = t.index(']\n', t.index('#set par', j) )
    body = t[t.index('\n', t.index('#set par', j)) + 1: t.index('\n]', j)]
    return body.strip()
practice1 = block_after('== 练习材料一')
practice2 = block_after('== 练习材料二')
texts = {
  'practice1': {'title': '《宋史·王珪传》选段（练习材料一）', 'text': practice1, 'ref': '《宋史》卷三一二，维基文库线上公开件（底本未注明，2026-10-22 下载）；据第八讲讲义附录',
                'license': '公有领域文本', 'genre': '正史列传'},
  'practice2': {'title': '《丹陽郡夫人李氏墓誌銘》节录（练习材料二）', 'text': practice2, 'ref': '王珪《華陽集》卷五十一，维基文库四庫全書本；标点为本讲所加（待核）；据第八讲讲义附录',
                'license': '公有领域文本；标点为课程所加', 'genre': '墓志'},
}
# 第七周公开材料包中的《宋史·王珪传》较长选段（788 字，维基文库，CC BY-SA 4.0）：练习材料一只是其中一段，“相”字只有两处
w7 = pathlib.Path(__file__).resolve().parents[2] / 'week07/prototype/data/public/week07-public-pack.js'
w7p = json.loads(re.search(r'window\.W7_PUBLIC_PACK\s*=\s*(\{.*\});?\s*$', w7.read_text(encoding='utf-8'), re.S).group(1))
sw = w7p['texts']['songshi_wanggui_excerpt']; sources.append({'file': 'apps/week07/prototype/data/public/week07-public-pack.js', 'sha256': sha(w7), 'note': '第七周公开材料包（取其中《宋史》选段）'})
texts['songshi_w7'] = {'title': '《宋史·王珪传》较长选段（第七周练习材料一，788 字）', 'text': sw['text'], 'ref': sw['source'] + '；取自第七周公开材料包', 'license': 'CC BY-SA 4.0（维基文库录入）', 'genre': '正史列传'}
hy = {}
for f in sorted((raw / 'huayangji').glob('juan*.txt'), key=lambda x: int(re.sub(r'\D', '', x.name))):
    n = int(re.sub(r'\D', '', f.name)); s = f.read_text(encoding='utf-8'); src(f, '维基文库 wikitext 源码')
    m = re.search(r'<poem>(.*?)</poem>', s, re.S)
    body = m.group(1) if m else ''
    body = re.sub(r'\{\{SK anchor\|([^{}|]*)\}\}', r'〔篇题〕\1', body)   # 维基文库用锚点标篇题
    body = re.sub(r'\{\{YL\|([^{}|]*)\}\}', r'〔\1〕', body)            # 维基文库编者所加纪年，非四库本原文
    body = re.sub(r'\{\{[^{}]*\}\}', '', body); body = re.sub(r'<[^>]+>', '', body)
    lines = [l.strip('　 ') for l in body.split('\n') if l.strip('　 ')]
    hy[str(n)] = {'juan': n, 'lines': lines, 'empty': not lines}
texts['huayangji'] = {'title': '王珪《華陽集》卷三十五至六十（四庫全書本）', 'ref': '维基文库《華陽集 (王珪, 四庫全書本)》，2026-10-29 下载源码', 'url': 'https://zh.wikisource.org/wiki/華陽集_(王珪,_四庫全書本)',
                      'license': '四库本文本为公有领域；维基文库录入按 CC BY-SA 4.0', 'genre': '文集', 'juan': hy,
                      'note': '卷四十五至四十八本地文本为空（第二轮下载被拒），内容只在教师提供的影像中（来源卡 S-81）。〔篇题〕为维基文库以锚点标出的篇题；〔〕内的纪年为维基文库编者所加（YL 模板），不是四库本原文。'}

pack = {'format': 'pku-aihis-week08-public-pack', 'version': 1, 'built': datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
        'notice': '随第八周课件公开发布的材料与教学构造。各部分许可不同，转用时按各自的 card.license 注明出处。CBDB 记录、『梅颸日記』与 JBDB 查询结果不在此文件中，课堂从本机材料包导入。',
        'materials': {m['id']: m for m in [toy7, adj4, temporal, padgett, shenzong, reform, pairs, constructed]},
        'texts': texts, 'sources': sources}
js = '/* 第八周公开材料（由 apps/week08/scripts/build_public_pack.py 生成；许可见各部分 card.license）。 */\nwindow.W8_PUBLIC_PACK = ' + json.dumps(pack, ensure_ascii=False, separators=(',', ':')) + ';\n'
out.parent.mkdir(parents=True, exist_ok=True); out.write_text(js, encoding='utf-8')
print(f'{out}: {len(js)/1e6:.2f} MB; materials {list(pack["materials"])}; huayangji 卷 {len(hy)}（空 {sum(v["empty"] for v in hy.values())}）')
