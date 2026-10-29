// 第七周源码级测试（不需构建、不需浏览器）。浏览器验收见 scripts/verify_week07*.py。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pageIds, scriptIds, slideIds, loadScript, CBDB_MARKERS} from '../scripts/lib.mjs';

const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), proto = path.join(app, 'prototype');
const read = f => fs.readFile(path.join(proto, f), 'utf8');

test('30 页：page-map、data.js、index.html 一致', async () => {
  const map = await pageIds(root);
  assert.equal(map.length, 30);
  assert.deepEqual(await scriptIds(proto), map);
  assert.deepEqual(await slideIds(proto), map);
});

test('公开材料包不含 CBDB，含其余材料与出处', async () => {
  const pack = await loadScript(path.join(proto, 'data/public/week07-public-pack.js'), 'W7_PUBLIC_PACK');
  assert.ok(!('cbdb' in pack));
  for (const k of ['ndl', 'hipe', 'texts', 'calendar', 'teach', 'attribution']) assert.ok(pack[k], k);
  const raw = await read('data/public/week07-public-pack.js');
  for (const m of CBDB_MARKERS) assert.ok(!raw.includes(m), m);
});

test('CBDB 导入后显示引注', async () => {
  const core = await read('week07-core.js');
  assert.match(core, /CBDB BJ 20260602，CC BY-NC-SA 4\.0/);
  assert.match(core, /CBDB_PAGES = \[\s*'D01',\s*'D04',\s*'D07',\s*'D09',\s*'D12',\s*'D18'\s*\]/);
});

test('输入法：合成期间不重绘，翻页键不拦截合成', async () => {
  const deck = await read('deck-core.js');
  assert.match(deck, /compositionstart/);
  assert.match(deck, /compositionend/);
  assert.match(deck, /isComposing/);
  assert.match(deck, /keyCode\s*===?\s*229/);
});

test('密钥只留页面内存，不写入 localStorage', async () => {
  const live = await read('live/w7-live.js');
  assert.match(live, /week07-model-profiles-v1/);
  const sets = [...live.matchAll(/localStorage\.setItem\(([^;]+);/g)].map(m => m[1]);
  assert.ok(sets.length > 0);
  for (const s of sets) assert.ok(!/apiKey/.test(s) || /\(\{\s*apiKey\s*,/.test(s), '写入未剥离密钥：' + s);
});

test('LangExtract wheel 与许可随附', async () => {
  const files = await fs.readdir(path.join(proto, 'live/vendor'));
  assert.ok(files.includes('LICENSE.langextract'));
  assert.ok(files.includes('langextract-1.7.1+3a68580-py3-none-any.whl'));
});

test('浏览器内 Qwen3 只留 0.6B 与 4B；失败后重置模型线程', async () => {
  const worker = await read('live/browser-worker.js'), live = await read('live/w7-live.js');
  assert.deepEqual([...worker.matchAll(/'(qwen3-[^']+)': \{ repo/g)].map(m => m[1]), ['qwen3-0.6b', 'qwen3-4b']);
  assert.deepEqual([...live.matchAll(/'(qwen3-[^']+)': \{ label/g)].map(m => m[1]), ['qwen3-0.6b', 'qwen3-4b']);
  assert.match(live, /resetOnFail: true/);
  assert.match(live, /if \(!QWEN\[this\.s\.qwen\]\) this\.s\.qwen = 'qwen3-0\.6b'/);
});
