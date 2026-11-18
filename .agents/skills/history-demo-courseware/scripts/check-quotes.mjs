#!/usr/bin/env node
// 逐字核对阶段卡中的论文／文档原句：在已下载的原文（.html/.txt）里查找每条 paper.en。
// 用法：node check-quotes.mjs chapters.js|papers.json <原文目录> [--allow "部分原句开头"...]
// 原文先用 curl 抓到目录里（arXiv abs 或 html 版、官方文档页、教材在线版）。HTML 标签、多余空白、引号样式会归一化。
import fs from 'node:fs/promises';
import path from 'node:path';
const [file, dir, ...rest] = process.argv.slice(2);
if (!file || !dir) { console.error('Usage: check-quotes.mjs chapters.js|papers.json <source-dir> [--allow prefix...]'); process.exit(2); }
const allow = rest[0] === '--allow' ? rest.slice(1) : [];
let raw = await fs.readFile(file, 'utf8');
if (/W5_CHAPTERS|window\.\w+\s*=/.test(raw)) raw = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
const data = JSON.parse(raw);
const quotes = [];
(function walk(x, where) {
  if (Array.isArray(x)) return x.forEach((y, i) => walk(y, where + '[' + i + ']'));
  if (x && typeof x === 'object') {
    if (typeof x.en === 'string') quotes.push({ where, en: x.en, cite: x.cite || '' });
    for (const [k, v] of Object.entries(x)) if (k !== 'en') walk(v, where + '.' + k);
  }
})(data, '');
const norm = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/\u00ac/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s*\[\s*[\d,\s]+\]\s*/g, ' ').replace(/,,/g, ',').replace(/\s+/g, ' ')
  .replace(/\s([,.;:)])/g, '$1').replace(/\(\s/g, '(').trim();
let corpus = '';
for (const f of await fs.readdir(dir)) if (/\.(html?|txt|json)$/i.test(f)) corpus += ' ' + norm(await fs.readFile(path.join(dir, f), 'utf8'));
let miss = 0;
for (const q of quotes) {
  const parts = norm(q.en).split(/\s*…\s*|\s*\.\.\.\s*/).filter((p) => p.length > 8);
  const ok = parts.every((p) => corpus.includes(p.replace(/^"|"$/g, '')));
  const allowed = !ok && allow.some((a) => q.en.startsWith(a));
  if (!ok && !allowed) miss++;
  console.log(`${ok ? 'OK  ' : allowed ? 'NOTE' : 'MISS'} ${q.where}  ${q.en.slice(0, 70)}${allowed ? '  （已登记例外：注释须说明）' : ''}`);
}
console.log(`\n${quotes.length} quotes, ${miss} unverified`);
process.exit(miss ? 1 : 0);
