/* 第七周：浏览器内模型（Web Worker，避免卡住页面）。
 * - Qwen3（transformers.js 3.8.1，ONNX）：有 WebGPU 用 q4f16，否则用 WASM 跑 q8（0.6B、1.7B）。不支持约束解码，只能事后校验。
 * - GLiNER multi v2.1（gliner.js 0.0.19，onnx-community 的 fp16 ONNX）：零样本命名实体识别，输出字符位置。int8 版本实测全部低分，不用。
 * 库从 jsdelivr 取固定版本，权重从 Hugging Face 取，均由浏览器缓存；材料文字不出本机。 */
const TJS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const GLINER = 'https://cdn.jsdelivr.net/npm/gliner@0.0.19/+esm';
const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/';
export const QWEN = {
  'qwen3-0.6b': { repo: 'onnx-community/Qwen3-0.6B-ONNX', webgpu: 'q4f16', wasm: 'q8', size: { q4f16: '约 0.6 GB', q8: '约 0.6 GB' } },
  'qwen3-1.7b': { repo: 'onnx-community/Qwen3-1.7B-ONNX', webgpu: 'q4f16', wasm: 'q8', size: { q4f16: '约 1.3 GB', q8: '约 1.9 GB' } },
  'qwen3-4b': { repo: 'onnx-community/Qwen3-4B-ONNX', webgpu: 'q4f16', wasm: null, size: { q4f16: '约 2.9 GB' } },
};
let T = null; const qwen = {}; let gliner = null; let glinerInfo = null;
const post = (id, m) => self.postMessage({ id, ...m });
async function hasWebGPU() { try { return !!(self.navigator.gpu && await self.navigator.gpu.requestAdapter()); } catch { return false; } }
async function loadQwen(id, key, prefer) {
  const spec = QWEN[key]; if (!spec) throw new Error('未登记的模型：' + key);
  if (qwen[key]) return qwen[key].info;
  T ||= await import(TJS); T.env.allowLocalModels = false;
  const gpu = prefer !== 'wasm' && await hasWebGPU();
  const device = gpu ? 'webgpu' : 'wasm', dtype = gpu ? spec.webgpu : spec.wasm;
  if (!dtype) throw new Error(`${key} 在本浏览器只能用 WebGPU（未检测到可用的 WebGPU）；请改用 0.6B 或 1.7B，或用 Chrome 打开`);
  const files = {};
  const progress_callback = (p) => { if (p.status === 'progress' && p.file) { files[p.file] = [p.loaded, p.total]; const L = Object.values(files).reduce((a, [l]) => a + l, 0), Tt = Object.values(files).reduce((a, [, t]) => a + (t || 0), 0); post(id, { progress: `下载 ${key}（${device}/${dtype}）：${(L / 1e6).toFixed(0)} / ${(Tt / 1e6).toFixed(0)} MB` }); } };
  const t0 = performance.now();
  const tok = await T.AutoTokenizer.from_pretrained(spec.repo, { progress_callback });
  const model = await T.AutoModelForCausalLM.from_pretrained(spec.repo, { dtype, device, progress_callback });
  const info = { key, repo: spec.repo, device, dtype, load_seconds: +((performance.now() - t0) / 1000).toFixed(1), runtime: 'transformers.js 3.8.1' };
  qwen[key] = { tok, model, info }; return info;
}
async function genQwen(id, { key, messages, max_new_tokens = 1024 }) {
  const q = qwen[key]; if (!q) throw new Error('模型尚未载入');
  const inp = q.tok.apply_chat_template(messages, { add_generation_prompt: true, return_dict: true, enable_thinking: false });
  const nIn = inp.input_ids.dims[1]; let n = 0, last = 0;
  const streamer = new T.TextStreamer(q.tok, { skip_prompt: true, skip_special_tokens: true, callback_function: (t) => { n++; const now = performance.now(); if (now - last > 400) { last = now; post(id, { partial: t, tokens: n }); } } });
  const t0 = performance.now();
  const out = await q.model.generate({ ...inp, max_new_tokens, do_sample: false, streamer });
  const outIds = out.slice(null, [nIn, null]); const nOut = outIds.dims[1];
  const text = q.tok.batch_decode(outIds, { skip_special_tokens: true })[0];
  const eos = q.tok.eos_token_id; const lastId = Number(outIds.data[outIds.data.length - 1]);
  return { text, usage: { prompt_tokens: nIn, completion_tokens: nOut }, finish_reason: nOut >= max_new_tokens && lastId !== eos ? 'length' : 'stop', seconds: +((performance.now() - t0) / 1000).toFixed(1), model: q.info.repo, info: q.info,
    prompt_rendered: q.tok.batch_decode(inp.input_ids, { skip_special_tokens: false })[0] };
}
async function loadGliner(id) {
  if (gliner) return glinerInfo;
  post(id, { progress: '载入 GLiNER 运行库与权重（约 580 MB，首次需几分钟）…' });
  const t0 = performance.now();
  const { Gliner } = await import(GLINER);
  const modelPath = 'https://huggingface.co/onnx-community/gliner_multi-v2.1/resolve/main/onnx/model_fp16.onnx';
  const g = new Gliner({ tokenizerPath: 'onnx-community/gliner_multi-v2.1', onnxSettings: { modelPath, executionProvider: 'wasm', wasmPaths: ORT_WASM, multiThread: false }, maxWidth: 12, modelType: 'span-level' });
  await g.initialize(); gliner = g;
  glinerInfo = { model: 'onnx-community/gliner_multi-v2.1（model_fp16.onnx）', runtime: 'gliner.js 0.0.19 + onnxruntime-web 1.19.2（WASM）', load_seconds: +((performance.now() - t0) / 1000).toFixed(1) };
  return glinerInfo;
}
async function runGliner(id, { chunks, labels, threshold }) {
  if (!gliner) await loadGliner(id);
  const t0 = performance.now(); const out = [];
  for (let i = 0; i < chunks.length; i++) {
    post(id, { progress: `GLiNER：第 ${i + 1}／${chunks.length} 段` });
    const r = await gliner.inference({ texts: [chunks[i].text], entities: labels, threshold, flatNer: true });
    for (const e of r[0] || []) out.push({ text: e.spanText, label: e.label, score: +e.score.toFixed(3), start: chunks[i].start + e.start, end: chunks[i].start + e.end });
  }
  return { spans: out, seconds: +((performance.now() - t0) / 1000).toFixed(1), info: glinerInfo };
}
self.onmessage = async ({ data }) => {
  const { id, op } = data;
  try {
    let result;
    if (op === 'probe') result = { webgpu: await hasWebGPU(), loaded: Object.keys(qwen), gliner: !!gliner };
    if (op === 'qwen-load') result = await loadQwen(id, data.key, data.prefer);
    if (op === 'qwen-gen') { await loadQwen(id, data.key, data.prefer); result = await genQwen(id, data); }
    if (op === 'gliner-load') result = await loadGliner(id);
    if (op === 'gliner-run') result = await runGliner(id, data);
    post(id, { ok: true, result });
  } catch (e) { post(id, { ok: false, error: String(e?.message || e) }); }
};
