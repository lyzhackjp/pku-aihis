import type {Library} from './library';
export interface ReadingInput {itemId:string;documentId:string;pageId:string;revisionId:string;uri:string;title:string;pdfPage:number;fileHash:string;text:string;}
export interface Candidate {id:string;text:string;model:string;state:string;created:string;request:any[];}
export interface HumanVersion {id:string;parentId?:string;candidateIds:string[];text:string;decision:string;reason:string;created:string;}
export interface ReadingRun {id:string;itemId:string;task:string;created:string;input:ReadingInput[];independent:string;candidates:Candidate[];versions:HumanVersion[];reviews:{id:string;created:string;decision:string;reason:string;basis:{pageId:string;revisionId:string}[]}[];}
const prefix='course-reading-run/';
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
export function createReadingRun(input:ReadingInput[],task:string,independent:string,id=crypto.randomUUID()):ReadingRun {
  if(!input.length||input.some(p=>!p.text.trim()))throw Error('本轮输入必须含已提交正文');
  if(!independent.trim())throw Error('请先阅读原页，填写自己的理解和疑问');
  if(input.reduce((n,p)=>n+p.text.length,0)>60000)throw Error('本轮正文超过6万字符，请缩小页段；不会静默截断');
  return {id,itemId:input[0].itemId,task,created:new Date().toISOString(),input:copy(input),independent:independent.trim(),candidates:[],versions:[],reviews:[]};
}
export function appendCandidate(run:ReadingRun,candidate:Candidate):ReadingRun {
  if(run.candidates.some(c=>c.id===candidate.id))throw Error('原始候选已保存，不能覆盖');
  return {...copy(run),candidates:[...copy(run.candidates),copy(candidate)]};
}
export function appendHumanVersion(run:ReadingRun,text:string,decision:string,reason:string,candidateIds:string[]):ReadingRun {
  if(!text.trim()||!reason.trim())throw Error('请填写人工修订和判断理由');
  if(!['采用','收窄','待查'].includes(decision))throw Error('判断必须为采用、收窄或待查');
  if(candidateIds.some(id=>!run.candidates.some(c=>c.id===id)))throw Error('候选来源不属于本轮');
  return {...copy(run),versions:[...copy(run.versions),{id:crypto.randomUUID(),parentId:run.versions.at(-1)?.id,candidateIds:[...candidateIds],text:text.trim(),decision,reason:reason.trim(),created:new Date().toISOString()}]};
}
export function readRuns(lib:Library):ReadingRun[] {
  const runs:ReadingRun[]=[];
  for(const item of lib.rows('select custom_fields_json from items')){
    const records=JSON.parse(item.custom_fields_json||'{}')['x-pku-research']||{};
    for(const [key,record] of Object.entries(records) as [string,any][]){if(key.startsWith(prefix)&&record.value?.id)runs.push(copy(record.value));}
  }
  return runs.sort((a,b)=>b.created.localeCompare(a.created));
}
export function mergeReadingRun(previous:ReadingRun,next:ReadingRun):ReadingRun {
  if(!previous)return copy(next);
  if(JSON.stringify([previous.id,previous.itemId,previous.task,previous.input,previous.independent])!==JSON.stringify([next.id,next.itemId,next.task,next.input,next.independent]))throw Error('本轮已冻结的输入和独立阅读不能覆盖，请开始新一轮');
  const append=(old:any[],incoming:any[])=>{const result=copy(old);for(const entry of incoming){const found=result.find(x=>x.id===entry.id);if(found&&JSON.stringify(found)!==JSON.stringify(entry))throw Error('原始候选或已保存版本不能覆盖');if(!found)result.push(copy(entry));}return result;};
  return {...copy(previous),candidates:append(previous.candidates,next.candidates),versions:append(previous.versions,next.versions),reviews:append(previous.reviews,next.reviews)};
}
export async function saveRun(lib:Library,run:ReadingRun,activate=true){
  await lib.mutate(()=>{const item=lib.rows('select custom_fields_json from items where item_id=?',[run.itemId])[0];if(!item)throw Error('本轮材料身份已不存在，无法保存');const fields=JSON.parse(item.custom_fields_json||'{}'),records=fields['x-pku-research']||{},key=prefix+run.id+'/'+run.itemId;records[key]={version:1,updated_at:new Date().toISOString(),value:mergeReadingRun(records[key]?.value,run)};fields['x-pku-research']=records;lib.run('update items set custom_fields_json=?,updated_at=? where item_id=?',[JSON.stringify(fields),new Date().toISOString(),run.itemId]);});
  if(activate)setActiveRun(lib,run.id);else window.dispatchEvent(new CustomEvent('course-reading-change'));
}
export function activeRun(lib:Library):ReadingRun {return readRuns(lib).find(r=>r.id===localStorage.getItem('course-reading-active/'+lib.libraryId));}
export function setActiveRun(lib:Library,id:string){localStorage.setItem('course-reading-active/'+lib.libraryId,id);window.dispatchEvent(new CustomEvent('course-reading-change'));}
export function currentBasis(lib:Library,run:ReadingRun){return run.input.map(p=>({pageId:p.pageId,revisionId:lib.pageTree(p.pageId).revision?.tree_revision_id||''}));}
export function requiresReview(lib:Library,run:ReadingRun):boolean {
  const reviewed=run.reviews.at(-1)?.basis||run.input.map(p=>({pageId:p.pageId,revisionId:p.revisionId}));
  return currentBasis(lib,run).some(p=>reviewed.find(x=>x.pageId===p.pageId)?.revisionId!==p.revisionId);
}
export function snapshotPages(lib:Library,documentId:string,first:number,last:number):ReadingInput[]{
  const doc=lib.rows('select d.*,i.title,a.full_blake3 from document_instances d join items i on i.item_id=d.item_id join file_assets a on a.file_asset_id=d.file_asset_id where d.document_instance_id=?',[documentId])[0];
  const pages=lib.pages(documentId);if(!doc||!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<first||last>pages.length)throw Error('请选择有效文档与 PDF 页段');
  return pages.slice(first-1,last).map(p=>{
    const tree=lib.pageTree(p.page_id),revision=tree.revision?.tree_revision_id;
    if(!revision)throw Error('第'+(p.page_index+1)+'页没有已提交正文，请先完成识读与提交');
    const text=lib.ordered(tree.boxes).filter(b=>!b.suppressed).map(b=>lib.boxText(b)).filter(Boolean).join('\n\n');
    if(!text.trim())throw Error('第'+(p.page_index+1)+'页正文为空，请缩小范围或先识读');
    return {itemId:doc.item_id,documentId,pageId:p.page_id,revisionId:revision,uri:'patchouli://texts/'+documentId+'/page-'+(p.page_index+1)+'.md?rev='+revision,title:doc.title,pdfPage:p.page_index+1,fileHash:doc.full_blake3,text};
  });
}
