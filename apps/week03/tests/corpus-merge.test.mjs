import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {test} from 'node:test';
import * as math from '../src/lib/math.ts';
const {mergeCorpus}=math;
const embedding={model:'test-model',revision:'fixed',dimensions:2,normalize:true,pooling:'mean',dtype:'q8',max_tokens:512};
const doc=(id,text=id)=>({id,text,title:id,source_id:id,author:null,status:'已核'});
const initial={records:[{...doc('A'),vector:[1,0]}],manifest:{embedding},queries:[{text:'old query',vector:[1,0]}]};
const vectorPack=(records,extra={})=>({records,manifest:{embedding:{...embedding,...extra}}});

test('追加不同类别并保留既有记录、向量和查询，重复导入不增殖',()=>{
 const one=mergeCorpus(initial,{records:[doc('B')]});assert.deepEqual(one.records.map(d=>d.id),['A','B']);assert.equal(one.records[0],initial.records[0]);assert.deepEqual(one.queries,initial.queries);assert.deepEqual(one.manifest.embedding,embedding);
 const two=mergeCorpus(one,{records:[doc('B'),doc('C')]});assert.deepEqual(two.records.map(d=>d.id),['A','B','C']);assert.equal(two.summary.skipped,1);assert.equal(two.summary.added,1);
});
test('同编号文本包升级为配套向量，不丢字段、不替换旧向量',()=>{
 const text=mergeCorpus(initial,{records:[{...doc('B'),license:'CC0'}]});
 const enriched=mergeCorpus(text,vectorPack([{...doc('B'),vector:[0,1],embedding_text_sha256:'hash'}],{computed_at:'later',runtime:'another',device:'cpu'}));
 assert.equal(enriched.summary.enriched,1);assert.equal(enriched.records.length,2);assert.equal(enriched.records[1].license,'CC0');assert.deepEqual(enriched.records[1].vector,[0,1]);
 assert.equal(text.records[1].vector,undefined);
 const again=mergeCorpus(enriched,{records:[doc('B')]});assert.equal(again.summary.skipped,1);assert.deepEqual(again.records[1].vector,[0,1]);
});
test('同维度不同模型／修订／截断或归一化配置拒绝混用',()=>{
 for(const extra of [{model:'different'},{revision:'new'},{max_tokens:128},{pooling:'cls'},{dtype:'fp32'},{normalize:false}])assert.throws(()=>mergeCorpus(initial,vectorPack([{...doc('B'),vector:[0,1]}],extra)),/不兼容|归一化/);
 assert.equal(initial.records.length,1);
});
test('正文或出处同编号冲突，整次合并无副作用',()=>{
 for(const patch of [{text:'changed'},{source_id:'other'},{locator:'wrong-page'}])assert.throws(()=>mergeCorpus(initial,{records:[doc('B'),{...doc('A'),...patch}]}),/编号冲突/);
 assert.equal(initial.records.length,1);assert.equal(initial.records[0].text,'A');
});
test('不含向量的库首次加入向量包，并保留纯文本记录',()=>{
 const next=mergeCorpus({records:[doc('text')]},vectorPack([{...doc('vector'),vector:[0,1]}]));assert.equal(next.records.length,2);assert.deepEqual(next.manifest.embedding,embedding);
});
test('配套查询合并去重；只有查询带向量也须验证模型与维数',()=>{
 const next=mergeCorpus(initial,{...vectorPack([doc('B')]),queries:[{text:'new query',vector:[0,1]},{text:'old query',vector:[1,0]}]});assert.equal(next.queries.length,2);assert.equal(next.summary.queriesAdded,1);
 assert.throws(()=>mergeCorpus(initial,{records:[doc('B')],queries:[{text:'bad',vector:[1,0]}]}),/声明模型/);
 assert.throws(()=>mergeCorpus(initial,{...vectorPack([doc('B')]),queries:[{text:'bad',vector:[1,0,0]}]}),/维数/);
});
const storeJS=ts.transpileModule(readFileSync(new URL('../src/lib/store.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function makeStore(){
 const exports={},events=[];
 runInNewContext(storeJS,{exports,require:name=>name==='./math'?math:{sourceLabel:()=>''},fetch:async()=>({ok:true,json:async()=>structuredClone(initial)}),window:{dispatchEvent:e=>events.push(e.type)},CustomEvent,Map,Set,Error,JSON});return {...exports,events};
}
const file=(name,data)=>new File([JSON.stringify(data)],name,{type:'application/json'});
test('多文件追加在全部核对后提交；末文件失败不会清空或部分写入',async()=>{
 const s=makeStore();await s.loadCorpus();const before=JSON.stringify(s.state);
 await assert.rejects(s.importCorpusFiles([file('good.json',{records:[doc('B')]}),file('bad.json',{records:[doc('A','conflict')]})]),/编号冲突/);
 assert.equal(JSON.stringify(s.state),before);assert.equal(s.events.length,0);
 const result=await s.importCorpusFiles([file('one.json',{records:[doc('B')]}),file('two.json',{records:[doc('C')]})]);assert.equal(result.added,2);assert.equal(s.state.docs.length,3);assert.equal(s.events.length,1);
 await s.importCorpusFile(file('again.json',{records:[doc('B')]}));assert.equal(s.state.docs.length,3);assert.equal(s.events.length,1);
});
test('导入等待默认库载入，并接受UTF-8 BOM和JSONL空行',async()=>{
 const s=makeStore();const jsonl=new File(['\uFEFF'+JSON.stringify(doc('B'))+'\n  \n'+JSON.stringify(doc('C'))],'rows.jsonl');await s.importCorpusFile(jsonl);assert.equal(s.state.docs.length,3);assert.equal(s.state.docs[0].id,'A');assert.equal(s.state.queries[0].text,'old query');
});
