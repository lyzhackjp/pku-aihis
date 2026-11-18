# 第十周演示的通用输入：数据结构

候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-16｜第一步交付

- 正式定义：`schemas/w10-structures.schema.json`（`$defs` 下每种结构一节）。在第九周 `docs/week09/schemas/w09-structures.schema.json` 之上增加；史料包、运行记录、网页版记录的约定照第九周。
- 导入对话框的表头映射：`schemas/importer-kinds.w10.json`（格式同第九周：字段、说明、必需、同义列名；另有 `_guess` 猜类型规则）。
- 示例：`examples/`，只用公开文本或标明"教学构造"的示意。`plan-src/validate_examples.py` 校验全部示例通过；两个反例（运行记录带 `apiKey`；`sendable=false` 的条目标成"公开"）确实被拒。
- 生成：`plan-src/make_examples.mjs`（示例）、`plan-src/prompts_to_cards.py`（条件卡）。

## 一、共同约定（沿用第九周）

1. 原文纪年照录，不覆盖：`*_raw` 存原文（"光绪二十四年八月十四日""明治二十三年""6 月 10 日前后"），公元值另一栏。导入时只给一列年份的：阿拉伯数字同时填两栏；含年号、汉字数字或"前后""ごろ"的只填 `_raw`，检查报告提示"未换算"。时间线的模糊日期由页面按本课约定化成区间（`algorithms.md` 第三节），区间写回 `date_from`／`date_to` 并标"页面推定"。
2. 页码体系分清：原书页、原刊页、PDF 页序、扫描图编号、电子文本段落。茅文用〔原刊第×页〕标记，`quote-check` 据此报页。
3. 文本身份分清：原文、录文、转写、教学转述、仅元数据。
4. 可送与可发布分开：`sendable` 管能否送模型，`visibility` 管能否随课件发布。`sendable=false` 的条目只能是"本机材料包"。
5. Key 不进任何结构；含 `apiKey`、`key`、`authorization` 列的表整份拒绝。
6. 回放如实：导入或载入的运行记录一律显示为"预存回放"，原来的模式存 `origin_mode`；没有记录的格是 `mode: pending`，显示"待课前运行"。

## 二、本周新增的结构

| 结构 | 用于 | 要点 |
|---|---|---|
| 见证本 witness | D08、D10、D18、D20 | `editor_note` 记"海後复原（除去墨笔添改）"一类整理者判断 |
| 对齐设置、对齐表 alignSettings、alignTable（`w10-align/v1`） | D08、D10、D18 | 每处异文带原文下标 `a_span`、`b_span`，供回原文；`origin` 写"页面实算／课前脚本／导入" |
| 异文分类 variantLabel、类别 category | D09、D10、D18 | `labeler` 分学生、模型、教师；`is_example` 标 Rdgai 式示例 |
| 原子主张 atomicClaim、要点 keyPoint | D04、D15 | `quote_check` 存覆盖率、状态、页码与当时的门槛 |
| 时间线步 timelineStep、基准行 baseRow | D06、D07 | `label` 是［材料］［自知］［推测］；`label_by` 分模型、学生 |
| 标注对照 labelPair、名单 nameList | D07、D09、D14 | — |
| 成文表 chengwenRow | D05 | `written_date_alt[]` 可放多种成文时间，各带 `certainty`（自署／推测／约数／确定） |
| 研究说法表 viewRow | D11、D12、D14 | `source` 区分茅文、原书、稲田概述、本课概括 |
| 逐格核对 cellCheck、论证卡 argumentCard | D12、D13 | 论证卡 `construct: true` 标"删去自我限定之后"一句 |
| 草案表 draftRow | D20 | 三种排序 `order_kaigo`、`order_inada`、`order_asao` |
| 文献结构 docStructure、真假句对 truthPair | D02、D19 | `chars_basis` 写"材料包实算／估计／未知" |
| 工具使用记录 toolRecord | D15、D21 | 扩充部分丙二的条目 |
| 对照单 sheetRow | D15 | `verdict_prefilled` 标从其他页送入时的预填；`confirmed` 管"模型新见"是否计入 |
| 条件卡 conditionCard（第十周版） | 所有调用模型的页、课前运行面板 | 见下第四节 |
| 课前运行队列 preclassQueue（`w10-preclass/v1`） | 课前运行面板 | 只在页面内存与导出中出现，不含 Key |
| 贯穿记录 throughRecord（`w10-through/v1`） | D16 总导出 | `contains_restricted_text` 提示导出里有无本机材料包的受限文字 |

## 三、在导入对话框中的映射

第九周"导入表格"对话框（读入 CSV、TSV、JSON；`guessKind`／`guessMap` 按同义列名猜类型与映射；声明栏；检查报告）照用。本周的扩充：

