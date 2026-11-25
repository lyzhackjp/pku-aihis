# 第十一周 · 人工智能辅助论文写作（开发中）

候选，未经教师确认。2026-11-25。分支 `week11`（自 `origin/main` e445257 拉出，课程文件夹中的工作树 `pku-aihis-week11`）。未经教师另行授权，不合并 main、不部署、不改 `published-weeks.json`。

## 现状：第一步（页表、数据结构、测试先写）

- 页表：`docs/week11/page-map.json`（23 页 D00—D22，全部 `planned`），由 `docs/week11/plan-src/make_page_map.py` 生成；课程技能 `check-page-map.mjs` 检查通过（概念 7 个、图 12 张、时长 160 分）。
- 数据结构：`docs/week11/data-structures.md`、`schemas/w11-structures.schema.json`（20 种）、`schemas/importer-kinds.w11.json`、`examples/`（`plan-src/validate_examples.py` 全部通过，三个反例被拒）。
- 条件卡：`docs/week11/examples/condition-cards.w11.json`（11 张，由课程文件夹 `第十一周/demo/prompts.json` 生成，不含材料正文）。
- 模块：`prototype/w11-lib.js` **只有接口，未实现**；接口与固定例子见 `docs/week11/algorithms.md`。
- 测试：`node --test tests/*.test.mjs`。2026-11-25：`lib.test.mjs` 35 项、`local.test.mjs` 5 项全部因"未实现"失败（预期，第一批实现）；`blocklist.test.mjs` 3 项通过。
- 运行清单（只列不跑）：`docs/week11/preclass-runlist.json`；课前环境方案在课程文件夹 `第十一周/课前环境方案.md`。
- 出入表：`docs/week11/出入表.md`。

## 材料边界

- 公开（`tests/fixtures/`）：练习材料甲 `jia_draft.docx`（教学构造，与课程文件夹 `第十一周/练习材料/教学构造草稿.docx` 同一文件，SHA-256 24ff3beb…）；修订夹具 `jia_revisions.docx`（`make_revision_fixture.py` 在其副本上程序写入，未在 Word 中打开核对）及期望结果。
- 本机（不入 Git、不发布）：茅海建文节录（第十周 `demo/材料/`）、郭卫东与刘路生两文、教师 2023 年论文段落与植入副本、4.3 答案、课前运行记录、拦截词文件。`local.test.mjs` 从课程文件夹读，找不到时整组跳过。
- 教师 2026 年《历史研究》投稿（未刊稿）不进入任何文件、夹具、提示或提交；`scripts/check-blocklist.mjs` 按教师提供的拦截词检查（拦截词文件不在仓库，缺失时检查报"未生效"，退出码 2）。中島徳蔵材料与本周无关，不进入任何文件。
- Key 只在页面内存；记录、导出、浏览器存储中都没有 Key。
