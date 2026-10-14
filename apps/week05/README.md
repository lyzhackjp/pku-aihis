# 第五周演示：知识库检索与有依据的生成

候选，未经教师确认。2026-10-13修订。25页，旧D05合并入D04且保留跳转别名，净教学160分钟。页表、概念与来源分别见docs/week05/page-map.json、glossary.json和src/assets/materials/sources.json。逐条修改见docs/week05/revision-20261013.md与revision-20261014.md（后者为当前版本）。

## 打开

本机双击课程根目录“第五周/demo/启动第五周演示.command”。当前工作入口是http://127.0.0.1:8776/pku-aihis/week05/。模型接入使用顶栏共用页，沿用兼容chat/completions云端接口；Key只在窗口内存，刷新后需重填。

普通克隆安装Node>=22与pnpm；先在apps/material-importer及apps/week05各执行pnpm install --frozen-lockfile，再在week05执行pnpm build与pnpm preview。构建自动嵌入通用导入页，子路径已测试。预览绑定本机回环地址，默认8775，可用--port改为8776。

## 课堂操作

| 页 | 主要操作 |
|---|---|
| D01、D02、D10、D18、D21 | 选择大阶段，下部展开步骤、例子和简短解释 |
| D03 | 比照第四周题录／版本／位置界面，回读教师PDF原页 |
| D04 | 切换长度、句、段、递归，查看字符位置、重叠及切分表；含原D05 |
| D06、D07 | 实际多语MiniLM句向量、断点、单链接与DBSCAN；论文原图独立标签 |
| D08、D09 | 选择元数据、邻句、API补写、后期池化；点击处理记录段落；增减必要依据 |
| D11—D14 | 实际集合度量、逐格编辑距离与编辑路径、真实API HyDE、MinHash与版本去重决策 |
| D15—D17 | 分清取回／进入／使用，针对多份实际史料人工逐句核读 |
| D18—D20 | 实际词项共现图、候选关系抽取、放大与消解；GraphRAG／LightRAG／LazyGraphRAG各自查询 |
| D21、D22 | Blackboard请求与能力响应、Ant System实际迭代；六项阅读与固定／工具检索对照 |
| D23—D25 | 结语；德教手动导入后的处理链；六个分区的结构化概念表 |

顶栏“材料导入”打开复用导入页，可处理PDF、图像、文档、题录、文本以及通用项目JSON／ZIP。导入的正文与原件保存在本机IndexedDB，各页共用。扫描件需要明确启动OCR和校订，不能把题录算成已通读正文。

德教全量由教师自行选择第四周导出的完整课程备份ZIP（含patchouli.zip与reading-records.json）、project.json或通用项目ZIP。代码库与课件均不含其原文、教师稿和研究结果。导入后D24从范围与切分走到检索、模型阅读和核读；检索排序限制随后候选。完整备份包含导入原件、正文、实际运行和页面状态。坏文件保留旧库。

## 材料与实际计算

章學誠：上海書店1988影印本，《史德》印刷页63起，PDF页序78起；课堂小范围转写、句读和显示分段是加工，未声称全篇校勘。阿克顿：Macmillan1911重印本，主要段落印刷页40—42、PDF页序48—50，附加候选标明逐字核读状态。森鴎外：筑摩書房1964《現代文学大系》第4卷，印刷页480—482，教师PDF页序1—2；NDLOCR识读并局部对照，未校部分明确登记。不同于讲义原先采用的线上版；本次未改讲义正文。

教师PDF和本机模型缓存留在课程根目录“第五周/demo/修订_20261013”，不在Git。普通克隆可重新导入原件。本机专用预览提供/local-materials与/models；远程环境按需下载公开权重。模型锁定Xenova/paraphrase-multilingual-MiniLM-L12-v2，q8、384维、512词元上限，固定修订见model-manifest.json。超长范围报错，不能静默截断。预跑保存真实三语向量、距离、聚类、短窗口后期池化和蚁群路线；不是构造距离。

论文原图及出处、版本、PDF页序、取得方式与指纹见src/assets/revision/figures/manifest.json。GraphRAG课堂社区划分用标签传播；原框架的层级Leiden和全量基准另作介绍。LightRAG实际运行双层关键词、邻接扩展和向量；LazyGraphRAG按预算逐段核读。均标课堂适配。

## 模型与记录

真实调用记录保存完整输入、片段ID、输出、模型、usage和耗时。私有导入材料默认不向云端发送；明确选中范围后才能调用。运行期间配置固定。API失败保留错误和已完成记录。

从顶栏“课前试跑”可在另窗沿用原课件配置，针对公开史料跑HyDE、上下文、三种图查询、黑板和六类阅读。实际运行记录另见assets/revision/runs.html，可下载保存。两页只在同源本机接续配置，不保存或导出密钥。

验证：pnpm check、pnpm test、pnpm check:browser、pnpm check:integration。最后两项需要预览服务8776与本机Chrome。浏览器测试66项，集成测试含导入回传、附件备份恢复、刷新、私有发送保护和接口流程；接口测试替身与真实API试跑记录分开。摘要见docs/week05/verification。分支week05，暂不合并main、不部署。
