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
# D12 教学构造：同一批八个人，一张是“甲的文集里录出的关系”（自我中心网络），一张是“这八人彼此的亲属与仕宦关系”（整体网络）
_tw_card = lambda edge, miss: {'unit': '人（甲至辛，虚构）', 'edge_meaning': edge, 'missing': miss, 'time_precision': '无时间', 'author': '本课', 'version': '2026-11-04', 'nature': '教学构造', 'license': '课程材料', 'visibility': '公开'}
tw_ego = {'id': 'twonet-ego', 'kind': 'network', 'title': '甲的文集里录出的关系（自我中心网络，教学构造）', 'card': _tw_card('甲为对方写过墓志、祭文、书信，或推荐过对方', '甲以外各人彼此的关系一概不录'),
          'declare': {'directed': False}, 'nodes': [{'id': x, 'label': x} for x in '甲乙丙丁戊己庚辛'],
          'edges': [{'s': '甲', 't': t, 'type': ty} for t, ty in zip('乙丙丁戊己庚辛', ['墓志', '书信', '祭文', '推荐', '书信', '墓志', '同僚'])]}
tw_whole = {'id': 'twonet-whole', 'kind': 'network', 'title': '同一批八人彼此的亲属与仕宦关系（整体网络，教学构造）', 'card': _tw_card('姻亲、父子、同僚、同年', '只录八人之间，不录八人以外'),
            'declare': {'directed': False}, 'nodes': [{'id': x, 'label': x} for x in '甲乙丙丁戊己庚辛'],
            'edges': [{'s': a, 't': b, 'type': ty} for a, b, ty in [('乙', '丙', '姻亲'), ('丙', '丁', '同僚'), ('丁', '戊', '姻亲'), ('戊', '己', '同年'), ('己', '乙', '姻亲'), ('丙', '戊', '同僚'), ('庚', '辛', '父子'), ('辛', '丁', '同僚'), ('甲', '庚', '姻亲')]]}
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
constructed = {'id': 'topic-only', 'kind': 'pairs', 'title': '由字面全同到字面全异：七组对照句对（教学构造）',
               'card': {'unit': '句对', 'edge_meaning': '本课所选：直接引用、改字化用、字序颠倒、字同而无关、题材相近而字面全异，各举一两例，看几种相似度怎样分别给分', 'missing': '只是示意，不是抽样',
                        'time_precision': '—', 'author': '本课', 'version': '2026-11-04', 'nature': '教学构造（句子为真实诗文，组合与分类为本课所作）', 'license': '课程材料', 'visibility': '公开'},
               'rows': [{'id': 'TC01', 'a': '青青子衿悠悠我心', 'b': '青青子衿悠悠我心', 'label': '直接引用：化用（是）', 'note': '《诗经·郑风·子衿》；曹操《短歌行》原句引用。字面相似度都是 1。', 'ref_a': '《诗经》', 'ref_b': '曹操《短歌行》'},
                        {'id': 'TC02', 'a': '落花与芝盖同飞杨柳共春旗一色', 'b': '落霞与孤鹜齐飞秋水共长天一色', 'label': '改字化用：化用（是）', 'note': '庾信《马射赋》与王勃《滕王阁序》，前人早已指出王句从庾句化出。句式全同、实词多换，字面相似度居中。', 'ref_a': '庾信《马射赋》', 'ref_b': '王勃《滕王阁序》'},
                        {'id': 'TC03', 'a': '山高月小', 'b': '月小山高', 'label': '字序颠倒（构造，否）', 'note': '前句出苏轼《后赤壁赋》，后句为本课颠倒字序所造。四字全同：杰卡德为 1，最长公共子序列只有 2 字，编辑距离为 4。', 'ref_a': '苏轼《后赤壁赋》', 'ref_b': '本课构造'},
                        {'id': 'TC04', 'a': '白日依山尽', 'b': '白日放歌须纵酒', 'label': '字同而无关（否）', 'note': '王之涣《登鹳雀楼》与杜甫《闻官军收河南河北》，同用“白日”而毫无关系：字面分数不为 0，并不说明有关。', 'ref_a': '王之涣', 'ref_b': '杜甫'},
                        {'id': 'TC05', 'a': '春风吹野草', 'b': '细雨湿庭花', 'label': '仅题材相近（构造，否）', 'note': '同写春景，没有一个字相同：所有字面分数都是 0，只有语义模型可能给高分。'},
                        {'id': 'TC06', 'a': '送君南浦外', 'b': '别酒故人前', 'label': '仅题材相近（构造，否）', 'note': '同写离别，字面全异。'},
                        {'id': 'TC07', 'a': '明月照高楼', 'b': '清光满画堂', 'label': '仅题材相近（构造，否）', 'note': '前句出曹植《七哀》，后句为本课所造；同写月光，字面全异。'}]}

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
early = {k: hy.pop(k) for k in [k for k in hy if int(k) < 35]}   # 卷一至三十四（诗、制詞、表奏）另存，只供“回原文”，不进 D05、D07 的语料
texts['huayangji_early'] = {'title': '王珪《華陽集》卷一至三十四（四庫全書本）', 'ref': '维基文库《華陽集 (王珪, 四庫全書本)》，2026-11-04 下载源码', 'url': 'https://zh.wikisource.org/wiki/華陽集_(王珪,_四庫全書本)',
                            'license': '四库本文本为公有领域；维基文库录入按 CC BY-SA 4.0', 'genre': '文集', 'juan': early, 'note': '只供 D01 等页从边表出处回原文。'}
