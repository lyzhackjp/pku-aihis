const DB_NAME = 'week04-patchouli-lab-v1';
const CHUNK_BYTES = 8 * 1024 * 1024;
const FORMAT = 'chunked-library/v2';
interface Descriptor {name:string;hash:string;bytes:number;chunks:number;}
interface StoredLibrary {format:string;database:{bytes:number;chunks:number};files:Record<string,Descriptor>;}
export async function openStorage():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);});
}
const key=(asset:string,index:number)=>'binary/'+asset+'/'+index;
const count=(bytes:number)=>Math.ceil(bytes/CHUNK_BYTES);
// Keep the original database/store names. Existing single-value libraries remain readable;
// the first successful save moves them into bounded records in one transaction.
export function loadState(storage:IDBDatabase):Promise<any>{
  return new Promise((resolve,reject)=>{
    const tx=storage.transaction('state'),store=tx.objectStore('state'),request=store.get('library');let value:any;
    tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||Error('Browser storage aborted'));tx.onerror=()=>reject(tx.error);
    request.onsuccess=()=>{const meta=request.result;if(!meta||meta.format!==FORMAT){value=meta;return;}value={bytes:new Uint8Array(meta.database.bytes),files:{}};
      const read=(asset:string,descriptor:{bytes:number;chunks:number},dest:Uint8Array)=>{for(let i=0;i<descriptor.chunks;i++){const r=store.get(key(asset,i));r.onsuccess=()=>{const chunk=r.result;if(!(chunk instanceof Uint8Array)||chunk.length!==Math.min(CHUNK_BYTES,descriptor.bytes-i*CHUNK_BYTES)){tx.abort();reject(Error('本机分块原件缺失或不完整，请从完整备份恢复'));return;}dest.set(chunk,i*CHUNK_BYTES);};}};
      read('database',meta.database,value.bytes);for(const [id,d] of Object.entries(meta.files) as [string,Descriptor][]){const data=new Uint8Array(d.bytes);value.files[id]={name:d.name,hash:d.hash,data};read('pdf/'+id,d,data);}
    };
  });
}
export function saveState(storage:IDBDatabase,value:{bytes:Uint8Array;files:Record<string,{name:string;hash:string;data:Uint8Array}>}):Promise<void>{
  return new Promise((resolve,reject)=>{
    const tx=storage.transaction('state','readwrite'),store=tx.objectStore('state');
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Browser storage aborted'));tx.onerror=()=>reject(tx.error);
    const previous=store.get('library');previous.onsuccess=()=>{try{
      const old:StoredLibrary=previous.result?.format===FORMAT?previous.result:null;
      const next:StoredLibrary={format:FORMAT,database:{bytes:value.bytes.length,chunks:count(value.bytes.length)},files:{}};
      const write=(asset:string,data:Uint8Array)=>{for(let i=0;i<count(data.length);i++)store.put(data.slice(i*CHUNK_BYTES,(i+1)*CHUNK_BYTES),key(asset,i));};
      write('database',value.bytes);for(let i=next.database.chunks;i<(old?.database.chunks||0);i++)store.delete(key('database',i));
      for(const [id,file] of Object.entries(value.files)){
        next.files[id]={name:file.name,hash:file.hash,bytes:file.data.length,chunks:count(file.data.length)};
        if(old?.files[id]?.hash!==file.hash||old.files[id]?.bytes!==file.data.length)write('pdf/'+id,file.data);
        for(let i=next.files[id].chunks;i<(old?.files[id]?.chunks||0);i++)store.delete(key('pdf/'+id,i));
      }
      for(const [id,d] of Object.entries(old?.files||{}))if(!next.files[id])for(let i=0;i<d.chunks;i++)store.delete(key('pdf/'+id,i));
      store.put(next,'library');
    }catch(error){tx.abort();reject(error);}};
  });
}
