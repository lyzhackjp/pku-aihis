import {environmentReady,runtimeEnvironment,modelIdentity} from '../modules/ocr/run-environment.mjs';
import {candidateEdits,applyCandidateEdits} from '../modules/ocr/candidate-edits.mjs';
import {state,ready,save,addRecord,put} from './storage.js';
import {validateRecord,fromNDLXML,fromPageXML,fromPPOCR,fromNDLLite,fromFlorence,fromDots,fromMLLM,makeRecord,deriveRecord} from '../modules/ocr/record.mjs';
import {coordinatePrompt,normalizeRegions} from '../modules/ocr/api.mjs';
import {validateProject} from '../modules/project.mjs';
const DATA=window.DECK_DATA;export const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
export const blobDataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
export async function materialFromBlob(blob,source,name){const bytes=await blob.arrayBuffer(),image=await createImageBitmap(blob);const material={image:{name,sha256:await digest(bytes),width:image.width,height:image.height,source:{material_id:source.id,identity:source.identity||source.title,page_systems:source.page_systems||{'位置':'用户导入，待填写'}},local_only:source.public!==true},dataUrl:await blobDataURL(blob)};image.close();return material;}
export function currentRecords(){return state.records.filter(r=>r.image.sha256===state.material?.image.sha256).sort((a,b)=>Date.parse(a.engine.date)-Date.parse(b.engine.date));}
export function lastRecord(name){return currentRecords().filter(r=>!name||r.engine.name===name).at(-1);}
export const environmentReadyForRun=()=>environmentReady;
export function meta(name,run_mode='浏览器实时',version='待登记',params={},image=state.material?.image){if(!image)throw Error('先选择页影');return {image:structuredClone(image),engine:{name,version,run_mode,date:new Date().toISOString(),params,model_id:modelIdentity(name),runtime:runtimeEnvironment(name,params.experiment?'line':'full')}};}
export async function pixels(material=state.material){if(!material?.dataUrl)throw Error('需本机材料或导入公开页影');const image=await createImageBitmap(await (await fetch(material.dataUrl)).blob());const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);image.close();return {canvas,imageData:c.getImageData(0,0,canvas.width,canvas.height)};}
export async function selectMaterial(id){
 const source=DATA.sources.find(s=>s.id===id);if(!source)throw Error('材料未登记');
 if(source.public===false){
  if(!['localhost','127.0.0.1'].includes(location.hostname)||!new URLSearchParams(location.search).has('local'))throw Error('需本机材料；用本机启动器打开');
  const res=await fetch('/local-materials/manifest');if(!res.ok)throw Error('本机材料接口未启动');const item=(await res.json()).find(s=>s.id===id);if(!item)throw Error('需通过导入页打开该材料');
  const blob=await (await fetch(item.image_url)).blob();const m=await materialFromBlob(blob,{id,public:false,identity:source.identity,page_systems:item.image.source.page_systems},id);
  if(m.image.sha256!==item.image.sha256)throw Error('本机页影指纹与登记不符');state.material=m;
  const xml=await (await fetch(item.xml_url)).text();const r=fromNDLXML(xml,meta('ndlocr-lite','保存结果回放','待登记（V-08）',{source:'第五周已保存 XML；未重跑',date_known:'2026-10-13'}));r.engine.date='2026-10-13T00:00:00+08:00';delete r.engine.runtime;delete r.engine.model_id;if(!currentRecords().some(x=>x.raw===xml))state.records.push(r);
 }else if(source.file){const r=await fetch(new URL('../materials/'+source.file,import.meta.url));if(!r.ok)throw Error('公开页影未取得');const m=await materialFromBlob(await r.blob(),source,source.file);if(m.image.sha256!==source.sha256)throw Error('公开页影指纹不符');state.material=m;
 }else throw Error(id==='folger_la2'?'Folger 高清页影待取得；公开转录已可用。请导入有来源的 1r 图像。':'公开替代页尚未取得：需本机材料');
 await save();return state.material;
}
export async function importRecord(file){
 if(!state.material)throw Error('先选择与保存记录相同的页影');const text=await file.text();let r;
 if(text.trim().startsWith('<'))r=text.includes('OCRDATASET')?fromNDLXML(text,meta('ndlocr-lite','保存结果回放','待登记')):fromPageXML(text,meta('kraken','保存结果回放','待登记'));
 else{const x=JSON.parse(text);if(x.record_version)r=validateRecord(x);else{const response=x.response||x;if(response.model?.includes('dots.ocr')&&response.image){if(response.image.sha256!==state.material.image.sha256)throw Error('保存记录与当前页影指纹不同');r=fromDots(response,meta('dots.ocr','保存结果回放',response.revision||'待登记'));r.engine.date=response.started_at;r.engine.backend=response.backend;}else throw Error('需要统一识读记录、dots 服务日志或 NDL/PAGE XML');}}
 if(text.trim().startsWith('<')){delete r.engine.runtime;delete r.engine.model_id;}
 if(r.image.sha256!==state.material.image.sha256)throw Error('保存记录与页影指纹不同');r.replayed_at=new Date().toISOString();r.source_file={name:file.name,sha256:await digest(await file.arrayBuffer())};await addRecord(r);return r;
}
export async function runEngine(name,progress=()=>{},options={}){
 await environmentReady;const source=structuredClone(state.material),makeMeta=(name,mode,version,params={})=>meta(name,mode,version,params,source?.image);const start=performance.now();const {imageData}=await pixels(source);let r;
 const engine=await import('../ocr/engines.js');
 if(name==='ndlocr-lite'){const out=await engine.runNDL(imageData,progress,options);r=fromNDLLite(out,makeMeta(name,'浏览器实时','NDLOCR-Lite / DEIM + PARSeq16; importer pin 50216ccc',{detectOnly:!!options.detectOnly}),DATA.categories.ndl);}
 if(name==='pp-ocrv6'){const out=await engine.runPaddle(imageData,progress,options.detectOnly);r=fromPPOCR(out,makeMeta(name,'浏览器实时',engine.models['pp-det'].revision+' / '+engine.models['pp-rec'].revision,{detectOnly:!!options.detectOnly}));}
 if(name==='florence-2'){const out=await engine.runFlorence(imageData,progress,options.task);r=fromFlorence(out.parsed,makeMeta(name,'浏览器实时',out.revision,{task:out.task}));r.raw={output:out.parsed,generated:out.generated};}
 if(!r)throw Error('引擎未登记');r.engine.elapsed_ms=performance.now()-start;if(options.pageId)r.engine.page_id=options.pageId;await addRecord(r);return r;
}
export async function dotsHealth(){try{const r=await fetch('http://127.0.0.1:8786/health',{signal:AbortSignal.timeout(1500)});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}catch(error){return {ok:false,loaded:false,error:'本机服务未启动',detail:error.message};}}
export async function runDots(mode,timeout=180){
 if(!state.material)throw Error('先选择页影');const source=structuredClone(state.material);const request={image_b64:source.dataUrl.split(',')[1],image_sha256:source.image.sha256,prompt_mode:mode,page_id:source.image.source.material_id,max_new_tokens:8192};
 const start=performance.now();let response;
 try{const r=await fetch('http://127.0.0.1:8786/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(timeout*1000)});response=await r.json();}
 catch(error){state.runs.push({engine:'dots.ocr',date:new Date().toISOString(),request:{...request,image_b64:'按 image_sha256 回查'},error:error.message,elapsed_ms:performance.now()-start});await save();throw Error('本机服务未启动、连接失败或超时；原有结果保留。'+error.message);}
 if(response.image&&response.image.sha256!==source.image.sha256)throw Error('dots 服务返回了不同图像');
 const r=fromDots(response,meta('dots.ocr','本机服务实时',response.revision||'待登记',{prompt_mode:mode,prompt_text:response.prompt_text},source.image));r.engine.backend=response.backend||'待登记';r.engine.elapsed_ms=response.elapsed_ms||performance.now()-start;await addRecord(r);return r;
}
export async function cloudOCR({consent=false,bbox,profileId,instruction='逐字照录，保留字形；不确定写［？］；不补写，不翻译。'}){
 if(!consent)throw Error('请明确勾选同意发送所选范围');if(!window.W6Chat?.ready(profileId))throw Error('请先接入模型');if(!window.W6Chat.visionReady(profileId))throw Error('先在模型接入中通过公开图视觉测试');
 const source=structuredClone(state.material),config=window.W6Chat.settings(profileId);const {canvas}=await pixels(source);let crop=canvas,offset=[0,0];
 if(bbox){const [x,y,w,h]=bbox;if(bbox.some(v=>!Number.isFinite(v))||x<0||y<0||w<=0||h<=0||x+w>canvas.width||y+h>canvas.height)throw Error('所选范围超出图像');crop=document.createElement('canvas');crop.width=w;crop.height=h;crop.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);offset=[x,y];}
 const prompt=instruction+'\n仅返回JSON {"regions":[{"id":"line-1","bbox":[四个坐标],"category":"Text","text":"原文","order":0}]}。'+coordinatePrompt(config.coordinates,crop.width,crop.height),messages=[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:crop.toDataURL('image/png')}}]}];
 const date=new Date().toISOString(),scope={image_sha256:source.image.sha256,bbox:bbox||[0,0,canvas.width,canvas.height],coordinates:config.coordinates};
 try{const answer=await window.W6Chat.chat(messages,{profileId:config.id,maxTokens:8192});let normalized,parseError;try{normalized=normalizeRegions(answer.text,config.coordinates,crop.width,crop.height);}catch(e){parseError=e.message;}
  const r=fromMLLM(normalized||answer.text,meta('mllm','按共用API实际调用',answer.model,{provider:config.preset,profile_id:config.id,prompt,...scope},source.image));if(parseError){r.regions=[];r.errors=['坐标或JSON解析失败：'+parseError];}r.regions.forEach(v=>{if(v.bbox){v.bbox[0]+=offset[0];v.bbox[1]+=offset[1];}});
  r.engine.usage=answer.usage||{};r.engine.elapsed_ms=answer.seconds*1000;r.raw={text:answer.text,request:{...answer.request,...scope},response:answer.raw};state.runs.push({date,...r.raw,usage:answer.usage,elapsed_ms:r.engine.elapsed_ms});await addRecord(r);return r;
 }catch(error){state.runs.push({date,request:{...error.request,...scope},error:error.detail||error.message,response:error.raw??null,elapsed_ms:(error.seconds||0)*1000});await save();throw error;}
}
export async function postprocess(kind,consent,options={}){
 if(!consent)throw Error('请明确勾选本次发送的文字／图像范围');const original=state.through.stages[2]?.value.record||state.imports?.reading?.record||lastRecord();if(!original)throw Error('待课前运行：先取得原始识读');
 if(!state.material||original.image.sha256!==state.material.image.sha256)throw Error('当前页影与锁定的原始识读不同，请返回锁定材料');
 const selected=original.regions.filter(r=>r.text!==null);const prompt=(options.prompt||'依据转录规范提出逐行修订，保留不确定性。不要因熟悉某个说法而补写。')+'只返回 JSON {"changes":[{"id":"原区域id","text":"候选全文","reason":"修改理由"}]}。没有理由则不要改动。规范：'+JSON.stringify(state.through.draft.conventions)+'。原始识读：'+JSON.stringify(selected.map(r=>({id:r.id,text:r.text})));
 const content=[{type:'text',text:prompt}];if(kind==='image')content.push({type:'image_url',image_url:{url:state.material.dataUrl}});
 const date=new Date().toISOString(),messages=[{role:'user',content}],request={messages,model:window.W6Chat?.settings(options.profileId).model,kind};
 try{const answer=await window.W6Chat.chat(messages,{maxTokens:8192,profileId:options.profileId});const raw={date,request,response:answer.raw,usage:answer.usage,elapsed_ms:answer.seconds*1000};state.runs.push(raw);let obj;
  try{obj=JSON.parse(answer.text.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));if(!Array.isArray(obj.changes)||obj.changes.some(c=>!selected.some(r=>r.id===c.id)||typeof c.text!=='string'||typeof c.reason!=='string')||new Set(obj.changes.map(c=>c.id)).size!==obj.changes.length)throw Error('changes 格式错误');}
  catch(e){await save();throw Error('解析失败，原回复已保留：'+e.message);}
  state.through.draft.candidates||={};state.through.draft.candidates[kind]={original,changes:obj.changes,raw,decisions:{}};await save();return obj;
 }catch(error){state.runs.push({date,request,error:error.message,response:error.raw??null,elapsed_ms:error.seconds!=null?error.seconds*1000:Date.now()-Date.parse(date)});await save();throw error;}
}
export function revisedRecord(kind){const c=state.through.draft.candidates?.[kind];if(!c)throw Error('待课前运行');const regions=structuredClone(c.original.regions);for(const x of c.changes){const r=regions.find(r=>r.id===x.id),decision=c.decisions[x.id];if(decision==='accept')r.text=x.text;else if(decision!=='reject')r.text=applyCandidateEdits(r.text||'',x.text,c.editDecisions?.[x.id]||{});if(r.text!==c.original.regions.find(o=>o.id===r.id)?.text){r.rec_score=null;r.rec_score_source=window.Deck.pageById('D00').ui_round2_copy.r0270;r.chars=[];delete r.recognition_trace;}}return {record:deriveRecord(c.original,{regions},'逐处人工裁定；候选，不覆盖原始识读'),decisions:c.changes.flatMap(x=>candidateEdits(c.original.regions.find(r=>r.id===x.id)?.text||'',x.text).map(e=>({id:x.id,index:e.index,reference:e.reference,hypothesis:e.hypothesis,decision:c.decisions[x.id]||c.editDecisions?.[x.id]?.[e.index],reason:x.reason||'人工逐处裁定'})))};}

