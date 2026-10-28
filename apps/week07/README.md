# 第七周 · 条目重构、实体识别与结构化输出（测试原型）

候选，未经教师确认。2026-10-28。30 页（D00—D31，D13、D15 为合并页的别名）、30 条概念、净教学 172 分钟。依据第七周讲义（2026-10-27 修订版，md5 e435885d；讲义不入库）。设计、页表、逐页内容与验收见 [docs/week07](../../docs/week07/)。

本目录是**无构建测试原型**，供教师逐页审阅；尚未移植为 Stencil 工程，也不在 `published-weeks.json` 中，CI 与 Pages 发布都不涉及它。教师确认后按 `.agents/skills/history-demo-courseware/references/stencil-port.md` 移植。

## 打开

1. 双击 `prototype/index.html`（Chrome／Edge），或在本目录起 `python3 -m http.server` 后访问 `prototype/index.html`。
2. 点顶栏“导入材料包”，选本机的 `week07-pack.json`。导入一次即可，之后存在浏览器 IndexedDB 里；顶栏可移除。
3. 右上角“贯穿：一句史料到一行”“概念表”随时进出；Esc 课程地图；P 演讲者窗口；B 静态。

不导入材料包时，D03、D06、D14（四个预设）、D16、D19—D22、D25（对齐规则）、D26、D27 可用；其余页显示导入提示和本页所需文件。

## 材料包：原始数据不进仓库

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

- `run_d01_agent.py`：D01 智能体经 CBDB 查“王珪”。用 Qwen3-4B-Instruct-2507 Q4_K_M，与讲义 4.2 同一文件，llama-cpp-python 0.3.36，温度 0。默认回放预取的接口返回；设 `LIVE=1` 直连接口。
- `run_d25_langextract.py`：D25 LangExtract（提交 3a68580）实跑。按 200 字分块抽取，同一批抽取分别用默认分词与按字分词对齐。

## 验收

```sh
python3 -m http.server 8765   # 在含 prototype/ 与 week07-pack.json 的目录
python3 apps/week07/scripts/verify_week07.py http://localhost:8765/prototype/index.html ../week07-pack.json <截图目录> docs/week07/verification/20261028/d25_align_vectors.json
```

需要 Playwright 与 Chromium。2026-10-28 共 82 项，全部通过；截图与结果见 `docs/week07/verification/20261028/`。
