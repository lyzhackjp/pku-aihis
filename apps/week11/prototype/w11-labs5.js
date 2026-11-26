/* 第十一周页面组件（五）：D08、D19、D22｜候选，未经教师确认｜2026-11-26（第三批；D12 暂缓） */
(() => {
  'use strict';
  const { esc, register } = window.Deck;
  const W = window.W11, { L, Through, Lab, runsFor } = W;
  const S2 = window.W11_STATIC2, EX = window.W11_EXAMPLES, PUB = window.W11_PUBLIC || {};
  const ERR = ['E1', 'E2', 'E3'];

  /* ================= D08 查出率、精确率与合并（进阶） ================= */
  class Pool extends Lab {
    defaults() { return { src: 'reviewed', grid: null, show: 'union', truth: 'implant' }; }
    toyGrid() { const g = {}; for (const f of EX['implants-findings.toy'].findings) (g[f.run_id] = g[f.run_id] || []).push(f.error_id); for (const r of ['A-1', 'A-2', 'A-3', 'B-1', 'B-2', 'B-3']) g[r] = g[r] || []; return g; }
    realGrid() {
      const g = {}; for (const p of ['deepseek', 'kimi']) for (const r of runsFor('D2P', p)) g[r.run_id] = [];
      for (const f of Through.get().findings) if (f.run_id in g && ERR.includes(f.error_id) && f.matched === 1 && !g[f.run_id].includes(f.error_id)) g[f.run_id].push(f.error_id);
      return g;
    }
    render() {
      const s = this.s;
      let grid;
      if (s.src === 'reviewed') {
        // 据 11 月 26 日的逐份判读，只列这六份固定回放。
        grid = {};
        for (const p of ['deepseek', 'kimi']) for (const run of runsFor('D2P', p)) {
          if (['1', '2', '3'].some((n) => run.run_id === `D2P_${p}_${n}`)) grid[run.run_id] = run.run_id === 'D2P_kimi_3' ? [...ERR] : ['E1', 'E2'];
        }
      } else if (s.src === 'real') grid = this.realGrid();
      else {
        s.grid ??= this.toyGrid();
        grid = s.grid;
      }
      const runs = Object.keys(grid), r = L.recallPool({ implants: ERR.map((e) => ({ error_id: e })), findings: L.gridToFindings(grid), runs });
      const same = runs.length > 1 && runs.some((a, i) => runs.slice(i + 1).some((b) => grid[a].length && [...grid[a]].sort().join() === [...grid[b]].sort().join()));
      const W0 = 360, H0 = 140, n = r.greedy.length;
      const pts = [[0, 0], ...r.greedy.map((g, i) => [i + 1, g.recall])];
      const xy = ([i, v]) => `${30 + (n ? (i / n) * (W0 - 50) : 0)},${H0 - 20 - v * (H0 - 40)}`;
      const svg = n ? `<svg viewBox="0 0 ${W0} ${H0}" width="${W0}" height="${H0}" role="img" aria-label="贪心合并召回率曲线"><line x1="30" y1="${H0 - 20}" x2="${W0 - 20}" y2="${H0 - 20}" stroke="#8a8f96"/><line x1="30" y1="20" x2="30" y2="${H0 - 20}" stroke="#8a8f96"/>
        <text x="4" y="24" font-size="10">1</text><text x="4" y="${H0 - 18}" font-size="10">0</text><polyline fill="none" stroke="#164ec7" stroke-width="2" points="${pts.map(xy).join(' ')}"/>
        ${pts.slice(1).map((p, i) => `<circle cx="${xy(p).split(',')[0]}" cy="${xy(p).split(',')[1]}" r="3" fill="#164ec7"><title>加入 ${esc(r.greedy[i].run)}：${W.frac(Math.round(p[1] * 3), 3)}</title></circle><text x="${xy(p).split(',')[0]}" y="${H0 - 6}" font-size="9" text-anchor="middle">${esc(r.greedy[i].run)}</text>`).join('')}</svg>` : '';
      this.out(`<p><b>数据</b> <label><input type="radio" name="poolsrc" value="reviewed" ${s.src === 'reviewed' ? 'checked' : ''}> 六份课前回放的备课判读（候选）</label> <label><input type="radio" name="poolsrc" value="toy" ${s.src === 'toy' ? 'checked' : ''}> 试算小例（${W.nat.tc}，假设数字）</label> <label><input type="radio" name="poolsrc" value="real" ${s.src === 'real' ? 'checked' : ''}> 我的 D07 登记（送入贯穿记录后汇总）</label></p>
        ${!runs.length ? '<p class="w11-pending">载入本机材料包可查六份 D2P 回放，也可以切换到试算小例。</p>' : `
        <div class="w11-two"><section><h4>运行 × 植入错误 ${W.nat.calc}</h4>
          <p class="sub">E1 换发言人，E2 改院别，E3 删去“少数”。${s.src === 'reviewed' ? '判读供课上复核。请在 D07 打开对应运行的回答全文。' : ''}</p>
          <table class="items"><tr><th>运行</th>${ERR.map((e) => `<th>${e}</th>`).join('')}<th>查出集合</th><th>单次召回率</th></tr>
          ${runs.map((run) => `<tr><td>${esc(run)}</td>${ERR.map((e) => `<td><input type="checkbox" data-g="${esc(run)}|${e}" ${grid[run].includes(e) ? 'checked' : ''} ${s.src === 'toy' ? '' : 'disabled'}></td>`).join('')}<td>{${grid[run].slice().sort().join(', ')}}</td><td>${W.frac(r.perRun[run].hits.length, 3)}</td></tr>`).join('')}</table>
          <p>${s.show === 'union' ? `合并召回率 <b>${W.frac(r.union.length, 3)}</b>＝|S₁∪…∪S${runs.length > 9 ? '_' + runs.length : '₀₁₂₃₄₅₆₇₈₉'[runs.length]}|／3，并集 {${r.union.sort().join(', ')}}` : `单次召回率 ${runs.map((x) => W.frac(r.perRun[x].hits.length, 3)).join('、')}`}　<button class="small" data-x="show">${s.show === 'union' ? '按单次看' : '按合并看'}</button></p>
          ${s.src === 'toy' ? `<p><button class="small" data-x="e3">把第三次运行（A-3）改为查出 E3</button> <button class="small" data-x="reset">恢复小例</button></p>` : ''}
          ${same ? '<p class="sub">有两次运行查出的集合相同：后加入的那一次不增加合并召回率——合并的收益来自"不重合"。</p>' : ''}</section>
        <section><h4>贪心合并曲线 ${W.nat.calc}</h4>${svg}<p class="sub">每一步加入能多查出最多错误的那一次运行（Litvak 2026 的画法）；曲线很快变平。召回率＝T/N；合并召回率＝|S₁∪…∪S_k|/N。</p></section></div>`}
        <div class="w11-two"><section><h4>Litvak 2026 与 SPOT 2025 ${W.nat.stat}</h4>
          <table class="items">${S2.pool.litvak.map(([a, b]) => `<tr><td>Litvak：${esc(a)}</td><td><b>${esc(b)}</b></td></tr>`).join('')}${S2.pool.spot.map(([a, b]) => `<tr><td>SPOT：${esc(a)}</td><td><b>${esc(b)}</b></td></tr>`).join('')}</table>
          <p class="sub">Litvak 公开仓库的逐条结果（可画 100 处植入的贪心曲线）许可证未核（E-03），本页未载入。</p></section>
        <section><h4>为什么只报召回率；植入与真实</h4><p>${esc(S2.pool.precision)}</p>
          <p><label><input type="radio" name="truth" value="implant" ${s.truth === 'implant' ? 'checked' : ''}> 植入的错误</label> <label><input type="radio" name="truth" value="real" ${s.truth === 'real' ? 'checked' : ''}> 真实的错误</label></p><p>${esc(S2.pool.truth[s.truth])}</p></section></div>`);
    }
    onChange(e) {
      const t = e.target, s = this.s;
      if (t.name === 'poolsrc') this.set({ src: t.value, grid: null });
      if (t.name === 'truth') this.set({ truth: t.value });
      if (t.dataset.g) { const [run, err] = t.dataset.g.split('|'); const a = s.grid[run]; if (t.checked) { if (!a.includes(err)) a.push(err); } else s.grid[run] = a.filter((x) => x !== err); this.set({}); }
    }
    onClick(e) {
      const x = e.target.dataset.x, s = this.s;
      if (x === 'show') this.set({ show: s.show === 'union' ? 'single' : 'union' });
      if (x === 'e3' && s.grid['A-3']) { if (!s.grid['A-3'].includes('E3')) s.grid['A-3'].push('E3'); this.set({}); }
      if (x === 'reset') this.set({ grid: null });
    }
  }
  register('pool-lab', Pool);

  /* ================= D19 多方法与多材料 ================= */
  class Methods extends Lab {
    defaults() { return { open: null, mine: { sources_in_hand: '', note_count: '', page_systems: '', problem: '' } }; }
    render() {
      const s = this.s, M = S2.m19, m = s.mine;
      const filled = m.sources_in_hand && m.problem;
      const rec = filled ? L.recommendSteps({ sources_in_hand: m.sources_in_hand, note_count: +m.note_count || 0, problem: m.problem }) : null;
      const cell = (si, mi) => { const k = `${si}|${mi}`, t = M.steps[si][2][mi]; return `<td class="w11-m19 ${s.open === k ? 'on' : ''}" data-cell19="${k}">${s.open === k ? `<b>${esc(t)}</b><div class="sub">${esc(M.steps[si][1])}</div>` : esc(t.length > 14 ? t.slice(0, 14) + '…' : t)}</td>`; };
      this.out(`<h4>材料 × 步骤（扩充部分乙〇，本课归纳）${W.nat.stat}</h4><p class="sub">点格子展开要点与对应的讲义、扩充部分小节和页面。</p>
        <table class="items w11-m19t"><tr><th>步骤</th>${M.materials.map(([, n, d]) => `<th>${esc(n)}${d ? `<div class="sub">${esc(d)}</div>` : ''}</th>`).join('')}</tr>
        ${M.steps.map((st, si) => `<tr><td><b>${esc(st[0])}</b></td>${M.materials.map((_, mi) => cell(si, mi)).join('')}</tr>`).join('')}</table>
        <ul class="sub">${M.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h4>进阶：为自己的课程论文填一列 ${W.nat.calc}</h4>
        <p><label>原文是否在手 <select data-m="sources_in_hand"><option value="">（选）</option>${[['yes', '是'], ['partial', '部分'], ['no', '否']].map(([k, z]) => `<option value="${k}" ${m.sources_in_hand === k ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
          <label>脚注条数 <input type="number" min="0" data-m="note_count" value="${esc(m.note_count)}" style="width:5em"></label>
          <label>注释用几套页码体系 <input data-m="page_systems" value="${esc(m.page_systems)}" size="10" placeholder="如：原刊页、发言番号"></label>
          <label>文字的主要毛病 <select data-m="problem"><option value="">（选）</option>${Object.keys(L.PROBLEM_STEP).map((k) => `<option ${m.problem === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label></p>
        ${rec ? `<p>推荐先做：<b>${rec.first.map(esc).join(' → ')}</b></p><ul>${rec.why.map((x) => `<li>${esc(x)}</li>`).join('')}${rec.excluded.map((x) => `<li class="nil">${esc(x)}</li>`).join('')}</ul>` : '<p class="sub">填"原文是否在手"与"主要毛病"后给出推荐。</p>'}
        <p class="sub">规则写在页上：原文不在手的不推荐深度审读；脚注多于 30 条的先做注释核验（扩充部分乙〇）；其余按"主要毛病"对应一步，再补逆向大纲（本课约定）。这只是起点，不替你决定。</p>`);
    }
    onClick(e) { const c = e.target.closest('[data-cell19]'); if (c) this.set({ open: this.s.open === c.dataset.cell19 ? null : c.dataset.cell19 }); }
    onChange(e) { const t = e.target; if (t.dataset.m) { this.s.mine[t.dataset.m] = t.value; this.set({}); } }
  }
  register('methods-lab', Methods);

  /* ================= D22 案例页 ================= */
  const FIELDS = [['question', '研究问题'], ['material', '材料'], ['methods', '方法'], ['steps', '步骤'], ['findings', '发现'], ['limits', '局限与核验'], ['task', '学生可做'], ['demo', '演示建议'], ['access', '数据与代码'], ['source', '出处（读取深度）']];
  class Cases extends Lab {
    defaults() { return { group: '', open: {} }; }
    render() {
      const s = this.s, cs = PUB.cases || [], groups = [...new Set(cs.map((c) => c.group))];
      const shown = cs.filter((c) => !s.group || c.group === s.group);
      this.out(`<p>${['', ...groups].map((g) => `<label><input type="radio" name="cgrp" value="${esc(g)}" ${s.group === g ? 'checked' : ''}> ${esc(g || '全部')}</label>`).join(' ')}<span class="sub">　${shown.length} 案；取自案例整理.typ（十三栏），读取深度见各卡"出处"。</span></p>
        <div class="w11-cases">${shown.map((c) => { const j = S2.caseJump[c.id]; return `<article class="w11-case"><header><span class="mono">${esc(c.id)}</span> <b>${esc(c.title)}</b><span class="sub">　讲义 ${esc(c.lecture)}｜${esc(c.group)}</span></header>
          <p>${esc(c.findings)}</p>
          <p>${j ? `<button class="small" data-go="${j}">学生可做 → ${j}</button>` : '<span class="w9-badge none">静态卡</span>'} <button class="small" data-open="${esc(c.id)}">${s.open[c.id] ? '收起' : '十栏'}</button></p>
          ${s.open[c.id] ? `<dl>${FIELDS.map(([k, z]) => `<dt>${z}</dt><dd>${esc(c[k] || '')}</dd>`).join('')}</dl>` : ''}</article>`; }).join('')}</div>`);
    }
    onClick(e) {
      const t = e.target;
      if (t.dataset.go) location.hash = '#' + t.dataset.go;
      if (t.dataset.open) { this.s.open[t.dataset.open] = !this.s.open[t.dataset.open]; this.set({}); }
    }
    onChange(e) { if (e.target.name === 'cgrp') this.set({ group: e.target.value }); }
  }
  register('cases-lab', Cases);
})();

/* ================= D12 文风账本（进阶）｜第三批补做（教师 2026-11-26：用课程文风账本作样板，去掉人名） ================= */
(() => {
  'use strict';
  const { esc, register } = window.Deck;
  const W = window.W11, { L, Mat, Through, Lab, runsFor, cardBox, answerCell } = W;
  const S2 = window.W11_STATIC2, EX = window.W11_EXAMPLES, PUB = window.W11_PUBLIC || {};
  const STATUS = ['归纳认可', '直接要求', '原段认可', '候选'];
  const COLS = [['preference', '偏好'], ['before', '改前'], ['after', '改后'], ['reason', '理由'], ['source', '来源与确认'], ['scope', '适用范围']];
  const viol = (orig, rev) => { const b = L.boundsCheck(orig, rev), r2 = L.styleCount(rev, S2.styleRules.filter((x) => x.rule_id === 'R2')).counts.R2.n - L.styleCount(orig, S2.styleRules.filter((x) => x.rule_id === 'R2')).counts.R2.n; return { hedges: b.lostHedges.reduce((a, x) => a + x.before - x.after, 0), quotes: b.lostQuotes.reduce((a, x) => a + x.before - x.after, 0), generic: b.newGeneric.length, cliche: Math.max(0, r2) }; };
  class Ledger extends Lab {
    defaults() { return { pick: {}, open: {}, form: null, filter: '' }; }
    base() { const lg = PUB.ledger || { entries: [] }; return [...lg.entries.map((e) => ({ ...e, _from: 'ledger' })), ...EX['ledger.jia2'].entries.filter((e) => e.status !== '候选').map((e) => ({ ...e, _from: 'jia2' }))]; }
    mine() { return Through.get().ledger; }
    pair() {
      const d11 = Through.pageState('D11');
      if (d11.src === 'own') return { original: d11.own || '', revised: d11.ownRev || '', from: 'D11 自选段落' };
      if (d11.src === 'toy') return { ...EX['style.toy'].pairs[0], from: 'D11 教学小例' };
      const jia = d11.src === 'jia', original = Mat.text(jia ? 'jia-p3' : 'li2023-p152-153').replace(/〔原刊第\d+页〕/g, '');
      const runs = ['deepseek', 'kimi'].flatMap((p) => runsFor(jia ? 'S1J' : 'S1', p));
      const run = runs.find((r) => r.run_id === d11.run) || runs[0];
      return { original, revised: d11.paste || (run ? W.styleBody(run.reply) : ''), from: d11.paste ? 'D11 粘贴的润色稿' : run?.run_id || '' };
    }
    render() {
      const s = this.s, all = [...this.base(), ...this.mine().map((e) => ({ ...e, _from: 'mine' }))];
      const shown = all.filter((e) => !s.filter || e.status === s.filter);
      const picked = all.filter((e) => s.pick[e.entry_id]);
      const snippet = L.ledgerSnippet(picked);
      const pr = this.pair(), ops = pr.original && pr.revised ? L.charDiff(pr.original, pr.revised).filter((o) => o.tag !== 'equal') : [];
      const s3 = ['deepseek', 'kimi'].flatMap((p) => runsFor('S3', p).map((r) => ({ ...r, p }))), s1 = ['deepseek', 'kimi'].flatMap((p) => runsFor('S1', p).map((r) => ({ ...r, p })));
      const vrow = (r, tag) => { const v = viol(Mat.text('li2023-p152-153').replace(/〔原刊第\d+页〕/g, ''), W.styleBody(r.reply)); return `<tr><td>${tag}</td><td class="sub">${esc(r.run_id)}</td><td>${v.hedges}</td><td>${v.quotes}</td><td>${v.generic}</td><td>${v.cliche}</td></tr>`; };
      const f = s.form;
      this.out(`<p class="sub">样板：课程教案准备系统的文风账本（${esc((PUB.ledger || {}).source || '')}），记录教师和助教对讲义文风的每一次校准；条目中的具体人名已去掉${(PUB.ledger || {}).names_removed?.length ? '' : '（核对时未见人名，只有"教师""助教"一类称呼）'}。另附扩充部分乙二两条史学样例（${W.nat.tc}）。</p>
        <div class="w11-two"><section><h4>账本（${all.length} 条）${W.nat.stat}</h4>
          <p>${['', ...STATUS].map((k) => `<label><input type="radio" name="lgf" value="${k}" ${s.filter === k ? 'checked' : ''}> ${k || '全部'}</label>`).join(' ')}</p>
          <table class="items w11-ledger"><tr><th>附入</th><th>条目</th><th>状态</th></tr>${shown.map((e) => { const ok = L.ledgerSelectable(e) || e.status === '原段认可'; return `<tr><td><input type="checkbox" data-lp="${esc(e.entry_id)}" ${s.pick[e.entry_id] ? 'checked' : ''} ${ok ? '' : 'disabled title="候选条目不能附入改稿提示"'}></td>
            <td><b>${esc(e.entry_id)}</b>${e._from === 'jia2' ? ` ${W.nat.tc}` : e._from === 'mine' ? ' <span class="w9-badge calc">我的</span>' : ''} ${esc(e.preference || '')}${e.function ? `<span class="sub">　${esc(e.genre)}｜${esc(e.function)}</span>` : ''}
              <button class="small" data-open="${esc(e.entry_id)}">${s.open[e.entry_id] ? '收起' : '七栏'}</button>${s.open[e.entry_id] ? `<dl class="w11-dl">${COLS.map(([k, z]) => e[k] ? `<dt>${z}</dt><dd>${esc(e[k])}</dd>` : '').join('')}${e.status_note && e.status_note !== e.status ? `<dt>状态说明</dt><dd>${esc(e.status_note)}</dd>` : ''}</dl>` : ''}</td><td>${esc(e.status)}</td></tr>`; }).join('')}</table>
          <p class="sub">四种状态：归纳认可、直接要求可以作为偏好附入；原段认可只附例句，不附归纳句；候选不能附入。状态只能由账本主人的明确表态改变——这是为了不让模型把一次改稿泛化成规则。</p></section>
        <section><h4>一　从一处差异建一条 ${W.nat.calc}</h4>
          ${ops.length ? `<p class="sub">差异来自 D11 的润色稿（${esc(pr.from)}）。</p><ul class="w11-ops">${ops.slice(0, 30).map((o, i) => `<li><del>${esc(o.a)}</del> → <ins>${esc(o.b)}</ins> <button class="small" data-use="${i}">建条目</button></li>`).join('')}</ul>` : '<p class="w11-pending">当前选段没有可列出的差异。可在 D11 选择本机回放、粘贴润色稿，或在此新建空白条目。</p>'}
          <p><button class="small" data-x="blank">新建空白条目</button></p>
          ${f ? `<div class="w11-form">${COLS.map(([k, z]) => `<label>${z}<textarea data-f="${k}" rows="${k === 'preference' || k === 'scope' ? 1 : 2}">${esc(f[k] || '')}</textarea></label>`).join('')}
            <label>状态 <select data-f="status">${STATUS.map((x) => `<option ${f.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
            <p class="sub">自己建的条目，在没有用几次改稿验证之前，先记"候选"。</p><button class="small" data-x="save">存入账本</button> <button class="small" data-x="cancel">取消</button></div>` : ''}
          <h4>二　只附相关几条 ${W.nat.calc}</h4>
          <p>已选 ${picked.length} 条${picked.length > 5 ? '<span class="nil">（太多：只附与这一段相关的几条）</span>' : ''}。下面是要附进改稿提示的文字（候选条目不进入；原段认可只给例句）：</p>
          <pre class="srcbox">${esc(snippet || '（未选）')}</pre><p><button class="small" data-x="copy" ${snippet ? '' : 'disabled'}>复制</button></p>
          <details><summary>进阶：账本检验（附账本润色 S3 与不附账本 S1 的对比）</summary>${cardBox('S3')}${['deepseek', 'kimi'].map((p) => answerCell('S3', p).html).join('')}
            ${s3.length || s1.length ? `<table class="items"><tr><th></th><th>运行</th><th>限定语减少</th><th>引号词语减少</th><th>泛化归属</th><th>套语增加</th></tr>${s1.map((r) => vrow(r, '不附账本')).join('')}${s3.map((r) => vrow(r, '附账本')).join('')}</table><p class="sub">${W.nat.calc} 计数规则同 D11；只是提示，越界与否仍要逐处读。S3 附的三条是 ${esc(((PUB.ledger || {}).s3 || []).join('、'))}。在 S3_kimi_1 的润色正文里找原段的注号②至⑤：这一次四个都被删去了。</p>` : '<p class="w11-pending">本机材料包有 S1 与 S3 的课前回放，载入后可按运行编号对读。</p>'}</details></section></div>`);
    }
    onClick(e) {
      const t = e.target, s = this.s;
      if (t.dataset.open) { s.open[t.dataset.open] = !s.open[t.dataset.open]; this.set({}); }
      if (t.dataset.use != null && t.dataset.use !== undefined && t.dataset.use !== '') { const pr = this.pair(); const o = L.charDiff(pr.original, pr.revised).filter((x) => x.tag !== 'equal')[+t.dataset.use]; this.set({ form: { preference: '', before: o.a, after: o.b, reason: '', source: `D11 润色稿（${pr.from}）`, scope: '', status: '候选' } }); }
      const x = t.dataset.x;
      if (x === 'blank') this.set({ form: { preference: '', before: '', after: '', reason: '', source: '自拟', scope: '', status: '候选' } });
      if (x === 'cancel') this.set({ form: null });
      if (x === 'save') { const f = s.form; if (!f.preference.trim()) { W.toast('先写"偏好"一句'); return; } Through.add('ledger', { ...f, entry_id: 'M-' + (this.mine().length + 1) }, 'entry_id'); this.set({ form: null }); W.toast('已存入账本（贯穿记录）'); }
      if (x === 'copy') { const all = [...this.base(), ...this.mine()]; navigator.clipboard?.writeText(L.ledgerSnippet(all.filter((q) => s.pick[q.entry_id]))); W.toast('已复制'); }
    }
    onChange(e) {
      const t = e.target, s = this.s;
      if (t.name === 'lgf') this.set({ filter: t.value });
      if (t.dataset.lp) { s.pick[t.dataset.lp] = t.checked; this.set({}); }
      if (t.dataset.f && s.form) { s.form[t.dataset.f] = t.value; this.set({}, { redraw: t.dataset.f === 'status' }); }
    }
  }
  register('ledger-lab', Ledger);
})();
