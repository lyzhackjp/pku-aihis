import fs from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "site");
const html = await fs.readFile(path.join(site, "week03/index.html"), "utf8");
const pages = JSON.parse(await fs.readFile(path.join(site, 'week03/assets/data/pages.json')));
const pageMap = JSON.parse(await fs.readFile(path.join(root, 'docs/week03/page-map.json')));
const slideIDs = [...html.matchAll(/<deck-slide\b[^>]*slide-id="([^"]+)"/g)].map(m => m[1]);
assert.equal(slideIDs.length, 29);
assert.equal(new Set(slideIDs).size, slideIDs.length);
assert.deepEqual(slideIDs, pages.map(p => p.id));
assert.deepEqual(slideIDs, pageMap.map(p => p.id));
assert.deepEqual([...html.matchAll(/<tool-family demo-id="([^"]+)"/g)].map(m => m[1]), ['D14', 'D15', 'D18']);
const c = JSON.parse(
  await fs.readFile(path.join(site, "week03/assets/data/corpus.json")),
);
assert.equal(c.records.length, 27);
assert(
  c.records.every(
    (x) => x.vector.length === 384 && x.vector.every(Number.isFinite),
  ),
);
assert(c.queries.every((x) => x.vector.length === 384));
const m = JSON.parse(
  await fs.readFile(path.join(site, "week03/assets/data/multimodal.json")),
);
assert.equal(m.kuzushi.items.length, 48);
assert(m.kuzushi.items.every((x) => x.vector.length === 768));
assert.equal(m.pages.items.length, 7);
assert(m.pages.items.every((x) => x.vector.length === 512));
assert(new Set(m.kuzushi.items.map((x) => x.label)).size > 2);
const manifest = JSON.parse(
  await fs.readFile(path.join(site, "release-manifest.json")),
);
assert(
  manifest.files.every(
    (x) =>
      !x.path.includes("node_modules") &&
      !x.path.includes("model_quantized") &&
      !x.path.endsWith(".map"),
  ),
);
for (const row of manifest.files) {
  if (/\.(json|html|md|m?js|ts|tsx)$/.test(row.path)) {
    const s = await fs.readFile(path.join(site, row.path), "utf8");
    assert(!s.includes("/Users/"), `private path in ${row.path}`);
  }
}
for (const d of [...c.records, ...m.pages.items, ...m.kuzushi.items])
  if (d.image) await fs.access(path.join(site, "week03", d.image));
console.log(
  "29 pages, matching maps, source locators, vector dimensions, assets and public paths checked",
);
const examples = JSON.parse(
  await fs.readFile(
    path.join(site, "week03/assets/data/model-examples.json"),
    "utf8",
  ),
);
const required = [
  "D13",
  "D14",
  "D21",
  "D23",
  "D24",
  "D25",
  "D26",
  "D27",
  "D28",
  "D29",
  "D30",
];
for (const id of required)
  assert(
    examples.examples.some((e) => e.demo_id === id),
    `Missing actual model example ${id}`,
  );
for (const model of ["gemma3:4b", "qwen3-vl:4b-instruct-q4_K_M"]) {
  const images = examples.examples.filter(e => e.demo_id === "D30" && e.response.model === model);
  assert.equal(images.length, 7);
  assert.equal(new Set(images.map(e => e.image_id)).size, 7);
}
for (const e of examples.examples) {
  assert(
    e.response.provider === "local" && e.response.parameters <= 10_000_000_000,
  );
  assert(
    e.response.digest &&
      e.response.finish_reason === "stop" &&
      e.response.text.trim(),
  );
  assert(e.corpus_sha256 === examples.corpus_sha256);
  assert(e.context_ids.every((id) => c.records.some((d) => d.id === id)));
  assert(!JSON.stringify(e).includes("TEST_ONLY_"));
  if (e.demo_id === "D24")
    assert(e.trace.some((t) => t.event === "tool_result" && t.tool === "read"));
}
console.log(
  "Actual local model examples, <=10B parameters, seven image descriptions and trace provenance checked",
);
const manifest4=JSON.parse(await fs.readFile(path.join(site,'release-manifest.json')));
if (manifest4.weeks?.includes('week04')) {
  const html4=await fs.readFile(path.join(site,'week04/index.html'),'utf8');
  const map4=JSON.parse(await fs.readFile(path.join(root,'docs/week04/page-map.json'),'utf8'));
  const ids4=[...html4.matchAll(/slide-id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids4,map4.map(p=>p.id));
  assert.equal(ids4.length,32);
  for(const name of ['patchouli-LICENSE.txt','patchouli-manifest.json','SOURCE.txt','corresponding-source/core-probe/Program.cs'])
    assert((await fs.readFile(path.join(site,'week04/assets/licenses',name))).length>0);
  const seed4=JSON.parse(await fs.readFile(path.join(site,'week04/assets/seed/native-seed.json')));
  assert.equal(seed4.rows.items,4);assert.equal(seed4.rows.pages,353);assert.equal(seed4.pdfs.length,4);
  const {createHash}=await import('node:crypto');
  for(const e of [seed4.database,...seed4.pdfs]) {
    const bytes=await fs.readFile(path.join(site,'week04/assets/seed',e.path));
    assert.equal(bytes.length,e.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256);
  }
  const ocr=JSON.parse(await fs.readFile(path.join(site,'week04/assets/ocr/models.json')));
  assert.deepEqual(manifest4.files.map(f=>f.path.replaceAll('\\','/')).filter(p=>/\.onnx$/i.test(p)).sort(),ocr.models.map(m=>'week04/assets/ocr/'+m.file).sort());
  for(const model of ocr.models)assert.equal(createHash('sha256').update(await fs.readFile(path.join(site,'week04/assets/ocr',model.file))).digest('hex'),model.sha256);
  const seedPaths=['native-seed.json',seed4.database.path,...seed4.pdfs.map(p=>p.path)].map(p=>'week04/assets/seed/'+p).sort();
  assert.deepEqual(manifest4.files.map(f=>f.path.replaceAll('\\','/')).filter(p=>p.startsWith('week04/assets/seed/')).sort(),seedPaths);
  assert.deepEqual(manifest4.files.map(f=>f.path.replaceAll('\\','/')).filter(p=>/\.pdf$/i.test(p)).sort(),seed4.pdfs.map(p=>'week04/assets/seed/'+p.path).sort());
  console.log('Week04: native SQLite, 353 pages and four verified PDFs');
}

assert(manifest4.files.every(f=>!/(^|\/)(local-only|private|inputs)(\/|$)/.test(f.path)));
assert(!manifest4.files.some(f=>/field-agent|native-field-agent|field-agent-contract/.test(f.path)));
if(manifest4.tools?.includes('material-importer')){
 const importer=await fs.readFile(path.join(site,'material-importer/index.html'),'utf8');
 assert(importer.includes('/pku-aihis/material-importer/assets/'));
 assert(!/src=["']\/assets\//.test(importer));
 console.log('Universal importer subpath and private/Agent exclusions checked');
}

if (manifest4.weeks?.includes('week05')) {
  const html5 = await fs.readFile(path.join(site,'week05/index.html'),'utf8');
  const map5 = JSON.parse(await fs.readFile(path.join(root,'docs/week05/page-map.json'),'utf8'));
  assert.deepEqual([...html5.matchAll(/slide-id="([^"]+)"/g)].map(m=>m[1]), map5.map(p=>p.id));
  assert.equal(map5.length,24);
  const sources5 = JSON.parse(await fs.readFile(path.join(site,'week05/assets/materials/sources.json'),'utf8'));
  assert.deepEqual(sources5.map(s=>s.id),['shide','acton','ogai']);
  assert(sources5.every(s=>!s.private && s.paragraphs.every(p=>p.locator && p.text)));
  const files5 = manifest4.files.filter(f=>f.path.startsWith('week05/'));
  assert(!files5.some(f=>/\.(pdf|zip|sqlite|db|onnx|safetensors|typ)$/i.test(f.path)));
  const importer5 = await fs.readFile(path.join(site,'week05/assets/importer/index.html'),'utf8');
  assert(importer5.includes('./assets/'));
  for (const required of ['assets/revision/services.mjs','assets/revision/graph-query.mjs','assets/revision/blackboard.mjs','assets/revision/precomputed.json','assets/revision/api-examples.json','assets/vendor/transformers/ort-wasm-simd-threaded.jsep.wasm'])
    await fs.access(path.join(site,'week05',required));
  const figures5 = JSON.parse(await fs.readFile(path.join(site,'week05/assets/revision/figures/manifest.json'),'utf8'));
  const {createHash}=await import('node:crypto');
  for (const fig of figures5) assert.equal(createHash('sha256').update(await fs.readFile(path.join(site,'week05/assets/revision/figures',fig.file))).digest('hex'),fig.sha256);
  const home = await fs.readFile(path.join(site,'index.html'),'utf8');
  assert(home.includes('href="week05/"') && home.includes('第五周 · 知识库检索与有依据的生成'));
  console.log('Week05: 24 pages (D05, D07 merged), public excerpt identities, embedded importer, WASM and figure hashes; no teacher originals or model weights');
}

if (manifest4.weeks?.includes('week06')) {
  const week = path.join(site, 'week06');
  const html6 = await fs.readFile(path.join(week, 'index.html'), 'utf8');
  const map6 = JSON.parse(await fs.readFile(path.join(root, 'docs/week06/page-map.json'), 'utf8'));
  assert.deepEqual([...html6.matchAll(/slide-id="([^"]+)"/g)].map(m => m[1]), map6.map(p => p.id));
  assert.equal(map6.length, 25);
  assert.deepEqual(map6.find(p => p.id === 'D12').aliases, ['D13']);
  const files6 = manifest4.files.filter(f => f.path.startsWith('week06/'));
  assert(!files6.some(f => /\.(pdf|zip|sqlite|db|onnx|safetensors|pt|pth|ckpt|bin|typ)$/i.test(f.path)));
  const {createHash} = await import('node:crypto');
  const sources6 = JSON.parse(await fs.readFile(path.join(week, 'assets/materials/sources.json'), 'utf8'));
  for (const source of sources6) {
    if (source.public === false) assert(!source.file && !source.sha256, `Private source ${source.id}`);
    if (source.file) {
      assert.equal(source.public, true);
      assert.equal(createHash('sha256').update(await fs.readFile(path.join(week, 'assets/materials', source.file))).digest('hex'), source.sha256);
    }
  }
  const importer6 = await fs.readFile(path.join(week, 'assets/importer/index.html'), 'utf8');
  assert(importer6.includes('./assets/'));
  assert(!importer6.includes('/pku-aihis/material-importer/assets/'));
  for (const required of ['preflight.html', 'assets/runtime/v5/index.js', 'assets/runtime/material-import.js',
    'assets/materials/kraken-d04/index.json', 'assets/materials/shide-1926-ndl-default-record.json.gz',
    'assets/materials/shide-1926-default-record.json.gz', 'assets/materials/shide-1926-dots-default-record.json.gz'])
    await fs.access(path.join(week, required));
  const {gunzipSync} = await import('node:zlib');
  const publicPage = sources6.find(s => s.id === 'shide_public');
  for (const file of ['shide-1926-ndl-default-record.json.gz', 'shide-1926-default-record.json.gz', 'shide-1926-dots-default-record.json.gz']) {
    const record = JSON.parse(gunzipSync(await fs.readFile(path.join(week, 'assets/materials', file))));
    assert.equal(record.image.sha256, publicPage.sha256);
    assert.equal(record.image.local_only, false);
    assert(record.engine.version && record.engine.date && record.regions.length > 0);
  }
  const home = await fs.readFile(path.join(site, 'index.html'), 'utf8');
  assert(home.includes('href="week06/"') && home.includes('第六周 · 文从何来'));
  console.log('Week06: 25 pages and D13 alias, public source hashes, saved replays, embedded importer and preflight; no teacher originals, ZIPs or model weights');
}
if (manifest4.weeks?.includes('week07')) {
  const week = path.join(site, 'week07');
  const html7 = await fs.readFile(path.join(week, 'index.html'), 'utf8');
  const map7 = JSON.parse(await fs.readFile(path.join(root, 'docs/week07/page-map.json'), 'utf8'));
  assert.equal(map7.length, 30);
  assert.deepEqual([...html7.matchAll(/<deck-slide\b[^>]*slide-id="([^"]+)"/g)].map(m => m[1]), map7.map(p => p.id));
  assert.deepEqual(map7.find(p => p.id === 'D12').aliases, ['D13']);
  assert.deepEqual(map7.find(p => p.id === 'D14').aliases, ['D15']);
  const files7 = manifest4.files.filter(f => f.path.startsWith('week07/'));
  assert(!files7.some(f => /\.(pdf|zip|sqlite|db|onnx|safetensors|gguf|pt|pth|ckpt|bin|typ)$/i.test(f.path) || f.path.endsWith('week07-pack.json')));
  assert.deepEqual(files7.filter(f => f.path.endsWith('.whl')).map(f => f.path), ['week07/live/vendor/langextract-1.7.1+3a68580-py3-none-any.whl']);
  const pub7 = await fs.readFile(path.join(week, 'data/public/week07-public-pack.js'), 'utf8');
  for (const marker of ['PersonAuthority', 'cbdbapi', 'BasicInfo', 'c_personid', 'PersonKinshipInfo']) assert(!pub7.includes(marker), 'CBDB in public pack: ' + marker);
  const importer7 = await fs.readFile(path.join(week, 'importer/index.html'), 'utf8');
  assert(importer7.includes('./assets/') && !importer7.includes('/pku-aihis/material-importer/assets/'));
  const home = await fs.readFile(path.join(site, 'index.html'), 'utf8');
  assert(home.includes('href="week07/"') && home.includes('第七周 · 条目重构、实体识别与结构化输出'));
  console.log('Week07: 30 pages with D13/D15 aliases, public pack without CBDB, LangExtract wheel, embedded importer; no material pack, model weights or keys');
}
