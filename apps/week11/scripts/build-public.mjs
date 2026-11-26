import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const app = path.resolve(import.meta.dirname, '..');
const source = path.join(app, 'prototype');
const output = path.join(app, 'www/pku-aihis/week11');
const read = name => readFile(path.join(source, name), 'utf8');
const html = await read('index.html');
const context = {window: {}};
vm.runInNewContext(await read('data/w11-public.js'), context);
vm.runInNewContext(await read('data/data.js'), context);
const pack = context.window.W11_PUBLIC;
assert.equal(pack.replays.length, 0, 'Public pack includes classroom replays');
assert.ok(!('teacher' in pack) && !('page_images' in pack), 'Private pack fields');
assert.deepEqual(Object.keys(pack.docx).sort(), [
  'demo3a_manual.docx', 'demo3b_reviser.docx', 'jia_draft.docx', 'jia_revisions.docx',
]);
const map = JSON.parse(await readFile(path.join(app, '../../docs/week11/page-map.json'), 'utf8'));
const ids = map.map(p => p.id);
assert.equal(ids.length, 23);
assert.deepEqual(Array.from(context.window.DECK_DATA.pages, p => p.id), ids);
assert.deepEqual(Array.from(html.matchAll(/<deck-slide\b[^>]*slide-id="([^"]+)"/g), m => m[1]), ids);

const entryAssets = Array.from(html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g), m => m[1]);
assert.ok(entryAssets.every(name => /^(?:(?:data|live)\/)?[\w.-]+\.(?:css|js)$/.test(name)), 'Unexpected entry asset');
const qr = ['AIPeerReviewBenchmark', 'CNE', 'ClaudeForWord', 'ExcessVocab', 'ITERATER', 'RefChecker',
  'Refine', 'ReverseOutline', 'SPOT', 'Zotero', 'coarse'];
const files = ['index.html', ...entryAssets, 'live/vendor/api.mjs', ...qr.map(name => 'assets/qr/' + name + '.svg'),
  'assets/word/step_5b_continuous_mac_word365.png', 'assets/word/step_5b_perpage_mac_word365.png'];
await rm(output, {recursive: true, force: true});
for (const name of files) {
  const target = path.join(output, name);
  await mkdir(path.dirname(target), {recursive: true});
  await cp(path.join(source, name), target);
}
await read('importer/index.html');
await cp(path.join(source, 'importer'), path.join(output, 'importer'), {recursive: true});
console.log('Assembled week11:', ids.length, 'slides, embedded importer, public replays:', pack.replays.length);
