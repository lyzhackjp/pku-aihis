#!/usr/bin/env python3
"""第十周：由课程文件夹的材料生成课件的公开材料、条件卡与本机材料包｜候选，未经教师确认｜2026-11-16（第一批）
用法：python3 apps/week10/scripts/build_packs.py <第十周 文件夹> [<运行记录目录>]
输出：
  prototype/data/w10-public.js   公开包（随课件发布）：埃姆斯两本与对齐表、勅語成文全文；受限条目只留元数据
  prototype/data/w10-cards.js    条件卡（模板＋材料编号，不含材料正文；由 docs/week10/plan-src/prompts_to_cards.py 的同一办法生成）
  prototype/data/w10-kinds.js    导入对话框的类型（第九周的史料包、运行记录、网页版三类＋第十周十一类）
  local-only/week10-pack.json    本机材料包（不入 Git、不发布）：茅文两节、稲田录文两份、井上草案与书翰七条，及课前运行记录
规则（教师 2026-11-16）：井上草案录文与书翰七条只进本机材料包；茅文、稲田录文、海後录文可送模型（教师 2026-11-14）。"""
import json, sys, os, glob, re, hashlib, subprocess, datetime
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(APP))
W10 = os.path.abspath(sys.argv[1]); RUNS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(W10, 'demo', '运行记录')
MAT = os.path.join(W10, 'demo', '材料')
rd = lambda p: open(p, encoding='utf-8').read()

def md_body(t):
    return t.split('\n---\n', 1)[1].strip() if '\n---\n' in t else t.strip()

typ = rd(os.path.join(W10, '讲义.typ'))
def quote_block(title):
    i = typ.index(title); j = typ.index('#quote-block[', i); return typ[j + 13:typ.index(']', j)]
seibun = quote_block('=== 《教育勅語》成文').split('\n\n明治')[0].strip()
inoue_draft = quote_block('=== 井上毅草案').strip()
inoue_letter = quote_block('=== 井上毅致山県有朋书翰').replace('\\\n', '\n').strip()
ems_tab = md_body(rd(os.path.join(MAT, '埃姆斯_对齐表.md')))
ems_tab = ems_tab[ems_tab.index('| 编号'):].strip()

def E(id, title, citation, text, *, page=None, marker=None, text_kind='录文', sendable=True, basis='', visibility='本机材料包', written_raw=None, written=None, note='', transcriber=''):
    return dict(id=id, title=title, citation=citation, text=text, text_kind=text_kind, page=page or {'system': '无', 'value': ''}, page_marker=marker,
                sendable=sendable, sendable_basis=basis, visibility=visibility, written_date_raw=written_raw, written_date=written, note=note, transcriber=transcriber)

