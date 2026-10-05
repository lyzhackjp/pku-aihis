import { validateProject } from "./project.mjs";
/** Portable vault: internal IDs are real filenames; source locators remain explicit. */
export async function exportVault(JSZip, project) {
  const p = validateProject(project),
    zip = new JSZip();
  const fm = (fields) =>
    "---\n" +
    Object.entries(fields)
      .map(([k, v]) => `${k}: ${JSON.stringify(v ?? "")}`)
      .join("\n") +
    "\n---\n";
  for (const s of p.sources) {
    const excerpts = p.segments
      .filter((x) => x.sourceId === s.id && !x.derived)
      .map(
        (x) =>
          `## 片段 ${x.id}\n\n定位：${x.pdfPage ? "PDF物理页 " + x.pdfPage : x.locator || "待核"}；印刷页码：${x.printedPage || "待核"}\n\n${x.text}\n`,
      )
      .join("\n");
    zip.file(
      `Sources/${s.id}.md`,
      fm({
        id: s.id,
        title: s.title,
        author: s.author,
        date: s.date,
        kind: s.kind,
      }) +
        `# ${s.title}\n\n` +
        excerpts,
    );
  }
  for (const n of p.notes) {
    const links = p.links
      .filter((l) => l.from === n.id)
      .map(
        (l) =>
          `[[Notes/${l.to}|${p.notes.find((x) => x.id === l.to)?.title || l.to}]] · ${l.type} · ${l.reason || "理由待补"}`,
      )
      .join("\n");
    zip.file(
      `Notes/${n.id}.md`,
      fm({
        id: n.id,
        title: n.title,
        kind: n.kind,
        source: n.sourceId,
        segment: n.segmentId,
        decision: n.decision,
        stale: !!n.stale,
      }) +
        `# ${n.title}\n\n${n.body || ""}\n\n## 原话与出处\n\n${n.quote || ""}\n\n${n.sourceId ? "[[Sources/" + n.sourceId + "]]" : ""}\n\n语境：${n.context || "待补"}\n\n${links}\n`,
    );
  }
  zip.file(
    "README.md",
    "# 个人研究笔记\n\n解压后可作为 Obsidian 库打开。每条笔记单独成文件，内部编号保持链接稳定。Sources 是原文片段与定位记录；完整原件请使用课件的“含原件 ZIP”备份。模型候选、核验状态与失效标记均保留，不等于已经通读原文。\n",
  );
  return zip.generateAsync({ type: "blob" });
}