let importer;
export function openImporter(){importer=window.open(new URL('assets/importer/?receiver='+encodeURIComponent(location.origin),document.baseURI),'week06-material-importer');}
window.addEventListener('message',async e=>{if(e.origin!==location.origin||e.source!==importer)return;if(e.data?.type==='PKU_IMPORT_READY')importer.postMessage({type:'PKU_IMPORT_HELLO'},location.origin);if(e.data?.type==='PKU_PROJECT'){try{const project=validateProject(e.data.project),files=e.data.files||[];await put('imported-project',project);let count=0;for(const file of files){if(!(file.blob instanceof Blob))throw Error('附件格式错误');await put('attachment/'+file.id,file.blob);if(file.blob.type.startsWith('image/')&&count===0){state.material=await materialFromBlob(file.blob,{id:'imported',public:false,title:'从导入页接收；请填写页码'},file.id);count++;}}await save();importer.postMessage({type:'PKU_IMPORT_ACCEPTED'},location.origin);window.dispatchEvent(new CustomEvent('week06-notice',{detail:count?'已接收图像与项目；请核对材料身份':'项目已接收；请选择其中一页导出为 PNG/JPEG 后在本课导入'}));}catch(error){importer.postMessage({type:'PKU_IMPORT_REJECTED',message:error.message},location.origin);}}});
window.W6ServicesReady=ready.then(()=>({openImporter}));

