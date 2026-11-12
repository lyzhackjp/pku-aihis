// 第九周发布产物检查（在 pnpm build 之后运行；照第八周 check-delivery.mjs）。
// 可选：WEEK09_LOCAL_PACK=<week09-pack.json> 时，再逐文件比对本机材料包里的录文与回答片段，确认未进入构建。
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pageIds, scriptIds, slideIds, walk, loadScript, PRIVATE_MARKERS} from './lib.mjs';
const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), built = path.join(app, 'www/pku-aihis/week09');
const map = await pageIds(root);
assert.equal(map.length, 28);
assert.deepEqual(await scriptIds(built), map); assert.deepEqual(await slideIds(built), map);
for (const need of ['data/w09-public.js', 'data/w09-cards.js', 'live/w9-live.js', 'live/vendor/api.mjs', 'w09.css', 'w09-lib.js', ...(process.env.WEEK09_SKIP_IMPORTER === '1' ? [] : ['importer/index.html'])]) await fs.access(path.join(built, need));
const pub = await loadScript(path.join(built, 'data/w09-public.js'), 'W9_PUBLIC');
assert.ok(pub && Array.isArray(pub.packs) && pub.packs.length === 4, '公开包应有四个史料包');
assert.deepEqual(pub.replays, [], '公开包不得带运行记录');
const entries = pub.packs.flatMap(p => p.entries);
for (const e of entries) {
  if (e.sendable === false) assert.ok(!e.text, '不可送模型的条目不得带原文：' + e.id);
  if (e.visibility === '本机材料包') assert.ok(!e.text, '本机材料包条目的原文进入公开包：' + e.id);
}
assert.ok(entries.filter(e => e.id.startsWith('zhang-')).every(e => !e.text), '章太炎全集录文不公开');
for (const id of ['liang-wenye', 'liang-xindalu', 'inoue-1912-p82', 'inoue-1918-p83', 'datsuaron-genpo']) assert.ok(entries.find(e => e.id === id)?.text, '公开包缺 ' + id);
const files = await walk(built);
for (const f of files) {
  const rel = path.relative(built, f);
  assert.ok(!/\.(onnx|safetensors|gguf|pt|pth|ckpt|bin|zip|tgz|typ|py|pdf|docx|png|jpe?g|env)$/i.test(f) || rel.startsWith('importer' + path.sep), '不应公开：' + rel);
  assert.ok(path.basename(f) !== 'week09-pack.json' && !rel.split(path.sep).includes('local-only'), '本机材料包进入构建');
  if (/\.(m?js|json|html|css|txt|md)$/.test(f) && !rel.startsWith('importer' + path.sep)) {
    const t = await fs.readFile(f, 'utf8');
    assert.ok(!t.includes('/Users/'), '本机路径：' + rel);
    assert.ok(!/sk-[A-Za-z0-9]{24,}/.test(t), '疑似密钥：' + rel);
    for (const m of PRIVATE_MARKERS) assert.ok(!t.includes(m), `本机材料标记 ${m} 在 ${rel}`);
  }
}
let privateScan = 'skipped: WEEK09_LOCAL_PACK not set';
if (process.env.WEEK09_LOCAL_PACK) {
  const pack = JSON.parse(await fs.readFile(process.env.WEEK09_LOCAL_PACK, 'utf8'));
  const pubText = entries.map(e => e.text || '').join('\n');
  const chunks = [...(pack.packs || []).flatMap(p => p.entries).map(e => (e.text || '').slice(0, 24)).filter(x => x.length >= 24 && !pubText.includes(x)),
    ...(pack.replays || []).map(r => (r.reply || '').slice(0, 24)).filter(x => x.length >= 24 && !pubText.includes(x))];
  for (const f of files) if (/\.(m?js|json|html)$/.test(f)) { const t = await fs.readFile(f, 'utf8'); for (const c of chunks) assert.ok(!t.includes(c), '本机材料片段进入构建：' + path.relative(built, f) + '：' + c); }
  privateScan = `passed (${chunks.length} fragments)`;
}
const report = {date: new Date().toISOString(), pages: map.length, publicFiles: files.length, localPack: 'classroom import only（《章太炎全集》录文、课前运行记录、网页版记录、Neuronpedia 截图）', privateScan, weights: 'none', credentials: 'none detected'};
await fs.mkdir(path.join(root, 'docs/week09/verification'), {recursive: true});
await fs.writeFile(path.join(root, 'docs/week09/verification/public-build.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
