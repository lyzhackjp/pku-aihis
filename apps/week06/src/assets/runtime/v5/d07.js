// D07 · 从切字到整行：CTC。两栏：左为通俗说法；右为原有的原理演示、实算、网络结构与手动序列（标签切换）。
import { shell, pane, sourceBar, hydrateShell, esc as E } from './layout.js';
import { ctcPage, runner, selectedRecord } from '../vision-pages.js';
import { state } from '../storage.js';

const PLAIN = `
<h4>先不切字，怎样读出一整行</h4>
<p>识读模型把一行字的图像，从头到尾切成许多等宽的窄条。窄条比字多得多：一个字往往跨好几条，两字之间还有空白。模型逐条判断"这一条是什么字"，可它事先并不知道哪几条属于同一个字。</p>
<h4>办法：多一个"空"</h4>
<p>给每一条多加一个选项"空"（blank，下文记作 －），意思是"这里不是字，或者是两字之间的间隔"。模型逐条给出最可能的字或"空"，再按两条规则合并：</p>
<ol>
  <li>相邻重复的合成一个：盡 盡 盡 → 盡；</li>
  <li>删去所有的"空"。</li>
</ol>
<p class="d07-ex">－ 盡 盡 － 其 其 理 －　→　盡其理</p>
<p>要表示两个相同的字连写，中间必须隔一个"空"：子 － 子 → 子子；若写成 子 子，就只剩一个"子"。</p>
<h4>为什么这样设计</h4>
<p>训练时只要整行的正确文字，不必有人标出每个字在图上的位置。CTC 把所有能合并成正确文字的走法的概率加在一起，训练就是让这个总和尽量大。这一套做法叫作联结时序分类（Connectionist Temporal Classification，CTC）。</p>
<h4>对读结果的影响</h4>
<ul>
  <li>不先切字，所以不会因为切字切错而读错；字距不匀、笔画相连也能读。</li>
  <li>每一条主要看自己附近的图像，所以相邻的笔画、污点会影响判断。</li>
  <li>行的识读分数由逐条概率算出，是模型自己的把握，不是"这一行读对了"的概率（2.2）。</li>
</ul>
<p class="d04-history"><b>对史学的意思</b>好比抄手看一行连写的草书：目光自上而下移动，每停一下，心里默念"这是某字""还是同一个字""这里是空隙"，最后把念重了的并成一个、把停顿去掉，写下这一行。他不必先拿刀把每个字裁开。</p>
`;

export function renderD07(l) {
  const r = selectedRecord(l, 'pp-ocrv6');
  return shell({
    id: 'D07',
    question: l.p.question,
    lead: '左栏是通俗说法；右栏先在"原理"里自己选一条路径看合并结果，再到"实算"看真实模型在一行上的逐条概率。',
    source: sourceBar('材料与记录：' + (state.material?.image.source.identity || '未选材料') + (r ? ' · ' + r.engine.name : ''), runner(l, r)),
    cols: l.v.v5Cols || [0.9, 2],
    panes: [
      pane({ key: 'plain', kicker: 'A', title: 'CTC 的通俗说法', body: `<div class="d07-plain">${PLAIN}</div>` }),
      pane({ key: 'lab', kicker: 'B', title: '演示与实算', body: `<div class="d07-lab">${ctcPage(l)}</div>` }),
    ],
  });
}

export function hydrateD07(l) {
  hydrateShell(l);
}
