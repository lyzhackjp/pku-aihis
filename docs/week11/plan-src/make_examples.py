#!/usr/bin/env python3
"""第十一周数据结构示例｜候选，未经教师确认｜2026-11-25｜第一步
用法（仓库根目录）：python3 docs/week11/plan-src/make_examples.py
只用公开或教学构造的内容：练习材料甲（apps/week11/tests/fixtures/jia_draft.docx，教学构造，可分发）、讲义图 1／5／10（本课摘编或教学构造）、
扩充部分甲二小例与乙二样例（教学构造）。茅、郭、刘原文与教师论文不进示例。"""
import json, re, zipfile, pathlib
R = pathlib.Path('.'); D = R / 'docs/week11/examples'; D.mkdir(parents=True, exist_ok=True)
FX = R / 'apps/week11/tests/fixtures/jia_draft.docx'
def dump(name, obj):
    (D / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + '\n', encoding='utf-8'); print('→', name)
NOTE = '候选，未经教师确认（2026-11-25，第一步）。'

# 一、练习材料甲：Word 段落 → 论文段落（第 4 段被分页断成两个 Word 段落）
z = zipfile.ZipFile(FX); doc = z.read('word/document.xml').decode()
wps = []
for p in re.findall(r'<w:p[ >].*?</w:p>', doc, re.S):
    t = ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))
    if t.strip(): wps.append(t)
assert len(wps) == 9, len(wps)           # 标题＋8 个正文 Word 段落
groups = [[1], [2], [3], [4, 5], [6], [7], [8]]
FUN = [  # 据讲义 @fig-diag（功能、回答哪个问题），取值换成扩充部分甲一的功能表
    ('提出问题', None, '未完成：只提出了前人的问题', '告密是否引发政变', None),
    ('学术史·背景', None, None, '告密是否引发政变', None),
    ('学术史·出发点', None, None, '告密在哪个环节起作用', None),
    ('学术史·反证', '史料介绍或考订', None, '告密时间', None),
    ('学术史·反证', None, '反证的回应', '告密时间', 'P4'),
    ('过渡与小结', None, None, None, None),
    ('结论', '提出问题', '本文问题', '告密消息的日期与途径', None),
]
SUM = ['康、梁的告密致变说；丁文江、赵丰田说"还待考证"', '吴相湘、刘凤翰、萧一山、房德邻各说一句；末句是茅海建对丁、赵的评语',
       '黄彰健分开"爆发"与"捕人"；茅海建接受这一切分', '郭卫东主张初四日北京告密；袁世凯自述的署时、版本与补作之说；郭的自我限定',
       '刘路生认为袁初二至初四日住城内，并否认袁世凯告密', '黄、茅之说表明政变与告密无关，"已为学界普遍接受"',
       '学界"已基本形成共识"；告密消息的日期与途径"有待进一步研究"；本文将考察']
paras = []
for i, (g, f, s) in enumerate(zip(groups, FUN, SUM), 1):
    paras.append({'doc_id': 'jia', 'para_id': f'P{i}', 'text': ''.join(wps[k] for k in g), 'word_paras': g,
                  'page_from': '1' if g[0] < 5 else '2', 'page_to': '1' if g[-1] < 5 else '2', 'page_system': 'Word页',
                  'author_summary': None, 'model_summary': None, 'model_run_id': None,
                  'function': f[0], 'function2': f[1], 'function_note': f[2], 'answers': f[3], 'responds_to_para': f[4],
                  'reader_summary_construct': s})
dump('paragraphs.jia.example.json', {'_note': NOTE + '练习材料甲七段（教学构造）。功能与"回答哪个问题"据讲义 @fig-diag；reader_summary_construct 为讲义 @fig-outline 右列（备课者逐段概括，教学构造）。Word 第 4、5 段（分页断开）合为论文第 4 段。', 'paragraphs': paras})

# 二、脚注表（据 w:pageBreakBefore 分页、numRestart=eachPage）
fn = z.read('word/footnotes.xml').decode()
ftext = {m.group(1): ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', m.group(0))).strip()
         for m in re.finditer(r'<w:footnote [^>]*w:id="(\d+)".*?</w:footnote>', fn, re.S) if m.group(1) not in ('0',)}
notes, page, num = [], 1, 0
for tok in re.findall(r'<w:pageBreakBefore/>|<w:footnoteReference w:id="(\d+)"/>', doc):
    pass
for m in re.finditer(r'<w:pageBreakBefore/>|<w:footnoteReference w:id="(\d+)"/>', doc):
    if m.group(0).startswith('<w:pageBreakBefore'): page += 1; num = 0; continue
    num += 1; nid = m.group(1)
    notes.append({'note_id': nid, 'doc_page': page, 'number_on_page': num, 'text': ftext[nid], 'citation_item': None,
                  'locator': (re.findall(r'第([\d—、]+)页', ftext[nid]) or [None])[-1]})
