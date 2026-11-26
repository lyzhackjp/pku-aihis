#!/usr/bin/env python3
"""教师《日本文论》2023 年论文：刊本 PDF 文字层 → 逐页正文与脚注、分段文字（候选，未经教师确认）。

教师 2026-11-26 同意：线上全文取自刊本 PDF 文字层；作者 Word 稿只可对照分段。
实际分段直接据刊本版式（pdftotext -layout 的段首缩进），作者 Word 稿不读，个人信息不会进任何输出。
注意：刊本的日文脚注（会议录出处）不在 PDF 文字层里，只收得到中文脚注。

用法（在教师电脑上的 Linux 环境里跑，需要 pdftotext）：
  python3 make_li2023.py <课程材料文件夹>
输出：第十一周/demo/材料/李原榛2023_刊本文字.json
      第十一周/demo/材料/李原榛2023_第152-153页_文风段.txt
      第十一周/demo/材料/李原榛2023_第156-159页_原文.txt
"""
import json, re, subprocess, sys
from pathlib import Path

root = Path(sys.argv[1])
w11 = root / '第十一周'
src = w11 / 'research/原始数据/教师提供'
pdf = next(src.glob('李原榛_2023_战后初期*.pdf'))
out = w11 / 'demo/材料'
out.mkdir(parents=True, exist_ok=True)
OFFSET = 149  # 原刊页码 = PDF 页序 + 149（PDF 第 1 页页脚印"— 150 —"）
CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
HALF = {',': '，', ';': '；', ':': '：', '?': '？', '!': '！', '(': '（', ')': '）'}


def is_wide(ch):
    return ord(ch) > 0x2000


def tidy(s):
    """去掉与非 ASCII 字符相邻的空白；中文之间的半角标点改全角。"""
    s = re.sub(r'\s+', ' ', s)
    out = []
    for i, ch in enumerate(s):
        if ch == ' ':
            a = s[i - 1] if i else ''
            b = s[i + 1] if i + 1 < len(s) else ''
            if (a and is_wide(a)) or (b and is_wide(b)) or not a or not b:
                continue
            if a in HALF or b in HALF:
                continue
        out.append(ch)
    s = ''.join(out)
    s = re.sub(r'(?<=[^\x00-\x7f])([,;:?!])', lambda m: HALF[m.group(1)], s)
    s = re.sub(r'([,;:?!])(?=[^\x00-\x7f])', lambda m: HALF[m.group(1)], s)
    s = re.sub(r'\((?=[^\x00-\x7f])', '（', s)
    s = re.sub(r'(?<=[^\x00-\x7f])\)', '）', s)
    return s


def norm(s):
    s = re.sub(r'\s+', '', s)
    s = re.sub('[' + CIRC + ']', '', s)
    s = s.translate(str.maketrans({'“': '"', '”': '"', '‘': "'", '’': "'", '「': '"', '」': '"', '，': ',', '；': ';', '：': ':', '（': '(', '）': ')', '？': '?', '！': '!'}))
    return s


def page_text(i):
    return subprocess.run(['pdftotext', '-layout', '-f', str(i), '-l', str(i), str(pdf), '-'], capture_output=True, text=True, check=True).stdout


npages = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', str(pdf)], capture_output=True, text=True).stdout).group(1))
pages = []
blocks = []  # (page, kind, text)；kind: start（段首，缩进 1—4 格）、cont（顶格）、heading（居中短行）
FOOT_START = re.compile(r'^\s{0,3}([' + CIRC + r']\s{2,}|\*{1,2}\s*\S)')
for i in range(1, npages + 1):
    lines = page_text(i).split('\n')
    foot = next((int(m.group(1)) for l in lines for m in [re.match(r'^\s*—\s*(\d+)\s*—\s*$', l)] if m), None)
    pno = i + OFFSET
    if foot not in (None, pno):  # 篇末英文提要等另编页码，不收
        print('skip pdf page', i, 'footer', foot)
        continue
    body, notes, infoot = [], [], False
    for l in lines:
        st = l.strip()
        if not st or re.match(r'^—\s*\d+\s*—$', st) or st.startswith('日本文论') or st.startswith('战后初期日本民主化过程中天皇制的应对'):
            continue
        if FOOT_START.match(l):
            infoot = True
            m = re.match(r'^\s*([' + CIRC + r']|\*{1,2})\s*(.*)', l)
            notes.append({'mark': m.group(1), 'text': m.group(2)})
            continue
        if infoot:
            notes[-1]['text'] += ' ' + st
            continue
        lead = len(l) - len(l.lstrip(' '))
        kind = 'cont' if lead == 0 else 'start' if lead <= 4 else 'heading'
        body.append((kind, l.strip()))
    for n in notes:
        n['text'] = tidy(n['text']).strip()
    pages.append({'page': pno, 'pdf_page': i, 'body': tidy(' '.join(t for _, t in body)).strip(), 'notes': notes})
    for kind, t in body:
        blocks.append((pno, kind, t))

