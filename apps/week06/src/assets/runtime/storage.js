import {upgradeScores} from '../modules/ocr/record.mjs';
import {emptyThrough,validateThrough} from '../modules/ocr/through.mjs';
const request=p=>new Promise((resolve,reject)=>{p.onsuccess=()=>resolve(p.result);p.onerror=()=>reject(p.error);});
let db;
async function database(){if(db)return db;const r=indexedDB.open('week06-courseware-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('entries');db=await request(r);return db;}
export async function get(key,fallback=null){const d=await database(),v=await request(d.transaction('entries').objectStore('entries').get(key));return v??fallback;}
export async function put(key,value){const d=await database();return new Promise((resolve,reject)=>{const t=d.transaction('entries','readwrite');t.objectStore('entries').put(structuredClone(value),key);t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);});}
export const state={through:emptyThrough(),material:null,records:[],runs:[],classifications:{}};
export const ready=(async()=>{Object.assign(state,await get('classroom',{}));await validateThrough(state.through);state.records=state.records.map(upgradeScores);return state;})();
export async function save(){await put('classroom',state);window.dispatchEvent(new Event('week06-state'));}
export async function restore(text){const parsed=JSON.parse(text);await validateThrough(parsed);state.through=structuredClone(parsed);const source=parsed.stages[0]?.value;if(source)state.material={...source};if(parsed.stages[2])state.records=[structuredClone(parsed.stages[2].value.record)];await save();return parsed;}
export async function addRecord(record){state.records.push(structuredClone(record));await save();}
