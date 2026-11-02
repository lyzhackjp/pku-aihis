// 第八周发布产物检查（在 pnpm build 之后运行；照第七周 check-delivery.mjs）。
// 可选：WEEK08_LOCAL_PACK=<week08-pack.json> 时，再逐文件比对本机材料包中的 CBDB 出处与日记录文片段，确认未进入构建。
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pageIds, scriptIds, slideIds, walk, loadScript, PRIVATE_MARKERS} from './lib.mjs';
const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), built = path.join(app, 'www/pku-aihis/week08');
const map = await pageIds(root);
assert.equal(map.length, 26);
assert.deepEqual(await scriptIds(built), map); assert.deepEqual(await slideIds(built), map);
for (const need of ['data/public/week08-public-pack.js', 'live/w8-live.js', 'live/browser-worker.js', 'live/models.js', 'week08.css', ...(process.env.WEEK08_SKIP_IMPORTER === '1' ? [] : ['importer/index.html'])]) await fs.access(path.join(built, need));
const pub = await loadScript(path.join(built, 'data/public/week08-public-pack.js'), 'W8_PUBLIC_PACK');
assert.ok(pub && pub.materials && !pub.materials['cbdb-wanggui'] && !pub.materials.meishi, '公开包含本机材料');
for (const k of ['toy7', 'padgett', 'wang2022-shenzong', 'wang2022-reform', 'chengning-t2']) assert.ok(pub.materials[k], '公开包缺 ' + k);
const files = await walk(built);
for (const f of files) {
  const rel = path.relative(built, f);
  assert.ok(!/\.(onnx|safetensors|gguf|pt|pth|ckpt|bin|zip|tgz|typ|py|pdf|docx|png)$/i.test(f) || rel.startsWith('importer' + path.sep), '不应公开：' + rel);
  assert.ok(path.basename(f) !== 'week08-pack.json' && !rel.split(path.sep).includes('local-only'), '本机材料包进入构建');
  if (/\.(m?js|json|html|css|txt|md)$/.test(f) && !rel.startsWith('importer' + path.sep)) {
    const t = await fs.readFile(f, 'utf8');
    assert.ok(!t.includes('/Users/'), '本机路径：' + rel);
    assert.ok(!/sk-[A-Za-z0-9]{24,}/.test(t), '疑似密钥：' + rel);
    if (rel.startsWith('data' + path.sep)) for (const m of PRIVATE_MARKERS) assert.ok(!t.includes(m), `本机材料标记 ${m} 在 ${rel}`);
  }
}
let privateScan = 'skipped: WEEK08_LOCAL_PACK not set';
if (process.env.WEEK08_LOCAL_PACK) {
  const pack = JSON.parse(await fs.readFile(process.env.WEEK08_LOCAL_PACK, 'utf8'));
  const chunks = [...pack.materials['cbdb-wanggui'].edges.map(e => e.ref).filter(r => r && r.length > 12), ...pack.materials.meishi.passages.map(p => p.text.slice(0, 20))];
  for (const f of files) if (/\.(m?js|json|html)$/.test(f)) { const t = await fs.readFile(f, 'utf8'); for (const c of chunks) assert.ok(!t.includes(c), '本机材料片段进入构建：' + path.relative(built, f) + '：' + c); }
  privateScan = `passed (${chunks.length} fragments)`;
}
const report = {date: new Date().toISOString(), pages: map.length, publicFiles: files.length, localPack: 'classroom import only (CBDB, 梅颸日記, JBDB)', privateScan, weights: 'none', credentials: 'none detected'};
await fs.mkdir(path.join(root, 'docs/week08/verification'), {recursive: true});
await fs.writeFile(path.join(root, 'docs/week08/verification/public-build.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