dump('footnotes.jia.example.json', {'_note': NOTE + '练习材料甲八条脚注，由 .docx 抽出：第 1 页①—⑥、第 2 页①—②（Word 每页重新编号）。', 'footnotes': notes})

# 三、综述矩阵（讲义 @fig-matrix；前三列本课摘编，最后一列教学构造）
M = [('m1', '丁文江、赵丰田', 1936, '是否因袁泄密而爆发"还待考证"', '还待考证', '198—199', '康有为、梁启超的告密致变说', '推断', '背景'),
     ('m2', '吴相湘', 1957, '起因是杨崇伊密折，不在告密', None, '199', '"世俗所谓"告密致变之说', '原文', '需要处理'),
     ('m3', '黄彰健', 1970, '政变初六日爆发，与初五日告密无关；告密消息到京后才有捕人之举', None, None, None, '需回原文', '出发点'),
     ('m4', '郭卫东', 2002, '初四日已在北京告密，告密引起政变', None, '33', '两说并驳：初五日回津告密致变的"旧说"与"新解"', '原文', '反证'),
     ('m5', '茅海建', 2002, '政变虽未因告密而发生，但告密"大大加剧了政变的激烈程度"', '大大加剧了政变的激烈程度', '175', '黄彰健', '原文', '补证'),
     ('m6', '刘路生', 2005, '与郭文商榷', None, None, '郭卫东', '原文', '需要读')]
rows = [{'row_id': r[0], 'scholar': r[1], 'year': r[2], 'claim': r[3], 'claim_quote': r[4], 'page': r[5], 'page_system': '原刊页',
         'source_id': None, 'evidence': None, 'responds_to': r[6], 'responds_basis': r[7], 'relation_to_my_question': r[8],
         'filled_by': 'teaching-construct'} for r in M]
dump('matrix.wuxu.example.json', {'_note': NOTE + '讲义 @fig-matrix 六家（本课摘编；"与我的问题的关系"一列为教学构造，对应讲义假设的研究问题）。页码为茅文、郭文原刊页（郭卫东"回应对象"据郭文第 31—32 页）。', 'rows': rows})

# 四、登记行：讲义 @fig-reg（教学构造的预期典型意见）
R4 = [('1', 'P2', '第 2 段罗列各家，建议按时间顺序加过渡句使之连贯', '修正', None, '问题不在缺过渡，而在以作者为纲；改为按与本文问题的关系重排，过渡句不加'),
      ('2', 'P4', '第 4 段关于袁世凯自述版本的内容偏离主题，建议删除', '修正', None, '不删，移到讨论史料的一节；版本问题决定郭说的依据能否成立，学术史里只留一句'),
      ('3', 'P5', '第 5 段刘路生的商榷与本文关系不大，建议删去以使论证更集中', '舍弃', None, '反证是否已被回应，本身就是本文问题的一部分；删去会让读者以为郭说无人驳过'),
      ('4', 'P6—P7', '第 6、7 段可合并，并把"有待进一步研究"改为更有力的表述', '修正', '部分采纳', '合并采纳；"更有力"不采纳，限定照留，"共识"一语删去')]
dump('register.fig-reg.example.json', {'_note': NOTE + '讲义 @fig-reg 四条（"模型意见"一列为教学构造的预期典型意见，课前记录后替换）。第 4 条原表"部分采纳"不在三值之内，按"修正"计，原文字存 decision_raw。',
     'rows': [{'reg_id': f'diag-{r[0]}', 'kind': 'diagnosis', 'target': r[1], 'proposer': {'kind': 'model', 'name': '预期典型意见（教学构造）', 'run_id': None},
               'content': r[2], 'decision': r[3], 'decision_raw': r[4], 'reason': r[5], 'source_needed': None, 'from_page': 'D06'} for r in R4]})

# 五、修改表：讲义 @fig-revtable
E5 = [('1', '3', '茅海建在逐日考订之后接受了这一切分', '茅海建逐日考订后接受了这一切分', 'model', 'fluency', 'fluency', 'accept', '不改变意思'),
      ('2', '3', '告密的消息"大大加剧了政变的激烈程度"', '告密进一步推动了政变', 'model', 'meaning-changed', 'clarity', 'reject', '意思改变：原话是"加剧"，且有"虽未……但……"的限定'),
      ('3', '7', '仍有待进一步研究', '本文将对此作出全面回答', 'model', 'meaning-changed', 'style', 'reject', '意思改变：限定不能删'),
      ('4', '2', '（罗列四家）', '（按与本文问题的关系重排为两句）', 'author', 'meaning-changed', 'meaning-changed', None, '据 @fig-reg 第 1 条；属重写，不属润色')]
