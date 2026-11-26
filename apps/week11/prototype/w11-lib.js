/* 第十一周演示的计算模块｜候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-25｜第一批
 * 纯函数，不碰 DOM：浏览器里挂在 window.W11Lib，Node 测试用 require 取用（tests/*.test.mjs）。
 * 接口说明与固定例子见 docs/week11/algorithms.md。讲解页与贯穿页共用同一份算法。
 * 一至三、五、六、八节与十节的 orderRuns／pickRun／planPreclass 由第十周 apps/week10/prototype/w10-lib.js 以函数为单位原样移入
 * （第十周测试移入 tests/w10-moved.test.mjs）；十一节起为第十一周新模块。
 */
(function (root) {
  'use strict';
  /* =====================================================================
   * 一、切分与归一
   * ===================================================================== */

  const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆〻ゝゞヽヾー]/u;
  const hasCJK = (s) => CJK_RE.test(s);

  // 旧字形对照（本课所列，只用于比较，原文照录不改）。教师可在页面上增删。
  const KYUJITAI = {
    '德': '徳', '敎': '教', '國': '国', '體': '体', '實': '実', '學': '学', '廣': '広', '濟': '済', '爲': '為',
    '舊': '旧', '傳': '伝', '變': '変', '儉': '倹', '獨': '独', '顯': '顕', '彰': '彰', '壤': '壌', '發': '発',
    '圖': '図', '與': '与', '來': '来', '氣': '気', '歸': '帰', '團': '団', '條': '条', '區': '区', '號': '号',
    '僞': '偽', '繼': '継', '惡': '悪', '眞': '真', '從': '従', '譯': '訳', '俱': '倶', '卽': '即', '郷': '郷',
  };
  const ODORIJI = new Set(['々', '〻', 'ゝ', 'ゞ', 'ヽ', 'ヾ', '〃']);

  // 选项：unit 'char'|'word'；normalize 数组，取下列若干：
  //   case 大小写；width 全半角（NFKC）；kyujitai 旧字形；odoriji 踊字展开；dakuten 去浊点；de_orth 德文 ß→ss；punct 不计标点
  const DEFAULT_ALIGN = { unit: 'word', normalize: [], algorithm: 'difflib' };

  // Python 的 re.findall(r"\w+|[^\w\s]") 在 Unicode 下的等价写法（\w = 字母、数字、下划线）
  const PY_WORD = /[\p{L}\p{N}\p{Mn}\p{Mc}_]+|[^\p{L}\p{N}\p{Mn}\p{Mc}_\s]/gu;

  let _seg = null;
  function segmenter() {
    if (_seg === null) {
      try { _seg = new Intl.Segmenter('ja', { granularity: 'word' }); } catch (e) { _seg = false; }
    }
    return _seg;
  }

  // 切分：返回 [{raw, start, end}]，start/end 为原文中的下标（UTF-16）
  function tokenize(text, unit) {
    const s = String(text ?? '');
    const out = [];
    if (unit === 'char') {
      for (const m of s.matchAll(/\S/gu)) out.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
      return out;
    }
    // word：西文用 Python 兼容的正则（复现 ems_align.py）；含中日文时用 Intl.Segmenter 切中日文部分
    if (!hasCJK(s)) {
      for (const m of s.matchAll(PY_WORD)) out.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
      return out;
    }
    const sg = segmenter();
    if (!sg) return tokenize(s, 'char');
    for (const part of sg.segment(s)) {
      if (/^\s+$/u.test(part.segment)) continue;
      if (part.isWordLike || hasCJK(part.segment)) out.push({ raw: part.segment, start: part.index, end: part.index + part.segment.length });
      else for (const m of part.segment.matchAll(/\S/gu)) out.push({ raw: m[0], start: part.index + m.index, end: part.index + m.index + m[0].length });
    }
    return out;
  }

  const isPunct = (t) => /^[\p{P}\p{S}]+$/u.test(t);

  // 归一：返回每个单位的比较值 norm；raw 不变。踊字在字单位下展开为前一字。
  function normalizeUnits(tokens, normalize, unit) {
    const N = new Set(normalize || []);
    const out = [];
    for (const t of tokens) {
      let v = t.raw;
      if (N.has('width')) v = v.normalize('NFKC');
      if (N.has('case')) v = v.toLowerCase();
      if (N.has('de_orth')) v = v.replace(/ß/g, 'ss').replace(/ẞ/g, 'SS');
      if (N.has('dakuten')) v = v.normalize('NFD').replace(/[゙゚゛゜]/g, '').normalize('NFC');
      if (N.has('kyujitai')) v = [...v].map((c) => KYUJITAI[c] || c).join('');
      if (N.has('odoriji')) {
        if (unit === 'char' && ODORIJI.has(v) && out.length) v = out[out.length - 1].norm;
        else v = [...v].map((c, i, arr) => (ODORIJI.has(c) && i > 0 ? arr[i - 1] : c)).join('');
      }
      if (N.has('punct') && isPunct(v)) continue;
      out.push({ ...t, norm: v });
    }
    return out;
  }

  function units(text, opts) {
    const o = { ...DEFAULT_ALIGN, ...(opts || {}) };
    return normalizeUnits(tokenize(text, o.unit), o.normalize, o.unit);
  }

  /* =====================================================================
   * 二、seq-align
   * ===================================================================== */

  // Python difflib.SequenceMatcher 的移植（isjunk=None, autojunk=False）。
  // 只移植本课用到的部分：find_longest_match、get_matching_blocks、get_opcodes。
  class SequenceMatcher {
    constructor(a, b) {
      this.a = a; this.b = b;
      this.b2j = new Map();
      b.forEach((elt, j) => { if (!this.b2j.has(elt)) this.b2j.set(elt, []); this.b2j.get(elt).push(j); });
      this._blocks = null; this._ops = null;
    }
    findLongestMatch(alo, ahi, blo, bhi) {
      const { a, b, b2j } = this;
      let besti = alo, bestj = blo, bestsize = 0;
      let j2len = new Map();
      for (let i = alo; i < ahi; i++) {
        const newj2len = new Map();
        for (const j of b2j.get(a[i]) || []) {
          if (j < blo) continue;
          if (j >= bhi) break;
          const k = (j2len.get(j - 1) || 0) + 1;
          newj2len.set(j, k);
          if (k > bestsize) { besti = i - k + 1; bestj = j - k + 1; bestsize = k; }
        }
        j2len = newj2len;
      }
      // 无 junk 时 difflib 的两段延伸照样执行（结果不变，保留以便与原实现逐行对照）
      while (besti > alo && bestj > blo && a[besti - 1] === b[bestj - 1]) { besti--; bestj--; bestsize++; }
      while (besti + bestsize < ahi && bestj + bestsize < bhi && a[besti + bestsize] === b[bestj + bestsize]) bestsize++;
      return [besti, bestj, bestsize];
    }
    getMatchingBlocks() {
      if (this._blocks) return this._blocks;
      const la = this.a.length, lb = this.b.length;
      const queue = [[0, la, 0, lb]], blocks = [];
      while (queue.length) {
        const [alo, ahi, blo, bhi] = queue.pop();
        const [i, j, k] = this.findLongestMatch(alo, ahi, blo, bhi);
        if (k) {
          blocks.push([i, j, k]);
          if (alo < i && blo < j) queue.push([alo, i, blo, j]);
          if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
        }
      }
      blocks.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
      const nonAdj = [];
      let i1 = 0, j1 = 0, k1 = 0;
      for (const [i2, j2, k2] of blocks) {
        if (i1 + k1 === i2 && j1 + k1 === j2) k1 += k2;
        else { if (k1) nonAdj.push([i1, j1, k1]); i1 = i2; j1 = j2; k1 = k2; }
      }
      if (k1) nonAdj.push([i1, j1, k1]);
      nonAdj.push([la, lb, 0]);
      return (this._blocks = nonAdj);
    }
    getOpcodes() {
      if (this._ops) return this._ops;
      let i = 0, j = 0;
      const ops = [];
      for (const [ai, bj, size] of this.getMatchingBlocks()) {
        let tag = '';
        if (i < ai && j < bj) tag = 'replace';
        else if (i < ai) tag = 'delete';
        else if (j < bj) tag = 'insert';
        if (tag) ops.push([tag, i, ai, j, bj]);
        i = ai + size; j = bj + size;
        if (size) ops.push(['equal', ai, i, bj, j]);
      }
      return (this._ops = ops);
    }
  }

  // LCS 表：L[i][j] = a 前 i 个与 b 前 j 个的最长公共子序列长度（扩充部分甲三的递推式）
  function lcsTable(a, b) {
    const n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
      L[i][j] = a[i - 1] === b[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
    return L;
  }
  // 从右下角回溯；相等走对角线；不等时取较大的一边，平局先退 a（上），这是本课的约定，写在页上
  function lcsBacktrack(a, b, L) {
    L = L || lcsTable(a, b);
    let i = a.length, j = b.length;
    const path = [], pairs = [];
    while (i > 0 && j > 0) {
      path.push([i, j]);
      if (a[i - 1] === b[j - 1]) { pairs.push([i - 1, j - 1]); i--; j--; }
      else if (L[i - 1][j] >= L[i][j - 1]) i--;
      else j--;
    }
    pairs.reverse();
    return { length: L[a.length][b.length], pairs, path };
  }
  function lcsOpcodes(a, b) {
    const { pairs } = lcsBacktrack(a, b);
    const ops = [];
    let i = 0, j = 0, k = 0;
    while (k <= pairs.length) {
      const [pi, pj] = k < pairs.length ? pairs[k] : [a.length, b.length];
      if (i < pi || j < pj) ops.push([i < pi && j < pj ? 'replace' : i < pi ? 'delete' : 'insert', i, pi, j, pj]);
      if (k === pairs.length) break;
      let len = 0;
      while (k + len < pairs.length && pairs[k + len][0] === pi + len && pairs[k + len][1] === pj + len) len++;
      ops.push(['equal', pi, pi + len, pj, pj + len]);
      i = pi + len; j = pj + len; k += len;
    }
    return ops;
  }

  const OP_ZH = { replace: '改', delete: '删', insert: '增' };

  // 两本对齐。返回对齐表与统计；variants 的文字用原文（raw）拼接，西文以空格、中日文直接相连（与 ems_align.py 一致）
  function align(textA, textB, opts) {
    const o = { ...DEFAULT_ALIGN, ...(opts || {}) };
    const ua = units(textA, o), ub = units(textB, o);
    const a = ua.map((t) => t.norm), b = ub.map((t) => t.norm);
    const ops = o.algorithm === 'lcs' ? lcsOpcodes(a, b) : new SequenceMatcher(a, b).getOpcodes();
    const sep = o.unit === 'char' ? '' : ' ';
    const join = (arr, lo, hi) => arr.slice(lo, hi).map((t) => t.raw).join(sep);
    const span = (arr, lo, hi) => (hi > lo ? [arr[lo].start, arr[hi - 1].end] : null);
    let equal = 0, n = 0;
    const variants = [];
    for (const [op, i1, i2, j1, j2] of ops) {
      if (op === 'equal') { equal += i2 - i1; continue; }
      n++;
      variants.push({ variant_id: 'V' + String(n).padStart(2, '0'), op: OP_ZH[op], a_text: join(ua, i1, i2), b_text: join(ub, j1, j2),
        a_units: [i1, i2], b_units: [j1, j2], a_span: span(ua, i1, i2), b_span: span(ub, j1, j2) });
    }
    return { settings: { unit: o.unit, normalize: [...(o.normalize || [])], algorithm: o.algorithm },
      stats: { a: a.length, b: b.length, equal, variants: variants.length }, variants, opcodes: ops, unitsA: ua, unitsB: ub };
  }

  // 对齐表导出为 TEI 平行分段（甲四）。witnesses: [{id, label}]，lemma: null 或 'A'/'B'
  function toTEI(result, textA, witnesses, { lemma = null, categories = null, labels = {} } = {}) {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const [WA, WB] = witnesses;
    const sep = result.settings.unit === 'char' ? '' : ' ';
    const parts = [];
    let vi = 0;
    for (const [op, i1, i2, j1, j2] of result.opcodes) {
      if (op === 'equal') { parts.push(esc(result.unitsA.slice(i1, i2).map((t) => t.raw).join(sep))); continue; }
      const v = result.variants[vi++];
      const rd = (w, t) => (t ? `<rdg wit="#${w.id}">${esc(t)}</rdg>` : `<rdg wit="#${w.id}"/>`);
      const ana = labels[v.variant_id] ? ` ana="#${labels[v.variant_id]}"` : '';
      const la = lemma === WA.id ? (v.a_text ? `<lem wit="#${WA.id}">${esc(v.a_text)}</lem>` : `<lem wit="#${WA.id}"/>`) : rd(WA, v.a_text);
      const lb = lemma === WB.id ? (v.b_text ? `<lem wit="#${WB.id}">${esc(v.b_text)}</lem>` : `<lem wit="#${WB.id}"/>`) : rd(WB, v.b_text);
      parts.push(`<app n="${v.variant_id}"${ana}>${lemma === WB.id ? lb + la : la + lb}</app>`);
    }
    const wits = witnesses.map((w) => `  <witness xml:id="${w.id}">${esc(w.label)}</witness>`).join('\n');
    const cats = categories ? `<interpGrp type="transcriptional">\n${categories.map((c) => `  <interp xml:id="${esc(c.id)}">${esc(c.label)}</interp>`).join('\n')}\n</interpGrp>\n` : '';
    return `<listWit>\n${wits}\n</listWit>\n${cats}<p>${parts.join(sep)}</p>`;
  }

  /* =====================================================================
   * 三、quote-check：引文在不在原文里
   * ===================================================================== */

  const PAGE_MARK = /〔原刊第(\d+)页〕/g;

  // 按页码标记切开原文：[{page, text}]；标记之前的部分 page=null
  function splitPages(text, marker) {
    const re = new RegExp((marker || PAGE_MARK).source, 'g');
    const out = [];
    let last = 0, page = null, m;
    while ((m = re.exec(text))) { out.push({ page, text: text.slice(last, m.index) }); page = m[1]; last = re.lastIndex; }
    out.push({ page, text: text.slice(last) });
    return out.filter((p) => p.text.length);
  }

  // 引文核对用的单位：先 NFKC、去控制字符与空白、（默认）去标点；中日文一字一单位，西文一词一单位，西文小写
  function quoteUnits(text, { punct = true } = {}) {
    let s = String(text ?? '').normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, '');
    const out = [];
    for (const m of s.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ー]|[\p{L}\p{N}\p{M}]+|[^\s]/gu)) {
      if (punct && isPunct(m[0])) continue;
      out.push({ raw: m[0], norm: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
    }
    return out;
  }

  // quote：学生贴的引文；source：原文全文（可含〔原刊第×页〕）。
  // opts.minSeg：计入的连续片段最短单位数（默认中日文 3、西文 2）；opts.threshold：门槛（默认 0.8，中日文与西文夹杂 0.65）
  function quoteCheck(quote, source, opts = {}) {
    const q = quoteUnits(quote, opts);
    const src = [];
    for (const p of splitPages(String(source ?? ''), opts.marker)) for (const u of quoteUnits(p.text, opts)) src.push({ ...u, page: p.page });
    const cjkQ = q.filter((u) => hasCJK(u.raw)).length, mixed = cjkQ > 0 && cjkQ < q.length;
    const minSeg = opts.minSeg ?? (cjkQ >= q.length / 2 ? 3 : 2);
    const threshold = opts.threshold ?? (mixed ? 0.65 : 0.8);
    const n = q.length;
    if (!n) return { n: 0, m: 0, coverage: null, status: 'empty', segments: [], missed: [], threshold, minSeg, pages: [] };
    const sm = new SequenceMatcher(q.map((u) => u.norm), src.map((u) => u.norm));
    const segs = [], stack = [[0, n]];
    while (stack.length) {
      const [lo, hi] = stack.pop();
      if (hi - lo < minSeg) continue;
      const [i, j, k] = sm.findLongestMatch(lo, hi, 0, src.length);
      if (k < minSeg) continue;
      segs.push({ q: [i, i + k], src: [j, j + k], text: q.slice(i, i + k).map((u) => u.raw).join(''), pages: [...new Set(src.slice(j, j + k).map((u) => u.page).filter(Boolean))] });
      stack.push([lo, i], [i + k, hi]);
    }
    segs.sort((x, y) => x.q[0] - y.q[0]);
    const covered = new Array(n).fill(false);
    for (const s of segs) for (let t = s.q[0]; t < s.q[1]; t++) covered[t] = true;
    const m = covered.filter(Boolean).length, coverage = m / n;
    const missed = [];
    for (let t = 0; t < n; t++) if (!covered[t]) {
      const last = missed[missed.length - 1];
      if (last && last.q[1] === t) { last.q[1] = t + 1; last.text += q[t].raw; } else missed.push({ q: [t, t + 1], text: q[t].raw });
    }
    // 拼接：片段在原文中不相连（或顺序颠倒）
    let contiguous = segs.length === 1;
    const status = coverage === 1 ? (contiguous ? 'exact' : 'spliced') : coverage >= threshold ? 'near' : 'not_found';
    const pages = [...new Set(segs.flatMap((s) => s.pages))];
    return { n, m, coverage, status, segments: segs, missed, threshold, minSeg, pages, quoteUnits: q.map((u) => u.raw) };
  }
  const QUOTE_STATUS_ZH = { exact: '核实（连续）', spliced: '核实（拼接）', near: '近似（过门槛，有未核上的字）', not_found: '未核实', empty: '无引文' };

  /* =====================================================================
   * 五、set-overlap
   * ===================================================================== */

  function jaccard(a, b) {
    const A = a instanceof Set ? a : new Set(a), B = b instanceof Set ? b : new Set(b);
    const union = new Set([...A, ...B]);
    if (!union.size) return null;
    let inter = 0; for (const x of A) if (B.has(x)) inter++;
    return inter / union.size;
  }
  function pairwiseJaccard(lists) {
    const sets = lists.map((l) => new Set(l));
    const matrix = sets.map((a) => sets.map((b) => jaccard(a, b)));
    const pairs = [];
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) pairs.push(matrix[i][j]);
    const valid = pairs.filter((x) => x != null);
    return { matrix, mean: valid.length ? valid.reduce((s, x) => s + x, 0) / valid.length : null, pairs };
  }
  // roster: [{name, aliases:[]}]；返回回答中出现的标准名（按首次出现顺序）
  function findNames(text, roster) {
    const s = String(text ?? '');
    const hits = [];
    for (const r of roster) {
      const pos = [r.name, ...(r.aliases || [])].map((n) => s.indexOf(n)).filter((i) => i >= 0);
      if (pos.length) hits.push({ name: r.name, at: Math.min(...pos) });
    }
    return hits.sort((x, y) => x.at - y.at).map((h) => h.name);
  }
  // 调和语（规则写在页上，可改）
  const HEDGES = ['综合来看', '综合而言', '总体而言', '总体来看', '总的来说', '总之', '综上', '兼而有之', '折中', '既是', '一方面', '辩证'];
  function findHedges(text, list = HEDGES) {
    const s = String(text ?? '');
    return list.filter((h) => s.includes(h)).map((h) => ({ phrase: h, at: s.indexOf(h) }));
  }

  /* =====================================================================
   * 六、label-agree：一致率、κ、混淆矩阵
   * ===================================================================== */

  // pairs: [{item_id, label_a, label_b}]；任一方为空的项不计入
  function agreement(pairs, labelSet) {
    const P = pairs.filter((p) => p.label_a != null && p.label_a !== '' && p.label_b != null && p.label_b !== '');
    const N = P.length;
    const labels = labelSet || [...new Set(P.flatMap((p) => [p.label_a, p.label_b]))];
    const idx = new Map(labels.map((l, i) => [l, i]));
    const matrix = labels.map(() => labels.map(() => 0));
    let same = 0;
    for (const p of P) { if (p.label_a === p.label_b) same++; if (idx.has(p.label_a) && idx.has(p.label_b)) matrix[idx.get(p.label_a)][idx.get(p.label_b)]++; }
    if (!N) return { N, po: null, pe: null, kappa: null, labels, matrix, disagreements: [] };
    const po = same / N;
    let pe = 0;
    for (const l of labels) { const pa = P.filter((p) => p.label_a === l).length / N, pb = P.filter((p) => p.label_b === l).length / N; pe += pa * pb; }
    const kappa = pe === 1 ? null : (po - pe) / (1 - pe);
    return { N, po, pe, kappa, labels, matrix, disagreements: P.filter((p) => p.label_a !== p.label_b).map((p) => p.item_id) };
  }

  /* =====================================================================
   * 八、发出前校验与提示组装
   * ===================================================================== */

  // card.materials: [{entry_id, label}]；entries: 已载入的史料条目（公开包＋本机包）。
  // sendable 不是 true 的一律拦截；条目在、但没有正文（公开版缺本机包）报 missing。
  function gate10(card, entries) {
    const byId = new Map((entries || []).map((e) => [e.id, e]));
    const blocked = [], missing = [], ok = [];
    for (const m of card.materials || []) {
      const e = byId.get(m.entry_id);
      if (!e) { missing.push({ entry_id: m.entry_id, why: '未载入（需导入本机材料包）' }); continue; }
      if (e.sendable !== true) { blocked.push({ entry_id: m.entry_id, why: e.sendable_basis || 'sendable 不是 true' }); continue; }
      if (!e.text) { missing.push({ entry_id: m.entry_id, why: '只有元数据，没有正文' }); continue; }
      ok.push(m.entry_id);
    }
    return { ok: !blocked.length && !missing.length, blocked, missing, sendable_ids: ok };
  }
  // 模板中的 {{material:ID}} 换成条目正文；校验不过时抛错，绝不发出半份提示
  function fillTemplate(card, entries) {
    const g = gate(card, entries);
    if (!g.ok) { const err = new Error('发出前校验未通过：' + [...g.blocked, ...g.missing].map((x) => `${x.entry_id}（${x.why}）`).join('；')); err.gate = g; throw err; }
    const byId = new Map(entries.map((e) => [e.id, e]));
    const content = String(card.user_template).replace(/\{\{material:([^}]+)\}\}/g, (_, id) => {
      if (!g.sendable_ids.includes(id)) throw new Error('模板引用了未列入 materials 的条目：' + id);
      return byId.get(id).text;
    });
    return { messages: [{ role: 'user', content }], gate: g };
  }
  // 递归去掉 Key 一类的键；字符串里出现已知 Key 值的整段替换
  const SECRET_KEYS = ['apiKey', 'api_key', 'key', 'authorization', 'Authorization'];
  function stripSecrets(obj, secrets = []) {
    if (Array.isArray(obj)) return obj.map((x) => stripSecrets(x, secrets));
    if (obj && typeof obj === 'object') {
      const o = {};
      for (const [k, v] of Object.entries(obj)) if (!SECRET_KEYS.includes(k)) o[k] = stripSecrets(v, secrets);
      return o;
    }
    if (typeof obj === 'string') return secrets.filter(Boolean).reduce((s, k) => s.split(k).join('[已去除]'), obj);
    return obj;
  }

  /* 第十周 十、运行记录（只移入三个函数） */
  function orderRuns(rs) { const w = { replay: 0, 'web-paste': 1, live: 2 }; return rs.slice().sort((a, b) => (w[a.mode] ?? 3) - (w[b.mode] ?? 3) || (a.sample_index || 0) - (b.sample_index || 0) || String(a.date).localeCompare(String(b.date))); }
  function pickRun(rs, selId) { return rs.find((r) => r.run_id === selId) || rs[0] || null; }
  /* 课前运行：按条件卡排队列；已有成功记录的跳过（续跑） */
  function planPreclass10(cards, presets, samples, done = []) {
    const ok = new Set(done.filter((r) => r.reply && !r.error).map((r) => r.run_id));
    const jobs = [];
    for (const c of cards) for (const p of presets) for (let s = 1; s <= samples; s++) {
      const run_id = `${c.card_id}_${p}_${s}`;
      jobs.push({ run_id, card_id: c.card_id, preset: p, sample_index: s, state: ok.has(run_id) ? '完成' : '待运行', error: null, attempts: 0 });
    }
    return { format: 'w10-preclass/v1', jobs };
  }


  /* =====================================================================
   * 第十一周：发出前校验（第十周 gate 外加卡上每份材料的 sendable）与课前运行
   * ===================================================================== */
  function gate(card, entries) {
    const g = gate10(card, entries);
    for (const m of card.materials || []) if (m.sendable === false && !g.blocked.some((b) => b.entry_id === m.entry_id)) {
      g.blocked.push({ entry_id: m.entry_id, why: m.sendable_basis || '条件卡上标 sendable=false' });
      g.sendable_ids = g.sendable_ids.filter((x) => x !== m.entry_id); g.missing = g.missing.filter((x) => x.entry_id !== m.entry_id);
    }
    g.ok = !g.blocked.length && !g.missing.length;
    return g;
  }
  function planPreclass(cards, presets, samples, done = []) { return { ...planPreclass10(cards, presets, samples, done), format: 'w11-preclass/v1', records: done.slice() }; }
  const PRESET_NAME = { deepseek: 'DeepSeek', kimi: 'Kimi' };
  function checkKeys(keys, presets) {
    const miss = (presets || []).filter((p) => !String((keys || {})[p] || '').trim());
    return miss.length ? { ok: false, missing: miss, message: `未填 Key：${miss.map((p) => PRESET_NAME[p] || p).join('、')}。请在"模型接入"中填写；Key 只存在本页内存，不进记录与导出。` } : { ok: true, missing: [], message: '' };
  }
  // caller(job) → Promise<{reply, model, reasoning?, usage?, finish_reason?, prompt?}>；失败抛错。已"完成"的跳过（续跑）。
  async function runQueue(queue, caller, { onProgress } = {}) {
    const q = { ...queue, jobs: queue.jobs.map((j) => ({ ...j })), records: (queue.records || []).slice() };
    for (const job of q.jobs) {
      if (job.state === '完成') continue;
      job.attempts = (job.attempts || 0) + 1; job.state = '运行中'; onProgress && onProgress(job, q);
      const t0 = Date.now();
      try {
        const res = await caller(job);
        const rec = { run_id: job.run_id, card_id: job.card_id, sample_index: job.sample_index, mode: 'live', origin_mode: null, preset: job.preset,
          model: res.model ?? null, temperature: res.temperature ?? null, reasoning_effort: res.reasoning_effort ?? null, prompt: res.prompt || {},
          reply: res.reply ?? null, reasoning: res.reasoning ?? null, finish_reason: res.finish_reason ?? null, usage: res.usage ?? null,
          ms: Date.now() - t0, attempts: job.attempts, date: new Date().toISOString(), error: null };
        q.records = q.records.filter((r) => r.run_id !== job.run_id).concat([stripSecrets(rec)]);
        job.state = '完成'; job.error = null;
      } catch (e) { job.state = '失败'; job.error = String(e && e.message || e); }
      onProgress && onProgress(job, q);
    }
    return q;
  }

  /* =====================================================================
   * 十一、borrow-scan：引号外的照抄片段（扩充部分乙一第二步）
   * ===================================================================== */
  const QUOTE_RE = /“([^”]*)”|"([^"]*)"|「([^」]*)」/g;
  function extractQuotes(text) {
    const out = [], s = String(text ?? '');
    for (const m of s.matchAll(QUOTE_RE)) { const q = m[1] ?? m[2] ?? m[3]; if (q) out.push({ text: q, span: [m.index, m.index + m[0].length] }); }
    return out;
  }
  const normBorrow = (t) => String(t ?? '').replace(/[\s\p{Cc}“”"「」]/gu, '');
  const isP = (c) => /[\p{P}\p{S}]/u.test(c);
  function pagedFull(source, marker) {
    let full = ''; const offs = [];
    for (const p of splitPages(String(source ?? ''), marker)) { offs.push([full.length, p.page]); full += normBorrow(p.text); }
    const pageAt = (i) => { let pg = null; for (const [o, p] of offs) { if (o <= i) pg = p; else break; } return pg; };
    return { full, pageAt };
  }
  function borrowScan(draft, source, { k = 12, marker } = {}) {
    const { full, pageAt } = pagedFull(source, marker);
    const nb = normBorrow(String(draft ?? '').replace(QUOTE_RE, ''));
    const fragments = [];
    let i = 0;
    while (i < nb.length - k) {
      if (full.includes(nb.slice(i, i + k))) {
        let e = i + k;
        while (e < nb.length && full.includes(nb.slice(i, e + 1))) e++;
        const text = nb.slice(i, e), s = full.indexOf(text);
        const chars = [...text]; let lead = 0; while (lead < chars.length && isP(chars[lead])) lead++;
        let tail = 0; while (tail < chars.length - lead && isP(chars[chars.length - 1 - tail])) tail++;
        fragments.push({ text, len: chars.length, len_trimmed: chars.length - lead - tail, page_raw: pageAt(s), page: pageAt(s + chars.slice(0, lead).join('').length), draft_span: [i, e], src_span: [s, s + text.length] });
        i = e;
      } else i++;
    }
    return { k, fragments };
  }
  function quoteCheckAll(draft, source, opts = {}) {
    return extractQuotes(draft).map((q) => { const r = quoteCheck(q.text, source, opts); return { quote: q.text, span: q.span, status: r.status, pages: r.pages, coverage: r.coverage, missed: r.missed }; });
  }

  /* =====================================================================
   * 十二、docx：浏览器内解析（只读，不上传）
   * ===================================================================== */
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const decodeXml = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m));
  const attrs = (tag) => { const o = {}; for (const m of tag.matchAll(/([\w:]+)="([^"]*)"/g)) o[m[1]] = decodeXml(m[2]); return o; };
  async function inflateRaw(u8) {
    const ds = new DecompressionStream('deflate-raw');
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer());
  }
  // 最小的 zip 读取：中央目录 → 条目；stored 与 deflate 两种
  async function unzip(buf, want) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('不是 .docx（找不到 zip 目录）');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
    const td = new TextDecoder('utf-8');
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('zip 目录损坏');
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = td.decode(u8.slice(p + 46, p + 46 + nl));
      if (!want || want.includes(name)) {
        const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
        const raw = u8.slice(ds, ds + csize);
        out[name] = td.decode(method === 8 ? await inflateRaw(raw) : raw);
      }
      p += 46 + nl + xl + cl;
    }
    return out;
  }
  // 逐个标签走一遍：段落 → 片段（文字、修订、批注范围、脚注引用、分页）
  function walkParas(xml) {
    const paras = []; let p = null, rev = null, inText = null, foot = null, footType = null; const open = new Set();
    for (const m of String(xml || '').matchAll(/<[^>]+>|[^<]+/g)) {
      const t = m[0];
      if (t[0] !== '<') { if (p && inText) p.segs.push({ text: decodeXml(t), rev, kind: inText, comments: [...open] }); continue; }
      if (t.startsWith('<?') || t.startsWith('<!')) continue;
      const close = t[1] === '/', self = t.endsWith('/>'), name = (t.match(/^<\/?([\w:]+)/) || [])[1];
      switch (name) {
        case 'w:footnote': if (close) { foot = null; footType = null; } else { const a = attrs(t); foot = a['w:id']; footType = a['w:type'] || null; } break;
        case 'w:p': if (close) { if (p) paras.push(p); p = null; } else { p = { segs: [], breakBefore: false, foot, footType }; if (self) { paras.push(p); p = null; } } break;
        case 'w:pageBreakBefore': if (p) { const v = attrs(t)['w:val']; if (v !== '0' && v !== 'false') p.breakBefore = true; } break;
        case 'w:br': if (p && attrs(t)['w:type'] === 'page') p.segs.push({ pagebreak: true }); break;
        case 'w:ins': case 'w:del':
          if (close) rev = null; else if (!self) { const a = attrs(t); rev = { type: name === 'w:ins' ? 'ins' : 'del', author: a['w:author'] || '', date: a['w:date'] || '', id: a['w:id'] }; }
          break;
        case 'w:t': inText = !close && !self ? 't' : null; break;
        case 'w:delText': inText = !close && !self ? 'del' : null; break;
        case 'w:footnoteReference': if (p) p.segs.push({ ref: attrs(t)['w:id'] }); break;
        case 'w:commentRangeStart': open.add(attrs(t)['w:id']); break;
        case 'w:commentRangeEnd': open.delete(attrs(t)['w:id']); break;
        default: break;
      }
    }
    return paras;
  }
  const viewBefore = (segs) => segs.filter((s) => s.text != null && !(s.rev && s.rev.type === 'ins')).map((s) => s.text).join('');
  const viewAfter = (segs) => segs.filter((s) => s.text != null && s.kind === 't' && !(s.rev && s.rev.type === 'del')).map((s) => s.text).join('');
  function footnotePr(doc, settings) {
    const pick = (x) => { const m = String(x || '').match(/<w:footnotePr>([\s\S]*?)<\/w:footnotePr>/); return m ? m[1] : ''; };
    const s = pick((String(doc).match(/<w:sectPr[\s\S]*?<\/w:sectPr>/) || [''])[0]) || pick(settings);
    const v = (tag) => { const m = s.match(new RegExp(`<w:${tag} w:val="([^"]+)"`)); return m ? m[1] : null; };
    return { numFmt: v('numFmt') || 'decimal', numRestart: v('numRestart') || 'continuous' };
  }
  async function parseDocx(buf) {
    const z = await unzip(buf, ['word/document.xml', 'word/footnotes.xml', 'word/settings.xml']);
    if (!z['word/document.xml']) throw new Error('文件里没有 word/document.xml');
    const settings = footnotePr(z['word/document.xml'], z['word/settings.xml']);
    const body = walkParas(z['word/document.xml']);
    const paragraphs = [], refs = [];
    let page = 1;
    body.forEach((p, index) => {
      if (p.breakBefore && index > 0) page++;
      const start = page;
      for (const s of p.segs) { if (s.pagebreak) page++; if (s.ref) refs.push({ id: s.ref, page, para: index }); }
      paragraphs.push({ index, text: viewAfter(p.segs), page: start });
    });
    const ftext = {};
    for (const p of walkParas(z['word/footnotes.xml'] || '')) {
      if (p.foot == null || p.footType || +p.foot <= 0) continue;
      ftext[p.foot] = (ftext[p.foot] || '') + viewAfter(p.segs);
    }
    const footnotes = []; let pg = null, k = 0;
    refs.forEach((r, i) => {
      if (settings.numRestart === 'eachPage') { if (r.page !== pg) { pg = r.page; k = 0; } k++; } else k = i + 1;
      footnotes.push({ note_id: r.id, doc_page: r.page, number_on_page: k, text: (ftext[r.id] || '').trim(), anchor_para: r.para });
    });
    return { paragraphs, footnotes, settings };
  }
  function groupEdits(segs) {
    const groups = []; let g = null;
    for (const s of segs) {
      if (s.text == null) continue;
      if (!s.rev) { g = null; continue; }
      // 同一修订者相邻的修订算一处；但先删后增之后又出现删除，是下一处替换（Word 里是两条修订）
      if (!g || g.author !== s.rev.author || (s.rev.type === 'del' && g.kinds.includes('ins'))) { g = { author: s.rev.author, date: s.rev.date, kinds: [], removed: '', added: '', comments: new Set() }; groups.push(g); }
      if (!g.kinds.includes(s.rev.type)) g.kinds.push(s.rev.type);
      if (s.rev.type === 'del') g.removed += s.text; else g.added += s.text;
      s.comments.forEach((c) => g.comments.add(c));
    }
    return groups;
  }
  async function docxRevisions(buf) {
    const z = await unzip(buf, ['word/document.xml', 'word/footnotes.xml', 'word/comments.xml']);
    const cm = {};
    for (const m of String(z['word/comments.xml'] || '').matchAll(/<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g)) {
      const a = attrs(m[1]); cm[a['w:id']] = { id: a['w:id'], author: a['w:author'] || '', date: a['w:date'] || '', text: [...m[2].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((x) => decodeXml(x[1])).join(''), range_text: '', range_text_before: '' };
    }
    const edits = []; let n = 0;
    const take = (p, where) => {
      for (const id of Object.keys(cm)) {
        const segs = p.segs.filter((s) => s.text != null && s.comments.includes(id));
        if (segs.length) { cm[id].range_text += viewAfter(segs); cm[id].range_text_before += viewBefore(segs); }
      }
      for (const g of groupEdits(p.segs)) {
        const c = [...g.comments][0];
        edits.push({ edit_id: `r${++n}`, ...where, author: g.author, date: g.date, kinds: g.kinds, removed: g.removed, added: g.added,
          before: viewBefore(p.segs), after: viewAfter(p.segs), comment: c != null && cm[c] ? cm[c].text : null });
      }
    };
    walkParas(z['word/document.xml']).forEach((p, i) => take(p, { para_index: i, in_footnote: false }));
    const fp = walkParas(z['word/footnotes.xml'] || '').filter((p) => p.foot != null && !p.footType && +p.foot > 0);
    for (const p of fp) {
      // 脚注的改前改后取整条注文
      const all = fp.filter((q) => q.foot === p.foot).flatMap((q) => q.segs);
      for (const g of groupEdits(p.segs)) {
        const c = [...g.comments][0];
        edits.push({ edit_id: `r${++n}`, note_id: p.foot, in_footnote: true, author: g.author, date: g.date, kinds: g.kinds, removed: g.removed, added: g.added,
          before: viewBefore(all).trim(), after: viewAfter(all).trim(), comment: c != null && cm[c] ? cm[c].text : null });
      }
    }
    return { edits, comments: Object.values(cm) };
  }

  /* =====================================================================
   * 十三、note-rules：注释体例（乙一、丙二）
   * ===================================================================== */
  function noteLabel(n, numFmt) {
    if (/EnclosedCircle/.test(String(numFmt)) && n >= 1 && n <= 20) return String.fromCodePoint(0x2460 + n - 1);
    return /EnclosedCircle/.test(String(numFmt)) ? `(${n})` : String(n);
  }
  function parseCitations(text) {
    return String(text).split(/；?转引自/).map((seg) => {
      const am = seg.match(/^\s*([^：:，,《]+?)(?:主?编|著)?[：:]/);
      const tm = seg.match(/《([^》]+)》/);
      const after = tm ? seg.slice(tm.index + tm[0].length) : '';
      return { author: am ? am[1].trim() : null, title: tm ? tm[1] : null, venue: /《[^》]+》/.test(after) || /出版社|\d{4}\s*年第|第\s*\d+\s*卷/.test(seg) };
    });
  }
  function noteRules(footnotes, { restart = true, numFmt = 'decimalEnclosedCircleChinese', ibid = /^同上/, page = /第\s*[\d—\-–、，,～~]+\s*[页頁]/ } = {}) {
    const notes = [], issues = [], seen = new Map();
    const pageCount = {}; let prev = null;
    footnotes.forEach((f, i) => {
      pageCount[f.doc_page] = (pageCount[f.doc_page] || 0) + 1;
      const num = restart ? pageCount[f.doc_page] : i + 1;
      const isIbid = ibid.test(String(f.text).trim());
      const firstOnPage = pageCount[f.doc_page] === 1;
      const r = { note_id: f.note_id, label: noteLabel(num, numFmt), ibid: isIbid, ibid_first_on_page: isIbid && firstOnPage, refers_to: isIbid && prev ? prev.note_id : null,
        no_page: !isIbid && !page.test(f.text), has_transfer: /转引/.test(f.text), short_form: false, repeat_of: null };
      if (!isIbid) {
        parseCitations(f.text).forEach((c, k) => {
          if (!c.title) return;
          const key = `${c.author}｜${c.title}`;
          if (seen.has(key)) { if (k === 0) { r.repeat_of = seen.get(key); r.short_form = !c.venue; } }
          else seen.set(key, f.note_id);
        });
      }
      if (r.ibid_first_on_page) issues.push({ note_id: f.note_id, rule: 'ibid_first_on_page', why: '"同上"是新一页的第一条注，读者看不到它指的上一页注' });
      if (r.no_page) issues.push({ note_id: f.note_id, rule: 'no_page', why: '没有页码' });
      notes.push(r); prev = f;
    });
    return { notes, issues };
  }

  /* =====================================================================
   * 十四、outline-rules：段落功能序列与六类提示（甲一）
   * ===================================================================== */
  function splitSentences(text) { return (String(text ?? '').match(/[^。！？]+[。！？]*[”」’』]*/g) || []).map((s) => s.trim()).filter(Boolean); }
  const bigramSet = (s) => { const t = [...String(s ?? '').replace(/[^\p{L}\p{N}_]|\p{Nd}/gu, '')]; const o = new Set(); for (let i = 0; i < t.length - 1; i++) o.add(t[i] + t[i + 1]); return o; };
  const OVERCLAIM = ['普遍接受', '基本形成共识', '形成共识', '学界一般认为', '普遍认为', '已成定论', '毫无疑问'];
  const LIST_RE = /^[\p{Script=Han}]{2,4}\s*\d{4}\s*年/u;
  const has = (p, f) => p.function === f || p.function2 === f;
  function outlineRules(paras, { rules = {}, overlap = 0.30, listMin = 3, overclaim = OVERCLAIM } = {}) {
    const on = (k) => rules[k] !== false;
    const flags = [], add = (rule, ps, why) => { if (ps.length) flags.push({ rule, paras: [...new Set(ps)], why }); };
    const ids = paras.map((p) => p.para_id);
    if (on('罗列')) {
      const ps = [];
      let run = [];
      paras.forEach((p) => { if (p.function === '学术史·背景') run.push(p.para_id); else { if (run.length >= listMin) ps.push(...run); run = []; } });
      if (run.length >= listMin) ps.push(...run);
      for (const p of paras) { let c = 0, best = 0; for (const s of splitSentences(p.text)) { c = LIST_RE.test(s) ? c + 1 : 0; best = Math.max(best, c); } if (best >= listMin) ps.push(p.para_id); }
      add('罗列', ids.filter((x) => ps.includes(x)), `段间连续 ${listMin} 段以上"学术史·背景"，或段内连续 ${listMin} 句以上以"人名＋年份"起头`);
    }
    if (on('一段多事')) add('一段多事', paras.filter((p) => p.function && p.function2 && p.function2 !== p.function).map((p) => p.para_id), '一段标了两种主要功能');
    const similarity = [];
    for (let i = 0; i < paras.length; i++) for (let j = i + 1; j < paras.length; j++) {
      const A = bigramSet(paras[i].text), B = bigramSet(paras[j].text); let inter = 0; for (const x of A) if (B.has(x)) inter++;
      similarity.push({ a: paras[i].para_id, b: paras[j].para_id, overlap: Math.min(A.size, B.size) ? inter / Math.min(A.size, B.size) : 0 });
    }
    if (on('重复')) add('重复', ids.filter((x) => similarity.some((s) => s.overlap >= overlap && (s.a === x || s.b === x))), `两段字符二元组重合系数 ≥ ${overlap}`);
    if (on('问题晚出') && paras.length) {
      const last = [...paras].reverse().find((p) => has(p, '结论')) || paras[paras.length - 1];
      const Q = last.answers;
      if (Q) { const k = paras.findIndex((p) => has(p, '提出问题') && p.answers === Q); if (k === -1 || k >= 2) add('问题晚出', [k === -1 ? last.para_id : paras[k].para_id], '本文的问题到第 3 段以后才出现'); }
    }
    if (on('限定后置')) {
      if (!paras.slice(0, -1).some((p) => has(p, '限定'))) {
        const ps = paras.filter((p) => overclaim.some((w) => String(p.text).includes(w))).map((p) => p.para_id);
        add('限定后置', ps.length ? ps : paras.length ? [paras[paras.length - 1].para_id] : [], '末段以前没有限定；含说满的用语');
      }
    }
    if (on('反证未回应')) add('反证未回应', paras.filter((p, i) => has(p, '学术史·反证') && !p.responds_to_para && !paras.slice(i + 1).some((q) => q.responds_to_para === p.para_id)).map((p) => p.para_id), '有反证而后文没有回应它的段落');
    return { sequence: paras.map((p) => [p.function, p.function2].filter(Boolean)), flags, similarity };
  }

  /* =====================================================================
   * 十五、recall-pool、edit-stats、style-count
   * ===================================================================== */
  function recallPool({ implants, findings, runs }) {
    const N = implants.length;
    const R = runs && runs.length ? runs : [...new Set(findings.map((f) => f.run_id))];
    const perRun = {};
    for (const r of R) { const hits = [...new Set(findings.filter((f) => f.run_id === r && f.matched === 1 && f.error_id).map((f) => f.error_id))]; perRun[r] = { hits, recall: N ? hits.length / N : null }; }
    const union = [...new Set(R.flatMap((r) => perRun[r].hits))];
    const greedy = [], got = new Set(), left = R.slice();
    while (left.length) {
      let bi = 0, bn = -1; left.forEach((r, i) => { const n = perRun[r].hits.filter((h) => !got.has(h)).length; if (n > bn) { bn = n; bi = i; } });
      const r = left.splice(bi, 1)[0]; const added = perRun[r].hits.filter((h) => !got.has(h)); added.forEach((h) => got.add(h));
      greedy.push({ run: r, added, recall: N ? got.size / N : null });
    }
    return { N, perRun, union, recallUnion: N ? union.length / N : null, greedy };
  }
  function editStats(edits, { by = 'item', threshold = 0.5 } = {}) {
    const w = (e) => (by === 'chars' ? Math.max([...String(e.before || '')].length, [...String(e.after || '')].length, 1) : 1);
    const sum = (xs) => xs.reduce((s, e) => s + w(e), 0);
    const M = edits.filter((e) => e.proposer && e.proposer.kind === 'model'), A = M.filter((e) => e.decision === 'accept'), MC = edits.filter((e) => e.intention === 'meaning-changed');
    const share = edits.length ? sum(MC) / sum(edits) : null;
    return { by, n: edits.length, n_m: M.length, a_m: A.length, adoption: M.length ? sum(A) / sum(M) : null, n_mc: MC.length, meaningShare: share,
      suggestLabel: share == null ? null : share >= threshold ? '段落改写' : '语言润色', threshold };
  }
  const countChars = (t) => (String(t ?? '').match(/[\p{L}\p{Nd}]/gu) || []).length;
  function styleCount(text, rules) {
    const s = String(text ?? ''), chars = countChars(s), counts = {};
    for (const r of rules) {
      const spans = [];
      if ((r.kind || 'wordlist') === 'regex') {
        const re = new RegExp(r.pattern, 'u'); let off = 0;
        for (const sent of s.split(/(?<=[。！？；])/)) { if (re.test(sent)) spans.push([off, off + sent.length]); off += sent.length; }
      } else {
        for (const w of String(r.pattern).split('|').filter(Boolean)) { let i = s.indexOf(w); while (i >= 0) { spans.push([i, i + w.length]); i = s.indexOf(w, i + w.length); } }
        spans.sort((a, b) => a[0] - b[0]);
      }
      counts[r.rule_id] = { n: spans.length, per100: chars ? (spans.length / chars) * 100 : null, spans };
    }
    return { chars, counts };
  }
  function styleDiff(original, revised, rules) {
    const o = styleCount(original, rules), r = styleCount(revised, rules), delta = {};
    for (const x of rules) delta[x.rule_id] = (r.counts[x.rule_id].per100 ?? 0) - (o.counts[x.rule_id].per100 ?? 0);
    return { original: o, revised: r, delta };
  }
  function excessWord(y3, y2, y) {
    const p = (o) => (o.a + 1) / (o.b + 1);
    const pm3 = p(y3), pm2 = p(y2), py = p(y), q = pm2 + 2 * Math.max(pm2 - pm3, 0);
    return { pm3, pm2, p: py, q, delta: py - q, r: py / q, maxActive: pm2 - pm3 > 0 };
  }

  /* =====================================================================
   * 十六、register、ledger、declaration、页面文案
   * ===================================================================== */
  const DECISIONS = { diagnosis: ['采纳', '修正', '舍弃'], edit: ['采纳', '修正', '舍弃'], finding: ['成立', '不成立', '存疑'], note_check: ['成立', '不成立', '存疑'] };
  const DECISION_ALIAS = { 部分采纳: '修正', 接受: '采纳', 拒绝: '舍弃', 修改后采纳: '修正' };
  function normalizeDecision(raw, kind) {
    const vocab = DECISIONS[kind]; if (!vocab) throw new Error('未知视图：' + kind);
    if (vocab.includes(raw)) return { decision: raw, decision_raw: null };
    const a = DECISION_ALIAS[raw]; if (a && vocab.includes(a)) return { decision: a, decision_raw: raw };
    throw new Error(`"${raw}"不是${kind}视图的处理取值（${vocab.join('／')}）`);
  }
  function registerSummary(rows, kind) {
    const vocab = DECISIONS[kind], count = Object.fromEntries(vocab.map((v) => [v, 0]));
    for (const r of rows.filter((x) => x.kind === kind)) { if (!r.decision) continue; const d = vocab.includes(r.decision) ? r.decision : normalizeDecision(r.decision, kind).decision; count[d]++; }
    const total = Object.values(count).reduce((s, x) => s + x, 0);
    return { count, total, share: Object.fromEntries(vocab.map((v) => [v, total ? count[v] / total : null])) };
  }
  const LEDGER_OK = ['归纳认可', '直接要求'];
  const ledgerSelectable = (e) => LEDGER_OK.includes(e.status);
  function ledgerSnippet(entries) {
    return entries.map((e) => {
      if (ledgerSelectable(e)) return [`偏好：${e.preference}`, e.before && `例（改前）：${e.before}`, e.after && `例（改后）：${e.after}`, e.scope && `适用范围：${e.scope}`].filter(Boolean).join('\n');
      if (e.status === '原段认可') return [e.before && `例（改前）：${e.before}`, e.after && `例（改后）：${e.after}`].filter(Boolean).join('\n');
      return '';
    }).filter(Boolean).join('\n\n');
  }
  const v = (x, d = '（未填）') => (x == null || x === '' ? d : x);
  function buildDeclaration(d) {
    const att = (d.attachments || []).map((a) => a.label);
    const mode = [v(d.mode), d.web_search == null ? '是否联网未填' : d.web_search ? '联网' : '未联网', `推理强度 ${v(d.reasoning)}`, `温度 ${v(d.temperature, '默认')}`].join('，');
    const text = [
      '声明：',
      `（1）工具信息：${v(d.tool)}（开发者：${v(d.developer)}；版本：${v(d.version)}）；使用日期：${v(d.dates)}。使用方式与参数：${mode}。`,
      `（2）使用环节：在${v(d.stage)}中，用于${v(d.purpose)}。`,
      `（3）输入与输出记录：关键提示为${v(d.prompts_summary)}；产出${v(d.products)}。附件：${att.length ? att.join('；') : '无'}。`,
      `（4）责任归属：作者已逐项核验（${(d.checks || []).length ? d.checks.join('、') : '核验方式未填'}），并对本文内容承担全部责任。`,
    ].join('\n');
    return { text, attachments: att };
  }
  const COPY = {
    D18: '要交的是"人工智能使用情况说明"本身。附件按个人情况提交：模型对某一部分贡献较大，就附上那一部分的关键提示与原始输出；只用模型检索、润色的，在声明里写明即可；不要求交齐五张表，评分也不看附件多少。本页汇总的五张表，是写作时自用的记录，被问到时出示。',
  };
  const copyText = (id) => COPY[id] ?? '';

  /* =====================================================================
   * 十七、D16 两头对：脚注集合 × 参考文献目录
   * ===================================================================== */
  const stripPart = (t) => String(t || '').replace(/[（(][一二三四五六七八九十]+[）)]$/, '').replace(/[“”"‘’'「」『』\s]/g, ''); // 去分期标记；引号写法不同不算改动
  function bibCrossCheck(footnotes, bib) {
    const cites = [];
    let prev = null;
    for (const f of footnotes) {
      if (/^同上/.test(f.text.trim())) { if (prev) cites.push({ ...prev, note_id: f.note_id }); continue; }
      const cs = parseCitations(f.text).filter((c) => c.title).map((c) => ({ ...c, note_id: f.note_id, year: (f.text.match(/(\d{4})\s*年/) || [])[1] || null }));
      cites.push(...cs); prev = cs[0] || prev;
    }
    const refs = bib.map((b) => { const c = parseCitations(b.text)[0] || {}; return { ref_id: b.ref_id, text: b.text, author: c.author, title: c.title, year: (b.text.match(/(\d{4})\s*年/) || [])[1] || null }; });
    const sim = (a, b) => { const A = bigramSet(a), B = bigramSet(b); let i = 0; for (const x of A) if (B.has(x)) i++; return Math.min(A.size, B.size) ? i / Math.min(A.size, B.size) : 0; };
    const matched = {}, changed = [];
    for (const r of refs) {
      const hits = cites.filter((c) => c.author && r.author && c.author.replace(/[编著]$/, '') === r.author.replace(/[编著]$/, '') && sim(stripPart(c.title), stripPart(r.title)) >= 0.6);
      matched[r.ref_id] = [...new Set(hits.map((h) => h.note_id))];
      if (hits.length) {
        const f = [];
        if (!hits.some((h) => stripPart(h.title) === stripPart(r.title))) f.push('title');
        if (r.year && !hits.some((h) => h.year === r.year)) f.push('year');
        if (f.length) changed.push({ ref_id: r.ref_id, fields: f });
      }
    }
    const used = new Set(Object.values(matched).flat());
    return { matched, orphans_in_bib: refs.filter((r) => !matched[r.ref_id].length).map((r) => r.ref_id),
      missing_in_bib: [...new Set(cites.filter((c) => !used.has(c.note_id) && !refs.some((r) => matched[r.ref_id].includes(c.note_id))).map((c) => c.note_id))], changed };
  }

  /* =====================================================================
   * 十七之二（第二批）：植入副本、会议录发言人规则、重现性、修订预览、文风界线
   * ===================================================================== */
  // 植入：每处 before 须在原文中恰好出现一次；返回副本与各处位置
  function applyImplants(text, implants) {
    let out = String(text ?? ''); const applied = [];
    for (const im of implants) {
      const n = out.split(im.before).length - 1;
      if (n !== 1) { applied.push({ error_id: im.error_id, ok: false, reason: n ? `“${im.before}”出现 ${n} 次，须写得更长以唯一定位` : `原文中找不到“${im.before}”` }); continue; }
      const at = out.indexOf(im.before); out = out.slice(0, at) + im.after + out.slice(at + im.before.length);
      applied.push({ error_id: im.error_id, ok: true, at, len: im.after.length });
    }
    return { text: out, applied };
  }
  // 按句切分并记页码与句末圈码（〔原刊第N页〕为页标；句号后紧跟的圈码归上一句）
  const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  function pagedSentences(text, marker = '〔原刊第(\\d+)页〕') {
    const s = String(text ?? ''), re = new RegExp(marker, 'g'), parts = [];
    let last = 0, m;
    while ((m = re.exec(s))) { parts.push([s.slice(last, m.index), null]); parts.push(['', +m[1]]); last = m.index + m[0].length; }
    parts.push([s.slice(last), null]);
    let curPage = null, cur = null; const sents = [];
    for (const [chunk, pg] of parts) {
      if (pg != null) { curPage = pg; continue; }
      for (const ch of chunk) {
        if (!cur) cur = { text: '', page: curPage, marks: [] };
        if (CIRC.includes(ch) && !cur.text.trim() && sents.length) { const p0 = sents[sents.length - 1]; p0.marks.push({ mark: ch, page: curPage }); p0.text += ch; continue; }
        cur.text += ch;
        if (CIRC.includes(ch)) cur.marks.push({ mark: ch, page: curPage });
        if (/[。！？\n]/.test(ch)) { if (cur.text.trim()) sents.push(cur); cur = null; }
      }
    }
    if (cur && cur.text.trim()) sents.push(cur);
    return sents.map((x, i) => ({ ...x, i, text: x.text.replace(/\n/g, '') }));
  }
  // 会议录发言人与院别规则（乙一第二步，史料为日文会议录时）：
  // roster：{中文写法: 原文写法}；cites：{页: {圈码: entry_id}}；entries：{entry_id: {text, house}}（entries 缺某条＝原文不在手）
  function speakerRules(text, { roster, cites, entries }) {
    const names = Object.keys(roster).sort((a, b) => b.length - a.length);
    const flags = [], unchecked = [], checked = [];
    for (const s of pagedSentences(text)) {
      const ids = [...new Set(s.marks.map((m) => (cites[m.page] || {})[m.mark]).filter(Boolean))];
      if (!ids.length) continue;
      let rest = s.text; const found = [];
      for (const n of names) if (rest.includes(n)) { found.push(n); rest = rest.split(n).join('　'); }
      for (const id of ids) {
        const e = entries[id];
        if (!e || !e.text) { unchecked.push({ sentence: s.i, page: s.page, entry: id, reason: '原文不在手：无法核' }); continue; }
        checked.push({ sentence: s.i, page: s.page, entry: id, names: found });
        for (const n of found) if (!e.text.includes(roster[n])) flags.push({ rule: '发言人不在所注原文', sentence: s.i, page: s.page, entry: id, name: n, text: s.text });
        for (const m of s.text.matchAll(/(贵族院|众议院)议员/g)) {
          const house = m[1] === '贵族院' ? '貴族院' : '衆議院';
          if (e.house && e.house !== house) flags.push({ rule: '院别与所注原文不符', sentence: s.i, page: s.page, entry: id, name: m[1], text: s.text, expected: e.house });
        }
      }
    }
    return { flags, unchecked, checked };
  }
  // 重现性（C-02）：两次输出的值与引文是否相同；值相同由人判，引文相同可机械判（去空白与引号后相等）
  const normQ = (q) => String(q ?? '').replace(/[\s“”"「」『』‘’'，,。.]/g, '');
  function consistency(cells) {
    const val = cells.filter((c) => c.value_same != null), qs = cells.filter((c) => c.q1 != null && c.q2 != null && (c.q1 || c.q2));
    const qsame = qs.filter((c) => c.quote_same != null ? c.quote_same : normQ(c.q1) === normQ(c.q2));
    return { n: cells.length, value: val.length ? val.filter((c) => c.value_same).length / val.length : null, n_value: val.length,
      quote: qs.length ? qsame.length / qs.length : null, n_quote: qs.length };
  }
  // 修订预览：正文各段的片段，带 docxRevisions 同一编号（r1, r2…，正文在前）
  async function revisionView(buf) {
    const z = await unzip(buf, ['word/document.xml']);
    let n = 0; const paras = [];
    walkParas(z['word/document.xml']).forEach((p, index) => {
      const segs = []; let g = null;
      for (const s of p.segs) {
        if (s.text == null) continue;
        if (!s.rev) { g = null; segs.push({ text: s.text, edit_id: null, type: null }); continue; }
        if (!g || g.author !== s.rev.author || (s.rev.type === 'del' && g.hasIns)) g = { id: `r${++n}`, author: s.rev.author, hasIns: false };
        if (s.rev.type === 'ins') g.hasIns = true;
        segs.push({ text: s.text, edit_id: g.id, type: s.rev.type });
      }
      paras.push({ index, segs });
    });
    return paras;
  }
  // decisions：{edit_id: 'accept'|'reject'|'modify'|null}；未定的两种文字都保留并标出
  function previewSegs(segs, decisions) {
    return segs.map((s) => {
      if (!s.edit_id) return { text: s.text, state: 'plain' };
      const d = decisions[s.edit_id];
      if (d === 'accept' || d === 'modify') return s.type === 'ins' ? { text: s.text, state: 'plain' } : null;
      if (d === 'reject') return s.type === 'del' ? { text: s.text, state: 'plain' } : null;
      return { text: s.text, state: s.type, edit_id: s.edit_id };
    }).filter(Boolean);
  }
  // 文风界线（讲义 3.2 @fig-bounds）：原段有、改后没有的限定语与引号词语；改后新出的泛化归属
  const BOUND_HEDGES = ['之虞', '试图', '较为', '部分', '一定程度', '或许', '可能', '似乎', '不过', '注意到'];
  function boundsCheck(original, revised, { hedges = BOUND_HEDGES, generic = ['学界', '学者们', '研究者', '人们普遍'] } = {}) {
    const o = String(original ?? ''), r = String(revised ?? '');
    const cnt = (s, w) => s.split(w).length - 1;
    const lostHedges = hedges.filter((h) => cnt(o, h) > cnt(r, h)).map((h) => ({ word: h, before: cnt(o, h), after: cnt(r, h) }));
    const qo = extractQuotes(o).map((q) => q.text), qr = extractQuotes(r).map((q) => q.text);
    const lostQuotes = [...new Set(qo)].filter((q) => qo.filter((x) => x === q).length > qr.filter((x) => x === q).length).map((q) => ({ term: q, before: qo.filter((x) => x === q).length, after: qr.filter((x) => x === q).length }));
    // 泛化归属：泛称后面紧跟归属动词（学界注意到、学者们认为……），原段没有而改后新出
    const ATTR = '(?:注意到|认为|指出|试图|主张|普遍)';
    const cntA = (s, g) => (s.match(new RegExp(g + ATTR, 'g')) || []).length;
    const newGeneric = generic.filter((g) => cntA(r, g) > cntA(o, g)).map((g) => ({ word: g, before: cntA(o, g), after: cntA(r, g) }));
    return { lostHedges, lostQuotes, newGeneric };
  }
  // 字级差异（两栏高亮用）
  function charDiff(a, b) {
    const A = [...String(a ?? '')], B = [...String(b ?? '')];
    return lcsOpcodes(A, B).map(([tag, i1, i2, j1, j2]) => ({ tag, a: A.slice(i1, i2).join(''), b: B.slice(j1, j2).join('') }));
  }
  // 两人（或人与原标注）标签一致率，不做 κ 校正
  function labelAgreement(items) {
    const done = items.filter((x) => x.mine);
    return { n: done.length, agree: done.filter((x) => x.mine === x.gold).length, rate: done.length ? done.filter((x) => x.mine === x.gold).length / done.length : null };
  }

  /* =====================================================================
   * 十八、贯穿记录（w11-through/v1）
   * ===================================================================== */
  const THROUGH_KEYS = ['matrix', 'paragraphs', 'register', 'edits', 'findings', 'implants', 'ledger', 'footnotes', 'bib', 'runs', 'packs'];
  function emptyThrough() { const t = { format: 'w11-through/v1' }; for (const k of THROUGH_KEYS) t[k] = []; t.declaration = null; t.page_state = {}; return t; }
  function exportThrough(T, secrets = [], { restricted = false } = {}) {
    const o = stripSecrets({ ...T, format: 'w11-through/v1', exported_at: new Date().toISOString(), contains_restricted_text: !!restricted }, secrets);
    const s = JSON.stringify(o, null, 1);
    for (const k of secrets.filter(Boolean)) if (s.includes(k)) throw new Error('导出中出现了 Key，已中止');
    return s;
  }
  function importThrough(text) {
    let j;
    try { j = JSON.parse(text); } catch (e) { return { ok: false, error: '不是 JSON：' + e.message }; }
    if (!j || j.format !== 'w11-through/v1') return { ok: false, error: '不是第十一周贯穿记录（format 应为 w11-through/v1）' };
    if (/"(apiKey|api_key|authorization)"\s*:/i.test(text)) return { ok: false, error: '文件含 Key 一类的字段，整份拒绝' };
    for (const k of THROUGH_KEYS) if (j[k] != null && !Array.isArray(j[k])) return { ok: false, error: `字段 ${k} 应为数组` };
    const rec = emptyThrough();
    for (const k of THROUGH_KEYS) rec[k] = j[k] || [];
    rec.declaration = j.declaration || null; rec.page_state = j.page_state || {};
    rec.runs = rec.runs.map((r) => (r.mode === 'replay' || r.mode === 'pending' ? r : { ...r, origin_mode: r.origin_mode || r.mode, mode: 'replay' }));
    return { ok: true, record: rec };
  }

  const api = {
    // 第十周移入
    hasCJK, KYUJITAI, tokenize, normalizeUnits, units, SequenceMatcher, lcsTable, lcsBacktrack, lcsOpcodes, align, toTEI,
    splitPages, quoteUnits, quoteCheck, QUOTE_STATUS_ZH, jaccard, pairwiseJaccard, findNames, findHedges, HEDGES, agreement,
    gate, fillTemplate, stripSecrets, orderRuns, pickRun, planPreclass,
    // 第十一周
    extractQuotes, borrowScan, quoteCheckAll, unzip, parseDocx, docxRevisions, noteRules, noteLabel, parseCitations,
    splitSentences, outlineRules, OVERCLAIM, recallPool, editStats, styleCount, styleDiff, excessWord,
    normalizeDecision, registerSummary, DECISIONS, ledgerSelectable, ledgerSnippet, buildDeclaration, copyText, bibCrossCheck,
    emptyThrough, exportThrough, importThrough, THROUGH_KEYS, checkKeys, runQueue,
    // 第十一周第二批
    applyImplants, pagedSentences, speakerRules, consistency, revisionView, previewSegs, boundsCheck, BOUND_HEDGES, charDiff, labelAgreement,
    IMPLEMENTED: true,
  };
  root.W11Lib = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
