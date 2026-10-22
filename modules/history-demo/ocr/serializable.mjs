// Candidate. Normalize int64 at adapter boundaries; never round unsafe integers.
export function serializable(value) {
 const notes=[],seen=new WeakSet();
 function visit(v,path) {
  if(typeof v==='bigint') {
   if(v<=BigInt(Number.MAX_SAFE_INTEGER)&&v>=BigInt(Number.MIN_SAFE_INTEGER))return Number(v);
   notes.push({path,value:v.toString(),reason:'int64 超出安全整数范围；以十进制字符串保留'});return v.toString();
  }
  if(v===null||typeof v!=='object')return v;
  if(seen.has(v))throw Error('记录含循环引用：'+path);
  seen.add(v);let result;
  if(Array.isArray(v)||ArrayBuffer.isView(v))result=Array.from(v,(x,i)=>visit(x,path+'['+i+']'));
  else result=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x,path+'.'+k)]));
  seen.delete(v);return result;
 }
 const result=visit(value,'$');
 if(notes.length&&result&&typeof result==='object'&&!Array.isArray(result))result.serialization_notes=[...(result.serialization_notes||[]),...notes];
 return result;
}
