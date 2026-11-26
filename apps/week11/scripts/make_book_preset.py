#!/usr/bin/env python3
"""D13"真实修订稿"本机预置：从教师书稿（带修订；教师 2026-11-26 定为按已刊稿处理）截出一节，另存为小 .docx（候选，未经教师确认）。

截取：第一章第一节"二、明治中期'臣民'教育中传统与近代的调和"（到"三、明治后期……"之前）。
处理：只留这一节的段落与它引用的脚注；修订者名、文档属性里的作者一律改为"作者"（原为邮箱地址）；
      全文不得出现本周材料边界之外的那位人物（见 STATE.md），出现即中止。原文件不改动。
只在本机：输出进 第十一周/demo/材料/，再由 build_packs.py 收进本机材料包；不入 Git、不发布。
用法：python3 make_book_preset.py <课程材料文件夹>
"""
import re, sys, zipfile, hashlib
from pathlib import Path

root = Path(sys.argv[1])
src = next((root / '第十一周/research/原始数据/教师提供/20261126').glob('李原榛_大正时期臣民形塑书稿_带修订*.docx'))
out = root / '第十一周/demo/材料/书稿_明治中期一节_带修订_本机.docx'
START, END = '二、明治中期“臣民”教育中传统与近代的调和', '三、明治后期对《教育敕语》体制的批判与反思'
BAN = re.compile('\u4e2d\u5cf6|\u4e2d\u5c9b|\u5fb3\u8535|\u5fb7\u85cf|Nakajima', re.I)  # 材料边界外的人名，以转义写出
EMAIL = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
before = hashlib.sha256(src.read_bytes()).hexdigest()

z = zipfile.ZipFile(src)
doc = z.read('word/document.xml').decode('utf8')
body_open = doc.index('<w:body>') + len('<w:body>')
body_close = doc.rindex('</w:body>')
body = doc[body_open:body_close]
sect = re.findall(r'<w:sectPr[ >].*?</w:sectPr>', body, re.S)[-1]
blocks = re.findall(r'<w:p[ >].*?</w:p>|<w:p/>|<w:tbl>.*?</w:tbl>', body, re.S)
text = lambda b: ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', b))
alltext = lambda b: text(b) + ''.join(re.findall(r'<w:delText[^>]*>([^<]*)</w:delText>', b))
i0 = next(i for i, b in enumerate(blocks) if text(b).strip().startswith(START))
i1 = next(i for i, b in enumerate(blocks) if i > i0 and text(b).strip().startswith(END))
keep = blocks[i0:i1]
keep = [re.sub(r'<w:sectPr[ >].*?</w:sectPr>', '', b, flags=re.S) for b in keep]
seg = ''.join(keep)
assert not BAN.search(''.join(alltext(b) for b in keep)), '正文含边界外材料'
ids = set(re.findall(r'<w:footnoteReference [^>]*w:id="(\d+)"', seg))

fn = z.read('word/footnotes.xml').decode('utf8')
fhead = fn[:fn.index('<w:footnote ')]
foots = re.findall(r'<w:footnote [^>]*>.*?</w:footnote>', fn, re.S)
fkeep = [f for f in foots if re.search(r'w:type="(separator|continuationSeparator|continuationNotice)"', f) or re.search(r'w:id="(\d+)"', f).group(1) in ids]
assert not BAN.search(''.join(alltext(f) for f in fkeep)), '脚注含边界外材料'
fn2 = fhead + ''.join(fkeep) + '</w:footnotes>'
doc2 = doc[:body_open] + seg + sect + doc[body_close:]


def scrub(s):
    s = re.sub(r'w:author="[^"]*"', 'w:author="作者"', s)
    s = re.sub(r'w:initials="[^"]*"', 'w:initials="作"', s)
    s = re.sub(r'(<dc:creator>|<cp:lastModifiedBy>)[^<]*(</)', r'\1作者\2', s)
    return EMAIL.sub('作者', s)


with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as w:
    for n in z.namelist():
        if n in ('word/comments.xml', 'word/commentsExtended.xml', 'word/commentsIds.xml', 'word/commentsExtensible.xml'):
            continue
        b = z.read(n)
        if n == 'word/document.xml':
            b = doc2.encode('utf8')
        elif n == 'word/footnotes.xml':
            b = fn2.encode('utf8')
        if n.endswith('.xml') or n.endswith('.rels'):
            s = scrub(b.decode('utf8'))
            assert not BAN.search(s) or n not in ('word/document.xml', 'word/footnotes.xml'), n
            b = s.encode('utf8')
        w.writestr(n, b)

chk = zipfile.ZipFile(out)
for n in chk.namelist():
    if n.endswith('.xml'):
        s = chk.read(n).decode('utf8')
        assert not EMAIL.search(s), ('邮箱', n)
        if n.startswith('word/') and BAN.search(s):
            raise SystemExit(f'{n} 含边界外材料，停止')
assert hashlib.sha256(src.read_bytes()).hexdigest() == before
d = chk.read('word/document.xml').decode('utf8')
print('段落', len(keep), '脚注', len(ids), 'ins', len(re.findall('<w:ins ', d)), 'del', len(re.findall('<w:del ', d)), '→', out.name)
