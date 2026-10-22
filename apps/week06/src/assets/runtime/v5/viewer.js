// Pan-and-zoom image viewer for v5 pages.
// Drag to move, wheel (or the buttons) to zoom around the pointer.
// Content is laid out in image pixels (w × h); layers are stacked on top of each other.
import { esc as E } from './layout.js';

export function viewer(key, { w, h, layers, tools = '' }) {
  return `<div class="v5-viewer" data-viewer="${E(key)}" data-w="${w}" data-h="${h}">
  <div class="v5-viewer-tools">
    <button data-vz="fit" title="整页放入">整页</button>
    <button data-vz="width" title="按宽度放满">满宽</button>
    <button data-vz="in" title="放大">＋</button>
    <button data-vz="out" title="缩小">－</button>
    <span class="v5-viewer-zoom"></span>
    ${tools}
  </div>
  <div class="v5-viewer-stage">
    <div class="v5-viewer-content" style="width:${w}px;height:${h}px">${layers}</div>
  </div>
  <p class="v5-viewer-hint">拖动平移 · 滚轮缩放 · 双击整页</p>
</div>`;
}

export function hydrateViewer(l, key) {
  const root = l.querySelector(`[data-viewer="${CSS.escape(key)}"]`);
  if (!root) return null;
  const stage = root.querySelector('.v5-viewer-stage');
  const content = root.querySelector('.v5-viewer-content');
  const label = root.querySelector('.v5-viewer-zoom');
  const w = +root.dataset.w, h = +root.dataset.h;
  const store = (l.v.viewers ||= {});
  let t = store[key];

  const apply = () => {
    content.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.s})`;
    label.textContent = Math.round(t.s * 100) + '%';
    store[key] = t;
  };
  const fit = mode => {
    const sw = stage.clientWidth || 600, sh = stage.clientHeight || 400;
    const s = mode === 'width' ? sw / w : Math.min(sw / w, sh / h);
    t = { s, x: (sw - w * s) / 2, y: mode === 'width' ? 0 : (sh - h * s) / 2 };
    apply();
  };
  const zoomAt = (factor, cx, cy) => {
    const s = Math.min(8, Math.max(0.05, t.s * factor));
    t = { s, x: cx - (cx - t.x) * (s / t.s), y: cy - (cy - t.y) * (s / t.s) };
    apply();
  };

  if (t) apply(); else requestAnimationFrame(() => fit('fit'));

  root.querySelector('.v5-viewer-tools').addEventListener('click', e => {
    const b = e.target.closest('[data-vz]');
    if (!b) return;
    const sw = stage.clientWidth, sh = stage.clientHeight;
    if (b.dataset.vz === 'fit' || b.dataset.vz === 'width') fit(b.dataset.vz);
    if (b.dataset.vz === 'in') zoomAt(1.25, sw / 2, sh / 2);
    if (b.dataset.vz === 'out') zoomAt(0.8, sw / 2, sh / 2);
    l.persist();
  });
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  stage.addEventListener('dblclick', () => fit('fit'));
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('[data-pick]')) return;
    drag = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y, moved: false };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    t = { ...t, x: drag.tx + dx, y: drag.ty + dy };
    apply();
  });
  const end = () => { if (drag) { drag = null; l.persist(); } };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  /** Convert a client point to image pixels. */
  const toImage = (clientX, clientY) => {
    const r = stage.getBoundingClientRect();
    return [(clientX - r.left - t.x) / t.s, (clientY - r.top - t.y) / t.s];
  };
  return { root, stage, content, toImage, fit };
}