1. **新增十类**（`importer-kinds.w10.json`）：阅读对照单、原子主张、要点、时间线步、成文表、研究说法表、见证本、异文分类、逐格核对、点名名单、草案表。每类的同义列名含中文表头（"我的理解""判定""自署""所据材料""本子简称"等），教师用中文表头写的 Excel 另存 CSV 即可认出。
2. **猜类型**：见 `_guess`。例如表头同时有"我的理解"与"判定"→阅读对照单；有"事项"与"时间"→时间线步。猜错时教师在下拉框改。
3. **原文纪年与出处列**：同第一节第 1 条。出处列（`source_ref`、`page`）没有映射时不拒绝导入，但每行记一次"无出处"，对照单与原子主张的"原文核对"栏显示"无出处"。
4. **对照单导入的附加声明**：可在声明栏填一次工具使用条件（丙二：工具、日期、模型、文件与文字层、是否联网），写进每行的 `tool_record`。
5. **"导入本机材料包"**：本周的本机材料包 `w10-pack/v1` 与第九周同构（`packs[].entries[]`＋`runs[]`），由 `apps/week10/scripts/build_packs.py`（第一批写）从课程文件夹 `第十周/demo/材料/` 与运行记录拆出公开包与本机包。茅文、稲田录文只进本机包；埃姆斯两本、勅語成文进公开包。
6. **课程通用导入页**（`apps/material-importer`，顶栏"文献导入"）：握手同第九周（`PKU_IMPORT_READY`／`PKU_PROJECT`）；送回的正文片段成为史料包，`sendable` 默认 false，由导入者声明。

## 四、prompts.json 怎样转成条件卡

`plan-src/prompts_to_cards.py` 把每个条件提示中逐字出现的材料正文换成 `{{material:ID}}`，卡里只留模板、问题与材料编号（10 张卡的模板最长 258 字），不含任何材料正文，可以入库。发出前，页面用 `fillTemplate(card, entries)` 从已载入的史料包回填，先过 `gate`（`sendable` 校验）；缺本机材料包时报"未载入"，不发出。

`tests/local.test.mjs` 检查：七张有材料的卡回填后与 prompts.json 原提示逐字相同（D1B、D2B、D2C、D3、D4B、C02A、C02B），三张无材料的卡（D1A、D2A、D4A）照原文。材料编号：

| 文件 | entry_id | 发布 |
|---|---|---|
| 茅海建_学术史一节_页198-208.txt | mao-history | 本机材料包 |
| 茅海建_结论一节_页174-176.txt | mao-conclusion | 本机材料包 |
| 演示2_稲田年表1890录文.md（正文部分） | inada-chronology-1890 | 本机材料包 |
| 演示4_稲田先行研究pp3-4录文.md（正文部分） | inada-pp3-4 | 本机材料包 |
| 埃姆斯_甲_阿贝肯原电.txt | ems-a | 公开 |
| 埃姆斯_乙_新闻稿.txt | ems-b | 公开 |
| 埃姆斯_对齐表.md（表格部分） | ems-align-table | 公开 |

每张卡的 `source` 字段记 prompts.json 版本与原提示的 sha256 前 16 位，以后 prompts.json 改动时可以看出卡是否过期。`web_prompt_file` 指向 `第十周/demo/网页版提示/` 中同文的文件（第一批生成）。

## 五、运行记录：run_w10.py 与第九周格式怎样统一

决定：课前记录由页面的"课前运行"面板生成，格式就是第九周的运行记录（`runRecord`，见 schema），`mode: live`，并入本机材料包后 `mode: replay`、`origin_mode: live`。`run_w10.py` 只作备用（教师 2026-11-16），若用它跑了，导入时按下表映射：

| run_w10.py 字段 | runRecord 字段 |
|---|---|
| condition | card_id |
| model_preset | preset |
| sample | sample_index |
| `f"{condition}_{model_preset}_{sample}"` | run_id |
| request.endpoint、request.model、request.temperature、request.reasoning_effort | endpoint、model、temperature、reasoning_effort |
| messages、materials | prompt.messages、prompt.source_ids（文件名换成 entry_id） |
| reply、reasoning、finish_reason、model_returned、usage、ms、error、attempts、date | 同名 |
| （无） | mode: replay；origin_mode: live；environment: "run_w10.py（备用运行器）" |

两点差别要记下：一是 `run_w10.py` 对 DeepSeek 同时传了 `temperature: 0.7` 与 `reasoning_effort: low`，而第九周课件对 DeepSeek 关闭思考（`thinking: disabled`）才传温度，因为思考模式下温度不生效（`apps/week09/prototype/live/w9-live.js` 注释，据 DeepSeek 文档 2026-11-11）；二是 `run_w10.py` 的记录里没有 `gate`。第十周采用哪一种设置，是第一步待决 1。
