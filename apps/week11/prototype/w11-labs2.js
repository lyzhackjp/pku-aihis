/* 第十一周页面组件（二）：D05、D06、D10、D13｜候选，未经教师确认｜2026-11-26（第一批） */
(() => {
  'use strict';
  const { esc, register, download } = window.Deck;
  const W = window.W11, { L, Mat, Through, answerCell, cardBox, Lab } = W;
  const S = window.W11_STATIC, EX = window.W11_EXAMPLES;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const RULES = ['罗列', '一段多事', '重复', '问题晚出', '限定后置', '反证未回应'];

  /* ================= D05 逆向大纲（演示②） ================= */
  class Outline extends Lab {
    defaults() { return { src: 'jia', paras: null, rules: {}, overlap: 0.3, open: {} }; }
    base() { return this.s.src === 'jia' ? EX['paragraphs.jia'].paragraphs : Through.get().paragraphs.filter((p) => p.doc_id === this.s.src); }
    paras() {
      if (!this.s.paras || this.s.parasFor !== this.s.src) { this.s.paras = clone(this.base()).map((p) => ({ ...p, author_summary: p.author_summary || '', function: this.s.src === 'jia' ? null : p.function, function2: this.s.src === 'jia' ? null : p.function2, answers: this.s.src === 'jia' ? '' : p.answers })); this.s.parasFor = this.s.src; }
      return this.s.paras;
    }
    render() {
      const s = this.s, ps = this.paras(), docs = [...new Set(Through.get().paragraphs.map((p) => p.doc_id))];
      const r = L.outlineRules(ps, { rules: s.rules, overlap: s.overlap });
      const bar = ps.map((p) => `<span class="w11-seg" style="background:${S.funcColor[p.function] || '#e4e2dc'};color:${p.function && !/过渡/.test(p.function) ? '#fff' : '#20272e'}" title="${esc(p.para_id)}：${esc([p.function, p.function2].filter(Boolean).join('＋') || '未标')}">${esc(p.para_id)}${p.function2 ? '<i>＋</i>' : ''}</span>`).join('');
      const fsel = (p, k) => `<select data-fn="${esc(p.para_id)}" data-k="${k}"><option value="">${k === 'function' ? '（选功能）' : '（第二功能）'}</option>${S.functions.map((f) => `<option ${p[k] === f ? 'selected' : ''}>${f}</option>`).join('')}</select>`;
      const ref = this.s.src === 'jia' ? EX['paragraphs.jia'].paragraphs : [];
      this.out(`<p><b>材料</b> <label><input type="radio" name="olsrc" value="jia" ${s.src === 'jia' ? 'checked' : ''}> 练习材料甲（七段）</label> ${docs.map((d) => `<label><input type="radio" name="olsrc" value="${esc(d)}" ${s.src === d ? 'checked' : ''}> ${esc(d)}（导入）</label>`).join(' ')} <button class="small" data-open-docx="paragraphs">导入 Word 稿</button>
        <span class="sub">　教师 2023 年论文第一、二节作对照：第二批接入。</span></p>
        <div class="w11-seqbar">${bar}</div>
        <div class="w11-flags">${RULES.map((k) => { const f = r.flags.find((x) => x.rule === k); return `<label class="flag ${f ? 'on' : ''}"><input type="checkbox" data-rule="${k}" ${s.rules[k] === false ? '' : 'checked'}> ${k}${f ? `：<b>${f.paras.join('、')}</b>` : ''}</label>`; }).join('')}
          <label class="sub">重复门槛 <input type="number" step="0.05" min="0.1" max="0.9" value="${s.overlap}" data-ov style="width:4.5em"></label></div>
        <p class="sub">${W.nat.calc} 规则写在页上（扩充部分甲一；罗列含段内"人名＋年份"连续三句；重复＝字符二元组重合系数；问题晚出看"回答哪个问题"一列）。先标完功能与问题，提示才有意义。</p>
        <table class="items w11-outline"><tr><th>段</th><th>我写的主旨（≤20 字）</th><th>功能</th><th>回答哪个问题</th><th>原文</th></tr>
        ${ps.map((p, i) => `<tr><td>${esc(p.para_id)}</td><td><input data-sum="${esc(p.para_id)}" value="${esc(p.author_summary || '')}" maxlength="30" size="22">${[...(p.author_summary || '')].length > 20 ? '<span class="nil sub">超过 20 字</span>' : ''}</td>
          <td>${fsel(p, 'function')}${fsel(p, 'function2')}</td><td><input data-ans="${esc(p.para_id)}" value="${esc(p.answers || '')}" size="16"></td>
          <td><details><summary>${esc(p.text.slice(0, 18))}…</summary><p class="w9-reply">${esc(p.text)}</p>${ref[i] ? `<p class="sub">讲义图 3 右列（备课者逐段概括，${W.nat.tc}）：${esc(ref[i].reader_summary_construct)}</p>` : ''}</details></td></tr>`).join('')}</table>
        <p><button class="small" data-x="move">示范：把第 7 段的问题移到第 1 段后</button> <button class="small" data-x="fig4">填入讲义图 4 的标注（${W.nat.tc}）</button> <button class="small" data-x="reset">清空我的标注</button> <button class="small" data-x="send">送入贯穿记录</button></p>
        <details><summary>模型写的逆向大纲（演示②；点开再看，先写自己的）</summary><div class="w9-cols"><section class="w9-col">${cardBox('D2A')}${['deepseek', 'kimi'].map((p) => answerCell('D2A', p).html).join('')}</section><section class="w9-col">${cardBox('D2B')}${['deepseek', 'kimi'].map((p) => answerCell('D2B', p).html).join('')}</section></div>
          <p class="sub">D2A 末句"列出三处结构问题"会诱导模型必须找出三处；D2B 改为"若没有结构问题，写'无'"。凡是模型说得比自己顺的地方，回原段看一看。</p></details>`);
    }
    onClick(e) {
      const x = e.target.dataset.x, ps = this.paras();
      if (x === 'move') { const p7 = ps[ps.length - 1]; if (ps[0].function !== '提出问题') ps[0].function2 = '提出问题'; ps[0].answers = p7.answers || '告密消息的日期与途径'; this.set({}); }
      if (x === 'fig4' && this.s.src === 'jia') { EX['paragraphs.jia'].paragraphs.forEach((q, i) => Object.assign(ps[i], { function: q.function, function2: q.function2, answers: q.answers, responds_to_para: q.responds_to_para })); this.set({}); }
      if (x === 'reset') this.set({ paras: null });
      if (x === 'send') { for (const p of ps) Through.add('paragraphs', { ...p, doc_id: p.doc_id }, 'para_id'); W.toast('已送入贯穿记录：段落表 ' + ps.length + ' 段'); }
    }
    onChange(e) {
      const t = e.target, ps = this.paras(), p = (id) => ps.find((q) => q.para_id === id);
      if (t.name === 'olsrc') this.set({ src: t.value, paras: null });
      if (t.dataset.rule) { this.s.rules[t.dataset.rule] = t.checked; this.set({}); }
      if (t.dataset.ov !== undefined) this.set({ overlap: +t.value || 0.3 });
      if (t.dataset.fn) { p(t.dataset.fn)[t.dataset.k] = t.value || null; this.set({}); }
      if (t.dataset.ans) { p(t.dataset.ans).answers = t.value; this.set({}); }
      if (t.dataset.sum) { p(t.dataset.sum).author_summary = t.value; this.set({}); }
    }
  }
  register('outline-lab', Outline);

  /* ================= D06 结构诊断与登记 ================= */
  class Diag extends Lab {
    defaults() { return { rows: null, score: {} }; }
    rows() { if (!this.s.rows) this.s.rows = clone(EX['register.fig-reg'].rows).map((r) => ({ ...r, decision: null, decision_raw: null, reason: '', _construct: true })); return this.s.rows; }
    render() {
      const rows = this.rows(), sum = L.registerSummary(rows.filter((r) => r.decision), 'diagnosis'), ps = EX['paragraphs.jia'].paragraphs;
      this.out(`<details open><summary>诊断表（讲义图 4；"功能"与"回答哪个问题"可先请模型填候选，再自己改）${W.nat.tc}</summary><table class="items"><tr><th>段</th><th>功能</th><th>回答哪个问题</th><th>诊断</th></tr>${ps.map((p) => `<tr><td>${p.para_id}</td><td>${esc([p.function, p.function2].filter(Boolean).join('＋'))}${p.function_note ? `<span class="sub">（${esc(p.function_note)}）</span>` : ''}</td><td>${esc(p.answers || '—')}</td><td>${esc(S.diag[p.para_id])}</td></tr>`).join('')}</table></details>
        <h4>诊断意见登记表</h4><table class="items"><tr><th>号</th><th>意见（提议者）</th><th>段</th><th>处理</th><th>理由</th><th>准确吗</th><th>抓住要点了吗</th></tr>
        ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.content)}<span class="sub">（${r._construct ? '预期典型意见，' + W.nat.tc : esc(r.proposer?.name || r.proposer?.kind)}${r.proposer?.run_id ? '，' + esc(r.proposer.run_id) : ''}）</span></td><td>${esc(r.target)}</td>
          <td><select data-dec="${i}"><option value="">（未定）</option>${['采纳', '修正', '舍弃'].map((d) => `<option ${r.decision === d ? 'selected' : ''}>${d}</option>`).join('')}</select></td><td><input data-reason="${i}" value="${esc(r.reason || '')}" size="24"></td>
          ${['acc', 'key'].map((k) => `<td><select data-score="${i}|${k}">${['', '1', '2', '3'].map((v) => `<option ${(this.s.score[i + '|' + k] || '') === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</table>
        <p>${W.nat.calc} 已处理 ${sum.total} 条：采纳 ${sum.count.采纳}、修正 ${sum.count.修正}、舍弃 ${sum.count.舍弃}（${['采纳', '修正', '舍弃'].map((k) => k + ' ' + W.pct(sum.share[k])).join('，')}）。讲义图 5 第 4 行原写"部分采纳"，按"修正"计。</p>
        <p><label>加一条模型意见 <input data-new size="36" placeholder="从下方模型回答中摘一条"></label> <label>段 <input data-newp size="5"></label> <button class="small" data-x="add">加入</button> <button class="small" data-x="send">送入贯穿记录（D18）</button></p>
        <details><summary>演示②的实际结构意见（D2A）</summary>${cardBox('D2A')}${['deepseek', 'kimi'].map((p) => answerCell('D2A', p).html).join('')}<p class="sub">课前记录到位后，用这里的意见替换上表的预期典型意见（C-05）。</p></details>
        <details><summary>进阶：三项研究（C-05—C-07）与严耕望论体式</summary><ul><li>Steiss 等 2024：200 篇中学生历史论文，受过训练的评阅者五项中四项优于 GPT-3.5（对象是中学生，模型是 2023 年的）。</li><li>Farrokhnia 等 2026：逐步推理的模型反馈质量评分最高，三组修改后的论文质量提高得差不多。</li><li>Thakkar 等 2025：ICLR 2025 两万多份审稿意见，收到建议者中 26.6% 修改了意见。</li><li>严耕望：写文章"尤當考慮讀者領受之便利"（《治史經驗談》第 88—89 页）。</li></ul></details>`);
    }
    onClick(e) {
      const x = e.target.dataset.x, rows = this.rows();
      if (x === 'add') { const v = this.querySelector('[data-new]').value.trim(); if (!v) return; rows.push({ reg_id: 'd-' + Date.now().toString(36), kind: 'diagnosis', target: this.querySelector('[data-newp]').value.trim(), proposer: { kind: 'model', name: '演示②模型意见', run_id: null }, content: v, decision: null, reason: '' }); this.set({}); }
      if (x === 'send') { for (const r of rows.filter((q) => q.decision)) { const { _construct, ...o } = r; W.toRegister({ ...o, reg_id: 'D06-' + r.reg_id, from_page: 'D06', proposer: { ...r.proposer, name: _construct ? '预期典型意见（教学构造）' : r.proposer?.name } }); } }
    }
    onChange(e) {
      const t = e.target, rows = this.rows();
      if (t.dataset.dec) { rows[+t.dataset.dec].decision = t.value || null; this.set({}); }
      if (t.dataset.reason) { rows[+t.dataset.reason].reason = t.value; this.set({}, { redraw: false }); }
      if (t.dataset.score) { this.s.score[t.dataset.score] = t.value; this.set({}); }
    }
  }
  register('diag-lab', Diag);

  /* ================= D10 修改的几种意图 ================= */
  const INT = Object.fromEntries(S.iterater.map(([k, zh]) => [k, zh]));
  class Intent extends Lab {
    defaults() { return { edits: null, by: 'item', src: 'fig10' }; }
    edits() { if (!this.s.edits || this.s.editsFor !== this.s.src) { this.s.edits = clone(this.s.src === 'fig10' ? EX['edits.fig10'].edits : Through.get().edits); this.s.editsFor = this.s.src; } return this.s.edits; }
    render() {
      const es = this.edits(), st = L.editStats(es, { by: this.s.by });
      this.out(`<details><summary>ITERATER 表 4 的六类定义（Du 等 2022；英文照录，中译为本课所作）</summary><table class="items">${S.iterater.map(([k, zh, en, t]) => `<tr><td>${esc(zh)}</td><td class="sub">${esc(en)}</td><td>${esc(t)}</td></tr>`).join('')}</table><p class="sub">"意思改变"的定义只说更新或增加信息；删去限定、把"加剧"改成"导致"，在史学里都要归入这一类。</p></details>
        <p><b>材料</b> <label><input type="radio" name="isrc" value="fig10" ${this.s.src === 'fig10' ? 'checked' : ''}> 讲义图 10 四条 ${W.nat.tc}</label> <label><input type="radio" name="isrc" value="own" ${this.s.src === 'own' ? 'checked' : ''}> 我的修改记录（${Through.get().edits.length} 条，来自 D13 或导入）</label>
          　<b>计数</b> <label><input type="radio" name="iby" value="item" ${this.s.by === 'item' ? 'checked' : ''}> 按条</label> <label><input type="radio" name="iby" value="chars" ${this.s.by === 'chars' ? 'checked' : ''}> 按字数</label></p>
        <table class="items"><tr><th>号</th><th>改前</th><th>改后</th><th>提议</th><th>表上原标</th><th>我判断的意图</th><th>处理</th><th>理由</th></tr>
        ${es.map((e, i) => `<tr class="${e.intention === 'meaning-changed' && e.intention_shown && e.intention_shown !== 'meaning-changed' ? 'w11-hl' : ''}"><td>${esc(e.edit_id)}</td><td>${esc(e.before)}</td><td>${esc(e.after)}</td><td>${e.proposer?.kind === 'model' ? '模型' : e.proposer?.kind === 'author' ? '作者' : '他人'}</td><td class="sub">${esc(INT[e.intention_shown] || '—')}</td>
          <td><select data-int="${i}"><option value="">（未标）</option>${S.iterater.map(([k, zh]) => `<option value="${k}" ${e.intention === k ? 'selected' : ''}>${zh}</option>`).join('')}</select></td>
          <td><select data-dec="${i}"><option value="">—</option>${[['accept', '采纳'], ['reject', '拒绝'], ['modify', '修改后采纳']].map(([k, z]) => `<option value="${k}" ${e.decision === k ? 'selected' : ''}>${z}</option>`).join('')}</select></td><td class="sub">${esc(e.reason || '')}</td></tr>`).join('')}</table>
        <div class="w11-formula">${W.nat.calc} <b>模型意见采纳率</b> = a<sub>m</sub>/n<sub>m</sub> = ${st.a_m}/${st.n_m}${this.s.by === 'chars' ? '（按字数加权）' : ''} = <b>${W.pct(st.adoption)}</b>　　<b>意思改变占比</b> = n<sub>mc</sub>/n = ${st.n_mc}/${st.n} = <b>${W.pct(st.meaningShare)}</b>
          <p>${st.suggestLabel ? `使用说明里宜写：<b>${st.suggestLabel}</b>（意思改变占比 ≥ ${st.threshold} 时写"段落改写"；门槛为本课约定）。` : ''}</p>
          <p class="sub">高亮行：表上原标是"清晰""文体"，你判断为"意思改变"——模型常把一处意思改变当作清晰来做。试把第 2 条的处理从"拒绝"改为"采纳"，采纳率从 1/3 变成 2/3。</p></div>`);
    }
    onChange(e) {
      const t = e.target, es = this.edits();
      if (t.name === 'isrc') this.set({ src: t.value, edits: null });
      if (t.name === 'iby') this.set({ by: t.value });
      if (t.dataset.int) { es[+t.dataset.int].intention = t.value || null; this.set({}); }
      if (t.dataset.dec) { es[+t.dataset.dec].decision = t.value || null; this.set({}); }
    }
  }
  register('intent-lab', Intent);

  /* ================= D13 修订与理由 ================= */
  class Revisions extends Lab {
    defaults() { return { src: 'fixture', rows: null, name: '', msg: '' }; }
    async load(buf, name) {
      try {
        const r = await L.docxRevisions(buf);
        const rows = r.edits.map((x) => ({ edit_id: `${name.replace(/\.docx$/i, '')}-${x.edit_id}`, para: x.in_footnote ? `注${x.note_id}` : String(x.para_index), before: x.before, after: x.after, removed: x.removed, added: x.added,
          author: x.author, date: x.date, location: x.in_footnote ? `脚注 ${x.note_id}` : `Word 段 ${x.para_index}`, comment: x.comment,
          proposer: { kind: /deepseek|kimi|gemini|chatgpt|claude|copilot|reviser|模型/i.test(x.author) ? 'model' : 'author', name: x.author, run_id: null }, intention: null, intention_shown: null, decision: null, reason: x.comment || '', in_footnote: x.in_footnote }));
        this.set({ rows, name, msg: `${W.nat.calc} 已在浏览器内解析 ${name}：修订 ${rows.length} 条、批注 ${r.comments.length} 条；文件未上传、未保存。` });
      } catch (err) { this.set({ msg: '解析失败，原有记录保留：' + err.message }); }
    }
    render() {
      const s = this.s;
      if (!s.rows && s.src === 'fixture' && !this._loading) { this._loading = true; const b = Mat.docx('jia_revisions.docx'); if (b) this.load(b, 'jia_revisions.docx'); }
      const rows = s.rows || [], st = L.editStats(rows.filter((r) => r.intention || r.decision));
      const ctx = (r) => { const a = r.before.indexOf(r.removed || r.added) ; return a; };
      this.out(`<p><b>修订稿</b> <label><input type="radio" name="rvsrc" value="fixture" ${s.src === 'fixture' ? 'checked' : ''}> 练习材料甲修订夹具（程序构造：三处修订、一条批注、一处脚注修订；未在 Word 中打开核对）</label>
        <label class="pack-btn small">上传我的 .docx<input type="file" accept=".docx" data-up hidden></label> <span class="sub">演示③两份修订稿：第二批（D14）。</span></p>
        <p class="sub">${s.msg || ''}</p>
        <table class="items w11-rev"><tr><th>位置</th><th>修订者</th><th>改动</th><th>改前 → 改后（所在段）</th><th>提议</th><th>意图</th><th>处理</th><th>理由（批注）</th></tr>
        ${rows.map((r, i) => `<tr><td>${esc(r.location)}</td><td>${esc(r.author)}<span class="sub">${esc((r.date || '').slice(0, 16))}</span></td><td>${r.removed ? `<del>${esc(r.removed)}</del>` : ''}${r.added ? `<ins>${esc(r.added)}</ins>` : ''}</td>
          <td><details><summary>前后文</summary><p class="sub">改前：${esc(r.before)}</p><p class="sub">改后：${esc(r.after)}</p></details></td>
          <td><select data-prop="${i}">${[['author', '作者'], ['model', '模型'], ['other', '他人']].map(([k, z]) => `<option value="${k}" ${r.proposer.kind === k ? 'selected' : ''}>${z}</option>`).join('')}</select></td>
          <td><select data-int="${i}"><option value="">（未标）</option>${S.iterater.map(([k, zh]) => `<option value="${k}" ${r.intention === k ? 'selected' : ''}>${zh}</option>`).join('')}</select></td>
          <td><select data-dec="${i}"><option value="">—</option>${[['accept', '采纳'], ['reject', '拒绝'], ['modify', '修改后采纳']].map(([k, z]) => `<option value="${k}" ${r.decision === k ? 'selected' : ''}>${z}</option>`).join('')}</select></td>
          <td><input data-reason="${i}" value="${esc(r.reason || '')}" size="22"></td></tr>`).join('')}</table>
        <p>${W.nat.calc} 已标注 ${st.n} 条：模型意见采纳率 ${W.pct(st.adoption)}（${st.a_m}/${st.n_m}），意思改变占比 ${W.pct(st.meaningShare)}（与 D10 同一公式）。修订者一栏自动填"提议者"：约定模型的修改用单独的修订者名，作者自己的修改用本人的名字。</p>
        <p><button class="small" data-x="csv">导出修改对照表（.csv）</button> <button class="small" data-x="send">送入贯穿记录（D10、D18 可用）</button></p>`);
    }
    async onChange(e) {
      const t = e.target, rows = this.s.rows || [];
      if (t.name === 'rvsrc') { this.s.rows = null; this._loading = false; this.set({ src: 'fixture' }); }
      if (t.dataset.up !== undefined && t.files[0]) { const f = t.files[0]; this.s.src = 'own'; await this.load(await f.arrayBuffer(), f.name); t.value = ''; }
      if (t.dataset.prop) { rows[+t.dataset.prop].proposer.kind = t.value; this.set({}); }
      if (t.dataset.int) { rows[+t.dataset.int].intention = t.value || null; this.set({}); }
      if (t.dataset.dec) { rows[+t.dataset.dec].decision = t.value || null; this.set({}); }
      if (t.dataset.reason) { rows[+t.dataset.reason].reason = t.value; this.set({}, { redraw: false }); }
    }
    onClick(e) {
      const x = e.target.dataset.x, rows = this.s.rows || [];
      if (x === 'csv') { const head = ['edit_id', 'location', 'author', 'date', 'removed', 'added', 'before', 'after', 'proposer', 'intention', 'decision', 'reason']; const c = (v) => { const s = v == null ? '' : typeof v === 'object' ? v.kind : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; download(`修改对照表_${this.s.name.replace(/\.docx$/i, '')}.csv`, '﻿' + [head.join(','), ...rows.map((r) => head.map((h) => c(r[h])).join(','))].join('\n'), 'text/csv'); }
      if (x === 'send') { for (const r of rows) Through.add('edits', r, 'edit_id'); W.toast(`已送入贯穿记录：修改 ${rows.length} 条`); }
    }
  }
  register('revisions-lab', Revisions);
})();
