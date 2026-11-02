/* 第八周浏览器内模型的登记表（页面与模型线程共用）。 */
export const QWEN = {
  'qwen3-0.6b': { repo: 'onnx-community/Qwen3-0.6B-ONNX', webgpu: 'q4f16', wasm: 'q8', size: { q4f16: '约 0.6 GB', q8: '约 0.6 GB' } },
  'qwen3-4b': { repo: 'onnx-community/Qwen3-4B-ONNX', webgpu: 'q4f16', wasm: null, size: { q4f16: '约 2.9 GB' } },
};

/* 句向量（transformers.js feature-extraction）。bge 用 CLS 池化，MiniLM 用平均池化（照各自模型卡）；均做 L2 归一。 */
export const EMB = {
  'bge-small-zh': { repo: 'Xenova/bge-small-zh-v1.5', pooling: 'cls', dtype: 'q8', size: '约 25 MB（q8）', label: 'BAAI bge-small-zh-v1.5（中文，MIT）' },
  'minilm-multi': { repo: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', pooling: 'mean', dtype: 'q8', size: '约 120 MB（q8）', label: 'paraphrase-multilingual-MiniLM-L12-v2（多语，第五周同款，Apache-2.0）' },
};
