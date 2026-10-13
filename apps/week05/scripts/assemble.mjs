import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const app=path.resolve(import.meta.dirname,'..'),root=path.resolve(app,'../..');
await fs.copyFile(path.join(root,'modules/history-demo/math.js'),path.join(app,'src/assets/runtime/math.js'));
const sources=JSON.parse(await fs.readFile(path.join(app,'src/assets/materials/sources.json'),'utf8'));
await fs.writeFile(path.join(app,'src/assets/materials/sources.js'),'window.W5_SOURCES = '+JSON.stringify(sources)+';\n');
const pages=JSON.parse(await fs.readFile(path.join(root,'docs/week05/page-map.json'),'utf8'));
const glossary=JSON.parse(await fs.readFile(path.join(root,'docs/week05/glossary.json'),'utf8'));
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tags=new Set(['hero-cover','set-measure-lab','support-lab','entity-lab','through-workbench','concept-table','week05-lab','revision-lab']);
for(const p of pages)if(p.status!=='implemented'||!tags.has(p.component))throw Error('Incomplete page '+p.id);
const deck={name:'第五周 · 知识库检索与有依据的生成',channel:'pku-aihis-week05-20261011',store:'week05/v3/',entries:{through:{label:'贯穿检查',page:'D24'},concepts:{label:'概念表',page:'D25'}}};
await fs.mkdir(path.join(app,'src/assets/data'),{recursive:true});
await fs.writeFile(path.join(app,'src/assets/data/data.js'),'window.DECK_DATA = '+JSON.stringify({pages,glossary,deck})+';\n');
const slides=pages.map(p=>`<deck-slide slide-id="${p.id}" data-status="implemented" kicker="${E(p.id+' / '+p.section)}" header-title="${E(p.title)}" transition="${E(p.transition)}" theme="${E(p.theme||'light')}" layout="${E(p.layout)}" mode="${E(p.mode)}" notes="${E('目的：'+p.notes.purpose+'\n范例引导：'+p.notes.guide+'\n机制背景：'+p.notes.mechanism)}"><${p.component}${['week05-lab','revision-lab'].includes(p.component)?` page-id="${p.id}"`:''}></${p.component}><div slot="footer">${E(p.footer)}</div></deck-slide>`).join('\n');
// Preserve the portable native components; Stencil owns packaging and the course status component.
await fs.writeFile(path.join(app,'src/index.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>第五周 · 知识库检索与有依据的生成（候选）</title><link rel="stylesheet" href="assets/runtime/deck.css"><link rel="stylesheet" href="assets/revision/revision.css"><script type="module" src="build/week05.esm.js"></script><script nomodule src="build/week05.js"></script><script src="assets/data/data.js"></script><script src="assets/materials/sources.js"></script><script src="assets/vendor/opencc.js"></script><script src="assets/runtime/math.js"></script><script src="assets/runtime/deck-core.js"></script><script src="assets/runtime/week05-labs.js"></script><script src="assets/revision/revision-labs.js"></script></head><body><div id="app"></div><courseware-status></courseware-status><model-connection></model-connection><template id="deck-template"><deck-container>${slides}</deck-container></template></body></html>`);
await fs.mkdir(path.join(app,'src/assets/vendor'),{recursive:true});
await fs.copyFile(path.join(app,'node_modules/opencc-js/dist/umd/full.js'),path.join(app,'src/assets/vendor/opencc.js'));
await fs.copyFile(path.join(app,'node_modules/opencc-js/LICENSE'),path.join(app,'src/assets/vendor/OpenCC-LICENSE.txt'));
console.log('Assembled',pages.length,'implemented pages');

await fs.copyFile(path.join(root,'modules/history-demo/advanced.mjs'),path.join(app,'src/assets/revision/advanced.mjs'));
await fs.copyFile(path.join(root,'packages/course-project/project.mjs'),path.join(app,'src/assets/revision/project.mjs'));
await fs.mkdir(path.join(app,'src/assets/vendor/fflate'),{recursive:true});
await fs.copyFile(path.join(app,'node_modules/fflate/esm/browser.js'),path.join(app,'src/assets/vendor/fflate/fflate.mjs'));
await fs.mkdir(path.join(app,'src/assets/vendor/transformers'),{recursive:true});
for(const f of ['transformers.min.js','ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm'])await fs.copyFile(path.join(app,'node_modules/@huggingface/transformers/dist',f),path.join(app,'src/assets/vendor/transformers',f));
await fs.copyFile(path.join(app,'node_modules/@huggingface/transformers/LICENSE'),path.join(app,'src/assets/vendor/transformers/LICENSE'));
execFileSync('pnpm',['build'],{cwd:path.join(root,'apps/material-importer'),env:{...process.env,PKU_IMPORTER_BASE:'./'},stdio:'inherit'});
const importer=path.join(root,'apps/material-importer/dist');
await fs.rm(path.join(app,'src/assets/importer'),{recursive:true,force:true});
try{await fs.access(importer);await fs.cp(importer,path.join(app,'src/assets/importer'),{recursive:true,filter:p=>!p.endsWith('.map')});}catch{throw Error('Prepare shared importer with PKU_IMPORTER_BASE=./ pnpm build');}
// place the importer next to the deck at a stable relative URL after Stencil copying
