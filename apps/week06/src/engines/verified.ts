export type Spec={url:string;bytes:number;sha256:string;path?:string};
export const digest=async(b:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
export async function verified(spec:Spec,progress=(s:string)=>{},signal?:AbortSignal):Promise<ArrayBuffer>{
 const cache=await caches.open('week06-verified-models-v1').catch(()=>null),key=spec.url+'?sha256='+spec.sha256;
 const old=await cache?.match(key);if(old){const b=await old.arrayBuffer();if(b.byteLength===spec.bytes&&await digest(b)===spec.sha256)return b;await cache.delete(key);}
 progress(`待下载：${spec.path||spec.url.split('/').pop()} · ${(spec.bytes/1048576).toFixed(1)} MiB`);
 const r=await fetch(spec.url,{signal,credentials:'omit'});if(!r.ok)throw Error('下载失败 HTTP '+r.status);
 const reader=r.body.getReader(),parts:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>spec.bytes)throw Error('文件超过登记大小');parts.push(value);progress(`下载 ${Math.round(size/spec.bytes*100)}% · ${spec.path||'模型'}`);}}finally{reader.releaseLock();}
 if(size!==spec.bytes)throw Error('文件下载不完整');const all=new Uint8Array(size);let p=0;for(const a of parts){all.set(a,p);p+=a.length;}
 if(await digest(all.buffer)!==spec.sha256)throw Error('SHA-256 校验失败，已拒绝加载');
 await cache?.put(key,new Response(all)).catch(()=>progress('本次已核验；缓存空间不足'));return all.buffer;
}
