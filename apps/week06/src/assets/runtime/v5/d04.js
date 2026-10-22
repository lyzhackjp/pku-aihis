// D04 · 手写的行：Kraken 分割的五步，三栏版。
// 左栏：五步（通俗说法、图上看什么、史学类比）；中栏：在一页公开写本上逐步看真实追踪；右栏：原理、数据、网络结构、怎样运行。
// 中栏数据来自 tools/kraken-trace/export-d04.py 在公开图上的实际运行（assets/materials/kraken-d04/）。
import { shell, pane, tabs, sourceBar, hydrateShell, esc as E } from './layout.js';
import { viewer, hydrateViewer } from './viewer.js';

const STAGES = [
  {
    name: '像素标注',
    plain: '训练之前，人在许多页上画出每一行字的基线（字脚所在的那条线）、行的起点和终点，以及版面区域。程序把这些线加粗成约 8 像素宽的带子，变成一张张"答案图"。网络要学的，就是看到一页图，画出同样的答案图。',
    see: '把本页最终找到的基线，按 Kraken 训练时的做法画成"答案图"的样子：红带是基线，绿点是行首，紫点是行尾。这只是示意；真正训练用的是人工画的线，不是本页的结果。',
    history: '标注规范决定模型"认为什么算一行"：夹注、批注、印章、页码算不算单独的行，全由标注者的凡例决定，模型照学。用别人训练的模型，等于接受别人的凡例。',
    box: [270, 322, 170, 108],
  },
  {
    name: '热图',
    plain: '网络对页上每一个点打分：这里像不像基线？像不像行首、行尾？像不像正文区域？分数从 0 到 1，越亮越像。每一类问题各出一张图，称为一个"通道"。',
    see: '选一个通道，亮处是网络认为"是"的地方。鼠标停在图上，可看该点的分数。此时还只是一片片亮带，没有"第几行"的概念。',
    history: '好比先用荧光笔在影印件上涂出"像是一行字"的地方，涂得有深有浅：墨色淡、纸面污损、行间夹写小字处，涂色就淡，或者涂到了邻行。',
    box: [466, 56, 172, 600],
  },
  {
    name: '基线矢量化',
    plain: '把亮带"描"成一条条折线，每条就是一行的基线，再参照行首、行尾两个通道定出从哪头读起。多亮才算一条线，由阈值决定，默认 0.17。',
    see: '红线是基线，圆点是行首。切换阈值看行数怎样变：阈值低，一行描得更完整，但相邻的双行小注可能并成一条；阈值高，只留下响应最强的一段，一行被切成几截，淡墨的行整条漏掉。',
    history: '这一步决定"这一页有几行"。行数一错，后面的录文分行、按行号引用都跟着错。',
    box: [716, 490, 168, 112],
  },
  {
    name: '外框多边形',
    plain: '沿每条基线向上下扩展，顺着笔画边缘画出包住整行的不规则轮廓。之后识读模型只看轮廓里面的像素。',
    see: '蓝色轮廓逐条出现，可拖动滑块一条一条看。注意轮廓有没有吞进邻行的笔画，或者把一行的上半截切掉。',
    history: '写本行距不匀、行间常有旁注小字。轮廓吞进邻行，识读结果就会混入别行的字，而且在录文里看不出来。',
    box: [1078, 488, 168, 112],
  },
  {
    name: '阅读顺序',
    plain: '把找到的行排出先后，文字才能连成一篇。默认规则只看各行在页上的位置。',
    see: '编号和橙色连线是程序排出的顺序。竖排右起、双行夹注、批注、天头地脚，都可能排错。',
    history: '先读哪一行、批注插在哪里，是编辑判断，不是几何问题。导出的 PAGE-XML 里的行序，必须人工核对。',
    box: [1428, 488, 168, 112],
  },
];

const THRESHOLDS = ['0.1', '0.17', '0.3'];

async function loadTraces(l) {
  if (l.d04 || l.d04Loading) return;
  l.d04Loading = true;
  try {
    const index = await (await fetch('assets/materials/kraken-d04/index.json')).json();
    l.d04 = { index, traces: {} };
    for (const item of index.materials) {
      l.d04.traces[item.id] = await (await fetch(`assets/materials/kraken-d04/${item.id}/trace-web.json`)).json();
    }
  } catch (e) {
    l.d04 = { error: '未能载入课前追踪数据：' + e.message };
  } finally {
    l.d04Loading = false;
    l.render();
  }
}

