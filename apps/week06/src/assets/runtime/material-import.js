// 候选，未经教师确认。One receiver for the shared importer and Week06 page packages.
import {validateProject} from '../modules/project.mjs';
import {prepareMaterialImport,mergeMaterialCatalog,appendPackRecords} from '../modules/ocr/material-pack.mjs';
import {serializable} from '../modules/ocr/serializable.mjs';
import {state,ready,get,putMany} from './storage.js';

let catalog=[];
export const materialsReady=ready.then(async()=>{catalog=await get('material-catalog',[]);});
export function materialSources(){const sources=[...window.DECK_DATA.sources];for(const entry of catalog){const i=sources.findIndex(s=>s.id===entry.id);if(i<0)sources.push(entry.source);else sources[i]=entry.source;}return sources;}
export async function importedMaterial(id,readImage){
 await materialsReady;const entry=catalog.find(e=>e.id===id);if(!entry)return null;
 const blob=await get('attachment/'+entry.imageAttachmentId);if(!blob)throw Error('已导入的页影缺失，请重新导入材料包');
 const material=await readImage(blob,entry.source,entry.image.name);
 if(material.image.sha256!==entry.image.sha256)throw Error('已导入页影校验失败，请重新导入材料包');
 return {material,records:structuredClone(entry.records)};
}
let receiving=false;
export async function receiveProject(value,files,{digest,readImage}){
 if(receiving)throw Error('材料包正在接收，请稍候');receiving=true;
 try{
  await materialsReady;
  const project=validateProject(value);
  const prepared=await prepareMaterialImport(project,files,{digest,readImage});
  for(const file of prepared.files){const old=await get('attachment/'+file.id);if(old&&await digest(await old.arrayBuffer())!==await digest(await file.blob.arrayBuffer()))throw Error('附件编号与已导入材料冲突，旧材料保留：'+file.id);}
  for(const e of prepared.entries)if(window.DECK_DATA.sources.some(s=>s.id===e.id&&s.public!==false))throw Error('导入材料不能占用公开材料编号：'+e.id);
  const nextCatalog=mergeMaterialCatalog(catalog,prepared.entries);
  // A repeated import leaves the selected page and all classroom decisions intact.
  const same=prepared.entries.find(e=>e.id===state.material?.image.source.material_id&&e.image.sha256===state.material.image.sha256);
  const material=same?state.material:prepared.firstMaterial||state.material;
  const records=appendPackRecords(state.records,prepared.entries.flatMap(e=>e.records));
  const nextState={...state,material,records};
  await putMany([['imported-project',project],...prepared.files.map(f=>['attachment/'+f.id,f.blob]),
   ['material-catalog',nextCatalog],['classroom',serializable(nextState)]]);
  catalog=nextCatalog;Object.assign(state,nextState);
  window.dispatchEvent(new CustomEvent('week06-material-imported',{detail:material?.image.source.material_id}));
  window.dispatchEvent(new Event('week06-state'));
  return {pages:prepared.entries.length,records:prepared.entries.reduce((n,e)=>n+e.records.length,0),
   message:prepared.entries.length?`已接收 ${prepared.entries.length} 页、${prepared.entries.reduce((n,e)=>n+e.records.length,0)} 份保存识读。在“材料与记录”中切换；刷新后仍可用。`:'项目与附件已接收；PDF 请先在导入页选取一页，导出为 PNG/JPEG 后在课件打开。'};
 }finally{receiving=false;}
}
