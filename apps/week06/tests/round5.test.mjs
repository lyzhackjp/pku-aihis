// Candidate. Request construction and saved public data only; no API or model calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { buildRequest } from '../../../modules/history-demo/ocr/api.mjs';
import { validateRecord } from '../../../modules/history-demo/ocr/record.mjs';

const materials = new URL('../src/assets/materials/', import.meta.url);
const presets = JSON.parse(await fs.readFile(new URL('../../../modules/history-demo/ocr/api-presets.json', import.meta.url)));
const kimi = { ...presets.find(p => p.id === 'kimi'), preset: 'kimi', apiKey: 'round5-test-only' };
const messages = [{ role: 'user', content: [{ type: 'text', text: '仅检查请求构造' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,YQ==' } }] }];

test('第五轮 Kimi K3: default request has completion budget and low reasoning, no temperature', () => {
  const input = structuredClone(messages);
  const { url, body, metadata } = buildRequest(kimi, input);
  assert.equal(url, 'https://api.moonshot.cn/v1/chat/completions');
  assert.equal(body.model, 'kimi-k3');
  assert.equal(body.max_completion_tokens, 32768);
  assert.equal(body.reasoning_effort, 'low');
  assert.equal(body.stream, false);
  assert.ok(!Object.hasOwn(body, 'max_tokens'));
  assert.ok(!Object.hasOwn(body, 'temperature'));
  assert.deepEqual(body.messages, messages);
  assert.deepEqual(input, messages);
  assert.ok(!JSON.stringify(metadata).includes(kimi.apiKey));
});

test('第五轮 Kimi K3: small budgets are raised, larger budgets and explicit reasoning are preserved', () => {
  for (const [requested, expected] of [[1, 32768], [2048, 32768], [32768, 32768], [65536, 65536]]) {
    const { body } = buildRequest({ ...kimi, reasoningEffort: 'high', temperature: 0.5 }, messages, { maxTokens: requested });
    assert.equal(body.max_completion_tokens, expected);
    assert.equal(body.reasoning_effort, 'high');
    assert.ok(!Object.hasOwn(body, 'max_tokens'));
    assert.ok(!Object.hasOwn(body, 'temperature'));
  }
  const other = buildRequest({ ...kimi, model: 'protocol-fixture' }, messages, { maxTokens: 2048 }).body;
  assert.equal(other.max_tokens, 2048);
  assert.ok(!Object.hasOwn(other, 'reasoning_effort'));
});

test('第五轮 D04: index resolves all three public traces, images, channels and thresholds', async () => {
  const index = JSON.parse(await fs.readFile(new URL('kraken-d04/index.json', materials)));
  assert.deepEqual(index.materials.map(m => m.id), ['p2510-rot', 'p2510', 'tamagaki-rot']);
  for (const { id } of index.materials) {
    const trace = JSON.parse(await fs.readFile(new URL(`kraken-d04/${id}/trace-web.json`, materials)));
    assert.equal(trace.id, id);
    assert.equal(trace.revision, 'bb487219e7d8289274443d1ad0989efb4924dc2a');
    assert.ok(trace.run.elapsed_ms > 0);
    const image = await fs.readFile(new URL(trace.image.file, materials));
    assert.equal(createHash('sha256').update(image).digest('hex'), trace.image.sha256);
    assert.ok(trace.channels.some(c => c.index === trace.default_channel));
    for (const channel of trace.channels) {
      const png = await fs.readFile(new URL(`kraken-d04/${id}/${channel.file}`, materials));
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], trace.heat_size);
    }
    assert.deepEqual(Object.keys(trace.thresholds), ['0.1', '0.17', '0.3']);
    for (const { lines } of Object.values(trace.thresholds)) {
      assert.ok(lines.length > 0);
      for (const line of lines) {
        assert.ok(line.baseline.length >= 2);
        assert.ok(line.polygon.length >= 3);
        assert.ok([...line.baseline, ...line.polygon].every(p => p.length === 2 && p.every(Number.isFinite)));
      }
    }
  }
});

test('第五轮 D11: dots saved replay is complete and tied to the public Shide image', async () => {
  const bytes = await fs.readFile(new URL('shide-1926-dots-default-record.json.gz', materials));
  const record = validateRecord(JSON.parse(gunzipSync(bytes)));
  assert.equal(record.engine.name, 'dots.ocr');
  assert.equal(record.image.local_only, false);
  assert.equal(record.image.source.material_id, 'shide_public');
  assert.equal(record.regions.length, 5);
  assert.equal(record.image.sha256, createHash('sha256').update(await fs.readFile(new URL('shide-1926-p141.png', materials))).digest('hex'));
  assert.ok(record.regions.some(r => r.class === 'Page-footer'));
  assert.ok(record.regions.every(r => r.text && r.bbox?.length === 4));
});
