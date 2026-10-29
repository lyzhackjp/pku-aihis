// 第七周发布产物检查（在 pnpm build 之后运行）。全站白名单另由 scripts/check-public.mjs 检查。
// 可选：WEEK07_LOCAL_PACK=<week07-pack.json 路径> 时，再逐文件比对 CBDB 记录片段，确认未进入构建。
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pageIds, scriptIds, slideIds, walk, loadScript, CBDB_MARKERS} from './lib.mjs';

const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..');
const built = path.join(app, 'www/pku-aihis/week07');
const map = await pageIds(root);
assert.equal(map.length, 30);
assert.deepEqual(await scriptIds(built), map);
assert.deepEqual(await slideIds(built), map);
const pageMap = JSON.parse(await fs.readFile(path.join(root, 'docs/week07/page-map.json'), 'utf8'));
assert.deepEqual(pageMap.find(p => p.id === 'D12').aliases, ['D13']);
assert.deepEqual(pageMap.find(p => p.id === 'D14').aliases, ['D15']);

const html = await fs.readFile(path.join(built, 'index.html'), 'utf8');
assert.ok(!html.includes('原型'), '标题仍写“原型”');
for (const need of ['data/public/week07-public-pack.js', 'live/w7-live.js', 'live/browser-worker.js', 'live/lx-worker.js',
  'live/vendor/api.mjs', 'live/vendor/api-presets.json', 'live/vendor/LICENSE.langextract', 'importer/index.html'])
  await fs.access(path.join(built, need));
const wheels = (await fs.readdir(path.join(built, 'live/vendor'))).filter(f => f.endsWith('.whl'));
assert.deepEqual(wheels, ['langextract-1.7.1+3a68580-py3-none-any.whl']);
const importer = await fs.readFile(path.join(built, 'importer/index.html'), 'utf8');
assert.ok(importer.includes('./assets/') && !importer.includes('/pku-aihis/material-importer/assets/'));

const pub = await loadScript(path.join(built, 'data/public/week07-public-pack.js'), 'W7_PUBLIC_PACK');
assert.ok(pub && !('cbdb' in pub), '公开包含 cbdb');
assert.ok(pub.texts && pub.ndl && pub.hipe && pub.calendar, '公开包缺材料');

const files = await walk(built);
for (const f of files) {
  const rel = path.relative(built, f);
  assert.ok(!/\.(onnx|safetensors|gguf|pt|pth|ckpt|bin|zip|tgz|typ|py|pdf|docx)$/i.test(f), '不应公开：' + rel);
  assert.ok(path.basename(f) !== 'week07-pack.json' && !rel.split(path.sep).includes('local-only'), '本机材料包进入构建');
  if (/\.(m?js|json|html|css|txt|md)$/.test(f)) {
    const t = await fs.readFile(f, 'utf8');
    assert.ok(!t.includes('/Users/'), '本机路径：' + rel);
    assert.ok(!/sk-[A-Za-z0-9]{24,}/.test(t), '疑似密钥：' + rel);
    if (rel.startsWith('data' + path.sep)) for (const m of CBDB_MARKERS) assert.ok(!t.includes(m), `CBDB 标记 ${m} 在 ${rel}`);
  }
}

let privateScan = 'skipped: WEEK07_LOCAL_PACK not set';
if (process.env.WEEK07_LOCAL_PACK) {
  const pack = JSON.parse(await fs.readFile(process.env.WEEK07_LOCAL_PACK, 'utf8'));
  const chunks = Object.values(pack.cbdb.persons || {}).map(p => JSON.stringify(p)).filter(s => s.length > 400).map(s => s.slice(150, 350));
  assert.ok(chunks.length > 0);
  for (const f of files) if (/\.(m?js|json|html)$/.test(f)) {
    const t = await fs.readFile(f, 'utf8');
    for (const c of chunks) assert.ok(!t.includes(c), 'CBDB 记录片段进入构建：' + path.relative(built, f));
  }
  privateScan = `passed (${chunks.length} CBDB records)`;
}
const report = {date: new Date().toISOString(), pages: map.length, aliases: {D13: 'D12', D15: 'D14'}, publicFiles: files.length, cbdb: 'classroom import only', privateScan, weights: 'none', credentials: 'none detected'};
await fs.mkdir(path.join(root, 'docs/week07/verification'), {recursive: true});
await fs.writeFile(path.join(root, 'docs/week07/verification/public-build.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
