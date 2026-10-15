import * as A from "./advanced.mjs";
import { validateProject } from "./project.mjs";
const base = window.W5_SOURCES;
const db = await new Promise((resolve, reject) => {
  let req = indexedDB.open("pku-week05-research-v4", 1);
  req.onupgradeneeded = () => {
    req.result.createObjectStore("state");
    req.result.createObjectStore("files");
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
function get(store, key) {
  return new Promise((resolve, reject) => {
    let r = db.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function put(store, key, value) {
  return new Promise((resolve, reject) => {
    let t = db.transaction(store, "readwrite");
    t.objectStore(store).put(value, key);
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}
let projects = await get("state", "projects") || [], runs = await get("state", "runs") || [], sourceCache = null, recordCache = null;
let materialRevision = await get("state", "materialRevision") || "initial";
let workspaces = await get("state", "workspaces") || {}, workspaceWrites = Promise.resolve();
const invalidate = () => {
  sourceCache = null;
  recordCache = null;
};
const corpus = {
  revision() { return materialRevision; },
  workspace(page) { return structuredClone(workspaces[page] || null); },
  saveWorkspace(page, value) {
    const copy = structuredClone(value);
    const write = workspaceWrites.catch(() => {}).then(async () => {
      const next = { ...workspaces, [page]: copy };
      await put("state", "workspaces", next);
      workspaces = next;
    });
    workspaceWrites = write;
    return write;
  },
  sources() {
    return sourceCache ||= [...base, ...projects.flatMap((p) => p.sources.map((s) => ({ ...s, private: true, projectId: p.id, edition: s.edition || s.version || s.date || "待查", provider: s.acquisition || "本机导入", scope: p.scope || "导入项目所收范围", paragraphs: p.segments.filter((r) => r.sourceId === s.id && !r.derived).map((r) => ({ ...r, source: s.id, pdfPage: r.pdfPage, text: r.text, verification: r.verification || "待核" })) })))];
  },
  records() {
    return recordCache ||= this.sources().flatMap((m) => m.paragraphs.map((p) => ({ ...p, source: m.id, author: m.author || "待查", title: m.title, private: !!m.private, locator: p.locator || `PDF页序${p.pdfPage || "待查"}；印刷页${p.printedPage || "待查"}`, url: p.url || m.local_pdf || m.url, attachmentId: p.attachmentId || m.attachments?.[0]?.id })));
  },
  async append(project, files = []) {
    let p = validateProject(structuredClone(project));
    let others = projects.filter((x) => x.id !== p.id), existing = new Map(others.flatMap((x) => x.segments.map((s) => [s.id, s])));
    for (let s of p.segments) if (existing.has(s.id) && existing.get(s.id).text !== s.text) throw Error("片段编号冲突，当前材料保留");
    const next = [...others, p];
    for (let f of files) if (f.blob instanceof Blob) await put("files", f.id, f.blob);
    await put("state", "projects", next);
    projects = next;
    materialRevision = crypto.randomUUID();
    await put("state", "materialRevision", materialRevision);
    invalidate();
    window.dispatchEvent(new CustomEvent("week05-corpus-change", { detail: { restored: false } }));
    return { sources: p.sources.length, segments: p.segments.filter((s) => !s.derived).length };
  },
  async importFile(file) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      const { unzipSync } = await import("../vendor/fflate/fflate.mjs");
      let entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      let candidate = Object.keys(entries).find((k) => /(^|\/)project\.json$/.test(k));
      if (!candidate) {
        const w4 = await import("./week04-backup.mjs");
        if (w4.isWeek04Backup(Object.keys(entries))) {
          const r = await w4.convertWeek04Backup(entries, (b) => unzipSync(b), { onProgress: (m) => window.dispatchEvent(new CustomEvent("week05-import-progress", { detail: m })) });
          const counts = await this.append(r.project, r.files.map((f) => ({ id: f.id, blob: new Blob([f.bytes], { type: f.type }) })));
          return { ...counts, summary: r.summary };
        }
        throw Error("ZIP既不是通用项目（缺少project.json），也不是第四周完整课程备份；请用通用导入页处理");
      }
      let p = JSON.parse(new TextDecoder().decode(entries[candidate])), files = [];
      for (let s of p.sources || []) for (let a of s.attachments || []) {
        let key = Object.keys(entries).find((k) => k === a.path || k.endsWith("/" + a.id + ".pdf") || k.endsWith("/" + a.name) || k === "attachments/" + a.id);
        if (key) files.push({ id: a.id, blob: new Blob([entries[key]], { type: a.type || "application/pdf" }) });
      }
      return this.append(p, files);
    }
    return this.append(JSON.parse(await file.text()));
  },
  async file(id) {
    return get("files", id);
  },
  async backup() {
    window.dispatchEvent(new CustomEvent("week05-before-backup"));
    await workspaceWrites;
    const { zipSync, strToU8 } = await import("../vendor/fflate/fflate.mjs");
    const p = { version: 2, projects, runs, workspaces, materialRevision, fileTypes: {}, uiState: Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith("week05/v3/"))) }, items = {};
    for (const project of projects) for (const s of project.sources) for (const a of s.attachments) {
      let blob = await get("files", a.id);
      if (blob) {
        items["files/" + a.id] = new Uint8Array(await blob.arrayBuffer());
        p.fileTypes[a.id] = blob.type || a.type || "application/octet-stream";
      }
    }
    items["week05-backup.json"] = strToU8(JSON.stringify(p));
    return new Blob([zipSync(items)], { type: "application/zip" });
  },
  async restore(file) {
    const { unzipSync } = await import("../vendor/fflate/fflate.mjs");
    const z = unzipSync(new Uint8Array(await file.arrayBuffer())), raw = z["week05-backup.json"];
    if (!raw) throw Error("缺少第五周备份清单");
    let b = JSON.parse(new TextDecoder().decode(raw));
    if (!Array.isArray(b.projects) || !Array.isArray(b.runs)) throw Error("备份格式错误");
    b.projects.forEach(validateProject);
    if (b.uiState && (typeof b.uiState !== "object" || Object.entries(b.uiState).some(([k, v]) => !k.startsWith("week05/v3/") || typeof v !== "string"))) throw Error("页面记录格式错误");
    if (b.workspaces && (typeof b.workspaces !== "object" || Array.isArray(b.workspaces))) throw Error("工作记录格式错误");
    for (const [page, w] of Object.entries(b.workspaces || {})) {
      if (!/^D\d{2}$/.test(page) || !w || typeof w !== "object" || Array.isArray(w)) throw Error("工作记录格式错误");
      if (w.d24res && (typeof w.d24res.stamp !== "string" || !Array.isArray(w.d24res.bm25))) throw Error("检索工作记录格式错误");
      if (w.d24answer && typeof w.d24answer.output !== "string") throw Error("模型候选记录格式错误");
      if (w.result?.chat && !Array.isArray(w.result.chat)) throw Error("对话工作记录格式错误");
    }
    await workspaceWrites;
    const types = new Map(b.projects.flatMap(p => p.sources.flatMap(s => s.attachments.map(a => [a.id, a.type || "application/octet-stream"]))));
    for (const [k, v] of Object.entries(z)) if (k.startsWith("files/")) {
      const id = k.slice(6), type = b.fileTypes?.[id] || types.get(id) || "application/octet-stream";
      await put("files", id, new Blob([v], { type }));
    }
    await put("state", "projects", b.projects);
    await put("state", "runs", b.runs);
    workspaces = b.workspaces || {};
    materialRevision = b.materialRevision || crypto.randomUUID();
    await put("state", "workspaces", workspaces);
    await put("state", "materialRevision", materialRevision);
    projects = b.projects;
    invalidate();
    runs = b.runs;
    for (const key of Object.keys(localStorage)) if (key.startsWith("week05/v3/")) localStorage.removeItem(key);
    for (const [k, v] of Object.entries(b.uiState || {})) localStorage.setItem(k, v);
    window.dispatchEvent(new CustomEvent("week05-corpus-change", { detail: { restored: true } }));
  },
  async saveRun(run) {
    runs = [...await get("state", "runs") || [], run];
    await put("state", "runs", runs);
  },
  runs() {
    return runs;
  },
  // 已导入项目（含第四周阅读轮次等 events）；只读副本。
  projects() {
    return projects;
  }
};
const sha256 = async (value) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))))].map((b) => b.toString(16).padStart(2, "0")).join("");
const model = "Xenova/paraphrase-multilingual-MiniLM-L12-v2", revision = "2c4055b12046f11709e9df2c122e59ffbdc2f900";
let extractorPromise = null;
// 嵌入模型的加载状态：模型接入页与各演示页共用。程序库与权重各有备用来源，失败时写明原因。
const LIB_SOURCES = [["本站", new URL("../vendor/transformers/", import.meta.url).href], ["jsDelivr", "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/"]];
const MODEL_HOSTS = [["huggingface.co", "https://huggingface.co/"], ["hf-mirror.com（国内镜像）", "https://hf-mirror.com/"]];
const HOST_KEY = "week05/v3/embeddingHost";
const embState = { phase: "idle", message: "尚未加载", lib: "", host: "", files: {}, error: "", startedAt: 0, readyAt: 0, downloaded: false };
let stateTimer = null;
function setEmb(patch, now = false) {
  Object.assign(embState, patch);
  window.W5EmbeddingState = embState;
  const fire = () => {
    stateTimer = null;
    window.dispatchEvent(new CustomEvent("week05-embedding-state", { detail: structuredClone(embState) }));
  };
  if (now) {
    clearTimeout(stateTimer);
    fire();
  } else stateTimer ??= setTimeout(fire, 200);
}
function embSummary() {
  const fs = Object.values(embState.files), total = fs.reduce((n, f) => n + (f.total || 0), 0), loaded = fs.reduce((n, f) => n + (f.loaded || 0), 0);
  return { total, loaded, percent: total ? Math.round((loaded / total) * 100) : 0 };
}
function embMessage() {
  if (embState.phase === "downloading") {
    const x = embSummary();
    return x.total ? `下载 MiniLM 权重 ${x.percent}%（${(x.loaded / 1048576).toFixed(1)} / ${(x.total / 1048576).toFixed(1)} MB，来源 ${embState.host}）` : `正在连接 ${embState.host}…`;
  }
  return embState.message;
}
const withTimeout = (promise, ms, label) => Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(Error(label + "超时")), ms))]);
async function importLibrary() {
  const errors = [];
  for (const [name, base] of LIB_SOURCES) {
    try {
      // 失败过的同一地址会被浏览器缓存为失败，重试时带上次数参数。
      const mod = await withTimeout(import(base + "transformers.min.js" + (embState.attempt ? "?retry=" + embState.attempt : "")), 60000, "载入程序库");
      return { mod, name, base };
    } catch (e) {
      errors.push(`${name}：${e.message}`);
    }
  }
  throw Error("嵌入程序库（transformers.js）载入失败。" + errors.join("；") + "。请检查网络后点“重试”。");
}
async function pickHost() {
  let saved = "";
  try { saved = localStorage.getItem(HOST_KEY) || ""; } catch {}
  const hosts = saved ? MODEL_HOSTS.filter(([, h]) => h === saved).concat(MODEL_HOSTS.filter(([, h]) => h !== saved)) : MODEL_HOSTS, errors = [];
  for (const [name, host] of hosts) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(`${host}${model}/resolve/${revision}/config.json`, { signal: ctl.signal, cache: "no-store" });
      clearTimeout(t);
      if (r.ok) return { name, host };
      errors.push(`${name} 返回 ${r.status}`);
    } catch (e) {
      errors.push(`${name} 无法连接`);
    }
  }
  throw Error("模型权重的下载地址都无法连接（" + errors.join("；") + "）。预存向量与结果仍可使用。");
}
const embedding = {
  model,
  revision,
  state: () => structuredClone(embState),
  setHost(host) {
    try { host ? localStorage.setItem(HOST_KEY, host) : localStorage.removeItem(HOST_KEY); } catch {}
    if (embState.phase !== "ready") this.reset();
  },
  reset() {
    extractorPromise = null;
    setEmb({ phase: "idle", message: "尚未加载", files: {}, error: "" }, true);
  },
  async load(onProgress = () => {
  }) {
    if (!extractorPromise) {
      extractorPromise = (async () => {
        setEmb({ phase: "library", message: "正在载入嵌入程序库（transformers.js 3.8.1，约 0.9 MB）…", error: "", files: {}, startedAt: performance.now(), readyAt: 0, downloaded: false, attempt: (embState.attempt || 0) + 1 }, true);
        onProgress(embState.message);
        const { mod, name, base } = await importLibrary(), { pipeline, env } = mod;
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.wasmPaths = base;
        setEmb({ phase: "host", lib: name, message: "程序库已载入（" + name + "）；正在检查模型权重的下载地址…" }, true);
        onProgress(embState.message);
        let local = location.hostname === "localhost" || location.hostname === "127.0.0.1" ? await fetch("/models/" + model + "/config.json").then((r) => r.ok).catch(() => false) : false;
        env.allowLocalModels = local;
        env.allowRemoteModels = !local;
        env.localModelPath = new URL("/models/", location.origin).href;
        if (!local) {
          const { name: hostName, host } = await pickHost();
          env.remoteHost = host;
          env.remotePathTemplate = "{model}/resolve/{revision}/";
          setEmb({ host: hostName });
        } else setEmb({ host: "本机模型目录" });
        setEmb({ phase: "downloading", message: "正在取得模型文件（已下载过的从浏览器缓存读取）…" }, true);
        let lastAt = 0;
        const progress = (p) => {
          const f = p.file ? (embState.files[p.file] ||= { loaded: 0, total: 0, status: "" }) : null;
          if (f) {
            f.status = p.status;
            if (p.loaded != null) f.loaded = p.loaded;
            if (p.total) f.total = p.total;
            if (p.status === "done" && f.total) f.loaded = f.total;
            if (p.status === "progress") embState.downloaded = true;
          }
          setEmb({});
          const now = performance.now();
          if (now - lastAt > 300 || p.status === "done") {
            lastAt = now;
            onProgress(embMessage());
          }
        };
        const pipe = await pipeline("feature-extraction", model, { revision, dtype: "q8", device: "wasm", progress_callback: progress });
        setEmb({ phase: "ready", readyAt: performance.now(), message: `MiniLM 已就绪（${embState.downloaded ? "本次下载" : "浏览器缓存"}；来源 ${embState.host}；程序库 ${embState.lib}；用时 ${((performance.now() - embState.startedAt) / 1000).toFixed(1)} 秒）` }, true);
        onProgress(embState.message);
        return pipe;
      })().catch((e) => {
        extractorPromise = null;
        setEmb({ phase: "error", error: e.message, message: "加载失败：" + e.message }, true);
        throw e;
      });
    }
    return extractorPromise;
  },
  async encode(texts, onProgress) {
    let pipe = await this.load(onProgress), result = [];
    for (let i = 0; i < texts.length; i++) {
      const ids = pipe.tokenizer.encode(texts[i], { add_special_tokens: true });
      if (ids.length > 512) throw Error(`第${i + 1}项有${ids.length}词元，超过模型窗口；请先缩小切分或选定范围`);
      let out = await pipe(texts[i], { pooling: "mean", normalize: true, truncation: false, max_length: 512 });
      result.push(out.tolist()[0]);
      onProgress?.(`实际编码 ${i + 1}/${texts.length}`);
      await new Promise((r) => setTimeout(r, 0));
    }
    return result;
  },
  async late(sentences, onProgress) {
    let pipe = await this.load(onProgress), text = sentences.join("\n"), whole = pipe.tokenizer.encode(text, { add_special_tokens: false });
    if (whole.length + 2 > 512) throw Error(`合并窗口${whole.length + 2}词元，超过512；减少句数后重算`);
    let out = await pipe(text, { pooling: "none", normalize: false, truncation: false, max_length: 512 }), tokens = out.tolist()[0], ranges = [];
    for (let i = 0; i < sentences.length; i++) {
      let prefix = sentences.slice(0, i).join("\n"), through = sentences.slice(0, i + 1).join("\n"), ids = pipe.tokenizer.encode(through, { add_special_tokens: false });
      if (ids.some((x, z) => x !== whole[z])) throw Error("当前切点改变了分词，需调整到稳定句界");
      let start = prefix ? pipe.tokenizer.encode(prefix, { add_special_tokens: false }).length + 1 : 1, end = ids.length + 1, rows = tokens.slice(start, end), v = Array.from({ length: 384 }, (_, j) => rows.reduce((n, row) => n + row[j], 0) / rows.length), norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      ranges.push({ i, start, end, vector: v.map((x) => x / norm) });
    }
    return { tokenCount: tokens.length, ranges, model, revision, mode: "实际整窗口词元编码后按句池化（512词元内的短例）" };
  },
  async dispose() {
    if (extractorPromise) {
      (await extractorPromise).dispose();
      extractorPromise = null;
    }
  }
};
let importer = null;
function openImporter() {
  importer = window.open(new URL("assets/importer/?receiver=" + encodeURIComponent(location.origin), document.baseURI).href, "week05-material-importer");
}
window.addEventListener("message", async (e) => {
  if (e.origin !== location.origin || e.source !== importer) return;
  if (e.data?.type === "PKU_IMPORT_READY") importer.postMessage({ type: "PKU_IMPORT_HELLO" }, location.origin);
  if (e.data?.type === "PKU_PROJECT") {
    try {
      let counts = await corpus.append(e.data.project, e.data.files || []);
      importer.postMessage({ type: "PKU_IMPORT_ACCEPTED", counts }, location.origin);
    } catch (err) {
      importer.postMessage({ type: "PKU_IMPORT_REJECTED", message: err.message }, location.origin);
    }
  }
});
async function generate(task, records, question, { allowCloud = false, onDelta, maxTokens = 2048 } = {}) {
  if (!window.W5Chat?.ready()) throw Error("请先用右上角共用“模型接入”配置真实生成模型");
  assertCloudPermission(records, allowCloud);
  const input = records.map((r) => `[${r.id}] ${r.author} ${r.title} ${r.locator}
${r.text}`).join("\n\n");
  let messages = [{ role: "system", content: task }, { role: "user", content: question + "\n\n" + input }];
  let result = await window.W5Chat.chat(messages, { maxTokens, onDelta });
  let run = { id: "run-" + crypto.randomUUID(), time: (/* @__PURE__ */ new Date()).toISOString(), mode: "实际API运行", model: result.model, sourceIds: records.map((r) => r.id), corpusSHA256: await sha256(records), input: messages, output: result.text, seconds: result.seconds, usage: result.usage };
  await corpus.saveRun(run);
  return run;
}
function assertCloudPermission(records, allowCloud = false) {
  let local = false;
  try {
    const url = new URL(window.W5Chat.settings().baseUrl);
    local = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {}
  if (records.some(r => r.private) && !local && !allowCloud) throw Error("当前含本机导入材料。使用本机端点，或允许本次选中范围发送到云端。");
}
function rankDense(queryVector, records, vectors) {
  return records.map((r, i) => ({ ...r, score: A.cosine(queryVector, vectors[i]) })).sort((a, b) => b.score - a.score);
}
function sparse(query, records, { tfidf = false } = {}) {
  let words = (s) => [...s.toLowerCase().matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[a-z]+/gu)].map((m) => m[0]);
  let docs = records.map((r) => words(r.text)), Q = [...new Set(words(query))], avg = docs.reduce((n, d) => n + d.length, 0) / Math.max(1, docs.length);
  let df = new Map(Q.map((t) => [t, docs.filter((d) => d.includes(t)).length]));
  return records.map((r, i) => {
    let terms = Q.map((t) => {
      let f = docs[i].filter((x) => x === t).length, idf = Math.log(1 + (docs.length - df.get(t) + 0.5) / (df.get(t) + 0.5)), value = tfidf ? f * Math.log((docs.length + 1) / (df.get(t) + 1)) : idf * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * docs[i].length / Math.max(1, avg)));
      return { term: t, count: f, idf, value };
    });
    return { ...r, score: terms.reduce((n, t) => n + t.value, 0), terms };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}
const prepared = await fetch(new URL("precomputed.json", import.meta.url)).then((r) => r.json());
const preparedAPI = await fetch(new URL("api-examples.json", import.meta.url)).then((r) => r.ok ? r.json() : { results: [] });
window.addEventListener("week05-load-embedding", () => embedding.load((msg) => window.dispatchEvent(new CustomEvent("week05-embedding-progress", { detail: msg }))).catch(() => {}));
setEmb({}, true);
export {
  A,
  corpus,
  embedding,
  generate,
  assertCloudPermission,
  openImporter,
  prepared,
  preparedAPI,
  rankDense,
  sha256,
  sparse
};
