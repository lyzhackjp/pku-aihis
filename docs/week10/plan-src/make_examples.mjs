// 第十周数据结构示例生成｜候选，未经教师确认｜2026-11-16｜第一步
// 用法：node docs/week10/plan-src/make_examples.mjs   （在仓库根目录运行）
// 只用公开文本（埃姆斯两本、讲义 @fig-chain 摘编、扩充部分乙二成文表、甲五小例子）。所有示例标 _note。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../../apps/week10/prototype/w10-lib.js');
const FX = 'apps/week10/tests/fixtures', OUT = 'docs/week10/examples';
const rd = (n) => fs.readFileSync(path.join(FX, n), 'utf8').trim();
const w = (n, o) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 1) + '\n');

const A = rd('ems_A_abeken.txt'), B = rd('ems_B_presse.txt');
const r = L.align(A, B, { unit: 'word', normalize: [], algorithm: 'difflib' });
w('align-table.ems.example.json', { _note: '结构示例：页面实算的埃姆斯对齐表（与 demo/材料/埃姆斯_对齐表.md 逐条一致）。', format: 'w10-align/v1', witnesses: ['ems-a', 'ems-b'],
  settings: r.settings, stats: r.stats, origin: '页面实算（w10-lib.js align，difflib 兼容）', variants: r.variants.map(({ a_units, b_units, ...v }) => v) });

w('witness.ems.example.json', { _note: '结构示例：见证本（公开）', witnesses: [
  { witness_id: 'ems-a', siglum: '甲', title: '阿贝肯自埃姆斯发给俾斯麦的原电', date_raw: '1870年7月13日', date_iso: '1870-07-13', source_citation: 'GHDI 德文页（底本 Friedrichsruher Ausgabe 第 6b 卷第 1612 号）', page_range: null, text: A, editor_note: null, sendable: true, public: true },
  { witness_id: 'ems-b', siglum: '乙', title: '俾斯麦改定的新闻稿', date_raw: '1870年7月13日', date_iso: '1870-07-13', source_citation: '同上', page_range: null, text: B, editor_note: null, sendable: true, public: true }] });

const chain = JSON.parse(rd('fig_chain_base.json')).rows;
const steps = L.suggestRows(chain, [
  { step_id: 's1', run_id: 'D2A_deepseek_1', date_raw: '6 月 20 日', actor: '井上毅', action: '井上毅致书山県有朋，附上自己的初稿', label: null, label_by: null },
  { step_id: 's2', run_id: 'D2A_deepseek_1', date_raw: '10 月 30 日', actor: '天皇', action: '天皇向山県、芳川下赐勅語', label: null, label_by: null },
  { step_id: 's3', run_id: 'D2A_deepseek_1', date_raw: '7 月', actor: null, action: '（示例：基准表没有的一步）', label: null, label_by: null },
]);
const m = L.matchTimeline(chain, steps);
w('timeline.example.json', { _note: '结构示例，教学构造：三步\"模型时间线\"为人工编写，用来说明字段与 timeline-match 的输出，不是模型回答。', base: chain, steps: m.rows.map(({ range, ...s }) => s), missing: m.missing, count: m.count });

w('chengwen.example.json', { _note: '结构示例：据扩充部分乙二 @fig-chengwen 袁世凯一行（成文时间一栏的推测如实保留）', rows: [
  { doc_id: 'yuan-wuxu-riji', title: '袁世凯《戊戌日记》（《戊戌纪略》）', event_date_raw: '光绪二十四年八月初三至初五日前后', event_date: '1898-09', signed_date_raw: '八月十四日记于天津督署', signed_date: '1898-09-29',
    written_date_alt: [{ date_raw: '光绪三十年以后（补作之说）', date: null, basis: '刘凤翰 1969 第 141、148 页', certainty: '推测' }],
    printed_date_raw: '宣统元年', printed_date: '1909', versions: ['南通翰墨林单行本（1909）', '《申报》连载（1926 年 2 月）', '北京历史博物馆藏钞本'], author_relation: '当事人自述', basis: '刘凤翰 1969；张一麐 1926 年致蔡元培信（郭卫东转引）；成文时间有争议' }] });

const s = ['删', '删', '改述', '改述', '语气', '事实', '删', '改述', '语气', '删'], mm = ['删', '删', '改述', '语气', '语气', '事实', '删', '事实', '语气', '删'];
w('label-pairs.example.json', { _note: '结构示例，教学构造：扩充部分甲五的十处小例子（本稿虚构）', pairs: s.map((a, i) => ({ item_id: i + 1, label_a: a, label_b: mm[i], labeler_a: 'student', labeler_b: 'model' })),
  result: (({ matrix, ...x }) => x)(L.agreement(s.map((a, i) => ({ item_id: i + 1, label_a: a, label_b: mm[i] })), ['删', '改述', '语气', '事实'])) });

w('run-record.pending.example.json', { _note: '结构示例：尚未运行的格。页面显示\"待课前运行\"；不得改标为预存回放。', run_id: 'D1B_kimi_1', card_id: 'D1B', sample_index: 1, mode: 'pending', origin_mode: null,
  preset: 'kimi', model: 'kimi-k3', model_returned: null, endpoint: 'https://api.moonshot.cn/v1/chat/completions', temperature: '固定（kimi-k3 只有思考模式，不传温度）', reasoning_effort: 'low', thinking: 'always',
  prompt: { messages: [], source_ids: ['mao-history', 'mao-conclusion'], gate: { ok: null }, template_hash: null }, reply: null, reasoning: null, finish_reason: null, usage: null, ms: null, attempts: 0,
  date: '2026-11-16T00:00:00+08:00', error: null, web: null, transcription: null, parsed: null, environment: null });

w('sheet.example.json', { _note: '结构示例，教学构造：说明字段与汇总规则，不是对照单的预置行（D15 不预置示例行，教师 2026-11-16）。', rows: [
  { row_id: 'r1', from_page: 'D04', run_id: 'D1B_deepseek_1', point: null, source_ref: { entry_id: 'mao-conclusion', page: '175', page_system: '原刊页', quote: '（学生贴的原文）' }, my_reading: null, model_says: '（示例）', verdict: '过度概括', verdict_prefilled: true, confirmed: false, action: null, reason: null },
  { row_id: 'r2', from_page: 'import', run_id: null, point: '（示例要点）', source_ref: { citation: '（示例）', page: null, page_system: '无', quote: null }, my_reading: '（示例）', model_says: '（示例）', verdict: '模型新见', verdict_prefilled: false, confirmed: false, action: null, reason: null,
    tool_record: { tool: '（示例：某只依据上传文件作答的工具）', version_or_date: '2026-11-16', model: null, files: [{ title: '（示例）', edition: '（示例）', text_layer: '有' }], web_access: false, question: '（示例）', reply: '（示例）', citations_verified: null } }],
  summary: L.sheetSummary([{ verdict: '过度概括' }, { verdict: '模型新见', confirmed: false }]) });
console.log('examples →', OUT, fs.readdirSync(OUT).length, 'files');
