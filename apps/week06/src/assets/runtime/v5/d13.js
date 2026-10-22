// D13 · 另一种错误：通顺而错误。三栏：Kimi K3 识读｜与参照逐字对齐、为每处差异归类｜导入参照与研究证据。
import { shell, pane, tabs, sourceBar, hydrateShell, esc as E } from './layout.js';
import { kimiPanel, hydrateKimi, kimiProfile } from './kimi.js';
import { resultCard, deltaRows, C, B } from '../round2-pages.js';
import { sharedAlignment } from '../import-panel.js';
import { state } from '../storage.js';
import * as S from '../services.js';

function diffPane(l) {
  const ref = sharedAlignment().map(x => x.reference).join('\n'), hyp = sharedAlignment().map(x => x.hypothesis).join('\n');
  if (!ref || !state.imports?.reading) return '<p class="empty-state">先让 Kimi K3 识读（左栏），再在右栏"导入参照"里放入参照文本；两者都在时，这里逐处列出差异。</p>';
  const deltas = deltaRows(ref, hyp), labels = l.p.ui_round2.classifications;
  return `<p class="d08-note">共 ${deltas.length} 处差异。为每一处选一个标签：改对（把原书错字改成了"对"的字）、古化（换成更古的写法）、补写（原页没有的字）、换名、漏读、其他。</p>
    <div class="d13-diffs">${deltas.map(x => `<article><b><span class="op">${E(x.op)}</span>${E(x.reference || '∅')} → ${E(x.hypothesis || '∅')}</b>
      <select data-k="api-diff-${x.index}"><option value="">…</option>${labels.map(c => `<option ${state.through.draft.apiDiscrepancies?.[x.index] === c ? 'selected' : ''}>${E(c)}</option>`).join('')}</select></article>`).join('')}</div>
    ${B('export-api-diff', C('export_differences'))}`;
}

export function renderD13(l) {
  const id = kimiProfile(l);
  const r = id ? S.currentRecords().filter(x => x.engine.name === 'mllm' && x.engine.params.profile_id === id).at(-1) : null;
  const tab = l.v.d13Tab || 'reference';
  return shell({
    id: 'D13',
    question: l.p.question,
    lead: '左栏让 Kimi K3 照录本页；中栏把它的回答与参照逐字对齐，给每处差异归类；右栏导入参照、查看研究证据。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料'), l.materialPanel()),
    cols: l.v.v5Cols || [0.95, 1.3, 1],
    panes: [
      pane({ key: 'send', kicker: 'A', title: 'Kimi K3 识读', body: kimiPanel(l) + (r ? `<details class="d13-raw" data-open-key="d13Raw" ${l.v.d13Raw ? 'open' : ''}><summary>Kimi K3 的回答画回原图</summary>${resultCard(r, 0)}</details>` : '') }),
      pane({ key: 'diff', kicker: 'B', title: '与参照的差异', body: diffPane(l) }),
      pane({ key: 'ref', kicker: 'C', title: '参照与证据', body: tabs('d13Tab', [['reference', '导入参照'], ['evidence', '研究证据']], tab) + (tab === 'reference' ? '<ocr-import-panel></ocr-import-panel>' : l.p.ui.evidence.map(x => `<article class="evidence"><p>${E(x.text || '')}</p><blockquote>${E(x.quote || '')}</blockquote>${x.url ? `<a href="${E(x.url)}" target="_blank" rel="noopener">${E(x.source)}</a>` : `<p class="caption">${E(x.source)}</p>`}</article>`).join('')) }),
    ],
  });
}

export function hydrateD13(l) {
  hydrateShell(l);
  hydrateKimi(l);
}
