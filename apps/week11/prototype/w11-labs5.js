/* 第十一周页面组件（五）：D08、D19、D22｜候选，未经教师确认｜2026-11-26（第三批；D12 暂缓） */
(() => {
  'use strict';
  const { esc, register } = window.Deck;
  const W = window.W11, { L, Through, Lab, runsFor } = W;
  const S2 = window.W11_STATIC2, EX = window.W11_EXAMPLES, PUB = window.W11_PUBLIC || {};
  const ERR = ['E1', 'E2', 'E3'];

  /* ================= D08 查出率、精确率与合并（进阶） ================= */
  class Pool extends Lab {
    defaults() { return { src: 'toy', grid: null, show: 'union', truth: 'implant' }; }
    toyGrid() { const g = {}; for (const f of EX['implants-findings.toy'].findings) (g[f.run_id] = g[f.run_id] || []).push(f.error_id); for (const r of ['A-1', 'A-2', 'A-3', 'B-1', 'B-2', 'B-3']) g[r] = g[r] || []; return g; }
    realGrid() {
      const g = {}; for (const p of ['deepseek', 'kimi']) for (const r of runsFor('D2P', p)) g[r.run_id] = [];
      for (const f of Through.get().findings) if (f.run_id in g && ERR.includes(f.error_id) && f.matched === 1 && !g[f.run_id].includes(f.error_id)) g[f.run_id].push(f.error_id);
      return g;
    }
    render() {
      const s = this.s;
      if (!s.grid || s.gridFor !== s.src) { s.grid = s.src === 'toy' ? this.toyGrid() : this.realGrid(); s.gridFor = s.src; }
      const runs = Object.keys(s.grid), r = L.recallPool({ implants: ERR.map((e) => ({ error_id: e })), findings: L.gridToFindings(s.grid), runs });
      const same = runs.length > 1 && runs.some((a, i) => runs.slice(i + 1).some((b) => s.grid[a].length && [...s.grid[a]].sort().join() === [...s.grid[b]].sort().join()));
      const W0 = 360, H0 = 140, n = r.greedy.length;
      const pts = [[0, 0], ...r.greedy.map((g, i) => [i + 1, g.recall])];
      const xy = ([i, v]) => `${30 + (n ? (i / n) * (W0 - 50) : 0)},${H0 - 20 - v * (H0 - 40)}`;
      const svg = n ? `<svg viewBox="0 0 ${W0} ${H0}" width="${W0}" height="${H0}" role="img" aria-label="贪心合并召回率曲线"><line x1="30" y1="${H0 - 20}" x2="${W0 - 20}" y2="${H0 - 20}" stroke="#8a8f96"/><line x1="30" y1="20" x2="30" y2="${H0 - 20}" stroke="#8a8f96"/>
        <text x="4" y="24" font-size="10">1</text><text x="4" y="${H0 - 18}" font-size="10">0</text><polyline fill="none" stroke="#164ec7" stroke-width="2" points="${pts.map(xy).join(' ')}"/>
        ${pts.slice(1).map((p, i) => `<circle cx="${xy(p).split(',')[0]}" cy="${xy(p).split(',')[1]}" r="3" fill="#164ec7"><title>加入 ${esc(r.greedy[i].run)}：${W.frac(Math.round(p[1] * 3), 3)}</title></circle><text x="${xy(p).split(',')[0]}" y="${H0 - 6}" font-size="9" text-anchor="middle">${esc(r.greedy[i].run)}</text>`).join('')}</svg>` : '';
      this.out(`<p><b>数据</b> <label><input type="radio" name="poolsrc" value="toy" ${s.src === 'toy' ? 'checked' : ''}> 甲二小例（${W.nat.tc}，假设数字）</label> <label><input type="radio" name="poolsrc" value="real" ${s.src === 'real' ? 'checked' : ''}> 演示②′实际记录（D07 裁决为"成立"且对上植入的发现）</label></p>
        ${!runs.length ? '<p class="w11-pending">待课前运行（D2P）；运行后在 D07 逐条裁决，这里自动汇总。</p>' : `
        <div class="w11-two"><section><h4>运行 × 植入错误 ${W.nat.calc}</h4>
          <table class="items"><tr><th>运行</th>${ERR.map((e) => `<th>${e}</th>`).join('')}<th>查出集合</th><th>单次召回率</th></tr>
          ${runs.map((run) => `<tr><td>${esc(run)}</td>${ERR.map((e) => `<td><input type="checkbox" data-g="${esc(run)}|${e}" ${s.grid[run].includes(e) ? 'checked' : ''}></td>`).join('')}<td>{${s.grid[run].slice().sort().join(', ')}}</td><td>${W.frac(r.perRun[run].hits.length, 3)}</td></tr>`).join('')}</table>
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
