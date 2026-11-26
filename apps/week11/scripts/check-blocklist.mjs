#!/usr/bin/env node
// 未刊稿拦截检查｜候选，未经教师确认｜2026-11-25｜第一步
// 在构建产物、材料包、测试夹具、提示与将要提交的文件中查找拦截词；命中即失败（退出码 1）。
// 拦截词由教师提供，存课程文件夹 第十一周/demo/本机_拦截词.txt（一行一个，# 起头为注释），不入仓库；路径可用 W11_BLOCKLIST 指定。
// 拦截词文件不存在或为空时，检查"未生效"，退出码 2（宁可拦下，不当作通过）。
// 用法：node scripts/check-blocklist.mjs [目录或文件 ...]（默认：apps/week11、docs/week11、www/pku-aihis/week11、local-only/）
// 也查 .docx/.zip 内的 XML 与文本（只读）。输出只显示拦截词的首字与长度，不把拦截词写进日志。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const listPath = process.env.W11_BLOCKLIST || path.resolve(repo, '../第十一周/demo/本机_拦截词.txt');
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['apps/week11', 'docs/week11', 'www/pku-aihis/week11', 'local-only'].map((p) => path.join(repo, p));
const mask = (w) => `${[...w][0]}＊（${[...w].length} 字）`;
if (!fs.existsSync(listPath)) { console.error(`未刊稿拦截检查未生效：找不到拦截词文件 ${listPath}（请教师提供后再跑）`); process.exit(2); }
const words = fs.readFileSync(listPath, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
if (!words.length) { console.error('未刊稿拦截检查未生效：拦截词文件为空'); process.exit(2); }
const self = path.resolve(listPath);
function zipTexts(b) { // 最小的 zip 读取：中央目录 → 各条目（stored 或 deflate）
  const out = []; let e = b.length - 22;
  while (e >= 0 && b.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) return out;
  let p = b.readUInt32LE(e + 16); const n = b.readUInt16LE(e + 10);
  for (let i = 0; i < n; i++) {
    const method = b.readUInt16LE(p + 10), csize = b.readUInt32LE(p + 20), nlen = b.readUInt16LE(p + 28), xlen = b.readUInt16LE(p + 30), clen = b.readUInt16LE(p + 32), loc = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nlen).toString('utf8');
    const ds = loc + 30 + b.readUInt16LE(loc + 26) + b.readUInt16LE(loc + 28);
    const raw = b.slice(ds, ds + csize);
    try { out.push([name, (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8')]); } catch (err) { out.push([name, '']); }
    p += 46 + nlen + xlen + clen;
  }
  return out;
}
const hits = []; let files = 0;
function scan(f) {
  if (path.resolve(f) === self) return;
  const st = fs.statSync(f);
  if (st.isDirectory()) { if (/node_modules|\.git$/.test(f)) return; for (const x of fs.readdirSync(f)) scan(path.join(f, x)); return; }
  files++;
  const b = fs.readFileSync(f);
  const parts = /\.(docx|zip|xlsx|pptx)$/i.test(f) ? zipTexts(b) : [['', b.toString('utf8')]];
  for (const [inner, t] of parts) for (const w of words) if (t.includes(w)) hits.push(`${path.relative(repo, f)}${inner ? '#' + inner : ''}：${mask(w)}`);
}
for (const t of targets) if (fs.existsSync(t)) scan(t);
if (hits.length) { console.error(`未刊稿拦截：命中 ${hits.length} 处\n` + hits.join('\n')); process.exit(1); }
console.log(`未刊稿拦截检查通过：${words.length} 个拦截词，${files} 个文件，无命中`);
