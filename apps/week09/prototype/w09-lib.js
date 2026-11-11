/* 第九周演示的计算模块｜候选，未经教师确认｜Claude（lesson-agent），2026-11-11
 * 纯函数，不碰 DOM：浏览器里挂在 window.W9Lib，Node 测试用 require 取用（tests/lib.test.mjs）。
 * 讲解页与贯穿页共用同一份算法（history-demo-courseware 第 4 条）。 */
(function (root) {
  'use strict';

  /* ---------------- 日期：只比较公元值，原文纪年另存，不在这里换算 ---------------- */
  // "1903"、"1903-12"、"1885-03-16" → {y,m,d}；无法解析返回 null
  function parseDate(s) {
    const m = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(String(s ?? '').trim());
    if (!m) return null;
    return { y: +m[1], m: m[2] ? +m[2] : null, d: m[3] ? +m[3] : null };
  }
  // 以时点的精度比较：时点只给到年，就只比年。返回 -1 早于、0 同一时段、1 晚于
  function cmpToTimepoint(date, tp) {
    const a = parseDate(date), b = parseDate(tp);
    if (!a || !b) return null;
    if (a.y !== b.y) return a.y < b.y ? -1 : 1;
    if (b.m == null || a.m == null) return 0;
    if (a.m !== b.m) return a.m < b.m ? -1 : 1;
    if (b.d == null || a.d == null) return 0;
    return a.d === b.d ? 0 : (a.d < b.d ? -1 : 1);
  }

  /* ---------------- source-gate：发出请求前的史料校验（D09） ----------------
   * entries：史料包条目；ids：卡上选用的条目 id（缺省为全部）；timepoint：模拟时点（公元）
   * 规则：sendable=false → blocked（不拼进提示）；layer=3 或成文时间晚于时点 → late；
   *       成文起点不晚、终点晚于时点 → boundary；成文时间缺失 → unknown。
   * late、boundary、unknown 默认不进提示，须在 confirm 中逐条确认才保留（方案第五节第 2 条）。 */
  function sourceGate(entries, timepoint, ids, confirm) {
    const pick = ids ? ids.map((id) => entries.find((e) => e.id === id) || { id, missing: true }) : entries.slice();
    const ok = new Set(confirm || []);
    const out = { timepoint, blocked: [], late: [], boundary: [], unknown: [], missing: [], prompt_sources: [], confirmed_late: [] };
    for (const e of pick) {
      if (e.missing) { out.missing.push(e.id); continue; }
      if (e.sendable === false) { out.blocked.push(e.id); continue; }
      const c0 = cmpToTimepoint(e.written_date, timepoint);
      const c1 = e.written_date_end ? cmpToTimepoint(e.written_date_end, timepoint) : c0;
      let flag = null;
      if (c0 == null) flag = 'unknown';
      else if (e.layer === 3 || c0 > 0) flag = 'late';
      else if (c1 > 0) flag = 'boundary';
      if (flag) {
        out[flag].push(e.id);
        if (ok.has(e.id)) { out.confirmed_late.push(e.id); out.prompt_sources.push(e.id); }
      } else out.prompt_sources.push(e.id);
    }
    out.ok = !out.blocked.length && !out.late.length && !out.boundary.length && !out.unknown.length && !out.missing.length;
    return out;
  }

  /* ---------------- 拆句（D05、D08）：中文、日文句末标点与换行 ---------------- */
  function splitSentences(text) {
    const s = String(text ?? '').replace(/\r/g, '');
    const out = []; let cur = '';
    const END = '。！？!?；;', CLOSE = '」』”’）)】〉》"\'';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\n') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
      cur += c;
      if (END.includes(c)) {
        while (i + 1 < s.length && CLOSE.includes(s[i + 1])) cur += s[++i];
        if (cur.trim()) out.push(cur.trim()); cur = '';
      }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  /* ---------------- 越界率（甲一）：L = (1/N)·Σ l_j / 2 ---------------- */
  function timepointScore(labels) {
    const scored = labels.filter((x) => x.score === 0 || x.score === 1 || x.score === 2);
    const N = scored.length, sum = scored.reduce((a, x) => a + x.score, 0);
    return {
      N, sum, L: N ? sum / (2 * N) : null,
      noSource: labels.filter((x) => !x.source_ref).length,
      beyond: labels.filter((x) => x.beyond_timepoint === '是' || x.score === 2).length,
      induced: labels.filter((x) => x.induced === '是').length,
      unscored: labels.length - N,
    };
  }
  function lRange(values) {
    const v = values.filter((x) => typeof x === 'number');
    return v.length ? { min: Math.min(...v), max: Math.max(...v), n: v.length } : null;
  }

  /* ---------------- 条件卡（D12） ---------------- */
  const CARD_REQUIRED = [['person', '人物与时点'], ['timepoint', '人物与时点'], ['sources', '指定史料'], ['model', '模型与日期'], ['system_prompt', '提示全文'], ['user_prompt', '提示全文'], ['temperature', '温度与采样次数'], ['samples', '温度与采样次数'], ['purpose', '用途']];
  function checkCard(card, entries) {
    const missing = [];
    for (const [k, label] of CARD_REQUIRED) {
      const v = card[k];
      const empty = v == null || v === '' || (Array.isArray(v) && !v.length) || (k === 'model' && !(v && v.name));
      if (empty && !missing.includes(label)) missing.push(label);
    }
    const gate = sourceGate(entries || [], card.timepoint, card.sources || [], card.confirm || []);
    const noCitation = (card.sources || []).filter((id) => { const e = (entries || []).find((x) => x.id === id); return e && !(e.citation && e.page && (e.page.value || e.page.system === '无')); });
    return { missing, gate, noCitation, complete: !missing.length && gate.ok };
  }
  // 依条件卡拼提示：只放通过校验的条目；返回 messages 与实际放入的条目
  function buildMessages(card, entries) {
    const gate = sourceGate(entries, card.timepoint, card.sources || [], card.confirm || []);
    const used = gate.prompt_sources.map((id) => entries.find((e) => e.id === id)).filter((e) => e && e.text);
    const material = used.map((e, i) => `【史料 ${i + 1}】${e.title}（${e.written_date_raw}；${e.citation}，${e.page?.value || ''}）\n${e.text}`).join('\n\n');
    const sys = (card.system_prompt || '') + (material ? `\n\n下面是所给的文字：\n\n${material}` : '');
    return { messages: [{ role: 'system', content: sys }, { role: 'user', content: card.user_prompt || '' }], source_ids: used.map((e) => e.id), gate, empty: gate.prompt_sources.filter((id) => !used.some((e) => e.id === id)) };
  }

  /* ---------------- 可复现的随机数（谢林模型、种群对局） ---------------- */
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------------- 谢林隔离模型（甲三） ----------------
   * 网格 size×size，环面；0 为空，1..k 为类型。同类比例 s_i = 同类邻居 /（非空邻居）；无邻居时视为满意。 */
  function sameShare(neighbors, me) {
    const occ = neighbors.filter((x) => x !== 0);
    return occ.length ? occ.filter((x) => x === me).length / occ.length : null;
  }
  function schellingInit({ size = 30, density = 0.9, groups = 2, seed = 1, layout = 'random' } = {}) {
    const r = rng(seed), n = size * size, g = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (r() >= density) continue;
      if (layout === 'blocks') { const x = i % size, y = Math.floor(i / size); g[i] = 1 + ((Math.floor(x / (size / groups)) + (r() < 0.2 ? 1 : 0)) % groups); }
      else g[i] = 1 + Math.floor(r() * groups);
    }
    return { size, grid: g, seed, step: 0, r };
  }
  function neighborsOf(st, i, hood) {
    const { size, grid } = st, x = i % size, y = Math.floor(i / size), out = [];
    const offs = hood === 4 ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dx, dy] of offs) out.push(grid[((y + dy + size) % size) * size + ((x + dx + size) % size)]);
    return out;
  }
  function schellingMetrics(st, theta, hood = 8) {
    let sSum = 0, cnt = 0, unhappy = 0;
    st.grid.forEach((v, i) => {
      if (!v) return;
      const s = sameShare(neighborsOf(st, i, hood), v); const val = s == null ? 1 : s;
      sSum += val; cnt++; if (val < theta) unhappy++;
    });
    return { S: cnt ? sSum / cnt : 0, U: cnt ? unhappy / cnt : 0, agents: cnt };
  }
  // 一步：所有不满意者按随机顺序搬到随机空位
  function schellingStep(st, theta, hood = 8) {
    const r = st.r, unhappy = [];
    st.grid.forEach((v, i) => { if (!v) return; const s = sameShare(neighborsOf(st, i, hood), v); if (s != null && s < theta) unhappy.push(i); });
    for (let k = unhappy.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [unhappy[k], unhappy[j]] = [unhappy[j], unhappy[k]]; }
    let moved = 0;
    for (const i of unhappy) {
      const empties = []; st.grid.forEach((v, j) => { if (!v) empties.push(j); });
      if (!empties.length) break;
      const j = empties[Math.floor(r() * empties.length)]; st.grid[j] = st.grid[i]; st.grid[i] = 0; moved++;
    }
    st.step++; return moved;
  }
  function schellingRun(opts, theta, { hood = 8, maxSteps = 60 } = {}) {
    const st = schellingInit(opts); const trace = [schellingMetrics(st, theta, hood)];
    for (let k = 0; k < maxSteps; k++) { const m = schellingStep(st, theta, hood); trace.push(schellingMetrics(st, theta, hood)); if (!m) break; }
    return { st, trace, final: trace[trace.length - 1] };
  }
  function schellingSweep(opts, thetas, repeats = 10, runOpts = {}) {
    return thetas.map((theta) => {
      const runs = []; for (let k = 0; k < repeats; k++) runs.push(schellingRun({ ...opts, seed: (opts.seed || 1) * 1000 + k + 1 }, theta, runOpts).final.S);
      return { theta, mean: runs.reduce((a, b) => a + b, 0) / runs.length, min: Math.min(...runs), max: Math.max(...runs), runs };
    });
  }

  /* ---------------- 纳什议价（甲八） ---------------- */
  function nashBargain(contracts, disagreement) {
    const [da, db] = disagreement;
    const rows = contracts.map((c) => { const ga = c.payoff[0] - da, gb = c.payoff[1] - db; return { ...c, gains: [ga, gb], product: ga >= 0 && gb >= 0 ? ga * gb : null }; });
    const best = rows.filter((x) => x.product != null).reduce((a, x) => (!a || x.product > a.product ? x : a), null);
    return { rows, best };
  }
  /* 合约—行动小游戏与种群对局（教学构造，规则大为简化，不是《外交》本身）
   * 每局两人订"互不侵犯"合约，连续 rounds 回合，每回合各自守约或背约。
   * 收益：双守 3/3；一方背约 5/0；双背 1/1。
   * 守约者：始终守约。背约者：始终背约。制裁者：守约，一旦被对方背约，此后对其背约并另付制裁成本 cost、使对方受罚 fine。 */
  const PAY = { kk: [3, 3], kb: [0, 5], bk: [5, 0], bb: [1, 1] };
  function playMatch(ta, tb, { rounds = 3, cost = 0.5, fine = 3 } = {}) {
    let a = 0, b = 0, aHurt = false, bHurt = false; const log = [];
    for (let t = 0; t < rounds; t++) {
      const actA = ta === '背约者' ? 'b' : (ta === '制裁者' && aHurt ? 's' : 'k');
      const actB = tb === '背约者' ? 'b' : (tb === '制裁者' && bHurt ? 's' : 'k');
      const pa = actA === 's' ? 'b' : actA, pb = actB === 's' ? 'b' : actB;
      let [x, y] = PAY[pa + pb];
      if (actA === 's') { x -= cost; y -= fine; }
      if (actB === 's') { y -= cost; x -= fine; }
      a += x; b += y; log.push({ t: t + 1, actA, actB, pay: [x, y] });
      if (pb === 'b' && pa === 'k') aHurt = true; if (pa === 'b' && pb === 'k') bHurt = true;
    }
    return { a, b, log };
  }
  // 种群：shares {守约者, 背约者, 制裁者}；每类对每类按比例加权的平均收益
  function populationPayoffs(shares, opts) {
    const types = ['守约者', '背约者', '制裁者'], tot = types.reduce((s, t) => s + (shares[t] || 0), 0) || 1;
    const out = {};
    for (const t of types) { let v = 0; for (const u of types) v += ((shares[u] || 0) / tot) * playMatch(t, u, opts).a; out[t] = v; }
    return out;
  }

  /* ---------------- 折叠曲面（甲五）：S^3 + u·S + w = 0 ---------------- */
  function cuspDiscriminant(u, w) { return 4 * u * u * u + 27 * w * w; }
  function cuspRoots(u, w) {
    // 实根：用三角法或卡尔达诺
    const D = cuspDiscriminant(u, w), eps = 1e-9;
    if (Math.abs(D) < eps) { if (Math.abs(u) < eps) return [0]; const r1 = 3 * w / u, r2 = -3 * w / (2 * u); return [r1, r2].sort((a, b) => a - b); }
    if (D < 0) { const m = 2 * Math.sqrt(-u / 3), th = Math.acos((3 * w) / (u * m)) / 3; return [0, 1, 2].map((k) => m * Math.cos(th - (2 * Math.PI * k) / 3)).sort((a, b) => a - b); }
    const q = w / 2, s = Math.sqrt(D / 108), c = Math.cbrt(-q + s) + Math.cbrt(-q - s); return [c];
  }
  function cuspState(u, w) {
    const D = cuspDiscriminant(u, w);
    return { D, roots: cuspRoots(u, w), onBoundary: Math.abs(D) < 1e-6, region: Math.abs(D) < 1e-6 ? '边界' : (D < 0 ? '两洼（双稳）' : '一洼') };
  }

  /* ---------------- 逆向仿真的误差（甲六） ---------------- */
  function sqError(obs, sim) { return obs.reduce((a, o, i) => a + (o - sim[i]) ** 2, 0); }

  /* ---------------- 归一化准确率（甲七） ---------------- */
  function normalizedAccuracy(rows) {
    const by = {}; rows.forEach((r) => { (by[r.respondent] = by[r.respondent] || []).push(r); });
    const per = Object.entries(by).map(([k, rs]) => {
      const agree = rs.filter((r) => r.answer_agent === r.answer_self).length / rs.length;
      const hasRetest = rs.every((r) => r.answer_retest != null && r.answer_retest !== '');
      const self = hasRetest ? rs.filter((r) => r.answer_retest === r.answer_self).length / rs.length : null;
      return { respondent: k, agree, self, na: self ? agree / self : null };
    });
    const ok = per.filter((p) => p.na != null);
    return { per, mean: ok.length === per.length && per.length ? ok.reduce((a, p) => a + p.na, 0) / ok.length : null };
  }


  /* ---------------- 两变量差分方程（甲四） ---------------- */
  function diffEq({ r = 0.10, K = 1, c = 0.6, a = 0.5, d = 0.08, x0 = 0.5, y0 = 0.1, steps = 60 } = {}) {
    const xs = [x0], ys = [y0]; let x = x0, y = y0;
    for (let t = 1; t <= steps; t++) { const nx = x + r * x * (1 - x / K) - c * x * y, ny = y + a * x * y - d * y; x = nx; y = ny; xs.push(x); ys.push(y); }
    return { xs, ys, status: xs.some((v) => !(v >= 0) || v > 10) || ys.some((v) => !(v >= 0) || v > 10) ? '崩溃或发散' : (Math.abs(xs[steps] - xs[steps - 1]) < 1e-4 && Math.abs(ys[steps] - ys[steps - 1]) < 1e-4 ? '趋于平衡' : '起伏') };
  }
  function logistic({ r = 0.10, K = 1, x0 = 0.5, steps = 60 } = {}) { const xs = [x0]; let x = x0; for (let t = 1; t <= steps; t++) { x = x + r * x * (1 - x / K); xs.push(x); } return xs; }

  /* ---------------- 折叠型势函数（甲五）：V(S) = S^4/4 + u S^2/2 + w S ---------------- */
  const cuspV = (S, u, w) => S ** 4 / 4 + (u * S * S) / 2 + w * S;
  // 小球沿梯度滑到最近的洼底（从 S0 出发），用来演示"洼消失时突然跳变"
  function cuspSettle(S0, u, w, iters = 4000, lr = 0.01) { let S = S0; for (let k = 0; k < iters; k++) S -= lr * (S ** 3 + u * S + w); return S; }

  /* ---------------- 误差曲面与遗传算法（甲六；教学构造） ---------------- */
  const SURFACES = {
    single: (p, q) => (p - 0.6) ** 2 + (q - 0.4) ** 2,
    double: (p, q) => Math.min((p - 0.25) ** 2 + (q - 0.7) ** 2, (p - 0.75) ** 2 + (q - 0.3) ** 2),
  };
  function gaRun(surface, { seed = 1, pop = 30, keep = 10, gens = 40, sigma = 0.05 } = {}) {
    const r = rng(seed), f = SURFACES[surface] || surface, clip = (v) => Math.min(1, Math.max(0, v));
    const gauss = () => { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    let P = Array.from({ length: pop }, () => [r(), r()]); const history = [P.map((x) => x.slice())];
    for (let g = 0; g < gens; g++) {
      P.sort((A, B) => f(A[0], A[1]) - f(B[0], B[1])); const elite = P.slice(0, keep), next = elite.map((x) => x.slice());
      while (next.length < pop) { const A = elite[Math.floor(r() * keep)], B = elite[Math.floor(r() * keep)], w = r(); next.push([clip(w * A[0] + (1 - w) * B[0] + sigma * gauss()), clip(w * A[1] + (1 - w) * B[1] + sigma * gauss())]); }
      P = next; history.push(P.map((x) => x.slice()));
    }
    P.sort((A, B) => f(A[0], A[1]) - f(B[0], B[1]));
    return { best: P[0], E: f(P[0][0], P[0][1]), history };
  }
  /* 族谱简表（教学构造）：成功 = 0.28·母 + 0.06·姑 + 0.03·学 + 噪声；随机删去 m 比例的母亲记录（记为 0）后用最小二乘重估 */
  function fitWeights(m, { n = 600, seed = 3 } = {}) {
    const r = rng(seed), rows = [];
    for (let i = 0; i < n; i++) { const mo = r() < 0.5 ? 1 : 0, au = r() < 0.4 ? 1 : 0, sc = r() < 0.6 ? 1 : 0; const y = 0.28 * mo + 0.06 * au + 0.03 * sc + (r() - 0.5) * 0.1; rows.push([r() < m ? 0 : mo, au, sc, 1, y]); }
    const k = 4, A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
    for (const row of rows) for (let i = 0; i < k; i++) { b[i] += row[i] * row[4]; for (let j = 0; j < k; j++) A[i][j] += row[i] * row[j]; }
    for (let i = 0; i < k; i++) { let p = i; for (let j = i + 1; j < k; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; for (let j = i + 1; j < k; j++) { const f = A[j][i] / A[i][i]; for (let l = i; l < k; l++) A[j][l] -= f * A[i][l]; b[j] -= f * b[i]; } }
    const x = new Array(k).fill(0); for (let i = k - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < k; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
    return { mother: x[0], aunt: x[1], school: x[2] };
  }

  /* ---------------- 贯穿记录：导出与恢复（D23） ---------------- */
  const SECRET_KEYS = /^(api[_-]?key|key|authorization|token|secret|password)$/i;
  function stripSecrets(v) {
    if (Array.isArray(v)) return v.map(stripSecrets);
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) if (!SECRET_KEYS.test(k)) o[k] = stripSecrets(x); return o; }
    return v;
  }
  const THROUGH_ARRAYS = ['packs', 'cards', 'runs', 'labels', 'sims', 'setting_labels', 'mech_cards'];
  function emptyThrough() { return { format: 'w09-through/v1', saved_at: null, packs: [], cards: [], runs: [], labels: [], sims: [], setting_labels: [], mech_cards: [], claim: { text: '', checklist: {} } }; }
  function exportThrough(rec, secrets = []) {
    let s = JSON.stringify({ ...stripSecrets(rec), format: 'w09-through/v1', saved_at: new Date().toISOString() }, null, 1);
    for (const k of secrets.filter((x) => x && x.length >= 4)) s = s.split(k).join('[REDACTED]');
    return s;
  }
  function importThrough(text, current) {
    try {
      const j = JSON.parse(text);
      if (!j || j.format !== 'w09-through/v1') throw new Error('不是第九周贯穿记录（format 应为 w09-through/v1）');
      for (const k of THROUGH_ARRAYS) if (j[k] != null && !Array.isArray(j[k])) throw new Error(`${k} 应为数组`);
      if (!Array.isArray(j.runs) || !Array.isArray(j.labels) || !Array.isArray(j.cards)) throw new Error('缺少 runs、labels 或 cards');
      for (const r of j.runs) { if (!r.run_id || !r.mode) throw new Error('运行记录缺少 run_id 或 mode'); }
      const rec = { ...emptyThrough(), ...stripSecrets(j) };
      // 导入的现场记录一律改显为回放，原 mode 存入 origin_mode
      rec.runs = rec.runs.map((r) => (r.mode === 'live' || r.mode === 'web-paste') ? { ...r, origin_mode: r.mode, mode: 'replay' } : r);
      return { ok: true, record: rec };
    } catch (e) { return { ok: false, error: e.message, record: current }; }
  }

  const api = { parseDate, cmpToTimepoint, sourceGate, splitSentences, timepointScore, lRange, checkCard, buildMessages, CARD_REQUIRED,
    rng, sameShare, schellingInit, schellingStep, schellingMetrics, schellingRun, schellingSweep, neighborsOf,
    nashBargain, playMatch, populationPayoffs, PAY, cuspDiscriminant, cuspRoots, cuspState, sqError, normalizedAccuracy, diffEq, logistic, cuspV, cuspSettle, SURFACES, gaRun, fitWeights,
    stripSecrets, emptyThrough, exportThrough, importThrough };
  root.W9Lib = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
