/* 第八周页面组件（二）：D10、D11、D12、D13、D20、D23、D24。依赖 week08-labs.js 导出的 window.W8L。 */
(() => {
  'use strict';
  const { esc, store, pageById, pageLink, download, flowShell, rerender, register } = window.Deck;
  const W = window.W8, { Lab, seg, f2, posFor, egoPos } = window.W8L;

  /* 讲义 @fig-toy 的点位（pt），按比例放大，保持与讲义图一致。 */
  const TOY_POS = { 甲: [30, 20], 乙: [30, 92], 丙: [90, 56], 丁: [150, 56], 戊: [210, 56], 己: [270, 20], 庚: [270, 92] };
  const toyP = (g) => g.nodes.map((n) => { const p = TOY_POS[n.id]; return p ? [40 + p[0] * 1.6, 30 + p[1] * 2.2] : [240, 120]; });

  /* 在材料上叠加使用者加删的边，得到“工作中的”无向图。 */
  function workGraph(m, edits) {
    const base = W.graph(m, { directed: false, allNodes: true }), key = (a, b) => [a, b].sort().join('|');
    const set = new Map(base.edges.map((e) => [key(e.s, e.t), e]));
    for (const [a, b, op] of edits) { if (!base.index.has(String(a)) || !base.index.has(String(b))) continue; const k = key(a, b); if (op === 'add') set.set(k, { s: a, t: b, w: 1, recs: [{ type: '（本页添加）' }], added: true }); else set.delete(k); }
    return { nodes: base.nodes, index: base.index, directed: false, edges: [...set.values()], records: set.size };
  }

  /* ================= D10 指标怎样解释 ================= */
  class MetricLab extends Lab {
    defaults() { return { mat: 'toy7', edits: [], pick: null, seed: '1', sp: '' }; }
    render() {
      const m = this.mat(this.s.mat);
      if (!m) { rerender(this, `${W.matSelect('network', this.s.mat)}${this.s.mat === 'cbdb-wanggui' ? W.gate('CBDB 边表', 'CBDB 王珪记录') : '<p class="nil">材料缺</p>'}`); return; }
      if (this.s.editsMat !== this.s.mat) { this.s.edits = []; this.s.pick = null; this.s.editsMat = this.s.mat; }   // 换材料时清掉上一份材料上的加删
      const g0 = workGraph(m, []), g = workGraph(m, this.s.edits);
      const big = g.nodes.length > 400;
      const b0 = big ? null : W.betweenness(g0), b = big ? null : W.betweenness(g), st = W.stats(g), st0 = W.stats(g0), cc = st.cc;
      const P = this.s.mat === 'toy7' ? toyP(g) : posFor(g, m.id, { w: 520, h: 300 });
      const change = b ? g.nodes.map((n, i) => Math.abs(b[i] - b0[i])) : [];
      const maxCh = Math.max(0, ...change);
      const order = g.nodes.map((n, i) => i).sort((x, y) => (b ? b[y] - b[x] : 0) || st.deg[y] - st.deg[x]);
      const top = order.slice(0, 16);
      const col1 = `${W.drawGraph(g, P, { key: 'D10|' + m.id, w: 520, h: this.s.mat === 'toy7' ? 260 : 300, labels: 'all', hi: new Set([this.s.pick, ...g.nodes.filter((n, i) => maxCh > 0 && change[i] === maxCh).map((n) => n.id)].filter(Boolean)), size: (i) => 8 + (b ? Math.sqrt(b[i]) * 1.6 : 0), edgeColor: (e) => (e.added ? '#a33' : null) })}
        <p class="sub">${this.s.pick ? `已选 <b>${esc(this.s.pick)}</b>，再点另一个点：两点之间有边则删去，无边则添加。` : '点一个点，再点另一个点，即在两点之间添加或删除一条边。'} 点的大小随介数变化。</p>
        <p>${this.s.mat === 'toy7' ? '<button class="small" data-preset="jiaji">在甲与己之间添一条边（讲义的问题）</button> ' : ''}<button class="small" data-preset="reset">恢复原网</button></p>`;
      const row = (i) => `<tr class="${maxCh > 0 && change[i] === maxCh ? 'on' : ''}"><td>${esc(g.nodes[i].label)}</td><td>${st.deg[i]}${st.deg[i] !== st0.deg[i] ? ` <small>（原 ${st0.deg[i]}）</small>` : ''}</td><td>${b ? f2(b[i], b[i] % 1 ? 2 : 0) : '—'}${b && Math.abs(b[i] - b0[i]) > 1e-9 ? ` <small>（原 ${f2(b0[i], b0[i] % 1 ? 2 : 0)}）</small>` : ''}</td><td>${f2(cc[i])}</td></tr>`;
      const col2 = `<table class="steps"><tr><th>节点</th><th>度</th><th>介数（未标准化）</th><th>聚类系数</th></tr>${top.map(row).join('')}</table>
        ${g.nodes.length > top.length ? `<p class="sub">按介数排序，只列前 ${top.length} 个（共 ${g.nodes.length}）。</p>` : ''}
        <p>节点 ${st.n}、边 ${st.m}；密度 D = 2m／n(n−1) = 2×${st.m}／(${st.n}×${st.n - 1}) = <b>${f2(st.density)}</b></p>`;
      const maxDeg = Math.max(...st.deg), maxB = b ? Math.max(...b) : 0;
      const col3 = `<p class="okbox">度最高：${g.nodes.filter((n, i) => st.deg[i] === maxDeg).map((n) => esc(n.label)).join('、')}（${maxDeg}）；介数最高：${b ? g.nodes.filter((n, i) => b[i] === maxB).map((n) => esc(n.label)).join('、') + `（${f2(maxB, maxB % 1 ? 2 : 0)}）` : '—'}</p>
        ${this.s.mat === 'toy7' ? `<p class="sub">讲义 @fig-betw：丁 9，丙、戊 8，其余 0。丁的度只有 2，介数却最高。</p>` : ''}
        ${this.s.mat === 'padgett' ? `<p class="sub">在这份 15 个家族的婚姻网中，美第奇的度（6）与介数（47.5）都是最高，介数约为第二名的两倍。讲义说“美第奇家族的联系并不最多”，是就 Padgett 与 Ansell 把婚姻、经济、庇护关系合起来的编码而言（讲义注明读取深度为二手），与这份只含婚姻的示例数据不同。</p>` : ''}
        <details data-adv><summary>进阶：最短路径逐对列出</summary><p>${g.nodes.length <= 40 ? `起点 <select data-k="spA">${g.nodes.map((n) => `<option ${this.s.spA === n.id ? 'selected' : ''}>${esc(n.id)}</option>`).join('')}</select> 终点 <select data-k="spB">${g.nodes.map((n) => `<option ${this.s.spB === n.id ? 'selected' : ''}>${esc(n.id)}</option>`).join('')}</select>` : '只对 40 个点以内的小网列出。'}</p>
          ${g.nodes.length <= 40 && this.s.spA && this.s.spB ? (() => { const ps = W.allShortestPaths(g, this.s.spA, this.s.spB); return ps.length ? `<p>共 ${ps.length} 条最短路径（长 ${ps[0].length - 1}）：</p><ul>${ps.map((p) => `<li>${p.map(esc).join(' → ')}</li>`).join('')}</ul><p class="sub">每对点计 1，由经过各点的路径分摊（有 k 条时各计 1/k）。</p>` : '<p>两点不连通。</p>'; })() : ''}</details>`;
      const part = W.communities(g, Number(this.s.seed) || 1), Q = W.modularity(g, part), ncom = new Set(part).size;
      const col4 = `<p>“在现存记录中，两群之间有记录的关系都经过丁”是指标本身说的话；“丁是两群之间的掮客”是解释，要补史料。</p>
        <details data-adv2><summary>进阶：社群与模块度</summary><p>随机种子 <input type="number" data-k="seed" value="${esc(this.s.seed)}" style="width:4em">：分为 ${ncom} 群，模块度 Q = ${f2(Q, 3)}</p>
          ${W.drawGraph(g, P, { w: 520, h: this.s.mat === 'toy7' ? 260 : 300, labels: g.nodes.length <= 30 ? 'all' : 'none', color: (i) => W.PALETTE[part[i] % W.PALETTE.length] })}
          <p class="sub">Q = (1/2m) Σ<sub>ij</sub> [A<sub>ij</sub> − k<sub>i</sub>k<sub>j</sub>/2m] δ(c<sub>i</sub>, c<sub>j</sub>)：同群两点之间“实际有边”减去“按度随机连线的期望”，再求和。算法为贪心的局部移动（Louvain 第一阶段），换种子时边缘的点可能换群。</p></details>`;
      rerender(this, `${W.matSelect('network', this.s.mat)}${flowShell(pageById('D10'), [{ title: '选网络', body: col1 }, { title: '加删一条边', body: col2 }, { title: '看指标变化', body: col3 }, { title: '翻译成史学语言', body: col4 }])}`);
    }
    init() {
      this.addEventListener('click', (e) => {
        const p = e.target.closest('[data-preset]')?.dataset.preset;
        if (p === 'jiaji') { this.s.edits = [['甲', '己', 'add']]; this.s.pick = null; this.save(); return; }
        if (p === 'reset') { this.s.edits = []; this.s.pick = null; this.save(); return; }
        const nd = e.target.closest('[data-node]'); if (!nd) return;
        const id = nd.dataset.node;
        if (!this.s.pick) { this.s.pick = id; this.save(); return; }
        if (this.s.pick === id) { this.s.pick = null; this.save(); return; }
        const m = this.mat(this.s.mat), g = workGraph(m, this.s.edits), has = g.edges.some((x) => (x.s === this.s.pick && x.t === id) || (x.s === id && x.t === this.s.pick));
        this.s.edits = [...this.s.edits, [this.s.pick, id, has ? 'del' : 'add']]; this.s.pick = null; this.save();
      });
    }
  }
  register('metric-lab', MetricLab);

  /* ================= D11 比较结构与零模型 ================= */
  class CompareLab extends Lab {
    defaults() { return { mat: 'toy7', metric: 'cc', attr: '', seed: '20261102', runs: null }; }
    render() {
      const m = this.mat(this.s.mat);
      if (!m) { rerender(this, `${W.matSelect('network', this.s.mat)}${this.s.mat === 'cbdb-wanggui' ? W.gate('CBDB 边表', 'CBDB 王珪记录') : '<p class="nil">材料缺</p>'}`); return; }
      const g = W.graph(m, { directed: false }), st = W.stats(g), ps = g.nodes.length <= 2500 ? W.pathStats(g) : null;
      const attrs = [...new Set(g.nodes.flatMap((n) => Object.keys(n.attrs || {})))].filter((a) => !['lat', 'lng'].includes(a));
      const base = `<table class="steps"><tr><td>节点 n</td><td>${st.n}</td></tr><tr><td>边 m（同一对人合为一条）</td><td>${st.m}${g.records !== st.m ? `（原记录 ${g.records} 条）` : ''}</td></tr><tr><td>平均度</td><td>${f2(st.avgDeg)}</td></tr><tr><td>密度</td><td>${f2(st.density, 3)}</td></tr>
        <tr><td>连通分量</td><td>${st.comp.count} 个；最大 ${st.comp.sizes[0]} 点${st.comp.count > 1 ? `，其次 ${st.comp.sizes.slice(1, 4).join('、')}` : ''}</td></tr><tr><td>平均聚类系数</td><td>${f2(st.avgCC, 3)}</td></tr>
        <tr><td>平均最短路径／直径</td><td>${ps ? `${f2(ps.avg)}／${ps.diameter}` : '（网络过大，未算）'}</td></tr></table>
        ${this.s.mat === 'toy7' ? `<p class="sub">讲义：n＝7、m＝8，密度约 0.38；丙的聚类系数 2×1／(3×2) ≈ 0.33（页面：${f2(st.cc[g.index.get('丙')])}）。</p>` : ''}`;
      const hist = Object.entries(st.hist).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]);
      const histHtml = `<p class="sub">度分布：横为度，条为有多少人。</p>${W.bars(hist.length > 30 ? [...hist.slice(0, 15), ['…', 0], ...hist.slice(-10)].map(([k, v]) => ['度 ' + k, v]) : hist.map(([k, v]) => ['度 ' + k, v]))}
        <p class="sub">${hist.length ? `最大度 ${hist[hist.length - 1][0]}，度为 1 的 ${st.hist[1] || 0} 人。` : ''}${g.edges.every((e) => e.s === g.nodes[st.deg.indexOf(Math.max(...st.deg))]?.id || e.t === g.nodes[st.deg.indexOf(Math.max(...st.deg))]?.id) ? '所有边都连着同一人：自我中心网络，度分布的偏斜是建网方式造成的。' : ''}</p>`;
      const metricOf = (gg) => { if (this.s.metric === 'cc') return W.stats(gg).avgCC; const a = this.s.attr; if (!a) return null; const val = (id) => gg.nodes[gg.index.get(id)]?.attrs?.[a]; const E = gg.edges.filter((e) => val(e.s) != null && val(e.t) != null); return E.length ? E.filter((e) => String(val(e.s)) === String(val(e.t))).length / E.length : null; };
      const actual = metricOf(g);
      let nullHtml = `<p>比什么：${seg('metric', [['cc', '平均聚类系数'], ['same', '同属性连接比例']], this.s.metric)}</p>${this.s.metric === 'same' ? `<p>属性 <select data-k="attr"><option value="">（选一个节点属性）</option>${attrs.map((a) => `<option ${this.s.attr === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>${attrs.length ? '' : '<span class="nil">本材料的节点表没有属性列</span>'}</p>` : ''}
        <p>随机种子 <input type="number" data-k="seed" value="${esc(this.s.seed)}" style="width:7em"> <button data-run="1">生成 100 张随机网络（保持各人的度）</button></p>`;
      const R = this.s.runs;
      if (R && R.key === [m.id, this.s.metric, this.s.attr, this.s.seed].join('|') && actual != null) {
        const vals = R.vals, lo = Math.min(...vals, actual), hi = Math.max(...vals, actual), bins = 12, w = (hi - lo) / bins || 1, H = Array(bins).fill(0); vals.forEach((v) => { H[Math.min(bins - 1, Math.floor((v - lo) / w))]++; });
        const ge = vals.filter((v) => v >= actual - 1e-12).length;
        nullHtml += `<div class="hist">${H.map((c, i) => `<span style="height:${(c / Math.max(...H)) * 100}%" title="${f2(lo + i * w, 3)}—${f2(lo + (i + 1) * w, 3)}：${c} 张"></span>`).join('')}<i style="left:${((actual - lo) / (hi - lo || 1)) * 100}%" title="实际值"></i></div>
          <p class="okbox">实际值 ${f2(actual, 3)}；100 张随机网络中 ${ge} 张不低于实际值（随机网络均值 ${f2(vals.reduce((a, b) => a + b, 0) / vals.length, 3)}，平均每张实际交换 ${Math.round(R.swaps)} 次）。${ge <= 5 ? '实际格局超出随机连线通常所能产生的范围。' : '随机连线也常常产生这样的格局：不能据此说“结构有影响”。'}</p>`;
      } else if (actual == null) nullHtml += '<p class="sub">先选属性。</p>';
      // 网络长什么样：实际网络，与（跑过零模型后）其中一张随机网络并排，点位相同，只有连线不同
      const drawable = g.nodes.length <= 300;
      const P = drawable ? (this.s.mat === 'toy7' ? toyP(g) : posFor(g, 'D11|' + m.id, { w: 380, h: 260 })) : null;
      const pic = drawable ? `${W.drawGraph(g, P, { key: 'D11|' + m.id, w: 380, h: 260, labels: g.nodes.length <= 30 ? 'all' : 'none', arrows: false })}<p class="sub">这张网长这样（${st.n} 点、${st.m} 边）。可拖动节点。</p>` : `<p class="sub">${st.n} 个点，太大不画；页面只算数。</p>`;
      if (drawable && R && R.key === [m.id, this.s.metric, this.s.attr, this.s.seed].join('|')) {
        const r1 = W.rewire(g, Number(this.s.seed) || 1);
        nullHtml += `<p class="sub">其中第一张随机网络（各人的度与实际相同，连线打乱）：</p>${W.drawGraph({ ...r1, index: g.index }, P, { key: 'D11null|' + m.id + this.s.seed, w: 380, h: 260, labels: g.nodes.length <= 30 ? 'all' : 'none', arrows: false })}`;
      }
      rerender(this, `${W.matSelect('network', this.s.mat)}${flowShell(pageById('D11'), [{ title: '选网络', body: pic + W.card(m, { compact: true }) }, { title: '基本量', body: base }, { title: '度分布', body: histHtml }, { title: '与随机网络比', body: nullHtml + '<p class="sub">零模型：度保持重连（双边交换，次数为边数的 10 倍），相当于一次消融实验：打乱“结构”，看结论还在不在。</p>' }])}`);
    }
    init() {
      this.addEventListener('click', (e) => {
        if (!e.target.dataset.run) return; const m = this.mat(this.s.mat), g = W.graph(m, { directed: false });
        e.target.textContent = '计算中…'; setTimeout(() => {
          const vals = [], seed = Number(this.s.seed) || 1; let swaps = 0;
          for (let k = 0; k < 100; k++) { const r = W.rewire(g, seed + k); swaps += r.swaps; const gg = { ...r, index: g.index }; if (this.s.metric === 'cc') vals.push(W.stats(gg).avgCC); else { const a = this.s.attr, val = (id) => g.nodes[g.index.get(id)]?.attrs?.[a]; const E = gg.edges.filter((x) => val(x.s) != null && val(x.t) != null); vals.push(E.length ? E.filter((x) => String(val(x.s)) === String(val(x.t))).length / E.length : 0); } }
          this.s.runs = { key: [m.id, this.s.metric, this.s.attr, this.s.seed].join('|'), vals, swaps: swaps / 100 }; this.save();
        }, 20);
      });
    }
  }
  register('compare-lab', CompareLab);

  /* ================= D12 同一个人，两种网络 ================= */
  let shenzongCache = null;
  /* 两份材料的常用搭配：CBDB 王珪（或公开节录）对王裕华神宗朝网；教学构造“甲的文集”对“八人整体网” */
  const D12_PAIRS = [['cbdb-wanggui', 'wang2022-shenzong', '1845', 'CBDB 王珪 对 王裕华神宗朝亲属网'], ['twonet-ego', 'twonet-whole', '甲', '教学构造：甲的文集 对 八人整体网']];
  class TwoNetLab extends Lab {
    defaults() { return { left: 'cbdb-wanggui', right: 'wang2022-shenzong', person: '1845', sel: null }; }
    render() {
      const L = this.mat(this.s.left), Rm = this.mat(this.s.right);
      const reform = this.s.right === 'wang2022-shenzong' ? this.mat('wang2022-reform') : null;
      const fanti = new Map(); if (reform) { const ci = reform.columns.indexOf('name_pinyin'), cf = reform.columns.indexOf('name_fanti'); reform.rows.forEach((r) => fanti.set(r[ci], r[cf])); }
      if (Rm && (!shenzongCache || shenzongCache.id !== Rm.id)) { const g = W.graph(Rm, { directed: false }); shenzongCache = { id: Rm.id, g, st: W.stats(g), egos: new Set(Rm.edges.map((e) => String(e.s))), b: null }; }
      const gL = L ? W.graph(L) : null, stL = gL ? W.stats(gL) : null;
      // 两张网都有的人（按编号），供第三栏选择
      const both = gL && shenzongCache ? gL.nodes.filter((n) => shenzongCache.g.index.has(n.id)) : [];
      const pid = both.some((n) => n.id === this.s.person) ? this.s.person : (both[0]?.id || this.s.person);
      const centerL = gL && gL.nodes.length ? gL.nodes[stL.deg.indexOf(Math.max(...stL.deg))].id : null;
      // 左：第一份材料中此人的位置
      let left;
      if (!L) left = this.s.left === 'cbdb-wanggui' ? W.gate('CBDB 1845 号社会关系边表', 'CBDB 王珪记录') : '<p class="nil">材料缺</p>';
      else {
        const i = gL.index.get(pid), isEgo = gL.edges.every((e) => e.s === centerL || e.t === centerL);
        const P = isEgo ? egoPos(gL, centerL, 420, 330) : posFor(gL, 'D12L|' + L.id, { w: 420, h: 330 });
        left = `${W.drawGraph(gL, P, { key: 'D12L|' + L.id, w: 420, h: 330, labels: gL.nodes.length <= 30 ? 'all' : 'none', hi: new Set([pid]), arrows: false })}
          <p class="okbox">${esc(gL.nodes[i]?.label || pid)}：度 ${i != null ? stL.deg[i] : '—'}（全网 ${stL.n} 人）。${isEgo ? (pid === centerL ? '这是自我中心网络，所有人都只与他相连：他必然在中心。' : `这是以 ${esc(gL.nodes[gL.index.get(centerL)]?.label)} 为中心的自我中心网络：此人只连着中心，彼此的关系没有录。`) : ''}</p>`;
      }
      // 右：第二份材料中此人及其直接邻居
      let right;
      if (!Rm) right = '<p class="nil">材料缺</p>';
      else {
        const { g, st, egos } = shenzongCache, i = g.index.get(pid);
        const nm = (id) => { const n = g.nodes[g.index.get(id)]; return n ? `${fanti.get(n.label) || ''} ${n.label}`.trim() : id; };
        if (i == null) right = `<p class="nil">此人（编号 ${esc(pid)}）不在这张网中。</p>`;
        else {
          const small = g.nodes.length <= 30;
          const nb = [...W.adjacency(g, true).out[i]].map((j) => g.nodes[j].id);
          const sub = small ? g : { nodes: [g.nodes[i], ...nb.map((id) => g.nodes[g.index.get(id)])].map((n) => ({ ...n, label: nm(n.id) })), directed: false, edges: [] };
          if (!small) { sub.index = new Map(sub.nodes.map((n, k) => [n.id, k])); g.edges.forEach((e) => { if (sub.index.has(e.s) && sub.index.has(e.t)) sub.edges.push(e); }); }
          const rank = st.deg.filter((d) => d > st.deg[i]).length + 1;
          const isShen = Rm.id === 'wang2022-shenzong';
          const asEgo = Rm.edges.filter((e) => String(e.s) === pid).length, asT = Rm.edges.filter((e) => String(e.t) === pid).length;
          if (small && !shenzongCache.b) shenzongCache.b = W.betweenness(g);
          const B = shenzongCache.b;
          right = `${W.drawGraph(sub, posFor(sub, 'D12R' + Rm.id + (small ? '' : pid), { w: 420, h: 330 }), { key: 'D12R|' + Rm.id + (small ? '' : pid), w: 420, h: 330, labels: 'all', hi: new Set([pid]) })}
            <p class="okbox">全网 ${st.n} 人、${st.m} 条边（原表 ${Rm.edges.length} 行）、${st.comp.count} 个连通分量。此人度 ${st.deg[i]}，在 ${st.n} 人中排第 ${rank}；${isShen ? `作为 ego（亲属被重建的官员）${asEgo} 行，作为 target（他人的亲属）${asT} 行。` : ''}${B ? `介数 ${f2(B[i], B[i] % 1 ? 2 : 0)}，排第 ${B.filter((x) => x > B[i]).length + 1}。` : '<button class="small" data-btw="1">算全网介数（约数秒）</button>'}</p>
            ${small ? '' : `<p class="sub">只画此人及其直接邻居。邻居：${nb.map((id) => `${esc(nm(id))}${isShen && !egos.has(id) ? '（非 ego）' : ''}`).join('、')}。${isShen ? '本课未核这些边各是何种亲属。' : ''}</p>`}`;
        }
      }
      // 复制数据所记属性（只对王裕华数据）
      let attr = '';
      if (reform) {
        const ci = (k) => reform.columns.indexOf(k), pick = ['Wang Gui', 'Wang Anshi', 'Sima Guang'];
        attr = `<table class="steps compact"><tr><th>人物（籍贯）</th><th>变法立场</th><th>地方化程度</th><th>度（原值）</th></tr>${pick.map((p) => { const r = reform.rows.find((x) => x[ci('name_pinyin')] === p); return r ? `<tr><td>${esc(r[ci('name_fanti')])}（${esc(r[ci('hometown_prefecture_name')])}）</td><td>${esc(r[ci('support_continuous')] || '空')}</td><td>${f2(Number(r[ci('kinproximity')]))}</td><td>${esc(r[ci('degree')])}</td></tr>` : ''; }).join('')}</table><p class="sub">字段：support_continuous、kinproximity、degree（复制数据原名）。</p>
          <p class="sub">137 人中变法立场一栏为空者 ${reform.rows.filter((r) => r[ci('support_continuous')] === '').length} 人（Tackett 书评所说的 74 人）。“度”一栏为复制数据原值，其计算所依的网络本页未能对上（神宗朝亲属网中王珪的度为 ${shenzongCache?.st.deg[shenzongCache.g.index.get('1845')] ?? '—'}），本课未复算。</p>`;
      }
      const pairNav = `<p class="sub">常用搭配：${D12_PAIRS.map(([a, b, p, n]) => `<button class="small ${this.s.left === a && this.s.right === b ? 'on' : ''}" data-pair="${a}|${b}|${p}">${esc(n)}</button>`).join(' ')}</p>`;
      const personSel = both.length ? `<p><label>看谁 <select data-k="person">${both.map((n) => `<option value="${esc(n.id)}" ${n.id === pid ? 'selected' : ''}>${esc(n.label)}${n.id !== n.label ? '（' + esc(n.id) + '）' : ''}</option>`).join('')}</select></label> <span class="sub">两张网都有的 ${both.length} 人</span></p>` : '<p class="nil">两份材料没有共同的人（按编号）。</p>';
      const concl = this.s.left === 'twonet-ego' ? '<p class="note-box">甲在自己的文集网里必然居中；在八人彼此的关系里，甲只连着庚一人，居中的是丙、丁、戊。换成乙、丁看看：在左边都只有度 1，在右边差别很大。位置首先取决于建网所据的材料。</p>'
        : '<p class="note-box">CBDB 一张网回答“现存记录里谁与王珪有过哪种往来”，大半是他文集的目录；王裕华一张网回答“神宗朝主要官员的亲属彼此怎样相连”，王珪在其中只作为他人的亲属出现。两个答案都不错，回答的是不同的问题。在第二栏换成别的人看看。</p>';
      rerender(this, flowShell(pageById('D12'), [
        { title: '选两份材料', body: `${pairNav}${W.matSelect('network', this.s.left, 'left')}${W.card(L, { compact: true })}${W.matSelect('network', this.s.right, 'right')}${W.card(Rm, { compact: true })}` },
        { title: '第一份中的位置', body: `${personSel}${left}` },
        { title: '第二份中的位置', body: right },
        { title: '两种位置', body: `${attr}${concl}` },
      ]));
    }
    init() {
      this.addEventListener('click', (e) => {
        const pr = e.target.closest('[data-pair]'); if (pr) { const [a, b, p] = pr.dataset.pair.split('|'); this.s.left = a; this.s.right = b; this.s.person = p; this.save(); return; }
        if (!e.target.dataset.btw || !shenzongCache) return; e.target.textContent = '计算中…';
        setTimeout(() => { shenzongCache.b = W.betweenness(shenzongCache.g); this.render(); }, 20);
      });
    }
  }
  register('two-net-lab', TwoNetLab);

  /* ================= D13 从一条日记到人物与关系 ================= */
  const RELS = ['来访', '送行', '同行', '雇用或役使', '书信', '馈赠', '同席', '其他'];
  class DiaryLab extends Lab {
    defaults() { return { mat: 'meishi', pid: 'BS09', rows: {}, crop: '0', pick: '', rel: '送行', gender: '女', showImg: true }; }
    render() {
      const m = this.mat(this.s.mat);
      if (!m || !m.passages) { rerender(this, `${W.matSelect('events', this.s.mat)}${W.gate('『梅颸日記』十段录文与影像（demo/导入包/梅颸日記/ 生成的本机材料包）', '『梅颸日記』本机导入包')}
        <p class="sub">未导入时，以下为一条教学构造的示例行，只说明操作：日期“某年某月某日”，原文“晴。某氏来、娘二人同道。”，点选“某氏”“娘二人”后生成两条边。</p>`); return; }
      const p = m.passages.find((x) => x.id === this.s.pid) || m.passages.find((x) => x.classroom) || m.passages.find((x) => (x.ednotes || []).length) || m.passages[0];
      const rows = this.s.rows[p.id] || [];
      const diarist = m.id === 'meishi' ? '頼静' : m.diarist || m.card?.author?.replace(/（.*/, '') || '日记作者';
      const text = p.text, marks = rows.map((r) => r.who);
      let hl = esc(text); for (const w of [...new Set(marks)].sort((a, b) => b.length - a.length)) hl = hl.split(esc(w)).join(`<mark>${esc(w)}</mark>`);
      const img = p.image && m.images?.[p.image];
      const col1 = `<p><select data-k="pid">${m.passages.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${x.id}${x.classroom ? '（课堂展示）' : ''}　${esc(x.wareki)}</option>`).join('')}</select></p>
        <p class="sub">${esc(m.card?.version || '')}　第 ${esc(p.page)} 页｜${esc(p.date_raw ? p.date_raw + '＝' : '')}${esc(p.wareki)}（西暦 ${p.year}）</p>
        <div class="srcbox diary" data-src>${hl}</div>
        <p class="sub">用鼠标在原文中选出一个人物称呼，再点“加为人物”；或点下面导入包中已照录的称呼。</p>
        <p class="chips">${p.persons.map((x) => `<button class="small" data-who="${esc(x)}">${esc(x)}</button>`).join('')}</p>
        ${img ? `<details ${this.s.showImg ? 'open' : ''} data-img><summary>影像（${m.id === "meishi" ? "本机导入" : "公开影像"}；已裁去页脚 ${esc(this.s.crop)}%；点图放大）</summary><div class="cropbox" data-crop="${Number(this.s.crop)}"><img src="${img}" alt="${esc(p.id)} 影像" data-zoom="1"></div><label class="small">裁去页脚 <input type="range" min="0" max="30" data-k="crop" value="${esc(this.s.crop)}"> ${esc(this.s.crop)}%</label></details>` : ''}`;
      const col2 = `<p>人物：<input data-ki="pick" value="${esc(this.s.pick)}" placeholder="选中文字后自动填入" size="10"> <button data-add="1">加为人物</button></p>
        <p>关系：${seg('rel', RELS.map((r) => [r, r]), this.s.rel)}</p><p>性别（据称呼判读）：${seg('gender', [['女', '女'], ['男', '男'], ['不明', '不明']], this.s.gender)}</p>
        <table class="steps"><tr><th>起点</th><th>人物（照录称呼）</th><th>关系</th><th>性别判读</th><th>出处</th><th></th></tr>${rows.map((r, k) => `<tr><td>${diarist}</td><td>${esc(r.who)}</td><td>${esc(r.rel)}</td><td>${esc(r.gender)}</td><td class="small">${m.id === 'meishi' ? '全書 ' : ''}p.${esc(p.page)}</td><td><button class="small" data-delrow="${k}">删</button></td></tr>`).join('') || '<tr><td colspan="6" class="sub">尚无</td></tr>'}</table>
        <p><button class="small" data-csv="1">导出本段边表 CSV</button> ${window.W8Live ? '<button class="small" data-ner="1">请浏览器内模型给人物候选</button>' : ''}</p><div class="nerbox">${this._ner && this._ner.pid === p.id ? this._ner.html : ''}</div>`;
      const g = { nodes: [{ id: diarist, label: diarist }, ...[...new Set(rows.map((r) => r.who))].map((w) => ({ id: w, label: w }))], directed: false, edges: rows.map((r) => ({ s: diarist, t: r.who, w: 1, recs: [r] })) }; g.index = new Map(g.nodes.map((n, i) => [n.id, i]));
      const gcol = (i) => { const r = rows.find((x) => x.who === g.nodes[i].id); return !r ? '#fff' : r.gender === '女' ? '#f3c4c4' : r.gender === '男' ? '#c4d4f3' : '#e0e0e0'; };
      const fem = new Set(rows.filter((r) => r.gender === '女').map((r) => r.who)).size, all = new Set(rows.map((r) => r.who)).size;
      const col3 = `${W.drawGraph(g, egoPos(g, diarist, 360, 260), { w: 360, h: 260, labels: 'all', color: gcol })}
        <p class="okbox">本段：${all} 人，其中判读为女性 ${fem} 人。</p><p class="sub">粉：女；蓝：男；灰：不明。性别为学生据称呼判读，未考证。</p>`;
      const J = W.Pack.local()?.jbdb; let col4 = '<p class="sub">JBDB 查询结果在本机材料包中。</p>';
      if (m.id !== 'meishi') {
        // 公开日记没有数据库可对照，改与原书编者的注对照：编者对称呼作了哪些比定，与自己点选的是否一致
        const notes = p.ednotes || [], picked = rows.map((r) => r.who);
        const bi = (w) => (/[a-z]/i.test(w) ? [w] : [...Array(Math.max(1, w.length - 1)).keys()].map((k) => w.slice(k, k + 2)));   // 汉字称呼按相邻两字比，如“姫井子”与注中“姫井氏”
        const hitOf = (n) => picked.filter((w) => w && bi(w).some((x) => n.anchor.includes(x) || n.note.includes(x)));
        const withNotes = m.passages.filter((x) => (x.ednotes || []).length);
        col4 = `<p class="sub">这一材料没有现成的数据库，可与原书编者的注对照：${esc(m.ednote_src || '编者注')}。</p>
          ${notes.length ? notes.map((n) => { const h = hitOf(n); return `<div class="evid-card ${h.length ? 'ok' : ''}"><p class="small">注在“<b>${esc(n.anchor)}</b>”之后：</p><p class="src-line small">${esc(n.note)}</p><p class="sub">${h.length ? `你点选的“${h.map(esc).join('、')}”与这条注对得上。` : '你还没有点选这条注所说的人。'}</p></div>`; }).join('')
            : `<p class="nil">这一条没有编者注。</p>${withNotes.length ? `<p class="sub">有编者注的日条：${withNotes.map((x) => `<button class="small" data-set="pid:${esc(x.id)}">${esc(x.id)}</button>`).join(' ')}</p>` : ''}`}
          <details><summary>编者注之外还要核什么</summary><ul class="small"><li>同一人的不同称呼（${m.id === 'raisanyo-1797' ? '“禮卿”与“菅茶山”' : '“my Lord”与 Sir Edward Montagu'}）合不合并为一个节点？编者的比定是编者的判断，也可能错。</li>
            <li>${m.id === 'raisanyo-1797' ? '“大人”“數子”“長服二子”' : '“my wife”“the boy”“some friends”'}这类称呼指谁？不能确定的，在边表中保留原称呼，不要替它补名字。</li>
            <li>${m.id === 'raisanyo-1797' ? 'JBDB 收有頼家与菅茶山等人；导入本机材料包后，『梅颸日記』一页可以看数据库录了什么。' : '编者注多是人物小传，只说“这人是谁”，不说“这一天两人做了什么”：关系类型仍要自己从原文判读。'}</li></ul></details>`;
      }
      if (J && m.id === 'meishi') {
        const sd = (J.same_day || []).find((x) => x.passage === p.id);
        const ev = (sd?.events || []);
        const sum = J.summary || {};
        col4 = `<p class="sub">JBDB（${esc(J.endpoint)}，${esc(J.queried.slice(0, 10))} 查询）中同一天（${esc(p.wareki)}）的事件：</p>
          ${ev.length ? ev.map((e) => `<div class="evid-card"><p class="src-line small">${esc(e.notes || '')}</p><p class="sub">${e.sources.map((s) => (s.source === 9 ? '『梅颸日記』' : s.source === 3 ? '『春水日記』' : '来源 ' + s.source) + (s.page ? ' p.' + s.page : '')).join('、') || '来源未登记'}｜人物：${e.persons.map((x) => `${esc(x.name)}${x.female ? '（女）' : x.female === false ? '' : '（未标）'}`).join('、')}</p></div>`).join('') : '<p class="nil">这一天在 JBDB 中没有事件。</p>'}
          ${p.id === 'BS09' ? '<p class="note-box">文政七年九月六日，JBDB 中只有一条“餘一から當月六日出書狀”的书信事件；这一天赖静坐船赴京、一路送行的记事未录入。数据库的“网络”取决于编者录了哪些条目。</p>' : ''}
          <details><summary>两部日记在 JBDB 中的规模（按 cFemale 字段）</summary><table class="steps"><tr><th></th><th>事件</th><th>所见人物</th><th>女</th><th>男</th><th>未标</th></tr>${[['9', '『梅颸日記』'], ['3', '『春水日記』']].map(([k, n]) => sum[k] ? `<tr><td>${n}</td><td>${sum[k].events}</td><td>${sum[k].persons}</td><td>${sum[k].by_gender['女'] || 0}</td><td>${sum[k].by_gender['男'] || 0}</td><td>${sum[k].by_gender['未标'] || 0}</td></tr>` : '').join('')}</table>
            <p class="sub">讲义 3.4 用的就是这里的接口实查数（2026-11-02）。</p></details>`;
      }
      rerender(this, `${W.matSelect('events', this.s.mat)}${flowShell(pageById('D13'), [{ title: '导入日记', body: col1 }, { title: '点选人物', body: col2 }, { title: '选关系', body: col3 }, { title: m.id === 'meishi' ? '与 JBDB 对照' : '与编者注对照', body: col4 }])}`);
    }
    init() {
      /* 影像按比例裁去页脚：图载入后按原图宽高比设定外框高度，超出部分（页脚水印）不显示。 */
      const fit = () => this.querySelectorAll('.cropbox img').forEach((im) => { const f = () => { const c = Number(im.parentElement.dataset.crop) / 100; im.parentElement.style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight * (1 - c)}`; }; im.complete ? f() : im.addEventListener('load', f, { once: true }); });
      new MutationObserver(fit).observe(this, { childList: true, subtree: true });
      this.addEventListener('mouseup', (e) => { if (!e.target.closest('[data-src]')) return; const t = String(window.getSelection() || '').trim(); if (t && t.length <= 12) { this.s.pick = t; this.save(); } });
      this.addEventListener('click', async (e) => {
        const ps = this.mat(this.s.mat)?.passages || [], p = ps.find((x) => x.id === this.s.pid) || ps.find((x) => x.classroom) || ps.find((x) => (x.ednotes || []).length) || ps[0]; if (!p) return;
        const add = (who) => { if (!who) return; const rows = [...(this.s.rows[p.id] || []), { who, rel: this.s.rel, gender: this.s.gender }]; this.s.rows = { ...this.s.rows, [p.id]: rows }; this.s.pick = ''; this.save(); };
        if (e.target.dataset.zoom) { const d = document.createElement('dialog'); d.className = 'zoom'; const c = Number(this.s.crop); d.innerHTML = `<div class="cropbox big" data-crop="${c}"><img src="${e.target.src}" alt=""></div><p class="sub">已裁去页脚 ${c}%。点任意处关闭。</p>`; d.addEventListener('click', () => { d.close(); d.remove(); }); document.body.append(d); const im = d.querySelector('img'); const f = () => { d.querySelector('.cropbox').style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight * (1 - c / 100)}`; }; im.complete ? f() : im.onload = f; d.showModal(); return; }
        if (e.target.dataset.who) add(e.target.dataset.who);
        if (e.target.dataset.add) add(this.s.pick.trim());
        if (e.target.dataset.delrow != null) { const rows = [...(this.s.rows[p.id] || [])]; rows.splice(Number(e.target.dataset.delrow), 1); this.s.rows = { ...this.s.rows, [p.id]: rows }; this.save(); }
        if (e.target.dataset.csv) { const mm = this.mat(this.s.mat), dia = mm.id === 'meishi' ? '頼静' : mm.diarist || '日记作者'; download(`${mm.id}_${p.id}_边表.csv`, '﻿起点,人物,关系,性别判读,日期,出处\n' + (this.s.rows[p.id] || []).map((r) => [dia, r.who, r.rel, r.gender, p.wareki, (mm.id === 'meishi' ? '頼山陽全書本 p.' : 'p.') + p.page].join(',')).join('\n'), 'text/csv'); }
        if (e.target.dataset.ner) {
          e.target.disabled = true; e.target.textContent = '模型运行中…';
          try { const r = await window.W8Live.ner(p.text, ['person', 'personal name']); this._ner = { pid: p.id, html: `<p class="sub">${esc(r.model)}，${r.seconds} 秒；阈值 ${r.threshold}。候选只供核对，点一下加为人物：</p><p class="chips">${r.spans.map((s) => `<button class="small" data-who="${esc(s.text)}" title="${s.score}">${esc(s.text)} <small>${s.score}</small></button>`).join('') || '无候选'}</p>` }; }
          catch (err) { this._ner = { pid: p.id, html: `<p class="nil">${esc(String(err.message || err))}</p>` }; }
          this.render();
        }
      });
      this.addEventListener('toggle', (e) => { if (e.target.matches('[data-img]')) { this.s.showImg = e.target.open; store.set(this.key, this.s); } }, true);
    }
  }
  register('diary-lab', DiaryLab);

  /* ================= D20 缺省的年份与时序切片 ================= */
  class YearsLab extends Lab {
    defaults() { return { mat: 'cbdb-wanggui', miss: null, suspect: null, incl: true, width: '10', at: '', pa: '甲', pb: '丁' }; }
    render() {
      const m = this.mat(this.s.mat);
      if (!m) { rerender(this, `${W.matSelect('network', this.s.mat)}${this.s.mat === 'cbdb-wanggui' ? W.gate('CBDB 1845 号社会关系边表（Year 栏）', 'CBDB 王珪记录') : '<p class="nil">材料缺</p>'}`); return; }
      const miss = (this.s.miss ?? (m.declare?.missing_time || []).join(',')).split(/[,，\s]+/).filter(Boolean), sus = (this.s.suspect ?? (m.declare?.suspect_time || []).join(',')).split(/[,，\s]+/).filter(Boolean);
      const raw = {}; m.edges.forEach((e) => { const t = e.time_raw ?? (e.time != null ? String(e.time) : '（空）'); raw[t] = (raw[t] || 0) + 1; });
      const rawRows = Object.entries(raw).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, miss.includes(k) ? '缺省' : sus.includes(k) ? '可疑' : '', miss.includes(k)]);
      const yrs = m.edges.map((e) => { const r = e.time_raw ?? String(e.time ?? ''); const n = Number(r); return { e, r, y: r !== '' && !miss.includes(r) && Number.isFinite(n) ? n : null }; });
      const dated = yrs.filter((x) => x.y != null), W0 = Number(this.s.width);
      const lo = dated.length ? Math.floor(Math.min(...dated.map((x) => x.y)) / W0) * W0 : 0, hi = dated.length ? Math.max(...dated.map((x) => x.y)) : 0;
      const slices = []; for (let a = lo; a <= hi; a += W0) slices.push([a, a + W0 - 1, dated.filter((x) => x.y >= a && x.y < a + W0).length]);
      const at = Number(this.s.at) || (slices[0]?.[0] ?? 0), cur = slices.find((s) => s[0] === at) || slices[0];
      const inSlice = cur ? dated.filter((x) => x.y >= cur[0] && x.y <= cur[1]) : [];
      const birth = m.id === 'cbdb-wanggui' ? 1019 : null;
      const col1 = `<p class="sub">时间一栏的原值（未作任何换算）：</p>${W.bars(rawRows.map(([k, v, note, dim]) => [k, v, note, dim]))}
        <p class="sub">${m.id === 'cbdb-wanggui' ? '讲义：0 为 68 条、-1 为 11 条、1085 为 14 条，有具体年份的 4 条。1085 恰为王珪卒年；1011 早于王珪出生（1019），推测为韓國華卒年（讲义推断，待核）。' : ''}</p>`;
      const col2 = `<label>缺省值（这些原值视为“无年份”）<input data-k="miss" value="${esc(miss.join(','))}"></label>
        <label>可疑值（加提示，不改数据）<input data-k="suspect" value="${esc(sus.join(','))}"></label>
        <p class="okbox">有年份 ${dated.length} 条，缺省 ${yrs.length - dated.length} 条。${sus.length ? `其中可疑值（${sus.map(esc).join('、')}）${dated.filter((x) => sus.includes(x.r)).length} 条。` : ''}${birth ? `早于事主出生（${birth}）的 ${dated.filter((x) => x.y < birth).length} 条。` : ''}</p>
        <p class="sub">CBDB 年份 0、-1 的含义未见接口文档说明；新记录以 -9999 表示未知（据 CBDB 代码库）。页面让使用者声明，不替数据库下结论。</p>`;
      const col3 = slices.length ? `<p>切片宽度 ${seg('width', [['5', '5 年'], ['10', '10 年'], ['20', '20 年']], this.s.width)}</p>
        <div class="slicebars">${slices.map(([a, b, n]) => `<button data-set="at:${a}" class="${cur && a === cur[0] ? 'on' : ''}" title="${a}—${b}：${n} 条"><span style="height:${(n / Math.max(1, ...slices.map((s) => s[2]))) * 100}%"></span><i>${a}</i></button>`).join('')}</div>
        <p class="okbox">${cur ? `${cur[0]}—${cur[1]}：${cur[2]} 条` : ''}${sus.length && cur && inSlice.some((x) => sus.includes(x.r)) ? `，其中 ${inSlice.filter((x) => sus.includes(x.r)).length} 条是可疑值 ${sus.join('、')}：这一片的“高峰”可能是编码造成的。` : ''}</p>
        <ul class="small">${inSlice.slice(0, 12).map((x) => `<li><span class="mono">${esc(x.r)}</span>｜${esc(x.e.type || '')}｜${esc(m.nodes.find((n) => n.id === x.e.t)?.label || x.e.t)}｜${esc((x.e.ref || '').slice(0, 30))}</li>`).join('')}</ul>` : '<p class="nil">声明缺省值后没有任何有年份的记录。</p>';
      // 进阶：时间顺序路径（小型时序网）
      const T = this.mat('toy-temporal'); let col4 = '';
      if (T) {
        const ids = T.nodes.map((n) => n.id), arrive = { [this.s.pa]: -Infinity }, via = {};
        const E = [...T.edges].sort((a, b) => a.time - b.time); for (const e of E) for (const [x, y] of [[e.s, e.t], [e.t, e.s]]) if (arrive[x] != null && arrive[x] <= e.time && (arrive[y] == null || e.time < arrive[y])) { arrive[y] = e.time; via[y] = [x, e.time]; }
        const path = []; let c = this.s.pb; while (c && via[c]) { path.unshift(`${via[c][0]}→${c}（${via[c][1]}）`); c = via[c][0]; }
        col4 = `<details data-adv><summary>进阶：时间顺序路径（教学构造的小型时序网）</summary><p class="sub">边：${T.edges.map((e) => `${e.s}—${e.t}（${e.time}）`).join('；')}</p>
          <p>消息从 <select data-k="pa">${ids.map((i) => `<option ${this.s.pa === i ? 'selected' : ''}>${i}</option>`).join('')}</select> 能否传到 <select data-k="pb">${ids.map((i) => `<option ${this.s.pb === i ? 'selected' : ''}>${i}</option>`).join('')}</select>？</p>
          <p class="okbox">${this.s.pa === this.s.pb ? '同一人。' : arrive[this.s.pb] != null ? `能：${path.join('，')}` : '不能：沿路径的边，时间必须递增。'}</p>
          <p class="sub">把所有年份压成一张静态网，甲—乙—丙—丁是连通的；按时间顺序，甲在 1060 年才连上乙，而乙与丙的往来一次在 1055、一次在 1070，消息只能走 1070 那次。</p></details>`;
      }
      rerender(this, `${W.matSelect('network', this.s.mat)}${flowShell(pageById('D20'), [{ title: '看年份分布', body: col1 }, { title: '声明缺省值', body: col2 }, { title: '切片', body: col3 }, { title: '时间顺序路径', body: col4 }])}`);
    }
  }
  register('years-lab', YearsLab);

  /* ================= D23 回读：王珪边表小任务（贯穿页） ================= */
  const STAGES = [
    { k: 'scale', name: '读图', page: 'D01', hint: '比较两张图（全部关系、去掉纪念文字），各写一句“在现存记录中……”。3 分钟。' },
    { k: 'pattern', name: '挑一个格局', page: 'D01', hint: '例如“去掉纪念文字以后，王珪推荐的人多于推荐他的人”，或“为王珪写跋的人都比他晚”。2 分钟。' },
    { k: 'source', name: '回读三条原文', page: 'D14', hint: '从练习材料一、二与边表出处栏中选三条与这个格局有关的原文，记下位置。7 分钟。' },
    { k: 'readback', name: '下判断', page: 'D04', hint: '这个格局来自史实、来源的构成，还是编码的约定？能写进论文的哪一句？还缺什么材料？3 分钟。' },
  ];
  class ReadbackThrough extends Lab {
    get key() { return 'w8/D23'; }
    defaults() { return { mat: 'cbdb-wanggui', stage: 'scale', s1a: '', s1b: '', pattern: '', picks: [], judge: '', sentence: '', need: '', done: {} }; }
    sync() { const d = this.s.done; this.s.done = { scale: !!(this.s.s1a && this.s.s1b), pattern: !!this.s.pattern.trim(), source: this.s.picks.length >= 3, readback: !!(this.s.judge && this.s.sentence.trim()) }; store.set(this.key, this.s); const ch = JSON.stringify(d) !== JSON.stringify(this.s.done); if (ch) document.dispatchEvent(new CustomEvent('w8-through')); return ch; }
    save() { this.sync(); this.render(); }
    /* 打字时不整页重绘（保留输入法与光标），只在完成状态变化时更新侧栏。 */
    onInput() { if (this.sync()) { const r = this.querySelector('.through-rail'); if (r) r.innerHTML = this.rail(); } }
    rail() {
      const s = this.s, st = STAGES.find((x) => x.k === s.stage);
      return `<p><b>王珪边表小任务</b>：两人一组，13 分钟＋两组报告 2 分钟。</p>
        <div class="stage-grid">${STAGES.map((x, i) => `<button data-set="stage:${x.k}" class="${s.stage === x.k ? 'on' : ''} ${s.done[x.k] ? 'done' : ''}">${i + 1} ${x.name}</button>`).join('')}</div>
        <p class="note-box">${esc(st.hint)} 讲解页：${pageLink(st.page)}</p>
        <ul class="conds">${[['选尺度', 'scale'], ['看格局', 'pattern'], ['问来源', 'source'], ['回原文', 'readback']].map(([c, k]) => `<li class="${s.done[k] ? 'on' : ''}">${c}</li>`).join('')}</ul>
        <div class="through-actions"><button data-th="export">导出记录单（Markdown）</button><label class="pack-btn small">导入旧记录<input type="file" accept=".json" data-th-import hidden></label><button data-th="json">另存为 JSON</button><button data-th="clear">清空</button></div><p class="pack-err th-err" hidden></p>`;
    }
    render() {
      const m = this.mat(this.s.mat), s = this.s;
      if (!m) { rerender(this, `<div class="through"><div class="through-main">${W.matSelect('network', s.mat)}${s.mat === 'cbdb-wanggui' ? W.gate('CBDB 1845 号社会关系边表', 'CBDB 王珪记录') : ''}</div><aside class="through-rail disabled">${this.rail()}</aside></div>`); return; }
      let main = '';
      if (s.stage === 'scale' || s.stage === 'pattern') {
        const g1 = W.graph(m), g2 = W.graph(m, { keep: (e) => !W.MEMORIAL.includes(e.type) }), c = '1845';
        const P = (g) => (g.nodes.some((n) => n.id === c) ? egoPos(g, c, 360, 280) : W.layout(g, { w: 360, h: 280 }));
        main = `<div class="split2"><div><p class="sub">图一：全部 ${g1.records} 条</p>${W.drawGraph(g1, P(g1), { w: 360, h: 280, labels: 'none', arrows: false })}<label>在现存记录中……<textarea data-ki="s1a" rows="2">${esc(s.s1a)}</textarea></label></div>
          <div><p class="sub">图二：去掉纪念文字后 ${g2.records} 条</p>${W.drawGraph(g2, P(g2), { w: 360, h: 280, labels: 'all', arrows: true })}<label>在现存记录中……<textarea data-ki="s1b" rows="2">${esc(s.s1b)}</textarea></label></div></div>
          ${s.stage === 'pattern' ? `<label><b>我挑的格局</b><textarea data-ki="pattern" rows="2" placeholder="例如：去掉纪念文字以后，王珪推荐的人多于推荐他的人">${esc(s.pattern)}</textarea></label>
            <p class="sub">提前完成的小组：改用“推荐”与“弹劾”两类关系重做第二至四步。</p>` : ''}`;
      } else if (s.stage === 'source') {
        const p1 = W.Mat.text('practice1'), p2 = W.Mat.text('practice2');
        const cands = [...(p1 ? [['练习材料一', p1.title, p1.text, p1.ref]] : []), ...(p2 ? [['练习材料二', p2.title, p2.text, p2.ref]] : []),
          ...m.edges.filter((e) => e.ref && e.ref !== '[n/a]').map((e) => [`边表第 ${e.row} 行`, `${m.nodes.find((n) => n.id === e.t)?.label || e.t}｜${e.type}`, e.ref, 'CBDB 1845 号社会关系出处栏'])];
        main = `<p class="okbox">已选 ${s.picks.length} 条（至少三条）。</p><ol class="picked">${s.picks.map((p, i) => `<li><b>${esc(p.where)}</b>｜${esc(p.title)}<br><span class="src-line small">${esc(p.text.slice(0, 120))}</span><br><input data-note="${i}" value="${esc(p.note || '')}" placeholder="这条原文说明了什么" size="40"> <button class="small" data-unpick="${i}">移除</button></li>`).join('')}</ol>
          <div class="cands">${cands.map(([w, t, x, r], i) => `<div class="evid-card"><p><b>${esc(w)}</b>｜${esc(t)} <button class="small" data-pickc="${i}">选这条</button></p><p class="src-line small">${esc(x.slice(0, 200))}${x.length > 200 ? '……' : ''}</p><p class="sub">${esc(r)}</p></div>`).join('')}</div>`;
        this._cands = cands;
      } else {
        main = `<p>${seg('judge', [['史实', '来自史实'], ['来源构成', '来自来源的构成'], ['编码约定', '来自编码的约定']], s.judge)}</p>
          <label>能写进论文的一句话<textarea data-ki="sentence" rows="3">${esc(s.sentence)}</textarea></label><label>还缺什么材料<textarea data-ki="need" rows="2">${esc(s.need)}</textarea></label>
          <p class="sub">记录单与讲义附录“回读记录单（模板）”同栏；右侧可导出。</p>`;
      }
      rerender(this, `<div class="through"><div class="through-main">${W.matSelect('network', s.mat)}<div class="through-pane">${main}</div><p class="sub">材料：练习材料一至三；CBDB 1845 号边表（${esc(W.Mat.origin(m.id))}）。</p></div><aside class="through-rail">${this.rail()}</aside></div>`);
    }
    md() {
      const s = this.s; return `# 回读记录单（第八讲第六节）\n\n导出：${new Date().toLocaleString('zh-CN')}｜材料：${s.mat}\n\n| 栏 | 内容 |\n|---|---|\n| 图上看到的格局（图一） | ${s.s1a} |\n| 图上看到的格局（图二） | ${s.s1b} |\n| 挑的格局 | ${s.pattern} |\n${s.picks.map((p, i) => `| 原文${'一二三四五六'[i] || i + 1}（${p.where}） | ${p.text.replace(/\n/g, ' ').slice(0, 200)}；${p.note || ''}（${p.ref}） |`).join('\n')}\n| 判断 | ${s.judge} |\n| 能写进论文的一句话 | ${s.sentence} |\n| 还缺什么材料 | ${s.need} |\n`;
    }
    init() {
      this.addEventListener('click', (e) => {
        const t = e.target;
        if (t.dataset.pickc != null && this._cands) { const [where, title, text, ref] = this._cands[Number(t.dataset.pickc)]; if (!this.s.picks.some((p) => p.where === where && p.text === text)) this.s.picks = [...this.s.picks, { where, title, text, ref }]; this.save(); }
        if (t.dataset.unpick != null) { const p = [...this.s.picks]; p.splice(Number(t.dataset.unpick), 1); this.s.picks = p; this.save(); }
        if (t.dataset.th === 'export') download('回读记录单.md', this.md());
        if (t.dataset.th === 'json') download('回读记录单.json', JSON.stringify({ format: 'w8-readback/v1', ...this.s }, null, 1), 'application/json');
        if (t.dataset.th === 'clear' && confirm('清空本页记录？')) { this.s = this.defaults(); this.save(); }
      });
      this.addEventListener('input', (e) => { const i = e.target.dataset.note; if (i != null) { const p = [...this.s.picks]; p[Number(i)] = { ...p[Number(i)], note: e.target.value }; this.s.picks = p; store.set(this.key, this.s); } });
      this.addEventListener('change', async (e) => {
        if (!e.target.matches('[data-th-import]')) return; const f = e.target.files[0]; e.target.value = ''; const err = this.querySelector('.th-err');
        try { const j = JSON.parse(await f.text()); if (j.format !== 'w8-readback/v1' || !Array.isArray(j.picks)) throw new Error('不是回读记录单 JSON'); delete j.format; this.s = { ...this.defaults(), ...j }; this.save(); }
        catch (x) { if (err) { err.hidden = false; err.textContent = '导入失败，当前记录未改动：' + x.message; } }
      });
    }
  }
  register('readback-through', ReadbackThrough);

  /* ================= D24 结语 ================= */
  class HeroEnd8 extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<div class="hero-lab"><div><p class="hero-title">远看给出问题与线索，回读给出论据。</p>
        <p class="hero-lead">王珪的星形网络，大半是《華陽集》的目录，其中又有一部分是他的姻亲；从图上走回史料，读出那篇为岳母所作的墓志，格局才变成可以写进论文的判断。</p></div>
        <div class="hero-claim"><small>四个动作</small><div class="hero-path">${[['选尺度', 'D03'], ['看格局', 'D05'], ['问来源', 'D04'], ['回原文', 'D23']].map(([a, p]) => `<a href="#${p}"><b>${a}</b></a>`).join('')}</div>
          <p style="margin-top:12px">下一讲转向历史人物模拟与历史仿真：从模型出发，问一种机制能否产生与史料相符的格局。社会科学中历史建模的做法与批评，见 ${pageLink('D04', 'D04 进阶层')} 与《讲义附录：扩充部分》甲八。</p></div></div>`;
    }
  }
  register('hero-end8', HeroEnd8);
})();
