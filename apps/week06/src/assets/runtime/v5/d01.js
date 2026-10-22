// D01 · 找不同：原页与识读结果。三栏：原页（可拖动、缩放、改栏宽）｜逐行对照（原图裁切与识读文字并排）｜我找到的／四类问题。
// 公开模式默认载入 1926 年本首页的 NDLOCR-Lite 实际运行记录；四类问题的例子按该记录写出，并可一键定位到行。
import { shell, pane, tabs, sourceBar, hydrateShell, esc as E } from './layout.js';
import { cropSVGMarkup } from '../../modules/ocr/crop.mjs';
import { regionBBox } from '../../modules/ocr/record.mjs';
import { state } from '../storage.js';
import * as S from '../services.js';

// 1926 年商务印书馆本《史德》首页，NDLOCR-Lite 浏览器实际运行（2026-10-21）。原文据页影目验，候选，待教师确认。
const PUBLIC_ISSUES = [
  {
    title: '字形被换成日本通行字形',
    why: '原页印的是旧字形，结果换成了今天日本通行的写法。模型从训练材料里学到"这个字通常写成那样"，读字时偏向它（2.1）。',
    items: [
      ['line-0', '史德 → 史徳（标题；书口一行同样）'],
      ['line-2', '說 → 説'],
      ['line-5', '擊斷 → 撃斷（同一行，"擊"换了形，"斷"没有换）'],
    ],
  },
  {
    title: '形近的字认错',
    why: '只差几笔的字被读成另一个字，甚至读成片假名。这类错误改变文义，检索原句也会落空。',
    items: [
      ['line-4', '非才無以善其文：才 → オ（片假名）'],
      ['line-9', '文士之識：識 → 織；飾主闕：闕 → 國'],
      ['line-7', '不解貿化：貿 → 實'],
      ['line-8', '知所抉擇：抉 → 扶'],
    ],
  },
  {
    title: '标点与符号：原页有的没了，原页没有的多了',
    why: '原页的逗号、句号和专名线，在结果里几乎全部消失，只有引号『』留了下来；反过来，有几行的行首多出了原页没有的"一""第一"。',
    items: [
      ['line-1', '行首多出"第一"：第一才學識三者……'],
      ['line-7', '行首多出"一"：一夫劉氏以謂……'],
      ['line-8', '行首多出"一"：一欲於記誦之間……'],
    ],
  },
  {
    title: '版面归属判错',
    why: '版面检测找到了这些区域，却把类别判错了：书口和页码被当作正文行读出、排在最后；行旁的专名线与标点被判成日文排版里的"振假名"。',
    items: [
      ['line-10', '左缘书口"文史通義 史德"读成正文行：文史通義史徳一百四十一'],
      ['line-11', '页码"一百四十一"又单独读成一行正文'],
      ['rubi', ''],
    ],
  },
];

// 教师本机原件（上海书店 1988 年影印本，印刷页 63），与讲义 @fig-shide 一致。
const LOCAL_ISSUES = [
  { title: '字认错', why: '形近字读错，改变文义；用原句检索会找不到。', items: [['', '足盡其理 → 足姦其理'], ['', '心術 → 心衛'], ['', '盡其天而不益以人 → 蓋其天而不盆以人']] },
  { title: '字形被换', why: '原页的旧字形被输出成日本通行字形。', items: [['', '德 → 徳'], ['', '斷 → 断'], ['', '當 → 当']] },
  { title: '版面读错', why: '书口与页码被当作正文的最后两行。', items: [['', '文史通義卷三內篇三 → 文史通義卷三内篇三'], ['', '六十三（页码）']] },
  { title: '整类信息消失', why: '原页每句末的句读圈点，在识读结果中一个也没有留下。', items: [] },
];

