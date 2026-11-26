#!/usr/bin/env python3
"""第十一周：由课程文件夹的材料生成课件的公开材料、条件卡与本机材料包｜候选，未经教师确认｜2026-11-26（第一批；第二批补教师 2023 年论文、会议录、植入副本、演示③(b)、书稿一节）
用法：python3 apps/week11/scripts/build_packs.py <课程文件夹> [<运行记录目录>]
输出：
  prototype/data/w11-public.js  公开包（随课件发布）：练习材料甲（正文、分段、脚注、.docx 原件 base64）、修订夹具、讲义图 1 摘编、陈澧《引書法》录文；
                                受限条目只留元数据
  prototype/data/w11-cards.js   条件卡（docs/week11/examples/condition-cards.w11.json，不含材料正文）
  prototype/data/w11-kinds.js   导入对话框类型（第九周 sourcepack、runs、web ＋ docs/week11/schemas/importer-kinds.w11.json）
  local-only/week11-pack.json   本机材料包（不入 Git、不发布）：茅海建文两节、郭卫东与刘路生两文（文字层与原页图像）、4.3 答案（教师模式）、课前运行记录
规则：茅、郭、刘原文只进本机材料包（线上只放页码与短引）；4.3 答案只进本机材料包；教师 2023 年论文可线上使用全文（教师 2026-11-25，第二批接入）；
疑似未刊稿的材料一律只进本机材料包（教师 2026-11-25）。只用 Python 标准库与 pdftotext、pdftoppm（poppler）。"""
import json, sys, os, glob, re, hashlib, subprocess, datetime, base64, zipfile, tempfile
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ROOT = os.path.dirname(os.path.dirname(APP))
C = os.path.abspath(sys.argv[1]); W11 = os.path.join(C, '第十一周'); RUNS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(W11, 'demo', '运行记录')
rd = lambda p: open(p, encoding='utf-8').read()
FX = os.path.join(APP, 'tests', 'fixtures')

def E(id, title, citation, text, *, page=None, marker=None, text_kind='录文', sendable=True, basis='', visibility='本机材料包', note='', transcriber=''):
    return dict(id=id, title=title, citation=citation, text=text, text_kind=text_kind, page=page or {'system': '无', 'value': ''}, page_marker=marker,
                sendable=sendable, sendable_basis=basis, visibility=visibility, note=note, transcriber=transcriber)

# 练习材料甲：由 .docx 抽正文（第 4 段的两个 Word 段落合并），与 docs/week11/examples 同一办法
z = zipfile.ZipFile(os.path.join(FX, 'jia_draft.docx'))
doc = z.read('word/document.xml').decode()
wps = [''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)) for p in re.findall(r'<w:p[ >].*?</w:p>', doc, re.S)]
wps = [t for t in wps if t.strip()]
paras = [wps[1], wps[2], wps[3], wps[4] + wps[5], wps[6], wps[7], wps[8]]
assert len(paras) == 7
jia_body = '\n\n'.join(f'〔{i}〕{t}' for i, t in enumerate(paras, 1))
jia_p246 = '\n\n'.join(f'〔{i}〕{paras[i - 1]}' for i in (2, 4, 6))
jia_p3 = paras[2]
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()

# 讲义图 1 前四列（本课摘编）
mx = json.load(open(os.path.join(ROOT, 'docs/week11/examples/matrix.wuxu.example.json'), encoding='utf-8'))['rows']
matrix_md = '| 学者 | 年份 | 主张（摘） | 回应对象 |\n|---|---|---|---|\n' + '\n'.join(f"| {r['scholar']} | {r['year']} | {r['claim']} | {r['responds_to'] or '（需回原文）'} |" for r in mx)

# 陈澧《引書法》录文（1929 年前文本；录文待人工逐字复核）
cl = rd(os.path.join(W11, 'research', '陈澧_引书法_录文.md')).split('\n---\n')[1]
cl = re.sub(r'\*\*第 (\d+) 页\*\*', r'〔原书第\1页〕', cl).strip()

MAO = '〔原刊第(\\d+)页〕'
M10 = os.path.join(C, '第十周', 'demo', '材料')
def pdf_pages(path, first, last, offset):
    out = []
    for i in range(first, last + 1):
        t = subprocess.check_output(['pdftotext', '-f', str(i), '-l', str(i), '-raw', path, '-']).decode('utf-8', 'replace')
        out.append(f'〔原刊第{i + offset}页〕\n' + re.sub(r'\s+', '', t))
    return '\n'.join(out)
