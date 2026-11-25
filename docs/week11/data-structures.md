# 第十一周演示的通用输入：数据结构

候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-25｜第一步交付

- 正式定义：`schemas/w11-structures.schema.json`（由 `plan-src/make_schema.py` 生成，20 种）。史料包条目、条件卡、运行记录沿用第十周的写法；条件卡加 `sources[]`、`wording_status`、每份材料的 `sendable`。
- 导入对话框的表头映射：`schemas/importer-kinds.w11.json`（格式同第十周：字段、说明、必需、同义列名；`_guess` 猜类型）。
- 示例：`examples/`，只用公开或教学构造的内容（练习材料甲、讲义图 1／5／10、扩充部分甲二小例与乙二样例）。`plan-src/validate_examples.py` 校验 15 类示例全部通过；三个反例（运行记录带 `apiKey`；`sendable=false` 的条目标成公开；"待课前运行"占位却带回答）都被拒。

## 一、共同约定（沿用第九、十周）

1. **页码体系分列**：`page` 与 `page_system`（原书页、原刊页、PDF页序、扫描图编号、电子文本段落、发言番号、Word页）一起存；PDF 页序另存 `pdf_index`，不覆盖原刊页。例：郭卫东文原刊第 38 页＝PDF 第 8 页（PDF 页序＋30），两栏分记（`examples/source-page.example.json`）。茅文用〔原刊第×页〕标记，会议录用发言番号。
2. **文本身份**：原文、录文、转写、教学转述、教学构造、仅元数据。
3. **可送与可发布分开**：`sendable` 管能否送模型，`visibility` 管能否随课件发布；`sendable=false` 只能是本机材料包。
4. **Key 不进任何结构**；含 `apiKey`、`key`、`authorization` 列的表整份拒绝。
5. **回放如实**：载入的运行记录一律显示为"预存回放"，原模式存 `origin_mode`；没有记录的格 `mode: pending`，`reply` 必须为空（schema 强制），页面显示"待课前运行"。

## 二、本周新增的结构

| 结构 | 用于 | 要点 |
|---|---|---|
| 原文页 sourcePage | D01、D09、D17 | 原刊页与 PDF 页序分列；`offset` 供回原文高亮 |
| 段落表 paragraph | D05、D06、D09、D11 | `word_paras[]` 记来自哪几个 Word 段落；`function`＋`function2`（取扩充部分甲一九类）；`answers`；`responds_to_para` |
| 综述矩阵 matrixRow | D02—D04 | `responds_basis` 三值（原文／推断／需回原文）照录，不由页面补；`filled_by` 标作者、模型、教学构造 |
| 登记行 registerRow | D06、D07、D13、D14、D17、D18 | 四种视图共用；`proposer`＝作者／模型（附 `run_id`）／他人；`decision_raw` 留原文字 |
| 审读单元 reviewUnit | D07、D09 | 乙一第一步的六个字段 |
| 植入 implant、发现 finding | D07—D09 | `matched` 须经裁决 |
| 修改表 editRow | D10、D13、D14 | `intention` 为作者最终判断，`intention_shown` 为表上原标；`in_footnote` |
| 文风规则 styleRule、段落对 paragraphPair | D11、D12 | 规则可为正则或词表 |
| 账本条目 ledgerEntry | D12 | 七栏四状态 |
| 脚注表 footnote | D15—D17 | `note_id`（文件序号）与 `number_on_page`（Word 显示的页内编号）分开 |
| 参考文献目录 bibEntry | D16 | `matched_note_ids[]`、`changed_fields[]` |
| 声明 declaration | D18 | `attachments[]` 默认空 |
| 条件卡 conditionCard（第十一周版） | 调用模型的页、课前运行面板 | 见第四节 |
| 贯穿记录 throughRecord（`w11-through/v1`） | D18 导出 | 写作时自用、被问到时出示的记录 |

## 三、"导入表格"与"导入 Word 稿"

**导入表格**：第十周对话框照用（CSV、TSV、JSON；`guessKind`／`guessMap`；声明栏；检查报告）。本周新增十一类（`importer-kinds.w11.json`），同义列名含中文表头（"与我的问题的关系""改前""改后""处理""理由""注文"等）。猜错时在下拉框改。没有映射到页码列的行，"回原文"栏显示"无出处"，不拒绝导入。

**导入 Word 稿**（顶栏新入口）：
1. 只在浏览器内解析（`DecompressionStream`＋`DOMParser`），不上传，不进浏览器存储以外的地方；原文件不改。
2. 抽出：段落（附显式分页）、脚注（页内编号按 `numRestart`）、修订（改前、改后、修订者、时间）、批注、脚注中的修订。
3. 导入者选用途：段落表（D05、D06、D09、D11）、脚注表（D15—D17）、修改表（D10、D13、D14）。段落表一步可合并"续段"（Word 分页断开的同一段）。
4. 导出只导出抽出的表（.csv／.json），不导出原文件。Word 的自动分页不在文件中，页面写明"按显式分页计"。

**导入本机材料包**：`w11-pack/v1`，与第十周 `w10-pack/v1` 同构（`packs[].entries[]`＋`runs[]`），由第一批的 `build_packs` 从课程文件夹 `第十一周/demo/材料/` 与运行记录拆出公开包与本机包：练习材料甲、讲义图 1 摘编进公开包；茅文节录、郭刘两文页面、教师 2023 年论文段落与植入副本、4.3 答案（教师模式）、运行记录只进本机包。

## 四、条件卡

`第十一周/demo/prompts.json`（课程文件夹，本机）是 11 个条件的模板（`{{material:ID}}`）与材料清单；`plan-src/prompts_to_cards.py` 去掉本机路径与生成状态，写成 `examples/condition-cards.w11.json`（可入库，不含材料正文）。每张卡写 `sources[]`（提示依据讲义或扩充部分的哪一处）与 `wording_status`（据讲义原文，或本线程整理待教师确认）。发出前 `gate` 按每份材料的 `sendable` 校验；S3 的账本样板未经教师确认前 `sendable=false`，卡上标"发不出"。

| 材料编号 | 内容 | sendable | 发布 |
|---|---|---|---|
| matrix-fig1-4col | 讲义图 1 前四列（本课摘编） | 是 | 公开 |
| jia-body、jia-p246、jia-p3 | 练习材料甲（教学构造） | 是 | 公开 |
| mao-history、mao-conclusion | 茅海建文两节节录 | 是（教师 2026-11-14） | 本机材料包 |
| li2023-p156-159-implanted、li2023-p152-153 | 教师 2023 年论文段落与植入副本 | 是（教师 2026-11-24） | 本机材料包（线上只放页码与短引，待决 3） |
| d15-A、d15-B、d15-C | 帝国议会会议录（NDL 公开） | 是 | 本机材料包（随论文一起） |
| ledger-3 | LEDGER 学生样板三条 | 否（待教师确认样板） | 本机材料包 |
