/* 第十周原型的共用部分｜候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-16（第一批）
 * 在第九周 w09-core.js 上改写：材料（公开包、本机材料包、导入的史料包）、贯穿记录、模型接入与回放切换、
 * 导入表格（第十周十一类）、课前运行面板、网页版粘贴录入、课程通用导入页的握手。
 * 计算在 w10-lib.js（W10Lib），页面组件在 w10-labs*.js。 */
(() => {
  'use strict';
  const { esc, store, download } = window.Deck;
  const L = window.W10Lib;
  const emit = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));

  /* ================= 材料 ================= */
  const PUB = window.W10_PUBLIC || { packs: [], replays: [] };
  const M = { packs: JSON.parse(JSON.stringify(PUB.packs)), replays: [], local: null, localMsg: '' };
  function mergeLocal(j, from) {
    if (!j || j.format !== 'w10-pack/v1') throw new Error('不是第十周本机材料包（format 应为 w10-pack/v1）');
    if (/"(apiKey|api_key|authorization)"\s*:/i.test(JSON.stringify(j))) throw new Error('材料包含 Key 一类的字段，整份拒绝');
    for (const p of j.packs || []) {
      const cur = M.packs.find((x) => x.id === p.id);
      if (!cur) M.packs.push(p); else for (const e of p.entries) { const i = cur.entries.findIndex((x) => x.id === e.id); if (i >= 0) cur.entries[i] = e; else cur.entries.push(e); }
    }
    const seen = new Set(M.replays.map((r) => r.run_id));
    for (const r of j.replays || []) if (!seen.has(r.run_id)) M.replays.push({ ...r, origin_mode: r.origin_mode || r.mode, mode: 'replay' });
    if (j.refs && typeof j.refs === 'object') M.refs = { ...(M.refs || {}), ...j.refs };
    M.local = { from, generated: j.generated, n: (j.packs || []).reduce((n, p) => n + p.entries.length, 0), runs: (j.replays || []).length };
    M.localMsg = `已载入本机材料包（${M.local.n} 条材料、${M.local.runs} 条运行记录；${from}）。`;
    emit('w10-materials');
  }
  (async () => {
    const q = new URLSearchParams(location.search).get('pack');
    if (!q) return;
    try { mergeLocal(await (await fetch(q, { cache: 'no-store' })).json(), q); } catch (e) { M.localMsg = '本机材料包未载入：' + e.message; emit('w10-materials'); }
  })();
  const Mat = {
    packs: () => [...M.packs, ...T.packs.filter((p) => !M.packs.some((x) => x.id === p.id))],
    entries: () => Mat.packs().flatMap((p) => p.entries || []),
    entry: (id) => Mat.entries().find((e) => e.id === id),
    text: (id) => Mat.entry(id)?.text || '',
    has: (id) => !!Mat.text(id),
    replays: () => M.replays,
    state: () => M,
    loadLocalFile: async (f) => { try { mergeLocal(JSON.parse(await f.text()), f.name); return null; } catch (e) { return e.message; } },
    /* 一份材料的身份说明（作者、版本、页码体系、可否送模型、文本身份） */
    ident: (e) => [e.title, e.citation, e.page?.value ? `${e.page.system} ${e.page.value}` : '', e.written_date_raw || '', e.text_kind, e.sendable ? '可送模型' : '不可送模型', e.visibility, e.transcriber].filter(Boolean).join('｜'),
    restrictedLoaded: () => Mat.entries().some((e) => e.visibility === '本机材料包' && e.text),
  };
  /* 受限材料缺失时的统一提示（线上版各页不报错） */
  const needPack = (what) => `<p class="w10-need">需导入本机材料包：${esc(what)}。线上版只有页码与短引；教师课上用顶栏"导入本机材料包"载入。</p>`;
  function sourceBox(id, { open = false, highlight = null } = {}) {
    const e = Mat.entry(id); if (!e) return `<p class="nil">材料 ${esc(id)} 不在当前材料中。</p>`;
    let body = '';
    if (e.text) { let h = esc(e.text); if (highlight) for (const w of [].concat(highlight)) if (w) h = h.split(esc(w)).join(`<mark>${esc(w)}</mark>`); body = `<pre class="srcbox">${h}</pre>`; }
    else body = needPack(e.title);
    return `<details class="srcbox" ${open ? 'open' : ''}><summary>${esc(e.title)}</summary><p class="sub">${esc(Mat.ident(e))}</p>${body}</details>`;
  }

  /* ================= 贯穿记录（存本浏览器；导出去 Key） ================= */
  const TKEY = 'through';
  let T = (() => { const r = L.importThrough(JSON.stringify({ ...L.emptyThrough(), ...store.get(TKEY, {}), format: 'w10-through/v1' })); return r.ok ? { ...r.record, runs: store.get(TKEY, {}).runs || [] } : L.emptyThrough(); })();
  const Through = {
    get: () => T,
    save() { store.set(TKEY, L.stripSecrets(T, Model.secrets())); emit('w10-through'); },
    add(kind, item, key) { const arr = T[kind]; const i = key ? arr.findIndex((x) => x[key] === item[key]) : -1; if (i >= 0) arr[i] = item; else arr.push(item); Through.save(); return item; },
    remove(kind, pred) { T[kind] = T[kind].filter((x) => !pred(x)); Through.save(); },
    patch(kind, key, id, patch) { const x = T[kind].find((r) => r[key] === id); if (x) { Object.assign(x, patch); Through.save(); } return x; },
    pageState: (pid) => (T.page_state[pid] = T.page_state[pid] || {}),
    export() { return L.exportThrough(T, Model.secrets(), { restricted: Mat.restrictedLoaded() }); },
    import(text) { const r = L.importThrough(text); if (r.ok) { T = r.record; Through.save(); } return r; },
    clear() { T = L.emptyThrough(); Through.save(); },
  };
  /* 送入阅读对照单（D15）。各页调用；判定为预填，学生可改 */
  let rowSeq = 0;
  function toSheet(row) {
    const r = { row_id: `r-${Date.now().toString(36)}-${rowSeq++}`, from_page: null, run_id: null, point: null, source_ref: null, my_reading: null, model_says: null, verdict: null, verdict_prefilled: !!row.verdict, confirmed: false, action: null, reason: null, ...row };
    Through.add('sheet', r, 'row_id'); toast(`已送入阅读对照单（D15）：${(r.model_says || r.point || '').slice(0, 30)}`); return r;
  }

  /* ================= 模型接入：Key 只在内存 ================= */
  const MS = { mode: store.get('model-mode', 'replay'), keys: {}, models: store.get('model-names', { deepseek: 'deepseek-flash', kimi: 'kimi-k3' }), base: store.get('model-base', {}), last: {} };
  const CARDS = window.W10_CARDS || [];
  const card = (id) => CARDS.find((c) => c.card_id === id);
  const PRESET_LABEL = { deepseek: 'DeepSeek（接口）', kimi: 'Kimi（接口）', gemini: 'Gemini（网页版）', chatgpt: 'ChatGPT（网页版）', local: '本机模拟接口' };
  const isWeb = (p) => p === 'gemini' || p === 'chatgpt';
  /* 一格（条件卡 × 服务）的全部记录：课前回放（本机材料包）＋本浏览器记录（现场、课前运行面板、网页版录入），失败的不算 */
  function runsFor(cardId, preset) {
    const seen = new Set(), out = [];
    for (const r of [...M.replays, ...T.runs]) if (r.card_id === cardId && r.preset === preset && r.reply && !r.error && !seen.has(r.run_id)) { seen.add(r.run_id); out.push(r); }
    return L.orderRuns(out);
  }
  function pickedRun(cardId, preset) {
    const all = runsFor(cardId, preset), sel = store.get('sample-sel', {})[cardId + '|' + preset];
    const run = L.pickRun(all, sel); return { run, all };
  }
  const Model = {
    state: () => MS,
    secrets: () => Object.values(MS.keys).filter(Boolean),
    setMode(m) { MS.mode = m; store.set('model-mode', m); emit('w10-model'); },
    setKey(p, k) { MS.keys[p] = k; emit('w10-model'); },
    setModel(p, name) { MS.models[p] = name; store.set('model-names', MS.models); emit('w10-model'); },
    setBase(p, u) { MS.base[p] = u; store.set('model-base', MS.base); emit('w10-model'); },
    liveAvailable: () => !!window.W10Live,
    /* 真正发出一次请求；先过发出前校验（sendable、正文是否载入）；不通过就抛错，不发半份提示 */
    async call(c, preset, { runId, sample, env } = {}) {
      if (!window.W10Live) throw new Error('现场调用不可用：页面不是经本机服务打开（file://），模型接入模块未载入');
      if (!MS.keys[preset] && preset !== 'local') throw new Error(`没有填 ${PRESET_LABEL[preset] || preset} 的 Key（顶栏"模型接入"）`);
      const built = L.fillTemplate(c, Mat.entries());
      const out = await window.W10Live.call({ presetId: preset, model: MS.models[preset], baseUrl: MS.base[preset], apiKey: MS.keys[preset], messages: built.messages, temperature: c.settings?.deepseek?.temperature });
      const run = L.stripSecrets({ run_id: runId || `${c.card_id}_${preset}_L${Date.now().toString(36)}`, card_id: c.card_id, sample_index: sample || null, mode: 'live', origin_mode: null, preset,
        model: out.model, model_returned: out.model_returned, endpoint: out.endpoint, temperature: out.temperature, reasoning_effort: out.reasoning_effort, thinking: out.thinking,
        prompt: { messages: built.messages, source_ids: built.gate.sendable_ids, gate: built.gate, template_hash: c.source || null },
        reply: out.reply, reasoning: out.reasoning || null, finish_reason: out.finish_reason, usage: out.usage, ms: out.ms, attempts: 1,
        date: new Date().toISOString(), error: out.ok ? null : out.error, web: null, transcription: null, parsed: null, environment: env || navigator.userAgent }, Model.secrets());
      MS.last[preset] = { ok: out.ok, error: out.error, at: run.date }; emit('w10-model');
      Through.add('runs', run, 'run_id');
      return run;
    },
    /* 页面上的一格：回放模式只取记录；现场模式发请求，失败时退回回放或"待课前运行"，如实写明 */
    async run(cardId, preset) {
      const c = card(cardId); if (!c) throw new Error('没有条件卡 ' + cardId);
      const back = () => { const r = pickedRun(cardId, preset).run; return r ? { kind: r.mode, run: r } : { kind: 'none', run: null }; };
      if (MS.mode !== 'live') return { ...back(), error: back().run ? '' : '预存回放：本格尚无课前运行记录（待课前运行）' };
      try {
        const run = await Model.call(c, preset);
        if (!run.error) { const sel = store.get('sample-sel', {}); sel[cardId + '|' + preset] = run.run_id; store.set('sample-sel', sel); return { kind: 'live', run }; }
        return { ...back(), error: '现场调用失败：' + run.error + '。已改显' + (back().run ? '预存回放' : '"待课前运行"') };
      } catch (e) { return { ...back(), error: String(e.message || e) + '。已改显' + (back().run ? '预存回放' : '"待课前运行"') }; }
    },
  };

  /* ================= 显示用的小件 ================= */
  const MODE_LABEL = { live: '实际调用', replay: '预存回放', 'web-paste': '网页版粘贴', 'teaching-construct': '教学构造', pending: '待课前运行' };
  function badge(run) {
    if (!run) return '<span class="w9-badge none">待课前运行</span>';
    const m = run.mode, om = run.origin_mode;
    if (m === 'web-paste' || om === 'web-paste') {
      const d = `${run.web?.platform || ''}｜界面型号 ${run.web?.model_shown || '—'}｜${run.web?.entry_type || ''}｜记忆${run.web?.memory || '不详'}、联网${run.web?.search || '不详'}｜${(run.date || '').slice(0, 16)}｜原件／截图 ${run.web?.screenshot || '—'}｜${run.transcription || '录入待核'}`;
      return `<span class="w9-badge web-paste" title="${esc(d)}">${m === 'replay' ? '网页版·课前' : '网页版粘贴'}</span><span class="sub">${esc(d)}</span>`;
    }
    const detail = m === 'replay' ? `课前运行，非史料｜${run.model || ''}｜${(run.date || '').slice(0, 10)}｜温度 ${run.temperature ?? '—'}｜第 ${run.sample_index || '?'} 次` : m === 'live' ? `${run.model || ''}（返回 ${run.model_returned || '—'}）｜${(run.date || '').replace('T', ' ').slice(0, 19)}｜温度 ${run.temperature ?? '—'}${run.environment === 'preclass-panel' ? '｜课前运行面板' : ''}` : '';
    return `<span class="w9-badge ${esc(m)}" title="${esc(detail)}">${esc(MODE_LABEL[m] || m)}</span><span class="sub">${esc(detail)}</span>`;
  }
  /* 回答格：条件卡 × 服务。返回 {html, run} */
  const busy = new Set(), cellErr = new Map();
  function answerCell(cardId, preset, { body } = {}) {
    const k = cardId + '|' + preset, { run, all } = pickedRun(cardId, preset), err = cellErr.get(k);
    const btn = isWeb(preset) ? `<button class="small" data-webpaste="${esc(k)}">录入网页版回答</button>`
      : `<button class="small" data-run="${esc(k)}" ${busy.has(k) ? 'disabled' : ''}>${busy.has(k) ? '运行中…' : MS.mode === 'live' ? '现场调用' : '取预存回放'}</button>`;
    const picker = all.length > 1 ? `<span class="w9-pick">${all.map((r, i) => `<button class="small ${r.run_id === run.run_id ? 'on' : ''}" data-pick="${esc(k)}" data-id="${esc(r.run_id)}" title="${esc(MODE_LABEL[r.mode] || r.mode)}">${r.mode === 'live' ? '现' : r.mode === 'web-paste' || r.origin_mode === 'web-paste' ? '网' : ''}${i + 1}</button>`).join('')}</span>` : '';
    const content = run ? (body ? body(run) : `<div class="w9-reply">${esc(run.reply)}</div>`) : `<p class="w10-pending">待课前运行。课前记录由教师填 Key 后在"课前运行"面板生成${isWeb(preset) ? '；网页版由教师运行后截图，录入此格' : ''}；这里不放构造的回答。</p>`;
    return { run, html: `<div class="w9-cell" data-cell="${esc(k)}"><div class="w9-cell-head"><b>${esc(PRESET_LABEL[preset] || preset)}</b> ${badge(run)} ${btn} ${picker}</div>${err ? `<p class="nil small">${esc(err)}</p>` : ''}${content}</div>` };
  }
  async function cellClick(e, host) {
    const pk = e.target.closest('[data-pick]');
    if (pk) { const sel = store.get('sample-sel', {}); sel[pk.dataset.pick] = pk.dataset.id; store.set('sample-sel', sel); host.render(); return true; }
    const r = e.target.closest('[data-run]');
    if (r) { const k = r.dataset.run, [cid, p] = k.split('|'); busy.add(k); host.render(); const out = await Model.run(cid, p); cellErr.set(k, out.error || ''); busy.delete(k); host.render(); return true; }
    const w = e.target.closest('[data-webpaste]');
    if (w) { const [cid, p] = w.dataset.webpaste.split('|'); WebPaste.open(cid, p); return true; }
    return false;
  }
  function cardBox(cardId) {
    const c = card(cardId); if (!c) return '';
    const g = L.gate(c, Mat.entries());
    const mats = c.materials.length ? c.materials.map((m) => `${esc(m.label)}${g.sendable_ids.includes(m.entry_id) ? '' : g.blocked.some((b) => b.entry_id === m.entry_id) ? '（<span class="nil">不可送，已拦截</span>）' : '（<span class="nil">未载入</span>）'}`).join('；') : '不给材料';
    return `<details class="w10-card"><summary><b>条件卡 ${esc(c.card_id)}</b>　${esc(c.title)}　<span class="sub">材料：${mats}</span></summary><p class="sub">讲义 ${esc(c.lecture_ref)}｜模型 DeepSeek、Kimi｜课前每格 ${c.samples} 次｜设置：DeepSeek 非思考、温度 0.7；Kimi 只有思考模式、温度固定、思考档位 low（教师 2026-11-16）｜${esc(c.source)}</p><pre class="srcbox">${esc(c.user_template)}</pre><p class="sub">{{material:…}} 在发出前由史料包回填，先过可否送模型的校验。</p></details>`;
  }

  /* ================= 导入表格（第九周"导入表格"的第十周扩充） ================= */
  const KINDS = window.W10_KINDS || {};
  function parseDelimited(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/, 1)[0] || ''; const sep = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? '\t' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"' && cell === '') { q = true; continue; }
      if (c === sep) { row.push(cell); cell = ''; continue; }
      if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; continue; }
      cell += c;
    }
    row.push(cell); if (row.some((x) => x !== '')) rows.push(row);
    if (!rows.length) throw new Error('没有读到任何行');
    return { head: rows.shift().map((h) => h.trim()), rows };
  }
  function parseAny(text, name) {
    const t = text.trim();
    if (/\.json$/i.test(name) || t.startsWith('[') || t.startsWith('{')) {
      const j = JSON.parse(t);
      if (j.format === 'w10-through/v1') return { through: true };
      if (j.format === 'w10-pack/v1') return { pack: true };
      if (j.format === 'w10-runs/v1') return { runs: j.runs || [] };
      const arr = Array.isArray(j) ? j : j.rows || j.entries || j.data; if (!Array.isArray(arr) || !arr.length) throw new Error('JSON 中没有找到行数组');
      return { head: [...new Set(arr.flatMap((r) => Object.keys(r)))], rows: arr };
    }
    const p = parseDelimited(text); return { head: p.head, rows: p.rows.map((r) => Object.fromEntries(p.head.map((h, i) => [h, r[i] ?? '']))) };
  }
  function guessKind(head) {
    const h = head.map((x) => x.toLowerCase()), has = (...xs) => xs.some((x) => h.includes(x.toLowerCase()));
    if (has('my_reading', '我的理解') && has('verdict', '判定')) return 'sheet';
    if (has('claim_text', '主张', '原子主张') && !has('scholar', '学者')) return 'claims';
    if (has('in_summary', '摘要中有无')) return 'points';
    if (has('action', '事项') && has('date_raw', '时间', '日期')) return 'timeline';
    if (has('signed_date', '自署', 'signed_date_raw')) return 'chengwen';
    if (has('scholar', '学者') && has('claim', '主张', '看法')) return 'views';
    if (has('siglum', '本子简称')) return 'witness';
    if (has('variant_id') && has('category', '类别')) return 'varlabels';
    if (has('row', '行') && has('column', '栏') && has('verdict', '判定')) return 'cellchecks';
    if (has('run_id', '运行编号') && has('names', '点名')) return 'names';
    if (has('draft_id', '草案')) return 'drafts';
    if (has('run_id') && has('reply', '回答')) return 'runs';
    if (has('platform', '平台')) return 'web';
    return has('sendable', '可否送模型') ? 'sourcepack' : 'sheet';
  }
  function guessMap(kind, head) {
    const map = {}, used = new Set();
    for (const [f, , , syn] of KINDS[kind]?.fields || []) { const c = head.find((h) => !used.has(h) && syn.some((s) => s.toLowerCase() === h.toLowerCase())); if (c) { map[f] = c; used.add(c); } }
    return map;
  }
  const truthy = (v) => /^(true|1|是|可|可送|yes|y|已确认|✓)$/i.test(String(v ?? '').trim());
  const ISO = /^-?\d{1,4}(-\d{1,2}){0,2}$/;
  function buildImported(kind, parsed, map, decl) {
    const get = (r, f) => (map[f] ? String(r[map[f]] ?? '').trim() : '');
    const report = { read: parsed.rows.length, ok: 0, problems: [], noRef: 0, unconverted: 0 };
    if (/apikey|api_key|authorization/i.test(parsed.head.join(','))) throw new Error('文件含 Key 一类的列，整份拒绝导入');
    for (const [f, , req] of KINDS[kind].fields) if (req && !map[f]) throw new Error(`必需字段"${f}"没有对应的列`);
    const stamp = Date.now().toString(36);
    const rows = parsed.rows.map((r, i) => {
      const o = {}; for (const [f] of KINDS[kind].fields) if (map[f]) o[f] = get(r, f);
      if (['sheet', 'claims', 'points', 'views'].includes(kind) && !o.source_ref && !o.page) report.noRef++;
      for (const f of Object.keys(o)) if (/_raw$/.test(f) && o[f] && !ISO.test(o[f])) report.unconverted++;
      report.ok++; o._line = i + 2; return o;
    });
    const tool = decl.tool ? { tool: decl.tool, version_or_date: decl.tool_date || '', model: decl.tool_model || null, files: decl.tool_file ? [{ title: decl.tool_file, edition: '', text_layer: decl.text_layer || '有' }] : [], web_access: decl.web === '' ? null : decl.web === '是', question: '', reply: '', citations_verified: null } : null;
    const conv = {
      sheet: (o, i) => ({ row_id: `imp-${stamp}-${i}`, from_page: 'import', run_id: o.run_id || null, point: o.point || null, source_ref: o.source_ref ? { citation: o.source_ref, page: null, page_system: '无', quote: null } : null, my_reading: o.my_reading || null, model_says: o.model_says || null,
        verdict: L.SHEET_VERDICTS.includes(o.verdict) ? o.verdict : null, verdict_prefilled: false, confirmed: truthy(o.confirmed), action: ['采纳', '修正', '舍弃'].includes(o.action) ? o.action : null, reason: o.reason || null,
        tool_record: o.tool ? { tool: o.tool, version_or_date: o.tool_date || '', model: o.tool_model || null } : tool }),
      claims: (o, i) => ({ claim_id: `imp-${stamp}-${i}`, run_id: o.run_id || 'import', claim_text: o.claim_text, verdict: ['有据', '无据', '说宽'].includes(o.verdict) ? o.verdict : null, evidence_quote: o.evidence_quote || null, source_ref: o.source_ref || null }),
      points: (o, i) => ({ point_id: `imp-${stamp}-${i}`, text: o.text, source_ref: o.source_ref || null, in_summary: { 有: 'yes', 无: 'no', 部分: 'partial' }[o.in_summary] || o.in_summary || null }),
      timeline: (o, i) => ({ step_id: `imp-${stamp}-${i}`, run_id: o.run_id || 'import-' + stamp, date_raw: o.date_raw || null, date_from: ISO.test(o.date_from || '') ? o.date_from : null, date_to: ISO.test(o.date_to || '') ? o.date_to : null, actor: o.actor || null, action: o.action, label: o.label || null, label_by: o.label ? 'student' : null, base_row: o.base_row ? +o.base_row : null }),
    };
    const out = rows.map((o, i) => (conv[kind] ? conv[kind](o, i) : o));
    if (kind === 'sheet') out.forEach((r, i) => { if (r.verdict === '模型新见' && !r.confirmed) report.problems.push([rows[i]._line, '"模型新见"未标"已回原文确认"，汇总时不计入']); });
    return { rows: out, report };
  }
  const TARGET = { sheet: 'sheet', claims: 'claims', points: 'points', timeline: 'timeline', chengwen: 'chengwen', varlabels: 'varlabels', cellchecks: 'cellchecks', names: 'namechecks', drafts: 'drafts' };
  const Importer = {
    open(prefKind) {
      if (document.querySelector('.model-shade.w9-importer')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade w9-importer';
      const st = { parsed: null, name: '', kind: prefKind || 'sheet', map: {}, decl: { tool: '', tool_date: '', tool_model: '', tool_file: '', text_layer: '有', web: '' }, msg: '', built: null };
      const draw = () => {
        const k = KINDS[st.kind], head = st.parsed?.head || [];
        const rep = st.built ? `<div class="w9-report"><b>检查报告</b>：读入 ${st.built.report.read} 行，可用 ${st.built.report.ok} 行；无出处 ${st.built.report.noRef} 行；原文纪年未换算 ${st.built.report.unconverted} 处（照录，不自动换算）。${st.built.report.problems.length ? `<ul>${st.built.report.problems.slice(0, 12).map(([n, m]) => `<li>第 ${n} 行：${esc(m)}</li>`).join('')}</ul>` : ''}</div>` : '';
        shade.innerHTML = `<div class="model-panel" role="dialog" aria-label="导入表格"><header><b>导入表格（第十周）</b><button data-x="close">关闭</button></header>
          <p class="sub">CSV、TSV、JSON（也接受贯穿记录、本机材料包与课前运行面板导出的运行记录）。只在本浏览器处理与保存，不上传。含 Key 一类列的文件整份拒绝。</p>
          <p><input type="file" data-x="file" accept=".csv,.tsv,.txt,.json"> ${esc(st.name)}</p>
          ${st.parsed ? `<label>类型 <select data-x="kind">${Object.entries(KINDS).filter(([kk]) => !kk.startsWith('_')).map(([kk, v]) => `<option value="${kk}" ${kk === st.kind ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
          <table class="items"><tr><th>字段</th><th>说明</th><th>对应的列</th></tr>${k.fields.map(([f, d, req]) => `<tr><td class="mono">${esc(f)}${req ? ' *' : ''}</td><td>${esc(d)}</td><td><select data-map="${esc(f)}"><option value="">（无）</option>${head.map((h) => `<option ${st.map[f] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></td></tr>`).join('')}</table>
          ${st.kind === 'sheet' ? `<p class="sub">工具使用条件（扩充部分丙二；可空，填了就写进每一行）：</p><p><label>工具 <input data-d="tool" size="12" value="${esc(st.decl.tool)}"></label> <label>日期 <input data-d="tool_date" size="10" value="${esc(st.decl.tool_date)}"></label> <label>背后的模型 <input data-d="tool_model" size="10" value="${esc(st.decl.tool_model)}"></label> <label>上传的文件 <input data-d="tool_file" size="14" value="${esc(st.decl.tool_file)}"></label> <label>文字层 <select data-d="text_layer">${['有', '无', '有错'].map((x) => `<option ${st.decl.text_layer === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label> <label>联网 <select data-d="web">${['', '是', '否'].map((x) => `<option ${st.decl.web === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></p>` : ''}
          <p><button data-x="check">检查</button> ${st.built ? '<button data-x="accept">加入本机记录</button>' : ''}</p>` : ''}
          ${rep}<p class="pack-err">${esc(st.msg)}</p></div>`;
      };
      shade.addEventListener('change', async (e) => {
        const t = e.target;
        if (t.dataset.x === 'file' && t.files[0]) {
          const f = t.files[0], text = await f.text(); st.name = f.name; st.built = null;
          try {
            const p = parseAny(text, f.name);
            if (p.through) { const r = Through.import(text); st.msg = r.ok ? '已恢复贯穿记录。' : '贯穿记录未恢复，原记录保留：' + r.error; st.parsed = null; draw(); return; }
            if (p.pack) { const err = await Mat.loadLocalFile(f); st.msg = err ? '本机材料包未载入，原有材料保留：' + err : M.localMsg; st.parsed = null; draw(); return; }
            if (p.runs) { if (/"(apiKey|api_key|authorization)"\s*:/i.test(text)) throw new Error('文件含 Key 一类的字段，整份拒绝'); let n = 0; for (const r of p.runs) if (r.run_id && r.reply) { Through.add('runs', { ...r, origin_mode: r.origin_mode || r.mode, mode: 'replay' }, 'run_id'); n++; } st.msg = `已作为预存回放载入 ${n} 条运行记录。`; st.parsed = null; draw(); return; }
            st.parsed = p; st.kind = guessKind(p.head); st.map = guessMap(st.kind, p.head); st.msg = '';
          } catch (err) { st.msg = '读入失败，原有记录保留：' + err.message; st.parsed = null; }
          draw();
        }
        if (t.dataset.x === 'kind') { st.kind = t.value; st.map = guessMap(st.kind, st.parsed.head); st.built = null; draw(); }
        if (t.dataset.map) { st.map[t.dataset.map] = t.value || undefined; st.built = null; draw(); }
        if (t.dataset.d) { st.decl[t.dataset.d] = t.value; st.built = null; draw(); }
      });
      shade.addEventListener('click', (e) => {
        const x = e.target.dataset.x;
        if (x === 'close' || e.target === shade) shade.remove();
        if (x === 'check') { try { st.built = buildImported(st.kind, st.parsed, st.map, st.decl); st.msg = ''; } catch (err) { st.built = null; st.msg = err.message; } draw(); }
        if (x === 'accept' && st.built) {
          const key = TARGET[st.kind];
          if (key) for (const r of st.built.rows) T[key].push(r);
          else if (st.kind === 'sourcepack' || st.kind === 'witness') T.packs.push({ id: 'pack-import-' + Date.now().toString(36), title: st.name, entries: st.built.rows.map((o, i) => ({ id: `impw-${Date.now().toString(36)}-${i}`, title: o.title || o.siglum || `导入条目 ${i + 1}`, citation: o.citation || o.source_citation || st.name, text: o.text || '', text_kind: '录文', sendable: truthy(o.sendable), sendable_basis: '导入者声明', visibility: '本浏览器', page: { system: '无', value: o.page || '' }, siglum: o.siglum || null })) });
          else (T.page_state.imports = T.page_state.imports || []).push({ kind: st.kind, name: st.name, rows: st.built.rows });
          Through.save(); emit('w10-materials');
          st.msg = `已加入本机记录（${st.built.rows.length} 行，类型：${KINDS[st.kind].label}）。`; st.built = null; draw();
        }
      });
      document.body.append(shade); draw();
    },
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-w10-import]'); if (b) Importer.open(b.dataset.w10Import || undefined); });

  /* ================= 网页版粘贴（Gemini、ChatGPT）：教师在网页上运行、截图，Claude 录入，标"录入待核" ================= */
  const WebPaste = {
    open(cardId, platform) {
      const shade = document.createElement('div'); shade.className = 'model-shade w9-importer';
      const n = runsFor(cardId, platform).length + 1;
      shade.innerHTML = `<div class="model-panel" role="dialog" aria-label="网页版粘贴"><header><b>录入网页版回答</b><button data-x="close">关闭</button></header>
        <p class="sub">提示与条件卡 ${esc(cardId)} 同文（第十周/demo/网页版提示/${esc(cardId)}.txt）。按截图录入；录入后标"录入待核"，教师对照截图核过再改"已核"。</p>
        <p><label>条件卡 <select data-f="card_id">${CARDS.map((c) => `<option ${c.card_id === cardId ? 'selected' : ''}>${esc(c.card_id)}</option>`).join('')}</select></label>
        <label>平台 <select data-f="platform">${['gemini', 'chatgpt'].map((p) => `<option value="${p}" ${p === platform ? 'selected' : ''}>${p === 'gemini' ? 'Gemini' : 'ChatGPT'}</option>`).join('')}</select></label>
        <label>第几次 <input data-f="sample" size="3" value="${n}"></label></p>
        <p><label>界面显示的型号 <input data-f="model_shown" size="16"></label> <label>入口 <select data-f="entry_type"><option>新对话</option><option>临时对话</option></select></label>
        <label>记忆 <select data-f="memory"><option>关</option><option>开</option><option>不详</option></select></label> <label>联网 <select data-f="search"><option>关</option><option>开</option><option>不详</option></select></label></p>
        <p><label>运行时间 <input data-f="date" size="18" value="${new Date().toISOString().slice(0, 16)}"></label> <label>截图文件名 <input data-f="screenshot" size="24" placeholder="${esc(cardId)}_${esc(platform)}_${n}.png"></label>
        <label>核对 <select data-f="transcription"><option>据截图目验录入，录入待核</option><option>据截图目验录入，教师已核</option></select></label></p>
        <p><textarea data-f="reply" rows="12" style="width:100%" placeholder="回答全文"></textarea></p>
        <p><button data-x="save">保存</button> <span class="nil" data-msg></span></p></div>`;
      shade.addEventListener('click', (e) => {
        const x = e.target.dataset.x; if (x === 'close' || e.target === shade) { shade.remove(); return; }
        if (x !== 'save') return;
        const v = (k) => shade.querySelector(`[data-f="${k}"]`).value.trim();
        if (!v('reply')) { shade.querySelector('[data-msg]').textContent = '回答为空，未保存。'; return; }
        const p = v('platform'), cid = v('card_id'), s = +v('sample') || 1;
        Through.add('runs', { run_id: `${cid}_${p}_${s}`, card_id: cid, sample_index: s, mode: 'web-paste', origin_mode: null, preset: p, model: v('model_shown') || null, model_returned: null, endpoint: null, temperature: '网页版（不可设）', reasoning_effort: null,
          prompt: { messages: [{ role: 'user', content: `（与条件卡 ${cid} 同文，整段粘贴；见 网页版提示/${cid}.txt）` }], source_ids: (card(cid)?.materials || []).map((m) => m.entry_id), gate: null },
          reply: v('reply'), reasoning: null, finish_reason: null, usage: null, ms: null, date: v('date'), error: null,
          web: { platform: p === 'gemini' ? 'Gemini' : 'ChatGPT', model_shown: v('model_shown'), entry_type: v('entry_type'), memory: v('memory'), search: v('search'), screenshot: v('screenshot') }, transcription: v('transcription'), parsed: null, environment: '网页版（教师浏览器）' }, 'run_id');
        shade.remove(); toast(`已录入 ${cid} · ${p} · 第 ${s} 次（${v('transcription')}）`);
      });
      document.body.append(shade);
    },
  };

  /* ================= 课前运行面板（教师 2026-11-16：教师填 Key，Claude 经 Chrome 插件操作本面板） ================= */
  const PC = { q: null, running: false, stop: false, samples: 3, presets: ['deepseek', 'kimi'], cards: CARDS.map((c) => c.card_id), concurrency: 2, log: [] };
  const Preclass = {
    plan() { const cs = CARDS.filter((c) => PC.cards.includes(c.card_id)); PC.q = L.planPreclass(cs, PC.presets, PC.samples, T.runs.filter((r) => r.environment === 'preclass-panel')); emit('w10-preclass'); },
    async start({ onlyFailed = false } = {}) {
      if (PC.running) return; if (!PC.q) Preclass.plan();
      const missingKey = PC.presets.filter((p) => p !== 'local' && !MS.keys[p]);
      if (missingKey.length) { PC.msg = `没有填 Key：${missingKey.map((p) => PRESET_LABEL[p]).join('、')}。请先在"模型接入"中填写（Key 只存页面内存）。`; emit('w10-preclass'); return; }
      if (!window.W10Live) { PC.msg = '现场调用不可用：页面须经本机服务打开（start_week10.command）。'; emit('w10-preclass'); return; }
      PC.running = true; PC.stop = false; PC.msg = '';
      const todo = PC.q.jobs.filter((j) => (onlyFailed ? j.state === '失败' : j.state !== '完成'));
      const worker = async () => {
        while (!PC.stop) {
          const j = todo.find((x) => x.state === '待运行' || (onlyFailed && x.state === '失败' && !x._claimed));
          if (!j) return;
          j._claimed = true; j.state = '运行中'; j.attempts++; emit('w10-preclass');
          try {
            const run = await Model.call(card(j.card_id), j.preset, { runId: j.run_id, sample: j.sample_index, env: 'preclass-panel' });
            if (run.error) { j.state = '失败'; j.error = run.error; } else { j.state = '完成'; j.error = null; }
          } catch (e) { j.state = '失败'; j.error = String(e.message || e); }
          j._claimed = false; emit('w10-preclass');
        }
      };
      if (onlyFailed) todo.forEach((j) => { j.state = '待运行'; });
      await Promise.all(Array.from({ length: PC.concurrency }, worker));
      PC.running = false; emit('w10-preclass');
    },
    exportRuns() {
      const runs = T.runs.filter((r) => r.environment === 'preclass-panel' || r.mode === 'web-paste');
      const s = JSON.stringify(L.stripSecrets({ format: 'w10-runs/v1', exported_at: new Date().toISOString(), note: '课前运行面板与网页版录入的运行记录；不含 Key。并入本机材料包：python3 apps/week10/scripts/build_packs.py <第十周> <运行记录目录>', runs }, Model.secrets()), null, 1);
      for (const k of Model.secrets()) if (s.includes(k)) throw new Error('导出中出现了 Key，已中止');
      download(`w10-runs-${new Date().toISOString().slice(0, 10)}.json`, s, 'application/json');
    },
    html() {
      const q = PC.q, cnt = (st) => (q ? q.jobs.filter((j) => j.state === st).length : 0);
      return `<div class="w10-preclass"><p class="sub">按条件卡批量运行（条件 × 模型 × 次数），失败的可续跑，完成后导出运行记录（不含 Key）。Key 在"模型接入"里填，只存页面内存。需要本机材料包的卡（D1B、D2B、D2C、D3、D4B）未载入材料包时会失败并写明原因。</p>
        <p><b>条件卡</b> ${CARDS.map((c) => `<label><input type="checkbox" data-pc-card="${esc(c.card_id)}" ${PC.cards.includes(c.card_id) ? 'checked' : ''} ${PC.running ? 'disabled' : ''}> ${esc(c.card_id)}</label>`).join(' ')}</p>
        <p><b>服务</b> ${['deepseek', 'kimi', 'local'].map((p) => `<label><input type="checkbox" data-pc-preset="${p}" ${PC.presets.includes(p) ? 'checked' : ''} ${PC.running ? 'disabled' : ''}> ${esc(PRESET_LABEL[p])}${MS.keys[p] ? '（Key 已填）' : p === 'local' ? '' : '（未填 Key）'}</label>`).join(' ')}　<label>每格次数 <input data-pc-samples size="2" value="${PC.samples}" ${PC.running ? 'disabled' : ''}></label>　<label>同时 <input data-pc-conc size="2" value="${PC.concurrency}" ${PC.running ? 'disabled' : ''}></label></p>
        <p><button data-pc="plan" ${PC.running ? 'disabled' : ''}>生成队列</button> <button data-pc="start" ${PC.running || !q ? 'disabled' : ''}>开始／续跑</button> <button data-pc="failed" ${PC.running || !cnt('失败') ? 'disabled' : ''}>只重跑失败的</button> <button data-pc="stop" ${PC.running ? '' : 'disabled'}>停止</button> <button data-pc="export">导出运行记录</button>
        ${q ? `　<b>进度</b>：完成 ${cnt('完成')}／${q.jobs.length}，运行中 ${cnt('运行中')}，失败 ${cnt('失败')}，待运行 ${cnt('待运行')}` : ''}</p>
        ${PC.msg ? `<p class="nil">${esc(PC.msg)}</p>` : ''}
        ${q ? `<table class="items w10-pctable"><tr><th>run_id</th><th>状态</th><th>次数</th><th>失败原因</th></tr>${q.jobs.map((j) => `<tr class="pc-${j.state}"><td class="mono">${esc(j.run_id)}</td><td>${esc(j.state)}</td><td>${j.attempts}</td><td class="sub">${esc(j.error || '')}</td></tr>`).join('')}</table>` : ''}</div>`;
    },
    dialog() {
      if (document.querySelector('.model-shade.w10-pcdlg')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade w10-pcdlg';
      const draw = () => { if (!shade.isConnected) return; if (shade.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' && document.activeElement.type !== 'checkbox') return; shade.innerHTML = `<div class="model-panel wide" role="dialog" aria-label="课前运行"><header><b>课前运行</b><button data-x="close">关闭</button></header>${Preclass.html()}</div>`; };
      const on = () => (shade.isConnected ? draw() : ['w10-preclass', 'w10-model'].forEach((n) => document.removeEventListener(n, on)));
      ['w10-preclass', 'w10-model'].forEach((n) => document.addEventListener(n, on));
      shade.addEventListener('click', (e) => { if (e.target.dataset.x === 'close' || e.target === shade) shade.remove(); });
      document.body.append(shade); draw();
    },
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pc]'); if (!b) return;
    const a = b.dataset.pc;
    if (a === 'plan') Preclass.plan();
    if (a === 'start') Preclass.start();
    if (a === 'failed') Preclass.start({ onlyFailed: true });
    if (a === 'stop') { PC.stop = true; PC.msg = '已请求停止：正在运行的请求结束后停下。'; emit('w10-preclass'); }
    if (a === 'export') { try { Preclass.exportRuns(); } catch (err) { PC.msg = err.message; emit('w10-preclass'); } }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.pcCard) { const s = new Set(PC.cards); t.checked ? s.add(t.dataset.pcCard) : s.delete(t.dataset.pcCard); PC.cards = CARDS.map((c) => c.card_id).filter((x) => s.has(x)); PC.q = null; emit('w10-preclass'); }
    if (t.dataset.pcPreset) { const s = new Set(PC.presets); t.checked ? s.add(t.dataset.pcPreset) : s.delete(t.dataset.pcPreset); PC.presets = ['deepseek', 'kimi', 'local'].filter((x) => s.has(x)); PC.q = null; emit('w10-preclass'); }
    if (t.dataset.pcSamples !== undefined) { PC.samples = Math.max(1, Math.min(10, +t.value || 3)); PC.q = null; emit('w10-preclass'); }
    if (t.dataset.pcConc !== undefined) { PC.concurrency = Math.max(1, Math.min(4, +t.value || 2)); emit('w10-preclass'); }
  });

  /* ================= 模型接入面板 ================= */
  function modelPanel() {
    const live = Model.liveAvailable();
    const row = (p, label, note) => `<tr><td>${label}</td><td><input data-mk="${p}" type="password" autocomplete="off" placeholder="Key（只存页面内存）" value="${esc(MS.keys[p] || '')}" size="18"></td><td><input data-mm="${p}" value="${esc(MS.models[p] || '')}" size="14"></td><td class="sub">${note}</td><td>${MS.last[p] ? (MS.last[p].ok ? '<span class="ok">上次调用成功</span>' : `<span class="nil" title="${esc(MS.last[p].error)}">上次调用失败</span>`) : '<span class="sub">未调用</span>'}</td></tr>`;
    return `<div class="w9-model"><p><b>运行模式</b>　<label><input type="radio" name="w10mode" value="replay" ${MS.mode !== 'live' ? 'checked' : ''}> 预存回放（断网时用）</label>　<label><input type="radio" name="w10mode" value="live" ${MS.mode === 'live' ? 'checked' : ''} ${live ? '' : 'disabled'}> 现场调用</label>${live ? '' : '　<span class="sub">现场调用须经本机服务打开（start_week10.command）。</span>'}</p>
      <table class="items"><tr><th>服务</th><th>Key</th><th>型号</th><th>设置</th><th>状态</th></tr>
      ${row('deepseek', 'DeepSeek', '非思考模式，温度 0.7（同第九周）')}${row('kimi', 'Kimi', '只有思考模式，温度固定；思考档位 low')}</table>
      <p class="sub">本机模拟接口（只回固定文字，用于测试，不是模型）：<input data-mb="local" size="26" value="${esc(MS.base.local || 'http://127.0.0.1:8790/v1')}">。Key 不写入浏览器存储、记录与导出；刷新页面即清空。</p></div>`;
  }
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'w10mode') Model.setMode(t.value);
    if (t.dataset.mk) Model.setKey(t.dataset.mk, t.value.trim());
    if (t.dataset.mm) Model.setModel(t.dataset.mm, t.value.trim());
    if (t.dataset.mb) Model.setBase(t.dataset.mb, t.value.trim());
  });
  function modelDialog() {
    if (document.querySelector('.model-shade.w9-modeldlg')) return;
    const shade = document.createElement('div'); shade.className = 'model-shade w9-modeldlg';
    const draw = () => { if (shade.contains(document.activeElement) && /INPUT/.test(document.activeElement.tagName) && document.activeElement.type !== 'radio') return; shade.innerHTML = `<div class="model-panel" role="dialog" aria-label="模型接入"><header><b>模型接入</b><button data-x="close">关闭</button></header>${modelPanel()}</div>`; };
    const on = () => (shade.isConnected ? draw() : document.removeEventListener('w10-model', on));
    document.addEventListener('w10-model', on);
    shade.addEventListener('click', (e) => { if (e.target.dataset.x === 'close' || e.target === shade) shade.remove(); });
    document.body.append(shade); draw();
  }

  /* ================= 页面外壳 ================= */
  const flow0 = window.Deck.flowShell;
  window.Deck.flowShell = (page, columns, rail = {}) => flow0(page && (page.steps || []).length !== columns.length ? { ...page, steps: columns.map((c) => c.title) } : page, columns, rail);
  function shell(page, html, { active } = {}) {
    if (!page) return html;
    const steps = page.steps || [];
    const rail = steps.map((t, i) => `<span class="${active === i ? 'active' : ''}">${String(i + 1).padStart(2, '0')} · ${esc(t)}</span>${i < steps.length - 1 ? '<b aria-hidden="true">→</b>' : ''}`).join('');
    return `<div class="flow-shell w9-shell"><div class="flow-head"><p class="flow-question">${esc(page.question || '')}</p><div class="flow-rail" aria-label="教学步骤">${rail}</div></div><div class="w9-shell-body">${html}</div>${page.student_operation ? `<p class="flow-try">动手观察：${esc(page.student_operation)}</p>` : ''}</div>`;
  }
  function render(el, html) {
    const open = [...el.querySelectorAll('details')].map((d) => d.open);
    window.Deck.rerender(el, el.page && !el.noShell && !html.startsWith('<div class="flow-shell') ? shell(el.page(), html, { active: el.activeStep }) : html);
    const now = el.querySelectorAll('details'); if (now.length === open.length) now.forEach((d, i) => { if (open[i]) d.open = true; });
  }
  function toast(msg) { let n = document.querySelector('.live-toast'); if (!n) { n = document.createElement('div'); n.className = 'live-toast'; n.setAttribute('role', 'status'); document.body.append(n); } n.textContent = msg; n.hidden = false; clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 6000); }

  /* ================= 课程通用导入页（握手同第五至九周：PKU_IMPORT_READY／PKU_PROJECT，pku-history-project/v1） ================= */
  let importerWin = null;
  async function openImporter() {
    const u = new URL('importer/index.html', location.href); u.searchParams.set('receiver', location.origin);
    if (location.protocol === 'file:') { toast('通用导入页须经本机服务打开（start_week10.command）；表格材料可用顶栏"导入表格"。'); return; }
    importerWin = window.open('', 'week10-material-importer');
    if (!importerWin) { toast('浏览器拦截了弹出窗口，请允许本站弹窗后再点"文献导入"。'); return; }
    try { const r = await fetch(u.href, { method: 'HEAD', cache: 'no-store' }); if (!r.ok) { importerWin.close(); importerWin = null; toast('通用导入页尚未构建：在终端运行 apps/week10/scripts/build_importer.sh 后再点；表格材料可先用"导入表格"。'); return; } } catch { /* 离线：照常打开 */ }
    importerWin.location.href = u.href;
  }
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !importerWin || e.source !== importerWin) return;
    if (e.data?.type === 'PKU_IMPORT_READY') importerWin.postMessage({ type: 'PKU_IMPORT_HELLO' }, location.origin);
    if (e.data?.type === 'PKU_PROJECT') {
      try {
        const p = e.data.project;
        if (!p || p.schema !== 'pku-history-project/v1' || !Array.isArray(p.sources) || !Array.isArray(p.segments)) throw new Error('不是 pku-history-project/v1 项目');
        const segs = p.segments.filter((x) => typeof x.text === 'string' && x.text.trim() && !x.derived && !x.supersededBy); if (!segs.length) throw new Error('没有可用的正文片段');
        const send = confirm(`通用导入页送回 ${segs.length} 个正文片段。\n这些文字可以送给模型吗？（公开文本或已得到许可选"确定"；否则选"取消"，只在本机显示，任何提示都不会带上它。）`);
        const src = (id) => p.sources.find((x) => x.id === id) || {}, stamp = Date.now().toString(36);
        T.packs.push({ id: 'pack-importer-' + stamp, title: p.title || '导入的材料', entries: segs.map((x, i) => ({ id: `impg-${stamp}-${i}`, title: `${src(x.sourceId).title || x.sourceId}${x.printedPage ? '（' + x.printedPage + '）' : ''}`, citation: src(x.sourceId).title || '', text: x.text, text_kind: '通用导入页识读或提取，未必经过校订', page: x.printedPage ? { system: '原书页', value: String(x.printedPage) } : x.pdfPage ? { system: 'PDF页序', value: String(x.pdfPage) } : { system: '电子文本段落', value: String(x.locator || '') }, sendable: send, sendable_basis: send ? '导入者声明可送' : '导入者未声明可送', visibility: '本浏览器' })) });
        Through.save(); emit('w10-materials');
        importerWin.postMessage({ type: 'PKU_IMPORT_ACCEPTED', message: `第十周已接收 ${segs.length} 个正文片段（${send ? '可送模型' : '不可送模型'}）；可在 D04、D08、D15 中选用。` }, location.origin);
      } catch (err) { importerWin.postMessage({ type: 'PKU_IMPORT_REJECTED', message: err.message }, location.origin); toast('导入失败，原有材料保留：' + err.message); }
    }
  });

  /* ================= 材料说明（顶栏标签；封面只放问题与图例，教师 2026-11-16） ================= */
  const Info = {
    html() {
      const S = window.W10_STATIC, es = Mat.entries(), m = S.matrix, own = (T.page_state.info || {}).own || {};
      const nrep = M.replays.length + T.runs.filter((r) => r.mode === 'replay').length;
      const row = (e) => `<tr><td>${esc(e.title)}</td><td class="sub">${esc(e.citation || '')}${e.page?.value ? `｜${esc(e.page.system)} ${esc(e.page.value)}` : ''}</td><td>${esc(e.text_kind === '仅元数据' ? '录文' : e.text_kind)}</td><td>${e.visibility === '公开' ? '随课件' : e.visibility === '本机材料包' ? '本机材料包' : '本浏览器导入'}</td><td>${e.sendable ? '可' : '<b class="nil">不可</b>'}</td><td>${e.text ? '<span class="ok">已载入</span>' : '<span class="nil">需导入本机材料包</span>'}</td></tr>`;
      const cell = (a, c) => { const [t, p] = m.cells[`${a}|${c}`]; return `<td><a href="#${esc(p)}" data-x="close">${esc(t)}</a> <span class="sub">${esc(p)}</span></td>`; };
      return `<h3>本课材料</h3><table class="items"><tr><th>材料</th><th>版本与位置</th><th>文本身份</th><th>发布</th><th>送模型</th><th>本页状态</th></tr>${es.map(row).join('')}</table>
        <p class="sub">埃姆斯两本据 GHDI 德文页，中译为本课教学转述；勅語成文已对国立公文書館原本影像（原本影像只给链接）。茅海建文、稲田录文、井上草案与书翰七条只进本机材料包，线上版只有页码与短引；扫描本不放页影（教师 2026-11-14、11-16）。录文均为据影像目验录入，待人工逐字复核。</p>
        <h3>导入与接入</h3><ul class="w10-howto">
          <li><b>本机材料包</b>：${M.local ? `<span class="ok">${esc(M.localMsg)}</span>` : `未载入。经 start_week10.command 打开时自动载入；也可手动 <label class="pack-btn small">选择 week10-pack.json<input type="file" accept=".json" data-local hidden></label>`}　课前记录 ${nrep} 条。</li>
          <li><b>导入表格</b>（CSV、TSV、JSON）：阅读对照单、原子主张、时间线、成文表、研究说法表、见证本等十一类，中文表头可直接认出；原文纪年照录，不自动换算。<button class="small" data-w10-import="">打开</button></li>
          <li><b>文献导入</b>：课程通用导入页（PDF、Word、图像），处理后送回本课件，由导入者声明可否送模型。<button class="small" data-open-importer>打开</button></li>
          <li><b>模型接入</b>：DeepSeek 非思考、温度 0.7；Kimi 只有思考模式、温度固定、档位 low。Key 只存页面内存，不进记录与导出。<button class="small" data-open-model>打开</button></li>
          <li><b>课前运行</b>：按条件卡批量运行（10 张卡 × 两家 × 3 次），失败可续跑，导出运行记录（不含 Key）。<button class="small" data-open-preclass>打开</button></li>
          <li><b>网页版</b>（Gemini、ChatGPT）：在 D01、D14 的回答格点"录入网页版回答"，按截图录入，标"录入待核"。提示与条件卡同文，见 第十周/demo/网页版提示/。</li></ul>
        <h3>三个案例 × 四个动作</h3><table class="items w10-matrix"><tr><th></th>${m.cases.map(([, n]) => `<th>${esc(n)}</th>`).join('')}<th>我的材料（课后自填）</th></tr>${m.actions.map(([a, n, sec]) => `<tr><th>${esc(n)}<span class="sub"> ${esc(sec)}</span></th>${m.cases.map(([c]) => cell(a, c)).join('')}<td><input data-own="${a}" value="${esc(own[a] || '')}" placeholder="做什么、用什么材料" size="20"></td></tr>`).join('')}</table><p class="sub">${esc(m.source)}；点格子进入对应页。自填一列存在贯穿记录里。</p>`;
    },
    dialog() {
      if (document.querySelector('.model-shade.w10-info')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade w10-info';
      const draw = () => { if (!shade.isConnected) return; if (shade.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return; shade.innerHTML = `<div class="model-panel wide" role="dialog" aria-label="材料说明"><header><b>材料说明</b><button data-x="close">关闭</button></header>${Info.html()}</div>`; };
      const on = () => (shade.isConnected ? draw() : ['w10-materials', 'w10-model', 'w10-through'].forEach((n) => document.removeEventListener(n, on)));
      ['w10-materials', 'w10-model', 'w10-through'].forEach((n) => document.addEventListener(n, on));
      shade.addEventListener('click', (e) => { if (e.target.closest('[data-x="close"]') || e.target === shade) shade.remove(); if (e.target.closest('[data-open-model]')) modelDialog(); if (e.target.closest('[data-open-importer]')) openImporter(); if (e.target.closest('[data-open-preclass]')) Preclass.dialog(); });
      shade.addEventListener('change', (e) => { const a = e.target.dataset.own; if (a) { T.page_state.info = T.page_state.info || {}; T.page_state.info.own = { ...(T.page_state.info.own || {}), [a]: e.target.value }; Through.save(); } });
      document.body.append(shade); draw();
    },
  };

  /* ================= 顶栏 ================= */
  function topBar() {
    const top = document.querySelector('.deck-top'); if (!top) return false; if (top.querySelector('.pack-bar')) return true;
    const span = document.createElement('span'); span.className = 'pack-bar';
    const draw = () => {
      const live = MS.mode === 'live', keys = ['deepseek', 'kimi'].filter((p) => MS.keys[p]).length, nrep = M.replays.length + T.runs.filter((r) => r.mode === 'replay').length;
      span.innerHTML = '<button class="small" data-open-info>材料说明</button> ' + (M.local ? `<span class="pack-ok" title="${esc(M.localMsg)}">本机材料包已载入（回放 ${nrep} 条）</span>` : `<label class="pack-btn small" title="${esc(M.localMsg || '教师材料录文与课前运行记录')}">导入本机材料包<input type="file" accept=".json" data-local hidden></label>`)
        + ` <button class="small" data-w10-import="">导入表格</button> <button class="small" data-open-importer title="课程通用导入页（PDF、Word、图像）">文献导入</button> <button class="small" data-open-preclass>课前运行</button> <button class="small ${live ? 'on' : ''}" data-open-model>模型接入：${live ? `现场调用（Key ${keys}/2）` : '预存回放'}</button>`;
    };
    draw(); ['w10-materials', 'w10-model', 'w10-through'].forEach((n) => document.addEventListener(n, draw));
    span.addEventListener('click', (e) => { if (e.target.closest('[data-open-model]')) modelDialog(); if (e.target.closest('[data-open-importer]')) openImporter(); if (e.target.closest('[data-open-preclass]')) Preclass.dialog(); if (e.target.closest('[data-open-info]')) Info.dialog(); });
    top.insertBefore(span, top.querySelector('[data-act="presenter"]') || null);
    return true;
  }
  document.addEventListener('change', async (e) => { if (e.target.dataset?.local !== undefined && e.target.files?.[0]) { const err = await Mat.loadLocalFile(e.target.files[0]); e.target.value = ''; if (err) { M.localMsg = '本机材料包未载入：' + err; emit('w10-materials'); alert('未载入：' + err + '（原有材料未改动）'); } } });
  (function waitTop(n) { if (!topBar() && n > 0) setTimeout(() => waitTop(n - 1), 100); })(50);

  window.W10 = { L, Mat, Through, Model, Importer, WebPaste, Preclass, card, CARDS, runsFor, pickedRun, answerCell, cellClick, cardBox, badge, sourceBox, needPack, modelPanel, modelDialog, shell, render, toast, toSheet, PRESET_LABEL, isWeb, MODE_LABEL, emit, parseAny, guessKind, buildImported, KINDS };
})();
