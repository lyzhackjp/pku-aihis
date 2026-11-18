# 提交与发布

## 分支与提交

- 从最新 `origin/main` 开短期分支；明确加入改动的文件，不全目录 `git add`。
- 提交身份：用 `git -c user.name=Claude -c user.email=noreply@anthropic.com commit`，消息末尾加会话要求的署名行。不要改写已推送或他人的提交。
- 推送 403 时请教师在 claude.ai 设置里重新连接 GitHub；仍不行就 `git bundle create <file> origin/main..<branch>`，写清本机 `git fetch <bundle> <branch>:<branch> && git push -u origin <branch>`。
- 开 PR 用 REST：`gh api repos/<o>/<r>/pulls -f base=main -f head=<branch> -f title=… -F body=@file`（GraphQL 在会话中不可用）。

## CI

- `Course checks` 会构建第三、四、五周与导入器，并运行 `scripts/build-site.mjs && scripts/check-public.mjs`。
- 合并或删除页面时，所有写死页数与 ID 序列的地方都要改：用 `scripts/find-count-assertions.mjs <repo> weekNN <旧页数>` 列出（第五周涉及 `scripts/check-public.mjs`、`apps/week05/scripts/check-delivery.mjs`、`check-integration.mjs`、`check-revision-browser.mjs`、`check-public-browser.mjs`、各 README 与 `formal-release.md`）。
- 依赖锁文件冻结，不能临时加包。

## 发布

- **Pages 工作流 `Publish classroom` 只有 `workflow_dispatch`**：合并到 main 不会自动发布。合并后在 Actions 里 Run workflow，或 `gh api -X POST repos/<o>/<r>/actions/workflows/pages.yml/dispatches -f ref=main`。
- 发布完成后 `curl` 线上文件确认新内容已上线；提醒教师强制刷新浏览器缓存。
- 合并与发布须有教师授权；未授权时停在 PR。
