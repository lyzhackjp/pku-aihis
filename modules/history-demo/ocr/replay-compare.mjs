// Candidate. Compare raw text only when image fingerprint, model and scope match.
import {regionBBox} from './record.mjs';
function iou(a,b){a=regionBBox(a);b=regionBBox(b);if(!a||!b)return 0;const area=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));return area/(a[2]*a[3]+b[2]*b[3]-area);}
export function compareReplay(live,saved){
 if(!live||!saved)return{comparable:false,reason:'缺少现场运行或保存记录',rows:[]};
 if(live.image.sha256!==saved.image.sha256)return{comparable:false,reason:'图像指纹不同，不作逐行比较',rows:[]};
 if(live.engine.name!==saved.engine.name||(live.engine.model_id||live.engine.version)!==(saved.engine.model_id||saved.engine.version))return{comparable:false,reason:'模型或固定版本不同，不作同模型比较',rows:[]};
 if(live.engine.params?.experiment||saved.engine.params?.experiment||!!live.engine.params?.detectOnly!==!!saved.engine.params?.detectOnly)return{comparable:false,reason:'运行范围不同（整页、检测或构造行），不作同输入比较',rows:[]};
 const old=saved.regions.filter(x=>typeof x.text==='string'),now=live.regions.filter(x=>typeof x.text==='string'),used=new Set(),rows=[];
 for(const a of old){const options=now.filter(x=>!used.has(x.id)).map(x=>({x,score:iou(a,x)})).sort((a,b)=>b.score-a.score);const b=options[0]?.score>=.5?options[0].x:null;if(b)used.add(b.id);rows.push({saved_id:a.id,live_id:b?.id??null,saved:a.text,live:b?.text??null,same:!!b&&a.text===b.text});}
 for(const b of now.filter(x=>!used.has(x.id)))rows.push({saved_id:null,live_id:b.id,saved:null,live:b.text,same:false});
 return{comparable:true,identical:rows.every(x=>x.same),changed:rows.filter(x=>!x.same).length,rows,matching:'按原图框 IoU≥0.5 一对一匹配；不作字形或空白归一化'};
}
