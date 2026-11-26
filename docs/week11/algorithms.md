# 第十一周演示的计算模块：接口与固定例子

候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-25｜第一步交付接口与测试（2026-11-25）；第一批全部实现（2026-11-26），测试 70 项通过。

- 模块挂在 `window.W11Lib`，Node 测试用 `require` 取用；纯函数，不碰 DOM。讲解页与贯穿页共用同一份算法（课程技能 history-demo-courseware 第 4 条）。
- 测试：`apps/week11/tests/lib.test.mjs`（公开材料，35 项）、`local.test.mjs`（茅文节录上复现 `ext/quote_check_输出.txt`，5 项，只在教师本机跑）、`blocklist.test.mjs`（拦截检查本身，3 项，已通过）。2026-11-26：lib 37 项、local 5 项、移入的第十周测试 25 项、blocklist 3 项，共 70 项通过。
- 第十周移入（以函数为单位，第一批做，第十周原测试一并移来）：`quoteUnits`、`quoteCheck`、`splitPages`、`SequenceMatcher`、`jaccard`、`agreement`、`gate`、`fillTemplate`、`stripSecrets`、`orderRuns`、`pickRun`、`planPreclass`。
- 不引入新的前端库。`.docx` 用浏览器原生 `DecompressionStream('deflate-raw')` 解 zip（Node 22 同样有），`DOMParser` 读 XML；Node 测试里 XML 用同一套轻量解析（第一批定，若需要库先列清单请教师确认）。

## 一、borrow-scan：引号外的照抄片段（扩充部分乙一第二步）

`borrowScan(draft, source, {k=12, marker=/〔原刊第(\d+)页〕/}) → {k, fragments:[{text, len, len_trimmed, page, page_raw, draft_span, src_span}]}`

1. 文字归一（与 `ext/quote_check.py` 相同）：去空白、去控制字符（Unicode Cc，茅文节录中有 430 个 U+0080—U+009F 一类）、去引号字符 `“”"「」`。原文按页码标记切页，记每页在归一全文中的起点。
2. 先删去草稿中引号内的文字（引号内归 `quote-check`），再从左到右扫：当前位置起 k 字在原文中出现，就向右延长到不再出现为止，记为一个片段，从片段末尾继续；否则右移一字。
3. 页码：`page_raw` 取片段第一个字所在页（原脚本的取法）；`page` 取片段第一个**非标点**字所在页。练习材料甲第 1 段的片段以句号起头，句号落在茅文第 197 页末，原脚本报第 197 页，扩充部分乙一与 4.3 答案写第 198 页；两种取法都保留，页面显示 `page`，并在"程序说明"里写明原脚本报 197 的原因。
4. 跨页片段只报起始页（扩充部分乙一已说明"跨页引文的页码要人看"）。

固定例：公开小例（`lib.test.mjs`）；练习材料甲＋茅文节录复现四个片段，长度 15、14、13、25，`page_raw` 197、199、199、199，`page` 198、199、199、199（`local.test.mjs`）。

`quoteCheckAll(draft, source)`：抽出引号内文字（`“”` 或 `""` 或 `「」`），逐条跑第十周 `quoteCheck`。复现：10 处中逐字相同 5 处（第 198、200、200、201、175 页），节录中找不到 5 处。

## 二、docx：解析与修订抽取（乙三、丙一）

`parseDocx(arrayBuffer) → Promise<{paragraphs:[{index, text, page}], footnotes:[{note_id, doc_page, number_on_page, text, anchor_para}], settings:{numFmt, numRestart}}>`

- 分页只认显式分页：段落属性 `w:pageBreakBefore`、`w:br w:type="page"`。Word 的自动分页不在文件里，页面写明"按显式分页计；实际排版的分页以 Word 显示为准"。
- 每页重新编号读 `settings.xml` 与 `document.xml` 的 `w:footnotePr/w:numRestart`；编号格式读 `w:numFmt`（`decimalEnclosedCircleChinese` → ①②③）。
- 论文段落≠Word 段落：分页断开的续段（无段首缩进标记以外的区别）由导入者在段落表里合并（`word_paras[]`）；练习材料甲第 4 段即 Word 第 4、5 段。

`docxRevisions(arrayBuffer) → Promise<{edits:[{edit_id, para_index | note_id, in_footnote, author, date, kinds, removed, added, before, after, comment}], comments:[{id, author, date, text, range_text, range_text_before}]}>`

- 改前＝去掉所有 `w:ins`、保留 `w:del`（`w:delText` 作文字）；改后相反。同一段内同一修订者相邻的删与插合为一条"改"。
- 脚注中的修订在 `footnotes.xml` 中单独抽出（`in_footnote: true`）。批注按 `commentRangeStart／End` 挂到所在条。
- 只读：不写回，不缓存原文件；导出只导出抽出的表。

固定例：程序构造夹具 `tests/fixtures/jia_revisions.docx`（由 `make_revision_fixture.py` 在练习材料甲副本上写入：一改、一删、一插、一条批注、脚注 3 中一处改），期望结果 `jia_revisions.expected.json`；解析前后文件 SHA-256 相同；无修订的稿子返回空表。夹具未在 Word 中打开核对（运行清单）。

