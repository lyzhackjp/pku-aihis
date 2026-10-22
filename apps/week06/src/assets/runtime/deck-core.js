/* 课程演示的通用外壳：无构建步骤的 Web Components。
 * 标签与属性沿用课程 Stencil 外壳（deck-container / deck-slide / deck-presenter）；
 * 每周的实验组件写在 weekXX-labs.js，通过 window.Deck 取用本文件的工具函数并登记组件。
 * 数据来自 data/data.js（assemble-prototype.mjs 依 page-map.json 生成），其中 deck 段给出
 * 课程名、广播频道、存储前缀与右上角入口（贯穿页、概念页）。 */
(() => {
  'use strict';
  const DATA = window.DECK_DATA || { pages: [], glossary: { categories: [], previous: [] }, deck: {} };
  const DECK = Object.assign({ name: '课程演示', channel: 'pku-aihis-prototype', store: 'prototype/', entries: {} }, DATA.deck);
  const CHANNEL = DECK.channel;
  const STORE = DECK.store;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(STORE + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch { /* 浏览器不允许存储时只保留内存状态 */ } },
    del(k) { try { localStorage.removeItem(STORE + k); } catch { /* ignore */ } },
  };
  const pageById = (id) => DATA.pages.find((p) => p.id === id || p.aliases?.includes(id));
  const pageLink = (id, label) => {
    const p = pageById(id);
    const candidate=document.querySelector(`deck-slide[slide-id="${p?.id||id}"]`);const built=candidate&&['implemented','prototype'].includes(candidate.dataset.status);
    return `<a href="#${id}" class="${built ? '' : 'planned-link'}" title="${esc(p ? p.title : id)}">${esc(label || id)}${built ? '' : '（规划页）'}</a>`;
  };
  const download = (name, text, type = 'text/markdown') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ================= 四栏流程外壳（第三周 flowShell 的原生版本） ================= */
  function flowShell(page, columns, rail = {}) {
    const steps = page?.steps || columns.map((c) => c.title);
    const railHtml = steps.map((s, i) => {
      const cls = rail.active === i ? 'active' : (rail.done !== undefined && i < rail.done ? 'done' : '');
      return `<span class="${cls}">${String(i + 1).padStart(2, '0')} · ${esc(s)}</span>${i < steps.length - 1 ? '<b aria-hidden="true">→</b>' : ''}`;
    }).join('');
    return `<div class="flow-shell">
      <div class="flow-head"><p class="flow-question">${esc(page?.question || '')}</p><div class="flow-rail" aria-label="教学步骤">${railHtml}</div></div>
      <div class="flow-grid">${columns.map((c, i) => `<section class="flow-col"><header><b>${String(i + 1).padStart(2, '0')}</b>${esc(c.title)}</header>${c.why ? `<p class="flow-why">${esc(c.why)}</p>` : ''}${c.body}</section>`).join('')}</div>
      ${page?.student_operation ? `<p class="flow-try">动手观察：${esc(page.student_operation)}</p>` : ''}
    </div>`;
  }

  /* 保留输入焦点的局部重绘：重绘前记下焦点控件，重绘后恢复。 */
  function rerender(el, html) {
    const a = document.activeElement;
    const key = a && el.contains(a) ? a.getAttribute('data-k') : null;
    const pos = key && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
    el.innerHTML = html;
    if (key) { const n = el.querySelector(`[data-k="${key}"]`); if (n) { n.focus(); if (pos && n.setSelectionRange) try { n.setSelectionRange(pos[0], pos[1]); } catch { /* ignore */ } } }
  }

  /* ================= deck-slide ================= */
  class DeckSlide extends HTMLElement {
    connectedCallback() {
      if (this._built) return; this._built = true;
      const body = [...this.childNodes];
      const footer = this.querySelector('[slot="footer"]');
      const theme = this.getAttribute('theme') || 'light';
      const mode = this.getAttribute('mode');
      const layout = this.getAttribute('layout') || 'normal';
      this.innerHTML = `<section class="slide-page theme-${esc(theme)} layout-${esc(layout)}" data-slide-id="${esc(this.getAttribute('slide-id'))}">
        <header class="slide-header">
          <div class="slide-kicker">${esc(this.getAttribute('kicker') || '')}</div>
          <h1 class="slide-title">${esc(this.getAttribute('header-title') || '')}</h1>
          ${this.getAttribute('transition') ? `<p class="slide-transition">${esc(this.getAttribute('transition'))}</p>` : ''}
          ${mode ? `<span class="slide-mode" title="运行模式">${esc(mode)}</span>` : ''}
        </header>
        <div class="slide-body"></div>
        <div class="slide-footer"></div>
      </section>`;
      const bodyEl = this.querySelector('.slide-body');
      body.filter((n) => n !== footer).forEach((n) => bodyEl.append(n));
      if (footer) this.querySelector('.slide-footer').append(footer);
    }
  }

  /* ================= deck-container ================= */
  class DeckContainer extends HTMLElement {
    connectedCallback() {
      if (this._built) return; this._built = true;
      this.slides = [...this.querySelectorAll('deck-slide')];
      this.ids = this.slides.map((s) => s.getAttribute('slide-id'));
      this.returnTo = {};
      const main = document.createElement('main');
      this.slides.forEach((s) => main.append(s));
      this.innerHTML = '';
      const shell = document.createElement('div'); shell.className = 'deck-shell';
      shell.innerHTML = `<div class="deck-top">
          <span class="brand">PKU / AI × HISTORY</span>
          <span class="deck-name">${esc(DECK.name)}</span>
          <button data-act="map">课程地图</button>
          ${Object.entries(DECK.entries).map(([k, e]) => `<button class="entry" data-act="entry" data-entry="${esc(k)}" title="随时进入；再次点击返回原页">${esc(e.label)}</button>`).join('')}
          <button data-act="importer">材料导入</button><button data-act="model">模型接入</button><button data-act="live">识读工作台</button><a href="preflight.html" target="_blank" rel="noopener">课前检查</a><a href="preflight.html#formal" target="_blank" rel="noopener">课前试跑</a><button data-act="presenter">备注 ↗</button>
        </div>`;
      shell.append(main);
      const nav = document.createElement('nav'); nav.className = 'deck-nav';
      nav.innerHTML = `<button data-act="prev" aria-label="上一页">← 上一页</button><span class="nav-pos"></span><button data-act="next" aria-label="下一页">下一页 →</button>`;
      shell.append(nav);
      this.append(shell);
      this.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.getAttribute('data-act');
        if (!act) return;
        if (act === 'prev') this.go(this.cur - 1);
        if (act === 'next') this.go(this.cur + 1);
        if (act === 'map') this.toggleMap();
        if (act === 'presenter') this.presenter();
        if(act==='live')this.go('D11');
        if(act==='importer')window.W6ServicesReady?.then(x=>x.openImporter());
        if(act==='model')window.dispatchEvent(new CustomEvent('open-model-settings'));
        if (act === 'entry') { const k = e.target.closest('[data-entry]').dataset.entry; this.toggleEntry(k, DECK.entries[k].page); }
        if (act === 'go') { this.go(e.target.closest('[data-id]').getAttribute('data-id')); this.toggleMap(false); }
      });
      window.addEventListener('keydown', (e) => this.key(e));
      window.addEventListener('hashchange', () => this.go(location.hash.slice(1), true));
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => { if (e.data.type === 'REQUEST') this.sync(); if (e.data.type === 'NAV') this.go(e.data.id); };
      this.go(location.hash.slice(1) || this.ids[0], true);
    }
    toggleEntry(kind, target) {
      const here = this.ids[this.cur];
      if (here === target) { this.go(this.returnTo[kind] || this.ids[0]); return; }
      this.returnTo[kind] = here; this.go(target);
    }
    go(id, fromHash) {
      let i = typeof id === 'number' ? id : this.ids.indexOf(pageById(id)?.id||id);
      if (i < 0) i = 0;
      if (i >= this.slides.length) return;
      // 放大图、原页阅读等弹窗只属于当前页；翻页时一并关闭，避免遮住下一页。
      if (i !== this.cur) document.querySelectorAll('dialog[open]').forEach((d) => d.close());
      this.cur = i;
      this.slides.forEach((s, j) => s.classList.toggle('current', i === j));
      const sid = this.ids[i];
      if (!fromHash || location.hash.slice(1) !== sid) history.replaceState(null, '', '#' + sid);
      this.querySelector('.nav-pos').innerHTML = `<b>${esc(sid)}</b>　${i + 1} / ${this.slides.length}　<span class="nav-hint">方向键翻页 · Esc 地图 · P 备注 · B 静态</span>`;
      this.querySelectorAll('[data-entry]').forEach((b) => { const e = DECK.entries[b.dataset.entry]; const on = sid === e.page; b.classList.toggle('active', on); b.textContent = on ? '返回原页' : e.label; });
      this.slides[i].querySelectorAll('[data-onshow]').forEach((n) => n.onShow?.());
      this.sync();
    }
    toggleMap(force) {
      const open = force ?? !this.querySelector('.overview');
      this.querySelector('.overview')?.remove();
      if (!open) return;
      const div = document.createElement('div'); div.className = 'overview'; div.setAttribute('role', 'dialog');
      div.innerHTML = `<div class="overview-top"><h2>${esc(DECK.name)}：课程地图</h2><button data-act="map">关闭 ×</button></div>
        <div class="overview-grid">${this.slides.map((s, i) => `<button data-act="go" data-id="${esc(this.ids[i])}" class="${['implemented','prototype'].includes(s.dataset.status) ? '' : 'planned'} ${i === this.cur ? 'on' : ''}"><small>${esc(s.getAttribute('kicker'))}</small><strong>${esc(s.getAttribute('header-title'))}</strong></button>`).join('')}</div>`;
      this.append(div);
    }
    key(e) {
      if (e.isComposing || document.querySelector('dialog[open],.model-overlay')) return;
      if (e.composedPath().some((x) => x?.matches?.('input,textarea,select,[contenteditable=true]'))) return;
      const m = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 };
      if (m[e.key]) { e.preventDefault(); this.go(this.cur + m[e.key]); }
      if (e.key === 'Home') this.go(0);
      if (e.key === 'End') this.go(this.slides.length - 1);
      if (e.key === 'Escape') this.toggleMap();
      if (e.key.toLowerCase() === 'p') this.presenter();
      if (e.key.toLowerCase() === 'b') document.body.classList.toggle('low-power');
    }
    presenter() {
      const u = new URL(location.href); u.searchParams.set('presenter', '1');
      window.open(u.href, CHANNEL + '-presenter', 'width=1100,height=760');
      setTimeout(() => this.sync(), 800);
    }
    sync() {
      const s = this.slides[this.cur]; if (!s || !this.channel) return;
      this.channel.postMessage({ type: 'STATE', id: this.ids[this.cur], index: this.cur, total: this.slides.length });
    }
  }

  /* ================= deck-presenter（双屏备注） ================= */
  class DeckPresenter extends HTMLElement {
    connectedCallback() {
      this.sec = 0; this.run = false; this.id = location.hash.slice(1) || DATA.pages[0]?.id;
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => { if (e.data.type === 'STATE') { this.id = e.data.id; this.synced = Date.now(); this.render(); } };
      this.channel.postMessage({ type: 'REQUEST' });
      setInterval(() => { if (this.run) this.sec++; this.render(); }, 1000);
      this.addEventListener('click', (e) => {
        const a = e.target.closest('[data-act]')?.getAttribute('data-act'); if (!a) return;
        const i = DATA.pages.findIndex((p) => p.id === this.id);
        if (a === 'timer') this.run = !this.run;
        if (a === 'reset') this.sec = 0;
        if (a === 'prev' && i > 0) this.nav(DATA.pages[i - 1].id);
        if (a === 'next' && i < DATA.pages.length - 1) this.nav(DATA.pages[i + 1].id);
        this.render();
      });
      this.render();
    }
    nav(id) { this.id = id; this.channel.postMessage({ type: 'NAV', id }); }
    render() {
      const p = pageById(this.id) || {}; const i = DATA.pages.indexOf(p); const n = DATA.pages[i + 1];
      const notes = p.notes || {};
      const live = this.synced && Date.now() - this.synced < 6000;
      this.innerHTML = `<main style="padding:24px 32px;max-width:1100px;margin:auto">
        <p class="slide-kicker">${live ? '已与观众屏同步' : '等待观众屏'} · ${esc(p.id || '')} / ${esc(p.section || '')} · 建议 ${esc(p.minutes ?? '—')} 分钟</p>
        <h1 class="slide-title">${esc(p.title || '')}</h1>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-top:16px">
          <section style="font-size:17px;line-height:1.8">
            <p><b>目的</b>　${esc(notes.purpose || '')}</p><p style="margin-top:10px"><b>范例引导</b>　${esc(notes.guide || '')}</p><p style="margin-top:10px"><b>机制背景</b>　${esc(notes.mechanism || '')}</p>
            <p class="caption" style="margin-top:14px">运行模式：${esc(p.mode || '')}　｜　回到原页的证据：${esc(p.lesson_evidence || '')}</p>
          </section>
          <section><p class="big-num">${String(Math.floor(this.sec / 60)).padStart(2, '0')}:${String(this.sec % 60).padStart(2, '0')}</p>
            <p style="margin:8px 0"><button data-act="timer">${this.run ? '暂停' : '开始'}计时</button> <button data-act="reset">重置</button></p>
            <p style="margin:8px 0"><button data-act="prev">← 上一页</button> <button data-act="next">下一页 →</button></p>
            <p class="caption">下一页：${esc(n ? n.id + ' ' + n.title : '课程结束')}</p></section>
        </div></main>`;
    }
  }

  /* ================= 规划页占位（只显示页表内容，不冒充实现） ================= */
  class PlannedPage extends HTMLElement {
    connectedCallback() {
      const p = pageById(this.getAttribute('page-id')) || {};
      const opt = p.options ? `<p class="caption" style="margin-top:8px">交互方案待选：A＝${esc(p.options.A)}；B＝${esc(p.options.B)}（推荐 ${esc(p.options.recommend)}）</p>` : '';
      const cols = (p.steps || ['操作', '观察', '证据', '边界']).slice(0, 6).map((s, i) => ({
        title: s,
        body: i === 0 ? `<p class="caption">学生操作：${esc(p.student_operation || '')}</p>` : i === 1 ? `<p class="caption">可观察结果：${esc(p.observable_output || '')}</p>` : i === 2 ? `<p class="caption">回到原页的证据：${esc(p.lesson_evidence || '')}</p>` : `<p class="caption">运行模式：${esc(p.mode || '')}</p>`,
      }));
      this.innerHTML = `<div class="note-box">规划页：本页尚未实现，以下内容来自 page-map.json，供审阅排布。</div>${flowShell({ ...p, student_operation: '' }, cols)}${opt}`;
    }
  }

  /* ================= D25 概念表 ================= */
  const FIELD_LABEL = { alias: '原文与别称', where: '出现位置', problem: '它解决什么问题', classroom: '课堂上你会看到', confusion: '容易混淆', history: '对历史研究意味着什么' };
  const LABEL_FIELD = Object.fromEntries(Object.entries(FIELD_LABEL).map(([k, v]) => [v, k]));
  function parseConceptMd(text) {
    const doc = { intro: '', categories: [], previous: [] };
    let cat = null, term = null, para = [], inPrev = false;
    const flush = () => { if (term && para.length) term.paragraphs.push(para.join('')); para = []; };
    const finish = () => { flush(); if (term) cat.terms.push(term); term = null; };
    for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
      const line = raw.trimEnd();
      if (line.startsWith('## ')) { finish(); const label = line.slice(3).trim(); inPrev = label === '前几周已讲'; if (!inPrev) { cat = { label, terms: [] }; doc.categories.push(cat); } continue; }
      if (inPrev) { if (line.startsWith('- ')) doc.previous.push(line.slice(2)); continue; }
      if (line.startsWith('### ')) { finish(); if (!cat) throw Error('词条前需要 ## 分组'); const [n, ...en] = line.slice(4).split('|'); const e = en.join('|').trim(); term = { term: n.trim(), en: e.replace(/\s*⚠$/, ''), formula: /⚠$/.test(e), fields: {}, paragraphs: [] }; continue; }
      if (!term) { if (line.startsWith('> ')) doc.intro = line.slice(2); continue; }
      if (line.startsWith('页面：')) { const id = line.slice(3).trim(); if (id && !/^D\d{2}$/.test(id)) throw Error('页面格式应为 Dxx：' + term.term); term.first_slide = id || undefined; continue; }
      const fm = line.match(/^([^：]{2,12})：(.*)$/);
      if (fm && LABEL_FIELD[fm[1]]) { flush(); term.fields[LABEL_FIELD[fm[1]]] = fm[2]; continue; }
      if (!line.trim()) { flush(); continue; }
      para.push(line.trim());
    }
    finish();
    if (!doc.categories.length) throw Error('没有读到任何分组');
    return doc;
  }
  class ConceptTable extends HTMLElement {
    connectedCallback() {
      this.def = DATA.glossary; this.doc = store.get('concepts', null) || this.def; this.q = ''; this.sel = ''; this.msg = this.doc === this.def ? '' : '当前显示本机导入的概念原稿。';
      this.addEventListener('input', (e) => { if (e.target.dataset.k === 'q') { this.q = e.target.value; this.render(); } });
      this.addEventListener('change', async (e) => {
        if (e.target.dataset.k !== 'file') return; const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
        try { const doc = f.name.endsWith('.json') ? JSON.parse(await f.text()) : parseConceptMd(await f.text()); if(!doc||!Array.isArray(doc.categories)||!doc.categories.length)throw Error('缺少概念分组');for(const c of doc.categories){if(typeof c.label!=='string'||!Array.isArray(c.terms))throw Error('分组格式错误');for(const t of c.terms){if(typeof t.term!=='string'||typeof t.en!=='string'||!Array.isArray(t.paragraphs)||!t.fields||Object.values(t.fields).some(x=>typeof x!=='string')||t.paragraphs.some(x=>typeof x!=='string'))throw Error('词条格式错误');if(t.first_slide&&!pageById(t.first_slide))throw Error('词条回链不存在');}}this.doc = doc; store.set('concepts', doc); this.msg = `已导入 ${doc.categories.reduce((n, c) => n + c.terms.length, 0)} 条。`; } catch (err) { this.msg = '导入失败，保留原表：' + err.message; }
        this.render();
      });
      this.addEventListener('click', (e) => {
        const b = e.target.closest('[data-term],[data-c]'); if (!b) return;
        if (b.dataset.term) { this.sel = b.dataset.term; this.render(); this.querySelector(`[id="term-${CSS.escape(this.sel)}"]`)?.scrollIntoView({ block: 'start' }); }
        if (b.dataset.c === 'reset') { store.del('concepts'); this.doc = this.def; this.msg = '已恢复课程原表。'; this.render(); }
      });
      this.render();
    }
    render() {
      const q = this.q.trim().toLowerCase();
      const hay = (t) => [t.term, t.en, ...Object.values(t.fields), ...t.paragraphs].join(' ').toLowerCase();
      const match = (t) => !q || hay(t).includes(q);
      const total = this.doc.categories.reduce((n, c) => n + c.terms.length, 0);
      const card = (t) => `<article class="concept-card" id="term-${esc(t.term)}">
          <h3>${esc(t.term)}<small>${esc(t.en)}</small></h3>
          <p class="meta">${t.first_slide ? '首次出现：' + pageLink(t.first_slide, t.first_slide + ' ' + (pageById(t.first_slide)?.title || '')) : '首次出现页待定'}${t.fields.where ? '　·　' + esc(t.fields.where) : ''}${t.formula ? '　<span class="check">公式为纯文本近似，对照原表复核</span>' : ''}</p>
          <dl>${['alias', 'problem'].filter((k) => t.fields[k]).map((k) => `<dt>${FIELD_LABEL[k]}</dt><dd>${esc(t.fields[k])}</dd>`).join('')}</dl>
          <div class="body">${t.paragraphs.map((p) => p.startsWith('公式：') ? `<p><span class="formula-line">${esc(p.slice(3))}</span></p>` : `<p>${esc(p)}</p>`).join('')}</div>
          <dl>${['classroom', 'confusion', 'history'].filter((k) => t.fields[k]).map((k) => `<dt>${FIELD_LABEL[k]}</dt><dd>${esc(t.fields[k])}</dd>`).join('')}</dl></article>`;
      const html = `<div class="glossary">
        <aside>
          <input data-k="q" placeholder="搜索术语 / English / 释义" value="${esc(this.q)}" aria-label="搜索概念">
          ${this.doc.categories.map((c) => { const ts = c.terms.filter(match); return ts.length ? `<p class="group">${esc(c.label)}</p>${ts.map((t) => `<button data-term="${esc(t.term)}" class="${t.term === this.sel ? 'on' : ''}">${esc(t.term)}</button>`).join('')}` : ''; }).join('')}
          <p class="group">原稿</p>
          <label class="caption" style="display:block;margin:4px 0">导入修改后的 .md／.json<input data-k="file" type="file" accept=".md,.txt,.json" style="width:100%;margin-top:4px"></label>
          <button data-c="reset">恢复课程原表</button>
          <p class="caption" role="status" style="margin-top:6px">${esc(this.msg || `共 ${total} 条；右上角“返回原页”。`)}</p>
        </aside>
        <div class="glossary-main">
          ${this.doc.intro && !q ? `<p class="note-box">${esc(this.doc.intro)}</p>` : ''}
          ${this.doc.categories.map((c) => { const ts = c.terms.filter(match); return ts.length ? `<h2 style="font-size:16px;color:#40506a;margin:12px 0 8px">${esc(c.label)}</h2>${ts.map(card).join('')}` : ''; }).join('') || '<p class="note-box">没有找到匹配的概念。</p>'}
          ${this.doc.previous?.length && !q ? `<h2 style="font-size:16px;color:#40506a;margin:12px 0 8px">前几周已讲</h2><ul class="previous">${this.doc.previous.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        </div></div>`;
      rerender(this, html);
    }
  }

  const registry = { 'deck-slide': DeckSlide, 'planned-page': PlannedPage, 'concept-table': ConceptTable };
  window.Deck = { DATA, DECK, esc, store, pageById, pageLink, download, flowShell, rerender, parseConceptMd,
    register(tag, cls) { registry[tag] = cls; } };
  window.addEventListener('DOMContentLoaded', () => {
    const host = document.getElementById('app');
    if (new URLSearchParams(location.search).has('presenter')) { customElements.define('deck-presenter', DeckPresenter); host.append(document.createElement('deck-presenter')); return; }
    Object.entries(registry).forEach(([tag, cls]) => customElements.define(tag, cls));
    host.append(document.getElementById('deck-template').content.cloneNode(true));
    customElements.define('deck-container', DeckContainer);
  });
})();
