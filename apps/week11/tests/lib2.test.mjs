// 第十一周第二批计算模块的固定例子（公开或教学构造材料）｜候选，未经教师确认｜2026-11-26
// 运行：cd apps/week11 && node --test tests/*.test.mjs
// 会议录（本机材料）上的发言人规则在 local2.test.mjs。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const L = require('../prototype/w11-lib.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const EX = (n) => JSON.parse(fs.readFileSync(path.join(here, '../../../docs/week11/examples', n), 'utf8'));
const buf = (n) => { const b = fs.readFileSync(path.join(here, 'fixtures', n)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

test('applyImplants：唯一定位才植入；出现多次或找不到的拒绝并写明', () => {
  const r = L.applyImplants('甲乙丙。甲丁。', [{ error_id: 'E1', before: '乙丙', after: '戊' }, { error_id: 'E2', before: '甲', after: '己' }, { error_id: 'E3', before: '庚', after: '辛' }]);
  assert.equal(r.text, '甲戊。甲丁。');
  assert.deepEqual(r.applied.map((a) => a.ok), [true, false, false]);
  assert.match(r.applied[1].reason, /出现 2 次/);
  assert.match(r.applied[2].reason, /找不到/);
});

test('pagedSentences：句末圈码归上一句；跨页句子的圈码记所在页（每页重新编号）', () => {
  const s = L.pagedSentences('〔原刊第156页〕甲说“乙”。④丙〔原刊第157页〕丁。①戊。');
  assert.deepEqual(s.map((x) => [x.page, x.marks.map((m) => `${m.page}${m.mark}`).join('')]), [[156, '156④'], [156, '157①'], [157, '']]);
});

test('speakerRules：发言人不在所注原文、院别不符各报一条；原文不在手标"无法核"；删限定查不出', () => {
  const text = '〔原刊第156页〕币原在回应芦田均议员时提出，民主主义可解释为尊重民意。④〔原刊第157页〕众议院议员二荒芳德提出，非天皇本意。①议员们普遍注意到此事。②';
  const roster = { '币原': '幣原', '芦田均': '芦田均', '鸠山一郎': '鳩山一郎', '二荒芳德': '二荒芳徳' };
  const cites = { 156: { '④': 'A' }, 157: { '①': 'B', '②': 'C' } };
  const entries = { A: { text: '鳩山一郎君…幣原喜重郎君', house: '衆議院' }, B: { text: '二荒芳徳君…幣原', house: '貴族院' } };
  const r = L.speakerRules(text, { roster, cites, entries });
  assert.deepEqual(r.flags.map((f) => [f.rule, f.name, f.entry]), [['发言人不在所注原文', '芦田均', 'A'], ['院别与所注原文不符', '众议院', 'B']]);
  assert.deepEqual(r.unchecked.map((u) => [u.entry, u.reason]), [['C', '原文不在手：无法核']]);
});

test('consistency：值由人判、引文去空白引号后机械比；分开算', () => {
  const c = L.consistency([{ value_same: true, q1: '大大加剧了政变的激烈程度', q2: '“大大加剧了 政变的激烈程度”' }, { value_same: false, q1: '甲', q2: '乙' }, { value_same: null, q1: null, q2: null }]);
  assert.equal(c.value, 0.5); assert.equal(c.n_value, 2);
  assert.equal(c.quote, 0.5); assert.equal(c.n_quote, 2);
});

test('revisionView 与 docxRevisions 编号一致；previewSegs 接受、拒绝、未定三种', async () => {
  const b = buf('jia_revisions.docx');
  const [r, v] = await Promise.all([L.docxRevisions(b), L.revisionView(b)]);
  const body = r.edits.filter((e) => !e.in_footnote);
  for (const e of body) {
    const p = v.find((x) => x.index === e.para_index);
    assert.equal(p.segs.filter((s) => s.edit_id === e.edit_id && s.type === 'del').map((s) => s.text).join(''), e.removed);
    assert.equal(p.segs.filter((s) => s.edit_id === e.edit_id && s.type === 'ins').map((s) => s.text).join(''), e.added);
  }
  const e = body.find((x) => x.removed && x.added), p = v.find((x) => x.index === e.para_index);
  const txt = (d) => L.previewSegs(p.segs, { [e.edit_id]: d }).filter((x) => x.state === 'plain' || !x.edit_id || x.edit_id !== e.edit_id).map((x) => x.text).join('');
  assert.ok(txt('accept').includes(e.added) && !txt('accept').includes(e.removed));
  assert.ok(txt('reject').includes(e.removed) && !txt('reject').includes(e.added));
  const und = L.previewSegs(p.segs, {});
  assert.ok(und.some((x) => x.state === 'ins') && und.some((x) => x.state === 'del'));
});

test('boundsCheck：限定语减少、引号词语减少、泛化归属新增', () => {
  const o = '学界已有不少研究。这种做法有过度强调“国体”思想本身的民主性之虞。大谷注意到，“国体”与民主互补。';
  const r = '学界已有不少研究。这种做法过度强调了国家体制的民主性。学界注意到，“国体”与民主互补。';
  const b = L.boundsCheck(o, r);
  assert.deepEqual(b.lostHedges.map((h) => h.word), ['之虞']);
  assert.deepEqual(b.lostQuotes.map((q) => [q.term, q.before, q.after]), [['国体', 2, 1]]);
  assert.deepEqual(b.newGeneric.map((g) => g.word), ['学界']);
});

test('charDiff：两栏差异可还原原文与改后文字', () => {
  const a = '大大加剧了政变的激烈程度', b = '进一步推动了政变';
  const ops = L.charDiff(a, b);
  assert.equal(ops.map((o) => o.a).join(''), a);
  assert.equal(ops.map((o) => o.b).join(''), b);
});

test('labelAgreement：讲义图 10 四条，标对三条＝3/4', () => {
  const items = EX('edits.fig10.example.json').edits.map((e, i) => ({ gold: e.intention, mine: i === 3 ? 'clarity' : e.intention }));
  const g = L.labelAgreement(items);
  assert.deepEqual([g.agree, g.n, g.rate], [3, 4, 0.75]);
});

test('甲二小例：合并召回率 2/3（D07 的"先看计数办法"）', () => {
  const r = L.recallPool(EX('implants-findings.toy.example.json'));
  assert.equal(r.union.length, 2); assert.equal(r.N, 3);
});
