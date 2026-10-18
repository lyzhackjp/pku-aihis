import {AutoProcessor,AutoTokenizer,Florence2ForConditionalGeneration,RawImage,env} from '@huggingface/transformers';
import models from './models.json';import {verified} from './verified';
let model:any,processor:any,tokenizer:any;
export async function florence(image:ImageData,progress:(s:string)=>void,task='<OCR_WITH_REGION>'){
 if(!['<OCR>','<OCR_WITH_REGION>'].includes(task))throw Error('未登记的 Florence 任务');
 let downloadError:any=null;const spec=models.florence;env.allowLocalModels=true;env.allowRemoteModels=false;env.localModelPath='/__week06_no_unverified_models__/';env.useBrowserCache=false;env.useCustomCache=true;
 env.customCache={match:async(request:any)=>{const u=typeof request==='string'?request:request.url;const file=spec.files.find(f=>f.url===u);if(!/^https?:/.test(u))return undefined;if(!file){if(u.startsWith(`https://huggingface.co/${spec.repo}/resolve/${spec.revision}/`))return new Response('',{status:404});throw Error('拒绝未固定的模型地址');}try{return new Response(await verified(file,progress));}catch(e){downloadError=e;return new Response(String(e),{status:499});}},put:async()=>{}} as any;
 if(!model){progress('Florence-2：加载经指纹核验的 q8 模型');
  const opts:any={revision:spec.revision,dtype:'q8',device:'wasm',local_files_only:true};
  try{processor=await AutoProcessor.from_pretrained(spec.repo,opts);tokenizer=await AutoTokenizer.from_pretrained(spec.repo,opts);model=await Florence2ForConditionalGeneration.from_pretrained(spec.repo,opts);}catch(e){throw downloadError||e;}
 }
 const rawImage=new RawImage(new Uint8ClampedArray(image.data),image.width,image.height,4);
 const vision=await processor(rawImage),prompts=processor.construct_prompts(task),text=tokenizer(prompts);
 progress('Florence-2：当场检验文字与坐标');const ids=await model.generate({...text,...vision,max_new_tokens:1024,num_beams:3,do_sample:false});
 const generated=tokenizer.batch_decode(ids,{skip_special_tokens:false})[0];
 return {parsed:processor.post_process_generation(generated,task,[image.width,image.height]),generated,task,revision:spec.revision};
}
