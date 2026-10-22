// Older single-column pages, rearranged into side-by-side panes without rewriting them.
// Each spec lists the panes in order; a pane begins at the first top-level element matching `from`
// (optionally `back` siblings earlier) and runs until the next pane begins. `unwrap` first replaces a
// wrapper element by its children, so a two-part block can be split across panes.
import { esc as E } from './layout.js';

export const LEGACY = {
  D03: { cols: [1.2, 1], unwrap: ['.layout-detail'], panes: [['原页与所选区域', null], ['区域类别', 'section']] },
  D05: { cols: [1.3, 1], panes: [['原页与切分', null], ['切分过程与结果', 'p']] },
  D09: { cols: [0.9, 2], panes: [['挑选的规则', null], ['逐行分数与校对', 'table.confidence-table']], tail: 0 },
  D10: { cols: [0.8, 2], panes: [['三条路', null], ['选中的一段', 'article.timeline-detail']] },
  D14: { cols: [1, 1.2, 1], panes: [['按材料筛选', null], ['同一页，两种工具', 'div.two-columns', 0], ['竞赛与评测', 'div.r2-tabs', 3]] },
  D16: { cols: [1.2, 1], panes: [['退化：效果与对照', null], ['损伤与印章', 'h3']] },
  D17: { cols: [1.3, 1], panes: [['原页与行序', null], ['手工录文与实验', 'div.manual-transcripts']] },
  D18: { cols: [1, 1.2], panes: [['我的材料：清单', null], ['字表覆盖与实验', 'select']] },
  D19: { cols: [1.2, 1], panes: [['同一页，两份转录', null], ['写下你的录文规范', 'label']] },
  D20: { cols: [1, 1.3], panes: [['参照与识读', null], ['对齐与错误率', 'p.metrics']] },
  D21: { cols: [0.9, 1.6], panes: [['后处理提示词', null], ['三种做法的结果', 'div.three-columns']] },
  D22: { cols: [1, 1, 1], panes: [['参照文本的来历', null], ['四层记录', 'label'], ['导出与核对', 'h3']] },
};

export function splitLegacy(l) {
  const spec = LEGACY[l.p.id];
  const content = l.querySelector(':scope > .week06-content');
  if (!spec || !content) return false;
  for (const sel of spec.unwrap || []) for (const n of content.querySelectorAll(sel)) n.replaceWith(...n.children);
  const head = content.querySelector(':scope > .v5-head'), status = content.querySelector(':scope > .lab-status');
  const note = content.querySelector(':scope > details.teacher-note');
  const items = [...content.children].filter(n => n !== head && n !== status && n !== note);
  const starts = spec.panes.map(([, sel, back = 0], i) => {
    if (i === 0 || !sel) return 0;
    const k = items.findIndex(n => n.matches(sel));
    return k < 0 ? -1 : Math.max(0, k - back);
  });
  const panes = spec.panes.map(([title], i) => {
    const sec = document.createElement('section');
    sec.className = 'v5-pane';
    sec.dataset.pane = 'p' + i;
    sec.innerHTML = `<header><span><b>${String.fromCharCode(65 + i)}</b>${E(title)}</span></header><div class="v5-pane-body"></div>`;
    return sec;
  });
  items.forEach((n, k) => {
    let pane = 0;
    starts.forEach((s, i) => { if (s >= 0 && k >= s) pane = i; });
    panes[pane].querySelector('.v5-pane-body').append(n);
  });
  if (note) panes.at(-1).querySelector('.v5-pane-body').append(note);
  const cols = l.v.v5Cols || spec.cols;
  const v5 = document.createElement('div');
  v5.className = 'v5 v5-legacy';
  v5.dataset.v5Page = l.p.id;
  v5.style.setProperty('--v5-cols', cols.map(c => `minmax(0,${c}fr)`).join(' 8px '));
  const grid = document.createElement('div');
  grid.className = 'v5-grid';
  panes.forEach((p, i) => {
    if (i) { const s = document.createElement('div'); s.className = 'v5-split'; s.dataset.split = i - 1; s.title = '拖动调整栏宽；双击复原'; grid.append(s); }
    grid.append(p);
  });
  if (head) v5.append(head);
  v5.append(grid);
  content.append(v5);
  content.classList.add('v5-host');
  return true;
}
