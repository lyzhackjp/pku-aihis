// Candidate: explicit opt-in real inference, only public 1926 Shide, six pinned files.
import {gzipSync} from 'node:zlib';
import {chromium} from 'playwright';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const repo=path.resolve(import.meta.dirname,'../../..'),out=repo+'/docs/week06/verification/round3-real';await fs.mkdir(out,{recursive:true});
const base=process.env.WEEK06_URL||'http://127.0.0.1:8776/pku-aihis/week06/',phase=process.env.WEEK06_REAL_PHASE||'all';
const context=await chromium.launchPersistentContext(process.env.WEEK06_CHROME_PROFILE||repo+'/local-only/week06-round3-chrome',{headless:process.env.HEADLESS==='1',executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',viewport:{width:1440,height:1000},acceptDownloads:true});
let report={date:new Date().toISOString(),browser:context.browser()?.version(),profile:'local-only/week06-round3-chrome',actualModelInference:true,material:'shide_public',preflight:[],runs:[],checks:[],errors:[]};
if(phase==='d08')report={...JSON.parse(await fs.readFile(out+'/real-report.json','utf8')),errors:[],runs:JSON.parse(await fs.readFile(out+'/real-report.json','utf8')).runs.filter(r=>!r.name.startsWith('D08-'))};
// No API calls, no private material routes, no dots/Florence model files.
await context.route('**/*',async route=>{const url=route.request().url();if(url.includes('/local-materials/'))return route.abort('blockedbyclient');if(url.startsWith(base.split('/pku-aihis')[0])||url.startsWith('data:'))return route.continue();if(/^https:\/\/(raw.githubusercontent.com|huggingface.co|cdn-lfs[^/]*\.huggingface.co|[^/]*\.xethub.hf.co)\//.test(url)&&!url.includes('Florence'))return route.continue();return route.abort('blockedbyclient');});
const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>report.errors.push(e.message));
const saveRecord=async(name,r)=>fs.writeFile(out+'/'+name+'.json.gz',gzipSync(JSON.stringify(r),{level:9}));
const persist=()=>fs.writeFile(out+'/'+(phase==='preflight'?'preflight-report':'real-report')+'.json',JSON.stringify(report,null,2)+'\n');
const active=()=>page.locator('deck-slide.current'),lab=()=>active().locator('week06-lab');
const idle=()=>page.waitForFunction(()=>{const l=document.querySelector('deck-slide.current week06-lab');return l&&!l.busy&&!l.activating;},null,{timeout:300000});
async function go(id){await page.evaluate(id=>document.querySelector('deck-container').go(id),id);if(id!=='D25'){await idle();await page.waitForFunction(()=>document.querySelector('deck-slide.current week06-lab')?.materialReady===true);}assert.ok(!(await active().innerText()).includes('页面状态错误'));}
async function shot(name,locator=active()){await locator.screenshot({path:out+'/'+name+'.png',timeout:30000});}
async function records(start=0){return page.evaluate(async start=>{const {state}=await import('./assets/runtime/storage.js');return state.records.slice(start);},start);}
const recordCount=()=>page.evaluate(async()=>(await import('./assets/runtime/storage.js')).state.records.length);
async function action(act){await active().locator(`[data-act="${act}"]`).click();await idle();assert.ok(!(await active().innerText()).includes('页面状态错误'));}
async function fullRun(engine,name){console.log('START',name);if(await active().locator('.runner-panel').getAttribute('open')===null)await active().locator('.runner-panel>summary').click();await active().locator('[data-k="liveEngine"]').selectOption(engine);await active().locator('[data-k="liveMode"]').selectOption('full');const before=await recordCount();await action('r2:live');const all=await records(before);assert.equal(all.length,1,await active().locator('.lab-status').innerText());const r=all.at(-1);assert.ok(r.regions.some(x=>x.text));console.log('DONE',name,r.engine.elapsed_ms,r.regions.length);report.runs.push({page:await active().getAttribute('slide-id'),name,engine:r.engine,lines:r.regions.length});await saveRecord(name,r);await shot(name);if(await active().locator('.task-grid').count())await shot(name+'-cards',active().locator('.task-grid'));await persist();return r;}
try{
 if(phase==='all'||phase==='preflight'){
  await page.goto(base+'preflight.html');await page.waitForSelector('[data-all]');
  for(const id of ['deim-s-1024x1024.onnx','parseq-ndl-30.onnx','parseq-ndl-50.onnx','parseq-ndl-100.onnx','pp-det','pp-rec']){
   for(const a of ['download','session','warmup']){
    console.log('START',id,a);const row=page.locator(`[data-model="${id}"]`),button=row.locator(`[data-action="${a}"]`);
    await button.click();await page.waitForFunction(()=>document.querySelectorAll('button[disabled]').length===0,null,{timeout:600000});
    const result=JSON.parse(await row.locator('pre').last().textContent());report.preflight.push(result);await row.screenshot({path:`${out}/preflight-${id}-${a}.png`});await persist();console.log('DONE',id,a,result.status,result.warmup?.text,result.body_line?.text);
    assert.notEqual(result.status,'失败',result.error);assert.ok(result.cache?.verified,'cache not verified');if(a==='warmup')assert.equal(result.load_run,'成功');
   }
  }
  await page.screenshot({path:out+'/preflight-all.png',fullPage:true});
 }
 if(phase==='preflight'){await persist();}else{
  await page.goto(base+'#D02');await page.waitForSelector('deck-container');if(phase!=='d08')await page.evaluate(async()=>{const s=await import('./assets/runtime/storage.js');await s.ready;await s.clearClassroom();});await go('D02');
  if(phase!=='d08'){const ndl=await fullRun('ndlocr-lite','D02-NDL');assert.doesNotThrow(()=>JSON.stringify(ndl));
  await page.reload();await page.waitForSelector('deck-container');await go('D02');assert.ok(await active().locator('[data-region]').count());
  const pp=await fullRun('pp-ocrv6','D02-PP');assert.ok(pp.regions.every(x=>x.class_norm===''&&x.class==='（检测不分类）'));
  await active().locator('[data-k="displayOrder"]').selectOption('vertical');await idle();await shot('D02-PP-vertical');
  await go('D03');await fullRun('ndlocr-lite','D03-NDL');await active().locator('[data-region="line-0"]').click();await idle();await shot('D03-NDL-selected');await shot('D03-NDL-crop',active().locator('.selected-crop'));await shot('D03-NDL-fields',active().locator('.region-fields'));
  await go('D06');await shot('D06-rules');
  await go('D07');
  await active().locator('[data-key="ctcTab"][data-value="actual"]').click();await idle();
  for(const [name,box] of [['D07-first',[585,225,50,825]],['D07-other',[185,168,40,888]]]){
   await active().locator('[data-k="lineChoice"]').selectOption(JSON.stringify(box));await idle();await action('r2:line-pp');const r=(await records(-1)).at(-1);assert.equal(r.engine.name,'pp-ocrv6');report.runs.push({name,engine:r.engine,text:r.regions[0].text,bbox:r.regions[0].bbox});await saveRecord(name,r);assert.equal(await active().locator('page-overlay').count(),1);await shot(name);await shot(name+'-crop',active().locator('.selected-crop'));await shot(name+'-probabilities',active().locator('.heatmap'));
  }
  }
  await go('D08');await action('r2:title-line');await action('r2:line-ndl');let r=(await records(-1)).at(-1);await saveRecord('D08-title',r);report.runs.push({name:'D08-title',engine:r.engine,text:r.regions[0].text});await shot('D08-title');await shot('D08-title-candidates',active().locator('.candidate-probs').first());await active().locator('[data-k^="position:"]').first().selectOption('1');await shot('D08-de-variant',active().locator('.candidate-probs').first());
  for(const a of ['stitch','mask']){const before=await recordCount();await action('r2:'+a);const rs=await records(before);assert.equal(rs.length,a==='stitch'?4:2);await saveRecord('D08-'+a,rs);report.runs.push(...rs.map(r=>({name:'D08-'+a,engine:r.engine,text:r.regions[0].text})));await shot('D08-'+a);await shot('D08-'+a+'-results',active().locator('.experiment-results'));}
  await go('D09');await action('r2:public-pp');const publicScoreRecord=(await records(-1))[0];await saveRecord('D09-public',publicScoreRecord);report.runs=report.runs.filter(r=>r.name!=='D09-public');report.runs.push({name:'D09-public',engine:publicScoreRecord.engine,lines:publicScoreRecord.regions.length});assert.ok(await active().locator('.confidence-table tbody tr').count()>0);assert.ok((await active().innerText()).includes('仅 NDL 识读 XML 提供'));await shot('D09-public');await shot('D09-public-table',active().locator('.confidence-table'));
  report.checks=[];await page.reload();await page.waitForSelector('deck-container');for(let i=0;i<26;i++){const id='D'+String(i).padStart(2,'0');await go(id);await shot('refresh-'+id);report.checks.push({id,refresh:'passed'});}
  assert.deepEqual(report.errors,[]);await persist();
 }
}catch(e){report.errors.push(e.stack);await persist();console.error(e);process.exitCode=1;}finally{await context.close();}
