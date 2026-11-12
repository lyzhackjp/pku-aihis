// 第九周：依 docs/week09/page-map.json 重新生成 prototype/index.html 与 data/data.js（课程技能的 assemble-prototype.mjs），
// 再在 <head> 补入第九周样式、材料与模型接入模块（与第八周同一做法）。
// 用法：node apps/week09/scripts/assemble-prototype.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), proto = path.join(app, 'prototype');
execFileSync(process.execPath, [path.join(root, '.agents/skills/history-demo-courseware/scripts/assemble-prototype.mjs'), proto], { stdio: 'inherit' });
const f = path.join(proto, 'index.html');
let html = await fs.readFile(f, 'utf8');
html = html
  .replace('<script src="data/data.js"></script>', '<script src="data/data.js"></script>\n<script src="data/w09-public.js"></script>\n<script src="data/w09-kinds.js"></script>\n<script src="data/w09-cards.js"></script>')
  .replace('<link rel="stylesheet" href="deck.css">', '<link rel="stylesheet" href="deck.css">\n<link rel="stylesheet" href="week09-base.css">\n<link rel="stylesheet" href="w09.css">')
  .replace('</head>', '<!-- 模型接入（ES 模块；须经 HTTP 打开）。由 scripts/assemble-prototype.mjs 补入。 -->\n<script type="module" src="live/w9-live.js"></script>\n</head>');
await fs.writeFile(f, html);
console.log('已补入第九周样式、材料与 live/w9-live.js');
