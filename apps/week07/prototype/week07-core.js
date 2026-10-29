/* 第七周共用模块：材料包、证据表存储、历法计算、分词与对齐。依赖 deck-core.js 的 window.Deck。
 * 原始数据不进公开构建（教师 2026-10-28）：页面只含代码；数据由“材料包”在课堂现场从本机导入，存于 IndexedDB。 */
(() => {
  'use strict';
  const { esc, store } = window.Deck;

  /* ================= 材料包 =================
   * 两部分：公开部分（data/public/week07-public-pack.js，许可允许公开再发布的史料，随课件发布，自动载入，file:// 也可用）；
   * 本机部分（week07-pack.json，CBDB 接口返回与教学文件夹原件等，课堂现场导入，存 IndexedDB）。页面读两者合并后的结果，
   * 并按本页实际用到的部分判断是否显示导入提示（Pack.has）。 */
  const DB = 'pku-aihis-week07', OS = 'pack';
  let PUB = null, LOCAL = null, PACK = null; const waiters = [];
  const idb = () => new Promise((ok, no) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(OS); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  async function idbGet() { try { const db = await idb(); return await new Promise((ok) => { const q = db.transaction(OS).objectStore(OS).get('current'); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); } catch { return null; } }
  async function idbPut(v) { try { const db = await idb(); await new Promise((ok, no) => { const t = db.transaction(OS, 'readwrite'); t.objectStore(OS).put(v, 'current'); t.oncomplete = ok; t.onerror = () => no(t.error); }); return true; } catch { return false; } }
  async function idbDel() { try { const db = await idb(); await new Promise((ok) => { const t = db.transaction(OS, 'readwrite'); t.objectStore(OS).delete('current'); t.oncomplete = ok; }); } catch { /* ignore */ } }
  function validate(p) {
    if (!p || p.format !== 'pku-aihis-week07-pack') throw new Error('不是第七周材料包（format 字段不符）');
    for (const k of ['cbdb', 'texts', 'runs']) if (!p[k]) throw new Error('材料包缺少 ' + k);
    return p;
  }
  function merge() {
    if (!PUB && !LOCAL) return null;
    const m = { ...(PUB || {}), ...(LOCAL || {}) };
    for (const k of ['texts', 'images', 'licenses', 'runs', 'teach']) m[k] = { ...(PUB?.[k] || {}), ...(LOCAL?.[k] || {}) };
    m._public = !!PUB; m._local = !!LOCAL; m._persisted = LOCAL?._persisted;
    return m;
  }
  function changed() {
    PACK = merge(); if (PACK) waiters.splice(0).forEach((f) => f(PACK));
    document.querySelectorAll('[data-needs-pack]').forEach((n) => n.packChanged?.());
    document.dispatchEvent(new CustomEvent('w7-pack', { detail: PACK }));
  }
  function setPack(p, persisted) { LOCAL = p; LOCAL._persisted = persisted; changed(); }
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const Pack = {
    get: () => PACK,
    hasLocal: () => !!LOCAL, hasPublic: () => !!PUB,
    /* 本页用到的各部分是否都在（路径如 'cbdb'、'images.dnsr_p1'、'teach.extract'）。 */
    has: (...paths) => !!PACK && paths.every((x) => getPath(PACK, x) != null),
    ready: () => (PACK ? Promise.resolve(PACK) : new Promise((ok) => waiters.push(ok))),
    async importFile(file) {
      const text = await file.text(); const p = validate(JSON.parse(text));
      const ok = await idbPut(p); setPack(p, ok); return p;
    },
    async clear() { await idbDel(); LOCAL = null; changed(); },
    loadPublic() {
      return new Promise((ok) => {
        if (window.W7_PUBLIC_PACK) { PUB = window.W7_PUBLIC_PACK; changed(); return ok(true); }
        const sc = document.createElement('script'); sc.src = 'data/public/week07-public-pack.js'; sc.async = true;
        sc.onload = () => { PUB = window.W7_PUBLIC_PACK || null; changed(); ok(!!PUB); }; sc.onerror = () => ok(false);
        document.head.append(sc);
      });
    },
    async init() {
      const pub = this.loadPublic();
      const u = new URLSearchParams(location.search).get('pack');
      if (u) { try { const p = validate(await (await fetch(u)).json()); setPack(p, await idbPut(p)); await pub; return; } catch (e) { console.warn('材料包地址载入失败', e); } }
      const p = await idbGet(); if (p) setPack(p, true);
      await pub;
    },
  };
  /* 导入提示：说明本页还缺哪部分本机材料。 */
  function packGate(needs) {
    return `<div class="pack-gate"><p><b>本页用到 CBDB 数据，需课堂导入第七周本机材料包。</b>其他史料与教学材料已随课件公开；CBDB 接口返回按教师决定只在课堂现场导入（文件名形如 <code>week07-pack.json</code>，由 <code>build_week07_pack.py</code> 生成）。</p>
      <p class="sub">本页用到：${esc(needs)}</p>
      <label class="pack-btn">选择第七周材料包<input type="file" accept=".json,application/json" data-pack-file hidden></label>
      <p class="pack-err" hidden></p></div>`;
  }
  document.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-pack-file]')) return;
    const f = e.target.files[0]; if (!f) return;
    const err = e.target.closest('.pack-gate,.pack-bar')?.querySelector('.pack-err');
    try { await Pack.importFile(f); } catch (x) { if (err) { err.hidden = false; err.textContent = '导入失败：' + x.message + '（原有数据未改动）'; } }
  });
  /* CBDB 引注：导入本机材料包后，在用到 CBDB 的各页页脚与顶栏显示（教师 2026-10-29）。 */
  const CBDB_CITE = 'China Biographical Database（中國歷代人物傳記資料庫，CBDB），CBDB BJ 20260602，CC BY-NC-SA 4.0';
  const CBDB_NOTE = '本课件所用记录经 CBDB API 于 2026-10-28 取得；许可见 https://creativecommons.org/licenses/by-nc-sa/4.0/';
  const CBDB_PAGES = ['D01', 'D04', 'D07', 'D09', 'D12', 'D18'];
  function cbdbCite() {
    for (const id of CBDB_PAGES) {
      const f = document.querySelector(`deck-slide[slide-id="${id}"] .slide-footer`); if (!f) continue;
      let n = f.querySelector('.cbdb-cite'); if (!n) { n = document.createElement('span'); n.className = 'cbdb-cite'; f.append(n); }
      n.textContent = LOCAL?.cbdb ? `　CBDB 数据引注：${CBDB_CITE}。${CBDB_NOTE}。` : '　本页的 CBDB 数据需课堂导入。';
    }
  }
  document.addEventListener('w7-pack', cbdbCite);

  /* 顶栏状态：公开材料／本机材料包。 */
  function packBar() {
    const top = document.querySelector('.deck-top'); if (!top || top.querySelector('.pack-bar')) return;
    const span = document.createElement('span'); span.className = 'pack-bar';
    const draw = () => {
      span.innerHTML = LOCAL ? `<span class="pack-ok" title="${esc(CBDB_CITE + '。' + CBDB_NOTE)}">CBDB 材料已导入（CBDB BJ 20260602，CC BY-NC-SA 4.0）${LOCAL._persisted ? '' : '（未能写入浏览器存储，刷新后需重新导入）'}</span> <button data-pack-clear>移除</button>`
        : `${PUB ? '<span class="pack-ok" title="随课件发布的公开材料">公开材料</span> ' : ''}<label class="pack-btn small">导入 CBDB 材料包<input type="file" accept=".json" data-pack-file hidden></label><span class="pack-err" hidden></span>`;
    };
    draw(); document.addEventListener('w7-pack', draw);
    span.addEventListener('click', (e) => { if (e.target.matches('[data-pack-clear]')) Pack.clear(); });
    top.insertBefore(span, top.querySelector('[data-act="presenter"]'));
  }

  /* ================= 历法 ================= */
  const GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
  const GZ = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);
  const GZ_BASE = 2433191; // 1949-10-01（甲子）的儒略日数
  const gzIndex = (jdn) => (((jdn - GZ_BASE) % 60) + 60) % 60;
  const jdnFromGreg = (y, m, d) => { const a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3; return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045; };
  const jdnFromJul = (y, m, d) => { const a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3; return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - 32083; };
  function gregFromJdn(j) { const a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4), d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153); return [100 * b + d - 4800 + Math.floor(m / 10), m + 3 - 12 * Math.floor(m / 10), e - Math.floor((153 * m + 2) / 5) + 1]; }
  function julFromJdn(j) { const c = j + 32082, d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153); return [d - 4800 + Math.floor(m / 10), m + 3 - 12 * Math.floor(m / 10), e - Math.floor((153 * m + 2) / 5) + 1]; }
  const ymd = (a) => `${a[0]}-${String(a[1]).padStart(2, '0')}-${String(a[2]).padStart(2, '0')}`;
  const MONTH_NUM = { 正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12, 冬: 11, 臘: 12 };
  /* 历表：材料包 calendar（DDBC，CC BY-SA 3.0）。eras: [id, 名称[], 国别, 朝代, 帝王]；months[eraId]: [年, 月序, 月名, 闰, 朔JDN, 天数, 状态] */
  const Cal = {
    eras(country) { const c = PACK?.calendar; return c ? c.eras.filter((e) => e[2] === country) : []; },
    findEras(country, name) { return this.eras(country).filter((e) => e[1].includes(name)); },
    month(eraId, year, month, leap) { const ms = PACK?.calendar?.months?.[String(eraId)] || []; return ms.find((m) => m[0] === year && m[1] === month && m[3] === (leap ? 1 : 0)) || null; },
    yearMonths(eraId, year) { return (PACK?.calendar?.months?.[String(eraId)] || []).filter((m) => m[0] === year); },
    eraById(id) { return PACK?.calendar?.eras?.find((e) => e[0] === Number(id)) || null; },
    /* 某儒略日在哪些年号下（改元时可有两个）。 */
    eraAt(country, jdn) { const out = []; for (const e of this.eras(country)) { const m = (PACK.calendar.months[String(e[0])] || []).find((x) => jdn >= x[4] && jdn < x[4] + x[5]); if (m) out.push({ era: e, m, day: jdn - m[4] + 1 }); } return out; },
  };

  /* ================= 分词与对齐（复现 LangExtract 提交 3a68580 的规则） ================= */
  const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
  /* RegexTokenizer：字母串（Python 的 [^\W\d_]+，汉字假名也算字母）｜数字串｜单个符号。 */
  function tokRegex(text) {
    const out = []; const re = /[\p{L}\p{M}]+|\p{Nd}+|[^\s\p{L}\p{M}\p{Nd}]/gu; let m;
    while ((m = re.exec(text))) out.push({ t: m[0], s: m.index, e: m.index + m[0].length });
    return out;
  }
  /* UnicodeTokenizer 的要点：汉字、假名逐字成词元；其余字母串照旧。 */
  function tokUnicode(text) {
    const out = [];
    for (const t of tokRegex(text)) {
      if (CJK.test(t.t)) { let i = t.s; for (const ch of t.t) { if (CJK.test(ch)) out.push({ t: ch, s: i, e: i + ch.length }); else out.push({ t: ch, s: i, e: i + ch.length }); i += ch.length; } }
      else out.push(t);
    }
    return out;
  }
  const norm = (t) => { t = t.toLowerCase(); return t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t; };
  /* 源码 _best_lcs_spans：每个命中数 k 对应的最紧窗口。 */
  function lcsSpans(src, ext) {
    const n = src.length, m = ext.length; if (!n || !m) return {};
    let prev = Array.from({ length: m + 1 }, () => Array(m + 1).fill(-1)), cur = Array.from({ length: m + 1 }, () => Array(m + 1).fill(-1));
    for (let j = 0; j <= m; j++) prev[j][0] = 0;
    const best = {};
    for (let i = 1; i <= n; i++) {
      const tok = src[i - 1]; cur[0][0] = i; for (let k = 1; k <= m; k++) cur[0][k] = -1;
      for (let j = 1; j <= m; j++) {
        cur[j][0] = i; const hit = tok === ext[j - 1];
        for (let k = 1; k <= m; k++) {
          let b = Math.max(prev[j][k], cur[j - 1][k]);
          if (hit) b = Math.max(b, k === 1 ? i - 1 : prev[j - 1][k - 1]);
          cur[j][k] = b;
        }
      }
      for (let k = 1; k <= m; k++) { const s = cur[m][k]; if (s < 0) continue; const e = best[k]; const len = i - 1 - s + 1; if (!e || len < e.end - e.start + 1 || (len === e.end - e.start + 1 && s < e.start)) best[k] = { matches: k, start: s, end: i - 1 }; }
      [prev, cur] = [cur, prev];
    }
    return best;
  }
  /* 对齐一项抽取。精确阶段简化为“完整词元串的首次连续出现”；部分精确取抽取开头最长的连续命中；
   * 模糊阶段照源码：命中数 ≥ ceil(词元数×阈值)，且命中数／窗口长 ≥ 1/3。 */
  function align(source, extraction, { tokenizer = 'regex', threshold = 0.75, density = 1 / 3, lesser = true } = {}) {
    const T = tokenizer === 'unicode' ? tokUnicode : tokRegex;
    const S = T(source), E = T(extraction); const s = S.map((x) => norm(x.t)), e = E.map((x) => norm(x.t));
    const res = { srcTokens: S, extTokens: E, status: null, start: null, end: null, detail: '' };
    if (!e.length) { res.detail = '抽取文字没有词元'; return res; }
    const findRun = (arr) => { for (let i = 0; i + arr.length <= s.length; i++) { let ok = true; for (let k = 0; k < arr.length; k++) if (s[i + k] !== arr[k]) { ok = false; break; } if (ok) return i; } return -1; };
    let i = findRun(e);
    if (i >= 0) { Object.assign(res, { status: 'match_exact', start: S[i].s, end: S[i + e.length - 1].e, detail: `抽取的 ${e.length} 个词元在原文中连续出现（第 ${i + 1} 个词元起）` }); res.allExact = allRuns(s, e).map((k) => [S[k].s, S[k + e.length - 1].e]); return res; }
    if (lesser) for (let k = e.length - 1; k >= 1; k--) { i = findRun(e.slice(0, k)); if (i >= 0) { Object.assign(res, { status: 'match_lesser', start: S[i].s, end: S[i + k - 1].e, detail: `只有开头 ${k}／${e.length} 个词元连续出现（抽取比原文命中处长）` }); return res; } }
    const spans = lcsSpans(s, e); const need = Math.ceil(e.length * threshold - 1e-9);
    const ks = Object.keys(spans).map(Number).sort((a, b) => b - a);
    for (const k of ks) { const sp = spans[k]; const d = k / (sp.end - sp.start + 1); if (k >= need && d >= density) { Object.assign(res, { status: 'match_fuzzy', start: S[sp.start].s, end: S[sp.end].e, detail: `按序命中 ${k}／${e.length} 个词元（需要 ≥ ${need}），窗口密度 ${k}/${sp.end - sp.start + 1}=${d.toFixed(2)}（需要 ≥ 0.33）` }); return res; } }
    const top = ks.length ? spans[ks[0]] : null;
    res.detail = top ? `最多按序命中 ${ks[0]}／${e.length} 个词元，低于 ${need}：不对齐，位置为空` : '原文中没有任何词元命中：位置为空';
    return res;
  }
  function allRuns(s, e) { const out = []; for (let i = 0; i + e.length <= s.length; i++) { let ok = true; for (let k = 0; k < e.length; k++) if (s[i + k] !== e[k]) { ok = false; break; } if (ok) out.push(i); } return out; }

  /* ================= 证据表（D05、D28、D30 共用的数据） ================= */
  const EV_COLS = [
    ['text', '原文片段', '照录，不改字'], ['loc', '位置', '书名、卷、页；说明页码体系'], ['orig', '原值', '原文中的写法'], ['norm', '规范值', '规范写法与标识；可为空或 NIL'],
    ['kind', '判断类型', ''], ['reason', '理由', '为什么这样判断'], ['locsrc', '位置来源', ''], ['who', '处理人与日期', ''],
  ];
  const KINDS = ['直接记载', '推定', '不确定', '未见'];
  const LOCSRC = ['人工标出', '模型报告', '事后精确对齐', '事后模糊对齐'];
  const EV_DEFAULT = {
    dnsr: [{ text: '今日畠山尾州上洛云々、一万人計云々', loc: '『大日本史料』9-1，本文第 1 页（PDF 页序 29）；『後法成寺尚通公記』卷三，永正五年六月十四日条', orig: '畠山尾州', norm: '畠山尚順（NDL 典拠编号待查）', kind: '推定', reason: '“尾州”是以受领官（尾張守）的国名略称称人；编者括注“尚順”；同页上栏“畠山尚順上洛ス”', locsrc: '人工标出', who: '（填写者），2026-10-' }],
    songshi: [{ text: '熙寧三年，拜參知政事', loc: '《宋史》卷三一二《王珪传》（维基文库录文，待改中华书局点校本页码）', orig: '熙寧三年', norm: '1071-01-14（儒略历；据《續資治通鑑》卷六十八十二月丁卯）', kind: '推定', reason: '任命在熙宁三年十二月丁卯，农历十二月已入公历次年', locsrc: '人工标出', who: '（填写者），2026-10-' }],
  };
  const Evidence = {
    cols: EV_COLS, kinds: KINDS, locsrc: LOCSRC,
    rows(mat) { return store.get('w7-ev-' + mat, null) || JSON.parse(JSON.stringify(EV_DEFAULT[mat] || [])); },
    save(mat, rows) { store.set('w7-ev-' + mat, rows); document.dispatchEvent(new CustomEvent('w7-evidence', { detail: mat })); },
    reset(mat) { store.del('w7-ev-' + mat); document.dispatchEvent(new CustomEvent('w7-evidence', { detail: mat })); },
    csv(rows) { const q = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"'; return '﻿' + [EV_COLS.map((c) => q(c[1])).join(','), ...rows.map((r) => EV_COLS.map((c) => q(r[c[0]])).join(','))].join('\n'); },
    /* 证据表行反写成 TEI 片段（讲义 1.4：两种做法可以互相转换）。 */
    tei(rows) {
      const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const cert = { 直接记载: 'high', 推定: 'medium', 不确定: 'low', 未见: 'unknown' };
      const people = [];
      const body = rows.map((r, i) => {
        const id = 'p' + (i + 1); const t = String(r.text || ''); const o = String(r.orig || '');
        const k = o && t.includes(o) ? t.indexOf(o) : -1;
        if (o) people.push(`  <person xml:id="${id}">\n    <persName type="regularized">${x(r.norm)}</persName>\n    <persName type="variant">${x(o)}</persName>\n    <note>${x(r.reason)}</note>\n  </person>`);
        const tag = `<persName ref="#${id}" cert="${cert[r.kind] || 'unknown'}" resp="#editor">${x(o)}</persName>`;
        const seg = k >= 0 ? x(t.slice(0, k)) + tag + x(t.slice(k + o.length)) : x(t);
        return `<!-- ${x(r.loc)}；位置来源：${x(r.locsrc)} -->\n<p>${seg}</p>`;
      }).join('\n');
      return `<!-- 由证据表生成的 TEI 片段（教学用；外层 TEI 壳与 teiHeader 需另补）-->\n<div>\n${body}\n</div>\n<listPerson>\n${people.join('\n')}\n</listPerson>\n`;
    },
  };

  /* 合并页的旧页号（页表 aliases）：#D13 → D12、#D15 → D14。在 deck-container 读取 hash 之前改写。 */
  const ALIAS = {}; (window.Deck.DATA.pages || []).forEach((p) => (p.aliases || []).forEach((a) => { ALIAS[a] = p.id; }));
  const fixHash = () => { const h = location.hash.slice(1); if (ALIAS[h]) history.replaceState(null, '', '#' + ALIAS[h]); };
  fixHash(); window.addEventListener('hashchange', fixHash);

  window.W7 = { Pack, packGate, packBar, Cal, GZ, gzIndex, jdnFromGreg, jdnFromJul, gregFromJdn, julFromJdn, ymd, MONTH_NUM, tokRegex, tokUnicode, align, lcsSpans, Evidence };
  window.addEventListener('DOMContentLoaded', () => { Pack.init(); setTimeout(() => { packBar(); cbdbCite(); }, 0); });
})();
