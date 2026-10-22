import '../math.js';
export function normalizeText(text,mapping={}){const n=String(text).normalize('NFC');return [...n].map(c=>Object.hasOwn(mapping,c)?mapping[c]:c).join('');}
export function cer(reference,hypothesis,{mapping={},denominator='N'}={}){
  if(!['N','S+D+I+C'].includes(denominator))throw Error('分母未登记');
  if(!mapping||Array.isArray(mapping)||typeof mapping!=='object'||Object.entries(mapping).some(([k,v])=>[...k].length!==1||typeof v!=='string'))throw Error('字形映射须为单字到字符串的对象');
  const a=normalizeText(reference,mapping),b=normalizeText(hypothesis,mapping),A=[...a],B=[...b];
  if((A.length+1)*(B.length+1)>4000000)throw Error('逐格对齐限四百万格；请缩小小样本范围');
  const table=globalThis.LabMath.editTable(a,b),path=[];let i=A.length,j=B.length,S=0,D=0,I=0,C=0;
  while(i||j){
    if(i&&j&&table[i][j]===table[i-1][j-1]+(A[i-1]===B[j-1]?0:1)){const op=A[i-1]===B[j-1]?'C':'S';if(op==='C')C++;else S++;path.push({op,reference:A[i-1],hypothesis:B[j-1],i:i-1,j:j-1});i--;j--;}
    else if(i&&table[i][j]===table[i-1][j]+1){D++;path.push({op:'D',reference:A[i-1],hypothesis:'',i:i-1,j});i--;}
    else {I++;path.push({op:'I',reference:'',hypothesis:B[j-1],i,j:j-1});j--;}
  }
  const N=A.length,divisor=denominator==='N'?N:S+D+I+C;
  return {S,D,I,C,N,denominator,divisor,cer:divisor?(S+D+I)/divisor:null,undefined_reason:divisor?null:'分母为零',path:path.reverse(),table,reference:a,hypothesis:b,mapping:{...mapping},normalization:'NFC',unit:'Unicode code point'};
}
export function compareLines(reference,hypothesis,options={}){
  if(!Array.isArray(reference)||!Array.isArray(hypothesis))throw Error('按行比较需要带 id 的数组');
  for(const list of [reference,hypothesis])if(new Set(list.map(x=>x.id)).size!==list.length||list.some(x=>typeof x.id!=='string'||typeof x.text!=='string'))throw Error('行号须唯一，文本须为字符串');
  const hm=new Map(hypothesis.map(x=>[x.id,x.text])),rm=new Set(reference.map(x=>x.id));
  const rows=reference.map(r=>({id:r.id,...cer(r.text,hm.get(r.id)||'',options)}));
  for(const h of hypothesis)if(!rm.has(h.id))rows.push({id:h.id,...cer('',h.text,options)});
  const values=rows.map(r=>r.cer).filter(Number.isFinite).sort((a,b)=>a-b),n=values.length;
  const totals=Object.fromEntries(['S','D','I','C','N'].map(k=>[k,rows.reduce((s,r)=>s+r[k],0)]));
  const divisor=options.denominator==='S+D+I+C'?totals.S+totals.D+totals.I+totals.C:totals.N;
  return {rows,totals,weighted:divisor?(totals.S+totals.D+totals.I)/divisor:null,mean:n?values.reduce((s,x)=>s+x,0)/n:null,median:n?(values[Math.floor((n-1)/2)]+values[Math.floor(n/2)])/2:null,undefined_lines:rows.filter(r=>r.cer===null).map(r=>r.id),page:cer(reference.map(x=>x.text).join(''),hypothesis.map(x=>x.text).join(''),options)};
}
