#!/usr/bin/env node
// 依 page-map.json 生成测试原型的 index.html 与 data/data.js。
// 用法：node assemble-prototype.mjs <原型目录>（目录中需有 deck.config.json）
// - 每页的 kicker、标题、过渡句、运行模式、备注、页脚全部取自页表，不在 HTML 里手写；
// - 页表中 status=prototype 且在 bodies 里登记了组件的页放入实际组件，其余页放 planned-page 占位；
// - 正式 Stencil 工程可沿用同一页表，只把输出目标换成 apps/weekXX/src/index.html。
import fs from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || '.');
const cfg = JSON.parse(await fs.readFile(path.join(dir, 'deck.config.json'), 'utf8'));
const pages = JSON.parse(await fs.readFile(path.resolve(dir, cfg.pageMap), 'utf8'));
const glossary = JSON.parse(await fs.readFile(path.resolve(dir, cfg.glossary), 'utf8'));
const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const problems = [];
const seen = new Set();
for (const p of pages) {
  if (!/^D\d{2}$/.test(p.id)) problems.push(`${p.id}：页面编号应为 Dxx`);
  if (seen.has(p.id)) problems.push(`${p.id}：编号重复`);
  seen.add(p.id);
  for (const k of ['section', 'title', 'transition', 'question', 'mode', 'footer']) if (!p[k]) problems.push(`${p.id}：缺少 ${k}`);
  for (const k of ['purpose', 'guide', 'mechanism']) if (!p.notes?.[k]) problems.push(`${p.id}：备注缺少 ${k}`);
  if (['prototype','implemented'].includes(p.status) && !cfg.bodies[p.id]) problems.push(`${p.id}：标为 prototype 但没有登记组件`);
}
for (const [k, e] of Object.entries(cfg.deck?.entries || {})) if (!seen.has(e.page)) problems.push(`入口 ${k} 指向不存在的页 ${e.page}`);
for (const p of pages) for (const t of p.through_links || []) if (!seen.has(t)) problems.push(`${p.id}：贯穿链接指向不存在的页 ${t}`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const slides = pages.map((p) => {
  const tag = ['prototype','implemented'].includes(p.status) ? cfg.bodies[p.id] : null;
  const body = tag ? `<${tag}></${tag}>` : `<planned-page page-id="${esc(p.id)}"></planned-page>`;
  const notes = `目的：${p.notes.purpose}\n范例引导：${p.notes.guide}\n机制背景：${p.notes.mechanism}`;
  const kicker = `${p.id} / ${/^\d/.test(p.section) ? '教案 ' + p.section : p.section}`;
  return `<deck-slide slide-id="${esc(p.id)}" data-status="${esc(p.status)}" kicker="${esc(kicker)}" header-title="${esc(p.title)}" transition="${esc(p.transition)}" theme="${esc(p.theme || 'light')}" layout="${esc(p.layout || 'normal')}" mode="${esc(p.mode)}" notes="${esc(notes)}">${body}<div slot="footer">${esc(p.footer)}</div></deck-slide>`;
});

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.title)}</title>
<link rel="stylesheet" href="deck.css">
<script src="data/data.js"></script>
${(cfg.scripts || ['deck-core.js']).map((f) => `<script src="${esc(f)}"></script>`).join('\n')}
</head><body><div id="app"></div>
<!-- 由 assemble-prototype.mjs 依 page-map.json 生成；请改页表后重新生成，不要直接改这里。 -->
<template id="deck-template"><deck-container>
${slides.join('\n')}
</deck-container></template>
</body></html>
`;
await fs.mkdir(path.join(dir, 'data'), { recursive: true });
await fs.writeFile(path.join(dir, 'index.html'), html);
await fs.writeFile(path.join(dir, 'data', 'data.js'), `// 由 assemble-prototype.mjs 生成\nwindow.DECK_DATA = ${JSON.stringify({ pages, glossary, deck: cfg.deck || {} })};\n`);
const built = pages.filter((p) => ['prototype','implemented'].includes(p.status)).map((p) => p.id);
console.log(`共 ${pages.length} 页；已实现 ${built.length} 页：${built.join('、')}；其余为规划占位页。`);
