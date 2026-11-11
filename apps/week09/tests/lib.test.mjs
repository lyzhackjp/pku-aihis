// 第九周计算模块的固定例子（方案第八节；讲义与扩充部分的小例子）。运行：node --test apps/week09/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const L = require('../prototype/w09-lib.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const ex = (n) => JSON.parse(fs.readFileSync(path.join(here, '../../../docs/week09/examples', n), 'utf8'));

test('越界率小例子：0、0、1、2 → 0.375（甲一）', () => {
  const r = L.timepointScore([0, 0, 1, 2].map((score, i) => ({ score, source_ref: i ? null : 'x' })));
  assert.equal(r.L, 0.375); assert.equal(r.N, 4); assert.equal(r.noSource, 3);
  assert.equal(L.timepointScore(ex('sentence-labels.example.json').labels).L, 0.375);
});
test('未打分的句子不计入 N', () => {
  assert.equal(L.timepointScore([{ score: 2 }, { score: null }]).L, 1);
  assert.equal(L.timepointScore([]).L, null);
});

const liang = ex('sourcepack.liang.example.json').entries;
const fuku = ex('sourcepack.fukuzawa.example.json').entries;
test('混入第三层材料：1899 年的梁启超包里放《清代学术概论》必须报出（D09）', () => {
  const g = L.sourceGate(liang, '1899', ['liang-wenye', 'liang-qingdai']);
  assert.deepEqual(g.late, ['liang-qingdai']); assert.equal(g.ok, false);
  assert.deepEqual(g.prompt_sources, ['liang-wenye']);
});
test('晚于时点的条目标出；教师确认后才进入提示', () => {
  const g = L.sourceGate(liang, '1899', ['liang-wenye', 'liang-guojia']);
  assert.deepEqual(g.late, ['liang-guojia']);
  assert.deepEqual(L.sourceGate(liang, '1899', ['liang-guojia'], ['liang-guojia']).prompt_sources, ['liang-guojia']);
});
test('sendable=false 的条目被拦截在提示之外，确认也不放行', () => {
  const ids = ['datsuaron-ws', 'fukuzawa-zenshu-10-238'];
  const g = L.sourceGate(fuku, '1885-03-16', ids, ids);
  assert.deepEqual(g.blocked, ['fukuzawa-zenshu-10-238']);
  assert.ok(!g.prompt_sources.includes('fukuzawa-zenshu-10-238'));
  const card = { timepoint: '1885-03-16', sources: ids, confirm: ids, system_prompt: 's', user_prompt: 'q' };
  const fk = fuku.map((e) => e.id === 'fukuzawa-zenshu-10-238' ? { ...e, text: '不应出现的文字' } : e);
  const m = L.buildMessages(card, fk);
  assert.ok(!JSON.stringify(m.messages).includes('不应出现的文字'));
  assert.deepEqual(m.source_ids, ['datsuaron-ws']);
});
test('成文时间跨过时点（1903—1904）为边界，须确认', () => {
  const e = [{ id: 'x', layer: 1, written_date: '1903', written_date_end: '1904', sendable: true }];
  assert.deepEqual(L.sourceGate(e, '1903-12', ['x']).boundary, ['x']);
  assert.deepEqual(L.sourceGate([{ id: 'y', sendable: true, layer: 1 }], '1903', ['y']).unknown, ['y']);
});
test('条件卡：错卡报出，缺用途标出', () => {
  const bad = ex('condition-card.bad.example.json');
  const r = L.checkCard(bad, liang); assert.equal(r.complete, false); assert.deepEqual(r.gate.late, ['liang-qingdai']);
  const r2 = L.checkCard({ ...ex('condition-card.inoue-1912.example.json'), purpose: '' }, []);
  assert.ok(r2.missing.includes('用途'));
});
test('拆句：中文、日文句末与引号', () => {
  assert.deepEqual(L.splitSentences('甲。乙！「丙。」丁'), ['甲。', '乙！', '「丙。」', '丁']);
  assert.equal(L.splitSentences('露國は似て居る。日本は違ふ。').length, 2);
});

test('谢林 3×3 小格：三同类、四异类、一空 → 3/7；θ=0.5 不满意，θ=0.3 满意（甲三）', () => {
  const s = L.sameShare([1, 1, 1, 2, 2, 2, 2, 0], 1);
  assert.equal(s, 3 / 7); assert.ok(s < 0.5); assert.ok(s >= 0.3);
});
test('谢林模型同一种子可复现；θ 较高时 S 上升', () => {
  const a = L.schellingRun({ size: 20, density: 0.85, seed: 7 }, 0.5), b = L.schellingRun({ size: 20, density: 0.85, seed: 7 }, 0.5);
  assert.deepEqual(a.st.grid, b.st.grid);
  assert.ok(a.final.S > a.trace[0].S);
});

