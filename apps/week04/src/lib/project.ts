import {
  emptyProject,
  validateProject,
  mergeProject,
  record,
  uid,
  now,
} from "../../../../packages/course-project/project.mjs";
import {
  openDB,
  loadProject,
  saveProject,
  getAttachment,
  listProjects,
} from "../../../../packages/course-project/storage.mjs";
import { exportVault } from "../../../../packages/course-project/vault.mjs";
import {
  exportArchive,
  importArchive,
} from "../../../../packages/course-project/archive.mjs";
export { uid, now, record };
export { listProjects };
export {
  emptyProject,
  queue,
  search,
  editSegment,
  backlinks,
  download,
  sha256,
} from "../../../../packages/course-project/project.mjs";
export const state: {
  project: any;
  db: any;
  sourceId: string;
  segmentId: string;
  noteId: string;
  status: string;
  ready: boolean;
} = {
  project: emptyProject(),
  db: null,
  sourceId: "",
  segmentId: "",
  noteId: "",
  status: "",
  ready: false,
};
let saving = Promise.resolve();
let channel: BroadcastChannel;
export const changed = () =>
  window.dispatchEvent(new CustomEvent("project-change"));
export async function init() {
  if (state.ready) return;
  state.db = await openDB();
  const stored = await loadProject(state.db);
  state.project =
    stored ||
    validateProject(await (await fetch("assets/data/example.json")).json());
  state.sourceId = state.project.sources[0]?.id || "";
  state.ready = true;
  changed();
  channel = new BroadcastChannel("pku-history-project-updates-v1");
  channel.onmessage = async (e) => {
    if (e.data?.projectId !== state.project.id) return;
    await saving;
    const p: any = await loadProject(state.db, state.project.id);
    if (p && p.revision > state.project.revision) {
      state.project = p;
      changed();
    }
  };
}
export function update(action: string, target: string, edit: () => void) {
  edit();
  record(state.project, action, target);
  changed();
  const snapshot = structuredClone(state.project);
  saving = saving
    .catch(() => {})
    .then(() => saveProject(state.db, snapshot))
    .then(() => {
      state.status = "已保存在本浏览器";
      channel?.postMessage({
        projectId: snapshot.id,
        revision: snapshot.revision,
      });
      changed();
    })
    .catch((e) => {
      state.status = `保存失败：${e.message}；请导出备份`;
      changed();
    });
  return saving;
}
export function chooseSource(id: string) {
  state.sourceId = id;
  state.segmentId = "";
  state.noteId = "";
  changed();
}
export const source = () =>
  state.project.sources.find((x: any) => x.id === state.sourceId);
export const segment = () =>
  state.project.segments.find(
    (x: any) => x.id === state.segmentId && x.sourceId === state.sourceId,
  ) ||
  state.project.segments.find(
    (x: any) => x.sourceId === state.sourceId && !x.derived,
  );
export const task = () =>
  state.project.tasks.find((x: any) => x.sourceId === state.sourceId);
export function ensureTask() {
  if (task() || !source()) return task();
  const t = {
    id: uid("task"),
    sourceId: state.sourceId,
    status: "待读",
    priority: 2,
    type: "筛选",
    range: "",
    readRange: "",
    next: "核对题录并选择阅读范围",
    blocker: "",
    understanding: "",
    updatedAt: now(),
  };
  update("建立阅读任务", t.id, () => state.project.tasks.push(t));
  return t;
}
export const note = () =>
  state.project.notes.find(
    (x: any) =>
      x.id === state.noteId && (!x.sourceId || x.sourceId === state.sourceId),
  ) || state.project.notes.find((x: any) => x.sourceId === state.sourceId);
export async function fileBlob(id: string) {
  const stored = await getAttachment(state.db, id);
  if (stored) return stored as Blob;
  const a = state.project.sources
    .flatMap((x: any) => x.attachments)
    .find((x: any) => x.id === id);
  if (a?.localUrl?.startsWith("/local-file/")) {
    const response = await fetch(a.localUrl);
    if (!response.ok) throw Error("本机原件不可用，请重新附加文件。");
    return await response.blob();
  }
  return null;
}
export async function install(project: any, files: any[] = [], append = false) {
  await saving;
  const checked = append
    ? mergeProject(state.project, project).project
    : validateProject(project);
  if (!append && state.project.id !== checked.id)
    await saveProject(state.db, state.project, [], state.project.id);
  await saveProject(state.db, checked, files);
  state.project = checked;
  state.sourceId = checked.sources[0]?.id || "";
  state.segmentId = "";
  state.noteId = "";
  channel?.postMessage({ projectId: checked.id, revision: checked.revision });
  changed();
}
export async function switchProject(id: string) {
  const p = await loadProject(state.db, id);
  if (!p) throw Error("此项目已不可用。");
  await install(p);
}
export async function loadTeacher() {
  const r = await fetch("/local-example");
  if (!r.ok)
    throw Error("教师本机示例未装载。请使用启动脚本，或上传项目备份。");
  await install(await r.json());
  state.status = "已载入教师本机研究示例";
  changed();
}
async function zipLib() {
  if (!(window as any).JSZip)
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "assets/vendor/jszip.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(Error("备份组件无法载入。"));
      document.head.append(s);
    });
  return (window as any).JSZip;
}
export async function backup() {
  await saving;
  return exportArchive(await zipLib(), state.project, fileBlob);
}
export async function restore(file: File, append = false) {
  const result = file.name.toLowerCase().endsWith(".zip")
    ? await importArchive(await zipLib(), file)
    : {
        project: validateProject(JSON.parse(await file.text())),
        files: [],
        missing: [],
      };
  await install(result.project, result.files, append);
  return result;
}
export function addNote(kind = "来源笔记") {
  const s = segment(),
    n = {
      id: uid("note"),
      sourceId: source()?.id || "",
      segmentId: s?.id || "",
      sourceRevision: s?.revision || 1,
      title: kind,
      kind,
      quote: s?.text || "",
      body: "",
      context: "",
      decision: "待核",
      reason: "",
      stale: false,
      createdAt: now(),
    };
  update("新建笔记", n.id, () => {
    state.project.notes.push(n);
    state.noteId = n.id;
  });
  return n;
}

export async function vaultBackup() {
  await saving;
  return exportVault(await zipLib(), state.project);
}
