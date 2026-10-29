/* 第七周测试原型的页面组件：D01、D05、D06、D09、D14、D25、D27、D30。
 * 依赖 deck-core.js（window.Deck）与 week07-core.js（window.W7）。正式开发时逐个移植为 Stencil 组件。 */
(() => {
  'use strict';
  const { esc, store, pageById, pageLink, download, flowShell, rerender, register } = window.Deck;
  const W = window.W7;
  const seg = (k, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-set="${k}:${esc(v)}" class="${String(cur) === String(v) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—');
  /* 需要材料包的组件基类：未导入时显示统一提示，导入后重绘。 */
  class PackLab extends HTMLElement {
    connectedCallback() {
      this.setAttribute('data-needs-pack', '');
      this.packChanged = () => this.render();
      this.s = Object.assign({}, this.defaults?.() || {}, store.get(this.key, {}));
      this.addEventListener('click', (e) => { const b = e.target.closest('[data-set]'); if (!b) return; const i = b.dataset.set.indexOf(':'); this.set(b.dataset.set.slice(0, i), b.dataset.set.slice(i + 1)); });
      this.addEventListener('input', (e) => { const k = e.target.dataset.k; if (k) { this.s[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; this.save(); } });
      this.init?.(); this.render();
    }
    set(k, v) { this.s[k] = v; this.save(); }
    save() { store.set(this.key, this.s); this.render(); }
    get pack() { return W.Pack.get(); }
  }

  /* ================= D01 在 CBDB 查“王珪” ================= */
  const cbdbPerson = (j) => j?.Package?.PersonAuthority?.PersonInfo?.Person || null;
  const arr = (v, k) => (v && typeof v === 'object' ? [].concat(v[k] || []) : []);
  function personCard(p) {
    if (!p) return '<p class="warn">无记录</p>';
    const b = p.BasicInfo, al = arr(p.PersonAliases, 'Alias'), po = arr(p.PersonPostings, 'Posting'), kin = arr(p.PersonKinshipInfo, 'Kinship');
    const v = (x) => (x && x !== '0' ? esc(x) : '<span class="nil">无</span>');
    return `<dl class="kv">
      <dt>编号</dt><dd>${esc(b.PersonId)}</dd><dt>姓名</dt><dd>${esc(b.ChName)}</dd><dt>朝代</dt><dd>${v(b.Dynasty)}</dd><dt>籍贯（指数地址）</dt><dd>${v(b.IndexAddr)}</dd>
      <dt>生年</dt><dd>${v(b.YearBirth)}</dd><dt>卒年</dt><dd>${v(b.YearDeath)}</dd><dt>别名</dt><dd>${al.length ? al.map((a) => `${esc(a.AliasName)}（${esc(a.AliasType)}）`).join('、') : '<span class="nil">无</span>'}</dd>
      <dt>任官</dt><dd>${po.length ? po.length + ' 条' : '<span class="nil">无</span>'}</dd><dt>亲属</dt><dd>${kin.length ? kin.length + ' 条' : '<span class="nil">无</span>'}</dd></dl>`;
  }
  /* 智能体回答中逐条断言的核对（课件编写者对照接口返回逐项判断，2026-10-28）。 */
  const D01_CLAIMS = [
    ['籍贯：河南开封（即“开封府”）', 'none', '返回的籍贯是“蕭山”'],
    ['生年不详，卒年不详', 'yes', '返回中生卒年均为空'],
    ['“年寿约在之前”', 'yes', '照抄 YearsLivedApprox 字段“之前”'],
    ['大致在北宋中期', 'none', '返回的朝代是“清”'],
    ['在宋神宗时期担任宰相', 'none', '返回中无任官；这是提问里的话'],
    ['与王安石为同族，王安石的叔父辈；其子王安石', 'none', '返回的亲属只有直系祖先王茂生与妻蔡氏'],
    ['以上信息基于《宋史》及 CBDB', 'none', '工具只查了一次 CBDB，未查《宋史》'],
  ];
  class CbdbQueryLab extends PackLab {
    get key() { return 'w7-d01'; }
    defaults() { return { q: 'json', guess: '', reveal: false }; }
    render() {
      const P = this.pack, page = pageById('D01');
      if (!W.Pack.has('cbdb', 'runs.d01_agent')) { rerender(this, W.packGate('CBDB 接口原始返回（按名 HTML 与 JSON、编号 1845／33013）与智能体运行记录')); return; }
      const { q } = this.s; const C = P.cbdb;
      const url = q === 'html' ? `${C.api}?name=王珪` : q === 'json' ? `${C.api}?name=王珪&o=json` : `${C.api}?id=${q}&o=json`;
      const raw = q === 'html' ? null : q === 'json' ? C.name_query.json : C.persons[q];
      const list = C.name_query.html_list;
      const col2 = q === 'html'
        ? `<p class="sub">网页列出 ${list.filter((x) => x.label === '王珪').length} 条“王珪”，另 ${list.filter((x) => x.label !== '王珪').length} 条是其亲属；只有编号，没有时代。</p><ol class="idlist">${list.map((x) => `<li class="${x.label === '王珪' ? '' : 'dim'}">${esc(x.label)} <span class="mono">${esc(x.id)}</span></li>`).join('')}</ol>`
        : `<pre class="json">${esc(JSON.stringify(raw, null, 1).slice(0, 2600))}${JSON.stringify(raw).length > 2600 ? '\n……（全文 ' + JSON.stringify(raw).length + ' 字符）' : ''}</pre>`;
      const p = q === 'html' ? null : cbdbPerson(raw);
      const col3 = q === 'html' ? '<p class="note-box">人可以逐条点开辨认；程序拿到的只是一串编号。</p>' : personCard(p);
      const run = P.runs.d01_agent;
      let col4 = '';
      if (q === 'json') {
        col4 = `<p class="warn"><b>程序得到 1 条记录，不会报错。</b>这一条是清代蕭山人，没有生卒、别名、任官。</p>
          <label class="field">你预测智能体会怎样回答？<textarea data-k="guess" rows="3">${esc(this.s.guess)}</textarea></label>
          <button data-set="reveal:${this.s.reveal ? '' : '1'}">${this.s.reveal ? '收起运行记录' : '展开实际运行记录'}</button>
          ${this.s.reveal && run ? this.runView(run) : ''}`;
      } else if (q === 'html') col4 = '<p>34 条同名记录，按名网页查询需要人逐条辨认。</p>';
      else col4 = `<p>按编号查才拿到确定的人：${q === '1845' ? '北宋王珪，1019—1085，字禹玉，封岐國公，諡文恭。' : '唐代王珪，571—639，字叔玠，諡懿，唐太宗朝侍中。'}</p>`;
      rerender(this, flowShell(page, [
        { title: '选择查询方式', why: '同一个名字，四种问法。', body: seg('q', [['html', '按名·网页'], ['json', '按名·机器格式'], ['1845', '编号 1845'], ['33013', '编号 33013']], q) + `<p class="mono small">${esc(url)}</p><p class="sub">接口返回于 ${esc(C.queried)} 取得（材料包）。</p>` },
        { title: '接口原样返回', why: '机器格式只给一条，头部版本号写着 20131220。', body: col2 },
        { title: '程序拿到的记录', why: '缺项就是缺项，程序不会提醒。', body: col3 },
        { title: '后果', why: '错误发生在“一个名字被当成一个人”。', body: col4 },
      ], { active: q === 'json' ? 3 : 1 }));
    }
    runView(run) {
      const step1 = run.steps[0], call = step1.tool_calls[0];
      return `<div class="runlog"><p class="sub">${esc(run.model.file)} · ${esc(run.model.runtime)} · 温度 0 · ${esc(run.date)} · 共 ${esc(run.total_seconds)} 秒 · 工具：${esc(run.tool_mode)}</p>
        <p><b>提问</b>　${esc(run.user)}</p>
        <p><b>第 1 轮</b>（${esc(step1.seconds)} 秒）调用 <code>${esc(call.call.name)}(${esc(JSON.stringify(call.call.arguments))})</code>，得到 ${esc(call.response_chars)} 字符（即第 2 列那一条）。</p>
        <p><b>最终回答</b></p><pre class="answer">${esc(run.final_answer)}</pre>
        <table class="claims"><tr><th>回答中的说法</th><th>接口返回里有吗</th><th>核对</th></tr>${D01_CLAIMS.map(([c, y, n]) => `<tr class="${y === 'yes' ? 'ok' : 'bad'}"><td>${esc(c)}</td><td>${y === 'yes' ? '有' : '没有'}</td><td>${esc(n)}</td></tr>`).join('')}</table>
        <p class="sub">核对为课件编写者对照接口返回逐项判断。第一次运行时接口对脚本请求返回 403，记录另存于材料包（runs.d01_attempt1_403）。</p></div>`;
    }
  }
  register('cbdb-query-lab', CbdbQueryLab);

  /* ================= D05 证据表 ================= */
  class EvidenceTable extends HTMLElement {
    connectedCallback() {
      this.mat = this.getAttribute('material') || store.get('w7-mat', 'dnsr');
      this.compact = this.hasAttribute('compact');
      this.addEventListener('input', (e) => { const t = e.target; if (t.dataset.r == null) return; const rows = W.Evidence.rows(this.mat); rows[+t.dataset.r][t.dataset.c] = t.value; W.Evidence.save(this.mat, rows); });
      this.addEventListener('change', (e) => { if (e.target.dataset.c === 'kind' || e.target.dataset.c === 'locsrc') this.render(); });
      this.addEventListener('click', (e) => {
        const a = e.target.closest('[data-ev]')?.dataset.ev; if (!a) return;
        const rows = W.Evidence.rows(this.mat);
        if (a === 'add') { rows.push({ text: '', loc: '', orig: '', norm: '', kind: '未见', reason: '', locsrc: '人工标出', who: '' }); W.Evidence.save(this.mat, rows); }
        if (a.startsWith('del:')) { rows.splice(+a.slice(4), 1); W.Evidence.save(this.mat, rows); }
        if (a === 'csv') download(`证据表_${this.mat}.csv`, W.Evidence.csv(rows), 'text/csv');
        if (a === 'json') download(`证据表_${this.mat}.json`, JSON.stringify(rows, null, 1), 'application/json');
        if (a === 'tei') download(`证据表_${this.mat}_TEI片段.xml`, W.Evidence.tei(rows), 'application/xml');
        if (a === 'reset' && confirmReset(this)) W.Evidence.reset(this.mat);
        if (a.startsWith('mat:')) { this.mat = a.slice(4); store.set('w7-mat', this.mat); }
        this.render();
      });
      this.onEv = (e) => { if (e.detail === this.mat && !this.contains(document.activeElement)) this.render(); };
      document.addEventListener('w7-evidence', this.onEv);
      this.render();
    }
    render() {
      const rows = W.Evidence.rows(this.mat), C = W.Evidence.cols;
      const cell = (r, i, [k, , ph]) => {
        if (k === 'kind') return `<select data-r="${i}" data-c="kind">${W.Evidence.kinds.map((x) => `<option ${r.kind === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
        if (k === 'locsrc') return `<select data-r="${i}" data-c="locsrc">${W.Evidence.locsrc.map((x) => `<option ${r.locsrc === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
        const empty = k === 'norm' && !r.norm && (r.kind === '未见' || r.kind === '不确定');
        return `<textarea data-r="${i}" data-c="${k}" rows="2" placeholder="${esc(empty ? '可以为空（' + r.kind + '）' : ph)}" class="${k === 'text' || k === 'orig' ? 'verbatim' : ''}">${esc(r[k])}</textarea>`;
      };
      rerender(this, `<div class="ev-wrap">
        <div class="ev-bar">${this.compact ? '' : `材料　${['dnsr', 'songshi', 'mine'].map((m) => `<button data-ev="mat:${m}" class="small ${this.mat === m ? 'on' : ''}">${{ dnsr: '『大日本史料』第 1 页', songshi: '《宋史·王珪传》', mine: '我的材料' }[m]}</button>`).join('')}　`}
          <button data-ev="add" class="small">新增一行</button><button data-ev="csv" class="small">导出 CSV</button><button data-ev="json" class="small">导出 JSON</button><button data-ev="tei" class="small">导出 TEI 片段</button><button data-ev="reset" class="small">恢复示例</button></div>
        <div class="ev-scroll"><table class="evtable"><thead><tr><th>#</th>${C.map(([k, l]) => `<th class="c-${k}">${esc(l)}</th>`).join('')}<th></th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td>${C.map((c) => `<td class="c-${c[0]}">${cell(r, i, c)}</td>`).join('')}<td><button data-ev="del:${i}" class="small" title="删除此行">×</button></td></tr>`).join('')}</tbody></table></div>
        <p class="ev-legend">判断类型：${W.Evidence.kinds.join('／')}（“未见”“不确定”是合法值，规范值可以为空）。位置来源：${W.Evidence.locsrc.join('／')}。原值、原文片段照录，不改字；清洗只动规范值。</p></div>`);
    }
  }
  function confirmReset(el) { if (el._resetArmed) { el._resetArmed = false; return true; } el._resetArmed = true; setTimeout(() => { el._resetArmed = false; }, 3000); el.querySelector('[data-ev="reset"]').textContent = '再点一次确认'; return false; }
  register('evidence-table', EvidenceTable);

  /* ================= D06 TEI ================= */
  const TEI_DEFAULT = `<pb n="1"/>
……<date when-custom="永正5-06-14" datingMethod="#wareki"
      when="1508-07-21">十四日</date>、庚辰、晴、○中略、今日<persName
  ref="#hatakeyama-hisanobu" cert="medium" resp="#ed1928">畠山尾州</persName>上洛云々、一万人計云々、

<!-- 文件另一处：人物清单 -->
<listPerson>
  <person xml:id="hatakeyama-hisanobu">
    <persName type="regularized">畠山尚順</persName>
    <persName type="variant">畠山尾州</persName>
    <note>据『大日本史料』9-1 编者括注</note>
  </person>
</listPerson>`;
  const DOCUXML = `<Date Aux="公元516年:北魏孝明帝">熙平元年</Date>
<PersonName Term="胡氏" RefId="A002046">靈太后胡氏</PersonName>`;
  /* 证据表各列 ↔ TEI 写法（讲义 @fig-tei-map）。 */
  const TEI_MAP = [
    ['persName', ['text', 'orig'], '标签包住的原文本身就是原文片段与原值'],
    ['pb', ['loc'], '<pb n="…"/> 标出页（<lb/> 标行）'],
    ['ref', ['norm'], 'ref 指向人物清单（<listPerson>）中的条目'],
    ['regularized', ['norm'], '清单里的首选名＝规范值；variant 保存异称'],
    ['when', ['norm'], 'when 写格里历标准日期（换算结果）'],
    ['when-custom', ['orig'], 'when-custom 与 datingMethod 写年号原文'],
    ['cert', ['kind'], 'cert 写判断的确定程度'],
    ['note', ['reason'], '<note> 写理由'],
    ['resp', ['who'], 'resp 写负责判断的人'],
  ];
  class TeiLab extends PackLab {
    get key() { return 'w7-d06'; }
    defaults() { return { code: TEI_DEFAULT, tab: 'tei', pick: 'persName', edit: false }; }
    init() { this.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t) this.set('pick', t.dataset.pick); }); }
    render() {
      const page = pageById('D06'); const { code, tab, pick, edit } = this.s;
      const src = tab === 'tei' ? code : DOCUXML;
      const doc = new DOMParser().parseFromString(`<root xmlns:xml="http://www.w3.org/XML/1998/namespace">${src}</root>`, 'application/xml');
      const perr = doc.querySelector('parsererror');
      const errText = perr ? perr.textContent.replace(/\s+/g, ' ').slice(0, 220) : '';
      const keys = TEI_MAP.map((m) => m[0]);
      const hl = esc(src).replace(/(&lt;\/?)([\w:-]+)|([\w:-]+)(=&quot;)/g, (all, lt, tag, attr, eq) => {
        const k = tag || attr; const on = keys.includes(k) ? `data-pick="${k}" class="tk ${pick === k ? 'on' : ''}"` : 'class="tk0"';
        return tag ? `${lt}<span ${on}>${tag}</span>` : `<span ${on}>${attr}</span>${eq}`;
      });
      const m = TEI_MAP.find((x) => x[0] === pick) || TEI_MAP[0];
      const cols = W.Evidence.cols.map(([k, l]) => `<li class="${m[1].includes(k) ? 'on' : ''}">${esc(l)}</li>`).join('');
      rerender(this, flowShell(page, [
        { title: '原文一句', why: '判断就写在称呼旁边：行内标注。', body: `<p class="src-line">十四日、庚辰、晴、○中略、今日<u>畠山尾州</u>上洛云々、一万人計云々、</p><p class="sub">『後法成寺尚通公記』永正五年六月十四日条（『大日本史料』9-1 本文第 1 页）。此日儒略历 1508-07-11，格里历 1508-07-21（D14 可复算）。</p>` },
        { title: tab === 'tei' ? 'TEI 标注' : tab === 'rec' ? 'TEI 校验记录' : 'DocuXML（DocuSky）', why: tab === 'rec' ? '2026-10-27 用 TEI 官方 tei_all 校验（教学文件夹原件）。' : '点标签名或属性名，看它对应证据表的哪一列。', body: seg('tab', [['tei', 'TEI'], ['docu', 'DocuXML'], ['rec', '校验记录']], tab) + (tab === 'tei' ? ` <button class="small" data-set="edit:${edit ? '' : '1'}">${edit ? '看高亮' : '改代码'}</button>` : '') +
          (tab === 'rec' ? this.recView() : edit && tab === 'tei' ? `<textarea data-k="code" class="code" rows="16" spellcheck="false">${esc(code)}</textarea><button class="small" data-set="code:${esc(TEI_DEFAULT)}">恢复示例</button>` : `<pre class="code">${hl}</pre>`) },
        { title: '对应证据表的列', why: esc(m[2]), body: `<p class="mono">${esc(m[0])}</p><ul class="evcols">${cols}</ul>` },
        { title: '格式检查', why: '括号不配对，整份文件就读不进去。', body: (perr ? `<p class="warn"><b>XML 格式错误</b>：${esc(errText)}</p>` : '<p class="okbox"><b>格式良好</b>（浏览器 XML 解析器实时检查）</p>') +
          `<p class="sub">浏览器只能检查“格式良好”。是否合乎 TEI 规则（有效）要用 TEI schema 校验：见第 2 列“校验记录”标签（2026-10-27，tei_all P5 4.12.0，Jing 与 Schematron）。</p>
          <ul class="pros"><li>省去在原文之外另维护一张表（助教批注）</li><li>可能损坏原文本：覆盖原写法、括号不配对（助教批注）</li><li>XML 与 TEI 写法需要专门学习（助教批注）</li><li>人名跨页、跨行时与严格嵌套冲突（讲义补充，指南第 21 章）</li></ul>` },
      ], { active: edit ? 1 : 2 }));
    }
  }
  TeiLab.prototype.recView = function () {
    const T = W.Pack.get()?.teach?.tei; if (!T) return W.packGate('TEI 校验记录（教学文件夹原件）');
    const row = (k, l, jing) => { const v = T.svrl[k]; return `<tr class="${v.failed_assert || v.successful_report ? 'bad' : 'ok'}"><td>${l}</td><td>${jing}</td><td>failed-assert ${v.failed_assert}，successful-report ${v.successful_report}${v.messages.length ? '：' + esc(v.messages.join('；')) : ''}</td></tr>`; };
    return `<table class="steps"><tr><th>文件</th><th>Jing（RELAX NG）</th><th>Schematron（SVRL）</th></tr>${row('doc1_section1-4', '讲义 1.4 片段＋最小外壳', '通过')}${row('doc2_kuozhan8', '扩充八完整示例', '通过')}${row('bad3', '对照：date 上加 notBefore', '通过')}</table>
      <p class="sub">tei_all（TEI P5 4.12.0）；Jing 20241231；SchXslt 1.10.1＋Saxon-HE 12.5。另做两项对照（删结束标签、persName 直接放进 body），Jing 均报错。tei_all 不检查 ref、resp、datingMethod 指针所指对象是否存在。</p>
      <details><summary>doc1_section1-4.xml</summary><pre class="code small-src">${esc(T.docs['doc1_section1-4'])}</pre></details>`;
  };
  register('tei-lab', TeiLab);

  /* ================= D09 四个王珪 ================= */
  const D09_IDS = ['33013', '1845', '1846', '570937'];
  function postSummary(p) {
    const po = arr(p.PersonPostings, 'Posting');
    return po.map((x) => ({ title: x.OfficeName, a: +x.FirstYear || null, b: +x.LastYear || null, addr: x.AddrName }));
  }
  class NamesakeLab extends PackLab {
    get key() { return 'w7-d09'; }
    defaults() { return { dyn: '宋', office: '參知政事', addr: '', alive: '' }; }
    render() {
      const P = this.pack, page = pageById('D09');
      if (!W.Pack.has('cbdb')) { rerender(this, W.packGate('CBDB 编号 33013、1845、1846、570937 的接口原始返回')); return; }
      const people = D09_IDS.map((id) => ({ id, p: cbdbPerson(P.cbdb.persons[id]) })).filter((x) => x.p);
      const { dyn, office, addr, alive } = this.s;
      const steps = [];
      let left = people.slice();
      const test = (label, val, fn, why) => { if (!val) return; const out = left.filter((x) => !fn(x)); steps.push({ label, out: out.map((x) => x.id), why: out.map((x) => `${x.id}：${why(x)}`).join('；') || '无人排除' }); left = left.filter(fn); };
      test(`时代＝${dyn}`, dyn, (x) => x.p.BasicInfo.Dynasty === dyn, (x) => x.p.BasicInfo.Dynasty || '无朝代');
      test(`任官含“${office}”`, office, (x) => postSummary(x.p).some((o) => o.title.includes(office)), (x) => `${postSummary(x.p).length} 条任官中无此官`);
      test(`籍贯含“${addr}”`, addr, (x) => (x.p.BasicInfo.IndexAddr || '').includes(addr), (x) => x.p.BasicInfo.IndexAddr || '无');
      test(`${alive} 年在世`, alive, (x) => { const b = +x.p.BasicInfo.YearBirth || -1e9, d = +x.p.BasicInfo.YearDeath || 1e9; return b <= +alive && +alive <= d; }, (x) => `${x.p.BasicInfo.YearBirth || '?'}—${x.p.BasicInfo.YearDeath || '?'}`);
      const card = (x) => {
        const b = x.p.BasicInfo, po = postSummary(x.p), al = arr(x.p.PersonAliases, 'Alias');
        const lastPost = Math.max(0, ...po.map((o) => o.b || o.a || 0));
        const conflict = +b.YearDeath && lastPost > +b.YearDeath;
        return `<div class="pcard ${left.includes(x) ? 'keep' : 'out'}"><b>${esc(x.id)}</b>　${esc(b.Dynasty || '—')}　${esc(b.IndexAddr || '—')}　${esc(b.YearBirth && b.YearBirth !== '0' ? b.YearBirth : '?')}—${esc(b.YearDeath || '?')}
          <div class="sub">${al.map((a) => esc(a.AliasName) + '（' + esc(a.AliasType) + '）').join('、') || '无别名'}；任官 ${po.length} 条</div>
          ${conflict ? `<div class="warn small">卒年 ${esc(b.YearDeath)}，最后任官年 ${lastPost}：卒后任官（真冲突，见 D18）</div>` : ''}</div>`;
      };
      const pick = left.length === 1 ? left[0] : null;
      rerender(this, flowShell(page, [
        { title: '候选', why: `按名网页共 ${P.cbdb.name_query.html_list.filter((x) => x.label === '王珪').length} 条王珪；这里取讲义所列四条的完整记录。`, body: people.map(card).join('') },
        { title: '选比对字段', why: '时代、籍贯、官职、在世年份，都是传统考证用的字段。', body: `
          <label class="field">时代 <select data-k="dyn">${['', '唐', '宋', '清'].map((d) => `<option ${d === dyn ? 'selected' : ''} value="${d}">${d || '（不限）'}</option>`).join('')}</select></label>
          <label class="field">任官含 <input data-k="office" value="${esc(office)}" placeholder="如 參知政事"></label>
          <label class="field">籍贯含 <input data-k="addr" value="${esc(addr)}" placeholder="如 東明"></label>
          <label class="field">某年在世 <input data-k="alive" value="${esc(alive)}" placeholder="如 1071" inputmode="numeric"></label>` },
        { title: '逐项排除', why: '每一步写明依据的字段值。', body: steps.length ? `<table class="steps"><tr><th>条件</th><th>排除</th><th>依据</th></tr>${steps.map((s) => `<tr><td>${esc(s.label)}</td><td>${esc(s.out.join('、') || '—')}</td><td class="sub">${esc(s.why)}</td></tr>`).join('')}</table>` : '<p class="sub">尚未设条件。</p>' },
        { title: '留下的人', why: '把理由写成一句，送进证据表。', body: pick ? `<p class="big-num">CBDB ${esc(pick.id)}</p><p>理由：${esc(steps.map((s) => s.label).join('；'))}，其余候选依次排除。</p><p class="sub">按名网页上的其余 30 条只有编号，课堂上可按同样字段逐条点开。</p>` : `<p>${left.length} 人留下：${left.map((x) => x.id).join('、') || '无'}</p>` },
      ], { active: steps.length ? 3 : 1, done: steps.length ? 2 : 0 }));
    }
  }
  register('namesake-lab', NamesakeLab);

  /* ================= D14 年号换算（含原 D15 EDTF） ================= */
  const D14_PRESETS = [
    { label: '熙寧三年十二月丁卯', country: 'zh', era: '熙寧', y: 3, m: 12, leap: false, gz: '丁卯', fb: { first: 2112244, days: 30 } },
    { label: '永正五年六月八日（甲戌）', country: 'ja', era: '永正', y: 5, m: 6, leap: false, d: 8, fb: { first: 2272034, days: 30 } },
    { label: '永正五年六月十四日（庚辰）', country: 'ja', era: '永正', y: 5, m: 6, leap: false, d: 14, fb: { first: 2272034, days: 30 } },
    { label: '元治元年十二月十五日', country: 'ja', era: '元治', y: 1, m: 12, leap: false, d: 15, fb: { first: 2402235, days: 29 } },
  ];
  const EDTF_EX = [['某年（确知）', '1071'], ['某年某月某日', '1071-01-14'], ['约某年（638，約）', '638~'], ['某年？（存疑）', '1071?'], ['约且存疑', '1071%'], ['十一世纪七十年代', '107X'], ['某年至某年', '1071/1075'], ['某年以后', '1158/..'], ['某年以前', '../1156']];
  function edtf(s) {
    s = String(s).trim(); let m;
    const q = (x) => ({ '~': '近似', '?': '存疑', '%': '近似且存疑' }[x] || '');
    if ((m = s.match(/^(\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?([~?%])?$/))) return { ok: true, a: +m[1], b: +m[1], text: `${m[1]}${m[2] ? '年' + (+m[2]) + '月' : '年'}${m[3] ? (+m[3]) + '日' : ''}`, qual: q(m[4]) };
    if ((m = s.match(/^(\d{1,3})X$/))) return { ok: true, a: +m[1] * 10, b: +m[1] * 10 + 9, text: `${m[1]}0—${m[1]}9 年间（未详数位）`, qual: '' };
    if ((m = s.match(/^(\d{1,4})\/(\d{1,4})$/))) return { ok: true, a: +m[1], b: +m[2], text: `${m[1]} 至 ${m[2]} 年`, qual: '区间' };
    if ((m = s.match(/^(\d{1,4})\/\.\.$/))) return { ok: true, a: +m[1], b: null, text: `${m[1]} 年以后`, qual: '开放区间' };
    if ((m = s.match(/^\.\.\/(\d{1,4})$/))) return { ok: true, a: null, b: +m[1], text: `${m[1]} 年以前`, qual: '开放区间' };
    return { ok: false };
  }
  class CalendarLab extends PackLab {
    get key() { return 'w7-d14'; }
    defaults() { return { p: 0, country: 'zh', era: '熙寧', eraId: '', y: 3, m: 12, leap: false, d: '', gz: '丁卯', cal: 'jul', edtf: '638~' }; }
    init() {
      this.addEventListener('click', (e) => { const b = e.target.closest('[data-preset]'); if (!b) return; const pr = D14_PRESETS[+b.dataset.preset]; Object.assign(this.s, { p: +b.dataset.preset, country: pr.country, era: pr.era, eraId: '', y: pr.y, m: pr.m, leap: pr.leap, d: pr.d || '', gz: pr.gz || '' }); this.save(); });
    }
    compute() {
      const s = this.s, full = !!this.pack?.calendar;
      const eras = full ? W.Cal.findEras(s.country, s.era) : [];
      const era = full ? (eras.find((e) => String(e[0]) === String(s.eraId)) || eras[0]) : null;
      let mon = null, src = '';
      if (era) { const m = W.Cal.month(era[0], +s.y, +s.m, s.leap === true || s.leap === 'true'); if (m) { mon = { first: m[4], days: m[5], name: m[2], status: m[6] }; src = 'DDBC 時間規範資料庫（材料包，CC BY-SA 3.0）'; } }
      if (!mon) { const pr = D14_PRESETS.find((p) => p.country === s.country && p.era === s.era && p.y === +s.y && p.m === +s.m); if (pr) { mon = { first: pr.fb.first, days: pr.fb.days }; src = '预设内置（取自 DDBC，与 sxtwl 互验）'; } }
      return { full, eras, era, mon, src };
    }
    render() {
      const page = pageById('D14'); const s = this.s; const c = this.compute(); const { mon } = c;
      const JDN = (j) => j; const fmt = (j) => { const jul = W.ymd(W.julFromJdn(j)), gre = W.ymd(W.gregFromJdn(j)); return s.cal === 'jul' ? `${jul}（儒略历）` : `${gre}（格里历）`; };
      let days = [];
      if (mon) {
        if (s.d) days = [mon.first + (+s.d) - 1].filter((j) => +s.d >= 1 && +s.d <= mon.days);
        else if (s.gz) days = Array.from({ length: mon.days }, (_, i) => mon.first + i).filter((j) => W.GZ[W.gzIndex(j)] === s.gz);
      }
      const j = days[0];
      const eraOpts = c.eras.map((e) => `<option value="${e[0]}" ${String(e[0]) === String(c.era?.[0]) ? 'selected' : ''}>${esc(e[1].join('／'))}（${esc(e[3])}·${esc(e[4])}）</option>`).join('');
      const gzOfFirst = mon ? W.GZ[W.gzIndex(mon.first)] : '';
      const changes = this.pack?.calendar && j ? W.Cal.eraAt(s.country, j) : [];
      const ed = edtf(s.edtf);
      rerender(this, flowShell(page, [
        { title: '原文日期', why: '年号、月、日或干支，照原文。', body: `<div class="presets">${D14_PRESETS.map((p, i) => `<button class="small ${s.p === i ? 'on' : ''}" data-preset="${i}">${esc(p.label)}</button>`).join('')}</div>
          ${seg('country', [['zh', '中国'], ['ja', '日本']], s.country)}
          <label class="field">年号 <input data-k="era" value="${esc(s.era)}" list="w7-eras"></label>${c.eras.length > 1 ? `<label class="field">同名年号 <select data-k="eraId">${eraOpts}</select></label>` : ''}
          <datalist id="w7-eras">${c.full ? [...new Set(W.Cal.eras(s.country).flatMap((e) => e[1]))].slice(0, 2000).map((n) => `<option value="${esc(n)}">`).join('') : ''}</datalist>
          <div class="row3"><label class="field">年 <input data-k="y" value="${esc(s.y)}" inputmode="numeric"></label><label class="field">月 <input data-k="m" value="${esc(s.m)}" inputmode="numeric"></label><label class="field"><input type="checkbox" data-k="leap" ${s.leap === true ? 'checked' : ''}> 闰</label></div>
          <div class="row3"><label class="field">日 <input data-k="d" value="${esc(s.d)}" placeholder="或填干支→" inputmode="numeric"></label><label class="field">干支 <input data-k="gz" value="${esc(s.gz)}" placeholder="如 丁卯"></label></div>
          ${c.full ? '' : '<p class="sub">未导入材料包：只能算四个预设。导入后可查任意年号月日（DDBC 中日历表）。</p>'}` },
        { title: '年号与月份（查历表）', why: '月份的起讫要查朔闰表，干支只能在已知月份内定日。', body: mon ? `<dl class="kv"><dt>年号</dt><dd>${esc(c.era ? c.era[1].join('／') + '（' + c.era[3] + '·' + c.era[4] + '）' : s.era)}</dd><dt>该月朔日</dt><dd>JDN ${mon.first}（${gzOfFirst}）＝${W.ymd(W.julFromJdn(mon.first))} 儒略</dd><dt>大小</dt><dd>${mon.days} 天（${mon.days === 30 ? '大' : '小'}）</dd><dt>月份范围</dt><dd>JDN ${mon.first}—${mon.first + mon.days - 1}</dd></dl><p class="sub">来源：${esc(c.src)}${mon.status === 'P' ? '；此月为推算（proleptic）' : ''}</p>` : `<p class="warn">历表中找不到 ${esc(s.era)}${esc(s.y)}年${s.leap ? '闰' : ''}${esc(s.m)}月。</p>` },
        { title: '干支推算', why: '干支纪日六十日一循环，从未间断。', body: `<div class="formula">干支序号 = (儒略日数 − 2433191) mod 60</div><p class="sub">2433191 为 1949-10-01（甲子）；0 甲子，3 丁卯，10 甲戌，16 庚辰。</p>` +
          (mon ? (s.d ? (j ? `<p class="mono">(${mon.first} + ${+s.d - 1} − 2433191) mod 60 = ${W.gzIndex(j)} → ${W.GZ[W.gzIndex(j)]}</p>` : '<p class="warn">日超出本月天数</p>') :
            `<p>本月内的“${esc(s.gz)}”日：${days.length ? days.map((x) => `<span class="mono">JDN ${x} → (${x} − 2433191) mod 60 = ${W.gzIndex(x)}；${s.m}月${x - mon.first + 1}日</span>`).join('<br>') : '无（此月没有这一干支日）'}</p>`) : '') },
        { title: '儒略历与格里历', why: '1582 年以前西方日期通常用儒略历；证据表里注明用的是哪一种。', body: seg('cal', [['jul', '儒略历'], ['greg', '格里历']], s.cal) + (j ? `<p class="big-num">${fmt(j)}</p><p class="sub">另一种：${s.cal === 'jul' ? W.ymd(W.gregFromJdn(j)) + '（格里历）' : W.ymd(W.julFromJdn(j)) + '（儒略历）'}</p>
          ${changes.length > 1 ? `<p class="warn small">这一天同时属于 ${changes.map((x) => x.era[1][0] + x.m[0] + '年' + x.m[2] + '月' + x.day + '日').join('、')}（改元）</p>` : ''}
          <p class="note-box">证据表：原值“${esc(s.era)}${esc(s.y)}年${esc(s.m)}月${esc(s.d || s.gz)}”；规范值“${W.ymd(W.julFromJdn(j))}（儒略历）”；判断类型“推定”，理由写换算依据与历表来源。</p>` : '<p class="sub">尚未定日。</p>') },
        { title: '不确定的写法', why: '“约”“存疑”可以有规范写法（EDTF），不必硬写成确定年份。', body: `<select data-k="edtf">${EDTF_EX.map(([l, v]) => `<option value="${v}" ${s.edtf === v ? 'selected' : ''}>${esc(l)}：${v}</option>`).join('')}</select>
          <label class="field">EDTF <input data-k="edtf" value="${esc(s.edtf)}" class="mono"></label>
          ${ed.ok ? `<p>${esc(ed.text)}${ed.qual ? '，' + esc(ed.qual) : ''}</p><div class="tl"><span style="left:${ed.a == null ? 0 : 10}%;right:${ed.b == null ? 0 : 10}%" class="${ed.qual ? 'fuzzy' : ''}"></span></div>` : '<p class="warn">超出本页支持的九种写法</p>'}
          <p class="sub">EDTF 用公历；中历、和历先换算，换算依据另记（LoC EDTF 规范，讲义扩充五）。</p>` },
      ], { active: j ? 3 : 1, done: j ? 3 : 0 }));
    }
  }
  register('calendar-lab', CalendarLab);

  /* ================= D25 源位置对齐 ================= */
  const D25_SRC = { songshi: '王珪，字禹玉，成都華陽人，後徙舒。……熙寧三年，拜參知政事。', tang: '王珪，字叔玠，諡懿。', dnsr: '八日……今日九州大樹入洛、於武衞（構内本光院）在所令一見、' };
  const D25_PRESETS = [['tang', '叔玠'], ['tang', '叔珠'], ['songshi', '參知政事'], ['songshi', '王禹玉'], ['dnsr', '九州大樹']];
  class AlignLab extends PackLab {
    get key() { return 'w7-d25'; }
    defaults() { return { view: 'live', srcKey: 'tang', src: D25_SRC.tang, ext: '叔珠', tok: 'unicode', th: '0.75', lesser: true, runIdx: 0 }; }
    init() { this.addEventListener('click', (e) => { const b = e.target.closest('[data-preset]'); if (!b) return; const [k, x] = D25_PRESETS[+b.dataset.preset]; Object.assign(this.s, { srcKey: k, src: this.srcText(k), ext: x }); this.save(); }); }
    srcText(k) { const P = this.pack; if (P && k === 'songshi') return P.texts.songshi_wanggui_excerpt.text; if (P && k === 'dnsr') return P.texts.dnsr_p1_excerpt.text; return D25_SRC[k]; }
    render() {
      const page = pageById('D25'); const s = this.s;
      if (s.view === 'run') return this.renderRun(page);
      const r = W.align(s.src, s.ext, { tokenizer: s.tok, threshold: +s.th, lesser: s.lesser === true || s.lesser === 'true' });
      const toks = (arr, hit) => arr.map((t) => `<span class="tok ${hit && t.s >= hit[0] && t.e <= hit[1] ? 'hit' : ''}">${esc(t.t)}</span>`).join('');
      const hit = r.start != null ? [r.start, r.end] : null;
      const hlSrc = hit ? esc(s.src.slice(0, hit[0])) + `<mark>${esc(s.src.slice(hit[0], hit[1]))}</mark>` + esc(s.src.slice(hit[1])) : esc(s.src);
      const badge = { match_exact: '精确对上 MATCH_EXACT', match_lesser: '部分对上 MATCH_LESSER', match_fuzzy: '模糊对上 MATCH_FUZZY' }[r.status] || '无位置';
      const srcRow = { match_exact: '事后精确对齐', match_lesser: '事后精确对齐（部分）', match_fuzzy: '事后模糊对齐' }[r.status] || '—';
      const cmp = hit ? (() => { const a = [...s.ext], b = [...s.src.slice(hit[0], hit[1])]; const n = Math.max(a.length, b.length); return `<table class="cmp"><tr><th>抽取值</th>${Array.from({ length: n }, (_, i) => `<td class="${a[i] === b[i] ? '' : 'bad'}">${esc(a[i] || '·')}</td>`).join('')}</tr><tr><th>高亮原文</th>${Array.from({ length: n }, (_, i) => `<td class="${a[i] === b[i] ? '' : 'bad'}">${esc(b[i] || '·')}</td>`).join('')}</tr></table>`; })() : '';
      rerender(this, `<div class="tabs">${seg('view', [['live', '对齐规则（实时）'], ['run', 'LangExtract 实跑记录']], s.view)}</div>` + flowShell(page, [
        { title: '抽取的文字', why: '模型先输出文字，位置是程序事后到原文里找的。', body: `<div class="presets">${D25_PRESETS.map(([k, x], i) => `<button class="small" data-preset="${i}">${esc(x)}</button>`).join('')}</div><label class="field">抽取值 <input data-k="ext" value="${esc(s.ext)}"></label><label class="field">原文 <textarea data-k="src" rows="4">${esc(s.src)}</textarea></label>` },
        { title: '分词', why: '默认把一串连续汉字当成一个词元。', body: seg('tok', [['regex', '默认 [^\\W\\d_]+'], ['unicode', '按字（UnicodeTokenizer）']], s.tok) + `<p class="sub">原文 ${r.srcTokens.length} 个词元：</p><div class="toks">${toks(r.srcTokens, hit)}</div><p class="sub">抽取值 ${r.extTokens.length} 个词元：</p><div class="toks">${toks(r.extTokens)}</div>` },
        { title: '精确与模糊匹配', why: '先找完整词元串，再找部分，最后才模糊。', body: `<fieldset><legend>部分精确（MATCH_LESSER）</legend><label><input type="checkbox" data-k="lesser" ${s.lesser === true ? 'checked' : ''}> 接受部分精确（默认开）</label></fieldset>
          <fieldset><legend>模糊匹配的选项</legend><label class="field">覆盖阈值 <input type="range" min="0.25" max="1" step="0.05" data-k="th" value="${esc(s.th)}"> ${f2(+s.th)}（默认 0.75）</label><p class="sub">另有密度门槛：命中数／窗口长 ≥ 1/3。</p></fieldset><p>${esc(r.detail)}</p>` },
        { title: '对齐状态与位置', why: '高亮只说明这里有相近的文字，还要逐字比对。', body: `<p class="badge ${r.status || 'none'}">${esc(badge)}</p><p class="srcbox">${hlSrc}</p>${cmp}
          <table class="locsrc">${[['人工标出', '研究者自己记卷页'], ['模型报告', '模型在输出中写出位置'], ['事后精确对齐', '程序找到完全相同的字符串'], ['事后模糊对齐', '程序找到“大部分相同”的一段']].map(([a, b]) => `<tr class="${srcRow.startsWith(a) ? 'on' : ''}"><td>${a}</td><td class="sub">${b}</td></tr>`).join('')}</table>
          <p class="sub">规则按 LangExtract 提交 3a68580 的 resolver.py 实现；36 个用例与其对齐器逐一相同（验收记录）。</p>` },
      ], { active: 3 }));
    }
    renderRun(page) {
      const P = this.pack;
      if (!W.Pack.has('runs.d25_langextract', 'texts.dnsr_p1_excerpt')) { rerender(this, `<div class="tabs">${seg('view', [['live', '对齐规则（实时）'], ['run', 'LangExtract 实跑记录']], 'run')}</div>` + W.packGate('LangExtract 实跑记录（runs.d25_langextract）')); return; }
      const R = P?.runs?.d25_langextract;
      if (!R) { rerender(this, `<div class="tabs">${seg('view', [['live', '对齐规则（实时）'], ['run', 'LangExtract 实跑记录']], 'run')}</div><p class="warn">材料包中没有 LangExtract 运行记录。</p>`); return; }
      const i = Math.min(+this.s.runIdx || 0, R.runs.length - 1), run = R.runs[i];
      const text = run.input === 'songshi_wanggui' ? P.texts.songshi_wanggui_excerpt.text : P.texts.dnsr_p1_excerpt.text;
      const ST = ['match_exact', 'match_lesser', 'match_fuzzy', '无位置'];
      const sel = +this.s.ex || 0, ex = run.extractions[sel];
      const hl = ex && ex.start != null ? esc(text.slice(0, ex.start)) + `<mark>${esc(text.slice(ex.start, ex.end))}</mark>` + esc(text.slice(ex.end)) : esc(text);
      const keep = this.querySelector('.runlist')?.scrollTop || 0;
      rerender(this, `<div class="tabs">${seg('view', [['live', '对齐规则（实时）'], ['run', 'LangExtract 实跑记录']], 'run')}</div>
        <div class="runpage"><div class="runlist"><p class="sub">LangExtract ${esc(R.langextract_commit)} · Qwen3-4B-Instruct-2507 Q4_K_M（JSON 模式，温度 0）· 2026-10-28 本地实际运行</p>
          <table class="dist"><tr><th>输入</th><th>分词</th><th>原文词元</th>${ST.map((x) => `<th>${x.replace('match_', '')}</th>`).join('')}</tr>
          ${R.runs.map((x, k) => `<tr class="${k === i ? 'on' : ''}" data-set="runIdx:${k}"><td>${x.input === 'songshi_wanggui' ? '王珪传' : '大日本史料'}</td><td>${esc(x.tokenizer)}</td><td>${x.n_tokens_input}</td>${ST.map((s) => `<td>${x.status_distribution[s] || 0}</td>`).join('')}</tr>`).join('')}</table>
          <p class="sub">点表格一行切换；点下面一条看它在原文中的位置。</p>
          <ol class="exlist">${run.extractions.map((e, k) => `<li class="${k === sel ? 'on' : ''} st-${e.status || 'none'}" data-set="ex:${k}"><b>${esc(e.class)}</b> ${esc(e.text)} <span class="sub">${esc(e.status || '无位置')}${e.source_span && e.source_span !== e.text ? ' → 原文“' + esc(e.source_span) + '”' : ''}</span></li>`).join('')}</ol></div>
          <div class="runsrc"><p class="srcbox">${hl}</p></div></div>`);
      const rl = this.querySelector('.runlist'); if (rl) rl.scrollTop = keep;
      this.querySelector('.runsrc mark')?.scrollIntoView({ block: 'center' });
    }
  }
  register('align-lab', AlignLab);

  /* ================= D27 五类计数与 F1 ================= */
  const D27_ITEMS = [
    ...['王珪', '永', '太宗', '帝（指太宗）', '蔡確', '司馬光'].map((t) => [t, 'correct']),
    ...['從兄琪', '王倫犯淮南', '神宗謂執政曰', '珪、確相顧失色', '珪憂甚', '珪命取授之', '吏民皆少珪', '字禹玉'].map((t) => [t, 'partial']),
    ...['對曰', '奇警', '騏驥方生', '千里之志', '蘭筋未就', '大校', '嫚不謹', '賊遁去', '舊皆盛服入', '便服', '衣冠在後乘', '使者愧謝', '賦詩有所感'].map((t) => [t, 'spurious']),
  ];
  const D27_MISSED = ['俞充', '皇太后', '延安郡王（哲宗）'];
  const CAT = { correct: '正确', partial: '部分（边界不对）', spurious: '多出（不是人物）', wrong: '错误（类型或所指错）' };
  class ScoreLab extends PackLab {
    get key() { return 'w7-d27'; }
    defaults() { return { cats: D27_ITEMS.map((x) => x[1]), mode: 'strict' }; }
    init() { this.addEventListener('change', (e) => { if (e.target.dataset.i != null) { this.s.cats[+e.target.dataset.i] = e.target.value; this.save(); } }); }
    render() {
      const page = pageById('D27'); const s = this.s;
      const B = W.Pack.get()?.teach?.extract?.songshi_wanggui_excerpt__B?.recovered?.mentions;
      const fromPack = B ? B.filter((m) => m.entity_type === '人物').map((m) => m.surface) : null;
      const n = (c) => s.cats.filter((x) => x === c).length;
      const C = n('correct'), Pa = n('partial'), Sp = n('spurious'), Wr = n('wrong'), Mi = D27_MISSED.length, out = s.cats.length;
      const tp = s.mode === 'strict' ? C : C + Pa;
      const gold = C + Pa + Wr + Mi; // 本页口径：金标准提及数＝系统对上（正确、部分、错误）的提及＋遗漏
      const P = tp / out, R = tp / gold, F = P + R ? 2 * P * R / (P + R) : 0;
      const isDefault = s.cats.every((c, i) => c === D27_ITEMS[i][1]);
      rerender(this, flowShell(page, [
        { title: '金标准', why: '人工校订的结果；它本身也是判断（讲义初判，教师已确认）。', body: `<p>B 型输出覆盖的部分（截断以前）提到的人物：王珪、曾祖永、太宗、从兄琪、王倫、神宗、蔡確、司馬光等。</p><p class="sub">遗漏（因截断）：${D27_MISSED.join('、')}</p>` },
        { title: '系统输出', why: '点下拉改判，右侧实时重算。', body: `<table class="items">${D27_ITEMS.map(([t], i) => `<tr class="c-${s.cats[i]}"><td>${esc(t)}</td><td><select data-i="${i}">${Object.entries(CAT).map(([k, l]) => `<option value="${k}" ${s.cats[i] === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('')}</table>` },
        { title: '五类对齐', why: '同一位置类型或内容错算“错误”，边界部分重叠算“部分”。', body: `<table class="bars">${[['正确', C], ['部分', Pa], ['错误', Wr], ['多出', Sp], ['遗漏', Mi]].map(([l, v]) => `<tr><td>${l}</td><td><span class="bar" style="width:${v * 9}px"></span> ${v}</td></tr>`).join('')}</table><p class="sub">系统共输出 ${out} 条${isDefault ? '（讲义初判：6／8／13，遗漏 3）' : '（已改判）'}。${fromPack ? `材料包中 B 型原始回复（容错读出）的“人物”类 ${fromPack.length} 条${fromPack.length === 27 ? '，与本页 27 条一致' : '，与本页不一致，请核对'}。` : '导入材料包后与 B 型原始回复核对。'}</p>` },
        { title: 'P、R 与 F1', why: '报告分数要说明口径。', body: seg('mode', [['strict', '严格：边界与类型都要对'], ['lenient', '宽松：有重叠即可']], s.mode) +
          `<div class="formula">P = ${tp} / ${out} = ${f2(P)}</div><div class="formula">R = ${tp} / ${gold} = ${f2(R)}</div><div class="formula">F₁ = 2·P·R / (P + R) = 2×${f2(P)}×${f2(R)} / (${f2(P)}+${f2(R)}) = ${f2(F)}</div>
          <p class="sub">R 的分母为本页推算：金标准提及数 ＝ 正确＋部分＋错误＋遗漏（讲义未给 R）。讲义的数字：严格 P≈0.22，宽松 P≈0.52。</p>` },
      ], { active: 3 }));
    }
  }
  register('score-lab', ScoreLab);

  /* ================= D30 贯穿 ================= */
  const STAGES = [
    { k: 'entry', name: '立目与字段', page: 'D05', hint: '选原文句子，拆成断言；写研究问题与字段。' },
    { k: 'name', name: '辨名', page: 'D08', hint: '照录原值，标出称呼类型。' },
    { k: 'link', name: '链接', page: 'D12', hint: '看候选，选规范库编号或“库中无对应”，写理由。' },
    { k: 'date', name: '系年与在场', page: 'D14', hint: '年号换算；判断在场；标冲突真伪。' },
    { k: 'extract', name: '抽取与对齐', page: 'D25', hint: '对照模型抽取，记下位置来源。' },
    { k: 'check', name: '勘误', page: 'D28', hint: '按九类标错，导出。' },
  ];
  const CONDS = [['拆得开', ['entry']], ['认得准', ['name', 'link']], ['对得上', ['date']], ['查得回', ['extract', 'check']]];
  const DNSR_SENT = ['八日、甲戌、前將軍足利義尹、和泉堺ヲ發シ、是日、京都ニ入ル、大内義興等、之ニ從フ、', '前參議從四位下源（足利）義尹、四十三、六月八日入洛、', '今日九州大樹入洛、於武衞（構内本光院）在所令一見、', '次及晩大内左京大夫（義興）上洛云々', '今日畠山尾州（尚順）上洛云々、一万人計云々'];
  const DNSR_LINK = [['足利義尹／源義尹／九州大樹', 'NDL 典拠 001247822（足利, 義稙, 1466-1523）', '001247822'], ['大内左京大夫', '大内義興（NDL 典拠编号待查）', ''], ['畠山尾州', '畠山尚順（NDL 典拠编号待查）', ''], ['細川民部少輔', '細川高國（NDL 典拠编号待查）', '']];
  const ERRTYPES = ['遗漏', '多出（编造）', '边界错', '类型错', '写法错', '链接错', '合并或拆分', '时地冲突', '无据'];
  class ThroughWorkbench extends PackLab {
    get key() { return 'w7-d30'; }
    defaults() { return { mat: 'dnsr', stage: 'entry', tab: 'work', q: '表中的一行，凭什么可以代替史料中的那句话？', done: {}, err: {} }; }
    init() { this.addEventListener('click', (e) => {
      const b = e.target.closest('[data-th]'); if (!b) return; const [a, v] = b.dataset.th.split('|');
      const rows = W.Evidence.rows(this.s.mat);
      if (a === 'addsent') { rows.push({ text: v, loc: this.s.mat === 'dnsr' ? '『大日本史料』9-1，本文第 1 页（PDF 页序 29）' : this.s.mat === 'songshi' ? '《宋史》卷三一二《王珪传》' : (store.get('w7-mine', {}).loc || '我的材料'), orig: '', norm: '', kind: '未见', reason: '', locsrc: '人工标出', who: '' }); W.Evidence.save(this.s.mat, rows); this.mark('entry'); this.flash = `已加入证据表第 ${rows.length} 行：“${v.slice(0, 18)}${v.length > 18 ? '…' : ''}”。到“证据表 ↓”或下一阶段继续填写。`; clearTimeout(this._fl); this._fl = setTimeout(() => { this.flash = ''; if (!this.contains(document.activeElement)) this.render(); }, 6000); }
      if (a === 'mineseg') { const sg = (window.W7Live?.segments() || []).find((x) => x.id === v); if (sg) store.set('w7-mine', { text: sg.text, segId: sg.id, loc: sg.loc }); }
      if (a === 'minepaste') { const t = this.querySelector('[data-mine-paste]')?.value || ''; if (t.trim()) store.set('w7-mine', { text: t.trim(), loc: this.querySelector('[data-mine-loc]')?.value || '粘贴文字（出处待补）' }); }
      if (a === 'mineclear') store.del('w7-mine');
      if (a === 'importer') window.W7Live?.openImporter();
      if (a === 'link') { const [i, val] = v.split('~'); rows[+i].norm = val; W.Evidence.save(this.s.mat, rows); this.mark('link'); }
      if (a === 'err') { const [i, t] = v.split('~'); const key = this.s.mat + i; this.s.err[key] = this.s.err[key] === t ? '' : t; this.mark('check'); }
      if (a === 'export') { const rows2 = rows.map((r, i) => ({ ...r, error: this.s.err[this.s.mat + i] || '' })); download(`贯穿证据表_${this.s.mat}.json`, JSON.stringify({ question: this.s.q, material: this.s.mat, rows: rows2 }, null, 1), 'application/json'); }
      if (a === 'tei') download(`贯穿证据表_${this.s.mat}_TEI片段.xml`, W.Evidence.tei(rows), 'application/xml');
      if (a === 'csv') download(`贯穿证据表_${this.s.mat}.csv`, W.Evidence.csv(rows), 'text/csv');
      this.save();
    }); }
    mark(k) { this.s.done[this.s.mat + ':' + k] = true; }
    connectedCallback() { super.connectedCallback(); if (!this._mineL) { this._mineL = () => { if (this.s.mat === 'mine' && !this.contains(document.activeElement)) this.render(); }; document.addEventListener('w7-materials', this._mineL); document.addEventListener('w7-live-ready', this._mineL); } }
    minePicker() {
      const segs = window.W7Live?.segments() || []; const cur = store.get('w7-mine', null);
      return `<p>“我的材料”：选一段导入的正文，或直接粘贴。${cur?.text ? `当前：<b>${esc(cur.loc)}</b>（${cur.text.length} 字） <button class="small" data-th="mineclear|">换一段</button>` : ''}</p>
        ${cur?.text ? '' : `<p><button class="small" data-th="importer|">打开材料导入页</button> <span class="sub">${window.W7Live ? `已导入 ${segs.length} 个正文片段` : '材料导入需经本机服务打开课件'}</span></p>
        ${segs.length ? `<ul class="sents">${segs.slice(0, 40).map((g) => `<li><button class="small" data-th="mineseg|${esc(g.id)}">选用</button> ${esc(g.source?.title || '')}${g.pdfPage ? ' · PDF ' + g.pdfPage : ''}：${esc(g.text.slice(0, 40))}…（${g.text.length} 字）</li>`).join('')}</ul>` : ''}
        <label class="field">或粘贴原文<textarea data-mine-paste rows="4"></textarea></label><label class="field">出处、版本与位置<input data-mine-loc placeholder="书名、卷、页；说明页码体系"></label><button class="small" data-th="minepaste|">使用这段文字</button>`}`;
    }
    render() {
      const s = this.s, P = this.pack;
      if ((s.mat === 'dnsr' && !W.Pack.has('images.dnsr_p1')) || (s.mat === 'songshi' && !W.Pack.has('texts.songshi_wanggui_excerpt'))) { rerender(this, `<div class="through"><div class="through-main">${W.packGate('『大日本史料』第 1 页页影与转录、NDL 典拠、模型抽取记录（默认材料）；《宋史·王珪传》与 CBDB 记录（另一份材料）')}</div><aside class="through-rail disabled">${this.rail()}</aside></div>`); return; }
      const rows = W.Evidence.rows(s.mat);
      const stage = STAGES.find((x) => x.k === s.stage);
      let work = '';
      const mine = store.get('w7-mine', null);
      const sents = s.mat === 'dnsr' ? DNSR_SENT : s.mat === 'songshi' ? W.Pack.get().texts.songshi_wanggui_excerpt.text.split(/(?<=。)/).slice(0, 12) : (mine?.text || '').split(/(?<=[。！？!?；\n])/).map((x) => x.trim()).filter(Boolean).slice(0, 60);
      const rowOf = (t) => rows.findIndex((r) => r.text === t);
      if (s.stage === 'entry') work = (s.mat === 'mine' ? this.minePicker() : '') + (sents.length ? `<p>点一句加入证据表（“原文片段”照录）。已加入 ${sents.filter((t) => rowOf(t) >= 0).length}／${sents.length} 句；证据表共 ${rows.length} 行。</p>${this.flash ? `<p class="ok-line" role="status">${esc(this.flash)}</p>` : ''}<ul class="sents">${sents.map((t) => { const k = rowOf(t); return `<li class="${k >= 0 ? 'added' : ''}">${k >= 0 ? `<button class="small on" disabled title="已在证据表第 ${k + 1} 行">✓ 第 ${k + 1} 行</button>` : `<button class="small" data-th="addsent|${esc(t)}" title="加入证据表">＋ 加入</button>`} ${esc(t)}</li>`; }).join('')}</ul>` : '');
      if (s.stage === 'name') work = `<p>在证据表中填“原值”（照录称呼）；称呼类型写进理由。</p><evidence-table material="${s.mat}" compact></evidence-table>`;
      if (s.stage === 'link' && s.mat === 'mine') work = `<p>到 ${pageLink('D12', 'D12')} 看候选与对账；在证据表“规范值”中写规范库编号，库中没有就写 NIL，并在“理由”中写依据。</p><table class="steps">${rows.map((r, i) => `<tr><td>${i + 1}. ${esc(r.orig || r.text.slice(0, 16))}</td><td><button class="small" data-th="link|${i}~NIL（库中无对应）">NIL</button> <span class="sub">${esc(r.norm || '')}</span></td></tr>`).join('')}</table><evidence-table material="mine" compact></evidence-table>`;
      else if (s.stage === 'link') work = s.mat === 'dnsr'
        ? `<p>候选（据 NDL 典拠；未查到编号的如实写“待查”或 NIL）：</p><table class="steps">${rows.map((r, i) => `<tr><td>${i + 1}. ${esc(r.orig || r.text.slice(0, 16))}</td><td>${DNSR_LINK.map(([a, b]) => `<button class="small" data-th="link|${i}~${esc(b)}">${esc(b)}</button>`).join(' ')} <button class="small" data-th="link|${i}~NIL（库中无对应）">NIL</button></td></tr>`).join('')}</table>`
        : `<p>为王珪选 CBDB 编号：到 ${pageLink('D09', 'D09')} 比对字段，再回来填写。</p><table class="steps">${rows.map((r, i) => `<tr><td>${i + 1}. ${esc(r.orig || r.text.slice(0, 16))}</td><td>${['CBDB 1845', 'CBDB 33013', 'CBDB 1846', 'CBDB 570937'].map((b) => `<button class="small" data-th="link|${i}~${b}">${b}</button>`).join(' ')} <button class="small" data-th="link|${i}~NIL（库中无对应）">NIL</button></td></tr>`).join('')}</table>`;
      if (s.stage === 'date') work = `<calendar-mini></calendar-mini><p>在证据表中写入换算结果，并在理由里注明历表来源；“对不上”的地方标真伪。到 ${pageLink('D14', 'D14')} 做完整换算。</p>`;
      if (s.stage === 'extract') {
        const R = P?.runs?.d25_langextract; const run = s.mat === 'mine' ? null : R?.runs.find((x) => x.input === (s.mat === 'dnsr' ? 'dnsr_9-1_p1' : 'songshi_wanggui') && x.tokenizer.startsWith('Unicode'));
        const live = `<h4>现场抽取</h4><p class="sub">接入模型后对这份材料重新抽取；“写入证据表”把结果追加到本材料的证据表，位置来源按事后对齐写，判断类型照模型输出，处理人注明“模型输出，未核”。</p><live-extract key="d30-${s.mat}" input="${s.mat === 'dnsr' ? 'dnsr_ref' : s.mat === 'songshi' ? 'songshi' : 'mine'}" ev-mat="${s.mat}"><p class="warn">现场抽取需要经本机服务打开课件（双击“启动第七周演示.command”）。</p></live-extract>`;
        work = (run ? `<details ${s.mat === 'mine' ? '' : 'open'}><summary>课前实跑回放：LangExtract（按字分词）抽出的 ${run.extractions.length} 项</summary><p>与证据表的原值对照，写“位置来源”。</p><ol class="exlist">${run.extractions.map((e) => `<li class="st-${e.status || 'none'} ${rows.some((r) => r.orig && r.orig === e.text) ? 'on' : ''}"><b>${esc(e.class)}</b> ${esc(e.text)} <span class="sub">${esc(e.status || '无位置')}${e.attributes?.refers_to ? '；所指：' + esc(e.attributes.refers_to) : ''}</span></li>`).join('')}</ol></details>` : s.mat === 'mine' ? '' : '<p class="warn">材料包中没有这份材料的抽取记录。</p>') + live;
      }
      if (s.stage === 'check') work = `<p>逐行标错（九类，可再点取消）：</p><table class="steps">${rows.map((r, i) => `<tr><td>${i + 1}. ${esc(r.orig || r.text.slice(0, 16))}</td><td>${ERRTYPES.map((t) => `<button class="small ${s.err[s.mat + i] === t ? 'on' : ''}" data-th="err|${i}~${t}">${t}</button>`).join(' ')}</td></tr>`).join('')}</table>`;
      const img = s.mat === 'dnsr' ? P.images.dnsr_p1 : null;
      const refT = P?.teach?.reference?.['dnsr_9-1_p1_reference'];
      const orig = s.mat === 'mine' ? (mine?.text ? `<p class="sub">${esc(mine.loc)}</p><pre class="srcbox">${esc(mine.text)}</pre>` : this.minePicker()) : s.mat === 'dnsr' ? `<div class="split"><div class="page-img"><img src="${img.dataUrl}" alt="${esc(img.note)}"><p class="sub">${esc(img.note)}</p></div>${refT ? `<div><p class="sub">人工参照转录（300 dpi 页影目验，保留编者括注；未决问题 U-05）</p><pre class="srcbox small-src">${esc(refT)}</pre></div>` : ''}</div>` : `<pre class="srcbox">${esc(P.texts.songshi_wanggui_excerpt.text)}</pre>`;
      rerender(this, `<div class="through"><div class="through-main">
        <div class="tabs">${seg('tab', [['work', '工作区：' + stage.name], ['orig', '原文：' + ({ dnsr: '大日本史料第 1 页', songshi: '宋史王珪传', mine: '我的材料' }[s.mat])], ['table', '证据表 ↓']], s.tab)}</div>
        <div class="through-pane">${s.tab === 'work' ? work : s.tab === 'orig' ? orig : `<evidence-table material="${s.mat}" compact></evidence-table>`}</div>
        <p class="sub">材料：${s.mat === 'dnsr' ? '『大日本史料』9-1 本文第 1 页（NDL 3450611，PDF 页序 29 左半；默认，教师 10-28 决定）' : s.mat === 'songshi' ? '《宋史》卷三一二《王珪传》选段（维基文库）' : '我的材料：' + esc(mine?.loc || '尚未选定')}；数据随材料包或材料导入进入本机浏览器，记录存当前浏览器。</p></div>
        <aside class="through-rail">${this.rail()}</aside></div>`);
    }
    rail() {
      const s = this.s; const done = (k) => !!s.done[s.mat + ':' + k];
      return `<p class="eyebrow">第七周贯穿：把一句史料变成可以复核的一行</p>
        <label class="field">问题起点<textarea data-k="q" rows="2">${esc(s.q)}</textarea></label>
        ${seg('mat', [['dnsr', '大日本史料（默认）'], ['songshi', '宋史王珪传'], ['mine', '我的材料']], s.mat)}
        <div class="stage-grid">${STAGES.map((x, i) => `<button data-set="stage:${x.k}" class="${s.stage === x.k ? 'on' : ''} ${done(x.k) ? 'done' : ''}">${i + 1} ${esc(x.name)}</button>`).join('')}</div>
        <p class="note-box">${esc(STAGES.find((x) => x.k === s.stage).hint)} 讲解页：${pageLink(STAGES.find((x) => x.k === s.stage).page)}</p>
        <ul class="conds">${CONDS.map(([c, ks]) => `<li class="${ks.every(done) ? 'on' : ''}">${c}</li>`).join('')}</ul>
        <div class="through-actions"><button data-th="export">导出本轮记录</button><button data-th="csv">导出证据表 CSV</button><button data-th="tei">导出 TEI 片段</button></div>`;
    }
  }
  register('through-workbench', ThroughWorkbench);

  /* 贯穿页里的小号历法工具：复用 D14 的计算，只给预设。 */
  class CalendarMini extends HTMLElement {
    connectedCallback() {
      const rows = D14_PRESETS.map((p) => { const j = p.fb.first + ((p.d || 0) ? p.d - 1 : (W.GZ.slice().indexOf(p.gz) >= 0 ? Array.from({ length: p.fb.days }, (_, i) => i).find((i) => W.GZ[W.gzIndex(p.fb.first + i)] === p.gz) : 0)); return `<tr><td>${esc(p.label)}</td><td class="mono">${W.ymd(W.julFromJdn(j))}（儒略）</td><td class="mono">${W.ymd(W.gregFromJdn(j))}（格里）</td></tr>`; });
      this.innerHTML = `<table class="steps"><tr><th>原文</th><th>儒略历</th><th>格里历</th></tr>${rows.join('')}</table>`;
    }
  }
  register('calendar-mini', CalendarMini);

  /* ================= D00 封面 ================= */
  class HeroCover7 extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<div class="hero-lab"><p class="hero-title">表中的一行，凭什么可以代替史料中的那句话？</p>
        <div class="hero-path">${[['拆得开', '第一节 立目', 'D02'], ['认得准', '第二节 辨名', 'D07'], ['对得上', '第三节 系年', 'D14'], ['查得回', '第四、五节 抽取与勘误', 'D19']].map(([a, b, p]) => `<a href="#${p}"><b>${a}</b><small>${b}</small></a>`).join('')}</div>
        <p class="hero-lead">今日<u>畠山尾州</u>上洛云々 → 原值“畠山尾州”｜规范值“畠山尚順”｜判断类型“推定”</p></div>`;
    }
  }
  register('hero-cover7', HeroCover7);
  window.W7L = { PackLab, seg, f2, cbdbPerson, arr, personCard, D14_PRESETS, edtf, ERRTYPES, postSummary };
})();