texts['huayangji'] = {'title': '王珪《華陽集》卷三十五至六十（四庫全書本）', 'ref': '维基文库《華陽集 (王珪, 四庫全書本)》，2026-10-29 下载源码（卷四十五至四十八 2026-11-04 补下）', 'url': 'https://zh.wikisource.org/wiki/華陽集_(王珪,_四庫全書本)',
                      'license': '四库本文本为公有领域；维基文库录入按 CC BY-SA 4.0', 'genre': '文集', 'juan': hy,
                      'note': '卷四十五至四十八 2026-10-29 下载被拒，2026-11-04 补下。〔篇题〕为维基文库以锚点标出的篇题；〔〕内的纪年为维基文库编者所加（YL 模板），不是四库本原文。'}

# ---------- 第三批（D14—D22）所用公开材料 ----------
import base64
extra = {}
# 武鑑相邻两版（CODH 武鑑全集／日本古典籍データセット，CC BY-SA 4.0），D21 差读
bk = raw / 'bukan_20261103'
if bk.exists():
    cont = json.loads(src(bk / 'contents.json', 'CODH 武鑑全集 目次データ（嘉永4、5、6 年版）').read_text(encoding='utf-8'))
    BOOK = {'200018983': ('大成武鑑（嘉永4／1851）', 1851), '200018984': ('大成武鑑（嘉永5／1852）', 1852)}
    def side(book, page, hid):
        row = next((r for r in cont[book] if r[0] == hid), None); f = bk / f'{book}_{page}.jpg'; src(f, f'IIIF 影像 {book} 第 {int(page)} 幅（宽 1200 像素）')
        return {'book': book, 'label': BOOK[book][0], 'year': BOOK[book][1], 'page': page, 'head': row[2] if row else '', 'toc': row,
                'iiif': f'https://codh.rois.ac.jp/pmjt/iiif/{book}/{book}_{page}.tif/full/full/0/default.jpg', 'img': 'data:image/jpeg;base64,' + base64.b64encode(f.read_bytes()).decode()}
    extra['bukan'] = {'pairs': [{'han': '薩摩', 'hid': 'H408', 'a': side('200018983', '00053', 'H408'), 'b': side('200018984', '00053', 'H408'), 'note': '目次データ的当主名由“薩摩宰相斉興卿”变为“松平薩摩守斉彬”：岛津斉興隐居、斉彬袭封，通行年表系于嘉永四年（1851）二月（课件补注，待核）。'},
                               {'han': '紀州', 'hid': 'H285', 'a': side('200018983', '00016', 'H285'), 'b': side('200018984', '00016', 'H285'), 'note': '目次データ的当主名由“紀伊菊千代■様”变为“紀伊中将慶福卿様”（■为目次数据原样）。'}],
                      'license': 'CC BY-SA 4.0', 'credit': '「武鑑全集」（CODH制作）「日本古典籍データセット」（国文研所蔵）を翻案；影像经 CODH IIIF 服务取得（2026-11-03）', 'url': 'https://codh.rois.ac.jp/bukan/'}
