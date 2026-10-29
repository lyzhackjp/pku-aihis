# 第七周 教师试用意见的修改与验收（2026-10-28 晚）

教师意见（10-28 22:41）：D04 给填写示例；D05 点一次“新增一行”加了两行；D08 等页中文、日文输入法不能正常使用；D23、D30 允许接入本地模型或 API Key 做真实抽取，试浏览器内可运行的模型与 LangExtract，用以前课件的模型接入页，并加通用导入页以导入同学自己的材料。

## 改了什么

| 意见 | 原因 | 修改 |
|---|---|---|
| D05 新增一行出现两行 | 组件在装配时被移动一次，`connectedCallback` 执行两次，点击监听装了两份 | `Deck.register` 统一包一层：每个组件只初始化一次，再次接入只重绘。其他页的重复监听一并消除 |
| 输入法组字被打断 | 每次 `input` 都整块重绘，组字中的输入框被替换（旧版实测得到“wwawang王王珪”） | `rerender` 在组字期间暂缓，`compositionend` 后补绘；重绘后按 `data-*` 属性找回焦点与光标；翻页键另判 `keyCode 229`。全部 30 页的文字输入框逐一测试 |
| D04 填写示例 | — | “填入示例”“清空字段”；示例为课件编写者拟，待教师确认 |
| D23、D30 真实抽取 | — | 顶栏“模型接入”（沿用第六周配置方式）；D23 第五个标签“现场运行”、D30 第 5 阶段“现场抽取”；四种做法：A 型、B 型、LangExtract 流程、GLiNER；模型可选 API／本机服务或浏览器内 Qwen3 |
| 同学自己的材料 | — | 顶栏“材料导入”打开共用导入页（apps/material-importer），握手同第五、六周；D30 增加“我的材料”，D05 证据表增加同名材料 |

## 验收结果

| 项 | 运行模式 | 结果 | 记录 |
|---|---|---|---|
| 主验收 `verify_week07.py` | 浏览器（Playwright Chromium） | 82／82 | `verification.json` |
| 补充验收 `verify_week07_extra.py`（新增 D05 单行、D04 示例、30 页输入法组字共 32 个输入框） | 同上，CDP 模拟拼音组字 | 26／26 | `verification-extra.json` |
| 现场运行 `verify_week07_live.py` | 见下 | 17／17 | `verification-live.json` |

现场运行的 17 项分三种模式，不混记：

- **接口测试替身**（`fake_openai_server.py`，固定写法的回复，不是模型）：模型接入页文字测试、Key 不写入存储、云端发送前确认、A／B 解析与 schema 校验、史学规则、写入证据表、运行记录无 Key。
- **实际运行**：LangExtract 3a68580 在 Pyodide 内分块与对齐（模型回复来自替身）；共用导入页把 TXT 处理成两个正文片段并送回第七周；D30“我的材料”选用、分句、抽取、写入证据表。
- **浏览器内实测**：GLiNER multi v2.1（fp16，WASM）在王珪传选段上 62 秒（含首次下载）找到 71 个片段，其中有“騏驥”标为人物、“曾祖永”标为官职等错误；Qwen3-0.6B（WASM q8，容器无 WebGPU）生成 200 词元用 296 秒，回复被截断，容错读出。

另做了一次**本机服务真实模型**的页面实测（`real-runs-summary.json`，完整请求与回复只存本地）：llama-cpp-python 0.3.36 的 OpenAI 兼容服务，Qwen3-0.6B Q4_K_M，JSON 模式。

- B 型：《大日本史料》第 1 页 143 秒出合法 JSON，6 条 mention、5 条 event；schema 2 处不合（类型写成“事件”），页面标出。
- LangExtract：同一模型每块都只回 `{}`，抽出 0 项。

讲义同款 Qwen3-4B 的本机服务在容器里三次被内存配额杀掉（与 Chromium 同时驻留，约 6 GB）。所以 4B 与云端 API 都**没有**在页面里实测，需在教师电脑上试。

## 已知限制

- 浏览器内 Qwen3 不支持约束解码；4B 只在有 WebGPU 的浏览器可用（约 2.9 GB）。
- GLiNER 与 Qwen3 不同时驻留：载入一个会卸载另一个。
- llama-cpp-python 0.3.36 的服务不接受 `response_format=json_schema`，页面报错时提示改选 JSON 模式；Ollama、OpenAI 等接受。
- DeepSeek 等云端服务的跨域与 json_schema 支持以实际返回为准；失败时显示原始错误。
- 共用导入页的构建产物（约 61 MB）不入 Git，用 `scripts/build_importer.sh` 生成。
