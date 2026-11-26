// 第十一周第二批：本机材料上的固定例子｜候选，未经教师确认｜2026-11-26
// 只在教师本机运行：读 第十一周/demo/材料/（教师 2023 年论文刊本文字、书稿一节）、第十一周/demo/修订稿/（演示③(b)）、第十周 D15 史料包。
// 路径：W11_COURSE_DIR；找不到时整组跳过并写明。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const L = require('../prototype/w11-lib.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const COURSE = process.env.W11_COURSE_DIR || path.resolve(here, '../../../..');
const MAT = path.join(COURSE, '第十一周/demo/材料'), REV = path.join(COURSE, '第十一周/demo/修订稿');
const D15 = path.join(COURSE, '第十周/demo/D15_李原榛2023/史料包_帝国议会会议录4则.json');
const has = fs.existsSync(path.join(MAT, '李原榛2023_第156-159页_原文.txt')) && fs.existsSync(D15) && fs.existsSync(path.join(REV, '演示3b_reviser写入.docx'));
const skip = has ? false : `找不到本机材料（${MAT}、${REV} 或 D15 史料包）；设 W11_COURSE_DIR 后再跑`;
const ab = (p) => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const S2 = () => { const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(here, '../prototype/data/w11-static2.js'), 'utf8'), ctx); return ctx.window.W11_STATIC2; };
const EX = (n) => JSON.parse(fs.readFileSync(path.join(here, '../../../docs/week11/examples', n), 'utf8'));
const opts = () => {
  const s2 = S2(), d = JSON.parse(fs.readFileSync(D15, 'utf8')).packs[0].entries;
  return { roster: s2.roster, cites: s2.liCites, entries: Object.fromEntries(d.map((e) => [e.id, { text: e.text, house: s2.houses[e.id] }])) };
};

test('会议录发言人规则：原文无报错；植入 E1（换发言人）、E2（改院别）查出，E3（删限定）查不出（C-06 静态部分）', { skip }, () => {
  const text = fs.readFileSync(path.join(MAT, '李原榛2023_第156-159页_原文.txt'), 'utf8');
  const o = opts();
  const base = L.speakerRules(text, o);
  assert.equal(base.flags.length, 0, JSON.stringify(base.flags));
  assert.ok(base.checked.length >= 6, '至少核了 6 句带会议录注的句子：' + base.checked.length);
  assert.deepEqual([...new Set(base.checked.map((c) => c.entry))].sort(), ['d15-A', 'd15-B', 'd15-C']);
  const imp = L.applyImplants(text, EX('implants-findings.toy.example.json').implants);
  assert.ok(imp.applied.every((a) => a.ok), JSON.stringify(imp.applied));
  const r = L.speakerRules(imp.text, o);
  assert.deepEqual(r.flags.map((f) => [f.rule, f.name, f.entry, f.page]), [['发言人不在所注原文', '芦田均', 'd15-A', 156], ['院别与所注原文不符', '众议院', 'd15-B', 157]]);
  assert.ok(!r.flags.some((f) => /普遍/.test(f.text)));
});

test('会议录不在手时：带注句子都标"无法核"，不报错', { skip }, () => {
  const text = fs.readFileSync(path.join(MAT, '李原榛2023_第156-159页_原文.txt'), 'utf8');
  const o = opts(); o.entries = {};
  const r = L.speakerRules(text, o);
  assert.equal(r.flags.length, 0); assert.ok(r.unchecked.length >= 6);
});

test('演示③(b)：8 处修订，修订者为工具名，正文修订与计划一一对应；输入副本与原件相同', { skip }, async () => {
  const r = await L.docxRevisions(ab(path.join(REV, '演示3b_reviser写入.docx')));
  const plan = JSON.parse(fs.readFileSync(path.join(REV, '演示3b_修订计划.json'), 'utf8')).replacements;
  assert.equal(r.edits.length, 8);
  assert.deepEqual([...new Set(r.edits.map((e) => e.author))], ['word-paper-tracked-reviser']);
  for (const p of plan) assert.ok(r.edits.some((e) => e.removed === p.old && e.added === p.new), p.old);
  assert.ok(r.edits.every((e) => !e.in_footnote));
  assert.deepEqual(fs.readFileSync(path.join(REV, '演示3b_输入副本.docx')), fs.readFileSync(path.join(COURSE, '第十一周/练习材料/教学构造草稿.docx')));
});

test('书稿一节（D13 本机预置）：无邮箱、无边界外材料，修订者为"作者"', { skip }, async () => {
  const p = path.join(MAT, '书稿_明治中期一节_带修订_本机.docx');
  const r = await L.docxRevisions(ab(p));
  assert.ok(r.edits.length >= 10, String(r.edits.length));
  assert.deepEqual([...new Set(r.edits.map((e) => e.author))], ['作者']);
  const raw = fs.readFileSync(p).toString('latin1');
  assert.ok(!/@\w+\.\w+/.test(raw));
  const d = await L.parseDocx(ab(p));
  const all = d.paragraphs.map((x) => x.text).join('') + d.footnotes.map((f) => f.text).join('') + r.edits.map((e) => e.before + e.removed).join('');
  assert.ok(!/\u4e2d\u5cf6|\u4e2d\u5c9b|\u5fb3\u8535|\u5fb7\u85cf/.test(all));
});
