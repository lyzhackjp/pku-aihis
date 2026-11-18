// 第十周源码级发布测试（不需构建、不需浏览器）。计算回归见 lib.test.mjs；本机材料测试见 local.test.mjs。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pageIds, scriptIds, slideIds, loadScript, PRIVATE_MARKERS} from '../scripts/lib.mjs';

const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..'), proto = path.join(app, 'prototype');

test('23 页：page-map、data.js、index.html 一致', async () => {
  const map = await pageIds(root);
  assert.equal(map.length, 23);
  assert.deepEqual(await scriptIds(proto), map);
  assert.deepEqual(await slideIds(proto), map);
});
test('公开材料包不含本机材料（教师材料录文、运行记录、本课判定、草案表），不可送条目不带原文', async () => {
  const raw = await fs.readFile(path.join(proto, 'data/w10-public.js'), 'utf8');
  for (const m of PRIVATE_MARKERS) assert.ok(!raw.includes(m), m);
  const pub = await loadScript(path.join(proto, 'data/w10-public.js'), 'W10_PUBLIC');
  assert.deepEqual(pub.replays, []);
  for (const e of pub.packs.flatMap(p => p.entries)) if (e.sendable === false || e.visibility === '本机材料包') assert.ok(!e.text, e.id);
});
test('页面源码不带本机材料标记', async () => {
  for (const f of ['w10-core.js', 'w10-labs1.js', 'w10-labs2.js', 'w10-labs3.js', 'w10-labs4.js', 'w10-labs5.js', 'data/w10-static.js', 'data/w10-cards.js', 'index.html']) {
    const t = await fs.readFile(path.join(proto, f), 'utf8');
    for (const m of PRIVATE_MARKERS) assert.ok(!t.includes(m), `${m} 在 ${f}`);
  }
});
test('密钥不落盘：源码不把 Key 写入存储，仓库内无疑似密钥', async () => {
  for (const f of ['w10-core.js', 'w10-labs1.js', 'w10-labs2.js', 'w10-labs3.js', 'w10-labs4.js', 'w10-labs5.js', 'live/w10-live.js']) {
    const t = await fs.readFile(path.join(proto, f), 'utf8');
    assert.ok(!/sk-[A-Za-z0-9]{24,}/.test(t), f);
    assert.ok(!/store\.set\(\s*['"][^'"]*key/i.test(t), f + ' 把 Key 写入存储');
  }
});
