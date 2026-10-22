import {cer} from './cer.mjs';
export function candidateEdits(before,after){return cer(before,after).path.map((c,i)=>({...c,index:i})).filter(c=>c.op!=='C');}
export function applyCandidateEdits(before,after,decisions){const path=cer(before,after).path;let text='';for(let i=0;i<path.length;i++){const c=path[i];if(c.op==='C'){text+=c.reference;continue;}const decision=decisions[i];if(!['accept','reject'].includes(decision))throw Error('先逐处采纳或驳回');text+=decision==='accept'?c.hypothesis:c.reference;}return text;}
