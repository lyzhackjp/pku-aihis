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
