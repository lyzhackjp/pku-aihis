// D15 · 八类干扰。三栏：八类各看一个真实例子｜选中一类：说明与实验｜最后才勾选自己材料的检查清单。
import { shell, pane, sourceBar, hydrateShell, esc as E } from './layout.js';
import { demo, checks } from '../material-pages.js';
import { runner } from '../vision-pages.js';
import { state } from '../storage.js';

const IMG = {
  shide: { file: 'shide-1926-p141.png', w: 893, h: 1263, label: '《文史通義》1926 年商务印书馆本' },
  p2510: { file: 'p2510.jpg', w: 3568, h: 1812, label: '敦煌写本 P.2510《論語》鄭玄注' },
  p2011: { file: 'p2011.jpg', w: 1395, h: 1024, label: '敦煌写本 P.2011《刊謬補缺切韻》' },
  tamagaki: { file: 'tamagaki-0001.jpg', w: 3316, h: 2647, label: '東寺百合文書「たまかき書状」' },
};

// 每一类配一处公开材料上的真实位置；"模拟"者明说是对公开扫描的处理。
const EXAMPLES = [
  { shots: [['p2011', [0, 0, 1, 1]], ['shide', [0.55, 0.15, 0.2, 0.25]]], note: '左：写本原件彩色拍摄，画面里还有色卡和比例尺；右：印本扫描后压成黑白两色。同是"一页"，得来的方式不同，模型看到的东西就不同。', page: 'D15' },
  { shots: [['shide', [0.55, 0.15, 0.2, 0.25], 'rotate']], note: '模拟：把同一块公开扫描转 6° 并加一点透视。拍摄时书页没放平、相机没对正，行就不再是直的。', page: 'D15' },
  { shots: [['shide', [0.55, 0.15, 0.2, 0.25]], ['p2510', [0.62, 0.05, 0.2, 0.4]]], note: '两页都是竖排、从右往左。多数识读模型的"行"默认是横的：Kraken 默认分割模型要先把整页转 90° 才找得到行（D04）。', page: 'D17' },
  { shots: [['shide', [0.66, 0.225, 0.045, 0.06], 'pixel']], note: '放大到像素：这页扫描只剩黑白两色，笔画边缘成了锯齿，细笔画断开。分辨率、模糊、压缩都会让字形丢掉细节。', page: 'D16' },
  { shots: [['p2011', [0.38, 0.7, 0.38, 0.27]]], note: 'P.2011 下缘残破，缺字处露出衬底；右下角钤收藏印，印文压在字上。', page: 'D16' },
  { shots: [['tamagaki', [0.3, 0.25, 0.42, 0.42]]], note: '室町时代书状，假名草书连绵，笔画省减到只剩轮廓。为近代印刷体训练的模型，几乎认不出这种书体。', page: 'D18' },
  { shots: [['p2510', [0.77, 0.08, 0.17, 0.85]]], note: '正文大字之间夹着双行小注：两行小字占一行正文的位置。模型要么把小注并进正文，要么漏掉（D04 的分割结果里也能看到）。', page: 'D17' },
  { shots: [['shide', [0.765, 0.285, 0.05, 0.04], 'glyph']], note: '标题的"德"是旧字形。字表里"德""徳"都有，模型选哪一个取决于训练材料里哪个常见（D08）；生僻字、异体字、缩写也属这一类。', page: 'D18' },
];

function shot([key, b, mode]) {
  const im = IMG[key], x = b[0] * im.w, y = b[1] * im.h, w = b[2] * im.w, h = b[3] * im.h;
  const style = mode === 'rotate' ? 'transform:perspective(500px) rotate(6deg) rotateY(-12deg);' : '';
  return `<svg class="d15-shot ${mode || ''}" viewBox="${x} ${y} ${w} ${h}" style="aspect-ratio:${w}/${h};${style}" role="img" aria-label="${E(im.label)}"><image href="assets/materials/${E(im.file)}" width="${im.w}" height="${im.h}" ${mode === 'pixel' ? 'style="image-rendering:pixelated"' : ''}/></svg>`;
}

function gallery(cats, sel) {
  return `<div class="d15-gallery">${cats.map((c, i) => `<button class="d15-card ${i === sel ? 'on' : ''}" data-d15="${i}">
    <div class="d15-shots">${EXAMPLES[i].shots.map(shot).join('')}${i === 7 ? '<span class="d15-glyphs">德<i>徳</i></span>' : ''}</div>
    <span class="d15-name"><b>${i + 1}</b>${E(c.name)}</span>
  </button>`).join('')}</div>`;
}

function detail(l, cats, i) {
  const c = cats[i], ex = EXAMPLES[i];
  return `<h4 class="d15-title"><b>${i + 1}</b>${E(c.name)}</h4>
    <p class="d15-def">包括：${E(c.definition)}</p>
    <div class="d15-big">${ex.shots.map(shot).join('')}</div>
    <p>${E(ex.note)}</p>
    <p class="caption">${ex.shots.map(s => E(IMG[s[0]].label)).filter((v, k, a) => a.indexOf(v) === k).join('；')}。公开材料，见"材料与记录"中的来源与许可。</p>
    ${ex.page === 'D15' ? `<h4 class="d08-h">在这页上试</h4><div class="d15-demo">${demo(l, i)}</div>` : `<p class="d15-next">这一类的实验在 <a href="#${ex.page}">${ex.page}</a>。</p>`}`;
}

export function renderD15(l) {
  const cats = l.p.ui_round2.categories, i = Math.min(7, +(l.v.d15Cat ?? 0));
  return shell({
    id: 'D15',
    question: l.p.question,
    lead: '先在左栏把八类干扰各看一眼真实的例子，中栏看选中一类的说明与实验，最后在右栏对照自己的材料勾选。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料'), runner(l) + '<ocr-import-panel></ocr-import-panel>'),
    cols: l.v.v5Cols || [1.15, 1.25, 0.8],
    panes: [
      pane({ key: 'gallery', kicker: 'A', title: '八类干扰，各看一例', body: gallery(cats, i) }),
      pane({ key: 'detail', kicker: 'B', title: '选中的一类', body: detail(l, cats, i) }),
      pane({ key: 'check', kicker: 'C', title: '我的材料：检查清单', body: `<p class="d08-note">看过例子之后，对照你自己的材料，勾选出现的类别并估计严重程度（0—3）。清单会带到 D18 与贯穿记录。</p>${checks(l)}<button data-act="export-checklist">导出检查清单</button>` }),
    ],
  });
}

export function hydrateD15(l) {
  hydrateShell(l);
  for (const b of l.querySelectorAll('[data-d15]')) b.onclick = () => { l.v.d15Cat = +b.dataset.d15; l.persist(); l.render(); };
}
