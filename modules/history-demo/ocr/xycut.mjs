import {regionBBox} from './record.mjs';
// Exact projected whitespace; ties prefer the direction axis. No synthetic boxes.
export function xycut(regions,direction='vertical-rtl') {
  if(!['vertical-rtl','horizontal-tb'].includes(direction))throw Error('方向规则未登记');
  const items=regions.map((r,i)=>({id:r.id??String(i),bbox:Array.isArray(r)?r:regionBBox(r)}));
  if(items.some(r=>!r.bbox||r.bbox.length!==4||r.bbox.some(x=>!Number.isFinite(x))||r.bbox[2]<0||r.bbox[3]<0))throw Error('无效坐标');
  const cuts=[];const vertical=direction==='vertical-rtl';
  const gaps=(rows,axis)=>{const intervals=rows.map(r=>[r.bbox[axis],r.bbox[axis]+r.bbox[axis+2]]).sort((a,b)=>a[0]-b[0]);let end=intervals[0][1],out=[];for(const [start,e]of intervals.slice(1)){if(start>end)out.push({axis,from:end,to:start,width:start-end});end=Math.max(end,e);}return out;};
  function split(rows,depth=0){
    if(rows.length<=1)return rows.map(r=>r.id);
    const gap=[...gaps(rows,0),...gaps(rows,1)].sort((a,b)=>b.width-a.width||(vertical?a.axis-b.axis:b.axis-a.axis))[0];
    if(!gap)return [...rows].sort((a,b)=>vertical?b.bbox[0]-a.bbox[0]||a.bbox[1]-b.bbox[1]:a.bbox[1]-b.bbox[1]||a.bbox[0]-b.bbox[0]).map(r=>r.id);
    const position=(gap.from+gap.to)/2,low=rows.filter(r=>r.bbox[gap.axis]<position),high=rows.filter(r=>r.bbox[gap.axis]>=position);
    cuts.push({...gap,position,depth,ids:rows.map(r=>r.id),groups:[low.map(r=>r.id),high.map(r=>r.id)]});
    return (vertical&&gap.axis===0?[high,low]:[low,high]).flatMap(group=>split(group,depth+1));
  }
  return {cuts,order:split(items),direction};
}
