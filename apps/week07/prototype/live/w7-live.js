/* 第七周：现场实体抽取（D23、D30）、模型接入页、通用材料导入。
 * 模型接入沿用第六周顶栏“模型接入”的配置方式（modules/history-demo/ocr/api.mjs 与 api-presets.json，原样复制于 live/vendor/）；
 * 通用导入沿用 apps/material-importer（PKU_IMPORT_READY／PKU_PROJECT 握手，pku-history-project/v1）。
 * 本文件是 ES 模块，须经本机 HTTP 服务打开课件（file:// 下浏览器不载入模块；其余页面不受影响）。
 * Key 只在本页内存；刷新清除。运行记录（请求、回复、耗时、错误）存本机 IndexedDB，导出时剔除 Key。 */
import * as API from './vendor/api.mjs';

const Deck = window.Deck, W = window.W7, { esc, store, download } = Deck;
const LIVE_VERSION = '2026-10-28';

/* ================= 存储 ================= */
const DBN = 'pku-aihis-week07-live';
const idb = () => new Promise((ok, no) => { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => { r.result.createObjectStore('runs', { keyPath: 'id' }); r.result.createObjectStore('kv'); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
async function tx(storeName, mode, fn) { const db = await idb(); return new Promise((ok, no) => { const t = db.transaction(storeName, mode); const s = t.objectStore(storeName); const r = fn(s); t.oncomplete = () => ok(r?.result); t.onerror = () => no(t.error); }); }
const kvGet = (k) => tx('kv', 'readonly', (s) => s.get(k)).catch(() => null);
const kvPut = (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k));
const runPut = (r) => tx('runs', 'readwrite', (s) => s.put(r)).catch((e) => console.warn('运行记录未保存', e));
const runAll = () => tx('runs', 'readonly', (s) => s.getAll()).catch(() => []);
const runClear = () => tx('runs', 'readwrite', (s) => s.clear());
const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
async function sha256(text) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); } catch { return null; } }

/* ================= 模型配置（同第六周：每份配置单独保存，Key 不落盘） ================= */
let PRESETS = []; const SKEY = 'week07-model-profiles-v1';
let profiles = [], selected = null;
const presetsReady = fetch(new URL('./vendor/api-presets.json', import.meta.url)).then((r) => r.json()).then((p) => { PRESETS = p; initProfiles(); });
function defaults(preset = 'deepseek', id = crypto.randomUUID()) {
  const p = PRESETS.find((x) => x.id === preset) || PRESETS[0];
  return { id, preset: p.id, baseUrl: p.baseUrl, model: p.model || '', apiKey: '', protocol: p.protocol, proxy: false, format: p.protocol === 'anthropic' ? 'free' : 'json', test: null };
}
function initProfiles() {
  try { profiles = JSON.parse(localStorage.getItem(SKEY) || '[]').map((p) => ({ ...defaults(p.preset, p.id), ...p, apiKey: '', test: null })); } catch { profiles = []; }
  if (!profiles.length) profiles = [defaults('deepseek'), { ...defaults('local'), model: 'qwen3:4b' }];
  selected = localStorage.getItem(SKEY + '-sel'); if (!profiles.some((p) => p.id === selected)) selected = profiles[0].id;
  emit('w7-live');
}
function persist() { try { localStorage.setItem(SKEY, JSON.stringify(profiles.map(({ apiKey, test, ...p }) => p))); localStorage.setItem(SKEY + '-sel', selected); } catch { /* ignore */ } emit('w7-live'); }
const profile = (id = selected) => profiles.find((p) => p.id === id) || profiles[0];
function setProfile(patch, id = selected) {
  const i = profiles.findIndex((p) => p.id === id); if (i < 0) return; let p = profiles[i];
  if (patch.preset && patch.preset !== p.preset) p = defaults(patch.preset, p.id);
  const changed = ['baseUrl', 'model', 'apiKey', 'protocol', 'proxy'].some((k) => k in patch && patch[k] !== p[k]);
  profiles[i] = { ...p, ...patch, ...(changed ? { test: null } : {}) }; persist();
}
/* 从网上地址（GitHub Pages 等）连本机服务：浏览器要允许“访问本机应用／本地网络”，本机服务要放行本站来源。 */
const LOCAL_FROM_WEB = `从网上地址连本机模型服务需要两步：① 浏览器弹出“访问本机上的应用（本地网络）”时选允许，或在地址栏左侧的网站设置中把该项改为允许；② Ollama 须放行本站来源：在终端运行 launchctl setenv OLLAMA_ORIGINS "${location.origin}" 后退出并重新打开 Ollama（Windows、Linux 设同名环境变量）；LM Studio 在开发者设置中打开 CORS`;
const isLocalUrl = (u) => { try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(u).hostname); } catch { return false; } };
const ready = (c = profile()) => !!c && !!c.model.trim() && !!c.baseUrl.trim() && (!!c.apiKey.trim() || isLocalUrl(c.baseUrl));
const presetLabel = (c) => PRESETS.find((x) => x.id === c.preset)?.label || c.preset;
const profileLabel = (c) => c ? `${presetLabel(c)} · ${c.model || '待填模型名'}` : '（未配置）';

async function chat(messages, { profileId, maxTokens = 4096, format = 'json', schema = null, signal } = {}) {
  const c = profile(profileId); if (!ready(c)) throw new Error('请先在“模型接入”中填写实际服务地址、模型名和 Key（本机服务可不填 Key）');
  const built = API.buildRequest({ ...c, coordinates: 'pixel-xywh' }, messages, { maxTokens });
  if (c.protocol !== 'anthropic') {
    if (format === 'schema' && schema) built.body.response_format = { type: 'json_schema', json_schema: { name: 'week07_extraction', strict: false, schema } };
    if (format === 'json') built.body.response_format = { type: 'json_object' };
    if (!/^kimi-k3/i.test(built.body.model) && !(c.preset === 'deepseek' && built.body.model === 'deepseek-flash')) built.body.temperature = 0;
  }
  const secrets = profiles.map((p) => p.apiKey).filter(Boolean), clean = (v) => API.redact(v, secrets);
  const request = clean({ ...built.metadata, body: built.body, via_proxy: c.proxy });
  const t0 = performance.now(); let raw = null;
  try {
    const url = c.proxy ? 'http://127.0.0.1:8796/forward' : built.url, body = c.proxy ? { target: built.url, protocol: c.protocol, payload: built.body } : built.body;
    const limit = isLocalUrl(c.baseUrl) ? 1800000 : 600000; // 本机 CPU 上的模型可能很慢：本机服务等 30 分钟，云端 10 分钟
    const sig = signal ? AbortSignal.any([signal, AbortSignal.timeout(limit)]) : AbortSignal.timeout(limit);
    const r = await fetch(url, { method: 'POST', headers: built.headers, body: JSON.stringify(body), signal: sig, redirect: 'error', credentials: 'omit' });
    raw = clean(await r.text()); if (!r.ok) throw new Error(API.apiErrorMessage(r.status, raw, c) + (format === 'schema' && /json_schema|response_format/i.test(raw) ? '\n该服务不接受 response_format=json_schema；请在“模型接入”中改选 JSON 模式（例如 llama-cpp-python 0.3.36 的服务只接受 text／json_object）。' : ''));
    let parsed; try { parsed = JSON.parse(raw); } catch { throw new Error('API 回复不是合法 JSON'); }
    const a = API.parseResponse(parsed, c.protocol);
    return { text: clean(a.text), usage: a.usage, model: a.model || c.model, finish_reason: a.finishReason, seconds: +((performance.now() - t0) / 1000).toFixed(1), request, endpoint: built.url, profile: profileLabel(c) };
  } catch (e) {
    const msg = e.name === 'TypeError' ? `${e.message}（${isLocalUrl(c.baseUrl) && !isLocalUrl(location.href) ? LOCAL_FROM_WEB : '多为跨域被拒或网络不通；本机服务请确认已启动；云端服务可改用本机转发器'}）` : e.message;
    const err = new Error(clean(msg)); err.raw = raw; err.request = request; err.seconds = +((performance.now() - t0) / 1000).toFixed(1); throw err;
  }
}

