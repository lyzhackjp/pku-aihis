// 第十周计算模块的原测试，随函数移入第十一周｜2026-11-25（第一批）。以下测试逐字取自 apps/week10/tests/lib.test.mjs，只改了 require 的文件名。
// 运行：cd apps/week11 && node --test tests/*.test.mjs
// 公开部分只用公开文本（埃姆斯两本、勅語成文、讲义的起草简表摘编）；
// 受限材料（茅海建文、海後录文、prompts.json）的检查在 local.test.mjs，找不到本机材料时跳过并写明。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const L = require('../prototype/w11-lib.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (n) => fs.readFileSync(path.join(here, 'fixtures', n), 'utf8');
const fxj = (n) => JSON.parse(fx(n));

/* ---------------- seq-align ---------------- */
const EMS_A = fx('ems_A_abeken.txt').trim(), EMS_B = fx('ems_B_presse.txt').trim();
const EMS_TABLE = fxj('ems_variants_20261115.json'); // 由 demo/材料/埃姆斯_对齐表.md 逐行转出

test('seq-align difflib 兼容：埃姆斯两本 甲 238、乙 113、相同 46、异文 20（方案第八节）', () => {
  const r = L.align(EMS_A, EMS_B, { unit: 'word', normalize: [], algorithm: 'difflib' });
  assert.deepEqual(r.stats, { a: 238, b: 113, equal: 46, variants: 20 });
});
test('seq-align difflib 兼容：20 处异文逐条与课前对齐表一致（编号、类型、两边文字）', () => {
  const r = L.align(EMS_A, EMS_B, { unit: 'word', algorithm: 'difflib' });
  assert.equal(EMS_TABLE.length, 20);
  r.variants.forEach((v, i) => {
    const t = EMS_TABLE[i];
    assert.equal(v.variant_id, t.id, `第 ${i + 1} 处编号`);
    assert.equal(v.op, t.op, `${t.id} 类型`);
    assert.equal(v.a_text, t.a, `${t.id} 甲本文字`);
    assert.equal(v.b_text, t.b, `${t.id} 乙本文字`);
  });
  assert.equal(r.variants[0].op, '增', 'V01 是"增"（乙本开头的背景半句）；方案第三节 D10 写作"改"，以对齐表为准');
});
test('seq-align：每处异文的 span 能回到原文位置', () => {
  const r = L.align(EMS_A, EMS_B, { unit: 'word' });
  const v19 = r.variants.find((v) => v.variant_id === 'V19');
  assert.equal(EMS_A.slice(...v19.a_span), 'zu sagen');
  assert.equal(EMS_B.slice(...v19.b_span), 'mitzuteilen');
});
test('seq-align：德文正字法归一（daß→dass）不改变埃姆斯的异文处数，但比较值改变', () => {
  const r0 = L.align(EMS_A, EMS_B, { unit: 'word' });
  const r1 = L.align(EMS_A, EMS_B, { unit: 'word', normalize: ['de_orth', 'case'] });
  assert.equal(r1.stats.a, r0.stats.a);
  assert.ok(r1.unitsA.some((u) => u.norm === 'dass'));
});
test('seq-align LCS 模式：埃姆斯两本也能算，相同单位数不少于 difflib（LCS 保证最长）', () => {
  const d = L.align(EMS_A, EMS_B, { unit: 'word', algorithm: 'difflib' });
  const l = L.align(EMS_A, EMS_B, { unit: 'word', algorithm: 'lcs' });
  assert.ok(l.stats.equal >= d.stats.equal, `LCS ${l.stats.equal} ≥ difflib ${d.stats.equal}`);
});

const SEIBUN = fx('chokugo_seibun.txt').trim();
test('seq-align：勅語成文与自身对齐，异文 0（字单位，归一全关）', () => {
  const r = L.align(SEIBUN, SEIBUN, { unit: 'char', algorithm: 'difflib' });
  assert.equal(r.stats.variants, 0);
  assert.equal(r.stats.equal, r.stats.a);
});
test('seq-align："世々／世世"随踊字归一开关而变', () => {
  const expanded = SEIBUN.replace('世々', '世世').replace('拳々', '拳拳');
  const off = L.align(SEIBUN, expanded, { unit: 'char', normalize: [] });
  const on = L.align(SEIBUN, expanded, { unit: 'char', normalize: ['odoriji'] });
  assert.equal(off.stats.variants, 2, '关：世々／世世、拳々／拳拳 两处');
  assert.deepEqual(off.variants.map((v) => [v.a_text, v.b_text]), [['々', '世'], ['々', '拳']]);
  assert.equal(on.stats.variants, 0, '开：踊字展开后相同');
});
test('seq-align：旧字形归一（德／徳、敎／教）开关改变异文数', () => {
  const shin = SEIBUN.replace(/德/g, '徳').replace(/敎/g, '教');
  assert.ok(L.align(SEIBUN, shin, { unit: 'char' }).stats.variants > 0);
  assert.equal(L.align(SEIBUN, shin, { unit: 'char', normalize: ['kyujitai'] }).stats.variants, 0);
});

