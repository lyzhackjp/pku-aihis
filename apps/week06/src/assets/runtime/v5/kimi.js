// Kimi K3 connection panel shared by D12 and D13: key status, the built-in vision check, prompt, range, consent, run.
import { esc as E } from './layout.js';
import { state, save } from '../storage.js';

const W = () => window.W6Chat;

/** Make sure a Kimi profile exists and is the one this page sends to. Returns its id (or null before the component loads). */
export function kimiProfile(l) {
  if (!W()?.ensurePreset) return null;
  const id = W().ensurePreset('kimi');
  if (l.v.apiProfile !== id) { l.v.apiProfile = id; l.v.comparedProfiles = [id]; }
  return id;
}

export const VISION_TEST = '看图测试，是在发送任何课程材料之前，先向模型发一张课件自己画的小图：白底黑字"史德 7141"。模型照录出"史德"和"7141"，才算通过。这一步确认三件事：模型名、地址、Key 都填对了；这个模型真的能接收图像；它不会把看不见的图当空白而凭空编字。测试图不含任何课程材料。没通过之前，课件不会把本页图像发出去。';

export function kimiPanel(l, { run = 'r2:cloud', label = '现场识读' } = {}) {
  const id = kimiProfile(l);
  if (!id) return '<p class="empty-state">模型接入组件尚未载入</p>';
  const c = W().settings(id), ready = W().ready(id), vision = W().visionReady(id);
  const vt = c.vision;
  return `<div class="kimi">
    <dl class="kimi-status">
      <dt>模型</dt><dd>Kimi K3 · <code>${E(c.model || '未填')}</code></dd>
      <dt>地址</dt><dd><code>${E(c.baseUrl)}</code>${c.proxy ? '（经本机转发）' : ''}</dd>
      <dt>Key</dt><dd class="${ready ? 'ok' : 'no'}">${ready ? '已填（只留在本页内存，刷新即清除）' : '未填'}</dd>
      <dt>看图测试</dt><dd class="${vision ? 'ok' : 'no'}">${vision ? '已通过 · ' + E((vt?.date || '').slice(0, 16).replace('T', ' ')) : vt ? '未通过：模型回复 ' + E((vt.text || '').slice(0, 40)) : '尚未测试'}</dd>
      <dt>推理强度</dt><dd><code>${E(c.reasoningEffort || 'low')}</code>（K3 总是先思考再作答；课件设为 low 以缩短等待）</dd>
    </dl>
    <div class="kimi-actions">
      <button data-kimi="key">填写 Key / 修改接入</button>
      <button data-kimi="test" ${ready && !l.busy ? '' : 'disabled'}>做看图测试</button>
    </div>
    <details class="kimi-why" data-open-key="kimiWhy" ${l.v.kimiWhy ? 'open' : ''}><summary>什么是"看图测试"？</summary><p>${E(VISION_TEST)}</p></details>
    <label>本次提示词<textarea data-k="apiPrompt" rows="3">${E(l.v.apiPrompt ?? l.p.ui_round2?.prompt ?? '')}</textarea></label>
    <label>发送范围 [x,y,w,h]，留空为整页<input data-k="crop" value="${E(l.v.crop || '')}"></label>
    <p class="caption">${E(state.material?.image.name || '')} · ${state.material?.image.width || 0}×${state.material?.image.height || 0}</p>
    <label class="check-row"><input type="checkbox" data-k="consent" ${l.v.consent ? 'checked' : ''}>我同意把当前页的所选范围发送给 Kimi K3</label>
    <button data-act="${E(run)}" ${vision && l.v.consent && !l.busy ? '' : 'disabled'} title="${vision ? '' : '先通过看图测试'}">${E(label)}</button>
    ${vision ? '' : '<p class="caption">先填 Key 并通过看图测试，"现场识读"才会启用。</p>'}
  </div>`;
}

export function hydrateKimi(l) {
  const id = kimiProfile(l);
  for (const b of l.querySelectorAll('[data-kimi]')) {
    b.onclick = () => {
      if (b.dataset.kimi === 'key') { W().open(); return; }
      l.guarded(async () => {
        l.status = '正在发送内置测试图"史德 7141"……';
        l.renderStatus();
        let log;
        try {
          const v = await W().testVision(id);
          l.status = v.passed ? '看图测试通过：Kimi K3 读出了"史德 7141"' : '看图测试未通过：回复中没有同时读出"史德"和"7141"';
          log = { kind: '视觉能力测试', ...v };
        } catch (e) {
          l.status = '看图测试失败：' + e.message;
          log = { kind: '视觉能力测试', date: new Date().toISOString(), error: e.detail || String(e), request: e.request, response: e.raw };
        }
        state.runs.push(log);
        await save();
      });
    };
  }
}
