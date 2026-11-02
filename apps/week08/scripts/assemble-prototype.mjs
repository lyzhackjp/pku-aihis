// 第八周：依 docs/week08/page-map.json 重新生成 prototype/index.html 与 data/data.js。
// 先运行课程技能的 assemble-prototype.mjs，再在 <head> 中补入第八周样式与浏览器内模型模块（第七周是手工补入，这里改为脚本补入，免得重生成时丢失）。
// 用法：node apps/week08/scripts/assemble-prototype.mjs
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), proto = path.join(app, 'prototype');
execFileSync(process.execPath, [path.join(root, '.agents/skills/history-demo-courseware/scripts/assemble-prototype.mjs'), proto], {stdio: 'inherit'});
const f = path.join(proto, 'index.html');
let html = await fs.readFile(f, 'utf8');
html = html.replace('<link rel="stylesheet" href="deck.css">', '<link rel="stylesheet" href="deck.css">\n<link rel="stylesheet" href="week08.css">')
  .replace('</head>', '<!-- 浏览器内模型与通用导入页握手（ES 模块；须经 HTTP 打开：本机服务或 GitHub Pages）。由 scripts/assemble-prototype.mjs 补入。 -->\n<script type="module" src="live/w8-live.js"></script>\n</head>');
await fs.writeFile(f, html);
console.log('已补入 week08.css 与 live/w8-live.js');
