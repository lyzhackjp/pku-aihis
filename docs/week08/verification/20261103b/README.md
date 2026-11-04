# 第八周原型验收记录（2026-11-03，第三批 D14—D22）

- 环境：云端容器，Playwright Chromium，1440×900 与 390×844；`python3 -m http.server`；本机材料包以 `?pack=` 载入（含 CHGIS TGAZ 查询快照、Kanripo 文本、JBDB 年号、王珪边表上的智能体记录）。
- 命令：`python3 apps/week08/scripts/verify_week08.py http://127.0.0.1:8788/prototype/index.html ../local-only/week08-pack.json <输出>`。
- 结果：70／70 通过（新增 D14—D22 共 13 项），见 `verification.json`。
- 模型运行：D15、D18、D22 的记录由 `tools/local-llm`（llama-cpp-python 0.3.36，Qwen3-4B-Instruct-2507 Q4_K_M，N_CTX 4096）在本容器实际生成，温度 0。D22 的回复在 1,800 词元处截断，页面已注明。
- 截图：只收 D14、D19、D21；D16、D17 显示 CHGIS 查询结果（再发布许可待核，A-41），不入库。
- 未测：教师 Chrome 与国内网络（CHGIS 在线查询、CODH 影像）；QGIS 截图；通用导入页构建；演讲者窗口双屏。
