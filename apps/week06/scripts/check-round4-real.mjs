// Candidate. Actual local Chrome inference, only public Shide + six authorized pinned models.
import {gzipSync} from 'node:zlib';import {chromium} from 'playwright';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const repo=path.resolve(import.meta.dirname,'../../..'),out=repo+'/docs/week06/verification/round4-real';await fs.mkdir(out,{recursive:true});
const base=process.env.WEEK06_URL||'http://127.0.0.1:8776/pku-aihis/week06/',phase=process.env.WEEK06_REAL_PHASE||'all';
const context=await chromium.launchPersistentContext(repo+'/local-only/week06-round3-chrome',{headless:process.env.HEADLESS==='1',executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',viewport:{width:1440,height:1000}});
let report={candidate:true,date:new Date().toISOString(),browser:context.browser()?.version(),actualModelInference:true,material:'shide_public',preflight:[],runs:[],checks:[],errors:[]};
if(phase==='finish')report={...JSON.parse(await fs.readFile(out+'/real-report.json','utf8')),errors:[]};
if(phase==='d08')report={...JSON.parse(await fs.readFile(out+'/real-report.json','utf8')),errors:[],runs:JSON.parse(await fs.readFile(out+'/real-report.json','utf8')).runs.filter(r=>!r.name.startsWith('D08'))};
await context.route('**/*',async route=>{const url=route.request().url();if(url.includes('/local-materials/'))return route.abort();if(url.startsWith(base.split('/pku-aihis')[0])||url.startsWith('data:'))return route.continue();return route.abort();}); // All six files already SHA-verified in this dedicated profile; no outside requests.
const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
const active=()=>page.locator('deck-slide.current'),idle=()=>page.waitForFunction(()=>{const l=document.querySelector('deck-slide.current week06-lab');return l&&!l.busy&&!l.activating&&l.materialReady;},null,{timeout:300000});
const persist=()=>fs.writeFile(out+'/real-report.json',JSON.stringify(report,null,2)+'\n');
const zip=(name,r)=>fs.writeFile(out+'/'+name+'.json.gz',gzipSync(JSON.stringify(r),{level:9}));
async function go(id){await page.evaluate(id=>document.querySelector('deck-container').go(id),id);if(id!=='D25')await idle();assert.ok(!(await active().innerText()).includes('页面状态错误'));}
async function action(act){await active().locator(`[data-act="${act}"]`).first().click();await idle();}
async function shot(name,l=active()){const old=page.viewportSize(),box=await l.boundingBox();if(box&&box.height>old.height-300)await page.setViewportSize({width:old.width,height:Math.min(5000,Math.ceil(box.height)+400)});await l.evaluate(el=>el.scrollIntoView({block:'center'}));await l.screenshot({path:out+'/'+name+'.png',timeout:30000});if(page.viewportSize().height!==old.height)await page.setViewportSize(old);}
const last=()=>page.evaluate(async()=>(await import('./assets/runtime/storage.js')).state.records.at(-1));
async function fullRun(engine,name){console.log('START',name);const details=active().locator('.runner-panel').first();if(await details.getAttribute('open')===null)await details.locator('summary').click();await details.locator('[data-k="liveEngine"]').selectOption(engine);await details.locator('[data-k="liveMode"]').selectOption('full');await action('r2:live');const r=await last();assert.equal(r.engine.name,engine);assert.equal(r.engine.run_mode,'浏览器实时');assert.ok(r.engine.runtime.browser.version);assert.ok(r.regions.some(x=>x.text));await zip(name,r);report.runs.push({name,engine:r.engine,regions:r.regions.length});await shot(name);await persist();console.log('DONE',name,r.engine.elapsed_ms);return r;}
try{
 if(phase==='all'){
  await page.goto(base+'preflight.html');await page.waitForSelector('[data-all]');
  for(const id of ['deim-s-1024x1024.onnx','parseq-ndl-30.onnx','parseq-ndl-50.onnx','parseq-ndl-100.onnx','pp-det','pp-rec'])for(const act of ['download','session','warmup']){
   const row=page.locator(`[data-model="${id}"]`);await row.locator(`[data-action="${act}"]`).click();await page.waitForFunction(()=>!document.querySelector('button[disabled]'),null,{timeout:300000});const result=JSON.parse(await row.locator('pre').last().textContent());assert.ok(result.cache?.verified,JSON.stringify(result));assert.notEqual(result.status,'失败');if(act==='warmup')assert.equal(result.load_run,'成功');assert.equal(result.runtime.browser.version,report.browser);report.preflight.push({...result,requested_action:act});await row.screenshot({path:out+`/preflight-${id}-${act}.png`});await persist();console.log('PREFLIGHT',id,act,result.warmup?.text,result.body_line?.text);
  }
  await page.screenshot({path:out+'/preflight-all.png',fullPage:true});
 }
 await page.goto(base+'#D02');await page.waitForSelector('deck-container');await idle();
 if(phase==='all'){
  await page.evaluate(async()=>{const s=await import('./assets/runtime/storage.js');await s.clearClassroom();});await go('D02');
  const ndl=await fullRun('ndlocr-lite','D02-NDL');assert.equal(ndl.regions.length,28);await shot('D02-NDL-cards',active().locator('.task-grid'));await action('compare-replay');report.comparison=await active().locator('week06-lab').evaluate(l=>l.replayComparison);assert.ok(report.comparison.comparable);await shot('D02-NDL-comparison',active().locator('.replay-comparison'));
  const pp=await fullRun('pp-ocrv6','D02-PP');assert.equal(pp.regions.length,13);await shot('D02-PP-cards',active().locator('.task-grid'));
  await go('D03');const d3=await fullRun('ndlocr-lite','D03-NDL');const rubi=d3.regions.find(r=>r.class==='block_rubi');await active().locator(`[data-region="${rubi.id}"]`).click();await idle();assert.match(await active().locator('.region-fields').innerText(),/block_rubi/);await shot('D03-NDL-block-rubi');await shot('D03-NDL-block-rubi-fields',active().locator('.region-fields'));
  await go('D06');await shot('D06-NDL');
  await go('D07');await active().locator('[data-key="ctcTab"][data-value="actual"]').click();await idle();for(const [name,box]of[['D07-first',[585,225,50,825]],['D07-other',[185,168,40,888]]]){await active().locator('[data-k="lineChoice"]').selectOption(JSON.stringify(box));await action('r2:line-pp');const r=await last();await zip(name,r);report.runs.push({name,engine:r.engine,text:r.regions[0].text});await shot(name);}
 }
 await go('D08');
 for(const group of (phase==='finish'?[]:['body','title','mask'])){
  console.log('START D08',group);await active().locator(`[data-act="r2:controlled"][data-group="${group}"]`).click();await idle();const saved=await page.evaluate(async g=>(await import('./assets/runtime/storage.js')).state.controlled_experiments?.[g],group);assert.ok(saved,await active().locator('.lab-status').innerText());
  for(const r of saved.records){assert.deepEqual(r.engine.params.input_shape,saved.group.sourceBox.slice(2));assert.ok(r.engine.params.edits.every(e=>e.outsidePixels===0&&e.changedPixels>0));assert.ok(r.raw.network_input_png);const card=active().locator(`.controlled-condition[data-condition="${r.engine.params.condition_id}"][data-engine="${r.engine.name}"]`);await shot(`D08-${r.engine.params.condition_id}-${r.engine.name}`,card);await shot(`D08-${r.engine.params.condition_id}-${r.engine.name}-network`,card.locator('.network-preview'));report.runs.push({name:'D08-'+r.engine.params.condition_id,engine:r.engine,text:r.regions[0].text,target:r.target_evidence});}
  for(const v of saved.verification)assert.equal(v.outsidePixels,0);await zip('D08-'+group,saved);await persist();console.log('DONE D08',group,saved.records.map(r=>[r.engine.name,r.regions[0].text,r.target_evidence.choice]));
 }
 if(await active().locator('.legacy-experiments').getAttribute('open')===null)await active().locator('.legacy-experiments>summary').click();await action('r2:legacy-load');assert.equal(await active().locator('.legacy-experiments .experiment-results article').count(),6);await shot('D08-legacy',active().locator('.legacy-experiments'));
 await go('D09');await action('r2:public-pp');const d9=await last();await zip('D09-public',d9);report.runs.push({name:'D09-public',engine:d9.engine,regions:d9.regions.length});assert.equal(await active().locator('[data-k="scoreSort"]').inputValue(),'rec_score');assert.match(await active().locator('.confidence-table thead').innerText(),/DB 框内概率均值/);await shot('D09-public');await shot('D09-public-table',active().locator('.confidence-table'));
 report.checks=[];await page.reload();await page.waitForSelector('deck-container');for(let i=0;i<26;i++){const id='D'+String(i).padStart(2,'0');await go(id);if(id==='D08')await shot('refresh-D08',active().locator('.controlled-group').first().locator('h3').first());else await shot('refresh-'+id);report.checks.push({id,refresh:'passed'});}
 assert.deepEqual(report.errors,[]);await persist();
}catch(e){report.errors.push(e.stack);await persist();console.error(e);process.exitCode=1;}finally{await context.close();}
