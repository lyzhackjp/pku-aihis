#!/usr/bin/env python3
"""第十一周数据结构 schema 生成｜候选，未经教师确认｜2026-11-25｜第一步
用法（仓库根目录）：python3 docs/week11/plan-src/make_schema.py
只用 draft-07 也有的关键字（jsonschema 3.2 可校验），$defs 以 JSON 指针引用。
沿用第十周 sourceEntry、conditionCard、runRecord 的写法；新增方案第四节的十四种结构与贯穿记录 w11-through/v1。"""
import json, pathlib
S = lambda **k: dict(type='string', **k)
SN = lambda **k: dict(type=['string', 'null'], **k)
N = lambda **k: dict(type=['number', 'null'], **k)
ARR = lambda items=None, **k: dict(type='array', **({'items': items} if items else {}), **k)
REF = lambda n: {'$ref': '#/$defs/' + n}
def obj(desc, req, props, **k):
    return dict(description=desc, type='object', allOf=[REF('noSecrets')], required=req, properties=props, **k)

PAGE_SYSTEMS = ['原书页', '原刊页', 'PDF页序', '扫描图编号', '电子文本段落', '发言番号', 'Word页', '无']
FUNCS = ['提出问题', '学术史·出发点', '学术史·反证', '学术史·背景', '史料介绍或考订', '推论', '限定', '过渡与小结', '结论']
INTENTS = ['fluency', 'coherence', 'clarity', 'style', 'meaning-changed', 'other']
D = {}
D['noSecrets'] = {'description': '任何结构都不得含这些键（导入对话框遇到这些列整份拒绝）',
                  'not': {'anyOf': [{'required': [k]} for k in ['apiKey', 'api_key', 'key', 'authorization', 'Authorization']]}}
D['proposer'] = {'description': '提议者：作者本人、模型（附 run_id）、他人（同学、老师、编辑）', 'type': 'object', 'required': ['kind'],
                 'properties': {'kind': {'enum': ['author', 'model', 'other']}, 'name': SN(), 'run_id': SN()}}
D['sourceEntry'] = obj('史料包条目（沿用第十周 w10-pack/v1）。sendable=false 的条目只能是本机材料包；公开包中 text 必须为空',
    ['id', 'title', 'citation', 'text_kind', 'sendable', 'visibility'],
    {'id': S(), 'title': S(), 'author': S(), 'citation': S(),
     'page': {'type': 'object', 'properties': {'system': {'enum': PAGE_SYSTEMS}, 'value': S()}},
     'page_marker': SN(description='text 中的页码标记正则，如 〔原刊第(\\d+)页〕'),
     'text': S(), 'text_kind': {'enum': ['原文', '录文', '转写', '教学转述', '教学构造', '仅元数据']},
     'sendable': {'type': 'boolean'}, 'sendable_basis': S(description='教师同意的日期与方式，如"教师 2026-11-24 同意送模型"'),
     'visibility': {'enum': ['公开', '本机材料包']}, 'note': S()},
    **{'if': {'properties': {'sendable': {'const': False}}, 'required': ['sendable']}, 'then': {'properties': {'visibility': {'const': '本机材料包'}}}})
D['sourcePage'] = obj('原文页（原刊页码与 PDF 页序分列，不互相覆盖；offset 为该页在条目全文中的起始下标）',
    ['source_id', 'page', 'page_system', 'text'],
    {'source_id': S(), 'page': S(), 'page_system': {'enum': PAGE_SYSTEMS}, 'pdf_index': {'type': ['integer', 'null'], 'description': 'PDF 页序（从 1 起）；与 page 分列'},
     'text': S(), 'offset': {'type': ['integer', 'null']}})
D['paragraph'] = obj('段落表一行（D05、D06、D09、D11）。论文段落≠Word 段落：Word 分页断开的续段以 word_paras[] 合并',
    ['doc_id', 'para_id', 'text'],
    {'doc_id': S(), 'para_id': S(), 'text': S(), 'word_paras': ARR({'type': 'integer'}, description='来自 .docx 的 Word 段落序号（从 0 起）'),
     'page_from': SN(), 'page_to': SN(), 'page_system': {'enum': PAGE_SYSTEMS},
     'author_summary': SN(), 'model_summary': SN(), 'model_run_id': SN(),
     'function': {'enum': FUNCS + [None]}, 'function2': {'enum': FUNCS + [None], 'description': '第二种主要功能（有则提示"一段多事"）'},
     'function_note': SN(description='如"未完成""反证的回应"'), 'answers': SN(description='回答哪个问题'),
     'responds_to_para': SN(description='回应哪一段的反证')})
