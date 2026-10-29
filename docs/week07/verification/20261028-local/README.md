# 第七周 本地验证补充（2026-10-28 下午）

本目录补齐 `revision-20261028.md`“未测、未做”中需要本地运行的各项。实际运行对象是本分支 `apps/week07/prototype/`，材料包为本地 `week07-pack.json`（不入库）。

| 项 | 运行环境 | 结果 | 记录 |
|---|---|---|---|
| 主验收 `verify_week07.py` 复跑（改引文后） | 容器，Chromium（Playwright） | 82／82 通过 | `verification.json` |
| 演讲者窗口同步、B 静态模式、输入框内方向键不翻页、5 种视口×30 页 | 同上，`verify_week07_extra.py` | 23／23 通过 | `verification-extra.json`、`presenter-D17.png`、`sheet-*.jpg` |
| D01 `LIVE=1` 实连 CBDB | 教师电脑上的 Linux 虚拟机（aarch64，4 核，约 4 GB 内存），llama-cpp-python 0.3.36 预编译包，n_ctx 4096，4 线程 | 接口 HTTP 正常，1.7 秒；返回与回放的 curl 预取逐字相同；回答仍虚构 | `d01-live-summary.json` |
| `check-quotes.mjs` | 教师电脑工作区 | 19 条，0 条未核；3 条登记例外（见下） | `check-quotes.txt` |
| `check-page-map.mjs` | 教师电脑工作区 | 30 页、30 概念、25 图、172 分 | `check-quotes.txt` 末段 |

视口尺寸：1512×860、1280×720、1024×768、899×860、390×844。390 宽下 D05 原有横向溢出，已在 `week07.css` 末尾以 `minmax(0,1fr)` 与 `min-width:0` 修正，再测通过。

## 补核的 5 条原句

讲义所引为半句或“讲义已核”的 5 条，2026-10-28 取原页逐字核对，补成完整句：

| 键 | 原页 | 本地文件 SHA256 |
|---|---|---|
| cosovschi | https://programminghistorian.org/en/lessons/designing-database-nodegoat（doi:10.46430/phen0130） | 4be46461bc4735950d30e3cc03f319e7da68961edab88c8dea4d32a5980b8fab |
| stewart2025 | https://www.cambridge.org/core/product/845FDD146FF8A9283A32BFF0C3160F5F/core-reader（doi:10.1017/chr.2025.10019） | 567766fce3e684f5515422e872feead4e9c3dc146b7b376a8ee536003bca1909 |
| nipponica_toyokuni | https://kotobank.jp/word/歌川国貞 | 92a6557b60a7d132bc5d04e2d2fe2f1ba3f66a98b38d9e98ab3f49a39c4b557d |
| buneman1997 | https://homepages.inf.ed.ac.uk/opb/papers/PODS1997a.pdf | a56d5831189ce1c2e145e24f1b371206853f88b2d5978890a9352c1484cd9c3c |
| openai_so | https://openai.com/index/introducing-structured-outputs-in-the-api/（“Limitations and restrictions”节） | 未存档：该站对命令行请求返回 JavaScript 验证页，经网页读取工具分段取得原文 |

三条登记例外均为排版差异，不是文字出入：Buneman PDF 的抽取文本中引号为 TeX 形式（`\self-describing"`）；EvaHan2025 页面有断词连字符（`re-sults`、`histori-cal`）；OpenAI 原页无本地存档。

## 仍未做

- 没有移植到 Stencil 正式工程，没有提 PR，没有发布。
- NDLOCR-Lite 行框坐标未叠到页影上。
- 演讲者窗口只在同一浏览器的两个标签页间测试，未在双屏投影实机上测试。
