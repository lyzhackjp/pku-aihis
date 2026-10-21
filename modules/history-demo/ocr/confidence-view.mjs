// Candidate. Public DB scores and local NDL XML CONF have separate, explicit semantics.
import {overlapMatch} from './record.mjs';
export function confidenceRows(record,pp,local=false){return(record?.regions||[]).filter(r=>typeof r.text==='string').map(r=>({region:r,det:r.det_score,rec:local?overlapMatch(r,pp?.regions||[])?.rec_score:r.rec_score,pp:local?overlapMatch(r,pp?.regions||[]):r}));}
export function sortConfidence(rows,kind='rec_score'){const field=kind==='det_score'?'det':'rec';return [...rows].sort((a,b)=>(a[field]??Infinity)-(b[field]??Infinity)||(a.region.order??0)-(b.region.order??0));}
export const halfCount=rows=>Math.ceil(rows.length/2);