test('LCS 小例表：國ノ光ヲ爲セル／厥ノ美ヲ濟セル，右下角 4，公共子序列 ノヲセル（扩充部分甲三 @fig-lcs）', () => {
  const a = [...'國ノ光ヲ爲セル'], b = [...'厥ノ美ヲ濟セル'];
  const T = L.lcsTable(a, b);
  assert.deepEqual(T[2], [0, 0, 1, 1, 1, 1, 1, 1], '行"ノ"');
  assert.deepEqual(T[4], [0, 0, 1, 1, 2, 2, 2, 2], '行"ヲ"');
  assert.deepEqual(T[7], [0, 0, 1, 1, 2, 2, 3, 4], '行"ル"');
  const bt = L.lcsBacktrack(a, b, T);
  assert.equal(bt.length, 4);
  assert.equal(bt.pairs.map(([i]) => a[i]).join(''), 'ノヲセル');
  const r = L.align('國ノ光ヲ爲セル', '厥ノ美ヲ濟セル', { unit: 'char', algorithm: 'lcs' });
  assert.deepEqual(r.variants.map((v) => [v.op, v.a_text, v.b_text]), [['改', '國', '厥'], ['改', '光', '美'], ['改', '爲', '濟']]);
});
test('LCS 小例表：把成文的"厥"改成"國"，右下角变为 5', () => {
  assert.equal(L.lcsTable([...'國ノ光ヲ爲セル'], [...'國ノ美ヲ濟セル'])[7][7], 5);
});

test('TEI 导出：V16 增、V19 改写成平行分段（扩充部分甲四）', () => {
  const r = L.align(EMS_A, EMS_B, { unit: 'word' });
  const x = L.toTEI(r, EMS_A, [{ id: 'A', label: '阿贝肯原电' }, { id: 'B', label: '新闻稿' }], { categories: [{ id: 'Omission', label: '删去内容' }] });
  assert.match(x, /<app n="V16"><rdg wit="#A"\/><rdg wit="#B">vom Dienst<\/rdg><\/app>/);
  assert.match(x, /<app n="V19"><rdg wit="#A">zu sagen<\/rdg><rdg wit="#B">mitzuteilen<\/rdg><\/app>/);
  assert.match(x, /<interpGrp type="transcriptional">/);
  assert.equal((x.match(/<app /g) || []).length, 20);
});

/* ---------------- quote-check（公开材料上的例子；茅文的例子见 local.test.mjs） ---------------- */
const PAGED = '〔原刊第1页〕Seine Majestät schreibt mir: Graf Benedetti fing mich auf der Promenade ab.〔原刊第2页〕Ich wies ihn, zuletzt etwas ernst, zurück.';
test('quote-check：西文按词切分；跨标点、换行照样核上，并报页码', () => {
  const r = L.quoteCheck('fing mich auf der Promenade ab', PAGED);
  assert.equal(r.status, 'exact'); assert.equal(r.coverage, 1); assert.deepEqual(r.pages, ['1']);
  const r2 = L.quoteCheck('Graf Benedetti … zuletzt etwas ernst', PAGED);
  assert.equal(r2.status, 'spliced'); assert.deepEqual(r2.pages, ['1', '2']);
});
test('quote-check：中日文按字切分；控制字符（知网文字层的 \\x82）与空白不影响', () => {
  const src = '〔原刊第3页〕朕惟フニ我カ皇祖皇宗\x82國ヲ肇ムルコト\n宏遠ニ';
  const r = L.quoteCheck('皇祖皇宗國ヲ肇ムルコト宏遠', src);
  assert.equal(r.status, 'exact'); assert.deepEqual(r.pages, ['3']);
});
test('quote-check：改一字，未核上的字列出；覆盖率随之下降', () => {
  const r = L.quoteCheck('皇祖皇宗國ヲ肇ムルコト久遠ニ德ヲ樹ツルコト深厚', SEIBUN);
  assert.equal(r.status, 'near');
  assert.deepEqual(r.missed.map((m) => m.text), ['久']);
  assert.ok(r.coverage < 1 && r.coverage >= 0.8);
});
test('quote-check：门槛可调，"近似"与"未核实"随之翻转', () => {
  const q = '皇祖皇宗國ヲ肇ムルコト久遠ニ德ヲ樹ツルコト深厚';
  assert.equal(L.quoteCheck(q, SEIBUN, { threshold: 0.99 }).status, 'not_found');
});
test('quote-check：空引文与完全不相干的引文', () => {
  assert.equal(L.quoteCheck('', SEIBUN).status, 'empty');
  assert.equal(L.quoteCheck('大大导致了政变', SEIBUN).status, 'not_found');
});