dump('edits.fig10.example.json', {'_note': NOTE + '讲义 @fig-revtable 四条（教学构造）。intention_shown 照原表"意图"列；intention 为甲三计数所用的最终判断（第 2、3 条理由写"意思改变"）。',
     'edits': [{'edit_id': e[0], 'para': e[1], 'before': e[2], 'after': e[3], 'author': None, 'date': None, 'location': None,
                'proposer': {'kind': e[4], 'name': None, 'run_id': None}, 'intention': e[5], 'intention_shown': e[6], 'decision': e[7], 'reason': e[8], 'in_footnote': False} for e in E5]})

# 六、植入与发现：扩充部分甲二小例（教学构造的假设数字）
imp = [{'error_id': 'E1', 'unit_id': None, 'type': 'insert', 'category': '归属', 'location': '第 156 页', 'before': '鸠山一郎', 'after': '芦田均'},
       {'error_id': 'E2', 'unit_id': None, 'type': 'insert', 'category': '出处', 'location': '第 157 页', 'before': '贵族院议员二荒芳德', 'after': '众议院议员二荒芳德'},
       {'error_id': 'E3', 'unit_id': None, 'type': 'omit', 'category': '说满', 'location': '第 159 页', 'before': '少数议员注意到', 'after': '议员们普遍注意到'}]
hits = {'A-1': ['E1', 'E2'], 'A-2': ['E1'], 'A-3': ['E1', 'E2'], 'B-1': ['E2'], 'B-2': ['E1'], 'B-3': ['E1', 'E2']}
fd = [{'run_id': r, 'system': r[0], 'finding_text': '（教学构造：假设查出）', 'unit_id': None, 'error_id': e, 'matched': 1, 'adjudication_note': '教学构造'}
      for r, es in hits.items() for e in es]
dump('implants-findings.toy.example.json', {'_note': NOTE + '扩充部分甲二小例（教学构造的假设数字，演示②′运行后替换，E-01）。植入位置据讲义 2.3 演示②′。', 'implants': imp, 'findings': fd, 'runs': list(hits)})

# 七、文风规则与段落对（教学构造）
rules = [{'rule_id': 'R1', 'name': '虚化动词', 'pattern': '进行|加以|予以', 'kind': 'wordlist', 'unit': '每百字', 'note': '扩充部分甲四'},
         {'rule_id': 'R2', 'name': '套语', 'pattern': '值得注意的是|从某种意义上说|不难看出|这正是', 'kind': 'wordlist', 'unit': '每百字', 'note': '扩充部分甲四；LEDGER L-019'},
         {'rule_id': 'R3', 'name': '长"的"字结构（一句三个以上"的"）', 'pattern': '[^。！？；]*的[^。！？；]*的[^。！？；]*的[^。！？；]*', 'kind': 'regex', 'unit': '每百字', 'note': '本课约定，可调'}]
pair = {'pair_id': 'toy-1', 'original': '本文对告密的日期作了考察。', 'revised': '值得注意的是，本文对告密的日期进行了深入的考察。', 'revised_run_id': None, 'source_id': None}
dump('style.toy.example.json', {'_note': NOTE + '规则表据扩充部分甲四；段落对为教学构造，只作计数示例。', 'rules': rules, 'pairs': [pair]})

# 八、文风账本：乙二 W-01、W-02（教学构造）
dump('ledger.jia2.example.json', {'_note': NOTE + '扩充部分乙二两条史学样例（教学构造）；LEDGER 学生样板待整理、待教师确认。', 'entries': [
    {'entry_id': 'W-01', 'preference': '判断词的强度照原样，不升不降', 'before': '告密的消息"大大加剧了政变的激烈程度"', 'after': '（拒绝模型的"导致了政变"，保留原句）',
     'reason': '"加剧"与"导致"是两种判断，属意思改变（讲义 3.1）', 'source': '扩充部分乙二（教学构造）', 'scope': '所有转述他人判断的句子', 'status': '直接要求'},
    {'entry_id': 'W-02', 'preference': '引文与史料原词不改，包括旧字形与时代用语', 'before': '（模型改稿）"国体"思想 → 国家体制思想', 'after': '（恢复"国体"，加引号）',
     'reason': '时代用语是论文讨论的对象，改了就是时代错置（第九周）', 'source': '扩充部分乙二（教学构造）', 'scope': '引文、专名、加引号的概念', 'status': '直接要求'},
    {'entry_id': 'W-03', 'preference': '（示例）少用"值得注意的是"', 'before': None, 'after': None, 'reason': None, 'source': '学生自拟', 'scope': None, 'status': '候选'}]})

