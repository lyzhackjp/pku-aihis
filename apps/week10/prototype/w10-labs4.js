/* 第十周页面组件（四）：第二批 D02、D05、D09、D13、D21｜候选，未经教师确认｜2026-11-17 */
(() => {
  'use strict';
  const { esc, register } = window.Deck;
  const W = window.W10, { L, Mat, Through, Lab, cardBox, answerCell, sourceBox, needPack, toSheet, sendBtn, marked } = W;
  const S = window.W10_STATIC;
  const fmt = (x, d = 3) => (x == null || Number.isNaN(x) ? '—' : String(Math.round(x * 10 ** d) / 10 ** d));

  /* ================= D02 放得进，读不完 ================= */
  // 茅文三期的节次与页码据原刊；字数只对本机材料包里有正文的两节实算，其余写"未知"
  const MAO_PARTS = [
    { id: 'mao-history', title: '第一节　学术史与本文之旨趣', issue: '第 4 期', pages: '197—208' },
    { id: null, title: '第二至六节　政变过程的逐日考订', issue: '第 4—6 期', pages: '208—174' },
    { id: 'mao-conclusion', title: '第七节　结论', issue: '第 6 期', pages: '174—176' },
  ];
  // 粗估（非官方分词器，页上写明）：汉字、假名 1 字≈1 词元；西文 4 个字符≈1 词元
  function tokEst(t) { const cjk = (t.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length; return Math.round(cjk + (t.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s]/gu, '').length) / 4); }
  const STUDIES = [
    { n: 'Liu 等 2024：中段遗失', vary: '答案段在一串段落中的位置', fixed: '问题、段落内容、总长度', find: '答案段在开头或结尾时答得好，放在中段明显变差' },
    { n: 'Chroma 2025：上下文衰减', vary: '"草堆"的长度与干扰句的数量', fixed: '"针"与问题', find: '长度一增、干扰一多，表现就下降；讲义所引一项：同一问题给约三百词的相关部分与给约十一万词的全文，后者明显变差' },
    { n: 'Karpinska 等 2024：NoCha', vary: '一对真假句只差一处；按对计分', fixed: '书是测试前一两年新出版的小说，模型没见过', find: '当时最好的 GPT-4o 55.8%，开放权重模型都低于随机基线 25%；排行榜 2025-07-18 后未更新' },
  ];
  class Fit extends Lab {
    defaults() { return { pick: ['mao-conclusion'], pair: 2, flips: 0, hits: 0, pos: 'middle', passage: '' }; }
    render() {
      const s = this.s, loaded = MAO_PARTS.filter((p) => p.id && Mat.has(p.id));
      const chosen = MAO_PARTS.filter((p) => p.id && s.pick.includes(p.id) && Mat.has(p.id));
      const text = chosen.map((p) => Mat.text(p.id)).join('\n'), chars = text.replace(/〔原刊第\d+页〕|\s|\x82/g, '').length;
      const base = 1 / 2 ** s.pair;
      this.out(`<div class="w9-two"><section class="w9-col"><header><b>茅文结构条</b>（《近代史研究》2002 年第 4—6 期）</header>
        <table class="items">${MAO_PARTS.map((p) => { const t = p.id ? Mat.text(p.id) : ''; return `<tr><td>${p.id ? `<input type="checkbox" data-pick="${p.id}" ${s.pick.includes(p.id) ? 'checked' : ''} ${t ? '' : 'disabled'}>` : ''}</td><td>${esc(p.title)}</td><td>${esc(p.issue)}</td><td>原刊 ${esc(p.pages)}</td><td>${t ? `${t.replace(/〔原刊第\d+页〕|\s|\x82/g, '').length.toLocaleString()} 字（实算）` : p.id ? '<span class="nil">需材料包</span>' : '未录入，字数未知'}</td></tr>`; }).join('')}</table>
        <p class="sub">全文三期约十四万字（据第 4 期编者按的估计；本课只录了两节，其余字数不知道，不用估计数冒充实数）。${loaded.length ? '' : '本机材料包未载入，两节字数也无法实算。'}</p>
        <p class="w10-sum"><b>送给模型的篇幅（实际计算）</b>：${chosen.length ? `${chars.toLocaleString()} 字；词元粗估约 ${tokEst(text).toLocaleString()}` : '未选'}　<span class="sub">粗估办法：汉字、假名 1 字≈1 词元，西文 4 个字符≈1 词元；两家都没有可离线用的官方分词器，实际数以接口返回的用量为准（课前运行记录里的 usage）。两节都在 DeepSeek、Kimi 的上下文窗口之内：放得进，不等于读得完。</span></p></section>
        <section class="w9-col"><header><b>三项研究：变的是什么，不变的是什么</b></header>${STUDIES.map((x) => `<div class="w10-tcard"><b>${esc(x.n)}</b><p class="sub">变：${esc(x.vary)}｜不变：${esc(x.fixed)}</p><p>${esc(x.find)}</p></div>`).join('')}<p class="sub">数字只用讲义 1.1 所引，注明测试年份与模型；本页不画"位置—准确率"曲线（没有本课自己的数据）。</p></section></div>
        <details><summary>进阶（扩充部分甲一）：按对计分的随机基线</summary><p>每对 <select data-o="pair"><option ${s.pair == 2 ? 'selected' : ''}>2</option><option ${s.pair == 3 ? 'selected' : ''}>3</option></select> 句，全部判对才算这一对答对；随手猜的基线 ＝ (1/2)<sup>${s.pair}</sup> ＝ <b>${fmt(base)}</b>，按句计分是 0.5。
          <button class="small" data-x="flip">代掷硬币 100 对</button> 已掷 ${s.flips} 对，全对 ${s.hits} 对，比例 ${s.flips ? fmt(s.hits / s.flips) : '—'} <button class="small" data-x="reset">清零</button></p><p class="sub">掷硬币是页面里的随机模拟（实际计算），说明基线从哪里来；不是任何模型的成绩。学生为自己的文献出三对真假句，在 D19（第三批）。</p></details>
        <details><summary>进阶（案例 C-01）：同一段放在开头、中段、结尾</summary><p class="sub">选茅文学术史一节中的一段作"答案段"，页面把它放到所选位置（其余为学术史一节的其他文字），用现场调用问同一个问题，结果进贯穿记录。没有运行就显示"待运行"，不做示意曲线。</p>
          ${Mat.has('mao-history') ? `<p><textarea data-o="passage" rows="2" style="width:100%" placeholder="从学术史一节贴一段（例如萧一山一家）">${esc(s.passage)}</textarea></p><p>位置 ${['head', 'middle', 'tail'].map((p) => `<label><input type="radio" name="d02pos" data-o="pos" value="${p}" ${s.pos === p ? 'checked' : ''}>${{ head: '开头', middle: '中段', tail: '结尾' }[p]}</label>`).join(' ')}　<button class="small" data-x="posrun" ${s.passage && W.Model.state().mode === 'live' ? '' : 'disabled'}>现场调用（DeepSeek）</button> <span class="sub">${W.Model.state().mode === 'live' ? '' : '需切到现场调用'}</span></p>
          ${Through.get().runs.filter((r) => r.card_id === 'D02POS').map((r) => `<div class="w9-cell"><div class="w9-cell-head">${W.badge(r)} <b>${esc(r.note || '')}</b></div><div class="w9-reply">${esc(r.reply || r.error)}</div></div>`).join('')}` : needPack('茅海建 2002 学术史一节')}</details>`);
    }
    onChange(e) { const t = e.target; if (t.dataset.pick) { const p = new Set(this.s.pick); t.checked ? p.add(t.dataset.pick) : p.delete(t.dataset.pick); return this.set({ pick: [...p] }); } if (t.dataset.o) this.set({ [t.dataset.o]: t.dataset.o === 'pair' ? +t.value : t.value }); }
    async onClick(e) {
      const x = e.target.dataset.x;
      if (x === 'flip') { let h = 0; for (let i = 0; i < 100; i++) { let all = true; for (let k = 0; k < this.s.pair; k++) if (Math.random() < 0.5) all = false; if (all) h++; } this.set({ flips: this.s.flips + 100, hits: this.s.hits + h }); }
      if (x === 'reset') this.set({ flips: 0, hits: 0 });
      if (x === 'posrun') {
        const all = Mat.text('mao-history').replace(this.s.passage, ''), half = Math.floor(all.length / 2);
        const body = this.s.pos === 'head' ? this.s.passage + '\n' + all : this.s.pos === 'tail' ? all + '\n' + this.s.passage : all.slice(0, half) + '\n' + this.s.passage + '\n' + all.slice(half);
        const card = { card_id: 'D02POS', title: '答案段位置', materials: [{ entry_id: 'd02pos-tmp' }], user_template: '下面是茅海建《戊戌政变的时间、过程与原委》学术史一节（段落顺序经教师调整，用于测试）。\n\n{{material:d02pos-tmp}}\n\n请根据以上材料回答：文中对萧一山的看法是怎样介绍的？', settings: {} };
        const tmp = { id: 'd02pos-tmp', text: body, sendable: true, title: '茅文学术史一节（调序）' };
        Through.get().packs.push({ id: 'pack-d02pos', title: '临时', entries: [tmp] });
        try { const r = await W.Model.call(card, 'deepseek'); r.note = `答案段位置：${{ head: '开头', middle: '中段', tail: '结尾' }[this.s.pos]}`; Through.save(); }
        catch (err) { W.toast(String(err.message || err)); }
        finally { Through.get().packs = Through.get().packs.filter((p) => p.id !== 'pack-d02pos'); Through.save(); }
      }
    }
  }
  register('fit-lab', Fit);

  /* ================= D05 当时的文本与事后的叙述 ================= */
  const CW = [
    { doc_id: 'ems-a', title: '阿贝肯原电', event: '1870-07-13', signed: '1870-07-13', alt: [], printed: '', note: '内部报告，后收入俾斯麦全集', basis: 'GHDI 德文页' },
    { doc_id: 'ems-b', title: '俾斯麦新闻稿', event: '1870-07-13', signed: '1870-07-13', alt: [], printed: '1870-07-13', note: '同日发布', basis: 'GHDI' },
    { doc_id: 'ems-memoir', title: '俾斯麦回忆录相关一段', event: '1870-07-13', signed: '', alt: [{ date: '1890', certainty: '约数', basis: '事后约二十年（约数，待核 A-04）' }], printed: '', note: 'GHDI 编者提醒须审慎使用', basis: 'GHDI 编者按' },
    { doc_id: 'yuan', title: '袁世凯《戊戌日记》', event_raw: '光绪二十四年八月初三至初五日前后', event: '1898-09-20', signed_raw: '八月十四日记于天津督署', signed: '1898-09-29', alt: [{ date: '1904', certainty: '推测', basis: '刘凤翰 1969 推测为光绪三十年以后补作（第 141、148 页）' }], printed_raw: '宣统元年（南通本）', printed: '1909', note: '另有 1926 年《申报》本、北京历史博物馆藏钞本', basis: '刘凤翰 1969；成文时间有争议' },
    { doc_id: 'inoue-t', title: '井上哲次郎的回忆（『釈明教育勅語衍義』）', event_raw: '明治二十四年', event: '1891', signed_raw: '昭和十七年十月', signed: '1942-10', alt: [], printed: '1942-10', note: '作者自承"もう五十二年も前のことで正確なことは云へない"', basis: '稲田第 338 页引；原书页码待核（B-04）' },
  ];
  const yrs = (a, b) => { const p = (s) => { const m = String(s || '').match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/); return m ? Date.UTC(+m[1], (+m[2] || 1) - 1, +m[3] || 1) : null; }; const x = p(a), y = p(b); return x == null || y == null ? null : (y - x) / 86400000; };
  class Chengwen extends Lab {
    defaults() { return { thr: 30, edits: {}, use: {} }; }
    render() {
      const s = this.s, rows = CW.map((r) => ({ ...r, ...(s.edits[r.doc_id] || {}) }));
      const lab = (d) => (d == null ? '—' : d <= s.thr ? '当时的文本' : '事后的叙述');
      const span = (d) => (d == null ? '—' : d < 60 ? `${Math.round(d)} 日` : `${(d / 365.25).toFixed(1)} 年`);
      this.out(`<p class="sub">阈值（本课约定，可调）：成文距离不超过 <input data-o="thr" size="4" value="${s.thr}"> 日为"当时的文本"。原文纪年照录在旁，公历另列，不自动换算。</p>
        <table class="items"><tr><th>文本</th><th>所记事件</th><th>自署时间</th><th>采信的成文时间</th><th>首次公开</th><th>成文距离</th><th>标签</th><th>依据与问题</th></tr>
        ${rows.map((r) => { const opts = [['signed', `自署 ${r.signed || '（无）'}`], ...r.alt.map((a, i) => [`alt${i}`, `${a.certainty} ${a.date}`])]; const u = s.use[r.doc_id] || (r.signed ? 'signed' : 'alt0'); const w = u === 'signed' ? r.signed : r.alt[+u.slice(3)]?.date; const d = yrs(r.event, w), dp = yrs(r.event, r.printed);
          const fuzzy = u !== 'signed' && r.alt[+u.slice(3)]?.certainty !== '确定';
          return `<tr><td><b>${esc(r.title)}</b></td><td>${r.event_raw ? esc(r.event_raw) + '<br>' : ''}<input data-ed="${r.doc_id}|event" value="${esc(r.event)}" size="10"></td><td>${r.signed_raw ? esc(r.signed_raw) + '<br>' : ''}<input data-ed="${r.doc_id}|signed" value="${esc(r.signed)}" size="10"></td><td><select data-use="${r.doc_id}">${opts.map(([v, l]) => `<option value="${v}" ${v === u ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${fuzzy ? '<br><span class="w10-fuzzy">推测或约数</span>' : ''}</td><td>${r.printed_raw ? esc(r.printed_raw) + '<br>' : ''}${esc(r.printed || '—')}</td><td>${span(d)}<br><span class="sub">刊行距离 ${span(dp)}</span></td><td><b>${lab(d)}</b></td><td class="sub">${esc(r.note)}；${esc(r.basis)}</td></tr>`; }).join('')}</table>
        <p class="w10-sum">把袁世凯自述的"采信的成文时间"从自署（政变后九天）改成刘凤翰的补作推测，标签就从"当时的文本"变成"事后的叙述"：标签取决于你采信哪一种成文时间。<span class="sub">（扩充部分乙二 @fig-chengwen；距离为实际计算，阈值是本课约定）</span></p>
        <details><summary>进阶：为自己的一份回忆录或日记填表</summary><p class="sub">用顶栏"导入表格"导入成文表（类型"成文表"），每份材料分开记事件、自署、实际成文、首次公开四种时间；页面对自署与推定两种成文时间各算一次。本批先做三组预置材料，导入的成文表存在贯穿记录里（${Through.get().chengwen.length} 行）。</p></details>`);
    }
    onChange(e) { const t = e.target; if (t.dataset.o) return this.set({ [t.dataset.o]: +t.value || 30 }); if (t.dataset.use) return this.set({ use: { ...this.s.use, [t.dataset.use]: t.value } }); if (t.dataset.ed) { const [id, f] = t.dataset.ed.split('|'); this.set({ edits: { ...this.s.edits, [id]: { ...(this.s.edits[id] || {}), [f]: t.value.trim() } } }); } }
  }
  register('chengwen-lab', Chengwen);

  /* ================= D09 让模型对校会怎样 ================= */
  const CAT = S.emsCategories.map(([, l]) => l);
  class Division extends Lab {
    defaults() { return { preset: 'deepseek', mine: {}, ex: [] }; }
    render() {
      const s = this.s, A = Mat.text('ems-a'), B = Mat.text('ems-b'), res = L.align(A, B, { unit: 'word' });
      const { run } = W.pickedRun('C02A', s.preset);
      const t = run ? L.parseMdTable(run.reply) : null, mrows = L.variantRowsFromTable(t);
      const model = {}; for (const r of mrows) { const n = String(r.id).match(/\d+/)?.[0]; if (n) model['V' + n.padStart(2, '0')] = CAT.find((c) => r.category.includes(c)) || r.category || null; }
      const items = res.variants.filter((v) => !s.ex.includes(v.variant_id)).map((v) => ({ item_id: v.variant_id, label_a: s.mine[v.variant_id] || null, label_b: model[v.variant_id] || null }));
      const ag = L.agreement(items, CAT);
      this.out(`<div class="w9-two"><section class="w9-col"><header><b>版本比对的分工（讲义 @fig-division）</b></header><table class="items"><tr><th>步骤</th><th>交给谁</th><th>理由与要留的记录</th><th>页</th></tr>${S.division.map(([a, b, c, p]) => `<tr><td>${esc(a)}</td><td><b>${esc(b)}</b></td><td>${esc(c)}</td><td>${p.split('、').map((x) => `<a href="#${x}">${x}</a>`).join('、')}</td></tr>`).join('')}</table>
          <p class="sub">陈垣评理校："最高妙者此法，最危险者亦此法。"模型不拿两个本子逐字相比，只凭文理说"此处当作某字"，做的就是不出校记的理校（第六周）。</p></section>
        <section class="w9-col"><header><b>两项研究</b></header><div class="w10-tcard"><b>Beshero-Bondar 2023</b><p>2023 年上半年的 ChatGPT 与 7 月的 Claude 直接列《弗兰肯斯坦》几个本子的异文：漏标点差别、把相同处报成异文、没发现词序颠倒、报告并未省略的"省略"；重做仍不稳定。项目最终由编者用标记规定比对单位，交 CollateX 对齐。</p></div><div class="w10-tcard"><b>Turnbull 2025（Rdgai）</b><p>对齐与校勘记由人或程序完成，人定类别、给示例，模型给其余异文分类并写理由。阿拉伯语《约翰福音》第 8 章 800 多处；当时最好的 Claude 3.5 Sonnet 每类 10 个示例，准确率 91.4%；作者强调每份文献都要单独验证。</p></div></section></div>
        <div class="w9-toolbar"><b>Rdgai 式小练习（埃姆斯 20 处）</b>　模型 <select data-o="preset">${['deepseek', 'kimi'].map((p) => `<option value="${p}" ${p === s.preset ? 'selected' : ''}>${esc(W.PRESET_LABEL[p])}</option>`).join('')}</select> ${W.badge(run)}　<span class="sub">先给每处定类；勾 4 处作"示例"（示例不计分），其余以你的标注为答案，量 C02A 模型分类的一致率与 κ。</span></div>
        ${run ? '' : '<p class="w10-pending">C02A 待课前运行。</p>'}
        <table class="items w10-vtab"><tr><th>示例</th><th>#</th><th>甲</th><th>乙</th><th>我的类别</th><th>模型的类别</th></tr>${res.variants.map((v) => `<tr class="${s.ex.includes(v.variant_id) ? 'w10-mine' : ''}"><td><input type="checkbox" data-ex="${v.variant_id}" ${s.ex.includes(v.variant_id) ? 'checked' : ''}></td><td>${v.variant_id}</td><td>${esc(v.a_text) || '—'}</td><td>${esc(v.b_text) || '—'}</td><td><select data-mine="${v.variant_id}"><option value=""></option>${CAT.map((c) => `<option ${s.mine[v.variant_id] === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td><td class="${model[v.variant_id] && s.mine[v.variant_id] && model[v.variant_id] !== s.mine[v.variant_id] ? 'nil' : ''}">${esc(model[v.variant_id] || '—')}</td></tr>`).join('')}</table>
        <p class="w10-sum"><b>一致率与 κ（实际计算）</b>：示例 ${s.ex.length} 处不计；可比 ${ag.N} 处；p<sub>o</sub> ＝ ${fmt(ag.po)}；κ ＝ <b>${fmt(ag.kappa)}</b>${ag.disagreements.length ? `；不一致：${ag.disagreements.join('、')}` : ''}。<span class="sub">练习规则是本课的简化（教学构造）：真正的 Rdgai 把示例写进提示再请模型分类；这里的模型分类来自 C02A（提示里没有你的示例），所以换示例只改变"哪几处不计分"。准确率是相对于你自己的标注，换一个人、一套类别就要重算。</span></p>`);
    }
    onChange(e) { const t = e.target; if (t.dataset.o) return this.set({ [t.dataset.o]: t.value }); if (t.dataset.mine) return this.set({ mine: { ...this.s.mine, [t.dataset.mine]: t.value } }); if (t.dataset.ex) { const ex = new Set(this.s.ex); t.checked ? ex.add(t.dataset.ex) : ex.delete(t.dataset.ex); this.set({ ex: [...ex] }); Through.get().varlabels = Object.entries(this.s.mine).map(([v, c]) => ({ variant_id: v, category: c, labeler: 'student', is_example: this.s.ex.includes(v) })); Through.save(); } }
  }
  register('division-lab', Division);

  /* ================= D13 论证缺口 ================= */
  const DEBATE = [
    { guo: '张一麐记袁世凯"寓海淀旅店"时与谭嗣同夜谈；袁在京有海淀、法华寺两处寓所，所以谭走后袁或赶到靠近颐和园的海淀（第 34—35 页）', liu: '袁七月三十日、八月初一日住海淀，初二至初四日住城内法华寺，"各方面史料参证"；张一麐所记"可以肯定是误记"（第 48 页）', ref: '前提', note: '这条材料是否可靠' },
    { guo: '袁在京遍访权贵，要找能引见或传讯者不难；亲随回忆谭走后袁"匆匆去某亲王处"，当指庆王奕劻（第 35 页）', liu: '慈禧归政后，她那里只有亲贵可以"递牌请起"；庚子年的函电显示袁与奕劻的关系尚不到可以托庇的地步（第 48—49 页）', ref: '推理', note: '所需的制度条件是否存在' },
    { guo: '袁的自述对初四日"不著一字"，是有所掩饰（第 33 页）', liu: '初四日袁在筹划次日请训与回津向荣禄告密的说辞（第 49 页；作者自称"我以为"）', ref: '推理', note: '双方都从空白推论；刘的替代解释同样没有直接证据', silent: true },
    { guo: '袁事后受护理直隶总督等"非常礼遇"，若非早已告密难以解释（第 35—36 页）', liu: '车站迎接是官场惯例；短期护理直督合乎制度；以后的升迁各有原因（第 53 页）', ref: '推理', note: '同一现象另有解释' },
  ];
  class Debate extends Lab {
    defaults() { return { mine: {}, reveal: false, struck: [] }; }
    render() {
      const s = this.s, done = DEBATE.filter((_, i) => s.mine[i]).length, same = DEBATE.filter((d, i) => s.mine[i] === d.ref).length;
      const prem = ['P1 袁初四日夜到了海淀', 'P2 在京能找到传讯者（庆王）', 'P3 自述对初四日的沉默是掩饰', 'P4 事后礼遇须以早已告密来解释'];
      this.out(`<table class="items"><tr><th>#</th><th>郭卫东 2002：前提与推论</th><th>刘路生 2005：反驳</th><th>反驳落在哪里（学生选）</th>${s.reveal ? '<th>本课判定</th>' : ''}<th></th></tr>
        ${DEBATE.map((d, i) => `<tr class="${d.silent ? 'w10-key' : ''}"><td>${i + 1}</td><td>${esc(d.guo)}</td><td>${esc(d.liu)}</td><td>${['前提', '推理'].map((v) => `<label class="nowrap"><input type="radio" name="d13-${i}" data-m="${i}" value="${v}" ${s.mine[i] === v ? 'checked' : ''}>反驳${v}</label>`).join(' ')}</td>${s.reveal ? `<td class="${s.mine[i] && s.mine[i] !== d.ref ? 'nil' : ''}">${d.ref}：${esc(d.note)}</td>` : ''}<td>${s.mine[i] ? sendBtn(String(i)) : ''}</td></tr>`).join('')}</table>
        <p class="w10-sum">已选 ${done}／4　<label><input type="checkbox" data-o="reveal" ${s.reveal ? 'checked' : ''}> 显示本课判定</label>${s.reveal ? `　一致 ${same}／${done}` : ''}　<span class="sub">第三行：从一段记载的沉默推出"有所掩饰"，和从同一段沉默推出"在潜心运筹"，是同一种推法。概括为本课所作；页码为《清史研究》原刊页（讲义 @fig-debate）。</span></p>
        <div class="w9-two"><section class="w9-col"><header><b>两位作者的自我限定</b></header><p>郭卫东：初四日告密并引发政变"是笔者的分析所得"，是"一种供大家考问的见解"（第 38 页）。</p><p>刘路生：为徐世昌的行踪提出一种推想之后，随即声明"这只是悬揣，没有事实根据"（第 50 页）。</p></section>
          <section class="w9-col"><header><b>删去自我限定之后</b> <span class="w9-badge teaching-construct">教学构造</span></header><p>"郭卫东证明了袁世凯于初四日在北京告密，并引发了政变。"</p><p class="sub">这一句是本课为说明而写的，不是任何模型的输出：自我限定正是 1.2 说的模型摘要最容易删去的东西。</p></section></div>
        <details><summary>进阶：郭文的四个前提，刘文的反驳打掉了哪几个</summary><p class="sub">点选被反驳到站不住的前提（你的判断）；页面显示郭文结论还剩几个前提支撑（实际计算）。</p>${prem.map((p, i) => `<label class="w10-prem ${s.struck.includes(i) ? 'struck' : ''}"><input type="checkbox" data-st="${i}" ${s.struck.includes(i) ? 'checked' : ''}> ${esc(p)}</label>`).join('')}<p class="w10-sum">结论"袁于初四日在北京告密，是慈禧提前回宫发动政变的最直接原因"还剩 <b>${4 - s.struck.length}</b>／4 个前提支撑。<span class="sub">刘文另有两点（徐世昌初四日告密之说无据；接受告密的是荣禄而非奕劻）页码待补（扩充部分乙三）。茅海建对郭文的评语："提出疑问，长于分析，但在材料上未有进展"（第 4 期第 206—207 页）。</span></p></details>
        <details><summary>进阶：请模型列缺口（案例 C-15），结果只是候选清单</summary><p>Liang 等 2024（当时的 GPT-4，3,096 篇《自然》系列与 1,709 篇 ICLR 论文）：模型意见有三成到四成与至少一位审稿人重合，与两位审稿人互相重合的比例差不多；对象是理工科与医学论文。提示模板（可复制，现场调用时自行使用）：</p><pre class="srcbox">下面是一篇史学论文的论证部分。请列出其中推理有跳步、或反证没有处理的地方，每条写出所涉原文的页码与一句原文。如果你认为没有明显的缺口，就说没有。</pre><p class="sub">你问它"有什么缺口"，它总能说出几条，哪怕文章并没有（第二周的谄媚）。每一条回原文确认后，送入阅读对照单，判定"模型新见"并勾"已回原文确认"才计入。</p></details>`);
    }
    sheetRow(i) { const d = DEBATE[+i]; return { from_page: 'D13', point: d.guo, model_says: null, my_reading: `刘文反驳：${d.liu}；我判为反驳${this.s.mine[+i]}`, verdict: null }; }
    onChange(e) { const t = e.target; if (t.dataset.o) return this.set({ reveal: t.checked }); if (t.dataset.m) { this.set({ mine: { ...this.s.mine, [t.dataset.m]: t.value } }); Through.get().arguments = DEBATE.map((d, i) => ({ row_id: 'D13-' + i, claim: d.guo, rebuttal_type: this.s.mine[i] || null })); Through.save(); } if (t.dataset.st) { const st = new Set(this.s.struck); t.checked ? st.add(+t.dataset.st) : st.delete(+t.dataset.st); this.set({ struck: [...st] }); } }
  }
  register('debate-lab', Debate);

  /* ================= D21 材料包与工具 ================= */
  class Tools extends Lab {
    get noShell() { return false; }
    render() {
      this.out(`<p>本讲的材料清单、导入与接入办法在顶栏 <button class="small" data-x="info">材料说明</button>。</p>
        <div class="w9-two"><section class="w9-col"><header><b>CollateX（多本对齐）</b></header><p>开源，Java 版与 Python 版。Python 版：<code>pip install collatex python-Levenshtein</code>；<code>Collation()</code> 加入见证本，<code>collate(c)</code> 打印对齐表，<code>output="tei"</code> 输出平行分段 TEI。</p>
          <table class="items"><tr><th>程序</th><th>甲</th><th>相同</th><th>异文</th></tr><tr><td>Python difflib（本页 D10 现场计算）</td><td>238</td><td>46</td><td>20</td></tr><tr><td>CollateX 2.3（Python 版，编辑图对齐）</td><td>235</td><td>45</td><td>20</td></tr></table>
          <p class="sub">CollateX 一行据扩充部分丙一（2026-11-16 在云端工作区实际运行）；输出文件当时没有存档，这里只给数字。乙本均为 113 个单位。中日文须先自己切成字或词，再以 JSON 传入。</p></section>
        <section class="w9-col"><header><b>Rdgai（异文分类）</b></header><ol><li>在 TEI 文件头定义类别（<code>interpGrp</code>；D10 的 TEI 导出已带四类）</li><li><code>rdgai gui</code>：手工给一部分异文归类</li><li><code>rdgai validate … --proportion 0.5 --examples 20</code>：一半作示例、一半作答案，出准确率与混淆矩阵报告</li><li>报告满意后 <code>rdgai classify</code> 给其余异文分类</li></ol><p class="sub">据 README（提交 b6607ee）；本课未安装运行。调用商业模型接口，需要 Key，能否接 DeepSeek、Kimi 待查。</p></section></div>
        <div class="w9-two"><section class="w9-col"><header><b>只依据上传文件作答的工具：要记的条件（扩充部分丙二）</b></header><ul><li>工具名与版本（或使用日期）；背后的模型</li><li>上传了哪些文件：题名、版本、来源；扫描本还是有文字层的 PDF</li><li>是否允许联网或使用工具自己的知识</li><li>提问全文、回答全文；回答中的引文是否经工具核实</li></ul><p class="sub">这些条目在 D15 导入时填进声明栏。扫描本没有文字层、知网文字层有错时，引文核对会大量"核不上"：先做 OCR 或换可靠的版本（第六周）。llm-for-zotero：从 Releases 下载 .xpi，Zotero 的 Add-ons 里安装，在设置中填模型提供方（据 README，未安装）。</p></section>
        <section class="w9-col"><header><b>可练习的数据与评测（扩充部分丁二）</b></header><table class="items"><tr><th>名称</th><th>内容</th><th>位置</th></tr>
          <tr><td>NoCha</td><td>1,001 对真假主张，67 部小说；排行榜 2025-07-18 后未更新</td><td>novelchallenge.github.io</td></tr><tr><td>FABLES</td><td>26 部小说的模型摘要与 3,158 条人工标注</td><td>github.com/mungg/FABLES（许可未读）</td></tr><tr><td>LLM-AggreFact</td><td>MiniCheck 汇集的 11 个有据核查数据集</td><td>MiniCheck 仓库</td></tr><tr><td>WikiContradict</td><td>253 例维基百科条目内的真实矛盾</td><td>ibm.biz/wikicontradict（未核）</td></tr><tr><td>HistBench</td><td>414 道历史推理题，29 种语言</td><td>huggingface.co/datasets/jiahaoq/HistBench</td></tr><tr><td>GHDI</td><td>德国史史料德英对照，含埃姆斯电报两本</td><td>germanhistorydocs.org</td></tr></table><p class="sub">这些评测几乎都是英文材料；中日文史学文献上的小测试，可仿照 NoCha 的最小对与 FActScore 的计分自己出题。</p></section></div>`);
    }
    onClick(e) { if (e.target.dataset.x === 'info') document.querySelector('[data-open-info]')?.click(); }
  }
  register('tools-lab', Tools);
})();