# 北宋、南宋年号（D21、D22 年号换算；课件录入，起始年据通行年表，待对 CBDB 年号表核）
extra['eras_song'] = {'note': '只到年：一个年号的元年按改元之年计；年中改元（如乾德元年始于建隆四年十一月）在本表中不区分。课件录入，待对 CBDB 年号表核。',
  'eras': [[n, int(y)] for n, y in (x.split(':') for x in '建隆:960 乾德:963 開寶:968 太平興國:976 雍熙:984 端拱:988 淳化:990 至道:995 咸平:998 景德:1004 大中祥符:1008 天禧:1017 乾興:1022 天聖:1023 明道:1032 景祐:1034 寶元:1038 康定:1040 慶曆:1041 皇祐:1049 至和:1054 嘉祐:1056 治平:1064 熙寧:1068 元豐:1078 元祐:1086 紹聖:1094 元符:1098 建中靖國:1101 崇寧:1102 大觀:1107 政和:1111 重和:1118 宣和:1119 靖康:1126 建炎:1127 紹興:1131 隆興:1163 乾道:1165 淳熙:1174 紹熙:1190 慶元:1195 嘉泰:1201 開禧:1205 嘉定:1208 寶慶:1225 紹定:1228 端平:1234 嘉熙:1237 淳祐:1241 寶祐:1253 開慶:1259 景定:1260 咸淳:1265 德祐:1275 景炎:1276 祥興:1278'.split())]}
# Natural Earth 50m 海岸线（公有领域），裁到东亚与地中海一带（D19 有 Pleiades 意大利点表）并抽稀，作离线底图（D16—D19）
ne = raw / 'naturalearth' / 'ne_50m_coastline.geojson'
if ne.exists():
    g = json.loads(src(ne, 'Natural Earth 50m coastline（公有领域）').read_text(encoding='utf-8')); lines = []
    def keep(pt): return (60 <= pt[0] <= 160 and -5 <= pt[1] <= 60) or (-12 <= pt[0] <= 42 and 28 <= pt[1] <= 50)
    for f in g['features']:
        cs = f['geometry']['coordinates']; cs = cs if f['geometry']['type'] == 'MultiLineString' else [cs]
        for line in cs:
            seg = []
            for pt in line:
                if keep(pt):
                    q = [round(pt[0], 2), round(pt[1], 2)]
                    if not seg or abs(q[0] - seg[-1][0]) + abs(q[1] - seg[-1][1]) >= 0.08: seg.append(q)
                elif len(seg) > 1: lines.append(seg); seg = []
                else: seg = []
            if len(seg) > 1: lines.append(seg)
    extra['basemap'] = {'bbox': [60, -5, 160, 60], 'bbox2': [-12, 28, 42, 50], 'coast': lines, 'license': '公有领域（Natural Earth）', 'note': '只画海岸线，不画国界与政区界；公开发表的地图须用有审图号的底图（讲义 4.4）。'}
# 本地开源模型的实际运行记录（文本为公开的《宋史》选段与练习材料二；D15、D18、D22）
lr = raw / 'llm_20261103'
def slim(p):
    r = json.loads(src(p, '本地模型运行记录（tools/local-llm）').read_text(encoding='utf-8'))
    for c in r.get('calls', []):
        c.pop('response', None)
        if 'request' in c: c['request'] = {k: v for k, v in c['request'].items() if k != 'messages'}
    return r
