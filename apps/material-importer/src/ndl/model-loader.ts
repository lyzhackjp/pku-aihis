import defaultModels from "./models.json" with { type: "json" };

export const NDL_MODEL_CACHE = "pku-ndl-models-v1";
export type ModelSpec = { bytes: number; sha256: string; source_url: string };
export type ModelStatus = { name: string; bytes: number; cached: boolean };
type Options = {
  baseURL: string;
  models?: Record<string, ModelSpec>;
  fetch?: typeof fetch;
  openCache?: () => Promise<Cache>;
};
const sha256 = async (bytes: ArrayBuffer) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
const mib = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
const checkAbort = (signal?: AbortSignal) => signal?.throwIfAborted();

/** Same loader for page preparation and OCR Workers; only verified bytes are cached. */
export class NDLModelStore {
  private baseURL: string;
  private models: Record<string, ModelSpec>;
  private request: typeof fetch;
  private openCache: () => Promise<Cache>;

  constructor(options: Options) {
    this.baseURL = options.baseURL;
    this.models = options.models ?? defaultModels;
    this.request = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.openCache = options.openCache ?? (() => caches.open(NDL_MODEL_CACHE));
  }

  private async cache() {
    try { return await this.openCache(); } catch { return null; }
  }

  private key(name: string) {
    return new URL(`models/${name}?sha256=${this.models[name].sha256}`, this.baseURL).href;
  }

  async status(): Promise<ModelStatus[]> {
    const cache = await this.cache();
    return Promise.all(Object.entries(this.models).map(async ([name, spec]) => {
      const response = await cache?.match(this.key(name)).catch(() => null);
      return {
        name, bytes: spec.bytes,
        cached: response?.headers.get("X-PKU-SHA256") === spec.sha256 &&
          Number(response?.headers.get("Content-Length")) === spec.bytes,
      };
    }));
  }

  async clear() {
    const cache = await this.openCache();
    for (const name of Object.keys(this.models)) {
      await cache.delete(this.key(name));
      // Older local previews cached at the origin root.
      await cache.delete(new URL(`/models/${name}?sha256=${this.models[name].sha256}`, this.baseURL).href);
    }
  }

  async load(name: string, progress: (text: string) => void = () => {}, signal?: AbortSignal) {
    checkAbort(signal);
    const spec = this.models[name];
    if (!spec) throw Error(`模型未登记：${name}`);
    const key = this.key(name);
    const cache = await this.cache();
    const oldKey = new URL(`/models/${name}?sha256=${spec.sha256}`, this.baseURL).href;
    for (const cacheKey of new Set([key, oldKey])) {
      const cached = await cache?.match(cacheKey).catch(() => null);
      if (!cached) continue;
      progress(`核对已缓存模型：${name}`);
      const bytes = await cached.arrayBuffer();
      checkAbort(signal);
      if (bytes.byteLength === spec.bytes && await sha256(bytes) === spec.sha256) {
        checkAbort(signal);
        const stored = cacheKey === key && cached.headers.get("X-PKU-SHA256") === spec.sha256 &&
          Number(cached.headers.get("Content-Length")) === spec.bytes ||
          await this.save(cache, key, bytes, spec, progress);
        progress(`模型已就绪：${name}${stored ? "（已缓存）" : "（本次可用，未缓存）"}`);
        return { bytes, cached: stored };
      }
      await cache?.delete(cacheKey).catch(() => false);
      progress(`缓存校验失败，重新取得：${name}`);
    }

    const urls = new Set([
      new URL(`models/${name}`, this.baseURL).href,
      new URL(`/models/${name}`, this.baseURL).href,
      spec.source_url,
    ]);
    let lastError = "";
    for (const url of urls) {
      checkAbort(signal);
      try {
        progress(`取得 ${name}（${mib(spec.bytes)} MiB）…`);
        const response = await this.request(url, { signal, credentials: "omit" });
        if (!response.ok || /text\/html/i.test(response.headers.get("Content-Type") ?? "")) {
          await response.body?.cancel();
          throw Error(`HTTP ${response.status} 或返回网页而非模型`);
        }
        const bytes = await this.read(response, name, spec.bytes, progress, signal);
        progress(`校验模型指纹：${name}`);
        if (await sha256(bytes) !== spec.sha256) throw Error("模型指纹与课程登记版本不符");
        checkAbort(signal);
        const stored = await this.save(cache, key, bytes, spec, progress);
        progress(`模型已就绪：${name}${stored ? "（已缓存）" : "（本次可用，未缓存）"}`);
        return { bytes, cached: stored };
      } catch (error) {
        checkAbort(signal);
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    throw Error(`无法取得 ${name}：${lastError}。请在本页“模型配置”重试，检查网络是否能访问模型来源；无需本机启动脚本。`);
  }

  async prepare(progress: (text: string) => void, signal?: AbortSignal) {
    for (const name of Object.keys(this.models)) {
      const result = await this.load(name, progress, signal);
      if (!result.cached) throw Error(`已取得 ${name}，但浏览器未能缓存。请检查可用空间或隐私模式；也可直接识读，届时按需下载。`);
    }
    return this.status();
  }

  private async save(cache: Cache | null, key: string, bytes: ArrayBuffer, spec: ModelSpec, progress: (text: string) => void) {
    if (cache) {
      try {
        await cache.put(key, new Response(bytes, { headers: {
          "Content-Type": "application/octet-stream", "Content-Length": String(spec.bytes),
          "X-PKU-SHA256": spec.sha256,
        } }));
        return true;
      } catch {}
    }
    progress("模型校验通过，但浏览器缓存不可用或空间不足；本次仍可识读。");
    return false;
  }

  private async read(response: Response, name: string, total: number, progress: (text: string) => void, signal?: AbortSignal) {
    if (!response.body) throw Error("模型响应没有可读取内容");
    const reader = response.body.getReader(), output = new Uint8Array(total);
    let received = 0, lastProgress = 0;
    try {
      while (true) {
        checkAbort(signal);
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > total) throw Error("模型大小超过登记版本");
        output.set(value, received - value.byteLength);
        if (performance.now() - lastProgress > 200 || received === total) {
          progress(`下载 ${name}：${mib(received)} / ${mib(total)} MiB（${Math.round(received / total * 100)}%）`);
          lastProgress = performance.now();
        }
      }
      checkAbort(signal);
      if (received !== total) throw Error(`模型下载不完整：${received} / ${total} 字节`);
      return output.buffer;
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}
