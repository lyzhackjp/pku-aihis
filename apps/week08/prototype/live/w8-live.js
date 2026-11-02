/* 第八周：浏览器内模型与通用导入页握手（ES 模块；须经 HTTP 打开：本机服务或 GitHub Pages）。
 * 做法沿用第七周 live/w7-live.js：模型在 Web Worker 中运行，库从 jsDelivr 取固定版本（transformers.js 3.8.1、gliner.js 0.0.19），
 * 权重从 Hugging Face 取，均由浏览器缓存；课前在“模型接入”中载入一次即可。材料文字不出本机。
 * 第八周用到：句向量（D06 余弦）、GLiNER（D13 人物候选）、Qwen3（之后的 D15、D18、D22）。 */
import { EMB, QWEN } from './models.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emit = () => document.dispatchEvent(new CustomEvent('w8-live'));
function workerClient(file, { onReset = null } = {}) {
  let w = null, seq = 0; const calls = new Map();
  const get = () => {
    if (w) return w;
    w = new Worker(new URL(file, import.meta.url), { type: 'module' });
    w.onmessage = ({ data }) => { const c = calls.get(data.id); if (!c) return; if (data.progress || data.partial != null) { c.onProgress?.(data); return; } calls.delete(data.id); if (data.ok) return c.ok(data.result); c.no(new Error(data.error)); reset(); };
    w.onerror = (e) => { for (const c of calls.values()) c.no(new Error('浏览器内模型线程出错：' + (e.message || '可能是内存不足或网络中断'))); calls.clear(); try { w.terminate(); } catch { /* ignore */ } w = null; onReset?.(); };
    return w;
  };
  function reset() { if (!w) return; w.terminate(); w = null; for (const c of calls.values()) c.no(new Error('线程已关闭（上一步失败后重置）')); calls.clear(); onReset?.(); }
  const call = (msg, onProgress) => new Promise((ok, no) => { const id = ++seq; calls.set(id, { ok, no, onProgress }); get().postMessage({ ...msg, id }); });
  call.terminate = () => { if (!w) return; w.terminate(); w = null; for (const c of calls.values()) c.no(new Error('线程已关闭')); calls.clear(); };
  call.busy = () => calls.size > 0;
  return call;
}
const S = { webgpu: null, emb: {}, gliner: null, qwen: {}, msg: {}, embKey: localStorage.getItem('w8/embKey') || 'bge-small-zh' };
/* 句向量单独一个线程（小）；GLiNER 与 Qwen3 同一时间只保留一个（第七周实测两者同时驻留时浏览器因内存不足崩溃）。 */
const ecall = workerClient('./browser-worker.js', { onReset: () => { S.emb = {}; emit(); } });
const gcall0 = workerClient('./browser-worker.js', { onReset: () => { S.gliner = null; emit(); } });
const qcall0 = workerClient('./browser-worker.js', { onReset: () => { S.qwen = {}; emit(); } });
const gcall = (m, p) => { if (Object.keys(S.qwen).length && !qcall0.busy()) { qcall0.terminate(); S.qwen = {}; S.msg.qwen = '已卸载（为 GLiNER 腾出内存）'; } return gcall0(m, p); };
const qcall = (m, p) => { if (S.gliner && !gcall0.busy()) { gcall0.terminate(); S.gliner = null; S.msg.gliner = '已卸载（为 Qwen3 腾出内存）'; } return qcall0(m, p); };

async function loadEmb(key) { S.msg['emb-' + key] = '载入中…'; emit(); try { const info = await ecall({ op: 'emb-load', key }, (d) => { S.msg['emb-' + key] = d.progress; emit(); }); S.emb[key] = info; S.msg['emb-' + key] = `已载入（${info.load_seconds} 秒）`; emit(); return info; } catch (e) { S.msg['emb-' + key] = '失败：' + e.message; emit(); throw e; } }
async function loadGliner() { S.msg.gliner = '载入中…'; emit(); try { const info = await gcall({ op: 'gliner-load' }, (d) => { S.msg.gliner = d.progress; emit(); }); S.gliner = info; S.msg.gliner = `已载入（${info.load_seconds} 秒）`; emit(); return info; } catch (e) { S.msg.gliner = '失败：' + e.message; emit(); throw e; } }
async function loadQwen(key) { S.msg[key] = '载入中…'; emit(); try { const info = await qcall({ op: 'qwen-load', key }, (d) => { S.msg[key] = d.progress; emit(); }); S.qwen[key] = info; S.msg[key] = `已载入（${info.device}/${info.dtype}，${info.load_seconds} 秒）`; emit(); return info; } catch (e) { S.msg[key] = '失败：' + e.message; emit(); throw e; } }