# 分段：据刊本版式（段首缩进两格；居中短行为标题）。作者 Word 稿不读。
# 引文块：各行都缩进，上一行是满行（≥26 字）时，本行接上一行，不另起段
paras, cur, prev = [], None, None
for pno, kind, t in blocks:
    width = len(re.sub(r'\s', '', t))
    if kind != 'cont' and prev and prev[0] != 'cont' and prev[1] >= 26 and cur is not None:
        cur['heading'] = False
        cur['quote'] = True
        kind = 'cont'
    prev = (kind if kind == 'cont' and not (cur or {}).get('quote') else 'quote' if (cur or {}).get('quote') and kind == 'cont' else kind, width)
    if kind in ('start', 'heading') or cur is None or cur.get('heading'):
        cur = {'pages': [pno], 'raw': [], 'heading': kind == 'heading', 'quote': False}
        paras.append(cur)
    if cur['pages'][-1] != pno:
        cur['pages'].append(pno)
    cur['raw'].append((pno, t))
for k, p in enumerate(paras, 1):
    p['para_id'] = f'L{k:02d}'
    parts = []
    for pno, t in p['raw']:
        if parts and parts[-1]['page'] == pno:
            parts[-1]['text'] += ' ' + t
        else:
            parts.append({'page': pno, 'text': t})
    for pt in parts:
        pt['text'] = tidy(pt['text']).strip()
    p['parts'] = parts
    p['text'] = ''.join(x['text'] for x in parts)
wparas, cuts = [], set()
doc = {
    '_note': '候选，未经教师确认。教师《日本文论》2023 年第 2 辑论文刊本 PDF 文字层（原刊第 150 页起；页码＝PDF 页序＋149）。分段据刊本版式（段首缩进、居中标题）；作者 Word 稿未读取。教师 2026-11-26 同意线上使用全文。',
    'source': '李原榛：《战后初期日本民主化过程中天皇制的应对》，《日本文论》2023 年第 2 辑（总第 10 辑）',
    'pages': [{k: v for k, v in pg.items()} for pg in pages],
    'paragraphs': [{'para_id': p['para_id'], 'pages': p['pages'], 'heading': p['heading'], 'quote': p['quote'], 'parts': p['parts']} for p in paras],
}
(out / '李原榛2023_刊本文字.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf8')


def with_marks(parts_list):
    s, last = '', None
    for pt in parts_list:
        if pt['page'] != last:
            s += f'〔原刊第{pt["page"]}页〕'
            last = pt['page']
        s += pt['text']
    return s


def segment(start_text, end_text):
    """从含 start_text 的段起，到含 end_text 的段止（含），截取首尾句。"""
    allparts = [(p, pt) for p in paras for pt in p['parts']]
    flat = ''.join(pt['text'] for _, pt in allparts)
    a = flat.find(start_text)
    b = flat.find(end_text, a) + len(end_text)
    assert a >= 0 and b > a, (start_text, end_text)
    res, off, lastpara = [], 0, None
    for p, pt in allparts:
        t = pt['text']
        lo, hi = max(a, off), min(b, off + len(t))
        if lo < hi:
            if lastpara is not None and p is not lastpara:
                res.append({'page': pt['page'], 'text': '\n'})
            res.append({'page': pt['page'], 'text': t[lo - off:hi - off]})
            lastpara = p
        off += len(t)
    return with_marks(res).replace('\n〔', '〔')


style = segment('关于战后初期天皇制的延续与民主化改革之间的关系问题', '已触及战败前“国体”思想的根本。')
(out / '李原榛2023_第152-153页_文风段.txt').write_text(style + '\n', encoding='utf8')

txt, last = '', None
for p in paras:
    seg = [pt for pt in p['parts'] if 156 <= pt['page'] <= 159]
    if not seg:
        continue
    if txt:
        txt += '\n'
    for pt in seg:
        if pt['page'] != last:
            txt += f'〔原刊第{pt["page"]}页〕'
            last = pt['page']
        txt += pt['text']
(out / '李原榛2023_第156-159页_原文.txt').write_text(txt + '\n', encoding='utf8')
print(len(pages), 'pages;', len(paras), 'paragraphs（其中标题', sum(p['heading'] for p in paras), '）')
print('style chars', len(style))
