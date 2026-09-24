// Optional UI acceptance: actual local source/vector input; no model generation.
import {parseArgs} from 'node:util';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {values:v}=parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:8771/week03/'},vectors:{type:'string'},output:{type:'string'},'playwright-module':{type:'string',default:'playwright'}}});
assert(v.vectors&&v.output,'--vectors (one actual vector JSON) and --output required');
const data=JSON.parse(await fs.readFile(v.vectors,'utf8'));assert(data.records.length>=3);
const {chromium}=await import(v['playwright-module']);const b=await chromium.launch({headless:true,channel:'chrome'}),p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
const payload=(name,data)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
const textOnly=d=>{const {vector,...rest}=d;return rest;};const records=data.records.slice(0,3),expected=29;
const checks=[];await fs.mkdir(v.output,{recursive:true});
try{
 await p.goto(v.url);await p.waitForFunction(()=>document.querySelectorAll('lesson-lab.hydrated').length===33);
 await p.getByRole('button',{name:'语料库管理',exact:true}).click();const overlay=p.locator('.corpus-overlay'),input=overlay.getByLabel('导入整卷语料');
 const count=()=>overlay.locator('.corpus-dialog-toolbar [role=status]').innerText();
 const upload=async (files,expected)=>{await input.setInputFiles(files);await p.waitForFunction(expected=>{const x=document.querySelector('.corpus-overlay');return !x.querySelector('input[type=file]').disabled&&[x.querySelector('.corpus-import-summary')?.textContent,x.querySelector('[role=alert]')?.textContent].some(text=>text?.includes(expected));},expected);};
 await upload([payload('one.json',{records:[textOnly(records[0])]}),payload('two.json',{records:[textOnly(records[1])]})],'新增 2 条');assert((await count()).includes(`当前 ${expected} 条`));assert((await overlay.innerText()).includes('向量检索覆盖 27 条'));checks.push('Two actual source records append to 27 defaults; partial vector coverage is explicit');
 await upload([payload('repeat.json',{records:records.slice(0,2).map(textOnly)})],'跳过重复 2 条');assert((await count()).includes(`当前 ${expected} 条`));assert((await overlay.locator('.corpus-import-summary').innerText()).includes('跳过重复 2 条'));checks.push('Repeated import does not duplicate');
 await upload([payload('upgrade.json',{manifest:data.manifest,records:records.slice(0,2)})],'补齐向量 2 条');assert((await overlay.locator('.corpus-import-summary').innerText()).includes('补齐向量 2 条'));assert((await overlay.innerText()).includes('向量检索覆盖 29 条'));checks.push('Companion vectors enrich original records without growing the corpus');
 await upload([payload('would-add.json',{records:[textOnly(records[2])]}),payload('conflict.json',{records:[{...textOnly(records[0]),text:'受控冲突测试，不应写入'}]})],'编号冲突');assert((await overlay.locator('[role=alert]').innerText()).includes('编号冲突'));assert((await count()).includes(`当前 ${expected} 条`));checks.push('Last-file ID conflict rolls back the entire batch');
 await upload([payload('wrong-model.json',{records:[records[2]],manifest:{embedding:{...data.manifest.embedding,model:'controlled-incompatible-test'}}})],'不兼容');assert((await overlay.locator('[role=alert]').innerText()).includes('不兼容'));assert((await count()).includes(`当前 ${expected} 条`));checks.push('Same-dimension incompatible model is rejected without clearing existing records');
 await p.screenshot({path:v.output+'/import-conflict.png'});
 await overlay.getByRole('button',{name:'关闭 ×',exact:true}).click();await p.evaluate(()=>location.hash='D08');const s=p.locator('[slide-id="D08"]');await s.waitFor({state:'visible'});assert.equal(await s.getByLabel('已预计算的查询').locator('option').count(),10);
 await s.getByRole('button',{name:'精确余弦',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[slide-id="D08"]').textContent.includes('条候选'));assert(await s.locator('.result').count()>0);checks.push('Original precomputed queries still run after appending and failed batches');
 await p.screenshot({path:v.output+'/mixed-corpus-vector.png'});
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'语料库管理',exact:true}).click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:v.output+'/mobile-manager.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checks,errors}));await fs.writeFile(v.output+'/append-browser.json',JSON.stringify({checked_at:new Date().toISOString(),checks,errors},null,2));
}finally{await b.close();}
