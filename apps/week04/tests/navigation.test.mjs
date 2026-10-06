import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveView, viewHash, viewData } from "../src/lib/navigation.mjs";
const processes = JSON.parse(await readFile("src/assets/data/processes.json", "utf8"));
const topics = JSON.parse(await readFile("src/assets/data/pages.json", "utf8"));
test("all curriculum topics remain accessible once through eight processing pages", () => {
  assert.equal(processes.length, 8);
  const mapped = processes.flatMap(p => p.modes.flatMap(m => m.topics));
  assert.equal(new Set(mapped).size, mapped.length);
  assert.deepEqual([...mapped].sort(), topics.map(t => t.id).sort());
});
test("equivalent older views resolve to the same operation within a process", () => {
  for (const ids of [["P01", "P02"], ["P03", "P06"], ["P10", "P11", "P18"], ["P14", "P15", "P16"], ["P24", "P25"], ["P22", "P26", "P40"], ["P35", "P42"]]) {
    const routes = ids.map(id => viewHash(resolveView(processes, id)));
    assert.equal(new Set(routes).size, 1);
  }
  assert.equal(resolveView(processes, "P03").index, resolveView(processes, "P01").index);
});
test("returning to a process restores its remembered mode and supports old links", () => {
  assert.equal(resolveView(processes, "W01", { W01: "P05" }).mode.id, "P05");
  assert.equal(resolveView(processes, "W01/P03", { W01: "P05" }).mode.id, "P03");
  assert.equal(resolveView(processes, "P39").mode.id, "P26");
  assert.equal(resolveView(processes, "unknown"), null);
  assert.equal(resolveView(processes, "W01/invalid").mode.id, "P01");
});
test("teacher notes keep merged curriculum coverage while displaying one process", () => {
  const data = viewData(resolveView(processes, "P15"), topics);
  assert.equal(data.id, "W04");
  for (const id of ["P14", "P15", "P16"]) assert(data.notes.includes(id));
  assert.equal(data.modes.length, 2);
});
