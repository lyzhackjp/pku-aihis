# 第八周原型验收记录（2026-11-03 夜，公开材料补充）

- 环境：云端容器，Playwright Chromium，1440×900 与 390×844；`python3 -m http.server`；本机材料包以 `?pack=` 载入。
- 命令：`python3 apps/week08/scripts/verify_week08.py http://127.0.0.1:8788/prototype/index.html ../local-only/week08-pack.json <输出>`。
- 结果：74／74 通过（新增 4 项：本机材料包未导入时，D01、D12、D13、D05／D07 自动换用公开材料，只有 D12 仍显示“请导入”），见 `verification.json`。
- 新增公开材料：练习材料三（王珪关系 30 行，据讲义附录与 CBDB 边表对照）；頼山陽『寛政九年日記』（NDL 公開本『偉人日記』1911 所收，第 167—170 页，OCR 已对影像校过）；Pepys 日记 1660 年（Project Gutenberg #4200）；日本年号表。
- D16 修正（同日稍后）：“慶”不再默认选中前缀查到的云南庆甸（CHGIS 1050 年无庆州记录），“魏”初选改取大名府；多边形记录经度为 0 时不再当作有坐标。改后重跑仍 74／74。
- 截图：`screenshots/` 只收公开模式（不载入本机材料包）下的 D05、D07、D13 三页；载入本机材料包时的截图含 CBDB 与『梅颸日記』，不入库。
- 未测：教师 Chrome 与国内网络；QGIS、Gephi 截图（见教师手把手操作指南）；演讲者窗口双屏。
