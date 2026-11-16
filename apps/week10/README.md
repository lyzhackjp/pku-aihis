# 第十周 · 人工智能辅助文献阅读（开发中）

候选，未经教师确认。2026-11-16。分支 `week10`（自 `origin/main` a1afb92 拉出），不合并 main，不在 `published-weeks.json` 中，未部署。

## 现状：第一批完成（2026-11-16 晚）

- 已实现 14 页：D00、D01、D03、D04、D06、D07、D08、D10、D11、D12、D14、D15（阅读对照单，贯穿页）、D16、D22（概念表）；其余 9 页为规划占位页（第二、三批）。
- 顶栏：材料说明、导入本机材料包、导入表格（第十周十一类）、文献导入（通用导入页）、课前运行（批量运行、续跑、导出，不含 Key）、模型接入。网页版回答在 D01、D14 等回答格"录入网页版回答"。
- 打开：双击 `scripts/start_week10.command`（127.0.0.1:8780，自动载入 `local-only/week10-pack.json`）。直接打开 HTML 时只能回放，现场调用不可用。
- 重新生成：`python3 docs/week10/plan-src/make_page_map.py docs/week10/page-map.json`；`python3 apps/week10/scripts/build_packs.py <第十周文件夹> [<运行记录目录>]`；`node apps/week10/scripts/assemble-prototype.mjs [<课程技能 assemble-prototype.mjs>]`。
- 测试：`cd apps/week10 && node --test tests/*.test.mjs`（43 项）。浏览器验收记录：`docs/week10/verification/20261116-batch1.md`。
- 课前运行面板的失败续跑测试可用 `scripts/mock_api.py`（本机模拟接口，只回固定文字）；2026-11-16 的验收改用页面内替换的模拟接口，没有发出真实请求。
- 样式与外壳：`deck-core.js`、`deck.css`、`week09-base.css`、`w09.css` 原样复制第九周（类名 w9-* 照用），第十周补充在 `w10.css`；模型接入 `live/vendor/` 原样复制。

## 材料边界

- 公开（`tests/fixtures/`）：埃姆斯电报两本德文（GHDI）、程序对齐表（由 `第十周/demo/材料/埃姆斯_对齐表.md` 转出）、勅語成文（讲义附录，已对原本影像）、讲义 @fig-chain 十行（本课摘编）。
- 本机（`local-only/`，不入 Git、不发布）：茅海建 2002 两节、稲田录文两份、课前运行记录。中島徳蔵材料与本周无关，不进入任何文件。
- Key 只在页面内存；记录、导出、浏览器存储中都没有 Key。
