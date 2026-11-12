# 第九周演示的通用输入：数据结构

候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-10｜第一步交付

- 正式定义：`schemas/w09-structures.schema.json`（JSON Schema 2020-12，`$defs` 下每种结构一节）。
- 导入对话框的表头映射：`schemas/importer-kinds.w09.json`。格式与第八周 `week08-core.js` 的 `KINDS` 相同，即"字段、说明、必需、同义列名"，第二步直接并入。
- 示例：`examples/`。只含公开文本与元数据；全集录文尚未做，相应条目 `text` 为空。
- 示例已用 `jsonschema` 校验。两个反例确实被拒：一是运行记录里带 `apiKey`，二是不可送的条目标成"公开材料包"。

## 一、共同约定

1. **原文纪年照录，不覆盖。**凡日期都分两栏。
   - `*_raw`：原文写法，如"共和二千七百四十一年""明治四十五年""1903年底"。
   - 公元值（`YYYY`、`YYYY-MM` 或 `YYYY-MM-DD`）：另有 `date_precision` 说明精度。
   - `date_kind` 说明这个日期是什么日期：写作、初刊、编定、再版，还是"署年（未必是写作年）"。《訄书》重订本的署年就属最后一种。
   - 导入时须声明历法。页面只用公元值做比较，显示时两栏并列。
2. **页码体系分清。**`page.system` 取下列之一：全集连续页码、原书页、PDF页序、扫描图编号、NDL コマ、电子文本段落。
3. **文本身份分清。**`text_kind` 取下列之一：原文、录文、转写、教学转述、仅元数据。
4. **可送与可发布是两件事。**
   - `sendable` 管能不能送模型，接口与网页版都算。
   - `visibility` 管能不能随课件发布。
   - `sendable=false` 的条目必须是"本机材料包"，且在公开包中 `text` 为空。Schema 已用条件约束写死。
5. **Key 不进任何结构。**运行记录的 Schema 拒绝 `apiKey`、`key`、`authorization` 三个键。导入对话框遇到这三列，整份拒绝。
6. **回放如实。**导入或载入的运行记录，页面一律显示为"预存回放"，原来的 `mode` 存入 `origin_mode`。教学构造的记录用 `mode=teaching-construct`。

## 二、五种必须的结构

### 1. 史料包（`sourcePack`，`format: w09-sourcepack/v1`）

| 字段 | 含义 | 方案第四节原名 |
|---|---|---|
| id, person, title, author | 条目编号、归属人物、篇名、作者。无署名的写"无署名"，归属争议写在 note | — |
| layer | 1 指时点之前本人所作，2 指同时代他人所记、所编，3 指身后的回顾与评价 | layer |
| written_date_raw / written_date / written_date_end / date_precision / date_kind | 成文时间：原文写法、公元值、区间终点、精度、日期性质 | written_date |
| citation | 版本 | citation |
| page {system, value} | 页码及其体系 | page |
| text, text_kind, transcriber | 文本、文本身份、录文者 | text |
| sendable, sendable_basis | 可否送模型及其依据 | sendable |
| visibility, rights, note | 能否发布、许可、备注 | — |

**页面怎样用。**D09 的校验模块 `source-gate(pack, timepoint)` 返回四样东西：
- `late[]`：成文时间晚于时点的条目，或 layer=3 的条目。标红，须教师确认才能保留。
- `blocked[]`：`sendable=false` 的条目。不拼进提示。
- `unknown[]`：成文时间缺失的条目，显示"待确认"。
- `prompt_sources[]`：最终进入提示的条目。

D01、D05、D07、D12、D13 在发出请求前都调用它，结果写入运行记录的 `prompt.gate`。

### 2. 条件卡（`conditionCard`）

字段对应讲义 @fig-card 的七栏与扩充部分乙一：
- 人物与时点：`person`、`timepoint_raw`、`timepoint`。
- 指定史料：`sources[]`，存的是史料包条目 id，不存文本。
- 模型与日期：`model {channel: api|web, preset, name, platform_entry}`、`date`。
- 提示全文：`system_prompt`、`user_prompt`。
- 温度与采样次数：`temperature`、`samples`。
- 逐句核对：`check_plan`。
- 用途：`purpose`。

