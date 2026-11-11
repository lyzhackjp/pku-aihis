/* 第九周原型的共用部分｜候选，未经教师确认｜Claude（lesson-agent），2026-11-11
 * 材料（史料包、预存回放）、贯穿记录、模型接入状态、调用与回放切换、通用导入对话框。
 * 计算在 w09-lib.js（W9Lib），页面组件在 w09-labs*.js。 */
(() => {
  'use strict';
  const { esc, store, rerender, download } = window.Deck;
  const L = window.W9Lib;

  /* ================= 材料 ================= */
  const PUB = window.W9_PUBLIC || { packs: [], replays: [], resources: {} };
  const M = { packs: PUB.packs.slice(), replays: (PUB.replays || []).slice(), local: null, localMsg: '' };
  const emit = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));
  function mergeLocal(j, from) {
    if (!j || j.format !== 'w09-pack/v1') throw new Error('不是第九周本机材料包（format 应为 w09-pack/v1）');
    for (const p of j.packs || []) {
      const cur = M.packs.find((x) => x.id === p.id);
      if (!cur) M.packs.push(p); else for (const e of p.entries) { const i = cur.entries.findIndex((x) => x.id === e.id); if (i >= 0) cur.entries[i] = e; else cur.entries.push(e); }
    }
    M.replays.push(...(j.replays || []).map((r) => ({ ...r, origin_mode: r.origin_mode || r.mode, mode: 'replay' })));
    M.local = { from, generated: j.generated, n: (j.packs || []).reduce((n, p) => n + p.entries.length, 0), runs: (j.replays || []).length };
    M.localMsg = `已载入本机材料包（${M.local.n} 条史料、${M.local.runs} 条运行记录；${from}）。`;
    emit('w9-materials');
  }
  (async () => {
    const q = new URLSearchParams(location.search).get('pack');
    if (!q) return;
    try { mergeLocal(await (await fetch(q, { cache: 'no-store' })).json(), q); } catch (e) { M.localMsg = '本机材料包未载入：' + e.message; emit('w9-materials'); }
  })();
  const Mat = {
    packs: () => M.packs,
    pack: (id) => M.packs.find((p) => p.id === id),
    entries: (packId) => (packId ? (Mat.pack(packId)?.entries || []) : M.packs.flatMap((p) => p.entries)),
    entry: (id) => Mat.entries().find((e) => e.id === id),
    replays: (filter = {}) => M.replays.filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v)),
    state: () => M,
    loadLocalFile: async (f) => { try { mergeLocal(JSON.parse(await f.text()), f.name); return null; } catch (e) { return e.message; } },
    // 史料条目的一行身份说明
    ident: (e) => `${e.title}｜${e.written_date_raw}（${e.written_date}${e.written_date_end ? '—' + e.written_date_end : ''}，${e.date_kind}）｜${e.citation}｜${e.page?.system || ''} ${e.page?.value || ''}｜${['', '第一层', '第二层', '第三层'][e.layer] || ''}｜${e.sendable ? '可送模型' : '不可送模型'}｜${e.text_kind}`,
  };

  /* ================= 贯穿记录 ================= */
  const TKEY = 'through';
  let T = Object.assign(L.emptyThrough(), store.get(TKEY, {}));
  const Through = {
    get: () => T,
    save() { store.set(TKEY, L.stripSecrets(T)); emit('w9-through'); },
    add(kind, item, key) { const arr = T[kind]; const i = key ? arr.findIndex((x) => x[key] === item[key]) : -1; if (i >= 0) arr[i] = item; else arr.push(item); Through.save(); return item; },
    remove(kind, pred) { T[kind] = T[kind].filter((x) => !pred(x)); Through.save(); },
    labelsFor: (runId) => T.labels.filter((l) => l.run_id === runId).sort((a, b) => a.sentence_index - b.sentence_index),
    setLabel(runId, idx, sentence, patch) {
      const i = T.labels.findIndex((l) => l.run_id === runId && l.sentence_index === idx);
      const base = i >= 0 ? T.labels[i] : { run_id: runId, sentence_index: idx, sentence, score: null, source_ref: null, beyond_timepoint: null, type: null, induced: null, omission: null, empathy_part: null, annotator: '本机' };
      const v = { ...base, ...patch }; if (i >= 0) T.labels[i] = v; else T.labels.push(v); Through.save(); return v;
    },
    export() { return L.exportThrough(T, Model.secrets()); },
    import(text) { const r = L.importThrough(text, T); if (r.ok) { T = r.record; Through.save(); } return r; },
    clear() { T = L.emptyThrough(); Through.save(); },
  };

  /* ================= 教师对晚出或跨时点条目的确认（逐卡记录） ================= */
  const Confirm = {
    get: (cardId) => store.get('confirm', {})[cardId] || [],
    set(cardId, id, on) { const all = store.get('confirm', {}); const cur = new Set(all[cardId] || []); if (on) cur.add(id); else cur.delete(id); all[cardId] = [...cur]; store.set('confirm', all); emit('w9-through'); },
    boxes(card) { const g = L.sourceGate(Mat.entries(), card.timepoint, card.sources); const ids = [...g.late, ...g.boundary, ...g.unknown]; return ids.map((id) => `<label class="w9-confirm"><input type="checkbox" data-confirm="${esc(card.id)}|${esc(id)}" ${Confirm.get(card.id).includes(id) ? 'checked' : ''}> 教师确认保留：${esc(Mat.entry(id)?.title || id)}</label>`).join(''); },
  };
  document.addEventListener('change', (e) => { const c = e.target.dataset?.confirm; if (c) { const [cid, id] = c.split('|'); Confirm.set(cid, id, e.target.checked); } });

  /* ================= 模型接入：Key 只在内存 ================= */
  const MS = { mode: store.get('model-mode', 'replay'), keys: {}, models: store.get('model-names', { deepseek: 'deepseek-flash', kimi: 'kimi-k3' }), base: store.get('model-base', {}), temperature: 0.7, last: {} };
  const Model = {
    state: () => MS,
    secrets: () => Object.values(MS.keys).filter(Boolean),
    setMode(m) { MS.mode = m; store.set('model-mode', m); emit('w9-model'); },
    setKey(p, k) { MS.keys[p] = k; emit('w9-model'); },
    setModel(p, name) { MS.models[p] = name; store.set('model-names', MS.models); emit('w9-model'); },
    ready: (p) => !!(window.W9Live && (MS.keys[p] || p === 'local')),
    liveAvailable: () => !!window.W9Live,
    /* 以条件卡调用一次。返回 {kind:'live'|'replay'|'none', run, error}
     * mode=replay 或现场失败时取预存回放；没有回放就如实返回 none。预存回放不冒充现场调用。 */
    async run(card, presetId, { sample = 1, entries } = {}) {
      const es = entries || Mat.entries();
      card = { ...card, confirm: [...(card.confirm || []), ...Confirm.get(card.id)] };
      const built = L.buildMessages(card, es);
      const base = { card_id: card.id, sample_index: sample, prompt: { messages: built.messages, source_ids: built.source_ids, gate: built.gate } };
      const replay = () => {
        const rs = Mat.replays({ card_id: card.id, preset: presetId }).concat(T.runs.filter((r) => r.mode === 'replay' && r.card_id === card.id && r.preset === presetId));
        return rs.find((r) => (r.sample_index || 1) === sample) || rs[0] || null;
      };
      if (MS.mode !== 'live') { const r = replay(); return r ? { kind: 'replay', run: r } : { kind: 'none', error: '预存回放：本格尚无课前运行记录（待课前运行）' }; }
      if (!window.W9Live) { const r = replay(); return { kind: r ? 'replay' : 'none', run: r, error: '现场调用不可用：页面不是经本机服务打开（file://），模型接入模块未载入' }; }
      if (built.gate.blocked.length && built.source_ids.some((id) => built.gate.blocked.includes(id))) throw new Error('不可送模型的条目进入了提示'); // 防御：不应发生
      const out = await window.W9Live.call({ presetId, model: MS.models[presetId], baseUrl: MS.base[presetId], apiKey: MS.keys[presetId], messages: built.messages, temperature: presetId === 'kimi' ? undefined : (typeof card.temperature === 'number' ? card.temperature : MS.temperature) });
      const run = { run_id: `R-${card.id}-${presetId}-${Date.now().toString(36)}`, ...base, mode: 'live', model: out.model, model_returned: out.model_returned, preset: presetId, endpoint: out.endpoint, temperature: out.temperature, reasoning_effort: out.reasoning_effort, reply: out.reply, finish_reason: out.finish_reason, usage: out.usage, ms: out.ms, date: new Date().toISOString(), error: out.ok ? null : out.error, environment: navigator.userAgent };
      MS.last[presetId] = { ok: out.ok, error: out.error, at: run.date }; emit('w9-model');
      if (out.ok) { Through.add('runs', run, 'run_id'); return { kind: 'live', run }; }
      Through.add('runs', run, 'run_id'); // 失败也记一条，error 写明原因
      const r = replay(); return { kind: r ? 'replay' : 'none', run: r, error: '现场调用失败：' + out.error, failed: run };
    },
  };

  /* ================= 显示用的小件 ================= */
  const MODE_LABEL = { live: '实际调用', replay: '预存回放', 'web-paste': '网页版粘贴', 'teaching-construct': '教学构造' };
  function badge(run, kind) {
    if (!run) return `<span class="w9-badge none">${esc(kind === 'none' ? '待课前运行' : '无记录')}</span>`;
    const m = run.mode, lab = MODE_LABEL[m] || m;
    const detail = m === 'replay' ? `课前运行，非史料｜${run.model || ''}｜${(run.date || '').slice(0, 10)}｜温度 ${run.temperature ?? '—'}` : m === 'live' ? `${run.model || ''}｜${(run.date || '').replace('T', ' ').slice(0, 19)}` : m === 'web-paste' ? `${run.web?.platform || ''}｜${run.web?.model_shown || ''}｜${(run.date || '').slice(0, 16)}` : '人工示意';
    return `<span class="w9-badge ${esc(m)}" title="${esc(detail)}">${esc(lab)}</span><span class="sub">${esc(detail)}</span>`;
  }
  function gateList(gate) {
    const name = (id) => esc(Mat.entry(id)?.title || id);
    const row = (ids, cls, lab) => ids.length ? `<li class="${cls}">${lab}：${ids.map(name).join('；')}</li>` : '';
    return `<ul class="gate">${row(gate.prompt_sources, 'ok', '进入提示')}${row(gate.blocked, 'blocked', '拦截（不可送模型）')}${row(gate.late, 'late', '晚于时点或第三层')}${row(gate.boundary, 'late', '成文跨过时点（待确认）')}${row(gate.unknown, 'late', '成文时间不详')}${row(gate.missing, 'blocked', '史料包中不存在')}</ul>`;
  }
  function sourceBox(id) {
    const e = Mat.entry(id); if (!e) return `<p class="nil">史料 ${esc(id)} 不在当前材料中。</p>`;
    return `<details class="srcbox"><summary>${esc(e.title)}　<span class="sub">${esc(e.page?.value || '')}</span></summary><p class="sub">${esc(Mat.ident(e))}</p>${e.text ? `<pre class="srcbox">${esc(e.text)}</pre>` : `<p class="sub">${e.sendable ? '录文待接入' : '不可送模型：只给页码'}。${esc(e.note || '')}</p>`}${e.transcriber ? `<p class="sub">录入：${esc(e.transcriber)}</p>` : ''}</details>`;
  }

  /* ================= 通用导入对话框（第八周"导入表格"的第九周扩充） ================= */
  const KINDS = window.W9_KINDS || {};
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
      if (j.format === 'w09-through/v1') return { through: j };
      if (j.format === 'w09-pack/v1') return { pack: j };
      if (j.format === 'w09-sourcepack/v1') return { head: [...new Set(j.entries.flatMap((r) => Object.keys(r)))], rows: j.entries.map((r) => r), json: true, meta: j };
      const arr = Array.isArray(j) ? j : j.rows || j.entries || j.data; if (!Array.isArray(arr) || !arr.length) throw new Error('JSON 中没有找到行数组');
      return { head: [...new Set(arr.flatMap((r) => Object.keys(r)))], rows: arr, json: true };
    }
    const p = parseDelimited(text); return { head: p.head, rows: p.rows.map((r) => Object.fromEntries(p.head.map((h, i) => [h, r[i] ?? '']))) };
  }
  function guessKind(head) {
    const h = head.map((x) => x.toLowerCase());
    const has = (...xs) => xs.some((x) => h.includes(x.toLowerCase()));
    if (has('sendable', '可否送模型', '可送模型', 'layer', '层次')) return 'sourcepack';
    if (has('run_id') && has('reply', '回答', '输出')) return 'runs';
    if (has('sentence', '句子') && has('score', '分数', 'type', '错置类型')) return 'labels';
    if (has('question', '题目') && has('type', '题型')) return 'tpq';
    if (has('label', '来源') && has('sentence', '原文')) return 'settinglabels';
    if (has('payoff_a')) return 'payoff'; if (has('share', '比例')) return 'population';
    if (has('answer_agent')) return 'survey'; if (has('platform', '平台')) return 'web';
    if (has('pattern', '格局')) return 'observed'; if (has('run') && has('theta', 'parameter')) return 'sweep';
    return 'sourcepack';
  }
  function guessMap(kind, head) {
    const map = {}, used = new Set();
    for (const [f, , , syn] of KINDS[kind]?.fields || []) { const c = head.find((h) => !used.has(h) && syn.some((s) => s.toLowerCase() === h.toLowerCase())); if (c) { map[f] = c; used.add(c); } }
    return map;
  }
  const truthy = (v) => /^(true|1|是|可|可送|yes|y)$/i.test(String(v).trim());
  function buildImported(kind, parsed, map, decl) {
    const get = (r, f) => (map[f] ? String(r[map[f]] ?? '').trim() : '');
    const report = { read: parsed.rows.length, ok: 0, problems: [], noRef: 0, unconverted: 0 };
    for (const [f, , req] of KINDS[kind].fields) if (req && !map[f]) throw new Error(`必需字段"${f}"没有对应的列`);
    if (/apikey|authorization/i.test(parsed.head.join(','))) throw new Error('文件含 Key 一类的列，整份拒绝导入');
    if (kind === 'sourcepack') {
      const entries = parsed.rows.map((r, i) => {
        const raw = get(r, 'written_date_raw'), iso = get(r, 'written_date') || (/^-?\d{1,4}(-\d{1,2}){0,2}$/.test(raw) ? raw : '');
        if (!iso) report.unconverted++;
        const sendRaw = get(r, 'sendable'); if (sendRaw === '') report.problems.push([i + 2, '缺"可否送模型"，按不可送处理']);
        const e = { id: `imp-${Date.now().toString(36)}-${i}`, person: get(r, 'person'), title: get(r, 'title'), author: '', layer: Number(get(r, 'layer')) || null,
          written_date_raw: raw, written_date: iso, date_precision: iso ? (iso.length > 7 ? 'day' : iso.length > 4 ? 'month' : 'year') : 'unknown', date_kind: get(r, 'date_kind') || '写作',
          citation: get(r, 'citation'), page: { system: get(r, 'page_system') || decl.page_system || '原书页', value: get(r, 'page') }, text: get(r, 'text'), text_kind: get(r, 'text_kind') || (get(r, 'text') ? '录文' : '仅元数据'),
          sendable: truthy(sendRaw), sendable_basis: get(r, 'sendable_basis') || '导入者声明', visibility: '本机材料包', note: `导入（${decl.calendar || '历法未声明'}）；第 ${i + 2} 行` };
        if (![1, 2, 3].includes(e.layer)) report.problems.push([i + 2, '层次不是 1、2、3']);
        if (!e.citation || !e.page.value) report.noRef++;
        if (!e.sendable) e.text = e.text; // 本机导入保留原文，只在本浏览器
        report.ok++; return e;
      });
      return { pack: { format: 'w09-sourcepack/v1', id: 'pack-import-' + Date.now().toString(36), title: decl.title || '我的史料包', calendar_note: decl.calendar || '', entries }, report };
    }
    const rows = parsed.rows.map((r) => { const o = {}; for (const [f] of KINDS[kind].fields) if (map[f]) o[f] = get(r, f); report.ok++; return o; });
    return { rows, report };
  }
  const Importer = {
    open(prefKind, onDone) {
      if (document.querySelector('.model-shade.w9-importer')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade w9-importer';
      const st = { parsed: null, name: '', kind: prefKind || 'sourcepack', map: {}, decl: { calendar: '', page_system: '原书页', timepoint: '', title: '' }, msg: '', built: null };
      const draw = () => {
        const k = KINDS[st.kind];
        const head = st.parsed?.head || [];
        let preview = '';
        if (st.built) {
          const r = st.built.report;
          preview = `<div class="w9-report"><b>检查报告</b>：读入 ${r.read} 行，可用 ${r.ok} 行；无出处 ${r.noRef} 行；未换算公元 ${r.unconverted} 行（原文纪年照录，未自动换算）。${r.problems.length ? `<ul>${r.problems.slice(0, 12).map(([n, m]) => `<li>第 ${n} 行：${esc(m)}</li>`).join('')}</ul>` : ''}`;
          if (st.built.pack && st.decl.timepoint) { const g = L.sourceGate(st.built.pack.entries, st.decl.timepoint); preview += `<p>以模拟时点 ${esc(st.decl.timepoint)} 校验：</p>${gateList(g)}`; }
          preview += '</div>';
        }
        shade.innerHTML = `<div class="model-panel" role="dialog" aria-label="导入表格"><header><b>导入表格（第九周）</b><button data-x="close">关闭</button></header>
          <p class="sub">CSV、TSV、JSON。只在本浏览器处理与保存，不上传。含 Key 一类列的文件整份拒绝。</p>
          <p><input type="file" data-x="file" accept=".csv,.tsv,.txt,.json"> ${st.name ? esc(st.name) : ''}</p>
          ${st.parsed ? `<label>类型 <select data-x="kind">${Object.entries(KINDS).filter(([kk]) => !kk.startsWith('_')).map(([kk, v]) => `<option value="${kk}" ${kk === st.kind ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
          <table class="items"><tr><th>字段</th><th>说明</th><th>对应的列</th></tr>${k.fields.map(([f, d, req]) => `<tr><td class="mono">${esc(f)}${req ? ' *' : ''}</td><td>${esc(d)}</td><td><select data-map="${esc(f)}"><option value="">（无）</option>${head.map((h) => `<option ${st.map[f] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></td></tr>`).join('')}</table>
          ${st.kind === 'sourcepack' ? `<p><label>历法 <select data-d="calendar">${['', '公元', '和暦（不换算）', '光緒等年号（不换算）', '共和纪年（不换算）', '皇纪（不换算）'].map((x) => `<option ${st.decl.calendar === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
            <label>页码体系 <select data-d="page_system">${['全集连续页码', '原书页', 'PDF页序', '扫描图编号', 'NDL コマ', '电子文本段落'].map((x) => `<option ${st.decl.page_system === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
            <label>模拟时点（公元）<input data-d="timepoint" value="${esc(st.decl.timepoint)}" size="10" placeholder="如 1899"></label>
            <label>名称<input data-d="title" value="${esc(st.decl.title)}" size="14"></label></p>` : ''}
          <p><button data-x="check">检查</button> ${st.built ? '<button data-x="accept">加入本机记录</button>' : ''}</p>` : ''}
          ${preview}<p class="pack-err">${esc(st.msg)}</p></div>`;
      };
      shade.addEventListener('change', async (e) => {
        const t = e.target;
        if (t.dataset.x === 'file' && t.files[0]) {
          const f = t.files[0]; st.name = f.name; st.built = null;
          try {
            const p = parseAny(await f.text(), f.name);
            if (p.through) { const r = Through.import(JSON.stringify(p.through)); st.msg = r.ok ? '已恢复贯穿记录。' : '贯穿记录未恢复，保留原记录：' + r.error; st.parsed = null; draw(); return; }
            if (p.pack) { const err = await Mat.loadLocalFile(f); st.msg = err ? '本机材料包未载入：' + err : M.localMsg; st.parsed = null; draw(); return; }
            st.parsed = p; st.kind = guessKind(p.head); st.map = guessMap(st.kind, p.head); st.msg = '';
          } catch (err) { st.msg = '读入失败：' + err.message; st.parsed = null; }
          draw();
        }
        if (t.dataset.x === 'kind') { st.kind = t.value; st.map = guessMap(st.kind, st.parsed.head); st.built = null; draw(); }
        if (t.dataset.map) { st.map[t.dataset.map] = t.value || undefined; st.built = null; draw(); }
        if (t.dataset.d) { st.decl[t.dataset.d] = t.value; if (st.built && st.kind === 'sourcepack') { try { st.built = buildImported(st.kind, st.parsed, st.map, st.decl); } catch { /* 保持 */ } } draw(); }
      });
      shade.addEventListener('click', (e) => {
        const x = e.target.dataset.x;
        if (x === 'close' || e.target === shade) shade.remove();
        if (x === 'check') { try { st.built = buildImported(st.kind, st.parsed, st.map, st.decl); st.msg = ''; } catch (err) { st.built = null; st.msg = err.message; } draw(); }
        if (x === 'accept' && st.built) {
          if (st.built.pack) { M.packs.push(st.built.pack); Through.add('packs', st.built.pack, 'id'); emit('w9-materials'); }
          else { const map = { labels: 'labels', settinglabels: 'setting_labels', runs: 'runs' }; const kk = map[st.kind];
            if (kk) for (const r of st.built.rows) Through.add(kk, kk === 'runs' ? { ...r, origin_mode: r.mode, mode: 'replay', prompt: { messages: [{ role: 'user', content: r.prompt }] } } : { ...r, sentence_index: Number(r.sentence_index) || 0, score: r.score === '' ? null : Number(r.score) });
            else { const imp = store.get('imports', {}); (imp[st.kind] = imp[st.kind] || []).push({ name: st.name, rows: st.built.rows }); store.set('imports', imp); emit('w9-materials'); } }
          st.msg = '已加入本机记录。'; if (onDone) onDone(st); draw();
        }
      });
      document.body.append(shade); draw();
    },
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-w9-import]'); if (b) Importer.open(b.dataset.w9Import || undefined); });

  /* ================= 模型接入面板（D00 与顶栏） ================= */
  function modelPanel() {
    const live = Model.liveAvailable();
    const row = (p, label, note) => `<tr><td>${label}</td><td><input data-mk="${p}" type="password" autocomplete="off" placeholder="Key（只存页面内存）" value="${esc(MS.keys[p] || '')}" size="18"></td><td><input data-mm="${p}" value="${esc(MS.models[p] || '')}" size="14"></td><td class="sub">${note}</td><td>${MS.last[p] ? (MS.last[p].ok ? '<span class="ok">上次调用成功</span>' : `<span class="nil" title="${esc(MS.last[p].error)}">上次调用失败</span>`) : '<span class="sub">未调用</span>'}</td></tr>`;
    return `<div class="w9-model"><p><b>运行模式</b>　<label><input type="radio" name="w9mode" value="replay" ${MS.mode !== 'live' ? 'checked' : ''}> 预存回放（断网时用）</label>　<label><input type="radio" name="w9mode" value="live" ${MS.mode === 'live' ? 'checked' : ''} ${live ? '' : 'disabled'}> 现场调用</label>${live ? '' : '　<span class="sub">现场调用须经本机服务打开（start_week09.command）。</span>'}</p>
      <table class="items"><tr><th>服务</th><th>Key</th><th>型号</th><th>温度</th><th>状态</th></tr>
      ${row('deepseek', 'DeepSeek', '非思考模式，温度可调（默认 0.7）')}${row('kimi', 'Kimi', '只有思考模式，温度固定 1.0')}</table>
      <p class="sub">Key 不写入浏览器存储、记录与导出；刷新页面即清空。网页版（Gemini、ChatGPT）只粘贴回各页，不经这里。</p></div>`;
  }
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'w9mode') Model.setMode(t.value);
    if (t.dataset.mk) Model.setKey(t.dataset.mk, t.value.trim());
    if (t.dataset.mm) Model.setModel(t.dataset.mm, t.value.trim());
  });

  window.W9 = { L, Mat, Through, Model, Confirm, Importer, badge, gateList, sourceBox, modelPanel, MODE_LABEL, emit, parseAny };
})();
