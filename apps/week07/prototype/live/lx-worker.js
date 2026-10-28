/* 第七周：LangExtract（提交 3a68580，Apache-2.0）在浏览器内运行（Pyodide 0.28.3，Web Worker）。
 * 分块、提示、解析与源位置对齐都是 LangExtract 原代码；模型调用由页面发出（API、本机服务或浏览器内 Qwen3）。
 * 做法：第一遍用“记录提示”的模型类跑 lx.extract，取得每个分块的提示；页面逐条调用模型；
 * 第二遍把模型原始回复按提示原样交回同一个 lx.extract，得到抽取与对齐结果。extraction_passes=1 时两遍的分块与提示相同。 */
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.mjs';
const WHEEL = new URL('./vendor/langextract-1.7.1+3a68580-py3-none-any.whl', import.meta.url).href;
let py = null; let info = null;
const post = (id, m) => self.postMessage({ id, ...m });
async function load(id) {
  if (py) return info;
  const t0 = performance.now();
  post(id, { progress: '载入 Pyodide 0.28.3（约 10 MB）…' });
  py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/' });
  post(id, { progress: '载入 Python 依赖（regex、pydantic、pandas 等，约 30 MB）…' });
  await py.loadPackage(['micropip', 'regex', 'pyyaml', 'pydantic', 'requests', 'numpy', 'pandas']);
  post(id, { progress: '安装 LangExtract 3a68580 与纯 Python 依赖…' });
  const whl = new Uint8Array(await (await fetch(WHEEL)).arrayBuffer());
  py.FS.writeFile('/tmp/langextract-1.7.1-py3-none-any.whl', whl);
  await py.runPythonAsync(`
import micropip
await micropip.install(['absl-py', 'more-itertools', 'tqdm', 'typing-extensions'])
await micropip.install('emfs:/tmp/langextract-1.7.1-py3-none-any.whl', deps=False)
import json, langextract as lx
from langextract.core import base_model, types as core_types, tokenizer as tk
PROMPTS = []
CACHE = {}
class PageModel(base_model.BaseLanguageModel):
    def infer(self, batch_prompts, **kw):
        for p in batch_prompts:
            if p not in CACHE and p not in PROMPTS:
                PROMPTS.append(p)
            yield [core_types.ScoredOutput(score=1.0, output=CACHE.get(p, '{"extractions": []}'))]
def run_lx(args_json):
    a = json.loads(args_json)
    PROMPTS.clear(); CACHE.clear(); CACHE.update(a.get('cache') or {})
    ex = [lx.data.ExampleData(text=e['text'], extractions=[lx.data.Extraction(x['class'], x['text'], attributes=x.get('attributes')) for x in e['extractions']]) for e in a['examples']]
    tok = tk.UnicodeTokenizer() if a.get('tokenizer') == 'unicode' else tk.RegexTokenizer()
    res = lx.extract(text_or_documents=a['text'], prompt_description=a['prompt'], examples=ex, model=PageModel(), tokenizer=tok,
                     extraction_passes=1, max_workers=1, max_char_buffer=a.get('max_char_buffer', 200), show_progress=False,
                     fence_output=False, use_schema_constraints=False)
    rows = []
    for e in res.extractions:
        ci = e.char_interval
        rows.append({'class': e.extraction_class, 'text': e.extraction_text, 'attributes': e.attributes,
                     'status': e.alignment_status.value if e.alignment_status else None,
                     'start': ci.start_pos if ci else None, 'end': ci.end_pos if ci else None})
    return json.dumps({'prompts': list(PROMPTS), 'extractions': rows}, ensure_ascii=False)
`);
  info = { runtime: 'Pyodide 0.28.3', langextract: '1.7.1+3a68580（本仓库自源码构建的 wheel）', load_seconds: +((performance.now() - t0) / 1000).toFixed(1) };
  return info;
}
self.onmessage = async ({ data }) => {
  const { id, op } = data;
  try {
    let result;
    if (op === 'load') result = await load(id);
    if (op === 'run') { await load(id); const fn = py.globals.get('run_lx'); result = JSON.parse(fn(JSON.stringify(data.args))); fn.destroy?.(); }
    post(id, { ok: true, result });
  } catch (e) { post(id, { ok: false, error: String(e?.message || e) }); }
};
