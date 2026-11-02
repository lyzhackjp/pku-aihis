# 第八周原型验收记录（2026-11-02）

- 环境：云端容器，Playwright Chromium（无 WebGPU），1440×900 与 390×844；页面由 `python3 -m http.server` 提供；本机材料包由 `build_week08_pack.py` 生成后以 `?pack=` 载入。
- 命令：`python3 apps/week08/scripts/verify_week08.py http://127.0.0.1:8788/prototype/index.html ../local-only/week08-pack.json <输出> --models`
- 结果：43／43 通过，见 `verification.json`。`--models` 时经代理实际下载并运行 bge-small-zh-v1.5（q8）与 GLiNER multi v2.1（fp16）。
- 截图：这里只收不显示本机材料（CBDB、『梅颸日記』、JBDB）的页；其余页的截图存教师电脑 `apps/week08/local-only/verification-20261102/`。
- 未测：教师 Chrome 与国内网络；通用导入页构建与握手（构建时 `WEEK08_SKIP_IMPORTER=1`）；演讲者窗口双屏。
