/* 第十周页面组件（一）：D00、D01、D03、D04｜候选，未经教师确认｜2026-11-16（第一批） */
(() => {
  'use strict';
  const { esc, store, register } = window.Deck;
  const W = window.W10, { L, Mat, Through, card, answerCell, cellClick, cardBox, sourceBox, needPack, toSheet } = W;
  const S = window.W10_STATIC;
  const fmt = (x, d = 3) => (x == null || Number.isNaN(x) ? '—' : String(Math.round(x * 10 ** d) / 10 ** d));
  const pct = (x) => (x == null ? '—' : Math.round(x * 100) + '%');

  /* 组件基类：页内状态存在贯穿记录的 page_state 里（随记录导出、恢复）；监听材料、记录、模型三类事件后重绘 */
  class Lab extends HTMLElement {
    connectedCallback() {
      this.pid = this.closest('deck-slide')?.getAttribute('slide-id') || this.tagName;
      this.classList.add('w9-lab');
      ['w10-materials', 'w10-through', 'w10-model'].forEach((n) => document.addEventListener(n, () => this.isConnected && !this._busy && this.render()));
      this.addEventListener('click', async (e) => { if (await cellClick(e, this)) return; const sh = e.target.closest('[data-sheet]'); if (sh && this.sheetRow) { toSheet(this.sheetRow(sh.dataset.sheet)); return; } this.onClick && this.onClick(e); });
      this.addEventListener('change', (e) => this.onChange && this.onChange(e));
      this.addEventListener('input', (e) => this.onInput && this.onInput(e));
      this.render();
    }
    get s() { const ps = Through.pageState(this.pid); for (const [k, v] of Object.entries(this.defaults())) if (!(k in ps)) ps[k] = v; return ps; }
    defaults() { return {}; }
    set(patch, { redraw = true } = {}) { Object.assign(this.s, patch); this._busy = !redraw; Through.save(); this._busy = false; if (redraw) this.render(); }
    page() { return window.Deck.pageById(this.pid); }
    out(html) { W.render(this, html); }
  }
  W.Lab = Lab;
  const sendBtn = (k, label = '送入对照单') => `<button class="small" data-sheet="${esc(k)}">${label}</button>`;
  W.sendBtn = sendBtn;
  /* 高亮：把若干词标出（只作显示） */
  function marked(text, groups) {
    let h = esc(text);
    for (const [cls, words] of groups) for (const w of words) if (w) h = h.split(esc(w)).join(`<mark class="${cls}">${esc(w)}</mark>`);
    return h;
  }
  W.marked = marked;

  /* ================= D00 封面 ================= */
  /* 照第三至九周的封面：问题、一句引子、四个动作、运行性质图例。材料说明与导入办法在顶栏"材料说明"里 */
  class Cover10 extends Lab {
    get noShell() { return true; }
    render() {
      const T = Through.get();
      const acts = S.fourActions.map(([a, p]) => [a, p]);
      const counts = { D02: 0, D04: T.claims.length, D08: T.effects.length, D14: T.namechecks.length };
      this.out(`<div class="hero-lab w9-hero"><div><p class="hero-title">模型替我们读过的东西，哪些可以直接用，哪些必须回到原文？</p>
        <p class="hero-lead">胡适说："${esc(S.hushi.text)}"有了替我们读书的模型，这句话也要说给读的人听。</p></div>
        <div class="hero-claim"><small>本讲的四个动作（核对结果汇到阅读对照单 D15）</small>
          <div class="hero-path">${acts.map(([a, p]) => `<a href="#${p}"><b>${esc(a)}</b> <small>${p}</small><span class="dot ${counts[p] ? 'on' : ''}"></span></a>`).join('')}</div>
          <p class="w9-hero-line">页面上每一处结果都标明来历：</p>
          <ul class="w9-legend">
            <li><span class="w9-badge calc">实际计算</span>页面内现场算出</li>
            <li><span class="w9-badge live">实际调用</span>此刻经接口调用模型，附时间</li>
            <li><span class="w9-badge replay">预存回放</span>课前真实运行的保存结果，非史料</li>
            <li><span class="w9-badge web-paste">网页版粘贴</span>教师在网页版运行后录入，附界面型号与截图</li>
            <li><span class="w9-badge teaching-construct">教学构造</span>人工示意，规则简化或数字为示例</li></ul>
          <p class="w9-hero-status">材料、导入与模型接入见顶栏"材料说明"。</p></div></div>`);
    }
  }
  register('hero-cover10', Cover10);

  /* ================= D01 几分证据（演示①） ================= */
  const R = S.demo1Rules;
  function hits(text) {
    const has = (ws) => ws.filter((w) => text.includes(w));
    return { cause: has(R.cause), aggravate: has(R.aggravate), credit: has(R.credit) };
  }
  class Demo1 extends Lab {
    defaults() { return { web: false, showKey: false, circles: {} }; }
    replyBody(run) {
      const circ = this.s.circles[run.run_id] || [], h = hits(run.reply);
      const words = L.splitSentences(run.reply).map((s, i) => `<span class="sent ${circ.includes(i) ? 'circled' : ''}" data-circle="${esc(run.run_id)}" data-i="${i}">${marked(s, [['cause', R.cause], ['agg', R.aggravate], ['credit', R.credit]])}</span>`).join('');
      return `<div class="w9-reply w10-circle">${words}</div><p class="sub">页面规则（实际计算）：因果词 ${h.cause.length ? h.cause.map(esc).join('、') : '无'}｜"加剧"类 ${h.aggravate.length ? h.aggravate.map(esc).join('、') : '无'}｜提到黄彰健：${h.credit.length ? '是' : '<b>否</b>'}　<span class="sub">（圈 ${circ.length} 句）</span></p>`;
    }
    render() {
      const presets = ['deepseek', 'kimi', ...(this.s.web ? ['gemini', 'chatgpt'] : [])];
      const col = (cid, label) => `<section class="w9-col"><header><b>${esc(label)}</b></header>${cardBox(cid)}${presets.map((p) => answerCell(cid, p, { body: (r) => this.replyBody(r) }).html).join('')}</section>`;
      // 全班（本浏览器）圈出的句子中，各类词出现的次数
      const all = Object.entries(this.s.circles).flatMap(([rid, idx]) => { const run = Through.get().runs.concat(Mat.replays()).find((r) => r.run_id === rid); return run ? L.splitSentences(run.reply).filter((_, i) => idx.includes(i)) : []; });
      const freq = {}; for (const s of all) for (const w of [...R.cause, ...R.aggravate]) if (s.includes(w)) freq[w] = (freq[w] || 0) + 1;
      this.out(`<p class="w10-hushi">"${esc(S.hushi.text)}"<span class="sub">　${esc(S.hushi.source)}</span></p>
        <div class="w9-toolbar"><b>问题："茅海建怎样看袁世凯告密与戊戌政变的关系？"</b>　<label><input type="checkbox" data-o="web" ${this.s.web ? 'checked' : ''}> 显示网页版两家</label>　<span class="sub">点句子即"圈出"（每段圈一句）；再点取消。</span></div>
        <div class="w9-two">${col('D1A', 'D1A 不给材料')}${col('D1B', 'D1B 给学术史与结论两节')}</div>
        <div class="w10-sum"><b>圈出的句子（本浏览器）</b>：${all.length} 句；其中含 ${Object.entries(freq).map(([w, n]) => `"${esc(w)}" ${n}`).join('、') || '—'}。全班汇总：课上教师按举手数口头统计（教师 2026-11-16）。 ${all.length ? W.sendBtn('circles', '把圈出的句子送入对照单') : ''}</div>
        <details class="w9-check" ${this.s.showKey ? 'open' : ''}><summary>看完之后对照的三处（讲义导入；课上讲完再开）</summary><ol>${S.demo1Points.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>${sourceBox('mao-conclusion', { highlight: ['大大加剧了政变的激烈程度', '黄'] })}</details>
        <p class="sub">追问"学界对此有共识吗"、三次采样之间的差别：进阶，见各格的采样切换；追问条件不预存（教师 2026-11-16），可现场调用时自行提问。</p>`);
    }
    sheetRow() { return null; }
    onClick(e) {
      const c = e.target.closest('[data-circle]');
      if (c) { const id = c.dataset.circle, i = +c.dataset.i, cur = new Set(this.s.circles[id] || []); cur.has(i) ? cur.delete(i) : cur.add(i); this.set({ circles: { ...this.s.circles, [id]: [...cur] } }); return; }
      if (e.target.closest('[data-sheet="circles"]')) {
        e.stopPropagation();
        for (const [rid, idx] of Object.entries(this.s.circles)) { const run = Through.get().runs.concat(Mat.replays()).find((r) => r.run_id === rid); if (!run) continue; L.splitSentences(run.reply).forEach((s, i) => { if (idx.includes(i)) toSheet({ from_page: 'D01', run_id: rid, model_says: s, verdict: '过度概括' }); }); }
      }
    }
    onChange(e) { const o = e.target.dataset.o; if (o) this.set({ [o]: e.target.checked }); }
  }
  // D01 的"送入"按钮由 onClick 处理（一次送多行），基类的 data-sheet 不处理
  Demo1.prototype.sheetRow = null;
  register('demo1-lab', Demo1);

  /* ================= D03 摘要会丢什么 ================= */
  const TYPES = ['遗漏', '说满', '归属', '无问题'];
  class Three extends Lab {
    defaults() { return { preset: 'deepseek', labels: {}, ref: {}, reveal: false }; }
    render() {
      const { run } = W.pickedRun('D1B', this.s.preset);
      const sents = run ? L.splitSentences(run.reply).slice(0, 12) : [];
      const lab = this.s.labels[run?.run_id] || {}, mine = this.s.ref[run?.run_id] || {};
      // 本课判定：教师认可的参考判定（本机材料包 refs.D03，句首对得上才用）；教师在页上改过的以页上为准
      const R = W.Mat.state().refs?.D03, rr = (run && R?.runs?.[run.run_id]) || {};
      const given = Object.fromEntries(sents.map((x, i) => [i, rr[i] && x.startsWith(rr[i].head) ? rr[i] : null]));
      const ref = Object.fromEntries(sents.map((_, i) => [i, mine[i] || given[i]?.type || ''])).valueOf();
      for (const k of Object.keys(ref)) if (!ref[k]) delete ref[k];
      const dist = Object.fromEntries(TYPES.map((t) => [t, Object.values(lab).filter((x) => x === t).length]));
      const cards = S.three.map((t) => `<div class="w10-tcard"><b>${esc(t.label || t.id)}</b><p>${esc(t.show)}</p><p class="sub">史学论著中的例子：${esc(t.eg)}</p><p class="sub">怎样查：${esc(t.how)}</p></div>`).join('');
      this.out(`<div class="w10-tcards">${cards}</div><p class="sub">${esc(S.threeSource)}</p>
        <div class="w9-toolbar"><b>从演示① D1B（给材料）的回答抽句定类</b>　<label>模型 <select data-o="preset">${['deepseek', 'kimi', 'gemini', 'chatgpt'].map((p) => `<option value="${p}" ${p === this.s.preset ? 'selected' : ''}>${esc(W.PRESET_LABEL[p])}</option>`).join('')}</select></label> ${W.badge(run)}</div>
        ${run ? `<table class="items"><tr><th>#</th><th>句子</th><th>学生定类</th><th>本课判定${R ? '' : '（教师填）'}</th><th></th></tr>${sents.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s)}</td><td>${TYPES.map((t) => `<label class="nowrap"><input type="radio" name="t-${i}" data-lab="${i}" value="${t}" ${lab[i] === t ? 'checked' : ''}>${t}</label>`).join(' ')}</td><td>${this.s.reveal || !R ? `<select data-ref="${i}"><option value=""></option>${TYPES.map((t) => `<option ${ref[i] === t ? 'selected' : ''}>${t}</option>`).join('')}</select>${given[i] && !mine[i] ? `<div class="sub">${esc(given[i].why)}</div>` : mine[i] ? '<div class="sub">（页上改过）</div>' : ''}` : '<span class="sub">先自己定类</span>'}</td><td>${lab[i] && lab[i] !== '无问题' ? W.sendBtn(String(i)) : ''}</td></tr>`).join('')}</table>
          <p class="w10-sum"><b>分布（本浏览器）</b>：${TYPES.map((t) => `${t} ${dist[t]}`).join('；')}。${R ? `<label><input type="checkbox" data-o="reveal" ${this.s.reveal ? 'checked' : ''}> 显示本课判定</label>　` : ''}${Object.keys(ref).length && (this.s.reveal || !R) ? `与本课判定一致 ${Object.keys(ref).filter((i) => ref[i] && ref[i] === lab[i]).length}／${Object.keys(ref).filter((i) => ref[i]).length}` : R ? '' : '本课判定未载入（在本机材料包里）。'}</p>
          ${R && this.s.reveal ? `<div class="w10-tcard"><b>整份回答看"遗漏"</b>（不在单句上判）<ul>${R.whole.map((w) => `<li>${esc(w)}</li>`).join('')}</ul><p class="sub">${esc(R.judge)}；${esc(R.note)}。</p></div>` : ''}` : '<p class="w10-pending">待课前运行：D1B 尚无记录。抽句定类在课前记录生成后可用；这里不放构造的句子。</p>'}
        <details><summary>进阶：三项研究的数字与条件</summary><ul><li>Kim 等 2024（FABLES）：26 部当时新出版的英文小说，3,158 条说法；摘要过分侧重书末；让另一个模型检查摘要，与读过全书的人相差很远。</li><li>Peters 与 Chin-Yee 2025：十个模型、4,900 份科学论文摘要；DeepSeek、ChatGPT-4o 与 LLaMA 3.3 70B 有过度概括的占 26% 到 73%。</li><li>Hagar 等 2025：ChatGPT、Gemini、NotebookLM 回答 300 份文件的问题；约三成回答至少一处不符；NotebookLM 约 13%，另两个约 40%。</li></ul><p class="sub">三项研究的材料都不是史学论著（讲义 1.2 出处注）。</p></details>`);
    }
    sheetRow(i) { const { run } = W.pickedRun('D1B', this.s.preset), s = L.splitSentences(run.reply)[+i], t = (this.s.labels[run.run_id] || {})[+i]; return { from_page: 'D03', run_id: run.run_id, model_says: s, verdict: { 遗漏: '遗漏', 说满: '过度概括', 归属: '归属错误' }[t] || null }; }
    onChange(e) {
      const t = e.target, { run } = W.pickedRun('D1B', this.s.preset);
      if (t.dataset.o) this.set({ [t.dataset.o]: t.type === 'checkbox' ? t.checked : t.value });
      if (t.dataset.lab && run) this.set({ labels: { ...this.s.labels, [run.run_id]: { ...(this.s.labels[run.run_id] || {}), [t.dataset.lab]: t.value } } });
      if (t.dataset.ref && run) this.set({ ref: { ...this.s.ref, [run.run_id]: { ...(this.s.ref[run.run_id] || {}), [t.dataset.ref]: t.value } } });
    }
  }
  register('three-lab', Three);

  /* ================= D04 拆成可核的话 ================= */
  const SOURCES = [['mao', '茅文结论一节＋学术史一节（中文，有页码）', ['mao-conclusion', 'mao-history']], ['ems-a', '埃姆斯原电（德文，按词切分）', ['ems-a']], ['chokugo', '勅語成文（旧字形）', ['chokugo-seibun']]];
  const VERD = ['有据', '无据', '说宽'];
  class Claims extends Lab {
    defaults() { return { src: 'mao', threshold: null, preset: 'deepseek', demo: false, claims: Array.from({ length: 5 }, () => ({ text: '', verdict: null, quote: '' })), points: Array.from({ length: 3 }, () => ({ text: '', in: null })) }; }
    srcText() { const s = SOURCES.find((x) => x[0] === this.s.src); return s[2].map((id) => Mat.text(id)).filter(Boolean).join('\n'); }
    render() {
      const s = this.s, src = this.srcText(), srcMissing = !src;
      const opts = s.threshold == null ? {} : { threshold: s.threshold };
      const checks = s.claims.map((c) => (c.quote && src ? L.quoteCheck(c.quote, src, opts) : null));
      const fs = L.factScore(s.claims.map((c) => ({ verdict: c.verdict }))), pr = L.pointRecall(s.points.map((p) => ({ in_summary: p.in })));
      const { run } = W.pickedRun('D1B', s.preset);
      const qcell = (r, c) => {
        if (!c.quote) return '<span class="sub">（贴一句原文）</span>';
        if (!r) return srcMissing ? '<span class="nil">原文未载入</span>' : '';
        const q = r.quoteUnits.map((u, i) => (r.segments.some((sg) => i >= sg.q[0] && i < sg.q[1]) ? esc(u) : `<mark class="miss">${esc(u)}</mark>`)).join('');
        return `<span class="w10-qc ${r.status}">${esc(L.QUOTE_STATUS_ZH[r.status])}</span> 覆盖率 ${fmt(r.coverage)}（${r.m}/${r.n}）${r.pages.length ? `｜第 ${r.pages.map(esc).join('、')} 页` : ''}<br><span class="w10-qtext">${q}</span>${r.missed.length ? `<br><span class="sub">未核上：${r.missed.map((m) => esc(m.text)).join('、')}</span>` : ''}`;
      };
      const thr = s.threshold ?? (checks.find(Boolean)?.threshold ?? 0.8);
      this.out(`<div class="w9-toolbar"><b>拆分对象：演示① D1B 的回答</b>　<label>模型 <select data-o="preset">${['deepseek', 'kimi', 'gemini', 'chatgpt'].map((p) => `<option value="${p}" ${p === s.preset ? 'selected' : ''}>${esc(W.PRESET_LABEL[p])}</option>`).join('')}</select></label> ${W.badge(run)}
          　<label>核对用的原文 <select data-o="src">${SOURCES.map(([k, n]) => `<option value="${k}" ${k === s.src ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
          　<label>门槛 <input type="range" min="0.5" max="1" step="0.01" data-thr value="${thr}"> ${fmt(thr, 2)}</label> ${s.threshold != null ? '<button class="small" data-x="thr0">恢复默认</button>' : '<span class="sub">（默认：0.8；中日文与西文夹杂 0.65）</span>'}</div>
        ${run ? `<details><summary>D1B 回答全文</summary><div class="w9-reply">${esc(run.reply)}</div></details>` : '<p class="w10-pending">D1B 待课前运行。没有记录时，可以把任何一段回答拆成主张来练习。</p>'}
        ${srcMissing ? needPack('茅海建 2002 两节') : ''}
        <table class="items w10-claims"><tr><th>#</th><th>原子主张</th><th>标记</th><th>所贴原文</th><th>① 引文在不在（程序）</th><th>② 概括对不对（自己判断）</th><th></th></tr>
        ${s.claims.map((c, i) => `<tr><td>${i + 1}</td><td><textarea data-c="${i}" data-f="text" rows="2">${esc(c.text)}</textarea></td><td>${VERD.map((v) => `<label class="nowrap"><input type="radio" name="v-${i}" data-c="${i}" data-f="verdict" value="${v}" ${c.verdict === v ? 'checked' : ''}>${v}</label>`).join('<br>')}</td><td><textarea data-c="${i}" data-f="quote" rows="2">${esc(c.quote)}</textarea></td><td class="w10-qcell">${qcell(checks[i], c)}</td><td class="sub">${c.verdict ? esc(c.verdict) + '（学生判断，程序不判）' : ''}</td><td>${c.text ? W.sendBtn('c' + i) : ''}</td></tr>`).join('')}</table>
        <p><button class="small" data-x="addc">加一条</button>　${this.demoHtml(run, src, opts, fs, pr) ? `<label><input type="checkbox" data-o="demo" ${s.demo ? 'checked' : ''}> 显示 Claude 示范版（预存，供对照）</label>` : ''}</p>
        ${s.demo ? this.demoHtml(run, src, opts, fs, pr) || '' : ''}
        <div class="w9-two"><section class="w9-col"><header><b>FActScore</b></header><p class="w9-formula">FActScore ＝ 被支持的条数 ／ 全部条数 ＝ ${fs.supported} ／ ${fs.total} ＝ <b>${fmt(fs.score)}</b></p><p class="sub">"说宽""无据"都不算被支持；未标的不计。它只看说了的话，查不到遗漏。</p></section>
        <section class="w9-col"><header><b>反方向：原文要点 → 摘要（要点召回）</b></header><p class="sub">先写茅文结论最要紧的三点，再勾摘要里有没有。这一步只能由读过原文的人做。</p>
          ${s.points.map((p, i) => `<p><input data-p="${i}" data-f="text" value="${esc(p.text)}" size="34" placeholder="要点 ${i + 1}"> ${[['yes', '有'], ['partial', '部分'], ['no', '无']].map(([v, l]) => `<label><input type="radio" name="p-${i}" data-p="${i}" data-f="in" value="${v}" ${p.in === v ? 'checked' : ''}>${l}</label>`).join(' ')} ${p.text && p.in === 'no' ? W.sendBtn('p' + i, '送入（遗漏）') : ''}</p>`).join('')}
          <p class="w9-formula">要点召回 ＝ ${pr.hit} ／ ${pr.K} ＝ <b>${fmt(pr.recall)}</b><span class="sub">（"部分"不计，共 ${pr.partial} 条）</span></p></section></div>
        <details><summary>进阶：门槛、MiniCheck、"引文核得上、归属错了"</summary>
          <p>试一试：在任一行贴"虽未因袁世凯告密而发生，但大大导致了政变的激烈程度"。覆盖率约 0.83，仍过 0.8 的门槛，状态是"近似"，没核上的"大大导致"四字标红：允许拼接、允许不到 1 的宽松规则，恰好会放过一个关键动词的改动。把门槛拖到 0.9，它就变成"未核实"。</p>
          <p>归属：贴茅文"最初由黄彰健先生 1970 年著作提出"一句，引文能核上；可如果主张写的是"茅海建首先提出"，引文核上了，归属却错了。程序只做第一栏。</p>
          <p>MiniCheck（Tang 等 2024）用一个小模型判断"这句话能否由这段原文支持"；页面不运行模型。<button class="small" data-x="minicheck">导出主张表（JSON）</button> <span class="sub">MiniCheck 的输入格式待据其 README 核定，这里只导出主张与所贴原文。</span></p>
          <p class="sub">本页的引文核对按 llm-for-zotero 的思路实现（扩充部分甲二），不是它的移植：统一写法后，中日文按字、西文按词，找引文在原文中的连续片段（至少 3 字或 2 词），覆盖率达到门槛算"近似"，等于 1 算"核实"。</p></details>`);
    }
    // Claude 示范版：本机材料包 refs.D04（按 run_id 取）；引文核对现场计算，判定是 Claude 的
    demoHtml(run, src, opts, fs, pr) {
      const R = W.Mat.state().refs?.D04, d = run && R?.runs?.[run.run_id]; if (!d) return null;
      const rows = d.claims.map((c, i) => { const r = src ? L.quoteCheck(c.quote, src, opts) : null; return `<tr><td>${i + 1}</td><td>${esc(c.text)}</td><td><b>${esc(c.verdict)}</b></td><td>${esc(c.quote)}</td><td>${r ? `<span class="w10-qc ${r.status}">${esc(L.QUOTE_STATUS_ZH[r.status])}</span> ${fmt(r.coverage)}${r.pages.length ? `｜第 ${r.pages.map(esc).join('、')} 页` : ''}` : '<span class="nil">原文未载入</span>'}</td><td class="sub">${esc(c.why)}</td></tr>`; }).join('');
      const dfs = L.factScore(d.claims.map((c) => ({ verdict: c.verdict }))), dpr = L.pointRecall(d.points.map((p) => ({ in_summary: p.in })));
      const IN = { yes: '有', partial: '部分', no: '无' };
      return `<div class="w10-tcard"><b>Claude 示范版</b> <span class="w9-badge replay">预存</span>　<span class="sub">${esc(R.judge)}。${esc(R.note)}。</span>
        <table class="items w10-claims"><tr><th>#</th><th>原子主张</th><th>标记</th><th>所贴原文</th><th>① 引文在不在（程序，现场算）</th><th>理由</th></tr>${rows}</table>
        <p><b>原文要点 → 摘要</b>：${R.points.map((p, i) => `${i + 1}. ${esc(p)}：<b>${IN[d.points[i].in]}</b>${d.points[i].why ? `（${esc(d.points[i].why)}）` : ''}`).join('<br>')}</p>
        <p class="w9-formula">示范版 FActScore ＝ ${dfs.supported} ／ ${dfs.total} ＝ <b>${fmt(dfs.score)}</b>；要点召回 ＝ ${dpr.hit} ／ ${dpr.K} ＝ <b>${fmt(dpr.recall)}</b>${fs.total ? `　｜　上表（课堂版）FActScore ${fmt(fs.score)}，要点召回 ${fmt(pr.recall)}` : ''}</p>
        <p class="sub">对照时看三处：拆出的主张是不是同几句；同一句是否判得一样（尤其"无据"与"说宽"的分界）；要点召回里"一无所获"那一点有没有人勾"有"。示范版只是一种拆法，不是标准答案。</p></div>`;
    }
    sheetRow(k) {
      if (k[0] === 'p') { const p = this.s.points[+k.slice(1)]; return { from_page: 'D04', point: p.text, verdict: '遗漏', model_says: null }; }
      const c = this.s.claims[+k.slice(1)], r = c.quote ? L.quoteCheck(c.quote, this.srcText()) : null, { run } = W.pickedRun('D1B', this.s.preset);
      return { from_page: 'D04', run_id: run?.run_id || null, model_says: c.text, source_ref: { quote: c.quote || null, page: r?.pages?.join('、') || null, page_system: '原刊页', quote_check: r ? { coverage: r.coverage, status: r.status } : null }, verdict: L.verdictToSheet(c.verdict) };
    }
    onInput(e) { const t = e.target; if (t.dataset.thr !== undefined) this.set({ threshold: +t.value }); }
    onChange(e) {
      const t = e.target;
      if (t.dataset.o) return this.set({ [t.dataset.o]: t.type === 'checkbox' ? t.checked : t.value });
      if (t.dataset.c != null) { const cl = this.s.claims.map((x) => ({ ...x })); cl[+t.dataset.c][t.dataset.f] = t.value; Through.patch; this.set({ claims: cl }); Through.get().claims = cl.map((c, i) => ({ claim_id: 'D04-' + i, run_id: W.pickedRun('D1B', this.s.preset).run?.run_id || null, claim_text: c.text, verdict: c.verdict, evidence_quote: c.quote })); Through.save(); }
      if (t.dataset.p != null) { const ps = this.s.points.map((x) => ({ ...x })); ps[+t.dataset.p][t.dataset.f] = t.value; this.set({ points: ps }); }
    }
    onClick(e) {
      const x = e.target.dataset.x;
      if (x === 'addc') this.set({ claims: [...this.s.claims, { text: '', verdict: null, quote: '' }] });
      if (x === 'thr0') this.set({ threshold: null });
      if (x === 'minicheck') window.Deck.download('w10-claims-minicheck.json', JSON.stringify(this.s.claims.filter((c) => c.text).map((c) => ({ claim: c.text, document: c.quote })), null, 1), 'application/json');
    }
  }
  register('claims-lab', Claims);
})();
