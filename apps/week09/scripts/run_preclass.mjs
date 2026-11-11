// 第九周课前运行（R-1、R-3、R-4、R-5、R-6、R-8、R-9）｜候选，未经教师确认｜2026-11-11
// 复用课件本身的提示组装（w09-lib.js buildMessages、条件卡 data/w09-cards.js）与调用模块（live/w9-live.js），
// 在 Node 中发出与页面相同的请求；记录格式与页面"现场调用"一致（mode: live），另写明运行环境。
//
// 用法：node apps/week09/scripts/run_preclass.mjs <输出目录> [--only R-1,R-3,R-3b] [--base-deepseek URL] [--base-kimi URL] [--dry]
//   Key 只从 apps/week09/local-only/keys.env 读（DEEPSEEK_API_KEY=… / KIMI_API_KEY=…），只在内存；
//   记录写入前用 redact 去掉 Key，写完再逐个文件检查。已存在的 run_id 跳过（可中断后续跑）。
//   材料：apps/week09/local-only/week09-pack.json（本机材料包，含录文）；没有时只用公开包。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..'), proto = path.join(app, 'prototype');
const args = process.argv.slice(2), outDir = path.resolve(args[0] || 'preclass-out');
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = (opt('--only') || '').split(',').filter(Boolean), dry = args.includes('--dry');
const BASE = { deepseek: opt('--base-deepseek'), kimi: opt('--base-kimi') };

