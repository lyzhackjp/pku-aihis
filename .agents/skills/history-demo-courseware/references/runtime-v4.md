# 实际材料与模型运行模块

候选，未经教师确认。2026-10-13。适用于本课程后续网页演示。

- 共用导入页：apps/material-importer。独立发布使用默认子路径，嵌入课件构建使用PKU_IMPORTER_BASE=./。JSON与ZIP遵守packages/course-project/project.mjs合同；传回先验证，坏文件保留旧库；附件、来源、正文、加工与核验状态独立保存。
- 第五周适配服务：apps/week05/src/assets/revision/services.mjs；IndexedDB存本机项目、原件和实际运行，兼容上周全量project.json。不得把教师私有全量包复制为公共资产。备份包含原件、正文、运行和页面状态；Key不进备份。
- 共用模型页：model-connection组件与shared/model-settings。沿用兼容chat/completions协议，Key只在内存。私有导入材料默认不向云端发送，用户选择发送范围后才能调用。运行期间固定模型配置。
- 共享计算：modules/history-demo/math.js与advanced.mjs。实际句向量使用固定多语MiniLM、q8、384维；窗口限制512词元，超长必须减少范围，不能静默截断。后期池化先编码整窗口词元，再按稳定句界池化，标清这是短窗口课堂适配。
- 图索引：实际命中文字共现保留出处，共现不算事实关系；API关系过滤逐字证据，仍需人工核读。GraphRAG社区摘要→map→reduce，LightRAG低／高层关键词＋邻接扩展＋实际向量，LazyGraphRAG无生成模型预索引＋查询时预算内相关性核读。课堂适配不能冒称官方全量基准。
- 协作：Blackboard System发布请求、各能力角色自愿响应、追加黑板和中心汇总；Ant System实际概率路线、沉积与挥发。两者不能只换提示词名称。
- 版式：概念历史用大阶段选择和下部展开；实际结果用结构表；步骤高亮随选择／操作移动；图可放大；复杂页不用固定四栏约束。
- 验收：实际公开材料的小范围计算与接口协议分别验证；测试替身只证明协议。原PDF、论文原图登记版本、PDF页序、取得方式与SHA-256。生成未实际调用时保留待试跑状态，不能把备选文本叫生成结果。

## v5 补充（2026-10-15）

- **程序库备用来源**：`services.mjs` 的 `importLibrary()` 先从本站 `assets/vendor/transformers/` 载入，失败或 60 秒超时改用 jsDelivr 同版本（`@huggingface/transformers@3.8.1/dist/`，`wasmPaths` 随之切换）。失败过的模块地址会被浏览器缓存为失败，重试时加 `?retry=n`。
- **权重备用来源**：`pickHost()` 先探测 `huggingface.co`，8 秒不通改用 `hf-mirror.com`（国内）；用户可在模型接入页手选并保存在 `week05/v3/embeddingHost`。`env.remoteHost`、`env.remotePathTemplate="{model}/resolve/{revision}/"`。线上不要探测不存在的本地 `/models/`（只在 localhost 探测）。
- **加载状态**：`embState`（phase：idle／library／host／downloading／ready／error，逐文件 loaded／total，来源、用时）经 `week05-embedding-state` 事件节流广播；模型接入页嵌入原生 `<embedding-status>` 元素显示进度条、文件表、重试与来源选择；各页编码时的进度消息复用同一状态。
- **模型调用**：`generate(task, records, question, { allowCloud, onDelta, maxTokens })`。长输入任务（上下文化检索）用流式 `onDelta` 显示首字用时与生成过程，限制输出长度，全文超过约 6000 字只发目标前后若干段并写明，同一目标同一设置复用上次结果；页面显示发送字数、模型用时、编码用时。
- **状态键**：页面状态存 `rev2/Dxx`；不同页的同名字段必须改名（第五周 D06 的 `threshold` 与 D14 去重阈值冲突，改为 `dupThreshold`），并对旧存储值做合法性清洗。
- **依赖**：不新增 npm 包（CI 冻结锁文件）。公式排版用内置 HTML／CSS（`.fr` 分式），不引 KaTeX。
