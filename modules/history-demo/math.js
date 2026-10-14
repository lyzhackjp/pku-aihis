/* Deterministic teaching algorithms; shared by pages and headless tests. */
(function(root){
'use strict';
const chars=s=>[...String(s)];
const tokenize=(s,n=1)=>{const c=chars(s.toLowerCase().replace(/[\p{P}\p{Z}\s]/gu,''));return n===1?c:c.slice(0,-n+1).map((_,i)=>c.slice(i,i+n).join(''));};
function measureSets(a,b){let A=new Set(a),B=new Set(b),inter=[...A].filter(x=>B.has(x));let i=inter.length,u=A.size+B.size-i;return {a:A.size,b:B.size,i,u,inter,union:[...new Set([...A,...B])],A:[...A],B:[...B],J:u?i/u:0,D:A.size+B.size?2*i/(A.size+B.size):0,O:Math.min(A.size,B.size)?i/Math.min(A.size,B.size):0};}
function similarity(a,b,n=1){return measureSets(tokenize(a,n),tokenize(b,n));}
function editTable(a,b){let A=chars(a),B=chars(b);let d=Array.from({length:A.length+1},(_,i)=>Array.from({length:B.length+1},(_,j)=>i===0?j:j===0?i:0));for(let i=1;i<=A.length;i++)for(let j=1;j<=B.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(A[i-1]===B[j-1]?0:1));return d;}
function chunks(text,mode,size=300,overlap=0,separators=['\n\n','\n',' ','']){
 size=Math.max(1,Math.floor(size));overlap=Math.max(0,Math.min(size-1,Math.floor(overlap)));const c=chars(text);let out=[];
 if(mode==='fixed'){for(let i=0;i<c.length;i+=size-overlap){out.push({text:c.slice(i,i+size).join(''),start:i,end:Math.min(c.length,i+size),level:'字符'});if(i+size>=c.length)break;}return out;}
 if(mode==='sentence'||mode==='paragraph'){let re=mode==='sentence'?/[^。！？.!?]+[。！？.!?]*/gu:/[^\n]+(?:\n|$)/gu;for(const m of text.matchAll(re)){const start=chars(text.slice(0,m.index)).length;out.push({text:m[0],start,end:start+chars(m[0]).length,level:mode==='sentence'?'句':'段'});}return out;}
 function rec(t,base,level){if(chars(t).length<=size){out.push({text:t,start:base,end:base+chars(t).length,level:level===0?'完整单位':separators[level-1]||'字符'});return;}let sep=separators[level]??'';if(!sep){chunks(t,'fixed',size).forEach(x=>out.push({...x,start:base+x.start,end:base+x.end}));return;}let pieces=t.split(sep),buffer='',pos=base;for(let i=0;i<pieces.length;i++){let v=pieces[i]+(i<pieces.length-1?sep:'');if(chars(v).length>size){if(buffer){out.push({text:buffer,start:pos,end:pos+chars(buffer).length,level:sep});pos+=chars(buffer).length;buffer='';}rec(v,pos,level+1);pos+=chars(v).length;}else if(chars(buffer+v).length>size){out.push({text:buffer,start:pos,end:pos+chars(buffer).length,level:sep});pos+=chars(buffer).length;buffer=v;}else buffer+=v;}if(buffer)out.push({text:buffer,start:pos,end:pos+chars(buffer).length,level:sep});}
 rec(text,0,0);return out;
}
function rank(q,records){return records.map(r=>({...r,score:similarity(q,r.text).O,jaccard:similarity(q,r.text).J})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.jaccard-a.jaccard||a.id.localeCompare(b.id));}
// Randomized permutations over the exact finite universe; seeded shuffles avoid collisions.
function minhash(a,b,count=128){let A=new Set(tokenize(a,2)),B=new Set(tokenize(b,2)),universe=[...new Set([...A,...B])].sort();let state=123456789;const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};let hits=0,pairs=[];for(let k=0;k<count;k++){let p=[...universe];for(let i=p.length-1;i>0;i--){let j=Math.floor(next()*(i+1));[p[i],p[j]]=[p[j],p[i]];}let x=p.find(t=>A.has(t)),y=p.find(t=>B.has(t));let hit=x!==undefined&&x===y;hits+=hit?1:0;pairs.push({a:x??'∅',b:y??'∅',hit});}return {exact:similarity(a,b,2).J,estimate:hits/count,hits,count,pairs};}
function support(rows){let cited=rows.filter(r=>r.cite),w=cited.reduce((n,r)=>n+Number(r.weight),0);return {sum:w,cited:cited.length,sentences:rows.length,P:cited.length?w/cited.length:0,R:rows.length?w/rows.length:0};}
const api={tokenize,measureSets,similarity,editTable,chunks,rank,minhash,support};root.LabMath=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