方案原名中的 `model` 拆成了对象，以便区分接口与网页版。

另有两处要说明：
- **`temperature` 可以写文字。**课程预设的两家型号（`deepseek-flash`、`kimi-k3`）是推理型号。第八周的实现对这两种型号不传温度，共用适配器 `api.mjs` 本身也不传温度。所以卡上可能要写"接口不接受（推理型号）"，不能写一个实际没有生效的 0.7。见第一步待决事项 8。
- **`construct: true`** 标出教学构造的卡，例如错卡。

### 3. 运行记录（`runRecord`）

在方案原字段（run_id, card_id, mode, model, preset, temperature, prompt, reply, ms, date）之外，新增了下列字段：

| 新增字段 | 为什么 |
|---|---|
| sample_index | 同一卡第几次采样（每格三次） |
| origin_mode | 回放时保留原来是现场调用还是网页版 |
| model_returned | 响应里实际返回的型号，可能与请求时不同 |
| endpoint, reasoning_effort, finish_reason, usage | 复现所需；推理型号的思考档位会影响输出 |
| prompt.messages / prompt.source_ids / prompt.gate | 提示全文；实际进入提示的史料；校验结果 |
| error | 现场失败的原因。失败时页面切到回放，本字段保留 |
| web {platform, entry_type, memory, search, model_shown, screenshot} | 网页版粘贴的条件（扩充部分丙三） |
| environment | 运行者、机器、浏览器、网络（按课前环境方案的格式填） |

### 4. 句子标注（`sentenceLabel`）

字段对应讲义 @fig-check 的栏目、甲一评分与共情三部分。

| 字段 | 内容 | 依据 |
|---|---|---|
| sentence | 句子 | @fig-check |
| source_ref | 依据 | @fig-check |
| beyond_timepoint | 越出时点？ | @fig-check |
| type | 错置类型：知识、概念、规范、文体、无 | 讲义 2.1 的四种 |
| induced | 被诱导？ | @fig-check |
| omission | 遗漏了什么 | @fig-check |
| score | 0、1、2 分 | 甲一 |
| empathy_part | 历史语境化、视角采择、情感联结 | 讲义 1.3 |

另有 annotator、construct、note 三个辅助字段。

页面上的计算：
- D05 的越界率：L = Σscore / (2N)。示例四句 0、0、1、2，算得 0.375，已用脚本核对。
- D08 的汇总：无依据句数指 `source_ref` 为空的句子。

### 5. 仿真记录（`simRecord`，`format: w09-sim/v1`）

结构按扩充部分乙二的伪代码设计。

**setup：**
- `actors[] {name, persona, timepoint, sources[], kind: llm|rule}`：`kind` 取 `rule` 的是教学构造的规则式行动者。
- `moderator {order[], rules{max_chars}}`。
- `rounds[] {id, topic, max_chars}`。
- `driver {preset, model, temperature}`：两个角色由同一模型驱动，按讲义 4.1。

**steps[]：**
- 每步记 `{round, actor, run_id, memory_len, accepted, moderator_note}`。
- 提示与回复全文不在这里重复，存在 `run_id` 指向的运行记录里，一次调用只存一份。

## 三、其余结构

| 结构 | 用于 | 要点 |
|---|---|---|
| timepointQuestion 时点题 | D05 | type 取四类之一；hint 是出题者的提示，不交给模型 |
| settingLabel 设定标注 | D18 | label 取 史料／理论／已知结局；按 sentence_id 合并全班标注 |
| steeringSetting 引导设置 | D11 | 只作记录，不发出请求；question 只收通用问题 |
| mechCard 机制卡 | D22 | 六栏，每栏 {text, origin[史料/理论/已知结局]}；odd 是 ODD 七项的映射 |
| sweepRow、observedRow | D14、D15、D19、D21 | 参数扫描表、观察值表；扫描表的其余列照原名保留 |
| payoffRow、populationRow | D17 | 收益表、种群 |
| surveyRow | D16 | answer_retest 可缺；缺时指标返回"不可算" |
| throughRecord | D23 | `format: w09-through/v1`；汇总以上各项，加一句有限论断 |