D['matrixRow'] = obj('综述矩阵一行（D02—D04）', ['row_id', 'scholar'],
    {'row_id': S(), 'scholar': S(), 'year': {'type': ['integer', 'string', 'null']}, 'claim': SN(), 'claim_quote': SN(), 'page': SN(),
     'page_system': {'enum': PAGE_SYSTEMS}, 'source_id': SN(), 'evidence': SN(), 'responds_to': SN(),
     'responds_basis': {'enum': ['原文', '推断', '需回原文', None]}, 'responds_page': SN(),
     'relation_to_my_question': {'enum': ['出发点', '补证', '需要收窄', '反证', '背景', '需要读', '需要处理', None]},
     'relation_note': SN(), 'filled_by': {'enum': ['author', 'model', 'teaching-construct', None]}})
D['registerRow'] = obj('通用登记行：诊断意见、审读发现、修改、注释核验四种视图共用（D06、D07、D13、D14、D17、D18）',
    ['reg_id', 'kind', 'target', 'proposer', 'content'],
    {'reg_id': S(), 'kind': {'enum': ['diagnosis', 'finding', 'edit', 'note_check']}, 'target': S(description='para_id、unit_id、edit_id 或 note_id'),
     'proposer': REF('proposer'), 'content': S(), 'decision': {'enum': ['采纳', '修正', '舍弃', '成立', '不成立', '存疑', None]},
     'decision_raw': SN(description='原文字（如讲义图 5 的"部分采纳"），计数按 decision'), 'reason': SN(), 'source_needed': SN(),
     'from_page': SN(), 'date': SN()})
D['reviewUnit'] = obj('审读单元（D07、D09；扩充部分乙一第一步）', ['unit_id', 'para_id', 'type', 'text'],
    {'unit_id': S(), 'para_id': S(), 'type': {'enum': ['quote', 'source', 'claim', 'judgment']}, 'text': S(),
     'cited_source': SN(), 'locator': SN(), 'speaker': SN(), 'date': SN(), 'in_hand': {'enum': ['是', '否', '部分']}})
D['implant'] = obj('植入错误（D07—D09）', ['error_id', 'category', 'before', 'after'],
    {'error_id': S(), 'unit_id': SN(), 'type': {'enum': ['insert', 'omit']}, 'category': {'enum': ['归属', '出处', '说满', '遗漏', '引文']},
     'location': SN(description='论文页码与句子'), 'before': S(), 'after': S()})
D['finding'] = obj('发现结果（D07、D08）。matched 须经作者裁决才计入召回率', ['run_id', 'system', 'finding_text'],
    {'run_id': S(), 'system': S(), 'finding_text': S(), 'unit_id': SN(), 'error_id': SN(), 'matched': {'type': ['integer', 'null'], 'enum': [0, 1, None]},
     'adjudication_note': SN()})
D['editRow'] = obj('修改表一行（D10、D13、D14）。intention 为作者最终判断；intention_shown 为表上原标或模型自称（讲义图 10 第 2、3 行即两者不同）',
    ['edit_id', 'before', 'after', 'proposer'],
    {'edit_id': S(), 'para': SN(), 'before': S(), 'after': S(), 'author': SN(description='Word 修订者'), 'date': SN(),
     'location': SN(description='段号与前后各二十字'), 'proposer': REF('proposer'), 'intention': {'enum': INTENTS + [None]},
     'intention_shown': {'enum': INTENTS + [None]}, 'decision': {'enum': ['accept', 'reject', 'modify', None]}, 'reason': SN(),
     'in_footnote': {'type': 'boolean'}})
D['styleRule'] = obj('文风规则（D11）', ['rule_id', 'name', 'pattern'],
    {'rule_id': S(), 'name': S(), 'pattern': S(description='正则（JS 语法）或以 | 分隔的词表'), 'kind': {'enum': ['regex', 'wordlist']}, 'unit': {'enum': ['每百字']}, 'note': SN()})
D['paragraphPair'] = obj('段落对（D11、D12）', ['pair_id', 'original', 'revised'],
    {'pair_id': S(), 'original': S(), 'revised': S(), 'revised_run_id': SN(), 'source_id': SN()})
D['ledgerEntry'] = obj('文风账本条目（D12；七栏四状态）', ['entry_id', 'preference', 'status'],
    {'entry_id': S(), 'preference': S(), 'before': SN(), 'after': SN(), 'reason': SN(), 'source': SN(), 'scope': SN(),
     'status': {'enum': ['归纳认可', '直接要求', '原段认可', '候选']}})
D['footnote'] = obj('脚注表一行（D15—D17）。number_on_page 为每页重新编号后的号（Word 显示），note_id 为文件中的脚注序号',
    ['note_id', 'text'],
    {'note_id': S(), 'doc_page': {'type': ['integer', 'null']}, 'number_on_page': {'type': ['integer', 'null']}, 'text': S(),
     'citation_item': SN(description='Zotero 条目编号（若有域代码）'), 'locator': SN(), 'anchor_para': SN()})