/* ================= 浏览器内模型与 LangExtract（两个 Worker） ================= */
const QWEN = {
  'qwen3-0.6b': { label: 'Qwen3-0.6B', size: 'WebGPU q4f16 约 0.6 GB；无 WebGPU 时 WASM q8 约 0.6 GB' },
  'qwen3-4b': { label: 'Qwen3-4B', size: '只能 WebGPU，q4f16 约 2.9 GB（与讲义同系列；讲义用的是 Instruct-2507 的 GGUF，不是同一文件）' },
};
const STATUS = { webgpu: null, qwen: {}, gliner: null, lx: null, msg: {} };
/* resetOnFail：浏览器内模型线程一旦报错（尤其运行库 Aborted()），该线程即不可再用；失败后立即关掉，下次调用自动新开，不必刷新页面。 */
function workerClient(file, { resetOnFail = false, onReset = null } = {}) {
  let w = null, seq = 0; const calls = new Map();
  const get = () => {
    if (w) return w;
    w = new Worker(new URL(file, import.meta.url), { type: 'module' });
    w.onmessage = ({ data }) => { const c = calls.get(data.id); if (!c) return; if (data.progress || data.partial != null) { c.onProgress?.(data); return; } calls.delete(data.id); if (data.ok) return c.ok(data.result); c.no(new Error(data.error)); if (resetOnFail) reset(); };
    w.onerror = (e) => { for (const c of calls.values()) c.no(new Error('浏览器内模型线程出错：' + (e.message || '可能是内存不足或网络中断'))); calls.clear(); try { w.terminate(); } catch { /* ignore */ } w = null; onReset?.(); };
    return w;
  };
  const call = (msg, onProgress) => new Promise((ok, no) => { const id = ++seq; calls.set(id, { ok, no, onProgress }); get().postMessage({ ...msg, id }); });
  call.terminate = () => { if (!w) return; w.terminate(); w = null; for (const c of calls.values()) c.no(new Error('线程已关闭')); calls.clear(); };
  function reset() { if (!w) return; w.terminate(); w = null; for (const c of calls.values()) c.no(new Error('线程已关闭（上一步失败后重置）')); calls.clear(); onReset?.(); }
  call.busy = () => calls.size > 0;
  return call;
}
/* Qwen3 与 GLiNER 各用一个线程；同一时间只保留其中一个已载入的模型：两者同时驻留时，实测浏览器渲染进程因内存不足崩溃。 */
const qcall = workerClient('./browser-worker.js', { resetOnFail: true, onReset: () => { for (const k of Object.keys(STATUS.qwen)) STATUS.msg[k] = '已卸载（模型线程出错后重置），用时会重新载入'; STATUS.qwen = {}; emit('w7-live'); } }),
  gcall0 = workerClient('./browser-worker.js', { resetOnFail: true, onReset: () => { if (STATUS.gliner) STATUS.msg.gliner = '已卸载（模型线程出错后重置），用时会重新载入'; STATUS.gliner = null; emit('w7-live'); } });
const bcall = (msg, onP) => { if (msg.op.startsWith('qwen') && STATUS.gliner && !gcall0.busy()) { gcall0.terminate(); STATUS.gliner = null; STATUS.msg.gliner = '已卸载（为 Qwen3 腾出内存），用时会重新载入'; } return qcall(msg, onP); };
const gcall = (msg, onP) => { if (Object.keys(STATUS.qwen).length && !qcall.busy()) { qcall.terminate(); for (const k of Object.keys(STATUS.qwen)) STATUS.msg[k] = '已卸载（为 GLiNER 腾出内存），用时会重新载入'; STATUS.qwen = {}; } return gcall0(msg, onP); };
const lcall = workerClient('./lx-worker.js');
async function probe() { try { const r = await bcall({ op: 'probe' }); STATUS.webgpu = r.webgpu; } catch { STATUS.webgpu = false; } emit('w7-live'); }
async function loadQwen(key, onProgress) {
  if (Object.keys(STATUS.qwen).some((k) => k !== key) && !qcall.busy()) { qcall.terminate(); for (const k of Object.keys(STATUS.qwen)) STATUS.msg[k] = '已卸载（换用其他规模）'; STATUS.qwen = {}; } STATUS.msg[key] = '载入中…'; emit('w7-live'); let mode = ''; try { const info = await bcall({ op: 'qwen-load', key }, (d) => { if (d.device) mode = d.device + '/' + d.dtype; STATUS.msg[key] = d.progress; onProgress?.(d.progress); emit('w7-live'); }); STATUS.qwen[key] = info; STATUS.msg[key] = `已载入（${info.device}/${info.dtype}，${info.load_seconds} 秒）`; return info; } catch (e) { const m = failText(e, mode); STATUS.msg[key] = m; throw new Error(m); } finally { emit('w7-live'); } }
function failText(e, mode) {
  const msg = String(e?.message || e), where = mode ? `（${mode}）` : '';
  if (/Aborted|out of memory|内存/i.test(msg)) return `失败${where}：浏览器内存不够，运行库中止（${msg.slice(0, 60)}）。模型线程已自动重置，可直接重试；建议先关闭 Ollama 等占内存的程序，或改用 0.6B、API。`;
  return `失败${where}：${msg}。模型线程已自动重置，可直接重试。`;
}
async function loadGliner(onProgress) { STATUS.msg.gliner = '载入中…'; emit('w7-live'); try { const info = await gcall({ op: 'gliner-load' }, (d) => { STATUS.msg.gliner = d.progress; onProgress?.(d.progress); emit('w7-live'); }); STATUS.gliner = info; STATUS.msg.gliner = `已载入（${info.load_seconds} 秒）`; return info; } catch (e) { const m = failText(e, 'wasm/fp16'); STATUS.msg.gliner = m; throw new Error(m); } finally { emit('w7-live'); } }
async function loadLx(onProgress) { STATUS.msg.lx = '载入中…'; emit('w7-live'); try { const info = await lcall({ op: 'load' }, (d) => { STATUS.msg.lx = d.progress; onProgress?.(d.progress); emit('w7-live'); }); STATUS.lx = info; STATUS.msg.lx = `已载入（${info.load_seconds} 秒）`; return info; } catch (e) { STATUS.msg.lx = '失败：' + e.message; throw e; } finally { emit('w7-live'); } }

/* ================= 抽取任务（A、B 照讲义 4.2 原提示与 schema） ================= */
const SYS = '你是历史文献信息抽取助手。只依据用户给出的原文抽取信息，按要求的 JSON 结构输出。';
const PRE_A = '请从下面的原文中抽取所有出现的人物，每人给出：姓名（name）、别名（aliases）、籍贯（native_place）、生年（birth_year，公元纪年整数）、卒年（death_year，公元纪年整数）、任官（offices：官职 title 与任职年份 year，公元纪年整数）。\n\n原文：\n';
const PRE_B = '请从下面的原文中抽取：\n1. mentions：原文中出现的每一处人名、地名、官职、时间。surface 照录原文写法；refers_to 写它所指的对象（如能确定，写出通行的姓名或地名；不能确定写 null）；evidence 照录包含它的原文短句；basis 写"原文直接记载""推定"或"原文未见"。\n2. events：原文记载的事件（谁、做了什么、何时、何地）。when_text 照录原文的时间写法；when_ce 写换算后的公元年（不能确定写 null）；where 写地点（原文没有写 null）；evidence 照录原文短句；basis 同上。\n原文没有的信息不要补充。\n\n原文：\n';
const BASIS = ['原文直接记载', '推定', '原文未见'];
const SCHEMA = {
  A: { type: 'object', properties: { persons: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, aliases: { type: 'array', items: { type: 'string' } }, native_place: { type: 'string' }, birth_year: { type: 'integer' }, death_year: { type: 'integer' }, offices: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, year: { type: 'integer' } }, required: ['title', 'year'] } } }, required: ['name', 'aliases', 'native_place', 'birth_year', 'death_year', 'offices'] } } }, required: ['persons'] },
  B: { type: 'object', properties: { mentions: { type: 'array', items: { type: 'object', properties: { surface: { type: 'string' }, entity_type: { type: 'string', enum: ['人物', '地点', '官职', '时间', '其他'] }, refers_to: { type: ['string', 'null'] }, evidence: { type: 'string' }, basis: { type: 'string', enum: BASIS } }, required: ['surface', 'entity_type', 'refers_to', 'evidence', 'basis'] } }, events: { type: 'array', items: { type: 'object', properties: { who: { type: 'string' }, what: { type: 'string' }, when_text: { type: ['string', 'null'] }, when_ce: { type: ['integer', 'null'] }, where: { type: ['string', 'null'] }, evidence: { type: 'string' }, basis: { type: 'string', enum: BASIS } }, required: ['who', 'what', 'when_text', 'when_ce', 'where', 'evidence', 'basis'] } } }, required: ['mentions', 'events'] },
};
/* LangExtract 的提示与示例：与 D25 实跑（scripts/run_d25_langextract.py）相同。 */
const LX_PROMPT = '从史料原文中按出现顺序抽取人物、地点、官职、时间。extraction_text 必须照录原文中的字，不改字、不意译、不重叠；attributes 中写 refers_to（所指，原文未明示时写 null）。';
const LX_EX = {
  zh: { text: '王安石，字介甫，撫州臨川人。', extractions: [{ class: '人物', text: '王安石', attributes: { refers_to: '王安石' } }, { class: '人物', text: '介甫', attributes: { refers_to: '王安石（字）' } }, { class: '地点', text: '撫州臨川', attributes: { refers_to: null } }] },
  ja: { text: '天保十五辰年師の名を繼て一陽齋豐國と號す', extractions: [{ class: '时间', text: '天保十五辰年', attributes: { refers_to: null } }, { class: '人物', text: '師', attributes: { refers_to: null } }, { class: '人物', text: '一陽齋豐國', attributes: { refers_to: null } }] },
};
const GL_MAP = { person: '人物', location: '地点', 'official title': '官职', date: '时间' };

