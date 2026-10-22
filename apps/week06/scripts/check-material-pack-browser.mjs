// 候选。Actual local Chrome import/refresh checks. Screenshots use public fixtures only.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {emptyProject} from '../../../packages/course-project/project.mjs';
import {exportArchive} from '../../../packages/course-project/archive.mjs';
import {MATERIAL_PACK_VERSION} from '../../../modules/history-demo/ocr/material-pack.mjs';

const repo=path.resolve(import.meta.dirname,'../../..');
const base=process.env.WEEK06_URL||'http://127.0.0.1:8776/pku-aihis/week06/';
const out=process.env.WEEK06_VERIFY_DIR||repo+'/docs/week06/verification/20261022-material-pack';
await fs.mkdir(out,{recursive:true});
const JSZip=createRequire(repo+'/apps/material-importer/package.json')('jszip');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const project=emptyProject('公开材料导入夹具（来源为真实保存记录）');
project.id='public-material-import-test';project.sources=[{id:'source-test',title:'1926 年公开本；两页编号用于导入测试',attachments:[]}];
const blobs=new Map();
function attach(id,name,type,bytes){project.sources[0].attachments.push({id,name,type,sha256:hash(bytes)});blobs.set(id,new Blob([bytes],{type}));}
const sourceDir=repo+'/apps/week06/src/assets/materials/';
const record=JSON.parse(gunzipSync(await fs.readFile(sourceDir+'shide-1926-ndl-default-record.json.gz')));
const imageBytes=await fs.readFile(sourceDir+'shide-1926-p141.png');
attach('fixture-image','public-shide.png','image/png',imageBytes);
const pages=[];
for(const id of ['fixture-page-one','fixture-page-two']){
 const r=structuredClone(record);r.image.source.material_id=id;r.image.source.identity='公开本导入测试；同一页的两个测试编号';
 attach(id+'-record',id+'.json','application/json',Buffer.from(JSON.stringify(r)));
 pages.push({id,sourceId:'source-test',identity:'公开本导入测试 · '+id,imageAttachmentId:'fixture-image',recordAttachmentIds:[id+'-record'],
  page_systems:record.image.source.page_systems,width:record.image.width,height:record.image.height});
}
project.week06_materials={version:MATERIAL_PACK_VERSION,pages};
const archive=await exportArchive(JSZip,project,id=>blobs.get(id));
const validPath=out+'/public-fixture.zip';await fs.writeFile(validPath,Buffer.from(await archive.blob.arrayBuffer()));
const corrupt=await JSZip.loadAsync(await archive.blob.arrayBuffer());corrupt.file('attachments/fixture-image','bad checksum');
const corruptPath=out+'/bad-checksum-fixture.zip';await fs.writeFile(corruptPath,await corrupt.generateAsync({type:'nodebuffer'}));
const mismatch=structuredClone(project);mismatch.week06_materials.pages[0].width++;
const mismatchArchive=await exportArchive(JSZip,mismatch,id=>blobs.get(id));
const mismatchPath=out+'/wrong-size-fixture.zip';await fs.writeFile(mismatchPath,Buffer.from(await mismatchArchive.blob.arrayBuffer()));
const conflict=structuredClone(project),conflictBlobs=new Map(blobs);
const conflictId='fixture-page-one-record',changed=JSON.parse(await blobs.get(conflictId).text());changed.engine.version='changed fixture';
const changedBytes=Buffer.from(JSON.stringify(changed));conflict.sources[0].attachments.find(a=>a.id===conflictId).sha256=hash(changedBytes);conflictBlobs.set(conflictId,new Blob([changedBytes],{type:'application/json'}));
const conflictArchive=await exportArchive(JSZip,conflict,id=>conflictBlobs.get(id));const conflictPath=out+'/conflicting-id-fixture.zip';await fs.writeFile(conflictPath,Buffer.from(await conflictArchive.blob.arrayBuffer()));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:process.env.WEEK06_HEADLESS==='1'});
const report={date:new Date().toISOString(),browser:browser.version(),checks:[],errors:[],network:'Only same-origin GET; private server endpoints blocked; no model/API calls',screenshots:'Public fixture only'};
async function context(){const ctx=await browser.newContext({viewport:{width:1512,height:860}});await ctx.route('**/*',route=>{
 const u=new URL(route.request().url());if(u.origin===new URL(base).origin&&!u.pathname.startsWith('/local-materials/')&&route.request().method()==='GET')return route.continue();
 return route.fulfill({status:503,body:'Disabled in material-package verification'});
});ctx.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));return ctx;}
async function settle(p){await p.evaluate(async()=>{globalThis.packStorage=await import('./assets/runtime/storage.js');});await p.waitForFunction(()=>{const l=document.querySelector('deck-slide.current week06-lab');return l?.materialReady&&!l.busy&&!l.activating&&!globalThis.packStorage.pendingSaves;});}
async function current(p){return p.evaluate(async()=>{const s=await import('./assets/runtime/storage.js');const m=await import('./assets/runtime/material-import.js');await m.materialsReady;return {material:s.state.material?.image.source.material_id,records:s.state.records.length,imported:m.materialSources().filter(x=>x.status==='imported').length,through:s.state.through};});}
async function openImporter(p){const pop=p.waitForEvent('popup');await p.getByRole('button',{name:'材料导入',exact:true}).click();const i=await pop;await i.getByRole('button',{name:'送回已经连接的课件',exact:true}).waitFor();return i;}
async function ingest(i,file){await i.locator('input[type=file]').setInputFiles(file);await i.waitForFunction(()=>!document.querySelector('input[type=file]').disabled,{},{timeout:120000});}
async function transfer(i){await i.getByRole('button',{name:'送回已经连接的课件',exact:true}).click();await i.waitForFunction(()=>/已接收|课件未接收/.test(document.querySelector('#status').textContent),{},{timeout:120000});return i.locator('#status').innerText();}
async function choose(p,id){const section=p.locator('deck-slide.current');await section.locator('details.v5-source').evaluate(e=>e.open=true);
 const field=section.locator('select[data-k=material]');await field.evaluate(e=>{for(let a=e.parentElement;a;a=a.parentElement)if(a.tagName==='DETAILS')a.open=true;});
 await field.selectOption(id);assert.equal(await section.locator('week06-lab').evaluate(l=>l.v.material),id,'dropdown state');await section.locator('[data-act=choose]').click();await p.waitForFunction(id=>globalThis.packStorage.state.material?.image.source.material_id===id,id,{timeout:10000});await settle(p);assert.equal((await current(p)).material,id,'selected material: '+await section.locator('.lab-status').innerText());}
