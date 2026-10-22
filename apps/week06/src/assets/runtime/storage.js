import {upgradeScores} from '../modules/ocr/record.mjs';
import {serializable} from '../modules/ocr/serializable.mjs';
import {repairClassroom,emptyClassroom} from '../modules/ocr/classroom.mjs';
import {emptyThrough,validateThrough} from '../modules/ocr/through.mjs';
const request=p=>new Promise((resolve,reject)=>{p.onsuccess=()=>resolve(p.result);p.onerror=()=>reject(p.error);});
let db;
async function database(){if(db)return db;const r=indexedDB.open('week06-courseware-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('entries');db=await request(r);return db;}
export async function get(key,fallback=null){const d=await database(),v=await request(d.transaction('entries').objectStore('entries').get(key));return v??fallback;}
export async function put(key,value){const d=await database();return new Promise((resolve,reject)=>{const t=d.transaction('entries','readwrite');t.objectStore('entries').put(structuredClone(value),key);t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);});}
// Commit a fully validated import and its selected page in one transaction.
export async function putMany(entries){const d=await database();return new Promise((resolve,reject)=>{const t=d.transaction('entries','readwrite');t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('保存中止，旧材料保留'));try{for(const [key,value] of entries)t.objectStore('entries').put(structuredClone(value),key);}catch(e){t.abort();reject(e);}});}
export const state=emptyClassroom();
export const ready=(async()=>{try{Object.assign(state,await repairClassroom(await get('classroom',{})));}catch(e){state.recovery_notices=['旧课堂记录无法读取：'+e.message];}return state;})();
export let pendingSaves=0;
export async function save(){pendingSaves++;try{await put('classroom',serializable(state));window.dispatchEvent(new Event('week06-state'));}finally{pendingSaves--;}}
export async function restore(text){const parsed=JSON.parse(text);await validateThrough(parsed);state.through=structuredClone(parsed);const source=parsed.stages[0]?.value;if(source)state.material={...source};if(parsed.stages[2])state.records=[structuredClone(parsed.stages[2].value.record)];await save();return parsed;}
export async function addRecord(record){state.records.push(upgradeScores(record));await save();}

export async function clearClassroom(){
 // Imported originals are resources, not classroom runs; retain the package for reuse.
 await put('classroom',emptyClassroom());
 for(const key of Object.keys(state))delete state[key];Object.assign(state,emptyClassroom());
 const prefix=window.DECK_DATA.deck.store;for(const key of Object.keys(localStorage))if(key.startsWith(prefix))localStorage.removeItem(key);
 // Model CacheStorage belongs to separate stores and is deliberately untouched.
 window.dispatchEvent(new Event('week06-cleared'));await save();
}
