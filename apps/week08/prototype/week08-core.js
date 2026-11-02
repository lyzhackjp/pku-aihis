/* 第八周共用模块：材料包与材料库、表格导入（通用导入页的表格部分）、网络计算与绘图、相似度、回原文。
 * 依赖 deck-core.js 的 window.Deck。结构沿用第七周 week07-core.js：
 * 公开材料随课件发布（data/public/week08-public-pack.js）；CBDB 记录、『梅颸日記』、JBDB 查询结果在本机材料包中，课堂导入，存 IndexedDB。
 * 使用者自己导入的表格也存 IndexedDB（只在本浏览器）。页面只认“材料”的几种结构，不认具体文件名。 */
(() => {
  'use strict';
  const { esc, store, download } = window.Deck;

  /* ================= IndexedDB ================= */
  const DB = 'pku-aihis-week08', OS = 'kv';
  const idb = () => new Promise((ok, no) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(OS); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  async function kvGet(k) { try { const db = await idb(); return await new Promise((ok) => { const q = db.transaction(OS).objectStore(OS).get(k); q.onsuccess = () => ok(q.result ?? null); q.onerror = () => ok(null); }); } catch { return null; } }
  async function kvPut(k, v) { try { const db = await idb(); await new Promise((ok, no) => { const t = db.transaction(OS, 'readwrite'); t.objectStore(OS).put(v, k); t.oncomplete = ok; t.onerror = () => no(t.error); }); return true; } catch { return false; } }
  async function kvDel(k) { try { const db = await idb(); await new Promise((ok) => { const t = db.transaction(OS, 'readwrite'); t.objectStore(OS).delete(k); t.oncomplete = ok; }); } catch { /* ignore */ } }

  /* ================= 材料包：公开＋本机＋使用者导入 ================= */
  let PUB = null, LOCAL = null, USER = {};
  const emit = () => { document.querySelectorAll('[data-needs-pack]').forEach((n) => n.packChanged?.()); document.dispatchEvent(new CustomEvent('w8-pack')); };
  function validateLocal(p) {
    if (!p || p.format !== 'pku-aihis-week08-pack') throw new Error('不是第八周本机材料包（format 字段不符）');
    if (!p.materials || typeof p.materials !== 'object') throw new Error('材料包缺少 materials');
    return p;
  }
  const Pack = {
    hasLocal: () => !!LOCAL, hasPublic: () => !!PUB, local: () => LOCAL, pub: () => PUB,
    async importFile(file) { const p = validateLocal(JSON.parse(await file.text())); const ok = await kvPut('local', p); LOCAL = p; LOCAL._persisted = ok; emit(); return p; },
    async clear() { await kvDel('local'); LOCAL = null; emit(); },
    loadPublic() {
      return new Promise((ok) => {
        if (window.W8_PUBLIC_PACK) { PUB = window.W8_PUBLIC_PACK; return ok(true); }
        const sc = document.createElement('script'); sc.src = 'data/public/week08-public-pack.js'; sc.async = true;
        sc.onload = () => { PUB = window.W8_PUBLIC_PACK || null; emit(); ok(!!PUB); }; sc.onerror = () => ok(false); document.head.append(sc);
      });
    },
    async init() {
      const pub = this.loadPublic();
      const u = new URLSearchParams(location.search).get('pack');
      if (u) { try { const p = validateLocal(await (await fetch(u)).json()); LOCAL = p; LOCAL._persisted = await kvPut('local', p); } catch (e) { console.warn('材料包地址载入失败', e); } }
      if (!LOCAL) { const p = await kvGet('local'); if (p) { LOCAL = p; LOCAL._persisted = true; } }
      USER = (await kvGet('user')) || {};
      await pub; emit();
    },
  };

  /* 材料库：按编号取材料；来源依次为本机材料包、使用者导入、公开材料包（同号时前者优先）。 */
  const Mat = {
    all() { return { ...(PUB?.materials || {}), ...USER, ...(LOCAL?.materials || {}) }; },
    get(id) { return this.all()[id] || null; },
    list(kind) { return Object.values(this.all()).filter((m) => !kind || m.kind === kind); },
    origin(id) { return LOCAL?.materials?.[id] ? '本机材料包' : USER[id] ? '本浏览器导入' : PUB?.materials?.[id] ? '随课件公开' : '缺'; },
    async putUser(m) { USER = { ...USER, [m.id]: m }; const ok = await kvPut('user', USER); emit(); return ok; },
    async delUser(id) { const n = { ...USER }; delete n[id]; USER = n; await kvPut('user', USER); emit(); },
    user: () => USER,
    text(id) { return PUB?.texts?.[id] || LOCAL?.texts?.[id] || null; },
  };

  /* 导入提示：本页缺哪份材料、去哪里取。 */
  function gate(needs, what) {
    return `<div class="pack-gate"><p><b>本页用到${esc(what || '本机材料包中的材料')}，需课堂导入第八周本机材料包。</b>CBDB 记录、『梅颸日記』与 JBDB 查询结果按第七周的做法只在课堂现场导入，不随课件公开。</p>
      <p class="sub">本页用到：${esc(needs)}</p>
      <label class="pack-btn">选择第八周本机材料包（week08-pack.json）<input type="file" accept=".json,application/json" data-pack-file hidden></label>
      <p class="pack-err" hidden></p></div>`;
  }
  document.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-pack-file]')) return;
    const f = e.target.files[0]; if (!f) return; e.target.value = '';
    const err = e.target.closest('.pack-gate,.pack-bar,.import-panel')?.querySelector('.pack-err');
    try { await Pack.importFile(f); if (err) err.hidden = true; } catch (x) { if (err) { err.hidden = false; err.textContent = '导入失败：' + x.message + '（原有数据未改动）'; } }
  });
  const CBDB_CITE = 'China Biographical Database（中國歷代人物傳記資料庫，CBDB），CBDB BJ 20260602，CC BY-NC-SA 4.0';
  function packBar() {
    const top = document.querySelector('.deck-top'); if (!top || top.querySelector('.pack-bar')) return;
    const span = document.createElement('span'); span.className = 'pack-bar';
    const draw = () => {
      const n = Object.keys(USER).length;
      span.innerHTML = (LOCAL ? `<span class="pack-ok" title="${esc(CBDB_CITE)}">本机材料包已导入${LOCAL._persisted ? '' : '（未能写入浏览器存储，刷新后需重导）'}</span> <button class="small" data-pack-clear>移除</button>`
        : `<label class="pack-btn small">导入本机材料包<input type="file" accept=".json" data-pack-file hidden></label>`)
        + ` <button class="small" data-open-import>导入表格${n ? `（已有 ${n} 份）` : ''}</button>`;
    };
    draw(); document.addEventListener('w8-pack', draw);
    span.addEventListener('click', (e) => { if (e.target.matches('[data-pack-clear]')) Pack.clear(); if (e.target.matches('[data-open-import]')) Importer.open(); });
    top.insertBefore(span, top.querySelector('[data-act="presenter"]'));
  }

  /* ================= 材料说明卡（扩充部分乙〇的四栏＋身份） ================= */
  const NATURE_CLS = { '实际数据': 'n-real', '教学构造': 'n-built', '保存结果回放': 'n-replay' };
  function card(m, { compact = false } = {}) {
    if (!m) return '<p class="nil">材料缺</p>';
    const c = m.card || {};
    const four = [['单位', c.unit], ['一条边（一行）是什么', c.edge_meaning], ['缺在哪里', c.missing], ['时间精度', c.time_precision]];
    const nat = Object.keys(NATURE_CLS).find((k) => String(c.nature || '').startsWith(k)) || '';
    return `<div class="matcard ${compact ? 'compact' : ''}"><p class="matcard-title"><b>${esc(m.title)}</b> <span class="tag ${NATURE_CLS[nat] || ''}">${esc(c.nature || '性质未说明')}</span> <span class="tag">${esc(Mat.origin(m.id))}</span></p>
      <dl class="four">${four.map(([k, v]) => `<dt>${k}</dt><dd>${v ? esc(v) : '<span class="nil">未说明</span>'}</dd>`).join('')}</dl>
      ${compact ? '' : `<p class="sub">${[c.author, c.version, c.location, c.obtained].filter(Boolean).map(esc).join('｜')}${c.license ? '｜许可：' + esc(c.license) : ''}</p>`}</div>`;
  }

  /* ================= 随机数（可复现） ================= */
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ================= 网络 ================= */
  /* 由材料建图。opts.keep(edge) 过滤边；opts.directed 覆盖材料声明；opts.merge 是否把同一对人的多条记录合为一条（默认合并为无重边的简单图，条数记为 weight）。
   * 返回 { nodes: [{id,label,attrs}], edges: [{s,t,w,recs:[原始记录]}], directed, index }，原始记录保留以便回原文。 */
  function graph(m, opts = {}) {
    const directed = opts.directed ?? !!m.declare?.directed;
    const keep = opts.keep || (() => true);
    const label = new Map((m.nodes || []).map((n) => [String(n.id), n.label ?? String(n.id)]));
    const attrs = new Map((m.nodes || []).map((n) => [String(n.id), n.attrs || {}]));
    const recs = (m.edges || []).filter(keep).filter((e) => e.s != null && e.t != null && String(e.s) !== '' && String(e.t) !== '');
    const map = new Map(); const ids = new Set();
    for (const e of recs) {
      const s = String(e.s), t = String(e.t); if (s === t) continue;
      ids.add(s); ids.add(t);
      const k = directed ? s + '\u0001' + t : [s, t].sort().join('\u0001');
      if (!map.has(k)) map.set(k, { s, t, w: 0, recs: [] });
      const x = map.get(k); x.w++; x.recs.push(e);
    }
    if (opts.allNodes) for (const n of m.nodes || []) ids.add(String(n.id));
    const nodes = [...ids].map((id) => ({ id, label: label.get(id) ?? id, attrs: attrs.get(id) || {} }));
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    return { nodes, edges: [...map.values()], directed, index, records: recs.length };
  }
  function adjacency(g, undirected = !g.directed) {
    const n = g.nodes.length, out = Array.from({ length: n }, () => new Set()), inn = Array.from({ length: n }, () => new Set());
    for (const e of g.edges) { const a = g.index.get(e.s), b = g.index.get(e.t); out[a].add(b); inn[b].add(a); if (undirected) { out[b].add(a); inn[a].add(b); } }
    return { out, inn };
  }
  /* Brandes 算法（无权）。未作标准化；无向图每对点只计一次（与讲义 @fig-betw 口径相同）。 */
  function betweenness(g, undirected = !g.directed) {
    const n = g.nodes.length, { out } = adjacency(g, undirected), C = new Array(n).fill(0);
    for (let s = 0; s < n; s++) {
      const S = [], P = Array.from({ length: n }, () => []), sigma = new Array(n).fill(0), d = new Array(n).fill(-1);
      sigma[s] = 1; d[s] = 0; const Q = [s];
      for (let qi = 0; qi < Q.length; qi++) { const v = Q[qi]; S.push(v); for (const w of out[v]) { if (d[w] < 0) { Q.push(w); d[w] = d[v] + 1; } if (d[w] === d[v] + 1) { sigma[w] += sigma[v]; P[w].push(v); } } }
      const delta = new Array(n).fill(0);
      while (S.length) { const w = S.pop(); for (const v of P[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]); if (w !== s) C[w] += delta[w]; }
    }
    return undirected ? C.map((x) => x / 2) : C;
  }
  /* 最短路径逐对列出（进阶层），只用于小网。 */
  function allShortestPaths(g, s, t) {
    const { out } = adjacency(g, true), a = g.index.get(s), b = g.index.get(t), d = new Map([[a, 0]]), P = new Map([[a, []]]), Q = [a];
    for (let i = 0; i < Q.length; i++) { const v = Q[i]; for (const w of out[v]) { if (!d.has(w)) { d.set(w, d.get(v) + 1); P.set(w, []); Q.push(w); } if (d.get(w) === d.get(v) + 1) P.get(w).push(v); } }
    if (!d.has(b)) return [];
    const res = []; const walk = (v, path) => { if (v === a) { res.push([a, ...path].map((i) => g.nodes[i].id)); return; } for (const u of P.get(v)) walk(u, [v, ...path]); };
    walk(b, []); return res;
  }
  function clustering(g) {
    const { out } = adjacency(g, true);
    return out.map((nb) => { const k = nb.size; if (k < 2) return 0; const a = [...nb]; let e = 0; for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) if (out[a[i]].has(a[j])) e++; return (2 * e) / (k * (k - 1)); });
  }
  function components(g) {
    const { out } = adjacency(g, true), comp = new Array(g.nodes.length).fill(-1); let c = 0;
    for (let i = 0; i < comp.length; i++) { if (comp[i] >= 0) continue; const Q = [i]; comp[i] = c; for (let q = 0; q < Q.length; q++) for (const w of out[Q[q]]) if (comp[w] < 0) { comp[w] = c; Q.push(w); } c++; }
    const sizes = Array.from({ length: c }, (_, k) => comp.filter((x) => x === k).length).sort((a, b) => b - a);
    return { comp, count: c, sizes };
  }
  function pathStats(g) { // 平均最短路径与直径（在各连通分量内，按可达点对计算）
    const { out } = adjacency(g, true); let sum = 0, pairs = 0, diam = 0;
    if (g.nodes.length > 3000) return null;
    for (let s = 0; s < g.nodes.length; s++) { const d = new Map([[s, 0]]), Q = [s]; for (let i = 0; i < Q.length; i++) for (const w of out[Q[i]]) if (!d.has(w)) { d.set(w, d.get(Q[i]) + 1); Q.push(w); } for (const [v, x] of d) if (v > s) { sum += x; pairs++; diam = Math.max(diam, x); } }
    return { avg: pairs ? sum / pairs : 0, diameter: diam };
  }
  function stats(g) {
    const n = g.nodes.length, m = g.edges.length, { out, inn } = adjacency(g, true);
    const deg = out.map((s) => s.size), cc = clustering(g), comp = components(g);
    const dirOut = g.directed ? adjacency(g, false).out.map((s) => s.size) : null, dirIn = g.directed ? adjacency(g, false).inn.map((s) => s.size) : null;
    const dens = n > 1 ? (g.directed ? m / (n * (n - 1)) : (2 * m) / (n * (n - 1))) : 0;
    const hist = {}; deg.forEach((k) => { hist[k] = (hist[k] || 0) + 1; });
    return { n, m, deg, out: dirOut, in: dirIn, density: dens, avgDeg: n ? deg.reduce((a, b) => a + b, 0) / n : 0, cc, avgCC: n ? cc.reduce((a, b) => a + b, 0) / n : 0, comp, hist, inn };
  }
  /* 度保持重连（双边交换）：保持每个点的度，打乱“谁连谁”。只用于无向简单图。 */
  function rewire(g, seed, factor = 10) {
    const R = rng(seed), E = g.edges.map((e) => [g.index.get(e.s), g.index.get(e.t)]), has = new Set(E.map(([a, b]) => a < b ? a + ',' + b : b + ',' + a));
    const key = (a, b) => (a < b ? a + ',' + b : b + ',' + a); let swaps = 0;
    for (let k = 0; k < E.length * factor; k++) {
      const i = Math.floor(R() * E.length), j = Math.floor(R() * E.length); if (i === j) continue;
      let [a, b] = E[i], [c, d] = E[j]; if (R() < 0.5) [c, d] = [d, c];
      if (a === d || c === b || a === c || b === d || has.has(key(a, d)) || has.has(key(c, b))) continue;
      has.delete(key(a, b)); has.delete(key(c, d)); has.add(key(a, d)); has.add(key(c, b)); E[i] = [a, d]; E[j] = [c, b]; swaps++;
    }
    return { nodes: g.nodes, index: g.index, directed: false, edges: E.map(([a, b]) => ({ s: g.nodes[a].id, t: g.nodes[b].id, w: 1, recs: [] })), swaps };
  }
  /* 模块度 Q 与贪心的局部移动社群划分（Louvain 第一阶段，随机顺序；换种子可见边缘节点换群）。 */
  function modularity(g, part) {
    const { out } = adjacency(g, true), m = g.edges.length; if (!m) return 0; const deg = out.map((s) => s.size); let q = 0;
    for (let i = 0; i < out.length; i++) for (let j = 0; j < out.length; j++) if (part[i] === part[j]) q += (out[i].has(j) ? 1 : 0) - (deg[i] * deg[j]) / (2 * m);
    return q / (2 * m);
  }
  function communities(g, seed = 1) {
    const { out } = adjacency(g, true), n = out.length, m = g.edges.length, deg = out.map((s) => s.size), part = [...Array(n).keys()], tot = deg.slice(), R = rng(seed);
    if (!m) return part;
    let moved = true, rounds = 0;
    while (moved && rounds++ < 30) {
      moved = false; const order = [...Array(n).keys()].sort(() => R() - 0.5);
      for (const i of order) {
        const ci = part[i], links = new Map(); for (const j of out[i]) links.set(part[j], (links.get(part[j]) || 0) + 1);
        tot[ci] -= deg[i]; let best = ci, bestGain = (links.get(ci) || 0) - (tot[ci] * deg[i]) / (2 * m);
        for (const [c, l] of links) { const gain = l - (tot[c] * deg[i]) / (2 * m); if (gain > bestGain + 1e-12) { best = c; bestGain = gain; } }
        part[i] = best; tot[best] += deg[i]; if (best !== ci) moved = true;
      }
    }
    const ren = new Map(); return part.map((c) => { if (!ren.has(c)) ren.set(c, ren.size); return ren.get(c); });
  }

  /* ================= 布局与绘图 ================= */
  /* Fruchterman–Reingold 式力导向布局（浏览器内简化实现，非 Gephi 的 ForceAtlas2）；同一图、同一种子结果相同。 */
  function layout(g, { seed = 7, iter = 300, w = 600, h = 420, gravity = 0.05, repulse = 1, fixed = {} } = {}) {
    const n = g.nodes.length, R = rng(seed), P = g.nodes.map((nd) => fixed[nd.id] ? [...fixed[nd.id]] : [w / 2 + (R() - 0.5) * w * 0.8, h / 2 + (R() - 0.5) * h * 0.8]);
    if (n <= 1) return P.map(() => [w / 2, h / 2]);
    const k = Math.sqrt((w * h) / n) * 0.75 * repulse, E = g.edges.map((e) => [g.index.get(e.s), g.index.get(e.t)]);
    const big = n > 400; let t = w / 10;
    for (let it = 0; it < (big ? Math.min(iter, 80) : iter); it++) {
      const D = P.map(() => [0, 0]);
      if (!big) { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1]; const d2 = Math.max(dx * dx + dy * dy, 0.01), f = (k * k) / d2; dx *= f; dy *= f; D[i][0] += dx; D[i][1] += dy; D[j][0] -= dx; D[j][1] -= dy; } }
      else { for (let s = 0; s < n * 8; s++) { const i = Math.floor(R() * n), j = Math.floor(R() * n); if (i === j) continue; let dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1]; const d2 = Math.max(dx * dx + dy * dy, 0.01), f = (k * k * n) / (8 * d2); D[i][0] += dx * f; D[i][1] += dy * f; } }
      for (const [a, b] of E) { const dx = P[a][0] - P[b][0], dy = P[a][1] - P[b][1], d = Math.max(Math.hypot(dx, dy), 0.01), f = (d * d) / k / d; D[a][0] -= dx * f; D[a][1] -= dy * f; D[b][0] += dx * f; D[b][1] += dy * f; }
      for (let i = 0; i < n; i++) { if (fixed[g.nodes[i].id]) continue; D[i][0] += (w / 2 - P[i][0]) * gravity * k / 10; D[i][1] += (h / 2 - P[i][1]) * gravity * k / 10; const d = Math.max(Math.hypot(D[i][0], D[i][1]), 0.01), s = Math.min(d, t) / d; P[i][0] += D[i][0] * s; P[i][1] += D[i][1] * s; }
      t *= 0.985;
    }
    // 缩放到画布
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 24;
    return P.map(([x, y]) => [pad + ((x - x0) / Math.max(x1 - x0, 1)) * (w - 2 * pad), pad + ((y - y0) / Math.max(y1 - y0, 1)) * (h - 2 * pad)]);
  }
  const PALETTE = ['#164ec7', '#b06d00', '#2c6a3a', '#7b3fa0', '#a33', '#00838f', '#6d4c41', '#5d6b78'];
  /* ================= 可交互的网络图 =================
   * drawGraph 输出一个带工具栏的图框：拖动节点、滚轮缩放、拖空白处平移、点节点看指标（度、入度出度、介数、聚类系数、邻居）、
   * “指标表”列出全部节点的指标并可排序。拖动后的位置与选中的节点按图的键保存在本页内存中，页面重绘后保留。
   * 页面组件自己的点击处理（点边看出处、点两点加删边）照常生效；拖动时不触发点击。 */
  const NET = { reg: new Map(), pos: new Map(), view: new Map(), sel: new Map(), metrics: new Map(), labels: new Map(), table: new Map() };
  function gkey(g, extra = '') { let h = 2166136261; const s = g.nodes.length + '|' + g.edges.length + '|' + g.nodes.slice(0, 50).map((n) => n.id).join(',') + '|' + g.edges.slice(0, 200).map((e) => e.s + '>' + e.t).join(',') + extra; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return 'g' + (h >>> 0).toString(36); }
  function netMetrics(key) {
    if (NET.metrics.has(key)) return NET.metrics.get(key);
    const { g } = NET.reg.get(key), st = stats(g), m = { deg: st.deg, cc: st.cc, out: st.out, in: st.in, b: g.nodes.length <= 3000 ? betweenness(g) : null, recs: g.nodes.map(() => 0) };
    g.edges.forEach((e) => { m.recs[g.index.get(e.s)] += e.w; m.recs[g.index.get(e.t)] += e.w; });
    NET.metrics.set(key, m); return m;
  }
  const fx = (x) => (Number.isFinite(x) ? (x % 1 ? x.toFixed(2) : String(x)) : '—');
  function netInfo(key) {
    const R = NET.reg.get(key), id = NET.sel.get(key); if (!R || id == null) return '';
    const { g } = R, i = g.index.get(id); if (i == null) return '';
    const m = netMetrics(key), adj = adjacency(g, true).out[i], nb = [...adj].map((j) => g.nodes[j]);
    const inc = g.edges.filter((e) => e.s === id || e.t === id);
    const types = {}; inc.forEach((e) => e.recs.forEach((r) => { const t = r.type || '（无类型）'; types[t] = (types[t] || 0) + 1; }));
    return `<p class="ni-title"><b>${esc(g.nodes[i].label)}</b> <small>${esc(id)}</small> <button class="small" data-net="unsel">取消选择</button></p>
      <table class="steps compact"><tr><td>度（不同的邻居）</td><td>${m.deg[i]}</td></tr>${g.directed ? `<tr><td>出度／入度</td><td>${m.out[i]}／${m.in[i]}</td></tr>` : ''}<tr><td>记录条数（含重复）</td><td>${m.recs[i]}</td></tr>
      <tr><td>介数（未标准化）</td><td>${m.b ? fx(m.b[i]) + `（第 ${m.b.filter((x) => x > m.b[i]).length + 1} 名）` : '网络过大，未算'}</td></tr><tr><td>聚类系数</td><td>${fx(m.cc[i])}</td></tr></table>
      ${Object.keys(types).length ? `<p class="sub">关系类型：${Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => `${esc(t)} ${c}`).join('；')}</p>` : ''}
      <p class="sub">邻居（点名字切换）：${nb.slice(0, 40).map((n) => `<a href="#" data-net-sel="${esc(n.id)}">${esc(n.label)}</a>`).join('、')}${nb.length > 40 ? `……共 ${nb.length} 人` : ''}</p>`;
  }
  function netTable(key) {
    const R = NET.reg.get(key); if (!R) return ''; const { g } = R, m = netMetrics(key), sort = NET.table.get(key) || 'deg';
    const val = { deg: (i) => m.deg[i], b: (i) => (m.b ? m.b[i] : 0), cc: (i) => m.cc[i], recs: (i) => m.recs[i] };
    const order = g.nodes.map((n, i) => i).sort((a, b) => val[sort](b) - val[sort](a)).slice(0, 60);
    const th = (k, l) => `<th><a href="#" data-net-sort="${k}" class="${sort === k ? 'on' : ''}">${l}${sort === k ? ' ▼' : ''}</a></th>`;
    return `<table class="steps compact nettab"><tr><th>节点</th>${th('deg', '度')}${g.directed ? '<th>出／入</th>' : ''}${th('recs', '记录')}${th('b', '介数')}${th('cc', '聚类系数')}</tr>${order.map((i) => `<tr data-net-sel="${esc(g.nodes[i].id)}" class="${NET.sel.get(key) === g.nodes[i].id ? 'on' : ''}"><td>${esc(g.nodes[i].label)}</td><td>${m.deg[i]}</td>${g.directed ? `<td>${m.out[i]}／${m.in[i]}</td>` : ''}<td>${m.recs[i]}</td><td>${m.b ? fx(m.b[i]) : '—'}</td><td>${fx(m.cc[i])}</td></tr>`).join('')}</table>
      <p class="sub">共 ${g.nodes.length} 个节点、${g.edges.length} 条边（同一对人合为一条）；按所点的列排序，只列前 60 个。介数未标准化，无向图每对点计一次。</p>`;
  }
  function drawGraph(g, P, { w = 600, h = 420, size = null, color = null, hi = new Set(), hiEdges = new Set(), dim = null, labels = 'auto', arrows = g.directed, edgeColor = null, key = null } = {}) {
    const k = key || gkey(g, '|' + w + 'x' + h);
    const pos = NET.pos.get(k) || new Map(); NET.pos.set(k, pos);
    P = g.nodes.map((nd, i) => pos.get(nd.id) || P[i]);
    const n = g.nodes.length, labDefault = labels === 'all' || (labels === 'auto' && n <= 40), showLabel = NET.labels.has(k) ? NET.labels.get(k) : labDefault;
    NET.reg.set(k, { g, w, h, lab: labDefault });
    const r = (i) => (size ? size(i) : n > 300 ? 2.5 : n > 60 ? 4 : 9);
    const sel = NET.sel.get(k), si = sel != null ? g.index.get(sel) : null, nbs = si != null ? adjacency(g, true).out[si] : null;
    const lines = g.edges.map((e, j) => { const a = g.index.get(e.s), b = g.index.get(e.t); const on = hiEdges.has(j); const c = edgeColor ? edgeColor(e, j) : null; const incd = sel != null && (e.s === sel || e.t === sel);
      return `<line data-edge="${j}" data-s="${esc(e.s)}" data-t="${esc(e.t)}" x1="${P[a][0].toFixed(1)}" y1="${P[a][1].toFixed(1)}" x2="${P[b][0].toFixed(1)}" y2="${P[b][1].toFixed(1)}" class="${on ? 'on' : ''} ${dim && dim(e) ? 'dim' : ''} ${incd ? 'inc' : ''}" ${c ? `style="stroke:${c}"` : ''} stroke-width="${Math.min(1 + (e.w - 1) * 1.2, 5)}" ${arrows ? 'marker-end="url(#arr)"' : ''}><title>${esc(g.nodes[a].label)} → ${esc(g.nodes[b].label)}（${e.w} 条记录）</title></line>`; }).join('');
    const dots = g.nodes.map((nd, i) => { const cls = `nd ${hi.has(nd.id) ? 'on' : ''} ${sel === nd.id ? 'sel' : ''} ${nbs && nbs.has(i) ? 'nb' : ''}`;
      return `<g data-node="${esc(nd.id)}" class="${cls}"><circle cx="${P[i][0].toFixed(1)}" cy="${P[i][1].toFixed(1)}" r="${r(i)}" style="fill:${color ? color(i) : '#fff'}"><title>${esc(nd.label)}</title></circle><text x="${(P[i][0] + r(i) + 2).toFixed(1)}" y="${(P[i][1] + 4).toFixed(1)}" class="${showLabel || hi.has(nd.id) || sel === nd.id || (nbs && nbs.has(i)) ? '' : 'lbl-off'}">${esc(nd.label)}</text></g>`; }).join('');
    const vb = NET.view.get(k) || [0, 0, w, h];
    return `<div class="netwrap" data-gkey="${k}"><div class="nettools"><button class="small" data-net="in" title="放大">＋</button><button class="small" data-net="out" title="缩小">－</button><button class="small" data-net="reset" title="恢复原来的位置与大小">复位</button><button class="small ${showLabel ? 'on' : ''}" data-net="labels">标签</button><button class="small ${NET.table.has(k) ? 'on' : ''}" data-net="table">指标表</button><span class="nethint">拖动节点；滚轮缩放；拖空白处平移；点节点看度、介数等</span></div>
      <svg class="netsvg ${sel != null ? 'focus' : ''}" data-gkey="${k}" viewBox="${vb.map((x) => x.toFixed(1)).join(' ')}" role="img"><defs><marker id="arr" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#6d8494"/></marker></defs><g class="edges">${lines}</g><g class="nodes">${dots}</g></svg>
      <div class="netinfo" ${sel != null ? '' : 'hidden'}>${sel != null ? netInfo(k) : ''}</div><div class="nettable" ${NET.table.has(k) ? '' : 'hidden'}>${NET.table.has(k) ? netTable(k) : ''}</div></div>`;
  }
  /* 交互：只在 document 上挂一次。 */
  (function netEvents() {
    let drag = null, suppress = false;
    const svgPt = (svg, e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    const wrapOf = (el) => el.closest('.netwrap'), keyOf = (el) => wrapOf(el)?.dataset.gkey;
    const refresh = (wrap) => { const k = wrap.dataset.gkey, svg = wrap.querySelector('svg'), R = NET.reg.get(k); if (!R) return; const sel = NET.sel.get(k), si = sel != null ? R.g.index.get(sel) : null, nbs = si != null ? adjacency(R.g, true).out[si] : null;
      svg.classList.toggle('focus', sel != null);
      svg.querySelectorAll('g[data-node]').forEach((n) => { const i = R.g.index.get(n.dataset.node); n.classList.toggle('sel', n.dataset.node === sel); n.classList.toggle('nb', !!(nbs && nbs.has(i))); const t = n.querySelector('text'), L = NET.labels.has(k) ? NET.labels.get(k) : R.lab; if (t) t.classList.toggle('lbl-off', !(L || n.classList.contains('on') || n.dataset.node === sel || (nbs && nbs.has(i)))); });
      svg.querySelectorAll('line[data-s]').forEach((l) => l.classList.toggle('inc', sel != null && (l.dataset.s === sel || l.dataset.t === sel)));
      const info = wrap.querySelector('.netinfo'); info.hidden = sel == null; info.innerHTML = sel != null ? netInfo(k) : '';
      const tb = wrap.querySelector('.nettable'); if (!tb.hidden) tb.innerHTML = netTable(k); };
    const setView = (wrap, vb) => { NET.view.set(wrap.dataset.gkey, vb); wrap.querySelector('svg').setAttribute('viewBox', vb.map((x) => x.toFixed(1)).join(' ')); };
    const zoom = (wrap, f, cx, cy) => { const k = wrap.dataset.gkey, R = NET.reg.get(k), vb = NET.view.get(k) || [0, 0, R.w, R.h]; const nw = Math.min(R.w * 4, Math.max(R.w / 12, vb[2] * f)), nh = nw * (vb[3] / vb[2]); cx ??= vb[0] + vb[2] / 2; cy ??= vb[1] + vb[3] / 2; setView(wrap, [cx - (cx - vb[0]) * (nw / vb[2]), cy - (cy - vb[1]) * (nh / vb[3]), nw, nh]); };
    document.addEventListener('pointerdown', (e) => {
      const svg = e.target.closest?.('svg.netsvg[data-gkey]'); if (!svg || e.button !== 0) return;
      const nd = e.target.closest('g[data-node]'), p = svgPt(svg, e);
      drag = { svg, wrap: wrapOf(svg), node: nd?.dataset.node ?? null, x0: e.clientX, y0: e.clientY, p0: p, moved: false, vb: [...(NET.view.get(svg.dataset.gkey) || svg.getAttribute('viewBox').split(/\s+/).map(Number))] };
    });
    document.addEventListener('pointermove', (e) => {
      if (!drag) return; if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) return;
      drag.moved = true; const k = drag.svg.dataset.gkey, p = svgPt(drag.svg, e);
      if (drag.node != null) {
        const nd = [...drag.svg.querySelectorAll('g[data-node]')].find((x) => x.dataset.node === drag.node); if (!nd) return;
        const c = nd.querySelector('circle'), t = nd.querySelector('text'), r = Number(c.getAttribute('r'));
        c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); if (t) { t.setAttribute('x', p.x + r + 2); t.setAttribute('y', p.y + 4); }
        drag.svg.querySelectorAll('line[data-s]').forEach((l) => { if (l.dataset.s === drag.node) { l.setAttribute('x1', p.x); l.setAttribute('y1', p.y); } if (l.dataset.t === drag.node) { l.setAttribute('x2', p.x); l.setAttribute('y2', p.y); } });
        NET.pos.get(k)?.set(drag.node, [p.x, p.y]);
      } else { const dx = (e.clientX - drag.x0) * (drag.vb[2] / drag.svg.clientWidth), dy = (e.clientY - drag.y0) * (drag.vb[3] / drag.svg.clientHeight); setView(drag.wrap, [drag.vb[0] - dx, drag.vb[1] - dy, drag.vb[2], drag.vb[3]]); }
    });
    document.addEventListener('pointerup', () => {
      if (!drag) return; const d = drag; drag = null;
      if (d.moved) { suppress = true; setTimeout(() => { suppress = false; }, 0); return; }
      if (d.node != null) { const k = d.svg.dataset.gkey; NET.sel.set(k, NET.sel.get(k) === d.node ? null : d.node); if (NET.sel.get(k) == null) NET.sel.delete(k); refresh(d.wrap); }
    });
    document.addEventListener('click', (e) => { if (suppress && e.target.closest?.('svg.netsvg')) { e.stopPropagation(); e.preventDefault(); } }, true);
    document.addEventListener('wheel', (e) => { const svg = e.target.closest?.('svg.netsvg[data-gkey]'); if (!svg) return; e.preventDefault(); const p = svgPt(svg, e); zoom(wrapOf(svg), e.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y); }, { passive: false });
    document.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-net],[data-net-sel],[data-net-sort]'); if (!b || !wrapOf(b)) return; e.preventDefault();
      const wrap = wrapOf(b), k = wrap.dataset.gkey, R = NET.reg.get(k);
      if (b.dataset.netSel != null) { NET.sel.set(k, b.dataset.netSel); refresh(wrap); return; }
      if (b.dataset.netSort) { NET.table.set(k, b.dataset.netSort); refresh(wrap); return; }
      const a = b.dataset.net;
      if (a === 'in') zoom(wrap, 1 / 1.3); if (a === 'out') zoom(wrap, 1.3);
      if (a === 'reset') { NET.view.delete(k); NET.pos.set(k, new Map()); NET.sel.delete(k); const host = wrap.closest('[data-needs-pack]'); if (host?.render) host.render(); else setView(wrap, [0, 0, R.w, R.h]); }
      if (a === 'unsel') { NET.sel.delete(k); refresh(wrap); }
      if (a === 'labels') { const cur = NET.labels.has(k) ? NET.labels.get(k) : R.lab; NET.labels.set(k, !cur); b.classList.toggle('on', !cur); refresh(wrap); }
      if (a === 'table') { const tb = wrap.querySelector('.nettable'); if (NET.table.has(k)) { NET.table.delete(k); tb.hidden = true; b.classList.remove('on'); } else { NET.table.set(k, 'deg'); tb.hidden = false; tb.innerHTML = netTable(k); b.classList.add('on'); } }
    });
  })();
  /* 条形图（HTML） */
  function bars(rows, { max = null, fmt = (v) => v, cls = '' } = {}) {
    const M = max ?? Math.max(1, ...rows.map((r) => r[1]));
    return `<table class="hbars ${cls}">${rows.map(([k, v, note, on]) => `<tr class="${on ? 'on' : ''}"><td class="k">${esc(k)}</td><td class="v">${fmt(v)}</td><td class="b"><span style="width:${((v / M) * 100).toFixed(1)}%"></span></td>${note != null ? `<td class="n">${note}</td>` : ''}</tr>`).join('')}</table>`;
  }

  /* ================= 相似度 ================= */
  const chars = (s) => [...String(s).replace(/[\s，。、；：！？「」『』（）()《》,.;:!?]/g, '')];
  function grams(s, n) { const c = chars(s); if (c.length < n) return new Set(c.length ? [c.join('')] : []); const out = new Set(); for (let i = 0; i + n <= c.length; i++) out.add(c.slice(i, i + n).join('')); return out; }
  function jaccard(a, b, n = 1) { const A = grams(a, n), B = grams(b, n); const inter = [...A].filter((x) => B.has(x)).length, uni = new Set([...A, ...B]).size; return { inter, uni, j: uni ? inter / uni : 0, shared: [...A].filter((x) => B.has(x)) }; }
  /* 编辑距离（Levenshtein）及动态规划表、对齐操作。 */
  function levenshtein(a, b) {
    const A = chars(a), B = chars(b), D = Array.from({ length: A.length + 1 }, (_, i) => Array.from({ length: B.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    for (let i = 1; i <= A.length; i++) for (let j = 1; j <= B.length; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    const ops = []; let i = A.length, j = B.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) { ops.unshift(A[i - 1] === B[j - 1] ? ['=', A[i - 1], B[j - 1]] : ['~', A[i - 1], B[j - 1]]); i--; j--; }
      else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { ops.unshift(['-', A[i - 1], '']); i--; } else { ops.unshift(['+', '', B[j - 1]]); j--; }
    }
    const d = D[A.length][B.length], L = Math.max(A.length, B.length);
    return { d, A, B, D, ops, sim: L ? 1 - d / L : 1 };
  }
  /* 最长公共子序列比：2×LCS／两句总字数。等于 python-Levenshtein 的 ratio()（插入删除各计 1、替换计 2 的距离归一）。 */
  function lcsRatio(a, b) { const A = chars(a), B = chars(b), D = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0)); for (let i = 1; i <= A.length; i++) for (let j = 1; j <= B.length; j++) D[i][j] = A[i - 1] === B[j - 1] ? D[i - 1][j - 1] + 1 : Math.max(D[i - 1][j], D[i][j - 1]); const T = A.length + B.length; return { lcs: D[A.length][B.length], total: T, r: T ? (2 * D[A.length][B.length]) / T : 1 }; }
  const cosine = (u, v) => { let s = 0, a = 0, b = 0; for (let i = 0; i < u.length; i++) { s += u[i] * v[i]; a += u[i] * u[i]; b += v[i] * v[i]; } return a && b ? s / Math.sqrt(a * b) : 0; };

  /* ================= 回原文：在本地《華陽集》卷次中找篇题 ================= */
  const VARIANT = [['巻', '卷'], ['誌', '志'], ['銘', '铭'], ['吕', '呂'], ['夘', '卯'], ['逺', '遠']];
  const norm = (s) => VARIANT.reduce((x, [a, b]) => x.split(a).join(b), String(s || ''));
  function findInHuayangji(ref) {
    const hy = Mat.text('huayangji'); if (!hy || !ref) return [];
    const head = String(ref).split(/\s*\/\s*/)[0].replace(/[《》“”"「」]/g, '').trim();
    if (!head || head === '[n/a]' || head.length < 3) return [];
    const key = norm(head).replace(/\(.*?\)|（.*?）/g, ''); const hits = [];
    for (const [juan, v] of Object.entries(hy.juan)) v.lines.forEach((l, i) => { if (norm(l).includes(key)) hits.push({ juan: Number(juan), line: i, text: l }); });
    return hits.slice(0, 5);
  }
  /* 讲义口径的“纪念文字”关系类型（导入 @fig-wanggui-types 的 73 条）。 */
  const MEMORIAL = ['為Y作墓誌銘', '為Y作神道碑', '為Y作祭文', '祭文由Y所作', '挽詩、詞由Y所作', '為Y作諡議', '為Y之神道碑作書', '神道碑由Y所作'];
  const LECTURE_GROUPS = [ // 讲义 @fig-wanggui-types 的合并口径
    ['為Y作墓誌銘', ['為Y作墓誌銘']], ['為Y作神道碑', ['為Y作神道碑']],
    ['祭文、挽詩、諡議、神道碑書丹等其他纪念文字', ['為Y作祭文', '祭文由Y所作', '挽詩、詞由Y所作', '為Y作諡議', '為Y之神道碑作書', '神道碑由Y所作']],
    ['推薦／被推薦', ['推薦', '被Y推薦']], ['書跋由Y所作', ['書跋由Y所作']],
    ['臨別贈言、書信往來', ['為Y作臨別贈言(送別詩、序)', '臨別得到Y所作贈言(送別詩、序)', '被致書由Y', '收到Y的啓']],
    ['彈劾、反對、陷害、上奏論列', ['被Y彈劾', '遭到Y的反對/攻訐', '陷害Y', '上奏論Y']], ['同僚、詩社', ['同僚', '詩社成員']],
  ];

  /* ================= 表格读入与通用导入（通用导入页的表格部分） ================= */
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
    const head = rows.shift().map((h) => h.trim());
    return { head, rows, sep: sep === '\t' ? 'TSV' : 'CSV' };
  }
  function parseAny(text, name = '') {
    const t = text.trim();
    if (/\.json$/i.test(name) || t.startsWith('[') || t.startsWith('{')) {
      const j = JSON.parse(t); if (j.format === 'w08-materials/v1') return { pack: j };
      const arr = Array.isArray(j) ? j : j.rows || j.edges || j.data; if (!Array.isArray(arr) || !arr.length) throw new Error('JSON 中没有找到行数组');
      const head = [...new Set(arr.flatMap((r) => Object.keys(r)))]; return { head, rows: arr.map((r) => head.map((h) => r[h] == null ? '' : String(r[h]))), sep: 'JSON' };
    }
    return parseDelimited(text);
  }
  /* 各类型的字段：[字段, 说明, 必需, 同义列名] */
  const KINDS = {
    network: { label: '网络（边表）', fields: [['s', '起点', true, ['source', 'source_id', 'from', 'ego', 'c_personid_ego', '起点', 'Source']], ['t', '终点', true, ['target', 'target_id', 'to', 'alter', 'c_personid_target', '终点', 'Target']],
      ['s_label', '起点名称', false, ['source_name', 'source', '起点名']], ['t_label', '终点名称', false, ['target_name', 'target', '终点名']], ['type', '关系类型', false, ['type', 'assoc_name', 'relation', '类型', '关系类型', 'Type']],
      ['time_raw', '时间（原值）', false, ['year', 'time', 'date', '年份', '时间']], ['ref', '出处', false, ['source_ref', 'text_title', 'ref', 'citation', '出处']], ['weight', '权重', false, ['weight', 'w', '权重']]] },
    events: { label: '事件表（日记等）', fields: [['date_raw', '日期（原值）', true, ['date_raw', 'date', '和暦', '日期']], ['persons', '人物（分隔符见声明）', true, ['persons', '人物', 'people']], ['event', '事件或原文', true, ['event', 'text', '錄文', '原文']], ['ref', '出处与页码', false, ['source_ref', 'page', '全書頁', '出处']]] },
    text: { label: '文本集合', fields: [['id', '编号', true, ['id', '编号']], ['text', '正文', true, ['text', '正文', 'content']], ['title', '题名', false, ['title', '题名']], ['genre', '文体', false, ['genre', '文体']], ['ref', '出处', false, ['source_ref', 'ref', '出处']]] },
    pairs: { label: '句对表', fields: [['id', '编号', false, ['id']], ['a', '句甲', true, ['text_a', 'a', '句甲']], ['b', '句乙', true, ['text_b', 'b', '句乙']], ['model', '模型分数', false, ['model_score', 'score']], ['label', '人工判断', false, ['label', '判断']]] },
    points: { label: '地名或点表', fields: [['name', '地名', true, ['name', '地名', 'place']], ['lat', '纬度', false, ['lat', 'latitude', 'y', '纬度']], ['lng', '经度', false, ['lng', 'lon', 'longitude', 'x', '经度']], ['ref', '出处', false, ['source_ref', 'ref', '出处']]] },
    series: { label: '时间序列', fields: [['series_id', '序列', true, ['series_id', 'series']], ['time_raw', '时间（原值）', true, ['time', 'time_raw', 'date']], ['value', '数值', true, ['value', '数值']], ['ref', '出处', false, ['source_ref', 'ref']]] },
    uvt: { label: '单位×时间×变量', fields: [['unit', '单位', true, ['unit']], ['time_raw', '时间', true, ['time']], ['variable', '变量', true, ['variable']], ['value', '值', true, ['value']], ['status', '状态', false, ['status']]] },
  };
  function guessKind(head) { const h = head.map((x) => x.toLowerCase()); if (h.some((x) => ['source', 'source_id', 'from', 'ego', 'c_personid_ego', '起点'].includes(x))) return 'network'; if (h.includes('text_a')) return 'pairs'; if (h.some((x) => ['lat', 'latitude', '纬度'].includes(x))) return 'points'; if (h.includes('series_id')) return 'series'; if (h.includes('variable')) return 'uvt'; if (h.some((x) => ['persons', '人物'].includes(x))) return 'events'; return 'text'; }
  function guessMap(kind, head) { const map = {}; const used = new Set(); for (const [f, , , syn] of KINDS[kind].fields) { const c = head.find((h) => !used.has(h) && syn.some((s) => s.toLowerCase() === h.toLowerCase())); if (c) { map[f] = c; if (!['s_label', 't_label'].includes(f)) used.add(c); } } return map; }
  /* 依映射与声明生成材料，并给出检查报告；不静默丢行。 */
  function buildMaterial(parsed, kind, map, decl, cardIn) {
    const col = (h) => parsed.head.indexOf(h), get = (r, f) => (map[f] && col(map[f]) >= 0 ? String(r[col(map[f])] ?? '').trim() : '');
    const report = { read: parsed.rows.length, ok: 0, skipped: [], suspect: [], noRef: 0 };
    const missing = (decl.missing || '').split(/[,，\s]+/).filter(Boolean), suspect = (decl.suspect || '').split(/[,，\s]+/).filter(Boolean);
    const m = { id: 'user-' + Date.now().toString(36), kind, title: cardIn.title || '我的材料', card: { ...cardIn, nature: cardIn.nature || '实际数据', visibility: '本浏览器' },
      declare: { directed: !!decl.directed, missing_time: missing, suspect_time: suspect, calendar: decl.calendar || '', crs: decl.crs || '', sep: decl.sep || '；' }, mapping: map };
    for (const [f, , req] of KINDS[kind].fields) if (req && !map[f]) throw new Error(`必需字段“${f}”没有对应的列`);
    if (kind === 'network') {
      const labels = new Map(); m.edges = [];
      parsed.rows.forEach((r, i) => {
        const s = get(r, 's'), t = get(r, 't'); if (!s || !t) { report.skipped.push([i + 2, '缺起点或终点']); return; }
        if (s === t) report.suspect.push([i + 2, '自环（起点与终点相同）']);
        if (get(r, 's_label')) labels.set(s, get(r, 's_label')); if (get(r, 't_label')) labels.set(t, get(r, 't_label'));
        const raw = get(r, 'time_raw'), num = Number(raw), e = { s, t, row: i + 2, time_raw: raw };
        if (raw !== '' && !missing.includes(raw) && Number.isFinite(num)) e.time = num;
        for (const f of ['type', 'ref']) if (get(r, f)) e[f] = get(r, f);
        if (get(r, 'weight')) e.weight = Number(get(r, 'weight'));
        if (!e.ref) report.noRef++; m.edges.push(e); report.ok++;
      });
      const seen = new Map(); m.edges.forEach((e) => { const k = [e.s, e.t].sort().join('|'); seen.set(k, (seen.get(k) || 0) + 1); });
      const dup = [...seen.values()].filter((x) => x > 1).length; if (dup) report.suspect.push(['—', `${dup} 对人之间有多条记录（未合并，见 D08 查重）`]);
      m.nodes = [...new Set(m.edges.flatMap((e) => [e.s, e.t]))].map((id) => ({ id, label: labels.get(id) || id }));
    } else if (kind === 'events') {
      m.passages = parsed.rows.map((r, i) => { const p = { id: 'R' + (i + 2), wareki: get(r, 'date_raw'), text: get(r, 'event'), persons: get(r, 'persons').split(decl.sep || '；').map((x) => x.trim()).filter(Boolean), page: get(r, 'ref') }; if (!p.page) report.noRef++; report.ok++; return p; });
    } else {
      m.rows = parsed.rows.map((r, i) => { const o = { row: i + 2 }; for (const [f] of KINDS[kind].fields) if (map[f]) o[f] = get(r, f); if (!o.ref) report.noRef++; report.ok++; return o; });
      if (kind === 'points') m.rows.forEach((o) => { const la = Number(o.lat), ln = Number(o.lng); if (o.lat && (Math.abs(la) > 90 || Math.abs(ln) > 180)) report.suspect.push([o.row, '坐标越界']); else if (o.lat && la > 60 && ln < 60) report.suspect.push([o.row, '疑似经纬度颠倒']); });
    }
    m.report = report; return m;
  }

  const Importer = {
    open(prefKind) {
      if (document.querySelector('.model-shade.importer')) return;
      const shade = document.createElement('div'); shade.className = 'model-shade importer';
      const st = { parsed: null, name: '', kind: prefKind || 'network', map: {}, decl: { directed: true, missing: '', suspect: '', calendar: '', crs: '', sep: '；' }, card: { title: '' }, msg: '', built: null };
      const draw = () => {
        const P = st.parsed, fields = KINDS[st.kind].fields;
        shade.innerHTML = `<div class="model-panel import-panel" role="dialog" aria-label="表格导入"><button class="close" data-x="close">关闭 ×</button>
          <h2>表格导入（通用导入页·表格部分）</h2>
          <p class="sub">读入完全在本浏览器内完成，不联网。文献、PDF、图像请用课程的 <a href="importer/index.html" target="_blank" rel="noopener">通用导入页</a>。已导入的表格只存在本浏览器。</p>
          <fieldset><legend>1 选文件或粘贴</legend><input type="file" accept=".csv,.tsv,.txt,.json" data-imp="file"> <textarea data-imp="paste" rows="3" placeholder="也可以从表格软件直接复制粘贴到这里，再点“读入粘贴内容”">${''}</textarea><button class="small" data-x="paste">读入粘贴内容</button>
            ${P ? `<p class="ok-line">读入 ${esc(st.name)}：${P.sep}，${P.head.length} 列、${P.rows.length} 行。列名：${P.head.map(esc).join('、')}</p>` : ''}</fieldset>
          ${P ? `<fieldset><legend>2 材料类型（按表头猜为“${KINDS[guessKind(P.head)].label}”，可改）</legend>${Object.entries(KINDS).map(([k, v]) => `<label class="check-row"><input type="radio" name="kind" value="${k}" ${st.kind === k ? 'checked' : ''} data-imp="kind">${v.label}</label>`).join('')}</fieldset>
          <fieldset><legend>3 表头映射（未映射的列保留为属性）</legend><table class="steps">${fields.map(([f, l, req]) => `<tr><td>${esc(l)}${req ? ' <b class="nil">*</b>' : ''}</td><td><select data-map="${f}"><option value="">（无）</option>${P.head.map((h) => `<option ${st.map[f] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></td><td class="sub">${P.rows[0] && st.map[f] ? '第 2 行：' + esc(P.rows[0][P.head.indexOf(st.map[f])] ?? '') : ''}</td></tr>`).join('')}</table></fieldset>
          <fieldset><legend>4 声明</legend>
            ${st.kind === 'network' ? `<label class="check-row"><input type="checkbox" data-decl="directed" ${st.decl.directed ? 'checked' : ''}>有向（推荐、弹劾、为某人作墓志等有施有受）</label>` : ''}
            ${['network', 'series', 'events'].includes(st.kind) ? `<label>缺省时间的写法（逗号分隔，如 0,-1,-9999；这些值的时间为空，原值保留）<input data-decl="missing" value="${esc(st.decl.missing)}"></label>
            <label>可疑值（如事主卒年；页面据此加提示，不改数据）<input data-decl="suspect" value="${esc(st.decl.suspect)}"></label>
            <label>历法<select data-decl="calendar">${['', '公历', '和暦', '农历', '年号文本（不换算）'].map((x) => `<option ${st.decl.calendar === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}
            ${st.kind === 'points' ? `<label>坐标参照系<select data-decl="crs">${['', 'WGS-84', 'GCJ-02', 'BD-09', '未知'].map((x) => `<option ${st.decl.crs === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : ''}
            ${st.kind === 'events' ? `<label>人物一栏的分隔符<input data-decl="sep" value="${esc(st.decl.sep)}"></label>` : ''}</fieldset>
          <fieldset><legend>5 材料说明（四栏照扩充部分乙〇；可留空，留空的在对照页上显示“未说明”）</legend>
            ${[['title', '题名'], ['unit', '单位（一个节点或一行是什么）'], ['edge_meaning', '一条边（一行）是什么意思'], ['missing', '缺在哪里'], ['time_precision', '时间精度'], ['author', '作者或编者'], ['version', '版本与位置'], ['obtained', '取得方式与日期']].map(([k, l]) => `<label>${l}<input data-card="${k}" value="${esc(st.card[k] || '')}"></label>`).join('')}
            <label>性质<select data-card="nature">${['实际数据', '教学构造', '保存结果回放'].map((x) => `<option ${st.card.nature === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></fieldset>
          <p><button data-x="check">检查</button> ${st.built ? `<button data-x="save">确认导入</button>` : ''}</p>
          ${st.built ? `<div class="report"><p><b>检查报告</b>：读入 ${st.built.report.read} 行，可用 ${st.built.report.ok} 行；跳过 ${st.built.report.skipped.length} 行；可疑 ${st.built.report.suspect.length} 项；无出处 ${st.built.report.noRef} 行。</p>
            ${st.built.report.skipped.length ? `<details><summary>跳过的行</summary><ul>${st.built.report.skipped.map(([r, w]) => `<li>第 ${r} 行：${esc(w)}</li>`).join('')}</ul></details>` : ''}
            ${st.built.report.suspect.length ? `<details open><summary>可疑</summary><ul>${st.built.report.suspect.slice(0, 50).map(([r, w]) => `<li>第 ${r} 行：${esc(w)}</li>`).join('')}</ul></details>` : ''}</div>` : ''}` : ''}
          <p class="pack-err" ${st.msg ? '' : 'hidden'}>${esc(st.msg)}</p>
          ${Object.keys(USER).length ? `<h3>本浏览器中已导入的表格</h3><ul>${Object.values(USER).map((m) => `<li>${esc(m.title)}（${esc(KINDS[m.kind]?.label || m.kind)}）　<button class="small" data-del="${esc(m.id)}">删除</button></li>`).join('')}</ul><button class="small" data-x="export">导出全部为材料包（JSON）</button>` : ''}
          <p class="sub">也可导入此前导出的材料包（JSON）：选文件即可，先验证，失败不改动现有材料。</p></div>`;
      };
      const read = (text, name) => {
        try { const r = parseAny(text, name); if (r.pack) { (async () => { for (const m of r.pack.materials || []) { if (!m.id || !KINDS[m.kind]) throw new Error('材料包中有无法识别的材料'); } for (const m of r.pack.materials) await Mat.putUser(m); st.msg = `已导入材料包中的 ${r.pack.materials.length} 份材料`; draw(); })().catch((e) => { st.msg = '材料包导入失败，现有材料未改动：' + e.message; draw(); }); return; }
          st.parsed = r; st.name = name || '粘贴内容'; st.kind = prefKind || guessKind(r.head); st.map = guessMap(st.kind, r.head); st.card.title = st.card.title || name.replace(/\.[^.]+$/, ''); st.built = null; st.msg = ''; } catch (e) { st.msg = '读入失败：' + e.message; }
        draw();
      };
      shade.addEventListener('change', async (e) => {
        const t = e.target;
        if (t.dataset.imp === 'file' && t.files[0]) { read(await t.files[0].text(), t.files[0].name); return; }
        if (t.dataset.imp === 'kind') { st.kind = t.value; st.map = guessMap(st.kind, st.parsed.head); st.built = null; draw(); return; }
        if (t.dataset.map) { st.map[t.dataset.map] = t.value || undefined; st.built = null; draw(); return; }
        if (t.dataset.decl) { st.decl[t.dataset.decl] = t.type === 'checkbox' ? t.checked : t.value; st.built = null; return; }
        if (t.dataset.card) { st.card[t.dataset.card] = t.value; return; }
      });
      shade.addEventListener('click', async (e) => {
        const x = e.target.dataset.x, del = e.target.dataset.del;
        if (e.target === shade || x === 'close') { shade.remove(); return; }
        if (x === 'paste') read(shade.querySelector('[data-imp="paste"]').value, '粘贴内容');
        if (x === 'check') { try { st.built = buildMaterial(st.parsed, st.kind, st.map, st.decl, st.card); st.msg = ''; } catch (err) { st.built = null; st.msg = err.message; } draw(); }
        if (x === 'save' && st.built) { const ok = await Mat.putUser(st.built); st.msg = ok ? `已导入“${st.built.title}”，可在各页的材料下拉框中选用。` : '已导入，但浏览器不允许存储，刷新后需重导。'; st.parsed = null; st.built = null; draw(); }
        if (x === 'export') download('第八周材料包_本浏览器导入.json', JSON.stringify({ format: 'w08-materials/v1', exported: new Date().toISOString(), materials: Object.values(USER) }, null, 1), 'application/json');
        if (del) { await Mat.delUser(del); draw(); }
      });
      draw(); document.body.append(shade);
    },
  };

  /* 材料下拉框：列出某一类材料，并附“导入表格”小按钮（材料栏一行）。 */
  function matSelect(kind, cur, key = 'mat', { filter = null, extra = [] } = {}) {
    const list = Mat.list(kind).filter((m) => !filter || filter(m));
    return `<span class="matbar"><label>材料 <select data-k="${key}">${extra.map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}${list.map((m) => `<option value="${esc(m.id)}" ${cur === m.id ? 'selected' : ''}>${esc(m.title)}</option>`).join('')}</select></label>
      <button class="small" data-open-import="${kind}" title="导入自己的表格">导入表格</button></span>`;
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('button[data-open-import]'); if (b && !b.closest('.pack-bar')) Importer.open(b.dataset.openImport || undefined); });

  window.W8 = { Pack, Mat, gate, card, rng, graph, adjacency, betweenness, allShortestPaths, clustering, components, pathStats, stats, rewire, modularity, communities,
    layout, drawGraph, bars, PALETTE, NET, netMetrics, grams, jaccard, levenshtein, lcsRatio, cosine, chars, findInHuayangji, MEMORIAL, LECTURE_GROUPS, parseAny, buildMaterial, guessKind, guessMap, KINDS, Importer, matSelect, CBDB_CITE, kvGet, kvPut };
  window.addEventListener('DOMContentLoaded', () => { Pack.init(); setTimeout(packBar, 0); });
})();