function stageList(i) {
  const map = `<figure class="d04-map">
    <div class="d04-map-frame">
      <img src="assets/materials/figure-1.png" alt="Kraken 官方流程图">
      <svg viewBox="0 0 1600 690" preserveAspectRatio="none">${STAGES.map((s, k) =>
        `<rect x="${s.box[0]}" y="${s.box[1]}" width="${s.box[2]}" height="${s.box[3]}" class="${k === i ? 'on' : ''}" data-d04-stage="${k}"></rect>`).join('')}</svg>
    </div>
    <figcaption>Kraken 官方流程图（Apache-2.0）。红框是当前一步；可直接点框切换。</figcaption>
  </figure>`;
  const cards = STAGES.map((s, k) => `<article class="d04-stage ${k === i ? 'on' : ''}">
    <button data-d04-stage="${k}"><b>${k + 1}</b>${E(s.name)}</button>
    ${k === i ? `<p>${E(s.plain)}</p><p class="d04-history"><b>对史学的意思</b>${E(s.history)}</p>` : ''}
  </article>`).join('');
  return map + cards;
}

function centerPane(l, i) {
  if (!l.d04) return '<p class="empty-state">正在载入课前追踪……</p>';
  if (l.d04.error) return `<p class="empty-state">${E(l.d04.error)}</p>`;
  const ids = l.d04.index.materials.map(m => [m.id, m.label]);
  const mat = l.v.d04Mat && l.d04.traces[l.v.d04Mat] ? l.v.d04Mat : ids[0][0];
  const t = l.d04.traces[mat];
  const thr = THRESHOLDS.includes(l.v.d04Thr) ? l.v.d04Thr : '0.17';
  const lines = t.thresholds[thr].lines;
  const W = t.image.width, H = t.image.height;
  let controls = '';
  if (i === 1) {
    const ch = +(l.v.d04Ch ?? t.default_channel);
    controls = `<label>通道<select data-d04="ch">${t.channels.map(c => `<option value="${c.index}" ${c.index === ch ? 'selected' : ''}>${E(c.label)}</option>`).join('')}</select></label>
      <label>热图浓度<input type="range" min="0" max="100" value="${l.v.d04Alpha ?? 75}" data-d04="alpha"></label>
      <span class="d04-readout" data-d04-readout>鼠标停在图上看分数</span>`;
  }
  if (i === 2) {
    controls = `<span>阈值</span>${THRESHOLDS.map(x => `<button data-d04-thr="${x}" class="${x === thr ? 'on' : ''}">${x}${x === '0.17' ? '（默认）' : ''} · ${t.thresholds[x].lines.length} 行</button>`).join('')}`;
  }
  if (i === 3) {
    const n = Math.min(lines.length, l.v.d04Count ?? lines.length);
    controls = `<label>显示前 <output data-d04-count-out>${n}</output> / ${lines.length} 条<input type="range" min="1" max="${lines.length}" value="${n}" data-d04="count"></label>`;
  }
  const layers = `<img src="assets/materials/${E(t.image.file)}" alt="${E(t.image.label)}" draggable="false">
    <canvas class="d04-heat" data-d04-heat width="${t.heat_size[0]}" height="${t.heat_size[1]}" style="width:${W}px;height:${H}px"></canvas>
    <svg class="d04-svg" viewBox="0 0 ${W} ${H}" data-d04-svg></svg>`;
  return `<div class="d04-center">
    <p class="d04-see"><b>第 ${i + 1} 步 · ${E(STAGES[i].name)} · 图上看什么</b>${E(STAGES[i].see)}</p>
    <div class="d04-controls"><span class="d04-mat">${tabs('d04Mat', ids, mat)}</span>${controls}</div>
    ${viewer('d04-' + mat, { w: W, h: H, layers })}
    <details class="d04-about" data-open-key="d04About"><summary>这页材料与这次运行：${E(t.note.split('。')[0])}。</summary>
      <p>${E(t.note)}</p>
      <p class="caption">${E(t.image.label)} · ${E(t.image.rights)}。Kraken ${E(t.revision.slice(0, 7))} 默认分割模型 blla.mlmodel（DOI ${E(t.model.doi)}），${E(t.direction_label)}，${E(t.run.date)} 在 CPU 上实际运行，用时 ${(t.run.elapsed_ms / 1000).toFixed(1)} 秒。候选，未经教师确认。</p>
    </details>
  </div>`;
}

