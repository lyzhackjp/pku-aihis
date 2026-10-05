import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  emptyProject,
  validateProject,
  queue,
  search,
  editSegment,
  mergeProject,
} from "../../../packages/course-project/project.mjs";
function project() {
  const p = emptyProject();
  p.sources = [{ id: "s", title: "德教史料", attachments: [], included: true }];
  p.segments = [
    { id: "p", sourceId: "s", text: "徳教と宗教", pdfPage: 2, revision: 1 },
  ];
  p.tasks = [{ id: "t", sourceId: "s", status: "待读", priority: 2 }];
  return p;
}
test("acquiring an attachment moves the same task between actual conditional queues", () => {
  const p = project();
  assert.equal(queue(p, "缺全文").length, 1);
  assert.equal(queue(p, "可开始").length, 0);
  p.sources[0].attachments.push({ id: "a", name: "原件.pdf" });
  assert.equal(queue(p, "缺全文").length, 0);
  assert.equal(queue(p, "可开始")[0].id, "t");
});
test("derived summaries are excluded from ordinary source retrieval", () => {
  const p = project();
  p.segments.push({
    id: "d",
    sourceId: "s",
    text: "徳教 is always religion",
    derived: true,
  });
  assert.deepEqual(
    search(p, "徳教").map((x) => x.id),
    ["p"],
  );
  assert.equal(search(p, "徳教", true).length, 2);
});
test("editing source invalidates normalized retrieval, supporting and counter-evidence dependencies", () => {
  const p = project();
  p.segments[0].normalized = "旧副本";
  p.notes.push({ id: "n", sourceId: "s", segmentId: "p" });
  p.claims.push({ id: "c", evidence: [], counter: ["p"] });
  editSegment(p, "p", "校訂した徳教");
  assert.equal(p.segments[0].normalized, undefined);
  assert.equal(p.segments[0].history[0].text, "徳教と宗教");
  assert.equal(p.notes[0].stale, true);
  assert.equal(p.claims[0].stale, true);
});
test("reimport preserves personal writing while retaining separate bibliographic identities", () => {
  const p = project();
  p.notes.push({ id: "n", sourceId: "s", body: "我的解释" });
  const incoming = structuredClone(p);
  incoming.notes[0].body = "外部改写";
  const m = mergeProject(p, incoming);
  assert.equal(m.project.notes[0].body, "我的解释");
  assert.equal(m.skipped, 1);
  const q = project();
  q.sources[0].id = "s2";
  q.segments = [];
  q.tasks = [];
  assert.equal(mergeProject(p, q).project.sources.length, 2);
});
test("invalid page numbers, dangling source references and credentials are rejected before saving", () => {
  const p = project();
  p.segments[0].pdfPage = 0;
  assert.throws(() => validateProject(p), /页序/);
  p.segments[0].pdfPage = 2;
  p.segments[0].sourceId = "missing";
  assert.throws(() => validateProject(p), /材料/);
  p.segments[0].sourceId = "s";
  p.model = { apiKey: "do-not-export" };
  assert.throws(() => validateProject(p), /凭据/);
});
test("published seed and all 42 stable page entries have a real curriculum mapping", async () => {
  const p = validateProject(
    JSON.parse(await readFile("src/assets/data/example.json", "utf8")),
  );
  assert.equal(p.segments.length, 0);
  const pages = JSON.parse(
    await readFile("src/assets/data/pages.json", "utf8"),
  );
  assert.equal(pages.length, 42);
  assert.equal(new Set(pages.map((x) => x.id)).size, 42);
  assert(pages.every((x) => x.section && x.notes && x.action));
});

test("portable record IDs and evidence relationships are checked before restoration", () => {
  const p = project();
  p.notes.push({ id: "../outside", sourceId: "s", body: "unsafe filename" });
  assert.throws(() => validateProject(p), /编号/);
  p.notes[0].id = "n";
  p.links.push({ id: "l", from: "n", to: "missing" });
  assert.throws(() => validateProject(p), /链接/);
  p.links = [];
  p.claims.push({ id: "c", evidence: ["missing"], counter: [] });
  assert.throws(() => validateProject(p), /依据/);
});