async function check(name,fn){try{report.checks.push({name,result:'passed',detail:await fn()});}catch(e){report.checks.push({name,result:'failed',detail:e.message});}console.log(name+': '+report.checks.at(-1).result);}
try{
 const ctx=await context(),p=await ctx.newPage();await p.goto(base+'#D24');await settle(p);
 const initial=await current(p),i=await openImporter(p);
 await check('Shared importer receives ZIP and exposes all pages with saved OCR',async()=>{
  await ingest(i,validPath);assert.match(await transfer(i),/已接收 2 页、2 份/);await settle(p);const v=await current(p);
  assert.equal(v.material,'fixture-page-one');assert.equal(v.imported,2);assert.deepEqual(v.through,initial.through);
  assert.ok(await p.locator('deck-slide.current').innerText().then(x=>x.includes('公开本导入测试')));return {pages:v.imported};
 });
 await check('Repeated ZIP transfer leaves records and through-work unchanged',async()=>{
  const before=await current(p);await transfer(i);assert.deepEqual(await current(p),before);return 'No duplicate records';
 });
 await check('Chosen imported page survives refresh and private server absence',async()=>{
  await choose(p,'fixture-page-two');await p.reload();await settle(p);const v=await current(p);assert.equal(v.material,'fixture-page-two');assert.equal(await p.locator('deck-slide.current select[data-k=material]').inputValue(),'fixture-page-two');
  await p.locator('deck-slide.current select[data-k=material]').evaluate(e=>{for(let a=e.parentElement;a;a=a.parentElement)if(a.tagName==='DETAILS')a.open=true;});await p.screenshot({path:out+'/public-imported-pages.png'});return {material:v.material};
 });
 await i.close();const importer=await openImporter(p);
 await check('Corrupt ZIP preserves the course material and records',async()=>{
  const before=await current(p);await ingest(importer,corruptPath);assert.match(await importer.locator('#status').innerText(),/校验失败/);assert.deepEqual(await current(p),before);return 'SHA-256 rejection';
 });
 await check('Valid archive with wrong image dimensions is rejected by receiver, visibly',async()=>{
  const before=await current(p);await ingest(importer,mismatchPath);assert.match(await transfer(importer),/课件未接收.*尺寸/);assert.deepEqual(await current(p),before);
  await importer.screenshot({path:out+'/public-invalid-package.png'});return 'No partial writes';
 });
 await check('A reused attachment id cannot overwrite previously imported bytes',async()=>{
  const before=await current(p);await ingest(importer,conflictPath);assert.match(await transfer(importer),/课件未接收.*附件编号.*冲突/);assert.deepEqual(await current(p),before);return 'Previous originals retained';
 });
 await check('Interrupted storage transaction preserves all previous classroom state',async()=>{
  await ingest(importer,validPath);const before=await current(p);
  await p.evaluate(()=>{const original=IDBObjectStore.prototype.put;globalThis.restoreMaterialTest=()=>IDBObjectStore.prototype.put=original;
   IDBObjectStore.prototype.put=function(v,k){if(k==='material-catalog')throw new DOMException('Fixture: quota exhausted','QuotaExceededError');return original.call(this,v,k);};});
  try{assert.match(await transfer(importer),/课件未接收.*quota exhausted/);}finally{await p.evaluate(()=>globalThis.restoreMaterialTest());}
  assert.deepEqual(await current(p),before);await p.reload();await settle(p);assert.deepEqual(await current(p),before);return 'Transaction abort preserved classroom and catalog';
 });
 await check('Clear classroom keeps imported page resources available',async()=>{
  await p.evaluate(async()=>{await (await import('./assets/runtime/storage.js')).clearClassroom();});await p.reload();await settle(p);
  assert.equal((await current(p)).imported,2);await choose(p,'fixture-page-one');assert.equal((await current(p)).material,'fixture-page-one');return 'Imported pages remain selectable';
 });
 await check('All 26 original page links open after importing and refreshing',async()=>{
  for(let n=0;n<26;n++){const id='D'+String(n).padStart(2,'0');await p.evaluate(id=>document.querySelector('deck-container').go(id),id);
   if(![0,23,25].includes(n))await settle(p);else await p.waitForTimeout(100);
   assert.ok(!(await p.locator('deck-slide.current').innerText()).includes('页面状态错误'),id);
  }return '25 pages and D13 → D12 alias';
 });
 await ctx.close();
 if(process.env.WEEK06_LOCAL_MATERIALS){
  const privatePath=path.join(process.env.WEEK06_LOCAL_MATERIALS,'第六周/demo/本机材料导入包/第六周本机材料_20261022.zip');
  await check('Actual private package: 16 selectable images, 3 saved records; refresh without source server',async()=>{
   const ctx=await context(),p=await ctx.newPage();try{
    await p.goto(base+'#D24');await settle(p);const i=await openImporter(p);await ingest(i,privatePath);assert.match(await transfer(i),/已接收 16 页、3 份/);await settle(p);
    const ids=await p.evaluate(async()=>{const m=await import('./assets/runtime/material-import.js');return m.materialSources().filter(s=>s.status==='imported').map(s=>s.id);});
    assert.equal(ids.length,16);
    for(const id of ids){await choose(p,id);assert.equal((await current(p)).material,id);}
    await p.reload();await settle(p);assert.equal((await current(p)).material,ids.at(-1));
    const info=await p.evaluate(async()=>{const s=await import('./assets/runtime/storage.js');return s.state.records.filter(r=>r.material_pack).map(r=>({id:r.image.source.material_id,regions:r.regions.length,date:r.engine.date,version:r.engine.version,mode:r.engine.run_mode}));});
    assert.equal(info.length,3);assert.deepEqual(info.map(x=>x.regions),[16,120,73]);
    assert.ok(info.every(r=>r.mode==='保存结果回放'&&r.version==='待登记（V-08）'));
    await p.goto(base+'?local=1#D03');await settle(p);assert.equal((await current(p)).material,'shide');
    await choose(p,'ogai');await p.reload();await settle(p);assert.equal((await current(p)).material,'ogai');assert.equal(await p.locator('deck-slide.current select[data-k=material]').inputValue(),'ogai');
    // Never take a screenshot or log transcription, images, paths or private hashes here.
    return {pages:16,savedRecords:3,refreshed:true,localModeDefaults:true,privateScreenshots:0};
   }finally{await ctx.close();}
  });
 }else report.privatePackage='skipped: WEEK06_LOCAL_MATERIALS not set';
 assert.deepEqual(report.errors,[]);
}finally{await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
assert.ok(report.checks.every(c=>c.result==='passed'),'Material package check failed: see report.json');
