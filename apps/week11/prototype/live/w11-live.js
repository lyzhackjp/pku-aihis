/* 第十一周模型接入（ES 模块）：原样移自第十周 live/w10-live.js（只改了全局名与事件名）｜候选，未经教师确认｜2026-11-26
 * 沿用第九周 live/w9-live.js 的做法（教师 2026-11-16 待决 1：沿用第九周）：
 *  - DeepSeek：deepseek-flash 非思考模式（thinking: disabled），温度才生效，默认 0.7（api-docs.deepseek.com/guides/thinking_mode，第九周 2026-11-11 读）。
 *  - Kimi：kimi-k3 只有思考模式，温度固定，不传温度；reasoning_effort low（共用接口 api.mjs 的处理）。
 *  - local：本机模拟接口（scripts/mock_api.py），只回固定文字，用于课前运行面板的失败续跑测试，不是真实模型。
 * 协议适配用共用接口 vendor/api.mjs（原样复制，不改）。Key 只经参数传入、只在内存；记录用 api.redact 去掉 Key。 */
import * as API from './vendor/api.mjs';

const PRESETS = {
  deepseek: { preset: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', protocol: 'openai' },
  kimi: { preset: 'kimi', label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k3', protocol: 'openai' },
  local: { preset: 'local', label: '本机模拟接口', baseUrl: 'http://127.0.0.1:8790/v1', model: 'mock-model', protocol: 'openai' },
};

function build(cfg, messages, temperature) {
  const built = API.buildRequest({ ...cfg, apiKey: cfg.apiKey || '' }, messages, { maxTokens: 4096 });
  const b = built.body;
  let tempNote, thinking = null;
  if (cfg.preset === 'deepseek') {
    b.thinking = { type: 'disabled' }; delete b.reasoning_effort; b.max_tokens = 8192; thinking = 'disabled';
    b.temperature = typeof temperature === 'number' ? temperature : 0.7; tempNote = b.temperature;
  } else if (cfg.preset === 'kimi') {
    delete b.temperature; tempNote = '固定（kimi-k3 只有思考模式，不传温度）'; thinking = 'always';
  } else {
    if (typeof temperature === 'number') b.temperature = temperature;
    tempNote = typeof temperature === 'number' ? temperature : '未设';
  }
  return { built, tempNote, thinking };
}

async function call({ presetId, model, baseUrl, apiKey, messages, temperature, timeoutMs = 300000 }) {
  const cfg = { ...PRESETS[presetId], ...(model ? { model } : {}), ...(baseUrl ? { baseUrl } : {}), apiKey };
  const { built, tempNote, thinking } = build(cfg, messages, temperature);
  const clean = (v) => API.redact(v, [apiKey]);
  const t0 = performance.now(), ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
  const rec = { model: built.body.model, preset: cfg.preset, endpoint: built.url, temperature: tempNote, thinking, reasoning_effort: built.body.reasoning_effort || null };
  try {
    const res = await fetch(built.url, { method: 'POST', headers: built.headers, body: JSON.stringify(built.body), signal: ctl.signal });
    const raw = await res.text();
    if (!res.ok) throw new Error(API.apiErrorMessage(res.status, clean(raw).slice(0, 400), cfg));
    const j = JSON.parse(raw), out = API.parseResponse(j, cfg.protocol);
    const reasoning = j.choices?.[0]?.message?.reasoning_content || null;
    return { ok: true, ...rec, reply: out.text, reasoning, model_returned: out.model || null, finish_reason: out.finishReason || null, usage: out.usage || null, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { ok: false, ...rec, reply: '', error: e.name === 'AbortError' ? `超时（${timeoutMs / 1000} 秒）` : clean(String(e.message || e)), ms: Math.round(performance.now() - t0) };
  } finally { clearTimeout(timer); }
}

window.W11Live = { PRESETS, call, ready: true };
document.dispatchEvent(new CustomEvent('w11-live-ready'));
