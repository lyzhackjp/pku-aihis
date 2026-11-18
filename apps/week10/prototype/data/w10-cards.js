/* 条件卡（模板＋材料编号，不含材料正文）。 由 scripts/build_packs.py 生成，请勿手改。 */
window.W10_CARDS = [
{
"card_id": "D1A",
"title": "演示① 不给材料",
"lecture_ref": "导入·演示①",
"page": "D01",
"question": "茅海建怎样看袁世凯告密与戊戌政变的关系？",
"materials": [],
"user_template": "茅海建怎样看袁世凯告密与戊戌政变的关系？",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "D1A.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 a654083f03224922"
},
{
"card_id": "D1B",
"title": "演示① 给学术史与结论两节",
"lecture_ref": "导入·演示①",
"page": "D01",
"question": "请根据以上材料回答：茅海建怎样看袁世凯告密与戊戌政变的关系？",
"materials": [
{
"entry_id": "mao-history",
"label": "茅海建 2002 学术史一节（第 4 期第 198—208 页）"
},
{
"entry_id": "mao-conclusion",
"label": "茅海建 2002 结论一节（第 6 期第 174—176 页）"
}
],
"user_template": "下面是茅海建《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正》（《近代史研究》2002年第4—6期）中的两部分。文字取自期刊PDF的文字层，〔原刊第×页〕标出原刊页码，脚注文字夹在正文中。\n\n【第一部分　一、学术史与本文之旨趣】\n{{material:mao-history}}\n\n【第二部分　七、结论】\n{{material:mao-conclusion}}\n\n请根据以上材料回答：茅海建怎样看袁世凯告密与戊戌政变的关系？",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "D1B.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 d5867af8c8ffa68a"
},
{
"card_id": "D2A",
"title": "演示② 不给材料",
"lecture_ref": "2.2·演示②",
"page": "D06",
"question": "请写一份《教育勅語》起草经过的时间线。",
"materials": [],
"user_template": "请写一份《教育勅語》起草经过的时间线。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "D2A.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 3a763d81414e4ee8"
},
{
"card_id": "D2B",
"title": "演示② 给稲田年表1890",
"lecture_ref": "2.2·演示②",
"page": "D06",
"question": "请根据以上材料，写一份《教育勅語》起草经过的时间线。",
"materials": [
{
"entry_id": "inada-chronology-1890",
"label": "稲田 1971 年表 1890 年条（原书第 396—398 页）录文"
}
],
"user_template": "下面是稲田正次《教育勅語成立過程の研究》（講談社，1971）书末《教育勅語成立史略年表》中明治二十三年（1890）一年的全文（原书第396—398页），〔 〕内为原书小字割注。\n\n{{material:inada-chronology-1890}}\n\n请根据以上材料，写一份《教育勅語》起草经过的时间线。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "D2B.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 54604d9212ab0dc3"
},
{
"card_id": "D2C",
"title": "演示② 给年表并要求标注出处层级",
"lecture_ref": "2.3·演示②",
"page": "D06、D07",
"question": "要求：时间线的每一句后面用方括号标注依据：［材料：年表中的月日］表示这句话的依据在我给你的材料中；［自知］表示依据是你自己的知识；［推测］表示这是你的推断。",
"materials": [
{
"entry_id": "inada-chronology-1890",
"label": "稲田 1971 年表 1890 年条（原书第 396—398 页）录文"
}
],
"user_template": "下面是稲田正次《教育勅語成立過程の研究》（講談社，1971）书末《教育勅語成立史略年表》中明治二十三年（1890）一年的全文（原书第396—398页），〔 〕内为原书小字割注。\n\n{{material:inada-chronology-1890}}\n\n请根据以上材料，写一份《教育勅語》起草经过的时间线。\n\n要求：时间线的每一句后面用方括号标注依据：［材料：年表中的月日］表示这句话的依据在我给你的材料中；［自知］表示依据是你自己的知识；［推测］表示这是你的推断。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "D2C.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 707f8abfd374f1b6"
},
{
"card_id": "D3",
"title": "演示③ 各说对照表",
"lecture_ref": "4.2·演示③",
"page": "D12",
"question": "请根据以上材料输出一张表，栏目为：学者｜年份｜主张｜所据材料｜与他说的分歧点。每一格后面注明所据的是原刊第几页（用〔原刊第×页〕标出的页码）。只用材料中的内容。",
"materials": [
{
"entry_id": "mao-history",
"label": "茅海建 2002 学术史一节（第 4 期第 198—208 页）"
}
],
"user_template": "下面是茅海建《戊戌政变的时间、过程与原委——先前研究各说的认知、补证、修正》（《近代史研究》2002年第4—6期）第一节“学术史与本文之旨趣”。文字取自期刊PDF的文字层，〔原刊第×页〕标出原刊页码，脚注文字夹在正文中。\n\n{{material:mao-history}}\n\n请根据以上材料输出一张表，栏目为：学者｜年份｜主张｜所据材料｜与他说的分歧点。每一格后面注明所据的是原刊第几页（用〔原刊第×页〕标出的页码）。只用材料中的内容。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "D3.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 0db0043983e94b02"
},
{
"card_id": "D4A",
"title": "演示④ 不给材料",
"lecture_ref": "4.4·演示④",
"page": "D14",
"question": "学界怎样评价《教育勅語》的性质？有哪些不同的看法？每种看法请写出代表学者及其依据。",
"materials": [],
"user_template": "学界怎样评价《教育勅語》的性质？有哪些不同的看法？每种看法请写出代表学者及其依据。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "D4A.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 f80bdbf18e264ae1"
},
{
"card_id": "D4B",
"title": "演示④ 给稲田第3—4页",
"lecture_ref": "4.4·演示④",
"page": "D14",
"question": "请根据以上材料回答：学界怎样评价《教育勅語》的性质？有哪些不同的看法？每种看法请写出代表学者及其依据。",
"materials": [
{
"entry_id": "inada-pp3-4",
"label": "稲田 1971 第 3—4 页录文"
}
],
"user_template": "下面是稲田正次《教育勅語成立過程の研究》（講談社，1971）第一章回顾先行研究的一段（原书第3—4页，末句接第5页）。\n\n{{material:inada-pp3-4}}\n\n请根据以上材料回答：学界怎样评价《教育勅語》的性质？有哪些不同的看法？每种看法请写出代表学者及其依据。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "D4B.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 889156404c9808b2"
},
{
"card_id": "C02A",
"title": "3.3 第一份：给对齐表，异文分类",
"lecture_ref": "3.3·课前记录",
"page": "D10、D09",
"question": "请把表中每一处异文归入以下四类之一：删去内容；改换说话人或转述方式；改变语气；改变事实陈述。每处写一句理由。用表格输出：编号｜类别｜理由。",
"materials": [
{
"entry_id": "ems-a",
"label": "埃姆斯电报甲本：阿贝肯原电（GHDI 德文页）"
},
{
"entry_id": "ems-b",
"label": "埃姆斯电报乙本：俾斯麦新闻稿（GHDI 德文页）"
},
{
"entry_id": "ems-align-table",
"label": "埃姆斯两本程序对齐表（difflib，2026-11-15）"
}
],
"user_template": "下面是1870年7月13日埃姆斯电报的两个本子。\n\n甲本（阿贝肯自埃姆斯发给俾斯麦的原电）：\n{{material:ems-a}}\n\n乙本（俾斯麦据此删改后发给新闻界与各驻外使馆的文本）：\n{{material:ems-b}}\n\n下面是用程序（Python difflib，以词和标点为单位）对齐两本得到的异文表：\n\n{{material:ems-align-table}}\n\n请把表中每一处异文归入以下四类之一：删去内容；改换说话人或转述方式；改变语气；改变事实陈述。每处写一句理由。用表格输出：编号｜类别｜理由。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "C02A.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 1f4dda61103bc523"
},
{
"card_id": "C02B",
"title": "3.3 第二份：不给对齐表，直接列异文",
"lecture_ref": "3.3·课前记录",
"page": "D10",
"question": "请逐处列出这两个本子之间的全部异文（增、删、改），用表格输出：编号｜甲本文字｜乙本文字｜类型（增／删／改）。",
"materials": [
{
"entry_id": "ems-a",
"label": "埃姆斯电报甲本：阿贝肯原电（GHDI 德文页）"
},
{
"entry_id": "ems-b",
"label": "埃姆斯电报乙本：俾斯麦新闻稿（GHDI 德文页）"
}
],
"user_template": "下面是1870年7月13日埃姆斯电报的两个本子。\n\n甲本（阿贝肯自埃姆斯发给俾斯麦的原电）：\n{{material:ems-a}}\n\n乙本（俾斯麦据此删改后发给新闻界与各驻外使馆的文本）：\n{{material:ems-b}}\n\n请逐处列出这两个本子之间的全部异文（增、删、改），用表格输出：编号｜甲本文字｜乙本文字｜类型（增／删／改）。",
"system_prompt": null,
"models": [
"deepseek",
"kimi"
],
"samples": 3,
"settings": {
"deepseek": {
"thinking": "disabled",
"temperature": 0.7
},
"kimi": {
"reasoning_effort": "low",
"temperature": "固定（不传）"
},
"_basis": "教师 2026-11-16：沿用第九周做法"
},
"web_prompt_file": "C02B.txt",
"source": "w10-demo/v1（2026-11-15）；原提示 sha256 16184f3f0c43f0b1"
}
];
