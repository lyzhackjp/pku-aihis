/** Shared, versioned classroom project contract. Never stores credentials. */
export const SCHEMA = "pku-history-project/v1";
export const uid = (prefix = "r") => `${prefix}-${crypto.randomUUID()}`;
export const now = () => new Date().toISOString();
export function emptyProject(title = "我的研究项目") {
  return {
    schema: SCHEMA,
    id: uid("project"),
    title,
    question: "",
    scope: "",
    revision: 0,
    sources: [],
    segments: [],
    tasks: [],
    notes: [],
    links: [],
    claims: [],
    events: [],
  };
}
export function validateProject(value) {
  if (
    !value ||
    value.schema !== SCHEMA ||
    typeof value.id !== "string" ||
    !/^[A-Za-z0-9_-]+$/.test(value.id)
  )
    throw Error("项目格式或版本不受支持。");
  for (const key of [
    "sources",
    "segments",
    "tasks",
    "notes",
    "links",
    "claims",
    "events",
  ]) {
    if (!Array.isArray(value[key])) throw Error(`缺少 ${key} 记录。`);
    if (value[key].length > 100000) throw Error("项目记录过多，请分批导入。");
    const ids = value[key].map((x) => x.id);
    if (
      ids.some((x) => typeof x !== "string" || !/^[A-Za-z0-9_-]+$/.test(x)) ||
      new Set(ids).size !== ids.length
    )
      throw Error(`${key} 含缺失或重复编号。`);
  }
  const sources = new Set(value.sources.map((x) => x.id));
  const segments = new Set(value.segments.map((x) => x.id));
  for (const s of value.sources) {
    if (typeof s.title !== "string" || !Array.isArray(s.attachments))
      throw Error("材料题名或附件表无效。");
    for (const a of s.attachments) {
      if (
        typeof a.id !== "string" ||
        !/^[A-Za-z0-9_-]+$/.test(a.id) ||
        !a.name ||
        (a.sha256 && !/^[a-f0-9]{64}$/.test(a.sha256))
      )
        throw Error("附件身份无效。");
    }
  }
  for (const s of value.segments) {
    if (!sources.has(s.sourceId) || typeof s.text !== "string")
      throw Error("正文片段无法回到材料。");
    if (
      s.attachmentId &&
      !value.sources
        .find((x) => x.id === s.sourceId)
        .attachments.some((a) => a.id === s.attachmentId)
    )
      throw Error("片段所依附件未在对应材料中登记。");
    if (s.pdfPage != null && (!Number.isInteger(s.pdfPage) || s.pdfPage < 1))
      throw Error("PDF 页序须从 1 开始。");
  }
  for (const t of value.tasks)
    if (!sources.has(t.sourceId)) throw Error("阅读任务缺少对应材料。");
  for (const n of value.notes) {
    if (n.sourceId && !sources.has(n.sourceId))
      throw Error("笔记缺少对应材料。");
    if (n.sourceIds && !n.sourceIds.every((id) => sources.has(id)))
      throw Error("笔记缺少对应材料集合。");
    if (n.segmentId && !segments.has(n.segmentId))
      throw Error("笔记缺少对应片段。");
    if (
      n.segmentId &&
      n.sourceId &&
      value.segments.find((s) => s.id === n.segmentId).sourceId !== n.sourceId
    )
      throw Error("笔记的材料和片段不对应。");
  }
  const linkTargets = new Set([...sources, ...value.notes.map((n) => n.id)]);
  for (const l of value.links)
    if (!linkTargets.has(l.from) || !linkTargets.has(l.to))
      throw Error("链接缺少对应记录。");
  for (const c of value.claims)
    for (const key of ["evidence", "counter"])
      if (c[key] && !c[key].every((id) => segments.has(id)))
        throw Error("问题索引缺少对应依据。");
  // Reject secrets rather than silently including them in backups.
  const walk = (x) => {
    if (!x || typeof x !== "object") return;
    for (const [k, v] of Object.entries(x)) {
      if (/^(apiKey|api_key|authorization|password|token|secret)$/i.test(k))
        throw Error("项目中含凭据字段，请移除后再导入。");
      walk(v);
    }
  };
  walk(value);
  return structuredClone(value);
}
export function record(project, action, target, detail = "") {
  project.revision++;
  project.events.push({
    id: uid("event"),
    time: now(),
    action,
    target,
    detail,
  });
  return project;
}
export function editSegment(project, id, text) {
  const s = project.segments.find((x) => x.id === id);
  if (!s) throw Error("找不到原片段。");
  if (s.text === text) return;
  s.history ||= [];
  s.history.push({ text: s.text, revision: s.revision || 1, time: now() });
  s.text = text;
  s.revision = (s.revision || 1) + 1;
  s.verification = "待核";
  delete s.normalized;
  delete s.normalizationRule;
  delete s.normalizationRevision;
  for (const n of project.notes.filter(
    (x) => x.segmentId === id || x.inputSnapshot?.some((r) => r.id === id),
  ))
    n.stale = true;
  for (const c of project.claims.filter(
    (x) => x.evidence?.includes(id) || x.counter?.includes(id),
  ))
    c.stale = true;
  for (const d of project.segments.filter(
    (x) => x.derived && x.inputSnapshot?.some((r) => r.id === id),
  ))
    d.stale = true;
  record(project, "校订正文；相关笔记待复核", id);
}
export function mergeProject(base, incoming) {
  const p = validateProject(base),
    q = validateProject(incoming);
  let added = 0,
    skipped = 0;
  const remap = new Map();
  for (const source of q.sources) {
    // File identity cannot decide work/edition identity. Only a shared record ID is reused.
    const duplicate = p.sources.find((s) => s.id === source.id);
    if (duplicate) {
      for (const attachment of source.attachments) {
        const existing = duplicate.attachments.find(
          (a) => a.id === attachment.id,
        );
        if (
          existing &&
          existing.sha256 &&
          attachment.sha256 &&
          existing.sha256 !== attachment.sha256
        )
          throw Error("同一附件编号的内容指纹冲突，未追加。");
        if (!existing) duplicate.attachments.push(attachment);
      }
      remap.set(source.id, duplicate.id);
      skipped++;
      continue;
    }
    p.sources.push(source);
    remap.set(source.id, source.id);
    added++;
  }
  for (const key of ["segments", "tasks", "notes", "links", "claims"])
    for (const row of q[key]) {
      if (row.sourceId) row.sourceId = remap.get(row.sourceId) || row.sourceId;
      // Reimporting never overwrites a reader's own annotations.
      if (!p[key].some((x) => x.id === row.id)) p[key].push(row);
    }
  record(p, "追加材料", q.id, `新增 ${added}；重复 ${skipped}；保留原有笔记`);
  return { project: validateProject(p), added, skipped };
}
export function queue(project, mode = "全部") {
  return project.tasks
    .filter((t) => {
      const s = project.sources.find((x) => x.id === t.sourceId);
      if (mode === "缺全文") return !s?.attachments.length;
      if (mode === "可开始")
        return s?.attachments.length && t.status === "待读";
      if (mode === "待核") return t.status === "待核";
      if (mode === "已完成") return t.status === "完成";
      return true;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}
export function search(project, query, includeDerived = false) {
  const terms = query.trim().split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  return project.segments.filter((s) => {
    const source = project.sources.find((x) => x.id === s.sourceId);
    return (
      source?.included !== false &&
      (includeDerived || !s.derived) &&
      terms.every((t) => (s.normalized || s.text).includes(t))
    );
  });
}
export function backlinks(project, id) {
  return project.links
    .filter((x) => x.to === id)
    .map((x) => ({ ...x, note: project.notes.find((n) => n.id === x.from) }));
}
export async function sha256(blob) {
  const bytes = blob instanceof Blob ? await blob.arrayBuffer() : blob;
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
