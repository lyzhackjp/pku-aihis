/* 第十周页面组件（五）：第三批 D17、D18、D19、D20（课后进阶）｜候选，未经教师确认｜2026-11-18 */
(() => {
  'use strict';
  const { esc, register } = window.Deck;
  const W = window.W10, { L, Mat, Through, Lab, needPack, sourceBox } = W;
  const S = window.W10_STATIC;
  const fmt = (x, d = 3) => (x == null || Number.isNaN(x) ? '—' : String(Math.round(x * 10 ** d) / 10 ** d));
  const pct = (x) => (x == null || Number.isNaN(x) ? '—' : (Math.round(x * 1000) / 10) + '%');
  const T = () => Through.get();
  const arr = (k) => (T()[k] = T()[k] || []);

  /* ================= D17 LCS 小例表（扩充部分甲三 @fig-lcs） ================= */
  const LCS_A = '國ノ光ヲ爲セル', LCS_B = '厥ノ美ヲ濟セル';
  const split = (t, unit) => (unit === 'word' ? String(t).trim().split(/\s+/).filter(Boolean) : [...String(t).replace(/\s+/g, '')]);
  const MAXCELL = 16;
  class Lcs extends Lab {
    defaults() { return { a: LCS_A, b: LCS_B, unit: 'char', step: null }; }
    render() {
      const s = this.s, a = split(s.a, s.unit), b = split(s.b, s.unit);
      const big = a.length > MAXCELL || b.length > MAXCELL;
      const Lt = L.lcsTable(a, b), bt = L.lcsBacktrack(a, b, Lt);
      const onPath = new Set(bt.path.map(([i, j]) => i + ',' + j)), eq = new Set(bt.pairs.map(([i, j]) => (i + 1) + ',' + (j + 1)));
      const common = bt.pairs.map(([i]) => a[i]).join(s.unit === 'word' ? ' ' : '');
      // 两种模式都在表里同一串单位上算，异文与表一一对应
      const sep = s.unit === 'word' ? ' ' : '', OPZ = { replace: '改', delete: '删', insert: '增' };
      const fromOps = (ops) => { let n = 0, equal = 0; const variants = []; for (const [op, i1, i2, j1, j2] of ops) { if (op === 'equal') { equal += i2 - i1; continue; } variants.push({ variant_id: 'V' + String(++n).padStart(2, '0'), op: OPZ[op], a_text: a.slice(i1, i2).join(sep), b_text: b.slice(j1, j2).join(sep) }); } return { variants, stats: { equal, variants: variants.length } }; };
      const rl = fromOps(L.lcsOpcodes(a, b)), rd = fromOps(new L.SequenceMatcher(a, b).getOpcodes());
      const vt = (r) => (r.variants.length ? `<table class="items"><tr><th>#</th><th>类型</th><th>甲</th><th>乙</th></tr>${r.variants.map((v) => `<tr><td>${v.variant_id}</td><td>${v.op}</td><td>${esc(v.a_text) || '—'}</td><td>${esc(v.b_text) || '—'}</td></tr>`).join('')}</table>` : '<p class="sub">两行相同，没有异文。</p>');
      const sameOut = rl.variants.length === rd.variants.length && rl.variants.every((v, i) => v.a_text === rd.variants[i].a_text && v.b_text === rd.variants[i].b_text);
      const head = `<tr><th></th><th>∅</th>${b.map((x) => `<th>${esc(x)}</th>`).join('')}</tr>`;
      const rows = Lt.map((row, i) => `<tr><th>${i ? esc(a[i - 1]) : '∅'}</th>${row.map((v, j) => {
        const k = i + ',' + j, cls = [eq.has(k) ? 'eq' : '', onPath.has(k) ? 'path' : '', i && j && a[i - 1] === b[j - 1] ? 'same' : ''].filter(Boolean).join(' ');
        return `<td class="${cls}" title="${i && j ? (a[i - 1] === b[j - 1] ? `甲${i}＝乙${j}：左上 ${Lt[i - 1][j - 1]} ＋ 1` : `甲${i}≠乙${j}：取上 ${Lt[i - 1][j]}、左 ${Lt[i][j - 1]} 的较大者`) : '边界为 0'}">${v}</td>`;
      }).join('')}</tr>`).join('');
      this.out(`<div class="w9-toolbar"><label>甲 <input data-o="a" value="${esc(s.a)}" size="22"></label>　<label>乙 <input data-o="b" value="${esc(s.b)}" size="22"></label>
          　单位 <label><input type="radio" name="d17u" data-o="unit" value="char" ${s.unit === 'char' ? 'checked' : ''}>字</label> <label><input type="radio" name="d17u" data-o="unit" value="word" ${s.unit === 'word' ? 'checked' : ''}>词（以空格分）</label>
          　<button class="small" data-x="kuni">把乙的"厥"改成"國"</button> <button class="small" data-x="reset">还原讲义小例</button></div>
        <div class="w9-two"><section class="w9-col"><header><b>LCS 表（页面实时计算）</b>　行为甲、列为乙</header>
          ${big ? `<p class="nil">每行超过 ${MAXCELL} 个单位，表太大，只给结果不画表。</p>` : `<div class="w10-lcs-wrap"><table class="w10-lcs">${head}${rows}</table></div>`}
          <p class="w10-sum"><b>右下角 ＝ ${bt.length}</b>：公共子序列"${esc(common) || '（空）'}"；甲 ${a.length}、乙 ${b.length} 个单位。</p>
          <p class="sub">递推：L[i][j] ＝ 0（i＝0 或 j＝0）；＝ L[i−1][j−1]＋1（甲<sub>i</sub>＝乙<sub>j</sub>）；否则 ＝ max(L[i−1][j], L[i][j−1])。浅色格：两字相等；<span class="w10-lcs-key path">框线</span>：回溯经过的格；<span class="w10-lcs-key eq">深色</span>：回溯时取用的"相等"格。<b>回溯平局先退上</b>（本课约定；换成先退左，公共子序列长度不变，但可能取到另一串，异文的切法也可能不同）。鼠标停在格上看这一格怎样算。</p></section>
        <section class="w9-col"><header><b>读出异文：两种程序并排</b></header>
          <p><b>LCS 模式</b>（相同 ${rl.stats.equal}，异文 ${rl.stats.variants} 处）</p>${vt(rl)}
          <p><b>difflib 兼容模式</b>（Ratcliff–Obershelp；相同 ${rd.stats.equal}，异文 ${rd.stats.variants} 处）</p>${vt(rd)}
          <p class="sub">${sameOut ? '这两行上两种模式结果相同。' : '<b>这两行上两种模式结果不同</b>：difflib 先找最长的相连片段再向两侧递归，不保证得到最长的公共子序列。'}对齐是确定的：同样的输入、同样的设置，重算多少次都一样。</p></section></div>
        <details><summary>移位：LCS 为什么把"挪动"算成一删一增（示意，教学构造）</summary>
          ${(() => { const x = fromOps(L.lcsOpcodes([...'一旦緩急アレハ義勇公ニ奉シ'], [...'義勇公ニ奉シ一旦緩急アレハ'])); return `<p>示意用的两行是本页自拟的（把"一旦緩急アレハ"挪到句后），不是任何一份草稿的原文：<br>甲 一旦緩急アレハ義勇公ニ奉シ<br>乙 義勇公ニ奉シ一旦緩急アレハ</p><p>LCS 模式实算：相同 ${x.stats.equal}，异文 ${x.stats.variants} 处——${x.variants.map((v) => `${v.op}"${esc(v.a_text || v.b_text)}"`).join('、')}。一段文字整体挪了位置，LCS 只能认出其中顺序不变的一边，另一边成了一删一增。</p><p class="sub">CollateX 可选 <code>detect_transpositions=True</code> 把这种情形认作"移位"；本页不实现移位检测。勅語各稿中"一旦緩急アレハ"一句的位置变动，扩充部分甲三据麻尾 2014 浏览所见，未逐稿核对。</p>`; })()}</details>`);
    }
    onChange(e) { const t = e.target; if (t.dataset.o) this.set({ [t.dataset.o]: t.value }); }
    onClick(e) { const x = e.target.dataset.x; if (x === 'kuni') this.set({ b: this.s.b.replace('厥', '國') }); if (x === 'reset') this.set({ a: LCS_A, b: LCS_B, unit: 'char' }); }
  }
  register('lcs-lab', Lcs);

  /* ================= D18 TEI 校勘记（扩充部分甲四） ================= */
  const TEI_PRESETS = {
    ems: { label: '埃姆斯两本（两本，不立底本）', a: 'ems-a', b: 'ems-b', unit: 'word', wits: [{ id: 'A', label: '阿贝肯原电，埃姆斯，1870-07-13（GHDI 德文页）' }, { id: 'B', label: '俾斯麦改定的新闻稿，1870-07-13（同上）' }], lemmas: ['', 'A', 'B'] },
    inoue: { label: '井上初稿（海後复原）对勅語成文', a: 'inoue-kaigo-draft', b: 'chokugo-seibun', unit: 'char', wits: [{ id: 'K', label: '井上毅草案（海後宗臣所定初稿，除去墨笔添改的复原）' }, { id: 'S', label: '教育勅語成文，1890-10-30' }], lemmas: ['', 'S'] },
  };
  function teiDoc(frag, preset, nlabels) {
    const m = frag.match(/^<listWit>[\s\S]*?<\/listWit>\n/), lw = m ? m[0] : '';
    const ig = (frag.match(/<interpGrp[\s\S]*?<\/interpGrp>\n/) || [''])[0];
    const body = frag.replace(lw, '').replace(ig, '');
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- 候选，未经教师确认。第十周 D18 导出（页面实时格式转换）；未用 TEI 模式验证。对齐：程序（${preset.unit === 'word' ? '词与标点' : '字'}为单位，不归一）；类别由使用者标注 ${nlabels} 处。 -->
<TEI xmlns="http://www.tei-c.org/ns/1.0">
<teiHeader>
<fileDesc>
<titleStmt><title>${esc(preset.label)}：校勘记（练习）</title></titleStmt>
<publicationStmt><p>课程练习文件，不公开发布。</p></publicationStmt>
<sourceDesc>
${lw.trim()}
</sourceDesc>
</fileDesc>
<encodingDesc>
<variantEncoding method="parallel-segmentation" location="internal"/>
</encodingDesc>
${ig.trim()}
</teiHeader>
<text><body>
${body.trim()}
</body></text>
</TEI>
`;
  }
  class Tei extends Lab {
    defaults() { return { preset: 'ems', lemma: '', labels: {}, cats: S.emsCategories.map(([id, label]) => ({ id, label, definition: '' })), newId: '', newLabel: '' }; }
    render() {
      const s = this.s, P = TEI_PRESETS[s.preset], A = Mat.text(P.a), B = Mat.text(P.b);
      if (!A || !B) { this.out(this.bar() + needPack(P.label + '（井上草案录文教师 2026-11-16 定为只进本机材料包）')); return; }
      const res = L.align(A, B, { unit: P.unit, algorithm: 'difflib' });
      const labels = s.labels[s.preset] || {};
      const defined = new Set(s.cats.map((c) => c.id));
      const undef = [...new Set(Object.values(labels).filter((v) => v && !defined.has(v)))];
      const unlabeled = res.variants.filter((v) => !labels[v.variant_id]).length;
      const frag = L.toTEI(res, A, P.wits, { lemma: s.lemma || null, categories: s.cats.map((c) => ({ id: c.id, label: c.definition ? `${c.label}：${c.definition}` : c.label })), labels });
      this._doc = teiDoc(frag, P, res.variants.length - unlabeled);
      const warn = [];
      if (undef.length) warn.push(`类别 ${undef.join('、')} 已用而未在 &lt;interpGrp&gt; 中定义`);
      if (s.cats.some((c) => !/^[A-Za-z_][\w.-]*$/.test(c.id))) warn.push('类别 id 须是合法的 xml:id（字母开头，不含空格与汉字）');
      if (!P.wits.every((w) => frag.includes(`xml:id="${w.id}"`))) warn.push('本子未在 &lt;listWit&gt; 中声明');
      if (s.lemma && s.preset === 'ems') warn.push('埃姆斯两本地位不同（一为内部报告，一为公开文本），扩充部分甲四不立底本；这里立底本只为看 &lt;lem&gt; 的写法');
      const teiHtml = esc(frag).replace(/n="(V\d+)"/g, (m0, v) => `n="<a href="#d18-${v}" data-jump="${v}">${v}</a>"`);
      const fromD09 = Through.pageState('D09').mine || {};
      this.out(`${this.bar()}
        <p class="w10-sum"><b>对齐（页面实时计算）</b>：异文 ${res.stats.variants} 处；已定类 ${res.variants.length - unlabeled} 处，未定 ${unlabeled} 处。${warn.length ? `<br><b class="nil">提示：</b>${warn.join('；')}。` : '<span class="ok">　本子已声明，所用类别都已定义。</span>'}</p>
        <div class="w9-two"><section class="w9-col"><header><b>表格视图</b>　<label>底本 &lt;lem&gt; <select data-o="lemma">${P.lemmas.map((l) => `<option value="${l}" ${l === s.lemma ? 'selected' : ''}>${l ? P.wits.find((w) => w.id === l).label.slice(0, 14) + '…' : '不立底本（都作 rdg）'}</option>`).join('')}</select></label>
          ${s.preset === 'ems' && Object.keys(fromD09).length ? '<button class="small" data-x="d09">取 D09 中我的分类</button>' : ''}</header>
          <div class="w10-scroll"><table class="items w10-vtab"><tr><th>#</th><th>类型</th><th>${P.wits[0].id}</th><th>${P.wits[1].id}</th><th>原文位置（${P.wits[0].id}／${P.wits[1].id}，字符下标）</th><th>类别</th></tr>
          ${res.variants.map((v) => `<tr id="d18-${v.variant_id}" class="${s._hi === v.variant_id ? 'w10-mine' : ''}"><td>${v.variant_id}</td><td>${v.op}</td><td>${esc(v.a_text) || '—'}</td><td>${esc(v.b_text) || '—'}</td><td class="sub">${v.a_span ? v.a_span.join('—') : '—'}／${v.b_span ? v.b_span.join('—') : '—'}</td>
            <td><select data-lab="${v.variant_id}"><option value=""></option>${s.cats.map((c) => `<option value="${esc(c.id)}" ${labels[v.variant_id] === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></td></tr>`).join('')}</table></div>
          <details><summary>类别表（写进 &lt;interpGrp type="transcriptional"&gt;）</summary><table class="items"><tr><th>id</th><th>名称</th><th>定义</th><th></th></tr>${s.cats.map((c, i) => `<tr><td><code>${esc(c.id)}</code></td><td><input data-cat="${i}" data-f="label" value="${esc(c.label)}"></td><td><input data-cat="${i}" data-f="definition" value="${esc(c.definition || '')}" placeholder="写下这一类的界定"></td><td><button class="small" data-x="delcat" data-i="${i}">删</button></td></tr>`).join('')}
            <tr><td><input data-o="newId" value="${esc(s.newId)}" placeholder="Order" size="8"></td><td><input data-o="newLabel" value="${esc(s.newLabel)}" placeholder="词序变动"></td><td></td><td><button class="small" data-x="addcat">加</button></td></tr></table>
            <p class="sub">四类是讲义 3.3 课前记录所用的四类（扩充部分甲四）；"定义"一栏导出时写入 &lt;interp&gt; 文字之后。删去一类而表格里仍在用，页面会提示"未定义"。</p></details></section>
        <section class="w9-col"><header><b>TEI 视图</b>（平行分段；随左表即时更新）　<button class="small" data-x="export">导出 .xml</button></header>
          <pre class="w10-tei">${teiHtml}</pre>
          <p class="sub">点 &lt;app&gt; 的编号，回到左表那一行（行内有两本的原文位置）。空的 &lt;rdg wit="#A"/&gt; 表示该本此处无文字。导出文件把 &lt;listWit&gt; 放在 &lt;sourceDesc&gt;、&lt;interpGrp&gt; 放在 &lt;teiHeader&gt; 内；后者是按扩充部分甲四"在文件头里先定义类别"的说法放的，Rdgai 是否接受这一位置、整份文件能否通过 TEI 模式验证，<b>本页都未测</b>。</p></section></div>`);
      this._res = res;
    }
    bar() { const s = this.s; return `<div class="w9-toolbar"><b>对齐结果</b> ${Object.entries(TEI_PRESETS).map(([k, p]) => `<label><input type="radio" name="d18p" data-o="preset" value="${k}" ${s.preset === k ? 'checked' : ''}>${esc(p.label)}</label>`).join(' ')}　<span class="sub">两例：V16 增"vom Dienst"、V19 改"zu sagen"→"mitzuteilen"，对照扩充部分甲四的示例。</span></div>`; }
    onChange(e) {
      const t = e.target, s = this.s;
      if (t.dataset.lab) { const all = { ...s.labels }, cur = { ...(all[s.preset] || {}) }; if (t.value) cur[t.dataset.lab] = t.value; else delete cur[t.dataset.lab]; all[s.preset] = cur; return this.set({ labels: all }); }
      if (t.dataset.cat != null) { const cats = s.cats.map((c) => ({ ...c })); cats[+t.dataset.cat][t.dataset.f] = t.value; return this.set({ cats }); }
      if (t.dataset.o) { const v = t.value; if (t.dataset.o === 'preset') return this.set({ preset: v, lemma: '' }); this.set({ [t.dataset.o]: v }, { redraw: !['newId', 'newLabel'].includes(t.dataset.o) }); }
    }
    onClick(e) {
      const t = e.target, x = t.dataset.x, s = this.s;
      if (t.dataset.jump) { e.preventDefault(); this.set({ _hi: t.dataset.jump }); this.querySelector('#d18-' + t.dataset.jump)?.scrollIntoView({ block: 'center' }); return; }
      if (x === 'export') window.Deck.download(`w10-${s.preset}.tei.xml`, this._doc, 'application/xml');
      if (x === 'addcat') { const id = (s.newId || '').trim(); if (!id || s.cats.some((c) => c.id === id)) return W.toast('id 为空或重复'); this.set({ cats: [...s.cats, { id, label: s.newLabel || id, definition: '' }], newId: '', newLabel: '' }); }
      if (x === 'delcat') this.set({ cats: s.cats.filter((_, i) => i !== +t.dataset.i) });
      if (x === 'd09') { const mine = Through.pageState('D09').mine || {}, byLabel = new Map(s.cats.map((c) => [c.label, c.id])); const cur = {}; for (const [v, lab] of Object.entries(mine)) if (byLabel.has(lab)) cur[v] = byLabel.get(lab); this.set({ labels: { ...s.labels, ems: cur } }); W.toast(`取来 ${Object.keys(cur).length} 处`); }
    }
  }
  register('tei-lab', Tei);

  /* ================= D19 最小对计分（扩充部分甲一） ================= */
  const NOCHA = [
    ['按对计分', '一对里两句（一真一假，只差一处）都判对，才算这一对答对'],
    ['当时最好的模型', 'GPT-4o 55.8%；开放权重模型都低于随机基线 25%'],
    ['证据范围', '只需一两句 12.4%，需一个较长段落 39.7%，需综合全书 47.9%；前一类明显好于后一类'],
    ['与"大海捞针"', '同一模型在大海捞针上近乎满分，在 NoCha 只需一句证据的题上只有 59.8%'],
    ['新书', '所选小说为测试前一两年新出版，防止模型凭"记得"作答；排行榜最后更新 2025-07-18'],
  ];
  const SCOPES = [['sentence', '只需找一句'], ['passage', '需读一段'], ['global', '需前后对照']];
  function shuffled(n, seed) { const a = [...Array(n).keys()]; let x = seed || 1; for (let i = n - 1; i > 0; i--) { x = (x * 1103515245 + 12345) % 2147483648; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  class Truth extends Lab {
    defaults() { return { k: 2, strat: 'random', flips: 0, pairHits: 0, sentHits: 0, sents: 0, demo: null, doc: '', okSend: false, pairs: SCOPES.map(([sc], i) => ({ pair_id: 'P' + (i + 1), scope: sc, claim_true: '', claim_false: '', evidence_ref: '' })), seed: 7, preset: 'deepseek', verdicts: {}, runId: null, vsrc: '' }; }
    sentences() { const s = this.s, list = []; s.pairs.forEach((p, i) => { if (p.claim_true.trim()) list.push({ pi: i, truth: true, text: p.claim_true.trim() }); if (p.claim_false.trim()) list.push({ pi: i, truth: false, text: p.claim_false.trim() }); }); const ord = shuffled(list.length, s.seed); return ord.map((k) => list[k]); }
    score() {
      const s = this.s, sents = this.sentences(); let sOk = 0, sN = 0; const byPair = {};
      sents.forEach((x, n) => { const v = s.verdicts[n + 1]; if (v == null) return; sN++; const ok = (v === '真') === x.truth; if (ok) sOk++; (byPair[x.pi] = byPair[x.pi] || []).push(ok); });
      const full = s.pairs.map((p, i) => ({ id: p.pair_id, n: (byPair[i] || []).length, need: (p.claim_true.trim() ? 1 : 0) + (p.claim_false.trim() ? 1 : 0), all: (byPair[i] || []).every(Boolean) }));
      const done = full.filter((p) => p.need === 2 && p.n === 2);
      return { sOk, sN, pairOk: done.filter((p) => p.all).length, pairN: done.length, full };
    }
    render() {
      const s = this.s, base = 1 / 2 ** s.k, sents = this.sentences(), sc = this.score(), live = W.Model.state().mode === 'live';
      const ready = s.pairs.every((p) => p.claim_true.trim() && p.claim_false.trim());
      const run = s.runId ? T().runs.find((r) => r.run_id === s.runId) : null;
      const demo = s.demo;
      this.out(`<div class="w9-two"><section class="w9-col"><header><b>NoCha 的设计（Karpinska 等 2024）</b></header><table class="items">${NOCHA.map(([a, b]) => `<tr><td><b>${a}</b></td><td>${esc(b)}</td></tr>`).join('')}</table>
          <p class="sub">数字据扩充部分甲一（arXiv 第 3 版正文，2026-11-16 经工具读前四成；排行榜 2026-11-16 查看）。中段遗失（Liu 等）与上下文衰减（Chroma）两项的"变什么、不变什么"见 D02。反过来看本讲：稲田 1971、茅海建 2002 模型训练时很可能读过，演示①"不给材料"那一次它可能"记得"一些东西。</p></section>
        <section class="w9-col"><header><b>随机基线：为什么按对计分随手猜只有 25%</b>（实际计算；页面代掷硬币）</header>
          <p>每对 <select data-o="k"><option ${s.k == 2 ? 'selected' : ''}>2</option><option ${s.k == 3 ? 'selected' : ''}>3</option></select> 句，全部判对才算这一对答对。　答法 <label><input type="radio" name="d19s" data-o="strat" value="random" ${s.strat === 'random' ? 'checked' : ''}>随手猜</label> <label><input type="radio" name="d19s" data-o="strat" value="allTrue" ${s.strat === 'allTrue' ? 'checked' : ''}>一律答"真"</label></p>
          <p class="w10-sum">按对计分的基线 ＝ ${s.strat === 'random' ? `(1/2)<sup>${s.k}</sup> ＝ <b>${fmt(base)}</b>` : '<b>0</b>（每对里总有假句）'}；按句计分 ＝ ${s.strat === 'random' ? '0.5' : `<b>${fmt(1 / s.k)}</b>（每对 1 真 ${s.k - 1} 假）`}。</p>
          <p><button class="small" data-x="four">先随手勾四对</button> <button class="small" data-x="flip">再掷 100 对</button> <button class="small" data-x="reset">清零</button></p>
          ${demo ? `<table class="items"><tr><th>对</th>${[...Array(s.k).keys()].map((i) => `<th>${i ? '假句' + (s.k > 2 ? i : '') : '真句'}</th>`).join('')}<th>这一对</th></tr>${demo.map((row, i) => `<tr><td>${i + 1}</td>${row.map((ok) => `<td class="${ok ? 'ok' : 'nil'}">${ok ? '✓' : '✗'}</td>`).join('')}<td>${row.every(Boolean) ? '<b class="ok">全对</b>' : '—'}</td></tr>`).join('')}</table>` : ''}
          <p>累计 ${s.flips} 对：按对 ${s.pairHits}/${s.flips} ＝ <b>${s.flips ? fmt(s.pairHits / s.flips) : '—'}</b>；按句 ${s.sentHits}/${s.sents} ＝ <b>${s.sents ? fmt(s.sentHits / s.sents) : '—'}</b></p>
          <p class="sub">掷硬币是页面里的随机模拟，说明基线从哪里来，不是任何模型的成绩。"一律答真"一项说明按对计分的用意：凭表面线索一律答"真"，按句能拿到一半，按对一分不得。</p></section></div>
        <section class="w9-col"><header><b>自己出三对题</b>（课后；学生题为实际调用，或网页版回答手录）</header>
          <p class="sub">仿照 NoCha，为自己读过的一篇论文写三对真假句：一对只需找一句，一对需要读一段，一对需要前后对照。每对两句只差一处。三对题不能说明模型的能力，只让人看清"需要综合的判断"难在哪里。</p>
          <table class="items"><tr><th>对</th><th>证据范围</th><th>真句</th><th>假句（只差一处）</th><th>证据出处（页码）</th></tr>${s.pairs.map((p, i) => `<tr><td>${p.pair_id}</td><td>${esc(SCOPES.find((x) => x[0] === p.scope)[1])}</td>${['claim_true', 'claim_false', 'evidence_ref'].map((f) => `<td><textarea rows="2" data-pair="${i}" data-f="${f}">${esc(p[f])}</textarea></td>`).join('')}</tr>`).join('')}</table>
          <p>文献全文（只存在本浏览器；送模型前确认）<br><textarea data-o="doc" rows="4" style="width:100%" placeholder="贴入你的文献全文或所需部分">${esc(s.doc)}</textarea><span class="sub">${s.doc ? `${s.doc.replace(/\s/g, '').length.toLocaleString()} 字` : ''}</span></p>
          <p><label><input type="checkbox" data-o="okSend" ${s.okSend ? 'checked' : ''}> 这段文字我有权送给所选模型服务（他人未刊稿、受限录文不要贴）</label>　模型 <select data-o="preset">${['deepseek', 'kimi'].map((p) => `<option value="${p}" ${p === s.preset ? 'selected' : ''}>${esc(W.PRESET_LABEL[p])}</option>`).join('')}</select>
            <button class="small" data-x="call" ${ready && s.doc && s.okSend && live ? '' : 'disabled'}>现场调用</button> <span class="sub">${!ready ? '三对题写全后才能出题；' : ''}${live ? '' : '需切到现场调用（顶栏"模型接入"）；'}也可以把下面"出给模型的题"整段贴到网页版，回来手录判断。</span></p>
          ${ready ? `<details ${run || Object.keys(s.verdicts).length ? 'open' : ''}><summary>出给模型的题（六句已打乱，次序固定可复现）　<button class="small" data-x="reseed">换一种次序</button></summary>
            <table class="items"><tr><th>#</th><th>句子</th><th>模型判</th><th>答案</th></tr>${sents.map((x, n) => { const v = s.verdicts[n + 1]; return `<tr><td>${n + 1}</td><td>${esc(x.text)}</td><td>${['真', '假'].map((t) => `<label><input type="radio" name="d19v${n}" data-v="${n + 1}" value="${t}" ${v === t ? 'checked' : ''}>${t}</label>`).join(' ')}</td><td class="sub">${v ? ((v === '真') === x.truth ? '<span class="ok">对</span>' : '<b class="nil">错</b>') : ''}（${x.truth ? '真' : '假'}，${s.pairs[x.pi].pair_id}）</td></tr>`; }).join('')}</table>
            <p class="w10-sum"><b>计分（实际计算）</b>：按句 ${sc.sOk}/${sc.sN} ＝ ${sc.sN ? pct(sc.sOk / sc.sN) : '—'}；<b>按对 ${sc.pairOk}/${sc.pairN} ＝ ${sc.pairN ? pct(sc.pairOk / sc.pairN) : '—'}</b>；${sc.full.map((p) => `${p.id}${p.n === 2 ? (p.all ? ' 全对' : ' 未全对') : ' 未判全'}`).join('，')}。判断来源：${run ? W.badge(run) : s.vsrc ? esc(s.vsrc) : '尚无'}。<button class="small" data-x="save">记入贯穿记录</button></p>
            ${run ? `<details><summary>模型原回答</summary><div class="w9-reply">${esc(run.reply || run.error)}</div></details>` : ''}</details>` : ''}</section>`);
    }
    prompt() {
      return '下面是一篇文献。\n\n{{material:d19-doc}}\n\n请只依据上面的文献，逐句判断下列说法是真是假。每句单独判断，不必解释；每行只写"编号. 真"或"编号. 假"。\n\n' + this.sentences().map((x, n) => `${n + 1}. ${x.text}`).join('\n');
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.pair != null) { const pairs = this.s.pairs.map((p) => ({ ...p })); pairs[+t.dataset.pair][t.dataset.f] = t.value; return this.set({ pairs, verdicts: {}, runId: null, vsrc: '' }); }
      if (t.dataset.v) return this.set({ verdicts: { ...this.s.verdicts, [t.dataset.v]: t.value }, vsrc: this.s.runId ? this.s.vsrc : '手录（网页版或其他）' });
      if (t.dataset.o === 'okSend') return this.set({ okSend: t.checked });
      if (t.dataset.o) { const v = t.dataset.o === 'k' ? +t.value : t.value; this.set({ [t.dataset.o]: v, ...(['k', 'strat'].includes(t.dataset.o) ? { flips: 0, pairHits: 0, sentHits: 0, sents: 0, demo: null } : {}) }); }
    }
    flip(n) {
      const s = this.s, rows = [];
      for (let i = 0; i < n; i++) rows.push([...Array(s.k).keys()].map((j) => (s.strat === 'allTrue' ? j === 0 : Math.random() < 0.5)));
      return { rows, pairHits: rows.filter((r) => r.every(Boolean)).length, sentHits: rows.flat().filter(Boolean).length, sents: n * s.k };
    }
    async onClick(e) {
      const x = e.target.dataset.x, s = this.s;
      if (x === 'four' || x === 'flip') { const r = this.flip(x === 'four' ? 4 : 100); this.set({ demo: x === 'four' ? r.rows : s.demo, flips: s.flips + r.rows.length, pairHits: s.pairHits + r.pairHits, sentHits: s.sentHits + r.sentHits, sents: s.sents + r.sents }); }
      if (x === 'reset') this.set({ flips: 0, pairHits: 0, sentHits: 0, sents: 0, demo: null });
      if (x === 'reseed') this.set({ seed: s.seed + 1, verdicts: {}, runId: null, vsrc: '' });
      if (x === 'call') {
        const card = { card_id: 'D19PAIRS', title: '学生自出真假句', materials: [{ entry_id: 'd19-doc' }], user_template: this.prompt(), settings: {} };
        const tmp = { id: 'd19-doc', text: s.doc, sendable: true, title: '学生自贴文献（学生确认可送出）' };
        T().packs.push({ id: 'pack-d19', title: '临时', entries: [tmp] });
        try {
          const run = await W.Model.call(card, s.preset);
          const v = {}; for (const m of String(run.reply || '').matchAll(/(\d+)\s*[.．、:：)）]?\s*[“"「]?\s*(真|假)/g)) if (!v[m[1]]) v[m[1]] = m[2];
          this.set({ runId: run.run_id, verdicts: v, vsrc: '' });
          if (run.error) W.toast('调用失败：' + run.error); else if (Object.keys(v).length < this.sentences().length) W.toast(`只解析出 ${Object.keys(v).length} 句判断，其余请对照原回答手录`);
        } catch (err) { W.toast(String(err.message || err)); }
        finally { T().packs = T().packs.filter((p) => p.id !== 'pack-d19'); Through.save(); }
      }
      if (x === 'save') {
        const sc = this.score();
        for (const p of s.pairs) Through.add('truthpairs', { ...p, result: sc.full.find((f) => f.id === p.pair_id), run_id: s.runId, verdict_source: s.runId ? 'live' : s.vsrc || null, date: new Date().toISOString() }, 'pair_id');
        W.toast(`已记入：按对 ${sc.pairOk}/${sc.pairN}，按句 ${sc.sOk}/${sc.sN}`);
      }
    }
  }
  register('truth-lab', Truth);

  /* ================= D20 《教育勅語》逐稿与初稿之争（扩充部分乙一） ================= */
  // 静态：只用扩充部分乙一已写明的内容；逐稿的草案表须教师或助教据原书整理后导入（本页不编造稿数、日期与排序）
  const SYSTEMS = [
    { id: '中村', who: '中村正直', text: '草案 6 月 10 日前后提交文部大臣，后被搁置。' },
    { id: '元田', who: '元田永孚', text: '以 6 月 17 日的"教育大旨"案为起点，有原案、修正案与再修正案。' },
    { id: '井上', who: '井上毅', text: '草案数量最多，海後编号至井上草案二十三（目次）；麻尾一览列井上系 68 份（含同文抄本）；多数没有日期，海後"修正過程の分析によって比較し、前後の関係を明らかにする"排定先后。成文以井上稿为底本，经元田往复修正，再经文部、内阁与天皇几轮修改而成。' },
  ];
  const CLAIMS = {
    kaigo: { who: '海後宗臣', first: '井上文书中写在法制局十行罫纸上的一份（海後书中所印为除去墨笔修改的复原；讲义 3.1 对齐图所用即此）',
      why: ['用纸与 6 月 20 日致山県书翰相同', '井上自笔', '本文比较居最早', '山県转送芳川的初稿与此"全く同じ"，只有三处删除订正'], ref: '海後宗臣『教育勅語成立史研究』（著作集第十巻，1981）目次与第 368—371 页' },
    inada: { who: '稲田正次', first: '芳川顕正文书中写在内阁罫纸上的一份，开头作"我カ祖我カ宗國ヲ肇ムルコト久遠ニ……"；海後所定那一份，稲田称"井上の次稿"',
      why: ['井上 6 月底把初稿送元田征求意见，元田 6 月 29 日的修正案（元田文书）多处看得出是照着芳川文书这一份改的', '几份草案逐句比较，这一份处在最早的位置', '对海後所举各条逐条讨论，认为不足以证明海後那一份就是初稿（第 199—200 页的论证只读了要点）'], ref: '稲田正次『教育勅語成立過程の研究』（講談社，1971）第 198—200 页' },
    asao: { who: '麻尾陽子', first: '以芳川文书本为"草案一"，海後所定初稿为"草案二"——在这一点上从稲田',
      why: ['逐稿重排井上草案（所排数目据浏览所见，未逐一点数）', '"草案二"录文与海後复原本有出入（无"山海八道"一句、作"凡ソ古今"等），可能录的是墨笔修改后的状态，待查（B-07）'], ref: '麻尾陽子《教育勅語の成立——草案の推敲過程を中心に》（中央大学博士论文，2014）序章与第二章第二节' },
  };
  const BASIS = { dated: ['有日期', 'b-dated'], inferred: ['推定', 'b-inferred'], none: ['无', 'b-none'] };
  const ORDERS = [['order_kaigo', '海後'], ['order_inada', '稲田'], ['order_asao', '麻尾']];
  const normBasis = (v) => { v = String(v || '').trim(); return /^(dated|有|有日期)/i.test(v) ? 'dated' : /^(inferred|推)/i.test(v) ? 'inferred' : /^(none|无|無)/i.test(v) ? 'none' : v || 'none'; };
  class Drafts extends Lab {
    defaults() { return { claim: 'kaigo', order: 'order_kaigo', pick: null, hideUnranked: true, dedupe: true }; }
    meta() { return W.Mat.state().drafts || null; }
    rows() { const own = [...((this.meta() && this.meta().rows) || []), ...(T().drafts || [])]; const imp = (T().page_state.imports || []).filter((x) => x.kind === 'drafts').flatMap((x) => x.rows); return [...own, ...imp].map((r) => ({ ...r, date_basis: normBasis(r.date_basis) })); }
    render() {
      const s = this.s, rows = this.rows(), c = CLAIMS[s.claim];
      const pick = rows.find((r) => r.draft_id === s.pick);
      const lane = (sys) => {
        const rs = rows.filter((r) => String(r.system).includes(sys));
        if (!rs.length) return '<p class="sub">（草案表未载入）</p>';
        const ord = (r) => { const v = parseInt(r[s.order], 10); return Number.isNaN(v) ? null : v; };
        let listed = rs.filter((r) => ord(r) != null).sort((a, b) => ord(a) - ord(b)); const rest = rs.filter((r) => ord(r) == null);
        const copies = {}; if (s.dedupe) { const seen = new Map(); listed = listed.filter((r) => { const k = ord(r); if (seen.has(k)) { copies[seen.get(k)] = (copies[seen.get(k)] || 0) + 1; return false; } seen.set(k, r.draft_id); return true; }); }
        const DISPUTE = ['井上草案一', '井上草案二'];
        return `<div class="w10-lane">${listed.map((r) => `<button class="w10-node ${BASIS[r.date_basis]?.[1] || ''} ${r.draft_id === s.pick ? 'on' : ''}" data-draft="${esc(r.draft_id)}" title="${esc(r.date_raw || '')}" style="${DISPUTE.includes(r.draft_id) ? 'border:2px solid #b5651d' : ''}">${ord(r)}. ${esc(r.draft_id.replace(/^(中村|元田|井上)草案/, '$1'))}${copies[r.draft_id] ? `<sup>+${copies[r.draft_id]}</sup>` : ''}</button>`).join('<span class="w10-arrow">→</span>')}${rest.length && !s.hideUnranked ? `<span class="sub">　此家未排：${rest.map((r) => `<button class="w10-node ${BASIS[r.date_basis]?.[1] || ''}" data-draft="${esc(r.draft_id)}">${esc(r.draft_id)}</button>`).join(' ')}</span>` : ''}</div>`;
      };
      const kd = Mat.text('inoue-kaigo-draft'), sb = Mat.text('chokugo-seibun');
      const kv = kd && sb ? L.align(kd, sb, { unit: 'char' }).stats : null;
      this.out(`<div class="w9-two"><section class="w9-col"><header><b>三个系统</b>（海後的分法）　排序 ${ORDERS.map(([k, n]) => `<label><input type="radio" name="d20o" data-o="order" value="${k}" ${s.order === k ? 'checked' : ''}>${n}</label>`).join(' ')}　<label><input type="checkbox" data-o="dedupe" ${s.dedupe ? 'checked' : ''}>同位次的抄本并成一格</label> <label><input type="checkbox" data-o="hideUnranked" ${s.hideUnranked ? 'checked' : ''}>隐去此家未排的稿</label></header>
          ${this.meta() ? `<details><summary>草案表的来源与三种次序怎样排的（<b>${esc(this.meta().status)}</b>）</summary><p class="sub">草案表：${esc(this.meta().basis)}<br>${ORDERS.map(([k, n]) => `${n}次序——${esc(this.meta().orders[k])}`).join('<br>')}<br>日期依据——${esc(this.meta().date_rule)}</p></details>` : ''}
          ${SYSTEMS.map((x) => `<div class="w10-tcard"><b>${x.id}系（${x.who}）</b><p class="sub">${esc(x.text)}</p>${lane(x.id)}</div>`).join('')}
          <p class="sub">日期依据：<span class="w10-node b-dated">有日期</span> <span class="w10-node b-inferred">推定</span> <span class="w10-node b-none">无</span>　点一稿看它的日期依据与出处。</p>
          ${rows.length ? '' : `<p class="w10-need"><b>缺：草案表</b>（draft_id, system, author, date_raw, date_basis, paper, holder, source_ref, order_kaigo, order_inada, order_asao）。须教师或助教据海後目次、稲田、麻尾逐稿整理；本页不编造稿数、日期与排序。整理好后用 <button class="small" data-x="imp">导入表格（类型：草案表）</button> 载入，或 <button class="small" data-x="tpl">下载空表头</button>。</p>`}
          ${pick ? `<div class="w10-tcard"><b>${esc(pick.draft_id)}</b>（${esc(pick.system)}系${pick.author ? '，' + esc(pick.author) : ''}）<p>日期：${esc(pick.date_raw || '—')}　依据：<b>${esc(BASIS[pick.date_basis]?.[0] || pick.date_basis)}</b>　用纸：${esc(pick.paper || '—')}　所藏：${esc(pick.holder || '—')}</p><p>三家排序：${ORDERS.map(([k, n]) => `${n} ${esc(pick[k] ?? '—')}`).join('，')}</p>${pick.name_kaigo !== undefined ? `<p>三家（及梅渓）的称呼：海後"${esc(pick.name_kaigo || '（未列）')}"；稲田"${esc(pick.name_inada || '（未列）')}"；梅渓"${esc(pick.name_umetani || '（未列）')}"${pick.asao_label ? `；麻尾所录题名、日付：${esc(pick.asao_label)}` : ''}</p>` : ''}<p class="sub">出处：${esc(typeof pick.source_ref === 'object' && pick.source_ref ? `${pick.source_ref.citation || ''}${pick.source_ref.page ? ` 第 ${pick.source_ref.page} 页` : ''}` : pick.source_ref || '—')}（录文在本机材料包；扫描本不放页影）</p></div>` : ''}</section>
        <section class="w9-col"><header><b>初稿之争</b>　${Object.entries(CLAIMS).map(([k, v]) => `<label><input type="radio" name="d20c" data-o="claim" value="${k}" ${s.claim === k ? 'checked' : ''}>${v.who}</label>`).join(' ')}</header>
          <div class="w10-tcard"><b>${esc(c.who)}所定的初稿</b><p>${esc(c.first)}</p><ul>${c.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul><p class="sub">出处：${esc(c.ref)}。据教师所给扫描本或 PDF 目验（扩充部分乙一）。</p></div>
          <p><b>这场分歧说明什么</b>：两位研究者看的是同一批没有日期的草稿，用的办法也相同（文字比较加旁证），排出的先后却不一样。纸张与笔迹只有看原件的人能用，同一种稿纸可以用很久；文字比较程序可以代劳，但<b>程序只能说两稿差在哪里，不能说谁照着谁改</b>；旁证要先确定旁证本身的日期。</p>
          <details><summary>（可选）两种初稿分别与成文对齐</summary>
            <p>海後所定初稿 → 成文：${kv ? `<b>异文 ${kv.variants} 处</b>（相同 ${kv.equal} 字；字为单位、不归一，页面实算，与 D08 同法）` : needPack('井上草案（海後所定初稿）录文')}</p>
            <p>稲田所定初稿（芳川文书本）→ 成文：<span class="nil">未录</span>。全文需另行录入稲田书第 198 页（教师 2026-11-16：本轮不做）。录入后可在 D08 以"自选文字"对齐，比较两种初稿说法下的异文数。</p>
            <p class="sub">异文数只说明差多少，不说明谁在前。</p></details></section></div>`);
    }
    onChange(e) { const t = e.target; if (t.dataset.o) this.set({ [t.dataset.o]: t.type === 'checkbox' ? t.checked : t.value }); }
    onClick(e) {
      const t = e.target.closest('[data-draft],[data-x]'); if (!t) return;
      if (t.dataset.draft) return this.set({ pick: t.dataset.draft === this.s.pick ? null : t.dataset.draft });
      if (t.dataset.x === 'imp') W.Importer.open('drafts');
      if (t.dataset.x === 'tpl') window.Deck.download('w10-drafts-template.csv', '﻿draft_id,system,author,date_raw,date_basis,paper,holder,source_ref,order_kaigo,order_inada,order_asao\n', 'text/csv');
    }
  }
  register('drafts-lab', Drafts);
})();
