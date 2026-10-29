# 检查、发布与恢复

2026-09-22实施版本。旧流程准备阶段已结束；本文件描述当前工程。

## 检查

`.github/workflows/check.yml`在PR及main更新时执行稳定作业`build-week03`：锁定Node与pnpm、冻结锁文件安装、数值测试、TypeScript检查、Stencil构建、全站组装及公开包检查。普通检查仅`contents: read`，不接收模型密钥。

浏览器验收另记实际浏览器、窗口尺寸与操作。课堂截图证明布局，算法测试证明受测数值行为，两者不能替代史料核读。最近记录见`docs/week03/handoff.md`及`docs/week03/model-update.md`。模型接入另有Python端点检查和浏览器API测试，付费API未提供账户时明确记为测试替身。

## 发布

`Publish classroom`只接受`workflow_dispatch`且分支必须为main。构建绑定触发时的`github.sha`，通过同一检查后上传`site/`，独立部署作业才获得`pages: write`与`id-token: write`。GitHub官方Actions按完整SHA固定；Pages来源设为Actions，github-pages环境仅允许main。

```sh
gh workflow run pages.yml --ref main
gh run list --workflow pages.yml --limit 3
```

`published-weeks.json`列出全体已发布周次。Stencil本身按`/pku-aihis/week03/`生成子目录，组装脚本把每周的入口、构建资源与assets放到`site/weekXX/`。仅上传这个白名单站点，不上传源码仓库、私人原件、全量OCR、未列入白名单的模型、私人教案或密钥。每次生成release-manifest.json，记录逐文件SHA-256。

GitHub Pages不能设置自定义隔离头；第三周使用限定本周作用域的service worker添加COOP/COEP，首次控制后刷新。它不提供离线缓存。Lucivy需要crossOriginIsolated=true。完整离线备用请使用本地HTTP服务，或本次打包的静态产物；模型权重与外部服务不在压缩包；本机启动器会连接已另行下载的模型目录。教师本机可离线重新编码文字和运行生成模型。

## 协作与恢复

日常修改经短期分支和PR。主线应要求实际成功过的`build-week03`检查，禁止强推/删除；助教尚未加入前不设置无人可履行的指定审阅人。新增协作者与通知由教师决定，AI独立检查不冒充教师或助教审批。

故障时先用本地已验证课堂包。在修复分支做最小修复或`git revert`，经过PR检查合入main，再手动发布全站；保留旧标签和历史，不移动主线标签或强推。发布记录注明提交、Actions运行、地址及不能离线使用的功能。

设计依据：[GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)、[Pages自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[部署环境](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)。

第四讲追加检查：CI与手动发布的构建阶段安装.NET SDK10，并安装、测试、检查和构建week04，再组装全部周次。预置资源按用户最新要求入库，构建不读取教师的本机数据库；OCR权重仍按固定URL和SHA准备。此变更只补齐构建流程，未触发发布。

## 2026-10-07 第四周正式化

全站构建保留第三周，同时加入助教版第四周与通用导入器。第四周只白名单发布四份原有PDF、对应原生SQLite及三份固定哈希的RapidOCR权重；`local-only`在复制前排除，ZIP一律不发布。Pages与PR检查均构建三套应用；第四周锁定.NET SDK 10.0.300，与NuGet锁文件的WebAssembly Pack 10.0.8相符。私人德教包由浏览器文件选择器在本机导入，不能复制到assets后发布。Agent仅在独立分支。

## 2026-10-14 第五周发布

教师确认修复版并授权week05合入main及发布。普通检查与手动Pages发布均安装、测试、检查并构建week05；先准备导入器依赖，构建第五周内嵌的相对路径导入器，再重建独立导入页，确保两个入口的子路径各自正确。published-weeks.json加入week05，保留week03、week04和material-importer。全站公开检查增加第五周25页对应、三份公开节录身份、内嵌导入器、WASM、论文图指纹与私人原件排除。部署绑定合并后的main提交；实际结果以GitHub Actions部署和线上回查记录为准。

## 2026-10-22 第六周发布

教师追加授权将当前week06分支推送、合入main并发布。PR与Pages工作流均增加week06的锁文件安装、单元测试、构建和产物检查；week06的check读取生成文件，因此在build之后运行。第五、六周先各自复制相对路径导入器，再重建独立导入页。发布清单保留第三至第五周与material-importer，新增week06。全站检查核对25实体页、D13别名、公开图指纹、实际保存回放、课前检查入口、内嵌导入器及无教师原件／ZIP／模型权重；源码和站点构建均不依赖教师本机文件。独立授课电脑的模型缓存、API权限和本机服务仍须课前检查。

## 2026-10-29 第七周发布

教师于2026-10-29授权在全面检查后将week07合入main并发布。第七周课件即无构建原型（经典脚本加 `live/` 下的ES模块），`apps/week07` 新增无依赖的pnpm包：`pnpm test` 核对30页三处页码、公开包不含CBDB、CBDB引注、输入法合成保护与密钥不落盘；`pnpm build` 做语法检查后复制原型并内嵌相对路径导入器到 `www/pku-aihis/week07/`；`pnpm run check` 读取构建产物，因此在build之后运行。PR与Pages工作流加入week07；published-weeks.json新增week07。全站检查核对30页与D13、D15别名、公开材料包无CBDB字段、仅一份LangExtract wheel、内嵌导入器，以及无本机材料包、模型权重与密钥。CBDB记录只由教师课堂导入，导入后显示“CBDB BJ 20260602，CC BY-NC-SA 4.0”引注。