function validate(v, s, path = '$', out = []) {
  const types = [].concat(s.type || []); const t = v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v === 'number' ? 'number' : typeof v;
  if (types.length && !types.includes(t) && !(t === 'integer' && types.includes('number'))) { out.push(`${path}：应为 ${types.join('／')}，实际为 ${t}`); return out; }
  if (s.enum && !s.enum.includes(v)) out.push(`${path}：${JSON.stringify(v)} 不在允许值 ${s.enum.join('／')} 中`);
  if (t === 'object' && s.properties) { for (const k of s.required || []) if (!(k in v)) out.push(`${path}.${k}：缺少必填字段`); for (const [k, ps] of Object.entries(s.properties)) if (k in v) validate(v[k], ps, `${path}.${k}`, out); }
  if (t === 'array' && s.items) v.forEach((x, i) => validate(x, s.items, `${path}[${i}]`, out));
  return out;
}
/* 容错读取：先整体解析；失败时逐个取出完整的对象（截断的最后一项丢弃并注明）。 */
function parseLoose(text, arrays) {
  const t = String(text || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { const i = t.indexOf('{'); return { value: JSON.parse(i > 0 ? t.slice(i) : t), recovered: false }; } catch (e) {
    const val = {}; let n = 0;
    for (const key of arrays) {
      const k = t.indexOf(`"${key}"`); if (k < 0) continue; let i = t.indexOf('[', k); if (i < 0) continue; const items = [];
      while (i < t.length) {
        const st = t.indexOf('{', i); if (st < 0) break; let d = 0, inS = false, esc2 = false, j = st;
        for (; j < t.length; j++) { const ch = t[j]; if (inS) { if (esc2) esc2 = false; else if (ch === '\\') esc2 = true; else if (ch === '"') inS = false; continue; } if (ch === '"') inS = true; else if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) break; } else if (ch === ']' && d === 0) break; }
        if (j >= t.length || t[j] !== '}') break;
        try { items.push(JSON.parse(t.slice(st, j + 1))); n++; } catch { /* skip */ }
        i = j + 1; const nx = t.slice(i).search(/\S/); if (nx >= 0 && t[i + nx] === ']') break;
      }
      val[key] = items;
    }
    return { value: n ? val : null, recovered: true, error: e.message };
  }
}

/* ================= 输入材料 ================= */
let MATS = { sources: [], segments: [], received: [] };
const matsReady = kvGet('materials').then((m) => { if (m) MATS = m; emit('w7-materials'); });
function builtinInputs() {
  const p = W.Pack.get(); const T = p?.teach?.inputs || {};
  return [
    ['songshi', '《宋史·王珪传》选段（讲义 4.2 输入）', T.songshi_wanggui_excerpt || p?.texts?.songshi_wanggui_excerpt?.text, '《宋史》卷三一二《王珪传》（维基文库录文）', 'songshi'],
    ['dnsr_ref', '『大日本史料』9-1 第 1 页（人工参照转录）', T['dnsr_9-1_p1_reference'], '『大日本史料』9-1，本文第 1 页（PDF 页序 29）', 'dnsr'],
    ['dnsr_ocr', '同页 NDLOCR-Lite 识读', T['dnsr_9-1_p1_ndlocr'], '『大日本史料』9-1，本文第 1 页（NDLOCR-Lite 识读）', 'dnsr'],
    ['ukiyo_ref', '『浮世絵類考』豐國条（参照转录）', T.ukiyo_toyokuni3_reference, '『新増補浮世絵類考』豐國条', 'mine'],
  ];
}
function inputOptions() {
  const out = builtinInputs().map(([k, l, t, loc, mat]) => ({ key: k, label: l + (t ? `（${t.length} 字）` : '（需材料包）'), text: t || '', loc, mat, builtin: true }));
  const mine = store.get('w7-mine', null); out.push({ key: 'mine', label: '我的材料（D30 当前选定）' + (mine?.text ? `（${mine.text.length} 字）` : '（尚未选定）'), text: mine?.text || '', loc: mine?.loc || '我的材料', mat: 'mine' });
  for (const s of segList()) out.push({ key: 'seg:' + s.id, label: `导入：${s.source?.title || '材料'}${s.pdfPage ? ' · PDF 第 ' + s.pdfPage + ' 页' : ''}${s.locator && !s.pdfPage ? ' · ' + s.locator : ''} · ${s.text.slice(0, 14)}…（${s.text.length} 字）`, text: s.text, loc: s.loc, mat: 'mine', imported: true });
  out.push({ key: 'paste', label: '粘贴或上传文字', text: null, loc: '粘贴文字（出处待补）', mat: 'mine' });
  return out;
}

function segList() {
  return MATS.segments.map((s) => { const source = MATS.sources.find((x) => x.id === s.sourceId);
    return { ...s, source, loc: `${source?.title || '导入材料'}${s.pdfPage ? '，PDF 页序 ' + s.pdfPage : ''}${s.printedPage ? '，印刷页 ' + s.printedPage : ''}${s.locator && typeof s.locator === 'string' ? '，' + s.locator : ''}（经材料导入页，核验状态：${s.verified || '待核'}）` }; });
}

