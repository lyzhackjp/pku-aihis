// D08 · 字表里有"德"，为什么读成"徳"。三栏：实验设计（标签选实验组与条件）｜这一条件的结果（标签选模型）｜各条件对照。
import { shell, pane, tabs, sourceBar, hydrateShell, esc as E } from './layout.js';
import { runner, candidates, legacyRerun } from '../vision-pages.js';
import { legacyPanel } from '../controlled-experiments.js';
import { contextOutcome } from '../../modules/ocr/inplace-experiment.mjs';
import { decodedPositions } from '../../modules/ocr/candidate-focus.mjs';
import { state } from '../storage.js';

const Q = k => window.Deck.pageById('D00').ui_round4[k];
const ENGINES = [['ndlocr-lite', 'NDLOCR-Lite'], ['pp-ocrv6', 'PP-OCRv6']];
const p3 = x => x == null ? '—' : `<span title="${x}">${Number(x).toFixed(3)}</span>`;

// The position where 德 or 徳 is most likely, among the positions the experiment located.
function target(r) {
  const ps = r?.target_evidence?.positions || [];
  let best = null;
  for (const p of ps) {
    const s = (p.probes?.德 || 0) + (p.probes?.徳 || 0);
    if (!best || s > best.s) best = { ...p, s };
  }
  return best;
}

// Show only the target cell and the two cells before it, enlarged: that is where the conditions differ.
function zoomCell(r, group) {
  const [W, H] = r.engine.params.input_shape, [, cy, , ch] = group.targetCell;
  const y0 = Math.max(0, cy - 2 * ch), h = Math.min(H, cy + ch + 2) - y0;
  return `<svg class="d08-zoom" viewBox="0 ${y0} ${W} ${h}" style="aspect-ratio:${W}/${h}" role="img" aria-label="目标格及前两格放大"><image href="${E(r.raw.input_png)}" width="${W}" height="${H}"/></svg>`;
}

function designPane(l, group, saved, cond) {
  const recs = saved?.records || [];
  return `${tabs('d08Group', l.p.controlled_experiments.map(g => [g.id, g.label.split('：')[0]]), group.id)}
    <h4 class="d08-h">${E(group.label)}</h4>
    <p class="d08-note">原行 [${group.sourceBox.join(', ')}]；目标格（行内）[${group.targetCell.join(', ')}]。每个条件只改动一格，行的尺寸、方向、缩放都不变；送进模型的图像只差那一格。下方各条件只放大显示目标格与它前面两格。</p>
    <div class="d08-conds">${group.conditions.map(c => {
      const r = recs.find(x => x.engine.params.condition_id === c.id);
      return `<button class="d08-cond ${c.id === cond.id ? 'on' : ''}" data-v5-tab="d08Cond" data-value="${E(c.id)}">
        ${r ? zoomCell(r, group) : ''}
        <span><b>${E(c.label)}</b>${c.edits.map(e => `<small>${E(e.label)}</small>`).join('')}</span>
      </button>`;
    }).join('')}</div>
    <button data-act="r2:controlled" data-group="${E(group.id)}" ${l.busy ? 'disabled' : ''}>${E(Q('controlled_run'))}</button>
    <p class="caption">${saved ? `${E(saved.mode || '保存结果回放')} · ${E(saved.date)}` : '本组尚无结果'}；${E(Q('controlled_label'))}。</p>`;
}

function resultPane(l, group, saved, cond, engine) {
  const r = (saved?.records || []).find(x => x.engine.name === engine && x.engine.params.condition_id === cond.id);
  const head = tabs('d08Engine', ENGINES, engine);
  if (!r) return head + '<p class="empty-state">这一条件尚无结果；在左栏运行本组</p>';
  const region = r.regions[0], input = region.recognition_trace.input, p = r.engine.params, t = target(r);
  return `${head}
    <div class="d08-output"><span>实际输出</span><b>${E(region.text)}</b></div>
    <div class="d08-target"><span>目标格读成</span><b>${E(r.target_evidence.choice || '未定位')}</b>
      ${t ? `<span>P(德) ${p3(t.probes?.德)}</span><span>P(徳) ${p3(t.probes?.徳)}</span>` : ''}</div>
    <figure class="network-preview d08-net"><figcaption>${E(Q('network_input'))} · ${input.width}×${input.height}（可横向滚动）</figcaption>
      <div class="network-zoom" data-network-zoom data-target-ratio="${p.targetCell[1] / p.input_shape[1]}"><img src="${E(r.raw.network_input_png)}" alt="${E(Q('network_input'))}" style="width:${input.width * 64 / input.height}px;height:64px"></div>
    </figure>
    <h4 class="d08-h">逐位候选</h4>
    ${candidates(region, l, p.condition_id + ':' + r.engine.name)}
    <p class="caption">${E(r.target_evidence.method)}</p>
    <details><summary>${E(Q('all_positions'))}</summary>${positionTable(decodedPositions(region.recognition_trace))}</details>
    <details><summary>坐标、像素核验与输入指纹</summary><pre>${E(JSON.stringify(p, null, 2))}</pre></details>`;
}

