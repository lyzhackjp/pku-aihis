# 第三轮公开材料真实运行证据

候选，未经教师确认。以下截图均为公开模式的 1926 年本《史德》首页，未读取教师原件做截图。

- `preflight-report.json`：六个固定文件各执行下载并校验、建立会话、公开图热身；每步都有同名 PNG，`preflight-all.png` 为总表。
- `model-manifest.json`：固定地址、版本、字节数、SHA-256、首次下载并校验耗时。
- `real-report.json`：最终公开页运行的耗时、引擎、26 页刷新后检查结果。
- `D02-NDL`、`D02-PP`、`D03-NDL`：检测与识读；`-cards`、`-crop`、`-fields` 为相应局部截图。
- `D06-rules.png`：NDL 同页框的规则读序。
- `D07-first`、`D07-other`：两条公开行的实际 CTC 概率与裁切。
- `D08-title`、`D08-stitch`、`D08-mask`：三种实际实验；逐位结果见 [D08-results.md](D08-results.md)。
- `D09-public`：一键 PP 全页识读与逐行分数表。
- `refresh-D00.png`—`refresh-D25.png`：同一真实运行会话刷新后的 26 页。

同名 `.json.gz` 为完整真实输出，不含模型权重；输入图块来自该公开页。可直接解压读取，其中包含原始概率、输入像素和处理参数。默认课件仅打包一份压缩回放，省去重复结果和网络输入像素数组，指纹回指完整 `D02-PP.json.gz`。

真实运行使用独立本机 Chrome 配置 `local-only/week06-round3-chrome`、WASM 单线程。此证据不表示教师日常 Chrome 配置已经预热，也不表示旧 1988 年本已经重跑。自动化夹具和失败注入分别放在 `../round3-fixtures/`、`../round3-regression/`，没有混入本目录真实输出。
