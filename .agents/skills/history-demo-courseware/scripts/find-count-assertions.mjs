#!/usr/bin/env node
// 合并或增删页面前，列出仓库里写死页数、页号序列或页面清单的位置。
// 用法：node find-count-assertions.mjs <repo> weekNN <当前页数> [被合并的页号...]
import fs from 'node:fs/promises';
import path from 'node:path';
const [repo, week, count, ...ids] = process.argv.slice(2);
if (!repo || !week || !count) { console.error('Usage: find-count-assertions.mjs <repo> weekNN <count> [Dxx...]'); process.exit(2); }
const skip = new Set(['node_modules', '.git', 'www', 'dist', 'site', 'build']);
const pats = [new RegExp(`\\b${count}\\s*(页|pages|slides|complete pages)`), new RegExp(`(length|count\\(\\)|\\.length)\\s*,\\s*${count}\\)`), new RegExp(`equal\\([^)]*,\\s*${count}\\)`), new RegExp(`i>=\\d+\\?i\\+1`), ...ids.map((d) => new RegExp(`['"#]${d}\\b`))];
const hits = [];
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (/\.(mjs|js|ts|tsx|json|md|yml|py)$/.test(e.name) && !/precomputed|api-examples|data\.js|sources\.js|lock/.test(e.name)) {
      const text = await fs.readFile(p, 'utf8');
      if (!text.includes(week) && !p.includes(week) && !/check-public|README/.test(p)) continue;
      text.split('\n').forEach((line, i) => { if (pats.some((r) => r.test(line))) hits.push(`${path.relative(repo, p)}:${i + 1}: ${line.trim().slice(0, 160)}`); });
    }
  }
}
await walk(repo);
console.log(hits.join('\n') || '未找到');
