import {validateRecord} from './record.mjs';
export const STAGES=['原图身份','版面与读序','锁定原始识读','八类干扰','转录规范、抽样与 CER','逐条修订','四层记录'];
const copy=x=>structuredClone(x);
export const emptyThrough=()=>({version:'week06-through-1',candidate:true,stages:[],draft:{source_tier:'公开转录',tasks:{},interference:Array(8).fill(false),severity:Array(8).fill(0),conventions:['保留原字形','缩写按所选参照规则处理','疑字用 □ 并记录位置']}});
export const fingerprint=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),x=>x.toString(16).padStart(2,'0')).join('');
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
export async function validateThrough(s){
 assert(s&&s.version==='week06-through-1'&&s.candidate===true&&Array.isArray(s.stages)&&s.stages.length<=7,'贯穿记录格式错误');
 assert(s.draft&&typeof s.draft==='object','缺少课堂记录');
 const d=s.draft;assert(d.tasks&&typeof d.tasks==='object'&&!Array.isArray(d.tasks),'任务归类格式错误');assert(Array.isArray(d.interference)&&d.interference.length===8&&d.interference.every(x=>typeof x==='boolean'),'八类干扰格式错误');assert(Array.isArray(d.severity)&&d.severity.length===8&&d.severity.every(x=>Number.isInteger(Number(x))&&Number(x)>=0&&Number(x)<=3),'干扰评分格式错误');assert(Array.isArray(d.conventions)&&d.conventions.length===3&&d.conventions.every(x=>typeof x==='string'),'录文规范格式错误');for(const k of ['reference','hypothesis'])assert(d[k]===undefined||typeof d[k]==='string','参照或转录格式错误');
 for(const c of Object.values(d.candidates||{})){validateRecord(c.original);assert(Array.isArray(c.changes)&&c.changes.every(x=>typeof x.id==='string'&&typeof x.text==='string'&&typeof x.reason==='string')&&c.decisions&&typeof c.decisions==='object','修订候选格式错误');}
 let sha;
 for(let i=0;i<s.stages.length;i++){
  const stage=s.stages[i],v=stage.value;assert(stage.index===i&&stage.name===STAGES[i]&&v&&typeof v==='object','阶段缺失或顺序错误');
  assert(typeof stage.date==='string'&&Number.isFinite(Date.parse(stage.date)),'阶段日期错误');
  if(i===0){assert(v.image&&/^[a-f0-9]{64}$/.test(v.image.sha256)&&v.image.width>0&&v.image.height>0&&v.image.source?.material_id,'图像身份不完整');sha=v.image.sha256;
   if(v.dataUrl){assert(/^data:image\/(png|jpeg);base64,/.test(v.dataUrl),'图像格式错误');const bytes=Uint8Array.from(atob(v.dataUrl.split(',')[1]),c=>c.charCodeAt(0));const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');assert(actual===sha,'图像与指纹不符');}
  }else assert(stage.image_sha256===sha,'阶段使用了不同图像');
  if(i===1){validateRecord(v.record);assert(v.record.image.sha256===sha,'版面记录与图像不符');assert(Array.isArray(v.order)&&new Set(v.order).size===v.order.length&&v.order.every(id=>v.record.regions.some(r=>r.id===id)),'读序无效');}
  if(i===2){validateRecord(v.record);assert(v.record.image.sha256===sha,'原始识读与图像不符');assert(v.lock===await fingerprint(v.record),'锁定识读已被改动');}
  if(i===3)assert(Array.isArray(v.items)&&v.items.length===8&&v.items.every(x=>typeof x==='boolean'),'干扰须为八项');
  if(i===4){assert(Array.isArray(v.conventions)&&v.conventions.length===3&&v.conventions.every(x=>typeof x==='string'&&x.trim()),'三条转录规范不能为空');assert(Array.isArray(v.sample)&&v.sample.length>0&&v.sample.every(x=>typeof x.reference==='string'&&typeof x.hypothesis==='string'),'缺少抽样对照');assert(v.source_tier&&v.cer&&Number.isFinite(v.cer.N),'缺少参照来源或 CER');}
  if(i===5){validateRecord(v.record);assert(v.record.image.sha256===sha&&v.record.derivation,'修订须为同页派生记录');assert(Array.isArray(v.decisions)&&v.decisions.every(d=>['accept','reject'].includes(d.decision)&&typeof d.reason==='string'),'每项修订须有裁定与理由');assert(v.original_lock===s.stages[2].value.lock,'修订所据原始记录不符');assert(await fingerprint(v.record.raw)===await fingerprint(s.stages[2].value.record.raw),'修订覆盖了原始输出');}
  if(i===6){assert(v.original_lock===s.stages[2].value.lock&&v.layers?.length===4,'四层记录或原始指纹错误');assert(await fingerprint(v.layers)===await fingerprint(fourLayers(s)),'四层记录与此前阶段不符');}
 }
 return s;
}
export async function commitStage(state,index,value){
 await validateThrough(state);assert(index>=0&&index<7&&index<=state.stages.length,'先完成前一阶段');
 if((index===1||index===2)&&state.stages.length>2)throw Error('原始识读已锁定；请从原图身份新建一份贯穿记录');
 const next=copy(state);if(index===0)next.stages=[];
 const v=copy(value);if(index===2)v.lock=await fingerprint(v.record);
 const stage={index,name:STAGES[index],date:new Date().toISOString(),value:v};if(index>0)stage.image_sha256=state.stages[0].value.image.sha256;
 next.stages=next.stages.slice(0,index);next.stages.push(stage);await validateThrough(next);return next;
}
export function fourLayers(state){
 if(state.stages.length<6)throw Error('先完成修订阶段');const v=state.stages.map(s=>s.value);
 return [{name:'原图',image:v[0].image},{name:'原始识读',record:v[2].record,lock:v[2].lock},{name:'修订稿',record:v[5].record,decisions:v[5].decisions},{name:'处理说明',layout:v[1],interference:v[3],sampling:v[4]}];
}
export function throughMarkdown(s){
 return ['# 第六周四层记录','候选，未经教师确认',...s.stages.map(stage=>`\n## ${stage.index+1} ${stage.name}\n\n\`\`\`json\n${JSON.stringify(stage.value,null,2)}\n\`\`\``)].join('\n');
}
