# 第四轮公开实算验收

候选，未经教师确认。Chrome 155.0.8059.85，macOS，WASM单线程。本目录仅含商務印書館1926年本《文史通義》《史德》首页（印刷页141／PDF序161），没有教师原件。模型为NDLOCR-Lite四文件和PP-OCRv6检测／识读的固定版本；复用已核验缓存。

- [逐条说明、模型版本与教师待决](../../completion.md#第四轮2026-10-21)
- [实算运行与六模型检查记录](real-report.json)：六个模型各三步；D02／D03／D07／D08／D09实际推理，模型、浏览器、前处理、耗时与原输出。
- [最终截图与刷新26页](final-capture-report.json)：对本机保留的实际运行补拍最终界面，不重复声称新推理。
- [D08全部逐位前5与德／徳概率](D08-positions.md)，完整归档为 `D08-body.json.gz`、`D08-title.json.gz`、`D08-mask.json.gz`。
- `preflight-*-download/session/warmup.png`：每个文件逐操作截图；download按钮缓存命中后的引擎结果为inspect，不是本轮新网络下载。
- `D02-NDL*`／`D02-PP*`：完整页、五张卡片、环境；NDL另有逐行保存对照。
- `D03-NDL-block-rubi*`：选中实际block_rubi类别、字段和行裁切；`D03-NDL.json.gz`为完整28区域默认回放来源。
- `D06-NDL.png`：按这份完整NDL记录进行规则排序。
- `D07-first*`／`D07-other*`：PP实算两条公开行。
- `D08-<condition>-<engine>.png`及`-network.png`：7条件×2引擎，保留实际网络输入（旋转缩放之后）；`D08-legacy.png`为第三轮旧尝试回放。
- `D09-public*`：PP检测／识读分数列及默认识读分数排序；完整运行在同名gzip。
- `refresh-D00.png`至`refresh-D25.png`：真实运行后刷新逐页检查，D08另以14张条件卡完整展示，刷新截图仅截组标题避免生成超长图。

共90张PNG、9份完整压缩运行归档。`SHA256SUMS.json`为本目录交付文件指纹。测试替身另在 `../round4-fixtures`、`../round4-third-fixtures`、`../round4-regression`，不要把其中合成数据当模型输出。

公开回放的可重复打包入口：`python3 apps/week06/scripts/package-round4-replays.py`；读取本目录完整实际记录以及第三轮保留的旧尝试，不执行模型。
