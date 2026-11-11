/* 第九周模型接入（ES 模块）｜候选，未经教师确认｜2026-11-11
 * 协议适配沿用共用接口 vendor/api.mjs（原样复制，不改）；第九周的差别只在这里：
 *  - DeepSeek：用 deepseek-flash 的非思考模式（thinking: disabled），温度才生效（api-docs.deepseek.com/guides/thinking_mode，2026-11-11 读：思考模式不支持 temperature，设置不报错也不生效）。
 *  - Kimi：kimi-k3 只有思考模式，温度固定 1.0，传其他值报错（platform.kimi.com/docs/api/models-overview，2026-11-11 读），所以不传温度，记录写明"固定 1.0，不可调"。
 * Key 只经参数传入、只在内存；请求记录用 api.redact 去掉 Key。 */
import * as API from './vendor/api.mjs';

const PRESETS = {
  deepseek: { preset: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', protocol: 'openai', temperatureMode: 'adjustable', thinking: 'disabled' },
  kimi: { preset: 'kimi', label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k3', protocol: 'openai', temperatureMode: 'fixed-1.0', thinking: 'always' },
  local: { preset: 'local', label: '本机或测试服务', baseUrl: 'http://127.0.0.1:8090/v1', model: 'test-model', protocol: 'openai', temperatureMode: 'adjustable', thinking: 'n/a' },
};

function build(cfg, messages, temperature) {
  const built = API.buildRequest({ ...cfg, preset: cfg.preset, apiKey: cfg.apiKey || '' }, messages, { maxTokens: 4096 });
  const b = built.body;
  let tempNote;
  if (cfg.preset === 'deepseek') {
    b.thinking = { type: 'disabled' }; delete b.reasoning_effort; b.max_tokens = 4096;
    if (typeof temperature === 'number') b.temperature = temperature;
    tempNote = typeof temperature === 'number' ? temperature : '未设（服务默认）';
  } else if (cfg.preset === 'kimi') {
    delete b.temperature; tempNote = '固定 1.0（kimi-k3 只有思考模式，官方不允许改温度）';
  } else {
    if (typeof temperature === 'number') b.temperature = temperature;
    tempNote = typeof temperature === 'number' ? temperature : '未设';
  }
  return { built, tempNote };
}

async function call({ presetId, model, baseUrl, apiKey, messages, temperature, timeoutMs = 120000 }) {
  const cfg = { ...PRESETS[presetId], ...(model ? { model } : {}), ...(baseUrl ? { baseUrl } : {}), apiKey };
  const { built, tempNote } = build(cfg, messages, temperature);
  const clean = (v) => API.redact(v, [apiKey]);
  const t0 = performance.now(), ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
  const rec = { model: built.body.model, preset: cfg.preset, endpoint: built.url, temperature: tempNote, reasoning_effort: built.body.reasoning_effort || (built.body.thinking ? 'thinking:' + built.body.thinking.type : null), request_body: clean(built.body) };
  try {
    const res = await fetch(built.url, { method: 'POST', headers: built.headers, body: JSON.stringify(built.body), signal: ctl.signal });
    const raw = await res.text();
    if (!res.ok) throw new Error(API.apiErrorMessage(res.status, clean(raw).slice(0, 400), cfg));
    const out = API.parseResponse(JSON.parse(raw), cfg.protocol);
    return { ok: true, ...rec, reply: out.text, model_returned: out.model || null, finish_reason: out.finishReason || null, usage: out.usage || null, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { ok: false, ...rec, reply: '', error: e.name === 'AbortError' ? `超时（${timeoutMs / 1000} 秒）` : clean(String(e.message || e)), ms: Math.round(performance.now() - t0) };
  } finally { clearTimeout(timer); }
}

window.W9Live = { PRESETS, call, ready: true };
document.dispatchEvent(new CustomEvent('w9-live-ready'));
