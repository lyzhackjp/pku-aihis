import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  emptyProject,
  sha256,
  mergeProject,
} from "../../../packages/course-project/project.mjs";
import {
  exportArchive,
  importArchive,
} from "../../../packages/course-project/archive.mjs";
import { exportVault } from "../../../packages/course-project/vault.mjs";
async function sample() {
  const p = emptyProject(),
    b = new Blob(["正文原件"], { type: "text/plain" });
  p.sources = [
    {
      id: "s1",
      title: "示例",
      attachments: [
        {
          id: "a1",
          name: "original.txt",
          type: b.type,
          sha256: await sha256(b),
        },
      ],
    },
  ];
  p.segments = [
    {
      id: "g1",
      sourceId: "s1",
      attachmentId: "a1",
      text: "正文",
      locator: "段落1",
    },
  ];
  p.notes = [
    {
      id: "n1",
      sourceId: "s1",
      segmentId: "g1",
      title: "问题一",
      body: "个人理解",
    },
    { id: "n2", sourceId: "s1", title: "问题二", body: "后续解释" },
  ];
  p.links = [{ id: "l1", from: "n1", to: "n2", type: "问题联系" }];
  return { p, b };
}
test("complete archive restores attachment bytes, individual locators and personal writing", async () => {
  const { p, b } = await sample();
  const r = await exportArchive(JSZip, p, () => b);
  const restored = await importArchive(JSZip, r.blob);
  assert.deepEqual(
    restored.project.sources[0].attachments,
    p.sources[0].attachments,
  );
  assert.equal(await restored.files[0].blob.text(), "正文原件");
  assert.equal(restored.project.notes[0].body, "个人理解");
  assert.equal(restored.project.segments[0].locator, "段落1");
});
test("corrupted original is rejected before a project can be installed", async () => {
  const { p, b } = await sample();
  const r = await exportArchive(JSZip, p, () => b);
  const z = await JSZip.loadAsync(await r.blob.arrayBuffer());
  z.file("attachments/a1", "changed");
  const broken = new Blob([await z.generateAsync({ type: "uint8array" })]);
  await assert.rejects(() => importArchive(JSZip, broken), /校验失败/);
  assert.equal(p.notes[0].body, "个人理解");
});
test("metadata-only archives explicitly report missing originals", async () => {
  const { p } = await sample();
  const r = await exportArchive(JSZip, p, () => null);
  assert.deepEqual(r.missing, ["a1"]);
  const restored = await importArchive(JSZip, r.blob);
  assert.deepEqual(restored.missing, ["a1"]);
  assert.equal(restored.files.length, 0);
});
test("new attachments of an existing record append while handwritten notes survive reimport", async () => {
  const { p } = await sample();
  const q = structuredClone(p);
  q.sources[0].attachments.push({ id: "a2", name: "new-edition.pdf" });
  q.segments.push({
    id: "g2",
    sourceId: "s1",
    attachmentId: "a2",
    text: "新增依据",
    pdfPage: 1,
  });
  q.notes[0].body = "外部改写";
  const r = mergeProject(p, q);
  assert.equal(r.project.sources[0].attachments.length, 2);
  assert.equal(r.project.segments.length, 2);
  assert.equal(r.project.notes[0].body, "个人理解");
});
test("vault links resolve to individual exported notes and sources", async () => {
  const { p } = await sample();
  const z = await JSZip.loadAsync(
    await (await exportVault(JSZip, p)).arrayBuffer(),
  );
  const n = await z.file("Notes/n1.md").async("string");
  assert(n.includes("[[Notes/n2|问题二]]"));
  assert(n.includes("[[Sources/s1]]"));
  assert(z.file("Notes/n2.md"));
  assert((await z.file("Sources/s1.md").async("string")).includes("段落1"));
});