function rightPane(l, i) {
  const r2 = l.p.ui_round2, s = r2.stages[i];
  const tab = l.v.d04Tab || 'principle';
  const t = l.d04?.traces?.[l.v.d04Mat] || Object.values(l.d04?.traces || {})[0];
  let body = '';
  if (tab === 'principle') {
    body = `<h4>${E(s.name)}：程序实际做了什么</h4><p>${E(s.principle)}</p><p class="caption">源码位置：${E(s.source)}</p>`;
  }
  if (tab === 'data') {
    body = `<h4>这一步的输入与输出</h4><p class="d04-io">${E(s.data)}</p>${t ? `<h4>本页这次运行</h4><table class="d04-table">
      <tr><td>输入尺寸</td><td>${t.image.width} × ${t.image.height}</td></tr>
      <tr><td>网络缩放</td><td>高 1800（VGSL 第一层规定）</td></tr>
      <tr><td>热图</td><td>${t.channels.length} 个通道 × ${t.heat_net_size[1]} × ${t.heat_net_size[0]}</td></tr>
      ${THRESHOLDS.map(x => `<tr><td>阈值 ${x}</td><td>${t.thresholds[x].lines.length} 行</td></tr>`).join('')}
      ${Object.entries(t.run.timings_ms || {}).map(([k, v]) => `<tr><td>${E(k)}</td><td>${Math.round(v)} ms</td></tr>`).join('')}
    </table>` : ''}`;
  }
  if (tab === 'net') {
    body = `<h4>分割网络的写法（VGSL）</h4><pre class="d04-spec">${E(r2.spec)}</pre>
      <p>VGSL 用一串短符号写出网络的层次：每一段是一层。读法见下表。</p>
      <table class="d04-table">${r2.layers.map(x => `<tr><td><code>${E(x[0])}</code></td><td>${E(x[1])}</td></tr>`).join('')}</table>
      <p class="caption">${E(r2.paper)}</p>`;
  }
  if (tab === 'run') {
    body = `<h4>自己在电脑上跑一遍</h4><pre class="d04-spec">${E(r2.commands)}</pre>
      <p>第一条只做分割，输出 PAGE-XML；第二条接着用识读模型认字，识读模型需按书体另选。第三条是本页数据的生成脚本，会另存热图与每一步的中间结果。</p>
      <p>Transkribus 等平台把同样的两步（分割、识读）放在网页界面里；导出的 PAGE-XML 可在本课件"材料与保存记录"中导入，与本页对照。</p>`;
  }
  return tabs('d04Tab', [['principle', '原理与源码'], ['data', '数据进出'], ['net', '网络结构'], ['run', '怎样运行']], tab) + `<div class="d04-tabbody">${body}</div>`;
}

export function renderD04(l) {
  if (!l.d04) loadTraces(l);
  const i = Math.min(4, +(l.v.krakenStep || 0));
  return shell({
    id: 'D04',
    question: l.p.question,
    lead: '左栏选一步，中栏在一页公开写本上看这一步的真实结果，右栏查原理与数据。',
    source: sourceBar('本页说明', `<p>${E(l.p.mode)}</p><p>${E(l.p.lesson_evidence)}</p><p>${E(l.p.ui.limitation)}</p>`),
    cols: l.v.v5Cols || [1, 2.1, 1.2],
    panes: [
      pane({ key: 'steps', kicker: 'A', title: '五步', body: stageList(i) }),
      pane({ key: 'page', kicker: 'B', title: `在页上看：${STAGES[i].name}`, body: centerPane(l, i), cls: 'v5-pane-wide' }),
      pane({ key: 'detail', kicker: 'C', title: '原理与数据', body: rightPane(l, i) }),
    ],
  });
}

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (name, attrs) => { const n = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
const pts = a => a.map(p => p.join(',')).join(' ');

function drawSvg(l, svg, t, i) {
  svg.replaceChildren();
  const thr = THRESHOLDS.includes(l.v.d04Thr) ? l.v.d04Thr : '0.17';
  const lines = t.thresholds[i === 2 ? thr : '0.17'].lines;
  const sw = Math.max(2, Math.max(t.image.width, t.image.height) / 600);
  if (i === 0) {
    // Training target sketch: thick baseline bands, start and end markers.
    // Kraken draws training targets 8 px wide at network scale (the network sees the page 1800 px tall).
    const band = 8 * (t.rotated ? t.image.width : t.image.height) / 1800;
    for (const ln of lines) {
      svg.append(svgEl('polyline', { points: pts(ln.baseline), class: 'd04-band', 'stroke-width': band }));
      const a = ln.baseline[0], b = ln.baseline[ln.baseline.length - 1];
      svg.append(svgEl('circle', { cx: a[0], cy: a[1], r: band * 0.9, class: 'd04-start' }));
      svg.append(svgEl('circle', { cx: b[0], cy: b[1], r: band * 0.9, class: 'd04-end' }));
    }
  }
  if (i === 2) {
    for (const ln of lines) {
      svg.append(svgEl('polyline', { points: pts(ln.baseline), class: 'd04-base', 'stroke-width': sw }));
      const a = ln.baseline[0];
      svg.append(svgEl('circle', { cx: a[0], cy: a[1], r: sw * 2.2, class: 'd04-start' }));
    }
  }
  if (i === 3) {
    const n = Math.min(lines.length, l.v.d04Count ?? lines.length);
    lines.slice(0, n).forEach((ln, k) => {
      const poly = svgEl('polygon', { points: pts(ln.polygon), class: 'd04-poly' + (k === n - 1 ? ' last' : ''), 'stroke-width': sw });
      poly.append(svgEl('title', {}));
      poly.lastChild.textContent = `第 ${k + 1} 条`;
      svg.append(poly);
      svg.append(svgEl('polyline', { points: pts(ln.baseline), class: 'd04-base thin', 'stroke-width': sw / 2 }));
    });
  }
  if (i === 4) {
    const centers = [];
    for (const ln of lines) {
      svg.append(svgEl('polygon', { points: pts(ln.polygon), class: 'd04-poly faint', 'stroke-width': sw / 2 }));
      centers.push(ln.baseline[0]);
    }
    svg.append(svgEl('polyline', { points: pts(centers), class: 'd04-order', 'stroke-width': sw * 1.4 }));
    centers.forEach((c, k) => {
      svg.append(svgEl('circle', { cx: c[0], cy: c[1], r: sw * 6, class: 'd04-num-bg' }));
      const tx = svgEl('text', { x: c[0], y: c[1], class: 'd04-num', 'font-size': sw * 7 });
      tx.textContent = k + 1;
      svg.append(tx);
    });
  }
}

const heatCache = new Map();
async function heatData(url) {
  if (!heatCache.has(url)) {
    heatCache.set(url, (async () => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, c.width, c.height);
    })());
  }
  return heatCache.get(url);
}

