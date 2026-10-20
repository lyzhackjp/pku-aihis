// 候选，未经教师确认。Pure probability calculations; never infer from confidence labels.
export function softmax(values){
 const v=Array.from(values,Number);if(!v.length||v.some(x=>!Number.isFinite(x)))throw Error('logits 含非有限值或为空');
 const max=Math.max(...v),exps=v.map(x=>Math.exp(x-max)),sum=exps.reduce((a,b)=>a+b,0);return exps.map(x=>x/sum);
}
export function probabilityTrace(rows,labels,{blank=0,topK=5,probes=[]}={}){
 if(!rows.length)return {positions:[],heatmap:{labels:[],values:[]}};
 const peaks=new Map(),best=[];
 for(const row of rows){if(row.length!==labels.length||Array.from(row).some(x=>!Number.isFinite(x)||x<0||x>1.00001))throw Error('概率表维度或取值错误');let id=0;for(let k=0;k<row.length;k++){if(row[k]>row[id])id=k;if(row[k]>(peaks.get(k)||0))peaks.set(k,row[k]);}best.push(id);}
 const heatIds=[blank,...[...peaks].filter(([k])=>k!==blank).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([k])=>k)];
 const positions=rows.map((row,t)=>{const ids=Array.from(row,(_,i)=>i).sort((a,b)=>row[b]-row[a]).slice(0,topK);return {step:t,id:best[t],text:labels[best[t]],prob:Number(row[best[t]]),candidates:ids.map(id=>({id,text:labels[id],prob:Number(row[id])})),probes:Object.fromEntries(probes.map(c=>[c,labels.indexOf(c)]).filter(([,i])=>i>=0).map(([c,i])=>[c,Number(row[i])]))};});
 return {positions,heatmap:{ids:heatIds,labels:heatIds.map(k=>labels[k]),values:heatIds.map(k=>rows.map(r=>Number(r[k])))} };
}
export function decodeCTCProbabilities(rows,labels,blank=0){
 const trace=probabilityTrace(rows,labels,{blank});let prev=blank;const chars=[];
 for(const p of trace.positions){if(p.id!==blank&&p.id!==prev)chars.push({text:p.text,prob:p.prob,step:p.step,source:'引擎原值：CTC输出概率'});prev=p.id;}
 return {text:chars.map(x=>x.text).join(''),score:chars.length?chars.reduce((s,x)=>s+x.prob,0)/chars.length:0,chars,trace:{...trace,blank_id:blank,kept_steps:chars.map(x=>x.step)}};
}
