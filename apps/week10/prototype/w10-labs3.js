/* 第十周页面组件（三）：D11、D12、D14、D15（贯穿页）、D16｜候选，未经教师确认｜2026-11-16（第一批） */
(() => {
  'use strict';
  const { esc, register, download } = window.Deck;
  const W = window.W10, { L, Mat, Through, Lab, cardBox, answerCell, sourceBox, needPack, toSheet, sendBtn, marked } = W;
  const S = window.W10_STATIC;
  const fmt = (x, d = 3) => (x == null || Number.isNaN(x) ? '—' : String(Math.round(x * 10 ** d) / 10 ** d));
  const PRESETS4 = ['deepseek', 'kimi', 'gemini', 'chatgpt'];
  const presetSel = (v) => `<select data-o="preset">${PRESETS4.map((p) => `<option value="${p}" ${p === v ? 'selected' : ''}>${esc(W.PRESET_LABEL[p])}</option>`).join('')}</select>`;
  const MAO = () => Mat.text('mao-history') + '\n' + Mat.text('mao-conclusion');

  /* ================= D11 一事几说 ================= */
  class Views extends Lab {
    defaults() { return { mine: {}, reveal: false }; }
    render() {
      const s = this.s, V = S.views, verbs = S.viewsVerbs;
      const done = V.filter((v) => s.mine[v.scholar]).length, same = V.filter((v) => s.mine[v.scholar] && s.mine[v.scholar] === v.group).length;
      const mao = MAO();
      this.out(`<table class="items w10-views"><tr><th>学者</th><th>年份</th><th>主张与所据（动词高亮）</th><th>与他说的分歧点</th><th>学生归栏</th>${s.reveal ? '<th>本课归栏</th>' : ''}<th>茅文中</th></tr>
        ${V.map((v) => { const pos = mao ? [v.scholar.split('、')[0], ...v.aliases].map((n) => mao.indexOf(n)).filter((i) => i >= 0) : []; const page = pos.length ? (mao.slice(0, Math.min(...pos)).match(/〔原刊第(\d+)页〕/g) || []).pop()?.match(/\d+/)[0] : null;
          return `<tr><td><b>${esc(v.scholar)}</b></td><td>${esc(v.year)}</td><td>${marked(v.claim, [['cause', verbs]])}</td><td>${esc(v.dispute)}</td><td>${S.viewsGroups.map((g) => `<label class="nowrap"><input type="radio" name="d11-${esc(v.scholar)}" data-g="${esc(v.scholar)}" value="${g}" ${s.mine[v.scholar] === g ? 'checked' : ''}>${g}</label>`).join(' ')}</td>${s.reveal ? `<td class="${s.mine[v.scholar] && s.mine[v.scholar] !== v.group ? 'nil' : ''}">${esc(v.group)}</td>` : ''}<td class="sub">${mao ? (page ? `首见第 ${page} 页附近` : '节录中未见') : '—'}</td></tr>`; }).join('')}</table>
        <p class="w10-sum">已归栏 ${done}／${V.length}　<label><input type="checkbox" data-o="reveal" ${s.reveal ? 'checked' : ''}> 显示本课归栏</label>${s.reveal ? `　与本课归栏相同 ${same}／${done}` : ''}　<span class="sub">"本课归栏"是本课据下表所作的归纳，不是茅海建的分类；黄彰健与茅海建在这一点上是同一个判断（讲义 4.2）。</span></p>
        <p class="sub">${esc(S.viewsSource)}</p>
        ${mao ? sourceBox('mao-history', { highlight: ['导火线', '加剧', '黄彰健'] }) : needPack('茅海建 2002 学术史一节（每格回茅文对应页）')}
        <details><summary>三层比较：主张什么，凭什么材料，怎样从材料推到主张</summary><p>几家的差别落在三个层面：事实的时点（告密哪一天，消息哪一天到京）；概念的切分（黄彰健把"政变爆发"与"捕人"、"起因"与"加剧"分开，茅海建接受并补证）；材料的取舍（当事人记述、档案、记述的版本与空白、小说）。茅海建自注以上引述"也是我主观的认知"（第 4 期第 207 页）。</p><p class="sub">各家"所据史料"一栏只用茅文明言的内容；吴、萧、房诸家原文本课未读，概括性说法属本课概括（扩充部分乙三）。</p></details>`);
    }
    onChange(e) { const t = e.target; if (t.dataset.g) this.set({ mine: { ...this.s.mine, [t.dataset.g]: t.value } }); if (t.dataset.o === 'reveal') this.set({ reveal: t.checked }); }
  }
  register('views-lab', Views);

  /* ================= D12 让模型做各说对照表（演示③） ================= */
  const CELLV = ['一致', '说满', '归属错误', '自填', '页码不符'];
  class Table3 extends Lab {
    defaults() { return { preset: 'deepseek', mine: '1,2', checks: {}, extra: '', counts: {} }; }
    render() {
      const s = this.s, { run } = W.pickedRun('D3', s.preset), mao = Mat.text('mao-history');
      const t = run ? L.parseMdTable(run.reply) : null, head = t?.head || [], rows = t?.rows || [];
      const scholarCol = head.find((h) => /学者/.test(h)) || head[0];
      const pages = mao ? Object.fromEntries(L.splitPages(mao).map((p) => [p.page, p.text])) : {};
      const pageCheck = (row) => {
        const txt = Object.values(row).join(' '), ps = [...txt.matchAll(/第\s*(\d{3})\s*页/g)].map((m) => m[1]); const name = String(row[scholarCol] || '').split(/[、，,（(]/)[0].trim();
        if (!ps.length) return '<span class="sub">无页码</span>';
        if (!mao) return '<span class="sub">需材料包</span>';
        return ps.filter((p, i) => ps.indexOf(p) === i).map((p) => (pages[p] == null ? `<span class="nil">第${p}页不在节录</span>` : name && pages[p].includes(name.slice(0, 2)) ? `<span class="ok">第${p}页✓</span>` : `<b class="nil">第${p}页未见"${esc(name)}"</b>`)).join(' ');
      };
      const mineIdx = new Set(String(s.mine).split(/[,，\s]+/).map((x) => +x).filter(Boolean));
      const ck = s.checks[run?.run_id] || {};
      const count = Object.fromEntries(CELLV.map((v) => [v, Object.values(ck).filter((x) => x === v).length]));
      const named = new Set(rows.flatMap((r) => S.views.filter((v) => [v.scholar, ...v.aliases, ...v.scholar.split('、')].some((n) => String(r[scholarCol] || '').includes(n))).map((v) => v.scholar)));
      const unnamed = S.views.filter((v) => !named.has(v.scholar)).map((v) => v.scholar);
      this.out(`<div class="w9-toolbar"><b>D3：给茅文学术史一节，要求输出对照表并注原刊页码</b>　模型 ${presetSel(s.preset)}　<label>我负责第 <input data-o="mine" size="6" value="${esc(s.mine)}"> 行</label></div>
        ${cardBox('D3')}
        ${answerCell('D3', s.preset, { body: () => '' }).html}
        ${run && !t ? `<p class="nil">回答里没有解析出表格，需人工对应。</p><div class="w9-reply">${esc(run.reply)}</div>` : ''}
        ${t ? `<table class="items w10-t3"><tr><th>#</th>${head.map((h) => `<th>${esc(h)}</th>`).join('')}<th>页码核对（程序）</th></tr>${rows.map((r, i) => `<tr class="${mineIdx.has(i + 1) ? 'w10-mine' : ''}"><td>${i + 1}</td>${head.map((h, j) => `<td>${marked(r[h] || '', [['cause', S.viewsVerbs]])}${mineIdx.has(i + 1) ? `<br><select data-ck="${i}|${j}"><option value=""></option>${CELLV.map((v) => `<option ${ck[i + '|' + j] === v ? 'selected' : ''}>${v}</option>`).join('')}</select>${ck[i + '|' + j] && ck[i + '|' + j] !== '一致' ? sendBtn(i + '|' + j) : ''}` : ''}</td>`).join('')}<td>${pageCheck(r)}</td></tr>`).join('')}</table>
          <div class="w9-two"><section class="w9-col"><header><b>我核的格（本浏览器）</b></header><p>${CELLV.map((v) => `${v} ${count[v]}`).join('；')}</p><p class="sub">归属错误单列（案例 C-10：评语误作主张，或主张误作评语）。</p></section>
          <section class="w9-col"><header><b>茅文评述而模型未列的学者</b></header><p>对照九家名单，表里没有出现：${unnamed.map(esc).join('、') || '无'}</p><p><input data-o="extra" value="${esc(s.extra)}" size="30" placeholder="补：茅文二十一家中还有谁"></p><p class="sub">前三种问题从表出发可以查到；这一种只有读过原文的人才查得出来。</p></section></div>` : ''}
        <div class="w10-sum"><b>全班汇总（教师按举手数录入）</b>　${CELLV.map((v) => `${v} <input data-cnt="${v}" size="3" value="${esc(s.counts[v] ?? '')}">`).join('　')}　<span class="sub">课后各组导出贯穿记录交讲台，经"导入表格"导入（教师 2026-11-16）。</span></div>
        ${mao ? sourceBox('mao-history') : needPack('茅海建 2002 学术史一节（逐格核对用）')}
        <details><summary>进阶：更难的要求</summary><p>"按各家对告密时间的判定排序"需要模型从正文中找出各家所定的日期，更容易出错（讲义 4.2 note）。这一条件不预存（教师 2026-11-16）；现场调用时可自行改问。</p></details>`);
      this._t = t; this._run = run;
    }
    sheetRow(k) { const [i, j] = k.split('|').map(Number), h = this._t.head[j], r = this._t.rows[i], v = this.s.checks[this._run.run_id][k]; return { from_page: 'D12', run_id: this._run.run_id, point: `${r[this._t.head[0]]}｜${h}`, model_says: r[h], verdict: { 说满: '过度概括', 归属错误: '归属错误', 自填: '曲解', 页码不符: '曲解' }[v] || null, reason: `逐格核对：${v}` }; }
    onChange(e) {
      const t = e.target;
      if (t.dataset.o) return this.set({ [t.dataset.o]: t.value });
      if (t.dataset.ck && this._run) { const c = { ...(this.s.checks[this._run.run_id] || {}), [t.dataset.ck]: t.value }; this.set({ checks: { ...this.s.checks, [this._run.run_id]: c } }); Through.get().cellchecks = Object.entries(c).map(([k, v]) => ({ run_id: this._run.run_id, row: +k.split('|')[0] + 1, column: this._t.head[+k.split('|')[1]], verdict: v, checker: '本机' })); Through.save(); }
      if (t.dataset.cnt) this.set({ counts: { ...this.s.counts, [t.dataset.cnt]: t.value } });
    }
  }
  register('table3-lab', Table3);

  /* ================= D14 分歧不能核对掉（演示④） ================= */
  const ROSTER = S.five.map((f) => ({ name: f.name, aliases: f.aliases }));
  class Split4 extends Lab {
    defaults() { return { cond: 'D4A', preset: 'deepseek', judge: {}, edit: {} }; }
    names(run) { const auto = L.findNames(run.reply, ROSTER), ed = this.s.edit[run.run_id] || {}; return ROSTER.map((r) => r.name).filter((n) => (n in ed ? ed[n] : auto.includes(n))); }
    render() {
      const s = this.s, runs = W.runsFor(s.cond, s.preset).slice(0, 3), { run } = W.pickedRun(s.cond, s.preset);
      const lists = runs.map((r) => this.names(r)), pj = lists.length >= 2 ? L.pairwiseJaccard(lists) : null;
      const body = (r) => { const auto = L.findNames(r.reply, ROSTER), hd = L.findHedges(r.reply), ed = s.edit[r.run_id] || {}, jd = s.judge[r.run_id] || {};
        const paras = r.reply.split(/\n\s*\n/), last = paras[paras.length - 1] || '';
        return `<div class="w9-reply">${marked(r.reply, [['credit', ROSTER.flatMap((x) => [x.name, ...x.aliases])], ['cause', S.viewsVerbs.length ? L.HEDGES : []]])}</div>
          <table class="items"><tr><th>五家</th><th>点名了吗（页面抽出，可改）</th><th>说法对得上吗（学生判定）</th><th></th></tr>${ROSTER.map((x) => { const on = x.name in ed ? ed[x.name] : auto.includes(x.name); return `<tr><td>${esc(x.name)}</td><td><label><input type="checkbox" data-nm="${esc(r.run_id)}|${esc(x.name)}" ${on ? 'checked' : ''}> ${on ? '点名' : '未点名'}</label>${x.name in ed ? ' <span class="sub">（手改）</span>' : ''}</td><td>${on ? ['对得上', '对不上', '说不清'].map((v) => `<label class="nowrap"><input type="radio" name="j-${esc(r.run_id)}-${esc(x.name)}" data-jd="${esc(r.run_id)}|${esc(x.name)}" value="${v}" ${jd[x.name] === v ? 'checked' : ''}>${v}</label>`).join(' ') : ''}</td><td>${jd[x.name] === '对不上' ? sendBtn(r.run_id + '|' + x.name) : ''}</td></tr>`; }).join('')}</table>
          <p class="sub">点名 ${this.names(r).length}／5；回答里另有"有学者认为"一类无名之说 ${(r.reply.match(/有学者|有人认为|一些学者|部分学者/g) || []).length} 处。最后一段调和语：${L.findHedges(last).map((h) => esc(h.phrase)).join('、') || '无'}（全文：${hd.map((h) => esc(h.phrase)).join('、') || '无'}）。</p>`; };
      this.out(`<div class="w9-toolbar"><b>"学界怎样评价《教育勅語》的性质？有哪些不同的看法？"</b>　<label><input type="radio" name="d14c" data-o="cond" value="D4A" ${s.cond === 'D4A' ? 'checked' : ''}>D4A 不给材料（三次）</label> <label><input type="radio" name="d14c" data-o="cond" value="D4B" ${s.cond === 'D4B' ? 'checked' : ''}>D4B 给稲田第 3—4 页</label>　模型 ${presetSel(s.preset)}</div>
        <div class="w9-two"><section class="w9-col"><header><b>五家（讲义 4.4）</b></header><table class="items">${S.five.map((f) => `<tr><td><b>${esc(f.name)}</b> ${esc(f.year)}</td><td>${esc(f.view)}<br><span class="sub">${esc(f.page)}</span></td></tr>`).join('')}</table><p class="sub">${esc(S.fiveSource)}</p><p class="sub">${esc(S.inoueSeven)}</p>${Mat.has('inada-pp3-4') ? sourceBox('inada-pp3-4') : needPack('稲田第 3—4 页录文')}</section>
        <section class="w9-col"><header><b>模型的回答</b></header>${cardBox(s.cond)}${answerCell(s.cond, s.preset, { body }).html}</section></div>
        <div class="w10-sum"><b>三次之间（实际计算）</b>：${pj ? `${runs.length} 次的点名名单两两 Jaccard ${pj.pairs.map((x) => fmt(x)).join('、')}；平均 <b>${fmt(pj.mean)}</b>。名单：${lists.map((l, i) => `第 ${i + 1} 次 ${l.join('、') || '（无）'}`).join('；')}` : '需要至少两次采样的记录（课前每格三次）。'}　<span class="sub">J＝|交|/|并|；名单很稳定，也可能是三次都稳定地漏掉了同一家。调和语表：${esc(L.HEDGES.join('、'))}（页面规则，可在页表中改）。</span></div>
        <details><summary>进阶：评测现状（案例 C-16、C-17）</summary><p>HistBench（2025）：414 道题，29 种语言，当时 GPT-4o 答对 18.6%；题目多有标准答案。Hutchinson（2026）：换成模型没见过的、非西方的、开放式的题，成绩大幅下降；模型长于识别而不长于推理。"模型能否公允地比较几种解释"，本课没有找到评测。</p></details>`);
    }
    sheetRow(k) { const [rid, name] = k.split('|'), run = W.runsFor(this.s.cond, this.s.preset).find((r) => r.run_id === rid), f = S.five.find((x) => x.name === name); const sent = L.splitSentences(run.reply).find((x) => [name, ...f.aliases].some((n) => x.includes(n))) || ''; return { from_page: 'D14', run_id: rid, point: `${name}：${f.view}`, source_ref: { citation: f.page }, model_says: sent, verdict: '曲解' }; }
    onChange(e) {
      const t = e.target;
      if (t.dataset.o) return this.set({ [t.dataset.o]: t.value });
      if (t.dataset.nm) { const [rid, n] = t.dataset.nm.split('|'); this.set({ edit: { ...this.s.edit, [rid]: { ...(this.s.edit[rid] || {}), [n]: t.checked } } }); }
      if (t.dataset.jd) { const [rid, n] = t.dataset.jd.split('|'); this.set({ judge: { ...this.s.judge, [rid]: { ...(this.s.judge[rid] || {}), [n]: t.value } } }); Through.get().namechecks = Object.entries(this.s.judge).flatMap(([r, o]) => Object.entries(o).map(([name, v]) => ({ run_id: r, name, verdict: v }))); Through.save(); }
    }
  }
  register('split4-lab', Split4);

  /* ================= D15 阅读对照单（贯穿页） ================= */
  const V6 = L.SHEET_VERDICTS;
  class Sheet extends Lab {
    defaults() { return { fPage: '', fVerdict: '' }; }
    render() {
      const rows = Through.get().sheet, s = this.s, sum = L.sheetSummary(rows);
      const pages = [...new Set(rows.map((r) => r.from_page).filter(Boolean))];
      const shown = rows.filter((r) => (!s.fPage || r.from_page === s.fPage) && (!s.fVerdict || r.verdict === s.fVerdict));
      const src = Mat.entries().filter((e) => e.text);
      const qc = (r) => { const q = r.source_ref?.quote; if (!q) return '<span class="sub">（贴原文后核对）</span>'; const sid = r.source_ref?.entry_id; const text = sid ? Mat.text(sid) : src.map((e) => e.text).join('\n'); if (!text) return '<span class="nil">原文未载入</span>'; const c = L.quoteCheck(q, text); return `<span class="w10-qc ${c.status}">${esc(L.QUOTE_STATUS_ZH[c.status])}</span> ${fmt(c.coverage, 2)}${c.pages.length ? ' 第' + c.pages.join('、') + '页' : ''}${c.missed.length ? `<br><span class="sub">未核上：${c.missed.map((m) => esc(m.text)).join('、')}</span>` : ''}`; };
      const ta = (r, f, n = 2) => `<textarea data-r="${esc(r.row_id)}" data-f="${f}" rows="${n}">${esc(r[f] || '')}</textarea>`;
      this.out(`<div class="w9-toolbar"><b>阅读对照单</b>　<button class="small" data-w10-import="sheet">导入表格</button> <button class="small" data-x="add">加一行</button>　筛选：来源页 <select data-o="fPage"><option value="">全部</option>${pages.map((p) => `<option ${p === s.fPage ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select> 判定 <select data-o="fVerdict"><option value="">全部</option>${V6.map((v) => `<option ${v === s.fVerdict ? 'selected' : ''}>${v}</option>`).join('')}</select>　导出 <button class="small" data-x="json">JSON（可恢复）</button> <button class="small" data-x="csv">CSV</button> <button class="small" data-x="md">使用情况说明附表</button></div>
        <div class="w10-sum"><b>汇总（实际计算）</b>：${V6.map((v) => `${v} ${sum.count[v]}（${sum.share[v] == null ? '—' : Math.round(sum.share[v] * 100) + '%'}）`).join('；')}；共 ${sum.total} 行计入。${sum.pending_new ? `<b>另有"模型新见"${sum.pending_new} 行未回原文确认，不计入。</b>` : ''}　<span class="sub">本页不预置示例行（教师 2026-11-16）：教师课上导入自己的例子；学生把前面各页的核对结果送进来，或导入自己的文献与笔记。从各页送来的判定是预填，可改。</span></div>
        ${rows.length ? `<table class="items w10-sheet"><tr><th>来源</th><th>要点（本人细读）</th><th>原文位置／所贴原文</th><th>原文核对（程序）</th><th>我的理解</th><th>模型的说法</th><th>判定</th><th>处理与理由</th><th></th></tr>
        ${shown.map((r) => `<tr><td class="sub">${r.from_page && r.from_page !== 'import' ? `<a href="#${esc(r.from_page)}">${esc(r.from_page)}</a>` : esc(r.from_page || '手填')}${r.run_id ? `<br>${esc(r.run_id)}` : ''}${r.tool_record?.tool ? `<br>工具：${esc(r.tool_record.tool)}` : ''}</td><td>${ta(r, 'point')}</td><td><input data-r="${esc(r.row_id)}" data-f="src_citation" value="${esc(r.source_ref?.citation || r.source_ref?.page || '')}" size="10" placeholder="书名、页码"><br><textarea data-r="${esc(r.row_id)}" data-f="src_quote" rows="2" placeholder="贴原文">${esc(r.source_ref?.quote || '')}</textarea></td><td class="w10-qcell">${qc(r)}</td><td>${ta(r, 'my_reading')}</td><td>${ta(r, 'model_says')}</td>
          <td><select data-r="${esc(r.row_id)}" data-f="verdict"><option value=""></option>${V6.map((v) => `<option ${r.verdict === v ? 'selected' : ''}>${v}</option>`).join('')}</select>${r.verdict_prefilled ? '<br><span class="sub">预填</span>' : ''}${r.verdict === '模型新见' ? `<br><label><input type="checkbox" data-r="${esc(r.row_id)}" data-f="confirmed" ${r.confirmed ? 'checked' : ''}> 已回原文确认</label>` : ''}</td>
          <td><select data-r="${esc(r.row_id)}" data-f="action"><option value=""></option>${['采纳', '修正', '舍弃'].map((v) => `<option ${r.action === v ? 'selected' : ''}>${v}</option>`).join('')}</select>${ta(r, 'reason', 1)}</td><td><button class="small" data-del="${esc(r.row_id)}">删</button></td></tr>`).join('')}</table>` : '<p class="w10-pending">对照单是空的。用"导入表格"导入一张对照单或"导入本机材料包"载入教师的例子，或在 D01、D03、D04、D06、D07、D10、D12、D14 点"送入对照单"。</p>'}
        <details><summary>怎样用于自己的文献（扩充部分乙五）</summary><p>先读原文、写下五到十个要点，再请模型摘要，然后对照；不要先看模型的摘要再读原文，否则"我列的要点"会被模型的摘要带着走，遗漏就查不出来了。用"只依据上传文件作答"的工具时，导入时在声明栏填工具、日期、模型、文件与文字层、是否联网（扩充部分丙二）。</p></details>`);
    }
    upd(id, f, v) {
      const r = Through.get().sheet.find((x) => x.row_id === id); if (!r) return;
      if (f === 'src_citation') r.source_ref = { ...(r.source_ref || {}), citation: v };
      else if (f === 'src_quote') r.source_ref = { ...(r.source_ref || {}), quote: v };
      else if (f === 'confirmed') r.confirmed = v;
      else { r[f] = v || null; if (f === 'verdict') r.verdict_prefilled = false; }
      Through.save();
    }
    onChange(e) { const t = e.target; if (t.dataset.o) return this.set({ [t.dataset.o]: t.value }); if (t.dataset.r) this.upd(t.dataset.r, t.dataset.f, t.type === 'checkbox' ? t.checked : t.value); }
    onClick(e) {
      const x = e.target.dataset.x, rows = Through.get().sheet;
      if (x === 'add') toSheet({ from_page: '手填' });
      if (e.target.dataset.del) Through.remove('sheet', (r) => r.row_id === e.target.dataset.del);
      if (x === 'json') download('w10-sheet.json', JSON.stringify(L.stripSecrets({ format: 'w10-sheet/v1', rows }, W.Model.secrets()), null, 1), 'application/json');
      if (x === 'csv') { const cols = ['row_id', 'from_page', 'run_id', 'point', 'source_ref', 'my_reading', 'model_says', 'verdict', 'confirmed', 'action', 'reason']; const q = (v) => `"${String(v == null ? '' : typeof v === 'object' ? [v.citation, v.page, v.quote].filter(Boolean).join('｜') : v).replace(/"/g, '""')}"`; download('w10-sheet.csv', '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n'), 'text/csv'); }
      if (x === 'md') download('人工智能使用情况说明_附表.md', `# 人工智能使用情况说明（附表）\n\n由第十周阅读对照单导出，${new Date().toISOString().slice(0, 10)}。\n\n| 用了什么材料 | 模型说了什么 | 我怎样核对 | 判定 | 采纳／修正／舍弃 | 理由 |\n|---|---|---|---|---|---|\n` + rows.map((r) => `| ${[[r.source_ref?.citation, r.source_ref?.page].filter(Boolean).join(' ') || r.point || '', r.model_says || '', [r.my_reading, r.source_ref?.quote ? '原文：' + r.source_ref.quote : ''].filter(Boolean).join('；'), r.verdict === '模型新见' && !r.confirmed ? '模型新见（未回原文确认）' : r.verdict || '', r.action || '', r.reason || ''].map((c) => String(c).replace(/\|/g, '｜').replace(/\n/g, ' ')).join(' | ')} |`).join('\n') + '\n\n运行记录（模型、日期、提示）见贯穿记录导出。\n');
    }
  }
  register('sheet-lab', Sheet);

  /* ================= D16 结语与贯穿记录 ================= */
  class Closing extends Lab {
    defaults() { return { msg: '' }; }
    render() {
      const T = Through.get(), n = (k) => (T[k] || []).length;
      this.out(`<div class="w10-four">${S.fourActions.map(([a, p, t], i) => `<a class="w10-act" href="#${p}"><b>${i + 1}　${esc(a)}</b><span>${esc(t)}</span><span class="sub">${p}</span></a>`).join('')}</div>
        <p class="w10-hushi">"有几分证据，说几分话"，本来是说给写作的人听的；有了替我们读书的模型，它也要说给读的人听。</p>
        <div class="w10-sum"><b>全讲记录（本浏览器）</b>：运行记录 ${n('runs')}；原子主张 ${n('claims')}；时间线 ${n('timeline')}；异文效果句 ${n('effects')}；逐格核对 ${n('cellchecks')}；点名核对 ${n('namechecks')}；对照单 ${n('sheet')} 行；导入的材料 ${n('packs')} 份。
          <br><button data-x="export">导出贯穿记录（JSON）</button> <label class="pack-btn">恢复贯穿记录<input type="file" accept=".json" data-x="import" hidden></label> <button data-x="clear">清空</button> <span class="nil">${esc(this.s.msg)}</span>
          <br><span class="sub">导出不含 Key。${Mat.restrictedLoaded() ? '<b>当前载入了本机材料包；运行记录的提示里带有受限文字（茅文、稲田录文），分发前请留意。</b>' : ''}导入先验证，坏文件保留原记录。</span></div>`);
    }
    onClick(e) {
      const x = e.target.dataset.x;
      if (x === 'export') { try { download(`w10-through-${new Date().toISOString().slice(0, 10)}.json`, Through.export(), 'application/json'); this.set({ msg: '已导出。' }); } catch (err) { this.set({ msg: err.message }); } }
      if (x === 'clear' && confirm('清空本浏览器中的第十周贯穿记录？（导出的文件不受影响）')) { Through.clear(); }
    }
    async onChange(e) { if (e.target.dataset.x === 'import' && e.target.files[0]) { const r = Through.import(await e.target.files[0].text()); e.target.value = ''; Through.pageState(this.pid).msg = r.ok ? '已恢复。' : '未恢复，原记录保留：' + r.error; Through.save(); } }
  }
  register('closing-lab', Closing);
})();
