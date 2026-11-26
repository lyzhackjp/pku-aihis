/* 第十一周原型的共用部分｜候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-26（第一批）
 * 由第十周 w10-core.js 改写（全局名、事件名、格式名换成第十一周；导入类型、材料说明、课前运行面板按第十一周；新增"导入 Word 稿"）。第十周原注：在第九周 w09-core.js 上改写：材料（公开包、本机材料包、导入的史料包）、贯穿记录、模型接入与回放切换、
 * 导入表格（第十一周十一类）、课前运行面板、网页版粘贴录入、课程通用导入页的握手。
 * 计算在 w11-lib.js（W11Lib），页面组件在 w11-labs*.js。 */
(() => {
  'use strict';
  const { esc, store, download } = window.Deck;
  const L = window.W11Lib;
  const emit = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));

  /* ================= 材料 ================= */
  const PUB = window.W11_PUBLIC || { packs: [], replays: [] };
  const M = { packs: JSON.parse(JSON.stringify(PUB.packs)), replays: [], local: null, localMsg: '' };
  function mergeLocal(j, from) {
    if (!j || j.format !== 'w11-pack/v1') throw new Error('不是第十一周本机材料包（format 应为 w11-pack/v1）');
    if (/"(apiKey|api_key|authorization)"\s*:/i.test(JSON.stringify(j))) throw new Error('材料包含 Key 一类的字段，整份拒绝');
    for (const p of j.packs || []) {
      const cur = M.packs.find((x) => x.id === p.id);
      if (!cur) M.packs.push(p); else for (const e of p.entries) { const i = cur.entries.findIndex((x) => x.id === e.id); if (i >= 0) cur.entries[i] = e; else cur.entries.push(e); }
    }
    const seen = new Set(M.replays.map((r) => r.run_id));
    for (const r of j.replays || []) if (!seen.has(r.run_id)) M.replays.push({ ...r, origin_mode: r.origin_mode || r.mode, mode: 'replay' });
    if (j.teacher && typeof j.teacher === 'object') M.teacher = j.teacher;
    if (j.page_images && typeof j.page_images === 'object') M.pageImages = { ...(M.pageImages || {}), ...j.page_images };
    if (j.docx && typeof j.docx === 'object') M.docx = { ...(M.docx || {}), ...j.docx };
    M.local = { from, generated: j.generated, n: (j.packs || []).reduce((n, p) => n + p.entries.length, 0), runs: (j.replays || []).length };
    M.localMsg = `已载入本机材料包（${M.local.n} 条材料、${M.local.runs} 条运行记录；${from}）。`;
    emit('w11-materials');
  }
  (async () => {
    const q = new URLSearchParams(location.search).get('pack');
    if (!q) return;
    try { mergeLocal(await (await fetch(q, { cache: 'no-store' })).json(), q); } catch (e) { M.localMsg = '本机材料包未载入：' + e.message; emit('w11-materials'); }
  })();
  function pageReference(e) {
    const primary = e.page?.value ? `${e.page.system} ${e.page.value}` : '';
    return [primary, e.pdfPage && e.page?.system !== 'PDF页序' ? `PDF页序 ${e.pdfPage}` : ''].filter(Boolean).join('｜');
  }
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
    ident: (e) => [e.title, e.citation, pageReference(e), e.written_date_raw || '', e.text_kind, e.sendable ? '可送模型' : '不可送模型', e.visibility, e.transcriber].filter(Boolean).join('｜'),
    restrictedLoaded: () => Mat.entries().some((e) => e.visibility === '本机材料包' && e.text),
    teacher: () => M.teacher || null,
    pageImage: (src, page) => (M.pageImages && M.pageImages[src] && M.pageImages[src][String(page)]) || null,
    docx: (name) => { const b = (window.W11_PUBLIC && window.W11_PUBLIC.docx || {})[name] || (M.docx || {})[name]; if (!b) return null; const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; },
  };
  /* 受限材料缺失时的统一提示（线上版各页不报错） */
  const needPack = (what) => `<p class="w11-need">需导入本机材料包：${esc(what)}。线上版只有页码与短引；教师课上用顶栏"导入本机材料包"载入。</p>`;
  function sourceBox(id, { open = false, highlight = null } = {}) {
    const e = Mat.entry(id); if (!e) return `<p class="nil">材料 ${esc(id)} 不在当前材料中。</p>`;
    let body = '';
    if (e.text) { let h = esc(e.text); if (highlight) for (const w of [].concat(highlight)) if (w) h = h.split(esc(w)).join(`<mark>${esc(w)}</mark>`); body = `<pre class="srcbox">${h}</pre>`; }
    else body = needPack(e.title);
    return `<details class="srcbox" ${open ? 'open' : ''}><summary>${esc(e.title)}</summary><p class="sub">${esc(Mat.ident(e))}</p>${body}</details>`;
  }

  /* ================= 贯穿记录（存本浏览器；导出去 Key） ================= */
  const TKEY = 'through';
  let T = (() => { const r = L.importThrough(JSON.stringify({ ...L.emptyThrough(), ...store.get(TKEY, {}), format: 'w11-through/v1' })); return r.ok ? { ...r.record, runs: store.get(TKEY, {}).runs || [] } : L.emptyThrough(); })();
  const Through = {
    get: () => T,
    save() { store.set(TKEY, L.stripSecrets(T, Model.secrets())); emit('w11-through'); },
    add(kind, item, key) { const arr = T[kind]; const i = key ? arr.findIndex((x) => x[key] === item[key]) : -1; if (i >= 0) arr[i] = item; else arr.push(item); Through.save(); return item; },
    remove(kind, pred) { T[kind] = T[kind].filter((x) => !pred(x)); Through.save(); },
    patch(kind, key, id, patch) { const x = T[kind].find((r) => r[key] === id); if (x) { Object.assign(x, patch); Through.save(); } return x; },
    pageState: (pid) => (T.page_state[pid] = T.page_state[pid] || {}),
    export() { return L.exportThrough(T, Model.secrets(), { restricted: Mat.restrictedLoaded() }); },
    import(text) { const r = L.importThrough(text); if (r.ok) { T = r.record; Through.save(); } return r; },
    clear() { T = L.emptyThrough(); Through.save(); },
  };
  /* 送入登记表（D18 汇总的五张表之一）。各页调用；学生可改 */
  let rowSeq = 0;
  function toRegister(row) {
    const r = { reg_id: `g-${Date.now().toString(36)}-${rowSeq++}`, kind: 'diagnosis', target: '', proposer: { kind: 'model', name: null, run_id: null }, content: '', decision: null, decision_raw: null, reason: null, source_needed: null, from_page: null, date: new Date().toISOString(), ...row };
    Through.add('register', r, 'reg_id'); toast(`已记入登记表（D18）：${String(r.content || '').slice(0, 30)}`); return r;
  }

  /* ================= 模型接入：Key 只在内存 ================= */
  const MS = { mode: store.get('model-mode', 'replay'), keys: {}, models: store.get('model-names', { deepseek: 'deepseek-flash', kimi: 'kimi-k3' }), base: store.get('model-base', {}), last: {} };
  const CARDS = window.W11_CARDS || [];
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
    setMode(m) { MS.mode = m; store.set('model-mode', m); emit('w11-model'); },
    setKey(p, k) { MS.keys[p] = k; emit('w11-model'); },
    setModel(p, name) { MS.models[p] = name; store.set('model-names', MS.models); emit('w11-model'); },
    setBase(p, u) { MS.base[p] = u; store.set('model-base', MS.base); emit('w11-model'); },
    liveAvailable: () => !!window.W11Live,
    /* 真正发出一次请求；先过发出前校验（sendable、正文是否载入）；不通过就抛错，不发半份提示 */
    async call(c, preset, { runId, sample, env } = {}) {
      if (!window.W11Live) throw new Error('现场调用不可用：页面不是经本机服务打开（file://），模型接入模块未载入');
      if (!MS.keys[preset] && preset !== 'local') throw new Error(`没有填 ${PRESET_LABEL[preset] || preset} 的 Key（顶栏"模型接入"）`);
      const built = L.fillTemplate(c, Mat.entries());
      const out = await window.W11Live.call({ presetId: preset, model: MS.models[preset], baseUrl: MS.base[preset], apiKey: MS.keys[preset], messages: built.messages, temperature: c.settings?.deepseek?.temperature });
      const run = L.stripSecrets({ run_id: runId || `${c.card_id}_${preset}_L${Date.now().toString(36)}`, card_id: c.card_id, sample_index: sample || null, mode: 'live', origin_mode: null, preset,
        model: out.model, model_returned: out.model_returned, endpoint: out.endpoint, temperature: out.temperature, reasoning_effort: out.reasoning_effort, thinking: out.thinking,
        prompt: { messages: built.messages, source_ids: built.gate.sendable_ids, gate: built.gate, template_hash: c.source || null },
        reply: out.reply, reasoning: out.reasoning || null, finish_reason: out.finish_reason, usage: out.usage, ms: out.ms, attempts: 1,
        date: new Date().toISOString(), error: out.ok ? null : out.error, web: null, transcription: null, parsed: null, environment: env || navigator.userAgent }, Model.secrets());
      MS.last[preset] = { ok: out.ok, error: out.error, at: run.date }; emit('w11-model');
      Through.add('runs', run, 'run_id');
      return run;
    },
    /* 页面上的一格：回放模式只取记录；现场模式发请求，失败时退回回放或"未载入回答"，如实写明 */
    async run(cardId, preset) {
      const c = card(cardId); if (!c) throw new Error('没有条件卡 ' + cardId);
      const back = () => { const r = pickedRun(cardId, preset).run; return r ? { kind: r.mode, run: r } : { kind: 'none', run: null }; };
      if (MS.mode !== 'live') return { ...back(), error: back().run ? '' : '预存回放：本格尚未载入回答，请载入本机材料包。' };
      try {
        const run = await Model.call(c, preset);
        if (!run.error) { const sel = store.get('sample-sel', {}); sel[cardId + '|' + preset] = run.run_id; store.set('sample-sel', sel); return { kind: 'live', run }; }
        return { ...back(), error: '现场调用失败：' + run.error + '。已改显' + (back().run ? '预存回放' : '"未载入回答"') };
      } catch (e) { return { ...back(), error: String(e.message || e) + '。已改显' + (back().run ? '预存回放' : '"未载入回答"') }; }
    },
  };

  /* ================= 显示用的小件 ================= */
  const MODE_LABEL = { live: '实际调用', replay: '预存回放', 'web-paste': '网页版粘贴', 'teaching-construct': '教学构造', pending: '待课前运行' };
  function badge(run) {
    if (!run) return '<span class="w9-badge none">未载入回答</span>';
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
    const content = run ? (body ? body(run) : `<div class="w9-reply">${esc(run.reply)}</div>`) : `<p class="w11-pending">载入本机材料包可查看课前回放。${isWeb(preset) ? '新取得的回答可用“录入网页版回答”保存。' : '填写 Key 后也可在“课前运行”面板生成新记录。'}</p>`;
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
    return `<details class="w11-card"><summary><b>条件卡 ${esc(c.card_id)}</b>　${esc(c.title)}　<span class="sub">材料：${mats}</span></summary><p class="sub">讲义 ${esc(c.lecture_ref)}｜模型 ${esc(c.models.join('、'))}｜课前每格 ${c.samples} 次${c.optional ? '（可选）' : ''}｜设置沿用第十周：DeepSeek 非思考、温度 0.7；Kimi 只有思考模式、温度固定、思考档位 low｜提示依据：${esc((c.sources || []).join('；'))}｜${esc(c.wording_status || '')}｜${esc(c.source)}</p><pre class="srcbox">${esc(c.user_template)}</pre><p class="sub">{{material:…}} 在发出前由史料包回填，先过可否送模型的校验。</p></details>`;
  }

  /* ================= 导入表格（第九周"导入表格"的第十一周扩充） ================= */
  const KINDS = window.W11_KINDS || {};
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
      if (j.format === 'w11-through/v1') return { through: true };
      if (j.format === 'w11-pack/v1') return { pack: true };
      if (j.format === 'w11-runs/v1') return { runs: j.runs || [] };
      const arr = Array.isArray(j) ? j : j.rows || j.entries || j.data; if (!Array.isArray(arr) || !arr.length) throw new Error('JSON 中没有找到行数组');
      return { head: [...new Set(arr.flatMap((r) => Object.keys(r)))], rows: arr };
    }
    const p = parseDelimited(text); return { head: p.head, rows: p.rows.map((r) => Object.fromEntries(p.head.map((h, i) => [h, r[i] ?? '']))) };
  }
  function guessKind(head) {
    const h = head.map((x) => x.toLowerCase()), has = (...xs) => xs.some((x) => h.includes(x.toLowerCase()));
    if (has('scholar', '学者') && has('relation_to_my_question', '与我的问题的关系', '回应对象', 'responds_to')) return 'matrix';
    if (has('para_id', '段号') && has('text', '正文')) return 'paragraphs';
    if (has('before', '改前') && has('after', '改后')) return 'edits';
    if (has('note_id', '注号') && has('text', '注文')) return 'footnotes';
    if (has('preference', '偏好') && has('status', '状态')) return 'ledger';
    if (has('pattern', '规则')) return 'stylerules';
    if (has('error_id', '植入')) return 'implants';
    if (has('finding_text', '发现')) return 'findings';
    if (has('decision', '处理', '裁决') && has('reason', '理由')) return 'register';
    if (has('ref_id', '参考文献')) return 'bib';
    if (has('page_system', '页码体系')) return 'sourcepages';
    if (has('run_id') && has('reply', '回答')) return 'runs';
    if (has('platform', '平台')) return 'web';
    return has('sendable', '可否送模型') ? 'sourcepack' : 'register';
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
      if (['matrix'].includes(kind) && !o.page) report.noRef++;
      for (const f of Object.keys(o)) if (/_raw$/.test(f) && o[f] && !ISO.test(o[f])) report.unconverted++;
      report.ok++; o._line = i + 2; return o;
    });
    const tool = decl.tool ? { tool: decl.tool, version_or_date: decl.tool_date || '', model: decl.tool_model || null, files: decl.tool_file ? [{ title: decl.tool_file, edition: '', text_layer: decl.text_layer || '有' }] : [], web_access: decl.web === '' ? null : decl.web === '是', question: '', reply: '', citations_verified: null } : null;
    const P = (v) => ({ kind: /模型|model/i.test(v) ? 'model' : /作者|author|本人|我/.test(v) ? 'author' : v ? 'other' : 'author', name: v || null, run_id: null });
    const conv = {
      register: (o, i) => ({ reg_id: `imp-${stamp}-${i}`, kind: ['diagnosis', 'finding', 'edit', 'note_check'].includes(o.kind) ? o.kind : 'diagnosis', target: o.target, proposer: P(o.proposer), content: o.content, decision: o.decision || null, decision_raw: null, reason: o.reason || null, source_needed: o.source_needed || null, from_page: 'import' }),
      edits: (o, i) => ({ edit_id: o.edit_id || `imp-${stamp}-${i}`, para: o.para || null, before: o.before, after: o.after, proposer: P(o.proposer), intention: o.intention || null, intention_shown: o.intention || null, decision: { 采纳: 'accept', 拒绝: 'reject', 修改后采纳: 'modify', accept: 'accept', reject: 'reject', modify: 'modify' }[o.decision] || null, reason: o.reason || null, in_footnote: false }),
      footnotes: (o, i) => ({ note_id: o.note_id || String(i + 1), doc_page: o.doc_page ? +o.doc_page : null, number_on_page: o.number_on_page ? +o.number_on_page : null, text: o.text }),
      paragraphs: (o, i) => ({ doc_id: o.doc_id || 'import-' + stamp, para_id: o.para_id || `P${i + 1}`, text: o.text, page_from: o.page_from || null, page_to: o.page_to || null, page_system: o.page_system || '无', author_summary: o.author_summary || null, model_summary: o.model_summary || null, function: o.function || null, function2: o.function2 || null, answers: o.answers || null }),
      matrix: (o, i) => ({ row_id: o.row_id || `imp-${stamp}-${i}`, scholar: o.scholar, year: o.year || null, claim: o.claim || null, claim_quote: o.claim_quote || null, page: o.page || null, evidence: o.evidence || null, responds_to: o.responds_to || null, responds_basis: o.responds_basis || null, relation_to_my_question: o.relation_to_my_question || null, filled_by: 'author' }),
    };
    const out = rows.map((o, i) => (conv[kind] ? conv[kind](o, i) : o));
    return { rows: out, report };
  }
  const TARGET = { matrix: 'matrix', paragraphs: 'paragraphs', register: 'register', edits: 'edits', footnotes: 'footnotes', bib: 'bib', ledger: 'ledger', implants: 'implants', findings: 'findings' };
  const Importer = {
    open(prefKind) {
      if (document.querySelector('.model-shade.w9-importer')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade w9-importer';
      const st = { parsed: null, name: '', kind: prefKind || 'register', map: {}, decl: { tool: '', tool_date: '', tool_model: '', tool_file: '', text_layer: '有', web: '' }, msg: '', built: null };
      const draw = () => {
        const k = KINDS[st.kind], head = st.parsed?.head || [];
        const rep = st.built ? `<div class="w9-report"><b>检查报告</b>：读入 ${st.built.report.read} 行，可用 ${st.built.report.ok} 行；无出处 ${st.built.report.noRef} 行；原文纪年未换算 ${st.built.report.unconverted} 处（照录，不自动换算）。${st.built.report.problems.length ? `<ul>${st.built.report.problems.slice(0, 12).map(([n, m]) => `<li>第 ${n} 行：${esc(m)}</li>`).join('')}</ul>` : ''}</div>` : '';
        shade.innerHTML = `<div class="model-panel" role="dialog" aria-label="导入表格"><header><b>导入表格（第十一周）</b><button data-x="close">关闭</button></header>
          <p class="sub">CSV、TSV、JSON（也接受贯穿记录、本机材料包与课前运行面板导出的运行记录）。只在本浏览器处理与保存，不上传。含 Key 一类列的文件整份拒绝。</p>
          <p><input type="file" data-x="file" accept=".csv,.tsv,.txt,.json"> ${esc(st.name)}</p>
          ${st.parsed ? `<label>类型 <select data-x="kind">${Object.entries(KINDS).filter(([kk]) => !kk.startsWith('_')).map(([kk, v]) => `<option value="${kk}" ${kk === st.kind ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
          <table class="items"><tr><th>字段</th><th>说明</th><th>对应的列</th></tr>${k.fields.map(([f, d, req]) => `<tr><td class="mono">${esc(f)}${req ? ' *' : ''}</td><td>${esc(d)}</td><td><select data-map="${esc(f)}"><option value="">（无）</option>${head.map((h) => `<option ${st.map[f] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></td></tr>`).join('')}</table>
          ${st.kind === '__none__' ? `<p class="sub">工具使用条件（扩充部分丙二；可空，填了就写进每一行）：</p><p><label>工具 <input data-d="tool" size="12" value="${esc(st.decl.tool)}"></label> <label>日期 <input data-d="tool_date" size="10" value="${esc(st.decl.tool_date)}"></label> <label>背后的模型 <input data-d="tool_model" size="10" value="${esc(st.decl.tool_model)}"></label> <label>上传的文件 <input data-d="tool_file" size="14" value="${esc(st.decl.tool_file)}"></label> <label>文字层 <select data-d="text_layer">${['有', '无', '有错'].map((x) => `<option ${st.decl.text_layer === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label> <label>联网 <select data-d="web">${['', '是', '否'].map((x) => `<option ${st.decl.web === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></p>` : ''}
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
          Through.save(); emit('w11-materials');
          st.msg = `已加入本机记录（${st.built.rows.length} 行，类型：${KINDS[st.kind].label}）。`; st.built = null; draw();
        }
      });
      document.body.append(shade); draw();
    },
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-w11-import]'); if (b) Importer.open(b.dataset.w11Import || undefined); });

  /* ================= 网页版粘贴（Gemini、ChatGPT）：教师在网页上运行、截图，Claude 录入，标"录入待核" ================= */
  const WebPaste = {
    open(cardId, platform) {
      const shade = document.createElement('div'); shade.className = 'model-shade w9-importer';
      const n = runsFor(cardId, platform).length + 1;
      shade.innerHTML = `<div class="model-panel" role="dialog" aria-label="网页版粘贴"><header><b>录入网页版回答</b><button data-x="close">关闭</button></header>
        <p class="sub">提示与条件卡 ${esc(cardId)} 同文（第十一周/demo/网页版提示/${esc(cardId)}.txt）。按截图录入；录入后标"录入待核"，教师对照截图核过再改"已核"。</p>
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
  const API_CARDS = () => CARDS.filter((c) => c.models.some((m) => m !== 'web'));
  const PC = { q: null, running: false, stop: false, samples: 0, presets: ['deepseek', 'kimi'], cards: API_CARDS().filter((c) => !c.optional).map((c) => c.card_id), concurrency: 2, log: [] };
  const Preclass = {
    plan() { const cs = CARDS.filter((c) => PC.cards.includes(c.card_id)); const done = T.runs.filter((r) => r.environment === 'preclass-panel'); const jobs = cs.flatMap((c) => L.planPreclass([c], PC.presets, PC.samples || c.samples, done).jobs); PC.q = { format: 'w11-preclass/v1', jobs }; emit('w11-preclass'); },
    async start({ onlyFailed = false } = {}) {
      if (PC.running) return; if (!PC.q) Preclass.plan();
      const kc = L.checkKeys({ ...MS.keys, local: 'local' }, PC.presets);
      if (!kc.ok) { PC.msg = kc.message; emit('w11-preclass'); return; }
      if (!window.W11Live) { PC.msg = '现场调用不可用：页面须经本机服务打开（start_week11.command）。'; emit('w11-preclass'); return; }
      PC.running = true; PC.stop = false; PC.msg = '';
      const todo = PC.q.jobs.filter((j) => (onlyFailed ? j.state === '失败' : j.state !== '完成'));
      const worker = async () => {
        while (!PC.stop) {
          const j = todo.find((x) => x.state === '待运行' || (onlyFailed && x.state === '失败' && !x._claimed));
          if (!j) return;
          j._claimed = true; j.state = '运行中'; j.attempts++; emit('w11-preclass');
          try {
            const run = await Model.call(card(j.card_id), j.preset, { runId: j.run_id, sample: j.sample_index, env: 'preclass-panel' });
            if (run.error) { j.state = '失败'; j.error = run.error; } else { j.state = '完成'; j.error = null; }
          } catch (e) { j.state = '失败'; j.error = String(e.message || e); }
          j._claimed = false; emit('w11-preclass');
        }
      };
      if (onlyFailed) todo.forEach((j) => { j.state = '待运行'; });
      await Promise.all(Array.from({ length: PC.concurrency }, worker));
      PC.running = false; emit('w11-preclass');
    },
    exportRuns() {
      const runs = T.runs.filter((r) => r.environment === 'preclass-panel' || r.mode === 'web-paste');
      const s = JSON.stringify(L.stripSecrets({ format: 'w11-runs/v1', exported_at: new Date().toISOString(), note: '课前运行面板与网页版录入的运行记录；不含 Key。并入本机材料包：python3 apps/week11/scripts/build_packs.py <课程文件夹> [<运行记录目录>]', runs }, Model.secrets()), null, 1);
      for (const k of Model.secrets()) if (s.includes(k)) throw new Error('导出中出现了 Key，已中止');
      download(`w11-runs-${new Date().toISOString().slice(0, 10)}.json`, s, 'application/json');
    },
    html() {
      const q = PC.q, cnt = (st) => (q ? q.jobs.filter((j) => j.state === st).length : 0);
      return `<div class="w11-preclass"><p class="sub">按条件卡批量运行（条件 × 模型 × 次数），失败的可续跑，完成后导出运行记录（不含 Key）。Key 在"模型接入"里填，只存页面内存。需要本机材料包的卡（D1B、D2P、S1、S2、S3、R1）未载入材料包时会被拦下并写明原因；S3 附的账本三条取自课程文风账本（教师 2026-11-26 同意作学生样板）。每格次数为 0 时按各卡所定（D1A、D1B、D2P 三次；D2A、S1、R1 两次；其余一次）。</p>
        <p><b>条件卡</b> ${API_CARDS().map((c) => `<label><input type="checkbox" data-pc-card="${esc(c.card_id)}" ${PC.cards.includes(c.card_id) ? 'checked' : ''} ${PC.running ? 'disabled' : ''}> ${esc(c.card_id)}${c.optional ? '（可选）' : ''}</label>`).join(' ')}</p>
        <p><b>服务</b> ${['deepseek', 'kimi', 'local'].map((p) => `<label><input type="checkbox" data-pc-preset="${p}" ${PC.presets.includes(p) ? 'checked' : ''} ${PC.running ? 'disabled' : ''}> ${esc(PRESET_LABEL[p])}${MS.keys[p] ? '（Key 已填）' : p === 'local' ? '' : '（未填 Key）'}</label>`).join(' ')}　<label>每格次数 <input data-pc-samples size="2" value="${PC.samples}" ${PC.running ? 'disabled' : ''}></label>　<label>同时 <input data-pc-conc size="2" value="${PC.concurrency}" ${PC.running ? 'disabled' : ''}></label></p>
        <p><button data-pc="plan" ${PC.running ? 'disabled' : ''}>生成队列</button> <button data-pc="start" ${PC.running || !q ? 'disabled' : ''}>开始／续跑</button> <button data-pc="failed" ${PC.running || !cnt('失败') ? 'disabled' : ''}>只重跑失败的</button> <button data-pc="stop" ${PC.running ? '' : 'disabled'}>停止</button> <button data-pc="export">导出运行记录</button>
        ${q ? `　<b>进度</b>：完成 ${cnt('完成')}／${q.jobs.length}，运行中 ${cnt('运行中')}，失败 ${cnt('失败')}，待运行 ${cnt('待运行')}` : ''}</p>
        ${PC.msg ? `<p class="nil">${esc(PC.msg)}</p>` : ''}
        ${q ? `<table class="items w11-pctable"><tr><th>run_id</th><th>状态</th><th>次数</th><th>失败原因</th></tr>${q.jobs.map((j) => `<tr class="pc-${j.state}"><td class="mono">${esc(j.run_id)}</td><td>${esc(j.state)}</td><td>${j.attempts}</td><td class="sub">${esc(j.error || '')}</td></tr>`).join('')}</table>` : ''}</div>`;
    },
    dialog() {
      if (document.querySelector('.model-shade.w11-pcdlg')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade w11-pcdlg';
      const draw = () => {
        if (!shade.isConnected || shade._drawing) return;
        // 第十一周改：不再因焦点在输入框里而跳过重绘（第十周的写法会让"改次数→生成队列"后界面不更新）；重绘后把焦点放回原输入框
        const a = document.activeElement, key = a && shade.contains(a) ? [...a.attributes].filter((x) => x.name.startsWith('data-')).map((x) => `[${x.name}="${x.value}"]`).join('') : '';
        shade._drawing = true;
        try { shade.innerHTML = `<div class="model-panel wide" role="dialog" aria-label="课前运行"><header><b>课前运行</b><button data-x="close">关闭</button></header>${Preclass.html()}</div>`; } finally { shade._drawing = false; }
        if (key) { const n = shade.querySelector(key); if (n) n.focus(); }
      };
      const on = () => (shade.isConnected ? draw() : ['w11-preclass', 'w11-model'].forEach((n) => document.removeEventListener(n, on)));
      ['w11-preclass', 'w11-model'].forEach((n) => document.addEventListener(n, on));
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
    if (a === 'stop') { PC.stop = true; PC.msg = '已请求停止：正在运行的请求结束后停下。'; emit('w11-preclass'); }
    if (a === 'export') { try { Preclass.exportRuns(); } catch (err) { PC.msg = err.message; emit('w11-preclass'); } }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.pcCard) { const s = new Set(PC.cards); t.checked ? s.add(t.dataset.pcCard) : s.delete(t.dataset.pcCard); PC.cards = API_CARDS().map((c) => c.card_id).filter((x) => s.has(x)); PC.q = null; emit('w11-preclass'); }
    if (t.dataset.pcPreset) { const s = new Set(PC.presets); t.checked ? s.add(t.dataset.pcPreset) : s.delete(t.dataset.pcPreset); PC.presets = ['deepseek', 'kimi', 'local'].filter((x) => s.has(x)); PC.q = null; emit('w11-preclass'); }
    if (t.dataset.pcSamples !== undefined) { PC.samples = Math.max(0, Math.min(10, +t.value || 0)); PC.q = null; emit('w11-preclass'); }
    if (t.dataset.pcConc !== undefined) { PC.concurrency = Math.max(1, Math.min(4, +t.value || 2)); emit('w11-preclass'); }
  });

  /* ================= 模型接入面板 ================= */
  function modelPanel() {
    const live = Model.liveAvailable();
    const row = (p, label, note) => `<tr><td>${label}</td><td><input data-mk="${p}" type="password" autocomplete="off" placeholder="Key（只存页面内存）" value="${esc(MS.keys[p] || '')}" size="18"></td><td><input data-mm="${p}" value="${esc(MS.models[p] || '')}" size="14"></td><td class="sub">${note}</td><td>${MS.last[p] ? (MS.last[p].ok ? '<span class="ok">上次调用成功</span>' : `<span class="nil" title="${esc(MS.last[p].error)}">上次调用失败</span>`) : '<span class="sub">未调用</span>'}</td></tr>`;
    return `<div class="w9-model"><p><b>运行模式</b>　<label><input type="radio" name="w11mode" value="replay" ${MS.mode !== 'live' ? 'checked' : ''}> 预存回放（断网时用）</label>　<label><input type="radio" name="w11mode" value="live" ${MS.mode === 'live' ? 'checked' : ''} ${live ? '' : 'disabled'}> 现场调用</label>${live ? '' : '　<span class="sub">现场调用须经本机服务打开（start_week11.command）。</span>'}</p>
      <table class="items"><tr><th>服务</th><th>Key</th><th>型号</th><th>设置</th><th>状态</th></tr>
      ${row('deepseek', 'DeepSeek', '非思考模式，温度 0.7（同第九周）')}${row('kimi', 'Kimi', '只有思考模式，温度固定；思考档位 low')}</table>
      <p class="sub">本机模拟接口（只回固定文字，用于测试，不是模型）：<input data-mb="local" size="26" value="${esc(MS.base.local || 'http://127.0.0.1:8790/v1')}">。Key 不写入浏览器存储、记录与导出；刷新页面即清空。</p></div>`;
  }
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'w11mode') Model.setMode(t.value);
    if (t.dataset.mk) Model.setKey(t.dataset.mk, t.value.trim());
    if (t.dataset.mm) Model.setModel(t.dataset.mm, t.value.trim());
    if (t.dataset.mb) Model.setBase(t.dataset.mb, t.value.trim());
  });
  function modelDialog() {
    if (document.querySelector('.model-shade.w9-modeldlg')) return;
    const shade = document.createElement('div'); shade.className = 'model-shade w9-modeldlg';
    const draw = () => { if (shade.contains(document.activeElement) && /INPUT/.test(document.activeElement.tagName) && document.activeElement.type !== 'radio') return; shade.innerHTML = `<div class="model-panel" role="dialog" aria-label="模型接入"><header><b>模型接入</b><button data-x="close">关闭</button></header>${modelPanel()}</div>`; };
    const on = () => (shade.isConnected ? draw() : document.removeEventListener('w11-model', on));
    document.addEventListener('w11-model', on);
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
    if (location.protocol === 'file:') { toast('通用导入页须经本机服务打开（start_week11.command）；表格材料可用顶栏"导入表格"。'); return; }
    importerWin = window.open('', 'week11-material-importer');
    if (!importerWin) { toast('浏览器拦截了弹出窗口，请允许本站弹窗后再点"文献导入"。'); return; }
    try { const r = await fetch(u.href, { method: 'HEAD', cache: 'no-store' }); if (!r.ok) { importerWin.close(); importerWin = null; toast('通用导入页尚未构建：从课件仓库根目录运行 apps/week11/scripts/build_importer.sh 后再点；表格材料可先用"导入表格"。'); return; } } catch { /* 离线：照常打开 */ }
    importerWin.location.href = u.href;
  }
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !importerWin || e.source !== importerWin) return;
    if (e.data?.type === 'PKU_IMPORT_READY') importerWin.postMessage({ type: 'PKU_IMPORT_HELLO' }, location.origin);
    if (e.data?.type === 'PKU_PROJECT') {
      try {
        const p = e.data.project;
        if (!p || p.schema !== 'pku-history-project/v1' || !Array.isArray(p.sources) || !Array.isArray(p.segments)) throw new Error('不是 pku-history-project/v1 项目');
        const segs = p.segments.filter((x) => typeof x?.text === 'string' && x.text.trim() && !x.derived && !x.supersededBy);
        if (!segs.length) throw new Error('没有可用的正文片段');
        const sources = new Map(p.sources.map((source) => [source.id, source]));
        if (segs.some((x) => !sources.has(x.sourceId))) throw new Error('正文片段缺少对应的来源');
        const send = confirm(`通用导入页送回 ${segs.length} 个正文片段。\n这些文字可以送给模型吗？（公开文本或已得到许可选"确定"；否则选"取消"，只在本机使用。）`);
        const stamp = crypto.randomUUID();
        const entries = segs.map((x, i) => {
          const source = sources.get(x.sourceId);
          const page = x.printedPage ? { system: '印刷页码／档号', value: String(x.printedPage) }
            : x.pdfPage ? { system: 'PDF页序', value: String(x.pdfPage) }
            : { system: '原件定位', value: x.locator || '' };
          return {
            id: `impg-${stamp}-${i}`, title: source.title || x.sourceId,
            citation: [source.author, source.title, source.date].filter(Boolean).join('，'),
            text: x.text, text_kind: x.method || '通用导入页识读或提取', page, pdfPage: x.pdfPage || null,
            sendable: send, sendable_basis: send ? '导入者声明可送' : '导入者选择只在本机使用', visibility: '本浏览器',
          };
        });
        const pack = { id: 'pack-importer-' + stamp, title: p.title || '导入的材料', entries };
        const next = { ...T, packs: [...T.packs, pack] };
        store.set(TKEY, L.stripSecrets(next, Model.secrets()));
        if (!store.get(TKEY, {}).packs?.some((x) => x.id === pack.id)) throw new Error('浏览器未能保存材料，请缩小所选片段后重试');
        T = next;
        emit('w11-through'); emit('w11-materials');
        importerWin.postMessage({ type: 'PKU_IMPORT_ACCEPTED', message: `第十一周已接收 ${entries.length} 个正文片段（${send ? '可送模型' : '只在本机使用'}）。请回课件顶栏“材料说明”，展开“查看正文”核对片段和出处。` }, location.origin);
      } catch (err) { importerWin.postMessage({ type: 'PKU_IMPORT_REJECTED', message: err.message }, location.origin); toast('导入失败，原有材料保留：' + err.message); }
    }
  });

  /* ================= 材料说明（顶栏） ================= */
  const Info = {
    html() {
      const es = Mat.entries(), nrep = M.replays.length + T.runs.filter((r) => r.mode === 'replay').length;
      const row = (e) => `<tr><td>${esc(e.title)}${e.id?.startsWith('impg-') ? `<details><summary>查看正文</summary><pre class="srcbox">${esc(e.text)}</pre></details>` : ''}</td><td class="sub">${esc([e.citation, pageReference(e)].filter(Boolean).join('｜'))}</td><td>${esc(e.text_kind)}</td><td>${e.visibility === '公开' ? '随课件' : e.visibility === '本机材料包' ? '本机材料包' : '本浏览器导入'}</td><td>${e.sendable ? '可' : '<b class="nil">不可</b>'}</td><td>${e.text ? '<span class="ok">已载入</span>' : '<span class="nil">需导入本机材料包</span>'}</td></tr>`;
      return `<h3>本课材料</h3><table class="items"><tr><th>材料</th><th>版本与位置</th><th>文本身份</th><th>发布</th><th>送模型</th><th>本页状态</th></tr>${es.map(row).join('')}</table>
        <p class="sub">练习材料甲是教学构造，可以分发；教师 2023 年论文已刊，教师 2026-11-25 同意线上使用全文；茅海建、郭卫东、刘路生原文只进本机材料包，线上只有页码与短引；扫描本不放页影。4.3 答案只在本机材料包的教师模式。</p>
        <h3>导入与接入</h3><ul class="w11-howto">
          <li><b>本机材料包</b>：${M.local ? `<span class="ok">${esc(M.localMsg)}</span>` : `未载入。经 start_week11.command 打开时自动载入；也可手动 <label class="pack-btn small">选择 week11-pack.json<input type="file" accept=".json" data-local hidden></label>`}　课前记录 ${nrep} 条。</li>
          <li><b>导入 Word 稿</b>：只在本浏览器内解析，不上传；抽出段落、脚注（按每页重新编号）、修订与批注，用于 D05、D13、D15、D17。<button class="small" data-open-docx>打开</button></li>
          <li><b>导入表格</b>（CSV、TSV、JSON）：综述矩阵、段落表、登记表、修改表、脚注表、参考文献目录、文风账本等，中文表头可直接认出。<button class="small" data-w11-import="">打开</button></li>
          <li><b>文献导入</b>：课程通用导入页（PDF、Word、图像），处理后送回本课件，由导入者声明可否送模型。<button class="small" data-open-importer>打开</button></li>
          <li><b>模型接入</b>：DeepSeek 非思考、温度 0.7；Kimi 只有思考模式、温度固定、档位 low（沿用第十周）。Key 只存页面内存，不进记录与导出。<button class="small" data-open-model>打开</button></li>
          <li><b>课前运行</b>：按条件卡批量运行（必跑 30 次，可选 8 次），失败可续跑，导出运行记录（不含 Key）。<button class="small" data-open-preclass>打开</button></li>
          <li><b>网页版</b>（Gemini、ChatGPT）：演示③(a) 的六份课前回放已核对原件。新录入的回答在 D14 按各自的核对状态显示。</li></ul>`;
    },
    dialog() {
      if (document.querySelector('.model-shade.w11-info')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade w11-info';
      const draw = () => { if (!shade.isConnected) return; if (shade.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return; shade.innerHTML = `<div class="model-panel wide" role="dialog" aria-label="材料说明"><header><b>材料说明</b><button data-x="close">关闭</button></header>${Info.html()}</div>`; };
      const on = () => (shade.isConnected ? draw() : ['w11-materials', 'w11-model', 'w11-through'].forEach((n) => document.removeEventListener(n, on)));
      ['w11-materials', 'w11-model', 'w11-through'].forEach((n) => document.addEventListener(n, on));
      shade.addEventListener('click', (e) => { if (e.target.closest('[data-x="close"]') || e.target === shade) shade.remove(); if (e.target.closest('[data-open-model]')) modelDialog(); if (e.target.closest('[data-open-importer]')) openImporter(); if (e.target.closest('[data-open-preclass]')) Preclass.dialog(); if (e.target.closest('[data-open-docx]')) WordImport.open(); });
      document.body.append(shade); draw();
    },
  };

  /* ================= 导入 Word 稿（只在浏览器内解析，不上传；原文件不改） ================= */
  const WordImport = {
    open(pref) {
      if (document.querySelector('.model-shade.w11-docx')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade w9-importer w11-docx';
      const st = { name: '', d: null, rev: null, msg: '', merge: {}, use: pref || 'paragraphs' };
      const draw = () => {
        const d = st.d, r = st.rev;
        const paras = d ? d.paragraphs.filter((p) => p.text.trim()) : [];
        shade.innerHTML = `<div class="model-panel wide" role="dialog" aria-label="导入 Word 稿"><header><b>导入 Word 稿（.docx）</b><button data-x="close">关闭</button></header>
          <p class="sub">文件只在本浏览器内解析（DecompressionStream＋按标签读 XML），不上传，不改原文件；导出只导出抽出的表。分页只认文件中的显式分页（段前分页、分页符），Word 自动排出的分页不在文件里，以 Word 显示为准。</p>
          <p><input type="file" accept=".docx" data-x="file"> ${esc(st.name)}</p>
          ${d ? `<p>段落 ${paras.length}（显式分页 ${Math.max(...d.paragraphs.map((p) => p.page))} 页）｜脚注 ${d.footnotes.length}（编号：${esc(d.settings.numFmt)}，${d.settings.numRestart === 'eachPage' ? '每页重新编号' : '连续编号'}）｜修订 ${r.edits.length}（脚注中 ${r.edits.filter((x) => x.in_footnote).length}）｜批注 ${r.comments.length}</p>
          <p><b>用作</b> ${[['paragraphs', '段落表（D05、D06）'], ['footnotes', '脚注表（D15、D17）'], ['edits', '修改表（D10、D13）']].map(([k, l]) => `<label><input type="radio" name="w11use" value="${k}" ${st.use === k ? 'checked' : ''}> ${l}</label>`).join('　')}</p>
          ${st.use === 'paragraphs' ? `<table class="items"><tr><th>Word 段</th><th>页</th><th>开头</th><th>与上一段合并（续段）</th></tr>${paras.map((p, i) => `<tr><td>${p.index}</td><td>${p.page}</td><td>${esc(p.text.slice(0, 40))}</td><td>${i ? `<input type="checkbox" data-merge="${p.index}" ${st.merge[p.index] ? 'checked' : ''}>` : ''}</td></tr>`).join('')}</table><p class="sub">第一段若是标题，可在加入后删去。</p>` : ''}
          ${st.use === 'footnotes' ? `<table class="items"><tr><th>注</th><th>页</th><th>页内号</th><th>注文</th></tr>${d.footnotes.map((n) => `<tr><td>${esc(n.note_id)}</td><td>${n.doc_page}</td><td>${L.noteLabel(n.number_on_page, d.settings.numFmt)}</td><td>${esc(n.text)}</td></tr>`).join('')}</table>` : ''}
          ${st.use === 'edits' ? (r.edits.length ? `<table class="items"><tr><th>位置</th><th>修订者</th><th>删</th><th>插</th><th>批注</th></tr>${r.edits.map((x) => `<tr><td>${x.in_footnote ? '脚注 ' + esc(x.note_id) : 'Word 段 ' + x.para_index}</td><td>${esc(x.author)}</td><td><del>${esc(x.removed)}</del></td><td><ins>${esc(x.added)}</ins></td><td>${esc(x.comment || '')}</td></tr>`).join('')}</table>` : '<p class="nil">这份稿子里没有修订。</p>') : ''}
          <p><button data-x="accept">加入本机记录</button> <button data-x="csv">导出这张表（.csv）</button></p>` : ''}
          <p class="pack-err">${esc(st.msg)}</p></div>`;
      };
      const table = () => {
        const d = st.d, doc = st.name.replace(/\.docx$/i, '');
        if (st.use === 'footnotes') return d.footnotes.map((n) => ({ ...n, doc_id: doc }));
        if (st.use === 'edits') return st.rev.edits.map((x) => ({ edit_id: `${doc}-${x.edit_id}`, para: x.in_footnote ? `注${x.note_id}` : String(x.para_index), before: x.before, after: x.after, author: x.author, date: x.date,
          location: x.in_footnote ? `脚注 ${x.note_id}` : `Word 段 ${x.para_index}`, removed: x.removed, added: x.added, proposer: { kind: /deepseek|kimi|gemini|chatgpt|claude|copilot|模型|reviser/i.test(x.author) ? 'model' : 'author', name: x.author, run_id: null },
          intention: null, intention_shown: null, decision: null, reason: x.comment || null, in_footnote: x.in_footnote }));
        const out = []; let n = 0;
        for (const p of d.paragraphs.filter((q) => q.text.trim())) {
          if (st.merge[p.index] && out.length) { const o = out[out.length - 1]; o.text += p.text; o.word_paras.push(p.index); o.page_to = String(p.page); continue; }
          out.push({ doc_id: doc, para_id: `P${++n}`, text: p.text, word_paras: [p.index], page_from: String(p.page), page_to: String(p.page), page_system: 'Word页', author_summary: null, model_summary: null, model_run_id: null, function: null, function2: null, answers: null });
        }
        return out;
      };
      shade.addEventListener('change', async (e) => {
        const t = e.target;
        if (t.dataset.x === 'file' && t.files[0]) {
          const f = t.files[0]; st.name = f.name; st.msg = '解析中…'; draw();
          try { const buf = await f.arrayBuffer(); st.d = await L.parseDocx(buf); st.rev = await L.docxRevisions(buf); st.merge = {}; st.msg = ''; }
          catch (err) { st.d = null; st.msg = '解析失败，原有记录保留：' + err.message; }
          draw();
        }
        if (t.name === 'w11use') { st.use = t.value; draw(); }
        if (t.dataset.merge) st.merge[t.dataset.merge] = t.checked;
      });
      shade.addEventListener('click', (e) => {
        const x = e.target.dataset.x;
        if (x === 'close' || e.target === shade) shade.remove();
        if (x === 'accept' && st.d) {
          const rows = table(), key = st.use;
          if (key === 'paragraphs' || key === 'footnotes') T[key] = T[key].filter((r) => r.doc_id !== rows[0]?.doc_id).concat(rows); else for (const r of rows) Through.add('edits', r, 'edit_id');
          (T.page_state.docs = T.page_state.docs || {})[st.name] = { use: key, n: rows.length, settings: st.d.settings, at: new Date().toISOString() };
          Through.save(); emit('w11-materials'); st.msg = `已加入本机记录：${rows.length} 行（${key}）。原文件未上传、未保存。`; draw();
        }
        if (x === 'csv' && st.d) {
          const rows = table(), head = [...new Set(rows.flatMap((r) => Object.keys(r)))];
          const cell = (v) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
          download(`${st.name.replace(/\.docx$/i, '')}_${st.use}.csv`, '\ufeff' + [head.join(','), ...rows.map((r) => head.map((h) => cell(r[h])).join(','))].join('\n'), 'text/csv');
        }
      });
      document.body.append(shade); draw();
    },
  };
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-docx]') && !e.target.closest('.pack-bar') && !e.target.closest('.w11-info')) WordImport.open(e.target.closest('[data-open-docx]').dataset.openDocx || undefined); });

  /* ================= 顶栏 ================= */
  function topBar() {
    const top = document.querySelector('.deck-top'); if (!top) return false; if (top.querySelector('.pack-bar')) return true;
    const span = document.createElement('span'); span.className = 'pack-bar';
    const draw = () => {
      const live = MS.mode === 'live', keys = ['deepseek', 'kimi'].filter((p) => MS.keys[p]).length, nrep = M.replays.length + T.runs.filter((r) => r.mode === 'replay').length;
      span.innerHTML = '<button class="small" data-open-info>材料说明</button> ' + (M.local ? `<span class="pack-ok" title="${esc(M.localMsg)}">本机材料包已载入（回放 ${nrep} 条）</span>` : `<label class="pack-btn small" title="${esc(M.localMsg || '教师材料录文与课前运行记录')}">导入本机材料包<input type="file" accept=".json" data-local hidden></label>`)
        + ` <button class="small" data-open-docx title="只在本浏览器内解析，不上传">导入 Word 稿</button> <button class="small" data-w11-import="">导入表格</button> <button class="small" data-open-importer title="课程通用导入页（PDF、Word、图像）">文献导入</button> <button class="small" data-open-preclass>课前运行</button> <button class="small ${live ? 'on' : ''}" data-open-model>模型接入：${live ? `现场调用（Key ${keys}/2）` : '预存回放'}</button>`;
    };
    draw(); ['w11-materials', 'w11-model', 'w11-through'].forEach((n) => document.addEventListener(n, draw));
    span.addEventListener('click', (e) => { if (e.target.closest('[data-open-model]')) modelDialog(); if (e.target.closest('[data-open-importer]')) openImporter(); if (e.target.closest('[data-open-preclass]')) Preclass.dialog(); if (e.target.closest('[data-open-info]')) Info.dialog(); if (e.target.closest('[data-open-docx]')) WordImport.open(); });
    top.insertBefore(span, top.querySelector('[data-act="presenter"]') || null);
    return true;
  }
  document.addEventListener('change', async (e) => { if (e.target.dataset?.local !== undefined && e.target.files?.[0]) { const err = await Mat.loadLocalFile(e.target.files[0]); e.target.value = ''; if (err) { M.localMsg = '本机材料包未载入：' + err; emit('w11-materials'); alert('未载入：' + err + '（原有材料未改动）'); } } });
  (function waitTop(n) { if (!topBar() && n > 0) setTimeout(() => waitTop(n - 1), 100); })(50);

  window.W11 = { L, Mat, Through, Model, Importer, WebPaste, Preclass, WordImport, Info, card, CARDS, runsFor, pickedRun, answerCell, cellClick, cardBox, badge, sourceBox, needPack, modelPanel, modelDialog, shell, render, toast, toRegister, PRESET_LABEL, isWeb, MODE_LABEL, emit, parseAny, guessKind, buildImported, KINDS };
})();