/* ---------------- set-overlap ---------------- */
const ROSTER = [
  { name: '家永三郎', aliases: ['家永'] }, { name: '和辻哲郎', aliases: ['和辻'] }, { name: '石田雄', aliases: ['石田'] },
  { name: '田中耕太郎', aliases: ['田中'] }, { name: '津田左右吉', aliases: ['津田'] },
];
test('set-overlap：三次名单完全相同时 Jaccard＝1（方案第八节）', () => {
  const n = ['家永三郎', '石田雄'];
  const r = L.pairwiseJaccard([n, n, n]);
  assert.equal(r.mean, 1); assert.deepEqual(r.pairs, [1, 1, 1]);
});
test('set-overlap：扩充部分甲五的例子 J＝2/5＝0.4', () => {
  assert.equal(L.jaccard(['家永', '和辻', '石田'], ['家永', '石田', '田中', '津田']), 0.4);
});
test('set-overlap：从回答中抽出点名的学者（含简称），并找出调和语', () => {
  const t = '家永三郎认为……和辻则认为……综合来看，勅語兼有两面。';
  assert.deepEqual(L.findNames(t, ROSTER), ['家永三郎', '和辻哲郎']);
  assert.deepEqual(L.findHedges(t).map((h) => h.phrase), ['综合来看']);
  assert.equal(L.jaccard([], []), null);
});

/* ---------------- label-agree ---------------- */
test('label-agree：扩充部分甲五十处小例子 po＝0.8、pe＝0.27、κ≈0.726（教学构造）', () => {
  const s = ['删', '删', '改述', '改述', '语气', '事实', '删', '改述', '语气', '删'];
  const m = ['删', '删', '改述', '语气', '语气', '事实', '删', '事实', '语气', '删'];
  const r = L.agreement(s.map((a, i) => ({ item_id: i + 1, label_a: a, label_b: m[i] })), ['删', '改述', '语气', '事实']);
  assert.equal(r.po, 0.8);
  assert.ok(Math.abs(r.pe - 0.27) < 1e-12);
  assert.ok(Math.abs(r.kappa - 0.53 / 0.73) < 1e-12);
  assert.deepEqual(r.disagreements, [4, 8]);
  assert.deepEqual(r.matrix[1], [0, 1, 1, 1], '学生标"改述"的三处：模型一处改述、一处语气、一处事实');
});
/* ---------------- 发出前校验 ---------------- */
const ENTRIES = [
  { id: 'ems-a', text: EMS_A, sendable: true },
  { id: 'ems-b', text: EMS_B, sendable: true },
  { id: 'nakajima-x', text: '（不应出现）', sendable: false, sendable_basis: '与本周无关，不得送模型' },
  { id: 'mao-conclusion', text: '', sendable: true },
];
test('发出前校验：sendable=false 的条目被拦截，fillTemplate 抛错，不发出半份提示', () => {
  const card = { card_id: 'T', materials: [{ entry_id: 'ems-a' }, { entry_id: 'nakajima-x' }], user_template: '{{material:ems-a}}\n{{material:nakajima-x}}' };
  const g = L.gate(card, ENTRIES);
  assert.equal(g.ok, false); assert.equal(g.blocked[0].entry_id, 'nakajima-x');
  assert.throws(() => L.fillTemplate(card, ENTRIES), /发出前校验未通过/);
});
test('发出前校验：线上版没有本机材料包时报"未载入"或"没有正文"，不报错退出页面', () => {
  const g = L.gate({ materials: [{ entry_id: 'mao-conclusion' }, { entry_id: 'mao-history' }] }, ENTRIES);
  assert.deepEqual(g.missing.map((x) => x.entry_id), ['mao-conclusion', 'mao-history']);
});
test('发出前校验：通过时模板填入正文', () => {
  const r = L.fillTemplate({ materials: [{ entry_id: 'ems-a' }, { entry_id: 'ems-b' }], user_template: '甲本：\n{{material:ems-a}}\n乙本：\n{{material:ems-b}}' }, ENTRIES);
  assert.ok(r.messages[0].content.includes('Seine Majestät der König hat es darauf abgelehnt'));
});
test('stripSecrets：去掉 Key 键，字符串里的 Key 值替换', () => {
  const o = L.stripSecrets({ apiKey: 'sk-123', request: { headers: { Authorization: 'Bearer sk-123' }, note: 'used sk-123' } }, ['sk-123']);
  assert.equal(JSON.stringify(o).includes('sk-123'), false);
  assert.equal(o.apiKey, undefined);
});

test('课前运行队列：条件 × 模型 × 次数；已成功的跳过（续跑）', () => {
  const q = L.planPreclass([{ card_id: 'C02B' }], ['deepseek', 'kimi'], 2, [{ run_id: 'C02B_kimi_1', reply: 'x' }, { run_id: 'C02B_deepseek_2', reply: '', error: 'timeout' }]);
  assert.equal(q.jobs.length, 4);
  assert.deepEqual(q.jobs.filter((j) => j.state === '完成').map((j) => j.run_id), ['C02B_kimi_1']);
});
