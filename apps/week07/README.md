# 第七周 · 条目重构、实体识别与结构化输出（测试原型）

候选，未经教师确认。2026-10-28。30 页（D00—D31，D13、D15 为合并页的别名）、30 条概念、净教学 172 分钟。依据第七周讲义（2026-10-27 修订版，md5 e435885d；讲义不入库）。设计、页表、逐页内容与验收见 [docs/week07](../../docs/week07/)。

本目录是**无构建测试原型**，供教师逐页审阅；尚未移植为 Stencil 工程，也不在 `published-weeks.json` 中，CI 与 Pages 发布都不涉及它。教师确认后按 `.agents/skills/history-demo-courseware/references/stencil-port.md` 移植。

## 打开

1. **本机**：把 `scripts/start_week07.command` 放到含 `prototype/` 与 `local-only/week07-pack.json` 的第七周目录下双击，它在 `127.0.0.1:8777` 起静态服务并用 Chrome 打开，同时载入本机材料包。也可手动运行 `python3 -m http.server 8777 --bind 127.0.0.1`，再访问 `prototype/index.html?pack=../local-only/week07-pack.json`。
2. **发布到 GitHub Pages 后**：学生直接打开网址即可，不需要启动脚本。公开材料（NDL 典拠与页影、维基文库录文、DDBC 历表、HIPE 数据，许可见 `docs/week07/licensing-20261029.md`）随课件发布、自动载入；D23“现场运行”、D30 默认材料与“我的材料”、模型接入、材料导入都可用。CBDB 接口返回与教学文件夹原件不在公开站点，相关页（D01、D02、D07、D09、D11、D12、D18、D23 回放、D24、D28）由教师课堂导入本机材料包后显示。`scripts/build_pages_preview.py` 按 Pages 的目录形状组装预览，用于本机检查。
3. **直接双击 HTML（`file://`）**：各页与公开材料可看；现场抽取、模型接入、材料导入用到 ES 模块与 Web Worker，浏览器在 `file://` 下不载入，会显示提示。
4. 本机材料包导入一次即存浏览器 IndexedDB；`file://`、`127.0.0.1:8777` 与 Pages 网址是不同站点，各自导入。右上角“贯穿”“概念表”随时进出；Esc 课程地图；P 演讲者窗口；B 静态。输入框里打字（含中文、日文输入法组字）不翻页。

从网上地址（Pages）连学生自己电脑上的 Ollama／LM Studio：Chrome 会询问是否允许该网站访问本机上的应用，选允许；Ollama 默认只放行 127.0.0.1 来源，须运行 `launchctl setenv OLLAMA_ORIGINS "https://lyzhackjp.github.io"` 后重开 Ollama（Windows、Linux 设同名环境变量）；LM Studio 在开发者设置中打开 CORS。云端 API 与浏览器内模型不受此限。

## 现场抽取、模型接入与材料导入（2026-10-28 晚）

顶栏“模型接入”沿用第六周的配置方式（`modules/history-demo/ocr/api.mjs` 与 `api-presets.json`，复制在 `prototype/live/vendor/`）：每份配置单独保存，Key 只在页面内存，刷新清除；“发送一句公开测试文字”检查能否返回 JSON。同一面板可预先下载浏览器内模型。

D23 第五个标签“现场运行：接入模型”与 D30 第 5 阶段“抽取与对齐”用同一个面板，四种做法：

| 做法 | 模型 | 说明 |
|---|---|---|
| A 型人物卡片、B 型证据表式 | API／本机服务，或浏览器内 Qwen3 | 提示与 schema 照讲义 4.2。API 可选 JSON Schema、JSON 模式或不加约束；浏览器内生成不支持约束解码，只能事后校验。页面做 schema 校验、史学规则检查和事后对齐。 |
| LangExtract 流程 | 同上 | LangExtract 3a68580 在浏览器内（Pyodide 0.28.3）分块、生成少样本提示、解析回复并对齐，提示与示例同 D25；模型调用由页面发出：第一遍取得各块提示，逐块调用模型，第二遍把原始回复交回同一个 `lx.extract`。 |
| GLiNER 实体识别 | 浏览器内 GLiNER multi v2.1（fp16） | 零样本找人物、地点、官职、时间片段，位置为模型给出的字符区间；不做所指与判断。int8 量化版本实测全部低分，不用。 |

