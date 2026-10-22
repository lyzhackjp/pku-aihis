// D02 · 四项视觉任务。两栏：左为原页（选行）；右栏用标签切换"五种情况与任务"及分类、定位、检测、分割四项任务的实际输出。
import { shell, pane, tabs, sourceBar, hydrateShell, esc as E } from './layout.js';
import { runner, selectedRecord, selectedRegion, candidates, cropSVG, category, dbMap } from '../vision-pages.js';
import { regionBBox } from '../../modules/ocr/record.mjs';
import { decodedPositions, candidateKey } from '../../modules/ocr/candidate-focus.mjs';
import { state } from '../storage.js';

const Q = k => window.Deck.pageById('D00').ui_round3[k];
const f = n => n == null ? '—' : `<span title="${n}">${Number(n).toFixed(3)}</span>`;

// 导入里找到的五种情况，与四项任务的关系（讲义 1.1）。
const CASES = [
  {
    name: '字认错', task: 'cls', taskName: '分类',
    text: '认一个字就是分类：模型在每个位置从字表里挑一个最像的字。NDLOCR-Lite 把"才"读成"オ"、"識"读成"織"，PP-OCRv6 把书口的"義"读成"發"，都是这一步挑错了。读一整行是一串分类连起来（2.1）。',
    find: [/オ|織|發|實/, /[オ織發實]/],
  },
  {
    name: '页码归入正文', task: 'det', taskName: '检测',
    text: '检测要同时回答"有哪些、在哪里、各是什么"。书口和页码被找到了，位置也对，错在类别：NDLOCR-Lite 把它们判成了正文行；PP-OCRv6 的检测根本不分类，它们就和正文混在一起。',
    find: [/^文史通|^一百四十一$/],
  },
  {
    name: '正文被切断', task: 'loc', taskName: '定位',
    text: '框的边界没有包住整行，或一行被拆成两个框，是定位的问题。PP-OCRv6 把标题"史德"拆成了"史""德"两个框。框给出的四个数（x、y、宽、高）决定了识读模型看到哪些像素，框错了，后面认得再准也读不全。',
    find: [/^史$/, /^文史通/],
  },
  {
    name: '圈点消失', task: 'seg', taskName: '分割（及字表）',
    text: '原页的逗号、句号、专名线比字小得多，压在字旁。行框只框住字，字表里多半也没有这些符号，模型无从输出。要留下它们，需要细到像素的分割或专门的类别；留不留，又取决于录文规范（第五节）。',
    find: [/^才學識/, /./],
  },
  {
    name: '振假名的读序', task: null, taskName: '不属四项任务：阅读顺序',
    text: '振假名该插在哪一个字后面、先读哪一行，是在检测结果之上另建的先后关系。四项任务都回答不了，1.3 单独讨论。',
  },
];

const TASKS = [
  ['cases', '五种情况与任务'],
  ['cls', '分类'],
  ['loc', '定位'],
  ['det', '检测'],
  ['seg', '分割'],
];

function casesTab() {
  return `<p class="d02-lead">导入里找到的不同，各对应哪一项视觉任务？点"看实例"，会在左边选中相关的行，并切到对应的任务。</p>
  <div class="d02-cases">${CASES.map((c, i) => `<article class="d02-case">
    <header><span class="d02-case-name">${E(c.name)}</span><span class="d02-arrow">→</span><span class="d02-case-task ${c.task ? '' : 'other'}">${E(c.taskName)}</span></header>
    <p>${E(c.text)}</p>
    ${c.task ? `<button data-d02-case="${i}">看实例</button>` : ''}
  </article>`).join('')}</div>`;
}

function exampleFigure(p, name) {
  const svg = p.ui?.task_examples?.[name];
  return svg ? `<figure class="d02-example">${svg}<figcaption>示意（教学构造）</figcaption></figure>` : '';
}