test('纳什议价小表选出 (3,3)（甲八）', () => {
  const r = L.nashBargain([{ id: '甲', payoff: [3, 3] }, { id: '乙', payoff: [5, 1] }], [1, 1]);
  assert.deepEqual(r.best.payoff, [3, 3]); assert.equal(r.rows[0].product, 4); assert.equal(r.rows[1].product, 0);
});
test('种群：制裁者增多，背约者收益下降', () => {
  const lo = L.populationPayoffs({ 守约者: 0.6, 背约者: 0.4, 制裁者: 0 }), hi = L.populationPayoffs({ 守约者: 0.2, 背约者: 0.4, 制裁者: 0.4 });
  assert.ok(hi['背约者'] < lo['背约者']);
});

test('折叠曲面：u=−3、w=0 三根 −√3、0、√3；w=2 落在边界上（甲五）', () => {
  const r0 = L.cuspRoots(-3, 0); [-Math.sqrt(3), 0, Math.sqrt(3)].forEach((v, i) => assert.ok(Math.abs(r0[i] - v) < 1e-9));
  const s = L.cuspState(-3, 2); assert.equal(s.D, 0); assert.ok(s.onBoundary);
  assert.deepEqual(s.roots.map((x) => Math.round(x * 1e9) / 1e9), [-2, 1]);
});
test('逆向仿真误差小例子 0.0225（甲六）', () => { assert.ok(Math.abs(L.sqError([0.7, 0.3, 0.3], [0.6, 0.35, 0.2]) - 0.0225) < 1e-12); });
test('归一化准确率 0.7/0.8=0.875；缺重答列不可算（甲七）', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ respondent: 'A', item: 'q' + i, answer_self: 'y', answer_agent: i < 7 ? 'y' : 'n', answer_retest: i < 8 ? 'y' : 'n' }));
  assert.ok(Math.abs(L.normalizedAccuracy(rows).mean - 0.875) < 1e-12);
  assert.equal(L.normalizedAccuracy(rows.map((r) => ({ ...r, answer_retest: null }))).mean, null);
});

test('贯穿记录：导出不含 Key，恢复后一致，坏文件保留旧记录（D23）', () => {
  const key = 'sk-test-0123456789';
  const rec = { ...L.emptyThrough(), runs: [{ run_id: 'r1', mode: 'live', model: 'm', prompt: { messages: [] }, reply: 'ok', apiKey: key, date: 'x' }], labels: [{ run_id: 'r1', sentence_index: 0, sentence: 's', score: 1 }], cards: [{ id: 'c', authorization: 'Bearer ' + key }] };
  const text = L.exportThrough(rec, [key]);
  assert.ok(!text.includes(key)); assert.ok(!/apiKey|authorization/.test(text));
  const back = L.importThrough(text, null); assert.ok(back.ok);
  assert.deepEqual(back.record.labels, rec.labels);
  assert.equal(back.record.runs[0].mode, 'replay'); assert.equal(back.record.runs[0].origin_mode, 'live');
  const cur = { keep: 1 }; const bad = L.importThrough('{"format":"x"}', cur); assert.equal(bad.ok, false); assert.equal(bad.record, cur);
  assert.equal(L.importThrough('不是 JSON', cur).record, cur);
});

test('差分方程第一步 0.495／0.117，第 60 步 0.130／0.039（甲四 @tab-a4）', () => {
  const r = L.diffEq(); const R = (v) => Math.round(v * 1000) / 1000;
  assert.equal(R(r.xs[1]), 0.495); assert.equal(R(r.ys[1]), 0.117); assert.equal(R(r.xs[10]), 0.258); assert.equal(R(r.xs[60]), 0.13); assert.equal(R(r.ys[60]), 0.039);
});
test('折叠：w 从 0 拖到 2 以上，右洼消失，小球跳到左洼（甲五）', () => {
  const S = L.cuspSettle(Math.sqrt(3), -3, 1.5); assert.ok(S > 0.5);
  const S2 = L.cuspSettle(S, -3, 2.2); assert.ok(S2 < -1.5);
});
test('遗传算法：单谷收敛到 (0.6,0.4)；双谷十次分落两处（甲六）', () => {
  const g = L.gaRun('single', { seed: 5 }); assert.ok(Math.abs(g.best[0] - 0.6) < 0.05 && Math.abs(g.best[1] - 0.4) < 0.05);
  const ends = Array.from({ length: 10 }, (_, i) => L.gaRun('double', { seed: i + 1 }).best[0] < 0.5 ? 'L' : 'R');
  assert.ok(ends.includes('L') && ends.includes('R'));
});
test('族谱简表：不删记录时母亲权重约 0.28；删去一半后变小（教学构造）', () => {
  const a = L.fitWeights(0), b = L.fitWeights(0.5);
  assert.ok(Math.abs(a.mother - 0.28) < 0.03); assert.ok(b.mother < a.mother - 0.05);
});
