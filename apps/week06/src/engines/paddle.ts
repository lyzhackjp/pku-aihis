import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import {initOpenCvRuntime} from './paddle-upstream/runtime/opencv';
import {createDetModel} from './paddle-upstream/models/det';
import {createRecModel} from './paddle-upstream/models/rec';
import {cropByPoly} from './paddle-upstream/pipelines/ocr/crop';
import detConfig from './pp-det.yml?raw';import recConfig from './pp-rec.yml?raw';
import manifest from './models.json';import {verified} from './verified';
let det:any,rec:any;
export async function paddle(image:ImageData,progress:(s:string)=>void,detectOnly=false){
 ort.env.wasm.wasmPaths={wasm:wasmUrl};ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
 const {cv}=await initOpenCvRuntime(),common={ort,backend:'wasm',webgpuState:{available:false,reason:'本课使用 WASM'}};
 if(!det)det=await createDetModel({...common,modelBytes:new Uint8Array(await verified(manifest['pp-det'],progress)),configText:detConfig});
 if(!detectOnly&&!rec)rec=await createRecModel({...common,modelBytes:new Uint8Array(await verified(manifest['pp-rec'],progress)),configText:recConfig});
 const rgba=cv.matFromArray(image.height,image.width,cv.CV_8UC4,image.data),bgr=new cv.Mat();cv.cvtColor(rgba,bgr,cv.COLOR_RGBA2BGR);rgba.delete();const crops=[];
 try{
  progress('PP-OCRv6：计算概率图与检测框');const result=(await det.predict(cv,[bgr]))[0];
  const texts=[],scores=[],cropInfo=[];
  for(let i=0;i<result.boxes.length;i++){
   const c=cropByPoly(cv,bgr,result.boxes[i].poly);crops.push(c);cropInfo.push({width:c.cols,height:c.rows,polygon:result.boxes[i].poly});
   if(!detectOnly){progress(`PP-OCRv6：识读 ${i+1}/${result.boxes.length}`);const r=(await rec.predict(cv,[c]))[0];texts.push(r.text);scores.push(r.score);}
  }
  return {rec_polys:result.boxes.map((b:any)=>b.poly),rec_texts:texts,rec_scores:scores,detection_scores:result.boxes.map((b:any)=>b.score),probability:result.probability,crops:cropInfo,det_config:det.config,rec_dictionary_size:rec?.config.charDict.length??null,modelManifest:manifest};
 }finally{bgr.delete();crops.forEach(c=>c.delete());}
}
