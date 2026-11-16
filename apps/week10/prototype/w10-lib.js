/* 第十周演示的计算模块｜候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-16｜第一步
 * 纯函数，不碰 DOM：浏览器里挂在 window.W10Lib，Node 测试用 require 取用（tests/*.test.mjs）。
 * 讲解页与贯穿页共用同一份算法（history-demo-courseware 第 4 条）。接口说明见 docs/week10/algorithms.md。
 *
 * 模块：
 *   切分与归一  tokenize / normalizeUnits
 *   seq-align   align（difflib 兼容 / LCS）、lcsTable、SequenceMatcher（Python difflib 的移植）
 *   quote-check quoteCheck、splitPages
 *   timeline-match parseDateRange、matchTimeline、suggestRows
 *   set-overlap jaccard、pairwiseJaccard、findNames、findHedges
 *   label-agree agreement（一致率、κ、混淆矩阵）
 *   claim-sheet factScore、pointRecall、verdictToSheet
 *   发出前校验  gate、fillTemplate、stripSecrets
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
   * 四、timeline-match：时间线逐步对照基准表
   * ===================================================================== */

  const KANJI_NUM = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  function kanjiToInt(s) {
    if (/^\d+$/.test(s)) return +s;
    let total = 0, cur = 0;
    for (const c of s) {
      if (c in KANJI_NUM) cur = KANJI_NUM[c];
      else if (c === '十') { total += (cur || 1) * 10; cur = 0; }
      else return NaN;
    }
    return total + cur;
  }
  const pad = (x) => String(x).padStart(2, '0');
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  function addDays(isoStr, n) { const t = new Date(isoStr + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }

  // 模糊日期 → 区间 {from, to, rule}。year：所在年份（原文只写月日时由调用者给出，本讲为 1890）。
  // 本课约定（写在页上，可改）：日+前后/ごろ ±5 日；只到月 = 整月；月+前后/ごろ = 前后各半月；
  // 上旬 1—10、中旬 11—20、下旬/月底/月末 21—月末、月初 1—10；以后/以降 = 其后 30 日；以前 = 其前 30 日。
  const FUZZ = { aroundDay: 5, after: 30 };
  function parseDateRange(raw, year, fuzz = FUZZ) {
    let s = String(raw ?? '').replace(/\s+/g, '').normalize('NFKC');
    if (!s) return null;
    const num = '([0-9]+|[〇零一二三四五六七八九十]+)';
    let y = year;
    const ym = s.match(new RegExp('^' + '([0-9]{4})年')); if (ym) { y = +ym[1]; s = s.slice(ym[0].length); }
    const around = /前后|ごろ|頃|左右|前後/.test(s), after = /以后|以後|以降|之后/.test(s), before = /以前|之前/.test(s);
    // 2月17—26日、10月21—22日
    let m = s.match(new RegExp(num + '月' + num + '[日]?[—\\-－~～至到]' + num + '日'));
    if (m) { const mo = kanjiToInt(m[1]); return { from: iso(y, mo, kanjiToInt(m[2])), to: iso(y, mo, kanjiToInt(m[3])), rule: '日期区间' }; }
    m = s.match(new RegExp(num + '月' + num + '日'));
    if (m) {
      const mo = kanjiToInt(m[1]), d = kanjiToInt(m[2]), base = iso(y, mo, d);
      if (around) return { from: addDays(base, -fuzz.aroundDay), to: addDays(base, fuzz.aroundDay), rule: `前后 ±${fuzz.aroundDay} 日` };
      if (after) return { from: base, to: addDays(base, fuzz.after), rule: `以后 ${fuzz.after} 日内` };
      if (before) return { from: addDays(base, -fuzz.after), to: base, rule: `以前 ${fuzz.after} 日内` };
      return { from: base, to: base, rule: '确定日期' };
    }
    m = s.match(new RegExp(num + '月'));
    if (m) {
      const mo = kanjiToInt(m[1]), ld = lastDay(y, mo);
      if (/上旬|初旬|月初/.test(s)) return { from: iso(y, mo, 1), to: iso(y, mo, 10), rule: '上旬' };
      if (/中旬/.test(s)) return { from: iso(y, mo, 11), to: iso(y, mo, 20), rule: '中旬' };
      if (/下旬|月底|月末|末/.test(s)) return { from: iso(y, mo, 21), to: iso(y, mo, ld), rule: '下旬／月末' };
      if (around) return { from: addDays(iso(y, mo, 1), -15), to: addDays(iso(y, mo, ld), 15), rule: '月前后（前后各半月）' };
      return { from: iso(y, mo, 1), to: iso(y, mo, ld), rule: '整月' };
    }
    return null;
  }
  const overlaps = (a, b, tol = 0) => a && b && addDays(a.from, -tol) <= b.to && b.from <= addDays(a.to, tol);

  // base: [{row, date_raw, action}]；steps: [{step_id, date_raw, action, base_row}]（base_row 由学生拖放或 suggestRows 预填；null 为"多出"）
  function matchTimeline(base, steps, { year = 1890, tolerance = 0 } = {}) {
    const B = new Map(base.map((r) => [r.row, { ...r, range: r.from ? { from: r.from, to: r.to } : parseDateRange(r.date_raw, year) }]));
    const used = new Set();
    const rows = steps.map((s) => {
      const range = s.date_from ? { from: s.date_from, to: s.date_to || s.date_from } : parseDateRange(s.date_raw, year);
      if (s.base_row == null || !B.has(s.base_row)) return { ...s, range, match: '多出' };
      used.add(s.base_row);
      const br = B.get(s.base_row);
      if (!range || !br.range) return { ...s, range, match: '相合', note: '一方无日期，只比事项' };
      return { ...s, range, match: overlaps(range, br.range, tolerance) ? '相合' : '日期不符' };
    });
    const missing = base.filter((r) => !used.has(r.row)).map((r) => ({ base_row: r.row, date_raw: r.date_raw, action: r.action, match: '缺失' }));
    const count = { 相合: 0, 多出: 0, 日期不符: 0, 缺失: missing.length };
    for (const r of rows) count[r.match]++;
    return { rows, missing, count };
  }

  // 预填对应行：日期区间相交且事项文字的二字组 Jaccard 最高者；低于 minSim 不预填（学生再拖）
  function bigrams(s) { const t = String(s ?? '').replace(/[\s\p{P}]/gu, ''); const out = new Set(); for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2)); return out; }
  function suggestRows(base, steps, { year = 1890, minSim = 0.2 } = {}) {
    return steps.map((s) => {
      const r = s.date_from ? { from: s.date_from, to: s.date_to || s.date_from } : parseDateRange(s.date_raw, year);
      let best = null, bestSim = 0;
      for (const b of base) {
        const br = parseDateRange(b.date_raw, year);
        if (r && br && !overlaps(r, br, 31)) continue;
        const sim = jaccard(bigrams(s.action), bigrams(b.action));
        if (sim > bestSim) { bestSim = sim; best = b.row; }
      }
      return { ...s, base_row: bestSim >= minSim ? best : null, suggest_sim: Math.round(bestSim * 1000) / 1000 };
    });
  }

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
   * 七、claim-sheet：FActScore 与要点召回
   * ===================================================================== */

  // claims: [{verdict: 有据|无据|说宽|null}]；未标的不计入
  function factScore(claims) {
    const L = claims.filter((c) => ['有据', '无据', '说宽'].includes(c.verdict));
    if (!L.length) return { score: null, supported: 0, total: 0 };
    const supported = L.filter((c) => c.verdict === '有据').length;
    return { score: supported / L.length, supported, total: L.length };
  }
  // points: [{in_summary: yes|no|partial}]；partial 默认不计为出现（页上说明，可切换）
  function pointRecall(points, { partialAs = 0 } = {}) {
    const K = points.length;
    if (!K) return { recall: null, K: 0, hit: 0, partial: 0 };
    const hit = points.filter((p) => p.in_summary === 'yes').length, partial = points.filter((p) => p.in_summary === 'partial').length;
    return { recall: (hit + partial * partialAs) / K, K, hit, partial };
  }
  // 原子主张送到对照单时的预填判定（扩充部分乙五三）；学生可改
  const VERDICT_MAP = { 有据: '一致', 说宽: '过度概括', 无据: '曲解' };
  function verdictToSheet(v) { return VERDICT_MAP[v] || null; }
  // 对照单汇总：模型新见未勾"已回原文确认"的不计入
  const SHEET_VERDICTS = ['一致', '遗漏', '过度概括', '归属错误', '曲解', '模型新见'];
  function sheetSummary(rows) {
    const count = Object.fromEntries(SHEET_VERDICTS.map((v) => [v, 0]));
    let pending = 0;
    for (const r of rows) {
      if (!SHEET_VERDICTS.includes(r.verdict)) continue;
      if (r.verdict === '模型新见' && !r.confirmed) { pending++; continue; }
      count[r.verdict]++;
    }
    const total = Object.values(count).reduce((s, x) => s + x, 0);
    return { count, total, share: Object.fromEntries(SHEET_VERDICTS.map((v) => [v, total ? count[v] / total : null])), pending_new: pending };
  }

  /* =====================================================================
   * 八、发出前校验与提示组装
   * ===================================================================== */

  // card.materials: [{entry_id, label}]；entries: 已载入的史料条目（公开包＋本机包）。
  // sendable 不是 true 的一律拦截；条目在、但没有正文（公开版缺本机包）报 missing。
  function gate(card, entries) {
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

  /* =====================================================================
   * 九、解析模型回答（宽松；解析不出的部分如实报告，由教师手工对应）
   * ===================================================================== */

  // 拆句：。！？!? 与换行；保留句末标点
  function splitSentences(text) {
    return String(text ?? '').replace(/\r/g, '').split(/(?<=[。！？!?])|\n+/).map((s) => s.trim()).filter((s) => s && !/^[#>*\-|\s]+$/.test(s));
  }
  // Markdown 表格 → {head, rows}；接受 | 分隔与全角｜。没有表格时返回 null
  function parseMdTable(text) {
    const lines = String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[|｜].*[|｜]$/.test(l) || (l.match(/[|｜]/g) || []).length >= 2);
    const cells = (l) => l.replace(/^[|｜]|[|｜]$/g, '').split(/[|｜]/).map((c) => c.trim().replace(/\*\*/g, ''));
    const body = lines.filter((l) => !/^[|｜]?\s*:?-{2,}/.test(l.replace(/[|｜]\s*/, '')) && !/^[|｜\s:\-]+$/.test(l));
    if (body.length < 2) return null;
    const head = cells(body[0]);
    return { head, rows: body.slice(1).map((l) => { const c = cells(l); return Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])); }) };
  }
  // 时间线：每行一个步骤；行首或行内取第一个日期写法；方括号内的出处标注另取
  const DATE_IN_LINE = /((?:明治二十三年|1890\s*年)?\s*(?:[0-9]{1,2}|[一二三四五六七八九十]{1,3})\s*月(?:\s*(?:[0-9]{1,2}|[一二三四五六七八九十]{1,3})\s*日?(?:\s*[—\-－~～至到]\s*(?:[0-9]{1,2}|[一二三四五六七八九十]{1,3})\s*日)?)?(?:前后|左右|ごろ|頃|以后|以後|上旬|中旬|下旬|底|末|初)?)/u;
  const LABEL_RE = /[［\[]\s*(材料|自知|推测)(?:\s*[：:]\s*([^］\]]*))?\s*[］\]]/u;
  function parseTimeline(text, { run_id = null } = {}) {
    const out = [];
    for (const raw of String(text ?? '').split(/\r?\n/)) {
      const line = raw.replace(/^\s*(?:[-*•·]|\d+[.、)）]|[（(]\d+[）)])\s*/, '').replace(/\*\*/g, '').trim();
      if (!line || /^[#|｜]/.test(line)) continue;
      const m = line.match(DATE_IN_LINE);
      if (!m) { if (out.length && !/[：:]$/.test(line)) out[out.length - 1].action += ' ' + line; continue; }
      const lab = line.match(LABEL_RE);
      const action = line.replace(m[0], '').replace(LABEL_RE, '').replace(/^[\s：:，,—\-]+/, '').trim();
      out.push({ step_id: `${run_id || 'paste'}-s${out.length + 1}`, run_id, date_raw: m[1].replace(/\s+/g, ''), action, label: lab ? lab[1] : null, label_by: lab ? 'model' : null, label_date: lab && lab[2] ? lab[2].trim() : null, base_row: null, match: null });
    }
    return out;
  }
  // 阿拉伯数字月日 → 稲田录文里的写法（六月二十日）；用于在年表录文中抽查［材料：月日］
  const KN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function toKanjiNum(n) { n = +n; if (n < 10) return KN[n]; if (n === 10) return '十'; if (n < 20) return '十' + KN[n - 10]; return KN[Math.floor(n / 10)] + '十' + (n % 10 ? KN[n % 10] : ''); }
  function monthDayForms(raw) {
    const s = String(raw ?? '').normalize('NFKC');
    const m = s.match(/([0-9]{1,2}|[一二三四五六七八九十]{1,3})\s*月\s*(?:([0-9]{1,2}|[一二三四五六七八九十]{1,3})\s*日)?/);
    if (!m) return [];
    const mo = kanjiToInt(m[1]), d = m[2] ? kanjiToInt(m[2]) : null;
    return d ? [`${toKanjiNum(mo)}月${toKanjiNum(d)}日`, `${mo}月${d}日`] : [`${toKanjiNum(mo)}月`, `${mo}月`];
  }
  function checkLabelDate(step, sourceText) {
    if (step.label !== '材料') return { status: 'n/a' };
    const forms = monthDayForms(step.label_date || step.date_raw);
    if (!forms.length) return { status: 'no-date', forms };
    const t = String(sourceText ?? '');
    const at = forms.map((f) => t.indexOf(f)).filter((i) => i >= 0);
    return at.length ? { status: 'found', forms, at: Math.min(...at), snippet: t.slice(Math.max(0, Math.min(...at) - 10), Math.min(...at) + 60) } : { status: 'not-found', forms };
  }

  // C02B：模型列出的异文与程序对齐表逐一匹配。两边文字（甲／乙）合起来按词的 Jaccard，≥ minSim 视为同一处
  function matchVariants(programVariants, modelRows, { minSim = 0.5 } = {}) {
    const words = (s) => new Set(String(s ?? '').toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || []);
    const used = new Set();
    const pairs = modelRows.map((r, i) => {
      const w = words(`${r.a || ''} ${r.b || ''}`);
      let best = null, bs = 0;
      programVariants.forEach((v) => { if (used.has(v.variant_id)) return; const s = jaccard(w, words(`${v.a_text} ${v.b_text}`)) || 0; if (s > bs) { bs = s; best = v.variant_id; } });
      if (bs >= minSim) { used.add(best); return { model_row: i, variant_id: best, sim: bs }; }
      return { model_row: i, variant_id: null, sim: bs };
    });
    const hit = pairs.filter((p) => p.variant_id).length;
    return { pairs, hit, recall: programVariants.length ? hit / programVariants.length : null, over: pairs.filter((p) => !p.variant_id).length, missed: programVariants.filter((v) => !used.has(v.variant_id)).map((v) => v.variant_id) };
  }
  // 宽松地从表格行中取"甲本／乙本"两栏
  function variantRowsFromTable(t) {
    if (!t) return [];
    const pick = (row, re) => { const k = Object.keys(row).find((h) => re.test(h)); return k ? row[k] : ''; };
    return t.rows.map((r) => ({ id: pick(r, /编号|序号|No|#/i), a: pick(r, /甲/), b: pick(r, /乙/), type: pick(r, /类型/), category: pick(r, /类别/), reason: pick(r, /理由/) })).map((r) => ({ ...r, a: r.a.replace(/^[（(]?(无|—|-|空)[）)]?$/, ''), b: r.b.replace(/^[（(]?(无|—|-|空)[）)]?$/, '') }));
  }

  /* =====================================================================
   * 十、运行记录与贯穿记录
   * ===================================================================== */
  // 同一格的多条记录排序：课前回放按次序，其后是本机现场、网页版
  function orderRuns(rs) { const w = { replay: 0, 'web-paste': 1, live: 2 }; return rs.slice().sort((a, b) => (w[a.mode] ?? 3) - (w[b.mode] ?? 3) || (a.sample_index || 0) - (b.sample_index || 0) || String(a.date).localeCompare(String(b.date))); }
  function pickRun(rs, selId) { return rs.find((r) => r.run_id === selId) || rs[0] || null; }
  const THROUGH_KEYS = ['runs', 'labels', 'claims', 'points', 'timeline', 'varlabels', 'effects', 'cellchecks', 'namechecks', 'sheet', 'packs', 'matrix', 'chengwen', 'arguments'];
  function emptyThrough() { const t = { format: 'w10-through/v1' }; for (const k of THROUGH_KEYS) t[k] = []; t.page_state = {}; return t; }
  function exportThrough(T, secrets = [], { restricted = false } = {}) {
    const o = stripSecrets({ ...T, format: 'w10-through/v1', exported_at: new Date().toISOString(), contains_restricted_text: !!restricted }, secrets);
    const s = JSON.stringify(o, null, 1);
    for (const k of secrets.filter(Boolean)) if (s.includes(k)) throw new Error('导出中出现了 Key，已中止');
    return s;
  }
  // 导入先验证；失败时返回 {ok:false}，调用者保留旧记录
  function importThrough(text) {
    let j;
    try { j = JSON.parse(text); } catch (e) { return { ok: false, error: '不是 JSON：' + e.message }; }
    if (!j || j.format !== 'w10-through/v1') return { ok: false, error: '不是第十周贯穿记录（format 应为 w10-through/v1）' };
    if (/"(apiKey|api_key|authorization)"\s*:/i.test(text)) return { ok: false, error: '文件含 Key 一类的字段，整份拒绝' };
    for (const k of THROUGH_KEYS) if (j[k] != null && !Array.isArray(j[k])) return { ok: false, error: `字段 ${k} 应为数组` };
    const rec = emptyThrough();
    for (const k of THROUGH_KEYS) rec[k] = j[k] || [];
    rec.page_state = j.page_state || {};
    // 载入的运行记录一律作回放显示，原模式存 origin_mode
    rec.runs = rec.runs.map((r) => (r.mode === 'replay' || r.mode === 'pending' ? r : { ...r, origin_mode: r.origin_mode || r.mode, mode: 'replay' }));
    return { ok: true, record: rec };
  }

  /* 课前运行：按条件卡排队列；已有成功记录的跳过（续跑） */
  function planPreclass(cards, presets, samples, done = []) {
    const ok = new Set(done.filter((r) => r.reply && !r.error).map((r) => r.run_id));
    const jobs = [];
    for (const c of cards) for (const p of presets) for (let s = 1; s <= samples; s++) {
      const run_id = `${c.card_id}_${p}_${s}`;
      jobs.push({ run_id, card_id: c.card_id, preset: p, sample_index: s, state: ok.has(run_id) ? '完成' : '待运行', error: null, attempts: 0 });
    }
    return { format: 'w10-preclass/v1', jobs };
  }

  const api = {
    splitSentences, parseMdTable, parseTimeline, monthDayForms, checkLabelDate, toKanjiNum, matchVariants, variantRowsFromTable,
    orderRuns, pickRun, emptyThrough, exportThrough, importThrough, planPreclass, THROUGH_KEYS,
    hasCJK, KYUJITAI, tokenize, normalizeUnits, units,
    SequenceMatcher, lcsTable, lcsBacktrack, lcsOpcodes, align, toTEI,
    splitPages, quoteUnits, quoteCheck, QUOTE_STATUS_ZH,
    kanjiToInt, parseDateRange, matchTimeline, suggestRows, FUZZ,
    jaccard, pairwiseJaccard, findNames, findHedges, HEDGES,
    agreement,
    factScore, pointRecall, verdictToSheet, sheetSummary, SHEET_VERDICTS,
    gate, fillTemplate, stripSecrets,
  };
  root.W10Lib = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