/* ================= 通用导入页握手（同第五、六周） ================= */
let importer = null;
function openImporter() {
  const u = new URL('../importer/index.html', import.meta.url); u.searchParams.set('receiver', location.origin);
  importer = window.open(u.href, 'week07-material-importer');
  if (!importer) alertLine('浏览器拦截了弹出窗口，请允许本站弹窗后再点“材料导入”。');
}
function minimalProject(p) {
  if (!p || p.schema !== 'pku-history-project/v1' || !Array.isArray(p.sources) || !Array.isArray(p.segments)) throw new Error('不是 pku-history-project/v1 项目');
  const ids = new Set(p.sources.map((s) => s.id));
  for (const s of p.segments) if (!ids.has(s.sourceId) || typeof s.text !== 'string') throw new Error('正文片段无法回到材料');
  const walk = (x) => { if (!x || typeof x !== 'object') return; for (const [k, v] of Object.entries(x)) { if (/^(apiKey|api_key|authorization|password|token|secret)$/i.test(k)) throw new Error('项目中含凭据字段，请移除后再导入'); walk(v); } };
  walk(p); return p;
}
window.addEventListener('message', async (e) => {
  if (e.origin !== location.origin || !importer || e.source !== importer) return;
  if (e.data?.type === 'PKU_IMPORT_READY') importer.postMessage({ type: 'PKU_IMPORT_HELLO' }, location.origin);
  if (e.data?.type === 'PKU_PROJECT') {
    try {
      const p = minimalProject(e.data.project);
      const segs = p.segments.filter((s) => s.text.trim() && !s.derived && !s.supersededBy);
      const src = p.sources.filter((s) => segs.some((x) => x.sourceId === s.id)).map((s) => ({ id: s.id, title: s.title, kind: s.kind || '', author: s.author || '', date: s.date || '' }));
      const next = { sources: [...MATS.sources.filter((s) => !src.some((x) => x.id === s.id)), ...src],
        segments: [...MATS.segments.filter((s) => !segs.some((x) => x.id === s.id)), ...segs.map((s) => ({ id: s.id, sourceId: s.sourceId, text: s.text, pdfPage: s.pdfPage ?? null, printedPage: s.printedPage ?? null, locator: typeof s.locator === 'string' ? s.locator : s.paragraph ? `文本段落 ${s.paragraph}` : null, verified: s.verification ?? s.verified ?? null }))],
        received: [...MATS.received, { date: new Date().toISOString(), project: p.title || p.id, sources: src.length, segments: segs.length }] };
      await kvPut('materials', next); MATS = next; emit('w7-materials');
      const msg = `第七周已接收 ${src.length} 份材料、${segs.length} 个正文片段（只取正文文字；原件仍在导入页）。在 D23、D30 的“输入”中选择。`;
      importer.postMessage({ type: 'PKU_IMPORT_ACCEPTED', message: msg }, location.origin); alertLine(msg);
    } catch (err) { importer.postMessage({ type: 'PKU_IMPORT_REJECTED', message: err.message }, location.origin); alertLine('导入失败，旧材料保留：' + err.message); }
  }
});
function alertLine(msg) { let n = document.querySelector('.live-toast'); if (!n) { n = document.createElement('div'); n.className = 'live-toast'; n.setAttribute('role', 'status'); document.body.append(n); } n.textContent = msg; n.hidden = false; clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 8000); }

/* ================= 高亮 ================= */
function hlSpans(text, spans) {
  const S = spans.filter((s) => s.start != null && s.end > s.start).sort((a, b) => a.start - b.start || b.end - a.end); let out = '', i = 0;
  for (const s of S) { if (s.start < i) continue; out += esc(text.slice(i, s.start)) + `<mark class="${s.cls || ''}" title="${esc(s.title || '')}">${esc(text.slice(s.start, s.end))}</mark>`; i = s.end; }
  return out + esc(text.slice(i));
}
const sentenceAt = (text, start, end) => { let a = start, b = end; while (a > 0 && !/[。！？!?；\n]/.test(text[a - 1])) a--; while (b < text.length && !/[。！？!?；\n]/.test(text[b])) b++; return text.slice(a, Math.min(text.length, b + 1)).trim(); };
const ST_LABEL = { match_exact: '精确对齐', match_lesser: '部分精确', match_greater: '超出', match_fuzzy: '模糊对齐' };
const locsrcOf = (st) => (st === 'match_exact' ? '事后精确对齐' : st ? '事后模糊对齐' : '模型报告');