## 三、note-rules：注释体例（乙一第二步、丙二）

`noteRules(footnotes, {restart=true, ibid=/^同上/, page=/第[\d—\-、]+[页頁]/}) → {notes:[{note_id, label, ibid, ibid_first_on_page, refers_to, no_page, has_transfer, short_form, repeat_of}], issues:[{note_id, rule, why}]}`

| 规则 | 判断 | 报为问题 |
|---|---|---|
| 新页首条"同上" | `number_on_page==1`（restart 时）或该页第一条，且以"同上"起头；`refers_to` 为文件顺序上的前一条 | 是 |
| 缺页码 | 非"同上"、无页码格式 | 是 |
| 转引 | 含"转引"二字（只记事实；该不该转引要人判断） | 否 |
| 再次引证简式 | 作者＋题名与前面某条（含"转引自"之后的部分）相同、且无刊名与出版信息 | 否（记 `repeat_of`） |
| 页码格式 | "第×页""第×—×页""第×頁"之外的写法 | 是（练习材料甲无） |

`restart: false` 时按全文连续编号（第 2 页首条显示⑦）。分页模拟：页面改 `doc_page` 后重算。固定例：练习材料甲问题只报两条（第 2 页①"同上"；注②缺页码），注③为简式（对上注①中的茅文（一）），注⑤为茅文（三）的全式。

## 四、outline-rules：段落功能序列与六类提示（甲一）

`outlineRules(paragraphs, {rules:{罗列, 一段多事, 重复, 问题晚出, 限定后置, 反证未回应}, overlap=0.30, listMin=3, overclaim=[…]}) → {sequence, flags:[{rule, paras, why}], similarity:[{a, b, overlap}]}`

| 提示 | 规则（写在页上，可开关） |
|---|---|
| 罗列 | 段间：连续三段以上功能为"学术史·背景"；段内：连续三句以上以"人名＋四位年份＋年"起头（`/^[\p{Script=Han}]{2,4}\s*\d{4}\s*年/u`） |
| 一段多事 | 一段标了两种主要功能（`function2` 非空） |
| 重复 | 两段字符二元组（去标点、数字、空白）的重合系数 \|A∩B\|/min(\|A\|,\|B\|) ≥ 门槛（默认 0.30） |
| 问题晚出 | 末段（或标"结论"的段）回答的问题，第一次出现在功能含"提出问题"的段落里时，段序在第 3 段以后 |
| 限定后置 | 末段以前没有一段的功能含"限定"；同时报出含说满词（默认：普遍接受、基本形成共识、学界一般认为、普遍认为、已成定论）的段落 |
| 反证未回应 | 有"学术史·反证"的段，而其后没有一段的 `responds_to_para` 指向它 |

固定例（练习材料甲，功能按讲义 @fig-diag，示例 `paragraphs.jia.example.json`）：罗列 P2；一段多事 P4、P7；重复 P3／P6（重合系数 0.341，其余各对 ≤ 0.20；若用 Jaccard，P3／P6 为 0.101、次高 0.080，间隔太小，故不用）；问题晚出 P7；限定后置 P6、P7；反证未回应不报（第 5 段把刘路生说反，规则查不出）。改 P1 为回答本文问题后，"问题晚出"消失。方案第八节只列"一段多事"第 4 段，见出入表。

## 五、recall-pool：召回率与合并（甲二）

`recallPool({implants, findings, runs}) → {perRun:{run:{hits, recall}}, union, recallUnion, greedy:[{run, added, recall}]}`

召回率＝T/N；合并召回率＝\|S₁∪…∪S_k\|/N；只计 `matched=1`（经作者裁决）的发现；贪心曲线每步加入新增最多的运行（并列取运行编号在前者）。精确率只在"真实错误＋全部发现已裁决"时给出，植入错误评测不给（甲二第二部分）。

固定例：甲二小例单次 1/3—2/3、合并 {E1,E2}＝2/3；A-3 加查出 E3 后合并＝1；未裁决的不计；两次查出相同集合，合并不增。

## 六、edit-stats：采纳率与意思改变占比（甲三）

`editStats(edits, {by='item'|'chars', threshold=0.5}) → {n, n_m, a_m, adoption, n_mc, meaningShare, suggestLabel}`

采纳率＝a_m/n_m（提议者为模型、处理为采纳）；意思改变占比＝n_mc/n，按作者最终判断 `intention` 计（`intention_shown` 为表上原标，只作对照）；`meaningShare ≥ threshold` 时建议使用说明写"段落改写"，否则"语言润色"（门槛为本课约定，可调）。按字数时以 `before` 与 `after` 较长者的字数为权。

固定例：讲义图 10 采纳率 1/3、意思改变占比 3/4（第 2、3 条原表标"清晰""文体"，理由写"意思改变"，按甲三计为意思改变；按原标只有 1/4）；第 2 条改为采纳后 2/3。

## 七、style-count：文风计数与超额词（甲四）