# 九、参考文献目录：两头对（教学构造：一处"顺手改正"、一处多出）
bib = [{'ref_id': 'B1', 'text': '丁文江、赵丰田编：《梁启超年谱长编》，上海人民出版社，1983 年。', 'matched_note_ids': ['1'], 'changed_fields': []},
       {'ref_id': 'B2', 'text': '茅海建：《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正》，《近代史研究》2002 年第 4—6 期。', 'matched_note_ids': ['1', '3', '5'], 'changed_fields': []},
       {'ref_id': 'B3', 'text': '黄彰健：《戊戌變法史研究》，中央研究院历史语言研究所，1970 年。', 'matched_note_ids': ['4'], 'changed_fields': []},
       {'ref_id': 'B4', 'text': '郭卫东：《再论戊戌政变中袁世凯的"告密"问题》，《清史研究》2003 年第 1 期。', 'matched_note_ids': ['6', '7'], 'changed_fields': ['year']},
       {'ref_id': 'B5', 'text': '刘路生：《戊戌政变袁世凯初四告密说不能成立》，《清史研究》2005 年第 1 期。', 'matched_note_ids': ['8'], 'changed_fields': ['title']},
       {'ref_id': 'B6', 'text': '张某：《告密与政变再考》，《某某学刊》2019 年第 3 期。（教学构造的虚构条目）', 'matched_note_ids': [], 'changed_fields': []}]
dump('bib.jia.example.json', {'_note': NOTE + '预置的"模型草拟目录"（教学构造）：B4 年份被"顺手"改为 2003（应为 2002），B5 删去副题，B6 为脚注未引的多出条目（虚构，作者与篇名都是教学构造）；刘凤翰 1963 未入目录（脚注引过而目录缺）。matched_note_ids 与 changed_fields 为期望报告，供测试；题名比较时去掉分期标记（一）（三），繁简照原样比（B3 照脚注作繁体）。', 'bib': bib})

# 十、声明：默认（附件空）与讲义结语示例（教学构造）
dump('declaration.example.json', {'_note': NOTE + '第一份是生成器的默认状态（附件空）；第二份据讲义结语示例（教学构造，工具、型号、日期均为假设）。', 'declarations': [
    {'tool': '', 'developer': None, 'version': None, 'mode': None, 'web_search': None, 'reasoning': None, 'temperature': None, 'dates': None,
     'stage': None, 'purpose': None, 'prompts_summary': None, 'products': None, 'attachments': [], 'checks': []},
    {'tool': 'Kimi', 'developer': '月之暗面', 'version': 'kimi-k3', 'mode': '接口', 'web_search': False, 'reasoning': 'low', 'temperature': None,
     'dates': '2026-11-25 至 2026-12-02', 'stage': '第一节"学术史回顾"', 'purpose': '文献要点整理与结构诊断',
     'prompts_summary': '"据所附原文填写矩阵前三列，每格附原文短引与页码"；"为每段写一句主旨并指出三处结构问题"',
     'products': '矩阵候选与诊断意见各一份', 'attachments': [{'label': '附件一：综述矩阵', 'from': 'D02'}, {'label': '附件二：诊断意见登记表', 'from': 'D06'}],
     'checks': ['引文逐字回原页', '转述回原页确认']}]})

# 十一、运行记录占位与原文页（会议录，NDL 公开）
dump('run-record.pending.example.json', {'run_id': 'D2A_kimi_1', 'card_id': 'D2A', 'sample_index': 1, 'mode': 'pending', 'origin_mode': None, 'preset': 'kimi',
     'model': 'kimi-k3', 'temperature': None, 'reasoning_effort': 'low', 'prompt': {}, 'reply': None, 'reasoning': None, 'ms': None, 'date': '待课前运行', 'error': None, 'web': None, 'transcription': None})
dump('source-page.example.json', {'_note': NOTE + '原文页：原刊页码与 PDF 页序分列。第一条为 NDL 帝国议会会议录（公开），以发言番号定位；第二条示意郭卫东文"原刊第 38 页＝PDF 第 8 页"（PDF 页序＋30＝原刊页，据 4.3 答案），text 不放原文。',
     'pages': [{'source_id': 'd15-A', 'page': '003', 'page_system': '发言番号', 'pdf_index': None, 'text': '○鳩山一郎君　國家空前の變局に立つて重責を擔へる現内閣の苦心と努力とに對し深く敬意を表します', 'offset': 0},
               {'source_id': 'guo-2002', 'page': '38', 'page_system': '原刊页', 'pdf_index': 8, 'text': '', 'offset': None}]})