D['bibEntry'] = obj('参考文献目录一条（D16）', ['ref_id', 'text'],
    {'ref_id': S(), 'text': S(), 'matched_note_ids': ARR({'type': 'string'}), 'changed_fields': ARR({'enum': ['author', 'title', 'year', 'page', 'venue']})})
D['declaration'] = obj('使用情况说明（D18）。attachments 默认空，只列学生勾选的部分', ['tool', 'attachments'],
    {'tool': S(), 'developer': SN(), 'version': SN(), 'mode': {'enum': ['网页', '接口', None]}, 'web_search': {'type': ['boolean', 'null']},
     'reasoning': SN(), 'temperature': {'type': ['number', 'string', 'null']}, 'dates': SN(), 'stage': SN(), 'purpose': SN(),
     'prompts_summary': SN(), 'products': SN(), 'attachments': ARR({'type': 'object', 'required': ['label'], 'properties': {'label': S(), 'from': S()}}),
     'checks': ARR({'enum': ['引文逐字回原页', '转述回原页确认', '参考文献目录两头核对']})})
D['conditionCard'] = obj('条件卡（第十一周版）。不存材料正文：{{material:ID}} 发出前由史料包回填，先过 gate（sendable）；sources[] 写提示所据',
    ['card_id', 'title', 'lecture_ref', 'user_template', 'materials', 'models', 'samples', 'sources'],
    {'card_id': S(), 'title': S(), 'lecture_ref': S(), 'page': S(), 'question': S(),
     'materials': ARR({'type': 'object', 'required': ['entry_id', 'sendable'], 'properties': {'entry_id': S(), 'label': S(), 'sendable': {'type': 'boolean'}, 'sendable_basis': S(), 'visibility': {'enum': ['公开', '本机材料包']}}}),
     'user_template': S(), 'system_prompt': SN(), 'models': ARR({'enum': ['deepseek', 'kimi', 'web']}), 'samples': {'type': 'integer', 'minimum': 1},
     'optional': {'type': 'boolean'}, 'settings': {'type': 'object'}, 'web_prompt_file': SN(),
     'sources': ARR({'type': 'string'}, minItems=1), 'wording_status': S(description='"据讲义原文"或"本线程据讲义整理，待教师确认"'), 'source': S()})
D['runRecord'] = obj('运行记录（同第十周）；mode=pending 时页面显示"待课前运行"，reply 必须为空', ['run_id', 'card_id', 'mode', 'date'],
    {'run_id': S(), 'card_id': S(), 'sample_index': {'type': 'integer'}, 'mode': {'enum': ['live', 'replay', 'web-paste', 'teaching-construct', 'pending']},
     'origin_mode': {'enum': ['live', 'web-paste', None]}, 'preset': {'enum': ['deepseek', 'kimi', 'web', 'local']}, 'model': SN(),
     'temperature': {'type': ['number', 'string', 'null']}, 'reasoning_effort': SN(), 'prompt': {'type': 'object'}, 'reply': SN(), 'reasoning': SN(),
     'ms': {'type': ['integer', 'null']}, 'date': S(), 'error': SN(), 'web': {'type': ['object', 'null']}, 'transcription': SN()},
    **{'if': {'properties': {'mode': {'const': 'pending'}}, 'required': ['mode']}, 'then': {'properties': {'reply': {'type': 'null'}}}})
D['throughRecord'] = obj('全讲贯穿记录（D18 导出）。写作时自用、被问到时出示的记录，不是作业', ['format', 'exported_at'],
    {'format': {'const': 'w11-through/v1'}, 'exported_at': S(), 'contains_restricted_text': {'type': 'boolean'},
     'matrix': ARR(REF('matrixRow')), 'paragraphs': ARR(REF('paragraph')), 'register': ARR(REF('registerRow')), 'edits': ARR(REF('editRow')),
     'findings': ARR(REF('finding')), 'implants': ARR(REF('implant')), 'ledger': ARR(REF('ledgerEntry')), 'footnotes': ARR(REF('footnote')),
     'bib': ARR(REF('bibEntry')), 'declaration': {'anyOf': [REF('declaration'), {'type': 'null'}]}, 'runs': ARR(REF('runRecord')), 'page_state': {'type': 'object'}})
out = {'$schema': 'http://json-schema.org/draft-07/schema#', '$id': 'urn:pku-aihis:week11:w11-structures',
       'title': '第十一周演示的通用输入（候选，未经教师确认，2026-11-25）',
       'description': '方案第四节的数据结构。沿用第十周 sourceEntry、conditionCard、runRecord；原刊页码与 PDF 页序分列；Key 不进任何结构。', '$defs': D}
p = pathlib.Path('docs/week11/schemas/w11-structures.schema.json'); p.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(D), 'defs →', p)
