# 第九周 · 历史人物模拟、历史共情与历史仿真（测试原型）

候选，未经教师确认。2026-11-11。28 页（D00—D27）全部有原型组件：第一批 15 页（P0 与概念页）D00、D01、D05、D07、D08、D09、D11、D12、D13、D14、D17、D18、D22、D23、D27；第二批 13 页（P1、P2）D02、D03、D04、D06、D10、D15、D16、D19、D20、D21、D24、D25、D26（`w09-labs3.js`）。依赖课前运行记录的格子在没有记录时显示"待课前运行"。页表、数据结构与第一步待决事项见 [docs/week09](../../docs/week09/)。分支 `week9`（自 `week8` 拉出），未合并 main，不在 `published-weeks.json` 中，未部署。

## 打开

- 本机：双击 `scripts/start_week09.command`（`127.0.0.1:8779` 起静态服务并载入 `local-only/week09-pack.json`）。现场调用只在经本机服务打开时可用。
- 直接双击 `prototype/index.html`（file://）：各页可看、页面内计算可用；模型接入模块不载入，页面显示"现场调用须经本机服务打开"，回答格改显预存回放。

## 材料

- 公开（`prototype/data/w09-public.js`）：维基文库《脫亞論》原报本与句读本、《國家思想變遷異同論》末段、《新大陸遊記》一段、《新中國未來記》第三回一段；《飲冰室合集》（1936，公开扫描本）《文野三界之別》录文；井上《國民道徳概論》1912、1918 两页录文（NDL 公开本）；WarAgent Q 国设定。其余条目只有元数据。
- 本机（`local-only/week09-pack.json`，不入 Git、不发布）：《章太炎全集》第三卷《客帝匡謬》末段录文；课前运行记录（尚无）。
- 史料包原稿在课程文件夹 `第九周/demo/史料包/`（`build_sources.py` → `week09-sources.json`），由 `scripts/build_packs.py` 拆成公开与本机两份。录文均为 Claude 据影像目验录入，待人工逐字复核。

## 模型接入

- DeepSeek：`deepseek-flash` 非思考模式（`thinking: disabled`），温度生效，默认 0.7。
- Kimi：`kimi-k3`，只有思考模式，温度固定 1.0，不传温度。
- Key 只在页面内存；请求记录去掉 Key；导出、浏览器存储中都没有 Key（验收已查）。
- 三种状态分别标注：实际调用（时间戳）、预存回放（"课前运行，非史料"）、网页版粘贴（平台、界面型号、截图）。现场失败时切到回放并写明原因；没有回放就显示"待课前运行"。

## 重新生成与检查

```sh
python3 docs/week09/plan-src/make_page_map.py docs/week09/page-map.json
node .agents/skills/history-demo-courseware/scripts/typ-concepts-to-md.mjs <第九周/概念讲解表.typ> docs/week09/page-map.json docs/week09
python3 apps/week09/scripts/build_packs.py <第九周/demo/史料包/week09-sources.json> [<第九周/demo/运行记录>]
node apps/week09/scripts/assemble-prototype.mjs
cd apps/week09 && node --test tests/*.test.mjs        # 20 项固定例子
python3 apps/week09/scripts/verify_week09.py apps/week09/prototype <输出目录>   # 浏览器验收（Playwright）
```

2026-11-11 验收：单元测试 16/16（教师电脑的会话环境）；浏览器 34/34（云端容器的 Chromium，只用公开文件与一份合成的测试材料包；模型调用用本机模拟接口，只回固定文字，不是真实模型调用）。结果见 `docs/week09/verification/20261111/`。

2026-11-11 第二批验收：单元测试 20/20；浏览器 60/60（同上环境与条件；新增 D02—D26 十三页的固定例子与交互检查，以及"输入 Key 时重绘重入"的修复检查）。结果见 `docs/week09/verification/20261111-batch2/`。`deck-core.js` 在第八周版本上加了一处重入保护（替换 DOM 时焦点控件的 blur／change 再次触发重绘）。

2026-11-11 设计复查：改动与理由见 `docs/week09/design-review-20261111.md`。单元测试 24/24；浏览器 70/70（`docs/week09/verification/20261111-review/`）。课前接口记录由 `scripts/run_preclass.mjs` 生成（清单 R-1、R-3、R-3b、R-4、R-5、R-6、R-8、R-9），存教师本机，不入库。