/* ---------- 课件模块 ---------- */
globalThis.window = globalThis; globalThis.document = { dispatchEvent() {} }; globalThis.CustomEvent ??= class { constructor(t, o) { this.type = t; this.detail = o?.detail; } };
const L = createRequire(import.meta.url)(path.join(proto, 'w09-lib.js'));
vm.runInThisContext(fs.readFileSync(path.join(proto, 'data/w09-public.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(proto, 'data/w09-cards.js'), 'utf8'));
await import(path.join(proto, 'live/w9-live.js'));
const Live = globalThis.W9Live, CARDS = globalThis.W9_CARDS, SIM = globalThis.W9_SIM;

/* 材料：与页面 Mat.entries() 相同的合并规则——本机包的同 id 条目覆盖公开包 */
const byId = new Map();
for (const p of globalThis.W9_PUBLIC.packs) for (const e of p.entries) byId.set(e.id, { ...e, pack: p.id });
const localPack = path.join(app, 'local-only/week09-pack.json');
const hasLocal = fs.existsSync(localPack);
if (hasLocal) for (const p of JSON.parse(fs.readFileSync(localPack, 'utf8')).packs || []) for (const e of p.entries) byId.set(e.id, { ...byId.get(e.id), ...e, pack: p.id });
const entries = [...byId.values()];

/* ---------- Key：只在内存 ---------- */
const keys = {};
const kf = path.join(app, 'local-only/keys.env');
if (fs.existsSync(kf)) for (const line of fs.readFileSync(kf, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*(DEEPSEEK|KIMI)_API_KEY\s*=\s*["']?([^"'\s]+)/); if (m) keys[m[1].toLowerCase()] = m[2]; }
for (const p of ['deepseek', 'kimi']) if (process.env[`W9_TEST_KEY_${p.toUpperCase()}`]) keys[p] = process.env[`W9_TEST_KEY_${p.toUpperCase()}`]; // 只供模拟接口验收
const secrets = Object.values(keys).filter(Boolean);
const scrub = (s) => secrets.reduce((t, k) => t.split(k).join('[已去除]'), s);

/* 教师已确认保留的跨时点条目（与页面 Confirm 一致；教师 2026-11-11 在 D01 勾选 card-1b 的《新大陸遊記》） */
const CONFIRM = { 'card-1b': ['liang-xindalu'] };
const MODELS = { deepseek: 'deepseek-flash', kimi: 'kimi-k3' };
const ENV = `Node ${process.version}（${os.platform()} ${os.arch()}）；教师 Mac 上的 Claude 会话虚拟机；scripts/run_preclass.mjs 复用课件 buildMessages 与 live/w9-live.js；运行者 Claude（教师 2026-11-11 授权）`;
const DAY = '20261111';

fs.mkdirSync(outDir, { recursive: true });
const exists = (id) => fs.existsSync(path.join(outDir, id + '.json'));
const save = (obj, id) => { const s = scrub(JSON.stringify(obj, null, 1)); for (const k of secrets) if (s.includes(k)) throw new Error('Key 进入了记录：' + id); fs.writeFileSync(path.join(outDir, id + '.json'), s + '\n'); };

async function callCard(card, preset, runId, sample) {
  const c = { ...card, confirm: [...(card.confirm || []), ...(CONFIRM[card.id] || [])] };
  const built = L.buildMessages(c, entries);
  if (built.gate.blocked.some((id) => built.source_ids.includes(id))) throw new Error('不可送模型的条目进入了提示：' + card.id);
  if (built.empty.length) console.warn(`  注意：${card.id} 的 ${built.empty.join('、')} 没有录文${hasLocal ? '' : '（未找到本机材料包）'}`);
  if (dry) return { run_id: runId, dry: true, messages: built.messages };
  if (!keys[preset]) throw new Error(`缺 ${preset} 的 Key（local-only/keys.env）`);
  const req = { presetId: preset, model: MODELS[preset], baseUrl: BASE[preset] || undefined, apiKey: keys[preset], messages: built.messages, temperature: preset === 'kimi' ? undefined : (typeof card.temperature === 'number' ? card.temperature : 0.7) };
  let out = await Live.call(req), attempts = 1;
  if (!out.ok) { await new Promise((r) => setTimeout(r, 3000)); out = await Live.call(req); attempts = 2; } // 失败只重试一次；两次都失败就如实记失败
  const { request_body, ...o } = out;
  return { run_id: runId, card_id: card.id, sample_index: sample, prompt: { messages: built.messages, source_ids: built.source_ids, gate: built.gate }, mode: 'live', model: o.model, model_returned: o.model_returned, preset, endpoint: o.endpoint, temperature: o.temperature, reasoning_effort: o.reasoning_effort, reply: o.reply, finish_reason: o.finish_reason, usage: o.usage, ms: o.ms, date: new Date().toISOString(), error: o.ok ? null : o.error, environment: ENV, batch: 'preclass-' + DAY, attempts };
}

/* ---------- 清单（第一步文件第六节） ---------- */
const card = (id) => CARDS.find((c) => c.id === id);
const plan = [];
const grid = (group, ids, presets, samples) => { for (const id of ids) for (const p of presets) for (const n of samples) plan.push({ group, card: id, preset: p, sample: n }); };
grid('R-1', ['card-1a', 'card-1b'], ['deepseek', 'kimi'], [2, 3]); // 第 1 次为教师 2026-11-11 页面现场调用
grid('R-3', ['card-2a', 'card-2b'], ['deepseek', 'kimi'], [2, 3]);
grid('R-3b', ['card-2c', 'card-2d'], ['deepseek', 'kimi'], [1, 2, 3]); // 署年检验（扩充部分乙一卡二问二），2026-11-11 设计复查后补
grid('R-4', ['card-3a', 'card-3b'], ['deepseek'], [1, 2, 3]);
grid('R-5', ['card-3a', 'card-3b'], ['kimi'], [1, 2, 3]);
grid('R-6', ['card-4-1', 'card-4-2', 'card-4-3'], ['deepseek', 'kimi'], [1, 2, 3]);
const sims = [{ group: 'R-8', preset: 'deepseek' }, { group: 'R-9', preset: 'kimi' }];
const want = (g) => !only.length || only.includes(g);

const index = [], failures = [];
for (const it of plan.filter((x) => want(x.group))) {
  const id = `R-${it.card}-${it.preset}-s${it.sample}-${DAY}`;
  if (exists(id)) { console.log('跳过（已有）', id); continue; }
  try {
    const r = await callCard(card(it.card), it.preset, id, it.sample);
    if (!dry) save(r, id);
    console.log(`${it.group} ${id} ${r.error ? '失败：' + r.error : `完成 ${r.ms ?? ''} ms`}`);
    if (r.error) failures.push(id);
    index.push(r);
  } catch (e) { console.log(`${it.group} ${id} 未运行：${scrub(String(e.message || e))}`); failures.push(id); }
}

/* 演示④：两角色同一模型，三轮，与页面 DialogueLab 相同的记忆与截断规则 */
for (const s of sims.filter((x) => want(x.group))) {
  const simId = `${SIM.sim_id}-${s.preset}-${DAY}`;
  if (exists(simId)) { console.log('跳过（已有）', simId); continue; }
  const memory = [], steps = []; let broke = false;
  for (const round of SIM.rounds) {
    for (const name of SIM.moderator.order) {
      const actor = SIM.actors.find((a) => a.name === name);
      const c = L.simStepCard(SIM, round, actor, memory); // 与页面 DialogueLab 共用
      const id = `R-${simId}-r${round.id}-${name}`;
      try {
        /* 可续跑：本步已有记录就沿用（记忆据已存回答重建），不重新调用 */
        const r = exists(id) ? JSON.parse(fs.readFileSync(path.join(outDir, id + '.json'), 'utf8')) : await callCard(c, s.preset, id, 1);
        if (dry) { memory.push({ actor: name, reply: '（试运行）' }); continue; }
        if (!exists(id)) { save({ ...r, sim_id: simId }, id); index.push(r); }
        if (r.error) { failures.push(id); broke = true; break; }
        const acc = L.simAccept(SIM, round, r.reply), accepted = acc.accepted;
        memory.push({ actor: name, reply: acc.reply });
        steps.push({ round: round.id, actor: name, run_id: id, kind: 'live', memory_len: memory.length, accepted, moderator_note: acc.moderator_note });
        console.log(`${s.group} ${id} 完成 ${r.ms} ms${accepted ? '' : '（超长，截断）'}`);
      } catch (e) { console.log(`${s.group} ${id} 未运行：${scrub(String(e.message || e))}`); failures.push(id); broke = true; break; }
    }
    if (broke) break;
  }
  if (!dry && !broke) save({ format: 'w09-sim/v1', sim_id: simId, setup: { actors: SIM.actors, moderator: SIM.moderator, rounds: SIM.rounds, driver: { preset: s.preset, model: MODELS[s.preset] } }, steps, environment: ENV, date: new Date().toISOString() }, simId);
}

/* 索引（追加已有文件，重建） */
const rows = [['run_id', 'card_id', 'sample_index', 'mode', 'model', 'model_returned', 'ms', 'error', '文件名']];
for (const fn of fs.readdirSync(outDir).filter((f) => f.endsWith('.json')).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(outDir, fn), 'utf8'));
  if (j.run_id) rows.push([j.run_id, j.card_id, j.sample_index, j.mode, j.model, j.model_returned, j.ms, j.error || '', fn]);
}
if (!dry) fs.writeFileSync(path.join(outDir, 'index.csv'), rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n') + '\n');
/* 写完再查一遍 */
let leak = 0; for (const fn of fs.readdirSync(outDir)) { const t = fs.readFileSync(path.join(outDir, fn), 'utf8'); if (secrets.some((k) => t.includes(k)) || /Bearer\s+\S{8,}/.test(t)) { leak++; console.log('！含 Key：', fn); } }
console.log(`本次 ${index.length} 次调用，失败 ${failures.length}${failures.length ? '：' + failures.join('、') : ''}；目录中含 Key 的文件 ${leak} 个；记录 ${rows.length - 1} 条`);
process.exit(leak ? 2 : 0);