function taskTab(l, r, x, tab) {
  const pp = r?.engine.name === 'pp-ocrv6', p = l.p;
  if (!r) return '<p class="empty-state">尚无记录；在"材料与记录"中载入或现场运行</p>';
  if (tab === 'cls') {
    return `${exampleFigure(p, '分类')}<h4>选中行逐位的候选字与概率</h4>
      <p>识读模型在每个位置给字表中的每个字打一个概率，取最高的那个。下拉选择位置，看排在前五的候选。</p>
      ${candidates(x, l)}
      <p class="caption">${E(pp ? Q('pp_rec_source') : Q('ndl_rec_source'))}</p>`;
  }
  if (tab === 'loc') {
    const box = regionBBox(x || {});
    return `${exampleFigure(p, '定位')}<h4>选中行的框：四个数</h4>
      ${box ? `${cropSVG(box)}<dl class="bbox-values">${['x', 'y', 'w（宽）', 'h（高）'].map((k, i) => `<dt>${k}</dt><dd>${Math.round(box[i])}</dd>`).join('')}</dl>
      <p>检测分数 ${f(x.det_score)}：检测器对"这里有一个文字行"的把握，不是识读对错的把握（2.2）。</p>
      <details><summary>${E(Q('loc_json'))}</summary><pre>${E(JSON.stringify({ bbox: box, det_score: x.det_score, source: x.det_score_source }, null, 2))}</pre></details>` : '<p class="empty-state">选中区域没有坐标</p>'}
      <p class="caption">${E(pp ? Q('pp_source') : Q('ndl_source'))}</p>`;
  }
  if (tab === 'det') {
    const regs = (r.regions || []).filter(v => regionBBox(v));
    return `${exampleFigure(p, '检测')}<h4>全页检出 ${regs.length} 个区域</h4>
      <p>${pp ? 'PP-OCRv6 的检测只找文字行，不分类别。' : 'NDLOCR-Lite 的检测同时给出类别（17 类之一）。留意 block_rubi、block_folio、block_pillar 等类别落在哪里。'}点一行，在左图选中它。</p>
      <table class="d02-table"><thead><tr><th>区域</th><th>类别</th><th>检测分数</th><th>文字</th></tr></thead><tbody>
      ${regs.map(v => `<tr class="${v.id === x?.id ? 'on' : ''}" data-d02-pick="${E(v.id)}"><td>${E(v.id)}</td><td>${pp ? E(Q('unclassified')) : E(category(v).name)}</td><td>${f(v.det_score)}</td><td>${E((v.text ?? '（只定位，未识读）').slice(0, 16))}</td></tr>`).join('')}
      </tbody></table>
      <p class="caption">${E(pp ? Q('pp_source') : Q('ndl_source'))}</p>`;
  }
  if (tab === 'seg') {
    return `${exampleFigure(p, '分割')}<h4>逐像素的文字概率（PP-OCRv6 检测网络 DB）</h4>
      <p>检测网络先给每个像素一个"是文字"的概率，再按阈值切成黑白、连成框。这一步本身就是分割；框是由分割结果收拢出来的。</p>
      ${dbMap(l)}
      <p class="caption">${E(l.p.ui_round2.sources[3] || '')}</p>`;
  }
  return '';
}

export function renderD02(l) {
  const r = selectedRecord(l), x = selectedRegion(l, r);
  l.visionRecord = r;
  const tab = l.v.d02Tab || 'cases';
  const pp = r?.engine.name === 'pp-ocrv6';
  const regs = [...(r?.regions || [])];
  if (l.v.displayOrder === 'vertical') regs.sort((a, b) => { const aa = regionBBox(a), bb = regionBBox(b); return aa && bb ? bb[0] - aa[0] || aa[1] - bb[1] : 0; });
  const choose = r ? `<label class="d02-choose">选中行<select data-k="selectedLine">${regs.map(v => `<option value="${E(v.id)}" ${v.id === x?.id ? 'selected' : ''}>${E(v.id)} · ${E((v.text ?? v.class).slice(0, 24))}</option>`).join('')}</select></label>` : '';
  const order = pp ? `<label class="d02-choose">${E(Q('order'))}<select data-k="displayOrder"><option value="engine" ${l.v.displayOrder !== 'vertical' ? 'selected' : ''}>${E(Q('engine_order'))}</option><option value="vertical" ${l.v.displayOrder === 'vertical' ? 'selected' : ''}>${E(Q('vertical_order'))}</option></select></label><p class="caption">${E(Q('order_note'))}</p>` : '';
  return shell({
    id: 'D02',
    question: l.p.question,
    lead: '左栏选一行，右栏切换任务，看同一行在每项任务里得到的实际输出。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料') + (r ? ' · ' + r.engine.name + ' · ' + r.engine.run_mode : ''), runner(l, r)),
    cols: l.v.v5Cols || [1, 1.35],
    panes: [
      pane({ key: 'page', kicker: 'A', title: '原页', body: `<div class="d02-bar">${choose}${order}</div><page-overlay data-v-overlay="vision" sync-group="week06-same-line"></page-overlay>` }),
      pane({ key: 'tasks', kicker: 'B', title: '任务', tools: '', body: tabs('d02Tab', TASKS, tab) + `<div class="d02-body">${tab === 'cases' ? casesTab() : taskTab(l, r, x, tab)}</div>` }),
    ],
  });
}

export function hydrateD02(l) {
  hydrateShell(l);
  for (const b of l.querySelectorAll('[data-d02-case]')) {
    b.onclick = () => {
      const c = CASES[+b.dataset.d02Case], regions = l.visionRecord?.regions || [];
      let x = null;
      for (const re of c.find || []) { x = regions.find(v => v.text && re.test(v.text)); if (x) break; }
      if (x) {
        l.v.selectedId = x.id; l.v.selectedBox = regionBBox(x); l.candidateIdentity = null;
        const ps = decodedPositions(x.recognition_trace), i = ps.findIndex(p => /[オ織發實]/.test(p.text || ''));
        if (i >= 0) l.v[candidateKey(x)] = i;
      }
      l.v.d02Tab = c.task;
      l.persist();
      l.render();
    };
  }
  for (const tr of l.querySelectorAll('[data-d02-pick]')) {
    tr.onclick = () => {
      const x = l.visionRecord?.regions.find(v => v.id === tr.dataset.d02Pick);
      if (!x) return;
      l.v.selectedId = x.id; l.v.selectedBox = regionBBox(x); l.candidateIdentity = null;
      l.persist(); l.render();
    };
  }
}
