/* 第八周页面组件（四）：D14、D15、D16、D17、D18、D19、D21、D22。依赖 deck-core.js、week08-core.js、week08-labs.js（W8L）。
 * 地图只用 Natural Earth 海岸线作离线底图（公有领域，不画国界与政区界）；地名候选来自 CHGIS TGAZ 公开接口（浏览器在线查询，或本机材料包中的查询快照）。 */
(() => {
  'use strict';
  const { esc, store, pageById, pageLink, download, flowShell, rerender, register } = window.Deck;
  const W = window.W8;
  const { Lab, seg, f2 } = window.W8L;
  const PUB = () => W.Pack.pub() || {};
  const LX = () => W.Pack.local()?.extra || null;

  /* ================= 地图工具 ================= */
  const R_EARTH = 6371;
  const hav = (a, b) => { const r = Math.PI / 180, dl = (b[1] - a[1]) * r, dg = (b[0] - a[0]) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dg / 2) ** 2; return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(x))); };
  /* WGS 84 → GCJ-02（国内地图服务通行的加偏算法，公开实现的常见写法；境外不加偏） */
  function wgs2gcj(lng, lat) {
    if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lng, lat];
    const a = 6378245.0, ee = 0.00669342162296594323, PI = Math.PI;
    const tl = (x, y) => -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x)) + (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3 + (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3 + (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
    const tg = (x, y) => 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x)) + (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3 + (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3 + (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
    let dLat = tl(lng - 105, lat - 35), dLng = tg(lng - 105, lat - 35); const rad = lat / 180 * PI; let m = Math.sin(rad); m = 1 - ee * m * m; const s = Math.sqrt(m);
    dLat = (dLat * 180) / ((a * (1 - ee)) / (m * s) * PI); dLng = (dLng * 180) / (a / s * Math.cos(rad) * PI);
    return [lng + dLng, lat + dLat];
  }
  const okCoord = (p) => Number.isFinite(p?.lng) && Number.isFinite(p?.lat) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && p.lng !== 0 && p.lat !== 0;
  function fitBox(pts, pad = 1.5, min = 6) {
    const v = pts.filter(okCoord); if (!v.length) return [100, 18, 125, 45];
    let x0 = Math.min(...v.map((p) => p.lng)), x1 = Math.max(...v.map((p) => p.lng)), y0 = Math.min(...v.map((p) => p.lat)), y1 = Math.max(...v.map((p) => p.lat));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = Math.max(min, x1 - x0 + 2 * pad), sy = Math.max(min * 0.7, y1 - y0 + 2 * pad);
    return [cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2];
  }
  /* 等距圆柱投影，按中纬度的余弦校正东西比例。points：{id,lng,lat,label,r_km,color,ring}；arrows：[[from,to,color]] */
  function mapSvg(points, { w = 520, h = 380, bbox = null, labels = true, arrows = [], key = '', alpha = 0.85, dot = 4, coast = true } = {}) {
    const B = bbox || fitBox(points); const [x0, y0, x1, y1] = B; const k = Math.cos(((y0 + y1) / 2) * Math.PI / 180);
    const sx = w / ((x1 - x0) * k), sy = h / (y1 - y0), s = Math.min(sx, sy);
    const ox = (w - (x1 - x0) * k * s) / 2, oy = (h - (y1 - y0) * s) / 2;
    const P = (lng, lat) => [ox + (lng - x0) * k * s, oy + (y1 - lat) * s];
    const kmPx = s / 111;
    // 视野伸到南海时，北纬 20° 以南的海岸线不画：这一精度的 Natural Earth 海岸线不含南海诸岛，画出来会被看作漏绘（讲义 4.4 审图号）
    const scs = coast && y0 < 20 && x1 > 108 && x0 < 122;
    const lines = coast ? (PUB().basemap?.coast || []).filter((l) => l.some(([a, b]) => a >= x0 - 2 && a <= x1 + 2 && b >= y0 - 2 && b <= y1 + 2)).map((l) => `<polyline points="${l.map(([a, b]) => P(a, b).map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`).join('') : '';
    const pts = points.filter(okCoord).map((p) => { const [x, y] = P(p.lng, p.lat); return `<g class="mpt" data-pt="${esc(p.id ?? '')}">${p.r_km ? `<circle class="err" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(2, p.r_km * kmPx).toFixed(1)}"/>` : ''}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${p.size || dot}" fill="${p.color || '#164ec7'}" fill-opacity="${alpha}" ${p.ring ? 'stroke="#a33" stroke-width="2"' : ''}><title>${esc(p.label || '')} ${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}</title></circle>${labels && p.label ? `<text x="${(x + 6).toFixed(1)}" y="${(y - 5).toFixed(1)}">${esc(p.label)}</text>` : ''}</g>`; }).join('');
    const arr = arrows.filter(([a, b]) => okCoord(a) && okCoord(b)).map(([a, b, c]) => { const [xa, ya] = P(a.lng, a.lat), [xb, yb] = P(b.lng, b.lat); return `<line x1="${xa.toFixed(1)}" y1="${ya.toFixed(1)}" x2="${xb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="${c || '#a33'}" stroke-width="1.6" marker-end="url(#ah${key})"/>`; }).join('');
    // 比例尺：取 100、200、500、1000 公里中最接近图宽四分之一的
    const sc = [50, 100, 200, 500, 1000].reduce((a, b) => (Math.abs(b * kmPx - w / 4) < Math.abs(a * kmPx - w / 4) ? b : a));
    return `<svg class="mapsvg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="地图"><defs><marker id="ah${key}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#a33"/></marker></defs>
      <rect width="${w}" height="${h}" fill="#f7f9fa"/>${scs ? `<clipPath id="cl${key}"><rect width="${w}" height="${P(x0, 20)[1].toFixed(1)}"/></clipPath>` : ''}<g class="coast" ${scs ? `clip-path="url(#cl${key})"` : ''}>${lines}</g>${arr}${pts}
      <text x="${w - 8}" y="${h - 6}" text-anchor="end" class="mapnote">示意图：只画 Natural Earth 海岸线轮廓，不表示疆域${scs ? '；北纬 20° 以南不画' : ''}</text>
      <g class="scale"><line x1="12" y1="${h - 14}" x2="${12 + sc * kmPx}" y2="${h - 14}"/><text x="12" y="${h - 18}">${sc} 公里</text></g><text x="${w - 8}" y="14" text-anchor="end" class="north">↑北</text></svg>`;
  }

  /* 宽松解析模型回复中的 JSON：去掉代码围栏，取第一个“{”到最后一个“}”；截断时逐个补齐对象（与 scripts/run_llm_w8.py 的 parse_lenient 同理） */
  function lenientJSON(text, key) {
    const t = String(text || '').replace(/```(?:json)?/g, ''); const i = t.indexOf('{'); if (i < 0) return null;
    try { return JSON.parse(t.slice(i, t.lastIndexOf('}') + 1)); } catch { /* 截断 */ }
    const out = []; const re = /\{[^{}]*\}/g; let m; const body = t.slice(t.indexOf('[', i) + 1);
    while ((m = re.exec(body))) { try { out.push(JSON.parse(m[0])); } catch { /* 跳过残缺项 */ } }
    return out.length ? { [key]: out, truncated: true } : null;
  }
  /* 现场再跑一次：用“模型接入”中选定的引擎（API／本机服务，或浏览器内 Qwen3）发送与保存记录同一份提示词 */
  async function liveRerun(lab, run, key, btn) {
    if (!window.W8Live) { lab._liveErr = '浏览器内模型需经本机服务打开（file:// 下不可用）'; lab.render(); return; }
    btn.disabled = true; btn.textContent = '运行中…（' + window.W8Live.engineLabel() + '）';
    try { const r = await window.W8Live.chat([{ role: 'user', content: run.prompt }], { maxTokens: 2048, json: true }); const parsed = lenientJSON(r.text, key); lab._live = { parsed, raw: r.text, via: r.via, seconds: r.seconds, date: new Date().toLocaleString() }; lab._liveErr = parsed ? '' : '回复中没有可解析的 JSON，原文见下'; }
    catch (e) { lab._liveErr = String(e.message || e).slice(0, 240); }
    lab.render();
  }
  const liveBar = (lab) => `<p><button class="small" data-rerun="1">用模型现场再跑一次</button> <span class="sub">${window.W8Live ? '当前：' + esc(window.W8Live.engineLabel()) + '（在顶栏“模型接入”中切换）' : ''}</span>${lab._live ? ` <button class="small" data-rerun="back">回到保存的记录</button>` : ''}</p>${lab._liveErr ? `<p class="nil">${esc(lab._liveErr)}</p>${lab._live?.raw ? `<details><summary>模型原始回复</summary><pre class="code">${esc(lab._live.raw)}</pre></details>` : ''}` : ''}`;

  /* ================= CHGIS TGAZ：快照或在线查询 ================= */
  const TG = new Map();
  const tgKey = (n, yr) => `${n}|${yr || ''}`;
  function tgGet(n, yr) { const k = tgKey(n, yr); if (TG.has(k)) return TG.get(k); const snap = LX()?.tgaz?.results?.[k]; return snap || null; }
  async function tgFetch(n, yr) {
    const u = 'https://chgis.hudci.org/tgaz/placename?fmt=json&n=' + encodeURIComponent(n) + (yr ? '&yr=' + yr : '');
    const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); TG.set(tgKey(n, yr), j); return j;
  }
  let TGP = null;
  /* 本机快照中没有、也还没在线查过时，在后台把 D16 的全部地名查一遍（D16、D17、D18 共用）。 */
  function ensureTG(yr = '1050') {
    if (D16_ITEMS.some((it) => it.q.some((q) => tgGet(q, yr)))) return Promise.resolve(true);
    if (!TGP) TGP = (async () => { let ok = false; for (const it of D16_ITEMS) for (const q of it.q) for (const y of [yr, '']) { try { await tgFetch(q, y); ok = true; } catch { /* 离线 */ } } return ok; })();
    return TGP;
  }
  const parseXY = (s) => { const [x, y] = String(s || '').split(',').map(Number); return { lng: x, lat: y }; };
  function cands(item, yr) {
    const seen = new Map();
    for (const q of item.q) { const r = tgGet(q, yr); for (const p of r?.placenames || []) if (!seen.has(p.sys_id)) seen.set(p.sys_id, { ...p, ...parseXY(p['xy coordinates']), via: q }); }
    return [...seen.values()];
  }
  const TYPE_R = (t, obj) => (obj === 'POLYGON' ? 0 : /县|縣/.test(t) ? 5 : /州|府|军|軍|监|監/.test(t) ? 15 : /路|道/.test(t) ? 150 : 30);
  /* 史料中的地名：《宋史·王珪传》较长选段与练习材料二 */
  const D16_ITEMS = [
    { name: '成都', q: ['成都'], quote: '成都華陽人', src: '宋史', kind: '地名' }, { name: '華陽', q: ['華陽'], quote: '成都華陽人', src: '宋史', kind: '地名' },
    { name: '舒', q: ['舒州', '舒'], quote: '後徙舒', src: '宋史', kind: '地名' }, { name: '揚州', q: ['揚州'], quote: '通判揚州', src: '宋史', kind: '地名' },
    { name: '淮南', q: ['淮南'], quote: '王倫犯淮南', src: '宋史', kind: '地区' }, { name: '魏', q: ['魏', '大名'], prefer: '大名', hint: '“魏”指北宋北京大名府（唐魏州，时贾昌朝判大名府）：课件判断，待核；前缀“魏”带出的魏县、魏城县不是此地，所以初选改取“大名”查得的记录。', quote: '北使過魏', src: '宋史', kind: '地名（古称）' },
    { name: '開封', q: ['開封'], quote: '知開封府', src: '宋史', kind: '地名' }, { name: '靈武', q: ['靈武', '靈州'], quote: '久欲收靈武', src: '宋史', kind: '地名' },
    { name: '慶', q: ['慶州', '慶'], noDefault: true, hint: '“帥慶”指环庆路的庆州（今甘肃庆阳一带）。CHGIS 在 1050 年没有庆州的记录（不限年份只有隋唐的庆州，接口以简体“庆州”才查得到）；前缀“慶”带出的庆甸在云南、庆远府在广西，都不是此地，所以页面不作初选。', quote: '珪薦俞充帥慶', src: '宋史', kind: '地名（简称）' }, { name: '永樂', q: ['永樂'], quote: '永樂之敗', src: '宋史', kind: '地名（城寨）' },
    { name: '延安', q: ['延安'], quote: '請立延安郡王為太子', src: '宋史', kind: '封号中的地名' }, { name: '岐', q: ['岐'], quote: '封岐國公', src: '宋史', kind: '封号中的地名' },
    { name: '常州', q: ['常州'], quote: '終于常州之官第', src: '李氏墓志', kind: '地名' }, { name: '吳郡', q: ['吳郡', '蘇州'], quote: '歸祔于吴郡薦福山', src: '李氏墓志', kind: '地名（古称）' },
    { name: '薦福山', q: ['薦福山'], quote: '吴郡薦福山', src: '李氏墓志', kind: '山名' },
  ];
  /* 默认选定：查询年份内有效、点状、有坐标的第一条 */
  function defaultPick(item, yr) {
    if (item.noDefault) return '';
    const c = cands(item, yr).filter((p) => p['object type'] === 'POINT' && okCoord(p));
    return (item.prefer && c.find((p) => p.via === item.prefer) || c[0])?.sys_id || '';
  }
  function gazetteerRef(yr = '1050') {
    const st = store.get('w8/D16', {}); const out = {};
    for (const it of D16_ITEMS) { const id = st.pick?.[it.name] ?? defaultPick(it, st.yr ?? yr); const p = cands(it, st.yr ?? yr).find((x) => x.sys_id === id) || cands(it, '').find((x) => x.sys_id === id); if (p && okCoord(p)) out[it.name] = { ...p, item: it }; }
    return out;
  }

  /* ================= D14 核验网络结论 ================= */
  const D14_DIRS = [
    ['back', '回原文', '抽查若干条边，读出处原文：这条关系是什么性质，是否重复，是否同时代。', '“為Y作墓誌銘｜鄭戩”一条，原文是王珪为岳母李氏所作的墓志；周必大、樓鑰的“書跋”作于王珪身后近百年。', 'D23'],
    ['sens', '敏感性', '去掉某一类边、某一来源、某一时段，看结论是否还在。', '去掉纪念文字类 73 条后，只剩 24 条、19 人。', 'D01'],
    ['robust', '稳健性', '随机删去一定比例的边，看指标排名是否稳定。', '自我中心网络无须做；整体网络才有意义。本页第二栏在整体网络上做。', null],
    ['indep', '独立来源', '用另一种来源构建同一张网，看是否吻合。', '用《宋史》本传与他人文集中的往来对照；本页第三栏在一篇墓志上比“同篇共现”与“明载”。', 'D12'],
  ];
  /* 练习材料二（李氏墓志节录）中的人物与明载关系；同篇共现即两两连边 */
  const LISHI = {
    people: ['李氏', '鄭戩', '王珪', '民彛', '民初', '民秀', '民度', '民用', '吕公孺'],
    alias: { 鄭戩: '鄭文肅公', 王珪: '余' },
    stated: [['李氏', '鄭戩', '夫妻', '太尉鄭文肅公夫人李氏'], ...['民彛', '民初', '民秀', '民度', '民用'].map((x) => ['李氏', x, '母子', '子五人：' + x]),
      ['李氏', '王珪', '岳母与女婿', '長適翰林學士、起居舍人王珪'], ['李氏', '吕公孺', '岳母与女婿', '次適三司判官、祠部郎中吕公孺'], ['鄭戩', '王珪', '知遇；姻好', '余甞被文肅之知，又有姻好之舊']],
  };
  class VerifyLab extends Lab {
    defaults() { return { dir: 'robust', mat: 'wang2022-shenzong', p: '20', reps: '50', seed: '1', metric: 'deg', judge: '' }; }
    robust(m) {
      const g = W.graph(m, { directed: false }); const p = Number(this.s.p) / 100, reps = Number(this.s.reps), r = W.rng(Number(this.s.seed));
      const big = g.nodes.length > 400, metric = big ? 'deg' : this.s.metric;
      const score = (gg) => (metric === 'btw' ? W.betweenness(gg) : W.stats(gg).deg);
      const nm = (i) => g.nodes[i].label || g.nodes[i].id;
      const base = score(g); const top = base.map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([i]) => i);
      const stay = new Array(5).fill(0); let jsum = 0; const cacheKey = [m.id, p, reps, this.s.seed, metric].join('|');
      if (this._rk !== cacheKey) {
        for (let t = 0; t < reps; t++) {
          const keepE = g.edges.filter(() => r() >= p);
          const gg = { ...g, edges: keepE }; const sc = score(gg);
          const t5 = new Set(sc.map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([i]) => i));
          top.forEach((i, k) => { if (t5.has(i)) stay[k]++; }); jsum += top.filter((i) => t5.has(i)).length / 5;
        }
        this._rk = cacheKey; this._rr = { stay, jsum };
      }
      const R = this._rr;
      return `<p class="sub">${esc(m.title)}：${g.nodes.length} 个节点、${g.edges.length} 条边。指标：${big ? '度（节点多，介数逐次重算太慢，只算度）' : seg('metric', [['deg', '度'], ['btw', '介数']], this.s.metric)}</p>
        <p>随机删去 <input type="range" min="0" max="80" step="5" data-k="p" value="${esc(this.s.p)}"> <b>${esc(this.s.p)}%</b> 的边，重复 <select data-k="reps">${['20', '50', '100'].map((v) => `<option ${this.s.reps === v ? 'selected' : ''}>${v}</option>`).join('')}</select> 次，种子 <input type="number" data-k="seed" value="${esc(this.s.seed)}" style="width:4em"></p>
        <table class="steps"><tr><th>原排名前五</th><th>原值</th><th>仍在前五的次数</th></tr>${top.map((i, k) => `<tr class="${R.stay[k] / reps >= 0.8 ? 'ok' : R.stay[k] / reps < 0.5 ? 'bad' : ''}"><td>${esc(nm(i))}</td><td>${f2(base[i], metric === 'btw' ? 1 : 0)}</td><td>${R.stay[k]}／${reps}</td></tr>`).join('')}</table>
        <p class="okbox">平均每次保留原前五中的 ${f2((R.jsum / reps) * 100, 0)}%。</p>
        <details data-curve><summary>按 Ryan 与 Ahnert 2021 的做法：删去比例与等级相关</summary>${(() => { const cv = this.curve(m); return `<table class="steps small"><tr><th>删去</th>${cv.map(([p]) => `<th>${p * 100}%</th>`).join('')}</tr><tr><td>度</td>${cv.map(([, d]) => `<td>${f2(d)}</td>`).join('')}</tr><tr><td>局部聚类系数</td>${cv.map(([, , c]) => `<td>${f2(c)}</td>`).join('')}</tr></table>`; })()}
          <p class="sub">每格为删边后各节点指标与原指标的斯皮尔曼等级相关（10 次平均）。Ryan 与 Ahnert 在近代早期英国书信网上发现：多数中心度要删去六成以上的数据才明显失真，只有局部聚类系数从一开始就明显受影响（Journal of Cultural Analytics 6.3, 2021，读全文）。这张网上是否如此，看上表。</p></details>
        <p class="sub">这测的是随机缺失。王珪的数据几乎全部来自他本人的文集，缺失是系统性的，删减实验测不出来（讲义 3.5，Ryan 与 Ahnert 2021 的模拟也只针对随机缺失）。</p>`;
    }
    /* Ryan 与 Ahnert 2021 的做法：按比例随机删边，计算删后各节点指标与原指标的斯皮尔曼等级相关，多次取平均。 */
    curve(m) {
      const ck = m.id + '|' + this.s.seed; if (this._ck === ck) return this._cv;
      const g = W.graph(m, { directed: false }), r = W.rng(Number(this.s.seed) + 99), reps = 10;
      const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const R = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) R[o[k][1]] = (i + j) / 2; i = j + 1; } return R; };
      const sp = (a, b) => { const A = rank(a), B = rank(b), n = A.length, ma = A.reduce((x, y) => x + y, 0) / n, mb = B.reduce((x, y) => x + y, 0) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (A[i] - ma) * (B[i] - mb); va += (A[i] - ma) ** 2; vb += (B[i] - mb) ** 2; } return va && vb ? c / Math.sqrt(va * vb) : 0; };
      const d0 = W.stats(g).deg, c0 = W.clustering(g); const out = [];
      for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) { let sd = 0, sc = 0; for (let t = 0; t < reps; t++) { const gg = { ...g, edges: g.edges.filter(() => r() >= p) }; sd += sp(d0, W.stats(gg).deg); sc += sp(c0, W.clustering(gg)); } out.push([p, sd / reps, sc / reps]); }
      this._ck = ck; this._cv = out; return out;
    }
    cooc() {
      const t = W.Mat.text('practice2')?.text || ''; const has = (p) => t.includes(p) || (LISHI.alias[p] && t.includes(LISHI.alias[p]));
      const ppl = LISHI.people.filter(has); const pairs = []; ppl.forEach((a, i) => ppl.slice(i + 1).forEach((b) => pairs.push([a, b])));
      const st = new Map(LISHI.stated.map(([a, b, r, q]) => [[a, b].sort().join('|'), [r, q]]));
      const g = { nodes: ppl.map((id) => ({ id, label: id })), edges: pairs.map(([s, t2]) => ({ s, t: t2, w: 1, recs: [] })), directed: false, index: new Map(ppl.map((id, i) => [id, i])) };
      const R = 130, P = ppl.map((_, i) => [160 + R * Math.cos((2 * Math.PI * i) / ppl.length - Math.PI / 2), 150 + R * Math.sin((2 * Math.PI * i) / ppl.length - Math.PI / 2)]);
      const edgeColor = (e) => (st.has([e.s, e.t].sort().join('|')) ? '#164ec7' : '#e0a100');
      const extra = pairs.filter(([a, b]) => !st.has([a, b].sort().join('|')));
      return `<p class="sub">《丹陽郡夫人李氏墓誌銘》节录（练习材料二）中出现 ${ppl.length} 人（王珪自称“余”，鄭戩称“文肅公”）。按“同篇出现即连边”得 ${pairs.length} 条（黄＋蓝）；原文明载的只有 ${st.size} 条（蓝）。</p>
        ${W.drawGraph(g, P, { w: 320, h: 300, labels: 'all', arrows: false, edgeColor, key: 'D14|lishi' })}
        <details><summary>明载的 ${st.size} 条及原文</summary><table class="steps small">${LISHI.stated.map(([a, b, r, q]) => `<tr><td>${a}—${b}</td><td>${r}</td><td class="src-line">${esc(q)}</td></tr>`).join('')}</table></details>
        <p class="note-box">同样的两步，Shang 与 Sang 2021 在《世说新语》上做过：1,130 则轶事中，先把同一则里出现的东晋人物两两连边，再逐条判断关系性质、去掉负面关系，留下 484 则、736 次正面关系，250 人、505 条边；直接互动（任用、馈赠）记 3 分，称许、交谈记 1 分（Journal of Historical Network Research 5, 2021，读全文）。</p>
        <p class="okbox">共现比明载多出 ${extra.length} 条，例如 ${extra.slice(0, 4).map(([a, b]) => `${a}—${b}`).join('、')}。王珪与吕公孺是连襟，原文没有写；五个儿子与王珪的关系也没有写。</p>`;
    }
    render() {
      const D = D14_DIRS.find(([k]) => k === this.s.dir) || D14_DIRS[0];
      const col1 = `<div class="q4">${D14_DIRS.map(([k, n]) => `<button data-set="dir:${k}" class="${this.s.dir === k ? 'on' : ''}"><b>${n}</b></button>`).join('')}</div>
        <p class="note-box"><b>${D[1]}</b>：${esc(D[2])}<br>王珪：${esc(D[3])}${D[4] ? `<br>动手：${pageLink(D[4])}` : ''}</p><p class="sub">讲义 @fig-verify-net；查重、查向见 ${pageLink('D08')}，零模型对照见 ${pageLink('D11')}。</p>`;
      const m = this.mat(this.s.mat);
      const col2 = `${W.matSelect('network', this.s.mat)}${m ? this.robust(m) : this.s.mat === 'cbdb-wanggui' ? W.gate('CBDB 边表', 'CBDB 王珪记录') : '<p class="sub">公开材料载入中……</p>'}`;
      const col3 = W.Mat.text('practice2') ? this.cooc() : '<p class="sub">公开材料载入中……</p>';
      const col4 = `<p>四个方向各检查了什么、剩下什么？</p><label class="field">我的判断<textarea data-ki="judge" rows="4" placeholder="王珪“交游广阔”这一结论：回原文……；敏感性……；稳健性……；独立来源……">${esc(this.s.judge)}</textarea></label>
        <p class="sub">讲义的结论：王珪 24 条非纪念文字的关系里，还有俞充、李受两条重复，“書跋”四条在身后，葉祖洽“陷害Y”的追贬在身后，趙允讓一条是议论已故宗王的追尊礼制；能直接当作“生前双方交往”来算的，比表面上少得多。</p>`;
      rerender(this, flowShell(pageById('D14'), [{ title: '选核验方向', body: col1 }, { title: '删减', body: col2 }, { title: '共现与明载', body: col3 }, { title: '判断', body: col4 }]));
    }
  }
  register('verify-lab', VerifyLab);

  /* ================= D15 智能体辅助网络分析 ================= */
  const FIVE = [
    ['rows', '读入核对', '报告行数、被丢弃的行及原因、类型清单', /行数|多少行|丢弃|类型清单|几行/],
    ['algo', '算法与参数', '说明所用函数与参数，列前几名及数值', /算法|函数|参数|归一/],
    ['evid', '结论的依据', '每条结论列出所依据的边及出处', /依据|出处|哪些边|哪一行|所依据/],
    ['cf', '反事实', '删去某点或某类边后重算', /删去|去掉|反事实|假如/],
    ['lim', '只描述结构', '写成“在现存记录中……”，不作历史解释', /现存记录|只描述|不要推断|这份.*数据中/],
  ];
  const TRUTH = {
    padgett: [['15 个家族', /15\s*个/], ['20 条边', /20\s*条/], ['美第奇度 6（或归一化 6/14＝0.43）', /Medici[^。\n]{0,12}[（(]\s*6\s*[)）]|Medici[^。\n]{0,30}0\.428|度[^。\n]{0,10}6[^。\n]{0,10}Medici/i], ['美第奇介数 47.5（未归一）或 0.522（归一）', /47\.5|0\.52/], ['删去美第奇后 3 个连通分量', /3\s*个[^。\n]{0,4}连通分量/], ['最大分量 11 个家族', /最大[^。\n]{0,10}11\s*个/], ['美第奇的边：Acciaiuoli、Albizzi、Barbadori、Ridolfi、Salviati、Tornabuoni', /Tornabuoni/]],
    cbdb: [['97 行', /97/], ['对方 84 人', /84/], ['纪念文字类 73 条', /73/], ['去掉后剩 24 条', /24/], ['剩 19 人', /19\s*人|19\b/], ['出处含《華陽集》63 条', /63/], ['出处为 [n/a] 17 条', /17/]],
  };
  class AgentLab extends Lab {
    defaults() { return { run: 'agent_bad_padgett', mine: '', step: '' }; }
    runs() { return { ...(PUB().runs || {}), ...(LX()?.runs || {}) }; }
    render() {
      const R = this.runs(); const keys = Object.keys(R).filter((k) => k.startsWith('agent_'));
      const tasks = PUB().texts?.agent_tasks || {}; const tasksC = LX()?.agent_tasks_cbdb;
      const has = (txt) => FIVE.map(([k, , , re]) => [k, re.test(txt || '')]);
      const mine = this.s.mine || tasks.bad || '';
      const hm = has(mine);
      const hb = has(tasks.bad || '');
      const chips = (h) => `<p class="chk5">${FIVE.map(([, n, d], i) => `<span class="chk ${h[i][1] ? 'yes' : 'no'}" title="${esc(d)}">${h[i][1] ? '✓' : '✗'} ${esc(n)}</span>`).join('')}</p>`;
      const items = (t) => { const parts = String(t || '').split(/\s*(?=\b\d\.\s)/); return parts.length > 2 ? `<p>${esc(parts[0])}</p><ol class="steps-ol">${parts.slice(1).map((x) => `<li>${esc(x.replace(/^\d\.\s*/, ''))}</li>`).join('')}</ol>` : `<p>${esc(t)}</p>`; };
      const col1 = `<p class="sub">佛罗伦萨家族婚姻网${tasksC ? '（王珪边表一份见下，本机材料包）' : ''}</p>
        <div class="prompt bad"><span class="who">提法</span>${esc(tasks.bad || '（公开材料载入中）')}</div>${tasksC ? `<div class="prompt bad"><span class="who">提法（王珪）</span>${esc(tasksC.bad)}</div>` : ''}
        <p class="sub">五件事一件也没写：</p>${chips(hb)}<p class="sub">讲义 @fig-agent-net：每一步都要它交出可以核对的东西。</p>`;
      const col2 = `<textarea data-ki="mine" rows="7" class="prompt-edit" placeholder="在差的提法上改写">${esc(mine)}</textarea>
        ${chips(hm)}<p class="sub">鼠标停在每一项上看它要求什么。<button class="small" data-check="1">重新检查</button>　关键词检查只是提醒，写到不等于写清楚。</p>`;
      const col3 = `<div class="prompt good"><span class="who">好的提法</span>${items(tasks.good || '')}</div>${chips(has(tasks.good || ''))}${tasksC ? `<details><summary>王珪边表的好提法（本机）</summary><div class="prompt good">${items(tasksC.good)}</div></details>` : ''}`;
      const run = R[this.s.run] || R[keys[0]];
      let col4 = '<p class="sub">运行记录在公开材料包中；若显示为空，说明课前尚未运行。</p>';
      if (run) {
        const fin = run.final || ''; const which = /cbdb/.test(this.s.run) ? 'cbdb' : 'padgett';
        const calls = run.calls || [], cur = calls[Number(this.s.step)] || null;
        const tl = `<div class="timeline">${calls.map((c, i) => `<button data-set="step:${String(i) === this.s.step ? '' : i}" class="${String(i) === this.s.step ? 'on' : ''} ${c.forced_final ? 'forced' : c.code ? (c.result?.returncode ? 'err' : 'code') : 'ans'}" title="${c.seconds} 秒">${c.step}</button>`).join('')}</div>
          <p class="sub">点步号看这一步：蓝＝写代码并运行，红＝代码出错，灰＝步数用完后被要求作答。</p>
          ${cur ? `<div class="stepbox"><p class="sub">第 ${cur.step} 步，${cur.seconds} 秒${cur.usage ? '，' + cur.usage.completion_tokens + ' 个词元' : ''}</p>${cur.code ? `<pre class="code">${esc(cur.code)}</pre><p class="sub">输出（返回码 ${cur.result?.returncode}）：</p><pre class="code">${esc((cur.result?.stdout || '') + (cur.result?.stderr ? '\n' + cur.result.stderr : ''))}</pre>` : `<pre class="code">${esc(cur.reply)}</pre>`}</div>` : ''}`;
        const truth = TRUTH[which].map(([n, re]) => [n, re.test(fin)]);
        col4 = `<p><select data-k="run">${keys.map((k) => `<option value="${k}" ${k === this.s.run ? 'selected' : ''}>${k.replace('agent_', '').replace('_', '｜')}</option>`).join('')}</select>
            <span class="tag ${run.finished ? '' : 'warn'}">${run.finished ? `${calls.length} 步内自行收尾` : `${run.max_steps} 步内没有收尾`}</span></p>
          ${tl}
          <div class="answer"><span class="who">最终回答</span>${esc(fin || '（无）')}</div>
          <p class="sub">页面在回答中查正确数字：</p><p class="chk5">${truth.map(([n, ok]) => `<span class="chk ${ok ? 'yes' : 'no'}">${ok ? '✓' : '✗'} ${esc(n)}</span>`).join('')}</p>
          <p class="sub small">${esc(run.model?.key || '')}（SHA-256 ${esc((run.model?.sha256 || '').slice(0, 12))}…），${esc((run.date || '').slice(0, 16))}，温度 0。</p>`;
      }
      rerender(this, flowShell(pageById('D15'), [{ title: '差的提法', body: col1 }, { title: '补五件事', body: col2 }, { title: '好的提法', body: col3 }, { title: '运行记录', body: col4 }]));
    }
    init() { this.addEventListener('click', (e) => { if (e.target.dataset.check) this.render(); }); }
  }
  register('agent-lab', AgentLab);

  /* ================= D16 地名对账与坐标 ================= */
  class GazetteerLab extends Lab {
    defaults() { return { yr: '1050', sel: '舒', pick: {}, notPlace: {}, live: '' }; }
    async fetchAll() {
      this.s.live = 'loading'; this.save(); let n = 0, err = '';
      for (const it of D16_ITEMS) for (const q of it.q) for (const y of [this.s.yr, '']) { if (TG.has(tgKey(q, y))) continue; try { await tgFetch(q, y); n++; } catch (e) { err = String(e.message || e); } }
      this.s.live = err ? '在线查询失败：' + err : `已在线查询（${new Date().toLocaleString()}）`; this.save();
    }
    render() {
      const yr = this.s.yr, snap = !!LX()?.tgaz, haveAny = D16_ITEMS.some((it) => it.q.some((q) => tgGet(q, yr)));
      if (!haveAny && !this._asked) { this._asked = true; ensureTG(yr).then((ok) => { this.s.live = ok ? `已在线查询（${new Date().toLocaleString()}）` : '在线查询失败（离线？）；请导入本机材料包中的查询快照'; this.save(); }); }
      const bins = { one: [], many: [], none: [] };
      for (const it of D16_ITEMS) { const c = cands(it, yr); (c.length === 0 ? bins.none : c.length === 1 ? bins.one : bins.many).push([it, c]); }
      const src = `<p class="sub">候选来源：${snap ? `本机材料包中的 CHGIS TGAZ 查询快照（${esc(LX().tgaz.queried)}）` : ''}${TG.size ? `${snap ? '＋' : ''}浏览器在线查询 chgis.hudci.org/tgaz` : ''}${!snap && !TG.size ? '在线查询中……' : ''}。${esc(this.s.live && this.s.live !== 'loading' ? this.s.live : '')} <button class="small" data-live="1">在线重新查询</button></p>`;
      const col1 = `<p>查询年份 ${seg('yr', [['1050', '1050 年'], ['', '不限年份']], yr)}</p><table class="steps small"><tr><th>史料地名</th><th>原文</th><th>出处</th></tr>${D16_ITEMS.map((it) => `<tr data-sel="${esc(it.name)}" class="${this.s.sel === it.name ? 'on' : ''}"><td>${esc(it.name)}</td><td class="src-line">${esc(it.quote)}</td><td>${it.src === '宋史' ? '《宋史》本传' : '李氏墓志'}</td></tr>`).join('')}</table>${src}`;
      const bin = (n, arr) => `<div class="bin"><b>${n}（${arr.length}）</b>${arr.map(([it, c]) => `<p class="small"><a href="javascript:void 0" data-sel="${esc(it.name)}">${esc(it.name)}</a> ${c.length > 1 ? `<span class="sub">${c.length} 条</span>` : ''}</p>`).join('')}</div>`;
      const col2 = `<div class="bins">${bin('唯一匹配', bins.one)}${bin('多个候选', bins.many)}${bin('无对应', bins.none)}</div>
        <p class="sub">按名字前缀查（接口按“名字%”匹配，所以“魏”会带出“魏州”“魏县”等）。改成“不限年份”，候选会变多；“靈武”“慶州”“永樂”在 1050 年无记录（接口对繁体的处理也不一致：“慶州”查不到，简体“庆州”才查得到隋唐的记录），宋夏战争中的城寨与西夏占据的州不在 CHGIS 的北宋州县中，或名称写法不同。</p>`;
      const it = D16_ITEMS.find((x) => x.name === this.s.sel) || D16_ITEMS[0], cs = cands(it, yr), pick = this.s.pick?.[it.name] ?? defaultPick(it, yr);
      const col3 = `<p><b>${esc(it.name)}</b>｜原文“${esc(it.quote)}”｜页面初判：${esc(it.kind)}</p>${it.hint ? `<p class="note small">${esc(it.hint)}</p>` : ''}
        <label class="check-row small"><input type="checkbox" data-np="${esc(it.name)}" ${this.s.notPlace?.[it.name] ? 'checked' : ''}>这不是指地点（如封号、爵号）</label>
        ${cs.length ? `<table class="steps small"><tr><th></th><th>CHGIS 记录</th><th>起讫</th><th>坐标</th></tr>${cs.slice(0, 30).map((p) => `<tr class="${p.sys_id === pick ? 'on' : ''}"><td><input type="radio" name="pk" data-pick="${esc(p.sys_id)}" ${p.sys_id === pick ? 'checked' : ''}></td><td>${esc(p.name)} <span class="sub">${esc(p['feature type'])}｜${esc(p['object type'])}</span><br><span class="sub">${esc(p['parent name'] || '')} ${esc(p.sys_id)}</span></td><td>${esc(p.years)}</td><td class="${okCoord(p) ? '' : 'nil'}">${okCoord(p) ? `${f2(p.lat, 2)}<br>${f2(p.lng, 2)}` : '缺<br>' + esc(p['xy coordinates'])}</td></tr>`).join('')}</table>${cs.length > 30 ? `<p class="sub">只列前 30 条。</p>` : ''}` : '<p class="nil">CHGIS 中查无此名（或年份内无记录）。只能回到史料与研究文献去考订。</p>'}
        <p class="sub">“POLYGON”一类记录的坐标常为 0（缺），要另取治所的点。页面初选查询年份内有效、点状、有坐标的第一条（“魏”“慶”两处另作处理，见上），请逐条改正。</p>`;
      const ref = gazetteerRef(); const pts = Object.entries(ref).filter(([n]) => !this.s.notPlace?.[n]).map(([n, p]) => ({ id: n, lng: p.lng, lat: p.lat, label: n, r_km: TYPE_R(p['feature type'], p['object type']), color: n === it.name ? '#a33' : '#164ec7' }));
      const col4 = `${mapSvg(pts, { key: 'd16', w: 360, h: 320 })}<p class="sub">${pts.length} 个地名上图；圆圈为课件按类型设的示意误差（县 5、州府军 15、路 150 公里），不是 CHGIS 给的数。底图为 Natural Earth 海岸线。</p>`;
      rerender(this, flowShell(pageById('D16'), [{ title: '史料地名', body: col1 }, { title: '候选', body: col2 }, { title: '选定', body: col3 }, { title: '上图', body: col4 }]));
    }
    init() {
      this.addEventListener('click', (e) => {
        const s = e.target.closest('[data-sel]'); if (s) { this.s.sel = s.dataset.sel; this.save(); }
        if (e.target.dataset.live) this.fetchAll();
      });
      this.addEventListener('change', (e) => {
        const p = e.target.dataset.pick; if (p) { this.s.pick = { ...this.s.pick, [this.s.sel]: p }; this.save(); }
        const np = e.target.dataset.np; if (np) { this.s.notPlace = { ...this.s.notPlace, [np]: e.target.checked }; this.save(); }
      });
    }
  }
  register('gazetteer-lab', GazetteerLab);

  /* ================= D17 QGIS 与数字地图工具 ================= */
  const QGIS_FLOW = [['图层', '地图由若干图层叠成：点、线、面（矢量）与扫描图像（栅格）', '今天的底图、历史政区的面、自己的地点各为一层'], ['加载表格为点', '把含经纬度两列的 CSV 直接变成点图层', '证据表加上坐标两列即可上图；每个点仍带着原文与出处'],
    ['属性表与连接', '每个图层都有一张表；可按共同字段与别的表连接', '把“任官表”按地名编号连到“地名表”'], ['符号化', '按类别着色、按数值定大小、生成热力图', '颜色与大小来自字段，和网络图一样不是额外的证据'],
    ['配准旧地图', '给扫描的古地图逐点指定真实坐标，使之与今图叠合', '舆图本身的绘制误差会被带进来，配准不等于纠正'], ['空间分析', '缓冲区、叠加、距离、按区域计数', '坐标有误差时，距离与计数都要打折扣'],
    ['时间控制器', '按日期字段逐年播放图层', '依赖年份字段，第五节的缺省值问题在这里同样出现'], ['打印布局', '加图例、比例尺、指北针与出处，导出图片', '论文用图要注明底图来源与坐标系']];
  class QgisLab extends Lab {
    defaults() { return { crs: 'wgs', step: '1', color: 'src', out: {} }; }
    render() {
      const ref = gazetteerRef(); if (!Object.keys(ref).length && !this._asked) { this._asked = true; ensureTG().then(() => this.render()); }
      const rows = Object.entries(ref).map(([n, p]) => ({ id: n, name: n, lng: p.lng, lat: p.lat, src: p.item.src, type: p['feature type'] }));
      const col1 = `<table class="steps small"><tr><th>地名</th><th>经度</th><th>纬度</th><th>出处</th></tr>${rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${f2(r.lng, 4)}</td><td>${f2(r.lat, 4)}</td><td>${esc(r.src)}</td></tr>`).join('')}</table>
        <p class="sub">取自 ${pageLink('D16')} 选定的 CHGIS 记录（${rows.length} 条${rows.length ? '' : '；正在在线查询，或请导入本机材料包'}）。在 QGIS 中：图层 › 添加图层 › 添加分隔文本图层，X 字段选经度、Y 字段选纬度，几何 CRS 选 EPSG:4326（WGS 84）。</p>
        <button class="small" data-csv="1">下载这张表（CSV）</button>`;
      const shifted = rows.map((r) => { const [x, y] = wgs2gcj(r.lng, r.lat); return { ...r, glng: x, glat: y, d: hav([r.lng, r.lat], [x, y]) * 1000 }; });
      const show = this.s.crs === 'gcj';
      const col2 = `<p>${seg('crs', [['wgs', '按 WGS 84 画'], ['gcj', '误叠到 GCJ-02 底图上']], this.s.crs)}</p>
        ${mapSvg(shifted.map((r) => ({ id: r.id, lng: r.lng, lat: r.lat, label: r.name })), { key: 'd17', w: 340, h: 260, arrows: show ? shifted.map((r) => [{ lng: r.lng, lat: r.lat }, { lng: r.glng, lat: r.glat }]) : [] })}
        <table class="steps small"><tr><th>地名</th><th>偏移（米）</th></tr>${shifted.map((r) => `<tr><td>${esc(r.name)}</td><td>${f2(r.d, 0)}</td></tr>`).join('')}</table>
        <p class="sub">国内地图服务（高德等）用 GCJ-02，与 WGS 84 相差数百米；在这一比例尺下几百米看不出来，放大到城市一级才看得见，偏移量见表。CSV 里的经纬度一般是 WGS 84，叠加前先确认底图用哪一种坐标系（讲义 4.2）。换算用的是公开实现中通行的公式，页面只作演示。</p>`;
      const cats = [...new Set(rows.map((r) => r[this.s.color] || '（空）'))];
      const col3 = `<p>按哪一栏着色：${seg('color', [['src', '出处'], ['type', 'CHGIS 类型']], this.s.color)}</p>
        ${mapSvg(rows.map((r) => ({ id: r.id, lng: r.lng, lat: r.lat, label: r.name, color: W.PALETTE[cats.indexOf(r[this.s.color] || '（空）') % W.PALETTE.length], size: 6 })), { key: 'd17b', w: 340, h: 260 })}
        <p class="sub">图例：${cats.map((c, i) => `<span style="color:${W.PALETTE[i % W.PALETTE.length]}">●</span> ${esc(c)}`).join('　')}。颜色来自字段，和网络图一样不是额外的证据。</p>`;
      const out = this.s.out || {}; const need = [['legend', '图例'], ['scale', '比例尺'], ['north', '指北针'], ['src', '底图来源与地名出处'], ['crs', '坐标系'], ['shenshu', '公开发表时用有审图号的底图']];
      const col4 = `<table class="steps small">${QGIS_FLOW.map(([a, b, c], i) => `<tr><td><b>${a}</b></td><td>${esc(b)}</td><td class="sub">${esc(c)}</td></tr>`).join('')}</table>
        <p class="sub">讲义 @fig-qgis-flow；扩充部分丙二。</p><h4>实际操作截图</h4>${W.shotGallery('qgis', this.s.shot)}
        <p>出图前检查：</p>${need.map(([k, n]) => `<label class="check-row small"><input type="checkbox" data-out="${k}" ${out[k] ? 'checked' : ''}>${n}</label>`).join('')}
        <p><button class="small" data-svg="1">下载第二栏地图（SVG）</button></p>`;
      this._rows = rows;
      rerender(this, flowShell(pageById('D17'), [{ title: '表格上图', body: col1 }, { title: '参照系', body: col2 }, { title: '符号化', body: col3 }, { title: '出图', body: col4 }]));
    }
    init() {
      this.addEventListener('click', (e) => {
        if (e.target.dataset.csv) download('d16_地名坐标.csv', '﻿name,lng,lat,source,chgis_type\n' + (this._rows || []).map((r) => [r.name, r.lng, r.lat, r.src, r.type].join(',')).join('\n'), 'text/csv');
        if (e.target.dataset.svg) download('d17_map.svg', this.querySelector('svg.mapsvg').outerHTML, 'image/svg+xml');
      });
      this.addEventListener('change', (e) => { const k = e.target.dataset.out; if (k) { this.s.out = { ...this.s.out, [k]: e.target.checked }; this.save(); } });
    }
  }
  register('qgis-lab', QgisLab);

  /* ================= D18 大语言模型提取地点 ================= */
  const nrm = (s) => String(s || '').replace(/[，。、；：「」『』（）\s…]/g, '').replace(/吴/g, '吳').replace(/庆/g, '慶');
  class GeoLlmLab extends Lab {
    defaults() { return { tol: '50', mode: 'fixed', sel: '' }; }
    render() {
      const run0 = PUB().runs?.['geo_qwen3-4b']; const T = (W.Mat.text('songshi_w7')?.text || '') + '\n\n' + (W.Mat.text('practice2')?.text || '');
      if (!run0) { rerender(this, '<p class="sub">公开材料载入中，或课前尚未运行。</p>'); return; }
      const run = this._live?.parsed ? { ...run0, parsed: this._live.parsed, model: { key: this._live.via }, date: this._live.date, calls: [{ seconds: this._live.seconds }], live: true } : run0;
      const places = (run.parsed?.places || []).map((p, i) => ({ ...p, i, inText: T.includes(p.name), quoteOk: p.quote && nrm(T).includes(nrm(p.quote)) }));
      const ref = gazetteerRef(); const tol = Number(this.s.tol); if (!Object.keys(ref).length && !this._asked) { this._asked = true; ensureTG().then(() => this.render()); }
      for (const p of places) { const r = ref[p.name] || Object.values(ref).find((x) => x.item.q.includes(p.name)) || Object.values(ref).find((x) => p.name.includes(x.item.name)); if (r) p.refName = r.item.name; p.ref = r; p.dist = r && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) ? hav([+p.lng, +p.lat], [r.lng, r.lat]) : null; p.lim = this.s.mode === 'self' ? Number(p.radius_km) || 0 : tol; p.hit = p.dist != null && p.dist <= p.lim; }
      let hl = esc(T); for (const p of [...places].sort((a, b) => b.name.length - a.name.length)) if (p.inText) hl = hl.split(esc(p.name)).join(`<mark>${esc(p.name)}</mark>`);
      const col1 = `<div class="srcbox small-src">${hl}</div><p class="sub">黄底：模型列出的地名。原文为《宋史·王珪传》较长选段与练习材料二。</p>`;
      const col2 = `<div class="geo-cards">${places.map((p) => `<div data-geo="${p.i}" class="geo-card ${String(p.i) === this.s.sel ? 'on' : ''} ${p.inText ? '' : 'bad'}">
          <p><b>${esc(p.name)}</b> <span class="tag">${esc(p.kind || '')}</span>${p.inText ? '' : ' <span class="tag warn">原文中找不到这个写法</span>'}</p>
          <p class="small">引句“${esc(p.quote || '')}”${p.quoteOk ? '' : ' <span class="nil">（原文中找不到）</span>'}</p>
          <p class="sub">${esc(p.modern || p.today || '')}｜${f2(+p.lat, 2)}, ${f2(+p.lng, 2)}｜自报误差 ${esc(p.radius_km ?? '—')} 公里</p></div>`).join('')}</div>
        <p class="sub">${esc(run.model?.key)}（${esc(run.model?.file)}），${esc(run.date)}，用时 ${run.calls?.[0]?.seconds} 秒；温度 0。提示词要求逐字照抄引句、给出误差半径（照 His-Geo 的设计）。</p>
        <details><summary>提示词</summary><pre class="code">${esc(run.prompt?.split('史料：')[0] || '')}</pre></details>${liveBar(this)}${run.live ? '<p class="note-box small">当前显示的是刚才现场运行的结果（浏览器实时），不是保存的记录；温度 0 也不保证每次相同。</p>' : ''}`;
      const pts = [...places.filter((p) => Number.isFinite(+p.lat)).map((p) => ({ id: 'm' + p.i, lng: +p.lng, lat: +p.lat, label: p.name, r_km: this.s.mode === 'self' ? Number(p.radius_km) || 0 : 0, color: '#b06d00' })),
        ...Object.entries(ref).map(([n, r]) => ({ id: 'r' + n, lng: r.lng, lat: r.lat, label: '', color: '#164ec7', size: 3 }))];
      const arrows = places.filter((p) => p.ref && p.dist != null).map((p) => [{ lng: p.ref.lng, lat: p.ref.lat }, { lng: +p.lng, lat: +p.lat }, p.hit ? '#2c6a3a' : '#a33']);
      const col3 = `${mapSvg(pts, { key: 'd18', w: 360, h: 320, labels: true, arrows })}<p class="sub">橙点：模型给的坐标；蓝点：${pageLink('D16')} 选定的 CHGIS 记录；箭头从参照指向模型（绿：容限内；红：超出）。</p>`;
      const scored = places.filter((p) => p.ref && p.dist != null), hits = scored.filter((p) => p.hit).length;
      const curve = [5, 10, 20, 50, 100, 200, 500].map((t) => [t, scored.filter((p) => p.dist <= t).length]);
      const missed = D16_ITEMS.filter((it) => !places.some((p) => p.name.includes(it.name) || it.q.includes(p.name))).map((it) => it.name);
      const nonPlace = places.filter((p) => /封号|爵号/.test(p.kind || '') || /^(延安|岐)/.test(p.name));
      const col4 = `<p>${seg('mode', [['fixed', '固定容限'], ['self', '用模型自报的误差半径']], this.s.mode)}</p>
        ${this.s.mode === 'fixed' ? `<p>容限 <input type="range" min="5" max="500" step="5" data-k="tol" value="${esc(this.s.tol)}"> <b>${esc(this.s.tol)} 公里</b></p>` : ''}
        <p class="okbox">有参照坐标可比的 ${scored.length} 个地名中，${hits} 个在容限内（${scored.length ? f2((hits / scored.length) * 100, 0) : '—'}%）。</p>
        <table class="steps small curve"><tr><th>容限（公里）</th>${curve.map(([t]) => `<th>${t}</th>`).join('')}</tr><tr><td>算对</td>${curve.map(([, n]) => `<td>${n}／${scored.length}</td>`).join('')}</tr></table>
        <table class="steps small"><tr><th>地名（对到 D16 的）</th><th>距参照（公里）</th></tr>${scored.sort((a, b) => a.dist - b.dist).map((p) => `<tr class="${p.hit ? 'ok' : 'bad'}"><td>${esc(p.name)}${p.refName && p.refName !== p.name ? '（' + esc(p.refName) + '）' : ''}</td><td>${f2(p.dist, 0)}</td></tr>`).join('')}</table>
        ${missed.length ? `<p class="note-box">模型漏掉的史料地名：${missed.map(esc).join('、')}。</p>` : ''}<p class="sub">同一批结果，容限从 10 公里放到 100 公里，“算对”的数目就不同：分数取决于评价规则。${nonPlace.length ? `封号中的地名（${nonPlace.map((p) => esc(p.name)).join('、')}）模型也给了坐标；它们在原文里不指地点。` : ''}参照本身来自 CHGIS 的治所点，不等于史料所指的范围（讲义 4.3）。</p>`;
      rerender(this, flowShell(pageById('D18'), [{ title: '原文', body: col1 }, { title: '抽取', body: col2 }, { title: '上图', body: col3 }, { title: '计分', body: col4 }]));
    }
    init() { this.addEventListener('click', (e) => { const r = e.target.closest('[data-geo]'); if (r) { this.s.sel = r.dataset.geo; this.save(); } const x = e.target.dataset.rerun; if (x === 'back') { this._live = null; this._liveErr = ''; this.render(); } else if (x) liveRerun(this, PUB().runs?.['geo_qwen3-4b'], 'places', e.target); }); }
  }
  register('geollm-lab', GeoLlmLab);

  /* ================= D19 智能体做空间分析：网页地图 ================= */
  class WebMapLab extends Lab {
    defaults() { return { mat: 'wang2022-shenzong', swap: false, coast: true, checks: {} }; }
    pointsOf(m) {
      if (!m) return [];
      if (m.kind === 'points') return (m.rows || m.points || []).map((r, i) => ({ id: String(i), label: r.name, lat: Number(r.lat), lng: Number(r.lng), ref: r.ref, prec: r.precision }));
      return (m.nodes || []).map((n) => ({ id: n.id, label: n.label, lat: Number(n.attrs?.lat), lng: Number(n.attrs?.lng) }));
    }
    render() {
      const list = [...W.Mat.list('network').filter((m) => m.nodes?.some((n) => n.attrs?.lat != null)), ...W.Mat.list('points')];
      const m = this.mat(this.s.mat) || list[0];
      const sel = `<span class="matbar"><label>点表 <select data-k="mat">${list.map((x) => `<option value="${esc(x.id)}" ${x.id === m?.id ? 'selected' : ''}>${esc(x.title)}${x.kind === 'network' ? '（节点坐标）' : ''}</option>`).join('')}</select></label><button class="small" data-open-import="points">导入点表</button></span>`;
      if (!m) { rerender(this, `${sel}<p class="sub">公开材料载入中……</p>`); return; }
      const swap = this.s.swap === true || this.s.swap === 'true';
      let pts = this.pointsOf(m); if (swap) pts = pts.map((p) => ({ ...p, lat: p.lng, lng: p.lat }));
      const good = pts.filter(okCoord), bad = pts.filter((p) => !okCoord(p)), outLat = pts.filter((p) => Math.abs(p.lat) > 90);
      const loc = new Map(); good.forEach((p) => { const k = p.lng.toFixed(4) + ',' + p.lat.toFixed(4); loc.set(k, (loc.get(k) || 0) + 1); });
      const stacked = [...loc.entries()].sort((a, b) => b[1] - a[1]);
      const medLat = good.map((p) => p.lat).sort((a, b) => a - b)[good.length >> 1], medLng = good.map((p) => p.lng).sort((a, b) => a - b)[good.length >> 1];
      const suspect = outLat.length > pts.length / 2 || (good.length && medLat > medLng && medLng < 60 && medLat > 60);
      const col1 = `${W.card(m, { compact: true })}<p class="sub">列：经度 lng、纬度 lat。导入自己的点表时，导入页会让你指明哪一栏是经度、哪一栏是纬度。</p>`;
      const col2 = `${mapSvg(good.map((p) => ({ ...p, size: 2.5 })), { key: 'd19', w: 380, h: 320, labels: false, alpha: 0.35, coast: this.s.coast === true || this.s.coast === 'true', bbox: good.length ? null : [60, -5, 160, 60] })}
        <p><label class="check-row small"><input type="checkbox" data-k="coast" ${this.s.coast === true || this.s.coast === 'true' ? 'checked' : ''}>底图：Natural Earth 海岸线（离线，公有领域）</label></p>
        <p><button class="small" data-leaflet="1">下载 Leaflet 网页</button> <span class="sub">网页里带离线海岸线；右上角可换 CARTO 联网底图（无审图号，只供课堂练习）。Leaflet 库本身仍从 unpkg 联网载入。</span></p>`;
      const col3 = `<p><button data-set="swap:${swap ? 'false' : 'true'}">${swap ? '换回经纬度' : '交换经纬度两栏'}</button></p>
        ${suspect ? '<p class="nil">疑似经纬度颠倒：多数点的“纬度”超出 ±90 度，或纬度普遍大于经度（在东亚不可能）。</p>' : '<p class="sub">交换以后再看：多数点的纬度会超出 ±90 度，无法上图。</p>'}
        <p class="sub">交换后可画的点 ${good.length}，无法画的 ${bad.length}。</p>`;
      const c = this.s.checks || {};
      const col4 = `<p class="okbox">表格 ${pts.length} 行，地图 ${good.length} 点。${bad.length ? `另有 ${bad.length} 行坐标缺失或越界，没有画出。` : ''}</p>
        <p class="sub">点落在同一位置的：${stacked.filter(([, n]) => n > 1).length} 处；最多的一处 ${stacked[0]?.[1] || 0} 个点叠在 ${esc(stacked[0]?.[0] || '')}${m.id === 'wang2022-shenzong' ? '（开封：籍贯记为京城或只知道到府州的人，都落在同一个点上）' : ''}。看上去只有 ${loc.size} 个点。</p>
        ${pts.some((p) => p.prec) ? `<p class="sub">位置精度（Pleiades 的 locationPrecision 字段）：${Object.entries(pts.reduce((o, p) => ((o[p.prec || '未注'] = (o[p.prec || '未注'] || 0) + 1), o), {})).map(([k, v]) => `${esc(k)} ${v}`).join('、')}。rough 的点只是大致位置，上图时与 precise 的点看起来一样确定。</p>` : ''}
        ${[['n', '点数是否等于表格行数'], ['ll', '经纬度是否放反'], ['src', '每个点能否点开看到原文与出处'], ['base', '底图有无审图号（公开发表时）']].map(([k, n]) => `<label class="check-row small"><input type="checkbox" data-ck="${k}" ${c[k] ? 'checked' : ''}>${n}</label>`).join('')}
        <p class="sub">讲义 4.4：让智能体用 Leaflet 或 ECharts 写网页地图时，检查这四件事。</p>`;
      this._pts = good; this._title = m.title;
      rerender(this, `${sel}${flowShell(pageById('D19'), [{ title: '上传点表', body: col1 }, { title: '生成地图', body: col2 }, { title: '交换经纬度', body: col3 }, { title: '检查四件事', body: col4 }])}`);
    }
    init() {
      this.addEventListener('change', (e) => { const k = e.target.dataset.ck; if (k) { this.s.checks = { ...this.s.checks, [k]: e.target.checked }; this.save(); } });
      this.addEventListener('click', (e) => {
        if (!e.target.dataset.leaflet) return;
        const data = JSON.stringify((this._pts || []).map((p) => [p.lat, p.lng, (p.label || '') + (p.ref ? '｜' + p.ref : '')]));
        // 离线海岸线（Natural Earth，公有领域）随网页一起写入，打开即可见；联网底图换用 CARTO（OpenStreetMap 的瓦片服务器拒绝 file:// 打开的网页，返回 403）
        const pts0 = this._pts || [], lo = (k, f) => f(...pts0.map((q) => q[k])), bb = pts0.length ? [lo('lng', Math.min) - 5, lo('lat', Math.min) - 5, lo('lng', Math.max) + 5, lo('lat', Math.max) + 5] : [60, -5, 160, 60];
        const coast = JSON.stringify((PUB().basemap?.coast || []).filter((l) => l.some(([x, y]) => x >= bb[0] && x <= bb[2] && y >= bb[1] && y <= bb[3])).map((l) => l.map(([x, y]) => [y, x])));
        download('webmap.html', `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(this._title)}</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#m{height:100%;margin:0}#m{background:#f7f9fa}</style></head><body><div id="m"></div><script>
const pts=${data};const coast=${coast};const m=L.map('m',{preferCanvas:true});
const off=L.layerGroup(coast.map(l=>L.polyline(l,{color:'#8aa0b4',weight:1,interactive:false})));off.addTo(m);
const carto=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19,attribution:'&copy; OpenStreetMap contributors &copy; CARTO（无审图号，只供课堂练习）'});
L.control.layers({'海岸线轮廓（离线，Natural Earth）':off,'CARTO 浅色底图（联网，无审图号）':carto},{},{collapsed:false}).addTo(m);
const g=L.featureGroup(pts.map(([a,b,t])=>L.circleMarker([a,b],{radius:3}).bindPopup(t))).addTo(m);m.fitBounds(g.getBounds());
m.attributionControl.addAttribution('示意图：海岸线轮廓不表示疆域');
document.title+='：表格 '+pts.length+' 行，地图 '+pts.length+' 点';</script></body></html>`, 'text/html');
      });
    }
  }
  register('webmap-lab', WebMapLab);

  /* ================= 年号换算（宋：课件年号表；日本：JBDB 年号表） ================= */
  const CN = '〇一二三四五六七八九';
  function cnNum(s) { s = s.replace(/^元$/, '一').replace(/^正$/, '一'); if (/^\d+$/.test(s)) return +s; if (s === '十') return 10; if (s.includes('十')) { const [a, b] = s.split('十'); return (a ? CN.indexOf(a) : 1) * 10 + (b ? CN.indexOf(b) : 0); } return CN.indexOf(s) >= 0 ? CN.indexOf(s) : NaN; }
  function convertEra(s) {
    const songs = PUB().eras_song?.eras || [], jpL = (LX()?.jbdb_nengo || []).map((x) => [x.cNengoName, x.cStartYearMinusOne + 1, x.cMaxYears]);
    const jp = [...jpL, ...(PUB().eras_jp?.eras || []).filter(([n]) => !jpL.some(([m]) => m === n)).map(([n, y]) => [n, y, null])];
    const all = [...songs.map(([n, y]) => [n, y, null, '宋']), ...jp.map(([n, y, mx]) => [n, y, mx, '日'])].sort((a, b) => b[0].length - a[0].length);
    for (const [n, y, mx, k] of all) { const i = s.indexOf(n); if (i < 0) continue; const m = s.slice(i + n.length).match(/^([元正一二三四五六七八九十\d]{1,3})年/); if (!m) continue; const v = cnNum(m[1]); if (!Number.isFinite(v)) continue; return { era: n, n: v, ad: y + v - 1, start: y, over: mx && v > mx, kind: k }; }
    return null;
  }

  /* ================= D21 时代、纪年与差读 ================= */
  const VARIANTS = '吳呉 算筭 蒙䝉 悅悦 歲嵗 奇竒 高髙 為爲 說説 衛衞 峯峰 群羣 祕秘 册冊 姦奸 溫温 錄録 鄉郷 卻却 衆眾 冰氷 床牀 迴回 彊強 恆恒 敍敘'.split(' ');
  const VMAP = new Map(); VARIANTS.forEach((p) => { const [a, b] = [...p]; VMAP.set(b, a); });
  const PUNCT = /[，。、；：「」『』（）！？\s…·〔〕　]/g;
  function diffChars(A, B) { // LCS 逐字对齐；返回 [类型, 甲字, 乙字]
    const n = A.length, m = B.length, D = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) D[i][j] = A[i] === B[j] ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { out.push(['=', A[i], B[j]]); i++; j++; } else if (D[i + 1][j] >= D[i][j + 1]) { out.push(['-', A[i], '']); i++; } else { out.push(['+', '', B[j]]); j++; } }
    while (i < n) out.push(['-', A[i++], '']); while (j < m) out.push(['+', '', B[j++]]);
    // 相邻的删、增合成“替换”
    const z = []; for (let k = 0; k < out.length; k++) { if (out[k][0] === '-' && out[k + 1]?.[0] === '+') { z.push(['~', out[k][1], out[k + 1][2]]); k++; } else z.push(out[k]); }
    return z;
  }
  class DiffLab extends Lab {
    defaults() { return { tab: 'bukan', pair: '0', mode: 'diff', dx: '0', dy: '0', sc: '1', half: 'L', th: '60', aligned: '', A: 'songshi_w7', B: 'WYG', paste: '', ignP: true, ignV: true, era: '熙寧三年' }; }
    bukan() {
      const P = PUB().bukan; if (!P) return '<p class="sub">公开材料载入中……</p>';
      const pr = P.pairs[+this.s.pair] || P.pairs[0];
      return `<p>${seg('pair', P.pairs.map((p, i) => [String(i), p.han]), this.s.pair)}　${seg('mode', [['side', '并排'], ['blink', '闪烁'], ['diff', '差分']], this.s.mode)}</p>
        <div class="split2"><div><p class="sub">CODH 目次データ的当主名</p><table class="steps small"><tr><th>${esc(pr.a.label)}</th><td>${esc(pr.a.head)}</td></tr><tr><th>${esc(pr.b.label)}</th><td>${esc(pr.b.head)}</td></tr></table><p class="sub">${esc(pr.note)}</p>
          <p class="sub">${this.s.mode === 'diff' ? `对齐 ${seg('half', [['L', '左页'], ['R', '右页'], ['all', '整幅']], this.s.half || 'L')} <button class="small" data-align="1">自动对齐</button> 乙版平移 x <input type="number" data-k="dx" value="${esc(this.s.dx)}" style="width:4em"> y <input type="number" data-k="dy" value="${esc(this.s.dy)}" style="width:4em"> 像素，缩放 <input type="number" step="0.005" data-k="sc" value="${esc(this.s.sc || '1')}" style="width:5em">，旋转 <input type="number" step="0.05" data-k="rot" value="${esc(this.s.rot || '0')}" style="width:4.5em"> 度；阈值 <input type="range" min="20" max="160" data-k="th" value="${esc(this.s.th)}"> ${esc(this.s.th)}` : ''}</p>
          <p class="sub">差分：两版逐像素相减，差别大于阈值的标红。两次印刷的纸色、墨色、裁切不同，红点不全是改版；改刻的整块（当主名）才是要读的地方。CODH 的做法是先用特征点匹配把两图对齐（vdiff.js）；本页的“自动对齐”只搜平移、缩放与旋转（每次只对一页），书页弯曲处仍会对不齐。</p></div>
          <div class="bukanview" data-bview>${this.s.mode === 'side' ? `<img src="${pr.a.img}" alt="${esc(pr.a.label)}"><img src="${pr.b.img}" alt="${esc(pr.b.label)}">` : this.s.mode === 'blink' ? `<div class="blink"><img src="${pr.a.img}" alt=""><img class="b" src="${pr.b.img}" alt=""></div><p class="sub">每秒交替显示两版。</p>` : '<canvas data-diff width="1200" height="800"></canvas>'}</div></div>
        <p class="sub">${esc(P.credit)}；${esc(P.license)}。影像宽 1200 像素，原图见 IIIF：${esc(pr.a.iiif)}。</p>`;
    }
    /* 灰度数组：把图按缩放 sc、平移 (dx,dy)（全分辨率像素）画到 w×h 画布上，取灰度。 */
    gray(img, w, h, f, sc = 1, dx = 0, dy = 0, rot = 0) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
      const cx = img.naturalWidth / 2, cy = img.naturalHeight / 2, t = (rot * Math.PI) / 180, co = Math.cos(t) * sc * f, si = Math.sin(t) * sc * f;
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.setTransform(co, si, -si, co, (cx + dx) * f - co * cx + si * cy, (cy + dy) * f - si * cx - co * cy); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h); for (let i = 0; i < g.length; i++) g[i] = (d[4 * i] + d[4 * i + 1] + d[4 * i + 2]) / 3; return g;
    }
    /* 自动对齐：先在 1/8 分辨率上搜缩放与平移，再在 1/2 分辨率上细调（只比中间 70% 的区域，避开书口与色卡）。 */
    align(a, b) {
      const W0 = a.naturalWidth, H0 = a.naturalHeight; let best = { e: Infinity, sc: 1, dx: 0, dy: 0 };
      const [fx0, fx1] = this.s.half === 'L' ? [0.2, 0.5] : this.s.half === 'R' ? [0.5, 0.8] : [0.15, 0.85];
      const score = (A, B, w, h, ox, oy) => { let e = 0, n = 0; for (let y = Math.floor(h * 0.15); y < h * 0.85; y++) { const yy = y - oy; if (yy < 0 || yy >= h) continue; for (let x = Math.floor(w * fx0); x < w * fx1; x++) { const xx = x - ox; if (xx < 0 || xx >= w) continue; const d = A[y * w + x] - B[yy * w + xx]; e += d * d; n++; } } return e / (n || 1); };
      let f = 1 / 8, w = Math.round(W0 * f), h = Math.round(H0 * f); const A = this.gray(a, w, h, f);
      for (let rot = -1.5; rot <= 1.51; rot += 0.25) for (let sc = 0.97; sc <= 1.031; sc += 0.01) { const B = this.gray(b, w, h, f, sc, 0, 0, rot); for (let oy = -8; oy <= 8; oy++) for (let ox = -10; ox <= 10; ox++) { const e = score(A, B, w, h, ox, oy); if (e < best.e) best = { e, sc, rot, dx: ox / f, dy: oy / f }; } }
      f = 1 / 2; w = Math.round(W0 * f); h = Math.round(H0 * f); const A2 = this.gray(a, w, h, f); let fine = { ...best, e: Infinity };
      for (const rot of [best.rot - 0.1, best.rot, best.rot + 0.1]) for (const sc of [best.sc - 0.005, best.sc, best.sc + 0.005]) { const B = this.gray(b, w, h, f, sc, best.dx, best.dy, rot); for (let oy = -4; oy <= 4; oy++) for (let ox = -4; ox <= 4; ox++) { const e = score(A2, B, w, h, ox, oy); if (e < fine.e) fine = { e, sc, rot, dx: best.dx + ox / f, dy: best.dy + oy / f }; } }
      return fine;
    }
    drawDiff(auto = false) {
      const cv = this.querySelector('canvas[data-diff]'); const P = PUB().bukan; if (!cv || !P) return;
      const pr = P.pairs[+this.s.pair] || P.pairs[0]; const a = new Image(), b = new Image(); let n = 0;
      const go = () => { if (++n < 2) return;
        if (auto) { const r = this.align(a, b); this.s.dx = String(Math.round(r.dx)); this.s.dy = String(Math.round(r.dy)); this.s.sc = r.sc.toFixed(3); this.s.rot = r.rot.toFixed(2); this.s.aligned = this.s.pair + this.s.half; store.set(this.key, this.s); this.render(); return; }
        const w = a.naturalWidth, h = a.naturalHeight; cv.width = w; cv.height = h; const ctx = cv.getContext('2d');
        const blur = (g) => { const o = new Float32Array(g.length); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { let s2 = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s2 += g[(y + j) * w + x + i]; o[y * w + x] = s2 / 9; } return o; };
        const A = this.gray(a, w, h, 1), B = this.gray(b, w, h, 1, Number(this.s.sc) || 1, Number(this.s.dx) || 0, Number(this.s.dy) || 0, Number(this.s.rot) || 0), Ab = blur(A), Bb = blur(B), th = Number(this.s.th);
        const O = ctx.createImageData(w, h); let red = 0;
        const hx0 = this.s.half === 'R' ? w / 2 : 0, hx1 = this.s.half === 'L' ? w / 2 : w;
        for (let i = 0; i < A.length; i++) { const g = A[i] * 0.6 + 100, xi = i % w; if (xi >= hx0 && xi < hx1 && Math.abs(Ab[i] - Bb[i]) > th) { O.data[4 * i] = 220; O.data[4 * i + 1] = 30; O.data[4 * i + 2] = 30; red++; } else { O.data[4 * i] = O.data[4 * i + 1] = O.data[4 * i + 2] = g; } O.data[4 * i + 3] = 255; }
        ctx.putImageData(O, 0, 0); cv.dataset.red = red; cv.dataset.share = (red / A.length).toFixed(4); };
      a.onload = go; b.onload = go; a.src = pr.a.img; b.src = pr.b.img;
    }
    textDiff() {
      const K = LX()?.kanripo_wanggui; const W7 = W.Mat.text('songshi_w7');
      const opts = [['songshi_w7', '维基文库（第七周选段，788 字）'], ...(K ? [['WYG', K.witnesses.WYG.label], ['master', K.witnesses.master.label]] : []), ['paste', '自己粘贴的文本']];
      if (!K && ['WYG', 'master'].includes(this.s.B)) this.s.B = 'paste';
      if (!K && ['WYG', 'master'].includes(this.s.A)) this.s.A = 'songshi_w7';
      const get = (k) => (k === 'songshi_w7' ? W7?.text : k === 'paste' ? this.s.paste : K?.witnesses?.[k]?.text) || '';
      let A = get(this.s.A), B = get(this.s.B);
      const prep = (s) => { let t = s; if (this.s.ignP) t = t.replace(PUNCT, ''); return [...t]; };
      let a = prep(A), b = prep(B);
      // 维基文库是选段：只取乙本中与甲本首尾对应的一段，避免整卷都算“缺”
      if (this.s.A === 'songshi_w7' && b.length > a.length * 1.5) { const s0 = b.join('').indexOf(a.slice(0, 6).join('')); if (s0 > 0) b = b.slice(s0); }
      if (a.length * b.length > 6e6) return '<p class="nil">文本太长，页面只比较 2,000 字以内的两段。</p>';
      const d = diffChars(a, b), same = (x, y) => this.s.ignV && (VMAP.get(x) || x) === (VMAP.get(y) || y);
      const vs = d.filter(([t, x, y]) => t === '~' && same(x, y)).length, other = d.filter(([t, x, y]) => t !== '=' && !(t === '~' && same(x, y)));
      const html = d.map(([t, x, y]) => (t === '=' ? esc(x) : t === '~' ? (same(x, y) ? `<span class="dv" title="异体字">${esc(x)}</span>` : `<del>${esc(x)}</del><ins>${esc(y)}</ins>`) : t === '-' ? `<del>${esc(x)}</del>` : `<ins>${esc(y)}</ins>`)).join('');
      return `<p>甲 <select data-k="A">${opts.map(([v, l]) => `<option value="${v}" ${this.s.A === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select> 乙 <select data-k="B">${opts.map(([v, l]) => `<option value="${v}" ${this.s.B === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></p>
        ${!K ? '<p class="sub">Kanripo 的两个数字本在本机材料包中（仓库未见许可证文件）；课前导入后可选。也可以把别的版本粘贴进来比较。</p>' : ''}
        ${this.s.A === 'paste' || this.s.B === 'paste' ? `<textarea data-ki="paste" rows="3" placeholder="粘贴另一个版本">${esc(this.s.paste)}</textarea>` : ''}
        <p><label class="check-row small"><input type="checkbox" data-k="ignP" ${this.s.ignP ? 'checked' : ''}>忽略标点</label> <label class="check-row small"><input type="checkbox" data-k="ignV" ${this.s.ignV ? 'checked' : ''}>异体字另标（课件小表 ${VARIANTS.length} 组）</label></p>
        <p class="okbox">逐字对齐：异体字 ${vs} 处；其他差异 ${other.length} 处（删 ${other.filter(([t]) => t === '-').length}、增 ${other.filter(([t]) => t === '+').length}、改 ${other.filter(([t]) => t === '~').length}）。</p>
        <div class="srcbox small-src difftext">${html}</div>
        <p class="sub">删除线为甲有乙无，下划线为乙有甲无，灰底为异体字。维基文库选段中的“……”是选录时的省略，会显示为一段“乙有甲无”。数字本之间的差异多是字形与录入，不是史实；第一个标签里武鑑的改版才是时间的变化。</p>`;
    }
    eras() {
      const r = convertEra(this.s.era || '');
      return `<label>纪年 <input data-k="era" value="${esc(this.s.era)}" size="12"></label> <span class="sub">回车换算；例：熙寧三年、元豐五年、嘉祐元年、寛政九年、文政7年</span>
        ${r ? `<p class="okbox">${esc(r.era)}${r.n}年 → 公元 <b>${r.ad}</b> 年${r.over ? `（超出该年号的 ${esc(String((LX()?.jbdb_nengo || []).find((x) => x.cNengoName === r.era)?.cMaxYears))} 年，查原文）` : ''}</p>` : `<p class="nil">年号表中未找到“${esc(this.s.era)}”。</p>`}
        <p class="sub">${esc(PUB().eras_song?.note || '')} 日本年号：导入本机材料包时据 JBDB NengoCodes（cStartYearMinusOne＋1），否则用课件录入的江户后期年号表（待核）。年中改元、闰月、公历与农历年首的错位都不在此换算之内；要换到日，用 HuTime 的暦变换服务（讲义 5.2）。</p>`;
    }
    render() {
      const body = this.s.tab === 'bukan' ? this.bukan() : this.s.tab === 'text' ? this.textDiff() : this.eras();
      rerender(this, `${seg('tab', [['bukan', '武鑑相邻两版（图像差读）'], ['text', '王珪传几个数字本（文本差读）'], ['era', '年号换算']], this.s.tab)}<div class="tabpane">${body}</div>
        <p class="sub">“差读”是 CODH 武鑑全集的做法：相邻两版只翻刻有变化的部分，比较两版就能得到藩的时间序列（讲义 5.2；扩充部分丁二；案例 C-20）。</p>`);
      if (this.s.tab === 'bukan' && this.s.mode === 'diff') { const k = this.s.pair + this.s.half; this.drawDiff(this.s.aligned !== k); }
      clearInterval(this._bl); if (this.s.tab === 'bukan' && this.s.mode === 'blink') this._bl = setInterval(() => this.querySelector('.blink')?.classList.toggle('on'), 900);
    }
  }
  DiffLab.prototype.init = function () { this.addEventListener('click', (e) => { if (e.target.dataset.align) { e.target.disabled = true; e.target.textContent = '对齐中…'; this.s.aligned = ''; setTimeout(() => this.drawDiff(true), 30); } }); };
  register('diff-lab', DiffLab);

  /* ================= D22 让模型排年表 ================= */
  class ChronoLab extends Lab {
    defaults() { return { sel: '' }; }
    render() {
      const run0 = PUB().runs?.['chrono_qwen3-4b']; const T = W.Mat.text('songshi_w7')?.text || '';
      const run = run0 && this._live?.parsed ? { ...run0, parsed: this._live.parsed, model: { key: this._live.via }, date: this._live.date, live: true } : run0;
      if (!run) { rerender(this, '<p class="sub">公开材料载入中，或课前尚未运行。</p>'); return; }
      const NT = nrm(T); let lastEra = null;
      const rows = (run.parsed?.rows || []).map((r, i) => {
        const q = r.quote || '', found = q && NT.includes(nrm(q)); let c = convertEra(r.date_raw || '');
        const named = (PUB().eras_song?.eras || []).find(([n]) => (r.date_raw || '').includes(n)); // 只提年号不带年数（如“元豐官制行”）也要记下，供后文“五年”承用
        if (c) lastEra = c; else if (named) lastEra = { era: named[0], start: named[1] };
        if (!c && lastEra && /^[元一二三四五六七八九十]+年/.test(r.date_raw || '')) { const n = cnNum((r.date_raw.match(/^([元一二三四五六七八九十]+)年/) || [])[1]); if (Number.isFinite(n)) c = { era: lastEra.era + '（承上文）', n, ad: lastEra.start + n - 1 }; }
        const ym = r.year_ad == null ? null : Number(r.year_ad);
        return { ...r, i, found, conv: c, ym, ok: c && ym != null ? c.ad === ym : null, noDate: /未记|无/.test(r.date_raw || '') };
      });
      const col1 = `<div class="srcbox small-src">${esc(T)}</div><p class="sub">《宋史·王珪传》较长选段（第七周练习材料一全文，维基文库）。</p>`;
      const col2 = `<table class="steps small"><tr><th>#</th><th>原文纪年</th><th>模型公元年</th><th>事件</th></tr>${rows.map((r) => `<tr data-cr="${r.i}" class="${String(r.i) === this.s.sel ? 'on' : ''}"><td>${r.i + 1}</td><td>${esc(r.date_raw || '')}</td><td>${r.ym ?? '—'}</td><td>${esc(r.event || '')}</td></tr>`).join('')}</table>
        <p class="sub">${esc(run.model?.key)}（${esc(run.model?.file)}），${esc(run.date)}，用时 ${run.calls?.[0]?.seconds} 秒；温度 0；要求每行逐字照抄原文引句。${run.parsed?.truncated ? '<b>回复在词元上限（1,800）处被截断，只保留了截断前完整的 ' + rows.length + ' 行；后半段（元豐八年以后）没有排出来。</b>' : ''}原文纪年一栏，模型多把整句抄了进来，没有按要求只写纪年。</p>${liveBar(this)}${run.live ? '<p class="note-box small">当前显示的是刚才现场运行的结果（浏览器实时），不是保存的记录。</p>' : ''}`;
      const bad = rows.filter((r) => !r.found), wrong = rows.filter((r) => r.ok === false), undated = rows.filter((r) => r.noDate || r.ym == null);
      const col3 = `<table class="steps small"><tr><th>#</th><th>引句在原文中？</th><th>页面换算</th><th>与模型一致？</th></tr>${rows.map((r) => `<tr class="${!r.found || r.ok === false ? 'bad' : ''}"><td>${r.i + 1}</td><td>${r.found ? '找到' : `<span class="nil">找不到</span>`}<br><span class="sub">${esc((r.quote || '（无）').slice(0, 30))}</span></td><td>${r.conv ? `${esc(r.conv.era)}${r.conv.n}年＝${r.conv.ad}` : '—'}</td><td>${r.ok == null ? '—' : r.ok ? '一致' : '<span class="nil">不一致</span>'}</td></tr>`).join('')}</table>`;
      const col4 = `<p class="okbox">共 ${rows.length} 行：引句在原文中找不到的 ${bad.length} 行；年份与页面换算不一致的 ${wrong.length} 行；原文无纪年或模型未给年份的 ${undated.length} 行。</p>
        <p class="sub">“原文未记”的行是模型据上下文或常识补的年代，要另找出处。“八年”“五年”一类只写年数的，年号承上文；页面按承上文换算，模型若换错就会在这里露出来。讲义 5.3：序列越长、时段交叠越多，模型越容易排错；东亚年号纪年未经检验。</p>
        <details><summary>时间序列（粮价）</summary><p class="sub">清代粮价部分按教师 2026-11-02 指示暂缓（扩充部分甲七、乙六）。</p></details>`;
      rerender(this, flowShell(pageById('D22'), [{ title: '事件表', body: col1 }, { title: '模型年表', body: col2 }, { title: '回原文', body: col3 }, { title: '粮价（暂缓）', body: col4 }]));
    }
    init() { this.addEventListener('click', (e) => { const r = e.target.closest('[data-cr]'); if (r) { this.s.sel = r.dataset.cr; this.save(); } const x = e.target.dataset.rerun; if (x === 'back') { this._live = null; this._liveErr = ''; this.render(); } else if (x) liveRerun(this, PUB().runs?.['chrono_qwen3-4b'], 'rows', e.target); }); }
  }
  register('chrono-lab', ChronoLab);

  window.W8L4 = { mapSvg, wgs2gcj, hav, convertEra, diffChars, gazetteerRef, cands, D16_ITEMS };
})();
