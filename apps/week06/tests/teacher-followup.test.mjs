import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRequest,canonicalModel,apiErrorMessage} from '../../../modules/history-demo/ocr/api.mjs';
import {sessionRecordChoices} from '../../../modules/history-demo/ocr/session-records.mjs';

test('Kimi display name becomes its official API id without changing custom gateways',()=>{
 const c={preset:'kimi',baseUrl:'https://api.moonshot.cn/v1',model:' Kimi K3 ',apiKey:'fixture-secret'};
 const r=buildRequest(c,[{role:'user',content:'fixture'}],{maxTokens:1024});
 assert.equal(r.body.model,'kimi-k3');assert.equal(r.metadata.model,'kimi-k3');
 assert.equal(r.body.max_completion_tokens,32768);assert.equal(r.body.reasoning_effort,'low');
 assert.equal(canonicalModel({...c,baseUrl:'https://gateway.example/v1'}),'Kimi K3');
 const message=apiErrorMessage(404,'{"error":"Permission denied"}',c);
 assert.match(message,/Permission denied/);assert.match(message,/实际请求型号：kimi-k3/);assert.match(message,/充值/);
});
test('DeepSeek V4.1 uses the official alias and a thinking budget; does not send temperature',()=>{
 const r=buildRequest({preset:'deepseek',baseUrl:'https://api.deepseek.com',model:'Deepseek v4.1'},[{role:'user',content:'fixture'}]);
 assert.equal(r.body.model,'deepseek-flash');assert.equal(r.body.reasoning_effort,'low');assert.equal(r.body.max_tokens,32768);assert.ok(!('temperature' in r.body));
});
test('Session records match image fingerprints and default to the latest full record',()=>{
 const record=(sha,experiment=false)=>({image:{sha256:sha},engine:{params:experiment?{experiment:'line'}:{}}});
 const records=[record('other'),record('current'),record('current'),record('current',true),record('other')];
 const s=sessionRecordChoices(records,{sha256:'current'},'0');
 assert.deepEqual(s.choices.map(x=>x.value),['1','2','3']);assert.equal(s.selected,'2');
 assert.equal(sessionRecordChoices(records,{sha256:'current'},'1').selected,'1');
 assert.deepEqual(sessionRecordChoices(records,{sha256:'missing'}),{choices:[],selected:''});
 assert.deepEqual(sessionRecordChoices(records,null),{choices:[],selected:''});
});
