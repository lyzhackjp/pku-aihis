// 第十一周：受限材料上的固定例子｜候选，未经教师确认｜2026-11-25（第一步：测试先写）
// 只在教师本机运行：读课程文件夹的 第十周/demo/材料/（茅海建文两节节录，带〔原刊第×页〕）与 第十一周/ext/quote_check_输出.txt。
// 路径：W11_COURSE_DIR（课程文件夹）；默认本仓库同级的 ..（课程文件夹中的工作树 pku-aihis-week11 即如此）。找不到时整组跳过并写明。
// 复现对象：ext/quote_check.py 2026-11-25 在练习材料甲上的输出（扩充部分乙一 @表；方案第八节验收第一条）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const L = require('../prototype/w11-lib.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const COURSE = process.env.W11_COURSE_DIR || path.resolve(here, '../../../..');
const MAT = path.join(COURSE, '第十周/demo/材料');
const OUT = path.join(COURSE, '第十一周/ext/quote_check_输出.txt');
const has = fs.existsSync(path.join(MAT, '茅海建_结论一节_页174-176.txt')) && fs.existsSync(OUT);
const skip = has ? false : `找不到本机材料（${MAT} 或 ${OUT}）；设 W11_COURSE_DIR 后再跑`;
const read = (n) => fs.readFileSync(path.join(MAT, n), 'utf8');
const MAO = () => read('茅海建_学术史一节_页198-208.txt') + '\n' + read('茅海建_结论一节_页174-176.txt');
const jia = () => { const b = fs.readFileSync(path.join(here, 'fixtures/jia_draft.docx')); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const draftText = async () => (await L.parseDocx(jia())).paragraphs.slice(1).map((p) => p.text).join('');

test('复现 一：引号内 10 处，逐字相同 5 处（第 198、200、200、201、175 页），节录中找不到 5 处', { skip }, async () => {
  const r = L.quoteCheckAll(await draftText(), MAO());
  assert.equal(r.length, 10);
  const same = r.filter((x) => x.status === 'exact');
  assert.deepEqual(same.map((x) => x.pages[0]), ['198', '200', '200', '201', '175']);
  assert.deepEqual(r.filter((x) => x.status !== 'exact').map((x) => x.quote),
    ['捕拿新党', '於初六日爆發，根本是太后預定的行動，與袁世凱初五日的告密無關', '时在八月十四日记于天津督署', '一种供大家考问的见解', '寓海淀旅店']);
});
test('复现 二：引号外与茅文连续相同 ≥12 字 4 处；长度 15、14、13、25；原脚本页码 197、199、199、199，按首个非标点字为 198、199、199、199', { skip }, async () => {
  const r = L.borrowScan(await draftText(), MAO(), { k: 12 });
  assert.deepEqual(r.fragments.map((f) => f.len), [15, 14, 13, 25]);
  assert.deepEqual(r.fragments.map((f) => f.page_raw), ['197', '199', '199', '199'], '与 ext/quote_check_输出.txt 逐项相同');
  assert.deepEqual(r.fragments.map((f) => f.page), ['198', '199', '199', '199'], '与扩充部分乙一、4.3 答案相同');
  assert.ok(r.fragments[3].text.includes('以后的研究大体是围绕着此一假设打圈子，走不出太远'));
});
test('复现 二：输出文件中的四个片段文字逐字出现在页面结果里', { skip }, async () => {
  const lines = fs.readFileSync(OUT, 'utf8').split('\n').filter((l) => /字，茅文第\d+页/.test(l)).map((l) => l.trim().replace(/（\d+ 字，茅文第\d+页）$/, ''));
  const r = L.borrowScan(await draftText(), MAO(), { k: 12 });
  assert.deepEqual(r.fragments.map((f) => f.text), lines);
});
test('复现 三：分页后第 2 页首条注为"同上，第38页。"', { skip }, async () => {
  const d = await L.parseDocx(jia());
  const first2 = d.footnotes.find((n) => n.doc_page === 2 && n.number_on_page === 1);
  assert.equal(first2.text, '同上，第38页。');
});
test('文字归一：茅文节录中的控制字符（U+0080—U+009F 一类）去掉前后结果不变', { skip }, async () => {
  const raw = MAO(); const clean = raw.replace(/[\u0080-\u009f]/g, '');
  const a = L.borrowScan(await draftText(), raw, { k: 12 }), b = L.borrowScan(await draftText(), clean, { k: 12 });
  assert.deepEqual(a.fragments.map((f) => [f.text, f.page]), b.fragments.map((f) => [f.text, f.page]));
  console.log(`  [记录] 节录中控制字符 ${raw.length - clean.length} 个`);
});
