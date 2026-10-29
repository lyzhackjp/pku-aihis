// 第七周发布构建：把无构建原型 prototype/ 与通用导入页组装成 GitHub Pages 目录 www/pku-aihis/week07/。
// 原型本身即课件（经典脚本 + live/ 下的 ES 模块），这里只做检查与复制，不改写页面代码。
// 公开：页面代码、data/public/ 公开材料包（不含 CBDB）、LangExtract wheel 与许可。
// 不公开：CBDB 材料包（课堂导入）、local-only/、运行日志、模型权重、密钥。
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pageIds, scriptIds, slideIds, CBDB_MARKERS} from './lib.mjs';

const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..');
const proto = path.join(app, 'prototype'), out = path.join(app, 'www/pku-aihis/week07');

// 1. 语法检查：经典脚本与 ES 模块分别检查。
const classic = ['deck-core.js', 'week07-core.js', 'week07-labs.js', 'week07-labs2.js', 'data/data.js', 'data/public/week07-public-pack.js'];
const modules = ['live/w7-live.js', 'live/browser-worker.js', 'live/lx-worker.js', 'live/vendor/api.mjs'];
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'w7-check-'));
for (const f of classic) execFileSync(process.execPath, ['--check', path.join(proto, f)]);
for (const f of modules) {
  const copy = path.join(tmp, path.basename(f).replace(/\.m?js$/, '.mjs'));
  await fs.copyFile(path.join(proto, f), copy);
  execFileSync(process.execPath, ['--check', copy]);
}
await fs.rm(tmp, {recursive: true, force: true});

// 2. 页码一致：page-map、data.js、index.html 三处相同。
const map = await pageIds(root), data = await scriptIds(proto), html = await slideIds(proto);
if (JSON.stringify(map) !== JSON.stringify(data) || JSON.stringify(map) !== JSON.stringify(html))
  throw Error('页码不一致：page-map / data.js / index.html');

// 3. 公开材料包不得含 CBDB 记录。
const pub = await fs.readFile(path.join(proto, 'data/public/week07-public-pack.js'), 'utf8');
for (const m of CBDB_MARKERS) if (pub.includes(m)) throw Error('公开材料包含 CBDB 标记：' + m);

// 4. 通用导入页（不下载、不运行模型）。
execFileSync('pnpm', ['build'], {cwd: path.join(root, 'apps/material-importer'), env: {...process.env, PKU_IMPORTER_BASE: './'}, stdio: 'inherit'});

// 5. 组装。
await fs.rm(path.join(app, 'www'), {recursive: true, force: true});
const skip = new Set(['importer', 'local-only']);
await fs.cp(proto, out, {recursive: true, filter: s => {
  const rel = path.relative(proto, s);
  if (!rel) return true;
  const top = rel.split(path.sep)[0];
  return !skip.has(top) && !/\.(map|zip|tgz|gguf|onnx|typ|py)$/i.test(s) && path.basename(s) !== 'week07-pack.json';
}});
await fs.cp(path.join(root, 'apps/material-importer/dist'), path.join(out, 'importer'), {recursive: true, filter: s => !s.endsWith('.map')});

const sha = createHash('sha256').update(pub).digest('hex');
console.log(`Assembled week07: ${map.length} pages; public pack ${(pub.length / 1e6).toFixed(1)} MB sha256 ${sha.slice(0, 16)}…; importer embedded`);
