import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openSqlite } from '../../../packages/course-project/sqlite-read.mjs';
import { convertWeek04Backup, isWeek04Backup } from '../../../packages/course-project/week04-backup.mjs';

// Synthetic fixture with the real Patchouli schema: one PDF item, one draft
// without original, a superseded unit and a long unit stored on overflow pages.
const sqlite = new Uint8Array(fs.readFileSync(new URL('./fixtures/week04-mini.sqlite', import.meta.url)));
const pdf = new TextEncoder().encode('%PDF-1.4\n%fixture\n');
const inner = { 'library.sqlite': sqlite, 'files/asset-a.pdf': pdf };
const reading = { schema: 'pku-reading-records/v1', runs: [{ id: 'run-1', itemId: 'item-a', task: '释义', created: '2026-10-07', candidates: [], versions: [] }] };
const entries = {
  'patchouli.zip': new Uint8Array([1]),
  'reading-records.json': new TextEncoder().encode(JSON.stringify(reading)),
  'browser-drafts.json': new TextEncoder().encode('{"schema":"x","values":{}}'),
};
const unzip = () => inner;

test('pure SQLite reader reads rowid tables including overflow chains', () => {
  const db = openSqlite(sqlite);
  const units = db.rows('search_units');
  assert.equal(units.length, 3);
  assert.equal(units.find((u) => u.unit_id === 'u2').resolved_text.length, 6000);
  assert.equal(db.rows('pages')[1].page_label, '11');
});

test('fourth-week backup becomes a shared project with week-04 evidence identity', async () => {
  assert.equal(isWeek04Backup(Object.keys(entries)), true);
  assert.equal(isWeek04Backup(['project.json']), false);
  const r = await convertWeek04Backup(entries, unzip);
  assert.equal(r.summary.sources, 2);
  assert.deepEqual(r.summary.byKind, { 史料: 1, 教师研究产物: 1 });
  assert.equal(r.files.length, 1);
  const segs = r.project.segments;
  assert.equal(segs.length, 3, 'superseded unit is left out, draft note is kept');
  const first = segs.find((s) => s.text === '短文一');
  assert.equal(first.pdfPage, 1);
  assert.equal(first.uri, 'patchouli://texts/doc-a/page-1.md?rev=rev-1&box=box-u1');
  assert.match(segs.find((s) => s.text.length === 6000).verification, /待更新/);
  assert.equal(segs.find((s) => s.text === '研究稿正文').attachmentId, undefined);
  assert.equal(r.project.events.filter((e) => e.action === '第四周阅读轮次').length, 1);
  assert.match(r.project.sources[0].attachments[0].sha256, /^[a-f0-9]{64}$/);
});

test('non-backup archives are rejected without partial projects', async () => {
  await assert.rejects(() => convertWeek04Backup({ 'project.json': new Uint8Array() }, unzip), /不是第四周完整课程备份/);
});
