// 第八周发布构建：把无构建原型 prototype/ 与通用导入页组装成 GitHub Pages 目录 www/pku-aihis/week08/（照第七周 scripts/assemble.mjs）。
// 公开：页面代码、data/public/ 公开材料包（王裕华复制数据、Padgett、程宁表 2、《華陽集》维基文库本、教学构造）。
// 不公开：本机材料包（CBDB 王珪记录、『梅颸日記』、JBDB 查询结果）、local-only/、模型权重、密钥。
// 教师确认前，本周不在 published-weeks.json 与 CI 中；构建只供本机预演。
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pageIds, scriptIds, slideIds, PRIVATE_MARKERS} from './lib.mjs';

const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..');
const proto = path.join(app, 'prototype'), out = path.join(app, 'www/pku-aihis/week08');
const classic = ['deck-core.js', 'week08-core.js', 'week08-labs.js', 'week08-labs2.js', 'data/data.js', 'data/public/week08-public-pack.js'];
const modules = ['live/w8-live.js', 'live/browser-worker.js', 'live/models.js'];
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'w8-check-'));
for (const f of classic) execFileSync(process.execPath, ['--check', path.join(proto, f)]);
for (const f of modules) { const copy = path.join(tmp, path.basename(f).replace(/\.m?js$/, '.mjs')); await fs.copyFile(path.join(proto, f), copy); execFileSync(process.execPath, ['--check', copy]); }
await fs.rm(tmp, {recursive: true, force: true});
const map = await pageIds(root), data = await scriptIds(proto), html = await slideIds(proto);
if (JSON.stringify(map) !== JSON.stringify(data) || JSON.stringify(map) !== JSON.stringify(html)) throw Error('页码不一致：page-map / data.js / index.html');
const pub = await fs.readFile(path.join(proto, 'data/public/week08-public-pack.js'), 'utf8');
for (const m of PRIVATE_MARKERS) if (pub.includes(m)) throw Error('公开材料包含本机材料标记：' + m);
const skipImporter = process.env.WEEK08_SKIP_IMPORTER === '1';
if (!skipImporter) execFileSync('pnpm', ['build'], {cwd: path.join(root, 'apps/material-importer'), env: {...process.env, PKU_IMPORTER_BASE: './'}, stdio: 'inherit'});
await fs.rm(path.join(app, 'www'), {recursive: true, force: true});
await fs.cp(proto, out, {recursive: true, filter: s => { const rel = path.relative(proto, s); if (!rel) return true; const top = rel.split(path.sep)[0]; return !['importer', 'local-only'].includes(top) && !/\.(map|zip|tgz|gguf|onnx|typ|py)$/i.test(s) && path.basename(s) !== 'week08-pack.json'; }});
if (!skipImporter) await fs.cp(path.join(root, 'apps/material-importer/dist'), path.join(out, 'importer'), {recursive: true, filter: s => !s.endsWith('.map')});
// 公开站点：不画无审图号的底图；天地图浏览器端密钥与审图号在发布时由环境变量给出（不入 Git）
await fs.writeFile(path.join(out, 'data/site.js'), '/* 由 scripts/assemble.mjs 在发布构建时生成。 */\nwindow.W8_SITE = ' + JSON.stringify({public: true, tianditu: {tk: process.env.WEEK08_TIANDITU_TK || '', gs: process.env.WEEK08_TIANDITU_GS || ''}}) + ';\n');
const sha = createHash('sha256').update(pub).digest('hex');
console.log(`Assembled week08: ${map.length} pages; public pack ${(pub.length / 1e6).toFixed(2)} MB sha256 ${sha.slice(0, 16)}…; importer ${skipImporter ? 'skipped' : 'embedded'}`);