MAO_MARK = '〔原刊第(\\d+)页〕'
entries = [
 E('ems-a', '埃姆斯电报甲本：阿贝肯致俾斯麦原电（1870-07-13）', 'GHDI 德文页（底本 Bismarck, Die gesammelten Werke, Friedrichsruher Ausgabe 第 6b 卷第 1612 号）', rd(os.path.join(MAT, '埃姆斯_甲_阿贝肯原电.txt')).strip(),
   text_kind='原文', basis='公开文本', visibility='公开', written_raw='1870年7月13日', written='1870-07-13'),
 E('ems-b', '埃姆斯电报乙本：俾斯麦改定的新闻稿（1870-07-13）', '同上', rd(os.path.join(MAT, '埃姆斯_乙_新闻稿.txt')).strip(),
   text_kind='原文', basis='公开文本', visibility='公开', written_raw='1870年7月13日', written='1870-07-13'),
 E('ems-align-table', '埃姆斯两本程序对齐表（difflib，词与标点，不归一）', '第十周/demo/scripts/ems_align.py 生成，2026-11-15', ems_tab, text_kind='转写', basis='程序输出', visibility='公开'),
 E('chokugo-seibun', '《教育勅語》成文（1890-10-30）', '讲义附录"课堂材料"；已对国立公文書館原本影像（請求番号 平25文科00001100）', seibun,
   text_kind='原文', basis='公有领域', visibility='公开', written_raw='明治二十三年十月三十日', written='1890-10-30', note='旧字形以原本为准尚待逐字确认'),
 E('mao-history', '茅海建 2002 学术史一节（《近代史研究》2002 年第 4 期第 197—208 页）', '茅海建《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正》（一），《近代史研究》2002 年第 4 期', rd(os.path.join(MAT, '茅海建_学术史一节_页198-208.txt')).strip(),
   page={'system': '原刊页', 'value': '197—208'}, marker=MAO_MARK, basis='教师 2026-11-14 同意送模型', note='知网文字层＋OCR 标点；脚注夹在正文中'),
 E('mao-conclusion', '茅海建 2002 结论一节（《近代史研究》2002 年第 6 期第 174—176 页）', '茅海建前引文（三），《近代史研究》2002 年第 6 期', rd(os.path.join(MAT, '茅海建_结论一节_页174-176.txt')).strip(),
   page={'system': '原刊页', 'value': '174—176'}, marker=MAO_MARK, basis='教师 2026-11-14 同意送模型', note='同上'),
 E('inada-chronology-1890', '稲田 1971 年表明治二十三年条录文（原书第 396—398 页）', '稲田正次『教育勅語成立過程の研究』（講談社，1971）', md_body(rd(os.path.join(MAT, '演示2_稲田年表1890录文.md'))),
   page={'system': '原书页', 'value': '396—398'}, basis='教师 2026-11-14 同意送模型', transcriber='Claude 据扫描本目验录入，待人工逐字复核'),
 E('inada-pp3-4', '稲田 1971 第 3—4 页录文（战后诸说）', '同上', md_body(rd(os.path.join(MAT, '演示4_稲田先行研究pp3-4录文.md'))),
   page={'system': '原书页', 'value': '3—4（末句接第 5 页）'}, basis='教师 2026-11-14 同意送模型', transcriber='Claude 据扫描本目验录入，待人工逐字复核'),
 E('inoue-kaigo-draft', '井上毅草案（海後所定初稿，1890 年 6 月；海後复原本。稲田以为次稿）', '『海後宗臣著作集』第十巻（東京書籍，1981）原书第 370—371 页', inoue_draft,
   page={'system': '原书页', 'value': '370—371'}, basis='教师 2026-11-14 同意送模型；2026-11-16 定只进本机材料包', transcriber='Claude 据扫描本目验录入，待人工逐字复核（B-02）', written_raw='明治二十三年六月', written='1890-06'),
 E('inoue-letter-0620', '井上毅致山県有朋书翰（1890-06-20）七条节录', '稲田 1971 原书第 196 页录文（原件在芳川顕正文书）', inoue_letter,
   page={'system': '原书页', 'value': '196'}, basis='同上；只进本机材料包', transcriber='Claude 据扫描本目验节录，待人工逐字复核（B-03）', written_raw='明治二十三年六月二十日', written='1890-06-20'),
]
for e in entries: e['sha256'] = hashlib.sha256(e['text'].encode()).hexdigest()

pub, loc = [], []
for e in entries:
    if e['visibility'] == '公开': pub.append(e)
    else:
        stub = dict(e, text='', text_kind='仅元数据', note=(e.get('note', '') + '　录文在本机材料包（教师材料，不公开）。').strip()); pub.append(stub); loc.append(e)
for e in pub: assert e['visibility'] == '公开' or not e['text'], e['id']

# 条件卡：与 docs/week10/plan-src/prompts_to_cards.py 相同的办法（只留模板）
cards = json.loads(subprocess.check_output([sys.executable, os.path.join(ROOT, 'docs/week10/plan-src/prompts_to_cards.py'), os.path.join(W10, 'demo'), '/dev/stdout']).decode().split('\n10 cards')[0])['cards']
for c in cards:
    c['settings'] = {'deepseek': {'thinking': 'disabled', 'temperature': 0.7}, 'kimi': {'reasoning_effort': 'low', 'temperature': '固定（不传）'},
                     '_basis': '教师 2026-11-16：沿用第九周做法'}
    assert '{{material:' in c['user_template'] or not c['materials']
    for m in c['materials']: assert m['entry_id'] in {e['id'] for e in entries}, m