if lr.exists():
    extra['runs'] = {p.stem: slim(p) for p in sorted(lr.glob('*.json')) if p.name.startswith(('geo_', 'chrono_', 'agent_')) and 'cbdb' not in p.name}
# 讲义附录练习材料三：王珪社会关系边表节录 30 行（讲义已印出，随讲义分发；CBDB 为 CC BY-NC-SA 4.0）
ex = raw / 'cbdb_1845_社会关系边表_20261029.csv'
if ex.exists():
    blk = t[t.index('== 练习材料三'):t.index('== 回读记录单')]
    want = [(m.group(1), m.group(2)) for m in re.finditer(r'\n  \[([^\]]+)\], \[([^\]]+)\], \[[^\]]*\], \[', blk)]
    want = [(a.strip(), re.sub(r'（附注：.*?）', '', b).strip()) for a, b in want if a != '#hei[对方]']
    rows = list(csv.DictReader(ex.open(encoding='utf-8-sig'))); src(ex, 'CBDB 1845 号社会关系边表（取讲义附录所录 30 行）')
    pick, used = [], set()
    for a, b in want:
        for i, r in enumerate(rows):
            if i not in used and r['target'] == a and r['assoc_name'] == b: used.add(i); pick.append((i, r)); break
    nodes = {r['source_id']: r['source'] for _, r in pick}; nodes.update({r['target_id']: r['target'] for _, r in pick})
    from hy_refmap import refmap
    allj = {int(k): v['lines'] for k, v in {**hy, **early}.items()}
    texts['huayangji']['refmap'] = refmap(allj, [(r['text_title'], r['target']) for _, r in pick])
    exm = {'id': 'cbdb-wanggui-excerpt', 'kind': 'network', 'title': '王珪社会关系边表节录 30 行（讲义附录练习材料三；CBDB）',
           'card': {'unit': '人（王珪与其关系人，按 CBDB 人物编号）', 'edge_meaning': 'CBDB 编者从某一出处录出的一种关系', 'missing': '只是 97 条中的 30 条：纪念文字类以外的全部 24 条，加与 3.5 有关的纪念文字类 6 条；全部 97 条在本机材料包',
                    'time_precision': '多为缺省（0、-1）', 'author': 'CBDB 项目', 'version': 'CBDB API，2026-10-22 取得', 'location': '讲义附录练习材料三', 'obtained': '由边表按讲义所录 30 行取出', 'nature': '实际数据（节录）',
                    'license': 'CC BY-NC-SA 4.0（CBDB）', 'visibility': '公开（讲义已印出）'},
           'declare': {'directed': True, 'missing_time': ['0', '-1'], 'suspect_time': ['1085']},
           'nodes': [{'id': k, 'label': v} for k, v in nodes.items()],
           'edges': [{'s': r['source_id'], 't': r['target_id'], 'type': r['assoc_name'], 'code': r['assoc_code'], 'time_raw': r['year'], 'ref': r['text_title'], 'row': i + 2} for i, r in pick]}
    extra_mats = [exm]; print('练习材料三', len(pick), '行')
