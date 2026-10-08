import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NDLModelStore } from "../src/ndl/model-loader.ts";

const content = new Uint8Array([10, 20, 30, 40, 50]);
const spec = {
  bytes: content.byteLength,
  sha256: createHash("sha256").update(content).digest("hex"),
  source_url: "https://models.example/fixed-commit/test.onnx",
};
function harness(options = {}) {
  const entries = new Map(), requests = [];
  const cache = {
    async match(key) { return entries.get(key)?.clone(); },
    async put(key, value) { entries.set(key, value.clone()); },
    async delete(key) { return entries.delete(key); },
  };
  const store = new NDLModelStore({
    baseURL: "https://course.example/pku-aihis/material-importer/",
    models: { "test.onnx": spec },
    openCache: async () => cache,
    fetch: async (url, init) => {
      requests.push({url, init});
      return url === spec.source_url
        ? new Response(content)
        : new Response("<html>SPA fallback</html>", { headers:{"Content-Type":"text/html"} });
    },
    ...options,
  });
  return { store, entries, requests, cache };
}
test("missing subpath and HTML fallback download fixed remote bytes, then reuse verified cache", async () => {
  const {store, entries, requests} = harness();
  const result = await store.load("test.onnx");
  assert.deepEqual(new Uint8Array(result.bytes), content);
  assert(result.cached);
  assert.equal(requests.length, 3);
  assert.equal(requests[0].url, "https://course.example/pku-aihis/material-importer/models/test.onnx");
  assert.equal(requests[2].url, spec.source_url);
  assert(requests.every(r => r.init.credentials === "omit" && r.init.body === undefined));
  assert.equal(entries.size, 1);
  assert.deepEqual((await store.status()).map(r=>r.cached), [true]);
  await store.load("test.onnx");
  assert.equal(requests.length, 3);
});
test("legacy root cache is verified and migrated without downloading", async () => {
  const {store, cache, requests} = harness();
  await cache.put(`https://course.example/models/test.onnx?sha256=${spec.sha256}`,new Response(content));
  assert((await store.load("test.onnx")).cached);
  assert.equal(requests.length, 0);
  assert((await store.status())[0].cached);
});
test("corrupt cache is discarded; incorrect remote hash never becomes configured", async () => {
  const h = harness({ fetch: async () => new Response(new Uint8Array([1,2,3,4,5])) });
  await h.cache.put(`https://course.example/pku-aihis/material-importer/models/test.onnx?sha256=${spec.sha256}`,new Response(new Uint8Array([1,2,3])));
  await assert.rejects(()=>h.store.load("test.onnx"), /模型指纹/);
  assert.equal(h.entries.size, 0);
  assert(!(await h.store.status())[0].cached);
});
test("truncated or oversized downloads are rejected and not saved", async () => {
  for (const data of [new Uint8Array([1,2]), new Uint8Array(20)]) {
    const {store, entries} = harness({fetch:async()=>new Response(data)});
    await assert.rejects(()=>store.load("test.onnx"), /不完整|超过/);
    assert.equal(entries.size,0);
  }
});
test("cache denial permits OCR but cannot claim persistent model preparation", async () => {
  for(const openCache of [async()=>{throw Error("Quota denied");},()=>{throw Error("Cache API unavailable");}]) {
    const {store} = harness({openCache});
    assert.equal((await store.load("test.onnx")).cached,false);
    await assert.rejects(()=>store.prepare(()=>{}), /未能缓存/);
    assert(!(await store.status())[0].cached);
  }
});
test("cancelling preparation keeps completed models and resume downloads only missing ones", async () => {
  const controller = new AbortController();
  let requests = 0;
  const h = harness({models:{"first.onnx":spec,"second.onnx":spec},fetch:async()=>{requests++;return new Response(content);}});
  await assert.rejects(()=>h.store.prepare(message=>{
    if(message.includes("模型已就绪：first.onnx")) controller.abort();
  },controller.signal), /abort/i);
  assert.deepEqual((await h.store.status()).map(r=>r.cached),[true,false]);
  await h.store.prepare(()=>{});
  assert.equal(requests,2);
  assert.deepEqual((await h.store.status()).map(r=>r.cached),[true,true]);
  await h.store.clear();
  assert.deepEqual((await h.store.status()).map(r=>r.cached),[false,false]);
});
test("an already aborted job makes no network request", async () => {
  const {store,requests} = harness(), controller = new AbortController();
  controller.abort();
  await assert.rejects(()=>store.load("test.onnx",()=>{},controller.signal),/abort/i);
  assert.equal(requests.length,0);
});
