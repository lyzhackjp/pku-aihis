import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {emptyProject,validateProject} from '../../../packages/course-project/project.mjs';
import {fromNDLXML} from '../../../modules/history-demo/ocr/record.mjs';
import {MATERIAL_PACK_VERSION,prepareMaterialImport,mergeMaterialCatalog,appendPackRecords} from '../../../modules/history-demo/ocr/material-pack.mjs';

const digest=bytes=>createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6q4sAAAAASUVORK5CYII=','base64');
const readImage=async(blob,source,name)=>({image:{name,sha256:digest(await blob.arrayBuffer()),width:1,height:1,
 source:{material_id:source.id,identity:source.identity,page_systems:source.page_systems},local_only:true},dataUrl:'data:image/png;base64,'+png.toString('base64')});
async function fixture(){
 const project=emptyProject('教学构造：导入夹具');
 project.sources=[{id:'test-source',title:'公开测试材料',attachments:[]}];
 const files=[];
 const add=(id,name,type,bytes)=>{project.sources[0].attachments.push({id,name,type,sha256:digest(bytes)});files.push({id,blob:new Blob([bytes],{type})});};
 add('image','test.png','image/png',png);
 const image=(await readImage(files[0].blob,{id:'fixture-page',identity:'教学构造',page_systems:{测试页序:'1'}},'test.png')).image;
 const record=fromNDLXML('<OCRDATASET><PAGE WIDTH="1" HEIGHT="1"><LINE ID="r1" X="0" Y="0" WIDTH="1" HEIGHT="1" TYPE="本文" STRING="测试" CONF="0.8"/></PAGE></OCRDATASET>',
 {image,engine:{name:'ndlocr-lite',version:'夹具，未运行模型',date:'2026-10-13T00:00:00+08:00',run_mode:'教学构造'}});
 add('record','test.json','application/json',Buffer.from(JSON.stringify(record)));
 project.week06_materials={version:MATERIAL_PACK_VERSION,pages:[{id:'fixture-page',sourceId:'test-source',imageAttachmentId:'image',recordAttachmentIds:['record'],width:1,height:1,page_systems:{测试页序:'1'}}]};
 return {project,files};
}
async function prepare(f){return prepareMaterialImport(validateProject(f.project),f.files,{digest,readImage});}

test('package preserves identity, original date and score meanings; replay is explicit',async()=>{
 const f=await fixture(),before=structuredClone(f.project),p=await prepare(f),entry=p.entries[0];
 assert.deepEqual(f.project,before);
 assert.equal(entry.id,'fixture-page');assert.equal(entry.source.page_systems.测试页序,'1');
 assert.equal(entry.records[0].engine.run_mode,'保存结果回放');assert.equal(entry.records[0].original_run_mode,'教学构造');
 assert.equal(entry.records[0].engine.date,'2026-10-13T00:00:00+08:00');
 assert.equal(entry.records[0].regions[0].det_score,.8);assert.equal(entry.records[0].regions[0].rec_score,null);
 assert.equal(entry.image.local_only,true);
});
test('bad checksum, missing attachment, mismatched dimensions and duplicate page ids reject before persistence',async()=>{
 for(const [change,error] of [
  [f=>f.files[0].blob=new Blob(['wrong']),/校验失败/],
  [f=>f.files.pop(),/缺少附件/],
  [f=>f.project.week06_materials.pages[0].width=2,/尺寸/],
  [f=>f.project.week06_materials.pages.push(f.project.week06_materials.pages[0]),/重复/],
  [f=>f.project.week06_materials.version='future',/版本/],
 ]){const f=await fixture();change(f);await assert.rejects(()=>prepare(f),error);}
});
test('record attached to a different page is rejected even when record JSON is otherwise valid',async()=>{
 const f=await fixture(),r=JSON.parse(await f.files[1].blob.text());r.image.sha256='e'.repeat(64);
 const bytes=Buffer.from(JSON.stringify(r));f.files[1].blob=new Blob([bytes],{type:'application/json'});f.project.sources[0].attachments[1].sha256=digest(bytes);
 await assert.rejects(()=>prepare(f),/页影不一致/);
});
test('repeated import deduplicates saved OCR and a changed page id cannot replace the old image',async()=>{
 const {entries}=await prepare(await fixture());
 assert.deepEqual(mergeMaterialCatalog(entries,entries),entries);
 assert.equal(appendPackRecords(entries[0].records,entries[0].records).length,1);
 const different=structuredClone(entries);different[0].image.sha256='f'.repeat(64);
 assert.throws(()=>mergeMaterialCatalog(entries,different),/旧材料保留/);
 assert.notEqual(entries[0].image.sha256,'f'.repeat(64));
});
test('ordinary shared projects still expose every image with source metadata',async()=>{
 const f=await fixture();delete f.project.week06_materials;
 const second={id:'second-image',name:'second.png',type:'image/png',sha256:digest(png)};
 f.project.sources[0].attachments.push(second);f.files.push({id:second.id,blob:new Blob([png],{type:'image/png'})});
 const result=await prepare(f);assert.equal(result.entries.length,2);assert.notEqual(result.entries[0].id,result.entries[1].id);
 assert.ok(result.entries.every(e=>e.source.identity.startsWith('公开测试材料')));
 assert.equal(result.entries[0].records.length,0);
});
test('a credential-bearing project never reaches the image receiver',async()=>{
 const f=await fixture();f.project.notes=[{id:'secret',apiKey:'fixture-do-not-persist'}];
 await assert.rejects(()=>prepare(f),/凭据/);
});