const cos = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
const W8Live = {
  status: () => S,
  /* 句对余弦：每句单独编码（向量已 L2 归一，点积即余弦）。 */
  async pairCos(pairs, key = S.embKey) {
    const texts = [...new Set(pairs.flat())];
    const r = await ecall({ op: 'emb-run', key, texts }, (d) => { S.msg['emb-' + key] = d.progress; emit(); });
    S.emb[key] = r.info; S.msg['emb-' + key] = `已载入；上次编码 ${texts.length} 句，${r.seconds} 秒`; emit();
    const V = new Map(texts.map((t, i) => [t, r.vectors[i]]));
    return { model: `${EMB[key].label}（${r.info.dtype}，${r.info.pooling} 池化，浏览器内 ${new Date().toISOString().slice(0, 10)}）`, cos: pairs.map(([a, b]) => +cos(V.get(a), V.get(b)).toFixed(4)), seconds: r.seconds };
  },
  /* GLiNER 零样本实体识别：只给候选与字符位置，判断由人做。 */
  async ner(text, labels, threshold = 0.3) {
    const r = await gcall({ op: 'gliner-run', chunks: [{ text, start: 0 }], labels, threshold }, (d) => { S.msg.gliner = d.progress; emit(); });
    S.gliner = r.info; emit();
    const seen = new Set(); const spans = r.spans.filter((s) => (seen.has(s.text) ? false : seen.add(s.text)));
    return { model: r.info.model, seconds: r.seconds, threshold, spans };
  },
  async gen(messages, key = 'qwen3-0.6b', max_new_tokens = 512) { return qcall({ op: 'qwen-gen', key, messages, max_new_tokens }, (d) => { S.msg[key] = d.partial ? `生成中：${d.tokens} 词元` : d.progress; emit(); }); },
};
window.W8Live = W8Live;
document.querySelectorAll('[data-needs-pack]').forEach((n) => n.packChanged?.());

/* ================= 模型接入面板 ================= */
function panel() {
  const shade = document.createElement('div'); shade.className = 'model-shade';
  const draw = () => {
    shade.innerHTML = `<div class="model-panel" role="dialog" aria-label="模型接入"><button class="close" data-x="close">关闭 ×</button><h2>模型接入：浏览器内模型（课前载入）</h2>
      <p class="sub">模型在本浏览器内运行，材料文字不发送到任何服务器。首次需联网下载（库来自 jsDelivr，权重来自 Hugging Face），之后由浏览器缓存；换浏览器或清除网站数据后需重下。课前在授课用的浏览器与正式网址上各载入一次。WebGPU：${S.webgpu == null ? '检测中' : S.webgpu ? '可用' : '不可用（Qwen3-4B 不能用）'}</p>
      <h3>句向量（D06 余弦）</h3>${Object.entries(EMB).map(([k, v]) => `<p class="check-row"><input type="radio" name="emb" value="${k}" ${S.embKey === k ? 'checked' : ''} data-emb-pick><span><b>${esc(v.label)}</b>　${esc(v.size)}　<button class="small" data-load="emb:${k}">载入</button>　<span class="mp-status">${esc(S.msg['emb-' + k] || (S.emb[k] ? '已载入' : '未载入'))}</span></span></p>`).join('')}
      <h3>GLiNER multi v2.1（D13 人物候选）</h3><p>fp16 ONNX，约 580 MB　<button class="small" data-load="gliner">载入</button>　<span class="mp-status">${esc(S.msg.gliner || (S.gliner ? '已载入' : '未载入'))}</span></p>
      <h3>Qwen3（第二批页面：模型排年表、抽地点）</h3>${Object.entries(QWEN).map(([k, v]) => `<p><b>${k}</b>　${esc(Object.entries(v.size).map(([a, b]) => a + ' ' + b).join('；'))}　<button class="small" data-load="qwen:${k}">载入</button>　<span class="mp-status">${esc(S.msg[k] || (S.qwen[k] ? '已载入' : '未载入'))}</span></p>`).join('')}
      <p class="sub">GLiNER 与 Qwen3 同一时间只保留一个（第七周实测两者同时驻留会使浏览器因内存不足崩溃）；句向量模型很小，可同时保留。</p></div>`;
  };
  draw(); document.addEventListener('w8-live', draw);
  shade.addEventListener('click', (e) => {
    if (e.target === shade || e.target.dataset.x === 'close') { document.removeEventListener('w8-live', draw); shade.remove(); return; }
    const l = e.target.dataset.load; if (!l) return; const [k, v] = l.split(':');
    (k === 'emb' ? loadEmb(v) : k === 'gliner' ? loadGliner() : loadQwen(v)).catch(() => {});
  });
  shade.addEventListener('change', (e) => { if (e.target.matches('[data-emb-pick]')) { S.embKey = e.target.value; localStorage.setItem('w8/embKey', S.embKey); emit(); } });
  document.body.append(shade);
}
ecall({ op: 'probe' }).then((r) => { S.webgpu = r.webgpu; emit(); }).catch(() => { S.webgpu = false; emit(); });