else: extra_mats = []
# 公开日记（D13 从一条日记到人物与关系；D05 KWIC）：頼山陽「東遊旅行日記」（NDL 公開）、Pepys 1660 年一月（Gutenberg，公有领域）
rs = raw / 'ndl_777012' / 'raisanyo_1797.json'
if rs.exists():
    R = json.loads(src(rs, '頼山陽日记 30 条（OCR 校读）').read_text(encoding='utf-8')); imgs = {}
    for pg in sorted({e['image'] for e in R['entries']}):
        f = raw / 'ndl_777012' / pg; src(f, 'NDL 777012 影像（灰度缩图）'); imgs[pg] = 'data:image/jpeg;base64,' + base64.b64encode(f.read_bytes()).decode()
    extra_mats.append({'id': 'raisanyo-1797', 'kind': 'events', 'title': '頼山陽「東遊旅行日記」寛政九年三—四月（『偉人日記』1911 所收，NDL 公開）', 'diarist': '頼山陽',
        'card': {'unit': '日条', 'edge_meaning': '一条日记中作者与所见人物的往来（由使用者判读）', 'missing': '只是三月十二日至四月十一日由广岛到江户的一程；编者节录，未注删节', 'time_precision': '日（和暦）', 'author': '頼山陽（1780—1832）',
                 'version': R['source'], 'form': R['method'], 'nature': '实际数据', 'license': '公有领域（NDL インターネット公開）', 'visibility': '公开'},
        'declare': {'calendar': '和暦'}, 'passages': [{**e, 'classroom': e['id'] == 'RS08', 'note': '', 'ednotes': [{'anchor': e['text'][:m.start()][-6:], 'note': m.group(1)} for m in re.finditer(r'（([^）]*なり[^）]*|[^）]*也)）', e['text'])]} for e in R['entries']], 'images': imgs,
        'ednote_src': '长田偶得编『偉人日記』（1911）的括注：原书编者对称呼所作的比定'})
    texts['raisanyo_1797'] = {'title': '頼山陽「東遊旅行日記」寛政九年（『偉人日記』所收）', 'text': '\n'.join(e['date_raw'] + '　' + e['text'] for e in R['entries']), 'ref': R['source'], 'license': '公有领域', 'genre': '日记'}
pp = raw / 'pepys' / 'pepys_1660.json'
if pp.exists():
    P = json.loads(src(pp, 'Pepys 1660 年日记 337 条').read_text(encoding='utf-8'))
    pn = raw / 'pepys' / 'pepys_1660_01_notes.json'; PN = json.loads(src(pn, 'Pepys 1660 年一月编者注').read_text(encoding='utf-8'))['notes'] if pn.exists() else {}
    extra_mats.append({'id': 'pepys-1660-01', 'kind': 'events', 'title': 'Samuel Pepys 日记 1660 年一月（Gutenberg #4200，公有领域）', 'diarist': 'Pepys',
        'card': {'unit': '日条', 'edge_meaning': '一条日记中作者与所见人物的往来（由使用者判读）', 'missing': '只取一月；正文中的编者注移到“与编者注对照”一栏', 'time_precision': '日（儒略历；英国当时以 3 月 25 日为年首）', 'author': 'Samuel Pepys（1633—1703）',
                 'version': 'Mynors Bright 转写、H. B. Wheatley 编本，Project Gutenberg #4200', 'nature': '实际数据', 'license': '公有领域', 'visibility': '公开'},
        'passages': [{'id': e['id'], 'wareki': e['date'] + '（儒略历）', 'year': 1660, 'month': e['month'], 'day': e['day'], 'page': 'Gutenberg #4200', 'text': e['text'], 'persons': [],
                      'ednotes': [{'anchor': n['anchor'], 'note': (lambda t: t if len(t) <= 240 else t[:t.find('.', 200) + 1 or 240])(n['note'])} for n in PN.get(str(e['day']), [])]} for e in P if e['month'] == 1],
        'ednote_src': 'H. B. Wheatley 编本（1893—1899）的编者注：Gutenberg #4200 中缩进的方括号注，每条只取前两三句'})
    texts['pepys_1660'] = {'title': 'Samuel Pepys 日记 1660 年（337 条）', 'docs': [{'id': e['id'], 'date': e['date'], 'text': e['text']} for e in P], 'ref': 'Project Gutenberg #4200', 'license': '公有领域', 'genre': '日记',
                           'text': '\n'.join(e['date'] + ' ' + e['text'] for e in P if e['month'] == 1)}
