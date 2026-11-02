/* 第八周页面组件（一）：D00、D01、D04、D06、D08、D09。依赖 deck-core.js（window.Deck）与 week08-core.js（window.W8）。
 * 每页的数据都从“材料”读入：预置材料只是材料下拉框中的选项，使用者导入的表格走同一条路。 */
(() => {
  'use strict';
  const { esc, store, pageById, pageLink, download, flowShell, rerender, register } = window.Deck;
  const W = window.W8;
  const seg = (k, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-set="${k}:${esc(v)}" class="${String(cur) === String(v) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const f2 = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');

  /* 页面组件基类：状态按页命名存浏览器（w8/Dxx），材料变动时重绘。 */
  class Lab extends HTMLElement {
    connectedCallback() {
      this.setAttribute('data-needs-pack', '');
      this.packChanged = () => this.render();
      this.s = Object.assign({}, this.defaults?.() || {}, store.get(this.key, {}));
      this.addEventListener('click', (e) => { const b = e.target.closest('[data-set]'); if (!b) return; const i = b.dataset.set.indexOf(':'); this.set(b.dataset.set.slice(0, i), b.dataset.set.slice(i + 1)); });
      this.addEventListener('change', (e) => { const k = e.target.dataset.k; if (k) { this.s[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; this.save(); } });
      this.addEventListener('input', (e) => { const k = e.target.dataset.ki; if (k) { this.s[k] = e.target.value; store.set(this.key, this.s); this.onInput?.(k); } });
      this.init?.(); this.render();
    }
    get key() { return 'w8/' + this.closest('deck-slide')?.getAttribute('slide-id'); }
    set(k, v) { this.s[k] = v; this.save(); }
    save() { store.set(this.key, this.s); this.render(); }
    mat(id) { return W.Mat.get(id); }
  }
  const layoutCache = new Map();
  function posFor(g, key, opts = {}) { const k = key + '|' + g.nodes.length + '|' + g.edges.length + '|' + JSON.stringify(opts); if (!layoutCache.has(k)) layoutCache.set(k, W.layout(g, opts)); return layoutCache.get(k); }
  /* 王珪居中、其余按类型分组围成一圈的星形布局（自我中心网络）。 */
  function egoPos(g, center, w, h, groupOf) {
    const others = g.nodes.map((n, i) => [n, i]).filter(([n]) => n.id !== center);
    others.sort((a, b) => String(groupOf?.(a[0].id) || '').localeCompare(String(groupOf?.(b[0].id) || '')) || a[0].id.localeCompare(b[0].id));
    const P = g.nodes.map(() => [w / 2, h / 2]); const R = Math.min(w, h) / 2 - 28;
    others.forEach(([, i], k) => { const a = (2 * Math.PI * k) / others.length - Math.PI / 2; P[i] = [w / 2 + R * Math.cos(a), h / 2 + R * Math.sin(a)]; });
    return P;
  }

  /* ================= D00 封面 ================= */
  class HeroCover8 extends HTMLElement {
    connectedCallback() { this.render(); document.addEventListener('w8-through', () => this.render()); }
    render() {
      const t = store.get('w8/D23', {}); const done = (k) => !!(t.done || {})[k];
      this.innerHTML = `<div class="hero-lab"><div><p class="hero-title">机器读出了“规律”，怎样回到史学本身的理解？</p>
        <p class="hero-lead">大量数据化的材料，经由机器而非人的各种“阅读”方式处理：统计字词、计算关系、编码地点、排列时间。规律是真的，但它可能是来源的规律，不一定是历史的规律。</p></div>
        <div class="hero-claim"><small>本讲的四个动作（贯穿页 D23 逐一记录）</small>
          <div class="hero-path">${[['选尺度', '第一节 尺度', 'D03', 'scale'], ['看格局', '第二至五节 析文、构网、舆图、编年', 'D05', 'pattern'], ['问来源', '各节“要追问”', 'D04', 'source'], ['回原文', '第六节 回读', 'D23', 'readback']]
            .map(([a, b, p, k]) => `<a href="#${p}"><b>${a}</b> <small>${b}</small> <span class="dot ${done(k) ? 'on' : ''}" title="${done(k) ? '贯穿页已记录' : '贯穿页未记录'}"></span></a>`).join('')}</div>
          <p style="margin-top:12px">王珪的 97 条社会关系 → 星形网络 → 73 条是他为别人写的纪念文字 → 回到《華陽集》卷五十一，读出那篇为岳母所作的墓志。</p></div></div>`;
    }
  }
  register('hero-cover8', HeroCover8);

  /* ================= D01 王珪为什么在中心 ================= */
  class WangguiLab extends Lab {
    defaults() { return { mat: 'cbdb-wanggui', off: [], memorial: false, refOnly: false, sel: null, judge: '' }; }
    render() {
      const m = this.mat(this.s.mat);
      if (!m) { rerender(this, `${W.matSelect('network', this.s.mat)}${this.s.mat === 'cbdb-wanggui' ? W.gate('CBDB 1845 号社会关系边表（97 条）', 'CBDB 王珪记录') : '<p class="nil">所选材料不在当前材料库中。</p>'}`); return; }
      const types = [...new Set(m.edges.map((e) => e.type || '（无类型）'))];
      const counts = Object.fromEntries(types.map((t) => [t, m.edges.filter((e) => (e.type || '（无类型）') === t).length]));
      const hasMem = types.some((t) => W.MEMORIAL.includes(t));
      const off = new Set(this.s.off);
      const keep = (e) => !off.has(e.type || '（无类型）') && !(this.s.memorial && W.MEMORIAL.includes(e.type)) && !(this.s.refOnly && (!e.ref || e.ref === '[n/a]'));
      const g = W.graph(m, { keep }), gAll = W.graph(m);
      const degAll = W.stats(gAll).deg;
      const center = gAll.nodes.length ? gAll.nodes.reduce((a, n) => (degAll[gAll.index.get(n.id)] > degAll[gAll.index.get(a.id)] ? n : a)).id : null;
      const isEgo = gAll.edges.every((e) => e.s === center || e.t === center);
      const P = isEgo ? egoPos(g, center, 520, 420, (id) => { const e = m.edges.find((x) => x.t === id || x.s === id); return e ? (W.MEMORIAL.includes(e.type) ? '0' : '1') + e.type : ''; }) : posFor(g, m.id + this.s.off.join() + this.s.memorial + this.s.refOnly, { w: 520, h: 420 });
      const selE = this.s.sel != null ? g.edges[this.s.sel] : null;
      const memCol = (e) => (e.recs.some((r) => W.MEMORIAL.includes(r.type)) ? '#c9a400' : '#164ec7');
      const people = new Set(g.edges.flatMap((e) => [e.s, e.t])); if (center) people.delete(center);
      const lecture = m.id === 'cbdb-wanggui' ? W.LECTURE_GROUPS.map(([k, ts]) => [k, m.edges.filter((e) => ts.includes(e.type)).length]) : null;
      const LECT = [54, 8, 11, 8, 4, 6, 4, 2];
      const col1 = `${W.drawGraph(g, P, { key: 'D01|' + m.id, w: 520, h: 420, edgeColor: memCol, hi: new Set(center ? [center] : []), hiEdges: new Set(this.s.sel != null ? [this.s.sel] : []), labels: g.nodes.length <= 30 ? 'all' : 'none', arrows: false })}
        <p class="sub">黄线：纪念文字类；蓝线：其他。点任意一条线看出处。当前 ${g.records} 条记录、${people.size} 人（不含中心）。</p>
        <label class="field">我的一句判断（先写再开开关）<textarea data-ki="judge" rows="2" placeholder="这张图说明……">${esc(this.s.judge)}</textarea></label>`;
      const col2 = lecture ? `<p class="sub">按讲义 @fig-wanggui-types 的合并口径，页面现场计数：</p>
          <table class="steps"><tr><th>关系类型</th><th>现场计数</th><th>讲义</th></tr>${lecture.map(([k, v], i) => `<tr class="${v === LECT[i] ? 'ok' : 'bad'}"><td>${esc(k)}</td><td>${v}</td><td>${LECT[i]}</td></tr>`).join('')}
          <tr><td><b>合计</b></td><td><b>${lecture.reduce((a, [, v]) => a + v, 0)}</b></td><td>97</td></tr></table>
          <p class="sub">纪念文字类 ${m.edges.filter((e) => W.MEMORIAL.includes(e.type)).length} 条；出处含《華陽集》 ${m.edges.filter((e) => /華陽集/.test(e.ref || '')).length} 条；无出处（[n/a]）${m.edges.filter((e) => !e.ref || e.ref === '[n/a]').length} 条。</p>`
        : W.bars(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 14));
      const col3 = `${hasMem ? `<label class="check-row big"><input type="checkbox" data-k="memorial" ${this.s.memorial ? 'checked' : ''}>去掉纪念文字（讲义口径 ${W.MEMORIAL.length} 种类型）</label>` : ''}
        <label class="check-row"><input type="checkbox" data-k="refOnly" ${this.s.refOnly ? 'checked' : ''}>只看有出处的记录</label>
        <p class="sub" style="margin-top:6px">按类型开关（由导入表中实际出现的类型生成）：</p>
        <div class="typelist">${types.sort((a, b) => counts[b] - counts[a]).map((t) => `<label class="check-row small"><input type="checkbox" data-type="${esc(t)}" ${off.has(t) ? '' : 'checked'}>${esc(t)}（${counts[t]}）</label>`).join('')}</div>
        <p class="okbox">剩余 <b>${g.records}</b> 条记录、<b>${people.size}</b> 人。${isEgo ? '这是自我中心网络：所有边都连着中心，画出来必然是星形（3.1）。' : ''}</p>`;
      let col4 = '<p class="sub">点图上一条线。</p>';
      if (selE) {
        const nm = (id) => g.nodes[g.index.get(id)]?.label || id;
        col4 = `<p><b>${esc(nm(selE.s))} — ${esc(nm(selE.t))}</b>（${selE.w} 条记录）</p>${selE.recs.map((r) => {
          const hits = W.findInHuayangji(r.ref);
          return `<div class="evid-card"><p>${esc(r.type || '')}｜年份原值 <span class="mono">${esc(r.time_raw ?? '')}</span>｜边表第 ${esc(r.row ?? '—')} 行</p><p class="src-line small">${esc(r.ref || '（无出处）')}</p>${r.note ? `<p class="sub">${esc(r.note)}</p>` : ''}
            ${hits.length ? `<p class="sub">本地《華陽集》中找到篇题：</p>${hits.map((h) => `<p class="lab-quote">卷${h.juan}：${esc(h.text.slice(0, 80))}${h.text.length > 80 ? '……' : ''} <button class="small" data-hy="${h.juan}:${h.line}">读这一卷原文</button></p>`).join('')}`
              : /華陽集/.test(r.ref || '') ? '<p class="sub">出处为《華陽集》，但本地卷三十五至六十中未找到此篇题（或在卷四十五至四十八，本地文本为空，只在教师影像中）。</p>' : ''}</div>`;
        }).join('')}`;
        if (this.s.hy) { const [j, l] = this.s.hy.split(':').map(Number); const v = W.Mat.text('huayangji')?.juan?.[j]; if (v) col4 += `<div class="srcbox small-src">${v.lines.slice(Math.max(0, l), l + 6).map((x, i) => i === 0 ? `<mark>${esc(x)}</mark>` : esc(x)).join('\n')}</div><p class="sub">《華陽集》卷${j}（四庫全書本，维基文库源码）。</p>`; }
      }
      rerender(this, `${W.matSelect('network', this.s.mat)}${flowShell(pageById('D01'), [{ title: '全部关系画成网', body: col1 }, { title: '按类型计数', body: col2 }, { title: '打开过滤开关', body: col3 }, { title: '点边回原文', body: col4 }])}`);
    }
    init() {
      this.addEventListener('click', (e) => {
        const ed = e.target.closest('[data-edge]'); if (ed) { this.s.sel = Number(ed.dataset.edge); this.s.hy = null; this.save(); }
        const hy = e.target.closest('[data-hy]'); if (hy) { this.s.hy = hy.dataset.hy; this.save(); }
      });
      this.addEventListener('change', (e) => { const t = e.target.dataset.type; if (t == null) return; const off = new Set(this.s.off); e.target.checked ? off.delete(t) : off.add(t); this.s.off = [...off]; this.s.sel = null; this.save(); });
    }
  }
  register('wanggui-lab', WangguiLab);

  /* ================= D04 规律从哪里来 ================= */
  const SESHAT = { // 教学构造：模仿 Seshat“道德神”争议的结构（C-25），不是 Seshat 数据
    rows: [['甲国', 'present', 'unknown'], ['乙国', 'present', 'unknown'], ['丙国', 'present', 'present'], ['丁国', 'present', 'unknown'], ['戊国', 'absent', 'absent'], ['己国', 'present', 'unknown'], ['庚国', 'present', 'present'], ['辛国', 'absent', 'unknown']],
    note: '每行一个政体：第 2 栏为“社会复杂化之后是否有道德神”，第 3 栏为“社会复杂化之前是否有道德神”。present＝有记录表明有，absent＝有记录表明无，unknown＝无记录。',
  };
  class SourceLab extends Lab {
    defaults() { return { a: 'cbdb-wanggui', b: 'wang2022-shenzong', q: 'material', miss: 'absent' }; }
    render() {
      const A = this.mat(this.s.a), B = this.mat(this.s.b);
      const side = (m, k) => {
        if (!m) return `${W.matSelect('network', this.s[k], k)}${this.s[k] === 'cbdb-wanggui' ? W.gate('CBDB 1845 号社会关系边表', 'CBDB 王珪记录') : '<p class="nil">材料缺</p>'}`;
        const refs = {}; m.edges.forEach((e) => { const r = e.ref ? (/華陽集/.test(e.ref) ? '《華陽集》' : e.ref === '[n/a]' ? '无出处（[n/a]）' : (e.ref.split(/\s*\/\s*/)[1] || e.ref.replace(/第\s*\d+\s*行/, '').trim().slice(0, 24) || '其他出处')) : '无出处'; refs[r] = (refs[r] || 0) + 1; });
        const times = {}; m.edges.forEach((e) => { const t = e.time_raw ?? '（无时间栏）'; times[t] = (times[t] || 0) + 1; });
        return `${W.matSelect('network', this.s[k], k)}${W.card(m, { compact: true })}
          <p class="sub">材料构成（出处来自哪里）：</p>${W.bars(Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 6))}
          <p class="sub">时间一栏的原值（编码约定）：</p>${W.bars(Object.entries(times).sort((a, b) => b[1] - a[1]).slice(0, 6))}`;
      };
      const Q = [['fact', '史实', '格局来自过去发生的事？要回到原文逐条读出处。', `去 ${pageLink('D23', 'D23 回读')}、${pageLink('D14', 'D14 核验')}`],
        ['material', '材料构成', '格局来自材料收了什么、没收什么？看出处的分布：王珪的 97 条中 63 条出自他自己的《華陽集》。', `本页左右两栏；${pageLink('D01', 'D01 过滤开关')}`],
        ['coding', '编码约定', '格局来自编者怎样记？看时间栏的 0、-1、1085，看同一件事是否两个方向各记一条。', `${pageLink('D20', 'D20 年份')}、${pageLink('D08', 'D08 查重')}`],
        ['model', '模型假设', '格局来自方法本身？与随机网络比，看结构是否超出随机连线所能产生的范围。', `${pageLink('D11', 'D11 零模型')}`]];
      const qbox = `<div class="q4">${Q.map(([k, n, d, l]) => `<button data-set="q:${k}" class="${this.s.q === k ? 'on' : ''}"><b>${n}</b></button>`).join('')}</div>${Q.filter(([k]) => k === this.s.q).map(([, n, d, l]) => `<p class="note-box"><b>${n}</b>：${esc(d)}<br>动手查：${l}</p>`).join('')}`;
      // 进阶：缺失值的两种处理（教学构造）
      const rows = SESHAT.rows.map(([n, after, before]) => [n, after, before === 'unknown' ? (this.s.miss === 'absent' ? 'absent*' : null) : before]);
      const used = rows.filter((r) => r[2] != null);
      const beforeYes = used.filter((r) => r[2] === 'present').length, afterYes = used.filter((r) => r[1] === 'present').length;
      const concl = beforeYes < afterYes / 2 ? '道德神多出现在社会复杂化之后（“复杂化在先”）' : '无法得出“复杂化在先”：有记录的政体中，复杂化之前已有道德神的比例不低';
      const adv = `<details ${this.s.adv ? 'open' : ''} data-adv><summary>进阶（课后）：缺失值怎样处理会改变结论（教学构造，模仿 Seshat“道德神”争议，案例 C-25）</summary>
        <p class="sub">${esc(SESHAT.note)}</p>${seg('miss', [['absent', '未知按“无”处理'], ['drop', '未知剔除']], this.s.miss)}
        <table class="steps"><tr><th>政体</th><th>复杂化之后</th><th>复杂化之前</th></tr>${rows.map(([n, a, b]) => `<tr class="${b == null ? 'dim' : ''}"><td>${n}</td><td>${a}</td><td>${b == null ? '（剔除）' : b === 'absent*' ? '<span class="nil">absent（原为 unknown）</span>' : b}</td></tr>`).join('')}</table>
        <p class="okbox">参与计算 ${used.length} 个政体：复杂化之前有道德神 ${beforeYes} 个，之后 ${afterYes} 个。结论：${esc(concl)}。</p>
        <p class="sub">这是人工构造的小表，只用来说明“未知按不存在处理”会怎样把结论推向一边；真实争议见 Whitehouse 等 2019 及其撤稿与批评（扩充部分甲八）。</p></details>`;
      rerender(this, flowShell(pageById('D04'), [{ title: '选材料', body: side(A, 'a') }, { title: '四栏材料说明', body: side(B, 'b') }, { title: '四问逐项', body: qbox }, { title: '缺失值的处理', body: adv }]));
    }
    init() { this.addEventListener('toggle', (e) => { if (e.target.matches('[data-adv]')) { this.s.adv = e.target.open; store.set(this.key, this.s); } }, true); }
  }
  register('source-lab', SourceLab);

  /* ================= D06 相似度与阈值 ================= */
  class SimLab extends Lab {
    defaults() { return { mat: 'chengning-t2', score: 'model', th: '0.9', sel: 'CN03', a: '', b: '', n: '1', showDP: false };
    }
    rowsOf(m) { return (m?.rows || []).map((r) => ({ ...r })); }
    render() {
      const m = this.mat(this.s.mat), rows = this.rowsOf(m);
      if (this.s.a && this.s.b) rows.push({ id: 'MINE', a: this.s.a, b: this.s.b, label: '我输入的句对' });
      const emb = store.get('w8/emb', {}); // 浏览器内模型的结果：{模型: {句对编号: 余弦}}
      const ek = Object.keys(emb)[0];
      const n = Number(this.s.n) || 1;
      for (const r of rows) { r.jac = W.jaccard(r.a, r.b, n); r.lev = W.levenshtein(r.a, r.b); r.lcs = W.lcsRatio(r.a, r.b); r.cos = emb[ek]?.[r.a + '|' + r.b]; }
      const scoreOf = (r) => this.s.score === 'model' ? r.model : this.s.score === 'cos' ? r.cos : this.s.score === 'lev' ? r.lev.sim : this.s.score === 'lcs' ? r.lcs.r : r.jac.j;
      const th = Number(this.s.th);
      const sel = rows.find((r) => r.id === this.s.sel) || rows[0];
      const table = `<table class="steps simtable"><tr><th>句甲</th><th>句乙</th><th>字 ${n}-gram 杰卡德</th><th>1−编辑距离／较长句字数</th><th>2×LCS／总字数</th><th>论文“编辑距离”栏</th><th>论文模型分</th><th>浏览器内余弦</th></tr>
        ${rows.map((r) => { const v = scoreOf(r), kept = v != null && v >= th; return `<tr data-row="${esc(r.id)}" class="${r.id === sel?.id ? 'on' : ''} ${v == null ? '' : kept ? '' : 'out'}"><td class="src-line small">${esc(r.a)}</td><td class="src-line small">${esc(r.b)}</td><td>${f2(r.jac.j)}</td><td class="${r.paper_edit != null && Math.abs(r.paper_edit - r.lev.sim) > 0.015 ? 'diff' : ''}">${f2(r.lev.sim)}</td><td class="${r.paper_edit != null && Math.abs(r.paper_edit - r.lcs.r) > 0.015 ? 'diff' : ''}">${f2(r.lcs.r)}</td><td>${r.paper_edit == null ? '—' : f2(r.paper_edit)}</td><td>${r.model == null ? '—' : f2(r.model)}</td><td>${r.cos == null ? '—' : f2(r.cos)}</td></tr>`; }).join('')}</table>
        <p class="sub">灰色行为按所选分数低于阈值、被排除的句对；红底为与论文原值不同的现场计算。论文“编辑距离”一栏数值在 0—1 之间、字面全异为 0，实为一种相似度：${(() => { const pr = rows.filter((r) => r.paper_edit != null), a = pr.filter((r) => Math.abs(r.paper_edit - r.lcs.r) <= 0.015).length, d = pr.filter((r) => Math.abs(r.paper_edit - r.lev.sim) > 0.015); return `${pr.length} 组中有 ${a} 组与“2×最长公共子序列／两句总字数”（python-Levenshtein 的 ratio）相同；按“1−编辑距离／较长句字数”算，有 ${d.length} 组不同（${d.map((r) => esc(r.a)).join('、')}），因为两句共有的字次序相反或错位，替换操作救不回来。`; })()}同叫“编辑距离”，算法不同，数值就不同。</p>`;
      const det = sel ? (() => { const L = sel.lev; return `<p class="src-line">${esc(sel.a)}　｜　${esc(sel.b)}</p>
        <p>共有字：${L.A.filter((c) => L.B.includes(c)).map(esc).join('、') || '无'}；编辑距离 ${L.d}（较长句 ${Math.max(L.A.length, L.B.length)} 字），1−距离／字数 = ${f2(L.sim)}；最长公共子序列 ${sel.lcs.lcs} 字，2×${sel.lcs.lcs}／${sel.lcs.total} = ${f2(sel.lcs.r)}</p>
        <p class="ops">${L.ops.map(([o, x, y]) => `<span class="op op-${o === '=' ? 'eq' : o === '~' ? 'sub' : o === '-' ? 'del' : 'ins'}" title="${o === '=' ? '相同' : o === '~' ? '替换' : o === '-' ? '删除' : '插入'}">${esc(x || '∅')}→${esc(y || '∅')}</span>`).join('')}</p>
        ${sel.note ? `<p class="sub">${esc(sel.note)}</p>` : ''}
        <details ${this.s.showDP ? 'open' : ''} data-dp><summary>进阶：编辑距离的动态规划表逐格</summary><table class="dp"><tr><th></th><th>∅</th>${L.B.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${L.D.map((row, i) => `<tr><th>${i ? esc(L.A[i - 1]) : '∅'}</th>${row.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</table>
          <p class="sub">D[i][j] = min(上格＋1〔删除〕，左格＋1〔插入〕，左上格＋（两字相同 0，不同 1）〔替换〕)；右下角即编辑距离。</p></details>`; })() : '';
      // 精确率与召回率（进阶）：以论文判为相似（含 0.88 一例）为“是”，教学构造的题材相近组为“否”
      const pos = (r) => /化用/.test(r.label || ''), lab = rows.filter((r) => r.label && r.id !== 'MINE');
      const pr = [0.5, 0.6, 0.7, 0.8, 0.85, 0.88, 0.9, 0.92].map((t) => { const pred = lab.filter((r) => { const v = scoreOf(r); return v != null && v >= t; }); const tp = pred.filter(pos).length, P = pred.length ? tp / pred.length : null, R = lab.filter(pos).length ? tp / lab.filter(pos).length : null; return [t, P, R]; });
      const prBox = `<details data-pr><summary>进阶：在标好对错的小样本上定阈值（精确率、召回率，回扣第七周）</summary><p class="sub">样本：当前材料与另选材料合并时更有意义；当前只用本表中带标签的行（“化用”为是）。</p>
        <table class="steps"><tr><th>阈值</th><th>精确率</th><th>召回率</th></tr>${pr.map(([t, P, R]) => `<tr><td>${t}</td><td>${P == null ? '—' : f2(P)}</td><td>${R == null ? '—' : f2(R)}</td></tr>`).join('')}</table></details>`;
      const live = window.W8Live ? `<p><button class="small" data-emb="1">用浏览器内嵌入模型算余弦</button> <span class="sub">${ek ? '已算：' + esc(ek) : '模型在顶栏“模型接入”中课前载入；首次需下载约 100 MB'}</span></p>` : '<p class="sub">浏览器内模型需经本机服务或 GitHub Pages 打开（file:// 下不载入）。</p>';
      rerender(this, `${W.matSelect('pairs', this.s.mat)}${flowShell(pageById('D06'), [
        { title: '选句对', body: `${table}<p class="sub">自己输入一对：<input data-ki="a" value="${esc(this.s.a)}" placeholder="句甲" size="10"> <input data-ki="b" value="${esc(this.s.b)}" placeholder="句乙" size="10"> <button class="small" data-set="sel:MINE">加入</button></p>` },
        { title: '三种相似度', body: det + `<p>字切分：${seg('n', [['1', '按字'], ['2', '按二字串']], this.s.n)}</p>` },
        { title: '拖动阈值', body: `<p>按哪一种分数筛选：${seg('score', [['model', '论文模型分'], ['cos', '浏览器内余弦'], ['lev', '1−编辑距离／字数'], ['lcs', '2×LCS／总字数'], ['jac', '杰卡德']], this.s.score)}</p>
          <p>阈值 <input type="range" min="0" max="1" step="0.01" value="${esc(this.s.th)}" data-k="th"> <b>${f2(th)}</b></p>
          <p class="okbox">保留 ${rows.filter((r) => { const v = scoreOf(r); return v != null && v >= th; }).length} ／ ${rows.filter((r) => scoreOf(r) != null).length} 组。${this.s.score === 'model' ? '论文取 0.9：“落霞沉绿绮／余霞散成绮”0.88 被排除，而仇兆鳌注杜正引谢朓此句。' : ''}</p>${live}
          <p class="sub">浏览器内余弦用的是通用中文或多语句向量模型（见“模型接入”），不是论文所用的 BERT-CCPoem；数值不可与表 2 直接比，只看排序与阈值的作用。</p>` },
        { title: '小样本定阈值', body: prBox + `<p class="sub">阈值是研究者的选择：先在一个标好对错的小样本上看精确率与召回率随阈值怎样变化，再决定。</p>` },
      ])}`);
    }
    init() {
      this.addEventListener('click', async (e) => {
        const r = e.target.closest('[data-row]'); if (r) { this.s.sel = r.dataset.row; this.save(); }
        if (e.target.dataset.emb) {
          const m = this.mat(this.s.mat), rows = this.rowsOf(m); if (this.s.a && this.s.b) rows.push({ a: this.s.a, b: this.s.b });
          e.target.disabled = true; e.target.textContent = '计算中…';
          try { const res = await window.W8Live.pairCos(rows.map((x) => [x.a, x.b])); const emb = store.get('w8/emb', {}); const k = res.model; emb[k] = { ...(emb[k] || {}) }; rows.forEach((x, i) => { emb[k][x.a + '|' + x.b] = res.cos[i]; }); store.set('w8/emb', { [k]: emb[k] }); this.s.score = 'cos'; this.save(); }
          catch (err) { e.target.disabled = false; e.target.textContent = '失败：' + String(err.message || err).slice(0, 80); }
        }
      });
      this.addEventListener('toggle', (e) => { if (e.target.matches('[data-dp]')) { this.s.showDP = e.target.open; store.set(this.key, this.s); } }, true);
    }
    onInput(k) { if (k === 'a' || k === 'b') { /* 输入后点“加入”再重算 */ } }
  }
  register('sim-lab', SimLab);

  /* ================= D08 网络建模：边表、矩阵、方向、查重 ================= */
  class ModelLab extends Lab {
    defaults() { return { tab: 'adj', mat: 'cbdb-wanggui', dir: true, sent: {} }; }
    render() {
      const toy = this.mat('adj4'), t = this.s.tab;
      let body = '';
      if (t === 'adj' && !toy) body = '<p class="sub">公开材料载入中……</p>';
      else if (t === 'adj') {
        const dir = this.s.dir === true || this.s.dir === 'true'; const g = W.graph(toy, { directed: dir }), ids = toy.nodes.map((n) => n.id), A = ids.map(() => ids.map(() => 0));
        g.edges.forEach((e) => { A[ids.indexOf(e.s)][ids.indexOf(e.t)] = 1; if (!dir) A[ids.indexOf(e.t)][ids.indexOf(e.s)] = 1; });
        const sym = A.every((r, i) => r.every((v, j) => v === A[j][i]));
        body = `<div class="split2"><div><p class="sub">边表（讲义 @fig-adj，教学构造）</p><table class="steps"><tr><th>起点</th><th>终点</th><th>类型</th></tr>${toy.edges.map((e) => `<tr><td>${e.s}</td><td>${e.t}</td><td>${e.type}</td></tr>`).join('')}</table>
          <p>${seg('dir', [['true', '有向'], ['false', '无向']], String(dir))}</p></div>
          <div><p class="sub">邻接矩阵（行为起点、列为终点）</p><table class="dp"><tr><th></th>${ids.map((i) => `<th>${i}</th>`).join('')}</tr>${A.map((r, i) => `<tr><th>${ids[i]}</th>${r.map((v) => `<td class="${v ? 'one' : ''}">${v}</td>`).join('')}</tr>`).join('')}</table>
          <p class="okbox">${sym ? '矩阵沿对角线对称：无向网络中，甲连乙即乙连甲。' : '矩阵不对称：有向网络中，“甲推荐丙”不等于“丙推荐甲”。'}</p></div></div>
          ${W.drawGraph(g, [[60, 40], [60, 160], [200, 100], [330, 100]], { w: 380, h: 200, labels: 'all', arrows: dir })}`;
      } else {
        const m = this.mat(this.s.mat);
        if (!m) body = this.s.mat === 'cbdb-wanggui' ? W.gate('CBDB 1845 号社会关系边表', 'CBDB 王珪记录') : '<p class="nil">材料缺</p>';
        else if (t === 'rows') {
          const nm = new Map(m.nodes.map((n) => [n.id, n.label]));
          const pick = m.id === 'cbdb-wanggui' ? ['1488', '1036', '2082', '449', '8127', '7197'].map((id) => m.edges.find((e) => e.t === id)).filter(Boolean) : m.edges.slice(0, 6);
          body = `<p class="sub">把每一行改写成“谁—做了什么—对谁”。讲义的问题：第三行“俞充”，CBDB 记的是王珪推荐俞充，还是俞充推荐王珪？</p>
            <table class="steps"><tr><th>起点</th><th>终点</th><th>关系类型</th><th>年份原值</th><th>出处</th><th>改写成句子</th></tr>${pick.map((e, i) => `<tr><td>${esc(nm.get(e.s))} ${esc(e.s)}</td><td>${esc(nm.get(e.t))} ${esc(e.t)}</td><td>${esc(e.type)}</td><td class="mono">${esc(e.time_raw)}</td><td class="small">${esc(e.ref)}</td><td><input data-sent="${i}" value="${esc(this.s.sent[i] || '')}" placeholder="王珪……"></td></tr>`).join('')}</table>
            <p class="sub">CBDB 关系类型中的 Y 指对方：“推薦”是王珪推荐对方，“被Y推薦”是王珪被对方推荐……但俞充一案见下一个标签。</p>`;
        } else if (t === 'dup') {
          const nm = new Map(m.nodes.map((n) => [n.id, n.label])), byPair = new Map();
          m.edges.forEach((e) => { const k = [e.s, e.t].sort().join('|'); if (!byPair.has(k)) byPair.set(k, []); byPair.get(k).push(e); });
          const dups = [...byPair.values()].filter((v) => v.length > 1);
          body = `<p class="okbox">同一对人之间有多条记录的：<b>${dups.length}</b> 对（共 ${dups.reduce((a, v) => a + v.length, 0)} 条）。页面只列出，不自动合并，由你决定哪些是同一件事。</p>
            <table class="steps"><tr><th>一对人</th><th>各条记录（类型｜年份原值｜出处）</th></tr>${dups.map((v) => `<tr><td>${esc(nm.get(v[0].s))} — ${esc(nm.get(v[0].t))}</td><td>${v.map((e) => `<p class="small">${esc(e.type)}｜<span class="mono">${esc(e.time_raw)}</span>｜${esc(e.ref)}</p>`).join('')}</td></tr>`).join('')}</table>
            <p class="sub">王珪例：俞充“推薦”与“被Y推薦”指同一件事（《宋史》“珪薦俞充帥慶”）；李受“為Y作臨別贈言”与“臨別得到Y所作贈言”指同一篇诗序；周必大三条“書跋”是三篇不同的跋；鄭戩一条的附注是“對方之妻子”，与“李氏(鄭戩妻)”一条指同一篇墓志（3.5）。</p>`;
        }
      }
      rerender(this, `${t === 'adj' ? '' : W.matSelect('network', this.s.mat)}${seg('tab', [['adj', '边表与邻接矩阵'], ['rows', '改写成句子'], ['dup', '查重查向']], t)}<div class="tabpane">${body}</div>
        <p class="sub">自我中心网络：王珪的记录只告诉我们王珪与 84 人之间的关系，不告诉这 84 人彼此之间有没有关系，画出来必然是星形（${pageLink('D01')}）。</p>`);
    }
    init() { this.addEventListener('input', (e) => { const i = e.target.dataset.sent; if (i != null) { this.s.sent = { ...this.s.sent, [i]: e.target.value }; store.set(this.key, this.s); } }); }
  }
  register('model-lab', ModelLab);

  /* ================= D09 交给 Gephi ================= */
  class GephiLab extends Lab {
    defaults() { return { mat: 'padgett', seed: '7', rep: '1', grav: '0.05', iter: '300' }; }
    render() {
      const m = this.mat(this.s.mat);
      if (!m) { rerender(this, `${W.matSelect('network', this.s.mat)}${this.s.mat === 'cbdb-wanggui' ? W.gate('CBDB 边表', 'CBDB 王珪记录') : '<p class="nil">材料缺</p>'}`); return; }
      const g = W.graph(m), st = W.stats(g);
      const P = W.layout(g, { seed: Number(this.s.seed), repulse: Number(this.s.rep), gravity: Number(this.s.grav), iter: Number(this.s.iter), w: 560, h: 420 });
      const nm = new Map(m.nodes.map((n) => [String(n.id), n.label]));
      const head = (m.edges[0] ? Object.keys(m.edges[0]) : []);
      const conv = `<table class="steps"><tr><th>本材料字段</th><th>Gephi 表头</th></tr><tr><td>s（起点编号）</td><td>Source</td></tr><tr><td>t（终点编号）</td><td>Target</td></tr><tr><td>${g.directed ? '有向' : '无向'}</td><td>Type＝${g.directed ? 'Directed' : 'Undirected'}</td></tr><tr><td>type（关系类型）</td><td>Label</td></tr><tr><td>同一对人的记录条数</td><td>Weight</td></tr><tr><td>节点编号／名称</td><td>节点表 Id／Label</td></tr></table>
        <p class="sub">本材料原有字段：${head.map(esc).join('、')}。</p>`;
      const exp = `<p><button class="small" data-exp="edges">下载边表 CSV（Gephi 表头）</button> <button class="small" data-exp="nodes">下载节点表 CSV</button> <button class="small" data-exp="svg">下载当前图 SVG</button></p>
        <p class="sub">Gephi 桌面版：文件 › 导入电子表格，先导节点表、再导边表，选“追加到现有工作区”；Gephi Lite：Import › Spreadsheet。逐步截图待课前环境实际操作（扩充部分丙一）。</p>`;
      const ctl = `<label>随机种子 <input type="number" data-k="seed" value="${esc(this.s.seed)}" style="width:5em"></label>
        <label>斥力 <input type="range" min="0.3" max="3" step="0.1" data-k="rep" value="${esc(this.s.rep)}"> ${esc(this.s.rep)}</label>
        <label>向心力 <input type="range" min="0" max="0.5" step="0.01" data-k="grav" value="${esc(this.s.grav)}"> ${esc(this.s.grav)}</label>
        <label>迭代次数 <input type="range" min="10" max="600" step="10" data-k="iter" value="${esc(this.s.iter)}"> ${esc(this.s.iter)}</label>
        <p class="okbox">无论怎样调，节点 ${st.n}、边 ${st.m}、各人的度都不变：布局只是为了好读，位置远近不是数据。</p>`;
      rerender(this, `${W.matSelect('network', this.s.mat)}${flowShell(pageById('D09'), [{ title: '选边表', body: W.card(m, { compact: true }) }, { title: '转表头', body: conv + exp }, { title: '调布局', body: `<div class="gsvg">${W.drawGraph(g, P, { key: 'D09|' + m.id + '|' + this.s.seed + this.s.rep + this.s.grav + this.s.iter, w: 560, h: 420 })}</div>` }, { title: '导出', body: ctl }])}`);
      this._csv = () => ({ edges: 'Source,Target,Type,Label,Weight\n' + g.edges.map((e) => [e.s, e.t, g.directed ? 'Directed' : 'Undirected', [...new Set(e.recs.map((r) => r.type || ''))].join('；'), e.w].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'),
        nodes: 'Id,Label\n' + g.nodes.map((n) => [n.id, nm.get(n.id) ?? n.label].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n') });
    }
    init() { this.addEventListener('click', (e) => { const x = e.target.dataset.exp; if (!x) return; if (x === 'svg') download(`${this.s.mat}.svg`, this.querySelector('svg.netsvg').outerHTML, 'image/svg+xml'); else download(`${this.s.mat}_${x}.csv`, '﻿' + this._csv()[x], 'text/csv'); }); }
  }
  register('gephi-lab', GephiLab);

  window.W8L = { Lab, seg, f2, pct, posFor, egoPos };
})();