function positionTable(ps) {
  return `<div class="table-scroll"><table class="d02-table"><thead><tr><th>位置</th><th>最大项</th><th>前 5 候选</th><th>P(德)</th><th>P(徳)</th></tr></thead><tbody>${ps.map(p => `<tr><td>${p.step}</td><td>${E(p.text)}</td><td>${p.candidates.map(c => `${E(c.text)} ${p3(c.prob)}`).join('；')}</td><td>${p3(p.probes?.德)}</td><td>${p3(p.probes?.徳)}</td></tr>`).join('')}</tbody></table></div>`;
}

function comparePane(l, group, saved, engine) {
  const recs = saved?.records || [];
  const rows = group.conditions.map(c => {
    const r = recs.find(x => x.engine.name === engine && x.engine.params.condition_id === c.id), t = target(r);
    return `<tr><td>${E(c.label)}</td><td>${E(r?.target_evidence.choice || '—')}</td><td>${p3(t?.probes?.德)}</td><td>${p3(t?.probes?.徳)}</td></tr>`;
  }).join('');
  const outcome = group.comparison && recs.length ? (() => {
    const x = contextOutcome(...group.comparison.map(id => recs.find(r => r.engine.name === engine && r.engine.params.condition_id === id)?.target_evidence));
    return `<p class="d08-outcome ${x.observed ? 'yes' : ''}">${E(Q(x.observed ? 'context_effect' : 'no_context_effect'))}${x.located ? '' : '；' + E(Q('unlocated'))}</p>`;
  })() : '';
  return `<p class="d08-note">${E(ENGINES.find(e => e[0] === engine)[1])}：各条件下目标格的选择与概率</p>
    <table class="d02-table d08-cmp"><thead><tr><th>条件</th><th>读成</th><th>P(德)</th><th>P(徳)</th></tr></thead><tbody>${rows}</tbody></table>
    ${outcome}
    <p class="d08-note">怎样读这张表：若只换前一格（或前一字）就让"德／徳"的选择翻转，说明模型读字时受到了上下文的牵引；若概率只小幅变动、选择不变，说明在这组输入上看不出这种作用。</p>
    ${legacyPanel(l, { candidates })}
    <details class="legacy-rerun" data-open-key="legacyRerunOpen" ${l.v.legacyRerunOpen ? 'open' : ''}><summary>复跑上一轮的未控制尝试</summary>${legacyRerun(l)}</details>`;
}

export function renderD08(l) {
  const groups = l.p.controlled_experiments;
  const group = groups.find(g => g.id === l.v.d08Group) || groups[0];
  const saved = state.controlled_experiments?.[group.id];
  const cond = group.conditions.find(c => c.id === l.v.d08Cond) || group.conditions[group.conditions.length - 1];
  const engine = ENGINES.some(e => e[0] === l.v.d08Engine) ? l.v.d08Engine : 'ndlocr-lite';
  return shell({
    id: 'D08',
    question: l.p.question,
    lead: '左栏选实验组与条件，中栏选模型看这一条件的结果，右栏把同一模型在各条件下的选择放在一起比较。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料'), runner(l)),
    cols: l.v.v5Cols || [1, 1.35, 1],
    panes: [
      pane({ key: 'design', kicker: 'A', title: '实验设计', body: designPane(l, group, saved, cond) }),
      pane({ key: 'result', kicker: 'B', title: `结果：${cond.label}`, body: resultPane(l, group, saved, cond, engine) }),
      pane({ key: 'compare', kicker: 'C', title: '各条件对照', body: comparePane(l, group, saved, engine) }),
    ],
  });
}

export function hydrateD08(l) {
  hydrateShell(l);
  // Switching group resets the chosen condition to that group's last one.
  for (const b of l.querySelectorAll('[data-v5-tab="d08Group"]')) {
    b.onclick = () => { l.v.d08Group = b.dataset.value; delete l.v.d08Cond; l.persist(); l.render(); };
  }
}
