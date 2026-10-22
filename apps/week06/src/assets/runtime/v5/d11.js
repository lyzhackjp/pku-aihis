// D11 · 同一页，三种模型。三栏：原页叠一种模型的框（标签切换）｜盯住同一行：三种模型各自的框与文字｜运行与中间结果。
import { shell, pane, tabs, sourceBar, hydrateShell, esc as E } from './layout.js';
import { selectedRegion, cropSVG } from '../vision-pages.js';
import { regionBBox, overlapMatch } from '../../modules/ocr/record.mjs';
import { state } from '../storage.js';
import * as S from '../services.js';

const DATA = window.Deck.DATA;
const ENGINES = [['pp-ocrv6', 'PP-OCRv6'], ['dots.ocr', 'dots.ocr'], ['florence-2', 'Florence-2']];
const ROUTE = {
  'pp-ocrv6': '流水线：先检测出行，再逐行识读。',
  'dots.ocr': '视觉语言模型：一次写出框、类别、读序与文字。',
  'florence-2': '多任务视觉模型：一次生成带坐标的文字。',
};

function engineRecord(l, n) {
  return n === 'dots.ocr' && l.v.dotsUnused ? null : S.lastRecord(n);
}

/** What one engine has for the selected line, with an honest reason when it has nothing. */
function sameLine(l, n, x) {
  const r = engineRecord(l, n);
  if (!r) return `<p class="empty-state">${n === 'dots.ocr' && l.v.dotsUnused ? '教师机不用 dots.ocr' : '本页尚未运行'}</p>`;
  const located = r.regions.filter(v => regionBBox(v));
  if (!located.length) {
    const raw = String(r.raw?.generated ?? r.raw?.output ?? '').replace(/<\/?s>|<pad>/g, '').slice(0, 120);
    return `<p class="d11-none">这次运行没有返回任何带坐标的区域，所以无从对应。${n === 'florence-2' ? 'Florence-2 主要用英文等横排材料训练，在这页竖排汉字上只生成了一串与原页无关的字，没有坐标。' : ''}</p>${raw ? `<p class="d11-raw">原始输出开头：${E(raw)}…</p>` : ''}`;
  }
  const z = overlapMatch(x || {}, located);
  return z ? `${cropSVG(regionBBox(z))}<p class="d11-text">${E(z.text ?? '（只定位，未识读）')}</p>` : '<p class="empty-state">这一引擎没有与所选行重叠的框</p>';
}

function runPanel(l, n) {
  const r = engineRecord(l, n);
  let controls = '';
  if (n === 'dots.ocr') {
    const h = l.health || {};
    controls = `<p class="dots-status">${E(l.v.dotsUnused ? '教师机不用 dots.ocr' : h.loaded ? '本机服务实时 · ' + h.backend + ' · ' + h.revision : h.error || (h.loading ? '模型加载中' : '模型未加载'))}</p>
      <div class="toolbar"><button data-act="health">检查服务</button>
      <select data-k="dotsMode">${['layout_all', 'layout_only', 'ocr_only'].map(m => `<option ${m === (l.v.dotsMode || 'layout_all') ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <button data-act="dots">本机实际识读</button>
      <label class="check-row"><input type="checkbox" data-k="dotsUnused" ${l.v.dotsUnused ? 'checked' : ''}>教师机不用 dots.ocr</label></div>
      ${r ? '' : `<figure><img src="assets/materials/${E(DATA.sources.find(s => s.id === 'figure-5')?.file)}" alt="dots.ocr 官方示例" style="max-width:100%"><figcaption>官方繁体古籍示例；本课未运行</figcaption></figure>`}`;
  } else {
    controls = `<p class="caption">未加载时需下载：${n === 'florence-2' ? '约 262.2 MiB（q8 权重；另有配置）' : '约 29.6 MiB（检测＋识读）'}</p>
      ${n === 'florence-2' ? `<label>任务<select data-k="florenceTask">${['<OCR_WITH_REGION>', '<OCR>'].map(t => `<option ${t === (l.v.florenceTask || '<OCR_WITH_REGION>') ? 'selected' : ''}>${E(t)}</option>`).join('')}</select></label>` : ''}
      <button data-act="run:${n}">下载所需模型并实际识读</button>`;
  }
  const meta = r ? `<p class="caption">${E(r.replayed_at ? '保存结果回放' : r.engine.run_mode)} · ${E(r.engine.version)} · ${E(r.engine.date)} · ${Math.round(r.engine.elapsed_ms || 0)} ms · ${r.regions.length} 个区域</p>${r.errors?.length ? `<p class="empty-state">${E(r.errors.join('；'))}</p>` : ''}${r.engine.runtime_note ? `<p class="caption">${E(r.engine.runtime_note)}</p>` : ''}` : '';
  const steps = n === 'pp-ocrv6' && r ? `<h4 class="d08-h">分步中间结果</h4><select data-k="ppStage">${[['0', '概率图'], ['1', '检测框'], ['2', '裁切行'], ['3', '逐行文字']].map(([v, s]) => `<option value="${v}" ${(l.v.ppStage || '1') === v ? 'selected' : ''}>${s}</option>`).join('')}</select><div class="pp-intermediate"></div>` : '';
  return `<p class="d11-route">${E(ROUTE[n])}</p>${controls}${meta}${steps}`;
}

export function renderD11(l) {
  const tab = l.v.engineTab || 'pp-ocrv6', r = engineRecord(l, tab);
  // An engine that returned no located regions cannot hold the selection; fall back to PP-OCRv6's line.
  const x = (r?.regions.some(v => regionBBox(v)) ? selectedRegion(l, r) : null) || selectedRegion(l, S.lastRecord('pp-ocrv6'));
  l.visionRecord = r;
  return shell({
    id: 'D11',
    question: l.p.question,
    lead: '左栏切换引擎、在原页上点一行；中栏是同一行在三种模型里各自的框和文字（按框的重叠对应，须人工核对）；右栏运行模型、看中间结果。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料'), l.materialPanel()),
    cols: l.v.v5Cols || [1.2, 1, 1],
    panes: [
      pane({ key: 'page', kicker: 'A', title: '原页', body: tabs('engineTab', ENGINES, tab) + `<page-overlay data-overlay="${E(tab)}" sync-group="week06-same-line"></page-overlay>` }),
      pane({ key: 'same', kicker: 'B', title: '盯住同一行', body: ENGINES.map(([n, name]) => `<article class="d11-card ${n === tab ? 'on' : ''}"><h4>${E(name)}</h4>${sameLine(l, n, x)}</article>`).join('') }),
      pane({ key: 'run', kicker: 'C', title: `运行：${ENGINES.find(e => e[0] === tab)[1]}`, body: runPanel(l, tab) }),
    ],
  });
}

export function hydrateD11(l) {
  hydrateShell(l);
}
