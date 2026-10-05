import { validateProject } from "./project.mjs";
export async function openDB(name = "pku-history-week04") {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("projects");
      request.result.createObjectStore("attachments");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadProject(db, key = "current") {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readonly");
    const r = tx.objectStore("projects").get(key);
    r.onsuccess = () => resolve(r.result ? validateProject(r.result) : null);
    r.onerror = () => reject(r.error);
  });
}
export async function saveProject(db, project, files = [], key = "current") {
  const checked = validateProject(project);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["projects", "attachments"], "readwrite");
    tx.objectStore("projects").put(checked, key);
    tx.objectStore("projects").put(checked, checked.id);
    for (const f of files) tx.objectStore("attachments").put(f.blob, f.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error("保存中断；原项目未改变。"));
  });
}
export async function listProjects(db) {
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("projects", "readonly")
      .objectStore("projects")
      .getAll();
    r.onsuccess = () =>
      resolve([...new Map(r.result.map((p) => [p.id, p])).values()]);
    r.onerror = () => reject(r.error);
  });
}
export async function getAttachment(db, id) {
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("attachments", "readonly")
      .objectStore("attachments")
      .get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