def pdf_images(path, pages, offset):
    imgs = {}
    with tempfile.TemporaryDirectory() as td:
        for i in pages:
            subprocess.check_call(['pdftoppm', '-f', str(i), '-l', str(i), '-r', '100', '-gray', '-jpeg', '-jpegopt', 'quality=60', path, os.path.join(td, 'p')])
            f = sorted(glob.glob(os.path.join(td, 'p*.jpg')))[-1]
            imgs[str(i + offset)] = 'data:image/jpeg;base64,' + b64(f); os.remove(f)
    return imgs
GUO = os.path.join(W11, '练习材料', '郭卫东_2002_再论戊戌政变中袁世凯的告密问题_清史研究2002-1.pdf')
LIU = os.path.join(W11, '练习材料', '刘路生_2005_戊戌政变袁世凯初四告密说不能成立_清史研究2005-1.pdf')

entries = [
 E('jia-body', '练习材料甲：教学构造草稿（正文七段）', '第十一周 练习材料/教学构造草稿.docx（教学构造，有意留下结构与注释问题）', jia_body, text_kind='教学构造', basis='教学构造，可公开', visibility='公开'),
 E('jia-p246', '练习材料甲第 2、4、6 段', '同上', jia_p246, text_kind='教学构造', basis='教学构造，可公开', visibility='公开'),
 E('jia-p3', '练习材料甲第 3 段', '同上', jia_p3, text_kind='教学构造', basis='教学构造，可公开', visibility='公开'),
 E('matrix-fig1-4col', '综述矩阵（讲义图 1 前四列）', '讲义 1.1 @fig-matrix（本课据茅海建文第 4 期第 198—208 页、第 6 期第 175 页与郭卫东文第 31—33 页摘编）', matrix_md, text_kind='教学转述', basis='本课摘编，公开', visibility='公开'),
 E('chenli-yinshufa', '陈澧《引書法》（《陳澧集》第六册第 232—233 页）', '黄國聲主編《陳澧集》第六册，上海古籍出版社（出版年据书目为 2008 年）', cl, page={'system': '原书页', 'value': '232—233'}, marker='〔原书第(\\d+)页〕',
   text_kind='录文', basis='1929 年前文本', visibility='公开', transcriber='Claude 据教师所给扫描本目验录文（2026-11-24），待人工逐字复核（A-03）'),
 E('mao-history', '茅海建 2002 学术史一节（《近代史研究》2002 年第 4 期第 197—208 页）', '茅海建《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正》（一），《近代史研究》2002 年第 4 期', rd(os.path.join(M10, '茅海建_学术史一节_页198-208.txt')).strip(),
   page={'system': '原刊页', 'value': '197—208'}, marker=MAO, basis='教师 2026-11-14 同意送模型', note='知网文字层＋OCR 标点；脚注夹在正文中（同第十周）'),
 E('mao-conclusion', '茅海建 2002 结论一节（《近代史研究》2002 年第 6 期第 174—176 页）', '茅海建前引文（三），《近代史研究》2002 年第 6 期', rd(os.path.join(M10, '茅海建_结论一节_页174-176.txt')).strip(),
   page={'system': '原刊页', 'value': '174—176'}, marker=MAO, basis='教师 2026-11-14 同意送模型', note='同上'),
 E('guo-2002', '郭卫东 2002（《清史研究》2002 年第 1 期第 31—38 页）文字层', '郭卫东《再论戊戌政变中袁世凯的"告密"问题》，《清史研究》2002 年第 1 期；知网 PDF（PDF 页序＋30＝原刊页）', pdf_pages(GUO, 1, 8, 30),
   page={'system': '原刊页', 'value': '31—38'}, marker=MAO, sendable=False, basis='未获准送模型（只用于 4.3 原页面板）', note='知网文字层，已去空白；标点位置可能错乱，核对以原页图像为准'),
 E('liu-2005', '刘路生 2005（《清史研究》2005 年第 1 期第 47—54 页）文字层', '刘路生《戊戌政变袁世凯初四告密说不能成立——兼与郭卫东先生商榷》，《清史研究》2005 年第 1 期；知网 PDF（PDF 页序＋46＝原刊页）', pdf_pages(LIU, 1, 8, 46),
   page={'system': '原刊页', 'value': '47—54'}, marker=MAO, sendable=False, basis='未获准送模型（只用于 4.3 原页面板）', note='同上'),
]

