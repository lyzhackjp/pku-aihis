import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const app=path.resolve(import.meta.dirname,'..');const root=path.resolve(app,'../..');
const pages=JSON.parse(await fs.readFile(path.join(root,'docs/week05/page-map.json'))),sources=JSON.parse(await fs.readFile(path.join(app,'src/assets/materials/sources.json'))),glossary=JSON.parse(await fs.readFile(path.join(root,'docs/week05/glossary.json')));
assert.equal(pages.length,26);assert.equal(pages.reduce((sum,p)=>sum+(p.minutes||0),0),160);
for(const [i,p] of pages.entries()){assert.equal(p.id,'D'+String(i).padStart(2,'0'));assert.equal(p.status,'implemented');assert.ok(p.component);for(const k of ['purpose','guide','mechanism'])assert.ok(p.notes[k]);}
for(const term of glossary.categories.flatMap(c=>c.terms)){assert.ok(pages.some(p=>p.id===term.first_slide));}
assert.equal(sources.length,3);for(const m of sources){for(const k of ['author','title','edition','provider','url','scope','rights','acquisition'])assert.ok(m[k]);for(const p of m.paragraphs){assert.ok(p.locator);assert.ok(p.text);assert.ok(p.url);}}
let data=JSON.stringify(pages)+JSON.stringify(glossary)+await fs.readFile(path.join(app,'src/assets/runtime/week05-complete.js'),'utf8');
assert.ok(!data.includes('大语言模型介入学术史分析的可能与边界'));assert.ok(!data.includes('/Users/'));
console.log('Delivery checks passed: 26 complete pages; 160 minutes; concept links; 3 source identities; no unpublished manuscript');
