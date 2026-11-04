/* 第八周页面组件（三）：D02、D03、D05、D07。依赖 deck-core.js（window.Deck）、week08-core.js（window.W8）与 week08-labs.js（window.W8L）。 */
(() => {
  'use strict';
  const { esc, store, pageById, pageLink, flowShell, rerender, register } = window.Deck;
  const W = window.W8;
  const { Lab, seg, f2 } = window.W8L;

  /* ================= D02 远读从哪里来 ================= */
  const D02_STAGES = [
    { name: '细读', tag: '新批评，20 世纪前中期', lesson: '只从文本本身出发，逐字逐句分析少数作品的语言与结构；史学的细读还要追问版本、史源与语境。',
      unit: '一部作品、一篇文字', quote: null, src: '讲义 1.1 第 1 段（“细读”沿用通译，助教意见）' },
    { name: '远读', tag: '莫莱蒂 2000', lesson: '没有人读得完世界文学；与其读得更多，不如改换研究的单位：比文本小的手法、主题，或比文本大的文类、体系，并接受“失去一些东西”。',
      unit: '手法、主题、文类、体系', quote: ['distance, let me repeat it, is a condition of knowledge', '距离（让我再说一遍）是认识的条件', 'Moretti, “Conjectures on World Literature”, New Left Review 1 (2000): 57；2026-11-02 据原刊第 57 页网络影本核对'],
      src: '讲义 1.1 第 2—3 段；Moretti 2005《图表、地图、树》的三种模型' },
    { name: '可伸缩阅读', tag: 'Mueller；绘制文人共和国', lesson: '在远看与近读之间按需切换：远看发现格局，近读解释或推翻它，近读中的新问题再送回远看。',
      unit: '按问题在两种单位之间往返', quote: null, src: '讲义 1.2；Edelstein 等 2017（AHR 122.2）称可视化是“启发”而非“证明”（p. 419，讲义概括，非原句）' },
  ];
  const D02_UNITS = [ // 换一个单位：本课件中在这一单位上工作的页
    ['字与字串', '数一部书里的字、看每一处上下文', 'D05'], ['句', '两句之间的字面与语义相似', 'D06'], ['篇', '一批文献各由哪些主题构成', 'D07'],
    ['人与关系', '一群人之间的连线与位置', 'D10'], ['地点', '一批地名的分布与对账', 'D16'], ['年份', '一串年份的先后与切片', 'D20'],
  ];
  const D02_MODELS = [['曲线图（graphs）', '时间曲线', 'D20'], ['地图（maps）', '地图', 'D19'], ['树形图（trees）', '讲义对应为网络', 'D10']];
  const D02_CRIT = [
    { who: 'Nan Z. Da 2019', what: '针对结论', q: ['either robust and obvious or not obvious and not robust', '要么稳健而显然，要么不显然也不稳健', 'Critical Inquiry 45.3: 601–639（讲义 1.3 备查注所引）'],
      body: '回应者指出，细读传统中“某诗人常用某词”一类论据同样未经统计检验。', try: ['D11', '与随机网络比：一个格局是否超出随机所能产生'] },
    { who: 'Pechenick 等 2015', what: '针对材料', q: ['a library, containing one of each book', '每本书只收一册的图书馆', 'PLoS ONE 10: e0137041（讲义 1.3 所引）'],
      body: '多产作者能把新词组“写进”词频曲线；科学文献比例上升使英语总库的趋势失真。', try: ['D04', '看出处的分布：王珪 97 条中 63 条出自《華陽集》'] },
    { who: 'Six Degrees of Francis Bacon（Warren 等 2016）', what: '针对材料', q: null,
      body: 'ODNB 在 1500—1700 年的传主中女性只占 6%，由传记文本推断出的网络继承了这一偏向（讲义 2 节方法×对象注；案例 C-08）。', try: ['D13', '看 JBDB 两部日记的人物按性别计数'] },
    { who: '石晨叶 2026', what: '针对审查', q: null,
      body: '量化大历史在跨学科发表中形成“双重豁免”：古代史学者难以审查统计框架，统计审稿人无力评判史料代表性（讲义 1.3 备查注；案例 C-24）。', try: ['D04', '进阶：缺失值按“无”处理还是剔除，结论会怎样变'] },
    { who: 'Underwood 2025 访谈', what: '分工松动', q: null,
      body: '远读的前提是人读与机器读之间的分工，而模型已能做过去叫作细读的工作，他因此不再爱用“远读”一词（讲义 1.3 备查注；读取深度：期刊页韩译）。', try: ['D18', '模型替人读出地名，仍要逐条回原文'] },
  ];
  class DistantStages extends Lab {
    defaults() { return { st: '1', unit: '', ans: '', adv: false }; }
    render() {
      const S = D02_STAGES[+this.s.st];
      const q = `<div class="d02-q"><p><b>${esc(pageById('D02').question)}</b></p>${seg('ans', [['speed', '读的速度'], ['unit', '研究的单位']], this.s.ans)}
        ${this.s.ans ? `<p class="${this.s.ans === 'unit' ? 'okbox' : 'note-box'}">${this.s.ans === 'unit' ? '讲义的回答：远读首先不是“用电脑读”，而是“决定看什么单位”。' : '电脑让读得更快，但讲义强调的是另一件事：远读首先是“决定看什么单位”。年表、世系表、职官表不用电脑，也是换单位。'}</p>` : ''}</div>`;
      const card = `<div class="stagebar">${D02_STAGES.map((x, i) => `<button class="${+this.s.st === i ? 'on' : ''}" data-set="st:${i}"><b>${esc(x.name)}</b><small>${esc(x.tag)}</small></button>`).join('<span class="arrow">→</span>')}</div>
        <div class="pcard keep"><p><b>研究的单位</b>　${esc(S.unit)}</p><p>${esc(S.lesson)}</p>
          ${S.quote ? `<p class="lab-quote">“${esc(S.quote[0])}”<br><span class="sub">${esc(S.quote[1])}——${esc(S.quote[2])}</span></p>` : ''}
          <p class="sub">${esc(S.src)}</p></div>
        ${+this.s.st === 1 ? `<p class="sub">莫莱蒂后来把这类做法概括为三种抽象模型，本课件中各有对应的页：${D02_MODELS.map(([a, b, p]) => `${esc(a)}→${esc(b)}（${pageLink(p)}）`).join('；')}。</p>` : ''}`;
      const U = D02_UNITS.find(([u]) => u === this.s.unit);
      const units = `<p class="sub">换一个单位，看到的东西就不同。点一个单位，看本课件在这一单位上做什么：</p>
        <div class="chips">${D02_UNITS.map(([u]) => `<button class="small ${this.s.unit === u ? 'on' : ''}" data-set="unit:${esc(u)}">${esc(u)}</button>`).join('')}</div>
        ${U ? `<p class="okbox">以“${esc(U[0])}”为单位：${esc(U[1])}。见 ${pageLink(U[2])}。</p>` : ''}`;
      const adv = `<details ${this.s.adv ? 'open' : ''} data-adv><summary>进阶（课后）：远读的几类批评，各配一个本课件中可以动手的反例（扩充部分甲一）</summary>
        <div class="cards3">${D02_CRIT.map((c) => `<div class="pcard"><b>${esc(c.who)}</b> <span class="tag">${esc(c.what)}</span>
          ${c.q ? `<p class="lab-quote">“${esc(c.q[0])}”<br><span class="sub">${esc(c.q[1])}——${esc(c.q[2])}</span></p>` : ''}<p>${esc(c.body)}</p><p class="sub">动手：${pageLink(c.try[0])}，${esc(c.try[1])}</p></div>`).join('')}</div>
        <p class="sub">英文原句照讲义所引；讲义另注读取深度（Da 一条据原刊，Pechenick 读摘要与引言）。未加引号的为讲义概括。</p></details>`;
      rerender(this, `<div class="split2 d02"><div>${card}${q}</div><div>${units}<p class="note-box">史学并不陌生：年鉴学派统计遗嘱、教区登记与出版目录；中国史学的年表、世系表、职官表，本来就是把大量记录压缩成一张表（讲义 1.1 第 4 段）。</p></div></div>${adv}`);
    }
    init() { this.addEventListener('toggle', (e) => { if (e.target.matches('[data-adv]')) { this.s.adv = e.target.open; store.set(this.key, this.s); } }, true); }
  }
  register('distant-stages', DistantStages);

  /* ================= D03 远看与回读 ================= */
  const D03_Q = [
    { q: '王安石变法期间，台谏官的弹劾对象是否集中于新党？', a: 'both', why: '先把全部弹劾记录按对象的党属计数（远看），再回读弹章，看“新党”是怎样认定的、哪些弹劾另有缘由。' },
    { q: '《華陽集》中某篇墓志对志主卒年的记载是否可靠？', a: 'close', why: '只关乎一篇文字的一处记载：比对墓志、本传与他人文集，考订文本，单位就是这一篇。' },
    { q: '江户后期的儒者通过哪些人结成学问网络？', a: 'both', why: '先由日记、书信构网看谁在中间（远看），再回到日记原文核每一条往来——正是本讲日本史案例（D13）。' },
    { q: '宋代某一路的州县治所在两百年间是否迁移？', a: 'both', why: '先把各时期的治所坐标上图比较（远看），再读方志与地理志的沿革记载核实每一次迁移（D16）。' },
  ];
  const SCALE = [['far', '远看'], ['close', '近读'], ['both', '往返']];
  const METHODS = ['文本挖掘', '网络分析', '地理空间分析', '时序分析'], OBJECTS = ['字词与文献', '人物', '地点', '时间与事件'];
  const FIG_METHODS = [ // 讲义 @fig-methods 原表；[内容, 本课件对应页]
    [['词频、主题、互文（第二节）', 'D05'], ['专门挖掘人名并计数（第七周实体识别之后）', 'D13'], ['从文本中提取地名（4.3）', 'D18'], ['统计年号、干支出现的分布', 'D21']],
    [['词或主题共现网络；文本复用网络（2.2）', 'D06'], ['人物社会网络（第三节）', 'D10'], ['书信寄发地之间的网络', null], ['事件之间的先后与因果链', null]],
    [['文献的刊刻地、收藏地分布', null], ['籍贯、任官、葬地的分布', 'D19'], ['政区沿革、地名对账（第四节）', 'D16'], ['事件发生地的分布', null]],
    [['词频随年份的曲线（1.3）', null], ['关系网络随时间的变化（5.1）', 'D20'], ['政区随时间的变化', null], ['价格、气候等数量序列（扩充六）', 'D22']],
  ];
  const DATASETS = [ // 扩充部分丁一，网址只录扩充部分与讲义所给的
    ['CBDB', '中', '人物', ['网络', '地理', '时序'], '历代人物的传记、亲属、社会关系、任官、地址', '关系年份多缺省（5.1）', 'cbdb-wanggui'],
    ['CHGIS', '中、英', '地点', ['地理'], '历代政区地名，带起止年与坐标', '对账时注意起止年（4.1）'],
    ['ctext', '中', '文本', ['文本'], '先秦至近代传世文献全文与平行段落', '底本与版本'],
    ['MARKUS', '中、韩', '文本', ['文本'], '古汉语文本的人名、地名、官名、时间自动标注工具', '自动标注须逐条核对'],
    ['清代粮价资料库', '中', '事件', ['时序'], '清代各府逐月粮价', '数据质量随时期变化；须申请账号（乙六）'],
    ['JBDB', '日、英', '人物', ['网络'], '日本人物与关系、事件；接口 https://app.jbdb.jp/api', '2026-11-02 已在课前环境查询（D13）'],
    ['CODH 武鑑全集、れきちめ', '日', '地点', ['时序', '地理'], '武鑑的版本差分；历史地名 79,502 条', '见丁二（D21）'],
    ['Old Bailey Online', '英', '事件', ['文本', '时序'], '伦敦中央刑事法院 1674—1913 年的 197,745 场审判记录', '罪名分类为项目编码', null, 'https://www.oldbaileyonline.org/'],
    ['Six Degrees of Francis Bacon', '英', '人物', ['网络'], '近代早期英国人物关系网络，由传记文本推断', '关系为统计推断，带置信度'],
    ['Viral Texts', '英', '文本', ['文本', '网络'], '十九世纪报刊转载的文本群', '数字库覆盖不全', null, 'https://viraltexts.org/'],
    ['Corpus of Lake District Writing', '英', '文本', ['文本', '地理'], '1622—1900 年写英格兰湖区的 80 种文本，约 150 万词，已标注地名', '语料为书写湖区的文本'],
    ['Slave Voyages', '英、西、葡', '事件', ['时序', '地理', '网络'], '约 36,000 次跨大西洋奴隶贸易航程', '现存记录约占四分之三'],
    ['ORBIS', '英', '地点', ['地理', '网络'], '公元 200 年前后罗马世界的交通网络与成本模型', '输出是模型结果，不是史料'],
    ['Pleiades', '英等', '地点', ['地理'], '古代地中海世界地名表，CC-BY，可整包下载', '几乎每月更新，记下版本', null, 'https://pleiades.stoa.org/'],
    ['Allen-Unger 商品价格数据库', '英', '事件', ['时序'], '欧洲及世界各地历史商品价格', '单位与货币要统一', null, 'https://doi.org/10.34894/IPVXMW'],
    ['Seshat', '英', '事件', ['时序'], '数百个政体一万年间的变量', '缺失值的处理（甲八，D04 进阶）'],
    ['Martha Ballard 日记（DoHistory 录文）', '英', '文本', ['文本', '时序'], '1785—1812 年日记 9,999 条', '录文有版权，只进本机材料包（D07）'],
    ['《清实录》台湾资料选辑', '中', '文本', ['文本', '时序'], '9 种选辑 6,184 条（简体录文）', '是选辑，不是全书（D07）'],
  ];
  class ScaleSort extends Lab {
    defaults() { return { pick: {}, show: false, mine: '', mineScale: '', mq: {}, row: '', col: '', dm: '', dobj: '', sel: '' }; }
    render() {
      const pick = this.s.pick || {};
      const done = D03_Q.every((_, i) => pick[i]);
      const col1 = D03_Q.map((x, i) => `<div class="pcard ${this.s.show ? (pick[i] === x.a ? 'keep' : pick[i] ? 'bad-card' : '') : ''}"><p><b>（${i + 1}）</b>${esc(x.q)}</p>
        <div class="seg" role="group">${SCALE.map(([v, l]) => `<button data-pick="${i}:${v}" class="${pick[i] === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`).join('');
      const cols = SCALE.map(([v, l]) => `<div class="bin"><b>${l}</b>${D03_Q.map((x, i) => (pick[i] === v ? `<p class="small">（${i + 1}）${esc(x.q.slice(0, 16))}……</p>` : '')).join('')}</div>`).join('');
      const col2 = `<div class="bins">${cols}</div><p class="sub">已分 ${Object.keys(pick).length}／4。</p>
        <button class="small" data-set="show:${this.s.show ? '' : '1'}">${this.s.show ? '收起讲义判断' : '看讲义判断'}</button>${done || this.s.show ? '' : '<p class="sub">先分完再看。</p>'}`;
      const col3 = this.s.show ? `${D03_Q.map((x, i) => `<p class="${pick[i] === x.a ? 'okbox' : 'note-box'}"><b>（${i + 1}）${SCALE.find(([v]) => v === x.a)[1]}</b>${pick[i] && pick[i] !== x.a ? `（你选了${SCALE.find(([v]) => v === pick[i])[1]}）` : ''}：${esc(x.why)}</p>`).join('')}
        <p class="sub">讲义的判断：第一、三、四个问题先远看再回读，第二个只能近读。理由为课件据讲义 1.2 补写。</p>`
        : '<p class="sub">点“看讲义判断”。</p>';
      const mq = this.s.mq || {};
      const mine = `<label class="field">我的研究问题<textarea data-ki="mine" rows="2" placeholder="例如：唐代某一墓志群中……">${esc(this.s.mine)}</textarea></label>
        ${[['u', '它的研究单位是什么（一篇、一个人、一批记录）？'], ['n', '涉及多少条记录？一个人读得完吗？'], ['b', '格局出来后，回到哪一种原文去核？']].map(([k, t]) => `<label class="field small">${t}<input data-mq="${k}" value="${esc(mq[k] || '')}"></label>`).join('')}
        <p>自评：${seg('mineScale', SCALE, this.s.mineScale)}</p>`;
      // 方法×对象表
      const R = this.s.row, C = this.s.col;
      const table = `<table class="steps mxo"><tr><th>方法＼对象</th>${OBJECTS.map((o) => `<th><button class="small ${C === o ? 'on' : ''}" data-set="col:${C === o ? '' : esc(o)}">${o}</button></th>`).join('')}</tr>
        ${METHODS.map((m, i) => `<tr><th><button class="small ${R === m ? 'on' : ''}" data-set="row:${R === m ? '' : esc(m)}">${m}</button></th>${FIG_METHODS[i].map(([t, p], j) => {
          const on = (!R || R === m) && (!C || C === OBJECTS[j]);
          return `<td class="${on ? '' : 'dim'} ${i === j ? 'diag' : ''}">${esc(t)}${p ? `<br>${pageLink(p)}` : ''}</td>`; }).join('')}</tr>`).join('')}</table>
        <p class="sub">讲义 @fig-methods。对角线（浅色底）是初学时以为的“方法只管一种对象”，其余格子说明同一方法可以施加于不同对象。点行或列筛选；格中链接为本课件中的对应页（无链接的为讲义示例，本课件未做）。</p>`;
      // 进阶：数据集目录
      const ds = DATASETS.filter((d) => (!this.s.dm || d[3].includes(this.s.dm)) && (!this.s.dobj || d[2] === this.s.dobj));
      const sel = DATASETS.find((d) => d[0] === this.s.sel);
      const adv = `<details ${this.s.adv ? 'open' : ''} data-adv><summary>进阶（课后）：可供练习的数据集目录（扩充部分丁一）</summary>
        <p>方法 ${seg('dm', [['', '全部'], ['网络', '网络'], ['地理', '地理'], ['文本', '文本'], ['时序', '时序']], this.s.dm)}　对象 ${seg('dobj', [['', '全部'], ['人物', '人物'], ['地点', '地点'], ['文本', '文本'], ['事件', '事件']], this.s.dobj)}</p>
        <table class="steps"><tr><th>数据集</th><th>语言</th><th>对象与规模</th><th>适合的方法</th><th>注意</th></tr>${ds.map((d) => `<tr data-ds="${esc(d[0])}" class="${this.s.sel === d[0] ? 'on' : ''}"><td>${esc(d[0])}</td><td>${esc(d[1])}</td><td class="small">${esc(d[4])}</td><td>${esc(d[3].join('、'))}</td><td class="small">${esc(d[5])}</td></tr>`).join('')}</table>
        ${sel ? `<div class="pcard keep"><b>${esc(sel[0])}</b>：选一个回答三个问题。<br>它记了什么？没记什么？谁编的？<textarea data-ki="dsnote" rows="2">${esc(this.s.dsnote || '')}</textarea>
          ${sel[7] ? `<p class="sub">官网：<a href="${esc(sel[7])}" target="_blank" rel="noopener">${esc(sel[7])}</a></p>` : '<p class="sub">网址以官网为准（扩充部分未给出）。</p>'}
          ${sel[6] ? `<p class="sub">本课件已有样本：${esc(W.Mat.get(sel[6])?.title || sel[6] + '（课堂导入本机材料包后可用）')}，可在 ${pageLink('D01')}、${pageLink('D10')} 的材料下拉框中选用。</p>` : ''}</div>` : ''}
        <p class="sub">表中信息据各项目页与介绍文字（扩充部分丁一）；下载方式与许可以使用时的官网为准。最后两行为 D07 所用语料。</p></details>`;
      rerender(this, `${flowShell(pageById('D03'), [{ title: '读四个问题', body: col1 }, { title: '分到三栏', body: col2 }, { title: '看讲义判断', body: col3 + `<details><summary>我自己的问题</summary>${mine}</details>` }, { title: '方法×对象', body: table }])}${adv}`);
    }
    init() {
      this.addEventListener('click', (e) => {
        const p = e.target.closest('[data-pick]'); if (p) { const [i, v] = p.dataset.pick.split(':'); this.s.pick = { ...this.s.pick, [i]: v }; this.save(); }
        const d = e.target.closest('[data-ds]'); if (d) { this.s.sel = this.s.sel === d.dataset.ds ? '' : d.dataset.ds; this.save(); }
      });
      this.addEventListener('input', (e) => { const k = e.target.dataset.mq; if (k) { this.s.mq = { ...this.s.mq, [k]: e.target.value }; store.set(this.key, this.s); } });
      this.addEventListener('toggle', (e) => { if (e.target.matches('[data-adv]')) { this.s.adv = e.target.open; store.set(this.key, this.s); } }, true);
    }
  }
  register('scale-sort', ScaleSort);

  /* ================= 文本工具：取文本、切分、KWIC ================= */
  const HAN = /[㐀-鿿豈-﫿\u{20000}-\u{2ffff}]/u;
  const STOP1 = new Set([...'之乎者也而以其於于為为所即則则亦與与及等曰云矣焉哉耳此彼是不有無无']);
  /* 《華陽集》按篇切开：带〔篇题〕的行，或 60 字以内且下一行长出一倍以上的行，为篇题；其下为正文。四库本无句读，篇题只能这样粗分。 */
  function huayangPieces(juans = null) {
    const h = W.Mat.text('huayangji'); if (!h) return [];
    const out = [];
    for (const [j, v] of Object.entries(h.juan)) {
      if (juans && !juans.includes(Number(j))) continue;
      const L = v.lines.filter((x) => x && !/^欽定四庫全書/.test(x) && !/^華陽集[巻卷]/.test(x));
      let cur = null;
      for (let i = 0; i < L.length; i++) {
        const l = L[i], t = l.replace(/^〔篇题〕/, ''), nx = L[i + 1] || '';
        if (l.startsWith('〔篇题〕') || (t.length <= 60 && nx.length > 2 * t.length)) { cur = { id: `${j}-${out.length + 1}`, juan: Number(j), title: t, text: '' }; out.push(cur); }
        else if (cur) cur.text += t;
        else { cur = { id: `${j}-${out.length + 1}`, juan: Number(j), title: '（卷首）', text: t }; out.push(cur); }
      }
    }
    return out.filter((p) => p.text.length >= 20);
  }
  const GENRE = (j) => (j <= 44 ? '制詞（卷三十五至四十四）' : j <= 48 ? '卷四十五至四十八（本地为空）' : '碑志祭文等（卷四十九至六十）');
  function textOf(id, juan) {
    if (id === 'huayangji') { const ps = huayangPieces(juan === 'all' ? null : [Number(juan)]); return { title: `《華陽集》${juan === 'all' ? '卷三十五至六十' : '卷' + juan}（四庫全書本）`, text: ps.map((p) => p.title + '\n' + p.text).join('\n'), ref: '维基文库四庫全書本' }; }
    const t = W.Mat.text(id); if (t) return { title: t.title, text: t.text, ref: t.ref };
    const m = W.Mat.get(id); if (m?.kind === 'text') return { title: m.title, text: (m.rows || m.docs || []).map((r) => r.text).join('\n'), ref: m.card?.version || '' };
    return null;
  }
  function kwic(text, q, win) {
    const out = []; if (!q) return out;
    for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + 1)) out.push({ i, l: text.slice(Math.max(0, i - win), i).replace(/\n/g, '｜'), r: text.slice(i + q.length, i + q.length + win).replace(/\n/g, '｜'), p: text[i - 1] || '', n: text[i + q.length] || '' });
    return out;
  }
  const SENSES = [['zx', '宰相（官位）'], ['xg', '相公（称谓）'], ['hx', '互相、相继（副词）'], ['qt', '其他（人名、相貌等）'], ['', '未判']];
  function suggestSense(h, q) { // 只看前后一字的粗规则，页面明示为“建议”
    if (q !== '相') return '';
    if (h.n === '公') return 'xg';
    if ('丞宰拜罷首次真入'.includes(h.p) || '位府業國臣'.includes(h.n)) return 'zx';
    if (h.p === '互' || '繼继顧视視與率望'.includes(h.n)) return 'hx';
    return '';
  }
  function ngrams(text, n, stop) {
    const c = new Map();
    for (const seg of text.split(/[^㐀-鿿豈-﫿]+/u)) {
      const s = [...seg]; for (let i = 0; i + n <= s.length; i++) { const g = s.slice(i, i + n).join(''); if (stop && [...g].some((x) => STOP1.has(x))) continue; c.set(g, (c.get(g) || 0) + 1); }
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }

  /* ================= D05 词频与上下文 ================= */
  class KwicLab extends Lab {
    defaults() { return { mat: 'songshi_w7', juan: '51', q: '相', win: '8', sort: 'pos', sense: {}, n: '1', stop: true }; }
    render() {
      const DEFQ = { raisanyo_1797: '至', pepys_1660: 'my Lord' };
      if (this.s.qFor !== this.s.mat) { this.s.qFor = this.s.mat; if (DEFQ[this.s.mat]) this.s.q = DEFQ[this.s.mat]; else if (Object.values(DEFQ).includes(this.s.q)) this.s.q = '相'; store.set(this.key, this.s); }
      const T = textOf(this.s.mat, this.s.juan);
      const textMats = [['songshi_w7', '练习材料一：《宋史·王珪传》选段（788 字）'], ['practice2', '练习材料二：《丹陽郡夫人李氏墓誌銘》节录'], ['huayangji', '《華陽集》（四庫全书本，选卷）'], ['raisanyo_1797', '頼山陽「東遊旅行日記」寛政九年（日文，NDL 公開）'], ['pepys_1660', 'Pepys 日记 1660 年一月（英文，公有领域）']];
      const sel = `<span class="matbar"><label>材料 <select data-k="mat">${textMats.map(([v, l]) => `<option value="${v}" ${this.s.mat === v ? 'selected' : ''}>${l}</option>`).join('')}${W.Mat.list('text').map((m) => `<option value="${esc(m.id)}" ${this.s.mat === m.id ? 'selected' : ''}>${esc(m.title)}</option>`).join('')}</select></label>
        ${this.s.mat === 'huayangji' ? `<label>卷 <select data-k="juan"><option value="all" ${this.s.juan === 'all' ? 'selected' : ''}>全部</option>${Object.keys(W.Mat.text('huayangji')?.juan || {}).map((j) => `<option ${this.s.juan === j ? 'selected' : ''}>${j}</option>`).join('')}</select></label>` : ''}
        <button class="small" data-open-import="text" title="导入自己的文本">导入文本</button></span>`;
      if (!T) { rerender(this, `${sel}<p class="sub">公开材料载入中……</p>`); return; }
      const text = T.text, q = this.s.q || '', win = Number(this.s.win) || 8;
      const nHan = [...text].filter((c) => HAN.test(c)).length;
      let hits = kwic(text, q, win);
      const sense = this.s.sense[this.s.mat + this.s.juan] || {};
      hits.forEach((h) => { h.sug = suggestSense(h, q); h.s = sense[h.i] ?? h.sug; });
      if (this.s.sort === 'l') hits = [...hits].sort((a, b) => [...a.l].reverse().join('').localeCompare([...b.l].reverse().join('')));
      if (this.s.sort === 'r') hits = [...hits].sort((a, b) => a.r.localeCompare(b.r));
      const by = Object.fromEntries(SENSES.map(([k]) => [k, hits.filter((h) => h.s === k).length]));
      const left = new Map(), right = new Map(); hits.forEach((h) => { left.set(h.p + q, (left.get(h.p + q) || 0) + 1); right.set(q + h.n, (right.get(q + h.n) || 0) + 1); });
      const top = (m) => [...m.entries()].filter(([g]) => [...g].every((c) => HAN.test(c))).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const col1 = `<p><b>${esc(T.title)}</b></p><p class="sub">${esc(T.ref || '')}；汉字 ${nHan} 个。</p><div class="srcbox small-src">${esc(text.slice(0, 600))}${text.length > 600 ? '……' : ''}</div>`;
      const col2 = `<label>检索 <input data-k="q" value="${esc(q)}" size="6"></label> <span class="sub">输入后按回车</span>
        <p class="okbox">“${esc(q)}”出现 <b>${hits.length}</b> 次，每千字 ${nHan ? f2((hits.length / nHan) * 1000, 1) : '—'} 次。</p>
        <p class="sub">搭配（前一字＋检索词／检索词＋后一字）：</p><div class="split2"><div>${W.bars(top(left))}</div><div>${W.bars(top(right))}</div></div>
        ${q === '相' && hits.length ? `<p class="sub">只看这个总数，能说这一段“讲宰相事”有 ${hits.length} 处吗？到第三栏逐条看。</p>` : ''}${this.s.mat === 'raisanyo_1797' && q === '至' ? '<p class="sub">“自某、至某”是行程记的套式：数“至”只数出了行程的日数，到第三栏看“至”后面都是什么。</p>' : ''}${this.s.mat === 'pepys_1660' ? '<p class="sub">“my Lord”在 Pepys 日记里多指他的恩主 Edward Montagu；同一个称呼指谁，要靠上下文与编者注。</p>' : ''}
        `;
      const col3 = `<p>上下文 <input type="range" min="2" max="20" data-k="win" value="${win}"> ${win} 字　排序 ${seg('sort', [['pos', '原文顺序'], ['l', '按左侧'], ['r', '按右侧']], this.s.sort)}</p>
        <div class="kwic">${hits.map((h) => `<div class="kwrow"><span class="kl">${esc(h.l)}</span><mark>${esc(q)}</mark><span class="kr">${esc(h.r)}</span>
          ${q === '相' ? `<select data-sense="${h.i}">${SENSES.map(([k, l]) => `<option value="${k}" ${h.s === k ? 'selected' : ''}>${l}${k && k === h.sug ? '（建议）' : ''}</option>`).join('')}</select>` : ''}</div>`).join('') || '<p class="nil">没有找到。</p>'}</div>
        ${q === '相' && hits.length ? `<p class="okbox">${SENSES.map(([k, l]) => `${l} ${by[k]}`).join('｜')}</p><p class="sub">“建议”只按前后一字的粗规则给出（丞相、拜相→宰相；相公；互相、相繼、相顧→副词），请逐条改正。“相顧失色”的“相”是“互相”，不是宰相。</p>` : ''}`;
      const isEn = nHan < text.length / 20;
      const n = Number(this.s.n), uni = isEn ? (() => { const c = new Map(); (text.toLowerCase().match(/[a-z][a-z']+/g) || []).forEach((w) => { if (!this.s.stop || !/^(the|and|of|to|a|in|i|my|with|was|that|it|me|he|his|so|for|at|there|by|but|him|we|is|be|as|her|this|had|on|which|from|they|not|all|did|were)$/.test(w)) c.set(w, (c.get(w) || 0) + 1); }); return [...c].sort((x, y) => y[1] - x[1]).slice(0, 15); })() : ngrams(text, 1, this.s.stop).slice(0, 15), bi = isEn ? [] : ngrams(text, 2, this.s.stop).slice(0, 15);
      const hl = (g) => (q && g.includes(q) ? `<mark>${esc(g)}</mark>` : esc(g));
      const col4 = isEn ? `<p class="sub">英文以空格分词，下表为词频（去掉常用虚词）。中文、日文没有空格，要先决定“什么算一个词”（讲义 2.1）。</p><label class="check-row small"><input type="checkbox" data-k="stop" ${this.s.stop ? 'checked' : ''}>去掉常用虚词</label><table class="steps">${uni.map(([g, c]) => `<tr><td>${hl(g)}</td><td>${c}</td></tr>`).join('')}</table>` : `<p>${seg('n', [['1', '按字'], ['2', '按二字串']], this.s.n)} <label class="check-row small"><input type="checkbox" data-k="stop" ${this.s.stop ? 'checked' : ''}>去掉虚词（之其以而於為等）</label></p>
        <div class="split2"><div><p class="sub">按字（1-gram）</p><table class="steps">${uni.map(([g, c]) => `<tr class="${n === 1 ? '' : 'dim'}"><td>${hl(g)}</td><td>${c}</td></tr>`).join('')}</table></div>
        <div><p class="sub">按二字串（2-gram）</p><table class="steps">${bi.map(([g, c]) => `<tr class="${n === 2 ? '' : 'dim'}"><td>${hl(g)}</td><td>${c}</td></tr>`).join('')}</table></div></div>
        <p class="sub">二字串不是“词”：“王珪”“參知”“知政”都会出现，哪些是词要人判断。古汉语用现代汉语分词器常会切错（讲义 2.1）。${this.s.mat === 'huayangji' ? '换卷三十五（制詞）与卷五十一（墓志）比较：高频字随文体改变，这是材料构成的差别。' : '换《華陽集》几卷对照：高频字随文体改变。'}${this.s.mat === 'raisanyo_1797' ? '日文训读体的行程记，“自”“至”最多：按字计数先看到的是文体（“自某至某”），不是内容。' : ''}</p>`;
      rerender(this, `${sel}${flowShell(pageById('D05'), [{ title: '选文本', body: col1 }, { title: `数“${q}”字`, body: col2 }, { title: 'KWIC 归类', body: col3 }, { title: '换切分', body: col4 }])}`);
    }
    init() {
      this.addEventListener('change', (e) => {
        const i = e.target.dataset.sense; if (i == null) return;
        const k = this.s.mat + this.s.juan; this.s.sense = { ...this.s.sense, [k]: { ...(this.s.sense[k] || {}), [i]: e.target.value } }; this.save();
      });
    }
  }
  register('kwic-lab', KwicLab);

  /* ================= LDA：浏览器内的折叠吉布斯采样（小语料） ================= */
  function ldaPrepare(docs, { minDf = 3, maxDf = 0.5, mode = 'char' } = {}) {
    const toks = docs.map((d) => { if (mode === 'en') return (d.text.toLowerCase().match(/[a-z][a-z']+/g) || []).map((w) => w.replace(/'s$/, '')).filter((w) => w.length > 2 && !EN_STOP.has(w)); const c = [...d.text].filter((x) => HAN.test(x) && !STOP1.has(x)); return mode === 'bigram' ? c.slice(1).map((x, i) => c[i] + x) : c; });
    const df = new Map(); toks.forEach((t) => new Set(t).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
    const vocab = [...df.entries()].filter(([, n]) => n >= minDf && n <= maxDf * docs.length).map(([w]) => w).sort();
    const id = new Map(vocab.map((w, i) => [w, i]));
    return { vocab, docs: toks.map((t) => t.map((w) => id.get(w)).filter((x) => x != null)) };
  }
  const EN_STOP = new Set('the and that with for was had his him her she they them their there this then than but not all any have has from which what when where who whom will would should could did does done were been being are one two our out into upon very much more most some such only own same other also about after again against before between both each few further here how its just over under until while why you your yours mine my me we us of to in it is as at be by he on or so an no do up if am did said says say came come went go going got get made make see saw seen took take told tell know knew thence home day night morning afternoon dined dinner supper bed lord mr mrs sir'.split(' '));
  /* 折叠吉布斯采样（Griffiths & Steyvers 2004 的通行写法）；分段运行，每段后回调进度，不阻塞页面。 */
  function ldaGibbs(P, { K = 6, alpha = 0.1, beta = 0.01, iter = 200, seed = 1 }, onProgress) {
    return new Promise((resolve) => {
      const r = W.rng(seed), V = P.vocab.length, D = P.docs.length;
      const z = P.docs.map((d) => Int16Array.from(d, () => Math.floor(r() * K)));
      const ndk = P.docs.map(() => new Int32Array(K)), nkw = Array.from({ length: K }, () => new Int32Array(V)), nk = new Int32Array(K);
      P.docs.forEach((d, i) => d.forEach((w, j) => { const k = z[i][j]; ndk[i][k]++; nkw[k][w]++; nk[k]++; }));
      const p = new Float64Array(K); let it = 0; const t0 = performance.now();
      const step = () => {
        const end = Math.min(iter, it + 10);
        for (; it < end; it++) for (let i = 0; i < D; i++) { const d = P.docs[i], zi = z[i], nd = ndk[i]; for (let j = 0; j < d.length; j++) {
          const w = d[j]; let k = zi[j]; nd[k]--; nkw[k][w]--; nk[k]--;
          let s = 0; for (let t = 0; t < K; t++) { s += (nd[t] + alpha) * (nkw[t][w] + beta) / (nk[t] + V * beta); p[t] = s; }
          const u = r() * s; k = 0; while (p[k] < u) k++; zi[j] = k; nd[k]++; nkw[k][w]++; nk[k]++; } }
        onProgress?.(it / iter);
        if (it < iter) setTimeout(step, 0);
        else {
          const phi = nkw.map((row, k) => Array.from(row, (c) => (c + beta) / (nk[k] + V * beta)));
          const theta = ndk.map((row, i) => Array.from(row, (c) => (c + alpha) / (P.docs[i].length + K * alpha)));
          resolve({ phi, theta, secs: (performance.now() - t0) / 1000 });
        }
      };
      step();
    });
  }
  const topWords = (phi, vocab, n = 12) => phi.map((row) => row.map((v, i) => [vocab[i], v]).sort((a, b) => b[1] - a[1]).slice(0, n));
  const wset = (t, n = 15) => new Set(t.slice(0, n).map((x) => (Array.isArray(x) ? x[0] : x)));
  const jac = (A, B) => { const i = [...A].filter((x) => B.has(x)).length; return i / (A.size + B.size - i || 1); };
  /* 把甲次运行的每个主题对到乙次运行中前 15 词重合最多的主题。 */
  function alignRuns(A, B) { return A.map((t) => { const a = wset(t); let best = -1, bj = 0; B.forEach((u, j) => { const v = jac(a, wset(u)); if (v > bj) { bj = v; best = j; } }); return { best, j: bj }; }); }
  function lineChart(series, { w = 360, h = 120, label = '' } = {}) {
    const xs = series.map(([x]) => Number(x)), ys = series.map(([, y]) => y); if (!xs.length) return '';
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys, 1e-9);
    const X = (x) => 30 + ((x - x0) / (x1 - x0 || 1)) * (w - 40), Y = (y) => h - 18 - (y / y1) * (h - 30);
    return `<svg class="linechart" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}"><polyline fill="none" stroke="#164ec7" stroke-width="1.6" points="${series.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}"/>
      <line x1="30" y1="${h - 18}" x2="${w - 10}" y2="${h - 18}" stroke="#9fb3c2"/><text x="30" y="${h - 4}" font-size="10">${x0}</text><text x="${w - 10}" y="${h - 4}" font-size="10" text-anchor="end">${x1}</text><text x="32" y="12" font-size="10">${f2(y1, 3)}</text></svg>`;
  }

  /* ================= D07 主题与分类 ================= */
  /* 原研究者的命名（只录原文给出的；词表只录已见原文的）。 */
  const STUDIES = {
    ballard: { who: 'Blevins 2010（MALLET，30 个主题、每个 20 词；博客原文）', match: 'words', labels: [
      ['MIDWIFERY', 'birth deld safe morn receivd calld left cleverly pm labour fine reward arivd infant expected recd shee born patient'],
      ['CHURCH', 'meeting attended afternoon reverend worship foren mr famely performd vers attend public supper st service lecture discoarst administred supt'],
      ['DEATH', 'day yesterday informd morn years death ye hear expired expird weak dead las past heard days drowned departed evinn'],
      ['GARDENING', 'gardin sett worked clear beens corn warm planted matters cucumbers gatherd potatoes plants ou sowd door squash wed seeds'],
      ['SHOPPING', 'lb made brot bot tea butter sugar carried oz chees pork candles wheat store pr beef spirit churnd flower'],
      ['ILLNESS', 'unwell mr sick gave dr rainy easier care head neighbor feet relief made throat poorly takeing medisin ts stomach'],
      ['HOUSEWORK 1', 'house work clear knit wk home wool removd washing kinds pickt helping banking chips taxes picking cleaning pikt pails'],
      ['HOUSEWORK 2', 'home clear washt baked cloaths helped washing wash girls pies cleand things room bak kitchen ironed apple seller scolt'],
      ['EMOTION', 'feel husband unwel warm feeble felt god great fatagud fatagued thro life time year dear rose famely bu good'],
      ['COLD WEATHER', 'cold windy chilly snowy air'],
    ], note: '词表据 Blevins 博客原文（教师提供的网页存档，2026-11-03）；原文 PDF 中“fine”“flower”因连字显示为“Tne”“;ower”，已复原。COLD WEATHER 原文只举了 5 个词。他自报 30 个主题，文中给出其中 10 个。' },
    qingshilu: { who: 'Miller 2013（Poetics 41.6；MALLET，K＝50，按字，条目须超过 20 字；《清实录》1723—1911）', match: 'words', labels: [
      ['Crime', '拟 罪 案 刑 部 审 例 照 斩 死 议 绞 伤 定 命 勾 监 律 殴 杀 改 理 毙 秋 氏'],
      ['Unrest', '获 拏 匪 严 犯 地 捕 缉 盗 饬 案 徒 县 劫 首 官 惩 抢 逃 民 经 滋 督 贼 弁'],
      ['Sedition', '获 拏 讯 供 案 教 解 严 审 究 经 逆 李 现 省 县 王 张 刘 家 密 首 确 往 访'],
      ['Border Rebellion', '兵 番 贼 路 川 土 军 阿 藏 尔 地 攻 桂 金 往 剿 官 机 力 司 营 带 现 众 驻'],
      ['Rebellion', '贼 兵 匪 剿 逆 城 攻 军 力 复 窜 勇 官 经 带 击 路 获 胜 克 督 保 首 数 杀'],
      ['Major Rebellion', '兵 剿 军 贼 匪 防 窜 带 力 饬 现 路 北 州 逆 勇 南 省 东 城 派 严 胜 讯 督'],
    ], note: '六个主题与各 25 个高频字据原文附录（Appendix. Top frequency words by topic）。原文附录只给拼音与英文释义，这里的汉字是课件据拼音与释义推定的简体字（如 na“capture”作“拏”，zhe“behead”作“斩”存疑），未必与 Miller 所用字形一致。Miller 的语料是《清实录》1723—1911 年全书，本页是台湾相关条目的选辑（1644—1895），比的是分类方式，不是同一批文献。他另有 Personnel、Infrastructure、两个 Han Names 等主题，未列词表。可对照的一点：Miller 的 Sedition 主题在 1787 年有尖峰，对应台湾林爽文起事后对会党的搜捕（原文第 3.3 节）；本页选辑在 1786—1788 年也有条目激增，可在“此主题各年的平均比例”里看。' },
    meishi: { who: '山田太造、野村朋弘、井上聡 2014（『じんもんこん2014論文集』；『上井覚兼日記』，只用人名做 LDA）', match: 'labels', labels: [
      ['V1', '家老・肥後'], ['V2', '大隅・肝付'], ['V3', '龍造寺・肥前筑前'], ['V4', '一門衆・宮崎衆'], ['V5、V8—V10', '老中・島津一門'],
    ], note: '『上井覚兼日記』没有公开的全文，本页改用 JBDB『梅颸日記』的事件注记，只复现他们的做法（每条一篇、只用其中的人名作词），不能与他们的命名逐一对照：他们的主题对应的是“哪一群人常一起出现”。' },
  };
  const D07_CORPORA = [['huayangji', '《華陽集》各篇（中文，公开，浏览器内运行）'], ['pepys', 'Samuel Pepys 日记 1660 年（英文，公开，浏览器内运行）'], ['ballard', 'Martha Ballard 日记（英文，本机）'], ['qingshilu', '《清实录》台湾资料选辑（中文，本机）'], ['meishi', 'JBDB『梅颸日記』事件注记（日文，本机）']];
  class TopicLab extends Lab {
    defaults() { return { corpus: 'huayangji', run: '', topic: '', name: {}, reveal: false, cmp: '', K: '6', alpha: '0.1', beta: '0.01', seed: '1', iter: '150', mode: 'char' }; }
    corpus() {
      const L = (this._live || {})[this.s.corpus];
      if (this.s.corpus === 'huayangji') return L ? { id: 'huayangji', title: '《華陽集》卷三十五至六十各篇（四庫全書本）', runs: L.runs, docs: L.docMap, lang: 'zh', license: 'CC BY-SA 4.0（维基文库）' } : null;
      if (this.s.corpus === 'pepys') return L ? { id: 'pepys', title: 'Samuel Pepys 日记 1660 年 337 条（Project Gutenberg #4200）', runs: L.runs, docs: L.docMap, lang: 'en', license: '公有领域' } : null;
      return W.Pack.local()?.topics?.[this.s.corpus] || null;
    }
    render() {
      const C = this.corpus();
      const head = `<span class="matbar"><label>语料 <select data-k="corpus">${D07_CORPORA.map(([v, l]) => `<option value="${v}" ${this.s.corpus === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></span>`;
      const LIVE = { huayangji: () => W.Mat.text('huayangji'), pepys: () => W.Mat.text('pepys_1660') };
      if (!C && LIVE[this.s.corpus]?.() && !(this._auto || {})[this.s.corpus]) { this._auto = { ...(this._auto || {}), [this.s.corpus]: true }; setTimeout(() => this.runHY(), 0); }
      if (!C) {
        rerender(this, `${head}${LIVE[this.s.corpus] ? (LIVE[this.s.corpus]() ? `<p>主题模型在浏览器内运行（折叠吉布斯采样），约需数秒。</p><button data-run="1">运行一次（K＝${esc(this.s.K)}，种子 ${esc(this.s.seed)}）</button> <span class="sub" data-prog></span>` : '<p class="sub">公开材料载入中……</p>')
          : W.gate('三种语言语料的主题模型结果（Ballard 日记、《清实录》台湾资料选辑、JBDB『梅颸日記』）', '本机材料包中的主题模型运行记录')}`);
        return;
      }
      const runs = C.runs, run = runs.find((r) => r.id === this.s.run) || runs[0];
      const topics = [...run.topics].sort((a, b) => b.share - a.share);
      const T = run.topics.find((t) => String(t.k) === String(this.s.topic)) || run.topics.find((t) => t.k === run.exercise) || topics[0];
      const key = C.id + '|' + run.id + '|' + T.k, myName = (this.s.name || {})[key] || '';
      const words = T.words.slice(0, 10);
      const col1 = `<p><label>运行 <select data-k="run">${runs.map((r) => `<option value="${esc(r.id)}" ${r.id === run.id ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select></label></p>
        <p class="sub">${esc(run.runtime)}；${run.docs} 篇、词表 ${run.vocab}；切分：${esc(run.mode_label || run.mode)}；K＝${run.k}，随机种子 ${run.seed}。</p>
        <p><label>主题 <select data-k="topic">${topics.map((t) => `<option value="${t.k}" ${t.k === T.k ? 'selected' : ''}>#${t.k}（占 ${f2(t.share * 100, 1)}%）${esc(t.words.slice(0, 4).map((w) => w[0]).join(' '))}</option>`).join('')}</select></label></p>
        ${W.bars(words.map(([w, v]) => [w, Math.round(v * 1000) / 1000]))}<p class="sub">${run.kind === 'bertopic' ? `词后的数为 c-TF-IDF 权重。BERTopic 每篇只归一类：本类 ${T.n} 篇；另有 ${run.outliers} 篇归为离群（−1），不属于任何主题。` : '词后的数为该词在主题中的概率。'}</p>`;
      const col2 = `<label class="field">我给这个主题起的名字<input data-name="${esc(key)}" value="${esc(myName)}" placeholder="先起名，再读原文"></label>
        <p class="sub">只看词起名。起好后到第三栏读得分最高的三篇。</p>
        ${C.study || STUDIES[C.id] ? `<button class="small" data-set="reveal:${this.s.reveal ? '' : '1'}" ${myName ? '' : 'disabled'}>${this.s.reveal ? '收起' : '看原研究者的命名'}</button>${myName ? '' : '<span class="sub">（先起名）</span>'}` : ''}
        ${this.s.reveal && myName ? this.studyBox(C, T) : ''}`;
      const ws = new Set(T.words.slice(0, 15).map((w) => w[0]));
      const hl = (s) => { if (C.lang === 'en') return esc(s).replace(/[A-Za-z]+/g, (m) => (ws.has(m.toLowerCase()) ? `<mark>${m}</mark>` : m)); const arr = [...s]; let out = ''; for (let i = 0; i < arr.length; i++) { const b = arr[i] + (arr[i + 1] || ''); if (ws.has(b)) { out += `<mark>${esc(b)}</mark>`; i++; } else out += ws.has(arr[i]) ? `<mark>${esc(arr[i])}</mark>` : esc(arr[i]); } return out; };
      const docs = T.top_docs.slice(0, 3).map(([id, p]) => { const d = C.docs[id]; return d ? `<div class="evid-card"><p class="sub">${esc(id)}｜${esc(d.date || d.wareki || d.year || '')}｜${esc(d.ref || d.title || '')}｜${run.kind === 'bertopic' ? `与本类中心的余弦 ${f2(p, 2)}` : `本篇中此主题占 ${f2(p * 100, 0)}%`}</p><p class="src-line small">${hl(d.text.slice(0, 260))}${d.text.length > 260 ? '……' : ''}</p></div>` : `<p class="nil">${esc(id)} 原文不在材料包中</p>`; }).join('');
      const col3 = `${myName ? docs + `<label class="field small">读完以后还叫“${esc(myName)}”吗？<input data-name="${esc(key)}|2" value="${esc((this.s.name || {})[key + '|2'] || '')}" placeholder="改名或说明理由"></label>` : '<p class="sub">先在第二栏起名。</p>'}
        ${run.by_year && Object.keys(run.by_year).length > 3 ? `<p class="sub">此主题${run.by_year_label || '各年'}的平均比例：</p>${lineChart(Object.entries(run.by_year).map(([y, v]) => [y, v[T.k]]), { label: '主题比例随年份' })}` : ''}`;
      // 第四栏：两次运行对照；华阳集可现场重跑
      const other = runs.filter((r) => r.id !== run.id), cmpRun = runs.find((r) => r.id === this.s.cmp) || other[0];
      let col4 = '';
      if (cmpRun) {
        const al = alignRuns(run.topics.map((t) => t.words), cmpRun.topics.map((t) => t.words));
        const stable = al.filter((a) => a.j >= 0.4).length;
        col4 += `<p>与 <select data-k="cmp">${other.map((r) => `<option value="${esc(r.id)}" ${r.id === cmpRun.id ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select> 对照</p>
          <p class="okbox">本次 ${run.k} 个主题中，${stable} 个在对照运行里有前 15 词重合 ≥ 0.4（杰卡德）的对应主题；其余只出现一次。</p>
          <table class="steps small"><tr><th>本次</th><th>对照运行中最像的</th><th>重合</th></tr>${run.topics.map((t, i) => [t, al[i]]).sort((a, b) => b[1].j - a[1].j).map(([t, a]) => `<tr class="${a.j >= 0.4 ? 'ok' : 'dim'} ${t.k === T.k ? 'on' : ''}"><td>#${t.k} ${esc(t.words.slice(0, 4).map((w) => w[0]).join(' '))}</td><td>${a.best >= 0 ? '#' + cmpRun.topics[a.best].k + ' ' + esc(cmpRun.topics[a.best].words.slice(0, 4).map((w) => w[0]).join(' ')) : '—'}</td><td>${f2(a.j)}</td></tr>`).join('')}</table>`;
      }
      if (C.id === 'huayangji' || C.id === 'pepys') {
        col4 += `<details open><summary>改参数，在浏览器里再跑一次</summary>
          <p>K <input type="range" min="2" max="12" data-k="K" value="${esc(this.s.K)}"> ${esc(this.s.K)}　种子 <input type="number" data-k="seed" value="${esc(this.s.seed)}" style="width:4em"></p>
          <p>α <select data-k="alpha">${['0.01', '0.1', '0.5', '1'].map((v) => `<option ${this.s.alpha === v ? 'selected' : ''}>${v}</option>`).join('')}</select>　β <select data-k="beta">${['0.001', '0.01', '0.1'].map((v) => `<option ${this.s.beta === v ? 'selected' : ''}>${v}</option>`).join('')}</select>　迭代 <select data-k="iter">${['50', '150', '300'].map((v) => `<option ${this.s.iter === v ? 'selected' : ''}>${v}</option>`).join('')}</select>　${C.id === 'pepys' ? '按词（去常用虚词与“lord、home、dined”等日记套语）' : seg('mode', [['char', '按字'], ['bigram', '按二字串']], this.s.mode)}</p>
          <button data-run="1">再跑一次</button> <span class="sub" data-prog></span>
          <p class="sub">α 小，每篇只由少数几个主题构成；β 小，每个主题只由少数几个词构成（扩充部分甲二）。</p>${this.genreBox(run)}</details>`;
      }
      rerender(this, `${head}${flowShell(pageById('D07'), [{ title: '看主题词', body: col1 }, { title: '起名', body: col2 }, { title: '读三篇原文', body: col3 }, { title: '改参数再跑', body: col4 || '<p class="sub">只有一次运行。</p>' }])}
        <p class="sub">${esc(C.title)}；${esc(C.license || '')}。${C.id === 'huayangji' || C.id === 'pepys' ? '浏览器实时：每次运行在本页内完成。' : '保存结果回放：' + esc(run.date || '') + ' 在课前环境实际运行，结果保存在本机材料包中。'}${C.note ? ' ' + esc(C.note) : ''}</p>`);
    }
    studyBox(C, T) {
      const S = STUDIES[C.id]; if (!S) return '';
      const ws = wset(T.words);
      const rows = S.labels.map(([l, w]) => { const set = new Set(w.split(/\s+/)); const ov = S.match === 'words' ? [...ws].filter((x) => set.has(x)) : null; return [l, w, ov]; });
      if (S.match === 'words') rows.sort((a, b) => b[2].length - a[2].length);
      return `<div class="pcard keep"><p><b>${esc(S.who)}</b></p><table class="steps small">${rows.map(([l, w, ov]) => `<tr class="${ov && ov.length >= 3 ? 'ok' : ''}"><td><b>${esc(l)}</b></td><td>${esc(w)}${ov ? `<br><span class="sub">与本主题前 15 词重合 ${ov.length} 个${ov.length ? '：' + esc(ov.join(' ')) : ''}</span>` : ''}</td></tr>`).join('')}</table><p class="sub">${esc(S.note)}</p></div>`;
    }
    genreBox(run) { // 主题与文体的交叉：主题往往先分出了文体（材料构成）
      if (!run.genre) return '';
      const G = [...new Set(Object.values(run.genre))];
      return `<p class="sub">各主题占比最高的篇，按文体分布（每个主题取前 20 篇）：</p><table class="steps small"><tr><th>主题</th>${G.map((g) => `<th>${esc(g.replace(/（.*/, ''))}</th>`).join('')}</tr>${run.topics.map((t) => { const top = t.top20 || []; return `<tr><td>#${t.k} ${esc(t.words.slice(0, 3).map((w) => w[0]).join(''))}</td>${G.map((g) => `<td>${top.filter((id) => run.genre[id] === g).length}</td>`).join('')}</tr>`; }).join('')}</table>
        <p class="sub">如果多数主题只落在一种文体里，模型首先分出的是“这是制詞还是墓志”，即材料构成，而不是“谈些什么”（讲义 1.3）。</p>`;
    }
    async runHY() {
      const cid = this.s.corpus === 'pepys' ? 'pepys' : 'huayangji';
      const ps = cid === 'pepys' ? (W.Mat.text('pepys_1660')?.docs || []).map((d) => ({ ...d, title: d.date })) : huayangPieces();
      const mode = cid === 'pepys' ? 'en' : this.s.mode;
      const P = ldaPrepare(ps, { mode, minDf: cid === 'pepys' ? 5 : 3 }); const prog = this.querySelector('[data-prog]');
      const opt = { K: Number(this.s.K), alpha: Number(this.s.alpha), beta: Number(this.s.beta), iter: Number(this.s.iter), seed: Number(this.s.seed) };
      const res = await ldaGibbs(P, opt, (x) => { if (prog) prog.textContent = `运行中 ${Math.round(x * 100)}%`; });
      const tw = topWords(res.phi, P.vocab, 15);
      const topics = tw.map((words, k) => { const order = res.theta.map((th, i) => [ps[i].id, th[k]]).sort((a, b) => b[1] - a[1]); return { k, share: res.theta.reduce((a, th) => a + th[k], 0) / ps.length, words, top_docs: order.slice(0, 5), top20: order.slice(0, 20).map(([id]) => id) }; });
      const id = `${cid}-K${opt.K}-s${opt.seed}-a${opt.alpha}-b${opt.beta}-${mode}-${opt.iter}`;
      const by_year = cid === 'pepys' ? (() => { const B = {}; ps.forEach((p, i) => { const m = p.date.slice(5, 7); (B[m] ||= { n: 0, v: new Array(opt.K).fill(0) }); B[m].n++; res.theta[i].forEach((v, k) => { B[m].v[k] += v; }); }); return Object.fromEntries(Object.entries(B).map(([m, x]) => [m, x.v.map((v) => v / x.n)])); })() : null;
      const run = { id, label: `浏览器内 K＝${opt.K}，种子 ${opt.seed}，α＝${opt.alpha}，β＝${opt.beta}，${mode === 'en' ? '按词' : mode === 'char' ? '按字' : '按二字串'}，迭代 ${opt.iter}（${f2(res.secs, 1)} 秒）`, k: opt.K, seed: opt.seed, docs: ps.length, vocab: P.vocab.length, mode, mode_label: mode === 'en' ? '按词（去常用虚词）' : mode === 'char' ? '按字（去虚词与出现在过半篇中的字）' : '相邻二字串',
        runtime: '浏览器内折叠吉布斯采样（week08-labs3.js）', topics, by_year, by_year_label: cid === 'pepys' ? '各月' : '', genre: cid === 'huayangji' ? Object.fromEntries(ps.map((p) => [p.id, GENRE(p.juan)])) : null, date: new Date().toISOString() };
      const docMap = Object.fromEntries(ps.map((p) => [p.id, cid === 'pepys' ? { text: p.text, date: p.date, ref: 'Pepys 日记' } : { text: p.text, title: `卷${p.juan}｜${p.title}`, ref: `《華陽集》卷${p.juan}` }]));
      const prev = (this._live || {})[cid];
      this._live = { ...(this._live || {}), [cid]: { runs: [run, ...(prev?.runs || []).filter((r) => r.id !== id)].slice(0, 6), docMap } };
      this.s.run = id; this.s.topic = ''; this.s.cmp = this._live[cid].runs[1]?.id || ''; this.save();
    }
    init() {
      this.addEventListener('click', (e) => { if (e.target.dataset.run) { e.target.disabled = true; this.runHY(); } });
      this.addEventListener('input', (e) => { const k = e.target.dataset.name; if (k) { this.s.name = { ...this.s.name, [k]: e.target.value }; store.set(this.key, this.s); } });
      this.addEventListener('change', (e) => { if (e.target.dataset.name) this.render(); });
    }
  }
  register('topic-lab', TopicLab);

  window.W8L3 = { huayangPieces, ldaPrepare, ldaGibbs, kwic, ngrams, alignRuns, suggestSense };
})();
