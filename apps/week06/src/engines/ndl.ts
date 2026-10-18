// Import the shared implementation; no copied detector/recognizer/reading-order modules.
import {LayoutDetector} from '../../../material-importer/src/ndl/layout-detector';
import {TextRecognizer} from '../../../material-importer/src/ndl/text-recognizer';
import {ReadingOrderProcessor} from '../../../material-importer/src/ndl/reading-order';
import {NDLModelStore} from '../../../material-importer/src/ndl/model-loader';
import models from '../../../material-importer/src/ndl/models.json';
let detector:LayoutDetector;const recognizers=new Map<number,TextRecognizer>();
export const ndlBytes=Object.values(models).reduce((s,m)=>s+m.bytes,0);
export async function ndl(imageData:ImageData,progress:(s:string)=>void){
 const store=new NDLModelStore({baseURL:new URL('./',location.href).href});
 if(!detector){const d=new LayoutDetector();await d.initialize((await store.load('deim-s-1024x1024.onnx',progress)).bytes);detector=d;}
 progress('NDL：检测版面与行');const detection=await detector.detect(imageData);
 const crops=TextRecognizer.cropImageDataBatch(imageData,detection.lines),blocks=[];
 for(let i=0;i<detection.lines.length;i++){
  const r=detection.lines[i],size=r.charCountCategory===3?30:r.charCountCategory===2?50:100,width=size===30?256:size===50?384:768;
  if(!recognizers.has(size)){const rec=new TextRecognizer([1,3,16,width]);await rec.initialize((await store.load(`parseq-ndl-${size}.onnx`,progress)).bytes);recognizers.set(size,rec);}
  progress(`NDL：识读 ${i+1}/${crops.length}`);const v=await recognizers.get(size).recognizeCropped(crops[i]);
  blocks.push({...r,text:v.text,recognitionConfidence:null,readingOrder:i});
 }
 const ordered=new ReadingOrderProcessor().process(blocks,detection.blocks);
 return {blocks:ordered,detection,crops:crops.map(c=>({width:c.width,height:c.height})),modelManifest:models};
}
