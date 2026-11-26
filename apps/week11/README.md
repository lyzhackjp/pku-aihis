# 第十一周 · 人工智能辅助论文写作（开发中）

候选，未经教师确认。2026-11-25。分支 `week11`（自 `origin/main` e445257 拉出，课程文件夹中的工作树 `pku-aihis-week11`）。未经教师另行授权，不合并 main、不部署、不改 `published-weeks.json`。

## 现状：第一批完成（2026-11-26）

- 页面（prototype）：D00、D01、D02、D04（占位）、D05、D06、D10、D13、D15、D17、D18、D21；其余页为规划占位页（第二、三批）。
- 打开：双击 `scripts/start_week11.command`（127.0.0.1:8781，自动载入 `local-only/week11-pack.json`）。重新生成：`python3 apps/week11/scripts/build_packs.py <课程文件夹>`；`python3 docs/week11/plan-src/make_page_map.py docs/week11/page-map.json`；`node apps/week11/scripts/assemble-prototype.mjs`。
- 测试 70 项通过；浏览器验收 40 项通过，见 `docs/week11/verification/20261126-batch1.md`。

## 第一步（2026-11-25）

- 页表：`docs/week11/page-map.json`（23 页 D00—D22，全部 `planned`），由 `docs/week11/plan-src/make_page_map.py` 生成；课程技能 `check-page-map.mjs` 检查通过（概念 7 个、图 12 张、时长 160 分）。
- 数据结构：`docs/week11/data-structures.md`、`schemas/w11-structures.schema.json`（20 种）、`schemas/importer-kinds.w11.json`、`examples/`（`plan-src/validate_examples.py` 全部通过，三个反例被拒）。
- 条件卡：`docs/week11/examples/condition-cards.w11.json`（11 张，由课程文件夹 `第十一周/demo/prompts.json` 生成，不含材料正文）。
- 模块：`prototype/w11-lib.js`（第一批已实现）；接口与固定例子见 `docs/week11/algorithms.md`。
- 运行清单（只列不跑）：`docs/week11/preclass-runlist.json`；课前环境方案在课程文件夹 `第十一周/课前环境方案.md`。
- 出入表：`docs/week11/出入表.md`。

## 材料边界

- 公开（`tests/fixtures/`）：练习材料甲 `jia_draft.docx`（教学构造，与课程文件夹 `第十一周/练习材料/教学构造草稿.docx` 同一文件，SHA-256 24ff3beb…）；修订夹具 `jia_revisions.docx`（`make_revision_fixture.py` 在其副本上程序写入，未在 Word 中打开核对）及期望结果。
- 本机（`local-only/`，不入 Git、不发布）：茅海建文节录、郭卫东与刘路生两文（文字层与七页原刊图像）、4.3 答案（教师模式）、课前运行记录。教师 2023 年论文可线上使用全文（教师 2026-11-25），第二批接入。`local.test.mjs` 从课程文件夹读，找不到时整组跳过。
- 教师 2026 年《历史研究》投稿（未刊稿）不进入任何文件、夹具、提示或提交；疑似未刊稿的材料一律只进本机材料包（教师 2026-11-25：不用拦截词）。`scripts/check-blocklist.mjs` 保留备用。中島徳蔵材料与本周无关，不进入任何文件。
- Key 只在页面内存；记录、导出、浏览器存储中都没有 Key。
