export const VOCABULARY_KEY='week04-skos-datasets/v1';
export interface Vocabulary {id:string;name:string;source:string;original:string;text:string;}
export interface VocabularyStore {schema:'pku-skos-datasets/v1';active:string;entries:Vocabulary[];}
export function loadVocabularies(template:string,saved:string|null,legacy:string|null):VocabularyStore{
  let store:VocabularyStore=saved?JSON.parse(saved):{schema:'pku-skos-datasets/v1',active:'teacher-default',entries:[{id:'teacher-default',name:'助教：近代中国史主题词表',source:'公开课堂示例',original:template,text:template}]};
  if(store.schema!=='pku-skos-datasets/v1'||!Array.isArray(store.entries)||!store.entries.length||store.entries.some(v=>['id','name','source','original','text'].some(k=>typeof v[k]!=='string'))||new Set(store.entries.map(v=>v.id)).size!==store.entries.length)throw Error('多词表草稿格式不受支持，请保留备份后重新导入');
  store=structuredClone(store);
  if(!store.entries.some(v=>v.id==='teacher-default'))store.entries.unshift({id:'teacher-default',name:'助教：近代中国史主题词表',source:'公开课堂示例',original:template,text:template});
  // Keep the legacy source untouched. An edited draft is not identified by guessed subject matter.
  if(legacy&&legacy!==template&&!store.entries.some(v=>v.source==='旧版草稿迁入'&&v.original===legacy)){
    const id=crypto.randomUUID();store.entries.push({id,name:'本地：旧版词表草稿',source:'旧版草稿迁入',original:legacy,text:legacy});store.active=id;
  }
  if(!store.entries.some(v=>v.id===store.active))store.active='teacher-default';
  return store;
}
export function addVocabulary(store:VocabularyStore,text:string,name:string){
  const known=store.entries.find(v=>v.original===text&&v.source!=='公开课堂示例');
  if(known)return {...store,active:known.id};
  const id=crypto.randomUUID();return {...store,active:id,entries:[...store.entries,{id,name,source:'本机文件导入',original:text,text}]};
}
