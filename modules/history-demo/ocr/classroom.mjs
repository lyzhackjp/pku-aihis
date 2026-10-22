import {serializable} from './serializable.mjs';
import {upgradeScores} from './record.mjs';
import {emptyThrough,validateThrough} from './through.mjs';
export const emptyClassroom=()=>({through:emptyThrough(),material:null,records:[],runs:[],classifications:{}});
export async function repairClassroom(saved) {
 const value=serializable(saved||{}),result={...emptyClassroom(),...value},notices=[];
 result.records=[];
 for(const [i,record] of (Array.isArray(value.records)?value.records:[]).entries()) {
  try{result.records.push(upgradeScores(record));}catch(e){notices.push('跳过旧记录 '+i+'：'+e.message);}
 }
 try{await validateThrough(result.through);}catch(e){result.through=emptyThrough();notices.push('旧贯穿记录无法恢复：'+e.message);}
 result.recovery_notices=[...new Set([...(value.recovery_notices||[]),...notices])];
 return result;
}
