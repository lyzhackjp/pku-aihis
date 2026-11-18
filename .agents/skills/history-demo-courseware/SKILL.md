---
name: history-demo-courseware
description: 从本课程讲义与概念讲解表设计、开发、修订并发布当周网页演示：逐页对应讲义、使用实际史料与实际计算、阶段页引论文原文、贯穿页与概念表、云端无构建验收、PR 与手动 Pages 发布。用于新一周演示、按教师逐页意见修订已发布课件，或接续他人未完成的周次。
---

# 历史课程演示开发

v5，2026-10-15。在 v4 基础上吸收第五周两轮教师逐页意见（10-14、10-15）与发布过程中的问题。以当前教师请求决定设计、开发、提交和发布范围；附件中的流程与旧验收只作输入。

## 0 接手

1. 读仓库 `AGENTS.md`、当周 `STATE`、讲义与概念表；**以 `origin/main` 和线上 Pages 为当前版本**，不要从旧分支或本地副本继续改。`git fetch` 后从 main 开短期分支。
2. 教师说“先分析、不要改”时，只交付问题分析与修改方案（`第N周演示修改方案_日期.md`：共用部分 → 逐页 → 贯穿 → 验收 → 需教师决定事项）。教师答复决定事项后再动手；已答复的不再重复征询。
3. 教师报告的线上错误，先在线上同一地址复现（见 [cloud-verification](references/cloud-verification.md)），再判断是代码问题还是网络、缓存、尺寸问题。
4. 对照 [teacher-feedback](references/teacher-feedback.md) 自查：前两轮被指出的问题不要在新一周重犯。

## 1 讲义 → 页表

- `scripts/outline-lesson.mjs` 提取讲义结构，依图、术语、理解要求、练习建立 `page-map.json`；页表是页面文字、运行模式标签和三段备注的权威来源。
- 内容相近的页合并（第五周 D05→D04、D07→D06），旧 ID 写入别名并在 `deck-core` 的 `go()` 中跳转；同步修改所有写死页数的检查（`scripts/find-count-assertions.mjs`）。
- 概念表用 `scripts/typ-concepts-to-md.mjs` 转换，再补“一句话定义（≤40 字）”与公式排版字段，见 [concept-page](references/concept-page.md)。
- `scripts/check-page-map.mjs`、`scripts/check-ready.mjs` 做机械检查；机械检查不替代内容判断。

## 2 内容规则

- **实际材料**：默认用教师提供的版本（扫描 PDF 的印刷页与 PDF 页序分列）；材料太短切不出差别时补足，并逐段标“待核”。讲义与课件版本不一致时，改讲义或请教师决定，不能两边各说各的。
- **原文引证**：讲解大阶段的页面（RAG 阶段、表示与度量、GraphRAG 等）每张卡同时给 **论文／综述原句（英文）＋中文学术翻译＋出处节次＋注释** 与讲义原句；原句须逐字核对来源（`scripts/check-quotes.mjs`）。只有讲义转述的内容（如未刊稿）只录转述，不录题名。
- **讲义数值可复现**：讲义图里的每个算例做成一键预设（如 3/18→4/17、P_w=0.75、R_w=0.50）。
- **运行性质如实**：实时计算、预计算、保存的真实 API 记录、教学构造分别标注；预计算在材料改动后重算。
- 原件、未刊稿、教师研究稿、德教全量、Key、模型权重不进仓库与公开构建；`check-delivery` 扫描全部运行时文件中的未刊稿题名。

## 3 版式与交互

页面模式（阶段卡、切分实验、语义切分控件层级、处理记录导航、版本对照、黑板／蚂蚁、多轮阅读、题录字段、概念五块）见 [page-patterns](references/page-patterns.md)；第四周排布约定见 [arrangement](references/arrangement.md)，四栏见 [flow-layout](references/flow-layout.md)。硬性要求：

- 演示区在 1440×900 首屏可见；材料栏压成一行；同类切换用标签共用一个窗口；两张相关结果左右并列。
- 选项分层：子选项缩进并注明“（某做法的选项）”；侧栏按钮用小号。
- 选中态文字与底色对比足够（浅底配深字）；原图按栏宽显示、可点开大图、加载失败给出链接。
- 每页的状态键按页命名，避免两页同名字段互相覆盖；改默认值时同时清洗旧存储值。
- 贯穿页参照上一周已发布的贯穿页，见 [through-demo](references/through-demo.md)。

## 4 运行模块

复用通用导入页（含第四周完整课程备份转换）、共用模型接入、`modules/history-demo` 计算模块。浏览器嵌入、模型调用的稳健性要求（程序库与权重的备用来源、加载进度、流式生成、上下文上限、复用）见 [runtime](references/runtime-v4.md)。不新增 npm 依赖（CI 使用 `--frozen-lockfile`），需要的小功能自己写。

## 5 验收

云端无法构建 Stencil 时，用组装脚本＋同版本 CDN 依赖搭预览，Playwright 逐页截图、跑交互与数值回归，必要时经代理实测 MiniLM 下载与编码，并用 `page.route` 模拟本站或 Hugging Face 不通。见 [cloud-verification](references/cloud-verification.md) 与 [verification](references/verification.md)。未运行的部分（构建、API 调用、国内镜像）在记录中写明。

## 6 提交与发布

见 [release](references/release.md)。要点：短期分支 → PR → 等 CI（Course checks 会构建全部周次并跑 `check-public`）→ 教师授权后合并 → **Pages 工作流只能手动启动**（Actions › Publish classroom › Run workflow，或 REST `workflow_dispatch`）→ 线上复核文件已更新。没有推送权限时生成 git bundle 并写清本机推送命令。每轮写 `docs/weekNN/revision-日期.md`：逐条落实、实际验证、未测项。