export const materialMode=()=>['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('local')==='1'?'local':'public';
const defaultFiles={'ndlocr-lite':'shide-1926-ndl-default-record.json.gz','pp-ocrv6':'shide-1926-default-record.json.gz'},defaultRecords=new Map();
export async function loadDefaultRecord(name){
 if(!defaultFiles[name])return null;
 if(!defaultRecords.has(name))defaultRecords.set(name,(async()=>{const response=await fetch('assets/materials/'+defaultFiles[name]);if(!response.ok)throw Error('默认记录未取得：'+name);const record=validateRecord(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json());record.original_run_mode=record.engine.run_mode;record.engine.run_mode='保存结果回放';record.default_replay=defaultFiles[name];return record;})().catch(e=>{defaultRecords.delete(name);throw e;}));
 return structuredClone(await defaultRecords.get(name));
}
export function recordForPage(id,view={}){
 const rs=currentRecords(),full=rs.filter(r=>!r.engine.params?.experiment),pub=state.material?.image.source.material_id==='shide_public';
 if(pub&&id==='D01')return full.filter(r=>r.engine.name===(view.ndlPreview?'ndlocr-lite':'pp-ocrv6')).at(-1);
 return full.filter(r=>r.engine.page_id===id&&!r.default_replay).at(-1)||(pub&&['D03','D05','D06'].includes(id)?full.filter(r=>r.engine.name==='ndlocr-lite').at(-1):null)||rs.at(-1);
}
let defaultQueue=Promise.resolve();
export async function ensurePageMaterial(page,view){
 await environmentReady;if(!page.material_defaults)return;
 const mode=materialMode(),id=view['chosenMaterial_'+mode]||page.material_defaults[mode];
 defaultQueue=defaultQueue.catch(()=>{}).then(async()=>{
  if(state.material?.image.source.material_id!==id)await selectMaterial(id);
  if(mode==='public'&&id==='shide_public'){
   if(page.id==='D08'&&!state.controlled_experiments){const response=await fetch('assets/materials/d08-round4-controlled.json.gz');if(response.ok){state.controlled_experiments=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();await save();}}
   const names=['D03','D05','D06'].includes(page.id)||page.id==='D01'&&view.ndlPreview?['ndlocr-lite']:['pp-ocrv6'];
   for(const name of names)if(!currentRecords().some(r=>r.engine.name===name&&!r.engine.params?.experiment)){
    const record=await loadDefaultRecord(name);if(record.image.sha256!==state.material.image.sha256)throw Error('默认记录与页影指纹不符');await addRecord(record);
   }
  }
 });return defaultQueue;
}
