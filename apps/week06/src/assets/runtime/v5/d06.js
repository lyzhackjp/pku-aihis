// D06 · 读序是编辑决定。三栏：原页（显示当前读序）｜人工读序（拖动，或单击选中后按 ↑ ↓ 移动）｜机器读序对照。
import { shell, pane, tabs, sourceBar, hydrateShell, esc as E } from './layout.js';
import { runner, selectedRecord, selectedRegion } from '../vision-pages.js';
import { regionBBox } from '../../modules/ocr/record.mjs';
import { xycut } from '../../modules/ocr/xycut.mjs';
import { state } from '../storage.js';
import * as S from '../services.js';

const DATA = window.Deck.DATA;
const label = a => E(a ? (a.text ?? a.class) : '');

function model(l) {
  const tab = l.v.orderTab || 'rules';
  const r = tab === 'dots' ? S.lastRecord('dots.ocr') : selectedRecord(l);
  const regs = (r?.regions || []).filter(x => regionBBox(x) && x.kind !== 'TEXTBLOCK');
  const auto = regs.length ? xycut(regs, l.v.direction || 'vertical-rtl').order : [];
  const order = tab === 'dots'
    ? [...regs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(x => x.id)
    : (l.v.ruleOrder?.length === regs.length && l.v.ruleOrder.every(id => regs.some(x => x.id === id)) ? l.v.ruleOrder : auto);
  return { tab, r, regs, auto, order };
}

export function renderD06(l) {
  const { tab, r, regs, auto, order } = model(l);
  l.visionRecord = r;
  l.visionOrder = order;
  const x = selectedRegion(l, r);
  const manual = order.map((id, i) => {
    const a = regs.find(v => v.id === id);
    return `<article class="d06-item ${id === x?.id ? 'on' : ''}" data-order-drag="${E(id)}" data-order-drop="${E(id)}" tabindex="0" data-d06-item="${E(id)}">
      <span class="d06-n">${i + 1}</span><span class="d06-cls">${E(a?.class || '')}</span><span class="d06-text">${label(a)}</span>
    </article>`;
  }).join('');
  const diff = auto.filter((id, i) => order[i] !== id).length;
  const machine = tab === 'dots'
    ? Object.entries(regs.reduce((a, v) => (a[v.class] = (a[v.class] || 0) + 1, a), {})).map(([k, v]) => `<p>${E(k)}：${v}</p>`).join('')
    : auto.map((id, i) => { const a = regs.find(v => v.id === id); return `<button class="d06-auto ${order[i] !== id ? 'different' : ''}" data-d06-pick="${E(id)}"><span class="d06-n">${i + 1}</span>${label(a)}</button>`; }).join('');
  const dotsNote = tab === 'dots'
    ? `<div class="d06-dots"><button data-act="health">检查本机服务</button><button data-act="dots">本机运行 layout_all</button><p>${E(l.health?.error || l.health?.backend || '尚未检查')}</p>${r ? '' : `<p class="empty-state">本课未运行；可导入保存记录。以下为官方示例。</p><a href="assets/materials/${E(DATA.sources.find(s => s.id === 'figure-6')?.file)}" target="_blank"><img class="official-figure" src="assets/materials/${E(DATA.sources.find(s => s.id === 'figure-6')?.file)}" alt="dots.ocr 官方示例"></a>`}</div>`
    : '';
  return shell({
    id: 'D06',
    question: l.p.question,
    lead: '中栏拖动各行，或单击选中一行后按键盘 ↑ ↓ 移动；左图随之显示读序，右栏是机器排出的顺序。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料') + (r ? ' · ' + r.engine.name : ''), runner(l, r)),
    cols: l.v.v5Cols || [1.35, 1, 0.75],
    panes: [
      pane({ key: 'page', kicker: 'A', title: '原页与当前读序', body: `${tabs('orderTab', [['rules', '规则读序与人工读序'], ['dots', 'dots.ocr 读序']], tab)}<page-overlay data-v-overlay="order" sync-group="week06-same-line"></page-overlay>` }),
      pane({ key: 'manual', kicker: 'B', title: tab === 'dots' ? 'dots.ocr 读序' : '人工读序', body: `${dotsNote}<div class="d06-list" data-d06-list>${manual || '<p class="empty-state">尚无记录</p>'}</div>
        <div class="d06-actions"><button data-act="r2:export-order">导出本标签读序</button>${tab === 'rules' && l.v.ruleOrder ? '<button data-d06-reset>恢复为 XY 切分顺序</button>' : ''}</div>` }),
      pane({ key: 'auto', kicker: 'C', title: tab === 'dots' ? '类别统计' : 'XY 切分', body: `${tab === 'rules' ? `<p class="d06-diff">与人工读序不同的位置：<b>${diff}</b></p>` : ''}${machine}` }),
    ],
  });
}

export function hydrateD06(l) {
  hydrateShell(l);
  const list = l.querySelector('[data-d06-list]');
  const select = id => {
    const x = l.visionRecord?.regions.find(v => v.id === id);
    if (!x) return;
    l.v.selectedId = x.id; l.v.selectedBox = regionBBox(x);
    l.persist(); l.render();
    l.querySelector(`[data-d06-item="${CSS.escape(id)}"]`)?.focus({ preventScroll: false });
  };
  for (const n of l.querySelectorAll('[data-d06-item]')) n.addEventListener('click', () => select(n.dataset.d06Item));
  for (const n of l.querySelectorAll('[data-d06-pick]')) n.onclick = () => select(n.dataset.d06Pick);
  const reset = l.querySelector('[data-d06-reset]');
  if (reset) reset.onclick = () => { delete l.v.ruleOrder; l.persist(); l.render(); };
  if (list && (l.v.orderTab || 'rules') === 'rules') {
    list.addEventListener('keydown', e => {
      const n = e.target.closest('[data-d06-item]');
      if (!n || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      const id = n.dataset.d06Item, seq = [...l.visionOrder], i = seq.indexOf(id), j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if (i < 0 || j < 0 || j >= seq.length) return;
      [seq[i], seq[j]] = [seq[j], seq[i]];
      l.v.ruleOrder = seq;
      select(id);
    });
  }
}
