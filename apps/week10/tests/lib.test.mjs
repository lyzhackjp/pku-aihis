// 第十周计算模块的固定例子｜候选，未经教师确认｜2026-11-16（第一步）
// 运行：cd apps/week10 && node --test tests/
// 公开部分只用公开文本（埃姆斯两本、勅語成文、讲义的起草简表摘编）；
// 受限材料（茅海建文、海後录文、prompts.json）的检查在 local.test.mjs，找不到本机材料时跳过并写明。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const L = require('../prototype/w10-lib.js');
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

/* ---------------- timeline-match ---------------- */
const CHAIN = fxj('fig_chain_base.json').rows;// 讲义 @fig-chain 十行（本课摘编，非原文）
test('timeline-match：模糊日期的区间（本课约定）', () => {
  assert.deepEqual(L.parseDateRange('6 月 20 日', 1890), { from: '1890-06-20', to: '1890-06-20', rule: '确定日期' });
  assert.deepEqual(L.parseDateRange('2 月 17—26 日', 1890), { from: '1890-02-17', to: '1890-02-26', rule: '日期区间' });
  assert.deepEqual(L.parseDateRange('6 月 10 日前后', 1890), { from: '1890-06-05', to: '1890-06-15', rule: '前后 ±5 日' });
  assert.equal(L.parseDateRange('8 月', 1890).to, '1890-08-31');
  assert.equal(L.parseDateRange('十月二十四日', 1890).from, '1890-10-24');
  assert.deepEqual(L.parseDateRange('十一月上旬', 1890), { from: '1890-11-01', to: '1890-11-10', rule: '上旬' });
  assert.equal(L.parseDateRange('一月末ごろ', 1890).from, '1890-01-21');
  assert.equal(L.parseDateRange('6 月 17 日以后', 1890).to, '1890-07-17');
  assert.equal(L.parseDateRange('无日期', 1890), null);
});
test('timeline-match：把基准表本身当模型输出，全部"相合"（方案第八节）', () => {
  const steps = L.suggestRows(CHAIN, CHAIN.map((r, i) => ({ step_id: 's' + i, date_raw: r.date_raw, action: r.action })));
  assert.ok(steps.every((s, i) => s.base_row === CHAIN[i].row), '预填对应行');
  const m = L.matchTimeline(CHAIN, steps);
  assert.deepEqual(m.count, { 相合: 10, 多出: 0, 日期不符: 0, 缺失: 0 });
});
test('timeline-match：删去一行报"缺失"一行；多一行无对应的报"多出"；日期错报"日期不符"', () => {
  const steps = CHAIN.slice(1).map((r, i) => ({ step_id: 's' + i, date_raw: r.date_raw, action: r.action, base_row: r.row }));
  steps.push({ step_id: 'x', date_raw: '7 月 1 日', action: '第一回众议院选举', base_row: null });
  steps[2] = { ...steps[2], date_raw: '7 月 20 日' };
  const m = L.matchTimeline(CHAIN, steps);
  assert.equal(m.count.缺失, 1); assert.equal(m.missing[0].base_row, CHAIN[0].row);
  assert.equal(m.count.多出, 1); assert.equal(m.count.日期不符, 1); assert.equal(m.count.相合, 8);
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

/* ---------------- claim-sheet 与对照单 ---------------- */
test('claim-sheet：五条主张 有据 3、说宽 1、无据 1 → FActScore＝3/5（扩充部分甲二）', () => {
  const r = L.factScore([{ verdict: '有据' }, { verdict: '有据' }, { verdict: '说宽' }, { verdict: '无据' }, { verdict: '有据' }]);
  assert.equal(r.score, 0.6);
  assert.equal(L.factScore([{ verdict: '有据' }, { verdict: null }]).score, 1, '未标的不计');
  assert.equal(L.pointRecall([{ in_summary: 'yes' }, { in_summary: 'no' }, { in_summary: 'partial' }]).recall, 1 / 3);
});
test('对照单：模型新见未勾"已回原文确认"时不计入（方案第八节 D15）', () => {
  const rows = [
    { from_page: 'D04', verdict: L.verdictToSheet('有据') },
    { from_page: 'D12', verdict: '归属错误' },
    { from_page: 'import', verdict: '模型新见', confirmed: false },
    { from_page: 'import', verdict: '模型新见', confirmed: true },
  ];
  const s = L.sheetSummary(rows);
  assert.equal(s.count.一致, 1); assert.equal(s.count.归属错误, 1); assert.equal(s.count.模型新见, 1);
  assert.equal(s.pending_new, 1); assert.equal(s.total, 3);
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

/* ---------------- 第一批：解析、记录、课前运行队列 ---------------- */
test('解析：时间线逐行取日期与［材料：月日］标注（D06、D07）', () => {
  const t = '1. **6月20日**：井上毅致书山県有朋，附初稿［材料：六月二十日］\n2. 6月下旬 井上把初稿送元田征求意见［推测］\n说明文字\n- 10月30日 天皇下赐勅語［自知］';
  const s = L.parseTimeline(t, { run_id: 'R1' });
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => x.date_raw), ['6月20日', '6月下旬', '10月30日']);
  assert.deepEqual(s.map((x) => x.label), ['材料', '推测', '自知']);
  assert.equal(s[0].label_date, '六月二十日');
  assert.ok(s[1].action.includes('说明文字'), '无日期的行并入上一步');
});
test('解析：［材料：月日］到年表录文中抽查（D07）', () => {
  const src = '六月二十日井上毅山県首相に書を送り……';
  assert.equal(L.checkLabelDate({ label: '材料', label_date: '6月20日' }, src).status, 'found');
  assert.equal(L.checkLabelDate({ label: '材料', label_date: '7月3日' }, src).status, 'not-found');
  assert.equal(L.checkLabelDate({ label: '自知', date_raw: '6月20日' }, src).status, 'n/a');
  assert.deepEqual(L.monthDayForms('10 月 24 日'), ['十月二十四日', '10月24日']);
});
test('解析：Markdown 表格与 C02B 召回、多报（D10）', () => {
  const md = '| 编号 | 甲本文字 | 乙本文字 | 类型 |\n|---|---|---|---|\n| 1 | zu sagen | mitzuteilen | 改 |\n| 2 | （无） | vom Dienst | 增 |\n| 3 | Ems | Paris | 改 |';
  const t = L.parseMdTable(md);
  assert.equal(t.rows.length, 3);
  const rows = L.variantRowsFromTable(t);
  assert.equal(rows[1].a, '');
  const r = L.align(EMS_A, EMS_B, { unit: 'word' });
  const m = L.matchVariants(r.variants, rows);
  assert.equal(m.hit, 2); assert.equal(m.over, 1); assert.equal(m.recall, 2 / 20);
  assert.ok(m.missed.includes('V01'));
});
test('拆句', () => { assert.deepEqual(L.splitSentences('甲。乙！\n丙？'), ['甲。', '乙！', '丙？']); });
test('贯穿记录：导出再导入一致；导出中无 Key；坏文件不替换旧记录（D16）', () => {
  const T = L.emptyThrough();
  T.sheet.push({ row_id: 'r1', verdict: '一致' }); T.runs.push({ run_id: 'x', mode: 'live', reply: 'ok', request: { headers: { Authorization: 'Bearer sk-abc123' } } });
  const s = L.exportThrough(T, ['sk-abc123']);
  assert.equal(s.includes('sk-abc123'), false);
  const back = L.importThrough(s);
  assert.equal(back.ok, true); assert.deepEqual(back.record.sheet, T.sheet);
  assert.equal(back.record.runs[0].mode, 'replay'); assert.equal(back.record.runs[0].origin_mode, 'live');
  assert.equal(L.importThrough('{bad').ok, false);
  assert.equal(L.importThrough('{"format":"w09-through/v1"}').ok, false);
  assert.equal(L.importThrough('{"format":"w10-through/v1","sheet":{}}').ok, false);
});
test('课前运行队列：条件 × 模型 × 次数；已成功的跳过（续跑）', () => {
  const q = L.planPreclass([{ card_id: 'C02B' }], ['deepseek', 'kimi'], 2, [{ run_id: 'C02B_kimi_1', reply: 'x' }, { run_id: 'C02B_deepseek_2', reply: '', error: 'timeout' }]);
  assert.equal(q.jobs.length, 4);
  assert.deepEqual(q.jobs.filter((j) => j.state === '完成').map((j) => j.run_id), ['C02B_kimi_1']);
});
test('解析：表格形式与只到年的时间线（Kimi 课前回答的写法，2026-11-17 实测后补）', () => {
  const t = '| 时间 | 事件 | 与起草的关系 |\n|---|---|---|\n| 1890年6月20日 | 井上毅致书山県，附初稿 | 底本 |\n| 2月17—26日 | 地方官会议 | 发端 |';
  const s = L.parseTimeline(t);
  assert.deepEqual(s.map((x) => x.date_raw), ['1890年6月20日', '2月17—26日']);
  assert.equal(s[0].action, '井上毅致书山県，附初稿；底本');
  const y = L.parseTimeline('- **1879年**：颁布《教学聖旨》\n- **1890年10月30日**：下赐');
  assert.deepEqual(y.map((x) => x.date_raw), ['1879年', '1890年10月30日']);
  assert.equal(L.parseDateRange('1890年10月30日', 1890).from, '1890-10-30');
  assert.equal(L.parseDateRange('1879年', 1890), null);
});
test('C02B 覆盖：模型按句列异文时，一行覆盖程序的几处；整句删除算列到；只含相同文字的一行算多报（2026-11-17 据实测改）', () => {
  const r = L.align(EMS_A, EMS_B, { unit: 'word' });
  const rows = [
    { a: 'Ich wies ihn, zuletzt etwas ernst, zurück, da man à tous jamais dergleichen Engagements nicht nehmen dürfe, noch könne.', b: '' },
    { a: 'nichts weiter zu sagen habe', b: 'nichts weiter mitzuteilen habe' },
    { a: 'Benedetti', b: 'Benedetti' },
    { a: 'völlig erfundener Satz hier', b: '' },
  ];
  const c = L.coverVariants(r, rows);
  assert.ok(c.covered.includes('V10') && c.covered.includes('V19'));
  assert.equal(c.unlocated, 2, '单词一行（不足 2 词）与编造的一行都定位不回');
  assert.equal(c.recall, c.covered.length / 20);
});
test('时间线预填：措辞不同而日期精确对得上时也预填（2026-11-17）', () => {
  const s = L.suggestRows(CHAIN, [{ step_id: 'x', date_raw: '1890年10月30日', action: '明治天皇裁可，以《教育ニ関スル勅語》颁布，授予文相' }]);
  assert.equal(s[0].base_row, 10);
});
test('解析：只有月份的小标题不算一步；日期单独一行、事项在下一行的照样接上', () => {
  const s = L.parseTimeline('**2月**\n- **2月17日** 地方官会议开始\n**6月20日**\n井上毅致书山県');
  assert.deepEqual(s.map((x) => [x.date_raw, x.action]), [['2月17日', '地方官会议开始'], ['6月20日', '井上毅致书山県']]);
});

test('第三批 D17：移位示意——整段挪动被 LCS 算成一增一删（教学构造的两行）', () => {
  const a = [...'一旦緩急アレハ義勇公ニ奉シ'], b = [...'義勇公ニ奉シ一旦緩急アレハ'];
  const ops = L.lcsOpcodes(a, b).filter((o) => o[0] !== 'equal').map((o) => o[0]);
  assert.deepEqual(ops, ['insert', 'delete']);
  assert.equal(L.lcsTable(a, b)[a.length][b.length], 7);
});

test('第三批 D19、D20：贯穿记录含 truthpairs、drafts，导入时缺字段补空数组', () => {
  const r = L.importThrough(JSON.stringify({ format: 'w10-through/v1' }));
  assert.ok(r.ok); assert.deepEqual(r.record.truthpairs, []); assert.deepEqual(r.record.drafts, []);
  assert.equal(L.importThrough(JSON.stringify({ format: 'w10-through/v1', drafts: {} })).ok, false);
});
