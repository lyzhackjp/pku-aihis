#!/usr/bin/env node
// 从 Typst 讲义抽出做页表所需的骨架：节与时长、图（标签与图注）、#term 概念、#grasp 理解要求、
// 课堂练习（“请同学……”段）、#src 出处、#note 备注。只读，不改讲义。
// 用法：node outline-lesson.mjs 讲义.typ [--json]
import fs from 'node:fs/promises';

const [, , file, flag] = process.argv;
if (!file) { console.error('用法：node outline-lesson.mjs 讲义.typ [--json]'); process.exit(2); }
const lines = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n').split('\n');
const strip = (s) => s.replace(/#(?:term|hei|song)\[([^\]]*)\]/g, '$1').replace(/#link\("[^"]*"\)\[([^\]]*)\]/g, '$1').replace(/\s+/g, ' ').trim();
const minutes = (s) => +(s.match(/（(\d+)分钟）/)?.[1] || 0);

const out = { title: '', sections: [] };
let sec = null, sub = null, figure = null, depth = 0;
const target = () => sub || sec;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const t = line.match(/^#let lesson-title = "(.*)"/); if (t) out.title = t[1];
  const h1 = line.match(/^= (.+)$/) || line.match(/^#heading\(level: 1[^)]*\)\[(.+)\]$/);
  const h2 = line.match(/^== (.+)$/);
  if (h1) { sec = { heading: strip(h1[1]), minutes: minutes(h1[1]), subs: [], figures: [], terms: [], grasp: [], exercises: [], sources: 0, notes: 0, line: i + 1 }; sub = null; out.sections.push(sec); continue; }
  if (h2 && sec) { sub = { heading: strip(h2[1]), minutes: minutes(h2[1]), figures: [], terms: [], grasp: [], exercises: [], sources: 0, notes: 0, line: i + 1 }; sec.subs.push(sub); continue; }
  const node = target(); if (!node) continue;
  for (const m of line.matchAll(/#term\[([^\]]+)\]/g)) node.terms.push(m[1]);
  if (line.startsWith('#grasp[')) node.grasp.push(strip(line.slice(7).replace(/\]$/, '')));
  if (line.startsWith('#src[')) node.sources++;
  if (line.startsWith('#note[')) node.notes++;
  if (/^请同学|请同学.{0,30}（\d+ ?分钟）/.test(line)) node.exercises.push(strip(line).slice(0, 160));
  if (line.startsWith('#figure(')) { figure = { caption: '', label: '', line: i + 1 }; depth = 1; continue; }
  if (figure) {
    const c = line.match(/caption: \[(.*)\],?$/); if (c) figure.caption = strip(c[1]);
    const l = line.match(/^\) <([^>]+)>/); if (l) { figure.label = l[1]; node.figures.push(figure); figure = null; }
  }
}
if (flag === '--json') { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
console.log(`# ${out.title || file}\n`);
let total = 0;
for (const s of out.sections) {
  const m = s.minutes || s.subs.reduce((n, x) => n + x.minutes, 0); total += m;
  console.log(`## ${s.heading}${m ? `（共 ${m} 分）` : ''}　[讲义第 ${s.line} 行]`);
  for (const n of [s, ...s.subs]) {
    if (n !== s) console.log(`### ${n.heading}　[第 ${n.line} 行]`);
    if (n.terms.length) console.log(`- 概念：${[...new Set(n.terms)].join('、')}`);
    for (const f of n.figures) console.log(`- 图 @${f.label}：${f.caption.slice(0, 90)}`);
    for (const e of n.exercises) console.log(`- 练习：${e}`);
    for (const g of n.grasp) console.log(`- 理解到：${g.slice(0, 90)}`);
    if (n.sources) console.log(`- 出处块 ${n.sources} 个；备注 ${n.notes} 个`);
  }
  console.log('');
}
console.log(`标注时长合计约 ${total} 分钟。`);
