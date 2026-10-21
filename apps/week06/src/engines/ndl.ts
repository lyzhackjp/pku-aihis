import {serializable} from '../../../../modules/history-demo/ocr/serializable.mjs';
// Shared importer implementation; course runtime only uses verified cached models.
import {LayoutDetector} from '../../../material-importer/src/ndl/layout-detector';
import {TextRecognizer} from '../../../material-importer/src/ndl/text-recognizer';
import {ReadingOrderProcessor} from '../../../material-importer/src/ndl/reading-order';
import {NDLModelStore} from '../../../material-importer/src/ndl/model-loader';
import models from '../../../material-importer/src/ndl/models.json' with {type:'json'};
let detector:LayoutDetector;const recognizers=new Map<number,TextRecognizer>();
export const ndlBytes=Object.values(models).reduce((s,m)=>s+m.bytes,0);
export const ndlStore=()=>new NDLModelStore({baseURL:new URL('./',location.href).href});
export async function initNDL(name:string,progress:(s:string)=>void=()=>{}){
 if(name.startsWith('deim')&&detector)return;const existingSize=Number(name.match(/-(30|50|100)\.onnx$/)?.[1]);if(recognizers.has(existingSize))return;
 const bytes=(await ndlStore().load(name,progress,undefined,false)).bytes;
 if(name.startsWith('deim')){if(!detector){const d=new LayoutDetector();await d.initialize(bytes);detector=d;}return;}
 const size=Number(name.match(/-(30|50|100)\.onnx$/)?.[1]);if(!size)throw Error('NDL模型未登记');
 if(!recognizers.has(size)){const rec=new TextRecognizer([1,3,16,size===30?256:size===50?384:768]);await rec.initialize(bytes);recognizers.set(size,rec);}
}
export async function ndlLine(imageData:ImageData,progress:(s:string)=>void,options:{size?:number;autoRotate?:boolean}={}){
 const size=options.size||100;await initNDL(`parseq-ndl-${size}.onnx`,progress);return recognizers.get(size)!.recognizeCropped(imageData,{autoRotate:options.autoRotate});
}
export async function ndl(imageData:ImageData,progress:(s:string)=>void,options:{detectOnly?:boolean;autoRotate?:boolean}={}){
 await initNDL('deim-s-1024x1024.onnx',progress);progress('NDL：检测全部17类版面区域');const detection=serializable(await detector.detect(imageData));
 const crops=TextRecognizer.cropImageDataBatch(imageData,detection.lines),blocks=[];
 for(let i=0;i<detection.lines.length;i++){
  const r=detection.lines[i],size=r.charCountCategory===3?30:r.charCountCategory===2?50:100;
  if(options.detectOnly){blocks.push({...r,text:null,readingOrder:i});continue;}
  progress(`NDL：识读 ${i+1}/${crops.length}`);const v=await ndlLine(crops[i],progress,{size,autoRotate:options.autoRotate});
  blocks.push({...r,text:v.text,recognitionScore:v.rec_score,recognitionScoreSource:v.rec_score_source,chars:v.chars,recognitionTrace:{positions:v.positions,heatmap:v.heatmap,stop:v.stop,input:v.input},readingOrder:i});
 }
 const ordered=options.detectOnly?blocks:new ReadingOrderProcessor().process(blocks,detection.blocks);
 return serializable({blocks:ordered,detection,crops:crops.map(c=>({width:c.width,height:c.height})),modelManifest:models});
}
