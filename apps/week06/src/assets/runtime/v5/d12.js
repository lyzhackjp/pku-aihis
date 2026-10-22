// D12 · 通用多模态大模型。三栏：Kimi K3 接入与发送｜Kimi 的回答画回原图｜网页版 Gemini、ChatGPT 对照与研究证据。
import { shell, pane, tabs, sourceBar, hydrateShell, esc as E } from './layout.js';
import { kimiPanel, hydrateKimi, kimiProfile } from './kimi.js';
import { diffPane } from './d13.js';
import { resultCard } from '../round2-pages.js';
import { state } from '../storage.js';
import * as S from '../services.js';

const WEB = [
  ['gemini', 'Gemini 网页版'],
  ['chatgpt', 'ChatGPT 网页版'],
];

function webTab(l) {
  return `<p class="d08-note">在浏览器里打开 Gemini 或 ChatGPT 网页版，上传同一页（或同一范围的截图），用左栏同样的提示词提问，把回答整段粘贴到这里。网页版的回答不经过课件，课件只保存你粘贴的文字和填写的型号。</p>
    ${WEB.map(([k, name]) => `<section class="d12-web">
      <h4>${E(name)}</h4>
      <label>型号与日期（照网页上显示的写）<input data-k="web-${k}-model" value="${E(l.v['web-' + k + '-model'] || '')}" placeholder="例如：页面显示的模型名 · 2026-10-29"></label>
      <label>回答全文<textarea data-k="web-${k}-text" rows="6">${E(l.v['web-' + k + '-text'] || '')}</textarea></label>
    </section>`).join('')}`;
}

function evidenceTab(l) {
  return [...(l.p.ui?.stages || []),...(l.p.ui?.evidence || [])].map(x => `<article class="d12-ev"><h4>${E(x.name)}</h4><p>${E(x.text || '')}</p>${x.quote ? `<blockquote>${E(x.quote)}</blockquote>` : ''}<p class="caption">${x.url ? `<a href="${E(x.url)}" target="_blank" rel="noopener">${E(x.source)}</a>` : E(x.source || '')}</p></article>`).join('');
}

export function renderD12(l) {
  const id = kimiProfile(l);
  const r = id ? S.currentRecords().filter(x => x.engine.name === 'mllm' && x.engine.params.profile_id === id).at(-1) : null;
  const tab = l.v.d12Tab || 'web';
  return shell({
    id: 'D12',
    question: l.p.question,
    lead: '课件内只接 Kimi K3：左栏填 Key、做看图测试、发送；中栏切换模型回答与参照差异；右栏切换网页版对照、参照导入和研究证据。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料'), l.materialPanel()),
    cols: l.v.v5Cols || [0.95, 1.35, 1],
    panes: [
      pane({ key: 'send', kicker: 'A', title: 'Kimi K3：接入与发送', body: kimiPanel(l) }),
      pane({ key: 'result', kicker: 'B', title: '回答与差异', body: tabs('d12ResultTab', [['answer','模型回答'],['diff','与参照的差异']], l.v.d12ResultTab||'answer') + (l.v.d12ResultTab==='diff'?diffPane(l):r ? resultCard(r, 0) : '<p class="empty-state">尚无 Kimi K3 的回答。通过看图测试并同意发送后，在左栏点"现场识读"。</p>') }),
      pane({ key: 'web', kicker: 'C', title: '对照', body: tabs('d12Tab', [['web', '网页版对照'], ['reference', '导入参照'], ['evidence', '研究证据']], tab) + `<div class="d02-body">${tab === 'web' ? webTab(l) : tab === 'reference' ? '<ocr-import-panel></ocr-import-panel>' : evidenceTab(l)}</div>` }),
    ],
  });
}

export function hydrateD12(l) {
  hydrateShell(l);
  hydrateKimi(l);
}
