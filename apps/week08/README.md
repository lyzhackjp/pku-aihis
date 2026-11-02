# 第八周 · 数字人文方法与人工智能（测试原型）

候选，未经教师确认。2026-11-02。26 页（D00—D25），第一批实现 14 页，其余为规划页；34 条概念；净教学 172 分钟。依据第八周讲义第三版 R6（讲义不入库）、《讲义附录：扩充部分》与《案例整理》。设计、页表、逐页内容与验收见 [docs/week08](../../docs/week08/)。

本目录照第七周的做法，是**无构建测试原型**；分支 `week8`，教师认可前不合并到 main，不在 `published-weeks.json` 与 CI 中。

## 打开

1. **本机**：先生成本机材料包（见下），再双击 `scripts/start_week08.command`，它在 `127.0.0.1:8778` 起静态服务并用 Chrome 打开，同时载入本机材料包。也可在本目录运行 `python3 -m http.server 8778 --bind 127.0.0.1`，访问 `prototype/index.html?pack=../local-only/week08-pack.json`。
2. **直接双击 HTML（`file://`）**：各页与公开材料可看；浏览器内模型与“文献导入”用到 ES 模块与 Web Worker，不载入。
3. 本机材料包导入一次即存浏览器 IndexedDB，顶栏可移除。右上角“贯穿”“概念表”随时进出；Esc 课程地图；P 演讲者窗口；B 静态。

## 材料：公开部分与本机部分

- **公开**（随课件发布，`prototype/data/public/week08-public-pack.js`）：王裕华 2022 复制数据中的神宗朝官员及亲属网与 137 人属性（CC0）、佛罗伦萨家族婚姻网（NetworkX 示例数据，BSD）、程宁 2023 表 2 句对与分数、《華陽集》卷三十五至六十（维基文库四庫全書本）、讲义练习材料一二、教学构造的小网与句对。
- **本机**（课堂导入，不入 Git、不发布）：CBDB 王珪记录（按第七周决定）、『梅颸日記』十段录文与影像（带个人水印）、JBDB 查询结果（再发布许可未见说明）。

```sh
# 原始数据目录即课程文件夹 第八周/research/原始数据/
python3 apps/week08/scripts/build_public_pack.py <原始数据> <讲义.typ> apps/week08/prototype/data/public/week08-public-pack.js
python3 apps/week08/scripts/build_week08_pack.py <原始数据> <cbdb_1845.json> <第八周/demo/导入包/梅颸日記> <原始数据/jbdb_20261102> apps/week08/local-only/week08-pack.json
node apps/week08/scripts/assemble-prototype.mjs     # 改 docs/week08/page-map.json 之后重新生成 index.html 与 data.js
```

页表由 `docs/week08/plan-src/make_page_map.py` 生成，逐页内容稿由 `make_pages_md.py` 生成。

## 表格导入与文献导入

- 顶栏“导入表格”：通用导入页的表格部分（边表、事件表、文本集合、句对表、地名或点表、时间序列、单位×时间×变量）。读入、表头映射、声明（有向、缺省时间、可疑值、历法、坐标参照系）、四栏材料说明、检查报告，全部在浏览器内完成；导入的表格存本浏览器，可导出为材料包 JSON。各页的材料下拉框同时列出预置材料与导入的表格。
- 顶栏“文献导入”：打开课程通用导入页（`apps/material-importer`，握手同第五至七周）。导入页需先构建一次：`sh apps/week08/scripts/build_importer.sh`（产物不入 Git）。

## 浏览器内模型（课前载入）

顶栏“模型接入”：句向量（bge-small-zh-v1.5 或多语 MiniLM，D06）、GLiNER multi v2.1（D13）、Qwen3 0.6B／4B（第二批）。首次需联网下载（库来自 jsDelivr，权重来自 Hugging Face），之后由浏览器缓存；课前在授课用的浏览器与网址上各载入一次。材料文字不出本机。做法与限制沿用第七周（`live/browser-worker.js`）。

## 验收

```sh
python3 -m http.server 8788   # 在含 prototype/ 与 local-only/ 的目录，即本目录
python3 apps/week08/scripts/verify_week08.py http://127.0.0.1:8788/prototype/index.html ../local-only/week08-pack.json <输出目录> [--models]
pnpm test                     # 源码级检查（不需浏览器）
WEEK08_SKIP_IMPORTER=1 pnpm build && WEEK08_LOCAL_PACK=local-only/week08-pack.json pnpm run check
```

2026-11-02 云端 Chromium：43／43 通过（带 `--models`）；结果见 `docs/week08/verification/20261102/`（不含显示本机材料的截图）。
