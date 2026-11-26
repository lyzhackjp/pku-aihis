#!/usr/bin/env python3
"""docx-revisions 的夹具｜候选，未经教师确认｜2026-11-25｜第一步
用法：python3 -I make_revision_fixture.py jia_draft.docx jia_revisions.docx
在练习材料甲（教学构造）的副本上用程序写入：正文三处修订（一改＝删＋插、一删、一插）、一条批注、脚注 3 中一处修订（删"201"插"199"）。
修订者两名：DeepSeek 2026-11-25（模拟"比较文档"写入的模型修改）、作者（测试）。程序构造，未在 Word 中打开核对（见运行清单）。
期望结果写在 jia_revisions.expected.json，tests/lib.test.mjs 逐条比对。原文件只读。"""
import sys, zipfile, json, re
SRC, DST = sys.argv[1], sys.argv[2]
RPR = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/><w:sz w:val="24"/></w:rPr>'
FRPR = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/><w:sz w:val="18"/></w:rPr>'
M, A, D1, D2 = 'DeepSeek 2026-11-25', '作者（测试）', '2026-11-25T10:00:00Z', '2026-11-25T11:00:00Z'
r = lambda t, p=RPR: f'<w:r>{p}<w:t xml:space="preserve">{t}</w:t></w:r>'
ins = lambda i, a, d, t, p=RPR: f'<w:ins w:id="{i}" w:author="{a}" w:date="{d}"><w:r>{p}<w:t xml:space="preserve">{t}</w:t></w:r></w:ins>'
dele = lambda i, a, d, t, p=RPR: f'<w:del w:id="{i}" w:author="{a}" w:date="{d}"><w:r>{p}<w:delText xml:space="preserve">{t}</w:delText></w:r></w:del>'
zin = zipfile.ZipFile(SRC)
doc = zin.read('word/document.xml').decode(); fn = zin.read('word/footnotes.xml').decode()
def sub_once(s, old, new):
    assert s.count(old) == 1, old[:40]; return s.replace(old, new)
# 1 改（删＋插），模型提议，挂批注 0
old1 = r('茅海建在逐日考订之后接受了这一切分，认为“戊戌政变虽未因袁世凯告密而发生，但袁世凯告密的消息传到北京，大大加剧了政变的激烈程度”。')
new1 = ('<w:commentRangeStart w:id="0"/>' + r('茅海建') + dele(101, M, D1, '在逐日考订之后') + ins(102, M, D1, '逐日考订后') +
        r('接受了这一切分') + '<w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r>' +
        r('，认为“戊戌政变虽未因袁世凯告密而发生，但袁世凯告密的消息传到北京，大大加剧了政变的激烈程度”。'))
doc = sub_once(doc, old1, new1)
# 2 删，作者
old2 = r('总之，黄彰健、茅海建的研究表明，政变的爆发与告密无关，告密只是加剧了政变。这一判断已为学界普遍接受。')
new2 = r('总之，黄彰健、茅海建的研究表明，政变的爆发与告密无关，告密只是加剧了政变。') + dele(103, A, D2, '这一判断已为学界普遍接受。')
doc = sub_once(doc, old2, new2)
# 3 插，作者
old3 = r('综上所述，学界关于告密与政变关系的讨论已基本形成共识，但告密的消息究竟在哪一天、经由何人传到北京，仍有待进一步研究。本文拟以此为中心展开考察。')
assert old3 in doc, '第 7 段的 run 结构与预期不同'
new3 = r('综上所述，学界关于告密与政变关系的讨论已基本形成共识，但告密的消息究竟在哪一天、经由何人传到北京，') + ins(104, A, D2, '据现有材料') + r('仍有待进一步研究。本文拟以此为中心展开考察。')
doc = sub_once(doc, old3, new3)
# 4 脚注 3：页码 201 → 199，作者
oldf = r(' 茅海建：《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正（一）》，第201页。', FRPR)
newf = r(' 茅海建：《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正（一）》，第', FRPR) + dele(105, A, D2, '201', FRPR) + ins(106, A, D2, '199', FRPR) + r('页。', FRPR)
fn = sub_once(fn, oldf, newf)
W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
comments = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments {W}><w:comment w:id="0" w:author="{A}" w:date="{D2}" w:initials="T">'
            '<w:p><w:r><w:t xml:space="preserve">流畅：采纳，不改变意思</w:t></w:r></w:p></w:comment></w:comments>')
ct = zin.read('[Content_Types].xml').decode().replace('</Types>', '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>')
rels = zin.read('word/_rels/document.xml.rels').decode().replace('</Relationships>', '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>')
with zipfile.ZipFile(DST, 'w', zipfile.ZIP_DEFLATED) as zo:
    for it in zin.infolist():
        data = {'word/document.xml': doc, 'word/footnotes.xml': fn, '[Content_Types].xml': ct, 'word/_rels/document.xml.rels': rels}.get(it.filename)
        zo.writestr(it, data.encode() if data is not None else zin.read(it.filename))
    zo.writestr('word/comments.xml', comments.encode())
exp = {'_note': '期望的抽取结果（程序构造夹具）。para_index 为 Word 段落序号（含标题段，从 0 起）。',
       'edits': [
  {'para_index': 3, 'in_footnote': False, 'author': M, 'kinds': ['del', 'ins'], 'removed': '在逐日考订之后', 'added': '逐日考订后',
   'before_has': '茅海建在逐日考订之后接受了这一切分', 'after_has': '茅海建逐日考订后接受了这一切分', 'comment': '流畅：采纳，不改变意思'},
  {'para_index': 7, 'in_footnote': False, 'author': A, 'kinds': ['del'], 'removed': '这一判断已为学界普遍接受。', 'added': '',
   'before_has': '告密只是加剧了政变。这一判断已为学界普遍接受。', 'after_has': '告密只是加剧了政变。', 'comment': None},
  {'para_index': 8, 'in_footnote': False, 'author': A, 'kinds': ['ins'], 'removed': '', 'added': '据现有材料',
   'before_has': '经由何人传到北京，仍有待进一步研究', 'after_has': '经由何人传到北京，据现有材料仍有待进一步研究', 'comment': None},
  {'note_id': '3', 'in_footnote': True, 'author': A, 'kinds': ['del', 'ins'], 'removed': '201', 'added': '199',
   'before_has': '第201页', 'after_has': '第199页', 'comment': None}],
       'comments': [{'id': '0', 'author': A, 'text': '流畅：采纳，不改变意思', 'range_text': '茅海建逐日考订后接受了这一切分', 'range_text_before': '茅海建在逐日考订之后接受了这一切分'}]}
json.dump(exp, open(DST.replace('.docx', '.expected.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('→', DST)
