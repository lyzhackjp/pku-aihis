# 第七周公开课件发布说明

2026-10-29教师要求全面检查后合入main并发布GitHub Pages。发布入口：[第七周 · 条目重构、实体识别与结构化输出](https://lyzhackjp.github.io/pku-aihis/week07/)。

本版本含30个实体页（D00—D31，D13并入D12、D15并入D14，旧页号跳转），修订经过见[修订记录](revision-20261028.md)，许可判断见[材料许可](licensing-20261029.md)。

## 材料与运行范围

- CBDB以外的材料（NDL典拠、『大日本史料』页影与本文、Wikisource、DDBC、HIPE-2026样例、历表、教学回放）随站点公开，各页标注出处与许可。
- CBDB记录不随站点发布。D01、D07、D09、D12、D18需教师课堂导入本机材料包；导入后D01、D04、D07、D09、D12、D18页脚显示“CBDB BJ 20260602，CC BY-NC-SA 4.0”。导入内容只存于当前浏览器。
- 现场抽取（D23、D30）可接云端API、本机Ollama／LM Studio，或在页内运行Qwen3、GLiNER与LangExtract（Pyodide）。库与权重运行时从jsDelivr／Hugging Face下载，不随站点发布。从Pages连本机服务时，Chrome会请求“本机网络”权限；Ollama默认允许该来源。API Key只存于页面内存，导出时剥离。
- 通用导入页内嵌于 `importer/`，学生可导入自己的文本段落。

## 验收

2026-10-29发布前全面检查：浏览器主验收82／82、补充验收（演讲者同步、B静态模式、输入法与方向键、5种视口×30页）26／26、现场抽取与导入验收15／15；`pnpm test` 6／6；构建产物检查含与本机CBDB记录逐段比对，确认无记录外泄（[public-build.json](verification/public-build.json)）。Mac上本机Ollama qwen3:4b与浏览器内Qwen3-4B实测记录见 `verification/20261029-mac/`；教师在Chrome中由课件页连Ollama测试通过（4.1秒）。

正式部署绑定合并后的main提交，由[Publish classroom](https://github.com/lyzhackjp/pku-aihis/actions/workflows/pages.yml)手动触发；公开文件SHA见[release-manifest.json](https://lyzhackjp.github.io/pku-aihis/release-manifest.json)。如需恢复，从main开修复分支撤销本次合并后重新发布，不强推主线。

## 部署记录

- 合并：[PR #19](https://github.com/lyzhackjp/pku-aihis/pull/19) 的PR检查（Course checks，运行 [40816922361](https://github.com/lyzhackjp/pku-aihis/actions/runs/40816922361)）重新构建第三至第七周与导入页并通过全站公开检查后，以squash合入main，提交 `8cc285fa6b785d49fdc4dc21b32ce6e4e106f23c`。
- 发布：2026-10-29 12:21—12:25（北京时间）手动触发Publish classroom，运行 [40817299123](https://github.com/lyzhackjp/pku-aihis/actions/runs/40817299123)，build与deploy均成功。上一正式部署为 `c9d599c546e4b3295b1c7b0ca10a6aaebc9e985b`（第六周）。
- 线上回查：首页出现第七周入口，第三至第六周与通用导入页保留；`release-manifest.json` 列出week03—week07，第七周243个文件，公开材料包SHA-256前缀 `72790d25e92f71bb` 与本机检查一致；公开材料包、LangExtract wheel、内嵌导入页均可访问。Chromium逐页打开线上30页，无脚本错误；未导入材料包时仅D01、D07、D09、D12、D18提示课堂导入CBDB。
- 线上未重复：现场抽取需模型或API，未在线上复跑；课前请在授课电脑的Chrome中由Pages页再连一次Ollama（允许“本机网络”权限）。
