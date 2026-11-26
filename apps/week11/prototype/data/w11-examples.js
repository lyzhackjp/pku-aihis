/* 第十一周示例数据（docs/week11/examples，公开或教学构造）。 由 scripts/build_packs.py 生成，请勿手改。 */
window.W11_EXAMPLES = {
"bib.jia": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。预置的\"模型草拟目录\"（教学构造）：B4 年份被\"顺手\"改为 2003（应为 2002），B5 删去副题，B6 为脚注未引的多出条目（虚构，作者与篇名都是教学构造）；刘凤翰 1963 未入目录（脚注引过而目录缺）。matched_note_ids 与 changed_fields 为期望报告，供测试；题名比较时去掉分期标记（一）（三），繁简照原样比（B3 照脚注作繁体）。",
"bib": [
{
"ref_id": "B1",
"text": "丁文江、赵丰田编：《梁启超年谱长编》，上海人民出版社，1983 年。",
"matched_note_ids": [
"1"
],
"changed_fields": []
},
{
"ref_id": "B2",
"text": "茅海建：《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正》，《近代史研究》2002 年第 4—6 期。",
"matched_note_ids": [
"1",
"3",
"5"
],
"changed_fields": []
},
{
"ref_id": "B3",
"text": "黄彰健：《戊戌變法史研究》，中央研究院历史语言研究所，1970 年。",
"matched_note_ids": [
"4"
],
"changed_fields": []
},
{
"ref_id": "B4",
"text": "郭卫东：《再论戊戌政变中袁世凯的\"告密\"问题》，《清史研究》2003 年第 1 期。",
"matched_note_ids": [
"6",
"7"
],
"changed_fields": [
"year"
]
},
{
"ref_id": "B5",
"text": "刘路生：《戊戌政变袁世凯初四告密说不能成立》，《清史研究》2005 年第 1 期。",
"matched_note_ids": [
"8"
],
"changed_fields": [
"title"
]
},
{
"ref_id": "B6",
"text": "张某：《告密与政变再考》，《某某学刊》2019 年第 3 期。（教学构造的虚构条目）",
"matched_note_ids": [],
"changed_fields": []
}
]
},
"condition-cards.w11": {
"_note": "候选，未经教师确认。由 prompts_to_cards.py 从课程文件夹 第十一周/demo/prompts.json 生成；不含材料正文与本机路径。",
"cards": [
{
"card_id": "D1A",
"title": "演示① 只给矩阵",
"lecture_ref": "1.3·演示①",
"page": "D04",
"question": "请据此写一段三四百字的学术史综述。",
"materials": [
{
"entry_id": "matrix-fig1-4col",
"label": "综述矩阵（讲义 @fig-matrix 前四列：学者、年份、主张、回应对象）",
"sendable": true,
"sendable_basis": "本课摘编（讲义图 1），公开",
"visibility": "公开"
}
],
"user_template": "下面是一张关于袁世凯告密与戊戌政变的综述矩阵，每行一位学者，四列依次为学者、年份、主张（摘）、回应对象。\n\n{{material:matrix-fig1-4col}}\n\n请据此写一段三四百字的学术史综述。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"optional": false,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"讲义 1.3 演示①：\"据此写一段三四百字的学术史综述\"",
"讲义 @fig-matrix 前四列"
],
"wording_status": "最后一句据讲义原文；前言为本线程整理，待教师确认",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 1bfbab702fe17a44",
"blocked_until": null
},
{
"card_id": "D1B",
"title": "演示① 矩阵加茅文学术史节录",
"lecture_ref": "1.3·演示①",
"page": "D04",
"question": "请据此写一段三四百字的学术史综述。",
"materials": [
{
"entry_id": "matrix-fig1-4col",
"label": "综述矩阵（讲义 @fig-matrix 前四列：学者、年份、主张、回应对象）",
"sendable": true,
"sendable_basis": "本课摘编（讲义图 1），公开",
"visibility": "公开"
},
{
"entry_id": "mao-history",
"label": "茅海建 2002 学术史一节（第 4 期第 198—208 页）",
"sendable": true,
"sendable_basis": "教师 2026-11-14 同意送模型",
"visibility": "本机材料包"
}
],
"user_template": "下面是一张关于袁世凯告密与戊戌政变的综述矩阵，每行一位学者，四列依次为学者、年份、主张（摘）、回应对象。\n\n{{material:matrix-fig1-4col}}\n\n另附茅海建《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正（一）》（《近代史研究》2002年第4期）学术史一节的节录，〔原刊第×页〕标出原刊页码。\n\n{{material:mao-history}}\n\n请据此写一段三四百字的学术史综述。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"optional": false,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"讲义 1.3 演示①：\"第二次另附茅海建文学术史一节的节录，再写一次\"",
"方案第五节第 6 条 D1B"
],
"wording_status": "最后一句与 D1A 相同，便于对照；前言为本线程整理，待教师确认",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 3a84aab5f7dc6972",
"blocked_until": null
},
{
"card_id": "D2A",
"title": "演示② 逆向大纲＋三处结构问题",
"lecture_ref": "2.1—2.2·演示②",
"page": "D05、D06",
"question": "请按段编号，为每段写一句主旨（只依据这段文字，不补充背景知识，不超过二十字）；再从以下功能中为每段选一项主要功能：提出问题、学术史·出发点、学术史·反证、学术史·背景、史料介绍或考订、推论、限定、过渡与小结、结论。最后列出你认为的三处结构问题，每处注明段号。",
"materials": [
{
"entry_id": "jia-body",
"label": "练习材料甲正文七段（段首〔1〕—〔7〕，不含脚注）",
"sendable": true,
"sendable_basis": "教学构造，可公开",
"visibility": "公开"
}
],
"user_template": "下面是一节论文草稿，段首〔n〕为段号。\n\n{{material:jia-body}}\n\n请按段编号，为每段写一句主旨（只依据这段文字，不补充背景知识，不超过二十字）；再从以下功能中为每段选一项主要功能：提出问题、学术史·出发点、学术史·反证、学术史·背景、史料介绍或考订、推论、限定、过渡与小结、结论。最后列出你认为的三处结构问题，每处注明段号。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 2,
"optional": false,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"扩充部分甲一第三部分（提示全文）",
"讲义 2.1 演示②（简写版，以扩充部分为准）"
],
"wording_status": "提示主体照扩充部分甲一原文；材料前言为本线程整理",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 a74c72520411a452",
"blocked_until": null
},
{
"card_id": "D2B",
"title": "演示② 逆向大纲（若无写无）",
"lecture_ref": "2.1·演示②",
"page": "D05",
"question": "请按段编号，为每段写一句主旨（只依据这段文字，不补充背景知识，不超过二十字）；再从以下功能中为每段选一项主要功能：提出问题、学术史·出发点、学术史·反证、学术史·背景、史料介绍或考订、推论、限定、过渡与小结、结论。最后列出你认为的结构问题，每处注明段号；若没有结构问题，写\"无\"。",
"materials": [
{
"entry_id": "jia-body",
"label": "练习材料甲正文七段（段首〔1〕—〔7〕，不含脚注）",
"sendable": true,
"sendable_basis": "教学构造，可公开",
"visibility": "公开"
}
],
"user_template": "下面是一节论文草稿，段首〔n〕为段号。\n\n{{material:jia-body}}\n\n请按段编号，为每段写一句主旨（只依据这段文字，不补充背景知识，不超过二十字）；再从以下功能中为每段选一项主要功能：提出问题、学术史·出发点、学术史·反证、学术史·背景、史料介绍或考订、推论、限定、过渡与小结、结论。最后列出你认为的结构问题，每处注明段号；若没有结构问题，写\"无\"。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 1,
"optional": false,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"扩充部分甲一：\"把最后一句改为'若没有结构问题，写\"无\"'\""
],
"wording_status": "最后一句据扩充部分甲一改写，待教师确认",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 4187bafc219b89ec",
"blocked_until": null
},
{
"card_id": "D2P",
"title": "演示②′ 深度审读（植入副本＋会议录 3 则）",
"lecture_ref": "2.3·演示②′",
"page": "D07、D08、D09",
"question": "\n逐句核对论文中的发言人、院别、引文与概括是否被所附原文支持；每条发现注明论文页码、原文发言番号，并说明理由；原文中没有的内容标\"无法核\"。",
"materials": [
{
"entry_id": "li2023-p156-159-implanted",
"label": "教师 2023 年论文第 156—159 页（第一节后半）植入三处错误的副本",
"sendable": true,
"sendable_basis": "教师 2026-11-24 同意送模型（已刊论文）",
"visibility": "本机材料包"
},
{
"entry_id": "d15-A",
"label": "第 89 回帝国议会 众议院本会议第 3 号（鸠山质询、币原答辩；发言 003—004）",
"sendable": true,
"sendable_basis": "NDL 公开",
"visibility": "本机材料包"
},
{
"entry_id": "d15-B",
"label": "第 89 回帝国议会 贵族院本会议（二荒质询；发言 009—011）",
"sendable": true,
"sendable_basis": "NDL 公开",
"visibility": "本机材料包"
},
{
"entry_id": "d15-C",
"label": "第 89 回帝国议会（水谷质询等；发言 013—047）",
"sendable": true,
"sendable_basis": "NDL 公开",
"visibility": "本机材料包"
}
],
"user_template": "下面是一篇论文第一节后半（第156—159页）与它所引的三则帝国议会会议录原文。\n\n【论文】\n{{material:li2023-p156-159-implanted}}\n\n【原文甲】\n{{material:d15-A}}\n\n【原文乙】\n{{material:d15-B}}\n\n【原文丙】\n{{material:d15-C}}\n\n逐句核对论文中的发言人、院别、引文与概括是否被所附原文支持；每条发现注明论文页码、原文发言番号，并说明理由；原文中没有的内容标\"无法核\"。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"optional": false,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"讲义 2.3 演示②′（提示原文）",
"讲义 2.3 植入位置：第 156、157、159 页"
],
"wording_status": "最后一段据讲义原文；前言为本线程整理",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 339fc7c3fa88d52f",
"blocked_until": null
},
{
"card_id": "S1",
"title": "文风演示 润色",
"lecture_ref": "3.2·文风演示",
"page": "D11",
"question": "润色这段学术文字，使之更流畅。",
"materials": [
{
"entry_id": "li2023-p152-153",
"label": "教师 2023 年论文第 152—153 页评述大谷伸治研究的一段",
"sendable": true,
"sendable_basis": "教师 2026-11-24 同意送模型（已刊论文）",
"visibility": "本机材料包"
}
],
"user_template": "润色这段学术文字，使之更流畅。\n\n{{material:li2023-p152-153}}",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 2,
"optional": false,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"讲义 3.2 文风演示框：\"润色这段学术文字，使之更流畅\""
],
"wording_status": "据讲义原文",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 1ba79c85bc7ce9f8",
"blocked_until": null
},
{
"card_id": "S2",
"title": "文风演示 只列问题",
"lecture_ref": "3.2·文风演示",
"page": "D11",
"question": "只列出这段文字的语言问题，不要改写。",
"materials": [
{
"entry_id": "li2023-p152-153",
"label": "教师 2023 年论文第 152—153 页评述大谷伸治研究的一段",
"sendable": true,
"sendable_basis": "教师 2026-11-24 同意送模型（已刊论文）",
"visibility": "本机材料包"
}
],
"user_template": "只列出这段文字的语言问题，不要改写。\n\n{{material:li2023-p152-153}}",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 1,
"optional": false,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"讲义 3.2 文风演示框：\"只列出这段文字的语言问题，不要改写\""
],
"wording_status": "据讲义原文",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 e3ebecb80f6a4175",
"blocked_until": null
},
{
"card_id": "S1J",
"title": "文风对照 润色练习材料甲第 3 段（可选）",
"lecture_ref": "3.2；扩充部分甲四",
"page": "D11",
"question": "润色这段学术文字，使之更流畅。",
"materials": [
{
"entry_id": "jia-p3",
"label": "练习材料甲第 3 段",
"sendable": true,
"sendable_basis": "教学构造，可公开",
"visibility": "公开"
}
],
"user_template": "润色这段学术文字，使之更流畅。\n\n{{material:jia-p3}}",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 1,
"optional": true,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"扩充部分甲四\"可选材料与对照\"：练习材料甲第 3 段及其润色稿"
],
"wording_status": "同 S1；方案第五节未列，本线程据扩充部分补，待教师定",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 9255ef2a06bdd64e",
"blocked_until": null
},
{
"card_id": "S3",
"title": "账本检验 附账本润色（可选，E-02）",
"lecture_ref": "3.2；扩充部分乙二",
"page": "D12",
"question": "下面是作者的三条文风偏好，每条附改前、改后的例子。请按这些偏好润色后面的一段学术文字，使之更流畅。",
"materials": [
{
"entry_id": "ledger-3",
"label": "文风账本三条（课程文风账本 L-019、L-007、L-005）",
"sendable": true,
"sendable_basis": "教师 2026-11-26 同意以课程文风账本作学生样板",
"visibility": "公开"
},
{
"entry_id": "li2023-p152-153",
"label": "教师 2023 年论文第 152—153 页评述大谷伸治研究的一段",
"sendable": true,
"sendable_basis": "教师 2026-11-24 同意送模型（已刊论文）",
"visibility": "本机材料包"
}
],
"user_template": "下面是作者的三条文风偏好，每条附改前、改后的例子。请按这些偏好润色后面的一段学术文字，使之更流畅。\n\n{{material:ledger-3}}\n\n{{material:li2023-p152-153}}",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 1,
"optional": true,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"扩充部分乙二进阶层\"账本检验\""
],
"wording_status": "本线程整理；账本样板教师 2026-11-26 同意",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 1595e020a91651c4",
"blocked_until": null
},
{
"card_id": "R1",
"title": "重现性 茅海建一行\"主张\"格（可选）",
"lecture_ref": "1.2；案例 C-02",
"page": "D03",
"question": "请为综述矩阵中\"茅海建\"一行填写\"主张\"一格：用一句话概括他对袁世凯告密与戊戌政变关系的看法，并附一句原文直接引文和原刊页码。",
"materials": [
{
"entry_id": "mao-conclusion",
"label": "茅海建 2002 结论一节（第 6 期第 174—176 页）",
"sendable": true,
"sendable_basis": "教师 2026-11-14 同意送模型",
"visibility": "本机材料包"
}
],
"user_template": "下面是茅海建《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正（三）》（《近代史研究》2002年第6期）结论一节，〔原刊第×页〕标出原刊页码。\n\n{{material:mao-conclusion}}\n\n请为综述矩阵中\"茅海建\"一行填写\"主张\"一格：用一句话概括他对袁世凯告密与戊戌政变关系的看法，并附一句原文直接引文和原刊页码。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 2,
"optional": true,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": null,
"sources": [
"讲义 1.2 @fig-cols\"每格附原文短引与原刊页码\"",
"案例 C-02 演示建议（重现性页）"
],
"wording_status": "本线程整理，待教师确认；方案原拟\"矩阵一格\"，改用已获准送模型的茅文结论节（郭、刘两文未获准送模型）",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 2f0b4c9fccc7afc8",
"blocked_until": null
},
{
"card_id": "W3a",
"title": "演示③(a) 网页版修改建议",
"lecture_ref": "3.4·演示③",
"page": "D13、D14",
"question": "请修改这三段学术史，使结构更清楚；逐条列出修改建议，说明每条改了什么、为什么，不要直接给出改写后的全文。",
"materials": [
{
"entry_id": "jia-p246",
"label": "练习材料甲第 2、4、6 段",
"sendable": true,
"sendable_basis": "教学构造，可公开",
"visibility": "公开"
}
],
"user_template": "请修改这三段学术史，使结构更清楚；逐条列出修改建议，说明每条改了什么、为什么，不要直接给出改写后的全文。\n\n{{material:jia-p246}}",
"system_prompt": null,
"models": [
"web"
],
"samples": 1,
"optional": false,
"settings": {
"_note": "待教师定（待决 1）：沿用第十周的实际传参（DeepSeek deepseek-flash、reasoning_effort low；Kimi kimi-k3、reasoning_effort low），温度以运行记录所传为准"
},
"web_prompt_file": "W3a.txt",
"sources": [
"讲义 3.4 演示③(a)（提示原文）"
],
"wording_status": "据讲义原文",
"source": "w11-demo/v1（2026-11-25）；模板 sha256 6f89eb5e2b31abbb",
"blocked_until": null
}
]
},
"declaration": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。第一份是生成器的默认状态（附件空）；第二份据讲义结语示例（教学构造，工具、型号、日期均为假设）。",
"declarations": [
{
"tool": "",
"developer": null,
"version": null,
"mode": null,
"web_search": null,
"reasoning": null,
"temperature": null,
"dates": null,
"stage": null,
"purpose": null,
"prompts_summary": null,
"products": null,
"attachments": [],
"checks": []
},
{
"tool": "Kimi",
"developer": "月之暗面",
"version": "kimi-k3",
"mode": "接口",
"web_search": false,
"reasoning": "low",
"temperature": null,
"dates": "2026-11-25 至 2026-12-02",
"stage": "第一节\"学术史回顾\"",
"purpose": "文献要点整理与结构诊断",
"prompts_summary": "\"据所附原文填写矩阵前三列，每格附原文短引与页码\"；\"为每段写一句主旨并指出三处结构问题\"",
"products": "矩阵候选与诊断意见各一份",
"attachments": [
{
"label": "附件一：综述矩阵",
"from": "D02"
},
{
"label": "附件二：诊断意见登记表",
"from": "D06"
}
],
"checks": [
"引文逐字回原页",
"转述回原页确认"
]
}
]
},
"edits.fig10": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。讲义 @fig-revtable 四条（教学构造）。intention_shown 照原表\"意图\"列；intention 为甲三计数所用的最终判断（第 2、3 条理由写\"意思改变\"）。",
"edits": [
{
"edit_id": "1",
"para": "3",
"before": "茅海建在逐日考订之后接受了这一切分",
"after": "茅海建逐日考订后接受了这一切分",
"author": null,
"date": null,
"location": null,
"proposer": {
"kind": "model",
"name": null,
"run_id": null
},
"intention": "fluency",
"intention_shown": "fluency",
"decision": "accept",
"reason": "不改变意思",
"in_footnote": false
},
{
"edit_id": "2",
"para": "3",
"before": "告密的消息\"大大加剧了政变的激烈程度\"",
"after": "告密进一步推动了政变",
"author": null,
"date": null,
"location": null,
"proposer": {
"kind": "model",
"name": null,
"run_id": null
},
"intention": "meaning-changed",
"intention_shown": "clarity",
"decision": "reject",
"reason": "意思改变：原话是\"加剧\"，且有\"虽未……但……\"的限定",
"in_footnote": false
},
{
"edit_id": "3",
"para": "7",
"before": "仍有待进一步研究",
"after": "本文将对此作出全面回答",
"author": null,
"date": null,
"location": null,
"proposer": {
"kind": "model",
"name": null,
"run_id": null
},
"intention": "meaning-changed",
"intention_shown": "style",
"decision": "reject",
"reason": "意思改变：限定不能删",
"in_footnote": false
},
{
"edit_id": "4",
"para": "2",
"before": "（罗列四家）",
"after": "（按与本文问题的关系重排为两句）",
"author": null,
"date": null,
"location": null,
"proposer": {
"kind": "author",
"name": null,
"run_id": null
},
"intention": "meaning-changed",
"intention_shown": "meaning-changed",
"decision": null,
"reason": "据 @fig-reg 第 1 条；属重写，不属润色",
"in_footnote": false
}
]
},
"footnotes.jia": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。练习材料甲八条脚注，由 .docx 抽出：第 1 页①—⑥、第 2 页①—②（Word 每页重新编号）。",
"footnotes": [
{
"note_id": "1",
"doc_page": 1,
"number_on_page": 1,
"text": "丁文江、赵丰田编：《梁启超年谱长编》，上海：上海人民出版社，1983年，第143、149页；转引自茅海建：《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正（一）》，《近代史研究》2002年第4期，第198—199页。",
"citation_item": null,
"locator": "198—199"
},
{
"note_id": "2",
"doc_page": 1,
"number_on_page": 2,
"text": "刘凤翰：《袁世凯〈戊戌日记〉考订》，《幼狮学志》第2卷第1期，1963年1月。",
"citation_item": null,
"locator": null
},
{
"note_id": "3",
"doc_page": 1,
"number_on_page": 3,
"text": "茅海建：《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正（一）》，第201页。",
"citation_item": null,
"locator": "201"
},
{
"note_id": "4",
"doc_page": 1,
"number_on_page": 4,
"text": "黄彰健：《戊戌變法史研究》，台北：中央研究院历史语言研究所，1970年，第498页。",
"citation_item": null,
"locator": "498"
},
{
"note_id": "5",
"doc_page": 1,
"number_on_page": 5,
"text": "茅海建：《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正（三）》，《近代史研究》2002年第6期，第175页。",
"citation_item": null,
"locator": "175"
},
{
"note_id": "6",
"doc_page": 1,
"number_on_page": 6,
"text": "郭卫东：《再论戊戌政变中袁世凯的“告密”问题》，《清史研究》2002年第1期，第33—35页。",
"citation_item": null,
"locator": "33—35"
},
{
"note_id": "7",
"doc_page": 2,
"number_on_page": 1,
"text": "同上，第38页。",
"citation_item": null,
"locator": "38"
},
{
"note_id": "8",
"doc_page": 2,
"number_on_page": 2,
"text": "刘路生：《戊戌政变袁世凯初四告密说不能成立——兼与郭卫东先生商榷》，《清史研究》2005年第1期，第48—49页。",
"citation_item": null,
"locator": "48—49"
}
]
},
"implants-findings.toy": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。扩充部分甲二小例（教学构造的假设数字，演示②′运行后替换，E-01）。植入位置据讲义 2.3 演示②′。",
"implants": [
{
"error_id": "E1",
"unit_id": null,
"type": "insert",
"category": "归属",
"location": "第 156 页",
"before": "鸠山一郎",
"after": "芦田均"
},
{
"error_id": "E2",
"unit_id": null,
"type": "insert",
"category": "出处",
"location": "第 157 页",
"before": "贵族院议员二荒芳德",
"after": "众议院议员二荒芳德"
},
{
"error_id": "E3",
"unit_id": null,
"type": "omit",
"category": "说满",
"location": "第 159 页",
"before": "少数议员注意到",
"after": "议员们普遍注意到"
}
],
"findings": [
{
"run_id": "A-1",
"system": "A",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E1",
"matched": 1,
"adjudication_note": "教学构造"
},
{
"run_id": "A-1",
"system": "A",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E2",
"matched": 1,
"adjudication_note": "教学构造"
},
{
"run_id": "A-2",
"system": "A",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E1",
"matched": 1,
"adjudication_note": "教学构造"
},
{
"run_id": "A-3",
"system": "A",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E1",
"matched": 1,
"adjudication_note": "教学构造"
},
{
"run_id": "A-3",
"system": "A",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E2",
"matched": 1,
"adjudication_note": "教学构造"
},
{
"run_id": "B-1",
"system": "B",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E2",
"matched": 1,
"adjudication_note": "教学构造"
},
{
"run_id": "B-2",
"system": "B",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E1",
"matched": 1,
"adjudication_note": "教学构造"
},
{
"run_id": "B-3",
"system": "B",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E1",
"matched": 1,
"adjudication_note": "教学构造"
},
{
"run_id": "B-3",
"system": "B",
"finding_text": "（教学构造：假设查出）",
"unit_id": null,
"error_id": "E2",
"matched": 1,
"adjudication_note": "教学构造"
}
],
"runs": [
"A-1",
"A-2",
"A-3",
"B-1",
"B-2",
"B-3"
]
},
"ledger.jia2": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。扩充部分乙二两条史学样例（教学构造）；LEDGER 学生样板待整理、待教师确认。",
"entries": [
{
"entry_id": "W-01",
"preference": "判断词的强度照原样，不升不降",
"before": "告密的消息\"大大加剧了政变的激烈程度\"",
"after": "（拒绝模型的\"导致了政变\"，保留原句）",
"reason": "\"加剧\"与\"导致\"是两种判断，属意思改变（讲义 3.1）",
"source": "扩充部分乙二（教学构造）",
"scope": "所有转述他人判断的句子",
"status": "直接要求"
},
{
"entry_id": "W-02",
"preference": "引文与史料原词不改，包括旧字形与时代用语",
"before": "（模型改稿）\"国体\"思想 → 国家体制思想",
"after": "（恢复\"国体\"，加引号）",
"reason": "时代用语是论文讨论的对象，改了就是时代错置（第九周）",
"source": "扩充部分乙二（教学构造）",
"scope": "引文、专名、加引号的概念",
"status": "直接要求"
},
{
"entry_id": "W-03",
"preference": "（示例）少用\"值得注意的是\"",
"before": null,
"after": null,
"reason": null,
"source": "学生自拟",
"scope": null,
"status": "候选"
}
]
},
"matrix.wuxu": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。讲义 @fig-matrix 六家（本课摘编；\"与我的问题的关系\"一列为教学构造，对应讲义假设的研究问题）。页码为茅文、郭文原刊页（郭卫东\"回应对象\"据郭文第 31—32 页）。",
"rows": [
{
"row_id": "m1",
"scholar": "丁文江、赵丰田",
"year": 1936,
"claim": "是否因袁泄密而爆发\"还待考证\"",
"claim_quote": "还待考证",
"page": "198—199",
"page_system": "原刊页",
"source_id": null,
"evidence": null,
"responds_to": "康有为、梁启超的告密致变说",
"responds_basis": "推断",
"relation_to_my_question": "背景",
"filled_by": "teaching-construct"
},
{
"row_id": "m2",
"scholar": "吴相湘",
"year": 1957,
"claim": "起因是杨崇伊密折，不在告密",
"claim_quote": null,
"page": "199",
"page_system": "原刊页",
"source_id": null,
"evidence": null,
"responds_to": "\"世俗所谓\"告密致变之说",
"responds_basis": "原文",
"relation_to_my_question": "需要处理",
"filled_by": "teaching-construct"
},
{
"row_id": "m3",
"scholar": "黄彰健",
"year": 1970,
"claim": "政变初六日爆发，与初五日告密无关；告密消息到京后才有捕人之举",
"claim_quote": null,
"page": null,
"page_system": "原刊页",
"source_id": null,
"evidence": null,
"responds_to": null,
"responds_basis": "需回原文",
"relation_to_my_question": "出发点",
"filled_by": "teaching-construct"
},
{
"row_id": "m4",
"scholar": "郭卫东",
"year": 2002,
"claim": "初四日已在北京告密，告密引起政变",
"claim_quote": null,
"page": "33",
"page_system": "原刊页",
"source_id": null,
"evidence": null,
"responds_to": "两说并驳：初五日回津告密致变的\"旧说\"与\"新解\"",
"responds_basis": "原文",
"relation_to_my_question": "反证",
"filled_by": "teaching-construct"
},
{
"row_id": "m5",
"scholar": "茅海建",
"year": 2002,
"claim": "政变虽未因告密而发生，但告密\"大大加剧了政变的激烈程度\"",
"claim_quote": "大大加剧了政变的激烈程度",
"page": "175",
"page_system": "原刊页",
"source_id": null,
"evidence": null,
"responds_to": "黄彰健",
"responds_basis": "原文",
"relation_to_my_question": "补证",
"filled_by": "teaching-construct"
},
{
"row_id": "m6",
"scholar": "刘路生",
"year": 2005,
"claim": "与郭文商榷",
"claim_quote": null,
"page": null,
"page_system": "原刊页",
"source_id": null,
"evidence": null,
"responds_to": "郭卫东",
"responds_basis": "原文",
"relation_to_my_question": "需要读",
"filled_by": "teaching-construct"
}
]
},
"paragraphs.jia": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。练习材料甲七段（教学构造）。功能与\"回答哪个问题\"据讲义 @fig-diag；reader_summary_construct 为讲义 @fig-outline 右列（备课者逐段概括，教学构造）。Word 第 4、5 段（分页断开）合为论文第 4 段。",
"paragraphs": [
{
"doc_id": "jia",
"para_id": "P1",
"text": "戊戌政变的起因，长期与袁世凯的告密联系在一起。康有为、梁启超事后认定，政变是因为袁世凯告密而起，这一说法流传甚广。丁文江、赵丰田在《梁启超年谱长编》中则提出，政变“是不是因为袁项城泄露了密谋才爆发的，还待考证”。",
"word_paras": [
1
],
"page_from": "1",
"page_to": "1",
"page_system": "Word页",
"author_summary": null,
"model_summary": null,
"model_run_id": null,
"function": "提出问题",
"function2": null,
"function_note": "未完成：只提出了前人的问题",
"answers": "告密是否引发政变",
"responds_to_para": null,
"reader_summary_construct": "康、梁的告密致变说；丁文江、赵丰田说\"还待考证\""
},
{
"doc_id": "jia",
"para_id": "P2",
"text": "此后学者各有论说。吴相湘1957年认为，政变的起因不在告密，而在御史杨崇伊致慈禧太后的密折，伊藤博文访华是最要之因素。刘凤翰1959年考订梁启超《戊戌政变记》的各个版本，认为梁氏修改的用意在于删改袁世凯告密的史实；1963年他又指出，袁世凯的自述对初四日凌晨至初五日清晨约三十个小时“只字未提，实在令人怀疑”。萧一山1963年认为，“政变虽非纯由袁之告密，然而袁之告密则是政变的导火线”。房德邻1983年以档案考定政变发生于初六日，主因是杨崇伊的密折。以后的研究大体是围绕着此一假设打圈子，走不出太远。",
"word_paras": [
2
],
"page_from": "1",
"page_to": "1",
"page_system": "Word页",
"author_summary": null,
"model_summary": null,
"model_run_id": null,
"function": "学术史·背景",
"function2": null,
"function_note": null,
"answers": "告密是否引发政变",
"responds_to_para": null,
"reader_summary_construct": "吴相湘、刘凤翰、萧一山、房德邻各说一句；末句是茅海建对丁、赵的评语"
},
{
"doc_id": "jia",
"para_id": "P3",
"text": "黄彰健将“政变爆发”与“捕拿新党”分为两事，认为政变“於初六日爆發，根本是太后預定的行動，與袁世凱初五日的告密無關”，告密的消息由杨崇伊带到北京之后，才有捕人之举。茅海建在逐日考订之后接受了这一切分，认为“戊戌政变虽未因袁世凯告密而发生，但袁世凯告密的消息传到北京，大大加剧了政变的激烈程度”。",
"word_paras": [
3
],
"page_from": "1",
"page_to": "1",
"page_system": "Word页",
"author_summary": null,
"model_summary": null,
"model_run_id": null,
"function": "学术史·出发点",
"function2": null,
"function_note": null,
"answers": "告密在哪个环节起作用",
"responds_to_para": null,
"reader_summary_construct": "黄彰健分开\"爆发\"与\"捕人\"；茅海建接受这一切分"
},
{
"doc_id": "jia",
"para_id": "P4",
"text": "郭卫东则重申告密为政变的起因，主张袁世凯初四日见过谭嗣同之后已在北京告密，对象很可能是庆亲王奕劻。郭文的一个重要依据，是袁世凯自述对初四日的空白。这份自述通称《戊戌日记》，文末自署“时在八月十四日记于天津督署”；宣统元年有南通翰墨林的单行本，民国十五年又在《申报》连载，刘凤翰推测它可能是光绪三十年以后补作的。郭卫东本人也承认，初四日告密之说只是“一种供大家考问的见解”。",
"word_paras": [
4,
5
],
"page_from": "1",
"page_to": "2",
"page_system": "Word页",
"author_summary": null,
"model_summary": null,
"model_run_id": null,
"function": "学术史·反证",
"function2": "史料介绍或考订",
"function_note": null,
"answers": "告密时间",
"responds_to_para": null,
"reader_summary_construct": "郭卫东主张初四日北京告密；袁世凯自述的署时、版本与补作之说；郭的自我限定"
},
{
"doc_id": "jia",
"para_id": "P5",
"text": "刘路生2005年与郭文商榷，认为袁世凯八月初二至初四日住在城内法华寺，张一麐所记“寓海淀旅店”是误记，进而否认袁世凯曾经告密。",
"word_paras": [
6
],
"page_from": "2",
"page_to": "2",
"page_system": "Word页",
"author_summary": null,
"model_summary": null,
"model_run_id": null,
"function": "学术史·反证",
"function2": null,
"function_note": "反证的回应",
"answers": "告密时间",
"responds_to_para": "P4",
"reader_summary_construct": "刘路生认为袁初二至初四日住城内，并否认袁世凯告密"
},
{
"doc_id": "jia",
"para_id": "P6",
"text": "总之，黄彰健、茅海建的研究表明，政变的爆发与告密无关，告密只是加剧了政变。这一判断已为学界普遍接受。",
"word_paras": [
7
],
"page_from": "2",
"page_to": "2",
"page_system": "Word页",
"author_summary": null,
"model_summary": null,
"model_run_id": null,
"function": "过渡与小结",
"function2": null,
"function_note": null,
"answers": null,
"responds_to_para": null,
"reader_summary_construct": "黄、茅之说表明政变与告密无关，\"已为学界普遍接受\""
},
{
"doc_id": "jia",
"para_id": "P7",
"text": "综上所述，学界关于告密与政变关系的讨论已基本形成共识，但告密的消息究竟在哪一天、经由何人传到北京，仍有待进一步研究。本文拟以此为中心展开考察。",
"word_paras": [
8
],
"page_from": "2",
"page_to": "2",
"page_system": "Word页",
"author_summary": null,
"model_summary": null,
"model_run_id": null,
"function": "结论",
"function2": "提出问题",
"function_note": "本文问题",
"answers": "告密消息的日期与途径",
"responds_to_para": null,
"reader_summary_construct": "学界\"已基本形成共识\"；告密消息的日期与途径\"有待进一步研究\"；本文将考察"
}
]
},
"register.fig-reg": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。讲义 @fig-reg 四条（\"模型意见\"一列为教学构造的预期典型意见，课前记录后替换）。第 4 条原表\"部分采纳\"不在三值之内，按\"修正\"计，原文字存 decision_raw。",
"rows": [
{
"reg_id": "diag-1",
"kind": "diagnosis",
"target": "P2",
"proposer": {
"kind": "model",
"name": "预期典型意见（教学构造）",
"run_id": null
},
"content": "第 2 段罗列各家，建议按时间顺序加过渡句使之连贯",
"decision": "修正",
"decision_raw": null,
"reason": "问题不在缺过渡，而在以作者为纲；改为按与本文问题的关系重排，过渡句不加",
"source_needed": null,
"from_page": "D06"
},
{
"reg_id": "diag-2",
"kind": "diagnosis",
"target": "P4",
"proposer": {
"kind": "model",
"name": "预期典型意见（教学构造）",
"run_id": null
},
"content": "第 4 段关于袁世凯自述版本的内容偏离主题，建议删除",
"decision": "修正",
"decision_raw": null,
"reason": "不删，移到讨论史料的一节；版本问题决定郭说的依据能否成立，学术史里只留一句",
"source_needed": null,
"from_page": "D06"
},
{
"reg_id": "diag-3",
"kind": "diagnosis",
"target": "P5",
"proposer": {
"kind": "model",
"name": "预期典型意见（教学构造）",
"run_id": null
},
"content": "第 5 段刘路生的商榷与本文关系不大，建议删去以使论证更集中",
"decision": "舍弃",
"decision_raw": null,
"reason": "反证是否已被回应，本身就是本文问题的一部分；删去会让读者以为郭说无人驳过",
"source_needed": null,
"from_page": "D06"
},
{
"reg_id": "diag-4",
"kind": "diagnosis",
"target": "P6—P7",
"proposer": {
"kind": "model",
"name": "预期典型意见（教学构造）",
"run_id": null
},
"content": "第 6、7 段可合并，并把\"有待进一步研究\"改为更有力的表述",
"decision": "修正",
"decision_raw": "部分采纳",
"reason": "合并采纳；\"更有力\"不采纳，限定照留，\"共识\"一语删去",
"source_needed": null,
"from_page": "D06"
}
]
},
"run-record.pending": {
"run_id": "D2A_kimi_1",
"card_id": "D2A",
"sample_index": 1,
"mode": "pending",
"origin_mode": null,
"preset": "kimi",
"model": "kimi-k3",
"temperature": null,
"reasoning_effort": "low",
"prompt": {},
"reply": null,
"reasoning": null,
"ms": null,
"date": "待课前运行",
"error": null,
"web": null,
"transcription": null
},
"source-page": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。原文页：原刊页码与 PDF 页序分列。第一条为 NDL 帝国议会会议录（公开），以发言番号定位；第二条示意郭卫东文\"原刊第 38 页＝PDF 第 8 页\"（PDF 页序＋30＝原刊页，据 4.3 答案），text 不放原文。",
"pages": [
{
"source_id": "d15-A",
"page": "003",
"page_system": "发言番号",
"pdf_index": null,
"text": "○鳩山一郎君　國家空前の變局に立つて重責を擔へる現内閣の苦心と努力とに對し深く敬意を表します",
"offset": 0
},
{
"source_id": "guo-2002",
"page": "38",
"page_system": "原刊页",
"pdf_index": 8,
"text": "",
"offset": null
}
]
},
"style.toy": {
"_note": "候选，未经教师确认（2026-11-25，第一步）。规则表据扩充部分甲四；段落对为教学构造，只作计数示例。",
"rules": [
{
"rule_id": "R1",
"name": "虚化动词",
"pattern": "进行|加以|予以",
"kind": "wordlist",
"unit": "每百字",
"note": "扩充部分甲四"
},
{
"rule_id": "R2",
"name": "套语",
"pattern": "值得注意的是|从某种意义上说|不难看出|这正是",
"kind": "wordlist",
"unit": "每百字",
"note": "扩充部分甲四；LEDGER L-019"
},
{
"rule_id": "R3",
"name": "长\"的\"字结构（一句三个以上\"的\"）",
"pattern": "[^。！？；]*的[^。！？；]*的[^。！？；]*的[^。！？；]*",
"kind": "regex",
"unit": "每百字",
"note": "本课约定，可调"
}
],
"pairs": [
{
"pair_id": "toy-1",
"original": "本文对告密的日期作了考察。",
"revised": "值得注意的是，本文对告密的日期进行了深入的考察。",
"revised_run_id": null,
"source_id": null
}
]
}
};
