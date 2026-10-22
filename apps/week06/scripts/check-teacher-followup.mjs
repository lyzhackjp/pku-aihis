// Candidate. Public materials; API and OCR protocol substitutes are explicitly labelled.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const repo=path.resolve(import.meta.dirname,'../../..'),out=repo+'/docs/week06/verification/20261022-followup';
await fs.mkdir(out,{recursive:true});
const base='http://127.0.0.1:8776/pku-aihis/week06/';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1512,height:860}});
const report={candidate:true,date:new Date().toISOString(),browser:browser.version(),fixture:true,actualModelInference:false,checks:[],errors:[]},requests=[];
let apiFailure=true;
await context.addInitScript(()=>localStorage.setItem('week06-model-profiles-v2',JSON.stringify([{id:'legacy-kimi',preset:'kimi',baseUrl:'https://api.moonshot.cn/v1',model:'Kimi K3',protocol:'openai',coordinates:'pixel-xywh',proxy:false}])));
await context.route('**/*',async route=>{
 const req=route.request(),url=req.url();
 if(url.endsWith('/chat/completions')){
  const body=req.postDataJSON();requests.push({model:body.model,max_tokens:body.max_tokens,max_completion_tokens:body.max_completion_tokens,reasoning_effort:body.reasoning_effort});
  return route.fulfill({status:apiFailure?404:200,contentType:'application/json',body:JSON.stringify(apiFailure?{error:{message:'Not found the model Kimi K3 or Permission denied',type:'resource_not_found_error'}}:{model:body.model,choices:[{message:{content:body.model==='deepseek-flash'?'{"changes":[]}':JSON.stringify(body.messages).includes('regions')?JSON.stringify({regions:[{id:'fixture-cloud',bbox:[10,10,50,200],category:'Text',text:'回归夹具：甲乙',order:0}]}):'史德 7141'}}]})});
 }
 if(url.endsWith('/assets/ocr/engines.js'))return route.fulfill({contentType:'text/javascript',body:`
 export const models={'pp-det':{revision:'synthetic-followup-fixture'},'pp-rec':{revision:'synthetic-followup-fixture'}};
 function line(im,progress,options={}){globalThis.__lineCalls||=[];globalThis.__lineCalls.push({w:im.width,h:im.height,auto:options.autoRotate,manual:options.manualRotation});let n=globalThis.__lineCalls.length;return {text:'回归夹具-'+n,score:.8,rec_score:.8,rec_score_source:'回归夹具',chars:[],positions:[],trace:{positions:[]},input:{width:im.width,height:im.height}};}
 export const runNDLLine=line,runPaddleLine=line;
 export async function runPaddle(){return {rec_polys:[[[585,225],[635,225],[635,1050],[585,1050]]],rec_texts:['回归夹具：PP竖排行'],rec_scores:[.8],rec_chars:[[]],rec_traces:[{positions:[]}],detection_scores:[.9]};}
 `});
 if(url.startsWith(new URL(base).origin)&&!url.includes('/local-materials/')&&req.method()==='GET')return route.continue();
 return route.abort();
});
const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
const current=()=>page.locator('deck-slide.current'),lab=()=>current().locator('week06-lab');
async function idle(){await page.evaluate(async()=>{window.__w6testStorage=await import('./assets/runtime/storage.js');window.__w6testServices=await import('./assets/runtime/services.js');});await page.waitForFunction(()=>{const s=window.__w6testStorage,l=document.querySelector('deck-slide.current week06-lab');return !s.pendingSaves&&!l?.busy&&!l?.activating&&(!l||l.materialReady);});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function go(id){await page.evaluate(id=>document.querySelector('deck-container').go(id),id);await page.locator(`deck-slide.current[slide-id="${id==='D13'?'D12':id}"]`).waitFor();await idle();}
async function click(selector){await current().locator(selector).first().click();await idle();}
async function shot(name){await page.screenshot({path:out+'/'+name});}
async function check(name,fn){try{const detail=await fn();report.checks.push({name,result:'passed',detail});}catch(e){report.checks.push({name,result:'failed',error:e.stack,status:await lab().evaluate(l=>l.status).catch(()=>null)});}console.log(name+': '+report.checks.at(-1).result);}
try{
 await page.goto(base+'#D13');await page.waitForSelector('deck-container');await idle();
 await check('D12/D13 one page, preserved alias, result and C tabs',async()=>{
  assert.equal(await page.locator('deck-slide').count(),25);assert.equal(await current().getAttribute('slide-id'),'D12');assert.ok(page.url().endsWith('#D12'));
  for(const tab of ['web','reference','evidence']){await click(`[data-v5-tab="d12Tab"][data-value="${tab}"]`);assert.ok((await current().innerText()).length>200);}
  await page.evaluate(async()=>{const {state}=await import('./assets/runtime/storage.js'),I=await import('./assets/modules/ocr/imports.mjs'),S=await import('./assets/runtime/services.js');state.imports={reading:I.parseReading('甲乙','fixture.txt',S.meta('manual','教学构造','fixture')),reference:I.parseReference('甲丙','reference.txt'),mapping:{}};await(await import('./assets/runtime/import-panel.js')).synchronize();});
  await click('[data-v5-tab="d12ResultTab"][data-value="diff"]');assert.equal(await current().locator('.difference-cards select').count(),1);
  await current().locator('.difference-cards select').selectOption('其他');await idle();
  await page.evaluate(async()=>{const {state}=await import('./assets/runtime/storage.js');state.imports.reference.lines[0].text='甲丁';await(await import('./assets/runtime/import-panel.js')).synchronize();});await idle();
  assert.equal(await current().locator('.difference-cards select').inputValue(),'');await shot('fixture-D12-merged.png');
  await page.evaluate(()=>document.querySelector('deck-container').go(document.querySelector('deck-container').cur+1));assert.equal(await current().getAttribute('slide-id'),'D14');
 });
 await check('Kimi legacy display name, 404 diagnostic and successful vision fixture',async()=>{
  await go('D12');assert.equal(await page.evaluate(()=>window.W6Chat.settings().model),'kimi-k3');
  await click('[data-kimi="key"]');await page.getByLabel('API Key',{exact:true}).fill('protocol-fixture-key');await page.locator('.model-panel .close').click();
  await click('[data-kimi="test"]');assert.match(await current().locator('.lab-status').innerText(),/Permission denied/);assert.match(await current().locator('.lab-status').innerText(),/实际请求型号：kimi-k3/);assert.equal(requests.at(-1).model,'kimi-k3');
  await shot('fixture-D12-404.png');apiFailure=false;await click('[data-kimi="test"]');assert.match(await current().locator('.lab-status').innerText(),/测试通过/);
  assert.equal(requests.at(-1).max_completion_tokens,32768);await current().locator('[data-k="consent"]').check();await idle();assert.equal(await current().locator('[data-act="r2:cloud"]').isEnabled(),true);await click('[data-act="r2:cloud"]');assert.equal(await page.evaluate(()=>window.__w6testStorage.state.imports.reading.lines[0].text),'回归夹具：甲乙');assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('protocol-fixture-key'));
 });
 await check('D21 DeepSeek preset and actual postprocess request path via protocol fixture',async()=>{
  await go('D21');await click('[data-act="r2:deepseek"]');assert.equal(await page.getByLabel('API模型名称').inputValue(),'deepseek-flash');
  await page.getByLabel('API Key',{exact:true}).fill('protocol-fixture-key');await page.locator('.model-panel .close').click();
  await page.evaluate(async()=>{const l=document.querySelector('deck-slide.current week06-lab'),S=await import('./assets/runtime/services.js');await S.postprocess('text',true,{profileId:l.v.apiProfile});});await idle();
  assert.equal(requests.at(-1).model,'deepseek-flash');assert.equal(requests.at(-1).max_tokens,32768);await shot('fixture-D21-deepseek.png');
 });
 await check('D22 session list excludes other images; selected matching record imports',async()=>{
  await go('D22');await page.evaluate(async()=>{const {state,save}=await import('./assets/runtime/storage.js'),S=await import('./assets/runtime/services.js');const wrong=structuredClone(S.lastRecord());wrong.image.sha256='f'.repeat(64);wrong.image.source.material_id='foreign-fixture';state.records.unshift(wrong);await save();});await idle();
  const panel=current().locator('ocr-import-panel').first();await panel.locator('summary').first().click();
  assert.ok(!(await panel.locator('[data-field="record"]').innerText()).includes('foreign-fixture'));
  await panel.locator('[data-import-act="session"]').click();await idle();
  await page.waitForFunction(()=>{const {state}=window.__w6testStorage;return state.imports?.reading?.record.image.sha256===state.material?.image.sha256;});
  assert.ok(!(await current().innerText()).includes('导入失败'));await shot('D22-matching-record.png');
 });
 await check('D18 two runs show only the latest pair, preserve saved history',async()=>{
  await go('D18');await lab().evaluate(l=>{l.v.lineBox='[585,225,50,825]';});await click('[data-act="r2:font-compare"]');await page.waitForFunction(()=>document.querySelector('deck-slide.current week06-lab').experiments?.length===2);await idle();const first=await lab().evaluate(l=>l.experiments.map(r=>r.regions[0].text));
  await click('[data-act="r2:font-compare"]');await page.waitForFunction(()=>document.querySelector('deck-slide.current week06-lab').experiments?.length===2);await idle();const second=await lab().evaluate(l=>l.experiments.map(r=>r.regions[0].text));assert.equal(first.length,2);assert.equal(second.length,2);assert.ok(second.every(x=>!first.includes(x)));await shot('fixture-D18-latest.png');
 });
 await check('D17 PP vertical treatments select correct engine and rotation; whole-page action',async()=>{
  await go('D17');await lab().evaluate(l=>{l.v.lineBox='[585,225,50,825]';});await click('[data-key="directionEngine"][data-value="pp-ocrv6"]');
  await click('[data-act="r2:rotate-three"]');await page.waitForFunction(()=>document.querySelector('deck-slide.current week06-lab').experiments?.length===3);await idle();const calls=await page.evaluate(()=>globalThis.__lineCalls.slice(-3));assert.deepEqual(calls.map(c=>[c.w,c.h,c.auto,c.manual]),[[50,825,false,0],[825,50,false,-90],[50,825,true,0]]);
  assert.ok(await lab().evaluate(l=>l.experiments.every(r=>r.engine.name==='pp-ocrv6')));await shot('fixture-D17-pp-vertical.png');
  await click('[data-act="r2:direction-page"]');assert.equal(await page.evaluate(async()=>(await import('./assets/runtime/services.js')).lastRecord('pp-ocrv6').regions[0].text),'回归夹具：PP竖排行');return calls;
 });
 await check('Refresh and all original 26 links (25 pages plus D13 alias)',async()=>{
  await page.reload();await page.waitForSelector('deck-container');for(let i=0;i<26;i++){await go('D'+String(i).padStart(2,'0'));assert.ok(!(await current().innerText()).includes('页面状态错误'));}
  for(const id of ['D12','D17','D18','D21','D22']){await page.setViewportSize({width:390,height:844});await go(id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('narrow-'+id+'.png');}
 });
 assert.deepEqual(report.errors,[]);
}catch(e){report.errors.push(e.stack);}finally{report.requests=requests;await fs.writeFile(out+'/regression.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
if(report.errors.length||report.checks.some(x=>x.result==='failed'))process.exitCode=1;
