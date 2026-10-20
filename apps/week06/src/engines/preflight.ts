import {checkModel} from '../../../../modules/history-demo/ocr/preflight.mjs';
import {ndlStore,initNDL,ndl,ndlLine} from './ndl';
import {initPaddle,paddle,paddleLine} from './paddle';
import {inspectVerified,verified} from './verified';
import models from './models.json';import ndlModels from '../../../material-importer/src/ndl/models.json' with {type:'json'};
import * as ort from 'onnxruntime-web/wasm';import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
export async function preflight(id:string,action='inspect',image?:ImageData,progress:(s:string)=>void=()=>{}){
 const isNDL=id in ndlModels,store=ndlStore(),spec=(models as any)[id];
 if(action==='download'){if(isNDL)await store.load(id,progress,undefined,true);else if(id==='florence')for(const f of models.florence.files)await verified(f,progress,undefined,true);else await verified(spec,progress,undefined,true);action='inspect';}
 return checkModel({id,inspect:async()=>{
  if(isNDL)return store.inspect(id);
  if(id==='florence'){const files=await Promise.all(models.florence.files.map(inspectVerified));return {cached:files.every(f=>f.cached),verified:files.every(f=>f.verified),files};}
  return inspectVerified(spec);
 },initialize:async()=>{
  if(isNDL)await initNDL(id,progress);else if(id==='pp-det'||id==='pp-rec')await initPaddle(id,progress);else{
   ort.env.wasm.wasmPaths={wasm:wasmUrl};ort.env.wasm.numThreads=1;const sessions=[];
   try{for(const f of models.florence.files.filter(f=>f.path.endsWith('.onnx'))){progress('建立可选Florence会话：'+f.path);const s=await ort.InferenceSession.create(await verified(f,progress),{executionProviders:['wasm']});sessions.push(s);}}finally{await Promise.all(sessions.map(s=>s.release()));}
  }
  return {backend:'wasm',threads:1,webgpu:false};
 },warmup:async()=>{
  if(!image)throw Error('缺少公开测试图');
  if(id.startsWith('parseq')){const r=await ndlLine(image,progress,{size:Number(id.match(/-(\d+)\./)![1])});return {text:r.text,rec_score:r.rec_score,source:r.rec_score_source};}
  if(id==='deim-s-1024x1024.onnx'){const r=await ndl(image,progress,{detectOnly:true});return {text:'',boxes:r.detection.regions.length,output:r.detection};}
  if(id==='pp-det'){const r=await paddle(image,progress,true);return {text:'',boxes:r.rec_polys.length,output:{boxes:r.rec_polys,scores:r.detection_scores}};}
  if(id==='pp-rec'){const r=await paddleLine(image,progress);return {text:r.text,rec_score:r.score};}
  const {florence}=await import('./florence');const r=await florence(image,progress,'<OCR>');return {text:r.parsed['<OCR>']||r.generated,output:r};
 },expected:id.includes('deim')||id==='pp-det'?[]:['史德']},action);
}
