// Week 6 v5 layout: side-by-side panes, as in the week 3–5 flow pages.
// Each page is a header (question + a collapsed source bar) and a grid of panes.
// Panes scroll on their own; the page itself does not scroll on a wide screen.
// Controls inside v5 pages use data-v5-* attributes and are wired in hydrate(),
// so that sliders and pointer work update the picture in place without a re-render.

const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { E as esc };

/** Whole page. cols: relative widths, e.g. [1, 2, 1.3]; the teacher can drag the splitters. */
export function shell({ question, lead = '', source = '', cols, panes, id }) {
  const track = cols.map(c => `minmax(0,${c}fr)`).join(' 8px ');
  const withSplits = panes.flatMap((p, i) => i ? [`<div class="v5-split" data-split="${i - 1}" title="拖动调整栏宽；双击复原"></div>`, p] : [p]);
  return `<div class="v5" data-v5-page="${E(id)}" style="--v5-cols:${track}">
  <div class="v5-head">
    <p class="v5-question">${E(question)}</p>
    ${lead ? `<p class="v5-lead">${lead}</p>` : ''}
    ${source}
  </div>
  <div class="v5-grid">${withSplits.join('')}</div>
</div>`;
}

/** One column. key is used to keep its scroll position across re-renders. */
export function pane({ key, kicker = '', title, tools = '', body, cls = '' }) {
  return `<section class="v5-pane ${cls}" data-pane="${E(key)}">
  <header><span>${kicker ? `<b>${E(kicker)}</b>` : ''}${E(title)}</span>${tools}</header>
  <div class="v5-pane-body">${body}</div>
</section>`;
}

/** Tabs inside a pane. Clicking sets l.v[key] and re-renders. */
export function tabs(key, items, value) {
  return `<div class="v5-tabs" role="tablist">${items.map(([id, label]) =>
    `<button role="tab" data-v5-tab="${E(key)}" data-value="${E(id)}" aria-selected="${String(id) === String(value)}">${E(label)}</button>`).join('')}</div>`;
}

/** Collapsed bar for material, live runner, saved records, teacher notes. */
export function sourceBar(summary, inner) {
  return `<details class="v5-source" data-open-key="v5Source"><summary>${E(summary)}</summary><div class="v5-source-body">${inner}</div></details>`;
}

/** Wire the generic v5 controls. Page modules add their own wiring after this. */
export function hydrateShell(l, defaults) {
  const grid = l.querySelector('.v5-grid');
  for (const sp of l.querySelectorAll('.v5-split')) {
    sp.ondblclick = () => { delete l.v.v5Cols; l.persist(); l.render(); };
    sp.onpointerdown = e => {
      const i = +sp.dataset.split;
      const cols = [...grid.querySelectorAll(':scope>.v5-pane')].map(n => n.getBoundingClientRect().width);
      const x0 = e.clientX, a = cols[i], b = cols[i + 1];
      sp.setPointerCapture(e.pointerId);
      sp.onpointermove = ev => {
        const d = Math.max(140 - a, Math.min(b - 140, ev.clientX - x0));
        const next = cols.slice(); next[i] = a + d; next[i + 1] = b - d;
        l.v.v5Cols = next.map(x => +(x / 100).toFixed(3));
        l.querySelector('.v5').style.setProperty('--v5-cols', l.v.v5Cols.map(c => `minmax(0,${c}fr)`).join(' 8px '));
      };
      sp.onpointerup = () => { sp.onpointermove = null; l.persist(); };
    };
  }
  for (const b of l.querySelectorAll('[data-v5-tab]')) {
    b.onclick = () => { l.v[b.dataset.v5Tab] = b.dataset.value; l.persist(); l.render(); };
  }
}

/** Remember scroll positions of the slide body and every pane; restore after rebuilding. */
export function keepScroll(host, rebuild) {
  const body = host.closest('.slide-body');
  const top = body ? body.scrollTop : 0;
  const panes = new Map([...host.querySelectorAll('[data-pane]')].map(n => {
    const inner = n.querySelector('.v5-pane-body') || n;
    return [n.dataset.pane, inner.scrollTop];
  }));
  const scrollers = new Map([...host.querySelectorAll('[data-keep-scroll]')].map(n => [n.dataset.keepScroll, [n.scrollTop, n.scrollLeft]]));
  rebuild();
  if (body) body.scrollTop = top;
  for (const n of host.querySelectorAll('[data-pane]')) {
    const inner = n.querySelector('.v5-pane-body') || n;
    if (panes.has(n.dataset.pane)) inner.scrollTop = panes.get(n.dataset.pane);
  }
  for (const n of host.querySelectorAll('[data-keep-scroll]')) {
    const s = scrollers.get(n.dataset.keepScroll);
    if (s) [n.scrollTop, n.scrollLeft] = s;
  }
}

/**
 * Older (single-column) pages: gather material, saved-record, provenance, live runner and import
 * controls into one collapsed bar beside the question, so the page opens on its actual content.
 */
export function compactSources(l) {
  const content = l.querySelector(':scope > .week06-content');
  if (!content) return;
  const parts = [...content.querySelectorAll('.src-pack, details.runner-panel')]
    .filter(n => !n.parentElement.closest('.src-pack, details.runner-panel, .v5-source'));
  const question = content.querySelector(':scope > .lab-question');
  if (!parts.length && !question) return;
  const head = document.createElement('div');
  head.className = 'v5-head';
  if (question) { question.classList.add('v5-question'); head.append(question); }
  if (parts.length) {
    const bar = document.createElement('details');
    bar.className = 'v5-source';
    bar.dataset.openKey = 'srcOpen';
    bar.open = !!l.v.srcOpen;
    const summary = document.createElement('summary');
    const pack = parts.find(n => n.classList.contains('src-pack'));
    summary.textContent = '材料与记录' + (pack?.dataset.srcSummary ? '：' + pack.dataset.srcSummary : '');
    const body = document.createElement('div');
    body.className = 'v5-source-body';
    body.append(...parts);
    bar.append(summary, body);
    head.append(bar);
  }
  content.prepend(head);
}