/* ================= 通用导入页握手（同第五、六、七周：PKU_IMPORT_READY／PKU_PROJECT，pku-history-project/v1） ================= */
let importer = null;
function openImporter() {
  const u = new URL('../importer/index.html', import.meta.url); u.searchParams.set('receiver', location.origin);
  importer = window.open(u.href, 'week08-material-importer');
  if (!importer) toast('浏览器拦截了弹出窗口，请允许本站弹窗后再点“文献导入”。');
}
window.addEventListener('message', async (e) => {
  if (e.origin !== location.origin || !importer || e.source !== importer) return;
  if (e.data?.type === 'PKU_IMPORT_READY') importer.postMessage({ type: 'PKU_IMPORT_HELLO' }, location.origin);
  if (e.data?.type === 'PKU_PROJECT') {
    try {
      const p = e.data.project;
      if (!p || p.schema !== 'pku-history-project/v1' || !Array.isArray(p.sources) || !Array.isArray(p.segments)) throw new Error('不是 pku-history-project/v1 项目');
      const ids = new Set(p.sources.map((s) => s.id)); for (const s of p.segments) if (!ids.has(s.sourceId) || typeof s.text !== 'string') throw new Error('正文片段无法回到材料');
      const segs = p.segments.filter((s) => s.text.trim() && !s.derived && !s.supersededBy), title = (id) => p.sources.find((s) => s.id === id)?.title || id;
      const m = { id: 'user-text-' + Date.now().toString(36), kind: 'text', title: (p.title || '通用导入页送回的材料') + `（${segs.length} 段）`,
        card: { unit: '正文片段', edge_meaning: '—（文本集合）', missing: '只取正文文字，原件仍在导入页', time_precision: '—', nature: '实际数据', visibility: '本浏览器', obtained: '通用导入页送回 ' + new Date().toISOString().slice(0, 16) },
        rows: segs.map((s) => ({ id: s.id, text: s.text, title: title(s.sourceId), ref: [title(s.sourceId), s.printedPage ? '原页 ' + s.printedPage : s.pdfPage ? 'PDF 页序 ' + s.pdfPage : s.locator || ''].filter(Boolean).join('，') })) };
      await window.W8.Mat.putUser(m);
      const msg = `第八周已接收 ${segs.length} 个正文片段（只取正文文字），在各页的文本材料中选用。`;
      importer.postMessage({ type: 'PKU_IMPORT_ACCEPTED', message: msg }, location.origin); toast(msg);
    } catch (err) { importer.postMessage({ type: 'PKU_IMPORT_REJECTED', message: err.message }, location.origin); toast('导入失败，旧材料保留：' + err.message); }
  }
});
function toast(msg) { let n = document.querySelector('.live-toast'); if (!n) { n = document.createElement('div'); n.className = 'live-toast'; n.setAttribute('role', 'status'); document.body.append(n); } n.textContent = msg; n.hidden = false; clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 8000); }

/* 顶栏按钮 */
function bar() {
  const top = document.querySelector('.deck-top'); if (!top) return setTimeout(bar, 100);
  if (top.querySelector('[data-live]')) return;
  const b1 = document.createElement('button'); b1.textContent = '模型接入'; b1.dataset.live = 'model'; b1.onclick = panel;
  const b2 = document.createElement('button'); b2.textContent = '文献导入'; b2.dataset.live = 'importer'; b2.title = '打开课程通用导入页（PDF、Word、图像）；处理后送回本课件'; b2.onclick = openImporter;
  const p = top.querySelector('[data-act="presenter"]'); top.insertBefore(b1, p); top.insertBefore(b2, p);
}
bar();
