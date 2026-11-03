# 第八周原型验收记录（2026-11-03，第三批）

- 环境：云端容器，Playwright Chromium，1440×900 与 390×844；`python3 -m http.server`；本机材料包（含 D07 三种语料的主题模型结果）以 `?pack=` 载入。
- 命令：`python3 apps/week08/scripts/verify_week08.py http://127.0.0.1:8788/prototype/index.html ../local-only/week08-pack.json <输出>`（本次未加 `--models`，浏览器内句向量与 GLiNER 沿用 11-02 的实测）。
- 结果：57／57 通过，见 `verification.json`。新增 D02、D03、D05、D07 共 14 项。
- 截图：只收不显示本机材料的 D02、D03、D05；D07 的三种语料页显示有版权的录文，截图不入库。
- 未测：教师 Chrome 与国内网络；通用导入页构建（`WEEK08_SKIP_IMPORTER=1`）；演讲者窗口双屏。