# Pleiades（CC BY 3.0）：罗马时代意大利的圆形剧场与族群两张点表（D19 公开点表；带位置精度字段）
pl = raw / 'pleiades_dl' / 'pleiades-places-latest_20261102.csv.gz'
if pl.exists():
    import gzip, io
    src(pl, 'Pleiades 地点表全量（取两类）')
    PL = list(csv.DictReader(io.TextIOWrapper(gzip.open(pl), encoding='utf-8')))
    def _in_italy(r):
        try: la, lo = float(r['reprLat']), float(r['reprLong'])
        except ValueError: return False
        return 6 <= lo <= 19 and 36 <= la <= 47.5
    for ft, pid, ttl, note in [('amphitheatre', 'pleiades-amphitheatres', '罗马时代意大利的圆形剧场（Pleiades）', '多为考古遗址，位置多“precise”'),
                               ('people', 'pleiades-peoples', '罗马时代意大利的族群（Pleiades）', '族群没有一个点：Pleiades 给的是代表点，位置多为“rough”')]:
        sel = [r for r in PL if _in_italy(r) and 'roman' in r['timePeriodsKeys'] and ft in [x.strip() for x in r['featureTypes'].split(',')]]
        sel.sort(key=lambda r: r['title'])
        extra_mats.append({'id': pid, 'kind': 'points', 'title': ttl + f'，{len(sel)} 处',
            'card': {'unit': '地点（Pleiades 条目）', 'edge_meaning': '每行一个 Pleiades 地点：名称、代表点经纬度、位置精度', 'missing': '只取意大利半岛一带、时期含“roman”、类型为 ' + ft + ' 者；' + note,
                     'time_precision': '时期（Pleiades 的 timePeriods）', 'author': 'Pleiades 项目（R. Bagnall 等）', 'version': 'pleiades-places-latest.csv，2026-11-02 下载', 'nature': '实际数据', 'license': 'CC BY 3.0（引用须注明 Pleiades 与条目网址）', 'visibility': '公开'},
            'rows': [{'name': r['title'], 'lat': round(float(r['reprLat']), 5), 'lng': round(float(r['reprLong']), 5), 'precision': r['locationPrecision'], 'ref': 'https://pleiades.stoa.org' + r['path']} for r in sel]})
# 日本年号（江户后期，D13、D21；课件录入，待对 JBDB NengoCodes 或 HuTime 核）
extra['eras_jp'] = {'note': '只到年；元年按改元之年计，年中改元不区分。课件录入，待核。', 'eras': [[n, int(y)] for n, y in (x.split(':') for x in '享保:1716 元文:1736 寛保:1741 延享:1744 寛延:1748 宝暦:1751 明和:1764 安永:1772 天明:1781 寛政:1789 享和:1801 文化:1804 文政:1818 天保:1830 弘化:1844 嘉永:1848 安政:1854 万延:1860 文久:1861 元治:1864 慶応:1865 明治:1868'.split())]}
if (lr / 'tasks').exists():
    texts['agent_tasks'] = {'title': 'D15 智能体任务（佛罗伦萨家族婚姻网）', **{k: src(lr / 'tasks' / f'{k}_padgett.md', 'D15 任务文本').read_text(encoding='utf-8') for k in ('bad', 'good')}}

pack = {'format': 'pku-aihis-week08-public-pack', 'version': 1, 'built': datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
        'notice': '随第八周课件公开发布的材料与教学构造。各部分许可不同，转用时按各自的 card.license 注明出处。CBDB 记录、『梅颸日記』与 JBDB 查询结果不在此文件中，课堂从本机材料包导入。',
        'materials': {m['id']: m for m in [toy7, adj4, temporal, tw_ego, tw_whole, padgett, shenzong, reform, pairs, constructed, *extra_mats]},
        'texts': texts, 'sources': sources, **extra}
js = '/* 第八周公开材料（由 apps/week08/scripts/build_public_pack.py 生成；许可见各部分 card.license）。 */\nwindow.W8_PUBLIC_PACK = ' + json.dumps(pack, ensure_ascii=False, separators=(',', ':')) + ';\n'
out.parent.mkdir(parents=True, exist_ok=True); out.write_text(js, encoding='utf-8')
print(f'{out}: {len(js)/1e6:.2f} MB; materials {list(pack["materials"])}; huayangji 卷 {len(hy)}（空 {sum(v["empty"] for v in hy.values())}）')
