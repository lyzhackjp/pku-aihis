/* 第十一周页面组件（三）：D15、D17、D18｜候选，未经教师确认｜2026-11-26（第一批） */
(() => {
  'use strict';
  const { esc, register, download } = window.Deck;
  const W = window.W11, { L, Mat, Through, Lab, needPack } = W;
  const S = window.W11_STATIC;
  let JIA = null; // 练习材料甲的 .docx（公开包 base64），解析一次
  const jia = async () => (JIA = JIA || await L.parseDocx(Mat.docx('jia_draft.docx')));

  /* ================= D15 脚注在 Word 里是什么 ================= */
  class Footnote extends Lab {
    defaults() { return { breakAfter: 6, style: 'ibid', restart: true, showField: false }; }
    render() {
      if (!JIA) { jia().then(() => this.render()); this.out('<p class="sub">正在解析练习材料甲的 Word 稿…</p>'); return; }
      const s = this.s;
      const notes = JIA.footnotes.map((n, i) => ({ ...n, doc_page: i < s.breakAfter ? 1 : 2, text: s.style === 'short' && /^同上/.test(n.text) ? S.shortGuo : n.text }));
      const r = L.noteRules(notes, { restart: s.restart, numFmt: JIA.settings.numFmt });
      const bad = new Set(r.issues.filter((x) => x.rule === 'ibid_first_on_page').map((x) => x.note_id));
      const page = (pg) => `<div class="w11-page"><b>第 ${pg} 页</b>${notes.map((n, i) => n.doc_page === pg ? `<p class="${bad.has(n.note_id) ? 'w11-bad' : ''}"><span class="mono">${esc(r.notes[i].label)}</span> ${esc(n.text)}${n.note_id === '6' || n.note_id === '7' ? ' <span class="sub">（郭卫东）</span>' : ''}</p>` : '').join('')}</div>`;
      this.out(`<div class="w11-two"><section><h4>规范一线 ${W.nat.stat}</h4><table class="items">${S.norms.map(([a, q, src]) => `<tr><td>${esc(a)}</td><td>${esc(q)}</td><td class="sub">${esc(src)}</td></tr>`).join('')}</table>
        <h4>Word 稿里的五件事（讲义图 11）</h4><table class="items">${S.word5.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}</table>
        <details><summary>域代码透视（示意）</summary><p class="sub">Zotero 插入的引文在 Word 里是一段可更新的域；Alt＋F9（Mac：Option＋F9）切换显示。下面是示意，不是实际文件内容。</p><pre class="srcbox">${esc(S.fieldCode)}</pre><p class="sub">切换引文样式时，显示文字变，域代码里的条目编号不变；断开链接只在副本上做。</p></details></section>
        <section><h4>跨页"同上"模拟 ${W.nat.calc}</h4>
        <p><label>分页线放在第 <input type="range" min="1" max="7" value="${s.breakAfter}" data-brk> <b>${s.breakAfter}</b> 条注之后</label></p>
        <p><b>样式</b> <label><input type="radio" name="fnstyle" value="ibid" ${s.style === 'ibid' ? 'checked' : ''}> 再次引证用"同上"</label> <label><input type="radio" name="fnstyle" value="short" ${s.style === 'short' ? 'checked' : ''}> 用简式（作者、题名、页码）</label>
          　<label><input type="checkbox" data-rs ${s.restart ? 'checked' : ''}> 每页重新编号</label></p>
        <div class="w11-pages">${page(1)}${page(2)}</div>
        <p>${r.issues.length ? r.issues.map((x) => `<span class="nil">注 ${esc(r.notes.find((n) => n.note_id === x.note_id).label)}：${esc(x.why)}</span>`).join('<br>') : '<span class="ok">note-rules 没有报问题。</span>'}</p>
        <p class="sub">练习材料甲的 Word 稿在注⑥后分页（文件中的 w:pageBreakBefore），编号格式 ${esc(JIA.settings.numFmt)}、${JIA.settings.numRestart === 'eachPage' ? '每页重新编号' : '连续编号'}。本页默认在第 6 条后分页。切换到连续编号，第 2 页首注是⑦；再把分页线移到第 7 条之后，两条郭卫东引文就同页了。郭卫东文第 33—35、38 页${Mat.pageImage('guo-2002', 38) ? '见 D17 原页面板' : '在本机材料包'}。</p>
        <details><summary>Mac Word 操作副本：同一条注怎样从⑥变为①</summary><p>2026 年 11 月 26 日，Mac 中文 Word 订阅版，教学构造的 C09 操作副本，第一页五条注。菜单栏“插入 → 脚注…”中更改编号后，第二页首注如下。</p>
          <figure><img class="w11-pageimg" loading="lazy" src="assets/word/step_5b_continuous_mac_word365.png" alt="第二页首条注采用连续编号，为⑥"><figcaption>连续编号：⑥</figcaption></figure>
          <figure><img class="w11-pageimg" loading="lazy" src="assets/word/step_5b_perpage_mac_word365.png" alt="第二页首条注采用每页重新编号，为①"><figcaption>每页重新编号：①</figcaption></figure>
          <p class="sub">两图记录 Word 的注号设置。另用本机 Zotero 7.0.32 所附 citeproc-js 1.4.61 排同一条目的相邻两引（33–35、38 页），《世界历史》样式给出“同上，第38页。”，Chicago Notes and Bibliography（第 18 版）给出作者、短题和页码。两种样式在 Word 翻页后的实际注文仍待核。</p></details>
        <p class="sub">${'《历史研究》现行做法据编辑部调整过的稿件格式归纳，非正式规定，以投稿时编辑部要求为准。'}</p></section></div>`);
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.brk !== undefined) this.set({ breakAfter: +t.value });
      if (t.name === 'fnstyle') this.set({ style: t.value });
      if (t.dataset.rs !== undefined) this.set({ restart: t.checked });
    }
  }
  register('footnote-lab', Footnote);

  /* ================= D17 逐条回原页（4.3 课堂练习） ================= */
  const COLS = [['page_ok', '页码对否'], ['quote_ok', '原话对否'], ['para_ok', '转述是否被原页支持'], ['transfer', '转引／体例']];
  const SRC = [['mao-history', '茅海建（一）学术史一节'], ['mao-conclusion', '茅海建（三）结论'], ['guo-2002', '郭卫东 2002'], ['liu-2005', '刘路生 2005']];
  class Check extends Lab {
    defaults() { return { rows: {}, assist: false, teacher: false, src: 'mao-history', page: '', t0: null }; }
    render() {
      if (!JIA) { jia().then(() => this.render()); this.out('<p class="sub">正在解析练习材料甲的 Word 稿…</p>'); return; }
      const s = this.s, rows = s.rows, nr = L.noteRules(JIA.footnotes, { numFmt: JIA.settings.numFmt });
      const draft = JIA.paragraphs.slice(1).map((p) => p.text).join('');
      const mao = [Mat.text('mao-history'), Mat.text('mao-conclusion')].filter(Boolean).join('\n');
      let assist = '';
      if (s.assist) {
        const qs = mao ? L.quoteCheckAll(draft, mao) : null, bs = mao ? L.borrowScan(draft, mao, { k: 12 }) : null;
        assist = `<div class="w11-assist"><h4>规则辅助 ${W.nat.calc}</h4><ul>${nr.issues.map((x) => `<li>注 ${esc(nr.notes.find((n) => n.note_id === x.note_id).label)}（第 ${JIA.footnotes.find((n) => n.note_id === x.note_id).doc_page} 页）：${esc(x.why)}${x.rule === 'no_page' ? '；也没有"转引"' : ''}</li>`).join('')}</ul>
          ${qs ? `<p><b>引号内逐字比对（茅文节录）</b>：相同 ${qs.filter((q) => q.status === 'exact').length} 处，节录中找不到 ${qs.filter((q) => q.status !== 'exact').length} 处（需回黄著与郭、刘二文）。</p><table class="items">${qs.map((q) => `<tr><td>${esc(q.quote)}</td><td>${q.status === 'exact' ? `第 ${esc(q.pages[0])} 页` : '<span class="nil">节录中无</span>'}</td></tr>`).join('')}</table>
          <p><b>引号外 ≥12 字相同</b>：${bs.fragments.map((f) => `${esc(f.text)}（${f.len} 字，第 ${esc(f.page)} 页）`).join('；')}</p>` : needPack('茅海建文两节节录')}
          <p class="nil"><b>第 2 页注②的转述错误，规则查不出</b>：注释格式完全正确，错在正文把刘路生说反了。只有读过原页的人能查。</p></div>`;
      }
      const img = Mat.pageImage(s.src, s.page), txt = Mat.text(s.src);
      const pages = txt ? [...txt.matchAll(/〔原刊第(\d+)页〕/g)].map((m) => m[1]) : [];
      const pageText = txt && s.page ? (txt.split(`〔原刊第${s.page}页〕`)[1] || '').split(/〔原刊第\d+页〕/)[0] : '';
      const T = Mat.teacher();
      const left = s.t0 ? Math.max(0, 600 - Math.floor((Date.now() - s.t0) / 1000)) : null;
      this.out(`<div class="w11-two w11-left"><section><h4>八条脚注（按 Word 稿分页）与注释核验表</h4>
        <table class="items w11-check"><tr><th>注</th><th>页</th><th>注文</th>${COLS.map(([, l]) => `<th>${l}</th>`).join('')}<th>理由／怎样改</th></tr>
        ${JIA.footnotes.map((n, i) => { const r = rows[n.note_id] || {}; return `<tr><td>${esc(nr.notes[i].label)}</td><td>${n.doc_page}</td><td class="sub">${esc(n.text)}</td>${COLS.map(([k]) => `<td><select data-ck="${n.note_id}|${k}">${['', '对', '有误', '存疑', '—'].map((v) => `<option ${r[k] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td>`).join('')}<td><input data-why="${n.note_id}" value="${esc(r.reason || '')}" size="18"></td></tr>`; }).join('')}</table>
        <p><button class="small" data-x="timer">${s.t0 ? '重新计时' : '开始计时（两人一组，十分钟）'}</button> ${left != null ? `<b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b>` : ''} <button class="small" data-x="assist">${s.assist ? '收起' : '打开'}规则辅助（讲评时）</button> <button class="small" data-x="send">送入贯穿记录（D18）</button>
          ${T ? `<label class="sub"><input type="checkbox" data-teacher ${s.teacher ? 'checked' : ''}> 教师模式：对照答案</label>` : '<span class="sub">（答案只在本机材料包的教师模式）</span>'}</p>
        <p class="sub">讲评顺序：${S.review43.map(esc).join(' → ')}。黄彰健书第 498 页：已核（教师 2026-11-26 提供原书；PDF 页序＝原书页码＋7）。</p>${assist}
        ${s.teacher && T ? `<details open><summary>4.3 答案（教师用，${esc(T.answers_source)}）</summary><pre class="srcbox">${esc(T.answers_43)}</pre></details>` : ''}</section>
        <section><h4>原页面板</h4><p>${SRC.map(([id, l]) => `<label><input type="radio" name="ck-src" value="${id}" ${s.src === id ? 'checked' : ''}> ${l}</label>`).join(' ')}</p>
        ${txt ? `<p>原刊页：${pages.map((p) => `<button class="small ${s.page === p ? 'on' : ''}" data-pg="${p}">${p}</button>`).join(' ')}</p>
          ${s.page ? (img ? `<img class="w11-pageimg" src="${img}" alt="${esc(s.src)} 原刊第 ${esc(s.page)} 页">` : '') + `<details ${img ? '' : 'open'}><summary>第 ${esc(s.page)} 页文字层${/guo|liu/.test(s.src) ? '（知网文字层，已去空白，标点位置可能错乱；以页面图像为准）' : ''}</summary><pre class="srcbox">${esc(pageText)}</pre></details>` : '<p class="sub">选一页。</p>'}
          <p class="sub">${esc(Mat.ident(Mat.entry(s.src)))}</p>` : needPack(SRC.find(([id]) => id === s.src)[1] + '（原刊页面与文字）')}</section></div>`);
      if (s.t0 && left > 0) { clearTimeout(this._tm); this._tm = setTimeout(() => this.isConnected && this.render(), 1000); }
    }
    onClick(e) {
      const x = e.target.dataset.x;
      if (x === 'timer') this.set({ t0: Date.now() });
      if (x === 'assist') this.set({ assist: !this.s.assist });
      if (e.target.dataset.pg) this.set({ page: e.target.dataset.pg });
      if (x === 'send') { for (const [id, r] of Object.entries(this.s.rows)) W.toRegister({ reg_id: 'D17-' + id, kind: 'note_check', target: id, proposer: { kind: 'author', name: null, run_id: null }, content: COLS.map(([k, l]) => `${l}：${r[k] || '未填'}`).join('；'), decision: /有误/.test(Object.values(r).join()) ? '成立' : '不成立', reason: r.reason || null, from_page: 'D17' }); }
    }
    onChange(e) {
      const t = e.target, s = this.s;
      if (t.dataset.ck) { const [id, k] = t.dataset.ck.split('|'); s.rows[id] = { ...(s.rows[id] || {}), [k]: t.value }; this.set({}, { redraw: false }); }
      if (t.dataset.why) { s.rows[t.dataset.why] = { ...(s.rows[t.dataset.why] || {}), reason: t.value }; this.set({}, { redraw: false }); }
      if (t.name === 'ck-src') this.set({ src: t.value, page: '' });
      if (t.dataset.teacher !== undefined) this.set({ teacher: t.checked });
    }
  }
  register('check-lab', Check);

  /* ================= D18 结语：使用说明与贯穿记录（贯穿页） ================= */
  const DEFAULT_DECL = { tool: '', developer: '', version: '', mode: '接口', web_search: false, reasoning: '', temperature: '', dates: '', stage: '', purpose: '', prompts_summary: '', products: '', attachments: [], checks: [] };
  class Closing extends Lab {
    get noShell() { return true; }
    defaults() { return { stage: 0, decl: DEFAULT_DECL }; }
    tables() {
      const T = Through.get();
      return [['matrix', '综述矩阵', 'D02', T.matrix.length], ['diagnosis', '诊断意见登记表', 'D06', T.register.filter((r) => r.kind === 'diagnosis').length], ['finding', '审读发现登记表', 'D07', T.register.filter((r) => r.kind === 'finding').length],
        ['edit', '修改对照表', 'D13、D14', T.edits.length], ['note_check', '注释核验表', 'D17', T.register.filter((r) => r.kind === 'note_check').length]];
    }
    render() {
      const s = this.s, T = Through.get(), tabs = this.tables(), d = s.decl;
      const stages = [...tabs.map(([, l, p, n]) => [l, p, n]), ['声明', 'D18', d.tool ? 1 : 0]];
      const view = (k) => {
        if (k === 'matrix') return T.matrix.map((r) => `<tr><td>${esc(r.scholar)}</td><td>${esc(r.claim || '')}</td><td>${esc(r.relation_to_my_question || '（尚未表态）')}</td></tr>`).join('');
        if (k === 'edit') return T.edits.map((r) => `<tr><td>${esc(r.location || r.para || '')}</td><td>${esc(r.removed ?? r.before)} → ${esc(r.added ?? r.after)}</td><td>${esc(r.proposer?.kind === 'model' ? '模型' : '作者')}｜${esc(r.intention || '未标')}｜${esc(r.decision || '—')}｜${esc(r.reason || '')}</td></tr>`).join('');
        return T.register.filter((r) => r.kind === k).map((r) => `<tr><td>${esc(r.target)}</td><td>${esc(r.content)}</td><td>${esc(r.decision || '—')}｜${esc(r.reason || '')}</td></tr>`).join('');
      };
      const cur = s.stage < tabs.length ? tabs[s.stage] : null;
      const avail = tabs.filter(([, , , n]) => n);
      const text = L.buildDeclaration(d).text;
      this.out(`<div class="w11-through"><aside><p><b>问题</b>：${esc(S.question)}</p>
        ${stages.map(([l, p, n], i) => `<button class="w11-stage ${s.stage === i ? 'on' : ''} ${n ? 'done' : ''}" data-stage="${i}">${i + 1} · ${esc(l)} <span class="sub">${esc(p)}｜${n}</span></button>`).join('')}
        <p><button class="small" data-x="json">导出 .json</button> <button class="small" data-x="csv">导出 .csv</button> <label class="pack-btn small">恢复<input type="file" accept=".json" data-restore hidden></label> <button class="small" data-x="clear">清空</button></p>
        <p class="sub">记录存在本浏览器；导出不含 Key。</p></aside>
        <main><p class="w11-copy">${esc(L.copyText('D18'))}</p>
        ${cur ? `<h4>${esc(cur[1])}（来自 ${esc(cur[2])}）</h4>${cur[3] ? `<table class="items">${view(cur[0])}</table>` : `<p class="sub">还没有记录。到 <a href="#${esc(cur[2].split('、')[0])}">${esc(cur[2])}</a> 填写后送入。</p>`}`
        : `<h4>人工智能使用情况说明（声明生成器）${W.nat.calc}</h4>
          <div class="w11-form">${[['tool', '工具'], ['developer', '开发者'], ['version', '版本／型号'], ['dates', '使用日期'], ['stage', '使用环节（哪一节、哪一步）'], ['purpose', '用于什么'], ['prompts_summary', '关键提示（摘要）'], ['products', '产出了什么']].map(([k, l]) => `<label>${l} <input data-d="${k}" value="${esc(d[k] || '')}" size="${k === 'prompts_summary' ? 40 : 18}"></label>`).join(' ')}
          <label>方式 <select data-d="mode">${['接口', '网页'].map((m) => `<option ${d.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label> <label><input type="checkbox" data-web ${d.web_search ? 'checked' : ''}> 联网</label> <label>推理强度 <input data-d="reasoning" value="${esc(d.reasoning || '')}" size="6"></label> <label>温度 <input data-d="temperature" value="${esc(d.temperature ?? '')}" size="5"></label></div>
          <p><b>核验</b> ${['引文逐字回原页', '转述回原页确认', '参考文献目录两头核对'].map((c) => `<label><input type="checkbox" data-chk="${c}" ${d.checks.includes(c) ? 'checked' : ''}> ${c}</label>`).join(' ')}</p>
          <p><b>附件</b>（默认不附；只勾模型贡献较大的部分）：${avail.length ? avail.map(([k, l]) => `<label><input type="checkbox" data-att="${l}" ${d.attachments.some((a) => a.label === l || a.label.endsWith('：' + l)) ? 'checked' : ''}> ${l}</label>`).join(' ') : '<span class="sub">（还没有可附的记录）</span>'}</p>
          <pre class="srcbox">${esc(text)}</pre><p><button class="small" data-x="copy">复制声明</button> <button class="small" data-x="sample">看讲义结语的示例（${W.nat.tc}，工具与日期为假设）</button></p>`}</main></div>`);
    }
    onClick(e) {
      const x = e.target.dataset.x, st = e.target.closest('[data-stage]'), d = this.s.decl;
      if (st) this.set({ stage: +st.dataset.stage });
      if (x === 'json') { download(`第十一周贯穿记录_${new Date().toISOString().slice(0, 10)}.json`, Through.export(), 'application/json'); }
      if (x === 'csv') { const T = Through.get(); const rows = [...T.register.map((r) => [r.kind, r.target, r.content, r.decision, r.reason]), ...T.edits.map((r) => ['edit', r.location || r.para, `${r.before} → ${r.after}`, r.decision, r.reason]), ...T.matrix.map((r) => ['matrix', r.scholar, r.claim, r.relation_to_my_question, ''])]; const c = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; download('第十一周五张表.csv', '﻿' + [['表', '对象', '内容', '处理', '理由'], ...rows].map((r) => r.map(c).join(',')).join('\n'), 'text/csv'); }
      if (x === 'clear' && confirm('清空本浏览器中的第十一周贯穿记录？（先导出备份）')) Through.clear();
      if (x === 'copy') navigator.clipboard?.writeText(L.buildDeclaration(d).text).then(() => W.toast('已复制声明'));
      if (x === 'sample') this.set({ decl: JSON.parse(JSON.stringify(window.W11_EXAMPLES['declaration'].declarations[1])) });
    }
    async onChange(e) {
      const t = e.target, d = this.s.decl;
      if (t.dataset.d) { d[t.dataset.d] = t.value; this.set({}, { redraw: t.tagName === 'SELECT' }); this.refreshText(); }
      if (t.dataset.web !== undefined) { d.web_search = t.checked; this.set({}); }
      if (t.dataset.chk) { d.checks = t.checked ? [...new Set([...d.checks, t.dataset.chk])] : d.checks.filter((c) => c !== t.dataset.chk); this.set({}); }
      if (t.dataset.att) { const i = this.tables().findIndex(([, l]) => l === t.dataset.att); const lab = t.dataset.att; d.attachments = t.checked ? [...d.attachments.filter((a) => a.label !== lab), { label: lab, from: this.tables()[i][2] }] : d.attachments.filter((a) => a.label !== lab); this.set({}); }
      if (t.dataset.restore !== undefined && t.files[0]) { const r = Through.import(await t.files[0].text()); W.toast(r.ok ? '已恢复贯穿记录' : '未恢复，原记录保留：' + r.error); t.value = ''; }
    }
    refreshText() { const pre = this.querySelector('main pre.srcbox'); if (pre) pre.textContent = L.buildDeclaration(this.s.decl).text; }
  }
  register('closing-lab', Closing);
})();
