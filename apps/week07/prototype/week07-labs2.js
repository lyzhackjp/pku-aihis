/* 第七周测试原型第二批页面：D02—D04、D07、D08、D10—D12、D16—D24、D26、D28、D29 与概念表（v5 五块）。
 * 依赖 deck-core.js（window.Deck）、week07-core.js（window.W7）、week07-labs.js（window.W7L）。 */
(() => {
  'use strict';
  const { esc, store, pageById, pageLink, download, flowShell, rerender, register } = window.Deck;
  const W = window.W7, { PackLab, seg, f2, cbdbPerson, arr, ERRTYPES } = window.W7L;
  const P = () => W.Pack.get();
  const gate = (el, needs) => rerender(el, W.packGate(needs));
  const pct = (n) => (n * 100).toFixed(2) + '%';
  const strip = (s) => String(s || '').replace(/[\s　]/g, '');
  const hl = (text, words, cls = 'mk') => { let h = esc(text); for (const w of [...new Set(words)].filter(Boolean).sort((a, b) => b.length - a.length)) h = h.split(esc(w)).join(`<mark class="${cls}">${esc(w)}</mark>`); return h; };

  /* ================= D02 页影热区 ================= */
  const DNSR_W = 1201, DNSR_H = 1600;
  const D02_ZONES = {
    kobun: { label: '綱文（编者的断言）', boxes: [[810, 420, 95, 900]], text: '八日、甲戌、前將軍足利義尹、和泉堺ヲ發シ、是日、京都ニ入ル、大内義興等、之ニ從フ、', note: '前将军足利义尹从和泉的堺出发，当天进入京都，大内义兴等人随行。綱文是编者的断言，不是史料原文。' },
    shiryo: { label: '史料（证据）', boxes: [[430, 420, 380, 760]], text: null, note: '綱文之下排列依据：『公卿補任』卷四十五一行，近卫尚通日记『後法成寺尚通公記』卷三六月七日至十八日数条。' },
    kakko: { label: '小字括注（编者的判断）', boxes: [[790, 895, 22, 45], [752, 1165, 22, 60], [700, 1125, 22, 50], [505, 775, 22, 40], [537, 478, 22, 32], [652, 1290, 22, 55], [602, 495, 22, 30], [640, 985, 30, 80]], text: null, note: '原文写官名或本姓，编者在旁用小字注出所指：源（足利）義尹、細川民部少輔（高國）、右馬助（細川政賢）、畠山尾州（尚順）、大内左京大夫（義興）、鷹司前關白父子（政平・兼輔）、一條（冬良）。这就是九十多年前手工完成的实体链接。' },
    midashi: { label: '上栏見出（编者摘出的索引）', boxes: [[408, 300, 355, 88]], text: '細川高國上洛ス從兵一萬人計｜近衞尚通鷹司政平等見物ス｜大内義興入洛ス｜畠山尚順上洛ス｜尚順出仕ス', note: '凡例：上栏“檢索ノ便宜マデニ、人名、地名、物名、事項等ヲ摘出スルニ止マル、之ヲ以テ萬般ヲ盡シタルニアラズ、又取捨ノ意ヲ示シタルニアラズ”——只为检索方便，不穷尽，也不表示取舍。（凡例据 PDF 页序 6，NDLOCR-Lite 识读并对照页影核读）' },
  };
  class DnsrPage extends PackLab {
    get key() { return 'w7-d02'; }
    defaults() { return { z: 'kobun' }; }
    render() {
      const p = P(); if (!p) return gate(this, '『大日本史料』9-1 本文第 1 页页影与人工参照转录');
      const z = D02_ZONES[this.s.z], ref = p.teach?.reference?.['dnsr_9-1_p1_reference'] || p.texts.dnsr_p1_excerpt.text;
      const boxes = Object.entries(D02_ZONES).map(([k, v]) => v.boxes.map(([x, y, w, h]) => `<span class="hot ${k === this.s.z ? 'on' : ''} hot-${k}" data-set="z:${k}" style="left:${pct(x / DNSR_W)};top:${pct(y / DNSR_H)};width:${pct(w / DNSR_W)};height:${pct(h / DNSR_H)}" title="${esc(v.label)}"></span>`).join('')).join('');
      let body = z.text ? `<p class="src-line">${esc(z.text)}</p>` : '';
      if (this.s.z === 'shiryo') body = `<pre class="srcbox">${hl(ref.split('\n').slice(2).join('\n'), ['（足利）', '（高國）', '（細川政賢）', '（構内本光院）', '（政平・兼輔）', '（冬良）', '（義興）', '（尚順）'], 'ok')}</pre>`;
      if (this.s.z === 'kakko') body = `<table class="steps"><tr><th>原文称呼</th><th>编者括注</th><th>本讲术语</th></tr>${[['源義尹', '足利'], ['細川民部少輔', '高國'], ['右馬助', '細川政賢'], ['武衞', '構内本光院'], ['鷹司前關白父子', '政平・兼輔'], ['一條', '冬良'], ['大内左京大夫', '義興'], ['畠山尾州', '尚順']].map(([a, b]) => `<tr><td>${a}</td><td class="okc">（${b}）</td><td class="sub">${a === '武衞' ? '地点（斯波氏宅）' : '实体链接'}</td></tr>`).join('')}</table><p class="sub">“九州大樹”原页无括注（未决问题 U-01）。</p>`;
      rerender(this, `<div class="split"><div class="page-img hotwrap"><img src="${p.images.dnsr_p1.dataUrl}" alt="${esc(p.images.dnsr_p1.note)}">${boxes}</div>
        <div class="zone-panel">${seg('z', Object.entries(D02_ZONES).map(([k, v]) => [k, v.label]), this.s.z)}<h3>${esc(z.label)}</h3>${body}<p class="note-box">${esc(z.note)}</p>
        <p class="sub">${esc(p.images.dnsr_p1.note)}；转录为人工参照转录（据 300 dpi 页影目验，待核，未决问题 U-05）。</p></div></div>`);
    }
  }
  register('dnsr-page', DnsrPage);

  /* ================= D03 拆一句 ================= */
  const D03_SENT = [
    ['今日畠山尾州上洛云々、一万人計云々', { who: '畠山尾州', when: '永正五年六月十四日', where: '（京都）', what: '上洛，随兵约一万人', src: '『後法成寺尚通公記』卷三，六月十四日条' }],
    ['今日九州大樹入洛、於武衞在所令一見', { who: '九州大樹（＝足利義尹，据綱文互证）', when: '永正五年六月八日', where: '京都；观看者在武衞在所', what: '入洛；尚通在武衞在所观看', src: '『後法成寺尚通公記』卷三，六月八日条' }],
    ['前參議從四位下源（足利）義尹、四十三、六月八日入洛', { who: '源義尹（足利）', when: '六月八日', where: '（京都）', what: '入洛，时年四十三', src: '『公卿補任』卷四十五' }],
    ['細川民部少輔（高國）上洛、騎馬數百騎、一万人計云々', { who: '細川民部少輔（高國）', when: '六月七日', where: '（京都）', what: '上洛，骑马数百、约一万人', src: '『後法成寺尚通公記』卷三，六月七日条' }],
    ['次及晩大内左京大夫（義興）上洛云々、是も六七千人云々', { who: '大内左京大夫（義興）', when: '六月八日晚', where: '（京都）', what: '上洛，约六七千人', src: '『後法成寺尚通公記』卷三，六月八日条' }],
  ];
  const D03_KEYS = [['who', '谁'], ['when', '何时'], ['where', '何地'], ['what', '做了什么'], ['src', '据什么']];
  class SplitLab extends PackLab {
    get key() { return 'w7-d03'; }
    defaults() { return { i: 0, f: {}, show: false }; }
    init() { this.addEventListener('input', (e) => { const k = e.target.dataset.f; if (k) { this.s.f[this.s.i + ':' + k] = e.target.value; store.set(this.key, this.s); } }); }
    render() {
      const page = pageById('D03'); const s = this.s; const [sent, ans] = D03_SENT[+s.i];
      const val = (k) => s.f[s.i + ':' + k] || '';
      rerender(this, flowShell(page, [
        { title: '选一句史料', why: '綱文之下的史料；默认那一句的“谁”最难填。', body: `<ul class="sents">${D03_SENT.map(([t], i) => `<li><button class="small ${+s.i === i ? 'on' : ''}" data-set="i:${i}">${i + 1}</button> ${esc(t)}</li>`).join('')}</ul>` },
        { title: '拆成五项', why: '每一项都能单独核对。', body: D03_KEYS.map(([k, l]) => `<label class="field">${l}<input data-f="${k}" value="${esc(val(k))}"></label>`).join('') + `<button class="small" data-set="show:${s.show ? '' : '1'}">${s.show ? '收起参照' : '对照参照'}</button>` },
        { title: '断言与证据分列', why: '断言可以改，证据保持原样。', body: `<div class="assert-card"><b>断言</b><p>${esc(val('who') || '（谁）')}　${esc(val('when') || '（何时）')}　${esc(val('where') || '（何地）')}　${esc(val('what') || '（做了什么）')}</p></div><div class="evid-card"><b>证据</b><p class="src-line">${esc(sent)}</p><p class="sub">${esc(val('src') || '（据什么）')}</p></div>` +
          (s.show ? `<table class="steps">${D03_KEYS.map(([k, l]) => `<tr><td>${l}</td><td>${esc(ans[k])}</td></tr>`).join('')}</table><p class="sub">参照为课件编写者据讲义 @fig-dnsr 拟；括号内为原文未写、由上下文补的部分（判断类型：推定）。</p>` : '') },
        { title: '三种条目形式', why: '共同点：断言与证据分开存放。', body: `<table class="steps"><tr><th></th><th>綱文</th><th>factoid</th><th>CBDB</th></tr><tr><td>中心</td><td>事件</td><td>史料中的一处</td><td>人物</td></tr><tr><td>一条记录</td><td class="on">某日某人做了某事</td><td>某处史料说某人如何</td><td>某人的一项属性</td></tr><tr><td>证据</td><td>綱文之下列史料</td><td>每条连一处史料</td><td>每行一个出处字段</td></tr><tr><td>谁判断</td><td>编者立綱文</td><td>编者解读史料</td><td>编者录入；推定理由写注</td></tr></table>
          <p class="lab-quote">“A factoid is a spot in a source that says something about a person or persons.”<br><span class="sub">所谓 factoid，就是史料中谈到某一人或某些人的一处地方。——King's College London, “What is Factoid Prosopography all about?”（项目页）</span></p>` },
      ], { active: s.show ? 3 : 1 }));
    }
  }
  register('split-lab', SplitLab);

  /* ================= D04 字段由问题决定 ================= */
  class FieldLab extends PackLab {
    get key() { return 'w7-d04'; }
    defaults() { return { q: '北宋宰执出身何地', fields: ['姓名', '籍贯', '任宰执年份', '', ''], uses: ['', '', '', '', ''], split: false }; }
    init() { this.addEventListener('input', (e) => { const t = e.target; if (t.dataset.fi != null) { this.s[t.dataset.arr][+t.dataset.fi] = t.value; store.set(this.key, this.s); this.querySelectorAll('[data-row]').forEach((r) => r.classList.toggle('dim', !this.s.uses[+r.dataset.row])); } }); }
    render() {
      const page = pageById('D04'); const s = this.s; const p = P();
      const note = p ? (cbdbPerson(p.cbdb.persons['1845'])?.BasicInfo?.Notes || '').replace(/\x7f/g, '') : '';
      const m = note.match(/According to[^.]*\.[^.]*\.[^.]*\./); const m2 = note.match(/I am accepting[^.]*\./);
      rerender(this, flowShell(page, [
        { title: '写下研究问题', why: '先问问题需要哪些对象。', body: `<label class="field">研究问题<textarea data-k="q" rows="3">${esc(s.q)}</textarea></label><p class="lab-quote">“data is the product of interpretation and transformation”<br><span class="sub">数据是解释与转换的产物。——Cosovschi, Programming Historian 13 (2024)，引言（讲义已核；完整句待补）</span></p>` },
        { title: '列出字段', why: '五个字段。', body: s.fields.map((f, i) => `<div data-row="${i}" class="${s.uses[i] ? '' : 'dim'}"><input data-arr="fields" data-fi="${i}" value="${esc(f)}" placeholder="字段 ${i + 1}"></div>`).join('') },
        { title: '每个字段服务哪个判断', why: '写不出用途的字段先不要；一栏回答两个问题就拆成两栏。', body: s.fields.map((f, i) => `<input data-arr="uses" data-fi="${i}" value="${esc(s.uses[i])}" placeholder="“${esc(f || '字段')}”为哪一个判断服务">`).join('') },
        { title: '一格拆成两栏', why: '王珪的“籍贯”有两种记载，回答的是不同问题。', body: `<div class="assert-card"><b>《宋史》卷三一二</b><p class="src-line">王珪，字禹玉，成都華陽人，後徙舒。</p><p class="sub">史家对家世的记述（维基文库录文，未决问题 U-07）</p></div>
          <div class="evid-card"><b>CBDB 1845</b><p>指数地址：${esc(p ? cbdbPerson(p.cbdb.persons['1845']).BasicInfo.IndexAddr : '（导入材料包后显示）')}</p>${p ? `<p class="sub mono">${esc((m ? m[0] : '') + ' … ' + (m2 ? m2[0] : ''))}</p>` : ''}<p class="sub">编者据李清臣所撰墓志推定（接口原始返回的编者注）</p></div>
          <button class="small" data-set="split:${s.split ? '' : '1'}">${s.split ? '合成一栏' : '拆成两栏'}</button>
          ${s.split ? '<table class="steps"><tr><th>史书所记籍贯</th><th>今人推定籍贯</th><th>推定理由</th></tr><tr><td>成都華陽，後徙舒</td><td>東明（開封府）</td><td>CBDB 编者据墓志：曾祖葬河南、户籍转舒州、王珪葬开封东明</td></tr></table>' : '<table class="steps"><tr><th>籍贯</th></tr><tr><td class="warn">成都華陽？舒？東明？</td></tr></table>'}` },
      ], { active: s.split ? 3 : 1 }));
    }
  }
  register('field-lab', FieldLab);

  /* ================= D07 一人多名 ================= */
  const D07_TIME = { 字: '成年后取字，生前即用', 諡號: '谥号只出现在身后文献', 封爵: '有起始年份，此前的记载不会这样称呼', 小字: '幼时之名', '室名、別號': '自号，时人与后世均用', 名: '本名', 号: '自号', 初名: '后来改名前的名' };
  class AliasLab extends PackLab {
    get key() { return 'w7-d07'; }
    defaults() { return { who: '1845', pick: '' }; }
    render() {
      const p = P(), page = pageById('D07'); if (!p) return gate(this, 'CBDB 1762、1845、33013 与 NDL 典拠 00269218 原始数据');
      let cards = [], title = '';
      if (this.s.who === 'ndl') {
        const r = p.ndl.records['00269218']; title = r.prefLabel.literalForm + '（NDL 典拠 00269218）';
        cards = (r.altLabel || []).map((a) => ({ name: a.literalForm, type: a.description || '异称（典拠未注类型）' }));
        const ex = [].concat(r.exactMatch || []).map((x) => (x.uri || x)).filter((u) => typeof u === 'string');
        cards.push({ name: '对应', type: '外部规范档', extra: ex.map((u) => u.replace(/^https?:\/\//, '')).join('；') });
      } else {
        const per = cbdbPerson(p.cbdb.persons[this.s.who]); title = `${per.BasicInfo.ChName}（CBDB ${this.s.who}，${per.BasicInfo.Dynasty}，${per.BasicInfo.YearBirth}—${per.BasicInfo.YearDeath}）`;
        cards = arr(per.PersonAliases, 'Alias').map((a) => ({ name: a.AliasName, type: a.AliasType }));
        if (this.s.who === '1845') cards.push({ name: '三旨相公', type: '时人绰号', extra: '讲义据《宋史》本传补；CBDB 别名表未收', added: true });
      }
      const pick = cards.find((c) => c.name === this.s.pick);
      const colors = { 字: 'c1', 諡號: 'c2', 封爵: 'c3', 小字: 'c4', '室名、別號': 'c5', 号: 'c5', 名: 'c6', 初名: 'c4', 时人绰号: 'c7' };
      rerender(this, `${seg('who', [['1762', '王安石'], ['1845', '北宋王珪'], ['33013', '唐代王珪'], ['ndl', '新井白石']], this.s.who)}
        <h3>${esc(title)}</h3><div class="alias-wall">${cards.map((c) => `<button class="alias ${colors[c.type] || 'c0'} ${c.added ? 'added' : ''} ${c.name === this.s.pick ? 'on' : ''}" data-set="pick:${esc(c.name)}"><b>${esc(c.name)}</b><small>${esc(c.type)}</small></button>`).join('')}</div>
        <p class="note-box">${pick ? `<b>${esc(pick.name)}</b>（${esc(pick.type)}）：${esc(D07_TIME[pick.type] || pick.extra || '类型照规范库原值')}${pick.name === '岐國公' ? '。王珪封岐國公在元丰八年，此前的记载不会这样称呼他。' : ''}${pick.name === '三旨相公' ? '。《宋史》本传：上殿进呈云“取聖旨”，上可否讫云“領聖旨”，退谕禀事者云“已得聖旨”。称“三旨相公”透露了作者的态度。' : ''}${pick.extra && D07_TIME[pick.type] ? '；' + esc(pick.extra) : ''}` : '点一个称呼，看它的类型带着什么时间与立场信息。'}</p>
        <p class="sub">类型照规范库原值显示（CBDB AliasType、NDL altLabel description），不另造类型；数据为材料包中 2026-10-28 的接口返回。</p>`);
    }
  }
  register('alias-lab', AliasLab);

  /* ================= D08 称呼标注练习 ================= */
  const D08_TYPES = ['姓名', '字', '名', '省称', '对称', '封爵', '谥号', '绰号', '官名称人', '本姓＋名', '初名', '时人称呼', '其他'];
  const D08_REF = { songshi: [['王珪', '姓名'], ['禹玉', '字'], ['珪', '省称'], ['公', '对称'], ['岐國公', '封爵'], ['文恭', '谥号'], ['三旨相公', '绰号']],
    dnsr: [['足利義尹', '名'], ['源義尹', '本姓＋名'], ['九州大樹', '时人称呼'], ['義材', '初名'], ['義稙', '名'], ['流れ公方', '绰号']] };
  class NamingLab extends PackLab {
    get key() { return 'w7-d08'; }
    defaults() { return { mat: 'songshi', add: '', marks: { songshi: [], dnsr: [] }, show: false }; }
    init() {
      this.addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; const [a, v] = b.dataset.n.split('|'); const L = this.s.marks[this.s.mat];
        if (a === 'add' && this.s.add.trim() && !L.some((x) => x[0] === this.s.add.trim())) { L.push([this.s.add.trim(), '其他']); this.s.add = ''; }
        if (a === 'del') L.splice(+v, 1); this.save(); });
      this.addEventListener('change', (e) => { if (e.target.dataset.ty != null) { this.s.marks[this.s.mat][+e.target.dataset.ty][1] = e.target.value; this.save(); } });
    }
    render() {
      const p = P(), page = pageById('D08'); const s = this.s; const L = s.marks[s.mat];
      const text = s.mat === 'songshi' ? (p ? p.texts.songshi_wanggui_excerpt.text : '（导入材料包后显示选段）') : (p?.teach?.reference?.['dnsr_9-1_p1_reference'] || p?.texts.dnsr_p1_excerpt.text || '（导入材料包后显示）');
      const count = (w) => text.split(w).length - 1;
      const ref = D08_REF[s.mat]; const mine = new Set(L.map((x) => x[0]));
      rerender(this, flowShell(page, [
        { title: '原文选段', why: s.mat === 'songshi' ? '传文中最常出现的称呼是单字“珪”。' : '同一页之内，同一个人至少四种叫法。', body: seg('mat', [['songshi', '王珪传选段'], ['dnsr', '大日本史料第 1 页']], s.mat) + `<pre class="srcbox small-src">${hl(text, L.map((x) => x[0]))}</pre>` },
        { title: '标出称呼', why: '输入一个称呼，原文中所有出现处都会高亮。', body: `<div class="row3"><input data-k="add" value="${esc(s.add)}" placeholder="如 禹玉"><button class="small" data-n="add|">加入</button></div><ul class="marks">${L.map(([w], i) => `<li>${esc(w)} <span class="sub">${count(w)} 处</span> <button class="small" data-n="del|${i}">×</button></li>`).join('')}</ul>` },
        { title: '标出类型', why: '类型带着时间与立场的信息。', body: L.length ? `<table class="steps">${L.map(([w, t], i) => `<tr><td>${esc(w)}</td><td><select data-ty="${i}">${D08_TYPES.map((x) => `<option ${x === t ? 'selected' : ''}>${x}</option>`).join('')}</select></td></tr>`).join('')}</table>` : '<p class="sub">先在第 2 列加入称呼。</p>' },
        { title: '原值与规范值', why: '规范档取固定入口，史料按当时称呼；两栏兼顾。', body: `<button class="small" data-set="show:${s.show ? '' : '1'}">${s.show ? '收起对照' : '对照'}</button>` + (s.show ? `<table class="steps"><tr><th>参照称呼</th><th>类型</th><th>你标了吗</th></tr>${ref.map(([w, t]) => `<tr class="${mine.has(w) ? 'ok' : ''}"><td>${esc(w)}${s.mat === 'dnsr' && !text.includes(w) ? ' <span class="sub">（本页外）</span>' : ''}</td><td>${t}</td><td>${mine.has(w) ? '✓' : '—'}</td></tr>`).join('')}</table>
          ${s.mat === 'songshi' ? `<p class="warn small">单字“珪”出现 ${count('珪')} 处；“珪、確相顧失色”中“珪”紧挨另一人名，边界要判断。</p><p class="sub">参照为课件编写者据选段整理（“公”为蔡確对王珪的对称），待教师确认。</p>` : `<table class="steps"><tr><th>原值（当时称呼）</th><th>规范值（NDL 典拠首选形）</th></tr><tr><td>前將軍足利義尹</td><td>足利, 義稙, 1466-1523（001247822）</td></tr></table><p class="sub">“九州”二字含义两说并存（未决问题 U-01）；义材改名义尹的年份不标（U-02）。</p>`}` : '') },
      ], { active: s.show ? 3 : 1 }));
    }
  }
  register('naming-lab', NamingLab);

  /* ================= D10 襲名二部图 ================= */
  const D10_IDS = [['00272460', '1世'], ['00360993', '2世'], ['00272461', '3世'], ['00272462', '4世']];
  class ShumeiLab extends PackLab {
    get key() { return 'w7-d10'; }
    defaults() { return { pick: '一陽斎', count: 'ndl' }; }
    render() {
      const p = P(); if (!p) return gate(this, 'NDL 典拠 00272460、00360993、00272461、00272462 原始 JSON');
      const recs = D10_IDS.map(([id, g]) => { const r = p.ndl.records[id]; return { id, g, pref: r.prefLabel.literalForm, alts: (r.altLabel || []).map((a) => ({ f: a.literalForm, d: a.description || '' })) }; });
      const key = (f) => f.replace(/[,，]\s*/g, '').replace(/\s*\d+世.*$/, '').replace(/[\d-]+$/, '').trim();
      const norm = (f) => { const k = f.replace(/\s+/g, ''); return /一陽斎|一陽齋/.test(k) ? '一陽斎' : /国貞|國貞/.test(k) ? '国貞' : /香蝶楼/.test(k) ? '香蝶楼' : /五渡亭/.test(k) ? '五渡亭' : /一雄斎|一雄齋/.test(k) ? '一雄斎' : /梅蝶楼/.test(k) ? '梅蝶楼' : null; };
      const groups = {}; recs.forEach((r) => r.alts.forEach((a) => { const n = norm(a.f); if (n) (groups[n] = groups[n] || new Set()).add(r.id); }));
      const shared = Object.entries(groups).filter(([, v]) => v.size > 1).map(([k]) => k);
      const names = Object.keys(groups).sort((a, b) => groups[b].size - groups[a].size);
      const H = 60 + Math.max(recs.length, names.length) * 54, xL = 40, xR = 520;
      const yL = (i) => 50 + i * 70, yR = (i) => 40 + i * 54;
      const lines = names.flatMap((n, j) => [...groups[n]].map((id) => { const i = recs.findIndex((r) => r.id === id); return `<line x1="${xL + 240}" y1="${yL(i)}" x2="${xR}" y2="${yR(j)}" class="${n === this.s.pick ? 'on' : ''} ${shared.includes(n) ? 'shared' : ''}"/>`; })).join('');
      const L = recs.map((r, i) => `<g class="node ${groups[this.s.pick]?.has(r.id) ? 'on' : ''}"><rect x="${xL}" y="${yL(i) - 22}" width="240" height="44"/><text x="${xL + 8}" y="${yL(i) - 3}">${esc(r.pref)}</text><text x="${xL + 8}" y="${yL(i) + 15}" class="sm">NDL ${r.id}</text></g>`).join('');
      const R = names.map((n, j) => `<g class="alt ${shared.includes(n) ? 'shared' : ''} ${n === this.s.pick ? 'on' : ''}" data-set="pick:${esc(n)}"><rect x="${xR}" y="${yR(j) - 16}" width="120" height="32"/><text x="${xR + 8}" y="${yR(j) + 5}">${esc(n)}（${groups[n].size}）</text></g>`).join('');
      const cnt = { ndl: ['规范档代数', ['1世', '2世', '3世', '4世']], self: ['自称代数', ['初代', '二代（豊重）', '二代（国貞自称）', '国貞二世→豊国']], ichiyo: ['一陽斎计数', ['一陽斎一世？', '—', '一陽斎 豊国 1世', '一陽斎 豊国 2世']] }[this.s.count];
      const pick = recs.filter((r) => groups[this.s.pick]?.has(r.id));
      rerender(this, `<div class="split"><div><svg class="bigraph" viewBox="0 0 680 ${H}" role="img" aria-label="规范档记录与异称的二部图">${lines}${L}${R}</svg>
        <p class="sub">左：NDL 典拠首选形“歌川, 豊国”的四条记录（另有 6 世 00177179）；右：异称（括号内为出现在几条记录中）；红底为多条共享。连线全部取自原始 JSON 的 altLabel，不手工补。</p></div>
        <div class="zone-panel">${seg('count', [['ndl', '规范档'], ['self', '自称'], ['ichiyo', '一陽斎计数']], this.s.count)}
        <table class="steps"><tr><th>记录</th><th>${cnt[0]}</th></tr>${recs.map((r, i) => `<tr><td>${esc(r.pref)}</td><td>${esc(cnt[1][i])}</td></tr>`).join('')}</table>
        <p class="note-box"><b>${esc(this.s.pick)}</b>：出现在 ${pick.length} 条记录——${pick.map((r) => esc(r.g)).join('、') || '无'}。${pick.length > 1 ? '单凭这几个字，无从判断是哪一位。' : ''}</p>
        <p class="lab-quote">“現在では便宜上、国貞の豊国を3世と数えている”<br><span class="sub">现在为方便起见，把国贞的丰国算作三世。——コトバンク「歌川国貞」条所收『日本大百科全書（ニッポニカ）』（讲义已核）</span></p>
        <p class="sub">“自称”栏据讲义 2.2 与『浮世絵類考』（按语“二世にはあらず三世なり”）；初名豊重者生年两说（未决问题 U-03），不列。</p></div></div>`);
    }
  }
  register('shumei-lab', ShumeiLab);

  /* ================= D11 豐國条与识读丢失 ================= */
  const D11_CHECKS = {
    ruiko: { ref: 'ukiyo_toyokuni3_reference', ocr: 'ukiyo_toyokuni3_ndlocr', notes: ['門人に讓り聟にして二代とす', '文化の頃より號す', '蜀山人此號を送りしといふ', '二世豐國と名書を記す'], words: [['按るに', '编者按语的起头'], ['豐國門人となりて', '这里的“豐國”指老师一世'], ['師の名を繼て一陽齋豐國', '三世豊国襲名']] },
    dnsr: { ref: 'dnsr_9-1_p1_reference', ocr: 'dnsr_9-1_p1_ndlocr', notes: ['足利', '高國', '細川政賢', '構内本光院', '政平・兼輔', '冬良', '義興', '尚順'], words: [['六月大盡丁卯朔', '月份与朔日'], ['八日、甲戌', '日与干支'], ['九州大樹入洛', '无括注的称呼']] },
  };
  class OcrLossLab extends PackLab {
    get key() { return 'w7-d11'; }
    defaults() { return { mat: 'ruiko', img: '85' }; }
    render() {
      const p = P(), page = pageById('D11'); if (!p?.teach) return gate(this, '『浮世絵類考』页影、人工参照转录与 NDLOCR-Lite 识读输出（教学文件夹原件）');
      const C = D11_CHECKS[this.s.mat], ref = p.teach.reference[C.ref] || p.teach.inputs[C.ref], ocr = p.teach.inputs[C.ocr];
      const O = strip(ocr);
      /* 一条编者小字算“保留”，须在识读文本中出现的次数多于它在参照转录小字之外（正文里）出现的次数。 */
      const outside = strip(ref.replace(/〔[^〕]*〕|（[^）]*）/g, ''));
      const cnt = (hay, n) => hay.split(strip(n)).length - 1;
      const noteRows = C.notes.map((n) => [n, cnt(O, n) > cnt(outside, n), cnt(outside, n)]);
      const wordRows = C.words.map(([w, d]) => [w, d, O.includes(strip(w))]);
      const img = this.s.mat === 'ruiko' ? p.images['ruiko_' + this.s.img] : p.images.dnsr_p1;
      const refHl = hl(ref, C.notes.map((n) => this.s.mat === 'ruiko' ? '〔' + n + '〕' : '（' + n + '）'), 'ok');
      rerender(this, flowShell(page, [
        { title: '原页', why: '割注、按语、括注都是编者的声音。', body: seg('mat', [['ruiko', '浮世絵類考 豐國条'], ['dnsr', '大日本史料 第 1 页']], this.s.mat) + (this.s.mat === 'ruiko' ? seg('img', [['85', '印刷页 85'], ['86', '印刷页 86']], this.s.img) : '') + `<div class="page-img"><img src="${img.dataUrl}" alt="${esc(img.note)}"></div><p class="sub">${esc(img.note)}</p>` },
        { title: '参照转录', why: '据 300 dpi 页影目验；〔〕（）为编者小字。', body: `<pre class="srcbox small-src">${refHl}</pre>` },
        { title: 'NDLOCR-Lite 输出', why: '原样；150 dpi，提交 d001dad，2026-10-24 实际运行。', body: `<pre class="srcbox small-src">${esc(ocr)}</pre>` },
        { title: '丢掉了什么', why: '逐条到识读文本中查找（去掉空白与换行后比对）。', body: `<table class="steps"><tr><th>编者小字</th><th>识读中</th></tr>${noteRows.map(([n, ok, k]) => `<tr class="${ok ? 'ok' : 'bad'}"><td>${esc(n)}${k ? `<span class="sub">（正文另有 ${k} 处）</span>` : ''}</td><td>${ok ? '在（位置可能不同）' : '缺'}</td></tr>`).join('')}</table><p class="sub">缺 ${noteRows.filter((r) => !r[1]).length}／${noteRows.length}。判定：识读文本中出现次数多于它在正文（小字以外）出现的次数才算保留。</p>
          <table class="steps"><tr><th>关键文字</th><th>作用</th><th>识读中</th></tr>${wordRows.map(([w, d, ok]) => `<tr class="${ok ? 'ok' : 'bad'}"><td>${esc(w)}</td><td class="sub">${esc(d)}</td><td>${ok ? '在' : '不在'}</td></tr>`).join('')}</table>
          ${this.s.mat === 'ruiko' ? '<p class="sub">“按るに”在识读中作“たるに”：编者按语被读成了上一句的延续。</p>' : '<p class="sub">讲义 @fig-ocr-loss 记括注“全缺”；逐条查找时“細川政賢”一项以错位的一行“(細川政賢”出现（讲义 4.2：此行错位到“今日九州大樹入洛”之前）。“足利”“義興”在正文的“足利義尹”“大内義興”中另有出现，不算括注保留。</p>'}
          <label class="field">一張浮世絵只落款“一陽斎豊国画”，还需要什么信息？<textarea rows="2" data-k="ans">${esc(this.s.ans || '')}</textarea></label>` },
      ], { active: 3 }));
    }
  }
  register('ocr-loss-lab', OcrLossLab);

  /* ================= D12 实体链接、对账与 NIL ================= */
  class LinkLab extends PackLab {
    get key() { return 'w7-d12'; }
    defaults() { return { pick: '', reason: '' }; }
    render() {
      const p = P(), page = pageById('D12'); if (!p) return gate(this, 'CBDB 按名“王珪”的 34 条记录、4 条完整记录、HIPE 训练集');
      const list = p.cbdb.name_query.html_list.filter((x) => x.label === '王珪');
      const facts = { dyn: '宋', office: '參知政事', yr: 1070 };
      const rows = list.map((x) => {
        const per = cbdbPerson(p.cbdb.persons[x.id]); if (!per) return { id: x.id, known: false };
        const b = per.BasicInfo, po = arr(per.PersonPostings, 'Posting');
        const ok = { 时代: b.Dynasty === facts.dyn, 官职: po.some((o) => o.OfficeName.includes(facts.office)), 在世: (+b.YearBirth || -1e9) <= facts.yr && facts.yr <= (+b.YearDeath || 1e9) && !!(+b.YearBirth || +b.YearDeath), 字: arr(per.PersonAliases, 'Alias').some((a) => a.AliasName === '禹玉') };
        return { id: x.id, known: true, b, ok, n: Object.values(ok).filter(Boolean).length };
      }).sort((a, b) => (b.n || -1) - (a.n || -1));
      const hipe = p.hipe.docs[0].sampled_pairs[0], ver = p.cbdb.name_query.json.Package.PersonAuthority.Version;
      const chosen = this.s.pick;
      const card = chosen ? (chosen === 'NIL' ? `<div class="idcard nil"><b>库中无对应（NIL）</b><p>理由：${esc(this.s.reason) || '<span class="warn">（必填）</span>'}</p></div>` : `<div class="idcard"><b>CBDB ${esc(chosen)}</b>${chosen === '1845' ? '<p>Wikidata：Q16904070（CBDB 记录内）</p>' : ''}<p>理由：${esc(this.s.reason) || '<span class="warn">（必填）</span>'}</p><p class="sub">查询：${esc(p.cbdb.queried)}；接口 person.php（JSON 头部版本字段“${esc(ver)}”）</p></div>`) : '<p class="sub">尚未选择。</p>';
      rerender(this, flowShell(page, [
        { title: '原文称呼', why: '“熙寧三年，拜參知政事”的主语。', body: `<p class="src-line">……神宗即位，遷學士承旨。……熙寧三年，拜參知政事。</p><p>已知：${facts.dyn}；${facts.office}；${facts.yr} 年前后在任；字禹玉（传首）。</p>` },
        { title: '候选与依据字段', why: '只做透明的逐项比对，不给综合分。', body: `<table class="steps cand"><tr><th>编号</th><th>时代</th><th>官职</th><th>在世</th><th>字</th></tr>${rows.map((r) => r.known ? `<tr class="${r.n === 4 ? 'ok' : ''}"><td><button class="small ${chosen === r.id ? 'on' : ''}" data-set="pick:${r.id}">${r.id}</button></td>${['时代', '官职', '在世', '字'].map((k) => `<td>${r.ok[k] ? '✓' : '✗'}</td>`).join('')}</tr>` : `<tr class="dim"><td><button class="small ${chosen === r.id ? 'on' : ''}" data-set="pick:${r.id}">${r.id}</button></td><td colspan="4" class="sub">完整记录未取（课堂可按编号查）</td></tr>`).join('')}</table>
          <p class="lab-quote">“If there is no clear match, one or more candidates are displayed, together with their reconciliation score, with the text in light blue links.”<br><span class="sub">没有明确匹配时，会显示一个或几个候选及其对账分数，文字为浅蓝色链接。——OpenRefine 手册“Reconciling”</span></p>` },
        { title: '人工选择与理由', why: '理由必填；“库中无对应”是正当结论。', body: `<button class="small ${chosen === 'NIL' ? 'on' : ''}" data-set="pick:NIL">库中无对应（NIL）</button><label class="field">理由<textarea data-k="reason" rows="3" placeholder="凭哪几项信息排除了其余 33 个王珪">${esc(this.s.reason)}</textarea></label>` },
        { title: '写入标识与查询记录', why: '链接也要能被检查：库名、编号或 NIL、日期、接口。', body: card + `<div class="mini2"><div><b>库中无对应</b><p class="mono small">${esc(hipe.pers_mentions_list[0])} → Wikidata ${hipe.pers_wikidata_QID === null ? '<span class="warn">null</span>' : esc(hipe.pers_wikidata_QID)}</p><p class="sub">HIPE-2026：${esc(hipe.pers_entity_id.split('-').pop())}（NIL_ 前缀）</p></div>
          <div><b>规范库的版本</b><p class="mono small">Version: "${esc(ver)}"</p><p class="sub">同一份数据的出处栏有 2025 年批次导入的记录；1846 号卒年与任官年矛盾（D18）。</p></div></div>` },
      ], { active: chosen ? 3 : 1 }));
    }
  }
  register('link-lab', LinkLab);

  /* ================= D16 地名起止年 ================= */
  const JIANNING = [[1368, 1454, '1368 年改名为建寧府'], [1455, 1733, '辖境扩大（1455）'], [1734, 1911, '辖境缩小（1733 之后）']];
  class PlaceTimeLab extends PackLab {
    get key() { return 'w7-d16'; }
    defaults() { return { y: 1500 }; }
    render() {
      const page = pageById('D16'), y = +this.s.y || 1500;
      const on = JIANNING.findIndex(([a, b]) => a <= y && y <= b);
      const X = (v) => ((v - 1360) / (1920 - 1360) * 100).toFixed(2) + '%';
      rerender(this, flowShell(page, [
        { title: '输入年份', why: '查某一年有效的单位。', body: `<input type="range" min="1360" max="1915" data-k="y" value="${y}"><p class="big-num">${y}</p><div class="presets">${[1454, 1455, 1733, 1734].map((v) => `<button class="small" data-set="y:${v}">${v}</button>`).join('')}</div>` },
        { title: '筛选条件', why: '起始年 ≤ 该年 ≤ 终止年。', body: JIANNING.map(([a, b], i) => `<p class="mono ${i === on ? 'okc' : 'dim'}">${a} ≤ ${y} ≤ ${b}？${i === on ? '是' : '否'}</p>`).join('') },
        { title: '有效的实例', why: '名称、类型没变，辖境变了也另起一条。', body: `<div class="tl-bars">${JIANNING.map(([a, b, n], i) => `<div class="tlb ${i === on ? 'on' : ''}" style="left:${X(a)};width:calc(${X(b + 1)} - ${X(a)})" title="${n}"><span>建寧府 ${a}—${b}</span></div>`).join('')}<div class="tl-cursor" style="left:${X(y)}"></div></div><p>${on >= 0 ? esc(JIANNING[on][2]) : '不在建寧府的有效期内'}</p>
          <p class="lab-quote">“The first instance of Jianning Fu was valid from 1368 to 1454, and the second instance of Jianning was valid from 1455 to 1733.”<br><span class="sub">建寧府的第一条实例有效期为 1368 至 1454 年，第二条为 1455 至 1733 年。——Berman 2003，CHGIS 数据模型说明</span></p>` },
        { title: '对证据表的含义', why: '原值照录，规范值链接带起止年的记录。', body: `<table class="steps"><tr><th>原值</th><th>规范值</th></tr><tr><td>成都華陽</td><td>华阳县（宋代实例，待查 CHGIS 编号）</td></tr><tr><td>和泉堺</td><td>令制国“和泉”下的堺（当时的地位与今堺市不同）</td></tr><tr class="bad"><td>成都華陽</td><td>“今四川成都华阳地区”（4.2 中模型的写法：以今地名代替历史地名）</td></tr></table><p class="sub">隶属关系另表记录，可单独变化；历史地理分析留到第八周。</p>` },
      ], { active: 2 }));
    }
  }
  register('place-time-lab', PlaceTimeLab);

  /* ================= D17 同现与在场 ================= */
  class PresenceLab extends PackLab {
    get key() { return 'w7-d17'; }
    defaults() { return { ex: 'hipe', at: '', isAt: '', why: '' }; }
    render() {
      const p = P(), page = pageById('D17'); if (!p) return gate(this, 'HIPE-2026 英文训练集');
      const pairs = p.hipe.docs.flatMap((d) => d.sampled_pairs); const both = pairs.filter((x) => x.at === 'FALSE' && x.isAt === 'FALSE').length;
      const doc = p.hipe.docs[0], pr = doc.sampled_pairs[0];
      const EX = {
        tsuneyo: { text: '八日、甲戌、晴陰、○中略、今日九州大樹入洛、於武衞（構内本光院）在所令一見', per: '九州大樹', loc: '武衞在所', gold: ['FALSE', '—'], why: '在武衞在所观看的是没写出主语的日记作者近卫尚通；义尹是入洛（讲义 3.3 判断）' },
        songshi: { text: '接伴契丹使，北使過魏，舊皆盛服入。', per: '珪（接伴使）', loc: '魏', gold: ['PROBABLE', '—'], why: '“过魏”的是北使；接伴使要陪同使者，大概到过魏（讲义 3.3 判断）' },
        hipe: { text: doc.text.slice(0, 600) + '……', per: pr.pers_mentions_list[0], loc: pr.loc_mentions_list[0], gold: [pr.at, pr.isAt], why: pr.at_explanation || '（标注者解释字段为空）' },
      }[this.s.ex];
      const mark = (t) => hl(t, [EX.per.replace(/（.*/, ''), EX.loc.replace(/在所$/, '')]);
      rerender(this, `<p class="lab-quote">“…HIPE-2026 targets two temporally grounded relation types: at, indicating that a person was present at a location at some point prior to a document's publication date, and isAt, indicating presence contemporaneous with that date.”<br><span class="sub">HIPE-2026 处理两种以时间为依据的关系：at 表示某人在文献出版日期之前到过某地，isAt 表示在该日期当时身在此地。——Opitz et al., arXiv:2606.25935v1，摘要</span></p>` + flowShell(page, [
        { title: '一句原文', why: '人名与地名同句。', body: seg('ex', [['tsuneyo', '尚通公記'], ['songshi', '王珪传'], ['hipe', 'HIPE 一条']], this.s.ex) + `<pre class="srcbox small-src">${mark(EX.text)}</pre>${this.s.ex === 'hipe' ? `<p class="sub">${esc(doc.media.publication_title)}，${esc(doc.date)}；${esc(doc.document_id)}</p>` : ''}` },
        { title: '同现的人地对', why: '同现只是线索。', body: `<p><b>人物</b>　${esc(EX.per)}</p><p><b>地点</b>　${esc(EX.loc)}</p>${this.s.ex === 'hipe' ? `<p class="sub">人物 Wikidata：${pr.pers_wikidata_QID ?? 'null（NIL）'}；地点 ${esc(pr.loc_wikidata_QID)}</p>` : ''}` },
        { title: '判断与理由', why: '先写自己的判断。', body: `<p>at（此前到过）</p>${seg('at', [['TRUE', 'TRUE'], ['PROBABLE', 'PROBABLE'], ['FALSE', 'FALSE']], this.s.at)}<p>isAt（当时在场）</p>${seg('isAt', [['TRUE', 'TRUE'], ['PROBABLE', 'PROBABLE'], ['FALSE', 'FALSE']], this.s.isAt)}<label class="field">理由<textarea data-k="why" rows="3">${esc(this.s.why)}</textarea></label>` },
        { title: '对照标注者', why: '不一样也没关系，理由写得出来就行。', body: (this.s.at ? `<table class="steps"><tr><th></th><th>你</th><th>${this.s.ex === 'hipe' ? '标注者' : '讲义'}</th></tr><tr><td>at</td><td>${esc(this.s.at)}</td><td>${esc(EX.gold[0])}</td></tr><tr><td>isAt</td><td>${esc(this.s.isAt || '—')}</td><td>${esc(EX.gold[1])}</td></tr></table><p class="sub">${esc(EX.why)}</p>` : '<p class="sub">选定 at 后显示。</p>') +
          `<p>英文训练集共 ${pairs.length} 对，其中两项都是 FALSE 的 <b>${both}</b> 对（页面现场计算）。</p><div class="barline"><span style="width:${(both / pairs.length * 100).toFixed(1)}%"></span></div><p class="sub">HIPE-2026-data v1.0（CC BY-NC-SA 4.0），提交 ${esc(p.hipe.commit.slice(0, 7))}。</p>` },
      ], { active: this.s.at ? 3 : 2 }));
    }
  }
  register('presence-lab', PresenceLab);

  /* ================= D18 真冲突与伪冲突 ================= */
  class ConflictLab extends PackLab {
    get key() { return 'w7-d18'; }
    defaults() { return { side: 'true' }; }
    render() {
      const p = P(); if (!p) return gate(this, 'CBDB 1846 号记录、《建炎以來繫年要錄》卷 169、170、175');
      const per = cbdbPerson(p.cbdb.persons['1846']), b = per.BasicInfo, po = arr(per.PersonPostings, 'Posting');
      const posts = po.map((o) => [o.OfficeName + (o.AddrName && !/未詳/.test(o.AddrName) ? '（' + o.AddrName + '）' : ''), +o.FirstYear || +o.LastYear, +o.LastYear || +o.FirstYear, o.AddrName]).filter((x) => x[1]);
      const X = (v) => ((v - 1150) / 14 * 100).toFixed(2) + '%';
      const lines = ['169', '170', '175'].map((k) => [k, p.texts.xnyl[k].lines]);
      rerender(this, `${seg('side', [['true', '真冲突：1846 号王珪'], ['false', '伪冲突：熙寧三年与 1071']], this.s.side)}` + (this.s.side === 'true' ? `<div class="split"><div>
        <div class="timeline">${posts.map(([n, a, z]) => `<div class="tlb ${a > +b.YearDeath || z > +b.YearDeath ? 'bad' : ''}" style="left:${X(a || z)};width:calc(${X((z || a) + 1)} - ${X(a || z)})"><span>${esc(n)} ${a === z ? a : a + '—' + z}</span></div>`).join('')}<div class="tl-death" style="left:${X(+b.YearDeath)}"><span>卒 ${esc(b.YearDeath)}</span></div><div class="tl-axis">${[1150, 1155, 1160, 1164].map((v) => `<i style="left:${X(v)}">${v}</i>`).join('')}</div></div>
        <p>CBDB 1846：${esc(b.ChName)}，${esc(b.IndexAddr)}，卒 ${esc(b.YearDeath)}；编者注：<span class="mono small">${esc(b.Notes.replace(/\x7f/g, ''))}</span></p>
        <p class="warn">知舒州在卒年之后：一个人不可能卒后两年还去当知州。</p></div>
        <div class="zone-panel"><h3>回原书：编者注列出的三卷</h3>${lines.map(([k, ls]) => `<div class="evid-card"><b>卷${k}</b>${ls.map((l) => `<p class="src-line small-src">${hl(l, ['王珪', '王圭'])}</p>`).join('')}</div>`).join('')}
        <p class="note-box">卷 169、170 的王珪：绍兴二十五年（1155）以左奉議郎知大宗正丞面對，除監察御史；卷 170 小注引日历，绍兴三十年（1160）八月沈介论劾王珪。卷 175 绍兴二十六年（1156）的却是“左中大夫直祕閣<b>王圭</b>卒”：字作“圭”，官阶相差悬殊。<b>本讲推断</b>：1156 卒年取自另一人“王圭”的卒条，两人在这一项上被误并。“王圭”是谁留作开放问题（未决问题 U-08）。</p>
        <p class="sub">维基文库四库本 wikitext（材料包），四库本与点校本未对校。</p></div></div>`
        : `<div class="split"><div><table class="steps"><tr><th>记载</th><th>值</th></tr><tr><td>《宋史》本传</td><td>熙寧三年，拜參知政事</td></tr><tr><td>CBDB 1845</td><td>参知政事 1071 起</td></tr><tr><td>《續資治通鑑》卷六十八</td><td class="src-line small-src">${esc((p.texts.xzztj_068.lines[0] || '').slice(-40))}</td></tr></table></div>
        <div class="zone-panel"><p class="big-num">熙寧三年十二月丁卯＝1071-01-14（儒略历）</p><p>农历十二月已入公历次年：两处记载都对，只是口径不同。处理：规范值旁写明换算依据（${pageLink('D14', 'D14 年号换算')}）。</p><p class="note-box">伪冲突只需注明换算依据；真冲突要标出来，回原文核查，必要时拆分或合并条目。</p></div></div>`));
    }
  }
  register('conflict-lab', ConflictLab);

  /* ================= D19 NER 三条路线（阶段卡） ================= */
  const D19_STAGES = [
    { name: '规则与词表', tag: 'MARKUS 等', lesson: '手上先有一份人名表、地名表、官职表，在文本中逐一查找，再加上一些规则。', cards: [
      { t: 'MARKUS', q: null, body: '莱顿大学魏希德团队；词表与规则为主，人名、地名、官职、时间自动标记，链接 CBDB；另有手动与正则标记。只支持 Chrome；词表外的实体识别差（The Digital Orientalist 书评，2023-05-05）。', err: '词表外的名字找不到；常用字（文、永、充）误报' }] },
    { name: '序列标注与预训练', tag: 'GuNER 2023、EvaHan 2025', lesson: '把识别看成给每个字贴标签；2018 年以后先预训练、再用标注数据微调。', cards: [
      { t: 'GuNER 2023', q: ['评测发布了覆盖多个朝代和领域的”二十四史”评测数据集,共15万余字,包含人名、书名、官职名三种实体超万数。', '（中文原文）', '苏祺等，CCL23-Eval 任务 1 总结报告，摘要'], body: '127 支队伍报名；封闭赛道最佳 F1 96.15%，开放赛道 95.48%。' },
      { t: 'EvaHan 2025', q: ['The results indicate that text genre significantly impacts model performance, with historical texts generally yielding higher scores.', '结果表明，文体对模型表现有显著影响，史籍文本的得分总体较高。', 'Li et al., ALP 2025: 156–164，摘要'], body: '13 支队伍 77 次运行；封闭赛道最佳 F1：TestA 85.04%、TestB 90.28%（史籍）、TestC 84.49%（医籍）。摘要称共 12 类实体（讲义作“六类／三类／六类”，待对正文）。', err: '离开训练时的文体就掉分' }] },
    { name: '大模型与小型通用模型', tag: '零样本、少样本；GLiNER', lesson: '不必先有标注数据，在提示中说明要找哪些类型、给几个例子。', cards: [
      { t: 'Zhang & Colavizza 2025', q: ['Our experiments, conducted on the HIPE-2022 (Identifying Historical People, Places and other Entities) dataset, show that LLMs can achieve reasonably strong performance on NER tasks in this setting.', '我们在 HIPE-2022 数据集上的实验表明，在这一设置下，大模型在命名实体识别任务上能达到相当不错的表现。', 'arXiv:2508.18090v2，摘要'], body: '紧接一句：仍低于用领域标注训练的全监督模型。' },
      { t: 'Zheng 等 2025', q: ['Experimental results show that the pre-trained and fine-tuned 7B model achieved an F1 score of 0.93, significantly outperforming general-purpose large language models.', '经预训练与微调的 70 亿参数模型 F1 达到 0.93，显著优于通用大模型。', 'ALP 2025: 150–155，摘要'], body: '中医古籍等古汉语文本。' },
      { t: 'GLiNER', q: ['Through comprehensive testing, GLiNER demonstrate strong performance, outperforming both ChatGPT and fine-tuned LLMs in zero-shot evaluations on various NER benchmarks.', '经全面测试，GLiNER 在多个基准的零样本评测中优于 ChatGPT 与微调后的大模型。', 'Zaratiana et al., arXiv:2311.08526v1，摘要（“GLiNER demonstrate”原文如此）'], body: '小编码器，可在普通电脑运行；古汉语上的表现未见报告。', err: '会“补全”：写进原文没有的字号、官职，或把罕见名字改成熟悉的' }] },
  ];
  class NerStages extends PackLab {
    get key() { return 'w7-d19'; }
    defaults() { return { st: 0, guess: '' }; }
    render() {
      const S = D19_STAGES[+this.s.st];
      rerender(this, `<div class="stagebar">${D19_STAGES.map((x, i) => `<button class="${+this.s.st === i ? 'on' : ''}" data-set="st:${i}"><b>${i + 1}</b> ${esc(x.name)}<small>${esc(x.tag)}</small></button>`).join('<span class="arrow">→</span>')}</div>
        <p class="note-box"><b>讲义</b>　${esc(S.lesson)}</p>
        <div class="cards3">${S.cards.map((c) => `<div class="pcard keep"><b>${esc(c.t)}</b>${c.q ? `<p class="lab-quote">“${esc(c.q[0])}”<br><span class="sub">${esc(c.q[1])}——${esc(c.q[2])}</span></p>` : ''}<p>${esc(c.body)}</p>${c.err ? `<p class="warn small">错法：${esc(c.err)}</p>` : ''}</div>`).join('')}</div>
        <label class="field">预测：分别用这三条路线处理王珪传选段，各自最可能错在哪里？（2 分钟）<textarea data-k="guess" rows="2">${esc(this.s.guess)}</textarea></label>
        <p class="sub">论文结果页只放论文报告的数字与条件，未复现。三家原句于 2026-10-28 取原摘要逐字核对（papers.json）。实际错法见 ${pageLink('D23')}、${pageLink('D25')}。</p>`);
    }
  }
  register('ner-stages', NerStages);

  /* ================= D20 BIO ================= */
  const BIO_TAGS = ['O', 'B-人', 'I-人', 'B-地', 'I-地', 'B-官', 'I-官'];
  class BioLab extends PackLab {
    get key() { return 'w7-d20'; }
    defaults() { return { text: '珪薦俞充帥慶', tags: ['B-人', 'O', 'B-人', 'I-人', 'O', 'B-地'], lex: '充 人名\n慶 地名\n俞 人名\n帥 官职' }; }
    init() { this.addEventListener('click', (e) => { const b = e.target.closest('[data-ch]'); if (!b) return; const i = +b.dataset.ch; const t = this.s.tags; t[i] = BIO_TAGS[(BIO_TAGS.indexOf(t[i]) + 1) % BIO_TAGS.length]; this.save(); }); }
    render() {
      const page = pageById('D20'); const chars = [...this.s.text]; const tags = this.s.tags; while (tags.length < chars.length) tags.push('O'); tags.length = chars.length;
      const ents = []; let cur = null; chars.forEach((c, i) => { const t = tags[i]; if (t.startsWith('B-')) { cur && ents.push(cur); cur = { s: c, type: t.slice(2), i }; } else if (t.startsWith('I-') && cur && cur.type === t.slice(2)) cur.s += c; else { cur && ents.push(cur); cur = null; } }); cur && ents.push(cur);
      const lex = this.s.lex.split('\n').map((l) => l.trim().split(/\s+/)).filter((x) => x[0]).sort((a, b) => b[0].length - a[0].length);
      const lexHits = []; for (let i = 0; i < chars.length;) { const h = lex.find(([w]) => this.s.text.slice(i).startsWith(w)); if (h) { lexHits.push({ s: h[0], type: h[1], i }); i += h[0].length; } else i++; }
      const manual = new Set(ents.map((e) => e.i + e.s));
      rerender(this, flowShell(page, [
        { title: '一句原文', why: '《宋史·王珪传》：王珪荐俞充帅庆州。', body: `<label class="field">句子（可换）<input data-k="text" value="${esc(this.s.text)}"></label><p class="sub">默认为讲义 @fig-bio。</p>` },
        { title: '逐字标签', why: '点一个字循环切换标签。', body: `<div class="bio">${chars.map((c, i) => `<button data-ch="${i}" class="t-${tags[i].replace(/[^A-Z人地官]/g, '')}"><b>${esc(c)}</b><small>${tags[i]}</small></button>`).join('')}</div><p class="sub">“充”既可能是名字的一部分也可能是动词；“慶”单字为地名（帅庆州）。</p>` },
        { title: '得到的实体', why: '由标签生成。', body: `<table class="steps"><tr><th>实体</th><th>类型</th><th>位置</th></tr>${ents.map((e) => `<tr><td>${esc(e.s)}</td><td>${e.type}</td><td>${e.i}—${e.i + e.s.length}</td></tr>`).join('')}</table>` },
        { title: '词表匹配对照', why: '规则路线：词表里有的常用字容易误报。', body: `<label class="field">小词表（教学构造，可改）<textarea data-k="lex" rows="4">${esc(this.s.lex)}</textarea></label><table class="steps">${lexHits.map((h) => `<tr class="${manual.has(h.i + h.s) ? 'ok' : 'bad'}"><td>${esc(h.s)}</td><td>${esc(h.type)}</td><td>${manual.has(h.i + h.s) ? '与手标一致' : '与手标不同'}</td></tr>`).join('')}</table>` },
      ], { active: 1 }));
    }
  }
  register('bio-lab', BioLab);

  /* ================= D21 三种数据形态与 JSON Schema ================= */
  function validate(schema, data, path = '$', out = []) {
    const t = schema.type, types = [].concat(t || []);
    const typeOf = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
    if (types.length && !types.some((x) => x === typeOf(data) || (x === 'number' && typeof data === 'number'))) { out.push(`${path} 应为 ${types.join('或')}，实为 ${typeOf(data)}`); return out; }
    if (schema.enum && !schema.enum.includes(data)) out.push(`${path} 只能取 ${schema.enum.join('／')}`);
    if (typeOf(data) === 'object') { for (const r of schema.required || []) if (!(r in data)) out.push(`${path} 缺少必填键 ${r}`); for (const [k, v] of Object.entries(schema.properties || {})) if (k in data) validate(v, data[k], path + '.' + k, out); }
    if (typeOf(data) === 'array' && schema.items) data.forEach((v, i) => validate(schema.items, v, `${path}[${i}]`, out));
    return out;
  }
  const A_SCHEMA_FALLBACK = { type: 'object', required: ['persons'], properties: { persons: { type: 'array', items: { type: 'object', required: ['name', 'aliases', 'native_place', 'birth_year', 'death_year', 'offices'], properties: { name: { type: 'string' }, aliases: { type: 'array', items: { type: 'string' } }, native_place: { type: 'string' }, birth_year: { type: 'integer' }, death_year: { type: 'integer' }, offices: { type: 'array', items: { type: 'object', required: ['title', 'year'], properties: { title: { type: 'string' }, year: { type: 'integer' } } } } } } } } };
  class ShapeLab extends PackLab {
    get key() { return 'w7-d21'; }
    defaults() { return { json: '{"persons": [{"name": "王珪", "aliases": ["禹玉", "岐國公", "文恭"], "native_place": "成都華陽", "birth_year": 1019, "death_year": "不詳", "offices": [{"title": "參知政事", "year": 1071}]}]}', nul: false };
    }
    render() {
      const page = pageById('D21'); const p = P();
      let schema = JSON.parse(JSON.stringify(p?.teach?.extract?.songshi_wanggui_excerpt__A?.schema?.schema || p?.teach?.extract?.songshi_wanggui_excerpt__A?.schema || A_SCHEMA_FALLBACK));
      const it = schema.properties?.persons?.items?.properties;
      if (this.s.nul && it) for (const k of ['birth_year', 'death_year']) if (it[k]) it[k].type = [].concat(it[k].type, 'null');
      let data = null, perr = '';
      try { data = JSON.parse(this.s.json); } catch (e) { perr = e.message; }
      const errs = data ? validate(schema, data) : [];
      rerender(this, `<p class="lab-quote">“In semistructured data, the information that is normally associated with a schema is contained within the data”<br><span class="sub">在半结构化数据中，通常属于 schema 的那部分信息就包含在数据本身之中。——Buneman, PODS 1997，摘要（讲义已核，待补全句）</span></p>` + flowShell(page, [
        { title: '非结构化原文', why: '人读起来最自然。', body: `<p class="src-line">王珪，字禹玉，成都華陽人，後徙舒。……進珪金紫光祿大夫，封岐國公。五月，卒於位，年六十七。……諡曰文恭。</p>` },
        { title: '二维表', why: '每格一个值；一人多名放不进一格。', body: `<table class="steps"><tr><th>姓名</th><th>字</th><th>籍贯</th><th>卒年</th><th>谥号</th></tr><tr><td>王珪</td><td>禹玉</td><td class="warn">成都華陽／舒／東明？</td><td>1085</td><td>文恭</td></tr></table><p class="sub">别名、任官要另开表，一项一行。</p>` },
        { title: 'JSON', why: '值自带字段名，可以嵌套列表。改一改看右侧。', body: `<textarea data-k="json" class="code" rows="10" spellcheck="false">${esc(this.s.json)}</textarea>` },
        { title: 'JSON Schema 检查', why: '表头加填表须知。', body: `<label><input type="checkbox" data-k="nul" ${this.s.nul ? 'checked' : ''}> 生卒年允许 null</label>${perr ? `<p class="warn">不是合法 JSON：${esc(perr)}</p>` : errs.length ? `<ul class="warn">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : '<p class="okbox"><b>符合 schema</b></p>'}<p class="sub">schema：${p?.teach ? '讲义 4.2 A 型（材料包中运行记录所载）' : '讲义附录 A 型（页内副本）'}；页内校验器只实现 type、required、enum、items。</p>` },
      ], { active: 3 }));
    }
  }
  register('shape-lab', ShapeLab);

  /* ================= D22 约束解码 ================= */
  const CANDS = [['1085', 0.31], ['1067', 0.22], ['"不詳"', 0.18], ['null', 0.12], ['1000', 0.09], ['"未見"', 0.08]];
  class ConstrainLab extends PackLab {
    get key() { return 'w7-d22'; }
    defaults() { return { nul: false, step: 0 }; }
    render() {
      const page = pageById('D22'); const nul = this.s.nul === true || this.s.nul === 'true';
      const ok = (c) => /^\d+$/.test(c) || (nul && c === 'null');
      const kept = CANDS.filter(([c]) => ok(c)), z = kept.reduce((s, [, p]) => s + p, 0);
      const best = kept.sort((a, b) => b[1] - a[1])[0];
      rerender(this, flowShell(page, [
        { title: '已生成的前缀', why: '模型逐个词元生成。', body: `<pre class="code">{"name": "王珪", …, "death_year": <span class="caret">▌</span></pre><p class="sub">原文若没有卒年，此处该写什么？</p>` },
        { title: 'schema 此处的要求', why: '把 schema 编成状态机。', body: `<label><input type="checkbox" data-k="nul" ${nul ? 'checked' : ''}> 允许 null</label>
          <svg viewBox="0 0 300 150" class="fsm"><g class="st"><circle cx="30" cy="40" r="18"/><text x="30" y="44">起</text></g><g class="st"><circle cx="150" cy="40" r="22"/><text x="150" y="44">数字</text></g><g class="st"><circle cx="270" cy="40" r="18"/><text x="270" y="44">终</text></g><line x1="48" y1="40" x2="128" y2="40"/><line x1="172" y1="40" x2="252" y2="40"/><text x="88" y="32" class="sm">0—9</text>
          ${nul ? '<g class="st on"><rect x="105" y="100" width="90" height="30"/><text x="150" y="120">n→u→l→l</text></g><line x1="44" y1="54" x2="105" y2="110"/><line x1="195" y1="110" x2="258" y2="54"/>' : '<text x="150" y="118" class="sm">（不允许 null：这条路径不存在）</text>'}</svg>` },
        { title: '候选词元：保留与屏蔽', why: '不合法的词元概率置零，其余重新归一。', body: `<table class="steps"><tr><th>候选</th><th>原概率</th><th>处理</th></tr>${CANDS.map(([c, p]) => `<tr class="${ok(c) ? '' : 'bad'}"><td class="mono">${esc(c)}</td><td>${p.toFixed(2)}</td><td>${ok(c) ? '保留 → ' + (p / z).toFixed(2) : '屏蔽'}</td></tr>`).join('')}</table><p class="sub">候选与概率为教学构造（示意），不是模型的真实分布；真实运行结果见 ${pageLink('D23')}。</p>` },
        { title: '能写出的值', why: '保证格式，不保证内容。', body: `<p class="big-num mono">${esc(best[0])}</p><p>${nul ? '“原文未见”有了合法写法 null。' : '<b>不允许 null 时，“原文未见”没有合法写法</b>，只能写一个整数。'}</p>
          <p class="lab-quote">“Structured outputs guarantee schema-compliant responses through constrained decoding”<br><span class="sub">结构化输出通过约束解码保证回复符合 schema。——Anthropic, “Structured outputs”（同页列出拒答、达到长度上限等例外）</span></p>
          <p class="lab-quote">“the model may still make mistakes within the values of the JSON object”<br><span class="sub">模型仍可能在 JSON 对象的值上出错。——OpenAI, 2024-08-06, Limitations（讲义已核，待补全句）</span></p>
          <details><summary>争议：格式约束与推理</summary><p class="lab-quote">“Surprisingly, we observe a significant decline in LLMs reasoning abilities under format restrictions.”<br><span class="sub">出乎意料的是，我们观察到格式限制下大模型的推理能力显著下降。——Tam et al., arXiv:2408.02442v3（讲义所引 EMNLP 版作 “LLMs'”，待核）</span></p><p>.txt 撰文反驳，按其做法重跑后结构化输出略好（GSM8K 0.78 对 0.77）。做法：需要推理的判断先用自然语言写理由，再填表。</p></details>` },
      ], { active: 3 }));
    }
  }
  register('constrain-lab', ConstrainLab);

  /* ================= D23 A／B 实跑回放 ================= */
  const A_TRUTH = { birth_year: '原文未见（据“年六十七”可推为 1019）', death_year: '“八年……五月，卒於位”，元丰八年（1085）', '參知政事': '“熙寧三年，拜參知政事”（1070／1071）', '尚書左僕射兼門下侍郎': '元丰五年（1082）', '右補闕': '曾祖永的官，非王珪', '學士承旨': '神宗即位（1067）' };
  function rules(persons, text) {
    const out = []; const ageM = text.match(/年(六十七|[一二三四五六七八九十]+)/);
    for (const p of persons || []) {
      const off = p.offices || [];
      if (p.death_year != null) off.forEach((o) => { if (o.year != null && o.year > p.death_year) out.push([p.name, `任官 ${o.title} ${o.year} 晚于卒年 ${p.death_year}`]); });
      if (p.birth_year != null && p.death_year != null && ageM && p.name === '王珪' && p.death_year - p.birth_year + 1 !== 67) out.push([p.name, `生卒 ${p.birth_year}—${p.death_year} 与原文“年六十七”不合（应差 66）`]);
      if (p.birth_year != null) off.forEach((o) => { if (o.year != null && o.year < p.birth_year + 15) out.push([p.name, `任官 ${o.title} ${o.year} 在生年 ${p.birth_year} 后不到 15 年`]); });
      if (p.birth_year === 0 || p.death_year === 0) out.push([p.name, '年份为 0：用不可能的值充当“没有”']);
      const ys = off.map((o) => o.year).filter((y) => y != null); const same = ys.filter((y, i) => ys.indexOf(y) !== i);
      if (same.length >= 3) out.push([p.name, `${same.length + 1} 项任官同为 ${same[0]} 年：年份疑为填充`]);
    }
    return out;
  }
  class ReplayLab extends PackLab {
    get key() { return 'w7-d23'; }
    defaults() { return { v: 'A', pick: '', ty: 'all' }; }
    render() {
      const p = P(), page = pageById('D23'); if (!p?.teach) return gate(this, '讲义 4.2 的 A／B 抽取记录（教学文件夹原件）与王珪传选段');
      const E = p.teach.extract, text = p.teach.inputs.songshi_wanggui_excerpt;
      const key = { A: 'songshi_wanggui_excerpt__A', F: 'songshi_wanggui_excerpt__A-free', B: 'songshi_wanggui_excerpt__B', R: 'songshi_wanggui_excerpt__A' }[this.s.v]; const R = E[key];
      const meta = `<p class="sub">${esc(R.model_file)} · llama-cpp-python ${esc(R.llama_cpp_python)} · 温度 ${R.temperature} · ${R.constrained_decoding ? 'JSON Schema 约束解码' : '不加约束'} · ${esc(R.run_at)} · ${R.seconds} 秒 · ${R.usage.completion_tokens} 词元 · finish_reason=${esc(R.finish_reason)}${R.parse_error ? ' · <span class="warn">原始回复非合法 JSON</span>' : ''}</p>`;
      let right = '';
      if (this.s.v === 'A' || this.s.v === 'F') {
        right = (R.parsed.persons || []).map((per) => `<table class="steps"><tr><th colspan="3">${esc(per.name)}</th></tr>
          <tr><td>aliases</td><td>${esc((per.aliases || []).join('、') || '—')}</td><td class="sub">原文：字禹玉；封岐國公；諡文恭；时称“三旨相公”</td></tr>
          ${['native_place', 'birth_year', 'death_year'].map((k) => `<tr class="${per.name === '王珪' && A_TRUTH[k] ? 'bad' : ''}"><td>${k}</td><td class="mono">${esc(String(per[k]))}</td><td class="sub">${per.name === '王珪' ? esc(A_TRUTH[k] || '') : ''}</td></tr>`).join('')}
          ${(per.offices || []).map((o) => `<tr class="${A_TRUTH[o.title] ? 'bad' : ''}"><td>${esc(o.title)}</td><td class="mono">${esc(String(o.year))}</td><td class="sub">${esc(A_TRUTH[o.title] || '')}</td></tr>`).join('')}</table>`).join('');
      } else if (this.s.v === 'B') {
        const ms = R.recovered.mentions; const types = [...new Set(ms.map((m) => m.entity_type))];
        const sel = ms.filter((m) => this.s.ty === 'all' || m.entity_type === this.s.ty);
        const flags = (m) => [!text.includes(m.evidence) ? '证据不在原文' : '', /或/.test(m.refers_to || '') && m.basis === '原文直接记载' ? '推测却标直接记载' : '', /^今/.test(m.refers_to || '') ? '以今地名作规范值' : '', m.surface.length >= 4 && m.entity_type === '人物' ? '边界或类型可疑' : ''].filter(Boolean);
        right = `<p>${esc(R.recovered_note)}：容错读出 ${ms.length} 条 mention，events ${R.recovered.events.length} 条；basis 分布：${esc(JSON.stringify(ms.reduce((a, m) => (a[m.basis] = (a[m.basis] || 0) + 1, a), {})))}</p>${seg('ty', [['all', '全部'], ...types.map((t) => [t, t])], this.s.ty)}
          <table class="steps"><tr><th>surface</th><th>类型</th><th>refers_to</th><th>自动检查</th></tr>${sel.map((m) => { const f = flags(m); return `<tr class="${f.length ? 'bad' : ''}" data-set="pick:${esc(m.evidence)}"><td>${esc(m.surface)}</td><td>${esc(m.entity_type)}</td><td>${esc(m.refers_to ?? 'null')}</td><td class="sub">${esc(f.join('；'))}</td></tr>`; }).join('')}</table>`;
      } else {
        const vs = rules(E.songshi_wanggui_excerpt__A.parsed.persons, text), vf = rules(E['songshi_wanggui_excerpt__A-free'].parsed.persons, text);
        right = `<p>三条史学规则，在页面上对两份输出实时检查：任官年不晚于卒年；生卒与“年六十七”相合；任官不早于生年后 15 年；另查年份为 0、大量同年。</p>
          <h4>A 型（约束解码）：${vs.length} 处违规</h4><ul class="warn">${vs.map(([n, m]) => `<li>${esc(n)}：${esc(m)}</li>`).join('')}</ul>
          <h4>不加约束对照：${vf.length} 处违规</h4><ul class="warn">${vf.map(([n, m]) => `<li>${esc(n)}：${esc(m)}</li>`).join('')}</ul>
          <p class="sub">规则能拦住一部分错误（如生年 1000、王琪 0／0）；参知政事 1053 这类“合乎规则的错年份”拦不住，仍要回原文。重试可能让模型“改到能通过为止”。页内规则为自写，不调用 Instructor。</p>`;
      }
      const lhl = this.s.v === 'B' && this.s.pick ? hl(text, [this.s.pick]) : hl(text, ['熙寧三年，拜參知政事', '年六十七', '八年', '曾祖永，事太宗為右補闕', '五年，正三省官名，拜尚書左僕射兼門下侍郎']);
      rerender(this, `<div class="ev-bar">${seg('v', [['A', 'A 型（人物卡片，全部必填）'], ['F', '不加约束对照'], ['B', 'B 型（证据表式）'], ['R', '史学规则校验']], this.s.v)}</div>${meta}
        <div class="runpage"><div class="runsrc"><p class="sub">输入：王珪传选段（${text.length} 字，维基文库录文）</p><pre class="srcbox small-src">${lhl}</pre>
          <details><summary>运行设置与提示</summary><pre class="code small-src">${esc(R.system)}\n\n${esc(R.user.slice(0, 400))}……</pre></details>
          <p class="note-box small">A 型生年“1000”在不加约束时成了 null——是 schema 逼出来的；可任官年份不加约束照样是编的。B 型给了“推定”“原文未见”与 null，模型却 76 条全标“原文直接记载”，并在 4096 词元处截断。</p>
          <label class="field">练习（2 分钟）：A 型 schema 哪几个字段应当允许 null，哪几个应当再加一栏“依据”？<textarea data-k="ex" rows="2">${esc(this.s.ex || '')}</textarea></label></div>
        <div class="runlist">${right}</div></div>`);
    }
  }
  register('replay-lab', ReplayLab);

  /* ================= D24 两种日文输入 ================= */
  const D24_ROWS = ['細川民部少輔', '鷹司前關白', '一條', '畠山尾州', '大内左京大夫', '九州大樹'];
  class JaInputsLab extends PackLab {
    get key() { return 'w7-d24'; }
    defaults() { return { ukiyo: false }; }
    render() {
      const p = P(), page = pageById('D24'); if (!p?.teach) return gate(this, '『大日本史料』第 1 页两种输入的 B 型抽取记录（教学文件夹原件）');
      const E = p.teach.extract, ref = E['dnsr_9-1_p1_reference__B'], ocr = E['dnsr_9-1_p1_ndlocr__B'];
      const find = (R, w) => (R.parsed.mentions || []).filter((m) => (m.surface || '').includes(w) || (w === '一條' && /^一條/.test(m.surface || '')) || (w === '九州大樹' && m.surface === '大樹'));
      const cell = (R, w) => { const ms = find(R, w); if (!ms.length) return '<td class="dim">（未抽出）</td>'; return `<td>${ms.slice(0, 2).map((m) => `${esc(m.surface)} → <b>${esc(m.refers_to ?? 'null')}</b> <span class="sub">${esc(m.entity_type)}</span>`).join('<br>')}</td>`; };
      const ev = (R) => (R.parsed.events || []).filter((e) => /九州大樹|入洛/.test((e.evidence || '') + (e.what || ''))).slice(0, 3);
      const U = E.ukiyo_toyokuni3_reference__B;
      rerender(this, flowShell(page, [
        { title: '两种输入', why: '同一模型、同一 B 型 schema。', body: `<p><b>参照转录</b>（保留编者括注）：${ref.seconds} 秒，${ref.finish_reason}</p><p><b>NDLOCR-Lite 识读</b>（括注缺失）：${ocr.seconds} 秒，${ocr.finish_reason}</p><details><summary>两份输入原文</summary><pre class="srcbox small-src">${esc(p.teach.inputs['dnsr_9-1_p1_reference'])}</pre><pre class="srcbox small-src">${esc(p.teach.inputs['dnsr_9-1_p1_ndlocr'])}</pre></details>` },
        { title: '抽取出的称呼与所指', why: '按原文称呼逐行对照两份输出（surface → refers_to）。', body: `<table class="steps"><tr><th>原文称呼</th><th>参照转录</th><th>OCR</th></tr>${D24_ROWS.map((w) => `<tr><td>${esc(w)}</td>${cell(ref, w)}${cell(ocr, w)}</tr>`).join('')}</table>` },
        { title: '对照编者括注', why: '链接对了的，原文旁都有编者括注。', body: `<table class="steps"><tr><th>称呼</th><th>编者括注</th></tr>${[['細川民部少輔', '高國'], ['鷹司前關白父子', '政平・兼輔'], ['一條', '冬良'], ['畠山尾州', '尚順'], ['大内左京大夫', '義興'], ['九州大樹', '（无）']].map(([a, b]) => `<tr class="${b === '（无）' ? 'bad' : ''}"><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
          <p><b>“入洛”一事</b></p><p class="sub">参照转录：${ev(ref).map((e) => esc(e.who + '：' + e.what)).join('；') || '—'}</p><p class="sub">OCR：${ev(ocr).map((e) => esc(e.who + '：' + e.what)).join('；') || '—'}</p>` },
        { title: '结论', why: '抽取的质量取决于输入里保留了多少前人的判断。', body: `<p class="note-box">模型在这里主要是在<b>抄写</b>编者九十多年前的判断：有括注的链对，无括注的“九州大樹”认不出（“九州”含义两说，未决问题 U-01）。识读丢掉括注，判断就跟着消失；错位的一行还会把事记到别人名下。</p>
          <button class="small" data-set="ukiyo:${this.s.ukiyo ? '' : '1'}">${this.s.ukiyo ? '收起' : '展开'}『浮世絵類考』豐國条的 B 型结果</button>
          ${this.s.ukiyo ? `<p class="sub">${U.seconds} 秒，${esc(U.finish_reason)}（截断）；容错读出 mention ${U.recovered.mentions.length} 条、event ${U.recovered.events.length} 条。</p><table class="steps">${U.recovered.mentions.filter((m) => m.entity_type === '人物').slice(0, 14).map((m) => `<tr><td>${esc(m.surface)}</td><td>${esc(m.refers_to ?? 'null')}</td></tr>`).join('')}</table>` : ''}` },
      ], { active: 3 }));
    }
  }
  register('ja-inputs-lab', JaInputsLab);

  /* ================= D26 清洗 ================= */
  const D26_VALUES = ['開封', '开封', '開封府', '禹玉', '禹玉 ', '1071', '熙寧三年', '熙寧3年', '國貞（1840）', '國貞（1850）', '成都華陽', '成都华阳'];
  const T2S = { 開: '开', 華: '华', 陽: '阳', 寧: '宁', 國: '国', 貞: '贞' };
  class CleanLab extends PackLab {
    get key() { return 'w7-d26'; }
    defaults() { return { keyfn: 'ts', dec: {} }; }
    render() {
      const page = pageById('D26');
      const K = { space: (v) => v.trim(), ts: (v) => [...v.trim()].map((c) => T2S[c] || c).join(''), suffix: (v) => [...v.trim()].map((c) => T2S[c] || c).join('').replace(/[府州县]$/, '').replace(/（.*）/, '') }[this.s.keyfn];
      const groups = {}; D26_VALUES.forEach((v) => (groups[K(v)] = groups[K(v)] || []).push(v));
      const G = Object.entries(groups).filter(([, v]) => v.length > 1);
      const norm = (v) => { const g = G.find(([, vs]) => vs.includes(v)); if (!g) return v.trim(); const d = this.s.dec[g[0]]; return d === 'merge' ? g[1][0].trim() : v.trim(); };
      rerender(this, flowShell(page, [
        { title: '原值列', why: '一个字也不动。', body: `<table class="steps">${D26_VALUES.map((v) => `<tr><td class="mono">“${esc(v)}”</td></tr>`).join('')}</table>` },
        { title: '按写法聚类', why: '聚类键决定什么算“看起来相同”。', body: seg('keyfn', [['space', '去空格'], ['ts', '＋繁简'], ['suffix', '＋去府州县与括注']], this.s.keyfn) + G.map(([k, vs]) => `<div class="pcard"><b class="mono">${esc(k)}</b>：${vs.map((v) => `“${esc(v)}”`).join('、')}</div>`).join('') + '<p class="sub">繁简为页内小表（教学用）。“1071／熙寧三年”这类不同写法聚类找不出，要靠换算（D14）。</p>' },
        { title: '人工确认', why: '按下“全部合并”之前，先问是不是同一个对象。', body: G.map(([k, vs]) => `<div class="pcard"><b class="mono">${esc(k)}</b> ${seg('dec_' + k, [['merge', '合并'], ['keep', '不合并']], this.s.dec[k] || '')}${/國貞|国贞/.test(k) ? '<p class="warn small">“國貞”在 1844 年前后指不同的人（三世豊国、四世豊国）。</p>' : ''}${/開封|开封/.test(k) && this.s.keyfn === 'suffix' ? '<p class="warn small">“開封”与“開封府”可能是县与府两级。</p>' : ''}</div>`).join('') },
        { title: '规范值列', why: '清洗只在规范值一栏进行，出错还能从原值恢复。', body: `<table class="steps"><tr><th>原值</th><th>规范值</th></tr>${D26_VALUES.map((v) => `<tr class="${norm(v) !== v ? 'on' : ''}"><td class="mono">“${esc(v)}”</td><td class="mono">“${esc(norm(v))}”</td></tr>`).join('')}</table><button class="small" data-set="dec:{}">撤销全部决定</button>` },
      ], { active: 2 }));
    }
    set(k, v) { if (k.startsWith('dec_')) { this.s.dec[k.slice(4)] = v; this.save(); return; } if (k === 'dec') { this.s.dec = {}; this.save(); return; } super.set(k, v); }
  }
  register('clean-lab', CleanLab);

  /* ================= D28 对勘实践 ================= */
  class PracticeLab extends PackLab {
    get key() { return 'w7-d28'; }
    defaults() { return { mat: 'songshi', tab: 'ev', t0: 0, marks: {}, conf: {} }; }
    init() {
      this.addEventListener('change', (e) => { const t = e.target; if (t.dataset.m != null) { this.s.marks[this.s.mat + '|' + t.dataset.m] = t.value; this.save(); } if (t.dataset.cf != null) { this.s.conf[this.s.mat + '|' + t.dataset.cf] = t.value; this.save(); } });
      this.timer = setInterval(() => { const n = this.querySelector('.clock'); if (n && this.s.t0) n.textContent = this.clock(); }, 1000);
    }
    disconnectedCallback() { clearInterval(this.timer); }
    clock() { const left = Math.max(0, 15 * 60 - Math.floor((Date.now() - this.s.t0) / 1000)); return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; }
    items() {
      const p = P(); if (!p?.teach) return [];
      if (this.s.mat === 'songshi') { const A = p.teach.extract.songshi_wanggui_excerpt__A.parsed.persons, B = p.teach.extract.songshi_wanggui_excerpt__B.recovered.mentions;
        return [...A.flatMap((x) => [`A｜${x.name}｜生 ${x.birth_year}｜卒 ${x.death_year}`, ...x.offices.map((o) => `A｜${x.name}｜${o.title} ${o.year}`)]), ...B.map((m) => `B｜${m.entity_type}｜${m.surface} → ${m.refers_to ?? 'null'}`)]; }
      return p.teach.extract['dnsr_9-1_p1_reference__B'].parsed.mentions.map((m) => `B｜${m.entity_type}｜${m.surface} → ${m.refers_to ?? 'null'}`);
    }
    render() {
      const p = P(), page = pageById('D28'); if (!p?.teach) return gate(this, '王珪传 A／B 抽取记录、『大日本史料』第 1 页 B 型抽取（教学文件夹原件）');
      const its = this.items(), mk = (i) => this.s.marks[this.s.mat + '|' + i] || '';
      const marked = its.map((t, i) => [t, mk(i)]).filter(([, m]) => m);
      const conf = marked.filter(([, m]) => m === '时地冲突' || m === '链接错');
      const report = () => `# 对勘实践记录（${this.s.mat === 'songshi' ? '甲：王珪传' : '乙：大日本史料第 1 页'}）\n\n## 证据表\n\n${W.Evidence.csv(W.Evidence.rows(this.s.mat === 'songshi' ? 'songshi' : 'dnsr')).replace('﻿', '')}\n\n## 错误标记\n\n${marked.map(([t, m]) => `- ${t}：${m}`).join('\n')}\n\n## 真伪\n\n${conf.map(([t]) => `- ${t}：${this.s.conf[this.s.mat + '|' + its.indexOf(t)] || '未判'}`).join('\n')}\n`;
      let pane = '';
      if (this.s.tab === 'ev') pane = `<evidence-table material="${this.s.mat === 'songshi' ? 'songshi' : 'dnsr'}" compact></evidence-table>`;
      if (this.s.tab === 'err') pane = `<div class="runpage"><div class="runsrc"><pre class="srcbox small-src">${esc(this.s.mat === 'songshi' ? p.teach.inputs.songshi_wanggui_excerpt : p.teach.reference['dnsr_9-1_p1_reference'])}</pre></div><div class="runlist"><table class="steps">${its.map((t, i) => `<tr class="${mk(i) ? 'bad' : ''}"><td class="small">${esc(t)}</td><td><select data-m="${i}"><option value="">—</option>${ERRTYPES.map((e) => `<option ${mk(i) === e ? 'selected' : ''}>${e}</option>`).join('')}</select></td></tr>`).join('')}</table></div></div>`;
      if (this.s.tab === 'tf') pane = conf.length ? `<table class="steps"><tr><th>条目</th><th>真伪</th></tr>${conf.map(([t]) => { const i = its.indexOf(t); return `<tr><td>${esc(t)}</td><td><select data-cf="${i}"><option value="">—</option>${['真冲突：回原文', '伪冲突：注明换算或称呼'].map((x) => `<option ${this.s.conf[this.s.mat + '|' + i] === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td></tr>`; }).join('')}</table>` : '<p class="sub">在“标错误”中标为“时地冲突”或“链接错”的条目会列在这里。</p>';
      rerender(this, `<div class="ev-bar">${seg('mat', [['songshi', '甲：王珪传＋A／B 型输出'], ['dnsr', '乙：大日本史料第 1 页＋B 型输出']], this.s.mat)}　<button class="small" data-set="t0:${Date.now()}">${this.s.t0 ? '重新计时' : '开始计时'}</button> <span class="clock big-num">${this.s.t0 ? this.clock() : '15:00'}</span>　<button class="small" data-dl>导出记录</button></div>
        <div class="tabs">${seg('tab', [['ev', '① 填证据表（五条）'], ['err', `② 标错误（已标 ${marked.length}）`], ['tf', `③ 分真伪（${conf.length}）`]], this.s.tab)}</div>
        <div class="practice-grid"><div class="through-pane">${pane}</div><aside class="errref"><b>错误类型</b><ul>${ERRTYPES.map((e) => `<li>${e}</li>`).join('')}</ul><p class="sub">开场例子：网页抓取工具把唐代王珪的字“叔玠”写成“叔珠”，又漏掉王安石的封爵“舒國公”——“让模型读一下网页再告诉我”，本身就是一次抽取。</p></aside></div>`);
      this.querySelector('[data-dl]').onclick = () => download(`对勘实践_${this.s.mat}.md`, report());
    }
  }
  register('practice-lab', PracticeLab);

  /* ================= D29 结语 ================= */
  class HeroEnd7 extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<div class="hero-lab"><p class="hero-title">表中的一行，凭什么可以代替史料中的那句话？</p>
        <div class="hero-path">${[['拆得开', '断言与证据分开存放', 'D05'], ['认得准', '名字认作一个确定的人', 'D12'], ['对得上', '年号换算、地名带年代、同现与在场分开', 'D18'], ['查得回', '每一格回到原文的某一页', 'D25']].map(([a, b, p]) => `<a href="#${p}"><b>${a}</b><small>${b}</small><small class="sub">反例：${p}</small></a>`).join('')}</div>
        <p class="hero-lead">机器能很快地给出候选、填好格式；这四个条件，没有一个会因为模型更强而自动满足。</p>
        <p class="sub">第八周：同一张人物表，画成社会网络、放上历史地图、排成时间线——那时的错误节点，往往就来自今天的某一格。</p></div>`;
    }
  }
  register('hero-end7', HeroEnd7);

  /* ================= D31 概念表（v5 五块） ================= */
  class ConceptTable7 extends HTMLElement {
    connectedCallback() { this.q = ''; this.sel = null; this.addEventListener('input', (e) => { if (e.target.dataset.q != null) { this.q = e.target.value; this.render(); } }); this.addEventListener('click', (e) => { const b = e.target.closest('[data-term]'); if (b) { this.sel = b.dataset.term; this.render(); this.querySelector('.ccard.on')?.scrollIntoView({ block: 'start' }); } }); this.render(); }
    render() {
      const g = window.Deck.DATA.glossary; const q = this.q.toLowerCase();
      const match = (t) => !q || [t.term, t.en, t.definition, ...Object.values(t.fields), ...t.paragraphs].join(' ').toLowerCase().includes(q);
      const card = (t) => `<article class="ccard ${this.sel === t.term ? 'on' : ''}" id="c-${esc(t.term)}"><header><h3>${esc(t.term)}</h3><span class="sub">${esc(t.fields.alias || t.en)}｜${esc(t.fields.where || '')}</span></header>
        <div class="c5"><div><b>① 定义</b><p class="cdef">${esc(t.definition || '')}</p><p class="sub">它解决什么问题：${esc(t.fields.problem || '')}</p></div>
        <div><b>② 机制${t.formulaHtml ? '与公式' : ''}</b>${t.formulaHtml ? `<div class="formula">${t.formulaHtml}</div>` : ''}<details><summary>讲解</summary>${t.paragraphs.map((x) => `<p>${esc(x)}</p>`).join('')}</details></div>
        <div><b>③ 本讲例子</b><p>${esc(t.fields.classroom || '')}</p>${t.first_slide ? `<p>${pageLink(t.first_slide, '到 ' + t.first_slide + ' 动手看')}</p>` : ''}</div>
        <div><b>④ 易混处</b><p>${esc(t.fields.confusion || '')}</p></div>
        <div><b>⑤ 对历史研究的意义</b><p>${esc(t.fields.history || '')}</p></div></div></article>`;
      rerender(this, `<div class="glossary"><aside><input data-q placeholder="搜索中文、英文、释义" value="${esc(this.q)}">${g.categories.map((c) => `<h4>${esc(c.label)}</h4>${c.terms.filter(match).map((t) => `<button class="${this.sel === t.term ? 'sel' : ''}" data-term="${esc(t.term)}">${esc(t.term)}</button>`).join('')}`).join('')}</aside>
        <div class="glossary-main">${g.intro && !q ? `<p class="note-box">${esc(g.intro)}</p>` : ''}${g.categories.map((c) => { const ts = c.terms.filter(match); return ts.length ? `<h2>${esc(c.label)}</h2>${ts.map(card).join('')}` : ''; }).join('') || '<p class="note-box">没有找到匹配的概念。</p>'}
        ${g.previous?.length && !q ? `<h2>前几周已讲</h2><ul class="previous">${g.previous.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>`);
    }
  }
  register('concept-table7', ConceptTable7);
})();
