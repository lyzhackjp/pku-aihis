/* 第十一周页面组件（四）：D03、D07、D09、D11、D14、D16、D20｜候选，未经教师确认｜2026-11-26（第二批） */
(() => {
  'use strict';
  const { esc, register, download } = window.Deck;
  const W = window.W11, { L, Mat, Through, Lab, needPack, answerCell, cardBox, sourceBox, runsFor } = W;
  const S = window.W11_STATIC, S2 = window.W11_STATIC2, EX = window.W11_EXAMPLES, PUB = window.W11_PUBLIC || {};
  const MARK = '〔原刊第(\\d+)页〕';
  const clone = (x) => JSON.parse(JSON.stringify(x));
  let JIA = null;
  const jia = async () => (JIA = JIA || await L.parseDocx(Mat.docx('jia_draft.docx')));
  const sel = (attr, val, opts, blank = '（未选）') => `<select ${attr}><option value="">${blank}</option>${opts.map(([k, z]) => `<option value="${esc(k)}" ${val === k ? 'selected' : ''}>${esc(z)}</option>`).join('')}</select>`;
  const firstQuote = (t) => (L.extractQuotes(t)[0] || {}).text || '';
  /* 在一段文字里标出若干短语（植入、规则命中）；phrases: [[text, cls, title]] */
  function markPhrases(text, phrases) {
    const spans = [];
    for (const [p, cls, title] of phrases) { if (!p) continue; let i = text.indexOf(p); while (i >= 0) { if (!spans.some(([a, b]) => i < b && i + p.length > a)) spans.push([i, i + p.length, cls, title]); i = text.indexOf(p, i + p.length); } }
    return W.spanMark(text, spans.sort((a, b) => a[0] - b[0]));
  }

  /* ================= D03 哪些格子能交给模型 ================= */
  class Cells extends Lab {
    defaults() { return { bins: {}, q: '', qsrc: 'mao-conclusion', same: {} }; }
    get activeStep() { const n = Object.keys(this.s.bins).length; return n < S2.cols.length ? 0 : 1; }
    render() {
      const s = this.s, placed = S2.cols.filter((c) => s.bins[c.col]).length, right = S2.cols.filter((c) => s.bins[c.col] === c.bin).length;
      const binName = Object.fromEntries(S2.bins);
      const src = Mat.text(s.qsrc), qc = s.q && src ? L.quoteCheck(s.q, src, { marker: /〔原刊第(\d+)页〕/g }) : null;
      const pairs = ['deepseek', 'kimi'].map((p) => { const rs = runsFor('R1', p); return { p, rs, q1: rs[0] ? firstQuote(rs[0].reply) : null, q2: rs[1] ? firstQuote(rs[1].reply) : null }; });
      const cells = pairs.filter((x) => x.rs.length >= 2).map((x) => ({ value_same: s.same[x.p] == null ? null : s.same[x.p] === 'y', q1: x.q1, q2: x.q2 }));
      const cs = L.consistency(cells);
      this.out(`<h4>一　把八列放进四栏 ${W.nat.calc}</h4>
        <table class="items w11-bins"><tr><th>列</th><th>放进哪一栏</th><th>对照讲义图 2</th></tr>
        ${S2.cols.map((c) => { const v = s.bins[c.col]; return `<tr><td><b>${esc(c.col)}</b></td><td>${sel(`data-bin="${esc(c.col)}"`, v, S2.bins)}</td><td>${v ? (v === c.bin ? `<span class="ok">✓</span> ${esc(c.nature)}；怎样核：${esc(c.check)}` : `<span class="nil">✗ 讲义放在"${esc(binName[c.bin])}"</span>：${esc(c.nature)}`) : '<span class="sub">—</span>'}</td></tr>`; }).join('')}</table>
        <p class="sub">已放 ${placed}/${S2.cols.length}，与讲义图 2 相同 ${right} 列。讲义的分法据两项研究归纳；"回应对象"一行另据上一讲演示③的课前记录。</p>
        <h4>二　两项研究 ${W.nat.stat}</h4>
        ${placed < S2.cols.length ? '<p class="sub">八列都放好后显示两项研究的数字。</p>' : `<div class="w9-cols">${S2.studies13.map((st) => `<section class="w9-col"><b>${esc(st.id)}</b><p class="sub">${esc(st.what)}；${esc(st.cite)}</p><table class="items">${st.nums.map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table></section>`).join('')}</div>
          <p class="sub">两项都不是以史学论著为对象；本课未找到评测模型为史学文献填综述矩阵的研究（讲义 1.2）。官方测"值对不对"，独立研究还测"凭什么"能不能重现。</p>`}
        <h4>三　每格附原文短引：机械比对 ${W.nat.calc}</h4>
        <p>把模型给"主张"一格附的短引贴进来，页面拿回原文逐字比对，并报出所在原刊页。<label>原文 ${sel('data-qsrc', s.qsrc, [['mao-conclusion', '茅海建（三）结论一节'], ['mao-history', '茅海建（一）学术史一节']], '（选原文）')}</label></p>
        <p><input data-q value="${esc(s.q)}" size="48" placeholder="例：大大加剧了政变的激烈程度"> </p>
        ${!src ? needPack('茅海建文两节节录') : qc ? `<p>${W.nat.calc} ${esc(L.QUOTE_STATUS_ZH[qc.status])}${qc.pages.length ? `；在原刊第 ${qc.pages.map(esc).join('、')} 页` : ''}${qc.missed.length ? `；未核上：${qc.missed.map((m) => esc(m.text)).join('、')}` : ''}。核得上，只说明"这句话在原文里"；概括是否说满，要人读。</p>` : '<p class="sub">输入短引后自动比对。</p>'}
        <details><summary>四　进阶：同一格问两次（重现性，案例 C-02）</summary>${cardBox('R1')}
          <div class="w9-cols">${pairs.map((x) => `<section class="w9-col">${answerCell('R1', x.p).html}
            ${x.rs.length >= 2 ? `<p class="sub">第 1 次短引：${esc(x.q1 || '（无引号）')}<br>第 2 次短引：${esc(x.q2 || '（无引号）')}</p><label>两次的"值"（主张）相同吗？${sel(`data-same="${x.p}"`, s.same[x.p], [['y', '相同'], ['n', '不同']], '（判断）')}</label>` : '<p class="sub">同一服务有两次运行后，在这里并排比较。</p>'}</section>`).join('')}</div>
          <p>${W.nat.calc} ${cells.length ? `值一致 ${cs.n_value ? W.pct(cs.value) : '—'}（${cs.n_value} 格，人判）；引文一致 ${cs.n_quote ? W.pct(cs.quote) : '—'}（${cs.n_quote} 格，去空白与引号后逐字比）。` : '待课前运行（R1 为可选运行，每家两次）。'} 一致率＝两次相同的格数／格数，值与引文分开算。Lagisz 等：值约九成一致，引文 46%。</p></details>`);
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.bin) { this.s.bins[t.dataset.bin] = t.value || undefined; if (!t.value) delete this.s.bins[t.dataset.bin]; this.set({}); }
      if (t.dataset.qsrc !== undefined) this.set({ qsrc: t.value || 'mao-conclusion' });
      if (t.dataset.same) { this.s.same[t.dataset.same] = t.value || null; this.set({}); }
    }
    onInput(e) { if (e.target.dataset.q !== undefined) { this.s.q = e.target.value; clearTimeout(this._t); this._t = setTimeout(() => this.set({}), 400); } }
  }
  register('cells-lab', Cells);

  /* ================= D07 深度审读（演示②′） ================= */
  const IMP = () => EX['implants-findings.toy'].implants;
  const MATCH = () => [...IMP().map((i) => [i.error_id, `${i.error_id} ${i.category}：${i.after}`]), ...S2.d15Issues.map((q) => [q.id, `${q.id} D15 已知归属问题（第 ${q.page} 页）`]), ['other', '其他问题'], ['interp', '解释分歧（不是错误）']];
  class Review extends Lab {
    defaults() { return { findings: [], toy: false, form: {} }; }
    runIds() { return ['deepseek', 'kimi'].flatMap((p) => runsFor('D2P', p).map((r) => [r.run_id, `${W.PRESET_LABEL[p]}｜${r.run_id}`])); }
    render() {
      const s = this.s, text = Mat.text('li2023-p156-159'), ids = this.runIds();
      const marked = text ? markPhrases(text, IMP().map((i) => [i.before, 'w11-imp', `${i.error_id}：植入时改作"${i.after}"`])).replace(/〔原刊第(\d+)页〕/g, '<span class="w11-pg">第 $1 页</span>') : '';
      const fs = s.findings, toy = EX['implants-findings.toy'];
      const real = L.recallPool({ implants: IMP(), findings: fs.filter((f) => f.decision === '成立').map((f) => ({ ...f, matched: IMP().some((i) => i.error_id === f.error_id) ? 1 : 0 })), runs: ids.map(([id]) => id) });
      const toyR = s.toy ? L.recallPool(toy) : null;
      const d15hit = S2.d15Issues.map((q) => [q.id, fs.filter((f) => f.error_id === q.id).length]);
      this.out(`<div class="w11-two"><section><h4>论文副本（第 156—159 页）${W.nat.tc}</h4>
        <p class="sub">黄底为讲义 2.3 的三处植入位置（悬停看改成什么）：E1 换发言人、E2 改院别、E3 删限定。原文据刊本 PDF 文字层；送模型的植入副本只在本机材料包（条件卡 D2P）。</p>
        ${text ? `<div class="srcbox w11-paper">${marked}</div>` : '<p class="nil">公开包缺少论文原文（li2023-p156-159）。</p>'}
        <details><summary>所引会议录 3 则（发言番号定位）</summary><p class="sub">${esc(S2.liCitesNote)}</p>${['d15-A', 'd15-B', 'd15-C'].map((id) => sourceBox(id)).join('')}</details></section>
        <section><h4>两家各三次的发现</h4>${cardBox('D2P')}${['deepseek', 'kimi'].map((p) => answerCell('D2P', p).html).join('')}</section></div>
        <h4>逐条裁决（审读发现登记表）</h4>
        <p class="sub">从上面的回答里摘一条发现，选它对上了哪一处植入或 D15 的哪一处归属问题，再写裁决与理由；存疑的写明要回哪一份原件。裁决的标准是原文，不是"几家都这么说"。</p>
        <table class="items"><tr><th>运行</th><th>发现（摘录）</th><th>对上了</th><th>裁决</th><th>理由</th><th>要回的原件</th><th></th></tr>
        ${fs.map((f, i) => `<tr><td class="sub">${esc(f.run_id)}</td><td>${esc(f.finding_text)}</td><td>${sel(`data-fm="${i}"`, f.error_id, MATCH())}</td><td>${sel(`data-fd="${i}"`, f.decision, [['成立', '成立'], ['不成立', '不成立'], ['存疑', '存疑']])}</td><td><input data-fr="${i}" value="${esc(f.adjudication_note || '')}" size="18"></td><td><input data-fs="${i}" value="${esc(f.source_needed || '')}" size="12"></td><td><button class="small" data-del="${i}">删</button></td></tr>`).join('')}
        <tr><td>${ids.length ? sel('data-new="run"', s.form.run, ids, '（选运行）') : '<span class="sub">（暂无运行记录）</span>'}</td><td><input data-new="text" value="${esc(s.form.text || '')}" size="30" placeholder="摘一条发现"></td><td>${sel('data-new="err"', s.form.err, MATCH())}</td><td colspan="4"><button class="small" data-x="add" ${ids.length ? '' : 'disabled'}>加入</button> <button class="small" data-x="send" ${fs.length ? '' : 'disabled'}>送入贯穿记录（D18）</button></td></tr></table>
        <div class="w11-two"><section><h4>召回率 ${W.nat.calc}</h4>
          ${ids.length ? `<table class="items"><tr><th>运行</th><th>查出的植入</th><th>召回率</th></tr>${Object.entries(real.perRun).map(([r, v]) => `<tr><td class="sub">${esc(r)}</td><td>${v.hits.join('、') || '—'}</td><td>${W.frac(v.hits.length, real.N)}</td></tr>`).join('')}</table><p>合并召回率 <b>${W.frac(real.union.length, real.N)}</b>（${real.union.join('、') || '无'}）。只计裁决为"成立"且对上植入的发现。</p>`
            : `<p class="w11-pending">待课前运行（D2P，两家各三次）。召回率＝查出的植入数／3；合并召回率＝几次运行查出的并集／3。</p>`}
          <p><button class="small" data-x="toy">${s.toy ? '收起' : '先看计数办法：'}甲二小例（教学构造的假设数字）</button></p>
          ${toyR ? `<table class="items"><tr><th>运行（假设）</th><th>查出</th><th>召回率</th></tr>${Object.entries(toyR.perRun).map(([r, v]) => `<tr><td>${esc(r)}</td><td>${v.hits.join('、')}</td><td>${W.frac(v.hits.length, toyR.N)}</td></tr>`).join('')}</table><p>${W.nat.tc} 单次 1/3—2/3，合并 ${W.frac(toyR.union.length, toyR.N)}；E3（删限定）六次都没查出。完整讲解见 D08（进阶，第三批）。</p>` : ''}</section>
        <section><h4>另看两件事</h4><p><b>D15 已发现的三处归属问题</b>（教师尚未回速记录裁决，C-02，这里只作"发现"）：</p><ul>${S2.d15Issues.map((q) => `<li>${esc(q.id)}（第 ${q.page} 页）${esc(q.text)}<span class="sub">　本页记到 ${d15hit.find((x) => x[0] === q.id)[1]} 条</span></li>`).join('')}</ul>
          <p><b>有没有把解释分歧报成错误</b>：记为"解释分歧"的 ${fs.filter((f) => f.error_id === 'interp').length} 条。</p>
          <p class="sub">E3 把"少数议员"改成"议员们普遍"，史料包只收 3 则，原文里没有一句话与它直接矛盾：这一类属于"删去的信息"，最难查（讲义 2.3；Litvak 2026 未被任何系统查出的 7 处全是这一类）。</p></section></div>`);
    }
    onClick(e) {
      const x = e.target.dataset.x, fs = this.s.findings;
      if (e.target.dataset.del) { fs.splice(+e.target.dataset.del, 1); this.set({}); return; }
      if (x === 'toy') this.set({ toy: !this.s.toy });
      if (x === 'add') { const f = this.s.form; if (!f.run || !(f.text || '').trim()) { W.toast('先选运行、摘一条发现'); return; } fs.push({ run_id: f.run, system: f.run.split('_')[1] || '', finding_text: f.text.trim(), unit_id: null, error_id: f.err || null, matched: null, decision: null, adjudication_note: '', source_needed: '' }); this.set({ form: {} }); }
      if (x === 'send') {
        for (const [i, f] of fs.entries()) {
          const id = `D07-${f.run_id}-${i}`;
          Through.add('findings', { ...f, finding_id: id, matched: IMP().some((m) => m.error_id === f.error_id) && f.decision === '成立' ? 1 : 0 }, 'finding_id');
          W.toRegister({ reg_id: id, kind: 'finding', from_page: 'D07', target: f.error_id || '', proposer: { kind: 'model', name: f.run_id, run_id: f.run_id }, content: f.finding_text, decision: f.decision, reason: f.adjudication_note, source_needed: f.source_needed || null });
        }
      }
    }
    onChange(e) {
      const t = e.target, fs = this.s.findings;
      if (t.dataset.new) { this.s.form[t.dataset.new === 'err' ? 'err' : t.dataset.new] = t.value; this.set({}, { redraw: t.dataset.new !== 'text' }); }
      if (t.dataset.fm) { fs[+t.dataset.fm].error_id = t.value || null; this.set({}); }
      if (t.dataset.fd) { fs[+t.dataset.fd].decision = t.value || null; this.set({}); }
      if (t.dataset.fr) { fs[+t.dataset.fr].adjudication_note = t.value; this.set({}, { redraw: false }); }
      if (t.dataset.fs) { fs[+t.dataset.fs].source_needed = t.value; this.set({}, { redraw: false }); }
    }
  }
  register('review-lab', Review);

  /* ================= D09 史学深度审读流水线 ================= */
  class Pipeline extends Lab {
    defaults() { return { src: 'jia', implants: [], ran: false, own: '', ownSrc: '', form: { cat: '归属' } }; }
    base() {
      const s = this.s;
      if (s.src === 'jia') return JIA ? JIA.paragraphs.slice(1).map((p) => p.text).join('\n') : '';
      if (s.src === 'li') return Mat.text('li2023-p156-159');
      return s.own;
    }
    rules(text) {
      const s = this.s, out = { list: [], unchecked: [], need: null };
      if (s.src === 'li') {
        const entries = Object.fromEntries(['d15-A', 'd15-B', 'd15-C'].map((id) => [id, { text: Mat.text(id), house: S2.houses[id] }]));
        const r = L.speakerRules(text, { roster: S2.roster, cites: S2.liCites, entries });
        out.list = r.flags.map((f) => ({ key: `${f.rule}|${f.name}|${f.entry}|${f.sentence}`, rule: f.rule, text: f.text, what: `${f.rule}：${f.name}（第 ${f.page} 页 → ${f.entry}${f.expected ? '，原文为' + f.expected : ''}）` }));
        out.unchecked = r.unchecked; out.checked = r.checked.length;
        if (r.unchecked.length) out.need = '会议录 3 则（第十周 D15 史料包）';
        return out;
      }
      const src = s.src === 'jia' ? [Mat.text('mao-history'), Mat.text('mao-conclusion')].filter(Boolean).join('\n') : s.ownSrc;
      if (!src) { out.need = s.src === 'jia' ? '茅海建文两节节录' : '原文（贴在下方）'; }
      else {
        for (const q of L.quoteCheckAll(text, src, { marker: /〔原刊第(\d+)页〕/g })) out.list.push({ key: `q|${q.quote}|${q.status}`, rule: '引号内逐字比对', text: q.quote, what: q.status === 'exact' ? `相同（第 ${q.pages[0]} 页）：${q.quote}` : `原文中找不到或不全同：${q.quote}`, ok: q.status === 'exact' });
        for (const f of L.borrowScan(text, src, { k: 12 }).fragments) out.list.push({ key: `b|${f.text}`, rule: '引号外照抄 ≥12 字', text: f.text, what: `${f.text}（${f.len} 字，第 ${f.page} 页）` });
      }
      if (s.src === 'jia' && JIA) { const nr = L.noteRules(JIA.footnotes, { numFmt: JIA.settings.numFmt }); for (const x of nr.issues) out.list.push({ key: `n|${x.note_id}|${x.rule}`, rule: '注释体例', text: '', what: `注 ${nr.notes.find((n) => n.note_id === x.note_id).label}：${x.why}` }); }
      return out;
    }
    render() {
      if (this.s.src === 'jia' && !JIA) { jia().then(() => this.render()); this.out('<p class="sub">正在解析练习材料甲的 Word 稿…</p>'); return; }
      const s = this.s, base = this.base(), ap = L.applyImplants(base, s.implants), text = ap.text;
      const r0 = s.ran ? this.rules(base) : null, r1 = s.ran ? this.rules(text) : null;
      const k0 = new Set((r0?.list || []).filter((f) => !f.ok).map((f) => f.key));
      const fresh = (r1?.list || []).filter((f) => !f.ok && !k0.has(f.key));
      const det = s.implants.map((im) => ({ ...im, hit: fresh.some((f) => (f.text && (f.text.includes(im.after) || im.after.includes(f.text))) || (f.what || '').includes(im.after)) }));
      const nHit = det.filter((d) => d.hit).length;
      const hl = markPhrases(text, [...s.implants.map((i) => [i.after, 'w11-imp', `${i.error_id} ${i.category}（原为"${i.before}"）`]), ...(r1?.list || []).filter((f) => f.text && !f.ok).map((f) => [f.text, 'w11-hit', f.what])]);
      this.out(`<p><b>材料</b> ${[['jia', '练习材料甲＋茅文节录（中文，原文齐备）'], ['li', '教师 2023 年论文第 156—159 页＋会议录 3 则（日文史料）'], ['own', '自己的论文（贴入）']].map(([k, z]) => `<label><input type="radio" name="pisrc" value="${k}" ${s.src === k ? 'checked' : ''}> ${z}</label>`).join(' ')}</p>
        ${s.src === 'own' ? `<div class="w11-two"><label>论文一段（引文用"…"）<textarea data-own rows="5">${esc(s.own)}</textarea></label><label>所引原文（可含〔原刊第×页〕）<textarea data-ownsrc rows="5">${esc(s.ownSrc)}</textarea></label></div>` : ''}
        <div class="w11-two"><section><h4>一　单元与原文 ${s.implants.length ? `<span class="w9-badge teaching-construct">已植入 ${s.implants.length} 处</span>` : ''}</h4>
          <div class="srcbox w11-paper">${!base ? '<span class="nil">缺材料。</span>' : hl.replace(/〔原刊第(\d+)页〕/g, '<span class="w11-pg">第 $1 页</span>').replace(/\n/g, '<br>')}</div>
          ${s.src === 'li' ? `<p class="sub">${esc(S2.liCitesNote)}　${esc(S2.rosterNote)} 论文引的是中译，不做逐字比对；规则只核"发言人在不在所注原文里""院别与原文是否一致"。</p>` : ''}</section>
        <section><h4>二　确定性检查 ${W.nat.calc}</h4><p><button class="small" data-x="run">${s.ran ? '重新运行规则' : '运行规则'}</button></p>
          ${r1 ? `${r1.need ? needPack(r1.need) : ''}${r1.unchecked.length ? `<p class="nil">原文不在手：${[...new Set(r1.unchecked.map((u) => `第 ${u.page} 页 → ${u.entry}`))].join('；')}，标"无法核"（第三步）。</p>` : ''}
            <ul class="w11-rules">${r1.list.map((f) => `<li class="${f.ok ? 'sub' : ''} ${fresh.includes(f) ? 'w11-new' : ''}"><b>${esc(f.rule)}</b>　${esc(f.what)}${fresh.includes(f) ? ' <span class="w9-badge calc">植入后新出</span>' : ''}</li>`).join('') || '<li class="sub">没有命中。</li>'}</ul>
            ${s.src === 'li' && r1.checked ? `<p class="sub">核了 ${r1.checked} 句带会议录注的句子。D15 已知的三处归属问题（Q1—Q3），规则一处也查不出：人名都在原文里，错的是"谁说的、在什么语境下说的"。</p>` : ''}
            ${s.src === 'jia' && !r1.need ? '<p class="sub">对照扩充部分乙一：引号内相同 5 处、找不到 5 处；引号外 4 处；第 2 页首条注"同上"。第 5 段把刘路生说反了，规则查不出。</p>' : ''}` : '<p class="sub">点"运行规则"。规则的结果每次都一样，可以逐条复查。</p>'}</section></div>
        <h4>六　植入错误自测 ${W.nat.calc}</h4>
        <p class="sub">在副本里植入几处已知错误，重跑规则，看哪几处被查出。植入什么比植入多少更要紧（五类见扩充部分乙一第六步）。</p>
        <p><button class="small" data-x="demo1">示范一：只植入一处"${esc(S2.implantDemos[s.src === 'li' ? 'li' : 'jia'][0].category)}"</button> <button class="small" data-x="demo2">示范二：再植入一处"${esc(S2.implantDemos[s.src === 'li' ? 'li' : 'jia'][1].category)}"</button> <button class="small" data-x="clear">撤销全部植入</button></p>
        <p>原文片段 <input data-f="before" value="${esc(s.form.before || '')}" size="18"> 改为 <input data-f="after" value="${esc(s.form.after || '')}" size="18"> 类型 ${sel('data-f="cat"', s.form.cat, S2.implantTypes.map(([k, z]) => [k, `${k}：${z}`]), '（类型）')} <button class="small" data-x="add">植入</button></p>
        ${ap.applied.filter((a) => !a.ok).map((a) => `<p class="nil">${esc(a.error_id)}：${esc(a.reason)}</p>`).join('')}
        ${det.length ? `<table class="items"><tr><th>植入</th><th>类型</th><th>改前 → 改后</th><th>规则查出了吗</th></tr>${det.map((d) => `<tr><td>${esc(d.error_id)}</td><td>${esc(d.category)}</td><td><del>${esc(d.before)}</del> → <ins>${esc(d.after)}</ins></td><td>${!s.ran ? '（未运行）' : r1.need && !r1.list.length ? '无法核（原文不在手）' : d.hit ? '<b class="ok">查出</b>' : '<span class="nil">没有</span>'}</td></tr>`).join('')}</table>
          <p>${W.nat.calc} 规则召回率 ${s.ran ? W.frac(nHit, det.length) : '—'}。模型对照：讲义的三处植入见 D07（D2P 预存回放，${runsFor('D2P', 'deepseek').length + runsFor('D2P', 'kimi').length ? '已有记录' : '待课前运行'}）；自选植入要另跑。</p>` : ''}`);
    }
    onClick(e) {
      const x = e.target.dataset.x, s = this.s, demos = S2.implantDemos[s.src === 'li' ? 'li' : 'jia'];
      if (x === 'run') this.set({ ran: true });
      if (x === 'demo1') this.set({ implants: [clone(demos[0])], ran: true });
      if (x === 'demo2') this.set({ implants: [clone(demos[0]), clone(demos[1])], ran: true });
      if (x === 'clear') this.set({ implants: [] });
      if (x === 'add') { const f = s.form; if (!f.before || !f.after) { W.toast('填原文片段与改后文字'); return; } s.implants.push({ error_id: 'U' + (s.implants.length + 1), category: f.cat || '归属', before: f.before, after: f.after, location: '' }); this.set({ form: { cat: f.cat } }); }
    }
    onChange(e) {
      const t = e.target;
      if (t.name === 'pisrc') this.set({ src: t.value, implants: [], ran: false });
      if (t.dataset.f) { this.s.form[t.dataset.f] = t.value; this.set({}, { redraw: false }); }
      if (t.dataset.own !== undefined) this.set({ own: t.value });
      if (t.dataset.ownsrc !== undefined) this.set({ ownSrc: t.value });
    }
  }
  register('pipeline-lab', Pipeline);

  /* ================= D11 文风：润色到哪里为止 ================= */
  class Style extends Lab {
    defaults() { return { src: 'li', run: '', own: '', ownRev: '', paste: '', rules: clone(S2.styleRules), off: {}, marks: {}, nr: { name: '', pattern: '' }, ex: { y3: { a: 30, b: 100000 }, y2: { a: 40, b: 100000 }, y: { a: 1100, b: 100000 } } }; }
    pair() {
      const s = this.s;
      if (s.src === 'own') return { original: s.own, revised: s.ownRev, from: '自己的段落对' };
      if (s.src === 'toy') { const p = EX['style.toy'].pairs[0]; return { original: p.original, revised: p.revised, from: '计数示例（教学构造）' }; }
      const id = s.src === 'li' ? 'li2023-p152-153' : 'jia-p3';
      const original = Mat.text(id).replace(/〔原刊第\d+页〕/g, '');
      const all = ['deepseek', 'kimi'].flatMap((p) => runsFor('S1', p).map((r) => ({ ...r, p })));
      const run = all.find((r) => r.run_id === s.run) || all[0];
      return { original, revised: s.paste || (s.src === 'li' && run ? run.reply : ''), from: s.paste ? '粘贴的润色稿（网页版或其他工具）' : run ? `${W.PRESET_LABEL[run.p]}｜${run.run_id}` : '', runs: all };
    }
    render() {
      const s = this.s, pr = this.pair(), rules = s.rules.filter((r) => !s.off[r.rule_id]);
      const d = pr.original && pr.revised ? L.styleDiff(pr.original, pr.revised, rules) : null;
      const b = d ? L.boundsCheck(pr.original, pr.revised) : null;
      const ops = d ? L.charDiff(pr.original, pr.revised) : [];
      const left = ops.map((o) => o.tag === 'equal' ? esc(o.a) : o.a ? `<del>${esc(o.a)}</del>` : '').join(''), right = ops.map((o) => o.tag === 'equal' ? esc(o.b) : o.b ? `<ins>${esc(o.b)}</ins>` : '').join('');
      const ch = ops.filter((o) => o.tag !== 'equal');
      const ex = L.excessWord(s.ex.y3, s.ex.y2, s.ex.y);
      const num = (k, f) => `<input type="number" data-ex="${k}|${f}" value="${s.ex[k][f]}" style="width:7em">`;
      this.out(`<p><b>段落</b> ${[['li', '教师 2023 年论文第 152—153 页（文风演示）'], ['jia', '练习材料甲第 3 段（对照）'], ['own', '自己的一段'], ['toy', '计数示例']].map(([k, z]) => `<label><input type="radio" name="stsrc" value="${k}" ${s.src === k ? 'checked' : ''}> ${z}</label>`).join(' ')}</p>
        ${s.src === 'own' ? `<div class="w11-two"><label>原段<textarea data-own rows="4">${esc(s.own)}</textarea></label><label>润色稿<textarea data-ownrev rows="4">${esc(s.ownRev)}</textarea></label></div>` : ''}
        ${s.src === 'li' || s.src === 'jia' ? `<details ${pr.revised ? '' : 'open'}><summary>润色稿来源：${esc(pr.from || '尚无')}</summary>${s.src === 'li' ? `${cardBox('S1')}<div class="w9-cols">${['deepseek', 'kimi'].map((p) => `<section class="w9-col">${answerCell('S1', p).html}</section>`).join('')}</div>${(pr.runs || []).length > 1 ? `<p>比对哪一次：${sel('data-run', s.run, pr.runs.map((r) => [r.run_id, `${W.PRESET_LABEL[r.p]}｜${r.run_id}`]), '（第一条）')}</p>` : ''}` : '<p class="sub">练习材料甲第 3 段的润色稿需另跑（建议并入 S1，见课前运行清单）。</p>'}
          <p><label>或粘贴一份润色稿（网页版等；只存本浏览器）<textarea data-paste rows="3">${esc(s.paste)}</textarea></label></p>
          ${s.src === 'li' ? `<details><summary>"只列问题"（S2）</summary>${cardBox('S2')}${['deepseek', 'kimi'].map((p) => answerCell('S2', p).html).join('')}</details>` : ''}</details>` : ''}
        ${!pr.original ? '<p class="nil">缺原段。</p>' : !pr.revised ? `<div class="srcbox">${esc(pr.original)}</div><p class="w11-pending">待课前运行（S1：两家各两次）。有了润色稿，这里显示两栏差异、计数与越界处；这里不放构造的润色稿。</p>` : `
        <div class="w11-two"><section><h4>原段</h4><div class="srcbox w11-diff">${left}</div></section><section><h4>润色稿 <span class="sub">${esc(pr.from)}</span></h4><div class="srcbox w11-diff">${right}</div></section></div>
        <div class="w11-two"><section><h4>四条界线 ${W.nat.calc}</h4>
          <table class="items">${S2.bounds.map(([k, what]) => `<tr><td><b>${esc(k)}</b></td><td class="sub">${esc(what)}</td></tr>`).join('')}</table>
          <ul><li>限定语减少：${b.lostHedges.map((h) => `"${esc(h.word)}" ${h.before}→${h.after}`).join('；') || '无'}</li><li>引号词语减少（不碰原文）：${b.lostQuotes.map((q) => `“${esc(q.term)}” ${q.before}→${q.after}`).join('；') || '无'}</li><li>泛化归属新增（泛称＋注意到、认为等）：${b.newGeneric.map((g) => `"${esc(g.word)}" ${g.before}→${g.after}`).join('；') || '无'}</li></ul>
          <p class="sub">规则只能提示；"改了意思"要回原段逐处读。讲义要看的三处：有保留的判断（"有过度强调……之虞""试图"）是否被改强；"国体"与引号是否被改动；"大谷注意到""大谷试图"一类归属是否被泛化。</p></section>
        <section><h4>规则计数（每百字）${W.nat.calc}</h4><table class="items"><tr><th></th><th>现象</th><th>原段</th><th>润色稿</th><th>差</th></tr>
          ${s.rules.map((r) => { const on = !s.off[r.rule_id], o = d.original.counts[r.rule_id], v = d.revised.counts[r.rule_id]; return `<tr><td><input type="checkbox" data-rule="${esc(r.rule_id)}" ${on ? 'checked' : ''}></td><td title="${esc(r.pattern)}">${esc(r.name)}<span class="sub">　${esc(r.note || '')}</span></td>${on ? `<td>${o.n}（${o.per100.toFixed(2)}）</td><td>${v.n}（${v.per100.toFixed(2)}）</td><td class="${d.delta[r.rule_id] > 0.2 ? 'nil' : ''}">${d.delta[r.rule_id] >= 0 ? '+' : ''}${d.delta[r.rule_id].toFixed(2)}</td>` : '<td colspan="3" class="sub">未计</td>'}</tr>`; }).join('')}</table>
          <p>新增一项：<input data-nr="name" value="${esc(s.nr.name)}" size="8" placeholder="如：笔者以为"> 词表（用 | 分隔）<input data-nr="pattern" value="${esc(s.nr.pattern)}" size="14"> <button class="small" data-x="addrule">加入</button></p>
          <p class="sub">原段 ${d.original.chars} 字，润色稿 ${d.revised.chars} 字。这些只是个人自查的办法，不能用来判断别人的文字是否出自模型（扩充部分甲四）。</p></section></div>
        <h4>逐处标出（${ch.length} 处改动）</h4><table class="items"><tr><th>改前</th><th>改后</th><th>越界了吗</th></tr>${ch.map((o, i) => `<tr><td><del>${esc(o.a)}</del></td><td><ins>${esc(o.b)}</ins></td><td>${sel(`data-mk="${i}"`, s.marks[i], [['ok', '没越界（文风）'], ['meaning', '改了意思'], ['source', '碰了原文'], ['stance', '替我选了立场']])}</td></tr>`).join('')}</table>
        <p>${W.nat.calc} 越界 ${Object.values(s.marks).filter((v) => v && v !== 'ok').length} 处：${[['meaning', '改了意思'], ['source', '碰了原文'], ['stance', '替我选了立场']].map(([k, z]) => `${z} ${Object.values(s.marks).filter((v) => v === k).length}`).join('，')}。</p>`}
        <details><summary>进阶：超额词计算器（Kobak 等 2025；示例数字为示意）</summary>
          <p>p＝(a＋1)/(b＋1)；q＝p₋₂＋2·max{p₋₂－p₋₃, 0}；δ＝p－q；r＝p/q。</p>
          <table class="items"><tr><th></th><th>含此词的篇数 a</th><th>总篇数 b</th><th>p</th></tr>${[['y3', '2021（p₋₃）'], ['y2', '2022（p₋₂）'], ['y', '2024（p）']].map(([k, z]) => `<tr><td>${z}</td><td>${num(k, 'a')}</td><td>${num(k, 'b')}</td><td>${(k === 'y3' ? ex.pm3 : k === 'y2' ? ex.pm2 : ex.p).toExponential(3)}</td></tr>`).join('')}</table>
          <p>${W.nat.calc} q＝${ex.q.toExponential(3)}${ex.maxActive ? '（max 一项生效：2022 高于 2021，按增幅外推）' : '（max 一项为 0：2022 不高于 2021，q 取 2022 的水平，结果偏保守）'}；δ＝${ex.delta.toExponential(3)}；r＝${ex.r.toFixed(2)}。Kobak 等报告的罕用超额词如 delves r＝28.0；常用词看 δ，罕用词看 r。</p></details>`);
    }
    onChange(e) {
      const t = e.target, s = this.s;
      if (t.name === 'stsrc') this.set({ src: t.value, marks: {}, paste: '' });
      if (t.dataset.run !== undefined) this.set({ run: t.value, marks: {} });
      if (t.dataset.rule) { s.off[t.dataset.rule] = !t.checked; this.set({}); }
      if (t.dataset.mk) { s.marks[t.dataset.mk] = t.value || null; this.set({}); }
      if (t.dataset.ex) { const [k, f] = t.dataset.ex.split('|'); s.ex[k][f] = Math.max(0, +t.value || 0); this.set({}); }
      if (t.dataset.paste !== undefined) this.set({ paste: t.value, marks: {} });
      if (t.dataset.own !== undefined) this.set({ own: t.value, marks: {} });
      if (t.dataset.ownrev !== undefined) this.set({ ownRev: t.value, marks: {} });
      if (t.dataset.nr) { s.nr[t.dataset.nr] = t.value; this.set({}, { redraw: false }); }
    }
    onClick(e) {
      if (e.target.dataset.x === 'addrule') { const n = this.s.nr; if (!n.name || !n.pattern) return; this.s.rules.push({ rule_id: 'U' + this.s.rules.length, name: n.name, pattern: n.pattern, kind: 'wordlist', note: '自加' }); this.set({ nr: { name: '', pattern: '' } }); }
    }
  }
  register('style-lab', Style);

  /* ================= D14 改三段（演示③） ================= */
  const VIEWS = {};
  class ThreeParas extends Lab {
    defaults() { return { rows: { a: null, b: null }, names: { a: '', b: '' }, dec: {}, int: {}, why: {} }; }
    async load(k, buf, name) {
      try {
        const [r, v] = await Promise.all([L.docxRevisions(buf), L.revisionView(buf)]);
        VIEWS[k] = v; this.s.rows[k] = r.edits.filter((x) => !x.in_footnote).map((x) => ({ id: `${k}:${x.edit_id}`, edit_id: x.edit_id, para_index: x.para_index, author: x.author, date: x.date, removed: x.removed, added: x.added, before: x.before, after: x.after }));
        this.s.names[k] = name; this.set({});
      } catch (err) { W.toast('解析失败：' + err.message); }
    }
    plan() { return (PUB.demo3b && PUB.demo3b.plan) || null; }
    render() {
      const s = this.s;
      if (!s.rows.b && !this._lb) { this._lb = true; const b = Mat.docx('demo3b_reviser.docx'); if (b) this.load('b', b, '演示3b_reviser写入.docx'); }
      if (s.rows.a && !VIEWS.a && !this._la) { this._la = true; }
      const plan = this.plan(), notes = plan ? plan.replacements : [];
      const col = (k, title, nat) => {
        const rows = s.rows[k];
        if (!rows) return `<section class="w9-col"><h4>${title}</h4>${nat}<p class="w11-pending">${k === 'a' ? '待课前生成：教师把网页版（W3a）的建议在 Word 修订模式下手工落入练习材料甲，存为 demo/修订稿/演示3a_网页版建议手工落入.docx；课上从这里载入。这里不放构造的修订稿。' : '正在解析…'}</p><label class="pack-btn small">载入 .docx<input type="file" accept=".docx" data-up="${k}" hidden></label></section>`;
        const v = VIEWS[k] || [];
        const decs = Object.fromEntries(rows.map((r) => [r.edit_id, s.dec[r.id] || null]));
        const prev = v.filter((p) => p.segs.some((x) => x.edit_id)).map((p) => `<p>${L.previewSegs(p.segs, decs).map((x) => x.state === 'plain' ? esc(x.text) : x.state === 'ins' ? `<ins>${esc(x.text)}</ins>` : `<del>${esc(x.text)}</del>`).join('')}</p>`).join('');
        const st = L.editStats(rows.map((r) => ({ proposer: { kind: 'model' }, decision: s.dec[r.id] === 'modify' ? 'modify' : s.dec[r.id], intention: s.int[r.id] || null, before: r.removed, after: r.added })).filter((x) => x.decision || x.intention));
        return `<section class="w9-col"><h4>${title}</h4>${nat}<p class="sub">${esc(s.names[k])}｜修订者：<b>${esc([...new Set(rows.map((r) => r.author))].join('、'))}</b>｜修订 ${rows.length} 处 <label class="pack-btn small">换一份<input type="file" accept=".docx" data-up="${k}" hidden></label></p>
          <table class="items w11-rev"><tr><th>改动</th><th>意图</th><th>处理</th><th>理由</th></tr>${rows.map((r) => { const n = k === 'b' ? notes.find((x) => x.new === r.added && x.old === r.removed) : null, mc = s.int[r.id] === 'meaning-changed', why = (s.why[r.id] || '').trim();
            return `<tr><td>${r.removed ? `<del>${esc(r.removed)}</del>` : ''}${r.added ? `<ins>${esc(r.added)}</ins>` : ''}${n ? `<div class="sub">工具自述：${esc(n.note)}</div>` : ''}</td>
            <td>${sel(`data-int="${esc(r.id)}"`, s.int[r.id], S.iterater.map(([a, z]) => [a, z]), '（选）')}</td>
            <td><button class="small ${s.dec[r.id] === 'accept' ? 'on' : ''}" data-dec="${esc(r.id)}|accept" ${mc && !why ? 'disabled title="意思改变一类不能一键接受：先写理由"' : ''}>接受</button> <button class="small ${s.dec[r.id] === 'reject' ? 'on' : ''}" data-dec="${esc(r.id)}|reject">拒绝</button></td>
            <td><input data-why="${esc(r.id)}" value="${esc(s.why[r.id] || '')}" size="16"></td></tr>`; }).join('')}</table>
          <p>${W.nat.calc} 已处理 ${st.n} 条：采纳率 ${W.pct(st.adoption)}（${st.a_m}/${st.n_m}），意思改变占比 ${W.pct(st.meaningShare)}。</p>
          <details open><summary>"改后文字"预览（接受的落入、拒绝的还原、未定的两种都标出；只改页面内预览，不写回文件）</summary><div class="srcbox w11-diff">${prev}</div></details></section>`;
      };
      const audit = PUB.demo3b && PUB.demo3b.audit;
      this.out(`<p class="sub">全班逐条决定接受或拒绝，选意图、写理由。页面不提供"全部接受"；"意思改变"一类要先写理由才能接受。判断发生在"敲进去"的时候，还是"点接受"的时候？</p>
        <div class="w11-stack">${col('a', '(a) 网页版建议，手工落入', `<p><span class="w9-badge web-paste">网页版</span> 修订者是教师本人：每一处都经过一次"要不要敲进去"的判断。</p>${cardBox('W3a')}${answerCell('W3a', 'gemini').html}`)}
          ${col('b', '(b) word-paper-tracked-reviser 写入', `<p><span class="w9-badge replay">预存回放</span> 修订者是工具名。修订计划由 Claude Opus 5.5 按"使结构更清楚"拟定（2026-11-26，本课件制作线程），工具写入；${audit ? `审计${audit.passed ? '通过' : '未通过'}：计划外改动 ${audit.unexpected_changed_parts.length} 处，脚注部件未改动` : ''}。这不是 DeepSeek／Kimi 的输出，也没有在带 Zotero 域代码的稿子上验证（域代码一项未验证）。</p>`)}</div>
        <p><button class="small" data-x="send">把已处理的修订送入贯穿记录（修改对照表，D18）</button> <button class="small" data-x="csv">导出修改对照表（.csv）</button></p>`);
    }
    async onChange(e) {
      const t = e.target, s = this.s;
      if (t.dataset.up && t.files[0]) { const f = t.files[0]; await this.load(t.dataset.up, await f.arrayBuffer(), f.name); t.value = ''; }
      if (t.dataset.int) { s.int[t.dataset.int] = t.value || null; if (t.value === 'meaning-changed' && s.dec[t.dataset.int] === 'accept' && !(s.why[t.dataset.int] || '').trim()) s.dec[t.dataset.int] = null; this.set({}); }
      if (t.dataset.why) { s.why[t.dataset.why] = t.value; this.set({}); }
    }
    onClick(e) {
      const t = e.target, s = this.s;
      if (t.dataset.dec) { const [id, d] = t.dataset.dec.split('|'); s.dec[id] = s.dec[id] === d ? null : d; this.set({}); return; }
      const all = ['a', 'b'].flatMap((k) => (s.rows[k] || []).map((r) => ({ ...r, k })));
      const row = (r) => ({ edit_id: `D14-${r.id}`, para: String(r.para_index), before: r.before, after: r.after, removed: r.removed, added: r.added, author: r.author, date: r.date, location: `演示③(${r.k}) Word 段 ${r.para_index}`, proposer: { kind: 'model', name: r.author, run_id: null }, intention: s.int[r.id] || null, intention_shown: null, decision: s.dec[r.id] || null, reason: s.why[r.id] || '', in_footnote: false });
      if (t.dataset.x === 'send') { const done = all.filter((r) => s.dec[r.id] || s.int[r.id]); for (const r of done) Through.add('edits', row(r), 'edit_id'); W.toast(`已送入贯穿记录：修改 ${done.length} 条`); }
      if (t.dataset.x === 'csv') { const head = ['edit_id', 'location', 'author', 'removed', 'added', 'intention', 'decision', 'reason']; const c = (v) => { const x = v == null ? '' : String(v); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }; download('演示③_修改对照表.csv', '﻿' + [head.join(','), ...all.map((r) => { const o = row(r); return head.map((h) => c(o[h])).join(','); })].join('\n'), 'text/csv'); }
    }
  }
  register('three-lab', ThreeParas);

  /* ================= D16 模型与引文 ================= */
  class Cite extends Lab {
    defaults() { return { marks: {}, bib: null, own: false, ownNotes: '', ownBib: '' }; }
    render() {
      const s = this.s, FN = EX['footnotes.jia'], key = S2.bibKey;
      if (!s.bib) s.bib = EX['bib.jia'].bib.map((b) => ({ ref_id: b.ref_id, text: b.text }));
      const notes = s.own ? s.ownNotes.split('\n').map((t, i) => ({ note_id: String(i + 1), text: t.trim() })).filter((n) => n.text) : FN.footnotes.map((n) => ({ note_id: n.note_id, text: n.text }));
      const bib = s.own ? s.ownBib.split('\n').map((t, i) => ({ ref_id: 'R' + (i + 1), text: t.trim() })).filter((b) => b.text) : s.bib;
      const r = L.bibCrossCheck(notes, bib);
      const done = Object.keys(s.marks).filter((k) => s.marks[k]), right = done.filter((k) => s.marks[k] === key[k]).length;
      const cnt = (v) => done.filter((k) => s.marks[k] === v).length;
      const lab = (f) => ({ title: '题名', year: '年份', author: '作者' }[f] || f);
      this.out(`<div class="w11-two"><section><h4>三种错误 ${W.nat.stat}</h4><ol>${S2.citeErrors.map(([a, b]) => `<li><b>${esc(a)}</b>：${esc(b)}</li>`).join('')}</ol>
          <table class="items"><tr><th>研究</th><th>结果</th><th>测的是</th></tr>${S2.citeStudies.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="sub">${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}</table>
          <p class="sub">这几项研究以理工科与英文文献为主。第三种错没有现成的统计，却是史学论文里最常见的。</p>
          <h4>三条分工</h4><ol>${S2.citeRules.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>
        <section><h4>小练习一：逐条标"存在／不存在／著录有误" ${W.nat.tc}</h4>
          <p class="sub">下面是预置的"模型草拟目录"（教学构造：一处年份被"顺手改正"、一处删了副题、一条虚构的多出条目）。</p>
          <table class="items">${s.bib.map((b) => `<tr><td>${esc(b.ref_id)}</td><td>${esc(b.text)}</td><td>${sel(`data-mk="${esc(b.ref_id)}"`, s.marks[b.ref_id], [['存在', '存在'], ['不存在', '不存在'], ['著录有误', '著录有误']])}${s.marks[b.ref_id] ? (s.marks[b.ref_id] === key[b.ref_id] ? ' <span class="ok">✓</span>' : ` <span class="nil">✗ ${esc(key[b.ref_id])}</span>`) : ''}</td></tr>`).join('')}</table>
          <p>${W.nat.calc} 已标 ${done.length} 条：存在 ${cnt('存在')}、不存在 ${cnt('不存在')}、著录有误 ${cnt('著录有误')}；与预置答案相同 ${right}/${done.length || 0}。核"存在"要回 Zotero 或馆藏目录，不能问模型。</p></section></div>
        <h4>小练习二：两头对 ${W.nat.calc}</h4>
        <p><label><input type="checkbox" data-own ${s.own ? 'checked' : ''}> 用自己的脚注与目录（各一行一条；只存本浏览器）</label></p>
        <div class="w11-two"><section><b>脚注集合</b>${s.own ? `<textarea data-ownnotes rows="8">${esc(s.ownNotes)}</textarea>` : `<ol class="sub">${notes.map((n) => `<li value="${esc(n.note_id)}">${esc(n.text)}</li>`).join('')}</ol>`}</section>
          <section><b>模型草拟的参考文献目录</b>${s.own ? `<textarea data-ownbib rows="8">${esc(s.ownBib)}</textarea>` : s.bib.map((b, i) => `<p><span class="mono">${esc(b.ref_id)}</span> <input data-bib="${i}" value="${esc(b.text)}" size="56"> <button class="small" data-delb="${i}">删</button></p>`).join('') + '<p><button class="small" data-x="addb">加一条</button> <button class="small" data-x="resetb">恢复预置</button></p>'}</section></div>
        <div class="w11-report"><p><b>目录中找不到出处的条目</b>：${r.orphans_in_bib.map(esc).join('、') || '无'}</p>
          <p><b>脚注引过而目录缺的文献</b>：${r.missing_in_bib.map((id) => `注 ${esc(id)}${(notes.find((n) => n.note_id === id) || {}).text ? `（${esc(notes.find((n) => n.note_id === id).text.slice(0, 24))}…）` : ''}`).join('、') || '无'}</p>
          <p><b>作者、题名、年份被改动的条目</b>：${r.changed.map((c) => `${esc(c.ref_id)}（${c.fields.map(lab).join('、')}）`).join('、') || '无'}</p>
          <p class="sub">规则：作者相同、题名字符二元组重合 ≥0.6 算同一种文献；题名比较去掉分期标记与引号写法，繁简照原样比。页码与转述不在这里核（4.3）。</p></div>`);
    }
    onChange(e) {
      const t = e.target, s = this.s;
      if (t.dataset.mk) { s.marks[t.dataset.mk] = t.value || null; this.set({}); }
      if (t.dataset.bib) { s.bib[+t.dataset.bib].text = t.value; this.set({}); }
      if (t.dataset.own !== undefined) this.set({ own: t.checked });
      if (t.dataset.ownnotes !== undefined) this.set({ ownNotes: t.value });
      if (t.dataset.ownbib !== undefined) this.set({ ownBib: t.value });
    }
    onClick(e) {
      const t = e.target, s = this.s;
      if (t.dataset.delb) { s.bib.splice(+t.dataset.delb, 1); this.set({}); }
      if (t.dataset.x === 'addb') { s.bib.push({ ref_id: 'B' + (s.bib.length + 1) + '′', text: '' }); this.set({}); }
      if (t.dataset.x === 'resetb') this.set({ bib: null });
    }
  }
  register('cite-lab', Cite);

  /* ================= D20 材料包、数据与工具 ================= */
  class Materials extends Lab {
    defaults() { return { filter: 'all', mine: {}, set: 'iterater' }; }
    render() {
      const s = this.s, ms = S2.materials.filter((m) => s.filter === 'all' || (s.filter === 'pub' ? m[4] : !m[4]));
      const IT = PUB.iterater, useIT = s.set === 'iterater' && IT;
      const items = useIT ? IT.items.map((e) => ({ id: e.rev_id, before: e.before, after: e.after, gold: e.gold_intention, mine: s.mine[e.rev_id] || null, link: /^\d{4}\.\d{4,5}$/.test(e.doc_id) ? `https://arxiv.org/abs/${e.doc_id}` : null, line: e.line, doc: e.doc_id }))
        : EX['edits.fig10'].edits.map((e) => ({ id: e.edit_id, before: e.before, after: e.after, gold: e.intention, mine: s.mine[e.edit_id] || null }));
      const ag = L.labelAgreement(items), zh = Object.fromEntries(S.iterater.map(([k, z]) => [k, z]));
      this.out(`<h4>一　本讲课堂材料包（扩充部分丁一）${W.nat.stat}</h4>
        <p>${[['all', '全部'], ['pub', '可分发'], ['class', '只在本机与课堂']].map(([k, z]) => `<label><input type="radio" name="mfil" value="${k}" ${s.filter === k ? 'checked' : ''}> ${z}</label>`).join(' ')}</p>
        <table class="items"><tr><th>编号</th><th>材料</th><th>用在</th><th>边界</th><th>课件里在哪</th></tr>${ms.map(([id, name, used, bound, , where]) => `<tr><td>${esc(id)}</td><td>${esc(name)}</td><td>${esc(used)}</td><td>${esc(bound)}</td><td class="sub">${esc(where)}</td></tr>`).join('')}</table>
        <p class="sub">教师 2026 年《历史研究》投稿（未刊稿）不在材料包中。另：教师书稿一节（D13 预置，教师 2026-11-26 定为按已刊稿处理）只在本机材料包。</p>
        <h4>二　工具与资源（讲义附录六；扫码打开）</h4>
        <div class="w11-qrgrid">${S2.tools.map(([svg, name, use, lic, url]) => `<figure><img src="assets/qr/${esc(svg)}" alt="${esc(name)} 二维码" width="96" height="96"><figcaption><b>${esc(name)}</b><br><span class="sub">${esc(use)}｜${esc(lic)}</span><br><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ''))}</a></figcaption></figure>`).join('')}</div>
        <h4>三　可供练习的数据与评测（扩充部分丁二）</h4>
        <table class="items"><tr><th>名称</th><th>内容</th><th>可以拿来做什么</th><th>许可</th></tr>${S2.datasets.map(([a, b, c, d]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td><td>${esc(d)}</td></tr>`).join('')}</table>
        <p class="sub">这些都以英文与理工科为主；史学论文没有公开的审读评测，也没有中文的修改意图语料。</p>
        <details><summary>四　进阶：标修改意图，与原标注比一致率 ${W.nat.calc}</summary>
          <p>${IT ? `<label><input type="radio" name="itset" value="iterater" ${useIT ? 'checked' : ''}> ITERATER 十条（英文，人工标注句级测试集；${esc(IT.license)}；教师 2026-11-26 同意取数）</label> ` : ''}<label><input type="radio" name="itset" value="fig10" ${useIT ? '' : 'checked'}> 练习材料甲的四条修改（讲义图 10，${W.nat.tc}；作对照：史学的"意思改变"更细）</label></p>
          ${useIT ? `<p class="sub">${esc(IT.citation)}；${esc(IT.source)}（${esc(IT.file)}，修订 ${esc(IT.sha_revision.slice(0, 8))}）。五类各两条，次序打乱；原数据的 others 一类未取。</p>` : ''}
          <table class="items"><tr><th>改前</th><th>改后</th><th>我标的意图</th><th>原标注</th></tr>${items.map((x) => `<tr class="${x.mine && x.mine !== x.gold ? 'w11-bad' : ''}"><td>${esc(x.before)}${x.line ? `<div class="sub">${esc(x.id)}｜test.json 第 ${x.line} 行｜${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">arXiv ${esc(x.doc)}</a>` : `文档 ${esc(x.doc)}`}</div>` : ''}</td><td>${esc(x.after)}</td><td>${sel(`data-mine="${esc(x.id)}"`, x.mine, S.iterater.map(([k, z]) => [k, z]))}</td><td>${x.mine ? esc(zh[x.gold]) : '<span class="sub">标了再看</span>'}</td></tr>`).join('')}</table>
          <p>一致率 ${ag.n ? `${ag.agree}/${ag.n}（${W.pct(ag.rate)}）` : '—'}：一致条数除以总条数，不做 κ 校正（只有几条时偶然一致的影响很大，见第十周甲五）。</p></details>`);
    }
    onChange(e) {
      const t = e.target;
      if (t.name === 'mfil') this.set({ filter: t.value });
      if (t.name === 'itset') this.set({ set: t.value });
      if (t.dataset.mine) { this.s.mine[t.dataset.mine] = t.value || null; this.set({}); }
    }
  }
  register('materials-lab', Materials);
})();