const textLines = r => (r?.regions || []).filter(x => x.text != null).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Long vertical lines are cut into a few equal pieces; each piece of the page sits beside the same share of the text.
function pairs(im, box, text) {
  const chars = [...text], n = chars.length, k = n > 24 ? 3 : n > 10 ? 2 : 1, step = Math.ceil(n / k);
  const vertical = box[3] >= box[2];
  const cells = [];
  for (let i = 0; i < k; i++) {
    const a = i * step, b = Math.min(n, a + step);
    if (a >= n) break;
    const seg = vertical
      ? [box[0], box[1] + box[3] * a / n, box[2], box[3] * (b - a) / n]
      : [box[0] + box[2] * a / n, box[1], box[2] * (b - a) / n, box[3]];
    cells.push(`<div class="d01-seg" style="--chars:${step}">
      ${cropSVGMarkup(im, seg.map(v => Math.round(v)), { className: 'd01-crop', label: '原页裁切第 ' + (i + 1) + ' 段' })}
      <p class="d01-vtext">${chars.slice(a, b).map(c => E(c)).join('')}</p>
    </div>`);
  }
  return `<div class="d01-pair ${vertical ? '' : 'h'}">${cells.join('')}</div>
    <p class="caption">每一段左为原页、右为识读文字；按字数平均切段，只为对读方便，原页与文字不一定逐字对齐。</p>`;
}

function compare(l, r, lines) {
  if (!r || !state.material) return '<p class="empty-state">需本机材料；或在"材料与记录"中选择公开《史德》</p>';
  const id = lines.some(x => x.id === l.v.d01Line) ? l.v.d01Line : lines[0]?.id;
  const k = lines.findIndex(x => x.id === id), x = lines[k];
  if (!x) return '<p class="empty-state">这份记录没有文字行</p>';
  const box = regionBBox(x), im = { ...state.material.image, url: state.material.dataUrl };
  const marked = (l.v.found || []).includes(x.id);
  return `<div class="d01-nav">
      <button data-d01-go="${k - 1}" ${k <= 0 ? 'disabled' : ''}>← 上一行</button>
      <b>第 ${k + 1} / ${lines.length} 行</b>
      <button data-d01-go="${k + 1}" ${k >= lines.length - 1 ? 'disabled' : ''}>下一行 →</button>
      <button class="d01-mark ${marked ? 'on' : ''}" data-d01-mark="${E(x.id)}">${marked ? '✓ 已标为"有不同"' : '这一行有不同'}</button>
    </div>
    ${pairs(im, box, x.text)}
    <p class="caption">${E(x.id)} · ${E(x.class)} · 检测分数 ${x.det_score == null ? '—' : Number(x.det_score).toFixed(3)} · [${box.map(Math.round).join(', ')}]</p>
    <details class="d01-all" data-open-key="d01All" ${l.v.d01All ? 'open' : ''}><summary>全部 ${lines.length} 行</summary>
      ${lines.map((y, i) => `<button class="d01-line ${y.id === x.id ? 'on' : ''} ${(l.v.found || []).includes(y.id) ? 'marked' : ''}" data-d01-go="${i}"><span>${i + 1}</span>${E(y.text)}</button>`).join('')}
    </details>`;
}

function issues(l, r, local) {
  const tab = l.v.d01Tab || 'mine';
  const found = (l.v.found || []).map(id => textLines(r).find(x => x.id === id)).filter(Boolean);
  const mine = `<p>对照原页与识读文字，在中栏把有不同的行标出来。先不要翻开"四类问题"。</p>
    <p class="d01-count">已标出 <b>${found.length}</b> 行</p>
    ${found.map(x => `<button class="d01-line marked" data-d01-id="${E(x.id)}">${E(x.text)}</button>`).join('')}
    ${found.length ? '<button data-d01-clear>清空标记</button>' : ''}`;
  const set = local ? LOCAL_ISSUES : PUBLIC_ISSUES;
  const rubi = (r?.regions || []).filter(x => /rubi/.test(x.class)).length;
  const reveal = `<p class="caption">${local ? '上海书店 1988 年影印本，NDL 系识读工具旧输出（讲义 @fig-shide）；备课目验，待核（V-02）。' : `1926 年商务印书馆本首页，${E(r?.engine.name || '')} ${E((r?.engine.date || '').slice(0, 10))} 的一次实际运行，未经人工校定。错字据页影目验，候选。`}</p>
    ${set.map((g, i) => `<section class="d01-issue"><h4><span>${i + 1}</span>${E(g.title)}</h4><p>${E(g.why)}</p>
      ${g.items.map(([id, s]) => id === 'rubi' ? (rubi ? `<button data-d01-rubi>行旁窄条被判为振假名（block_rubi）：${rubi} 处 · 在原页上显示</button>` : '') : id ? `<button data-d01-id="${E(id)}">${E(s)}</button>` : `<p class="d01-ex">${E(s)}</p>`).join('')}
    </section>`).join('')}
    <p class="d01-tail">这四类分别对应后面各节：字形与认字是"读得准"（第二节），版面归属与读序是"看得见、排得对"（第一节），标点和专名线的去留取决于录文规范（第五节）。</p>`;
  return tabs('d01Tab', [['mine', '我找到的'], ['reveal', '揭示四类问题']], tab) + `<div class="d01-tab">${tab === 'reveal' ? reveal : mine}</div>`;
}

