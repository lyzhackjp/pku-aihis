/* 第九周页面组件（三）：D02、D03、D04、D06、D10、D15、D16、D19、D20、D21、D24、D25、D26｜候选，未经教师确认｜2026-11-11 */
(() => {
  'use strict';
  const { esc, store, register, download } = window.Deck;
  const rerender = window.W9.render;
  const { L, Mat, Through, Model, badge, Lab, latestRun } = window.W9;
  const CARDS = window.W9_CARDS;
  const card = (id) => CARDS.find((c) => c.id === id);
  const fmt = (x, d = 3) => (x == null || Number.isNaN(x) ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toString());
  const B = { calc: '<span class="w9-badge calc">实际计算</span>', tc: '<span class="w9-badge teaching-construct">教学构造</span>', st: '<span class="w9-badge static">静态内容</span>', rp: '<span class="w9-badge replay">预存回放</span>', none: '<span class="w9-badge none">待课前运行</span>' };
  const SIMPLE = '<p class="sub">规则简化／数字为示例。</p>';
  /* 拖动滑块时保留同一个 input 节点，否则重绘会打断拖动 */
  const paint = (host, html) => {
    const a = document.activeElement, k = a && a.type === 'range' && host.contains(a) ? a.dataset.k : null;
    rerender(host, html);
    if (k) { const n = host.querySelector(`input[type=range][data-k="${k}"]`); if (n && n !== a) n.replaceWith(a); }
  };
  const flow = (host, cols, active = 0) => paint(host, window.Deck.flowShell(host.page(), cols, { active }));
  const poly = (pts, W, H, ymin, ymax, color, xmax) => { const n = xmax ?? pts.length - 1; return `<polyline fill="none" stroke="${color}" stroke-width="2" points="${pts.map((y, i) => `${((i / Math.max(1, n)) * W).toFixed(1)},${(H - ((y - ymin) / (ymax - ymin)) * H).toFixed(1)}`).join(' ')}"/>`; };
  const samplesOf = (cid, preset) => window.W9.candidates(cid, preset); // 与各页回答格同一来源

  /* ================= D02 模拟者与角色 ================= */
  const AGREE = ['', '三者一致', '两者一致', '各说各话'];
  class RolesLab extends Lab {
    defaults() { return { preset: 'deepseek', cid: 'card-1a', marks: {}, msg: '' }; }
    render() {
      const rs = samplesOf(this.s.cid, this.s.preset), show = rs.slice(0, 4), c = card(this.s.cid);
      const tally = { 三者一致: 0, 两者一致: 0, 各说各话: 0 };
      Object.entries(this.s.marks).forEach(([k, v]) => { if (show.some((r) => k.startsWith(r.run_id + '|')) && tally[v] !== undefined) tally[v]++; });
      const col = (r, i) => `<section class="w9-col"><header><b>第 ${i + 1} 次</b>　${badge(r, r.mode)}</header><div class="w9-reply">${L.splitSentences(r.reply || '').map((s, j) => { const k = r.run_id + '|' + j, m = this.s.marks[k] || ''; return `<span class="sent ${m ? 'circled' : ''}" data-mark="${esc(k)}" title="点击切换：三者一致 → 两者一致 → 各说各话 → 取消">${esc(s)}${m ? `<sup class="sub">［${esc(m)}］</sup>` : ''}</span>`; }).join('')}</div><p class="sub">${(r.reply || '').length} 字</p></section>`;
      const liveOk = Model.state().mode === 'live' && Model.ready(this.s.preset);
      this.activeStep = show.length ? (Object.keys(this.s.marks).length ? 3 : 2) : 0;
      rerender(this, `<div class="w9-toolbar"><label>条件卡 <select data-k="cid">${['card-1a', 'card-1b', 'card-2a', 'card-3a'].map((id) => `<option value="${id}" ${id === this.s.cid ? 'selected' : ''}>${esc(card(id).label)}</option>`).join('')}</select></label>
          <label>服务 <select data-k="preset"><option value="deepseek" ${this.s.preset === 'deepseek' ? 'selected' : ''}>DeepSeek</option><option value="kimi" ${this.s.preset === 'kimi' ? 'selected' : ''}>Kimi</option></select></label>
          <span><b>问：</b>${esc(c.user_prompt)}</span>
          <button class="small" data-x="again" ${liveOk ? '' : 'disabled'} title="${liveOk ? '按同一张卡再发一次请求，结果标实际调用' : '在顶栏"模型接入"切到现场调用并输入 Key 后可用'}">进阶：现场再采样一次</button> <span class="${this.s.msg.startsWith('已') ? 'ok' : 'nil'}">${esc(this.s.msg)}</span></div>
        <p class="sub">同一人设、同一史料、同一温度，只是再生成一次。模拟者不先定下一个角色；每次采样抽出一个，任何一个都不比另一个更"真"（讲义 1.1，本课推论）。数据直接取运行记录，不另存副本。</p>
        ${show.length ? `<div class="w9-cols" style="--n:${Math.min(show.length, 4)}">${show.map(col).join('')}</div>` : `<p>${B.none}</p><p class="sub">这一格还没有采样记录：依赖课前三次采样（课前环境方案 C-01），载入本机材料包后这里并排出现。</p>`}
        <p class="w9-sum">点句子标注：${Object.entries(tally).map(([k, v]) => `${k} <b>${v}</b> 句`).join('　')}　${B.calc}${rs.length > 4 ? `　另有 ${rs.length - 4} 次未显示` : ''}</p>`);
    }
    onChange(e) { const k = e.target.dataset.k; if (k === 'preset' || k === 'cid') this.set({ [k]: e.target.value, msg: '' }); }
    async onClick(e) {
      const m = e.target.closest('[data-mark]');
      if (m) { const k = m.dataset.mark, cur = AGREE.indexOf(this.s.marks[k] || ''), nx = AGREE[(cur + 1) % AGREE.length], marks = { ...this.s.marks }; if (nx) marks[k] = nx; else delete marks[k]; return this.set({ marks }); }
      if (e.target.dataset.x === 'again') {
        this.set({ msg: '运行中…' });
        try { const n = samplesOf(this.s.cid, this.s.preset).length + 1, r = await Model.run(card(this.s.cid), this.s.preset, { sample: n }); this.set({ msg: r.kind === 'live' ? `已完成第 ${n} 次采样（实际调用）。` : (r.error || '未得到现场结果') }); } catch (err) { this.set({ msg: String(err.message || err) }); }
      }
    }
  }
  register('roles-lab', RolesLab);

  /* ================= D03 三种条件 ================= */
  const COND = [
    { id: 'prompt', name: '提示词（人设）', can: '身份、时点、口吻、回答的格式；可以写"只依据所给材料"', cannot: '模型参数里已有的后世知识；模型对这个人的通行印象', eg: '导入演示①；2.3 福沢《脱亜論》的三种问法', link: 'D01',
      cards: [['C-02 Underwood、Nelson、Wilkens 2025', '只靠提示（1 例／20 例）续写的年代分布与真实文本的 JS 散度为 0.310／0.350；GPT-1914 为 0.006，微调 GPT-4o-mini 后为 0.002；提示生成中多至两成带今人口吻的免责句。作者认为微调多半只是骗过了只看文体的判别器。', 'arXiv:2505.00030，读全文要点（案例 C-02）']] },
    { id: 'source', name: '指定史料', can: '回答应当依据的文本；可以要求逐句标出处（第五周）', cannot: '材料本身的成文时间与立场；材料以外的知识照样会混进来', eg: '梁启超三个年份的文字；井上《国民道德概论》两版', link: 'D09',
      cards: [['TimeChara（Ahn 等 2024）', '把整部小说的相关段落检索出来交给模型的朴素检索增强，在时点角色扮演中表现反而最差。', 'ACL Findings 2024，第 5.4 节（讲义 1.3 备答）']] },
    { id: 'base', name: '基座模型', can: '训练语料的构成、后期对齐的取向，从而决定"可能的角色"的范围', cannot: '使用者通常无法改变；网页版的系统设置也不由使用者决定', eg: 'DeepSeek、Kimi（经接口）与 Gemini、ChatGPT（网页版）的对照', link: 'D10',
      cards: [['C-03 Character-LLM（邵云帆等 2023）', '据人物档案让大模型扩写"场景"，微调 70 亿参数模型；加入"保护性经验"，每个人物不到一百个场景即可明显减轻幻觉。用来微调的场景本身是模型编出来的。', 'EMNLP 2023，读摘要、引言与第 3.2、4.6.2 节'], ['C-04 BaiJia（Bai 等 2025）', '收唐至清 19,281 位人物（唐 3,020、宋 5,964、元 972、明 4,564、清 4,761），材料来自 CBDB、维基百科与古诗文网；CBDB 的著录偏向会原样进入。仓库未见许可证，只作静态说明。', 'arXiv:2412.20024，读摘要与第 2 节'], ['C-05 からまる（Sakana AI 2025）', '在 Llama-3-ELYZA-JP-8B 上用约 2,500 万字江户文本继续训练；底子仍是现代模型（"现代知识不会因此被移走"是讲义的推断）。只引模型卡，不调用。', 'Hugging Face 模型卡']] },
  ];
  /* C-03 场景的组成部分与来源：据论文正文（导言、第 3 节）对流程的说明整理，不是场景原文 */
  const SCENE = [
    ['事实底子：父亲约翰是乐师，早年严厉地教他音乐', '有据', '取自维基百科的人物档案（论文导言脚注）。'],
    ['"背景"一行：这一幕发生在何时何地、谁在场', '想象', '由 gpt-3.5-turbo 据档案片段扩写。'],
    ['贝多芬"说"的台词', '想象', '对话由模型编写，不是贝多芬的话。'],
    ['贝多芬"想"的内心活动（格式里专有一种"想"）', '想象', '内心独白同样由模型编写。'],
    ['"保护性场景"：有人拿后世的东西来问，角色表示不懂', '想象', '整幕由模型编写，用来教角色"不知道"；评测中被问到用 Python 写快速排序时，角色答不懂并请对方解释。'],
  ];
  class CondLab extends Lab {
    defaults() { return { on: 'prompt', tags: {} }; }
    render() {
      const c = COND.find((x) => x.id === this.s.on), done = SCENE.filter((_, i) => this.s.tags['scene|' + i]);
      paint(this, `<div class="w9-two" style="grid-template-columns:270px minmax(0,1fr)">
        <div><svg viewBox="0 0 260 230" class="w9-svg" role="group" aria-label="三种条件">${COND.map((x, i) => `<g data-cond="${x.id}" style="cursor:pointer"><rect x="${20 + i * 12}" y="${20 + i * 64}" width="${220 - i * 24}" height="54" rx="6" fill="${x.id === this.s.on ? '#164ec7' : '#e7edf1'}" stroke="#164ec7"/><text x="130" y="${52 + i * 64}" text-anchor="middle" font-size="15" fill="${x.id === this.s.on ? '#fff' : '#123'}">${esc(x.name)}</text></g>`).join('')}</svg>
          <p class="sub">点选一层。上层最容易改，下层使用者通常改不了（讲义 @fig-conditions，本课整理）。${B.st}</p></div>
        <div><table class="items w9-cond"><tr><th>条件</th><th>它规定什么</th><th>它管不住什么</th><th>本讲的例子</th></tr>${COND.map((x) => `<tr class="${x.id === c.id ? 'on' : ''}" data-cond="${x.id}"><th>${esc(x.name)}</th><td>${esc(x.can)}</td><td>${esc(x.cannot)}</td><td>${esc(x.eg)}（见 ${x.link}）</td></tr>`).join('')}</table>
          ${c.cards.map(([t, f, s]) => `<div class="w9-formula"><b>${esc(t)}</b><p>${esc(f)}</p><p class="sub">${esc(s)}</p></div>`).join('')}
          ${c.id === 'base' ? '<p class="sub">改模型本身的几条路（时代锁定、知识编辑、激活引导）见 D10、D11。</p>' : ''}</div></div>
        <details class="w9-check"><summary>进阶：C-03 的"场景"里，哪些有据、哪些是模型编的</summary>
          <p class="sub">Character-LLM（邵云帆等 2023）用来微调的不是人物原话，而是让模型据人物档案扩写出的"场景"。下面按论文正文对场景格式与来源的说明列出各部分（arXiv:2310.10158v2 网页版，读前半篇；论文附录里的完整训练样例未读，这里不转录场景原文）。逐项判断它来自档案还是模型编写：</p>
          <table class="items"><tr><th>场景的组成部分（以贝多芬为例）</th><th>你的判断</th><th></th></tr>${SCENE.map(([t, ans, why], i) => { const v = this.s.tags['scene|' + i]; return `<tr><td>${esc(t)}</td><td class="nowrap">${['有据', '想象'].map((x) => `<button class="small ${v === x ? 'on' : ''}" data-tag="scene|${i}" data-v="${x}">${x}</button>`).join(' ')}</td><td class="sub">${v ? (v === ans ? '<span class="ok">与论文说明一致。</span>' : '<span class="nil">论文说明相反。</span>') + esc(why) : ''}</td></tr>`; }).join('')}</table>
          <p class="mono">已判断 ${done.length}/${SCENE.length} 项；按论文说明，"想象"占 ${SCENE.filter((x) => x[1] === '想象').length}/${SCENE.length}　${B.calc}</p>
          <p class="sub">用来微调的材料大半出自另一个模型之手：微调改得了口吻，材料本身却不是史料（讲义 1.2）。${B.st}</p>
        </details>`);
    }
    onClick(e) {
      const g = e.target.closest('[data-cond]'); if (g) return this.set({ on: g.dataset.cond });
      const t = e.target.closest('[data-tag]'); if (t) { const tags = { ...this.s.tags }; if (tags[t.dataset.tag] === t.dataset.v) delete tags[t.dataset.tag]; else tags[t.dataset.tag] = t.dataset.v; this.set({ tags }); }
    }
  }
  register('cond-lab', CondLab);

  /* ================= D04 共情三部分 ================= */
  const PARTS = [['语境化', '历史语境化：对时间差异的感知（时点、事件、制度）'], ['视角采择', '视角采择：理解此人此前的经历、立场与信念（把后来的立场安到当时就是失败）'], ['情感联结', '情感联结：只有情感、没有内容']];
  class EmpathyLab extends Lab {
    defaults() { return { groups: [], msg: '' }; }
    render() {
      const T = Through.get(), mine = T.labels.filter((l) => l.circled);
      const all = mine.map((l) => ({ ...l, g: '本机' })).concat(this.s.groups.flatMap((g) => g.labels.map((l) => ({ ...l, g: g.name }))));
      const cnt = PARTS.map(([p]) => all.filter((l) => l.empathy_part === p).length), max = Math.max(1, ...cnt);
      const byS = {}; all.filter((l) => l.empathy_part).forEach((l) => { const k = l.run_id + '|' + l.sentence_index; (byS[k] = byS[k] || { sentence: l.sentence, parts: new Set() }).parts.add(l.empathy_part); });
      const split = Object.values(byS).filter((x) => x.parts.size > 1);
      const cols = [
        { title: '取回圈出的句子', why: '来自 D01（或 D05、D08）里你圈出的句子。', body: mine.length ? `<p>本机已圈 ${mine.length} 句。</p>` : `<p class="nil">本机还没有圈出的句子。</p><p class="sub">先到 D01 点句子圈出；回答来自现场调用或预存回放（${B.none}时无句可圈）。</p>` },
        { title: '读三部分定义', why: 'Endacott 与 Brooks 2013，第 43 页：三者缺一不可。', body: `<ol>${PARTS.map(([, d]) => `<li>${esc(d)}</li>`).join('')}</ol><p class="sub">${B.st} 原文面向中小学历史教学；本讲借作诊断框架。</p>` },
        { title: '归入一部分', why: '两人一组，2 分钟。', body: mine.length ? mine.map((l) => `<div class="w9-cell"><p>${esc(l.sentence)}</p><p>${PARTS.map(([p]) => `<button class="small ${l.empathy_part === p ? 'on' : ''}" data-part="${esc(l.run_id)}|${l.sentence_index}|${p}">${p}</button>`).join(' ')}</p></div>`).join('') : '<p class="sub">（无）</p>' },
        { title: '全组汇总', why: '页面不连服务器；全班分布由教师导入各组导出的记录文件。', body: `<svg viewBox="0 0 240 130" class="w9-svg">${cnt.map((n, i) => `<rect x="${20 + i * 75}" y="${110 - (n / max) * 90}" width="50" height="${(n / max) * 90}" fill="#164ec7"/><text x="${45 + i * 75}" y="125" font-size="11" text-anchor="middle">${PARTS[i][0]}</text><text x="${45 + i * 75}" y="${104 - (n / max) * 90}" font-size="11" text-anchor="middle">${n}</text>`).join('')}</svg><p>${B.calc}　共 ${all.filter((l) => l.empathy_part).length} 句已归类（本机＋导入 ${this.s.groups.length} 组）</p>
          <label class="pack-btn small">进阶：导入各组记录 .json<input type="file" accept=".json" multiple data-imp hidden></label> ${this.s.groups.length ? '<button class="small" data-x="clear">清除导入</button>' : ''}<p class="${this.s.msg.startsWith('已') ? 'ok' : 'nil'}">${esc(this.s.msg)}</p>
          ${split.length ? `<p><b>同一句被归入不同部分：</b></p><ul>${split.map((x) => `<li>${esc(x.sentence)}（${[...x.parts].join('／')}）</li>`).join('')}</ul>` : ''}` },
      ];
      flow(this, cols, mine.some((l) => l.empathy_part) ? 3 : mine.length ? 2 : 0);
    }
    onClick(e) {
      const b = e.target.closest('[data-part]');
      if (b) { const [rid, i, p] = b.dataset.part.split('|'), l = Through.labelsFor(rid).find((x) => x.sentence_index === +i); Through.setLabel(rid, +i, l?.sentence || '', { empathy_part: l?.empathy_part === p ? null : p }); return; }
      if (e.target.dataset.x === 'clear') this.set({ groups: [], msg: '' });
    }
    async onChange(e) {
      if (e.target.dataset.imp === undefined) return;
      const got = [], bad = [];
      for (const f of e.target.files) { try { const j = JSON.parse(await f.text()); if (j.format !== 'w09-through/v1' || !Array.isArray(j.labels)) throw new Error('不是第九周贯穿记录'); got.push({ name: f.name, labels: j.labels.filter((l) => l.empathy_part) }); } catch (err) { bad.push(f.name + '：' + (err.message || err)); } }
      this.set({ groups: [...this.s.groups, ...got], msg: (got.length ? `已导入 ${got.length} 个文件。` : '') + (bad.length ? ' 未导入：' + bad.join('；') : '') });
    }
  }
  register('empathy-lab', EmpathyLab);

  /* ================= D06 平均化与标签化 ================= */
  const EVAL = [
    { id: 'model', head: '模型回答', src: '井上 1912 年卡的模型回答（D05 / 演示②）' },
    { id: 'contemp', head: '同时代人', text: '彼は全く時代思潮の追随者で、彼自身の見識も意見も有るものではない', zh: '他完全是时代思潮的追随者，自己没有任何见识与主张', src: '大村哲太郎《余の観たる井上博士——不敬著書事件に就いて》，1926；見城悌治 2008 第 167—168 页引' },
    { id: 'later', head: '后人', text: '自明の国家主義的イデオローグ／勅語の番犬', zh: '不言而喻的国家主义理论家／教育敕语的看门狗', src: '見城悌治 2008 第 151 页概括既往研究；関口すみ子 2007（見城注 4 引）' },
  ];
  class LabelLab extends Lab {
    defaults() { return { guess: '', shown: false, preset: 'deepseek' }; }
    render() {
      const r = latestRun('card-3a', this.s.preset);
      const order = ['later', 'model', 'contemp'], letter = (i) => 'ABC'[i];
      const block = (id, i) => { const e = EVAL.find((x) => x.id === id); return `<section class="w9-col"><header><b>${letter(i)}</b>${this.s.shown ? `　${esc(e.head)}` : ''}</header>${id === 'model' ? (r.run ? `<div class="w9-reply">${esc((r.run.reply || '').slice(0, 260))}${(r.run.reply || '').length > 260 ? '…' : ''}</div>` : `<p>${B.none}</p><p class="sub">模型回答待课前记录。</p>`) : `<p lang="ja">${esc(e.text)}</p><p class="sub">${esc(e.zh)}</p>`}${this.s.shown ? `<p class="sub">出处：${esc(e.src)}</p>${id === 'model' && r.run ? badge(r.run, r.kind) : B.st}` : ''}</section>`; };
      paint(this, `<div class="w9-toolbar"><b>三段并排：模型的回答更像哪一段？</b>　服务 <select data-k="preset"><option value="deepseek" ${this.s.preset === 'deepseek' ? 'selected' : ''}>DeepSeek</option><option value="kimi" ${this.s.preset === 'kimi' ? 'selected' : ''}>Kimi</option></select></div>
        <div class="w9-two" style="grid-template-columns:repeat(3,1fr)">${order.map(block).join('')}</div>
        <p>${this.s.shown ? '' : `模型回答（三段之一）更像：<button data-g="contemp">同时代人的评价</button> <button data-g="later">后人的标签</button> <button data-g="neither">都不像</button>　`}<button data-x="reveal">${this.s.shown ? '隐藏出处' : '揭示'}</button>　${this.s.guess ? `<span class="ok">你的判断：${{ contemp: '更像同时代人', later: '更像后人', neither: '都不像' }[this.s.guess]}</span>` : ''}</p>
        ${this.s.shown ? `<div class="w9-formula"><b>井上的三个标签各抓住一面</b><ul><li>"国家主义理论家"：战后研究的通行看法（見城第 151 页）</li><li>"勅語の番犬"：関口 2007</li><li>"时代思潮的追随者"：1926 年攻击他的大村；見城认为这句话说中了井上逐版修书、跟随"时势"的一面</li></ul><p class="sub">模型多半只学到第一个——这是讲义 2.2 的判断，有待用 D05 的回答检验。</p></div>` : ''}
        <details class="w9-check"><summary>进阶：遗漏有方向（只放原文报告的数字）</summary><ul>
          <li>Bisbee 等 2024（C-08）：按 ANES 2016、2020 真实受访者背景让 ChatGPT 作答，平均数相近、方差小得多；用合成数据做回归，48% 的系数与真实数据显著不同；隔三个月再跑，结果也变了。</li>
          <li>Wang 等 2025（C-09）：4 个模型、16 种身份、3,200 名真人对照；"误绘"（像外人眼中的群体）与"扁平化"（群体内部差异被压没）。</li>
          <li>石原祥太郎 JSAI2026：日文维基讣闻条目的想起率明显低于英文（读摘要）。</li></ul>
          <p class="sub">${B.st} 采样次数与分布宽度的原文图表数值待读原文，页面不合成分布图。两项研究的对象都是当代美国受访者，迁移到历史人物是本课推论。</p></details>`);
    }
    onChange(e) { if (e.target.dataset.k === 'preset') this.set({ preset: e.target.value }); }
    onClick(e) { const g = e.target.dataset.g; if (g) return this.set({ guess: g }); if (e.target.dataset.x === 'reveal') this.set({ shown: !this.s.shown }); }
  }
  register('label-lab', LabelLab);

  /* ================= D10 知识编辑的涟漪（教学构造） ================= */
  const NET = {
    nodes: [
      ['rev', '1917 年俄国发生革命', 160, 120], ['tsar', '尼古拉二世 1917 年退位', 20, 20], ['sov', '苏维埃政权成立', 300, 20], ['brest', '1918 年布列斯特和约', 320, 120],
      ['lenin', '列宁成为政府首脑', 300, 220], ['inoue', '井上 1918 年版删去俄国一段', 20, 220], ['jp', '日本出兵西伯利亚（1918）', 160, 270],
    ],
    edges: [['rev', 'tsar'], ['rev', 'sov'], ['rev', 'brest'], ['sov', 'lenin'], ['rev', 'inoue'], ['brest', 'jp'], ['rev', 'jp']],
    /* 示意：RippleEdits 的总体结论是"目标事实改得掉、相关事实不能一致改变"。哪几条"没有改变"是本页构造，不代表任何具体模型的实验结果。 */
    stuck: ['sov', 'lenin', 'jp'],
  };
  const LOCKS = [1913, 1929, 1933, 1939, 1946];
  class RippleLab extends Lab {
    defaults() { return { edited: false, q: {} }; }
    render() {
      const N = Object.fromEntries(NET.nodes.map((n) => [n[0], n])), e = this.s.edited;
      const col = (id) => (!e ? '#e7edf1' : id === 'rev' ? '#c0392b' : NET.stuck.includes(id) ? '#c9a400' : '#f2c6c0');
      const NW = 150, NH = 30;
      const svg = `<svg viewBox="0 0 480 310" class="w9-svg wide">${NET.edges.map(([a, b]) => `<line x1="${N[a][2] + NW / 2}" y1="${N[a][3] + NH / 2}" x2="${N[b][2] + NW / 2}" y2="${N[b][3] + NH / 2}" stroke="#999"/>`).join('')}${NET.nodes.map(([id, t, x, y]) => `<g ${id === 'rev' ? 'data-x="edit" style="cursor:pointer"' : ''}><rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="5" fill="${col(id)}" stroke="${id === 'rev' ? '#c0392b' : '#555'}" stroke-width="${id === 'rev' ? 2 : 1}"/><text x="${x + NW / 2}" y="${y + 19}" font-size="11" text-anchor="middle" fill="${e && id === 'rev' ? '#fff' : '#123'}">${esc(id === 'rev' && e ? '（改为）1917 年俄国仍为帝制' : t)}</text></g>`).join('')}</svg>`;
      const cols = [
        { title: '时代锁定的模型', why: '从头用某一年以前的文本训练。', body: `<ul><li>GPT-1914（C-02）：7.74 亿参数，HathiTrust 1880—1914 年约 265 亿词元。</li><li>History LLMs（Ranke-4B，C-06）：计划以 ${LOCKS.join('、')} 年为截止；截至 2026-11-10 权重、数据、代码均未公开，也无正式评测（课前再核）。</li><li>「からまる」：现代模型上继续训练，现代知识仍在。</li></ul><p>${B.st}</p>` },
        { title: '改一条事实', why: 'ROME、MEMIT 能改掉目标事实。', body: `${svg}<p><button data-x="edit">${e ? '撤销编辑' : '点红框：改掉"1917 年俄国革命"'}</button></p><p class="sub">${B.tc} 事实小网为本课构造。</p>` },
        { title: '涟漪', why: '应当随之改变的相关事实，改了吗？', body: e ? `<p><span style="background:#f2c6c0">　　</span> 应随之改变　<span style="background:#c9a400">　　</span> 示意：仍保持原样</p><p>RippleEdits（Cohen 等 2024，C-17）：约 5,000 条编辑，测试 MEND、ROME、MEMIT 等；这些方法能改掉目标事实，却"不能在模型的知识中带来一致的改变"；把新事实直接写进提示的简单对照反而得分最高。</p><p class="sub">黄框只表达这一总体结论，不代表任何具体模型的实验结果。让模型"忘掉"1917 年以后的俄国，要改的是成千上万条彼此牵连的关联（讲义 3.2，本课推论）。</p>` : '<p class="sub">先在第 2 栏改一条。</p>' },
        { title: '狭窄训练的广泛变化', why: '改参数还会改出意料之外的东西。', body: `<p>Betley 等 2026（C-19）：只用"写带安全漏洞的代码"微调，模型在与编程无关的问题上也变了样（涌现性失调）；GPT-4o 与 Qwen2.5-Coder-32B-Instruct 上最明显，有的设置下多达一半回答失调。</p><p class="sub">改倾向的另一条路（激活引导）见 D11。${B.st}</p>
          <details><summary>进阶：为每个截止年份出一道 future 题</summary>${LOCKS.map((y) => `<label class="w9-kv">截止 ${y}<input data-q="${y}" value="${esc(this.s.q[y] || '')}" size="28" placeholder="问 ${y} 年以后的事"></label>`).join('')}<p class="sub">只作记录，不发出请求；模型未发布，无法检验。</p></details>` },
      ];
      flow(this, cols, e ? 2 : 1);
    }
    onClick(e) { if (e.target.closest('[data-x="edit"]')) this.set({ edited: !this.s.edited }); }
    onInput(e) { const y = e.target.dataset.q; if (y) { this.s.q[y] = e.target.value; store.set(this.key, this.s); } }
  }
  register('ripple-lab', RippleLab);

  /* ================= D15 / D21 误差曲面与遗传算法（教学构造） ================= */
  const OBS = [0.7, 0.3, 0.3], SIM = [0.6, 0.35, 0.2];
  class GaLab extends Lab {
    defaults() { return { pick: null, gen: 0, seed: 1, miss: 0, ten: false }; }
    get surface() { return 'single'; }
    runGA() { this.ga = L.gaRun(this.surface, { seed: this.s.seed }); return this.ga; }
    render() {
      const f = L.SURFACES[this.surface], ga = this.ga || this.runGA(), g = Math.min(this.s.gen, ga.history.length - 1), P = ga.history[g];
      const W = 240, cell = 8, n = W / cell;
      let heat = ''; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = f((i + 0.5) / n, 1 - (j + 0.5) / n), t = Math.min(1, Math.sqrt(v) / 0.6); heat += `<rect x="${i * cell}" y="${j * cell}" width="${cell}" height="${cell}" fill="rgb(${Math.round(22 + t * 220)},${Math.round(78 + t * 160)},${Math.round(199 + t * 40)})"/>`; }
      const X = (p) => p * W, Y = (q) => W - q * W;
      const pts = P.map(([p, q]) => `<circle cx="${X(p).toFixed(1)}" cy="${Y(q).toFixed(1)}" r="2.6" fill="#c9a400" stroke="#333" stroke-width=".4"/>`).join('');
      const pk = this.s.pick ? `<circle cx="${X(this.s.pick[0])}" cy="${Y(this.s.pick[1])}" r="5" fill="none" stroke="#c0392b" stroke-width="2"/>` : '';
      const ten = this.s.ten ? Array.from({ length: 10 }, (_, k) => L.gaRun(this.surface, { seed: k + 1 }).best) : null;
      const tenSvg = ten ? ten.map(([p, q], k) => `<text x="${X(p) - 3}" y="${Y(q) + 4}" font-size="10" fill="#c0392b">${k + 1}</text>`).join('') : '';
      const plot = `<svg viewBox="0 0 ${W} ${W}" class="w9-svg" data-plot style="cursor:crosshair">${heat}${pts}${pk}${tenSvg}</svg><p class="sub">横轴参数 p，纵轴参数 q；颜色越深误差越小。点图上任一处看 E。</p>`;
      const E0 = L.sqError(OBS, SIM);
      const left = ten ? ten.filter(([p]) => p < 0.5).length : 0;
      const isD21 = this.surface === 'double';
      const fitA = L.fitWeights(0), fitB = L.fitWeights(this.s.miss);
      const cols = isD21 ? [
        { title: '双谷误差曲面', why: '两个谷同样低：两组不同的参数长出同样好的拟合。', body: `${plot}<p>${B.tc} 页面内实际计算。</p>${SIMPLE}` },
        { title: '重复十次', why: '种子 1—10，每次 30 个体、40 代。', body: `<button data-x="ten">${ten ? '收起' : '重复十次'}</button><p class="sub">种子固定，十次运行可复现。</p>` },
        { title: '落点分布', why: '结果落在哪个谷，取决于随机起点。', body: ten ? `<table class="items">${ten.map(([p, q], k) => `<tr><td>第 ${k + 1} 次</td><td class="mono">(${fmt(p, 2)}, ${fmt(q, 2)})</td><td>${p < 0.5 ? '左上谷' : '右下谷'}</td></tr>`).join('')}</table><p><b>左上谷 ${left} 次，右下谷 ${10 - left} 次。</b>${left && left < 10 ? ' 同一格局由两组参数长出：等终性。' : ''}</p>` : '<p class="sub">先点"重复十次"。</p>' },
        { title: '对照吕鹏', why: '在许多组参数里挑出最像史实的一组。', body: `<p>吕鹏、李浩 2024（C-27）：NetLogo 中设虎、狼、羊、草四类主体，以公元前 221 年至 1912 年为拟合对象，跑 3,000 组参数，选出与史实朝代"一一对应"的一组，再重复 20,000 次检验稳健性；作者称参数"具体取值没有意义"，这组只是"最优解之一"。</p><p>检验仿真至少问三件事：换参数、换机制、比零模型（Turchin 等 2013：65% 对 16%）。</p><p class="sub">${B.st} 讲义 5.2；原文教师提供。</p>` },
      ] : [
        { title: '观察值', why: '逆向仿真：已知格局，找能长出它的参数。', body: `<div class="w9-formula"><p class="mono">观察 (${OBS.join(', ')})　模拟 (${SIM.join(', ')})</p><p class="mono">E = Σ(sim − obs)² = ${SIM.map((s, i) => fmt((s - OBS[i]) ** 2, 4)).join(' + ')} = <b>${fmt(E0, 4)}</b></p></div><p class="sub">E 是扩充部分甲六的示意写法；倉橋等原文的误差定义以原文为准。</p>` },
        { title: '点选参数', why: '在等高线图上点一组参数，看模拟与观察的差。', body: `${plot}${this.s.pick ? `<p class="mono">(p, q) = (${fmt(this.s.pick[0], 2)}, ${fmt(this.s.pick[1], 2)})　E = ${fmt(f(...this.s.pick), 4)}</p>` : ''}<p>${B.tc}</p>` },
        { title: '遗传算法逐代', why: '保留误差小的，交叉、变异，生成下一代。', body: `<p><button data-x="one">运行一代</button> <button data-x="all">运行到底</button> <button data-x="reset">重置</button>　种子 <input data-k="seed" value="${this.s.seed}" size="3"></p><p class="mono">第 ${g} 代　最优 (${fmt(P.slice().sort((a, b) => f(...a) - f(...b))[0][0], 2)}, ${fmt(P.slice().sort((a, b) => f(...a) - f(...b))[0][1], 2)})　E = ${fmt(Math.min(...P.map((x) => f(...x))), 5)}</p>${SIMPLE}
            <p class="sub">Yang 等 2009 的设置：50 个模拟社会、2,000 代、重复 10 次；母亲约 28%（外祖父曾登科时）、姑母约 6%、学校 3%；均方根 0.367 对一般线性模型 0.504。${B.st}</p>` },
        { title: '缺失比例', why: '拟合对象是族谱记载，不是全部事实。', body: `<p>族谱简表（教学构造，600 人）：成功 = 0.28·母 + 0.06·姑 + 0.03·学 + 噪声。随机删去一部分母亲记录后重估。</p><label>女性记录缺失 <input type="range" min="0" max="0.8" step="0.05" value="${this.s.miss}" data-k="miss"> ${fmt(this.s.miss * 100, 0)}%</label>
            <table class="items"><tr><th></th><th>不缺失</th><th>缺失 ${fmt(this.s.miss * 100, 0)}%</th></tr>${[['母亲', 'mother'], ['姑母', 'aunt'], ['学校', 'school']].map(([l, k]) => `<tr><td>${l}</td><td class="mono">${fmt(fitA[k])}</td><td class="mono">${fmt(fitB[k])}</td></tr>`).join('')}</table><p>${B.calc}（最小二乘，数字为示例）</p>
            <p class="sub">进阶对照：Turchin 等 2013 模型解释 65% 的方差，去掉军事技术扩散的对照模型只解释 16%（读摘要与首页）。双谷曲面见 D21。</p>` },
      ];
      flow(this, cols, isD21 ? (ten ? 2 : 1) : g ? 2 : this.s.pick ? 1 : 0);
    }
    onClick(e) {
      const sv = e.target.closest('[data-plot]');
      if (sv) { const r = sv.getBoundingClientRect(); return this.set({ pick: [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))] }); }
      const x = e.target.dataset.x;
      if (x === 'one') this.set({ gen: this.s.gen + 1 }); if (x === 'all') this.set({ gen: 40 }); if (x === 'reset') this.set({ gen: 0 }); if (x === 'ten') this.set({ ten: !this.s.ten });
    }
    onChange(e) { if (e.target.dataset.k === 'seed') { this.s.seed = +e.target.value || 1; this.s.gen = 0; this.runGA(); this.set({}); } }
    onInput(e) { if (e.target.dataset.k === 'miss') this.set({ miss: +e.target.value }); }
  }
  register('ga-lab', GaLab);
  register('equi-lab', class extends GaLab { get surface() { return 'double'; } connectedCallback() { return Lab.prototype.connectedCallback.call(this); } }); // 自己的 connectedCallback：避免继承 ga-lab 已包装过的版本而被重复包装

  /* ================= D16 三种评价办法 ================= */
  const METHODS = [['bel', '可信度', '人对"像不像人"的打分（TrueSkill）'], ['fid', '算法保真度', '与真实调查分布对照；四项检验，最要紧的是模式对应'], ['na', '归一化准确率', '以本人两周后的重答为分母'], ['other', '都不是', '另用别的参照，或没有参照']];
  const STUDIES = [
    ['park23', 'Park 等 2023 生成式智能体（C-30）', 'bel', '25 个角色的小镇；100 名受试者对五种条件的回答排序，换算 TrueSkill。可信不等于真实。'],
    ['argyle', 'Argyle 等 2023 硅基样本（C-31）', 'fid', '社会科学图灵检验、向后连续性、向前连续性、模式对应。'],
    ['park24', 'Park 等 2024 千人访谈智能体（C-32）', 'na', '1,052 人各两小时访谈；GSS 上达到本人两周后自我重复准确率的 85%。'],
    ['war', 'WarAgent（C-35）', 'other', '与维基百科所记历史比对结盟与战争；国名匿名。'],
    ['chen', 'Chen 等 DH2024 正史辩论（C-29）', 'other', '只报告"君父孰先"的时代倾向，没有与专家判断对照。'],
  ];
  const SURVEY0 = () => {
    /* 五人十题，答案取 0／1；第一人：智能体与本人一致 7 题、本人两次一致 8 题（扩充部分甲七的小例子），其余四人为示例 */
    const agreeN = [7, 6, 8, 5, 7], retestN = [8, 9, 9, 7, 8], rows = [];
    for (let p = 0; p < 5; p++) for (let k = 0; k < 10; k++) { const self = (k + p) % 2; rows.push({ respondent: 'P' + (p + 1), item: k + 1, answer_self: self, answer_agent: k < agreeN[p] ? self : 1 - self, answer_retest: k >= 10 - retestN[p] ? self : 1 - self }); }
    return rows;
  };
  class EvalLab extends Lab {
    defaults() { return { place: {}, rows: SURVEY0(), noRetest: false }; }
    render() {
      const rows = this.s.rows.map((r) => (this.s.noRetest ? { ...r, answer_retest: null } : r)), res = L.normalizedAccuracy(rows);
      const per = res.per || res, mean = res.mean;
      const cell = (r, k) => `<td><button class="small" data-cell="${r.respondent}|${r.item}|${k}" ${k === 'answer_retest' && this.s.noRetest ? 'disabled' : ''}>${r[k] == null ? '—' : r[k] ? '是' : '否'}</button></td>`;
      const cols = [
        { title: '三种评价办法', why: '评价办法决定"成功"是什么意思。', body: `<ul>${METHODS.slice(0, 3).map(([, n, d]) => `<li><b>${n}</b>：${esc(d)}</li>`).join('')}</ul><p>${B.st}</p>` },
        { title: '把研究放到办法下', why: '每项研究实际用了哪一种？', body: STUDIES.map(([id, t, ans, note]) => { const v = this.s.place[id]; return `<div class="w9-cell"><b>${esc(t)}</b><br><select data-k="place-${id}"><option value="">选办法</option>${METHODS.map(([m, n]) => `<option value="${m}" ${v === m ? 'selected' : ''}>${n}</option>`).join('')}</select> ${v ? (v === ans ? '<span class="ok">对</span>' : `<span class="nil">实际是"${METHODS.find((m) => m[0] === ans)[1]}"</span>`) : ''}${v ? `<p class="sub">${esc(note)}</p>` : ''}</div>`; }).join('') },
        { title: '问卷计算', why: '归一化准确率 = 与本人一致的比例 ÷ 本人两次一致的比例。', body: `<div class="w9-formula mono">P1：${fmt(per[0].agree, 2)} ÷ ${fmt(per[0].self, 2)} = ${per[0].na == null ? '不可算' : fmt(per[0].na)}</div><table class="items"><tr><th></th>${per.map((p) => `<th>${p.respondent}</th>`).join('')}</tr><tr><td>一致</td>${per.map((p) => `<td class="mono">${fmt(p.agree, 2)}</td>`).join('')}</tr><tr><td>重答一致</td>${per.map((p) => `<td class="mono">${p.self == null ? '—' : fmt(p.self, 2)}</td>`).join('')}</tr><tr><td>归一化</td>${per.map((p) => `<td class="mono">${p.na == null ? '不可算' : fmt(p.na)}</td>`).join('')}</tr></table><p class="mono">五人平均：${mean == null ? '不可算' : fmt(mean)}</p><p>${B.tc} 页面内实际计算。</p>${SIMPLE}
            <details><summary>改作答（P1 十题）</summary><table class="items"><tr><th>题</th><th>智能体</th><th>本人</th><th>重答</th></tr>${rows.filter((r) => r.respondent === 'P1').map((r) => `<tr><td>${r.item}</td>${cell(r, 'answer_agent')}${cell(r, 'answer_self')}${cell(r, 'answer_retest')}</tr>`).join('')}</table><button class="small" data-x="reset">恢复示例</button></details>` },
        { title: '删去重答一栏', why: '历史人物不能重答。', body: `<label><input type="checkbox" data-k="noRetest" ${this.s.noRetest ? 'checked' : ''}> 删去"本人重答"一栏</label>${this.s.noRetest ? '<p class="nil"><b>指标不可算：历史人物没有这一栏。</b></p>' : ''}<p class="sub">三种办法各需一样参照：看得懂"可信"的观众、真实调查分布、能重答的本人。历史研究里后两样通常没有（扩充部分甲七，本课推论）。Larooij 与 Törnberg 2026：验证是核心难题。</p>` },
      ];
      flow(this, cols, this.s.noRetest ? 3 : Object.keys(this.s.place).length ? 1 : 0);
    }
    onChange(e) {
      const k = e.target.dataset.k || '';
      if (k.startsWith('place-')) this.set({ place: { ...this.s.place, [k.slice(6)]: e.target.value } });
      if (k === 'noRetest') this.set({ noRetest: e.target.checked });
    }
    onClick(e) {
      const c = e.target.dataset.cell;
      if (c) { const [p, i, k] = c.split('|'); const rows = this.s.rows.map((r) => (r.respondent === p && r.item === +i ? { ...r, [k]: 1 - r[k] } : r)); return this.set({ rows }); }
      if (e.target.dataset.x === 'reset') this.set({ rows: SURVEY0() });
    }
  }
  register('eval-lab', EvalLab);

  /* ================= D19 差分方程与存量—流量 ================= */
  class DynLab extends Lab {
    defaults() { return { c: 0.6, a: 0.5, step: 0, phase: false, logi: false, scan: false, t: 60 }; }
    render() {
      const p = { c: this.s.c, a: this.s.a }, r = L.diffEq(p), base = this.s.c === 0.6 && this.s.a === 0.5;
      const rows = []; for (let t = 0; t < Math.min(3, this.s.step); t++) { const x = r.xs[t], y = r.ys[t]; rows.push(`<tr><td>t=${t + 1}</td><td class="mono">x = ${fmt(x)} + 0.10·${fmt(x)}·(1−${fmt(x)}) − ${this.s.c}·${fmt(x)}·${fmt(y)} = <b>${fmt(r.xs[t + 1])}</b></td><td class="mono">y = ${fmt(y)} + ${this.s.a}·${fmt(x)}·${fmt(y)} − 0.08·${fmt(y)} = <b>${fmt(r.ys[t + 1])}</b></td></tr>`); }
      const W = 260, H = 130, ymax = Math.max(1, ...r.xs, ...r.ys) * 1.05;
      const lg = this.s.logi ? L.logistic() : null;
      const chart = this.s.phase
        ? `<svg viewBox="0 0 ${W} ${W * 0.7}" class="w9-svg"><rect width="${W}" height="${W * 0.7}" fill="none" stroke="#ccc"/><polyline fill="none" stroke="#164ec7" stroke-width="1.6" points="${r.xs.map((x, i) => `${((x / ymax) * W).toFixed(1)},${(W * 0.7 - (r.ys[i] / ymax) * W * 0.7).toFixed(1)}`).join(' ')}"/><text x="4" y="12" font-size="10">y（纵）对 x（横）</text></svg>`
        : `<svg viewBox="0 0 ${W} ${H}" class="w9-svg"><rect width="${W}" height="${H}" fill="none" stroke="#ccc"/>${poly(r.xs, W, H, 0, ymax, '#164ec7')}${poly(r.ys, W, H, 0, ymax, '#c0392b')}${lg ? poly(lg, W, H, 0, ymax, '#2c6a3a') : ''}<line x1="${(this.s.t / 60) * W}" x2="${(this.s.t / 60) * W}" y1="0" y2="${H}" stroke="#999" stroke-dasharray="3 3"/></svg><p class="sub"><span style="color:#164ec7">— x</span>　<span style="color:#c0392b">— y</span>${lg ? '　<span style="color:#2c6a3a">— 单变量逻辑斯蒂（对照）</span>' : ''}</p>`;
      const tank = (v, lab, color) => `<g><rect x="0" y="0" width="60" height="100" fill="none" stroke="#333"/><rect x="1" y="${100 - Math.min(1, v / ymax) * 100}" width="58" height="${Math.min(1, v / ymax) * 100}" fill="${color}" opacity=".7"/><text x="30" y="115" font-size="11" text-anchor="middle">${lab} = ${fmt(v)}</text></g>`;
      const scan = this.s.scan ? [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0].map((c) => { const q = L.diffEq({ c, a: this.s.a }); return `<tr><td>c = ${c}</td><td class="mono">x₆₀ = ${fmt(q.xs[60])}</td><td class="mono">y₆₀ = ${fmt(q.ys[60])}</td><td>${q.status}</td></tr>`; }).join('') : '';
      const cols = [
        { title: '状态与参数', why: '状态变量 x、y；变化规则两行；长期行为看 60 步。', body: `<div class="w9-formula mono"><p>x₍t+1₎ = x + r·x·(1 − x/K) − c·x·y</p><p>y₍t+1₎ = y + a·x·y − d·y</p><p>r = 0.10，K = 1，d = 0.08；x₀ = 0.5，y₀ = 0.1</p></div><label>c <input type="range" min="0.1" max="2" step="0.05" value="${this.s.c}" data-k="c"> ${this.s.c}</label><br><label>a <input type="range" min="0.1" max="1.5" step="0.05" value="${this.s.a}" data-k="a"> ${this.s.a}</label><p class="sub">这里没有史料，所有数字都是示例（扩充部分甲四）。${B.tc}</p>` },
        { title: '第一步手算', why: '前三步逐项代入。', body: `<p><button data-x="next" ${this.s.step >= 3 ? 'disabled' : ''}>下一步</button> <button data-x="clear">重来</button></p><table class="items">${rows.join('')}</table>${base && this.s.step ? '<p class="sub">与扩充部分 @tab-a4 对照：t1 (0.495, 0.117)。</p>' : ''}` },
        { title: '算 60 步', why: `结果：${r.status}。`, body: `${chart}<p><label><input type="checkbox" data-k="phase" ${this.s.phase ? 'checked' : ''}> 相平面图</label>　<label><input type="checkbox" data-k="logi" ${this.s.logi ? 'checked' : ''}> 单变量对照</label>　<label><input type="checkbox" data-k="scan" ${this.s.scan ? 'checked' : ''}> 扫描 c</label></p>${scan ? `<table class="items">${scan}</table>` : ''}<p class="mono">t10 (${fmt(r.xs[10])}, ${fmt(r.ys[10])})　t60 (${fmt(r.xs[60])}, ${fmt(r.ys[60])})</p><p>${B.calc}（浏览器实时）</p>` },
        { title: '存量—流量图', why: '两个水箱：流入、流出由规则决定。', body: `<svg viewBox="-10 -5 190 130" class="w9-svg"><g transform="translate(0,0)">${tank(r.xs[this.s.t], 'x', '#164ec7')}</g><g transform="translate(110,0)">${tank(r.ys[this.s.t], 'y', '#c0392b')}</g><text x="85" y="45" font-size="10" text-anchor="middle">c·x·y →</text></svg><label>t <input type="range" min="0" max="60" step="1" value="${this.s.t}" data-k="t"> ${this.s.t}</label><p class="sub">吕鹏、李浩 2024 的四类主体结构见 D21。</p>` },
      ];
      flow(this, cols, this.s.step ? (this.s.step >= 3 ? 2 : 1) : 0);
    }
    onClick(e) { const x = e.target.dataset.x; if (x === 'next') this.set({ step: this.s.step + 1 }); if (x === 'clear') this.set({ step: 0 }); }
    onInput(e) { const k = e.target.dataset.k; if (['c', 'a', 't'].includes(k)) this.set({ [k]: +e.target.value }); }
    onChange(e) { const k = e.target.dataset.k; if (['phase', 'logi', 'scan'].includes(k)) this.set({ [k]: e.target.checked }); }
  }
  register('dyn-lab', DynLab);

  /* ================= D20 折叠曲面 ================= */
  class CuspLab extends Lab {
    defaults() { return { u: -3, w: 0, S: Math.sqrt(3), traj: [], labels: {} }; }
    render() {
      const { u, w } = this.s, st = L.cuspState(u, w), S = this.s.S;
      const W = 260, H = 150, Smin = -2.6, Smax = 2.6, xs = Array.from({ length: 105 }, (_, i) => Smin + (i * (Smax - Smin)) / 104), vs = xs.map((s) => L.cuspV(s, u, w)), vmin = Math.min(...vs), vmax = Math.max(...vs.filter((v) => v < vmin + 12), vmin + 1);
      const X = (s) => ((s - Smin) / (Smax - Smin)) * W, Y = (v) => H - ((Math.min(v, vmax) - vmin) / (vmax - vmin)) * (H - 10) - 5;
      const curve = `<svg viewBox="0 0 ${W} ${H}" class="w9-svg"><rect width="${W}" height="${H}" fill="none" stroke="#ccc"/><polyline fill="none" stroke="#164ec7" stroke-width="2" points="${xs.map((s, i) => `${X(s).toFixed(1)},${Y(vs[i]).toFixed(1)}`).join(' ')}"/><circle cx="${X(S)}" cy="${Y(L.cuspV(S, u, w)) - 6}" r="6" fill="#c0392b"/><text x="4" y="12" font-size="10">V(S)　小球 S = ${fmt(S, 2)}</text></svg>`;
      /* 底面 (u, w) 与尖角形 */
      const P = 200, U = (uu) => ((uu + 4) / 5) * P, Wv = (ww) => P / 2 - (ww / 4) * (P / 2);
      const cusp = Array.from({ length: 41 }, (_, i) => { const uu = -4 + (i * 4) / 40; return [uu, Math.sqrt((-4 * uu ** 3) / 27)]; });
      const plane = `<svg viewBox="0 0 ${P} ${P}" class="w9-svg" data-plane style="cursor:crosshair"><rect width="${P}" height="${P}" fill="#f4f3ee" stroke="#ccc"/><polyline fill="none" stroke="#c0392b" points="${cusp.map(([uu, ww]) => `${U(uu).toFixed(1)},${Wv(ww).toFixed(1)}`).join(' ')}"/><polyline fill="none" stroke="#164ec7" points="${cusp.map(([uu, ww]) => `${U(uu).toFixed(1)},${Wv(-ww).toFixed(1)}`).join(' ')}"/><circle cx="${U(u)}" cy="${Wv(w)}" r="4" fill="#333"/>${this.s.traj.map(([uu, ww], i) => `<circle cx="${U(uu)}" cy="${Wv(ww)}" r="2.5" fill="#c9a400"/><text x="${U(uu) + 3}" y="${Wv(ww) - 3}" font-size="9">${i + 1}</text>`).join('')}<text x="4" y="12" font-size="9">底面：横 u（−4—1），纵 w（−4—4）</text></svg>`;
      const cols = [
        { title: '势函数', why: '一个洼就是一种稳定状态；两个洼：统一与分裂都可能稳定。', body: `<div class="w9-formula mono"><p>V(S) = S⁴/4 + u·S²/2 + w·S</p><p>∂V/∂S = S³ + u·S + w = 0</p></div><p class="sub">原书用 ø（无组织力量）与 ψ（一体化调节力量）；u、w 与二者怎样对应，原书只给方向、没有函数式。标准式为扩充部分补出。</p>` },
        { title: '拖动 w', why: '洼消失的一刻，小球只能跳到另一个洼。', body: `${curve}<label>w <input type="range" min="-3" max="3" step="0.05" value="${w}" data-k="w"> ${fmt(w, 2)}</label><br><label>u <input type="range" min="-4" max="1" step="0.1" value="${u}" data-k="u"> ${fmt(u, 1)}</label><p><button data-x="right">小球放回右洼</button> <button data-x="left">放回左洼</button></p><p>${B.calc}</p>` },
        { title: '边界验证', why: '判别式 4u³ + 27w² 为零时，两根合并。', body: `<p class="mono">4u³ + 27w² = ${fmt(st.D, 3)}　${st.region}</p><p class="mono">平衡点 S = ${st.roots.map((x) => fmt(x)).join('，')}</p>${st.onBoundary ? '<p class="ok"><b>在边界上</b></p>' : ''}<p class="sub">u = −3、w = 0：S = −√3、0、√3；w = 2：4·(−27) + 27·4 = 0。</p>` },
        { title: '轨线与朝代标签', why: '哪些推论来自数学，哪些来自已知结局？', body: `${plane}<p class="sub">点底面加一个轨线点（按顺序连成轨线），小球随之移动；红线：w &gt; 0 一侧的边界，蓝线：w &lt; 0 一侧。</p><p><button data-x="clrtraj">清空轨线</button></p>
            <details><summary>进阶：原书怎样把朝代放上轨线（图 11.11）</summary>
              <p class="sub">原书图 11.11"各种王朝的轨线"（2010 年版第 416 页）：纵轴 ψ，横轴 Φ，两条边界"建朝边界""动乱边界"；六条轨线从 a₁—a₆ 出发，落到动乱边界 d₁—d₆。图上只有字母，没有朝代名；朝代是在正文里按类放上去的（第 416—419 页）：</p>
              <table class="items"><tr><th>类</th><th>轨线</th><th>原书举的朝代</th></tr>
                <tr><td>长周期（盛大）王朝</td><td>a₁b₁d₁—a₄b₄d₄：再次越过建朝边界，有一段"太平盛世"</td><td>西汉、东汉、唐、明、清（农民大起义后建立）</td></tr>
                <tr><td>短周期王朝</td><td>a₅d₅、a₆d₆：一直在尖角形内</td><td>秦、晋、隋（由割据统一而来）</td></tr>
                <tr><td>后期王朝</td><td>建朝时就在 b 点一带，没有上升阶段</td><td>宋（原书称只此一例）</td></tr></table>
              <p class="sub">原书第 417 页自己说明：各王朝建朝时无组织力量的大小没有统计资料，只能举"众所周知的历史事实"来印证。</p>
              <p>把某个朝代归入哪一类，依据是什么？<select data-k="basis"><option value="">选</option>${['史料', '理论', '已知结局'].map((b) => `<option ${this.s.labels.basis === b ? 'selected' : ''}>${b}</option>`).join('')}</select></p>
              ${this.s.labels.basis ? `<p class="sub">${this.s.labels.basis === '已知结局' ? '归类用的是朝代寿命长短与建朝方式，这些正是模型要解释的结局：规则与结局没有分开。' : '可以再想：没有建朝时的统计，"无组织力量小"是从哪里知道的？多半是从"寿命长"倒推回来的。'}（扩充部分甲五，本课推论）</p>` : ''}</details>
            <p class="sub">${B.st} 原书式（11.4）纸本第 413 页印作"&gt;"，与紧接其上的文字说明方向相反；按文字说明理解（B-19）。</p>` },
      ];
      flow(this, cols, st.onBoundary ? 2 : 1);
    }
    move(u, w) { const S = L.cuspSettle(this.s.S, u, w); this.set({ u, w, S }); }
    onInput(e) { const k = e.target.dataset.k; if (k === 'w') this.move(this.s.u, +e.target.value); if (k === 'u') this.move(+e.target.value, this.s.w); }
    onChange(e) { const k = e.target.dataset.k; if (k === 'lab' || k === 'basis') this.set({ labels: { ...this.s.labels, [k === 'lab' ? 'name' : 'basis']: e.target.value } }); }
    onClick(e) {
      const pl = e.target.closest('[data-plane]');
      if (pl) { const r = pl.getBoundingClientRect(), uu = -4 + ((e.clientX - r.left) / r.width) * 5, ww = 4 - ((e.clientY - r.top) / r.height) * 8; this.s.traj = [...this.s.traj, [uu, ww]]; return this.move(Math.round(uu * 10) / 10, Math.round(ww * 20) / 20); }
      const x = e.target.dataset.x;
      if (x === 'right') this.set({ S: L.cuspSettle(2.5, this.s.u, this.s.w) }); if (x === 'left') this.set({ S: L.cuspSettle(-2.5, this.s.u, this.s.w) }); if (x === 'clrtraj') this.set({ traj: [] });
    }
  }
  register('cusp-lab', CuspLab);

  /* ================= D24 倾向作为条件（进阶） ================= */
  const TEND = {
    effective: { a: [5, 20], b: [6, 20], c: [7, 21], d: [4, 20] },
    dumb: { a: [5, 20], b: [6, 20], c: [9, 48], d: [5, 23] },
  };
  const COND4 = [['a', '基座模型，不加人设'], ['b', '提示中写明倾向'], ['c', '激活引导推向该倾向（提示不写）'], ['d', '反向引导（α 取负）']];
  class TendLab extends Lab {
    defaults() { return { sc: 'effective', judge: {}, imp: null, msg: '' }; }
    render() {
      const D = TEND[this.s.sc], cIsTend = this.s.sc === 'effective';
      const why = cIsTend ? '（c）背约 7、困惑度 21，与（b）背约 6、困惑度 20 相近：倾向可由提示设定；能力未明显下降。' : '（c）背约 9，但困惑度升到 48：变化可能来自"变笨"，无法归于倾向。';
      let impHtml = '';
      if (this.s.imp) {
        const by = {}; this.s.imp.forEach((r) => { if (r.condition !== 'steer_plus') return; const k = +r.strength; (by[k] = by[k] || []).push(r); });
        const ks = Object.keys(by).map(Number).sort((a, b) => a - b), mean = (arr, f) => arr.reduce((s, r) => s + +r[f], 0) / arr.length;
        const out = ks.map((k) => mean(by[k], 'outcome')), pp = ks.map((k) => mean(by[k], by[k][0].perplexity != null ? 'perplexity' : 'accuracy'));
        const up = (a) => a.every((v, i) => !i || v >= a[i - 1]) && a[a.length - 1] > a[0];
        const norm = (a) => { const lo = Math.min(...a), hi = Math.max(...a); return a.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0.5)); };
        impHtml = ks.length >= 2 ? `<svg viewBox="0 0 240 110" class="w9-svg"><rect width="240" height="110" fill="none" stroke="#ccc"/>${poly(norm(out), 240, 100, 0, 1, '#164ec7')}${poly(norm(pp), 240, 100, 0, 1, '#c0392b')}</svg><p class="sub"><span style="color:#164ec7">— 结果变量</span>　<span style="color:#c0392b">— 困惑度</span>（各自归一化；强度 ${ks.join('、')}）</p>${up(out) && up(pp) ? '<p class="nil"><b>两条曲线同步上升：无法区分倾向与能力下降。</b></p>' : ''}<p>${B.calc}（导入结果）</p>` : '<p class="nil">导入的 steer_plus 行不足两档强度。</p>';
      }
      const cols = [
        { title: '四组条件', why: '同一框架、同一随机种子序列；同时测能力。', body: `<p><select data-k="sc"><option value="effective" ${cIsTend ? 'selected' : ''}>示意一："倾向有效"</option><option value="dumb" ${!cIsTend ? 'selected' : ''}>示意二："只是变笨"</option></select></p><table class="items"><tr><th>组</th><th>条件</th><th>背约</th><th>困惑度</th></tr>${COND4.map(([k, t]) => `<tr><td>（${k}）</td><td>${t}</td><td class="mono">${D[k][0]}</td><td class="mono">${D[k][1]}</td></tr>`).join('')}</table><p>${B.tc} 设计据扩充部分乙三（本课设计，未运行）；（b）（c）两组数字据扩充部分，（a）（d）两组为本页补的示例。</p>${SIMPLE}` },
        { title: '读示意结果', why: '激活引导只能在本机运行的开放权重模型上做；DeepSeek、Kimi 的接口与网页版都不提供。', body: `<p class="sub">"邪恶 Qwen"复现（occcat README）：Qwen3.5-4B 上推力加到配方强度时，留出文本困惑度从约 20 升到约 49；再加大便开始胡言乱语。</p>` },
        { title: '勾选可否归于倾向', why: '（c）组的变化能归于倾向吗？', body: `<p><label><input type="radio" name="j-${this.s.sc}" data-k="judge" value="yes" ${this.s.judge[this.s.sc] === 'yes' ? 'checked' : ''}> 可归于倾向</label>　<label><input type="radio" name="j-${this.s.sc}" data-k="judge" value="no" ${this.s.judge[this.s.sc] === 'no' ? 'checked' : ''}> 不可归于倾向</label></p>${this.s.judge[this.s.sc] ? `<p class="${(this.s.judge[this.s.sc] === 'yes') === cIsTend ? 'ok' : 'nil'}">${esc(why)}</p><p class="sub">即便可归于倾向，也只说明模型内部这个方向会影响结果；它是不是史家所说的"多疑""背约"，还要看方向的来源与激活例子（甲二）。每组至少十次，报告分布。</p>` : ''}` },
        { title: '导入自己的结果', why: '列：condition、strength、run、outcome、perplexity（或 accuracy）。', body: `<label class="pack-btn small">导入 .csv / .json<input type="file" accept=".csv,.json" data-imp hidden></label><p class="${this.s.msg.startsWith('已') ? 'ok' : 'nil'}">${esc(this.s.msg)}</p>${impHtml}<p class="sub">本轮不提供本机运行脚本（教师 2026-11-10）。每组须附条件卡与引导记录（模型、层号、方向来源、强度、方法）。</p>` },
      ];
      flow(this, cols, this.s.imp ? 3 : this.s.judge[this.s.sc] ? 2 : 0);
    }
    async onChange(e) {
      const k = e.target.dataset.k;
      if (k === 'sc') return this.set({ sc: e.target.value });
      if (k === 'judge') return this.set({ judge: { ...this.s.judge, [this.s.sc]: e.target.value } });
      if (e.target.dataset.imp !== undefined && e.target.files?.[0]) {
        const f = e.target.files[0];
        try {
          const p = window.W9.parseAny(await f.text(), f.name), rows = Array.isArray(p) ? p : (p.rows || (Array.isArray(p.json) ? p.json : null));
          const objs = rows && rows.length && Array.isArray(rows[0]) ? rows.map((r) => Object.fromEntries(p.head.map((h, i) => [h, r[i]]))) : rows;
          if (!objs || !objs.length || !('condition' in objs[0]) || !('outcome' in objs[0])) throw new Error('缺 condition 或 outcome 列');
          this.set({ imp: objs, msg: `已导入 ${objs.length} 行。` });
        } catch (err) { this.set({ msg: '未导入：' + (err.message || err) }); }
      }
    }
  }
  register('tend-lab', TendLab);

  /* ================= D25 人物 × 做法 ================= */
  const MTH = ['单人模拟（时点）', '时点检查题', '诱导对照', '双人对谈', '材料分层'];
  const GRID = [
    ['梁启超', [['演示①：1899 与 1903 年同问（立场变化）', 'D01'], ['甲一梁列', 'D05'], null, ['演示④：1906 年对章', 'D13'], ['《清代学术概论》是第三层', 'D09']]],
    ['章太炎', [['演示①末问；文体为试金石', 'D01'], ['甲一章列；重订本署年', 'D05'], null, ['演示④', 'D13'], ['署年 1900、成书 1903、出版 1904', 'D09']]],
    ['井上哲次郎', [['演示②：1912 与 1918 年', 'D05'], ['甲一井上列；以 1917 年为界', 'D05'], null, null, ['逐版修书，每版都是一层', 'D09']]],
    ['福沢諭吉', [null, ['甲一福沢列', 'D05'], ['演示③：《脱亜論》三种问法', 'D07'], null, ['无署名社说与石河幹明的选编', 'D09']]],
  ];
  class MatrixLab extends Lab {
    defaults() { return { open: null, mine: [] }; }
    render() {
      const td = (cell, r, c) => cell ? `<td><button class="small ${this.s.open === r + '|' + c ? 'on' : ''}" data-cell="${r}|${c}">${esc(cell[0])}</button></td>` : '<td class="sub">—</td>';
      const open = this.s.open && (() => { const [r, c] = this.s.open.split('|').map(Number); const [person, cells] = GRID[r]; return { person, m: MTH[c], cell: cells[c] }; })();
      paint(this, `<table class="items w9-checktable"><tr><th>人物</th>${MTH.map((m) => `<th>${m}</th>`).join('')}</tr>${GRID.map(([p, cells], r) => `<tr><th>${p}</th>${cells.map((c, j) => td(c, r, j)).join('')}</tr>`).join('')}
        ${this.s.mine.map((row, i) => `<tr><th><input data-k="mine-${i}-name" value="${esc(row.name)}" size="8" placeholder="我的人物"></th>${MTH.map((_, j) => `<td><input data-k="mine-${i}-${j}" value="${esc(row.cells[j] || '')}" size="12" placeholder="这一格的难点"></td>`).join('')}</tr>`).join('')}
        <tr class="sub"><th>王珪（第七、八周）</th><td colspan="5">只作第三层材料的反例：《宋史》本传成书于身后（见 D26 史料包说明）。</td></tr></table>
        <p><button data-x="add">新增自己的一行</button>　${B.st} 表据扩充部分乙〇；"—"表示这一组合本讲没有用，可以试。</p>
        ${open ? `<div class="w9-formula"><b>${esc(open.person)} × ${esc(open.m)}</b><p>${esc(open.cell[0])}</p><p>对应页：<a href="#${open.cell[1]}" data-goto="${open.cell[1]}">${open.cell[1]}</a>（格内引用的回答在该页显示，标预存回放或待课前运行）</p></div>` : ''}
        <details class="w9-check"><summary>换人物、换做法时什么会变</summary><ol><li>时点的清晰程度：井上两版以俄国革命为界，非此即彼；梁启超逐年漂移。</li><li>文本上的年份可不可靠：章的署年与实际删改不一；福沢的社说不署名。</li><li>模型对这个人熟不熟：梁、福沢容易被"平均化"，井上的中文语料少，模型容易"编"。</li><li>语言与文体：章的古奥文体、明治文体都要懂行的人判断。</li></ol></details>`);
    }
    onClick(e) {
      const c = e.target.dataset.cell; if (c) return this.set({ open: this.s.open === c ? null : c });
      if (e.target.dataset.x === 'add') this.set({ mine: [...this.s.mine, { name: '', cells: [] }] });
      const g = e.target.dataset.goto; if (g) { e.preventDefault(); location.hash = g; }
    }
    onInput(e) { const m = (e.target.dataset.k || '').match(/^mine-(\d+)-(name|\d)$/); if (m) { const row = this.s.mine[+m[1]]; if (m[2] === 'name') row.name = e.target.value; else row.cells[+m[2]] = e.target.value; store.set(this.key, this.s); } }
  }
  register('matrix-lab', MatrixLab);

  /* ================= D26 史料包与资源 ================= */
  const RES = [
    ['TimeChara', 'https://github.com/ahnjaewoo/timechara', 'TimeChara.svg', 'MIT', '时点角色扮演的 10,895 条测试与评测脚本；英文，小说人物', '借用四类题型；看自动评分怎样做（甲一）', '', '文本'],
    ['Character-LLM', 'https://github.com/choosewhatulike/trainable-agents', 'CharacterLLM.svg', 'Apache-2.0', '以人物档案生成场景、微调角色模型的代码', '看"场景"怎样由模型生成；需 GPU', '', '文本'],
    ['BaiJia', 'https://github.com/BAI-LAB/BaiJia', '', '未见', '19,281 位唐至清历史人物的轻量语料、评测问题与履历', '查自己的人物是否在内、记了什么', '人物资料来自 CBDB、维基百科与古诗文网，CBDB 的著录偏向会原样进入', '文本'],
    ['WarAgent', 'https://github.com/agiresearch/WarAgent', 'WarAgent.svg', 'Apache-2.0', '一战、二战、战国三个情景的国家设定与模拟代码', '读设定文件，逐句标注来源（讲义 4.5）', '', '仿真框架'],
    ['Generative Agents', 'https://github.com/joonspk-research/generative_agents', 'GenerativeAgents.svg', 'Apache-2.0', '斯坦福"小镇"的代码', '看"记忆流—反思—计划"的结构', '', '仿真框架'],
    ['DeepMind Diplomacy', 'https://github.com/google-deepmind/diplomacy', 'DMDiplomacy.svg', 'Apache-2.0', 'Anthony 等 2020 年无谈判版智能体的网络与参数、测试轨迹；需自备裁判程序', '看一个学习式行动者的输入输出格式（甲八）', '只含无谈判版智能体，Kramár 等的谈判部分不在其中', '仿真框架'],
    ['AI Diplomacy', 'https://github.com/EveryInc/AI_Diplomacy', '', '非商业许可', '大模型对局的代码、撒谎检测与对局分析脚本', '读撒谎检测的做法；对照甲八', '', '仿真框架'],
    ['Gemma Scope ／ Neuronpedia', 'https://www.neuronpedia.org/gemma-2-9b-it/steer', 'NeuronpediaSteer.svg', '见各项', 'Gemma 2 的稀疏自编码器与特征说明；在线引导与读出', '演示⑤；读特征页（丙一）', '只输入通用问题，不输入本课史料', '模型内部'],
    ['qwen35-evil-neuron', 'https://github.com/occcat/qwen35-evil-neuron', '', 'MIT', '"邪恶 Qwen"配方在 Qwen3.5-4B 上的复现与扫描', '读 README 的复现表（甲二）；不建议课堂运行', 'README 收有敌意与威胁性的输出原文；只读复现表', '模型内部'],
    ['Mesa ／ Mesa-LLM', 'https://github.com/projectmesa/mesa', 'Mesa.svg', 'Apache-2.0 ／ 见文档', 'Python 多主体建模框架及其大模型扩展', '谢林模型批量扫描（丙二）', 'Mesa-LLM 仍在快速变动', '仿真框架'],
    ['Concordia', 'https://github.com/google-deepmind/concordia', 'Concordia.svg', 'Apache-2.0', '带主持人的生成式多主体仿真库', '看主持人怎样判定行动后果（乙二）', '', '仿真框架'],
    ['History LLMs', 'https://github.com/DGoettlich/history-llms', '', '未见', '时代锁定模型 Ranke-4B 的项目说明', '趋势；权重截至 2026-11-10 未见发布', '', '模型内部'],
    ['NetLogo Web', 'https://www.netlogoweb.org/', 'NetLogoWeb.svg', '网站服务', '浏览器中运行的多主体模型，模型库有隔离模型', '谢林模型（D14）', '', '仿真框架'],
  ];
  class ResLab extends Lab {
    defaults() { return { src: null, res: null, kind: '' }; }
    render() {
      const es = Mat.entries(), se = this.s.src && es.find((x) => x.id === this.s.src), rr = this.s.res != null && RES[this.s.res];
      const kinds = [...new Set(RES.map((r) => r[7]))];
      paint(this, `<div class="w9-two"><section class="w9-col"><header><b>史料包</b>（与 D09 读同一份数据）</header>
          <table class="items"><tr><th>材料</th><th>层</th><th>成文</th><th>送模型</th></tr>${es.map((x) => `<tr class="${x.sendable === false ? 'sub' : ''}"><td><button class="small" data-src="${esc(x.id)}">${esc(x.person || '')}·${esc(x.title)}</button></td><td>${x.layer}</td><td>${esc(x.written_date || '—')}</td><td>${x.sendable === false ? '否' : '可'}</td></tr>`).join('')}</table>
          ${se ? `<div class="w9-formula"><b>${esc(se.title)}</b><p class="sub">${esc(se.citation || '')}${se.page ? '｜' + esc(se.page.value || '') : ''}</p>${se.sendable === false ? `<p class="nil">不可送模型：只显示页码。${esc(se.sendable_basis || '')}</p>` : se.text ? `<p>${esc(se.text.slice(0, 220))}${se.text.length > 220 ? '…' : ''}</p>` : '<p class="sub">公共材料包只含书目；原文片段在本机材料包中。</p>'}</div>` : ''}</section>
        <section class="w9-col"><header><b>可供练习的资源</b>（读取日期 2026-11-10）</header><p>${['', ...kinds].map((k) => `<button class="small ${this.s.kind === k ? 'on' : ''}" data-kind="${k}">${k || '全部'}</button>`).join(' ')}</p>
          <table class="items"><tr><th>名称</th><th>许可</th><th>适合做什么</th></tr>${RES.map((r, i) => (!this.s.kind || r[7] === this.s.kind) ? `<tr><td><button class="small" data-res="${i}">${esc(r[0])}</button></td><td>${esc(r[3])}</td><td>${esc(r[5])}</td></tr>` : '').join('')}</table>
          ${rr ? `<div class="w9-formula"><b>${esc(rr[0])}</b><p>${esc(rr[4])}</p><p><a href="${esc(rr[1])}" target="_blank" rel="noopener">${esc(rr[1])}</a>（外链，新窗口）</p>${rr[2] ? `<img class="w9-qr" src="assets/qr/${esc(rr[2])}" alt="${esc(rr[0])} 二维码">` : ''}${rr[6] ? `<p class="nil small">注意：${esc(rr[6])}</p>` : ''}<p class="sub">许可与最近更新日期以仓库页面为准。</p></div>` : ''}</section></div>
        <p>${B.st} 表据扩充部分丁一、丁二与讲义附录"工具与资源"。三类资源分别检验人物模拟（文本）、模型条件（模型内部）与仿真框架。</p>`);
    }
    onClick(e) { const t = e.target.dataset; if (t.src) this.set({ src: t.src }); if (t.res) this.set({ res: +t.res }); if (t.kind !== undefined) this.set({ kind: t.kind }); }
  }
  register('res-lab', ResLab);
})();
