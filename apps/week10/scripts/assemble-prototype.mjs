// 第十周：依 docs/week10/page-map.json 重新生成 prototype/index.html 与 data/data.js（课程技能的 assemble-prototype.mjs），
// 再在 <head> 补入第十周样式、材料与模型接入模块（与第九周同一做法）。
// 用法：node apps/week10/scripts/assemble-prototype.mjs [<课程技能脚本路径>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), proto = path.join(app, 'prototype');
const skill = process.argv[2] || path.join(root, '.agents/skills/history-demo-courseware/scripts/assemble-prototype.mjs');
execFileSync(process.execPath, [skill, proto], { stdio: 'inherit' });
const f = path.join(proto, 'index.html');
let html = await fs.readFile(f, 'utf8');
html = html
  .replace('<script src="data/data.js"></script>', '<script src="data/data.js"></script>\n<script src="data/w10-public.js"></script>\n<script src="data/w10-static.js"></script>\n<script src="data/w10-kinds.js"></script>\n<script src="data/w10-cards.js"></script>')
  .replace('<link rel="stylesheet" href="deck.css">', '<link rel="stylesheet" href="deck.css">\n<link rel="stylesheet" href="week09-base.css">\n<link rel="stylesheet" href="w09.css">\n<link rel="stylesheet" href="w10.css">')
  .replace('</head>', '<!-- 模型接入（ES 模块；须经 HTTP 打开）。由 scripts/assemble-prototype.mjs 补入。 -->\n<script type="module" src="live/w10-live.js"></script>\n</head>');
await fs.writeFile(f, html);
console.log('已补入第十周样式、材料与 live/w10-live.js');