浏览器内 Qwen3 有 0.6B、1.7B、4B 三种：有 WebGPU 时用 q4f16；没有时 0.6B、1.7B 用 WASM q8，4B 不可用。首次需联网下载（库来自 jsdelivr，权重来自 Hugging Face），之后由浏览器缓存。同一时间只保留一个浏览器内模型：GLiNER 与 Qwen3 同时驻留时，实测浏览器渲染进程因内存不足崩溃。

云端服务每次发送前须确认发送范围（材料、字数、地址）；本机服务（localhost／127.0.0.1）不需确认。每次运行的输入指纹、请求、原始回复、usage、耗时与错误存本机 IndexedDB，可从“模型接入”导出（已剔除 Key）。结果可“写入证据表”：位置来源按事后对齐状态写，判断类型照模型的 basis，处理人注明“模型输出，未核”。

顶栏“材料导入”打开共用导入页（`apps/material-importer`），握手协议与第五、六周相同（`PKU_IMPORT_READY`／`PKU_PROJECT`，`pku-history-project/v1`）。同学在导入页加入 PDF、Word、TXT、图像等，处理所选范围后点“送回已经连接的课件”；第七周只取正文片段（不保存原件），在 D23 的“输入”和 D30 的“我的材料”中选用。导入页需先构建一次：

```sh
sh apps/week07/scripts/build_importer.sh   # 产物复制到 prototype/importer/，不入 Git
```

## 材料包：公开部分与本机部分

公开部分由 `scripts/build_public_pack.py <week07-pack.json> prototype/data/public/week07-public-pack.js` 从本机材料包中挑出许可允许公开的五类生成（脚本断言不含 CBDB、教学文件夹原件与运行记录）。其余仍只在本机。

### 本机材料包

教师 2026-10-28 决定：所有原始数据不上公开站点，课堂现场导入。材料包包括：
- CBDB、NDL 典拠、HIPE 训练集、维基文库 wikitext；
- NDL 页影（PDM）、DDBC 历表（CC BY-SA 3.0）；
- 教学文件夹原件：讲义 4.2 抽取记录、NDLOCR-Lite 识读输出、TEI 校验记录、人工参照转录；
- D01、D25 运行记录。

材料包只在本机生成和保存，`local-only/` 已被 `.gitignore` 排除。

```sh
python3 apps/week07/scripts/build_week07_pack.py <raw 目录> <runs 目录> <calendar.json> <讲义.typ> <输出 week07-pack.json> <source 目录>
python3 apps/week07/scripts/build_calendar.py <DDBC 解压目录> <输出 calendar.json>
```

## 实跑脚本

- `run_d01_agent.py`：D01 智能体经 CBDB 查“王珪”。用 Qwen3-4B-Instruct-2507 Q4_K_M，与讲义 4.2 同一文件，llama-cpp-python 0.3.36，温度 0。默认回放预取的接口返回；设 `LIVE=1` 直连接口（2026-10-28 已在教师电脑实连复跑，内存小时加 `N_CTX=4096`）。
- `run_d25_langextract.py`：D25 LangExtract（提交 3a68580）实跑。按 200 字分块抽取，同一批抽取分别用默认分词与按字分词对齐。

## 验收

```sh
python3 -m http.server 8765   # 在含 prototype/ 与 week07-pack.json 的目录
python3 apps/week07/scripts/verify_week07.py http://localhost:8765/prototype/index.html ../week07-pack.json <截图目录> docs/week07/verification/20261028/d25_align_vectors.json
```

需要 Playwright 与 Chromium。2026-10-28 共 82 项，全部通过；截图与结果见 `docs/week07/verification/20261028/`。

补充脚本 `verify_week07_extra.py`：演讲者窗口同步、B 静态模式、输入框方向键、5 种视口×30 页无溢出。用法：`python3 verify_week07_extra.py <原型 URL> <材料包相对 URL> <输出目录>`。2026-10-28 下午 23／23 通过，记录在 `docs/week07/verification/20261028-local/`。

补充脚本 `verify_week07_live.py`：现场抽取、模型接入与材料导入。先起接口测试替身 `fake_openai_server.py`（固定写法的回复，不是模型），再运行 `python3 verify_week07_live.py <原型 URL> <材料包相对 URL> <替身端口> <输出目录> [--browser-models]`；加 `--browser-models` 时另在浏览器内实际运行 GLiNER 与 Qwen3-0.6B（需联网）。2026-10-28 晚 17／17 通过，记录在 `docs/week07/verification/20261028-evening/`。
