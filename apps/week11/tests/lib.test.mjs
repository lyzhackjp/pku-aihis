// 第十一周计算模块的固定例子（公开材料）｜候选，未经教师确认｜2026-11-25（第一步：测试先写，模块第一批实现）
// 运行：cd apps/week11 && node --test tests/*.test.mjs
// 只用公开或教学构造的材料：练习材料甲（jia_draft.docx）、程序构造的修订夹具、docs/week11/examples/ 下的示例。
// 茅海建文上的复现（ext/quote_check_输出.txt）在 local.test.mjs。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const L = require('../prototype/w11-lib.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const FX = (n) => path.join(here, 'fixtures', n);
const EX = (n) => JSON.parse(fs.readFileSync(path.join(here, '../../../docs/week11/examples', n), 'utf8'));
const buf = (n) => { const b = fs.readFileSync(FX(n)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const sha = (ab) => crypto.createHash('sha256').update(Buffer.from(ab)).digest('hex');
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}：${a} ≠ ${b}`);

/* ---------------- docx 解析与 note-rules（方案第八节；启动 prompt 第五节） ---------------- */
test('parseDocx：练习材料甲 8 条脚注，第 1 页①—⑥、第 2 页①—②（据 w:pageBreakBefore 分页、numRestart=eachPage）', async () => {
  const d = await L.parseDocx(buf('jia_draft.docx'));
  assert.equal(d.settings.numRestart, 'eachPage');
  assert.equal(d.settings.numFmt, 'decimalEnclosedCircleChinese');
  assert.deepEqual(d.footnotes.map((n) => [n.note_id, n.doc_page, n.number_on_page]),
    [['1', 1, 1], ['2', 1, 2], ['3', 1, 3], ['4', 1, 4], ['5', 1, 5], ['6', 1, 6], ['7', 2, 1], ['8', 2, 2]]);
  assert.deepEqual(d.footnotes.map((n) => L.noteLabel(n.number_on_page, d.settings.numFmt)), ['①', '②', '③', '④', '⑤', '⑥', '①', '②']);
  assert.equal(d.paragraphs.filter((p) => p.text.trim()).length, 9, '标题＋8 个正文 Word 段落（第 4 段被分页断开）');
});
test('parseDocx：与 examples/footnotes.jia.example.json 一致（示例由同一文件抽出）', async () => {
  const d = await L.parseDocx(buf('jia_draft.docx'));
  const ex = EX('footnotes.jia.example.json').footnotes;
  assert.deepEqual(d.footnotes.map((n) => [n.note_id, n.doc_page, n.number_on_page, n.text]), ex.map((n) => [n.note_id, n.doc_page, n.number_on_page, n.text]));
});
test('note-rules：第 2 页首条"同上，第38页。"被标出；注②无页码、无"转引"；注①含"转引"；注③为再次引证简式（对上注①中的茅文（一））', async () => {
  const d = await L.parseDocx(buf('jia_draft.docx'));
  const r = L.noteRules(d.footnotes);
  const by = Object.fromEntries(r.notes.map((n) => [n.note_id, n]));
  assert.equal(by['7'].ibid, true); assert.equal(by['7'].ibid_first_on_page, true);
  assert.equal(by['7'].refers_to, '6', '"同上"在文件顺序上指注⑥（郭卫东）');
  assert.equal(by['2'].no_page, true); assert.equal(by['2'].has_transfer, false);
  assert.equal(by['1'].has_transfer, true);
  assert.equal(by['3'].short_form, true); assert.equal(by['3'].repeat_of, '1');
  assert.equal(by['5'].short_form, false, '茅文（三）首次出现，是全式');
  assert.deepEqual(r.issues.map((x) => [x.note_id, x.rule]).sort(), [['2', 'no_page'], ['7', 'ibid_first_on_page']]);
});
test('note-rules：关掉每页重新编号后，第 2 页首条显示⑦，"同上"仍在新页首条（扩充部分丙一进阶层）', async () => {
  const d = await L.parseDocx(buf('jia_draft.docx'));
  const r = L.noteRules(d.footnotes, { restart: false });
  const n7 = r.notes.find((n) => n.note_id === '7');
  assert.equal(n7.label, '⑦'); assert.equal(n7.ibid_first_on_page, true);
});
test('note-rules：拖动分页线使注⑥、第 2 页注①同页时，"同上"不再标红（D15 模拟）', async () => {
  const d = await L.parseDocx(buf('jia_draft.docx'));
  const moved = d.footnotes.map((n) => (n.note_id === '6' ? { ...n, doc_page: 2 } : n));
  const r = L.noteRules(moved);
  assert.ok(!r.issues.some((x) => x.rule === 'ibid_first_on_page'));
});

/* ---------------- docx-revisions（程序构造夹具） ---------------- */
test('docx-revisions：三处正文修订、一处脚注修订、一条批注逐条正确；原文件不被修改', async () => {
  const b = buf('jia_revisions.docx'), h0 = sha(b);
  const exp = JSON.parse(fs.readFileSync(FX('jia_revisions.expected.json'), 'utf8'));
  const r = await L.docxRevisions(b);
  assert.equal(sha(b), h0, '解析前后字节相同');
  assert.equal(r.edits.length, exp.edits.length);
  exp.edits.forEach((e, i) => {
    const g = r.edits[i];
    assert.equal(g.in_footnote, e.in_footnote, `第 ${i + 1} 条 in_footnote`);
    if (e.in_footnote) assert.equal(g.note_id, e.note_id); else assert.equal(g.para_index, e.para_index, `第 ${i + 1} 条段落`);
    assert.equal(g.author, e.author); assert.deepEqual(g.kinds, e.kinds);
    assert.equal(g.removed, e.removed); assert.equal(g.added, e.added);
    assert.ok(g.before.includes(e.before_has), `第 ${i + 1} 条改前含"${e.before_has}"`);
    assert.ok(g.after.includes(e.after_has), `第 ${i + 1} 条改后含"${e.after_has}"`);
    assert.equal(g.comment ?? null, e.comment);
  });
  assert.deepEqual(r.comments.map((c) => [c.id, c.author, c.text]), exp.comments.map((c) => [c.id, c.author, c.text]));
});
test('docx-revisions：没有修订的稿子返回空表，不报错', async () => {
  const r = await L.docxRevisions(buf('jia_draft.docx'));
  assert.deepEqual(r.edits, []); assert.deepEqual(r.comments, []);
});

/* ---------------- outline-rules（练习材料甲，按讲义 @fig-diag 的标注） ---------------- */
const PARAS = EX('paragraphs.jia.example.json').paragraphs;
const flags = (r, rule) => (r.flags.find((f) => f.rule === rule) || { paras: [] }).paras;
test('outline-rules：罗列 P2、一段多事 P4 与 P7、重复 P3／P6、问题晚出 P7、限定后置 P6／P7；反证未回应不报', () => {
  const r = L.outlineRules(PARAS);
  assert.deepEqual(flags(r, '罗列'), ['P2'], '段内连续 4 句以"人名＋年份"开头');
  assert.deepEqual(flags(r, '一段多事'), ['P4', 'P7'], '方案只列 P4；讲义 @fig-diag 第 7 段标"结论＋本文问题"，按标注也报（见出入表）');
  assert.deepEqual(flags(r, '重复'), ['P3', 'P6']);
  assert.deepEqual(flags(r, '问题晚出'), ['P7']);
  assert.deepEqual(flags(r, '限定后置'), ['P6', 'P7']);
  assert.deepEqual(flags(r, '反证未回应'), [], '第 5 段回应了第 4 段；第 5 段把刘路生说反，规则查不出');
});
test('outline-rules：重复用字符二元组重合系数，P3／P6 为 0.341，其余各对 ≤ 0.20（默认门槛 0.30，可调）', () => {
  const r = L.outlineRules(PARAS);
  const pair = r.similarity.find((s) => s.a === 'P3' && s.b === 'P6');
  near(Math.round(pair.overlap * 1000) / 1000, 0.341, 'P3/P6');
  assert.ok(r.similarity.filter((s) => !(s.a === 'P3' && s.b === 'P6')).every((s) => s.overlap <= 0.2));
});
test('outline-rules：把本文的问题移到第 1 段（P1 改答本文问题），"问题晚出"消失（扩充部分甲一"页面反馈"）', () => {
  const moved = PARAS.map((p) => (p.para_id === 'P1' ? { ...p, function2: '提出问题', answers: '告密消息的日期与途径' } : p));
  assert.deepEqual(flags(L.outlineRules(moved), '问题晚出'), []);
});
test('outline-rules：规则可关；关掉"重复"后不再报', () => {
  assert.deepEqual(flags(L.outlineRules(PARAS, { rules: { 重复: false } }), '重复'), []);
});

/* ---------------- recall-pool（扩充部分甲二小例，教学构造） ---------------- */
const TOY = EX('implants-findings.toy.example.json');
test('recall-pool：单次 1/3—2/3，六次合并 {E1,E2}，合并召回率 2/3', () => {
  const r = L.recallPool(TOY);
  const rec = Object.fromEntries(Object.entries(r.perRun).map(([k, v]) => [k, v.recall]));
  near(rec['A-1'], 2 / 3, 'A-1'); near(rec['A-2'], 1 / 3, 'A-2'); near(rec['B-1'], 1 / 3, 'B-1');
  assert.deepEqual(r.union.sort(), ['E1', 'E2']); near(r.recallUnion, 2 / 3, '合并');
});
test('recall-pool：把 A-3 改为也查出 E3，合并召回率跳到 1；未经裁决（matched=0）的不计入', () => {
  const f2 = [...TOY.findings, { run_id: 'A-3', system: 'A', finding_text: '（改）', error_id: 'E3', matched: 1 }];
  near(L.recallPool({ ...TOY, findings: f2 }).recallUnion, 1, '查出 E3');
  const f3 = [...TOY.findings, { run_id: 'A-3', system: 'A', finding_text: '（未裁决）', error_id: 'E3', matched: 0 }];
  near(L.recallPool({ ...TOY, findings: f3 }).recallUnion, 2 / 3, '未裁决');
});
test('recall-pool：只取两次查出相同集合的运行，合并不增（不重合才有收益）；贪心曲线第一步取查出最多的', () => {
  const r = L.recallPool({ ...TOY, runs: ['A-1', 'A-3'] });
  near(r.recallUnion, r.perRun['A-1'].recall, '相同集合');
  const g = L.recallPool(TOY).greedy;
  near(g[0].recall, 2 / 3, '第一步'); near(g[g.length - 1].recall, 2 / 3, '曲线终点');
});

/* ---------------- edit-stats（讲义 @fig-revtable，教学构造） ---------------- */
const EDITS = EX('edits.fig10.example.json').edits;
test('edit-stats：讲义图 10 采纳率 1/3、意思改变占比 3/4，建议使用说明写"段落改写"', () => {
  const s = L.editStats(EDITS);
  assert.equal(s.n, 4); assert.equal(s.n_m, 3); assert.equal(s.a_m, 1); near(s.adoption, 1 / 3, '采纳率');
  assert.equal(s.n_mc, 3); near(s.meaningShare, 3 / 4, '意思改变占比');
  assert.equal(s.suggestLabel, '段落改写');
});
test('edit-stats：第 2 条由拒绝改为采纳，采纳率 1/3 → 2/3（扩充部分甲三公式讲解）', () => {
  const e2 = EDITS.map((e) => (e.edit_id === '2' ? { ...e, decision: 'accept' } : e));
  near(L.editStats(e2).adoption, 2 / 3, '采纳率');
});
test('edit-stats：意思改变按作者最终判断（intention）计，不按表上原标（intention_shown）；把第 1 条改标"意思改变"后占比为 1', () => {
  const e1 = EDITS.map((e) => (e.edit_id === '1' ? { ...e, intention: 'meaning-changed' } : e));
  near(L.editStats(e1).meaningShare, 1, '占比');
  near(L.editStats(EDITS.map((e) => ({ ...e, intention: e.intention_shown }))).meaningShare, 1 / 4, '按原标只算 1/4');
});

/* ---------------- style-count 与超额词 ---------------- */
const STY = EX('style.toy.example.json');
test('style-count：润色前后计数（虚化动词、套语、长"的"字结构），每百字按汉字与字母数字计', () => {
  const d = L.styleDiff(STY.pairs[0].original, STY.pairs[0].revised, STY.rules);
  assert.deepEqual([d.original.counts.R1.n, d.original.counts.R2.n, d.original.counts.R3.n], [0, 0, 0]);
  assert.deepEqual([d.revised.counts.R1.n, d.revised.counts.R2.n, d.revised.counts.R3.n], [1, 1, 1]);
  assert.equal(d.revised.chars, 22);
  near(d.revised.counts.R1.per100, 100 / 22, 'R1 每百字');
  assert.ok(d.delta.R2 > 0);
});
test('style-count：学生新增规则（"笔者以为"）后重新统计', () => {
  const rules = [...STY.rules, { rule_id: 'U1', name: '笔者以为', pattern: '笔者以为', kind: 'wordlist', unit: '每百字' }];
  assert.equal(L.styleCount('笔者以为此说可从。笔者以为不然。', rules).counts.U1.n, 2);
});
test('excessWord：p=(a+1)/(b+1)；q=p₋₂+2·max{p₋₂−p₋₃,0}；δ=p−q；r=p/q（手算固定例）', () => {
  const r = L.excessWord({ a: 99, b: 99999 }, { a: 149, b: 99999 }, { a: 1199, b: 99999 });
  near(r.pm3, 0.001, 'p₋₃'); near(r.pm2, 0.0015, 'p₋₂'); near(r.p, 0.012, 'p');
  near(r.q, 0.0025, 'q'); near(r.delta, 0.0095, 'δ'); near(r.r, 4.8, 'r'); assert.equal(r.maxActive, true);
});
test('excessWord：p₋₂<p₋₃ 时 max 一项取 0，q=p₋₂（保守）', () => {
  const r = L.excessWord({ a: 199, b: 99999 }, { a: 149, b: 99999 }, { a: 1199, b: 99999 });
  near(r.q, 0.0015, 'q'); near(r.r, 8, 'r'); assert.equal(r.maxActive, false);
});

/* ---------------- register ---------------- */
test('register：讲义图 5 四条，修正 3、舍弃 1、采纳 0；"部分采纳"按修正计，原文字保留', () => {
  const rows = EX('register.fig-reg.example.json').rows;
  const s = L.registerSummary(rows, 'diagnosis');
  assert.deepEqual(s.count, { 采纳: 0, 修正: 3, 舍弃: 1 }); assert.equal(s.total, 4);
  assert.deepEqual(L.normalizeDecision('部分采纳', 'diagnosis'), { decision: '修正', decision_raw: '部分采纳' });
});
test('register：处理取值按视图校验（诊断意见不能填"成立"，审读发现不能填"采纳"）', () => {
  assert.throws(() => L.normalizeDecision('成立', 'diagnosis'));
  assert.throws(() => L.normalizeDecision('采纳', 'finding'));
  assert.deepEqual(L.normalizeDecision('存疑', 'finding'), { decision: '存疑', decision_raw: null });
});

/* ---------------- ledger ---------------- */
test('ledger："候选"不能勾入改稿提示；"原段认可"只附例句', () => {
  const es = EX('ledger.jia2.example.json').entries;
  assert.deepEqual(es.map((e) => L.ledgerSelectable(e)), [true, true, false]);
  const s = L.ledgerSnippet(es);
  assert.ok(s.includes('判断词的强度照原样')); assert.ok(!s.includes('少用"值得注意的是"'));
});

/* ---------------- declaration 与 D18 文案（助教 2026-11-25 意见） ---------------- */
const DECL = EX('declaration.example.json').declarations;
test('declaration：附件默认为空；生成文字含四项与两点补充', () => {
  assert.deepEqual(DECL[0].attachments, []);
  const t = L.buildDeclaration(DECL[1]).text;
  for (const k of ['工具信息', '使用环节', '输入与输出记录', '责任归属', '使用方式与参数', '引文逐字回原页']) assert.ok(t.includes(k), `含"${k}"`);
  assert.ok(t.includes('附件一：综述矩阵') && t.includes('附件二：诊断意见登记表'));
  assert.ok(L.buildDeclaration(DECL[0]).text.includes('附件：无'), '未勾选时写"附件：无"');
});
test('D18 文案：写明"附件按个人情况提交"，不写成作业提交', () => {
  const c = L.copyText('D18');
  assert.ok(c.includes('附件按个人情况提交'));
  assert.ok(c.includes('写作时自用') && c.includes('被问到时出示'));
  assert.ok(!/作业|上交|提交表格/.test(c));
});

/* ---------------- 贯穿记录：导出、恢复、坏文件、无 Key ---------------- */
test('through：导出再恢复后一致；导出中无 Key；带 Key 的文件与坏文件被拒，调用者保留旧记录', () => {
  const T = L.emptyThrough();
  T.register = EX('register.fig-reg.example.json').rows; T.edits = EDITS; T.declaration = DECL[1];
  T.runs = [{ ...EX('run-record.pending.example.json'), apiKey: 'sk-SECRET-123' }];
  const s = L.exportThrough(T, ['sk-SECRET-123']);
  assert.ok(!s.includes('sk-SECRET-123') && !/"apiKey"/.test(s));
  const back = L.importThrough(s);
  assert.equal(back.ok, true); assert.deepEqual(back.record.register, T.register); assert.deepEqual(back.record.edits, T.edits);
  assert.equal(L.importThrough('{"format":"w11-through/v1","apiKey":"x"}').ok, false);
  assert.equal(L.importThrough('不是 JSON').ok, false);
  assert.equal(L.importThrough('{"format":"w10-through/v1"}').ok, false, '第十周的记录不冒充第十一周');
  const s2 = L.exportThrough({ ...T, runs: [{ reply: '回答里混进了 sk-SECRET-123' }] }, ['sk-SECRET-123']);
  assert.ok(!s2.includes('sk-SECRET-123'), '字符串里出现已登记的 Key 时整段替换');
});

/* ---------------- gate：sendable=false 被拦截 ---------------- */
const CARDS = EX('condition-cards.w11.json').cards;
test('gate：S3 的账本样板 sendable=false，发出前被拦截，绝不发出半份提示', () => {
  const s3 = CARDS.find((c) => c.card_id === 'S3');
  const entries = [{ id: 'ledger-3', sendable: false, text: '（样板）' }, { id: 'li2023-p152-153', sendable: true, text: '（段落）' }];
  const g = L.gate(s3, entries);
  assert.equal(g.ok, false); assert.deepEqual(g.blocked.map((b) => b.entry_id), ['ledger-3']);
  assert.throws(() => L.fillTemplate(s3, entries), /发出前校验未通过/);
});
test('gate：D2A 只用练习材料甲（公开、可送），回填后不留 {{material:…}}', () => {
  const d2a = CARDS.find((c) => c.card_id === 'D2A');
  const f = L.fillTemplate(d2a, [{ id: 'jia-body', sendable: true, text: '〔1〕……' }]);
  assert.ok(!/\{\{material:/.test(f.messages[0].content));
});
test('gate：缺本机材料包时报"未载入"，不发出（线上版）', () => {
  const d1b = CARDS.find((c) => c.card_id === 'D1B');
  const g = L.gate(d1b, [{ id: 'matrix-fig1-4col', sendable: true, text: '矩阵' }]);
  assert.equal(g.ok, false); assert.deepEqual(g.missing.map((m) => m.entry_id), ['mao-history']);
});

/* ---------------- 课前运行面板（模拟接口，不发真实请求） ---------------- */
test('preclass：不填 Key 时给出明确提示', () => {
  const k = L.checkKeys({ deepseek: '', kimi: '' }, ['deepseek', 'kimi']);
  assert.equal(k.ok, false); assert.match(k.message, /未填 Key/);
});
test('preclass：一个条件 × 两模型 × 两次；中途制造一次失败，续跑补齐；导出不含 Key', async () => {
  const card = CARDS.find((c) => c.card_id === 'D2A');
  let q = L.planPreclass([card], ['deepseek', 'kimi'], 2);
  assert.equal(q.jobs.length, 4);
  let calls = 0;
  const mock = async (job) => { calls++; if (job.run_id === 'D2A_kimi_1' && calls < 5) throw new Error('模拟失败 502'); return { reply: `（模拟回答 ${job.run_id}）`, model: job.preset }; };
  q = await L.runQueue(q, mock);
  assert.deepEqual(q.jobs.map((j) => j.state), ['完成', '完成', '失败', '完成']);
  q = await L.runQueue(q, mock);
  assert.ok(q.jobs.every((j) => j.state === '完成')); assert.equal(calls, 5, '续跑只补失败的一次');
  const T = L.emptyThrough(); T.runs = q.records;
  assert.ok(!/apiKey|sk-/.test(L.exportThrough(T, ['sk-x'])));
});

/* ---------------- borrow-scan（公开小例；茅文上的复现见 local.test.mjs） ---------------- */
const SRC = '〔原刊第10页〕甲乙丙丁戊。〔原刊第11页〕己庚辛壬癸子丑寅卯';
test('borrow-scan：引号外连续相同 ≥k 字的片段；片段以标点起头时，页码按第一个非标点字（page），原脚本的取法另存 page_raw', () => {
  const r = L.borrowScan('前言。己庚辛壬癸子丑寅卯，后语', SRC, { k: 5 });
  assert.equal(r.fragments.length, 1);
  const f = r.fragments[0];
  assert.equal(f.text, '。己庚辛壬癸子丑寅卯'); assert.equal(f.len, 10); assert.equal(f.len_trimmed, 9);
  assert.equal(f.page_raw, '10'); assert.equal(f.page, '11');
});
test('borrow-scan：引号内的文字不算（那是 quote-check 的事）；k 调大到 10 以上时片段消失', () => {
  assert.equal(L.borrowScan('前言“己庚辛壬癸子丑寅卯”后语', SRC, { k: 5 }).fragments.length, 0);
  assert.equal(L.borrowScan('前言。己庚辛壬癸子丑寅卯，后语', SRC, { k: 11 }).fragments.length, 0);
});
test('borrow-scan：原文中的控制字符（如 U+0082）与空白不影响结果', () => {
  const dirty = SRC.replace('癸', '\u0082癸').replace('子', ' 子');
  assert.deepEqual(L.borrowScan('前言。己庚辛壬癸子丑寅卯，后语', dirty, { k: 5 }).fragments.map((f) => f.text), ['。己庚辛壬癸子丑寅卯']);
});

/* ---------------- D16 两头对（教学构造的"模型草拟目录"） ---------------- */
test('bibCrossCheck：B6 目录里多出、注②（刘凤翰）目录里缺；B4 年份被改、B5 题名被改（删副题）；引号写法不同不算改动', () => {
  const f = EX('footnotes.jia.example.json').footnotes, bib = EX('bib.jia.example.json').bib;
  const r = L.bibCrossCheck(f, bib);
  assert.deepEqual(r.orphans_in_bib, ['B6']); assert.deepEqual(r.missing_in_bib, ['2']);
  assert.deepEqual(r.changed, [{ ref_id: 'B4', fields: ['year'] }, { ref_id: 'B5', fields: ['title'] }]);
  for (const b of bib) assert.deepEqual(r.matched[b.ref_id], b.matched_note_ids, b.ref_id);
});
test('outline-rules：同一功能标两次不算"一段多事"（D05 把问题句移到第 1 段的示范）', () => {
  const moved = PARAS.map((p) => (p.para_id === 'P1' ? { ...p, function2: '提出问题', answers: '告密消息的日期与途径' } : p));
  assert.deepEqual(flags(L.outlineRules(moved), '一段多事'), ['P4', 'P7']);
});
