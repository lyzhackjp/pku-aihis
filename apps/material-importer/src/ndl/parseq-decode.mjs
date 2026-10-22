// Upstream rule: ndl-lab/ndlocr-lite d001dad src/parseq.py read().
// Argmax each position; stop at the first id 0; all other ids map to charList[id-1].
// No CTC repeat merging or special-id skipping. Probabilities are course calculations.
import {softmax,probabilityTrace} from '../../../../modules/history-demo/ocr/probabilities.mjs';
export function decodePARSeq(logits,dims,charList,{topK=5,probes=['德','徳']}={}){
 const shape=Array.from(dims);if(shape.length!==3||shape[0]!==1)throw Error('PARSeq须为[1,T,K]');
 const [,steps,classes]=shape;const chars=Array.from(charList);if(classes>chars.length+1||classes<2||logits.length!==steps*classes)throw Error('PARSeq字表与logits维度不符');
 const flat=Array.from(logits);const rows=Array.from({length:steps},(_,i)=>softmax(flat.slice(i*classes,(i+1)*classes)));
 const trace=probabilityTrace(rows,['<eos>',...chars.slice(0,classes-1)],{topK,probes});
 const first=trace.positions.findIndex(p=>p.id===0),stop=first<0?steps:first;
 const kept=trace.positions.slice(0,stop).map(p=>({text:p.text,prob:p.prob,step:p.step,source:'本课计算：PARSeq logits softmax；NDL工具不输出'}));
 return {text:kept.map(x=>x.text).join(''),chars:kept,positions:trace.positions,heatmap:trace.heatmap,stop,confidence:null,rec_score:kept.length?kept.reduce((s,x)=>s+x.prob,0)/kept.length:null,rec_score_source:'本课计算：逐字softmax概率平均；NDL工具不输出'};
}
