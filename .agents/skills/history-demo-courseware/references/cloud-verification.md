# 云端验收（无法构建 Stencil 时）

云端容器通常连不上 npm 仓库，无法 `pnpm install`／Stencil 构建，但能访问 jsDelivr、GitHub、arXiv、Hugging Face。做法：

## 搭预览

1. 运行 `apps/weekNN/scripts/assemble.mjs` 的前半段（去掉读 `node_modules` 的复制），把 `index.html` 写到临时目录。
2. 复制 `src/assets`，补 `modules/history-demo/advanced.mjs`、`packages/course-project/*.mjs`。
3. 依赖从 jsDelivr 取**与 package.json 相同的版本**：`@huggingface/transformers@3.8.1/dist/{transformers.min.js, ort-wasm-simd-threaded.jsep.mjs, .wasm}`、`opencc-js@1.0.5/dist/umd/full.js`、`fflate@0.8.3/esm/browser.js`。
4. `setsid python3 -m http.server 8790 --directory <dir>` 启动；不要用 `pkill -f` 杀它（会连带结束 shell）。
5. 顶栏 Stencil 组件不会加载（`build/*.esm.js` 404 属正常）；要测模型接入页里的原生元素，可在页面里手动插入该元素。

## Playwright

- 逐页截图 1440×900 与 390×844，收集 `pageerror` 与 `console.error`，检查 `document.documentElement.scrollWidth`。
- 需要外网（Hugging Face、线上 Pages）时，用 `--proxy-server=<HTTPS_PROXY 的 host:port>`、`--proxy-bypass-list=127.0.0.1;localhost`、`--ignore-certificate-errors` 启动 Chromium（Playwright 的 `proxy` 参数对本机地址不生效）。
- 模拟网络故障：`page.route('**/vendor/transformers/transformers.min.js*', r => r.abort())`、`page.route('https://huggingface.co/**', r => r.abort())`，确认备用来源生效、失败信息清楚。hf-mirror.com 在境外会重定向回 huggingface.co，镜像本身需教师在国内网络复测。
- 预计算向量在浏览器内用同一模型重算（材料改动后必须重算），写回 `precomputed.json` 并同步预计算脚本的句数与过滤条件。

## 复现线上问题

教师报告线上错误时，先用 Playwright 打开 `https://<user>.github.io/<repo>/weekNN/#Dxx` 复现，并 `curl` 对比线上与本地文件的哈希、尺寸；第五周的“图片加载不出来”实为图片过小，“模块加载失败”是网络问题而非文件缺失。

## 德教等私有包

教师给的导入包只放在会话的上传目录，用于本机测试导入、阶段流程与耗时；不复制进仓库。
