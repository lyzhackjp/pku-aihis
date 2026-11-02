// 第八周源码级测试（不需构建、不需浏览器）。浏览器验收见 scripts/verify_week08.py。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {pageIds, scriptIds, slideIds, loadScript, PRIVATE_MARKERS} from '../scripts/lib.mjs';

const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), proto = path.join(app, 'prototype');
const read = f => fs.readFile(path.join(proto, f), 'utf8');

test('26 页：page-map、data.js、index.html 一致', async () => {
  const map = await pageIds(root);
  assert.equal(map.length, 26);
  assert.deepEqual(await scriptIds(proto), map);
  assert.deepEqual(await slideIds(proto), map);
});

test('公开材料包不含本机材料（CBDB、梅颸日記、JBDB）', async () => {
  const raw = await read('data/public/week08-public-pack.js');
  for (const m of PRIVATE_MARKERS) assert.ok(!raw.includes(m), m);
  const pack = await loadScript(path.join(proto, 'data/public/week08-public-pack.js'), 'W8_PUBLIC_PACK');
  assert.ok(!pack.materials['cbdb-wanggui'] && !pack.materials.meishi);
  for (const m of Object.values(pack.materials)) for (const k of ['unit', 'edge_meaning', 'missing', 'time_precision', 'nature', 'license']) assert.ok(m.card?.[k], `${m.id} 缺 card.${k}`);
});

test('网络计算回归：七人小网介数、密度、聚类系数（讲义 @fig-betw、3.4）', async () => {
  const ctx = {window: {}, document: {addEventListener() {}, querySelectorAll: () => [], dispatchEvent() {}}, indexedDB: null, CustomEvent: class {}};
  ctx.window.Deck = {esc: s => String(s), store: {get: (k, d) => d, set() {}}, download() {}};
  ctx.window.addEventListener = () => {};
  vm.runInNewContext(await read('week08-core.js'), ctx);
  const W = ctx.window.W8;
  const pack = await loadScript(path.join(proto, 'data/public/week08-public-pack.js'), 'W8_PUBLIC_PACK');
  const g = W.graph(pack.materials.toy7, {directed: false}), b = W.betweenness(g), st = W.stats(g);
  assert.deepEqual(Object.fromEntries(g.nodes.map((n, i) => [n.id, b[i]])), {甲: 0, 乙: 0, 丙: 8, 丁: 9, 戊: 8, 己: 0, 庚: 0});
  assert.equal(st.density.toFixed(2), '0.38');
  assert.equal(st.cc[g.index.get('丙')].toFixed(2), '0.33');
  const pd = W.graph(pack.materials.padgett, {directed: false}), bp = W.betweenness(pd);
  assert.equal(bp[pd.index.get('Medici')], 47.5);
  // 程宁表 2：论文“编辑距离”栏等于 2×LCS／总字数
  for (const r of pack.materials['chengning-t2'].rows.filter(r => r.paper_edit != null)) assert.equal(W.lcsRatio(r.a, r.b).r.toFixed(2), r.paper_edit.toFixed(2), r.id);
});

test('输入法：合成期间不重绘，翻页键不拦截合成（沿用第七周 deck-core）', async () => {
  const deck = await read('deck-core.js');
  assert.match(deck, /compositionstart/); assert.match(deck, /isComposing/); assert.match(deck, /keyCode\s*===?\s*229/);
});

test('浏览器内模型：只登记 Qwen3 0.6B／4B、两种句向量；页面线程不导入模型线程脚本', async () => {
  const models = await read('live/models.js'), live = await read('live/w8-live.js');
  assert.deepEqual([...models.matchAll(/'(qwen3-[^']+)': \{ repo/g)].map(m => m[1]), ['qwen3-0.6b', 'qwen3-4b']);
  assert.deepEqual([...models.matchAll(/'([a-z-]+)': \{ repo: 'Xenova/g)].map(m => m[1]), ['bge-small-zh', 'minilm-multi']);
  assert.ok(!/from '\.\/browser-worker\.js/.test(live));
  assert.ok(!/localStorage\.setItem\([^)]*apiKey/.test(live));
});
