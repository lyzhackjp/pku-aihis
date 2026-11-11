/* 第九周页面组件（一）：D00、D01、D05、D07、D08、D09｜候选，未经教师确认｜2026-11-11 */
(() => {
  'use strict';
  const { esc, store, rerender, register } = window.Deck;
  const { L, Mat, Through, Model, badge, gateList, sourceBox, modelPanel } = window.W9;
  const CARDS = window.W9_CARDS;
  const card = (id) => CARDS.find((c) => c.id === id);
  const fmt = (x, d = 3) => (x == null ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toString());
  const PRESETS = [['deepseek', 'DeepSeek（接口）'], ['kimi', 'Kimi（接口）'], ['gemini-web', 'Gemini（网页版）'], ['chatgpt-web', 'ChatGPT（网页版）']];
  const isWeb = (p) => p.endsWith('-web');

  /* 组件基类：状态存本页键下；监听材料、记录、模型三类事件后重绘 */
  class Lab extends HTMLElement {
    connectedCallback() {
      this.key = 'page/' + (this.closest('deck-slide')?.getAttribute('slide-id') || this.tagName);
      this.s = Object.assign(this.defaults(), store.get(this.key, {}));
      ['w9-materials', 'w9-through', 'w9-model'].forEach((n) => document.addEventListener(n, () => this.isConnected && this.render()));
      this.addEventListener('click', (e) => this.onClick && this.onClick(e));
      this.addEventListener('change', (e) => this.onChange && this.onChange(e));
      this.addEventListener('input', (e) => this.onInput && this.onInput(e));
      this.render();
    }
    defaults() { return {}; }
    set(patch) { Object.assign(this.s, patch); store.set(this.key, this.s); this.render(); }
    page() { return window.Deck.pageById(this.key.slice(5)); }
  }
  window.W9.Lab = Lab;

  /* ---------- 回答格：一张卡 × 一个服务 ---------- */
  const busy = new Set();
  function latestRun(cardId, preset) {
    const rs = Through.get().runs.filter((r) => r.card_id === cardId && r.preset === preset && !r.error);
    if (rs.length) return { kind: rs[rs.length - 1].mode, run: rs[rs.length - 1] };
    const rp = Mat.replays({ card_id: cardId, preset });
    return rp.length ? { kind: 'replay', run: rp[0] } : { kind: 'none', run: null };
  }
  function sentencesHtml(run, { circle = false } = {}) {
    if (!run || !run.reply) return '';
    const marks = Through.labelsFor(run.run_id);
    return `<div class="w9-reply">${L.splitSentences(run.reply).map((s, i) => { const m = marks.find((x) => x.sentence_index === i); return `<span class="sent ${m?.circled ? 'circled' : ''}" ${circle ? `data-circle="${esc(run.run_id)}" data-i="${i}"` : ''}>${esc(s)}</span>`; }).join('')}</div>`;
  }
  function answerCell(cardId, preset, { circle = true, note = '' } = {}) {
    const k = cardId + '|' + preset, st = latestRun(cardId, preset), err = AnswerErr.get(k);
    const runBtn = isWeb(preset) ? `<button class="small" data-paste="${esc(k)}">粘贴网页版回答</button>`
      : `<button class="small" data-run="${esc(k)}" ${busy.has(k) ? 'disabled' : ''}>${busy.has(k) ? '运行中…' : (Model.state().mode === 'live' ? '现场调用' : '取预存回放')}</button>`;
    return `<div class="w9-cell"><div class="w9-cell-head">${badge(st.run, st.kind)} ${runBtn}</div>${err ? `<p class="nil small">${esc(err)}</p>` : ''}${note}${sentencesHtml(st.run, { circle })}</div>`;
  }
  const AnswerErr = new Map();
  async function handleCellClick(e, host) {
    const c = e.target.closest('[data-circle]');
    if (c) { const id = c.dataset.circle, i = +c.dataset.i, cur = Through.labelsFor(id).find((x) => x.sentence_index === i); Through.setLabel(id, i, c.textContent, { circled: !(cur && cur.circled) }); return true; }
    const r = e.target.closest('[data-run]');
    if (r) {
      const [cid, preset] = r.dataset.run.split('|'); const k = r.dataset.run; busy.add(k); host.render();
      try { const out = await Model.run(card(cid), preset); AnswerErr.set(k, out.error || ''); if (out.kind === 'replay' && out.run && !Through.get().runs.some((x) => x.run_id === out.run.run_id)) Through.add('runs', out.run, 'run_id'); }
      catch (err) { AnswerErr.set(k, String(err.message || err)); }
      busy.delete(k); host.render(); return true;
    }
    const p = e.target.closest('[data-paste]');
    if (p) { pasteDialog(p.dataset.paste); return true; }
    return false;
  }
  function pasteDialog(k) {
    const [cid, preset] = k.split('|'); const c = card(cid);
    const shade = document.createElement('div'); shade.className = 'model-shade';
    shade.innerHTML = `<div class="model-panel"><header><b>粘贴网页版回答：${esc(c.label)}｜${esc(preset.replace('-web', ''))}</b><button data-x="close">关闭</button></header>
      <p class="sub">按扩充部分丙三逐项记录。提示请照条件卡原样发出：</p><pre class="srcbox">${esc(c.system_prompt)}\n\n${esc(c.user_prompt)}</pre>
      <p><label>入口 <select data-f="entry_type"><option>Gem</option><option>自定义 GPT</option><option>普通对话</option></select></label>
      <label>记忆 <select data-f="memory"><option>已关闭</option><option>开启</option><option>不详</option></select></label>
      <label>联网 <select data-f="search"><option>已关闭</option><option>开启</option><option>不详</option></select></label></p>
      <p><label>界面显示的型号 <input data-f="model_shown" size="20"></label> <label>截图文件名 <input data-f="screenshot" size="22"></label></p>
      <textarea data-f="reply" rows="8" style="width:100%" placeholder="粘贴回答全文"></textarea>
      <p><button data-x="save">存为"网页版粘贴"记录</button> <span class="nil" data-msg></span></p></div>`;
    shade.addEventListener('click', (e) => {
      if (e.target.dataset.x === 'close' || e.target === shade) shade.remove();
      if (e.target.dataset.x === 'save') {
        const v = (f) => shade.querySelector(`[data-f="${f}"]`).value.trim();
        if (!v('reply') || !v('model_shown')) { shade.querySelector('[data-msg]').textContent = '回答与界面型号必填。'; return; }
        Through.add('runs', { run_id: `W-${cid}-${preset}-${Date.now().toString(36)}`, card_id: cid, sample_index: 1, mode: 'web-paste', preset, model: v('model_shown'), prompt: { messages: [{ role: 'system', content: c.system_prompt }, { role: 'user', content: c.user_prompt }], source_ids: c.sources }, reply: v('reply'), date: new Date().toISOString(),
          web: { platform: preset.replace('-web', ''), entry_type: v('entry_type'), memory: v('memory'), search: v('search'), model_shown: v('model_shown'), screenshot: v('screenshot') }, temperature: '网页版不可控' }, 'run_id');
        shade.remove();
      }
    });
    document.body.append(shade);
  }
  window.W9.answerCell = answerCell; window.W9.handleCellClick = handleCellClick; window.W9.latestRun = latestRun;

  /* ================= D00 封面 ================= */
  class HeroCover9 extends Lab {
    render() {
      const M = Mat.state(), ents = Mat.entries();
      const withText = ents.filter((e) => e.text).length, pending = ents.filter((e) => !e.text && e.sendable).length;
      const runs = Through.get().runs, replays = M.replays.length;
      rerender(this, `<div class="hero-lab w9-hero"><div><p class="hero-title">让模型替古人说话、替社会推演，得到的是什么？</p>
        <p class="hero-lead">凭什么可以进入历史解释？——这一讲的四个动作：定条件，查错置，划边界，验格局。</p>
        <div class="hero-path">${[['定条件', '第一节 角色', 'D02'], ['查错置', '第二节 三误', 'D05'], ['划边界', '第三节 边界', 'D09'], ['验格局', '第四、五节 仿真与机制', 'D14']].map(([a, b, p]) => `<a href="#${p}"><b>${a}</b> <small>${b}</small></a>`).join('')}</div>
        <table class="items w9-legend"><tr><th>运行性质</th><th>页面上的标签</th><th>意思</th></tr>
          <tr><td>实际计算</td><td><span class="w9-badge calc">实际计算</span></td><td>页面内现场算出</td></tr>
          <tr><td>实际调用</td><td><span class="w9-badge live">实际调用</span></td><td>此刻经接口调用模型，附时间戳</td></tr>
          <tr><td>预存回放</td><td><span class="w9-badge replay">预存回放</span></td><td>课前真实运行的保存结果，非史料；注明模型、日期、提示、温度</td></tr>
          <tr><td>网页版粘贴</td><td><span class="w9-badge web-paste">网页版粘贴</span></td><td>教师在网页版运行后粘贴回来，附平台、界面型号、截图</td></tr>
          <tr><td>教学构造</td><td><span class="w9-badge teaching-construct">教学构造</span></td><td>人工示意，规则简化或数字为示例</td></tr></table></div>
        <div class="hero-claim"><small>材料与模型状态</small>
          <p>史料条目 ${ents.length} 条：有录文 ${withText} 条，录文待接入 ${pending} 条，不可送模型 ${ents.filter((e) => !e.sendable).length} 条（只给页码）。</p>
          <p>预存回放 ${replays} 条；本机运行与粘贴记录 ${runs.length} 条。${esc(M.localMsg || '本机材料包未载入（章太炎全集录文与课前运行记录在本机材料包中）。')}</p>
          <p><label class="pack-btn small">载入本机材料包<input type="file" accept=".json" data-local hidden></label> <button class="small" data-w9-import="">导入表格</button></p>
          ${modelPanel()}</div></div>`);
    }
    async onChange(e) { if (e.target.dataset.local !== undefined && e.target.files?.[0]) { const err = await Mat.loadLocalFile(e.target.files[0]); if (err) alert('未载入：' + err); } }
  }
  register('hero-cover9', HeroCover9);

  /* ================= D01 演示① ================= */
  class Demo1Lab extends Lab {
    defaults() { return { web: false, zhang: true }; }
    render() {
      const presets = PRESETS.filter(([p]) => this.s.web || !isWeb(p));
      const circled = (cid) => presets.reduce((n, [p]) => { const r = latestRun(cid, p).run; return n + (r ? Through.labelsFor(r.run_id).filter((x) => x.circled).length : 0); }, 0);
      const col = (cid) => `<section class="w9-col"><header><b>${esc(card(cid).label)}</b>　<span class="sub">圈出 ${circled(cid)} 句</span></header>${sourceBox(card(cid).sources[0])}${gateList(L.sourceGate(Mat.entries(), card(cid).timepoint, card(cid).sources, window.W9.Confirm.get(cid)))}${window.W9.Confirm.boxes(card(cid))}${presets.map(([p, lab]) => `<h4>${esc(lab)}</h4>${answerCell(cid, p)}`).join('')}</section>`;
      rerender(this, `<div class="w9-toolbar"><b>问题："民权与国权，孰当为先？"</b>　<label><input type="checkbox" data-o="web" ${this.s.web ? 'checked' : ''}> 显示网页版两家（进阶）</label>　<label><input type="checkbox" data-o="zhang" ${this.s.zhang ? 'checked' : ''}> 末问：1904 年的章太炎</label>　<span class="sub">点句子即"圈出"；再点取消。</span></div>
        <div class="w9-two">${col('card-1a')}${col('card-1b')}</div>
        ${this.s.zhang ? `<h3>末问："梁启超是您的同道吗？"（给署年／不给署年）</h3><div class="w9-two">${['card-2a', 'card-2b'].map((cid) => `<section class="w9-col"><header><b>${esc(card(cid).label)}</b></header>${sourceBox(card(cid).sources[0])}${PRESETS.filter(([p]) => !isWeb(p)).map(([p, lab]) => `<h4>${esc(lab)}</h4>${answerCell(cid, p)}`).join('')}</section>`).join('')}</div>` : ''}
        <details class="w9-check"><summary>看完之后对照的三处（讲义导入）</summary><ol>
          <li>1899 年推崇福沢，称"日本西学第一之先锋"（《自由书·文明普及之法》，傅正 2023 第 49 页引）；1903 年北美之行后转向国权先于民权（傅正第 57—59 页）。</li>
          <li>是否把"以今日之我难昔日之我"的口吻放进了 1899 年的梁启超嘴里（这是 1920 年《清代学术概论》的话，见 D09）。</li>
          <li>1900 年《訄书》初刻本封面由梁启超题签，1904 年重订本改由邹容题签；朱维铮认为这"表明作者已不认梁启超做朋友"（全集第三卷前言第 11 页）。</li></ol></details>`);
    }
    onChange(e) { const o = e.target.dataset.o; if (o) this.set({ [o]: e.target.checked }); }
    async onClick(e) { await handleCellClick(e, this); }
  }
  register('demo1-lab', Demo1Lab);

  /* ================= D05 演示② 时点检查与越界率 ================= */
  const SMALL = [{ sentence: '（例句 1：守住时点）', score: 0 }, { sentence: '（例句 2：说"此事我不知道"）', score: 0 }, { sentence: '（例句 3：用了当时还没有的概念）', score: 1 }, { sentence: '（例句 4：说出时点之后的事实）', score: 2 }];
  const A1 = [
    ['梁启超 1899', 'future', '戊戌变法失败后，您与革命党最终合作成功了吗？', '问的是 1900 年以后'], ['梁启超 1899', 'past-absence', '您在北美考察华人社会时有何感想？', '北美之行在 1903 年'], ['梁启超 1899', 'past-presence', '《清议报》创刊号上您写了什么？', ''], ['梁启超 1899', 'past-only', '您现在仍主持《时务报》吗？', '1898 年以前的情形'],
    ['章太炎 1904', 'future', '您在《民报》上与梁启超论战时最得意的一篇是哪篇？', '1906 年以后'], ['章太炎 1904', 'past-absence', '梁启超 1903 年在北美的演说讲了什么？', '章此时在狱中'], ['章太炎 1904', 'past-presence', '《訄书》初刻本的封面是谁题写的？', ''], ['章太炎 1904', 'past-only', '您现在仍主张"客帝"吗？', '重订本已改为《客帝匡谬》'],
    ['井上哲次郎 1912', 'future', '俄国革命以后，俄国的国体还与日本相似吗？', ''], ['井上哲次郎 1912', 'past-absence', '教育敕语起草时，国内怎样争论？', '井上 1884—1890 年在德国'], ['井上哲次郎 1912', 'past-presence', '1911 年讲习会上，您怎样讲"国体"与"政体"的分别？', ''], ['井上哲次郎 1912', 'past-only', '您现在仍任文科大学学长吗？', '1904 年以前的情形'],
    ['福沢諭吉 1882', 'future', '您在《脱亜論》里怎样看朝鲜的前途？', '1885 年的文章'], ['福沢諭吉 1882', 'past-absence', '国会开设的诏敕起草时，政府内部怎样争论？', '福沢不在场'], ['福沢諭吉 1882', 'past-presence', '《民情一新》认为西洋文明的根本在哪里？', ''], ['福沢諭吉 1882', 'past-only', '大隈重信现在还在政府里吗？', '明治十四年政变以前的情形']];
  class TimepointLab extends Lab {
    defaults() { return { cid: 'card-3a', preset: 'deepseek', small: SMALL.map((x) => x.score), mix: false, adv: false }; }
    render() {
      const c0 = card(this.s.cid), mixId = { 'pack-inoue': 'inoue-1928', 'pack-liang': 'liang-qingdai', 'pack-zhang': 'zhang-jianlun' }[c0.pack];
      const c = this.s.mix && mixId ? { ...c0, sources: [...c0.sources, mixId] } : c0;
      const gate = L.sourceGate(Mat.entries(), c.timepoint, c.sources);
      const st = latestRun(c.id, this.s.preset), run = st.run;
      const sents = run ? L.splitSentences(run.reply) : [];
      const labels = run ? sents.map((s, i) => Through.labelsFor(run.run_id).find((x) => x.sentence_index === i) || { sentence: s, score: null, source_ref: null }) : [];
      const sc = L.timepointScore(labels);
      const others = run ? Through.get().runs.concat(Mat.replays()).filter((r) => r.card_id === c.id && r.preset === this.s.preset && r.run_id !== run.run_id) : [];
      const Ls = [sc.L, ...others.map((r) => L.timepointScore(Through.labelsFor(r.run_id)).L)].filter((x) => x != null);
      const rg = L.lRange(Ls);
      const small = L.timepointScore(this.s.small.map((score, i) => ({ ...SMALL[i], score })));
      const srcOpts = (cur) => `<option value="">无依据</option>${c0.sources.map((id) => `<option value="${esc(id)}" ${cur === id ? 'selected' : ''}>${esc(Mat.entry(id)?.title || id)}</option>`).join('')}`;
      const cols = [
        { title: '选人物与时点', why: '时点决定哪些话"那一年说得出"。', body: `<p><select data-o="cid">${CARDS.filter((x) => /^card-[123]/.test(x.id)).map((x) => `<option value="${x.id}" ${x.id === this.s.cid ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>
            <select data-o="preset">${PRESETS.filter(([p]) => !isWeb(p)).map(([p, l]) => `<option value="${p}" ${p === this.s.preset ? 'selected' : ''}>${l}</option>`).join('')}</select></p>
            <p><b>问：</b>${esc(c0.user_prompt)}</p>${c.sources.map(sourceBox).join('')}
            <label class="adv"><input type="checkbox" data-o="mix" ${this.s.mix ? 'checked' : ''}> 进阶：混入第三层材料（${esc(Mat.entry(mixId)?.title || '—')}）</label>${gateList(gate)}` },
        { title: '读回答', why: '先看运行性质：现场、回放还是待运行。', body: `${answerCell(c.id, this.s.preset, { circle: false })}` },
        { title: '逐句打 0／1／2 分', why: '0 守住；1 含糊越界（概念、口吻）；2 明确越界（时点之后的事实）。另记依据。', body: run ? `<table class="items w9-score">${sents.map((s, i) => `<tr><td>${esc(s)}</td><td class="nowrap">${[0, 1, 2].map((v) => `<button class="small ${labels[i].score === v ? 'on' : ''}" data-score="${i}" data-v="${v}">${v}</button>`).join('')}</td><td><select data-src="${i}">${srcOpts(labels[i].source_ref)}</select></td></tr>`).join('')}</table>` : '<p class="sub">本格尚无回答（待课前运行或现场调用）。先用右侧的小例子讲公式。</p>' },
        { title: '算越界率 L', why: 'L =（1/N）Σ l_j / 2，除以 2 使 L 落在 0 到 1 之间。', body: `<div class="w9-formula"><p><b>小例子</b>（教学构造）：${this.s.small.map((v, i) => `<select data-small="${i}">${[0, 1, 2].map((x) => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('')}</select>`).join(' ')}</p>
            <p class="mono">L = (${this.s.small.join(' + ')}) / (2 × ${this.s.small.length}) = ${small.sum}/${2 * small.N} = <b>${fmt(small.L)}</b></p></div>
            <div class="w9-formula"><p><b>本段回答</b>：N = ${sc.N}（未打分 ${sc.unscored}）</p><p class="mono">L = ${sc.sum}/${2 * sc.N || 0} = <b>${fmt(sc.L)}</b></p><p>无依据句 ${sc.noSource}；明确越界 ${sc.beyond}</p>
            <p>${rg && rg.n > 1 ? `同卡 ${rg.n} 次采样：L 在 ${fmt(rg.min)}—${fmt(rg.max)} 之间` : '只打了一次采样的分：至少采样三次，报告范围。'}</p></div>` },
      ];
      rerender(this, window.Deck.flowShell(this.page(), cols, { active: run ? 2 : 0 }) + `<details class="w9-check" ${this.s.adv ? 'open' : ''}><summary data-o="adv">进阶：四位人物的四类时点题（扩充部分甲一 @tab-a1；括号内是出题者的提示，不交给模型）</summary><table class="items"><tr><th>人物与时点</th><th>题型</th><th>题目</th><th>出题提示</th></tr>${A1.map(([p, t, q, h]) => `<tr><td>${esc(p)}</td><td class="mono">${t}</td><td>${esc(q)}</td><td class="sub">${esc(h)}</td></tr>`).join('')}</table><p class="sub">学生自出题目经接口运行：在 D12 填条件卡后运行，回答会出现在 D08。</p></details>`);
    }
    onChange(e) {
      const t = e.target, o = t.dataset.o;
      if (o === 'cid' || o === 'preset') this.set({ [o]: t.value });
      if (o === 'mix') this.set({ mix: t.checked });
      if (t.dataset.small) { const a = this.s.small.slice(); a[+t.dataset.small] = +t.value; this.set({ small: a }); }
      if (t.dataset.src) { const run = latestRun(this.s.cid, this.s.preset).run; const i = +t.dataset.src; Through.setLabel(run.run_id, i, L.splitSentences(run.reply)[i], { source_ref: t.value || null }); }
    }
    async onClick(e) {
      const b = e.target.closest('[data-score]');
      if (b) { const run = latestRun(this.s.cid, this.s.preset).run, i = +b.dataset.score, v = +b.dataset.v; Through.setLabel(run.run_id, i, L.splitSentences(run.reply)[i], { score: v, beyond_timepoint: v === 2 ? '是' : v === 0 ? '否' : '待定' }); return; }
      await handleCellClick(e, this);
    }
  }
  register('timepoint-lab', TimepointLab);

  /* ================= D07 演示③ 三种问法 ================= */
  const CHECKS = [['admit', '以第一人称"承认"作者身份'], ['premise', '顺着提问的前提答'], ['dispute', '提到作者归属的争论']];
  class InduceLab extends Lab {
    defaults() { return { checks: {}, rewrite: '' }; }
    render() {
      const qs = ['card-4-1', 'card-4-2', 'card-4-3'];
      const ck = (k, c) => !!this.s.checks[k]?.[c];
      const sum = (cid, c) => PRESETS.filter(([p]) => ck(cid + '|' + p, c)).length;
      rerender(this, `<div class="w9-toolbar"><b>同一个关于《脱亜論》的问题，三种问法 × 四个模型</b>　<span class="sub">每格勾三项；页面按问法汇总。指定史料：维基文库原报本（可送）；岩波版全集第十卷第 238 页（不可送，只给页码）。</span></div>
        ${sourceBox('datsuaron-genpo')}${sourceBox('datsuaron-punct')}${gateList(L.sourceGate(Mat.entries(), '1885-03-16', ['datsuaron-genpo', 'fukuzawa-zenshu-10-238']))}
        <table class="w9-grid"><tr><th>问法</th>${PRESETS.map(([, l]) => `<th>${esc(l)}</th>`).join('')}<th>合计</th></tr>
        ${qs.map((cid) => `<tr><th><b>${esc(card(cid).label)}</b><p class="sub">${esc(card(cid).user_prompt)}</p></th>${PRESETS.map(([p]) => { const k = cid + '|' + p; return `<td>${answerCell(cid, p, { circle: false })}<div class="w9-ticks">${CHECKS.map(([c, lab]) => `<label><input type="checkbox" data-ck="${esc(k)}" data-c="${c}" ${ck(k, c) ? 'checked' : ''}> ${lab}</label>`).join('')}</div></td>`; }).join('')}
          <td class="w9-sum">${CHECKS.map(([c, lab]) => `<div>${lab}：<b>${sum(cid, c)}</b>/4</div>`).join('')}</td></tr>`).join('')}</table>
        <div class="w9-formula"><b>改写一个问题（2 分钟）</b>：把自己常问的一个问题，改写成"以分析者身份、依据某材料回答"的问法。<br><textarea data-rw rows="2" style="width:100%">${esc(this.s.rewrite)}</textarea><span class="sub">进阶：到 D12 用这个问法填一张条件卡并运行。</span></div>`);
    }
    onChange(e) { const t = e.target; if (t.dataset.ck) { const ch = { ...this.s.checks }; ch[t.dataset.ck] = { ...(ch[t.dataset.ck] || {}), [t.dataset.c]: t.checked }; this.set({ checks: ch }); } }
    onInput(e) { if (e.target.dataset.rw !== undefined) { this.s.rewrite = e.target.value; store.set(this.key, this.s); } }
    async onClick(e) { await handleCellClick(e, this); }
  }
  register('induce-lab', InduceLab);

  /* ================= D08 逐句检查表 ================= */
  const FIGCHECK = { run_id: 'R-figcheck', mode: 'teaching-construct', model: '—', card_id: 'card-3a', reply: '俄国虽曾与我国体相似，然其帝室已为革命所覆。吾国之国体，乃万世一系，与他国截然不同。', date: '' };
  const TYPES = ['知识', '概念', '规范', '文体', '无'], PARTS = ['历史语境化', '视角采择', '情感联结'];
  class CheckLab extends Lab {
    defaults() { return { run: 'R-figcheck', paste: '' }; }
    allRuns() { const rs = Through.get().runs.filter((r) => r.reply && !r.error).concat(Mat.replays().filter((r) => !Through.get().runs.some((x) => x.run_id === r.run_id))); return [FIGCHECK, ...rs]; }
    render() {
      const runs = this.allRuns(), run = runs.find((r) => r.run_id === this.s.run) || FIGCHECK;
      const c = card(run.card_id), srcs = c ? c.sources : [];
      const sents = L.splitSentences(run.reply), lab = (i) => Through.labelsFor(run.run_id).find((x) => x.sentence_index === i) || {};
      const all = sents.map((s, i) => ({ sentence: s, ...lab(i) })), sc = L.timepointScore(all);
      const sel = (i, f, opts, cur) => `<select data-f="${f}" data-i="${i}"><option value="">—</option>${opts.map((o) => `<option ${cur === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      rerender(this, `<div class="w9-toolbar"><label>选一段回答 <select data-o="run">${runs.map((r) => `<option value="${esc(r.run_id)}" ${r.run_id === run.run_id ? 'selected' : ''}>${esc((card(r.card_id)?.label || r.card_id || '粘贴') + '｜' + (r.preset || '') + '｜' + (window.W9.MODE_LABEL[r.mode] || r.mode))}</option>`).join('')}</select></label>　${badge(run, run.mode)}
        <details><summary>粘贴一段回答</summary><textarea data-paste rows="3" style="width:100%">${esc(this.s.paste)}</textarea><button class="small" data-x="paste">拆句并加入</button></details></div>
        ${run === FIGCHECK ? '<p class="note-box">下面两行是讲义 @fig-check 为说明用法而构造的句子，不是任何模型的输出（教学构造）。</p>' : ''}
        <table class="items w9-checktable"><tr><th>句子</th><th>依据（指定史料的位置）</th><th>越出时点？</th><th>错置类型</th><th>被诱导？</th><th>遗漏了什么</th><th>共情三部分</th></tr>
        ${all.map((l, i) => `<tr class="${l.source_ref ? '' : 'nosrc'}"><td>${esc(l.sentence)}</td><td><select data-f="source_ref" data-i="${i}"><option value="">无依据</option>${srcs.map((id) => `<option value="${esc(id)}" ${l.source_ref === id ? 'selected' : ''}>${esc(Mat.entry(id)?.title || id)}</option>`).join('')}</select></td>
          <td>${sel(i, 'beyond_timepoint', ['是', '否', '待定'], l.beyond_timepoint)}</td><td>${sel(i, 'type', TYPES, l.type)}</td><td>${sel(i, 'induced', ['是', '否'], l.induced)}</td><td><input data-f="omission" data-i="${i}" value="${esc(l.omission || '')}" size="14"></td><td>${sel(i, 'empathy_part', PARTS, l.empathy_part)}</td></tr>`).join('')}</table>
        <p class="w9-sum">共 ${all.length} 句：无依据 <b>${sc.noSource}</b>　越出时点 <b>${all.filter((x) => x.beyond_timepoint === '是').length}</b>　被诱导 <b>${sc.induced}</b>　已填"遗漏" <b>${all.filter((x) => x.omission).length}</b>　<span class="w9-badge calc">实际计算</span></p>
        <div class="w9-two">${srcs.map(sourceBox).join('')}</div><p class="sub">做完想一想：哪一栏最难填？多半是"遗漏了什么"，因为要回答它，必须先读过原文。</p>`);
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.o === 'run') return this.set({ run: t.value });
      if (t.dataset.f) { const run = this.allRuns().find((r) => r.run_id === this.s.run) || FIGCHECK; const i = +t.dataset.i; Through.setLabel(run.run_id, i, L.splitSentences(run.reply)[i], { [t.dataset.f]: t.value || null }); }
    }
    onInput(e) { if (e.target.dataset.paste !== undefined) { this.s.paste = e.target.value; store.set(this.key, this.s); } }
    onClick(e) {
      if (e.target.dataset.x === 'paste' && this.s.paste.trim()) {
        const r = Through.add('runs', { run_id: 'P-' + Date.now().toString(36), card_id: '', mode: 'teaching-construct', model: '（学生粘贴，来源自填）', preset: 'paste', reply: this.s.paste.trim(), prompt: { messages: [] }, date: new Date().toISOString() }, 'run_id');
        this.set({ run: r.run_id, paste: '' });
      }
    }
  }
  register('check-lab', CheckLab);

  /* ================= D09 按成文时间分史料 ================= */
  class GateLab extends Lab {
    defaults() { return { pack: 'pack-liang', tp: '1899', sel: ['liang-wenye', 'liang-qingdai'], confirm: [] }; }
    render() {
      const p = Mat.pack(this.s.pack) || Mat.packs()[0], es = p ? p.entries : [];
      const sel = this.s.sel.filter((id) => es.some((e) => e.id === id));
      const gate = L.sourceGate(es, this.s.tp, sel, this.s.confirm);
      const msg = L.buildMessages({ timepoint: this.s.tp, sources: sel, confirm: this.s.confirm, system_prompt: `你是 ${this.s.tp} 年的${es[0]?.person || ''}。只依据下面所给的文字回答。`, user_prompt: '（问题）' }, es);
      const cls = (e) => (gate.blocked.includes(e.id) ? 'blocked' : (gate.late.includes(e.id) || gate.boundary.includes(e.id) || gate.unknown.includes(e.id)) ? 'late' : '');
      const cols = [
        { title: '选人物与时点', why: '"时点之前"以这里写的年份为准。', body: `<p><select data-o="pack">${Mat.packs().map((x) => `<option value="${esc(x.id)}" ${x.id === p?.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></p><p><label>模拟时点（公元）<input data-o="tp" value="${esc(this.s.tp)}" size="10"></label></p><p class="sub">${esc(p?.calendar_note || '')}</p><p><button class="small" data-w9-import="sourcepack">导入自己的史料包</button></p>` },
        { title: '史料分三层', why: '本人时点前所作／同时代他人所记、所编／身后的回顾与评价。', body: `<table class="items">${es.map((e) => `<tr class="${cls(e)}"><td><input type="checkbox" data-sel="${esc(e.id)}" ${sel.includes(e.id) ? 'checked' : ''}></td><td>${esc(e.title)}<div class="sub">${esc(e.written_date_raw)}｜${esc(e.date_kind)}</div></td><td class="nowrap">第${['', '一', '二', '三'][e.layer] || '?'}层</td><td class="nowrap">${esc(e.written_date)}${e.written_date_end ? '—' + esc(e.written_date_end) : ''}</td></tr>`).join('')}</table>` },
        { title: '成文时间与可送校验', why: '晚于时点或第三层标红，须确认；不可送的条目一律拦截。', body: `${gateList(gate)}${[...gate.late, ...gate.boundary, ...gate.unknown].map((id) => `<label class="w9-confirm"><input type="checkbox" data-cf="${esc(id)}" ${this.s.confirm.includes(id) ? 'checked' : ''}> 教师确认保留：${esc(Mat.entry(id)?.title || id)}</label>`).join('')}<p class="${gate.ok ? 'ok' : 'nil'}">${gate.ok ? '全部通过' : '有条目未通过，默认不进入提示'}</p>` },
        { title: '拼进提示', why: '右栏就是将要发出的提示全文，只含通过校验的条目。', body: `<pre class="srcbox">${esc(msg.messages[0].content)}</pre>${msg.empty.length ? `<p class="sub">通过校验但录文待接入：${msg.empty.map((id) => esc(Mat.entry(id)?.title || id)).join('；')}</p>` : ''}` },
      ];
      rerender(this, window.Deck.flowShell(this.page(), cols, { active: gate.ok ? 4 : 2 }));
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.o === 'pack') { const p = Mat.pack(t.value); this.set({ pack: t.value, sel: p.entries.map((x) => x.id), confirm: [], tp: p.entries.find((x) => x.layer === 1)?.written_date?.slice(0, 4) || this.s.tp }); }
      if (t.dataset.o === 'tp') this.set({ tp: t.value.trim() });
      if (t.dataset.sel) this.set({ sel: t.checked ? [...this.s.sel, t.dataset.sel] : this.s.sel.filter((x) => x !== t.dataset.sel) });
      if (t.dataset.cf) this.set({ confirm: t.checked ? [...this.s.confirm, t.dataset.cf] : this.s.confirm.filter((x) => x !== t.dataset.cf) });
    }
  }
  register('gate-lab', GateLab);
})();
