// 第九周发布构建：把无构建原型 prototype/ 与通用导入页组装成 GitHub Pages 目录 www/pku-aihis/week09/（照第八周 scripts/assemble.mjs）。
// 公开：页面代码、data/w09-public.js 公开材料包（梁启超、井上哲次郎、《脱亜論》的公开本文字与书目；章太炎与福沢全集只有书目）、条件卡、二维码。
// 不公开：本机材料包（《章太炎全集》录文、课前运行记录、网页版记录、Neuronpedia 截图）、local-only/、密钥。
// 因此公开站点上依赖课前记录的格子显示"待课前运行"；教师课上用顶栏"导入本机材料包"载入。
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pageIds, scriptIds, slideIds, PRIVATE_MARKERS} from './lib.mjs';

const app = path.resolve(import.meta.dirname, '..'), root = path.resolve(app, '../..');
const proto = path.join(app, 'prototype'), out = path.join(app, 'www/pku-aihis/week09');
const classic = ['deck-core.js', 'w09-lib.js', 'w09-core.js', 'w09-labs1.js', 'w09-labs2.js', 'w09-labs3.js', 'data/data.js', 'data/w09-public.js', 'data/w09-cards.js', 'data/w09-kinds.js'];
const modules = ['live/w9-live.js', 'live/vendor/api.mjs'];
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'w9-check-'));
for (const f of classic) execFileSync(process.execPath, ['--check', path.join(proto, f)]);
for (const f of modules) { const copy = path.join(tmp, path.basename(f).replace(/\.m?js$/, '.mjs')); await fs.copyFile(path.join(proto, f), copy); execFileSync(process.execPath, ['--check', copy]); }
await fs.rm(tmp, {recursive: true, force: true});
const map = await pageIds(root), data = await scriptIds(proto), html = await slideIds(proto);
if (JSON.stringify(map) !== JSON.stringify(data) || JSON.stringify(map) !== JSON.stringify(html)) throw Error('页码不一致：page-map / data.js / index.html');
const pub = await fs.readFile(path.join(proto, 'data/w09-public.js'), 'utf8');
for (const m of PRIVATE_MARKERS) if (pub.includes(m)) throw Error('公开材料包含本机材料标记：' + m);
const skipImporter = process.env.WEEK09_SKIP_IMPORTER === '1';
if (!skipImporter) execFileSync('pnpm', ['build'], {cwd: path.join(root, 'apps/material-importer'), env: {...process.env, PKU_IMPORTER_BASE: './'}, stdio: 'inherit'});
await fs.rm(path.join(app, 'www'), {recursive: true, force: true});
await fs.cp(proto, out, {recursive: true, filter: s => { const rel = path.relative(proto, s); if (!rel) return true; const top = rel.split(path.sep)[0]; return !['importer', 'local-only'].includes(top) && !/\.(map|zip|tgz|gguf|onnx|typ|py|env)$/i.test(s) && path.basename(s) !== 'week09-pack.json'; }});
if (!skipImporter) await fs.cp(path.join(root, 'apps/material-importer/dist'), path.join(out, 'importer'), {recursive: true, filter: s => !s.endsWith('.map')});
const sha = createHash('sha256').update(pub).digest('hex');
console.log(`Assembled week09: ${map.length} pages; public pack ${(pub.length / 1e3).toFixed(0)} KB sha256 ${sha.slice(0, 16)}…; importer ${skipImporter ? 'skipped' : 'embedded'}`);
