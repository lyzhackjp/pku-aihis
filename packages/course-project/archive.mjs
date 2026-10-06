import { validateProject, sha256 } from "./project.mjs";
/** JSZip is injected, keeping this contract independent of either application. */
export async function exportArchive(JSZip, project, getFile) {
  const p = validateProject(project),
    zip = new JSZip();
  const missing = [];
  for (const source of p.sources)
    for (const a of source.attachments) {
      const blob = await getFile(a.id);
      if (!blob) {
        missing.push(a.id);
        continue;
      }
      const hash = await sha256(blob);
      if (a.sha256 && hash !== a.sha256)
        throw Error(`附件 ${a.name} 与记录指纹不一致。`);
      a.sha256 = hash;
      zip.file(`attachments/${a.id}`, await blob.arrayBuffer());
    }
  zip.file("project.json", JSON.stringify(p, null, 2));
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        schema: p.schema,
        attachmentsIncluded: true,
        missingAttachments: missing,
      },
      null,
      2,
    ),
  );
  return { blob: await zip.generateAsync({ type: "blob" }), missing };
}
export async function importArchive(JSZip, file) {
  if (file.size > 512 * 1024 * 1024)
    throw Error("备份超过 512MB；请拆分后导入。");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entry = zip.file("project.json");
  if (!entry) throw Error("备份内缺少 project.json。");
  const project = validateProject(JSON.parse(await entry.async("string"))),
    files = [],
    missing = [];
  let total = 0;
  for (const source of project.sources)
    for (const a of source.attachments) {
      if (!/^[A-Za-z0-9_-]+$/.test(a.id)) throw Error("附件编号包含非法字符。");
      const entry = zip.file(`attachments/${a.id}`);
      if (!entry) {
        missing.push(a.id);
        continue;
      }
      const bytes = await entry.async("uint8array");
      total += bytes.byteLength;
      if (total > 512 * 1024 * 1024) throw Error("解压后附件过大。");
      const blob = new Blob([bytes], {
        type: a.type || "application/octet-stream",
      });
      if (a.sha256 && (await sha256(blob)) !== a.sha256)
        throw Error(`附件 ${a.name} 校验失败，未恢复。`);
      files.push({ id: a.id, blob });
    }
  return { project, files, missing };
}
