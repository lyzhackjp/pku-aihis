// 第十周：受限材料上的固定例子｜候选，未经教师确认｜2026-11-16（第一步）
// 只在教师本机运行：读课程文件夹 第十周/demo/（不入仓库）。路径用环境变量 W10_DEMO_DIR 指定，
// 默认是本仓库同级的 ../第十周/demo（课程文件夹中的工作树 pku-aihis-week10 即如此）。找不到时整组跳过，并写明原因。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const L = require('../prototype/w10-lib.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const DEMO = process.env.W10_DEMO_DIR || path.resolve(here, '../../../../第十周/demo');
const MAT = path.join(DEMO, '材料');
const has = fs.existsSync(path.join(MAT, '茅海建_结论一节_页174-176.txt'));
const skip = has ? false : `找不到本机材料（${MAT}）；设 W10_DEMO_DIR 后再跑`;
const read = (n) => fs.readFileSync(path.join(MAT, n), 'utf8');

test('quote-check：茅文"大大加剧了政变的激烈程度"→ 核实，第 175 页（方案第八节）', { skip }, () => {
  const r = L.quoteCheck('大大加剧了政变的激烈程度', read('茅海建_结论一节_页174-176.txt'));
  assert.equal(r.status, 'exact'); assert.deepEqual(r.pages, ['175']);
});
test('quote-check：茅文"大大导致了政变"→ 未核实（方案第八节）', { skip }, () => {
  const r = L.quoteCheck('大大导致了政变', read('茅海建_结论一节_页174-176.txt'));
  assert.equal(r.status, 'not_found');
});
test('quote-check：省略中间一截拼起来的引文 → 覆盖率 1，拼接两段，第 175 页（扩充部分甲二）', { skip }, () => {
  const r = L.quoteCheck('虽未因袁世凯告密而发生，但……大大加剧了政变的激烈程度', read('茅海建_结论一节_页174-176.txt'));
  assert.equal(r.coverage, 1); assert.equal(r.status, 'spliced'); assert.equal(r.segments.length, 2); assert.deepEqual(r.pages, ['175']);
});
test('quote-check：把"加剧"错成"导致"的整句 → 过门槛（近似），未核上的字被列出（扩充部分甲二的提醒）', { skip }, () => {
  const r = L.quoteCheck('虽未因袁世凯告密而发生，但大大导致了政变的激烈程度', read('茅海建_结论一节_页174-176.txt'));
  assert.equal(r.status, 'near', `覆盖率 ${r.coverage}`);
  assert.ok(r.missed.map((m) => m.text).join('').includes('导致'));
  console.log(`  [记录] 覆盖率 ${r.coverage.toFixed(3)}（${r.m}/${r.n}），未核上：${r.missed.map((m) => m.text).join('、')}；扩充部分手算为 20/24≈0.83、未核上"导致"`);
});
test('quote-check：故意错一个字（OCR 式）→ 覆盖率低于 1、高于门槛，标"近似"（方案第八节）', { skip }, () => {
  const r = L.quoteCheck('戊戌政变虽未因袁世凯告密而发生，但袁世凯告密的消急传到北京', read('茅海建_结论一节_页174-176.txt'));
  assert.equal(r.status, 'near'); assert.deepEqual(r.missed.map((m) => m.text), ['急']);
});
test('quote-check：茅文学术史一节里查黄彰健的名字与页码', { skip }, () => {
  const r = L.quoteCheck('黄彰健', read('茅海建_学术史一节_页198-208.txt'));
  assert.equal(r.status, 'exact'); assert.ok(r.pages.length >= 1);
});

const hasChokugo = fs.existsSync(path.join(DEMO, '..', '讲义.typ'));
test('seq-align：海後所定井上初稿对成文，字单位；归一开关改变异文数（录文据讲义附录，待复核）', { skip: hasChokugo ? false : '找不到 第十周/讲义.typ' }, () => {
  const typ = fs.readFileSync(path.join(DEMO, '..', '讲义.typ'), 'utf8');
  const block = (title) => { const i = typ.indexOf(title); const j = typ.indexOf('#quote-block[', i); return typ.slice(j + 13, typ.indexOf(']', j)); };
  const seibun = block('=== 《教育勅語》成文').split('\n\n明治')[0].replace(/\s+/g, '');
  const shoko = block('=== 井上毅草案').replace(/\s+/g, '');
  const raw = L.align(shoko, seibun, { unit: 'char' });
  const norm = L.align(shoko, seibun, { unit: 'char', normalize: ['kyujitai', 'odoriji'] });
  console.log(`  [记录] 初稿 ${raw.stats.a} 字、成文 ${raw.stats.b} 字；归一全关：相同 ${raw.stats.equal}、异文 ${raw.stats.variants} 处；旧字形＋踊字归一：相同 ${norm.stats.equal}、异文 ${norm.stats.variants} 处`);
  assert.ok(raw.stats.variants > 0);
  assert.ok(norm.stats.equal >= raw.stats.equal);
  const v1 = raw.variants.find((v) => v.a_text.includes('久'));
  assert.ok(v1 && v1.b_text.includes('宏'), '第 1 行"久遠／宏遠"是一处异文');
});

const hasPrompts = fs.existsSync(path.join(DEMO, 'prompts.json'));
test('条件卡：prompts.json 的 10 个条件可以改写为"模板＋材料编号"，回填后与原提示逐字相同（第一步转换办法的可行性）', { skip: hasPrompts ? false : '找不到 prompts.json' }, () => {
  const P = JSON.parse(fs.readFileSync(path.join(DEMO, 'prompts.json'), 'utf8'));
  assert.equal(P.conditions.length, 10);
  const body = (f) => { const t = fs.readFileSync(path.join(MAT, f), 'utf8'); return f.endsWith('.md') && t.includes('\n---\n') ? t.split('\n---\n')[1].trim() : t.trim(); };
  let templated = 0;
  for (const c of P.conditions) {
    let tpl = c.messages[0].content;
    const entries = [];
    for (const f of c.materials || []) {
      let t = body(f);
      if (f === '埃姆斯_对齐表.md') { const i = t.indexOf('| 编号'); t = t.slice(i).trim(); }
      const id = f.replace(/\.(txt|md)$/, '');
      if (tpl.includes(t)) { tpl = tpl.split(t).join(`{{material:${id}}}`); entries.push({ id, text: t, sendable: true }); }
    }
    if (!entries.length) { assert.equal(c.materials, undefined, `${c.id} 没有可替换的材料`); continue; }
    templated++;
    const card = { materials: entries.map((e) => ({ entry_id: e.id })), user_template: tpl };
    assert.equal(L.fillTemplate(card, entries).messages[0].content, c.messages[0].content, `${c.id} 回填后逐字相同`);
    assert.ok(tpl.length < 1200, `${c.id} 模板中不再含材料正文（模板 ${tpl.length} 字）`);
  }
  assert.equal(templated, 7);
});
