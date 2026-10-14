/**
 * Convert a fourth-week complete course backup into the shared course project.
 *
 * Input: the backup's top-level entries as {path: Uint8Array}, plus an unzip
 * function for the nested patchouli.zip (fflate.unzipSync or a JSZip adapter).
 * The backup contains patchouli.zip (library.sqlite + files/*.pdf),
 * reading-records.json and browser-drafts.json.
 *
 * Every converted text segment keeps the week-04 identity it came from:
 * document instance, PDF page, tree revision and box, so a citation can be
 * resolved again as patchouli://texts/{doc}/page-{n}.md?rev=…&box=….
 */
import { openSqlite } from "./sqlite-read.mjs";
import { SCHEMA, validateProject } from "./project.mjs";

export function isWeek04Backup(paths) {
  const names = new Set(paths.map((p) => p.replace(/^.*\//, "")));
  return names.has("patchouli.zip") && names.has("reading-records.json");
}

const safe = (x) => String(x).replace(/[^A-Za-z0-9_-]/g, "-");
const text = (bytes) => new TextDecoder().decode(bytes);
async function sha256(bytes) {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function json(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function creators(row) {
  return json(row.creators_json, [])
    .map((c) => c.literal || [c.family, c.given].filter(Boolean).join(c.family && /[぀-鿿]/.test(c.family) ? "" : ", "))
    .filter(Boolean)
    .join("；");
}
const ROLE = { 史料: "史料", 二手文献: "二手文献", 教师研究产物: "教师研究产物" };

export async function convertWeek04Backup(entries, unzip, { onProgress = () => {} } = {}) {
  const top = Object.fromEntries(Object.entries(entries).map(([k, v]) => [k.replace(/^.*\//, ""), v]));
  if (!isWeek04Backup(Object.keys(top))) throw Error("这不是第四周完整课程备份（缺少 patchouli.zip 或 reading-records.json）。");
  onProgress("正在展开第四周书库…");
  const inner = await unzip(top["patchouli.zip"]);
  const sqliteKey = Object.keys(inner).find((k) => /(^|\/)library\.sqlite$/.test(k));
  if (!sqliteKey) throw Error("patchouli.zip 内缺少 library.sqlite。");
  const db = openSqlite(inner[sqliteKey]);
  const lib = db.rows("library_metadata")[0] || {};
  const items = db.rows("items").filter((i) => !i.deleted_at && !i.merged_into_item_id);
  const instances = db.rows("document_instances").filter((d) => d.status !== "deprecated");
  const assets = new Map(db.rows("file_assets").map((a) => [a.file_asset_id, a]));
  const pages = new Map(db.rows("pages").map((p) => [p.page_id, p]));
  const units = db.rows("search_units").filter((u) => !u.superseded_by_unit_id);
  const reading = json(top["reading-records.json"] && text(top["reading-records.json"]), { runs: [] });
  const drafts = top["browser-drafts.json"] ? json(text(top["browser-drafts.json"]), null) : null;

  const project = {
    schema: SCHEMA,
    id: "w4-" + safe(lib.library_id || "library"),
    title: "第四周完整备份：" + (lib.display_name || "书库"),
    question: "",
    scope: `第四周完整课程备份转换：题录 ${items.length} 条、文档实例 ${instances.length} 个、有效文本块 ${units.length} 个；文本块保留第四周文档、页、修订与块编号。`,
    revision: 1,
    sources: [],
    segments: [],
    tasks: [],
    notes: [],
    links: [],
    claims: [],
    events: [],
    origin: { format: "week04-complete-backup", libraryId: lib.library_id, schemaVersion: lib.schema_version, convertedAt: new Date().toISOString() },
  };
  if (drafts) project.week04Drafts = drafts;
  const files = [];
  const sourceOf = new Map();
  let n = 0;
  for (const item of items) {
    const custom = json(item.custom_fields_json, {});
    const origin = custom["x-pku-material-origin"] || {};
    const kind = ROLE[origin.kind] || "课程材料";
    const id = "w4-" + safe(item.item_id);
    const source = {
      id,
      title: item.title,
      author: creators(item),
      date: origin.date || item.date || "待查",
      kind,
      itemType: item.item_type,
      publication: item.publication_title || "",
      publisher: item.publisher || "",
      edition: [item.publication_title, item.volume && `${item.volume}卷`, item.issue && `${item.issue}号`, item.publisher, item.date].filter(Boolean).join("；") || "待查",
      acquisition: "第四周完整课程备份（Patchouli 书库）转换",
      attachments: [],
      week04: { itemId: item.item_id, citationKey: item.citation_key, packId: origin.packId, packSourceId: origin.sourceId },
    };
    project.sources.push(source);
    sourceOf.set(item.item_id, source);
    for (const doc of instances.filter((d) => d.item_id === item.item_id)) {
      const asset = assets.get(doc.file_asset_id);
      if (!asset) continue;
      const key = Object.keys(inner).find((k) => k.endsWith("files/" + asset.file_asset_id + ".pdf") || k.endsWith("/" + asset.file_name));
      if (!key) continue;
      const bytes = inner[key];
      const attachment = { id: "w4f-" + safe(asset.file_asset_id), name: asset.file_name, type: "application/pdf", size: bytes.byteLength, sha256: await sha256(bytes), pages: asset.page_count, week04: { documentInstanceId: doc.document_instance_id, blake3: asset.full_blake3 } };
      source.attachments.push(attachment);
      files.push({ id: attachment.id, bytes, type: "application/pdf" });
      const docUnits = units
        .filter((u) => u.document_instance_id === doc.document_instance_id)
        .map((u) => ({ u, p: pages.get(u.page_id) }))
        .sort((a, b) => (a.p?.page_index ?? 0) - (b.p?.page_index ?? 0) || a.u.ordinal - b.u.ordinal);
      for (const { u, p } of docUnits) {
        const pdfPage = (p?.page_index ?? 0) + 1;
        project.segments.push({
          id: "w4u-" + safe(u.unit_id),
          sourceId: id,
          attachmentId: attachment.id,
          text: u.resolved_text,
          pdfPage,
          printedPage: p?.page_label || "",
          locator: `PDF页序${pdfPage}${p?.page_label ? "；印刷页" + p.page_label : ""}；第四周文本块${u.ordinal + 1}`,
          verification: u.status === "stale" ? "第四周索引标为待更新；文本取自已提交修订，引用前回原页核对" : "第四周当前修订；识读文本未全篇校勘",
          method: "第四周书库文本块（识读与修订按原记录）",
          uri: `patchouli://texts/${doc.document_instance_id}/page-${pdfPage}.md?rev=${u.tree_revision_id}&box=${u.box_id}`,
          week04: { documentInstanceId: doc.document_instance_id, pageId: u.page_id, treeRevisionId: u.tree_revision_id, boxId: u.box_id, boxType: u.box_type, ordinal: u.ordinal },
        });
      }
      if (++n % 5 === 0) onProgress(`已转换 ${n} 份原件…`);
    }
    // Working drafts without PDFs keep their text in the item note.
    if (!source.attachments.length && item.note)
      project.segments.push({ id: "w4n-" + safe(item.item_id), sourceId: id, text: item.note, locator: "第四周题录附注（无原件）", verification: "教师工作稿；未作为史料核读", method: "第四周题录附注" });
    if (!project.segments.some((s) => s.sourceId === id)) source.noText = true;
  }
  for (const run of reading.runs || []) {
    const source = sourceOf.get(run.itemId);
    project.events.push({ id: "w4run-" + safe(run.id), time: run.created || "", action: "第四周阅读轮次", target: source?.id || "", detail: run.task || "", week04Run: run });
  }
  project.events.push({ id: "w4-convert", time: project.origin.convertedAt, action: "由第四周完整备份转换", target: project.id, detail: project.scope });
  onProgress("转换完成，正在校验…");
  return { project: validateProject(project), files, summary: summarize(project, files) };
}

export function summarize(project, files = []) {
  const byKind = {};
  for (const s of project.sources) byKind[s.kind] = (byKind[s.kind] || 0) + 1;
  return {
    sources: project.sources.length,
    attachments: files.length,
    pages: project.sources.reduce((n, s) => n + s.attachments.reduce((m, a) => m + (a.pages || 0), 0), 0),
    segments: project.segments.length,
    characters: project.segments.reduce((n, s) => n + [...s.text].length, 0),
    readingRuns: project.events.filter((e) => e.action === "第四周阅读轮次").length,
    byKind,
  };
}
