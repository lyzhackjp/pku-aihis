#!/usr/bin/env node
import fs from 'node:fs/promises';
const [map,glossary,sources]=process.argv.slice(2);if(!map||!glossary||!sources){console.error('Usage: check-ready.mjs page-map.json glossary.json sources.json');process.exit(2);}
const p=JSON.parse(await fs.readFile(map)),g=JSON.parse(await fs.readFile(glossary)),s=JSON.parse(await fs.readFile(sources));const errors=[];const ids=new Set(p.map(x=>x.id));
const ordered=p.flatMap(x=>[x.id,...(x.aliases||[])]).sort();if(ordered.some((id,i)=>id!=='D'+String(i).padStart(2,'0')))errors.push('Missing or duplicated page ID/alias');p.forEach((x,i)=>{if(x.status!=='implemented'||!x.component)errors.push('Incomplete page '+x.id);for(const k of ['section','question','student_operation','observable_output','lesson_evidence','mode','footer'])if(!x[k])errors.push(x.id+' missing '+k);for(const k of ['purpose','guide','mechanism'])if(!x.notes?.[k])errors.push(x.id+' missing note '+k);});
for(const t of g.categories.flatMap(c=>c.terms))if(!ids.has(t.first_slide))errors.push('Invalid concept link '+t.term);
for(const m of s){for(const k of ['id','author','title','edition','provider','url','acquisition','scope','rights'])if(!m[k])errors.push('Source '+m.id+' missing '+k);for(const r of m.paragraphs||[])for(const k of ['id','text','locator','url'])if(!r[k])errors.push('Record '+r.id+' missing '+k);}
if(!p.some(x=>x.layout==='through')||!p.some(x=>x.layout==='concepts'))errors.push('Missing through or glossary page');
errors.forEach(e=>console.error(e));console.log(JSON.stringify({pages:p.length,minutes:p.reduce((n,x)=>n+(x.minutes||0),0),sources:s.length,errors:errors.length}));process.exit(errors.length?1:0);
