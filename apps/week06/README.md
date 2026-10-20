# 第六周 · 文从何来

候选，未经教师确认。第二轮：2026-10-20。26页、34条概念、净教学160分钟。开发分支 `feat/week06-courseware`，尚未合并或部署。

## 本机打开

双击课程 `第六周/demo/启动第六周演示.command`；本机入口 `http://127.0.0.1:8776/pku-aihis/week06/?local=1`。去掉 `?local=1` 可查看公开入口。需要Node≥22、pnpm、Python3；不要直接打开HTML。

在 `apps/week06` 内运行：
```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```
构建同时构建共用material-importer，其依赖须预先按锁文件安装。构建不下载模型，不调用OCR。

## 课堂操作

| 页 | 操作与产物 |
|---|---|
| D00—D03 | 同一材料运行／导入记录；指针拖放五个问题；选框联动大裁切、实际类别和逐位候选。类别清单可切换。 |
| D04—D06 | Kraken五阶段、追踪／PAGE／ALTO导入；XY逐刀；规则与人工／dots双标签，拖动读序与导出。 |
| D07—D09 | CTC原理、真实概率单步／自动、网络逐层、手动序列；拼行／遮字实验；检测与识读分数分列选行。 |
| D10—D14 | 四阶段时间轴；D11全宽引擎标签＋同一行底条；多API对照、差异分类、材料规则选工具及三任务竞赛图。 |
| D15—D18 | 八类检查清单三处联动；十二种退化效果、分屏／闪烁与损伤登记；正文／小注读序；五种书体片段、字表覆盖与现场识读。 |
| D19—D22 | 多语规范对照；共用按行导入；CER重算；原始＋两种后处理三栏逐处裁定；来源定义、核对信息与四层导出。 |
| D23—D25 | 七阶段贯穿、锁定原始识读、导出／校验后恢复；34条概念搜索和回链。 |

方向键／空格翻页，输入框与组字期间不翻页。B静态模式。演讲者窗口双向同步。图上区域可用Tab、方向键和Enter。排序和归类使用pointer events，键盘替代在说明里。

## 模型、API与记录

顶栏“课前检查”打开独立 `preflight.html`。NDL四个文件、PP两个文件、可选Florence与dots服务分别报告缓存、SHA、会话、公开图热身及真实错误，导出Markdown／JSON。检查必须在教师实际授课用Chrome配置中由教师触发；开发测试的隔离浏览器不能证明教师缓存已就绪。

课件NDL／PP运行按钮只读取已校验的缓存，缺失时引导去检查页主动下载。共享导入器的既有下载入口仍可用。Florence可选，约262.2MiB；dots权重本轮未下载。模型没有结果时显示待运行，官方图与构造输入分别标注。

12种API预设及依据见 `modules/history-demo/ocr/api-presets.json`。先填实际模型名，再通过公开小图视觉测试。D12支持两到三个配置并排；D13和D21复用单个配置。每次勾选发送范围，材料／配置改变后重新同意。Key只在内存，刷新清除。请求、回复、usage、耗时与错误保存在本机，导出剔除Key。需要CORS转发时，教师可按 `tools/llm-proxy/README.md` 启动仅监听loopback的官方端点转发器。

D04/D07课前追踪脚本分别在 `tools/kraken-trace/`、`tools/ocr-trace/`，本轮只编写和语法检查，没有执行。D07的481个算子来自允许的ONNX静态形状推断，发布包只含元数据。

参照必须登记出处与规范；人工核对／据翻刻还要核对人、日期和逐字复核声明。未核机器稿不显示评测CER。CER按Unicode码点（NFC）计算。逐处修改后的稿件保留原始记录，但不继承原识读分数。

## 材料与验收

公开素材身份、权利与指纹见 `src/assets/materials/sources.json`，新文字例见 `transcription-examples.json`。1926《史德》与教师1988版分开；P.2510是卷末局部；Folger高清图及多数参照尚待课前准备。教师材料仅从本机白名单读取，不复制到src或www。

```sh
pnpm check
pnpm test
WEEK06_LOCAL_MATERIALS="<课程根目录>" pnpm test
# 另启预览后
pnpm check:browser
node scripts/check-round2-extra.mjs
node scripts/check-api-browser.mjs
```

本轮F08已经按修订任务书改为7141，F17—F20新增测试。未设置本机根目录时8项私有材料检查明确跳过；另在本机环境实际运行。浏览器与API测试使用隔离配置和明确测试替身，没有真实推理或API调用。检查与截图见 `docs/week06/verification`；逐项交付、运行边界和未完成材料见 `docs/week06/completion.md` 的“第二轮”。

页面教学文字在 `docs/week06/page-map.json` 的 `ui`、`ui_copy`、`ui_round2` 与 `ui_round2_copy`；数据、算法、视图分开。构建生成模块、模型和私有材料不入Git。构建前检查浏览器模块语法，公开自检拒绝同步副本、权重与私有内容。
