// 第十周发布产物检查（在 pnpm build 之后运行；照第九周 check-delivery.mjs）。
// 可选：WEEK10_LOCAL_PACK=<week10-pack.json> 时，再逐文件比对本机材料包里的录文、回答、本课判定与草案表片段，确认未进入构建。
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pageIds, scriptIds, slideIds, walk, loadScript, PRIVATE_MARKERS, PUBLIC_SHORT_QUOTES} from './lib.mjs';
const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), built = path.join(app, 'www/pku-aihis/week10');
const map = await pageIds(root);
assert.equal(map.length, 23);
assert.deepEqual(await scriptIds(built), map); assert.deepEqual(await slideIds(built), map);
for (const need of ['data/w10-public.js', 'data/w10-cards.js', 'data/w10-static.js', 'live/w10-live.js', 'live/vendor/api.mjs', 'w10.css', 'w10-lib.js', 'w10-labs5.js',
  ...(process.env.WEEK10_SKIP_IMPORTER === '1' ? [] : ['importer/index.html'])]) await fs.access(path.join(built, need));
const pub = await loadScript(path.join(built, 'data/w10-public.js'), 'W10_PUBLIC');
assert.ok(pub && Array.isArray(pub.packs), '公开包格式');
assert.deepEqual(pub.replays, [], '公开包不得带运行记录');
const entries = pub.packs.flatMap(p => p.entries);
for (const e of entries) {
  if (e.sendable === false) assert.ok(!e.text, '不可送模型的条目不得带原文：' + e.id);
  if (e.visibility === '本机材料包') assert.ok(!e.text, '本机材料包条目的原文进入公开包：' + e.id);
}
for (const id of ['mao-history', 'mao-conclusion', 'inada-chronology-1890', 'inada-pp3-4', 'inoue-kaigo-draft', 'inoue-letter-0620']) assert.ok(!entries.find(e => e.id === id)?.text, '教师材料不公开：' + id);
for (const id of ['ems-a', 'ems-b', 'chokugo-seibun']) assert.ok(entries.find(e => e.id === id)?.text, '公开包缺 ' + id);
const files = await walk(built);
for (const f of files) {
  const rel = path.relative(built, f);
  assert.ok(!/\.(onnx|safetensors|gguf|pt|pth|ckpt|bin|zip|tgz|typ|py|pdf|docx|png|jpe?g|env)$/i.test(f) || rel.startsWith('importer' + path.sep), '不应公开：' + rel);
  assert.ok(path.basename(f) !== 'week10-pack.json' && !rel.split(path.sep).includes('local-only'), '本机材料包进入构建');
  if (/\.(m?js|json|html|css|txt|md)$/.test(f) && !rel.startsWith('importer' + path.sep)) {
    const t = await fs.readFile(f, 'utf8');
    assert.ok(!t.includes('/Users/'), '本机路径：' + rel);
    assert.ok(!/sk-[A-Za-z0-9]{24,}/.test(t), '疑似密钥：' + rel);
    for (const m of PRIVATE_MARKERS) assert.ok(!t.includes(m), `本机材料标记 ${m} 在 ${rel}`);
  }
}
let privateScan = 'skipped: WEEK10_LOCAL_PACK not set';
if (process.env.WEEK10_LOCAL_PACK) {
  const pack = JSON.parse(await fs.readFile(process.env.WEEK10_LOCAL_PACK, 'utf8'));
  const squash = (s) => String(s || '').replace(/\s+/g, '');
  const pubText = squash(entries.map(e => e.text || '').join('\n') + PUBLIC_SHORT_QUOTES.join('\n'));
  const cut = (s, n, step) => { const t = squash(s), o = []; for (let i = 0; i + n <= t.length; i += step) o.push(t.slice(i, i + n)); return o; };
  const chunks = [...(pack.packs || []).flatMap(p => p.entries).flatMap(e => cut(e.text, 24, 200)),
    ...(pack.replays || []).flatMap(r => cut(r.reply, 24, 400)),
    ...Object.values(pack.refs || {}).flatMap(r => cut(JSON.stringify(r), 24, 300)),
    ...((pack.drafts && pack.drafts.rows) || []).flatMap(r => cut(r.holder, 24, 100))].filter(x => !pubText.includes(x));
  for (const f of files) if (/\.(m?js|json|html)$/.test(f) && !path.relative(built, f).startsWith('importer' + path.sep)) { const t = squash(await fs.readFile(f, 'utf8')); for (const c of chunks) assert.ok(!t.includes(c), '本机材料片段进入构建：' + path.relative(built, f) + '：' + c); }
  privateScan = `passed (${chunks.length} fragments)`;
}
const report = {date: new Date().toISOString(), pages: map.length, publicFiles: files.length,
  localPack: 'classroom import only（茅海建、稲田、井上草案与书翰录文，课前运行与网页版记录，本课判定，草案表）', privateScan, weights: 'none', credentials: 'none detected'};
await fs.mkdir(path.join(root, 'docs/week10/verification'), {recursive: true});
await fs.writeFile(path.join(root, 'docs/week10/verification/public-build.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