# 教师 2023 年论文（第二批）：刊本 PDF 文字层，由 scripts/make_li2023.py 生成；教师 2026-11-25、11-26 同意线上使用全文
MAT = os.path.join(W11, 'demo', '材料')
li = json.load(open(os.path.join(MAT, '李原榛2023_刊本文字.json'), encoding='utf-8'))
LI_CIT = '李原榛：《战后初期日本民主化过程中天皇制的应对——以帝国议会中的“国体”论说为中心》，《日本文论》2023 年第 2 辑（总第 10 辑），刊本 PDF 文字层（日文脚注不在文字层中）'
LI_BASIS = '教师 2026-11-24 同意送模型（已刊论文）；2026-11-25 同意线上使用全文'
li_style = rd(os.path.join(MAT, '李原榛2023_第152-153页_文风段.txt')).strip()
li_156 = rd(os.path.join(MAT, '李原榛2023_第156-159页_原文.txt')).strip()
IMP = json.load(open(os.path.join(ROOT, 'docs/week11/examples/implants-findings.toy.example.json'), encoding='utf-8'))['implants']
li_imp = li_156
for im in IMP:
    assert li_imp.count(im['before']) == 1, (im['error_id'], li_imp.count(im['before']))
    li_imp = li_imp.replace(im['before'], im['after'])
entries += [
 E('li2023-p152-153', '教师 2023 年论文第 152—153 页评述大谷伸治研究的一段（文风演示）', LI_CIT, li_style, page={'system': '原刊页', 'value': '152—153'}, marker=MAO, basis=LI_BASIS, visibility='公开',
   note='起止句据讲义 3.2 文风演示框；圈码为刊本脚注号（每页重新编号）'),
 E('li2023-p156-159', '教师 2023 年论文第 156—159 页（第一节后半，原文）', LI_CIT, li_156, page={'system': '原刊页', 'value': '156—159'}, marker=MAO, basis=LI_BASIS, visibility='公开'),
 E('li2023-p156-159-implanted', '教师 2023 年论文第 156—159 页植入三处错误的副本（演示②′）', LI_CIT + '；据讲义 2.3 植入三处：' + '；'.join(f"{i['location']}“{i['before']}”→“{i['after']}”" for i in IMP),
   li_imp, page={'system': '原刊页', 'value': '156—159'}, marker=MAO, text_kind='教学构造', basis='教师 2026-11-24 同意送模型（已刊论文的植入副本）', note='植入副本，不是论文原文；只在本机'),
]
D15 = json.load(open(os.path.join(C, '第十周', 'demo', 'D15_李原榛2023', '史料包_帝国议会会议录4则.json'), encoding='utf-8'))['packs'][0]['entries']
for e in D15:
    entries.append(dict(E(e['id'], e['title'], e['citation'], e['text'], page=e.get('page'), basis='NDL 公开；第十周 D15 史料包', note='第十周 D15 史料包（只在本机，照第十周边界）'), visibility='本机材料包', sendable=True))
for e in entries: e['sha256'] = hashlib.sha256(e['text'].encode()).hexdigest()
pub, loc = [], []
for e in entries:
    if e['visibility'] == '公开': pub.append(e)
    else:
        pub.append(dict(e, text='', text_kind='仅元数据', note=(e.get('note', '') + '　原文在本机材料包（不公开）。').strip())); loc.append(e)
for e in pub: assert e['visibility'] == '公开' or not e['text'], e['id']

cards = json.load(open(os.path.join(ROOT, 'docs/week11/examples/condition-cards.w11.json'), encoding='utf-8'))['cards']
ids = {e['id'] for e in entries} | {'ledger-3'}
for c in cards:
    c['settings'] = {'deepseek': {'thinking': 'disabled', 'temperature': 0.7}, 'kimi': {'reasoning_effort': 'low', 'temperature': '固定（不传）'}, '_basis': '教师 2026-11-25：沿用第十周做法'}
    for m in c['materials']: assert m['entry_id'] in ids, m

replays = []
if RUNS and os.path.isdir(RUNS):
    for fn in sorted(glob.glob(os.path.join(RUNS, '**', '*.json'), recursive=True)):
        if any(p.startswith('_') for p in os.path.relpath(fn, RUNS).split(os.sep)): continue
        j = json.load(open(fn, encoding='utf-8'))
        rs = j['runs'] if isinstance(j, dict) and 'runs' in j else (j if isinstance(j, list) else [j])
        for r in rs:
            assert not re.search(r'"(apiKey|api_key|authorization)"\s*:', json.dumps(r), re.I), fn
            if not r.get('reply') or 'CONNTEST' in r.get('run_id', ''): continue
            replays.append(dict(r, origin_mode=r.get('origin_mode') or r.get('mode'), mode='replay'))