## 四、在导入对话框中的映射

第八周的"导入表格"对话框有三样基础：
- 读入：CSV、TSV、JSON。
- `guessKind` 与 `guessMap`：按同义列名猜类型与列映射，使用者可以改。
- 声明栏：有向、缺省时间、可疑值、历法、坐标参照系，以及四栏材料说明与检查报告。

第九周在此之上做四处扩充。

1. **新增十二类。**列表见 `importer-kinds.w09.json`：
   - 史料包、运行记录、时点题、句子标注、仿真记录（每行一步）。
   - 设定标注、参数扫描表、观察值表、收益表、种群、作答表、网页版记录。

   每类的同义列名都含中文表头，如"成文时间""可否送模型""页码""录文"。所以教师用中文表头写的 Excel 另存为 CSV 后，可以直接认出列。

2. **猜类型的规则补充。**
   - 表头含 `sendable`、`可否送模型` 或 `layer`：史料包。
   - 含 `run_id` 与 `reply`：运行记录。
   - 含 `question` 与 `type`：时点题。
   - 含 `sentence` 与 `score`：句子标注。

3. **声明栏新增三项。**
   - 历法选项增加"共和纪年""皇纪""光绪等年号（不换算）"。
   - 新增"页码体系"一栏。
   - 史料包新增"模拟时点"一栏，导入后立即跑 source-gate，检查报告里列出晚出、不可送、成文时间缺失的条目。

4. **原文纪年与出处列的保留。**
   - 映射时，"原文纪年"与"公元"是两个不同字段。只给了一列年份时：
     - 是阿拉伯数字的，同时填入两栏；
     - 含年号或汉字数字的，只填 `written_date_raw`，`written_date` 留空，检查报告提示"未换算"。页面不自动换算。
   - 出处列（citation、page）没有映射时不拒绝导入，但每行记一次"无出处"，与第八周的 `noRef` 计数相同。逐句检查表的"依据"栏遇到这类条目，显示"无出处"。

条件卡、仿真设置这类嵌套结构，只接受 JSON。CSV 中的条件卡用 `source_ids` 一列，以"；"分隔，引用已导入史料包的条目。

## 五、2026-11-11—12 增补的字段（候选）

- 史料条目 `prompt_title`、`prompt_date_raw`：送模型时用的标题与纪年。页面显示用的 `title` 可以带"含署年／删去署年，对照组"一类给教师看的说明，这类说明不得进入提示；有 `prompt_title` 时提示只用它，`prompt_date_raw` 为空串表示提示里不写纪年。
- 运行记录 `origin_mode`：并入本机材料包后 `mode` 一律是 `replay`，`origin_mode` 保留原来的 `live`／`web-paste`。`origin_mode: web-paste` 的记录在页面上标"网页版·课前"，`web` 字段记平台、入口、记忆、联网、界面型号、截图文件名；`transcription` 记回答文字是怎样录入的（据截图目验、据 PDF 提取）。这类记录的提示是整段粘贴的一条用户消息，不与接口提示逐字比对。
- 运行记录 `attempts`：课前脚本的调用次数（失败重试一次时为 2）。
- 本机材料包 `resources.steer_shots`：Neuronpedia 课前截图清单（`file`、`caption`、`setting`、`date`、`source`），由 `运行记录/<日期>/截图/R10_manifest.json` 并入；图片在 `apps/week09/local-only/steer/`，不入库。
- 通用导入页送回的材料：成为一个 `w09-sourcepack/v1`（id 以 `pack-importer-` 开头），每个正文片段一条；页码体系取导入页给的原书页、PDF 页序或段落定位；成文时间、层次、可否送模型由导入者在接收时声明，`sendable` 默认 `false`。学生导入的史料包存在贯穿记录的 `packs` 里，随记录导出与恢复。
