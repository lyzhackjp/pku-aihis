# 第十周 · 人工智能辅助文献阅读（开发中）

候选，未经教师确认。2026-11-16。分支 `week10`（自 `origin/main` a1afb92 拉出），不合并 main，不在 `published-weeks.json` 中，未部署。

## 现状：第一步（页表、数据结构、算法与测试），页面尚未开始

- 页表、数据结构、算法接口、课前运行清单：[docs/week10](../../docs/week10/)（`page-map.json`、`data-structures.md`、`algorithms.md`、`preclass-runlist.json`）。
- 计算模块：`prototype/w10-lib.js`（seq-align、quote-check、timeline-match、set-overlap、label-agree、claim-sheet、发出前校验）。纯函数，讲解页与贯穿页共用。
- 测试：`cd apps/week10 && node --test tests/*.test.mjs`。`tests/lib.test.mjs` 只用公开文本；`tests/local.test.mjs` 读课程文件夹 `第十周/demo/`（不入库），找不到时跳过并写明原因（可用环境变量 `W10_DEMO_DIR` 指定）。
- 2026-11-16 实际运行（教师电脑的会话虚拟机，Node 22.23.4）：37/37 通过。

## 材料边界

- 公开（`tests/fixtures/`）：埃姆斯电报两本德文（GHDI）、程序对齐表（由 `第十周/demo/材料/埃姆斯_对齐表.md` 转出）、勅語成文（讲义附录，已对原本影像）、讲义 @fig-chain 十行（本课摘编）。
- 本机（`local-only/`，不入 Git、不发布）：茅海建 2002 两节、稲田录文两份、课前运行记录。中島徳蔵材料与本周无关，不进入任何文件。
- Key 只在页面内存；记录、导出、浏览器存储中都没有 Key。
