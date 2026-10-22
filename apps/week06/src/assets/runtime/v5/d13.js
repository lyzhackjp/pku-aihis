// Difference view retained from the former D13, now a tab on D12.
import { esc as E } from './layout.js';
import { deltaRows, C, B } from '../round2-pages.js';
import { sharedAlignment } from '../import-panel.js';
import { state } from '../storage.js';

export function diffPane(l) {
  const ref = sharedAlignment().map(x => x.reference).join('\n'), hyp = sharedAlignment().map(x => x.hypothesis).join('\n');
  if (!ref || !state.imports?.reading) return '<p class="empty-state">先让 Kimi K3 识读（左栏），再在右栏"导入参照"里放入参照文本；两者都在时，这里逐处列出差异。</p>';
  const deltas = deltaRows(ref, hyp), labels = l.p.ui_round2.classifications;
  return `<p class="d08-note">共 ${deltas.length} 处差异。为每一处选一个标签：改对（把原书错字改成了"对"的字）、古化（换成更古的写法）、补写（原页没有的字）、换名、漏读、其他。</p>
    <div class="d13-diffs difference-cards">${deltas.map(x => `<article><b><span class="op">${E(x.op)}</span>${E(x.reference || '∅')} → ${E(x.hypothesis || '∅')}</b>
      <select data-k="api-diff-${x.index}"><option value="">…</option>${labels.map(c => `<option ${state.through.draft.apiDiscrepancies?.[x.index] === c ? 'selected' : ''}>${E(c)}</option>`).join('')}</select></article>`).join('')}</div>
    ${B('export-api-diff', C('export_differences'))}`;
}