os.makedirs(os.path.join(APP, 'prototype/data'), exist_ok=True); os.makedirs(os.path.join(APP, 'local-only'), exist_ok=True)
gen = datetime.datetime.now().astimezone().isoformat(timespec='seconds')
def js(name, var, obj, head):
    with open(os.path.join(APP, 'prototype/data', name), 'w', encoding='utf-8') as f:
        f.write(f'/* {head} 由 scripts/build_packs.py 生成，请勿手改。 */\nwindow.{var} = ' + json.dumps(obj, ensure_ascii=False, indent=0) + ';\n')
REV = os.path.join(W11, 'demo', '修订稿')
docs = {'jia_draft.docx': b64(os.path.join(FX, 'jia_draft.docx')), 'jia_revisions.docx': b64(os.path.join(FX, 'jia_revisions.docx')),
        'demo3b_reviser.docx': b64(os.path.join(REV, '演示3b_reviser写入.docx'))}
demo3b = {'plan': json.load(open(os.path.join(REV, '演示3b_修订计划.json'), encoding='utf-8')), 'audit': json.load(open(os.path.join(REV, '演示3b_审计.json'), encoding='utf-8')),
          'log': rd(os.path.join(REV, '演示3b_运行日志.txt')).split('\n')[0]}
li_pub = {'source': li['source'], 'citation': LI_CIT, 'note': li['_note'], 'paragraphs': li['paragraphs'], 'notes': {str(p['page']): p['notes'] for p in li['pages'] if p['notes']}}
local_docx = {'book_preset.docx': b64(os.path.join(MAT, '书稿_明治中期一节_带修订_本机.docx'))}
js('w11-public.js', 'W11_PUBLIC', {'generated': gen, 'packs': [{'id': 'w11-materials', 'title': '第十一周课堂材料', 'entries': pub}], 'replays': [], 'docx': docs, 'demo3b': demo3b, 'li2023': li_pub},
   '公开材料：练习材料甲（教学构造）、修订夹具（程序构造）、演示③(b) 修订稿、讲义图 1 摘编、陈澧录文、教师 2023 年论文刊本文字；茅、郭、刘原文、会议录与植入副本只留元数据。')
js('w11-cards.js', 'W11_CARDS', cards, '条件卡（模板＋材料编号，不含材料正文）。')
k9 = json.load(open(os.path.join(ROOT, 'docs/week09/schemas/importer-kinds.w09.json'), encoding='utf-8'))
k11 = json.load(open(os.path.join(ROOT, 'docs/week11/schemas/importer-kinds.w11.json'), encoding='utf-8'))
kinds = {'_note': k11['_note'], '_guess': k11['_guess'], 'sourcepack': k9['sourcepack'], 'runs': k9['runs'], 'web': k9['web']}
kinds.update({k: v for k, v in k11.items() if not k.startswith('_')})
js('w11-kinds.js', 'W11_KINDS', kinds, '导入对话框类型：第九周 sourcepack、runs、web ＋ docs/week11/schemas/importer-kinds.w11.json。')
EX = lambda n: json.load(open(os.path.join(ROOT, 'docs/week11/examples', n), encoding='utf-8'))
js('w11-examples.js', 'W11_EXAMPLES', {n[:-len('.example.json')] if n.endswith('.example.json') else n[:-5]: EX(n) for n in sorted(os.listdir(os.path.join(ROOT, 'docs/week11/examples'))) if n.endswith('.json')},
   '第十一周示例数据（docs/week11/examples，公开或教学构造）。')
answers = rd(os.path.join(W11, 'review', '4.3练习答案_教师用.md'))
pages = {'guo-2002': pdf_images(GUO, [1, 2, 3, 5, 8], 30), 'liu-2005': pdf_images(LIU, [2, 3], 46)}
pack = {'format': 'w11-pack/v1', 'generated': gen, 'packs': [{'id': 'w11-materials', 'title': '第十一周课堂材料（本机）', 'entries': loc}], 'replays': replays,
        'teacher': {'answers_43': answers, 'answers_source': '第十一周/review/4.3练习答案_教师用.md'}, 'page_images': pages, 'docx': local_docx,
        '_note': '本机材料包：茅、郭、刘原文（文字层与原页图像）、会议录 4 则、植入副本、教师书稿一节（D13 预置）、4.3 答案（教师模式）与课前运行记录。不入 Git、不发布、不分发。'}
json.dump(pack, open(os.path.join(APP, 'local-only/week11-pack.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(f'公开条目 {len(pub)}（含正文 {sum(1 for e in pub if e["text"])}）；本机条目 {len(loc)}；条件卡 {len(cards)}；回放 {len(replays)}；原页图像 {sum(len(v) for v in pages.values())} 页')