# 运行记录（课前运行面板导出的 JSON；网页版录入）
replays = []
if RUNS and os.path.isdir(RUNS):
    for fn in sorted(glob.glob(os.path.join(RUNS, '**', '*.json'), recursive=True)):
        if any(p.startswith('_') for p in os.path.relpath(fn, RUNS).split(os.sep)): continue
        j = json.load(open(fn, encoding='utf-8'))
        rs = j['runs'] if isinstance(j, dict) and 'runs' in j else (j if isinstance(j, list) else [j])
        for r in rs:
            s = json.dumps(r)
            assert not re.search(r'"(apiKey|api_key|authorization)"\s*:', s, re.I), fn
            if not r.get('reply'): continue
            replays.append(dict(r, origin_mode=r.get('origin_mode') or r.get('mode'), mode='replay'))

os.makedirs(os.path.join(APP, 'prototype/data'), exist_ok=True); os.makedirs(os.path.join(APP, 'local-only'), exist_ok=True)
gen = datetime.datetime.now().astimezone().isoformat(timespec='seconds')
def js(name, var, obj, head):
    with open(os.path.join(APP, 'prototype/data', name), 'w', encoding='utf-8') as f:
        f.write(f'/* {head} 由 scripts/build_packs.py 生成，请勿手改。 */\nwindow.{var} = ' + json.dumps(obj, ensure_ascii=False, indent=0) + ';\n')
js('w10-public.js', 'W10_PUBLIC', {'generated': gen, 'packs': [{'id': 'w10-materials', 'title': '第十周课堂材料', 'entries': pub}], 'replays': []}, '公开材料：埃姆斯两本（GHDI）、对齐表、勅語成文；教师材料只留元数据。')
ems_rows = [dict(id=m.group(1), op=m.group(2), a='' if m.group(3) == '—' else m.group(3), b='' if m.group(4) == '—' else m.group(4))
            for m in re.finditer(r'^\| (V\d\d) \| (.) \| (.*) \| (.*) \|\s*$', ems_tab, re.M)]
assert len(ems_rows) == 20
with open(os.path.join(APP, 'prototype/data/w10-public.js'), 'a', encoding='utf-8') as f:
    f.write('/* 课前 ems_align.py 的对齐表（D10 页面实算后逐条比对用） */\nwindow.W10_EMS_TABLE = ' + json.dumps(ems_rows, ensure_ascii=False) + ';\n')
js('w10-cards.js', 'W10_CARDS', cards, '条件卡（模板＋材料编号，不含材料正文）。')
k9 = json.load(open(os.path.join(ROOT, 'docs/week09/schemas/importer-kinds.w09.json'), encoding='utf-8'))
k10 = json.load(open(os.path.join(ROOT, 'docs/week10/schemas/importer-kinds.w10.json'), encoding='utf-8'))
kinds = {'_note': k10['_note'], '_guess': k10['_guess'], 'sourcepack': k9['sourcepack'], 'runs': k9['runs'], 'web': k9['web']}
kinds.update({k: v for k, v in k10.items() if not k.startswith('_')})
js('w10-kinds.js', 'W10_KINDS', kinds, '导入对话框类型：第九周 sourcepack、runs、web ＋ docs/week10/schemas/importer-kinds.w10.json。')
pack = {'format': 'w10-pack/v1', 'generated': gen, 'packs': [{'id': 'w10-materials', 'title': '第十周课堂材料（本机）', 'entries': loc}], 'replays': replays,
        '_note': '本机材料包：教师材料录文与课前运行记录。不入 Git、不发布、不分发。'}
json.dump(pack, open(os.path.join(APP, 'local-only/week10-pack.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'公开条目 {len(pub)}（含正文 {sum(1 for e in pub if e["text"])}）；本机条目 {len(loc)}；条件卡 {len(cards)}；回放 {len(replays)}')