async function drawHeat(l, canvas, t, i, readout, view) {
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (i !== 1) { canvas.hidden = true; return; }
  canvas.hidden = false;
  const ch = t.channels.find(c => c.index === +(l.v.d04Ch ?? t.default_channel)) || t.channels[0];
  const src = await heatData(`assets/materials/kraken-d04/${t.id}/${ch.file}`);
  const out = g.createImageData(src.width, src.height);
  for (let p = 0; p < src.data.length; p += 4) {
    const v = src.data[p] / 255;
    // Transparent where the network says "no"; yellow → red as the score rises.
    out.data[p] = 255; out.data[p + 1] = Math.round(230 * (1 - v)); out.data[p + 2] = 0; out.data[p + 3] = Math.round(255 * Math.min(1, v * 1.4));
  }
  g.putImageData(out, 0, 0);
  canvas.style.opacity = (l.v.d04Alpha ?? 75) / 100;
  view.stage.onpointermove = e => {
    const [x, y] = view.toImage(e.clientX, e.clientY);
    if (x < 0 || y < 0 || x >= t.image.width || y >= t.image.height) { readout.textContent = '鼠标停在图上看分数'; return; }
    const hx = Math.floor(x / t.image.width * src.width), hy = Math.floor(y / t.image.height * src.height);
    readout.textContent = `该点分数 ≈ ${(src.data[(hy * src.width + hx) * 4] / 255).toFixed(2)}`;
  };
}

export function hydrateD04(l) {
  hydrateShell(l);
  for (const b of l.querySelectorAll('[data-d04-stage]')) {
    b.addEventListener('click', () => { l.v.krakenStep = +b.dataset.d04Stage; l.persist(); l.render(); });
  }
  for (const b of l.querySelectorAll('[data-d04-thr]')) {
    b.onclick = () => { l.v.d04Thr = b.dataset.d04Thr; l.persist(); l.render(); };
  }
  if (!l.d04?.traces) return;
  const ids = Object.keys(l.d04.traces);
  const mat = l.d04.traces[l.v.d04Mat] ? l.v.d04Mat : ids[0];
  const t = l.d04.traces[mat];
  const i = Math.min(4, +(l.v.krakenStep || 0));
  const view = hydrateViewer(l, 'd04-' + mat);
  const svg = l.querySelector('[data-d04-svg]'), canvas = l.querySelector('[data-d04-heat]'), readout = l.querySelector('[data-d04-readout]');
  if (!view || !svg) return;
  drawSvg(l, svg, t, i);
  drawHeat(l, canvas, t, i, readout, view).catch(e => { if (readout) readout.textContent = e.message; });
  for (const n of l.querySelectorAll('[data-d04]')) {
    n.oninput = () => {
      const k = n.dataset.d04;
      if (k === 'alpha') { l.v.d04Alpha = +n.value; canvas.style.opacity = n.value / 100; }
      if (k === 'count') { l.v.d04Count = +n.value; l.querySelector('[data-d04-count-out]').textContent = n.value; drawSvg(l, svg, t, i); }
      if (k === 'ch') { l.v.d04Ch = +n.value; drawHeat(l, canvas, t, i, readout, view); }
      l.persist();
    };
  }
}