/* ================= 模型接入页 ================= */
class ModelPanel extends HTMLElement {
  connectedCallback() {
    if (this._b) return this.render(); this._b = true;
    this.open = false; this.status = ''; this.busy = false;
    this.addEventListener('input', (e) => { const f = e.target.dataset.pf; if (f) setProfile({ [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }); });
    this.addEventListener('change', (e) => { const t = e.target;
      if (t.dataset.pf === 'preset' || t.dataset.pf === 'protocol' || t.dataset.pf === 'format') { setProfile({ [t.dataset.pf]: t.value }); this.render(); }
      if (t.dataset.sel != null) { selected = t.value; persist(); this.render(); } });
    this.addEventListener('click', (e) => { const b = e.target.closest('[data-mp]'); if (!b) return; this.act(b.dataset.mp, b); });
    this.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.open = false; this.render(); } });
    // 载入模型时进度事件很密：只更新“浏览器内模型”表格，不整页重绘（整页重绘会把滚动条拉回顶部）。
    document.addEventListener('w7-live', () => { if (this.open) this.renderStatus(); });
    this.render();
  }
  show() { this.open = true; this.render(); probe(); }
  async act(a, b) {
    if (a === 'close') { this.open = false; return this.render(); }
    if (a === 'add') { const p = defaults('deepseek'); profiles.push(p); selected = p.id; persist(); return this.render(); }
    if (a === 'remove' && profiles.length > 1) { profiles = profiles.filter((p) => p.id !== selected); selected = profiles[0].id; persist(); return this.render(); }
    if (a === 'clearkey') { setProfile({ apiKey: '' }); return this.render(); }
    if (a.startsWith('alt:')) { setProfile({ baseUrl: a.slice(4) }); return this.render(); }
    if (a === 'official') { const p = PRESETS.find((x) => x.id === profile().preset); setProfile({ model: p?.model || '' }); return this.render(); }
    if (a === 'test') return this.test();
    if (a.startsWith('qwen:')) { loadQwen(a.slice(5)).catch(() => {}); return; }
    if (a === 'gliner') { loadGliner().catch(() => {}); return; }
    if (a === 'lx') { loadLx().catch(() => {}); return; }
    if (a === 'export') { const runs = await runAll(); download(`第七周现场运行记录_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exported: new Date().toISOString(), note: '请求与回复已剔除 Key', runs }, null, 1), 'application/json'); }
    if (a === 'clearruns') { if (b._armed) { await runClear(); this.status = '本机运行记录已清除。'; this.render(); } else { b._armed = true; b.textContent = '再点一次确认清除'; setTimeout(() => { b._armed = false; b.textContent = '清除本机运行记录'; }, 3000); } }
  }
  async test() {
    this.busy = true; this.status = '正在发送一句公开测试文字…'; this.render();
    const c = profile(); const text = '王珪，字禹玉，成都華陽人。';
    try {
      const r = await chat([{ role: 'system', content: SYS }, { role: 'user', content: PRE_B + text }], { maxTokens: 1024, format: c.format, schema: SCHEMA.B });
      const p = parseLoose(r.text, ['mentions', 'events']); const ok = !!p.value && (p.value.mentions || []).some((m) => m.surface === '王珪');
      setProfile({ test: { passed: ok, date: new Date().toISOString(), seconds: r.seconds, model: r.model, text: r.text.slice(0, 600) } });
      this.status = ok ? `测试通过：${r.seconds} 秒，回复为可解析的 JSON，并抽出“王珪”。` : `已回复（${r.seconds} 秒），但未能按 B 型读出“王珪”；可换输出约束或模型再试。`;
      runPut({ id: crypto.randomUUID(), kind: '接入测试', date: new Date().toISOString(), input: { text }, engine: { type: 'api', profile: profileLabel(c), endpoint: r.endpoint }, request: r.request, response: r.text, usage: r.usage, seconds: r.seconds, passed: ok });
    } catch (e) { this.status = '测试失败：' + e.message; runPut({ id: crypto.randomUUID(), kind: '接入测试', date: new Date().toISOString(), engine: { type: 'api', profile: profileLabel(c) }, request: e.request, error: e.message, response: e.raw, seconds: e.seconds }); }
    finally { this.busy = false; this.render(); }
  }
  renderStatus() { const n = this.querySelector('.mp-browser'); if (n) n.innerHTML = this.browserHtml(); }
  browserHtml() {
    const row = (k, label, size, btn, done) => `<tr><td><b>${esc(label)}</b><br><span class="sub">${esc(size)}</span></td><td class="sub">${esc(STATUS.msg[k] || (done ? '已载入' : '未载入'))}</td><td><button class="small" data-mp="${btn}" ${done ? 'disabled' : ''}>${done ? '已载入' : '下载并载入'}</button></td></tr>`;
    return `<p class="sub">WebGPU：${STATUS.webgpu == null ? '检测中…' : STATUS.webgpu ? '可用（Qwen3 用 q4f16）' : '不可用（Qwen3 只能用 WASM 跑 0.6B，较慢；4B 需要 WebGPU）'}</p>
      <table class="steps"><tr><th>模型</th><th>状态</th><th></th></tr>
      ${Object.entries(QWEN).map(([k, v]) => row(k, v.label + '（transformers.js 3.8.1）', v.size, 'qwen:' + k, !!STATUS.qwen[k])).join('')}
      ${row('gliner', 'GLiNER multi v2.1（零样本实体识别）', 'fp16 约 580 MB；只做实体识别，不做 A／B 型 JSON', 'gliner', !!STATUS.gliner)}
      ${row('lx', 'LangExtract 3a68580（Pyodide 0.28.3）', '运行库约 40 MB；分块、提示、解析、对齐用原代码，模型另选', 'lx', !!STATUS.lx)}</table>
      <p class="sub">首次需联网下载（库来自 jsdelivr，权重来自 Hugging Face），之后由浏览器缓存；换浏览器或清除网站数据后需重下。材料文字不出本机。同一时间只保留一个浏览器内模型：载入 Qwen3 会卸载 GLiNER，反之亦然（两者同时驻留时实测浏览器因内存不足崩溃）；再用时从缓存重新载入。</p>`;
  }
  render() {
    if (!this.open) { this.innerHTML = ''; return; }
    const keep = this.querySelector('.model-panel')?.scrollTop || 0;
    this.draw(); const pn = this.querySelector('.model-panel'); if (pn) pn.scrollTop = keep;
  }
  draw() {
    const c = profile(); const pr = PRESETS.find((x) => x.id === c?.preset);
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    this.innerHTML = `<div class="model-shade"><section class="model-panel" role="dialog" aria-modal="true" aria-label="模型接入"><button class="close" data-mp="close">关闭</button>
      <h2>模型接入</h2>
      <p>三种做法：<b>API 或本机服务</b>（云端模型，或本机 Ollama／LM Studio）；<b>浏览器内模型</b>（Qwen3、GLiNER，在本页内运行，文字不出本机）；<b>LangExtract</b>（在浏览器中运行它的分块与对齐，模型用前两种之一）。Key 只留在本页内存，刷新后清除；发送材料前另行确认。</p>
      <h3>一、API 或本机服务</h3>
      <div class="mp-grid">
        <label>已配置模型<select data-sel>${profiles.map((p) => opt(p.id, profileLabel(p), c.id)).join('')}</select></label>
        <div class="row3"><button class="small" data-mp="add">添加一个配置</button><button class="small" data-mp="remove" ${profiles.length > 1 ? '' : 'disabled'}>删除此配置</button></div>
        <label>服务预设<select data-pf="preset">${PRESETS.map((p) => opt(p.id, p.label, c.preset)).join('')}</select></label>
        <label>API 地址<input data-pf="baseUrl" value="${esc(c.baseUrl)}" aria-label="API地址"></label>
        ${(pr?.alternatives || []).map((a) => `<button class="small" data-mp="alt:${esc(a.baseUrl)}">改用 ${esc(a.label)} 地址</button>`).join('')}
        <label>协议<select data-pf="protocol">${opt('openai', 'OpenAI 兼容 Chat Completions', c.protocol)}${opt('anthropic', 'Anthropic Messages', c.protocol)}</select></label>
        <label>API 型号（不是显示名称）<input data-pf="model" value="${esc(c.model)}" aria-label="API模型名称" placeholder="${c.preset === 'local' ? '如 qwen3:4b（先在本机 ollama pull）' : ''}"></label>
        ${pr?.model ? `<p class="sub">官方型号：<code>${esc(pr.model)}</code> <button class="small" data-mp="official">使用官方型号</button></p>` : ''}
        <label>API Key<input type="password" autocomplete="off" data-pf="apiKey" value="${esc(c.apiKey)}" aria-label="API Key" placeholder="${isLocalUrl(c.baseUrl) ? '本机服务可不填' : ''}"></label>
        <button class="small" data-mp="clearkey">清除此 Key</button>
        <label>输出约束<select data-pf="format">${opt('schema', 'JSON Schema（response_format=json_schema，服务须支持）', c.format)}${opt('json', 'JSON 模式（response_format=json_object）', c.format)}${opt('free', '不加约束（只在提示中要求 JSON）', c.format)}</select></label>
        <label class="check-row"><input type="checkbox" data-pf="proxy" ${c.proxy ? 'checked' : ''}>经已启动的本机转发器（127.0.0.1:8796，见仓库 tools/llm-proxy）</label>
      </div>
      ${isLocalUrl(c.baseUrl) && !isLocalUrl(location.href) ? `<p class="consent">${esc(LOCAL_FROM_WEB)}。</p>` : ''}
      <details><summary>预设出处与说明</summary><p class="sub">${esc(pr?.notes || '')}</p>${(pr?.sources || []).map((s) => `<p class="sub"><a href="${esc(s.url)}" target="_blank" rel="noopener">官方依据</a> · ${esc(s.read_date)} · ${esc(s.read_depth)}</p>`).join('')}<p class="sub">预设表沿用第六周（modules/history-demo/ocr/api-presets.json），其中“视觉”“看图测试”的说明对第七周不适用；第七周只发送文字。跨域失败时显示实际错误。DeepSeek 等部分服务不支持 json_schema，请选 JSON 模式。</p></details>
      <p><button data-mp="test" ${this.busy || !ready(c) ? 'disabled' : ''}>发送一句公开测试文字，检查能否返回 JSON</button></p>
      <p role="status" class="mp-status">${esc(this.status || (c.test ? (c.test.passed ? '当前配置已通过文字测试' : '上次测试未通过') : '尚未测试'))}</p>
      <h3>二、浏览器内模型与 LangExtract</h3><div class="mp-browser">${this.browserHtml()}</div>
      <h3>三、运行记录</h3><p class="sub">每次现场运行的输入指纹、请求、原始回复、usage、耗时与错误存在本机浏览器（IndexedDB），导出时已剔除 Key。</p>
      <div class="row3"><button class="small" data-mp="export">导出全部运行记录</button><button class="small" data-mp="clearruns">清除本机运行记录</button></div>
      <p class="sub">第七周现场运行模块 ${LIVE_VERSION}</p></section></div>`;
  }
}

/* ================= 现场抽取面板 ================= */
const LAST = new Map();
class LiveExtract extends HTMLElement {
  connectedCallback() {
    if (this._b) return this.render(); this._b = true;
    this.k = 'w7-live-' + (this.getAttribute('key') || 'x');
    this.s = Object.assign({ task: 'B', engine: 'api', qwen: 'qwen3-0.6b', input: this.getAttribute('input') || 'songshi', paste: '', tok: 'unicode', labels: 'person, location, official title, date', threshold: '0.3', maxTokens: '4096', hint: true }, store.get(this.k, {}));
    if (!QWEN[this.s.qwen]) this.s.qwen = 'qwen3-0.6b'; // 旧设置里可能存着已去掉的 1.7B
    if (this.getAttribute('input') && this.hasAttribute('lock-input')) this.s.input = this.getAttribute('input');
    this.consent = ''; this.busy = false; this.progress = ''; this.last = LAST.get(this.k) || null; this.abort = null;
    this.addEventListener('click', (e) => { const b = e.target.closest('[data-lx]'); if (b) this.act(b.dataset.lx); });
    this.addEventListener('change', (e) => { const t = e.target; if (t.dataset.ls) { this.s[t.dataset.ls] = t.type === 'checkbox' ? t.checked : t.value; this.save(); if (t.dataset.ls === 'input') this.consent = ''; this.render(); } if (t.type === 'file' && t.files?.[0]) t.files[0].text().then((x) => { this.s.paste = x; this.s.input = 'paste'; this.save(); this.render(); }); });
    this.addEventListener('input', (e) => { const t = e.target; if (t.dataset.lt) { this.s[t.dataset.lt] = t.value; this.save(); } });
    this.onLive = () => { if (!this.busy && !this.contains(document.activeElement)) this.render(); };
    document.addEventListener('w7-live', this.onLive); document.addEventListener('w7-materials', this.onLive); document.addEventListener('w7-pack', this.onLive);
    this.render();
  }
  save() { store.set(this.k, this.s); }
  current() { const o = inputOptions().find((x) => x.key === this.s.input) || inputOptions()[0]; if (o.key === 'paste') o.text = this.s.paste || ''; return o; }
  engineLabel() { if (this.s.task === 'NER') return 'GLiNER multi v2.1（浏览器内）'; return this.s.engine === 'qwen' ? `${QWEN[this.s.qwen].label}（浏览器内）` : profileLabel(profile()); }
  needsConsent() { return this.s.task !== 'NER' && this.s.engine === 'api' && !isLocalUrl(profile()?.baseUrl || ''); }
  async act(a) {
    if (a === 'models') return openModels();
    if (a === 'importer') return openImporter();
    if (a === 'consent') { this.consent = this.consentKey(); return this.render(); }
    if (a === 'stop') { this.abort?.abort(); return; }
    if (a === 'run') return this.run();
    if (a === 'toev') return this.toEvidence();
    if (a === 'json' && this.last) download(`现场抽取_${this.last.task}_${this.last.date.slice(0, 19).replace(/:/g, '')}.json`, JSON.stringify(this.last, null, 1), 'application/json');
  }
  consentKey() { const o = this.current(); return `${o.key}|${(o.text || '').length}|${profile()?.baseUrl}|${profile()?.model}`; }
  async llm(messages, { maxTokens, schema, onProgress }) {
    if (this.s.engine === 'qwen') {
      if (!STATUS.qwen[this.s.qwen]) await loadQwen(this.s.qwen, onProgress);
      const mode = STATUS.qwen[this.s.qwen] ? STATUS.qwen[this.s.qwen].device + '/' + STATUS.qwen[this.s.qwen].dtype : '';
      const r = await bcall({ op: 'qwen-gen', key: this.s.qwen, messages, max_new_tokens: maxTokens }, (d) => onProgress?.(d.progress || `生成中：${d.tokens} 词元`)).catch((e) => { throw new Error(failText(e, mode).replace(/^失败/, '生成失败')); });
      STATUS.qwen[this.s.qwen] = r.info; return { ...r, endpoint: '浏览器内（' + r.info.device + '/' + r.info.dtype + '）', request: { messages, max_new_tokens: maxTokens, do_sample: false, enable_thinking: false }, profile: QWEN[this.s.qwen].label };
    }
    const c = profile(); this.abort = new AbortController();
    return chat(messages, { maxTokens, format: c.format, schema, signal: this.abort.signal });
  }
  async run() {
    const o = this.current(); const text = (o.text || '').trim(); if (!text) { this.progress = '输入为空：先选材料、导入材料包或粘贴文字。'; return this.render(); }
    if (this.needsConsent() && this.consent !== this.consentKey()) { this.progress = '请先确认发送范围。'; return this.render(); }
    const task = this.s.task, maxTokens = Math.max(64, Math.min(32768, parseInt(this.s.maxTokens, 10) || 4096));
    this.busy = true; this.progress = '开始…'; this.render();
    const rec = { id: crypto.randomUUID(), kind: '现场抽取', task, date: new Date().toISOString(), page: this.getAttribute('key'),
      input: { key: o.key, label: o.label, loc: o.loc, chars: text.length, sha256: await sha256(text), text },
      engine: { type: task === 'NER' ? 'gliner' : this.s.engine, label: this.engineLabel(), format: task === 'NER' ? '不适用（片段分类）' : this.s.engine === 'qwen' ? '无（浏览器内生成不支持约束解码）' : profile().format } };
    const prog = (m) => { this.progress = m; const n = this.querySelector('.lx-progress'); if (n) n.textContent = m; };
    try {
      if (task === 'A' || task === 'B') {
        const schema = SCHEMA[task]; const hint = this.s.hint && (this.s.engine === 'qwen' || profile().format !== 'schema');
        const user = (task === 'A' ? PRE_A : PRE_B) + text + (hint ? '\n\n按以下 JSON Schema 输出，只输出 JSON：\n' + JSON.stringify(schema) : '');
        const r = await this.llm([{ role: 'system', content: SYS }, { role: 'user', content: user }], { maxTokens, schema, onProgress: prog });
        const p = parseLoose(r.text, task === 'A' ? ['persons'] : ['mentions', 'events']);
        Object.assign(rec, { prompt: { system: SYS, user, schema_in_prompt: hint }, response: r.text, usage: r.usage, finish_reason: r.finish_reason, seconds: r.seconds, model: r.model, endpoint: r.endpoint, request: r.request,
          parsed: p.value, parse: p.recovered ? `原始回复非合法 JSON（${p.error}）；容错读出完整对象` : '合法 JSON', validation: p.value && !p.recovered ? validate(p.value, schema) : null });
      } else if (task === 'LX') {
        if (!STATUS.lx) await loadLx(prog);
        const ja = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text) || o.key.startsWith('dnsr') || o.key.startsWith('ukiyo');
        const args = { text, prompt: LX_PROMPT, examples: [ja ? LX_EX.ja : LX_EX.zh], tokenizer: this.s.tok, max_char_buffer: 200 };
        prog('LangExtract：分块并生成提示…'); const first = await lcall({ op: 'run', args });
        const cache = {}, calls = [];
        for (let i = 0; i < first.prompts.length; i++) {
          prog(`LangExtract：第 ${i + 1}／${first.prompts.length} 块，调用模型…`);
          const r = await this.llm([{ role: 'user', content: first.prompts[i] }], { maxTokens: Math.min(maxTokens, 2048), schema: null, onProgress: (m) => prog(`第 ${i + 1}／${first.prompts.length} 块：${m}`) });
          cache[first.prompts[i]] = r.text; calls.push({ prompt_chars: first.prompts[i].length, response: r.text, usage: r.usage, finish_reason: r.finish_reason, seconds: r.seconds, model: r.model, endpoint: r.endpoint });
        }
        prog('LangExtract：解析并对齐…'); const second = await lcall({ op: 'run', args: { ...args, cache } });
        Object.assign(rec, { langextract: { ...STATUS.lx, prompt: LX_PROMPT, example: ja ? 'ja' : 'zh', tokenizer: this.s.tok === 'unicode' ? 'UnicodeTokenizer' : 'RegexTokenizer（默认）', max_char_buffer: 200, chunks: first.prompts.length }, calls, extractions: second.extractions,
          seconds: +calls.reduce((a, c) => a + c.seconds, 0).toFixed(1), model: calls[0]?.model, endpoint: calls[0]?.endpoint, first_prompt: first.prompts[0] });
      } else {
        if (!STATUS.gliner) await loadGliner(prog);
        const chunks = []; let st = 0; const pieces = text.split(/(?<=[。！？!?；\n])/);
        let cur = ''; for (const p of pieces) { if ((cur + p).length > 120 && cur) { chunks.push({ start: st, text: cur }); st += cur.length; cur = ''; } cur += p; } if (cur) chunks.push({ start: st, text: cur });
        const labels = this.s.labels.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
        const r = await gcall({ op: 'gliner-run', chunks, labels, threshold: parseFloat(this.s.threshold) || 0.3 }, (d) => prog(d.progress));
        Object.assign(rec, { gliner: { ...r.info, labels, threshold: parseFloat(this.s.threshold) || 0.3, chunks: chunks.length }, spans: r.spans, seconds: r.seconds });
      }
      this.progress = '';
    } catch (e) { rec.error = e.message; rec.request ||= e.request; rec.response ||= e.raw; rec.seconds ||= e.seconds; this.progress = '失败：' + e.message; }
    finally { this.busy = false; this.abort = null; this.last = rec; LAST.set(this.k, rec); runPut(rec); this.render(); }
  }
  /* 结果转成证据表行：位置来源按事后对齐的状态写，判断类型照模型的 basis；“处理人”写模型与日期，并注明未核。 */
  rows() {
    const r = this.last; if (!r || r.error) return [];
    const text = r.input.text, who = `${r.engine.label}，${r.date.slice(0, 10)}（模型输出，未核）`, loc = r.input.loc;
    const kindOf = (b) => ({ 原文直接记载: '直接记载', 推定: '推定', 原文未见: '未见' }[b] || '不确定');
    if (r.task === 'B') return (r.parsed?.mentions || []).map((m) => { const al = W.align(text, m.surface || '', { tokenizer: 'unicode' }); return { text: m.evidence || (al.start != null ? sentenceAt(text, al.start, al.end) : ''), loc, orig: m.surface || '', norm: m.refers_to ?? '', kind: kindOf(m.basis), reason: `模型：${m.entity_type || ''}；basis=${m.basis || ''}${m.evidence && !text.includes(m.evidence) ? '；证据不在原文' : ''}`, locsrc: locsrcOf(al.status), who }; });
    if (r.task === 'A') return (r.parsed?.persons || []).map((p) => { const al = W.align(text, p.name || '', { tokenizer: 'unicode' }); return { text: al.start != null ? sentenceAt(text, al.start, al.end) : '', loc, orig: p.name || '', norm: '', kind: '不确定', reason: `模型 A 型：籍贯 ${p.native_place ?? 'null'}；生卒 ${p.birth_year ?? 'null'}—${p.death_year ?? 'null'}；任官 ${(p.offices || []).map((x) => x.title + ' ' + x.year).join('、')}`, locsrc: locsrcOf(al.status), who }; });
    if (r.task === 'LX') return (r.extractions || []).map((e) => ({ text: e.start != null ? sentenceAt(text, e.start, e.end) : '', loc, orig: e.text, norm: e.attributes?.refers_to ?? '', kind: '不确定', reason: `LangExtract：${e.class}；${ST_LABEL[e.status] || '无位置'}`, locsrc: locsrcOf(e.status), who }));
    return (r.spans || []).map((s) => ({ text: sentenceAt(text, s.start, s.end), loc, orig: s.text, norm: '', kind: '不确定', reason: `GLiNER：${GL_MAP[s.label] || s.label}，分数 ${s.score}`, locsrc: '模型报告', who }));
  }
  toEvidence() {
    const mat = this.getAttribute('ev-mat') || this.current().mat || 'mine'; const add = this.rows(); const rows = W.Evidence.rows(mat);
    const n0 = rows.length; for (const x of add) if (!rows.some((y) => y.orig === x.orig && y.text === x.text)) rows.push(x);
    W.Evidence.save(mat, rows); this.progress = `已写入证据表（${mat === 'dnsr' ? '大日本史料' : mat === 'songshi' ? '宋史王珪传' : '我的材料'}）${rows.length - n0} 行；重复的行未再写入。位置来源与判断类型照模型输出，需逐行核对。`; this.render();
  }
  resultHtml() {
    const r = this.last; if (!r) return '<p class="sub">尚未运行。</p>';
    const text = r.input.text; const head = `<p class="sub">${esc(r.engine.label)}${r.model ? ' · ' + esc(r.model) : ''}${r.endpoint ? ' · ' + esc(r.endpoint) : ''} · 输出约束：${esc(r.engine.format)} · ${r.seconds ?? '—'} 秒${r.usage ? ` · 输入 ${r.usage.prompt_tokens ?? '—'}／输出 ${r.usage.completion_tokens ?? '—'} 词元` : ''}${r.finish_reason ? ' · finish_reason=' + esc(r.finish_reason) : ''} · ${esc(r.date.slice(0, 19).replace('T', ' '))}</p>`;
    if (r.error) return head + `<p class="warn">失败：${esc(r.error)}</p>${r.response ? `<details><summary>原始回复</summary><pre class="code small-src">${esc(String(r.response).slice(0, 4000))}</pre></details>` : ''}`;
    let body = '', spans = [];
    if (r.task === 'A') {
      const rules = window.W7L?.rules ? window.W7L.rules(r.parsed?.persons, text) : [];
      body = `<p>${esc(r.parse)}${r.validation ? `；schema 校验：${r.validation.length ? `<span class="warn">${r.validation.length} 处不合</span>` : '全部合规'}` : ''}；史学规则：${rules.length ? `<span class="warn">${rules.length} 处违规</span>` : '未发现违规'}</p>
        ${(r.parsed?.persons || []).map((p) => { const al = W.align(text, p.name || '', { tokenizer: 'unicode' }); if (al.start != null) spans.push({ start: al.start, end: al.end, cls: 'hl', title: p.name }); return `<table class="steps"><tr><th colspan="2">${esc(p.name)} <span class="sub">${al.start != null ? ST_LABEL[al.status] : '原文中找不到'}</span></th></tr><tr><td>aliases</td><td>${esc((p.aliases || []).join('、') || '—')}</td></tr><tr><td>native_place</td><td>${esc(String(p.native_place))}</td></tr><tr><td>birth／death</td><td class="mono">${esc(String(p.birth_year))}／${esc(String(p.death_year))}</td></tr>${(p.offices || []).map((x) => `<tr><td>${esc(x.title)}</td><td class="mono">${esc(String(x.year))}</td></tr>`).join('')}</table>`; }).join('')}
        ${rules.length ? `<ul class="warn">${rules.map(([n, m]) => `<li>${esc(n)}：${esc(m)}</li>`).join('')}</ul>` : ''}`;
    } else if (r.task === 'B') {
      const ms = r.parsed?.mentions || [], evs = r.parsed?.events || [];
      const rowsH = ms.map((m) => { const al = W.align(text, m.surface || '', { tokenizer: 'unicode' }); if (al.start != null) spans.push({ start: al.start, end: al.end, cls: 'st-' + al.status, title: `${m.entity_type}：${m.refers_to ?? 'null'}` });
        const f = [m.evidence && !text.includes(m.evidence) ? '证据不在原文' : '', m.evidence && m.surface && !m.evidence.includes(m.surface) ? '证据中无此称呼' : '', /或/.test(m.refers_to || '') && m.basis === '原文直接记载' ? '推测却标直接记载' : ''].filter(Boolean);
        return `<tr class="${f.length ? 'bad' : ''}"><td>${esc(m.surface)}</td><td>${esc(m.entity_type)}</td><td>${esc(m.refers_to ?? 'null')}</td><td>${esc(m.basis)}</td><td class="sub">${al.start != null ? ST_LABEL[al.status] : '无位置'}${f.length ? '；' + esc(f.join('；')) : ''}</td></tr>`; }).join('');
      const basis = ms.reduce((a, m) => { const k = m.basis ?? '（缺 basis）'; a[k] = (a[k] || 0) + 1; return a; }, {});
      body = `<p>${esc(r.parse)}；mentions ${ms.length} 条，events ${evs.length} 条；basis 分布 ${esc(JSON.stringify(basis))}${r.validation ? `；schema 校验：${r.validation.length ? `<span class="warn">${r.validation.length} 处不合</span>` : '全部合规'}` : ''}</p>
        <div class="ev-scroll"><table class="steps"><tr><th>surface</th><th>类型</th><th>refers_to</th><th>basis</th><th>回到原文</th></tr>${rowsH}</table></div>
        ${evs.length ? `<details><summary>events ${evs.length} 条</summary><table class="steps"><tr><th>who</th><th>what</th><th>when_text</th><th>when_ce</th><th>where</th><th>basis</th></tr>${evs.map((e) => `<tr><td>${esc(e.who)}</td><td>${esc(e.what)}</td><td>${esc(e.when_text ?? 'null')}</td><td>${esc(String(e.when_ce ?? 'null'))}</td><td>${esc(e.where ?? 'null')}</td><td>${esc(e.basis)}</td></tr>`).join('')}</table></details>` : ''}`;
    } else if (r.task === 'LX') {
      const ex = r.extractions || []; const dist = ex.reduce((a, e) => (a[ST_LABEL[e.status] || '无位置'] = (a[ST_LABEL[e.status] || '无位置'] || 0) + 1, a), {});
      ex.forEach((e) => { if (e.start != null) spans.push({ start: e.start, end: e.end, cls: 'st-' + e.status, title: `${e.class}：${e.attributes?.refers_to ?? ''}` }); });
      body = `<p>LangExtract（${esc(r.langextract.tokenizer)}，按 ${r.langextract.max_char_buffer} 字分块，共 ${r.langextract.chunks} 块）抽出 ${ex.length} 项；对齐：${esc(JSON.stringify(dist))}</p>
        <ol class="exlist">${ex.map((e) => `<li class="st-${e.status || 'none'}"><b>${esc(e.class)}</b> ${esc(e.text)} <span class="sub">${esc(ST_LABEL[e.status] || '无位置')}${e.start != null ? ` [${e.start}, ${e.end})` : ''}${e.attributes?.refers_to ? '；所指：' + esc(e.attributes.refers_to) : ''}</span></li>`).join('')}</ol>
        <details><summary>第 1 块提示（LangExtract 生成）</summary><pre class="code small-src">${esc((r.first_prompt || '').slice(-2500))}</pre></details>`;
    } else {
      const sp = r.spans || []; sp.forEach((s) => spans.push({ start: s.start, end: s.end, cls: 'gl-' + (GL_MAP[s.label] || 'x'), title: `${s.label} ${s.score}` }));
      body = `<p>GLiNER（${esc(r.gliner.model)}；阈值 ${r.gliner.threshold}；${r.gliner.chunks} 段）找到 ${sp.length} 个片段。位置是模型直接给出的字符区间。</p>
        <table class="steps"><tr><th>片段</th><th>标签</th><th>分数</th><th>位置</th></tr>${sp.map((s) => `<tr><td>${esc(s.text)}</td><td>${esc(GL_MAP[s.label] || s.label)}</td><td class="mono">${s.score}</td><td class="mono">[${s.start}, ${s.end})</td></tr>`).join('')}</table>`;
    }
    const raw = r.response || (r.calls || []).map((c, i) => `—— 第 ${i + 1} 块 ——\n${c.response}`).join('\n\n');
    return head + `<div class="runpage"><div class="runsrc"><p class="sub">输入：${esc(r.input.label.replace(/（[^（）]*字）$/, ''))}（${r.input.chars} 字）</p><pre class="srcbox small-src">${hlSpans(text, spans)}</pre></div><div class="runlist">${body}</div></div>
      ${raw ? `<details><summary>原始回复</summary><pre class="code small-src">${esc(String(raw).slice(0, 12000))}</pre></details>` : ''}
      ${r.validation?.length ? `<details><summary>schema 不合之处（${r.validation.length}）</summary><ul>${r.validation.slice(0, 60).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
      <div class="row3"><button class="small" data-lx="toev">写入证据表</button><button class="small" data-lx="json">导出本次记录</button></div>`;
  }
  render() {
    const s = this.s; const opts = inputOptions(); const o = this.current(); const c = profile();
    const seg = (k, list) => `<div class="seg" role="group">${list.map(([v, l]) => `<button data-lx="set:${k}:${esc(v)}" class="${s[k] === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
    const needC = this.needsConsent(); const consented = this.consent === this.consentKey();
    const html = `<div class="live">
      <div class="live-bar">${seg('task', [['A', 'A 型人物卡片'], ['B', 'B 型证据表式'], ['LX', 'LangExtract 流程'], ['NER', 'GLiNER 实体识别']])}
        <button class="small" data-lx="models">模型接入…</button><button class="small" data-lx="importer">材料导入…</button></div>
      <div class="live-grid">
        <label>输入<select data-ls="input">${opts.map((x) => `<option value="${esc(x.key)}" ${x.key === o.key ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>
        ${s.task === 'NER' ? `<label>标签（逗号分隔；英文标签实测更稳）<input data-lt="labels" value="${esc(s.labels)}"></label><label>阈值<input data-lt="threshold" value="${esc(s.threshold)}" size="4"></label>`
          : `<label>模型<select data-ls="engine"><option value="api" ${s.engine === 'api' ? 'selected' : ''}>API／本机服务：${esc(profileLabel(c))}${ready(c) ? '' : '（未就绪）'}</option><option value="qwen" ${s.engine === 'qwen' ? 'selected' : ''}>浏览器内 Qwen3</option></select></label>
            ${s.engine === 'qwen' ? `<label>规模<select data-ls="qwen">${Object.entries(QWEN).map(([k, v]) => `<option value="${k}" ${s.qwen === k ? 'selected' : ''}>${esc(v.label)}${STATUS.qwen[k] ? '（已载入）' : ''}</option>`).join('')}</select></label>` : ''}
            <label>输出上限（词元）<input data-lt="maxTokens" value="${esc(s.maxTokens)}" size="6"></label>
            ${s.task === 'LX' ? `<label>LangExtract 分词<select data-ls="tok"><option value="unicode" ${s.tok === 'unicode' ? 'selected' : ''}>UnicodeTokenizer（按字）</option><option value="regex" ${s.tok === 'regex' ? 'selected' : ''}>RegexTokenizer（默认）</option></select></label>` : `<label class="check-row"><input type="checkbox" data-ls="hint" ${s.hint ? 'checked' : ''}>未用 JSON Schema 约束时，在提示末尾附上 schema</label>`}`}
      </div>
      ${o.key === 'paste' ? `<label class="field">粘贴文字（也可上传 .txt）<textarea data-lt="paste" rows="4">${esc(s.paste)}</textarea></label><input type="file" accept=".txt,.md" aria-label="上传文字文件">` : `<details><summary>查看输入全文（${(o.text || '').length} 字）</summary><pre class="srcbox small-src">${esc(o.text || '（空：需材料包，或在 D30 选定“我的材料”）')}</pre></details>`}
      <p class="sub">做法说明：${s.task === 'A' ? '讲义 4.2 的 A 型提示与 schema（全部字段必填）。' : s.task === 'B' ? '讲义 4.2 的 B 型提示与 schema（允许 null、带 basis 与 evidence）。' : s.task === 'LX' ? 'LangExtract 3a68580 在浏览器中分块、生成少样本提示、解析回复并做源位置对齐；提示与示例同 D25。' : 'GLiNER 只找实体片段，不做所指与判断；位置为模型给出的字符区间。'}${s.task !== 'NER' && s.engine === 'qwen' ? ' 浏览器内生成不支持约束解码，只能事后校验。' : ''}</p>
      ${needC ? `<p class="consent ${consented ? 'ok' : ''}">${consented ? '已确认' : '发送前确认'}：将把“${esc(o.label)}”共 ${(o.text || '').length} 字发送到 <code>${esc(c?.baseUrl || '')}</code>（${esc(c?.model || '')}）。${consented ? '' : ' <button class="small" data-lx="consent">确认发送这段文字</button>'}</p>` : ''}
      <p><button data-lx="run" ${this.busy || (needC && !consented) ? 'disabled' : ''}>${this.busy ? '运行中…' : '运行'}</button> ${this.busy && s.engine === 'api' && s.task !== 'NER' ? '<button class="small" data-lx="stop">中止</button>' : ''} <span class="lx-progress sub" role="status">${esc(this.progress)}</span></p>
      <div class="live-result">${this.resultHtml()}</div></div>`;
    Deck.rerender(this, html);
  }
}
LiveExtract.prototype.act = (function (orig) { return function (a) { if (a.startsWith('set:')) { const [, k, v] = a.split(':'); this.s[k] = v; this.save(); this.render(); return; } return orig.call(this, a); }; })(LiveExtract.prototype.act);

/* ================= 顶栏与对外接口 ================= */
let panel = null;
function openModels() { panel ||= document.querySelector('w7-model-panel') || document.body.appendChild(document.createElement('w7-model-panel')); panel.show(); }
function topButtons() {
  const top = document.querySelector('.deck-top'); if (!top || top.querySelector('[data-live]')) return;
  const ref = top.querySelector('[data-act="presenter"]');
  for (const [k, l] of [['models', '模型接入'], ['importer', '材料导入']]) { const b = document.createElement('button'); b.dataset.live = k; b.textContent = l; b.onclick = () => (k === 'models' ? openModels() : openImporter()); top.insertBefore(b, ref); }
}
const define = (tag, cls) => { if (!customElements.get(tag)) customElements.define(tag, cls); };
define('w7-model-panel', ModelPanel); define('live-extract', LiveExtract);
window.W7Live = { openModels, openImporter, segments: segList, ready: Promise.all([presetsReady, matsReady]) };
const start = () => { topButtons(); setTimeout(topButtons, 50); emit('w7-live-ready'); };
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => setTimeout(start, 0)); else setTimeout(start, 0);