`styleCount(text, rules) → {chars, counts:{rule_id:{n, per100, spans}}}`；`styleDiff(original, revised, rules) → {original, revised, delta}`；`excessWord(y₋₃, y₋₂, y) → {pm3, pm2, p, q, delta, r, maxActive}`（每项 `{a, b}`）。

每百字＝次数/字数×100，字数只计汉字、假名与字母数字。正则规则按句（。！？；）匹配。超额词：p=(a+1)/(b+1)；q=p₋₂+2·max{p₋₂−p₋₃,0}；δ=p−q；r=p/q（Kobak 等 2025 方法 4.1—4.3）。固定例（手算）：p₋₃=0.001、p₋₂=0.0015、p=0.012 → q=0.0025、δ=0.0095、r=4.8；p₋₃ 改为 0.002 → max 项为 0、q=0.0015、r=8。

## 八、register、ledger、declaration

- `normalizeDecision(raw, kind)`：诊断意见与修改取采纳／修正／舍弃，审读发现取成立／不成立／存疑；"部分采纳"记为修正并保留原文字；不合视图的取值报错。`registerSummary(rows, kind)` 计三类条数与比例。固定例：讲义图 5 修正 3、舍弃 1。
- `ledgerSelectable(entry)`：只有"归纳认可""直接要求"可勾入改稿提示；`ledgerSnippet(entries)` 拼提示片段，"原段认可"只附例句，"候选"不附。
- `buildDeclaration(decl)`：按课程模板四项（工具信息、使用环节、输入与输出记录、责任归属）与两点补充（第（1）项"使用方式与参数"、第（4）项三类核验）生成草稿；附件只列勾选的部分，未勾选写"附件：无"。`copyText('D18')` 是页面文案：写明"附件按个人情况提交""写作时自用、被问到时出示"，不出现"作业"一类字样。

## 九、贯穿记录与课前运行

- `emptyThrough／exportThrough(T, secrets)／importThrough(text)`：格式 `w11-through/v1`；导出前去掉 Key 一类的键、字符串中已登记的 Key 整段替换，导出中仍出现 Key 即中止；导入先验证，失败返回 `{ok:false}`，调用者保留旧记录；载入的运行记录一律作回放显示。
- `checkKeys(keys, presets)`：未填 Key 时返回明确提示（"未填 Key：DeepSeek、Kimi"）。`runQueue(queue, caller)`：按队列逐个调用，失败记"失败"与错误，再跑只补失败与未跑的；Key 不进队列与记录。测试用页面内模拟接口，不发真实请求。

## 十、未刊稿拦截

`scripts/check-blocklist.mjs`（教师 2026-11-25：不用拦截词，疑似未刊稿直接进本机材料包；脚本保留备用）：在 `apps/week11`、`docs/week11`、构建产物与 `local-only/` 中查拦截词，含 `.docx`／`.zip` 内文字；命中退出码 1；拦截词文件（课程文件夹 `第十一周/demo/本机_拦截词.txt`，不入仓库，由教师提供）不存在或为空时退出码 2，算"未生效"。输出只显示首字与字数。

## 十一、第二批新增（2026-11-26）

- `applyImplants(text, implants)`：每处 `before` 必须在原文中恰好出现一次才植入；出现多次或找不到的拒绝并写明原因（不猜位置）。
- `pagedSentences(text)`：按句号、问号、叹号与换行切句；`〔原刊第N页〕` 记页；句号后紧跟的圈码归上一句；圈码记它所在的页（刊本脚注每页重新编号，跨页句子的注号属后一页）。
- `speakerRules(text, {roster, cites, entries})`：只核带会议录注的句子（`cites[页][圈码]` → 会议录条目）。两条规则：句中出现的人名（中文写法，按 `roster` 换成会议录旧字形写法）不在所注会议录里，报"发言人不在所注原文"；句中"贵族院／众议院议员"与所注会议录的院别不同，报"院别与所注原文不符"。会议录条目缺正文时报"原文不在手：无法核"。规则查不了"谁说的、在什么语境下说的"（D15 的三处归属问题）与"少数→普遍"一类说满。
- `consistency(cells)`：值的一致由人判（相同／不同），引文的一致去掉空白、引号与逗号句号后逐字比；分开算，各除以有判断的格数。
- `revisionView(buf)`／`previewSegs(segs, decisions)`：正文各段的修订片段，编号与 `docxRevisions` 相同；接受（含"修改后采纳"）的落入，拒绝的还原，未定的两种都标出。只改页面预览，不写回文件。
- `docxRevisions` 分组规则修订：同一修订者相邻的修订算一处，但"先删后增"之后又出现删除，算下一处替换（Word 中为两条修订）。
- `boundsCheck(original, revised)`：限定语（之虞、试图、较为、部分、一定程度、或许、可能、似乎、不过、注意到）改后变少；引号内词语改后变少；"学界／学者们／研究者／人们普遍"后接"注意到、认为、指出、试图、主张、普遍"的说法改后新出。只作提示，越界与否由人逐处标。
- `charDiff(a, b)`：字级 LCS 差异（两栏高亮）。`labelAgreement(items)`：一致条数／已标条数，不做 κ 校正。
