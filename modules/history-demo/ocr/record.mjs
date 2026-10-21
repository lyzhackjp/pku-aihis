// 候选，未经教师确认。Pure adapters: immutable source + explicit provenance.
import {serializable} from './serializable.mjs';
import schema from './ocr-record.schema.json' with { type: 'json' };
import { normalizeClass } from './class-map.mjs';
import { parseXML, descendants } from './xml.mjs';
export const RECORD_VERSION = 'week06-ocr-1';
const clone = x => structuredClone(x);
function schemaErrors(v,s,path='$') {
  const errors=[];
  const type=t => t==='null'?v===null:t==='array'?Array.isArray(v):t==='object'?v!==null&&typeof v==='object'&&!Array.isArray(v):t==='integer'?Number.isInteger(v):t==='number'?typeof v==='number'&&Number.isFinite(v):typeof v===t;
  if(s.type && ![].concat(s.type).some(type))return [path+' 类型错误'];
  if ('const' in s && v!==s.const) errors.push(path+' 版本错误');
  if(s.enum&&!s.enum.includes(v))errors.push(path+' 取值未登记');
  if(typeof v==='string'&&s.pattern&&!new RegExp(s.pattern).test(v))errors.push(path+' 格式错误');
  if(s.format==='date-time'&&(!/^\d{4}-\d\d-\d\dT/.test(v)||!Number.isFinite(Date.parse(v))))errors.push(path+' 日期无效');
  if(s.type==='object'){
    for(const key of s.required||[])if(!(key in v))errors.push(path+'.'+key+' 缺失');
    for(const [key,child] of Object.entries(s.properties||{}))if(key in v)errors.push(...schemaErrors(v[key],child,path+'.'+key));
  }
  if(Array.isArray(v)){
    if(v.length<(s.minItems||0)||v.length>(s.maxItems??Infinity))errors.push(path+' 长度错误');
    if(s.items)v.forEach((item,i)=>errors.push(...schemaErrors(item,s.items,path+'['+i+']')));
  }
  return errors;
}
export function validateRecord(value) {
  const errors=schemaErrors(value,schema);
  if(!errors.length){
    if(value.image.width<=0||value.image.height<=0)errors.push('图像宽高必须大于 0');
    const ids=new Set();
    for(const r of value.regions){
      if(ids.has(r.id))errors.push('重复区域编号 '+r.id);ids.add(r.id);
      if(r.bbox&&(r.bbox[2]<0||r.bbox[3]<0))errors.push('框宽高不能为负');
      if(r.class_norm&&!['正文','标题','页码','书口或柱','注音','注释','图','其他'].includes(r.class_norm))errors.push('统一类别未登记');
    }
  }
  if(errors.length)throw Error(errors.join('；'));
  return value;
}
const numberOrNull = x => x===undefined||x===null||x===''?null:Number(x);
export function makeRecord(raw,regions,meta) {
  if(!meta?.image||!meta?.engine)throw Error('须提供图像身份与引擎元数据');
  return validateRecord(serializable({record_version:RECORD_VERSION,image:clone(meta.image),engine:clone(meta.engine),regions:regions.map((r,i)=>({...r,id:r.id||'r'+i,det_score:r.det_score??null,det_score_source:r.det_score_source??null,rec_score:r.rec_score??null,rec_score_source:r.rec_score_source??null,chars:r.chars||[],class_norm:r.class_norm??normalizeClass(r.class)})),raw:clone(raw),...(meta.errors?{errors:clone(meta.errors)}:{})}));
}
export function fromNDLXML(xml,meta) {
  const tree=parseXML(xml);if(tree.name!=='OCRDATASET')throw Error('需要 NDL OCRDATASET');
  const regions=[];
  function visit(n,parent){
    let id=parent;
    if(['LINE','BLOCK','TEXTBLOCK'].includes(n.name)){
      const a=n.attrs;id=a.ID||'r'+regions.length;
      regions.push({id,parent:parent||null,kind:n.name,bbox:['X','Y','WIDTH','HEIGHT'].map(k=>Number(a[k]||0)),class:a.TYPE??n.name,order:numberOrNull(a.ORDER),text:Object.hasOwn(a,'STRING')?a.STRING:null,det_score:numberOrNull(a.CONF),det_score_source:'引擎原值：NDL XML CONF；版面检测器框分数',rec_score:null,chars:[],raw_fragment:n.raw});
    }
    n.children.forEach(child=>visit(child,id));
  }
  visit(tree,null);return makeRecord(xml,regions,meta);
}
export function fromNDLLite(output,meta,classNames=[]) {
  const lines=output.textBlocks||output.blocks||output.lines||[];
  const regions=lines.map((r,i)=>({id:r.id||'line-'+i,bbox:[r.x,r.y,r.width,r.height],class:r.class??classNames[r.classId]??String(r.classId??'本文'),class_id:r.classId,order:r.readingOrder??i,text:r.text??null,det_score:r.confidence??null,det_score_source:'引擎原值：DEIM框分数',rec_score:r.recognitionScore??null,rec_score_source:r.recognitionScoreSource??null,chars:r.chars||[],recognition_trace:r.recognitionTrace??null,raw_fragment:clone(r)}));
  for(const [i,r] of (output.detection?.regions||output.detection?.blocks||[]).entries()){
    if(lines.some(l=>l.detectionId===r.id))continue;
    regions.push({id:'det-'+i,kind:r.classId===0?'TEXTBLOCK':'REGION',bbox:[r.x,r.y,r.width,r.height],class:classNames[r.classId]||'text_block',class_id:r.classId,order:null,text:null,det_score:r.confidence??null,det_score_source:'引擎原值：DEIM框分数',rec_score:null,rec_score_source:null,chars:[],raw_fragment:clone(r)});
  }
  return makeRecord(output,regions,meta);
}
export function fromPPOCR(output,meta) {
  const data=output.res||output,boxes=data.rec_polys||data.dt_polys||data.boxes||[];
  return makeRecord(output,boxes.map((box,i)=>({id:'line-'+i,...(box.length===4&&typeof box[0]==='number'?{bbox:box}:{polygon:box}),class:'（检测不分类）',class_norm:'',order:i,text:data.rec_texts?.[i]??data.texts?.[i]??null,det_score:data.detection_scores?.[i]??null,det_score_source:'引擎原值：DB检测框内概率均值',rec_score:data.rec_scores?.[i]??data.scores?.[i]??null,rec_score_source:'引擎原值：CTC保留字符最大概率的平均',chars:data.rec_chars?.[i]||[],recognition_trace:data.rec_traces?.[i]??null,raw_fragment:{box,text:data.rec_texts?.[i],rec_score:data.rec_scores?.[i],det_score:data.detection_scores?.[i]}})),meta);
}
export function fromFlorence(output,meta) {
  const data=output['<OCR_WITH_REGION>']||output;
  if(typeof output['<OCR>']==='string')return makeRecord(output,[{id:'page',class:'Text',text:output['<OCR>'],order:0,det_score:null,rec_score:null,chars:[]}],meta);
  if(!Array.isArray(data.quad_boxes)||!Array.isArray(data.labels)||data.quad_boxes.length!==data.labels.length)throw Error('Florence 区域输出结构错误');
  return makeRecord(output,data.quad_boxes.map((q,i)=>({id:'line-'+i,polygon:q.length===8?Array.from({length:4},(_,k)=>q.slice(k*2,k*2+2)):q,class:'Text',text:data.labels[i],order:i,det_score:null,rec_score:null,chars:[]})),meta);
}
export function fromDots(output,meta) {
  if(!output.ok)return makeRecord(output,[],{...meta,errors:[output.error||'parse_error',output.detail||'解析失败；原文已保留']});
  if(!Array.isArray(output.regions))throw Error('dots.ocr 缺少 regions');
  return makeRecord(output,output.regions.map((r,i)=>({...r,id:r.id||'region-'+i,class:r.category,order:r.order??i,text:r.text??null,det_score:null,rec_score:null,chars:[]})),meta);
}
export function fromMLLM(raw,meta) {
  try {
    const obj=typeof raw==='string'?JSON.parse(raw):raw;
    if(!obj||!Array.isArray(obj.regions)||!obj.regions.length)throw Error('需要非空 regions 数组');
    for(const r of obj.regions)if(typeof r.text!=='string'||!Array.isArray(r.bbox)||r.bbox.length!==4||r.bbox.some(x=>!Number.isFinite(x)))throw Error('每个区域需要 text 与像素 bbox [x,y,w,h]');
    return makeRecord(raw,obj.regions.map((r,i)=>({...r,id:r.id||'line-'+i,class:r.category||r.class||'Text',order:r.order??i,det_score:null,rec_score:null,chars:[]})),meta);
  }catch(error){return makeRecord(raw,[],{...meta,errors:['解析失败：'+error.message]});}
}
export function fromPageXML(xml,meta) {
  const tree=parseXML(xml);if(tree.name!=='PcGts')throw Error('需要 PAGE-XML PcGts');
  const orders=new Map(descendants(tree,'RegionRefIndexed').map(n=>[n.attrs.regionRef,Number(n.attrs.index)]));
  const points=s=>(s||'').trim().split(/\s+/).filter(Boolean).map(p=>p.split(',').map(Number));
  const regions=[];
  for(const region of descendants(tree,'TextRegion')){
    for(const line of descendants(region,'TextLine')){
      const eq=line.children.find(n=>n.name==='TextEquiv'),unicode=eq&&descendants(eq,'Unicode')[0];
      const custom=line.attrs.custom?.match(/readingOrder\s*\{\s*index:(\d+)/);
      regions.push({id:line.attrs.id||'line-'+regions.length,parent:region.attrs.id,class:region.attrs.type||'Text',polygon:points(line.children.find(n=>n.name==='Coords')?.attrs.points),baseline:points(line.children.find(n=>n.name==='Baseline')?.attrs.points),order:custom?Number(custom[1]):regions.length,region_order:orders.get(region.attrs.id)??null,text:unicode?.text??null,det_score:null,rec_score:numberOrNull(eq?.attrs.conf),rec_score_source:'引擎原值：PAGE TextEquiv.conf；计算定义须回查生成工具',chars:[],raw_fragment:line.raw});
    }
  }
  return makeRecord(xml,regions,meta);
}
export function deriveRecord(record,patch,reason) {
  validateRecord(record);if(!reason?.trim())throw Error('派生记录须说明处理依据');
  if(['raw','engine','image','record_version'].some(k=>Object.hasOwn(patch,k)))throw Error('派生记录不能覆盖原始输出、引擎或图像身份');
  const next={...clone(record),...clone(patch),parent:{image_sha256:record.image.sha256,engine:clone(record.engine)},derivation:{reason,date:new Date().toISOString()}};
  return validateRecord(next);
}
export function regionBBox(r) {
  if(r.bbox)return [...r.bbox];
  const p=r.polygon||r.baseline||[];if(!p.length)return null;
  const x=p.map(v=>v[0]),y=p.map(v=>v[1]);return [Math.min(...x),Math.min(...y),Math.max(...x)-Math.min(...x),Math.max(...y)-Math.min(...y)];
}
export function iou(a,b) {
  if(!a||!b)return 0;const w=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])),h=Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));
  return w*h/(a[2]*a[3]+b[2]*b[3]-w*h||1);
}
export function overlapMatch(region,candidates){const a=regionBBox(region);return candidates.map(r=>({region:r,iou:iou(a,regionBBox(r))})).filter(x=>x.iou>0).sort((a,b)=>b.iou-a.iou)[0]?.region||null;}
// Upgrade only display/session copies. Never rewrite a locked through-record or its raw output.
export function upgradeScores(record){
 const result=serializable(record);for(const r of result.regions){
  if(result.engine.name==='pp-ocrv6'){r.class='（检测不分类）';r.class_norm='';delete r.class_id;}
  if(!Object.hasOwn(r,'det_score')){r.det_score=record.engine.name.startsWith('ndl')?(r.detection_conf??r.conf??null):null;r.det_score_source=r.det_score===null?null:'引擎原值：旧NDL记录检测分数';}
  if(!Object.hasOwn(r,'rec_score')){r.rec_score=record.engine.name.startsWith('ndl')?null:r.conf??null;r.rec_score_source=r.rec_score===null?null:'旧记录原值；具体分数定义须回查生成工具';}
  r.chars=(r.chars||[]).map(c=>({...c,prob:c.prob??c.conf,source:c.source||'旧记录：来源待核'}));delete r.conf;delete r.detection_conf;
 }return validateRecord(result);
}
