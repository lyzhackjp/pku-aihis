import {unzipSync,strFromU8} from 'fflate';

export type ClassroomArchive = {kind:'material'|'native'|'complete';native?:Uint8Array;notes?:any;reading?:any};
const LIMIT=700_000_000, EXPANDED_LIMIT=1_400_000_000, JSON_LIMIT=16_000_000;
// Inspect every ZIP entry before inflating selected content. Duplicate paths are ambiguous.
export function readArchiveEntries(data:Uint8Array,wanted:Set<string>){
  if(data.length>LIMIT)throw Error('材料包超过700MB，请拆包导入');
  let total=0;const names=new Set<string>();
  const entries=unzipSync(data,{filter:f=>{
    if(names.has(f.name))throw Error('ZIP含重复成员：'+f.name);
    names.add(f.name);total+=f.originalSize;
    if(total>EXPANDED_LIMIT||f.originalSize>LIMIT)throw Error('ZIP解压体积过大，请拆包');
    if(f.name.startsWith('/')||f.name.split('/').includes('..'))throw Error('ZIP成员路径不受支持');
    if(wanted.has(f.name)&&f.name.endsWith('.json')&&f.originalSize>JSON_LIMIT)throw Error('ZIP中的JSON过大');
    return wanted.has(f.name);
  }});
  return {entries,names};
}
function json(bytes:Uint8Array,label:string){try{return JSON.parse(strFromU8(bytes));}catch{throw Error(label+'不是有效JSON');}}
function nativeHeader(data:Uint8Array){
  const {entries,names}=readArchiveEntries(data,new Set(['manifest.json']));
  const m=entries['manifest.json']&&json(entries['manifest.json'],'备份清单');
  if(m?.format!=='patchouli-browser-backup-v1'||!names.has('library.sqlite')||!Array.isArray(m.assets)||typeof m.database_blake3!=='string')throw Error('不是支持的浏览器原生备份');
  if(names.has('patchouli.zip')||names.has('reading-records.json'))throw Error('ZIP包类型标志冲突');
  return m;
}
export function inspectClassroomArchive(data:Uint8Array):ClassroomArchive{
  const {entries,names}=readArchiveEntries(data,new Set(['manifest.json','reading-records.json','browser-drafts.json','patchouli.zip']));
  const m=entries['manifest.json']&&json(entries['manifest.json'],'材料清单');
  const complete=names.has('patchouli.zip')||names.has('reading-records.json')||names.has('browser-drafts.json');
  if(m&&complete)throw Error('ZIP同时包含材料清单和完整备份标志，无法确定追加或恢复');
  if(complete){
    if(!entries['patchouli.zip']||!entries['reading-records.json'])throw Error('课程完整备份缺少数据库包或阅读记录');
    nativeHeader(entries['patchouli.zip']);
    const reading=json(entries['reading-records.json'],'阅读记录');
    if(reading.schema!=='pku-reading-records/v1'||typeof reading.libraryId!=='string'||!Array.isArray(reading.runs))throw Error('阅读记录格式错误');
    const notes=entries['browser-drafts.json']?json(entries['browser-drafts.json'],'独立草稿'):{schema:'pku-browser-research-notes/v1',values:{}};
    if(notes.schema!=='pku-browser-research-notes/v1'||!notes.values||Array.isArray(notes.values)||typeof notes.values!=='object'||Object.values(notes.values).some(v=>typeof v!=='string'))throw Error('独立草稿备份格式错误');
    return {kind:'complete',native:entries['patchouli.zip'],notes,reading};
  }
  if(m?.schema==='pku-week04-material-pack/v1')return {kind:'material'};
  if(m?.format==='patchouli-browser-backup-v1'){nativeHeader(data);return {kind:'native',native:data,notes:{schema:'pku-browser-research-notes/v1',values:{}}};}
  throw Error('无法识别ZIP。请选择带manifest.json的材料包，或包含patchouli.zip的课程完整备份。');
}
export function sameReadingRecords(a:any[],b:any[]){
  const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const order=(v:any[])=>[...v].sort((x,y)=>String(x.id).localeCompare(String(y.id)));
  return JSON.stringify(canonical(order(a)))===JSON.stringify(canonical(order(b)));
}
