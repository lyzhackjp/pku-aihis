# 从测试原型到正式 Stencil 工程

按教师当前请求的授权范围进行；已要求完成开发时直接完成，不因本文重复征求确认。课程仓库规则见 pku-aihis `AGENTS.md`、`CONTRIBUTING.md`、`docs/ci-and-release.md`。

## 工程

1. 以用户指定分支为准；未指定时从核对过的main建短期分支；新建 `apps/weekXX`，不覆盖已有周次。
2. 外壳从 `apps/week04` 复制并删减：`deck-container`（顶栏、贯穿与概念入口、课程地图、演讲者窗口、键盘保护）、`deck-slide`（kicker、标题、过渡句、页脚）、`deck-presenter`。BroadcastChannel 改为 `pku-aihis-weekXX-YYYYMMDD`；存储前缀改为本周。
3. 页面组装沿用数据驱动：`scripts/assemble-deck.mjs` 读 `docs/weekXX/page-map.json` 生成 `src/index.html` 与 `src/assets/data/pages.json`；概念页读 `glossary.json`。不要像第四周那样在组装脚本里按页硬写覆盖，改动回到页表。
4. 原型组件逐个改写为 Stencil 组件：`connectedCallback + innerHTML` → `@State` + `render()` JSX；`Deck.flowShell` → 组件内 `flowShell()`（第三周同名方法）；计算函数抽到 `src/lib/*.ts` 并配 `node --test` 单元测试，测试用讲义图中的固定数值。
5. 页内教学用小表换成正式依赖（如 OpenCC-js，用第三周已固定的版本）。
6. `pnpm check`（tsc）、`pnpm test`、`pnpm build`；浏览器检查脚本迁移为 `scripts/check-weekXX-browser.mjs`。
7. 全站组装：只有授权参与站点组装或发布时才将本周加入 `published-weeks.json`；`scripts/build-site.mjs` 白名单只含构建产物。

## 原型组件与正式组件的对应（第五周）

| 原型（week05-labs.js） | 正式组件建议名 | 计算函数 |
|---|---|---|
| `set-measure-lab` | `measure-lab`（D11、D12 共用） | `lib/measures.ts`：集合度量、编辑距离、字形统一 |
| `support-lab` | `support-lab` | `lib/support.ts`：三级判定与 P_w、R_w |
| `entity-lab` | `entity-lab` | `lib/entities.ts`：匹配规则与归并 |
| `through-workbench` | `through-workbench` | 复用以上三个库 |
| `concept-table`（deck-core） | `glossary-view`（沿用第四周名，扩展六字段） | `lib/concept-appendix.ts` 扩展字段行解析 |

## 不做的事

- 不在已导入的助教工程根目录运行初始化器。
- 不修改原始 skill 与输入 ZIP；本 skill 的改动另行说明。
- 未刊稿、教师材料、运行记录原件只进本地课堂包。
