import { validateCorpus, mergeCorpus } from "./math";
export type Doc = {
  id: string;
  text: string;
  title: string;
  source_id?: string;
  author?: string;
  year?: number;
  pdf_page?: number;
  printed_page?: string;
  status?: string;
  image?: string;
  vector?: number[];
  [key: string]: any;
};
export const state: {
  docs: Doc[];
  manifest: any;
  queries: any[];
  local: boolean;
  version: number;
} = { docs: [], manifest: {}, queries: [], local: false, version: 0 };
let loading: Promise<void>;
export function loadCorpus() {
  return (loading ??= (async () => {
    const r = await fetch("assets/data/corpus.json");
    if (!r.ok) throw Error("语料载入失败");
    const d = await r.json();
    state.docs = validateCorpus(d);
    state.manifest = d.manifest || {};
    state.queries = d.queries || [];
  })());
}
export async function importCorpusFile(file: File) {
  return importCorpusFiles([file]);
}
export async function importCorpusFiles(files: File[]) {
  if (!files.length) throw Error("请选择语料文件。");
  if (files.reduce((size, file) => size + file.size, 0) > 130 * 1024 * 1024)
    throw Error("每批导入限制130MB；可分批追加。");
  await loadCorpus();
  const version = state.version;
  let next = { records: state.docs, manifest: state.manifest, queries: state.queries };
  const summary = { added: 0, enriched: 0, skipped: 0, queriesAdded: 0, total: state.docs.length, files: files.length };
  for (const file of files) {
    const txt = (await file.text()).replace(/^\uFEFF/, "");
    let data: any;
    try { data = JSON.parse(txt); }
    catch { data = { records: txt.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line)) }; }
    const result = mergeCorpus(next, data);
    for (const key of ["added", "enriched", "skipped", "queriesAdded"] as const) summary[key] += result.summary[key];
    next = result;
  }
  if (version !== state.version) throw Error("导入期间语料已改变，本批未加入；请重新选择文件。");
  summary.total = next.records.length;
  if (summary.added || summary.enriched || summary.queriesAdded) {
    state.docs = next.records;
    state.manifest = { ...next.manifest, id: `week03-session-${version + 1}`, scope: `本次课堂累计${summary.total}条；来源和核对状态按各记录保留。` };
    state.queries = next.queries;
    state.local = true;
    state.version++;
    window.dispatchEvent(new CustomEvent("corpus-change"));
  }
  return summary;
}
export function removeCorpusRecord(id: string) {
  if (!state.docs.some((d) => d.id === id)) return false;
  if (state.docs.length <= 1) return false;
  state.docs = state.docs.filter((d) => d.id !== id);
  state.version++;
  window.dispatchEvent(new CustomEvent("corpus-change"));
  return true;
}
export { sourceLabel } from "./provenance";
export function saveFile(name: string, data: any) {
  const b = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
