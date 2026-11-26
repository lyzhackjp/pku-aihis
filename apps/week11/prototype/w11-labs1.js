/* 第十一周页面组件（一）：基类、D00、D01、D02、D04｜候选，未经教师确认｜2026-11-26（第一批） */
(() => {
  'use strict';
  const { esc, register } = window.Deck;
  const W = window.W11, { L, Mat, Through, answerCell, cellClick, cardBox, needPack, toRegister } = W;
  const S = window.W11_STATIC, EX = window.W11_EXAMPLES;
  const pct = (x) => (x == null || Number.isNaN(x) ? '—' : Math.round(x * 100) + '%');
  const frac = (a, b) => (b ? `${a}/${b}` : '—');
  W.pct = pct; W.frac = frac;

  /* 组件基类：页内状态存在贯穿记录的 page_state 里（随记录导出、恢复）；材料、记录、模型三类事件后重绘 */
  class Lab extends HTMLElement {
    connectedCallback() {
      this.pid = this.closest('deck-slide')?.getAttribute('slide-id') || this.tagName;
      this.classList.add('w9-lab');
      ['w11-materials', 'w11-through', 'w11-model'].forEach((n) => document.addEventListener(n, () => this.isConnected && !this._busy && this.render()));
      this.addEventListener('click', async (e) => { if (await cellClick(e, this)) return; this.onClick && this.onClick(e); });
      this.addEventListener('change', (e) => this.onChange && this.onChange(e));
      this.addEventListener('input', (e) => this.onInput && this.onInput(e));
      this.render();
    }
    get s() { const ps = Through.pageState(this.pid); for (const [k, v] of Object.entries(this.defaults())) if (!(k in ps)) ps[k] = JSON.parse(JSON.stringify(v)); return ps; }
    defaults() { return {}; }
    set(patch, { redraw = true } = {}) { Object.assign(this.s, patch); this._busy = !redraw; Through.save(); this._busy = false; if (redraw) this.render(); }
    page() { return window.Deck.pageById(this.pid); }
    out(html) { W.render(this, html); }
  }
  W.Lab = Lab;
  const badge = (cls, t) => `<span class="w9-badge ${cls}">${esc(t)}</span>`;
  W.nat = { calc: badge('calc', '实际计算'), tc: badge('teaching-construct', '教学构造'), replay: badge('replay', '预存回放'), stat: badge('none', '静态') };
  function marked(text, groups) {
    let h = esc(text);
    for (const [cls, words] of groups) for (const w of words) if (w) h = h.split(esc(w)).join(`<mark class="${cls}">${esc(w)}</mark>`);
    return h;
  }
  W.marked = marked;
  /* 片段标出：spans 为 [start,end) 下标（原文），cls 为类名 */
  function spanMark(text, spans) {
    const s = String(text); const pts = []; spans.forEach(([a, b, cls, title], i) => { pts.push([a, 1, i]); pts.push([b, 0, i]); });
    pts.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    let out = '', last = 0;
    for (const [pos, open, i] of pts) { out += esc(s.slice(last, pos)); last = pos; const sp = spans[i]; out += open ? `<mark class="${esc(sp[2] || '')}" title="${esc(sp[3] || '')}">` : '</mark>'; }
    return out + esc(s.slice(last));
  }
  W.spanMark = spanMark;

  /* ================= D00 封面 ================= */
  class Cover11 extends Lab {
    get noShell() { return true; }
    render() {
      const T = Through.get();
      const n = { D02: T.matrix.length, D05: T.paragraphs.length, D10: T.edits.length, D15: T.register.filter((r) => r.kind === 'note_check').length };
      this.out(`<div class="hero-lab w9-hero"><div><p class="hero-title">${esc(S.question)}</p>
        <p class="hero-lead">陈澧教学生写说经的文章，头一条就是"前人之書當明引不當暗襲"。今天的论文里，还有模型替我们写过、改过的文字。</p></div>
        <div class="hero-claim"><small>一页文字要过的四道关口（点进对应页；记录汇到结语 D18）</small>
          <div class="hero-path">${S.gates.map(([g, p, t]) => `<a href="#${p}"><b>${esc(g)}</b> <small>${p}｜${esc(t)}</small><span class="dot ${n[p] ? 'on' : ''}"></span></a>`).join('')}</div>
          <p class="w9-hero-line">页面上每一处结果都标明来历：</p>
          <ul class="w9-legend">
            <li><span class="w9-badge calc">实际计算</span>页面内现场算出（规则、计数、Word 稿解析）</li>
            <li><span class="w9-badge live">实际调用</span>此刻经接口调用模型，附时间</li>
            <li><span class="w9-badge replay">预存回放</span>课前真实运行的保存结果，注明模型、日期、提示、温度</li>
            <li><span class="w9-badge web-paste">网页版粘贴</span>教师在网页版运行后录入，附界面型号与截图</li>
            <li><span class="w9-badge teaching-construct">教学构造</span>人工示意：练习材料甲、示范段、预期意见、假设数字</li>
            <li><span class="w9-badge none">待课前运行</span>尚无记录；这里不放构造的回答</li></ul>
          <p class="w9-hero-status">材料、导入（含"导入 Word 稿"）与模型接入见顶栏。</p></div></div>`);
    }
  }
  register('hero-cover11', Cover11);

  /* ================= D01 明引与暗袭 ================= */
  const P2 = () => (EX['paragraphs.jia'].paragraphs.find((p) => p.para_id === 'P2') || {}).text || '';
  const clauses = (t) => (String(t).match(/[^，。；：、“”]+[，。；：、”]?|[“”]/g) || []);
  class Borrow extends Lab {
    defaults() { return { picked: [], k: 12, ran: false, own: '', ownSrc: '', useOwn: false }; }
    render() {
      const s = this.s, chen = Mat.entry('chenli-yinshufa');
      const first = chen?.text ? (chen.text.split('\n').find((l) => l.includes('明引')) || '') : '';
      const text = s.useOwn ? s.own : P2();
      const src = s.useOwn ? s.ownSrc : [Mat.text('mao-history'), Mat.text('mao-conclusion')].filter(Boolean).join('\n');
      const cl = clauses(text); let off = 0; const pos = cl.map((c) => { const a = text.indexOf(c, off); off = a + c.length; return [a, a + c.length]; });
      const r = s.ran && src ? L.borrowScan(text, src, { k: s.k }) : null;
      // 片段下标是归一后的；回到原文：逐字对齐（去空白与引号后的字序）
      const map = []; for (let i = 0; i < text.length; i++) if (!/[\s\p{Cc}“”"「」]/u.test(text[i])) map.push(i);
      const quotedOut = (() => { const keep = []; let q = false; for (let i = 0; i < text.length; i++) { if ('“"「'.includes(text[i]) && !q) { q = true; continue; } if ('”"」'.includes(text[i]) && q) { q = false; continue; } if (!q) keep.push(i); } return keep.filter((i) => !/[\s\p{Cc}“”"「」]/u.test(text[i])); })();
      const frag = r ? r.fragments.map((f) => [quotedOut[f.draft_span[0]], quotedOut[f.draft_span[1] - 1] + 1, 'borrow', `与原文连续相同 ${f.len} 字，原刊第 ${f.page} 页`]) : [];
      const pickedSpans = s.picked.map((i) => [pos[i][0], pos[i][1], 'picked', '我选的"前人的话"']);
      const overlap = r ? frag.filter(([a, b]) => s.picked.some((i) => pos[i][0] < b && pos[i][1] > a)).length : 0;
      this.out(`<div class="w11-two"><section><h4>陈澧《引書法》第一条 ${W.nat.stat}</h4>
        ${first ? `<blockquote class="w11-q">${W.marked(first, [['key', S.chenliKey]])}</blockquote><p class="sub">${esc(Mat.ident(chen))}</p>` : '<p class="nil">陈澧录文未载入。</p>'}
        <p class="sub">"兩善"：心术的笃实，见闻的渊博。两件事：读者分得清哪些是前人的话，也查得到前人的话出在哪里。</p></section>
        <section><h4>${s.useOwn ? '我自己的一段' : '练习材料甲第 2 段'} ${s.useOwn ? '' : W.nat.tc}</h4>
        <p class="sub">点选你认为是"前人的话"的片段（再点取消）；然后点"核对"。</p>
        <div class="w11-clauses">${cl.map((c, i) => `<span class="cl ${s.picked.includes(i) ? 'on' : ''}" data-cl="${i}">${esc(c)}</span>`).join('')}</div>
        <p><button data-x="run">核对（borrow-scan）</button> <label>k＝<input type="range" min="4" max="20" value="${s.k}" data-k> <b>${s.k}</b> 字</label>
          <label><input type="checkbox" data-own ${s.useOwn ? 'checked' : ''}> 换成我自己的一段</label></p>
        ${s.useOwn ? `<p><textarea data-f="own" rows="4" style="width:100%" placeholder="自己的一段">${esc(s.own)}</textarea></p><p><textarea data-f="ownSrc" rows="4" style="width:100%" placeholder="所据原文（可含〔原刊第×页〕标记）">${esc(s.ownSrc)}</textarea></p>` : ''}
        ${s.ran ? (src ? `<div class="w9-reply">${W.spanMark(text, [...pickedSpans, ...frag])}</div>
          <p>${W.nat.calc} 引号外与原文连续相同 ≥${s.k} 字的片段 <b>${r.fragments.length}</b> 处；其中与你的选区重叠 ${overlap} 处。</p>
          <table class="items"><tr><th>片段</th><th>字数</th><th>原刊页</th></tr>${r.fragments.map((f) => `<tr><td>${esc(f.text)}</td><td>${f.len}</td><td>${esc(f.page || '—')}${f.page_raw !== f.page ? `<span class="sub">（原脚本报第 ${esc(f.page_raw)} 页：片段以标点起头）</span>` : ''}</td></tr>`).join('')}</table>
          <p class="sub">把 k 调小，常见说法也会被标出：程序找的是"相同"，是不是"暗袭"仍要人判断。引号内的文字归 quote-check（D17）。</p>` : needPack('茅海建文两节节录（原文）')) : ''}</section></div>`);
    }
    onClick(e) {
      const c = e.target.closest('[data-cl]'); if (c) { const i = +c.dataset.cl, p = new Set(this.s.picked); p.has(i) ? p.delete(i) : p.add(i); this.set({ picked: [...p] }); return; }
      if (e.target.dataset.x === 'run') this.set({ ran: true });
    }
    onChange(e) {
      if (e.target.dataset.k !== undefined) this.set({ k: +e.target.value });
      if (e.target.dataset.own !== undefined) this.set({ useOwn: e.target.checked, picked: [], ran: false });
      if (e.target.dataset.f) this.set({ [e.target.dataset.f]: e.target.value, ran: false }, { redraw: true });
    }
  }
  register('borrow-lab', Borrow);

  /* ================= D02 以问题为纲：综述矩阵 ================= */
  const REL = ['出发点', '补证', '需要收窄', '反证', '背景', '需要读', '需要处理'];
  class Matrix extends Lab {
    defaults() { return { view: 'col', rel: {}, sortRel: false, src: 'wuxu' }; }
    rows() { return this.s.src === 'own' ? Through.get().matrix : EX['matrix.wuxu'].rows; }
    render() {
      const s = this.s, rows = this.rows().map((r) => ({ ...r, rel: s.rel[r.row_id] ?? (s.src === 'own' ? r.relation_to_my_question : '') }));
      const ord = s.sortRel ? [...rows].sort((a, b) => (REL.indexOf(a.rel) + 99 * !a.rel) - (REL.indexOf(b.rel) + 99 * !b.rel)) : rows;
      const basis = (b) => `<span class="w11-basis b-${esc(b || 'none')}">${esc(b || '未标')}</span>`;
      const byRow = `<ol class="w11-rowread">${ord.map((r) => `<li><b>${esc(r.scholar)}</b>（${esc(r.year)}）认为：${esc(r.claim)}${r.page ? `<span class="sub">（第 ${esc(r.page)} 页）</span>` : ''}</li>`).join('')}</ol><p class="sub">按行读：一家一家地说，每一句都可能准确，读者却看不出作者要回答什么问题。</p>`;
      const byCol = `<table class="items"><tr><th>学者</th><th>年份</th><th>主张（摘）</th><th>回应对象</th><th>与我的问题的关系</th></tr>${ord.map((r) => `<tr><td>${esc(r.scholar)}</td><td>${esc(r.year)}</td><td>${esc(r.claim)}${r.claim_quote ? `<span class="sub">"${esc(r.claim_quote)}"，第 ${esc(r.page || '?')} 页</span>` : ''}</td><td>${esc(r.responds_to || '')} ${basis(r.responds_basis)}</td><td><select data-rel="${esc(r.row_id)}"><option value="">（尚未表态）</option>${REL.map((x) => `<option ${r.rel === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td></tr>`).join('')}</table>`;
      const g = (k) => ord.filter((r) => r.rel === k).map((r) => r.scholar);
      const empty = ord.filter((r) => !r.rel).map((r) => r.scholar);
      const isay = `<div class="w11-isay"><b>可写成的 I say</b>（据最后一列自动拼出骨架，文字要自己写）：<p>本文${g('出发点').length ? `从${g('出发点').join('、')}出发` : '（尚无出发点）'}${g('补证').length ? `，以${g('补证').join('、')}为补证` : ''}${g('反证').length ? `，回应${g('反证').join('、')}的反证` : ''}${g('需要收窄').length ? `，收窄${g('需要收窄').join('、')}之说` : ''}，追问：____。</p>${empty.length ? `<p class="nil">尚未表态：${empty.map(esc).join('、')}</p>` : ''}</div>`;
      this.out(`<p><b>材料</b> <label><input type="radio" name="mxsrc" value="wuxu" ${s.src === 'wuxu' ? 'checked' : ''}> 戊戌告密六家（讲义图 1，本课摘编）</label> <label><input type="radio" name="mxsrc" value="own" ${s.src === 'own' ? 'checked' : ''}> 我的矩阵（导入表格：${Through.get().matrix.length} 行）</label> <button class="small" data-w11-import="matrix">导入表格</button>
        　<b>读法</b> <button class="small ${s.view === 'row' ? 'on' : ''}" data-view="row">按行读（以作者为纲）</button> <button class="small ${s.view === 'col' ? 'on' : ''}" data-view="col">按列读（以问题为纲）</button> <label><input type="checkbox" data-sort ${s.sortRel ? 'checked' : ''}> 按"关系"一列排序</label></p>
        ${s.src === 'wuxu' ? `<p class="sub">${W.nat.stat} 前五列据茅海建文第 4 期第 198—208 页、第 6 期第 175 页与郭卫东文第 31—33 页摘编；"回应对象"黄彰健一格需回黄著（B-02），丁、赵一格是推断。假设的研究问题：<b>袁世凯告密的消息，在政变过程中的哪一个环节起了作用？</b> 最后一列请自己填（讲义示范为${W.nat.tc}）。</p>` : ''}
        ${!rows.length ? '<p class="nil">还没有导入自己的矩阵。</p>' : s.view === 'row' ? byRow : byCol}${s.view === 'col' ? isay : ''}
        <p><button class="small" data-x="send">把最后一列送入贯穿记录（D18）</button></p>`);
    }
    onClick(e) {
      if (e.target.dataset.view) this.set({ view: e.target.dataset.view });
      if (e.target.dataset.x === 'send') { for (const r of this.rows()) Through.add('matrix', { ...r, relation_to_my_question: this.s.rel[r.row_id] ?? r.relation_to_my_question ?? null, filled_by: 'author' }, 'row_id'); W.toast(`已送入贯穿记录：矩阵 ${this.rows().length} 行`); }
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.rel) { this.s.rel[t.dataset.rel] = t.value || ''; this.set({}); }
      if (t.dataset.sort !== undefined) this.set({ sortRel: t.checked });
      if (t.name === 'mxsrc') this.set({ src: t.value });
    }
  }
  register('matrix-lab', Matrix);

  /* ================= D04 从列到段（演示①） ================= */
  const NAMES = ['丁文江', '赵丰田', '吴相湘', '黄彰健', '郭卫东', '茅海建', '刘路生', '刘凤翰', '萧一山', '房德邻'];
  function ruleHits(text) {
    const sents = L.splitSentences(text);
    const lead = sents.map((s) => NAMES.some((n) => s.replace(/^[“"（(]/, '').startsWith(n)) && /认为|指出|主张|提出|强调|考订/.test(s.slice(0, 30)));
    let listing = 0, run = 0; lead.forEach((x) => { run = x ? run + 1 : 0; if (run >= 2) listing = Math.max(listing, run); });
    const R = S.demo1Rules;
    return { sents, lead, listing, harm: R.harmonize.filter((w) => text.includes(w)), fake: R.fakeConsensus.filter((w) => text.includes(w)) };
  }
  class Demo1 extends Lab {
    defaults() { return { isay: {} }; }
    body(run) {
      const h = ruleHits(run.reply), pick = this.s.isay[run.run_id];
      return `<div class="w9-reply w10-circle">${h.sents.map((s, i) => `<span class="sent ${pick === i ? 'circled' : ''} ${h.lead[i] ? 'lead' : ''}" data-isay="${esc(run.run_id)}" data-i="${i}">${W.marked(s, [['harm', h.harm], ['fake', h.fake]])}</span>`).join('')}</div>
        <p class="sub">${W.nat.calc} 逐家罗列：${h.listing ? `连续 ${h.listing} 句` : '无'}｜调和：${h.harm.length ? h.harm.map(esc).join('、') : '无'}｜自造共识：${h.fake.length ? h.fake.map(esc).join('、') : '无'}｜I say：${pick == null ? '未标' : pick === -1 ? '<b>无</b>' : `第 ${pick + 1} 句`} <button class="small" data-isay="${esc(run.run_id)}" data-i="-1">标"无"</button></p>`;
    }
    render() {
      const col = (cid, label) => `<section class="w9-col"><header><b>${esc(label)}</b></header>${cardBox(cid)}${['deepseek', 'kimi'].map((p) => answerCell(cid, p, { body: (r) => this.body(r) }).html).join('')}</section>`;
      const stat = (cid) => { const rs = Through.get().runs.concat(Mat.replays()).filter((r) => r.card_id === cid && r.reply); const marked = rs.filter((r) => r.run_id in this.s.isay); const yes = marked.filter((r) => this.s.isay[r.run_id] >= 0); return `${cid}：已标 ${marked.length}/${rs.length}，有 I say ${frac(yes.length, marked.length)}`; };
      this.out(`<div class="w9-cols">${col('D1A', 'D1A 只给矩阵')}${col('D1B', 'D1B 矩阵＋茅文学术史节录')}</div>
        <p>${W.nat.calc} 点一句标为"I say"（再点另一句改选）；找不到就标"无"。${stat('D1A')}；${stat('D1B')}。</p>
        <details><summary>讲义 1.3 示范段 ${W.nat.tc}</summary><blockquote class="w11-q">${esc(S.model13)}</blockquote><p class="sub">按"与我的问题的关系"重排：出发点（黄、茅）→ 反证（郭）→ 最后一句 I say。刘路生的商榷有意没写进，留到 4.3。</p></details>
        <details><summary>进阶：借模型写与独写，谁更像谁（C-03）</summary><p class="sub">把几段综述贴入（每段一行，行首写"模型｜"或"独写｜"），页面算两两字符二元组 Jaccard。</p><textarea data-conv rows="5" style="width:100%">${esc(this.s.conv || '')}</textarea>${this.convHtml()}</details>`);
    }
    convHtml() {
      const ls = String(this.s.conv || '').split('\n').map((l) => l.split('｜')).filter((x) => x.length === 2 && x[1].trim());
      if (ls.length < 2) return '';
      const bg = (t) => { const c = [...t.replace(/[\s\p{P}]/gu, '')]; return c.slice(0, -1).map((x, i) => x + c[i + 1]); };
      const grp = (g) => { const xs = ls.filter((l) => l[0].trim() === g).map((l) => bg(l[1])); return xs.length > 1 ? L.pairwiseJaccard(xs).mean : null; };
      return `<p>${W.nat.calc} 两两平均 Jaccard：模型组 ${grp('模型') == null ? '—' : grp('模型').toFixed(3)}；独写组 ${grp('独写') == null ? '—' : grp('独写').toFixed(3)}（数字越大越"像"）。</p>`;
    }
    onClick(e) { const t = e.target.closest('[data-isay]'); if (t) { this.s.isay[t.dataset.isay] = +t.dataset.i; this.set({}); } }
    onChange(e) { if (e.target.dataset.conv !== undefined) this.set({ conv: e.target.value }); }
  }
  register('isay-lab', Demo1);
})();