export function renderD01(l) {
  const r = S.recordForPage('D01', l.v), lines = textLines(r);
  const local = state.material?.image.source.material_id === 'shide';
  const pub = state.material?.image.source.material_id === 'shide_public';
  const toggle = pub ? `<label class="check-row"><input type="checkbox" data-k="ndlPreview" ${l.v.ndlPreview ? 'checked' : ''}>显示 NDLOCR-Lite 实际记录（取消则显示 PP-OCRv6 记录）</label>` : '';
  return shell({
    id: 'D01',
    question: l.p.question,
    lead: '左栏看原页，中栏逐行把原图和识读文字并排比对，右栏记下发现，最后揭示四类问题。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料') + (r ? ' · ' + r.engine.name : ''), toggle + l.materialPanel(r)),
    cols: l.v.v5Cols || [1.25, 1.1, 1],
    panes: [
      pane({ key: 'page', kicker: 'A', title: '原页', body: `<page-overlay data-overlay="main" sync-group="week06-same-line"></page-overlay>` }),
      pane({ key: 'compare', kicker: 'B', title: '逐行对照', body: compare(l, r, lines) }),
      pane({ key: 'issues', kicker: 'C', title: '找到的不同', body: issues(l, r, local) }),
    ],
  });
}

export function hydrateD01(l) {
  hydrateShell(l);
  const r = S.recordForPage('D01', l.v), lines = textLines(r);
  const overlay = l.querySelector('page-overlay[data-overlay="main"]');
  const pick = id => {
    l.v.d01Line = id;
    l.persist();
    l.render();
  };
  for (const b of l.querySelectorAll('[data-d01-go]')) b.onclick = () => { const x = lines[+b.dataset.d01Go]; if (x) pick(x.id); };
  for (const b of l.querySelectorAll('[data-d01-id]')) b.onclick = () => pick(b.dataset.d01Id);
  for (const b of l.querySelectorAll('[data-d01-mark]')) b.onclick = () => {
    const id = b.dataset.d01Mark, f = (l.v.found ||= []);
    const i = f.indexOf(id);
    if (i < 0) f.push(id); else f.splice(i, 1);
    l.persist(); l.render();
  };
  const clear = l.querySelector('[data-d01-clear]');
  if (clear) clear.onclick = () => { l.v.found = []; l.persist(); l.render(); };
  const rubi = l.querySelector('[data-d01-rubi]');
  if (rubi && overlay) rubi.onclick = () => {
    for (const c of [...overlay.hiddenClasses]) overlay.hiddenClasses.delete(c);
    const classes = new Set((r?.regions || []).map(x => x.class));
    for (const c of classes) if (!/rubi/.test(c)) overlay.hiddenClasses.add(c);
    overlay.render();
  };
  // Keep the overlay selection in step with the line shown in the middle column.
  const id = lines.some(x => x.id === l.v.d01Line) ? l.v.d01Line : lines[0]?.id;
  if (overlay && id) requestAnimationFrame(() => overlay.select(0, id, false));
}
