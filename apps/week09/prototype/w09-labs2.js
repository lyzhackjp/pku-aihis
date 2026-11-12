/* 第九周页面组件（二）：D11、D12、D13、D14、D17、D18、D22、D23｜候选，未经教师确认｜2026-11-11 */
(() => {
  'use strict';
  const { esc, store, register, download } = window.Deck;
  const rerender = window.W9.render;
  const { L, Mat, Through, Model, badge, gateList, sourceBox, Lab, answerCell, handleCellClick, latestRun } = window.W9;
  const CARDS = window.W9_CARDS, SIM = window.W9_SIM, RES = (window.W9_PUBLIC || {}).resources || {};
  const fmt = (x, d = 3) => (x == null || Number.isNaN(x) ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toString());
  const line = (pts, w, h, ymax = 1, color = '#164ec7') => { if (!pts.length) return ''; const dx = w / Math.max(1, pts.length - 1); return `<polyline fill="none" stroke="${color}" stroke-width="2" points="${pts.map((y, i) => `${(i * dx).toFixed(1)},${(h - (y / ymax) * h).toFixed(1)}`).join(' ')}"/>`; };

  /* ================= D11 演示⑤ 激活引导 ================= */
  class SteerLab extends Lab {
    defaults() { return { alpha: 0, set: { model: 'Gemma-2-9B-IT', preset: 'Cats Mode', layer: 9, source_type: 'sae_feature', index: 62610, strength: 192, method: 'Simple Additive', question: '' } }; }
    render() {
      const a = this.s.alpha, hx = 1, hy = a, cross = hy > hx, on = Math.abs(hy - hx) < 1e-9;
      const S = 260, sc = (v) => 20 + v * 60, Y = (v) => S - 20 - v * 60;
      const shots = Mat.state().resources.steer_shots || []; // 课前截图在本机材料包里
      const evil = RES.evil_qwen;
      const cols = [
        { title: '二维：推一把', why: 'h ← h + αv。点沿方向 v 移动，越过分类边界 y = x 时变色。', body: `<svg viewBox="0 0 ${S} ${S}" class="w9-svg"><line x1="${sc(0)}" y1="${Y(0)}" x2="${sc(3.6)}" y2="${Y(3.6)}" stroke="#999" stroke-dasharray="4 3"/><text x="${sc(3)}" y="${Y(3.4)}" font-size="12">边界 y = x</text>
            <line x1="${sc(0)}" y1="${Y(0)}" x2="${sc(3.6)}" y2="${Y(0)}" stroke="#333"/><line x1="${sc(0)}" y1="${Y(0)}" x2="${sc(0)}" y2="${Y(3.6)}" stroke="#333"/>
            <line x1="${sc(1)}" y1="${Y(0)}" x2="${sc(1)}" y2="${Y(a)}" stroke="#c9a400" stroke-width="2" marker-end="url(#ah)"/><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#c9a400"/></marker></defs>
            <circle cx="${sc(hx)}" cy="${Y(hy)}" r="8" fill="${on ? '#888' : cross ? '#c0392b' : '#164ec7'}"/><circle cx="${sc(1)}" cy="${Y(0)}" r="4" fill="#164ec7" opacity=".4"/></svg>
            <label>α <input type="range" min="0" max="3" step="0.05" value="${a}" data-o="alpha"> ${fmt(a, 2)}</label>
            <p class="mono">h = (1, 0)，v = (0, 1)，h + αv = (1, ${fmt(a, 2)})　${on ? '恰在边界上' : cross ? '已越过边界（α > 1）' : '未越过边界'}</p><p><span class="w9-badge teaching-construct">教学构造</span></p>` },
        { title: 'Steer 页：Cats Mode', why: '真实模型里 h 有几千维；这里是在第 9 层加 192 倍的第 62610 号特征方向。', body: `<p><a href="https://www.neuronpedia.org/steer" target="_blank" rel="noopener">打开 Neuronpedia Steer（新窗口）</a></p>${RES.qr_steer ? `<img src="${esc(RES.qr_steer)}" alt="Neuronpedia Steer 二维码" class="w9-qr">` : ''}
            <p class="mono">h₉ ← h₉ + 192 · d₆₂₆₁₀</p><p class="sub">特征说明"mentions and references to cats and related topics"由 GPT-4o-mini 自动写成；语料中最强一次激活约 58（讲义 3.2）。只输入通用问题，不输入本课史料。本页不调用 Neuronpedia 的接口，也不嵌入它的页面。</p>` },
        { title: '强度加倍与取负', why: '强度越大差别越大，也越容易失去条理；负值时不提猫。', body: shots.length ? `<div class="w9-shots">${shots.map((s) => `<figure><img src="${esc(s.file)}" alt="${esc(s.caption)}"><figcaption>${esc(s.caption)}<br><span class="sub">预存回放（课前截图）｜${esc(s.date)}${s.setting ? '｜' + esc(s.setting) : ''}</span></figcaption></figure>`).join('')}</div>` : '<p class="w9-badge none">待课前截图</p><p class="sub">课前在教室网络打开 Steer 页，按课前环境方案 C-07 截 6—8 张图，放入本机材料包；断网时这里显示截图。</p>' },
        { title: '特征页核对与记录', why: '读激活例子，判断说明是否贴切；把本次设置记下来。', body: `${['model', 'preset', 'layer', 'index', 'strength', 'method'].map((k) => `<label class="w9-kv">${k}<input data-set="${k}" value="${esc(this.s.set[k])}" size="14"></label>`).join('')}<label class="w9-kv">通用问题<input data-set="question" value="${esc(this.s.set.question)}" size="22" placeholder="如：你是谁？"></label><p class="sub">引导设置只作记录，不发出任何请求。</p>
            ${evil ? `<details><summary>进阶："邪恶 Qwen"复现表（只读结果，不运行）</summary>${evil}</details>` : '<details><summary>进阶："邪恶 Qwen"复现表</summary><p class="sub">数字据 occcat/qwen35-evil-neuron README，待接入；不放敌意输出原文。</p></details>'}` },
      ];
      rerender(this, window.Deck.flowShell(this.page(), cols, { active: a > 1 ? 1 : 0 }));
    }
    onInput(e) { if (e.target.dataset.o === 'alpha') this.set({ alpha: +e.target.value }); }
    onChange(e) { const k = e.target.dataset.set; if (k) this.set({ set: { ...this.s.set, [k]: e.target.value } }); }
  }
  register('steer-lab', SteerLab);

  /* ================= D12 模拟条件卡 ================= */
  const WHY = { '人物与时点': '不写时点，就无法判断哪句越界。', '指定史料': '不写史料与页码，别人无法核对"依据"一栏。', '模型与日期': '不写型号与日期，换一天、换一版就无法比较。', '提示全文': '提示改一个字，回答就可能变；必须原样保存。', '温度与采样次数': '不写采样次数，就无法判断结果是否偶然。', '用途': '不写用途，模拟就容易被当成证据而不是提问的工具。' };
  class CardLab extends Lab {
    defaults() { return { cid: 'card-3a', draft: null, out: {} }; }
    cur() { return this.s.draft || CARDS.find((c) => c.id === this.s.cid); }
    render() {
      const c = this.cur(), chk = L.checkCard(c, Mat.entries()), msg = L.buildMessages(c, Mat.entries());
      const f = (k, lab, type = 'input') => `<label class="w9-field ${chk.missing.includes(lab) ? 'missing' : ''}"><span>${lab}</span>${type === 'ta' ? `<textarea data-cf="${k}" rows="2">${esc(c[k] ?? '')}</textarea>` : `<input data-cf="${k}" value="${esc(Array.isArray(c[k]) ? c[k].join('；') : (typeof c[k] === 'object' && c[k] ? c[k].name : c[k] ?? ''))}">`}</label>`;
      const rows = ['人物与时点', '指定史料', '模型与日期', '提示全文', '温度与采样次数', '用途'];
      rerender(this, `<div class="w9-toolbar"><label>预置卡 <select data-o="cid">${CARDS.map((x) => `<option value="${x.id}" ${x.id === this.s.cid && !this.s.draft ? 'selected' : ''}>${esc(x.group + '｜' + x.label)}</option>`).join('')}</select></label> <button class="small" data-x="blank">空白卡</button> <button class="small" data-x="copy">以当前卡为底稿修改</button> ${this.s.draft ? '<span class="w9-badge calc">本机草稿</span>' : (c.construct ? '<span class="w9-badge teaching-construct">教学构造的错卡</span>' : '<span class="w9-badge static">预置卡（静态）</span>')}</div>
        <div class="w9-two"><section class="w9-col"><header><b>条件卡</b></header>
          ${this.s.draft ? `${f('person', '人物与时点')}${f('timepoint', '人物与时点')}${f('sources', '指定史料')}<p class="sub">史料条目 id，以"；"分隔；可选：${Mat.entries().slice(0, 12).map((e) => esc(e.id)).join('、')}……</p>${f('system_prompt', '提示全文', 'ta')}${f('user_prompt', '提示全文', 'ta')}${f('temperature', '温度与采样次数')}${f('samples', '温度与采样次数')}${f('purpose', '用途', 'ta')}`
            : `<dl class="kv"><dt>人物与时点</dt><dd>${esc(c.person)}，${esc(c.timepoint_raw)}（${esc(c.timepoint)}）</dd><dt>指定史料</dt><dd>${c.sources.map((id) => esc(Mat.entry(id)?.title || id)).join('；')}</dd><dt>模型与日期</dt><dd>运行时写入运行记录；DeepSeek 非思考模式，Kimi K3</dd><dt>提示全文</dt><dd><pre class="srcbox">${esc(c.system_prompt)}\n\n${esc(c.user_prompt)}</pre></dd><dt>温度与采样次数</dt><dd>DeepSeek 温度 ${c.temperature}（示例）；Kimi 固定 1.0；每格 ${c.samples} 次</dd><dt>逐句核对</dt><dd>${esc(c.check_plan)}（D08）</dd><dt>用途</dt><dd>${esc(c.purpose)}</dd></dl>${c.note ? `<p class="note-box">${esc(c.note)}</p>` : ''}`}
          <details><summary>每一栏写不清会怎样</summary><ul>${rows.map((r) => `<li class="${chk.missing.includes(r) ? 'nil' : ''}"><b>${r}</b>：${WHY[r]}</li>`).join('')}</ul></details></section>
        <section class="w9-col"><header><b>检查</b>　${chk.complete ? '<span class="ok">完整，史料全部通过</span>' : '<span class="nil">未通过</span>'}</header>
          ${chk.missing.length ? `<p class="nil">缺：${chk.missing.join('、')}</p>` : ''}${gateList(chk.gate)}${chk.noCitation.length ? `<p class="nil">无出处或页码：${chk.noCitation.join('、')}</p>` : ''}
          <details><summary>将要发出的提示（只含通过校验的条目）</summary><pre class="srcbox">${esc(msg.messages[0].content)}\n\n【用户】${esc(msg.messages[1].content)}</pre></details>
          ${['deepseek', 'kimi'].map((p) => `<h4>${p === 'deepseek' ? 'DeepSeek' : 'Kimi'}</h4>${this.s.draft ? `<button class="small" data-run="${p}">${Model.state().mode === 'live' ? '现场调用（由你决定是否运行）' : '取预存回放'}</button> ${badge(this.s.out[p]?.run, this.s.out[p]?.kind)}<p class="nil small">${esc(this.s.out[p]?.error || '')}</p>${this.s.out[p]?.run?.reply ? `<pre class="answer">${esc(this.s.out[p].run.reply)}</pre>` : ''}` : answerCell(c.id, p, { circle: false })}`).join('')}
          <p><button class="small" data-x="save">把这张卡记入贯穿页</button></p></section></div>`);
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.o === 'cid') return this.set({ cid: t.value, draft: null, out: {} });
      if (t.dataset.cf) { const k = t.dataset.cf; let v = t.value; if (k === 'sources') v = v.split(/[；;,，\s]+/).filter(Boolean); if (k === 'temperature' || k === 'samples') v = v === '' ? '' : Number(v); this.set({ draft: { ...this.s.draft, [k]: v } }); }
    }
    async onClick(e) {
      const x = e.target.dataset.x;
      if (x === 'blank') return this.set({ draft: { id: 'card-my-' + Date.now().toString(36), group: '学生', label: '我的卡', person: '', timepoint: '', timepoint_raw: '', sources: [], model: { channel: 'api', name: '（运行时记录）' }, system_prompt: '', user_prompt: '', temperature: 0.7, samples: 3, purpose: '' }, out: {} });
      if (x === 'copy') { const c = this.cur(); return this.set({ draft: { ...JSON.parse(JSON.stringify(c)), id: 'card-my-' + Date.now().toString(36), label: c.label + '（改）', construct: false }, out: {} }); }
      if (x === 'save') { Through.add('cards', JSON.parse(JSON.stringify(this.cur())), 'id'); return; }
      const r = e.target.dataset.run;
      if (r) { const out = await Model.run(this.cur(), r); this.set({ out: { ...this.s.out, [r]: out } }); return; }
      await handleCellClick(e, this);
    }
  }
  register('card-lab', CardLab);

  /* ================= D13 演示④ 小框架 ================= */
  const ISSUES = ['主角错置', '前提缺失', '时点越界'];
  function ruleActorReply(actor, topic) { // 教学构造：从指定史料中选与话题字面重合最多的一句
    const sents = actor.sources.flatMap((id) => L.splitSentences(Mat.entry(id)?.text || '').map((s) => ({ s, id })));
    const score = (s) => [...new Set(topic)].filter((ch) => s.includes(ch)).length;
    const best = sents.sort((a, b) => score(b.s) - score(a.s))[0];
    return best ? `${best.s}（规则式：取自${Mat.entry(best.id)?.title}）` : '（指定史料无录文）';
  }
  class DialogueLab extends Lab {
    defaults() { return { driver: 'deepseek', step: 0, simId: null, rule: false, marks: {} }; }
    sims() { return Through.get().sims.concat((Mat.replays().filter((r) => r.format === 'w09-sim/v1'))); }
    async runSim() {
      const steps = [], memory = []; const simId = `${SIM.sim_id}-${this.s.rule ? 'rule' : this.s.driver}-${Date.now().toString(36)}`;
      this.busy = true; this.err = ''; this.render();
      for (const round of SIM.rounds) for (const name of SIM.moderator.order) {
        const actor = SIM.actors.find((a) => a.name === name);
        const card = L.simStepCard(SIM, round, actor, memory); // 与课前脚本共用同一段
        let run, kind;
        if (this.s.rule) { const reply = ruleActorReply(actor, round.topic); run = Through.add('runs', { run_id: `RULE-${simId}-${round.id}-${name}`, card_id: card.id, mode: 'teaching-construct', model: '规则式行动者', preset: 'rule', prompt: { messages: L.buildMessages(card, Mat.entries()).messages }, reply, date: new Date().toISOString() }, 'run_id'); kind = 'teaching-construct'; }
        else { const out = await Model.run(card, this.s.driver); run = out.run; kind = out.kind; if (!run) { this.err = out.error || '无记录'; break; } if (out.error) this.err = out.error; }
        const acc = L.simAccept(SIM, round, run.reply);
        memory.push({ actor: name, reply: acc.reply });
        steps.push({ round: round.id, actor: name, run_id: run.run_id, kind, memory_len: memory.length, accepted: acc.accepted, moderator_note: acc.moderator_note });
        this.render();
      }
      const sim = { format: 'w09-sim/v1', sim_id: simId, setup: { actors: SIM.actors, moderator: SIM.moderator, rounds: SIM.rounds, driver: { preset: this.s.rule ? 'rule' : this.s.driver, model: this.s.rule ? '规则式' : Model.state().models[this.s.driver] } }, steps };
      Through.add('sims', sim, 'sim_id'); this.busy = false; this.set({ simId, step: 0 });
    }
    render() {
      const sims = this.sims(), sim = sims.find((s) => s.sim_id === this.s.simId) || sims[sims.length - 1];
      const allRuns = Through.get().runs.concat(Mat.replays());
      const st = sim?.steps?.[this.s.step], run = st && allRuns.find((r) => r.run_id === st.run_id);
      const gate = L.sourceGate(Mat.entries(), '1906', [...new Set(SIM.actors.flatMap((a) => a.sources))]);
      const mk = (i, t) => !!this.s.marks[`${sim?.sim_id}|${i}|${t}`];
      const counts = ISSUES.map((t) => [t, (sim?.steps || []).filter((_, i) => mk(i, t)).length]);
      rerender(this, `<div class="w9-toolbar"><b>"革命在今日中国是否可行？"三轮对谈</b>　<label>驱动 <select data-o="driver">${['deepseek', 'kimi'].map((p) => `<option ${p === this.s.driver ? 'selected' : ''}>${p}</option>`).join('')}</select></label> <label><input type="checkbox" data-o="rule" ${this.s.rule ? 'checked' : ''}> 进阶：规则式行动者（教学构造）</label> <button data-x="run" ${this.busy ? 'disabled' : ''}>${this.busy ? '运行中…' : (Model.state().mode === 'live' ? '运行一次（两个角色同一模型）' : '载入预存回放')}</button> <span class="nil">${esc(this.err || '')}</span></div>
        <p class="sub">${esc(SIM.note)} 两个角色由同一模型驱动，不让两人各用一个模型，以免把模型的差别误读为人物的差别。</p>${gateList(gate)}
        <div class="w9-two"><section class="w9-col"><header><b>按步回放</b>　${sim ? `<select data-o="sim">${sims.map((s) => `<option value="${esc(s.sim_id)}" ${s.sim_id === sim.sim_id ? 'selected' : ''}>${esc(s.sim_id)}</option>`).join('')}</select>` : ''}</header>
          ${sim ? `<p>${sim.steps.map((s, i) => `<button class="small ${i === this.s.step ? 'on' : ''}" data-step="${i}">${s.round}·${esc(s.actor)}</button>`).join(' ')}</p>
            ${st ? `<p><b>第 ${st.round} 轮　${esc(st.actor)}</b>　${badge(run, run?.mode)}　记忆 ${st.memory_len} 条　${st.accepted ? '' : `<span class="nil">${esc(st.moderator_note)}</span>`}</p><pre class="answer">${esc(run?.reply || '（无记录）')}</pre>
              <p>${ISSUES.map((t) => `<label><input type="checkbox" data-mk="${this.s.step}|${t}" ${mk(this.s.step, t) ? 'checked' : ''}> ${t}</label>`).join(' ')}</p>
              <details><summary>这一步拼出的提示全文</summary><pre class="srcbox">${esc((run?.prompt?.messages || []).map((m) => `【${m.role}】${m.content}`).join('\n\n'))}</pre></details>` : ''}
            <p class="w9-sum">${counts.map(([t, n]) => `${t} <b>${n}</b>`).join('　')}　<span class="w9-badge calc">实际计算</span></p>` : '<p class="w9-badge none">尚无运行记录（待课前运行）</p>'}</section>
        <section class="w9-col"><header><b>对照原文</b></header>${['liang-xzgwlj-3', 'liang-guojia', 'liang-xindalu', 'zhang-kuangmiu-dated'].map(sourceBox).join('')}<p class="sub">《民报》可用科学出版社 1957—1958 年影印本（赖骏楠所据）；对照段落待教师选定。</p>
          <details><summary>进阶：小框架的 ODD 七项（扩充部分乙二）</summary><ol><li>目的与格局：看两人对谈能否守住 1906 年</li><li>实体：两个行动者；状态是记忆</li><li>调度：三轮，每轮两人各说一次，主持人定顺序</li><li><b>设计概念：交给模型，规则不可见</b></li><li>初始化：人设与指定史料</li><li>输入数据：无</li><li>子模型：模型接口（型号、温度）</li></ol><p><a href="#D22">到 D22 映射自己的机制卡</a></p></details></section></div>`);
    }
    onChange(e) {
      const t = e.target, o = t.dataset.o;
      if (o === 'driver') this.set({ driver: t.value }); if (o === 'rule') this.set({ rule: t.checked }); if (o === 'sim') this.set({ simId: t.value, step: 0 });
      if (t.dataset.mk) { const sim = this.sims().find((s) => s.sim_id === this.s.simId) || this.sims().slice(-1)[0]; this.set({ marks: { ...this.s.marks, [`${sim.sim_id}|${t.dataset.mk}`]: t.checked } }); }
    }
    onClick(e) {
      if (e.target.dataset.x === 'run') this.runSim();
      if (e.target.dataset.step) this.set({ step: +e.target.dataset.step });
    }
  }
  register('dialogue-lab', DialogueLab);

  /* ================= D14 谢林模型 ================= */
  class SchellingLab extends Lab {
    defaults() { return { theta: 0.5, density: 0.9, groups: 2, hood: 8, layout: 'random', seed: 1, size: 30 }; }
    connectedCallback() { super.connectedCallback(); this.reset(); }
    reset() { this.st = L.schellingInit({ size: this.s.size, density: this.s.density, groups: this.s.groups, seed: this.s.seed, layout: this.s.layout }); this.trace = [L.schellingMetrics(this.st, this.s.theta, this.s.hood)]; this.sweep = null; this.render(); }
    stepN(n) { for (let k = 0; k < n; k++) { const m = L.schellingStep(this.st, this.s.theta, this.s.hood); this.trace.push(L.schellingMetrics(this.st, this.s.theta, this.s.hood)); if (!m) break; } this.render(); }
    render() {
      if (!this.st) return;
      const { size, grid } = this.st, cell = 9, W = size * cell, col = ['#f4f3ee', '#164ec7', '#c9a400', '#2c6a3a'];
      const m = this.trace[this.trace.length - 1];
      const share = L.sameShare([1, 1, 1, 2, 2, 2, 2, 0], 1);
      const cols = [
        { title: '设阈值 θ 与密度 ρ', why: '每个人只要求同类邻居不少于 θ。', body: `<div class="w9-formula"><p><b>小格子</b>（教学构造）：中心一人，八邻中三同类、四异类、一空</p><p class="mono">s = 3/7 ≈ ${fmt(share, 2)}；θ = ${fmt(this.s.theta, 2)} 时${share < this.s.theta ? '<b class="nil">不满意</b>' : '<b class="ok">满意</b>'}</p></div>
            <label>θ <input type="range" min="0.05" max="0.9" step="0.05" value="${this.s.theta}" data-o="theta"> ${fmt(this.s.theta, 2)}</label><br><label>ρ <input type="range" min="0.5" max="0.98" step="0.02" value="${this.s.density}" data-o="density"> ${fmt(this.s.density, 2)}</label>
            <p><select data-o="layout"><option value="random" ${this.s.layout === 'random' ? 'selected' : ''}>随机初始分布</option><option value="blocks" ${this.s.layout === 'blocks' ? 'selected' : ''}>按街区预设（教学构造）</option></select> <select data-o="groups"><option value="2" ${this.s.groups == 2 ? 'selected' : ''}>两类人</option><option value="3" ${this.s.groups == 3 ? 'selected' : ''}>三类人（进阶）</option></select> <select data-o="hood"><option value="8" ${this.s.hood == 8 ? 'selected' : ''}>八邻</option><option value="4" ${this.s.hood == 4 ? 'selected' : ''}>四邻（进阶）</option></select> 种子 <input data-o="seed" value="${this.s.seed}" size="3"></p>` },
        { title: '运行', why: '不满意的人随机搬到空位，直到没人想搬。', body: `<canvas width="${W}" height="${W}" class="w9-grid-canvas"></canvas><p><button data-x="step">一步</button> <button data-x="run">运行到停</button> <button data-x="reset">重置</button>　第 ${this.st.step} 步</p>` },
        { title: '看 S 与 U', why: 'S：所有人同类比例的平均；U：不满意者所占比例。', body: `<svg viewBox="0 0 240 120" class="w9-svg"><rect x="0" y="0" width="240" height="120" fill="none" stroke="#ccc"/>${line(this.trace.map((t) => t.S), 240, 120)}${line(this.trace.map((t) => t.U), 240, 120, 1, '#c0392b')}</svg><p class="mono">S = ${fmt(m.S)}　U = ${fmt(m.U)}</p><p class="sub"><span style="color:#164ec7">— S</span>　<span style="color:#c0392b">— U</span>　页面内实际运行（种子 ${this.s.seed}，可复现）</p>` },
        { title: '扫描', why: '一次运行说明不了转折在哪里；每格十次，看均值与范围。', body: `<button data-x="sweep">扫描 θ = 0.1—0.8（每格十次，20×20）</button>${this.sweep ? `<svg viewBox="0 0 240 120" class="w9-svg"><rect width="240" height="120" fill="none" stroke="#ccc"/>${this.sweep.map((r, i) => { const x = 15 + i * 30; return `<line x1="${x}" x2="${x}" y1="${120 - r.max * 120}" y2="${120 - r.min * 120}" stroke="#999"/><circle cx="${x}" cy="${120 - r.mean * 120}" r="3" fill="#164ec7"/><text x="${x - 8}" y="118" font-size="9">${r.theta}</text>`; }).join('')}</svg><table class="items">${this.sweep.map((r) => `<tr><td>θ=${r.theta}</td><td>S 均值 ${fmt(r.mean)}</td><td>${fmt(r.min)}—${fmt(r.max)}</td></tr>`).join('')}</table><p class="sub">转折点由本页实际运行得出；讲义与扩充部分都没有写具体数值。</p>` : ''}<p><a href="https://www.netlogoweb.org/launch#https://www.netlogoweb.org/assets/modelslib/Sample%20Models/Social%20Science/Segregation.nlogo" target="_blank" rel="noopener">NetLogo Web 的隔离模型（外链）</a></p>` },
      ];
      rerender(this, window.Deck.flowShell(this.page(), cols, { active: this.sweep ? 3 : this.st.step ? 2 : 0 }));
      const cv = this.querySelector('canvas'); if (cv) { const g = cv.getContext('2d'); grid.forEach((v, i) => { g.fillStyle = col[v]; g.fillRect((i % size) * cell, Math.floor(i / size) * cell, cell - 1, cell - 1); }); }
    }
    onInput(e) { const o = e.target.dataset.o; if (o === 'theta' || o === 'density') { this.s[o] = +e.target.value; store.set(this.key, this.s); if (o === 'density') this.reset(); else { this.trace.push(L.schellingMetrics(this.st, this.s.theta, this.s.hood)); this.render(); } } }
    onChange(e) { const o = e.target.dataset.o; if (['layout', 'groups', 'hood', 'seed'].includes(o)) { this.s[o] = o === 'layout' ? e.target.value : +e.target.value; store.set(this.key, this.s); this.reset(); } }
    onClick(e) {
      const x = e.target.dataset.x;
      if (x === 'step') this.stepN(1); if (x === 'run') this.stepN(80); if (x === 'reset') this.reset();
      if (x === 'sweep') { this.sweep = L.schellingSweep({ size: 20, density: this.s.density, groups: this.s.groups, seed: this.s.seed, layout: this.s.layout }, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], 10, { hood: this.s.hood, maxSteps: 40 }); this.render(); }
    }
  }
  register('schelling-lab', SchellingLab);

  /* ================= D17 《外交》 ================= */
  class DiplomacyLab extends Lab {
    defaults() { return { c: [[3, 3], [5, 1]], d: [1, 1], opp: '制裁者', moves: [], shares: { 守约者: 0.4, 背约者: 0.4, 制裁者: 0.2 } }; }
    render() {
      const nb = L.nashBargain(this.s.c.map((p, i) => ({ id: '合约' + '甲乙'[i], payoff: p })), this.s.d);
      const game = this.playGame();
      const pp = L.populationPayoffs(this.s.shares);
      const curve = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((z) => { const r = 1 - z; return { z, ...L.populationPayoffs({ 守约者: r / 2, 背约者: r / 2, 制裁者: z }) }; });
      const ymax = 5;
      const cols = [
        { title: '合约表', why: '两份合约与谈不成时的收益（教学构造的小表）。', body: `<table class="items"><tr><th></th><th>甲方</th><th>乙方</th></tr>${this.s.c.map((p, i) => `<tr><td>合约${'甲乙'[i]}</td>${p.map((v, j) => `<td><input data-c="${i},${j}" value="${v}" size="3"></td>`).join('')}</tr>`).join('')}<tr><td>谈不成</td>${this.s.d.map((v, j) => `<td><input data-d="${j}" value="${v}" size="3"></td>`).join('')}</tr></table>` },
        { title: '纳什议价', why: '选使"各自比谈不成多得多少"的乘积最大的合约。', body: `<table class="items">${nb.rows.map((r) => `<tr class="${nb.best && r.id === nb.best.id ? 'ok' : ''}"><td>${r.id}</td><td class="mono">(${r.payoff[0]}−${this.s.d[0]})×(${r.payoff[1]}−${this.s.d[1]}) = ${r.product ?? '不可行'}</td></tr>`).join('')}</table><p>选出：<b>${nb.best ? nb.best.id + ' (' + nb.best.payoff.join(',') + ')' : '—'}</b></p><p class="sub">DeepMind 的智能体每回合都在做这件事（讲义 4.4）。</p>` },
        { title: '三回合小游戏', why: '你是甲国；乙国由页面扮演。规则简化，数字为示例。', body: `<p>乙国是：<select data-o="opp">${['守约者', '背约者', '制裁者'].map((t) => `<option ${t === this.s.opp ? 'selected' : ''}>${t}</option>`).join('')}</select></p><p>${this.s.moves.length < 3 ? `第 ${this.s.moves.length + 1} 回合：<button data-mv="k">守约</button> <button data-mv="b">背约</button>` : `<button data-x="again">再来一局</button>`}</p><table class="items"><tr><th>回合</th><th>甲</th><th>乙</th><th>收益</th></tr>${game.log.map((g) => `<tr><td>${g.t}</td><td>${{ k: '守约', b: '背约', s: '制裁' }[g.a]}</td><td>${{ k: '守约', b: '背约', s: '制裁' }[g.b]}</td><td>${g.pay.map((x) => fmt(x, 1)).join(' / ')}</td></tr>`).join('')}</table><p>合计：甲 ${fmt(game.a, 1)}，乙 ${fmt(game.b, 1)}</p><p class="sub">双守 3/3；一方背约 5/0；双背 1/1；制裁者被背约后对其背约，付成本 0.5、使对方受罚 3。</p>` },
        { title: '种群对局', why: '制裁者比例上升，背约者的收益下降，守约者回升。', body: `${['守约者', '背约者', '制裁者'].map((t) => `<label class="w9-kv">${t}<input type="range" min="0" max="1" step="0.05" value="${this.s.shares[t]}" data-sh="${t}"> ${fmt(this.s.shares[t], 2)}</label>`).join('')}<table class="items">${Object.entries(pp).map(([t, v]) => `<tr><td>${t}</td><td>平均每局 ${fmt(v, 2)}</td></tr>`).join('')}</table>
            <svg viewBox="0 0 240 120" class="w9-svg"><rect width="240" height="120" fill="none" stroke="#ccc"/>${line(curve.map((c) => c['守约者']), 240, 120, ymax, '#2c6a3a')}${line(curve.map((c) => c['背约者']), 240, 120, ymax, '#c0392b')}${line(curve.map((c) => c['制裁者']), 240, 120, ymax, '#164ec7')}</svg><p class="sub">横轴：制裁者比例 0—0.6（其余守约、背约各半）。<span style="color:#2c6a3a">守约</span>　<span style="color:#c0392b">背约</span>　<span style="color:#164ec7">制裁</span></p>
            <p class="note-box">规则简化／数字为示例，不是《外交》本身。Kramár 等 2022 的"接近三倍"等结果据原文，不由这个小游戏产生。大模型对局（Duffy 2025、AI_Diplomacy）没有可拖动的比例：那里的规则来自模型训练。</p>` },
      ];
      rerender(this, window.Deck.flowShell(this.page(), cols, { active: this.s.moves.length ? 2 : 1 }));
    }
    playGame() {
      let a = 0, b = 0, bHurt = false; const log = [];
      this.s.moves.forEach((mv, t) => { const bAct = this.s.opp === '背约者' ? 'b' : (this.s.opp === '制裁者' && bHurt ? 's' : 'k'); const pb = bAct === 's' ? 'b' : bAct; let [x, y] = L.PAY[mv + pb]; if (bAct === 's') { y -= 0.5; x -= 3; } a += x; b += y; if (mv === 'b' && pb === 'k') bHurt = true; log.push({ t: t + 1, a: mv, b: bAct, pay: [x, y] }); });
      return { a, b, log };
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.c) { const [i, j] = t.dataset.c.split(',').map(Number); const c = this.s.c.map((r) => r.slice()); c[i][j] = +t.value; this.set({ c }); }
      if (t.dataset.d) { const d = this.s.d.slice(); d[+t.dataset.d] = +t.value; this.set({ d }); }
      if (t.dataset.o === 'opp') this.set({ opp: t.value, moves: [] });
    }
    onInput(e) { const t = e.target.dataset.sh; if (t) this.set({ shares: { ...this.s.shares, [t]: +e.target.value } }); }
    onClick(e) { const mv = e.target.dataset.mv; if (mv) this.set({ moves: [...this.s.moves, mv] }); if (e.target.dataset.x === 'again') this.set({ moves: [] }); }
  }
  register('diplomacy-lab', DiplomacyLab);

  /* ================= D18 Q 国逐句标注 ================= */
  class QinLab extends Lab {
    defaults() { return { counts: {} }; }
    render() {
      const S = RES.qin || [], T = Through.get().setting_labels, mine = (id) => T.find((x) => x.sentence_id === id && x.annotator === '本机')?.label;
      const LAB = ['史料', '理论', '已知结局'];
      const n = S.filter((s) => mine(s.id) === '已知结局').length, done = S.filter((s) => mine(s.id)).length;
      rerender(this, `<p class="sub">据 WarAgent 官方仓库 <span class="mono">src/history_setting/agent_profile_Warring.py</span>（Apache-2.0，2026-11-08 取得；源码中这一设定块的变量名就是 <span class="mono">Qin</span>）。中译为本课所作。</p>
        <table class="items w9-qin"><tr><th>栏目</th><th>原文</th><th>中译</th><th>来源（本人）</th><th>全班（导入或举手计数）</th></tr>
        ${S.map((s) => `<tr><td>${esc(s.field)}</td><td>${esc(s.sentence)}</td><td>${esc(s.translation)}</td><td class="nowrap">${LAB.map((l) => `<label><input type="radio" name="q-${s.id}" data-q="${s.id}" value="${l}" ${mine(s.id) === l ? 'checked' : ''}> ${l}</label>`).join('<br>')}</td>
          <td class="nowrap">${LAB.map((l) => { const imp = T.filter((x) => x.sentence_id === s.id && x.annotator !== '本机' && x.label === l).length, hand = +(this.s.counts[s.id + '|' + l] || 0); return `${l} <input data-cnt="${s.id}|${l}" value="${hand || ''}" size="2" placeholder="0">${imp ? `＋导入 ${imp}` : ''}`; }).join('<br>')}</td></tr>`).join('')}</table>
        <p class="w9-sum">本人已标 ${done}/${S.length} 句；"已知结局"占 <b>${S.length ? fmt(n / S.length, 2) : '—'}</b>　<span class="w9-badge calc">实际计算</span>　<button class="small" data-x="exp">导出本人标注</button> <button class="small" data-w9-import="settinglabels">导入各组标注</button></p>`);
    }
    onChange(e) {
      const t = e.target;
      if (t.dataset.q) { const s = (RES.qin || []).find((x) => x.id === t.dataset.q); Through.remove('setting_labels', (x) => x.sentence_id === s.id && x.annotator === '本机'); Through.add('setting_labels', { setting: 'WarAgent-Warring-Qin', field: s.field, sentence_id: s.id, sentence: s.sentence, translation: s.translation, label: t.value, annotator: '本机' }); }
      if (t.dataset.cnt) this.set({ counts: { ...this.s.counts, [t.dataset.cnt]: t.value } });
    }
    onClick(e) { if (e.target.dataset.x === 'exp') download('Q国设定标注.csv', 'sentence_id,sentence,label\n' + Through.get().setting_labels.filter((x) => x.annotator === '本机').map((x) => [x.sentence_id, JSON.stringify(x.sentence), x.label].join(',')).join('\n'), 'text/csv'); }
  }
  register('qin-lab', QinLab);

  /* ================= D22 机制卡与 ODD ================= */
  const MF = [['pattern', '要解释的格局', '史料中看到的、想要解释的分布或变化'], ['actors', '行动者', '谁；有哪些属性'], ['environment', '环境与制度', '约束是什么'], ['rules', '规则', '每个行动者怎样决定；写成"如果……就……"或交给大模型'], ['schedule', '时间推进', '一步多久；谁先动'], ['observation', '观测与检验', '记录什么；与哪种史料格局对照；零模型是什么']];
  const ODD = ['1. 目的与格局', '2. 实体、状态变量与尺度', '3. 过程概览与调度', '4. 设计概念', '5. 初始化', '6. 输入数据', '7. 子模型'];
  const ODD_DEFAULT = { '1. 目的与格局': 'pattern', '2. 实体、状态变量与尺度': 'actors', '3. 过程概览与调度': 'schedule', '4. 设计概念': 'rules', '5. 初始化': 'actors', '6. 输入数据': 'environment', '7. 子模型': 'rules' };
  class MechLab extends Lab {
    defaults() { return { id: 'mech-' + Date.now().toString(36), title: '', fields: {}, llm: false, odd: {} }; }
    render() {
      const f = (k) => this.s.fields[k] || { text: '', origin: [] };
      const filled = MF.filter(([k]) => f(k).text.trim()).length;
      const red = MF.filter(([k]) => f(k).origin.includes('已知结局'));
      const oddMap = { ...ODD_DEFAULT, ...this.s.odd }, oddEmpty = ODD.filter((o) => !oddMap[o] || !f(oddMap[o]).text.trim());
      rerender(this, `<div class="w9-toolbar"><label>题目 <input data-o="title" value="${esc(this.s.title)}" size="36" placeholder="如：清末留日学生与报刊论战的传播（预备题）"></label> <button class="small" data-x="save">记入贯穿页</button> <span class="sub">课上先填前四栏，后两栏课后补。</span></div>
        <div class="w9-two"><section class="w9-col"><header><b>机制卡</b>　已填 ${filled}/6</header>${MF.map(([k, lab, hint], i) => `<div class="w9-field ${f(k).origin.includes('已知结局') ? 'late' : ''}"><span>${lab}${i >= 4 ? '（课后）' : ''}</span><textarea data-mf="${k}" rows="2" placeholder="${esc(hint)}">${esc(f(k).text)}</textarea><div>${['史料', '理论', '已知结局'].map((o) => `<label><input type="checkbox" data-mo="${k}|${o}" ${f(k).origin.includes(o) ? 'checked' : ''}> ${o}</label>`).join(' ')}${k === 'rules' ? ` <label><input type="checkbox" data-o="llm" ${this.s.llm ? 'checked' : ''}> 规则交给大模型</label>` : ''}</div></div>`).join('')}</section>
        <section class="w9-col"><header><b>检查</b></header>${red.length ? `<p class="nil">来源标为"已知结局"：${red.map(([, l]) => l).join('、')}——这就是 WarAgent 那种把结局写进输入的风险所在（D18）。</p>` : '<p class="ok">没有栏目标为"已知结局"。</p>'}
          ${MF.filter(([k]) => f(k).text.trim() && !f(k).origin.length).length ? `<p class="nil">未标来源：${MF.filter(([k]) => f(k).text.trim() && !f(k).origin.length).map(([, l]) => l).join('、')}</p>` : ''}
          <h4>进阶：映射到 ODD 七项（Grimm 等 2020）</h4><table class="items">${ODD.map((o) => `<tr class="${oddEmpty.includes(o) ? 'late' : ''}"><td>${o}</td><td><select data-odd="${o}"><option value="">（空）</option>${MF.map(([k, l]) => `<option value="${k}" ${oddMap[o] === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('')}</table>
          <p>${oddEmpty.length ? `空着的项：${oddEmpty.join('、')}` : 'ODD 七项都有对应内容。'}</p>${this.s.llm ? '<p class="note-box">第 4 项"设计概念"交给了大模型：规则不可见，须记录型号与温度（条件卡，D12）。</p>' : ''}
          <p class="sub">演示④小框架的 ODD 表见 D13 进阶。<span class="w9-badge calc">实际计算</span></p></section></div>`);
    }
    onInput(e) { const k = e.target.dataset.mf; if (k) { this.s.fields[k] = { ...(this.s.fields[k] || { origin: [] }), text: e.target.value }; store.set(this.key, this.s); clearTimeout(this.tm); this.tm = setTimeout(() => this.render(), 400); } if (e.target.dataset.o === 'title') { this.s.title = e.target.value; store.set(this.key, this.s); } }
    onChange(e) {
      const t = e.target;
      if (t.dataset.mo) { const [k, o] = t.dataset.mo.split('|'); const cur = this.s.fields[k] || { text: '', origin: [] }; this.s.fields[k] = { ...cur, origin: t.checked ? [...cur.origin, o] : cur.origin.filter((x) => x !== o) }; this.set({}); }
      if (t.dataset.o === 'llm') this.set({ llm: t.checked });
      if (t.dataset.odd) this.set({ odd: { ...this.s.odd, [t.dataset.odd]: t.value } });
    }
    onClick(e) { if (e.target.dataset.x === 'save') Through.add('mech_cards', { id: this.s.id, title: this.s.title, fields: this.s.fields, llm_rules: this.s.llm, odd: { ...ODD_DEFAULT, ...this.s.odd } }, 'id'); }
  }
  register('mech-lab', MechLab);

  /* ================= D23 结语与贯穿记录 ================= */
  const STAGES = [['史料包与时点', 'D09', (T) => T.packs.length], ['条件卡', 'D12', (T) => T.cards.length], ['运行记录', 'D01', (T) => T.runs.length], ['逐句标注', 'D08', (T) => T.labels.filter((l) => l.score != null || l.source_ref || l.type || l.circled).length], ['仿真记录', 'D13', (T) => T.sims.length], ['机制卡', 'D22', (T) => T.mech_cards.length], ['有限论断', 'D23', (T) => (T.claim.text ? 1 : 0)]];
  const CHECKLIST = ['论断只说到所用史料能支持的程度', '每条模拟输出都附了条件卡', '至少有一段回答做了逐句检查', '没有把模拟输出当作史料引用', '机制卡的每一栏都标了来源'];
  class Through9 extends Lab {
    get noShell() { return true; }
    defaults() { return { stage: 0, msg: '' }; }
    render() {
      const T = Through.get(), [name, page, cnt] = STAGES[this.s.stage];
      const body = {
        0: () => T.packs.map((p) => `<p><b>${esc(p.title)}</b>（${p.entries.length} 条）</p>`).join('') || '<p class="sub">尚无导入的史料包（在 D09 导入；预置史料包不必记录）。</p>',
        1: () => T.cards.map((c) => `<p><b>${esc(c.label || c.id)}</b>：${esc(c.person)}，${esc(c.timepoint)}；用途：${esc(c.purpose)}</p>`).join('') || '<p class="sub">在 D12 点"记入贯穿页"。</p>',
        2: () => `<table class="items"><tr><th>记录</th><th>性质</th><th>型号</th><th>时间</th><th>错误</th></tr>${T.runs.map((r) => `<tr><td class="mono">${esc(r.run_id)}</td><td>${esc(window.W9.MODE_LABEL[r.mode] || r.mode)}</td><td>${esc(r.model || '')}</td><td>${esc((r.date || '').slice(0, 16))}</td><td class="nil">${esc(r.error || '')}</td></tr>`).join('')}</table>`,
        3: () => { const by = {}; T.labels.forEach((l) => { (by[l.run_id] = by[l.run_id] || []).push(l); }); return Object.entries(by).map(([id, ls]) => { const s = L.timepointScore(ls); return `<p class="mono">${esc(id)}：${ls.length} 句；L = ${fmt(s.L)}；无依据 ${s.noSource}</p>`; }).join('') || '<p class="sub">在 D05、D08 标注。</p>'; },
        4: () => T.sims.map((s) => `<p><b>${esc(s.sim_id)}</b>：${s.steps.length} 步，驱动 ${esc(s.setup.driver.preset)}</p>`).join('') || '<p class="sub">在 D13 运行或载入。</p>',
        5: () => T.mech_cards.map((m) => `<p><b>${esc(m.title || m.id)}</b>：${Object.values(m.fields || {}).filter((f) => f.text).length}/6 栏</p>`).join('') || '<p class="sub">在 D22 点"记入贯穿页"。</p>',
        6: () => `<textarea data-claim rows="4" style="width:100%" placeholder="写一句有限论断：用了哪些模拟、核对了什么、能说到哪一步。">${esc(T.claim.text)}</textarea>${CHECKLIST.map((c) => `<label class="w9-confirm"><input type="checkbox" data-ck="${esc(c)}" ${T.claim.checklist[c] ? 'checked' : ''}> ${esc(c)}</label>`).join('')}`,
      }[this.s.stage]();
      rerender(this, `<div class="through"><div class="through-main"><h3>${this.s.stage + 1} · ${esc(name)}　<a href="#${page}" class="sub">讲解页 ${page}</a></h3><div class="through-pane">${body}</div></div>
        <div class="through-rail"><p><b>问题</b>：让模型替古人说话、替社会推演，得到的是什么？凭什么可以进入历史解释？</p>
          <div class="stage-grid">${STAGES.map(([n, , c], i) => `<button data-stage="${i}" class="${i === this.s.stage ? 'on' : ''} ${c(T) ? 'done' : ''}">${i + 1} ${esc(n)}（${c(T)}）</button>`).join('')}</div>
          <div class="through-actions"><button data-x="json">导出记录 .json（不含 Key）</button><button data-x="md">导出 .md</button><label class="pack-btn small">恢复记录<input type="file" accept=".json" data-imp hidden></label><button data-x="clear">清空本机记录</button></div><p class="${this.s.msg.startsWith('已') ? 'ok' : 'nil'}">${esc(this.s.msg)}</p>
          <p class="sub">记录只存在本浏览器；导出文件由学生保存。</p></div></div>`);
    }
    async onChange(e) {
      const t = e.target;
      if (t.dataset.imp !== undefined && t.files?.[0]) { const r = Through.import(await t.files[0].text()); this.set({ msg: r.ok ? '已恢复记录。' : '未恢复，保留原记录：' + r.error }); }
      if (t.dataset.ck) { const T = Through.get(); T.claim.checklist[t.dataset.ck] = t.checked; Through.save(); }
    }
    onInput(e) { if (e.target.dataset.claim !== undefined) { Through.get().claim.text = e.target.value; clearTimeout(this.tm); this.tm = setTimeout(() => Through.save(), 400); } }
    onClick(e) {
      const st = e.target.dataset.stage; if (st) return this.set({ stage: +st });
      const x = e.target.dataset.x;
      if (x === 'json') download(`第九周贯穿记录_${new Date().toISOString().slice(0, 10)}.json`, Through.export(), 'application/json');
      if (x === 'md') { const T = Through.get(); download('第九周贯穿记录.md', `# 第九周贯穿记录\n\n导出时间：${new Date().toISOString()}\n\n## 有限论断\n\n${T.claim.text}\n\n## 运行记录（${T.runs.length}）\n\n${T.runs.map((r) => `- ${r.run_id}｜${window.W9.MODE_LABEL[r.mode] || r.mode}｜${r.model || ''}｜${(r.date || '').slice(0, 16)}`).join('\n')}\n\n## 机制卡（${T.mech_cards.length}）\n\n${T.mech_cards.map((m) => `### ${m.title || m.id}\n\n${MF.map(([k, l]) => `- ${l}：${m.fields?.[k]?.text || ''}（来源：${(m.fields?.[k]?.origin || []).join('、')}）`).join('\n')}`).join('\n\n')}\n`); }
      if (x === 'clear' && confirm('清空本浏览器中的第九周记录？')) { Through.clear(); this.set({ msg: '已清空。' }); }
    }
  }
  register('w9-through', Through9);
})();
