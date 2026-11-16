/* 第十周页面组件（二）：D06、D07、D08、D10｜候选，未经教师确认｜2026-11-16（第一批） */
(() => {
  'use strict';
  const { esc, register } = window.Deck;
  const W = window.W10, { L, Mat, Through, Lab, cardBox, answerCell, sourceBox, needPack, toSheet, sendBtn } = W;
  const S = window.W10_STATIC;
  const fmt = (x, d = 3) => (x == null || Number.isNaN(x) ? '—' : String(Math.round(x * 10 ** d) / 10 ** d));
  const PRESETS4 = ['deepseek', 'kimi', 'gemini', 'chatgpt'];
  const presetSel = (v, key = 'preset') => `<select data-o="${key}">${PRESETS4.map((p) => `<option value="${p}" ${p === v ? 'selected' : ''}>${esc(W.PRESET_LABEL[p])}</option>`).join('')}</select>`;

  /* 时间线：来自一条运行记录，或学生粘贴的文字（通用输入） */
  function stepsFrom(text, runId) { return L.parseTimeline(text, { run_id: runId }); }

  /* ================= D06 起草链（演示②） ================= */
  const COND = [['D2A', '不给材料'], ['D2B', '给 1890 年年表'], ['D2C', '给年表并要求标注']];
  class Chain extends Lab {
    defaults() { return { cond: 'D2B', preset: 'deepseek', paste: '', usePaste: false, rows: {} }; }
    current() {
      if (this.s.usePaste) return { run: null, text: this.s.paste, rid: 'paste' };
      const { run } = W.pickedRun(this.s.cond, this.s.preset); return { run, text: run?.reply || '', rid: run?.run_id };
    }
    render() {
      const s = this.s, cur = this.current();
      const base = S.chain;
      let steps = cur.text ? L.suggestRows(base, stepsFrom(cur.text, cur.rid)) : [];
      const over = s.rows[cur.rid] || {};
      steps = steps.map((x) => (x.step_id in over ? { ...x, base_row: over[x.step_id] === '' ? null : +over[x.step_id], manual: true } : x));
      const m = L.matchTimeline(base, steps);
      const inada = Mat.text('inada-chronology-1890');
      const snippet = (dr) => { if (!inada) return ''; const f = L.monthDayForms(dr); const i = f.map((x) => inada.indexOf(x)).filter((x) => x >= 0); return i.length ? inada.slice(Math.min(...i), Math.min(...i) + 80) + '……' : ''; };
      // 进阶：三次采样之间对应到的基准行是否一致
      const samples = W.runsFor(s.cond, s.preset).slice(0, 3).map((r) => L.matchTimeline(base, L.suggestRows(base, stepsFrom(r.reply, r.run_id))).rows.map((x) => x.base_row).filter(Boolean));
      const pj = samples.length >= 2 ? L.pairwiseJaccard(samples) : null;
      this.out(`<div class="w9-toolbar"><b>"请写一份《教育勅語》起草经过的时间线。"</b>　${COND.map(([c, n]) => `<label><input type="radio" name="d06c" data-o="cond" value="${c}" ${s.cond === c && !s.usePaste ? 'checked' : ''}> ${c} ${n}</label>`).join(' ')}　<label><input type="radio" name="d06c" data-o="usePaste" value="1" ${s.usePaste ? 'checked' : ''}> 粘贴一份时间线</label>　模型 ${presetSel(s.preset)}</div>
        ${s.usePaste ? `<p><textarea data-paste rows="5" style="width:100%" placeholder="每行一步，行内写日期，如：6月20日 井上毅致书山県……">${esc(s.paste)}</textarea></p>` : `${cardBox(s.cond)}${answerCell(s.cond, s.preset, { body: () => '' }).html}`}
        <div class="w10-sum"><b>对照（实际计算）</b>：相合 ${m.count.相合}　多出 ${m.count.多出}　日期不符 ${m.count.日期不符}　缺失 ${m.count.缺失}　<span class="sub">模糊日期按本课约定化为区间：日＋前后 ±5 日；只到月 = 整月；上中下旬；"以后"为其后 30 日。对应行由页面按日期与文字预填，可改。</span></div>
        <div class="w9-two"><section class="w9-col"><header><b>基准表 @fig-chain（本课合并）</b></header><table class="items">${base.map((b) => { const hit = m.rows.filter((r) => r.base_row === b.row); return `<tr class="${hit.length ? '' : 'w10-miss'}"><td>${b.row}</td><td class="nowrap">${esc(b.date_raw)}</td><td>${esc(b.action)}${hit.length ? '' : '　<b class="nil">缺失</b>'}${inada ? `<details><summary class="sub">年表原文</summary><p class="sub">${esc(snippet(b.date_raw))}</p></details>` : ''}</td></tr>`; }).join('')}</table><p class="sub">${esc(S.chainSource)}</p>${inada ? '' : needPack('稲田年表 1890 年条录文（展开原文用）')}</section>
        <section class="w9-col"><header><b>模型的时间线（逐步）</b></header>${steps.length ? `<table class="items">${m.rows.map((r) => `<tr class="w10-m-${r.match}"><td class="nowrap">${esc(r.date_raw)}</td><td>${esc(r.action)}${r.label ? ` <span class="sub">［${esc(r.label)}${r.label_date ? '：' + esc(r.label_date) : ''}］</span>` : ''}</td><td><select data-row="${esc(r.step_id)}"><option value="">多出（无对应）</option>${base.map((b) => `<option value="${b.row}" ${r.base_row === b.row ? 'selected' : ''}>对应第 ${b.row} 行</option>`).join('')}</select></td><td><b>${esc(r.match)}</b>${r.manual ? '<span class="sub">（手改）</span>' : ''}</td><td>${r.match !== '相合' ? sendBtn(r.step_id) : ''}</td></tr>`).join('')}</table>` : '<p class="w10-pending">待课前运行（或选"粘贴一份时间线"）。</p>'}</section></div>
        <details><summary>讲义 2.2 note 两点</summary><p>不给材料时，模型说的可能来自某部较早的研究或通行的概说，那些说法本身与海後、稲田的考订不尽相同，差异不一定是错。基准表是稲田 1971 年的考订；海後 1965 年对哪一份是井上初稿的排定不同（见 D08）。本讲拿它作对照的基准，不当作定论。</p></details>
        <details><summary>进阶：三次采样之间对应到的步骤一致吗</summary>${pj ? `<p>本条件、本模型 ${samples.length} 次采样，对应到的基准行两两 Jaccard：${pj.pairs.map((x) => fmt(x)).join('、')}；平均 ${fmt(pj.mean)}。</p>` : '<p class="sub">需要至少两次采样的记录。</p>'}</details>`);
      this._m = m;
    }
    sheetRow(sid) { const r = this._m.rows.find((x) => x.step_id === sid); return { from_page: 'D06', run_id: r.run_id, model_says: `${r.date_raw} ${r.action}`, point: r.base_row ? S.chain[r.base_row - 1].action : null, verdict: r.match === '多出' ? '模型新见' : '曲解', reason: `时间线对照：${r.match}` }; }
    onChange(e) {
      const t = e.target;
      if (t.dataset.o === 'cond') return this.set({ cond: t.value, usePaste: false });
      if (t.dataset.o === 'usePaste') return this.set({ usePaste: true });
      if (t.dataset.o) return this.set({ [t.dataset.o]: t.value });
      if (t.dataset.paste !== undefined) return this.set({ paste: t.value });
      if (t.dataset.row) { const rid = this.current().rid; this.set({ rows: { ...this.s.rows, [rid]: { ...(this.s.rows[rid] || {}), [t.dataset.row]: t.value } } }); }
    }
  }
  register('chain-lab', Chain);

  /* ================= D07 出处层级 ================= */
  const LAB3 = ['材料', '自知', '推测'];
  class Layers extends Lab {
    defaults() { return { preset: 'deepseek', mine: {}, reveal: false, toyB: null }; }
    render() {
      const s = this.s, { run } = W.pickedRun('D2C', s.preset);
      const steps = run ? L.parseTimeline(run.reply, { run_id: run.run_id }) : [];
      const mine = s.mine[run?.run_id] || {}, inada = Mat.text('inada-chronology-1890');
      const pairs = steps.map((x) => ({ item_id: x.step_id, label_a: mine[x.step_id] || null, label_b: x.label })).filter((p) => p.label_a);
      const ag = L.agreement(pairs, LAB3);
      // 教学构造：扩充部分甲五十处小例子（学生改一处模型标注，三个数同时更新）
      const toyA = ['删', '删', '改述', '改述', '语气', '事实', '删', '改述', '语气', '删'], toyB = s.toyB || ['删', '删', '改述', '语气', '语气', '事实', '删', '事实', '语气', '删'];
      const toy = L.agreement(toyA.map((a, i) => ({ item_id: i + 1, label_a: a, label_b: toyB[i] })), ['删', '改述', '语气', '事实']);
      const mtx = (r) => `<table class="items w10-mtx"><tr><th>学生 ＼ 模型</th>${r.labels.map((l) => `<th>${esc(l)}</th>`).join('')}</tr>${r.labels.map((l, i) => `<tr><th>${esc(l)}</th>${r.matrix[i].map((n, j) => `<td class="${i === j ? 'diag' : n ? 'off' : ''}">${n}</td>`).join('')}</tr>`).join('')}</table>`;
      this.out(`<div class="w9-toolbar"><b>D2C：给年表并要求逐句标注［材料：月日］［自知］［推测］</b>　模型 ${presetSel(s.preset)} ${W.badge(run)}　<label><input type="checkbox" data-o="reveal" ${s.reveal ? 'checked' : ''}> 揭开模型自己的标注</label></div>
        ${cardBox('D2C')}
        <p class="sub">做法：先遮住模型的标注，学生给每一步标三种记号之一；再揭开比较。讲义写的是在 D2B 的时间线上标、再与 D2C 比；两次运行的步骤不一一对应，所以页面让学生直接给 D2C 的步骤标（与模型标注逐项可比）。</p>
        ${run ? `<table class="items"><tr><th>时间</th><th>事项</th><th>学生标注</th><th>模型标注</th><th>［材料］抽查（年表录文中找月日）</th><th></th></tr>${steps.map((x) => { const ck = L.checkLabelDate(x, inada); return `<tr><td class="nowrap">${esc(x.date_raw)}</td><td>${esc(x.action)}</td><td>${LAB3.map((l) => `<label class="nowrap"><input type="radio" name="m-${esc(x.step_id)}" data-mine="${esc(x.step_id)}" value="${l}" ${mine[x.step_id] === l ? 'checked' : ''}>${l}</label>`).join(' ')}</td><td>${s.reveal ? `${esc(x.label || '（未标）')}${x.label_date ? '：' + esc(x.label_date) : ''}` : '<span class="sub">（遮住）</span>'}</td><td>${!s.reveal ? '' : x.label !== '材料' ? '<span class="sub">—</span>' : !inada ? '<span class="nil">录文未载入</span>' : ck.status === 'found' ? `<span class="ok">找到</span> <span class="sub">${esc(ck.snippet)}……</span>` : ck.status === 'not-found' ? `<b class="nil">年表里没有 ${esc(ck.forms[0])}</b>` : '<span class="sub">没写月日</span>'}</td><td>${s.reveal && (x.label === '自知' || x.label === '推测' || ck.status === 'not-found') ? sendBtn(x.step_id, '送入（待查线索）') : ''}</td></tr>`; }).join('')}</table>
          ${s.reveal ? `<div class="w9-two"><section class="w9-col"><header><b>一致率与 κ（实际计算）</b></header><p class="w9-formula">已标 ${ag.N} 步；p<sub>o</sub> ＝ ${fmt(ag.po)}；p<sub>e</sub> ＝ ${fmt(ag.pe)}；κ ＝ (p<sub>o</sub>−p<sub>e</sub>)/(1−p<sub>e</sub>) ＝ <b>${fmt(ag.kappa)}</b></p>${ag.N ? mtx(ag) : ''}<p class="sub">这些数只说明两组标注有多接近，不说明哪一组对。不一致的步回年表录文去看。</p></section>
          <section class="w9-col"><header><b>为什么标成［材料］的也要抽查</b></header><p>模型的标注本身也会出错。右栏把模型标［材料：月日］的步骤拿到年表录文里找那个月日；找不到的，说明它把参数知识说成了材料。标［自知］［推测］的，一律当作待查线索，不当作背景（讲义 2.3）。</p><p class="sub">${inada ? '' : '年表录文未载入：抽查需导入本机材料包。'}</p></section></div>` : ''}` : '<p class="w10-pending">D2C 待课前运行。</p>'}
        <details><summary>提示模板（讲义 2.3，可复制）</summary><pre class="srcbox">每一句后面用方括号标注：［材料：位置］表示这句话的依据在我给你的材料中，并写出位置；［自知］表示依据是你自己的知识；［推测］表示这是你的推断。</pre></details>
        <details><summary>WikiContradict 与知识冲突</summary><p>Hou 等 2024：取维基百科条目内真实的矛盾 253 例，给模型两段互相矛盾、看上去同样可靠的文字再提问；人工评判五个模型，结论是都很难如实反映矛盾，需要推理才能看出的矛盾尤其如此。该研究处理的是事实性冲突，本课把它用于史学解释之争是类推。</p></details>
        <details><summary>进阶：κ 的小例子（教学构造，扩充部分甲五）</summary><p class="sub">十处异文，四类。学生的标注固定；点模型一栏的格子可以改，三个数同时更新。</p>
          <table class="items"><tr><th>#</th>${toyA.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr><tr><th>学生</th>${toyA.map((a) => `<td>${a}</td>`).join('')}</tr><tr><th>模型</th>${toyB.map((b, i) => `<td><select data-toy="${i}">${['删', '改述', '语气', '事实'].map((x) => `<option ${x === b ? 'selected' : ''}>${x}</option>`).join('')}</select></td>`).join('')}</tr></table>
          <p class="w9-formula">p<sub>o</sub> ＝ ${fmt(toy.po)}；p<sub>e</sub> ＝ ${fmt(toy.pe)}；κ ＝ <b>${fmt(toy.kappa)}</b>　<span class="sub">（原例：0.8、0.27、0.726）</span></p>${mtx(toy)}<p class="sub">进阶条件卡"给两份矛盾材料"（案例 C-11）所需的俾斯麦回忆录一段尚未取得（待核实 A-04），本批不做。</p></details>`);
      this._steps = steps;
    }
    sheetRow(sid) { const x = this._steps.find((y) => y.step_id === sid), { run } = W.pickedRun('D2C', this.s.preset); return { from_page: 'D07', run_id: run?.run_id, model_says: `${x.date_raw} ${x.action}［${x.label || ''}${x.label_date ? '：' + x.label_date : ''}］`, verdict: null, reason: x.label === '材料' ? '标［材料］，年表录文中没找到该月日' : `模型标［${x.label}］：待查线索` }; }
    onChange(e) {
      const t = e.target, { run } = W.pickedRun('D2C', this.s.preset);
      if (t.dataset.o === 'reveal') return this.set({ reveal: t.checked });
      if (t.dataset.o) return this.set({ [t.dataset.o]: t.value });
      if (t.dataset.mine && run) return this.set({ mine: { ...this.s.mine, [run.run_id]: { ...(this.s.mine[run.run_id] || {}), [t.dataset.mine]: t.value } } });
      if (t.dataset.toy) { const b = (this.s.toyB || ['删', '删', '改述', '语气', '语气', '事实', '删', '事实', '语气', '删']).slice(); b[+t.dataset.toy] = t.value; this.set({ toyB: b }); }
    }
  }
  register('layers-lab', Layers);

  /* ================= D08 机器怎样对校 ================= */
  const NORMS = [['kyujitai', '旧字形'], ['odoriji', '踊字'], ['dakuten', '浊点'], ['width', '全半角'], ['punct', '不计标点']];
  class Align8 extends Lab {
    defaults() { return { a: 'inoue-kaigo-draft', b: 'chokugo-seibun', unit: 'char', normalize: [], algorithm: 'difflib', eight: true, draft: 'kaigo', ta: '', tb: '' }; }
    texts() {
      const s = this.s;
      const t = (id, own) => (id === 'own' ? own : Mat.text(id));
      return [t(s.a, s.ta), t(s.b, s.tb)];
    }
    render() {
      const s = this.s, [A, B] = this.texts();
      const wits = [['inoue-kaigo-draft', '井上初稿（海後复原）'], ['chokugo-seibun', '勅語成文'], ['own', '自选文字']];
      const sel = (k) => `<select data-o="${k}">${wits.map(([id, n]) => `<option value="${id}" ${s[k] === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
      let res = null; if (A && B) res = L.align(A, B, { unit: s.unit, normalize: s.normalize, algorithm: s.algorithm });
      const shown = res ? (s.eight && s.a === 'inoue-kaigo-draft' && s.b === 'chokugo-seibun' ? res.variants.filter((v) => S.alignEight.some((k) => v.a_text.includes(k.slice(0, 2)) || A.slice(v.a_span?.[0] - 4 || 0, (v.a_span?.[1] || 0) + 4).includes(k))) : res.variants) : [];
      const fd = S.firstDraft[s.draft];
      this.out(`<div class="w9-toolbar"><b>两个见证本</b>　甲 ${sel('a')}　乙 ${sel('b')}　｜　单位 <label><input type="radio" name="d08u" data-o="unit" value="char" ${s.unit === 'char' ? 'checked' : ''}>字</label> <label><input type="radio" name="d08u" data-o="unit" value="word" ${s.unit === 'word' ? 'checked' : ''}>词</label>　归一 ${NORMS.map(([k, n]) => `<label><input type="checkbox" data-norm="${k}" ${s.normalize.includes(k) ? 'checked' : ''}>${n}</label>`).join(' ')}　算法 <select data-o="algorithm"><option value="difflib" ${s.algorithm === 'difflib' ? 'selected' : ''}>difflib 兼容</option><option value="lcs" ${s.algorithm === 'lcs' ? 'selected' : ''}>LCS</option></select></div>
        ${s.a === 'own' ? `<p><textarea data-t="ta" rows="2" style="width:49%">${esc(s.ta)}</textarea>` : ''}${s.b === 'own' ? `<textarea data-t="tb" rows="2" style="width:49%">${esc(s.tb)}</textarea></p>` : ''}
        ${!A || !B ? (s.a === 'inoue-kaigo-draft' || s.b === 'inoue-kaigo-draft') && !Mat.has('inoue-kaigo-draft') ? needPack('井上草案（海後所定初稿）录文（教师 2026-11-16：只进本机材料包）') : '<p class="sub">请填入两段文字。</p>' : ''}
        ${res ? `<div class="w10-sum"><b>结果（实际计算）</b>：甲 ${res.stats.a} 个单位，乙 ${res.stats.b} 个单位；相同 ${res.stats.equal}；<b>异文 ${res.stats.variants} 处</b>　<span class="sub">单位：${s.unit === 'char' ? '字' : '词（中日文用浏览器内置分词 Intl.Segmenter，结果随浏览器版本可能略异）'}；归一：${s.normalize.length ? s.normalize.map((k) => NORMS.find((n) => n[0] === k)?.[1]).join('、') : '全关'}；${s.algorithm === 'lcs' ? 'LCS（回溯平局先退甲本，本课约定）' : 'difflib 兼容（Python SequenceMatcher 的移植）'}。"处数"依算法而定，归一后处数也可能变多。</span></div>
          ${s.a === 'inoue-kaigo-draft' && s.b === 'chokugo-seibun' ? `<p><label><input type="checkbox" data-o="eight" ${s.eight ? 'checked' : ''}> 只看讲义 @fig-align 的八处附近</label></p>` : ''}
          <table class="items w10-vtab"><tr><th>#</th><th>类型</th><th>甲</th><th>乙</th><th>位置（甲／乙下标）</th></tr>${shown.slice(0, 200).map((v) => `<tr><td>${esc(v.variant_id)}</td><td>${esc(v.op)}</td><td>${esc(v.a_text) || '—'}</td><td>${esc(v.b_text) || '—'}</td><td class="sub">${v.a_span ? v.a_span.join('—') : '—'}／${v.b_span ? v.b_span.join('—') : '—'}</td></tr>`).join('')}</table>` : ''}
        <div class="w9-two"><section class="w9-col"><header><b>初稿之争</b>　<label><input type="radio" name="d08d" data-o="draft" value="kaigo" ${s.draft === 'kaigo' ? 'checked' : ''}>海後说</label> <label><input type="radio" name="d08d" data-o="draft" value="inada" ${s.draft === 'inada' ? 'checked' : ''}>稲田说</label></header>
          <p><b>${esc(fd.label)}</b></p><ul>${fd.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><p class="sub">${esc(fd.source)}</p><p class="w10-note">${esc(S.firstDraft.note)}</p></section>
          <section class="w9-col"><header><b>见证本</b></header>${sourceBox('inoue-kaigo-draft')}${sourceBox('chokugo-seibun')}<p class="sub">左栏"初稿"是海後的复原（除去墨笔添改），不是原件照录，又是一家之说下的"初稿"；录文待人工复核（B-02）。</p></section></div>
        <details><summary>进阶：LCS 小例表（D17）与 TEI 导出（D18）</summary><p>LCS 表逐格填的小例子做在 D17（第三批）；这里先用"算法：LCS"看全文结果。<button class="small" data-x="tei" ${res ? '' : 'disabled'}>导出本次对齐为 TEI（平行分段）</button></p></details>`);
      this._res = res;
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.norm) { const n = new Set(this.s.normalize); t.checked ? n.add(t.dataset.norm) : n.delete(t.dataset.norm); return this.set({ normalize: [...n] }); }
      if (t.dataset.o === 'eight') return this.set({ eight: t.checked });
      if (t.dataset.o) return this.set({ [t.dataset.o]: t.value });
      if (t.dataset.t) return this.set({ [t.dataset.t]: t.value });
    }
    onClick(e) { if (e.target.dataset.x === 'tei' && this._res) { const [A] = this.texts(); window.Deck.download('w10-align.tei.xml', L.toTEI(this._res, A, [{ id: 'A', label: this.s.a }, { id: 'B', label: this.s.b }]), 'application/xml'); } }
  }
  register('align8-lab', Align8);

  /* ================= D10 埃姆斯电报两本 ================= */
  class Ems extends Lab {
    defaults() { return { normalize: [], unit: 'word', cond: 'C02A', preset: 'deepseek', effects: [] }; }
    render() {
      const s = this.s, A = Mat.text('ems-a'), B = Mat.text('ems-b');
      const res = L.align(A, B, { unit: s.unit, normalize: s.normalize, algorithm: 'difflib' });
      const pre = window.W10_EMS_TABLE || [];
      const same = s.unit === 'word' && !s.normalize.length && res.variants.length === pre.length && res.variants.every((v, i) => v.op === pre[i].op && v.a_text === pre[i].a && v.b_text === pre[i].b);
      const key = new Map(S.emsKey);
      const { run } = W.pickedRun(s.cond, s.preset);
      let modelBlock = '<p class="w10-pending">待课前运行。</p>';
      if (run) {
        const t = L.parseMdTable(run.reply), rows = L.variantRowsFromTable(t);
        if (!t) modelBlock = `<p class="nil">回答里没有解析出表格，需人工对应。</p><div class="w9-reply">${esc(run.reply)}</div>`;
        else if (s.cond === 'C02A') {
          modelBlock = `<table class="items"><tr><th>编号</th><th>模型的类别</th><th>理由</th></tr>${rows.map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(r.category)}</td><td>${esc(r.reason)}</td></tr>`).join('')}</table><p class="sub">解析出 ${rows.length} 行（程序 20 处）。看它把哪几处归为"改变事实陈述"，你同意吗？分类的一致率与 κ 在 D09（第二批）。</p>`;
        } else {
          const mv = L.matchVariants(res.variants, rows);
          modelBlock = `<p class="w10-sum"><b>召回</b> ${mv.hit}／${res.variants.length}＝${fmt(mv.recall)}　<b>多报</b> ${mv.over} 行　<b>漏列</b> ${mv.missed.map(esc).join('、') || '无'}　<span class="sub">（模型一行与程序一处按两边文字的词 Jaccard ≥ 0.5 视为同一处；匹配不上的行由教师人工对应）</span></p><table class="items"><tr><th>模型行</th><th>甲</th><th>乙</th><th>对应程序</th></tr>${rows.map((r, i) => `<tr><td>${esc(r.id || i + 1)}</td><td>${esc(r.a)}</td><td>${esc(r.b)}</td><td>${esc(mv.pairs[i].variant_id || '多报？')} <span class="sub">${fmt(mv.pairs[i].sim, 2)}</span></td></tr>`).join('')}</table>`;
        }
      }
      this.out(`<div class="w9-two"><section class="w9-col"><header><b>甲　阿贝肯原电</b></header><p class="w10-de">${esc(A)}</p><p class="w10-zh">${esc(S.emsZh.a)}</p></section><section class="w9-col"><header><b>乙　俾斯麦新闻稿</b></header><p class="w10-de">${esc(B)}</p><p class="w10-zh">${esc(S.emsZh.b)}</p></section></div>
        <p class="sub">德文据 GHDI（底本 Friedrichsruher Ausgabe 第 6b 卷第 1612 号）；${esc(S.emsZh.source)}。</p>
        <div class="w10-sum"><b>程序对齐（页面现场计算）</b>：甲 ${res.stats.a}、乙 ${res.stats.b}、相同 ${res.stats.equal}、<b>异文 ${res.stats.variants} 处</b>。${s.unit === 'word' && !s.normalize.length ? (same ? '<span class="ok">与课前 ems_align.py 的对齐表逐条一致。</span>' : '<b class="nil">与课前对齐表不一致！</b>') : '<span class="sub">（改了单位或归一，与课前对齐表不再可比）</span>'}
          　单位 <label><input type="radio" name="d10u" data-o="unit" value="word" ${s.unit === 'word' ? 'checked' : ''}>词与标点</label> <label><input type="radio" name="d10u" data-o="unit" value="char" ${s.unit === 'char' ? 'checked' : ''}>字母</label>　归一 <label><input type="checkbox" data-norm="case" ${s.normalize.includes('case') ? 'checked' : ''}>大小写</label> <label><input type="checkbox" data-norm="de_orth" ${s.normalize.includes('de_orth') ? 'checked' : ''}>daß／dass</label> <label><input type="checkbox" data-norm="punct" ${s.normalize.includes('punct') ? 'checked' : ''}>不计标点</label></div>
        <table class="items w10-vtab"><tr><th>#</th><th>类型</th><th>甲（原电）</th><th>乙（新闻稿）</th><th>这一处改动，使读新闻稿的人以为……</th></tr>${res.variants.map((v) => { const ef = s.effects.find((x) => x.variant_id === v.variant_id); return `<tr class="${key.has(v.variant_id) ? 'w10-key' : ''}"><td>${esc(v.variant_id)}</td><td>${esc(v.op)}</td><td>${esc(v.a_text) || '—'}${key.has(v.variant_id) ? `<br><span class="sub">讲义所说要紧删节：${esc(key.get(v.variant_id))}</span>` : ''}</td><td>${esc(v.b_text) || '—'}</td><td><input data-ef="${esc(v.variant_id)}" value="${esc(ef?.text || '')}" size="28" placeholder="两人一组任选三处"> ${ef?.text ? sendBtn(v.variant_id) : ''}</td></tr>`; }).join('')}</table>
        <div class="w9-toolbar"><b>两份课前记录</b>　<label><input type="radio" name="d10c" data-o="cond" value="C02A" ${s.cond === 'C02A' ? 'checked' : ''}>C02A 给对齐表、分四类</label> <label><input type="radio" name="d10c" data-o="cond" value="C02B" ${s.cond === 'C02B' ? 'checked' : ''}>C02B 不给对齐表、直接列异文</label>　模型 ${presetSel(s.preset)}</div>
        ${cardBox(s.cond)}${answerCell(s.cond, s.preset, { body: () => modelBlock }).html}
        <details><summary>进阶：TEI 导出</summary><p><button class="small" data-x="tei">导出当前对齐为 TEI（平行分段，含四类定义）</button> <span class="sub">扩充部分甲四；可交给 Rdgai。</span></p></details>`);
      this._res = res;
    }
    sheetRow(vid) { const v = this._res.variants.find((x) => x.variant_id === vid), ef = this.s.effects.find((x) => x.variant_id === vid); return { from_page: 'D10', point: `${vid}（${v.op}）甲：${v.a_text || '—'}／乙：${v.b_text || '—'}`, my_reading: ef.text, model_says: null, verdict: null }; }
    onChange(e) {
      const t = e.target;
      if (t.dataset.norm) { const n = new Set(this.s.normalize); t.checked ? n.add(t.dataset.norm) : n.delete(t.dataset.norm); return this.set({ normalize: [...n] }); }
      if (t.dataset.o) return this.set({ [t.dataset.o]: t.value });
      if (t.dataset.ef) { const ef = this.s.effects.filter((x) => x.variant_id !== t.dataset.ef); if (t.value.trim()) ef.push({ variant_id: t.dataset.ef, text: t.value.trim() }); this.set({ effects: ef }); Through.get().effects = ef; Through.save(); }
    }
    onClick(e) { if (e.target.dataset.x === 'tei') window.Deck.download('w10-ems.tei.xml', L.toTEI(this._res, Mat.text('ems-a'), [{ id: 'A', label: '阿贝肯原电，埃姆斯，1870-07-13（GHDI 德文页）' }, { id: 'B', label: '俾斯麦改定的新闻稿，1870-07-13（同上）' }], { categories: S.emsCategories.map(([id, label]) => ({ id, label })) }), 'application/xml'); }
  }
  register('ems-lab', Ems);
})();
