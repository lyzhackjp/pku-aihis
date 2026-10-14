/* 第五周实验组件：集合度量（D11）、三级支持判定（D16）、实体消解（D19）、贯穿检查（D24）、封面（D00）。
 * 依赖 deck-core.js 提供的 window.Deck。正式开发时逐个移植为 Stencil 组件。 */
(() => {
  'use strict';
  const { esc, store, pageById, pageLink, download, flowShell, rerender, register } = window.Deck;
  /* ================= 计算：集合度量、字形统一、编辑距离 ================= */
  const PUNCT = /[\s，。、；：？！“”‘’「」『』（）《》〈〉…—,.;:?!'"()\[\]\-]/gu;
  // 教学用字形对照表：只覆盖本页示例材料里出现的字。正式页接入第三周已用的 OpenCC-js（t2s / t2jp）。
  const GLYPH = { '術': '术', '識': '识', '謂': '谓', '書': '书', '與': '与', '學': '学', '誠': '诚', '盡': '尽', '於': '于', '為': '为', '歷': '历', '劉': '刘', '鷗': '鴎', '猶': '犹', '論': '论' };
  const t2s=window.OpenCC.Converter({from:'t',to:'cn'});
  const normalize = (s) => t2s(s); // Real OpenCC-js 1.0.5; originals retained.
  const clean = (s) => [...s.replace(PUNCT, '')];
  const unitsOf = (s, mode) => {
    const cs = clean(s);
    if (mode === 'bigram') { const out = []; for (let i = 0; i + 1 < cs.length; i++) out.push(cs[i] + cs[i + 1]); return out; }
    return cs;
  };
  const uniq = (xs) => [...new Set(xs)];
  const measures=window.LabMath.measureSets;
  const levenshtein=(a,b)=>window.LabMath.editTable(a,b).at(-1).at(-1);
  const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—');
  const frac = (n, d) => `${n}/${d}`;
  window.W5_MATH = { measures, unitsOf, normalize, levenshtein, clean }; // 供验收脚本调用

  /* ================= D11 集合度量 ================= */
  class SetMeasureLab extends HTMLElement {
    connectedCallback() {
      this.s = Object.assign({ text: '能具史識者，必知史德。德者何？謂著書者之心術也', query: '史德与心术', unit: 'char', norm: false }, store.get('d11', {}));
      this.addEventListener('input', (e) => { const k = e.target.dataset.k; if (k === 'text' || k === 'query') { this.s[k] = e.target.value; this.save(); } });
      this.addEventListener('click', (e) => { const b = e.target.closest('[data-set]'); if (!b) return; const [k, v] = b.dataset.set.split(':'); this.s[k] = k === 'norm' ? v === '1' : v; this.save(); });
      this.render();
    }
    save() { store.set('d11', this.s); this.render(); }
    render() {
      const { text, query, unit, norm } = this.s;
      const tx = norm ? normalize(text) : text, qx = norm ? normalize(query) : query;
      const A = uniq(unitsOf(qx, unit)), B = uniq(unitsOf(tx, unit));
      const m = measures(A, B);
      const changed = (s) => [...s].filter((c) => normalize(c)!==c);
      const chA = uniq(changed(query + text));
      const chip = (x, set) => `<span class="chip ${set.has(x) ? 'hit' : ''} ${!norm && [...x].some((c) => GLYPH[c]) ? 'norm' : ''}" title="${!norm && [...x].some((c) => GLYPH[c]) ? '统一字形时会改变' : ''}">${esc(x)}</span>`;
      const inter = new Set(m.inter);
      const page = pageById('D11');
      const rawQ = uniq(unitsOf(query, unit)), rawB = uniq(unitsOf(text, unit));
      const rawM = measures(rawQ, rawB);
      const cols = [
        { title: '拆成集合', why: '集合只关心有没有，重复出现的元素只算一次；先去掉标点。',
          body: `<label class="field">原文 B（可改）<textarea data-k="text" rows="3">${esc(text)}</textarea></label>
            <label class="field">查询 A（可改）<input data-k="query" value="${esc(query)}"></label>
            <div class="seg" role="group" aria-label="集合元素"><button data-set="unit:char" class="${unit === 'char' ? 'on' : ''}">单字</button><button data-set="unit:bigram" class="${unit === 'bigram' ? 'on' : ''}">字二元组</button></div>
            <p class="sub">A（${m.a}）</p><div class="chips">${A.map((x) => chip(x, inter)).join('')}</div>
            <p class="sub">B（${m.b}）</p><div class="chips">${B.map((x) => chip(x, inter)).join('')}</div>` },
        { title: '统一字形', why: '比较前统一简繁字形；原文保持原值，日文异称另作人工核对。',
          body: `<div class="seg" role="group" aria-label="字形统一"><button data-set="norm:0" class="${!norm ? 'on' : ''}">按原值比较</button><button data-set="norm:1" class="${norm ? 'on' : ''}">统一字形后比较</button></div>
            ${chA.length ? `<table class="kv"><tr><th>原值</th><th>规范值</th><th>出现于</th></tr>${chA.map((c) => `<tr><td>${esc(c)}</td><td>${esc(normalize(c))}</td><td>${query.includes(c) ? '查询' : ''}${query.includes(c) && text.includes(c) ? '、' : ''}${text.includes(c) ? '原文' : ''}</td></tr>`).join('')}</table>` : '<p class="caption">当前文字没有需要统一的字形。</p>'}
            <p class="note-box">原文仍是“${esc(text.slice(0, 18))}${text.length > 18 ? '…' : ''}”；规范值只用于本次比较。</p>
            <p class="caption">已接入 OpenCC-js 1.0.5 t2s。这里列出当前输入中改变的字；日文异称另按D19人工表核对。</p>` },
        { title: '交集与并集', why: '交集是两边都有的元素；并集 = |A| + |B| − |A∩B|。',
          body: `<p class="sub">A ∩ B（${m.i}）</p><div class="chips">${m.inter.length ? m.inter.map((x) => `<span class="chip hit">${esc(x)}</span>`).join('') : '<span class="caption">空集</span>'}</div>
            <div class="formula">|A ∪ B| = ${m.a} + ${m.b} − ${m.i} = ${m.u}</div>
            ${unit === 'bigram' ? '<p class="caption">字二元组：原文去掉标点连成一串，再取相邻两字。比单字严格得多。</p>' : '<p class="caption">单字：按字比较较宽容；“术”与“術”在集合看来是两个字。</p>'}` },
        { title: '三项系数', why: '杰卡德看交集占并集；Dice 数值更宽容；重叠系数只看较小一方被覆盖多少。',
          body: `<table class="kv"><tr><th>系数</th><th>代入</th><th>值</th></tr>
            <tr><td>杰卡德 J</td><td class="num">${frac(m.i, m.u)}</td><td class="num">${f2(m.J)}</td></tr>
            <tr><td>Dice D</td><td class="num">${frac(2 * m.i, m.a + m.b)}</td><td class="num">${f2(m.D)}</td></tr>
            <tr><td>重叠 O</td><td class="num">${frac(m.i, Math.min(m.a, m.b))}</td><td class="num">${f2(m.O)}</td></tr></table>
            ${['J', 'D', 'O'].map((k) => `<div class="bar ref" style="--ref:${(rawM[k] * 100).toFixed(1)}%" title="红线：按原值的${k}"><i style="width:${(m[k] * 100).toFixed(1)}%"></i></div>`).join('')}
            <p class="caption">蓝条为当前设置，红线为“按原值比较”的结果。D = 2J/(1+J)：${f2((2 * m.J) / (1 + m.J))}，与 J 排序一致。</p>` },
      ];
      rerender(this, flowShell(page, cols, { active: unit === 'bigram' ? 0 : norm ? 1 : 3, done: norm ? 2 : undefined }));
    }
  }

  /* ================= 材料与证据（讲义原文引用；未取得原文处只放讲义转述） ================= */
  const EVIDENCE = [{"id": "S1", "who": "章學誠", "mark": "①", "ctx": "承上文刘知幾才、学、识三长之说", "text": "雖劉氏之所謂才、學、識，猶未足以盡其理也。", "kind": "quote", "loc": "史德首段（电子文本段落）", "source": "shide", "record": "S0"}, {"id": "S2", "who": "章學誠", "mark": "②", "text": "能具史識者，必知史德。德者何？謂著書者之心術也。", "kind": "quote", "loc": "史德首段（电子文本段落）", "source": "shide", "record": "S0"}, {"id": "S3", "who": "章學誠", "mark": "③", "text": "盡其天而不益以人", "kind": "quote", "loc": "史德首段后半（电子文本段落）", "source": "shide", "record": "S0"}, {"id": "A1", "who": "阿克顿", "mark": "A", "text": "For the critic is one who, when he lights on an interesting statement, begins by suspecting it. He remains in suspense until he has subjected his authority to three operations. First, he asks whether[41] he has read the passage as the author wrote it. For the transcriber, and the editor, and the official or officious censor on the top of the editor, have played strange tricks, and have much to answer for. And if they are not to blame, it may turn out that the author wrote his book twice over, that you can discover the first jet, the progressive variations, things added, and things struck out. Next is the question where the writer got his information. If from a previous writer, it can be ascertained, and the inquiry has to be repeated. If from unpublished papers, they must be traced, and when the fountain head is reached, or the track disappears, the question of veracity arises. The responsible writer's character, his position, antecedents, and probable motives have to be examined into; and this is what,[42] in a different and adapted sense of the word, may be called the higher criticism, in comparison with the servile and often mechanical work of pursuing statements to their root. For a historian has to be treated as a witness, and not believed unless his sincerity is established. The maxim that a man must be presumed to be innocent until his guilt is proved, was not made for him.", "kind": "quote", "loc": "1911 年重印本印刷页 [40]—[42]", "source": "acton", "record": "A2", "translation": "批判者先检查文字是否保持作者原样，再追问信息来源，并考察作者的位置和可能动机。（教学转述，非已出版译文）"}, {"id": "M1", "who": "森鴎外", "mark": "M", "text": "なぜさうしたかと云ふと、其動機は簡単である。わたくしは史料を調べて見て、其中に窺はれる「自然」を尊重する念を発した。そしてそれを猥に変更するのが厭になつた。これが一つである。わたくしは又現存の人が自家の生活をありの儘に書くのを見て、現在がありの儘に書いて好いなら、過去も書いて好い筈だと思つた。これが二つである。", "kind": "quote", "loc": "青空文库正文自然段 3（不计分隔横线）", "source": "ogai", "record": "M3", "translation": "作者尊重史料中显出的自然，不愿任意改变；还说明如实写过去的动机。（教学转述，非已出版译文）", "ctx": "对象是自己的历史小说；先回读首段，再对照第6段希望摆脱束缚的自述。"}];
  const evidenceCard = (e) => `<div class="evid ${e.kind}"><small>${esc(e.mark)} ${esc(e.who)} · ${esc(e.loc)}</small>${e.ctx ? `<span class="caption">〔${esc(e.ctx)}〕</span>` : ''}「${esc(e.text)}」${e.translation?`<p class="lab-translation">${esc(e.translation)}</p>`:''}<button data-source="${e.source}" data-record="${e.record}">核对原文与字段</button></div>`;
  /* ================= D16 三级支持判定 ================= */
  const LEVELS = [[1, '完全支持'], [0.5, '部分支持'], [0, '不支持']];
  const DEFAULT_SENTS = [
    { text: '章學誠要求著史者“盡其天而不益以人”。', cite: 'S3', w: 1 },
    { text: '阿克顿认为史料批判是史学的全部工作。', cite: 'A1', w: 0.5 },
    { text: '三人都主张叙述必须服从史料。', cite: '', w: 0 },
  ];
  function supportScores(sents) {
    const sum = sents.reduce((n, s) => n + (s.cite ? s.w : 0), 0);
    const cited = sents.filter((s) => s.cite).length;
    return { sum, cited, total: sents.length, P: cited ? sum / cited : NaN, R: sents.length ? sum / sents.length : NaN };
  }
  window.W5_MATH.supportScores = supportScores;
  class SupportLab extends HTMLElement {
    connectedCallback() {
      this.sents = store.get('d16', null) || DEFAULT_SENTS.map((x) => ({ ...x }));
      this.addEventListener('input', (e) => { const i = +e.target.dataset.i; if (e.target.dataset.k?.startsWith('t')) { this.sents[i].text = e.target.value; this.save(); } });
      this.addEventListener('change', (e) => { const i = +e.target.dataset.i; if (e.target.dataset.k?.startsWith('c')) { this.sents[i].cite = e.target.value; if (!e.target.value) this.sents[i].w = 0; this.save(); } });
      this.addEventListener('click', (e) => {
        const b = e.target.closest('[data-w],[data-act2]'); if (!b) return;
        if (b.dataset.w !== undefined) { const i = +b.dataset.i; if (this.sents[i].cite) this.sents[i].w = +b.dataset.w; }
        if (b.dataset.act2 === 'add') this.sents.push({ text: '', cite: '', w: 0 });
        if (b.dataset.act2 === 'del') this.sents.splice(+b.dataset.i, 1);
        if (b.dataset.act2 === 'reset') this.sents = DEFAULT_SENTS.map((x) => ({ ...x }));
        this.save();
      });
      this.render();
    }
    save() { store.set('d16', this.sents); this.render(); }
    render() {
      const page = pageById('D16');
      const sc = supportScores(this.sents);
      const opts = (sel) => `<option value="">（无引文）</option>` + EVIDENCE.map((e) => `<option value="${e.id}" ${sel === e.id ? 'selected' : ''}>${esc(e.mark + ' ' + e.who)}</option>`).join('');
      const cls = (s) => (!s.cite ? 'w0' : s.w === 1 ? 'w1' : s.w === 0.5 ? 'w05' : 'w0');
      const cols = [
        { title: '拆成句子', why: '回答按句拆开；每句的第一条引文单独判断。可改写、增删句子。',
          body: this.sents.map((s, i) => `<div class="sent ${cls(s)}"><label class="field">第 ${i + 1} 句<input data-k="t${i}" data-i="${i}" value="${esc(s.text)}"></label>
              <label class="field">所标引文<select data-k="c${i}" data-i="${i}">${opts(s.cite)}</select></label>
              <button data-act2="del" data-i="${i}" style="font-size:12px;padding:2px 8px">删去此句</button></div>`).join('') +
            `<p style="margin-top:8px"><button data-act2="add">＋ 加一句</button> <button data-act2="reset">恢复讲义示例</button></p>` },
        { title: '对照所引片段', why: '回到被引的那一处读：它说了这句话里的全部信息吗？',
          body: this.sents.map((s, i) => { const e = EVIDENCE.find((x) => x.id === s.cite); return `<p class="sub">第 ${i + 1} 句 →</p>${e ? evidenceCard(e) : '<p class="note-box warn">没有引文：这一句记 0 分。</p>'}`; }).join('') },
        { title: '三级判定', why: '完全支持记 1；部分支持记 0.5；不支持或无引文记 0。判定由人对照原文作出。',
          body: `<div class="grade">${this.sents.map((s, i) => `<div class="sent ${cls(s)}"><p>${esc(s.text || '（空句）')}</p><p class="cite">${s.cite ? '引：' + esc(EVIDENCE.find((x) => x.id === s.cite)?.mark + ' ' + EVIDENCE.find((x) => x.id === s.cite)?.who) : '无引文'}</p>
              <div class="levels">${LEVELS.map(([w, l]) => `<button data-w="${w}" data-i="${i}" class="${s.cite && s.w === w ? 'on' : ''}" ${s.cite ? '' : 'disabled'}>${l}</button>`).join('')}</div></div>`).join('')}</div>` },
        { title: '两个比例', why: '精确率只看标了引用的句子；召回率看全部句子，没有引文的句子会拉低它。',
          body: `<p class="sub">加权精确率</p><div class="formula">P_w = Σw / N_引 = ${f2(sc.sum)} / ${sc.cited}</div><p class="big-num">${f2(sc.P)}</p>
            <p class="sub">加权召回率</p><div class="formula">R_w = Σw / N_句 = ${f2(sc.sum)} / ${sc.total}</div><p class="big-num">${f2(sc.R)}</p>
            <p class="caption">句子与默认判断为讲义 @fig-support 的教学构造；计算方法据 TREC 2025 RAG Track 总结。模型评委有位置偏差，最终由人判定。</p>` },
      ];
      rerender(this, flowShell(page, cols, { active: 2 }));
    }
  }

  /* ================= D19 实体消解 ================= */
  const MENTIONS = [
    { name: '劉知幾', src: '讲义 4.2（规范名）' }, { name: '劉氏子元', src: '《史德》开篇' }, { name: '劉氏', src: '《史德》开篇' },
    { name: '章學誠', src: '《史德》作者' }, { name: '森鴎外', src: '青空文库本' }, { name: '森鷗外', src: '他处文献' },
    { name: 'Acton', src: '他处文献' }, { name: 'Lord Acton', src: 'Gutenberg 本' },
  ];
  const EDGES = [
    ['劉氏子元', '提出', '才學識三長'], ['章學誠', '认为未尽其理', '才學識三長'], ['章學誠', '回应', '劉氏'], ['章學誠', '提出', '史德'],
    ['森鴎外', '著', '歴史其儘と歴史離れ'], ['森鷗外', '发表于', '心の花'], ['Lord Acton', '讲', 'Study of History'], ['Acton', '任教', '剑桥大学'],
  ];
  const DEFAULT_ALIAS = { '劉氏子元': '劉知幾', '劉氏': '', '森鷗外': '森鴎外', 'Acton': 'Lord Acton' };
  class EntityLab extends HTMLElement {
    connectedCallback() {
      this.s = Object.assign({ mode: 'exact', alias: { ...DEFAULT_ALIAS } }, store.get('d19', {}));
      this.addEventListener('click', (e) => { const b = e.target.closest('[data-mode],[data-reset]'); if (!b) return; if (b.dataset.mode) this.s.mode = b.dataset.mode; if (b.dataset.reset !== undefined) this.s.alias = { ...DEFAULT_ALIAS }; this.save(); });
      this.addEventListener('change', (e) => { const n = e.target.dataset.alias; if (n) { this.s.alias[n] = e.target.value; this.save(); } });
      this.render();
    }
    save() { store.set('d19', this.s); this.render(); }
    canon(name) {
      if (this.s.mode === 'exact') return name;
      if (this.s.mode === 'edit') { // 编辑距离 ≤ 1 的人名自动合并（演示自动规则的风险）
        const people = MENTIONS.map((m) => m.name);
        const hit = people.find((p) => p !== name && levenshtein(p, name) <= 1 && p < name);
        return hit || name;
      }
      return this.s.alias[name] || name;
    }
    render() {
      const page = pageById('D19');
      const nodes = new Map();
      const add = (n, kind) => { const c = kind === 'person' ? this.canon(n) : n; if (!nodes.has(c)) nodes.set(c, { id: c, kind, aliases: new Set() }); if (c !== n) nodes.get(c).aliases.add(n); return c; };
      MENTIONS.forEach((m) => add(m.name, 'person'));
      const edges = EDGES.map(([a, r, b]) => [add(a, 'person'), r, add(b, 'thing')]);
      const list = [...nodes.values()];
      const persons = list.filter((n) => n.kind === 'person'), things = list.filter((n) => n.kind === 'thing');
      const W = 600, rowH = 40, H = Math.max(persons.length, things.length) * rowH + 30;
      const pos = new Map();
      persons.forEach((n, i) => pos.set(n.id, [120, 28 + i * rowH]));
      things.forEach((n, i) => pos.set(n.id, [W - 120, 28 + i * rowH * Math.max(1, persons.length / Math.max(1, things.length)) * 0.95]));
      const deg = (id) => edges.filter((e) => e[0] === id || e[2] === id).length;
      const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="实体关系图">
        ${edges.map(([a, , b]) => { const [x1, y1] = pos.get(a), [x2, y2] = pos.get(b);
          if (nodes.get(b).kind === 'person') return `<path d="M${x1 - 70} ${y1} C${x1 - 105} ${y1},${x2 - 105} ${y2},${x2 - 70} ${y2}" fill="none" stroke="#8aa0b0" stroke-width="1.4"/>`;
          return `<line x1="${x1 + 70}" y1="${y1}" x2="${x2 - 100}" y2="${y2}" stroke="#8aa0b0" stroke-width="1.4"/>`; }).join('')}
        ${list.map((n) => { const [x, y] = pos.get(n.id); const w = n.kind === 'person' ? 140 : 200; const fill = n.kind === 'person' ? (n.aliases.size ? '#f3e6c4' : '#eef3f7') : '#f4f4f0'; return `<rect x="${x - w / 2}" y="${y - 14}" width="${w}" height="28" fill="${fill}" stroke="${n.aliases.size ? '#b08a4a' : '#9fb3c2'}"/>`; }).join('')}
      </svg>`;
      // 文字标签放在 HTML 层（与 skill 中“SVG 只画几何”的约定一致），这里用绝对定位叠放。
      const labels = list.map((n) => { const [x, y] = pos.get(n.id); return `<span style="position:absolute;left:${((x) / W * 100).toFixed(2)}%;top:${((y) / H * 100).toFixed(2)}%;transform:translate(-50%,-50%);font-size:clamp(10px,0.78vw,13px);white-space:nowrap">${esc(n.id)}${n.aliases.size ? ' <small style="color:#8a6a2a">+' + n.aliases.size + '</small>' : ''}</span>`; }).join('');
      const personCount = persons.length;
      const cols = [
        { title: '抽出的称呼', why: '模型从各块抽出人名；同一个人在不同材料里写法不同。',
          body: `<table class="kv"><tr><th>称呼</th><th>来自</th></tr>${MENTIONS.map((m) => `<tr><td>${esc(m.name)}</td><td class="caption">${esc(m.src)}</td></tr>`).join('')}</table>
            <p class="caption">称呼与关系为讲义 4.2 示例的教学抽取，不是模型实跑结果。</p>` },
        { title: '匹配方式', why: 'GraphRAG 论文合并实体用精确字符串匹配；换一种规则，节点就不同。',
          body: `<div class="seg" role="group" aria-label="匹配方式" style="flex-wrap:wrap"><button data-mode="exact" class="${this.s.mode === 'exact' ? 'on' : ''}">精确匹配</button><button data-mode="edit" class="${this.s.mode === 'edit' ? 'on' : ''}">编辑距离≤1</button><button data-mode="alias" class="${this.s.mode === 'alias' ? 'on' : ''}">异称表</button></div>
            <p class="big-num">${personCount}</p><p class="caption">个人物节点（共 ${MENTIONS.length} 个称呼）</p>
            ${this.s.mode === 'edit' ? '<p class="note-box warn">自动规则：森鴎外／森鷗外被合并，但“劉氏子元”与“劉知幾”相差不止一字，仍是两个节点；“Acton”与“Lord Acton”相差 5。</p>' : ''}
            ${this.s.mode === 'exact' ? '<p class="note-box warn">写法不同即不同节点：与“三长”有关的边分散在“劉氏子元”“劉氏”名下。</p>' : ''}` },
        { title: '图中的节点与边', why: '归并后首选名保留异称；关系汇集到同一个节点上。',
          body: `<div class="graph" style="position:relative">${svg}${labels}</div>
            <table class="kv" style="margin-top:8px"><tr><th>人物节点</th><th>异称</th><th>边</th></tr>${persons.map((n) => `<tr><td>${esc(n.id)}</td><td>${esc([...n.aliases].join('、') || '—')}</td><td class="num">${deg(n.id)}</td></tr>`).join('')}</table>` },
        { title: '人工判断', why: '异称表由人决定：首选名与异称归并而不替换；“劉氏”单独出现时未必指刘知幾。',
          body: `${Object.keys(DEFAULT_ALIAS).map((n) => `<div class="alias-row"><span style="min-width:72px">${esc(n)}</span>→<select data-alias="${esc(n)}" ${this.s.mode === 'alias' ? '' : 'disabled'}><option value="">不归并</option>${['劉知幾', '森鴎外', 'Lord Acton', '章學誠'].filter((x) => x !== n).map((x) => `<option ${this.s.alias[n] === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>`).join('')}
            <p style="margin-top:8px"><button data-reset>恢复默认异称表</button></p>
            <p class="note-box">刘知幾字子玄，清人避讳作“子元”。“劉氏”要回到上下文判断，默认不自动归并。</p>` },
      ];
      rerender(this, flowShell(page, cols, { active: this.s.mode === 'exact' ? 1 : this.s.mode === 'alias' ? 3 : 2, done: this.s.mode === 'alias' ? 3 : undefined }));
    }
  }

  /* ================= D24 贯穿：一句回答的四道检查 ================= */
  const CLAIM = '章學誠、阿克顿与森鴎外都认为，历史叙述必须完全服从史料。';
  const QUESTION = '这几位作者怎样看待史料对叙述者的约束？';
  const MATERIALS = [
    { key: 'shide', title: '《史德》', author: '章學誠', first: '《文史通義》卷三內篇三；作品首页题记“道光壬辰冬開雕，癸巳春畢”', etext: '维基文库线上本（分段为录入者分段，非刻本叶码）', locator: '维基文库本段落；本地刻本待教师补；本课只引用电子文本段落' },
    { key: 'acton', title: 'A Lecture on the Study of History', author: 'Lord Acton', first: '1895 年 6 月 11 日剑桥就职演讲；同年 10 月首次出版', etext: 'Project Gutenberg #25720，据 1911 年重印本录入', locator: '重印本页码 [40]—[42]' },
    { key: 'ogai', title: '歴史其儘と歴史離れ', author: '森鴎外', first: '1915 年 1 月《心の花》初刊', etext: '青空文库（新字旧假名）；底本第三书馆《ザ・鴎外》1985 年初版 1992 年第二刷', locator: '青空文库本自然段' },
  ];
  const CHUNKINGS = {
    sentence: { label: '按句切，只取回 ②', got: ['S2'], can: '只能说“章學誠重视著史者的心术”。', lost: '丢掉对象（刘知幾三长说）与具体要求“盡其天而不益以人”。' },
    paragraph: { label: '按自然段切，①②③ 同块', got: ['S1', 'S2', 'S3'], can: '能说明史德针对三长说提出，并要求“盡其天而不益以人”。', lost: '块较长，同块中的其他内容也一并进入，需要再定位到句。' },
    fixed: { label: '固定长度切（教学构造：①② | ③）', got: ['S1', 'S2'], can: '能说明史德针对三长说提出。', lost: '要求③落入下一块；回答说不出具体要求。' },
  };
  const STAGES = [
    { key: 'identity', title: '材料身份', page: 'D03', sub: '库里收的是哪个版本' },
    { key: 'chunk', title: '切分与证据', page: 'D09', sub: '一句回答需要几个片段' },
    { key: 'retrieve', title: '取回与相似度', page: 'D11', sub: '查询与片段字面重合多少' },
    { key: 'context', title: '进入上下文', page: 'D15', sub: '取回的是否送进了模型' },
    { key: 'support', title: '逐句判定', page: 'D16', sub: '引文是否支持这句话' },
    { key: 'conclude', title: '有限论断', page: 'D23', sub: '材料支持到哪里' },
  ];
  const freshThrough = () => ({ stage: 0, done: {}, mats: Object.fromEntries(MATERIALS.map((m) => [m.key, { ...m }])), chunk: 'sentence', query: '史德与心术', norm: false, budget: 1, grades: { shide: 0.5, acton: 0.5, ogai: 0.5 }, final: '', checks: {} });
  class ThroughWorkbench extends HTMLElement {
    connectedCallback() {
      this.s = Object.assign(freshThrough(), store.get('through', {}));
      this.addEventListener('click', (e) => {
        const b = e.target.closest('[data-stage],[data-t]'); if (!b) return;
        if (b.dataset.stage !== undefined) this.s.stage = +b.dataset.stage;
        const t = b.dataset.t;
        if (t === 'chunk') this.s.chunk = b.dataset.v;
        if (t === 'norm') this.s.norm = b.dataset.v === '1';
        if (t === 'grade') this.s.grades[b.dataset.who] = +b.dataset.v;
        if (t === 'mark') { this.s.done[STAGES[this.s.stage].key] = true; if (this.s.stage < STAGES.length - 1) this.s.stage++; }
        if (t === 'export') download('第五周贯穿检查记录.md', this.markdown());
        if (t === 'backup') download('第五周贯穿检查备份.json', JSON.stringify({schema:'week05-through/v1',state:this.s},null,2),'application/json');
        if (t === 'reset') { this.s = freshThrough(); store.del('through'); }
        this.save();
      });
      this.addEventListener('input', (e) => {
        const k = e.target.dataset.k; if (!k) return;
        if (k.startsWith('mat:')) { const [, m, f] = k.split(':'); this.s.mats[m][f] = e.target.value; }
        if (k === 'query') this.s.query = e.target.value;
        if (k === 'budget') this.s.budget = +e.target.value;
        if (k === 'final') this.s.final = e.target.value;
        if (k.startsWith('chk:')) this.s.checks[k.slice(4)] = e.target.checked;
        this.save();
      });
      this.addEventListener('change', async (e)=>{if(!e.target.dataset.restore)return;try{const file=e.target.files?.[0];if(!file)return;const b=JSON.parse(await file.text());if(b.schema!=='week05-through/v1'||!b.state||!Number.isInteger(b.state.stage)||b.state.stage<0||b.state.stage>5||!CHUNKINGS[b.state.chunk]||!b.state.mats||typeof b.state.query!=='string'||typeof b.state.final!=='string'||!b.state.grades||!b.state.checks)throw Error('备份结构不完整');const next={...freshThrough(),...b.state};for(const m of MATERIALS)for(const k of ['first','etext','locator'])if(typeof next.mats[m.key]?.[k]!=='string')throw Error('材料字段不完整');for(const v of Object.values(next.grades))if(![0,.5,1].includes(v))throw Error('等级非法');this.s=next;this.save();}catch(err){this.querySelector('[data-restore-message]').textContent='恢复失败，当前记录保留：'+err.message;}});
      this.render();
    }
    save() { store.set('through', this.s); this.render(); }
    ranked() {
      const pool = [...CHUNKINGS[this.s.chunk].got.map((id) => EVIDENCE.find((e) => e.id === id)), ...EVIDENCE.filter(e=>e.who!=='章學誠')];
      const prep = (t) => (this.s.norm ? normalize(t) : t);
      return pool.map((e) => ({ e, m: measures(uniq(unitsOf(prep(this.s.query), 'char')), uniq(unitsOf(prep(e.text), 'char'))) })).sort((a, b) => b.m.O - a.m.O || b.m.J - a.m.J);
    }
    stageBody(i) {
      const s = this.s;
      if (i === 0) return `<p class="caption" style="margin-bottom:8px">按第四周条目字段核对：AI 看到的是哪一个文本？查不到写“待查”。</p><div class="mat-grid">${MATERIALS.map((m) => `<div class="mat"><h3>${esc(m.title)} · ${esc(m.author)}</h3>
          ${[['first', '初刊／作品信息'], ['etext', '所用电子文本与底本'], ['locator', '引用位置']].map(([f, l]) => `<label class="field">${l}<textarea data-k="mat:${m.key}:${f}" rows="2">${esc(s.mats[m.key][f])}</textarea></label>`).join('')}</div>`).join('')}</div>
          <p class="note-box">“库里有这篇”不等于“库里有初刊”；回答中的引用位置只能是所收版本中的位置。本库未收的材料，查不到只能说明“本库未收”。</p>`;
      if (i === 1) { const c = CHUNKINGS[s.chunk]; return `<p class="caption">问题：“章學誠对叙述者提出了什么要求？针对什么对象？”</p>
          <div class="seg" style="flex-wrap:wrap;margin-top:8px">${Object.entries(CHUNKINGS).map(([k, v]) => `<button data-t="chunk" data-v="${k}" class="${s.chunk === k ? 'on' : ''}">${esc(v.label)}</button>`).join('')}</div>
          ${EVIDENCE.filter((e) => e.who === '章學誠').map((e) => `<div style="opacity:${c.got.includes(e.id) ? 1 : 0.35}">${evidenceCard(e)}</div>`).join('')}
          <p class="note-box okbox">能说：${esc(c.can)}</p><p class="note-box warn">说不出：${esc(c.lost)}</p>`; }
      if (i === 2) { const r = this.ranked(); return `<label class="field">查询<input data-k="query" value="${esc(s.query)}"></label>
          <div class="seg"><button data-t="norm" data-v="0" class="${!s.norm ? 'on' : ''}">按原值</button><button data-t="norm" data-v="1" class="${s.norm ? 'on' : ''}">统一字形</button></div>
          <table class="kv"><tr><th>候选（来自上一步的切分）</th><th>交集</th><th>J</th><th>重叠 O</th></tr>${r.map(({ e, m }) => `<tr><td>${esc(e.mark)} ${esc(e.text.slice(0, 22))}</td><td>${esc(m.inter.join('') || '—')}</td><td class="num">${f2(m.J)}</td><td class="num">${f2(m.O)}</td></tr>`).join('')}</table>
          <p class="caption">按单字计算，排序先看重叠系数。三份原文均已接入；单字字面检索适合原语查询，跨语言语义检索需另外运行多语嵌入模型。完整推导见 ${pageLink('D11', 'D11 集合度量')}。</p>`; }
      if (i === 3) { const r = this.ranked(); const k = Math.min(s.budget, r.length); return `<label class="field">上下文预算：放入前 ${k} 个候选<input data-k="budget" type="range" min="1" max="3" value="${s.budget}"></label>
          <table class="kv"><tr><th>候选</th><th>取回</th><th>进入</th></tr>${r.map(({ e }, j) => `<tr><td>${esc(e.mark)} ${esc(e.text.slice(0, 24))}</td><td>✓</td><td>${j < k ? '✓' : '—'}</td></tr>`).join('')}</table>
          <p class="note-box">取回了不等于进入了；进入了也不等于被用了。${r.length && !r.slice(0, k).some(({ e }) => e.id === 'S3') ? '“盡其天而不益以人”没有进入上下文：回答说不出具体要求。' : ''}</p>`; }
      if (i === 4) { const vals = MATERIALS.map((m) => s.grades[m.key]); const sum = vals.reduce((a, b) => a + b, 0); return `<p class="through-claim">${esc(CLAIM)}</p>
          <p class="caption">“都认为”要求三段材料各自支持同一判断。逐一对照后定级（讲义判断：每处至多部分支持）。</p>
          ${MATERIALS.map((m) => { const ev = EVIDENCE.filter((e) => (m.key === 'shide' ? e.who === '章學誠' : m.key === 'acton' ? e.who === '阿克顿' : e.who === '森鴎外')); return `<div class="sent ${s.grades[m.key] === 1 ? 'w1' : s.grades[m.key] === 0.5 ? 'w05' : 'w0'}"><p><b>${esc(m.author)}</b></p>${ev.map(evidenceCard).join('')}<div class="levels">${LEVELS.map(([w, l]) => `<button data-t="grade" data-who="${m.key}" data-v="${w}" class="${s.grades[m.key] === w ? 'on' : ''}">${l}</button>`).join('')}</div></div>`; }).join('')}
          <div class="formula">三处引文平均支持 = ${f2(sum)} / 3 = ${f2(sum / 3)}；“完全服从”在三段材料中找不到依据。</div>
          <p class="caption">逐句计算 P_w、R_w 见 ${pageLink('D16', 'D16 三级支持判定')}。</p>`; }
      const n = [...s.final.replace(/\s/g, '')].length;
      return `<p class="caption">用 80—120 字写一段有依据的回答，回答“${esc(QUESTION)}”；每句后标出材料与所用版本中的位置。</p>
          <textarea data-k="final" rows="6" placeholder="例：章學誠要求著史者……（《史德》第一段，维基文库本）">${esc(s.final)}</textarea>
          <p class="caption">${n} 字</p>
          ${[['cite', '每一句都标出了材料与位置'], ['scope', '没有把一位作者的说法扩大成几位作者的共同主张'], ['version', '引用位置是所收电子文本中的位置'], ['frame', '整体概括来自材料，而不是我事先的框架']].map(([k, l]) => `<label style="display:block;font-size:14px;margin:4px 0"><input type="checkbox" data-k="chk:${k}" ${s.checks[k] ? 'checked' : ''}> ${l}</label>`).join('')}`;
    }
    markdown() {
      const s = this.s; const r = this.ranked(); const k = Math.min(s.budget, r.length);
      return `# 第五周贯穿检查记录\n\n问题：${QUESTION}\n\n待检查的回答：${CLAIM}\n\n## 1 材料身份\n\n${MATERIALS.map((m) => `- ${m.title}（${m.author}）\n  - 初刊：${s.mats[m.key].first}\n  - 所用电子文本：${s.mats[m.key].etext}\n  - 引用位置：${s.mats[m.key].locator}`).join('\n')}\n\n## 2 切分与证据\n\n- 切法：${CHUNKINGS[s.chunk].label}\n- 能说：${CHUNKINGS[s.chunk].can}\n- 说不出：${CHUNKINGS[s.chunk].lost}\n\n## 3 取回与相似度\n\n- 查询：${s.query}（${s.norm ? '统一字形' : '按原值'}）\n${r.map(({ e, m }) => `- ${e.mark} J=${f2(m.J)} O=${f2(m.O)}`).join('\n')}\n\n## 4 进入上下文\n\n- 预算：前 ${k} 个候选：${r.slice(0, k).map(({ e }) => e.mark).join('、')}\n\n## 5 逐句判定（人工核读）\n\n${MATERIALS.map((m) => `- ${m.author}：${LEVELS.find(([w]) => w === s.grades[m.key])?.[1]}`).join('\n')}\n\n## 6 有限论断\n\n${s.final || '（未填写）'}\n\n## 所用原文与出处\n\n${EVIDENCE.map(e=>`### ${e.who} ${e.loc}\n${e.text}\n来源：${window.W5_SOURCES.find(m=>m.id===e.source).url}\n`).join("\n")}\n注：单字字面检索；支持判定为人工核读。\n`;
    }
    render() {
      const s = this.s, st = STAGES[s.stage];
      const html = `<div class="through">
        <aside class="through-rail">
          <p class="caption" style="margin-bottom:4px">问题</p><p style="font-size:14px;line-height:1.6;margin-bottom:10px">${esc(QUESTION)}</p>
          <p class="caption" style="margin-bottom:4px">待检查的回答</p><p class="through-claim">${esc(CLAIM)}</p>
          ${STAGES.map((x, i) => `<button data-stage="${i}" class="${i === s.stage ? 'on' : ''} ${s.done[x.key] ? 'done' : ''}">${i + 1}　${esc(x.title)}<small>${esc(x.sub)}</small></button>`).join('')}
          <div class="through-actions"><button data-t="export">导出记录 .md</button><button data-t="backup">完整备份 .json</button><button data-t="reset">清空</button><label class="field">恢复备份<input data-restore="1" type="file" accept=".json"></label><p data-restore-message role="status"></p></div>
          <p class="caption" style="margin-top:8px">记录只存在当前浏览器；导出后可交作业或带入下一讲。</p>
        </aside>
        <div class="through-main">
          <div class="flow-head" style="margin-bottom:10px"><p class="flow-question">${s.stage + 1} · ${esc(st.title)}：${esc(st.sub)}</p><span class="caption">讲解页 ${pageLink(st.page)}</span></div>
          ${this.stageBody(s.stage)}
          <div class="through-actions"><button data-t="mark" class="on">记下这一步${s.stage < STAGES.length - 1 ? '，进入下一步 →' : ''}</button></div>
        </div></div>`;
      rerender(this, html);
    }
  }

  /* ================= 封面 ================= */
  class HeroCover extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<div class="hero-lab"><div>
          <p class="eyebrow">人工智能赋能历史研究与写作 · 第五讲</p>
          <h2 class="hero-title">知识库检索<br>与有依据的生成</h2>
          <p class="hero-lead">回答里的每一句话，<br>能否回到一段确实支持它的原文？</p></div>
        <div><div class="hero-claim"><small>问：${esc(QUESTION)}</small><p>“${esc(CLAIM)}”</p></div>
          <p class="hero-lead" style="font-size:15px">先别查原文：这句话要成立，需要哪些条件？</p>
          <div class="hero-path">${STAGES.slice(0, 5).map((x) => `<a href="#D24" data-goto-stage="${STAGES.indexOf(x)}">${esc(x.title)}</a>`).join('')}</div></div></div>`;
      this.addEventListener('click', (e) => { const a = e.target.closest('[data-goto-stage]'); if (!a) return; const s = store.get('through', {}); s.stage = +a.dataset.gotoStage; store.set('through', s); const w = document.querySelector('through-workbench'); if (w) { w.s.stage = s.stage; w.render(); } });
    }
  }

  register('hero-cover', HeroCover);
  register('set-measure-lab', SetMeasureLab);
  register('support-lab', SupportLab);
  register('entity-lab', EntityLab);
  register('through-workbench', ThroughWorkbench);
})();
