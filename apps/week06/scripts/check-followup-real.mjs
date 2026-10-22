// Candidate. Only cached pinned NDL/PP models and public Shide; no external requests.
import {chromium} from 'playwright';
import {gzipSync} from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const repo=path.resolve(import.meta.dirname,'../../..'),out=repo+'/docs/week06/verification/20261022-followup/real';await fs.mkdir(out,{recursive:true});
const base='http://127.0.0.1:8776/pku-aihis/week06/';
const context=await chromium.launchPersistentContext(repo+'/local-only/week06-round3-chrome',{headless:false,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',viewport:{width:1512,height:860}});
const page=await context.newPage();page.setDefaultTimeout(180000);
const report={candidate:true,date:new Date().toISOString(),browser:context.browser().version(),actualModelInference:true,material:'shide_public',runs:[],errors:[]};
await context.route('**/*',route=>route.request().url().startsWith(new URL(base).origin)&&!route.request().url().includes('/local-materials/')&&route.request().method()==='GET'?route.continue():route.abort());
page.on('pageerror',e=>report.errors.push(e.message));
const current=()=>page.locator('deck-slide.current'),lab=()=>current().locator('week06-lab');
async function idle(){await page.evaluate(async()=>{window.__w6testStorage=await import('./assets/runtime/storage.js');window.__w6testServices=await import('./assets/runtime/services.js');});await page.waitForFunction(()=>{const s=window.__w6testStorage,l=document.querySelector('deck-slide.current week06-lab');return !s.pendingSaves&&!l.busy&&!l.activating&&l.materialReady;});}
async function go(id){await page.evaluate(id=>document.querySelector('deck-container').go(id),id);await current().locator(`week06-lab[page-id="${id}"]`).waitFor();await idle();assert.equal(await page.evaluate(async()=>(await import('./assets/runtime/storage.js')).state.material.image.source.material_id),'shide_public');}
async function saveRun(name,r){assert.equal(r.image.source.material_id,'shide_public');assert.equal(r.engine.run_mode,'浏览器实时');await fs.writeFile(out+'/'+name+'.json.gz',gzipSync(JSON.stringify(r)));report.runs.push({name,engine:r.engine,text:r.regions.map(x=>x.text),regions:r.regions.length,input:r.regions[0]?.recognition_trace?.input?{width:r.regions[0].recognition_trace.input.width,height:r.regions[0].recognition_trace.input.height,rotation:r.regions[0].recognition_trace.input.rotation}:null});}
try{
 await page.goto(base+'#D17');await page.waitForSelector('deck-container');await go('D17');
 await lab().evaluate(l=>{l.v.lineBox='[585,225,50,825]';l.v.directionEngine='pp-ocrv6';l.render();});
 console.log('D17 PP vertical: start');await current().locator('[data-act="r2:rotate-three"]').click();await page.waitForFunction(()=>document.querySelector('deck-slide.current week06-lab').experiments?.length===3||(!document.querySelector('deck-slide.current week06-lab').busy&&!document.querySelector('deck-slide.current week06-lab').status.includes('处理中')));await idle();
 const rs=await lab().evaluate(l=>l.experiments);assert.equal(rs?.length,3,await lab().evaluate(l=>l.status));for(let i=0;i<rs.length;i++)await saveRun('D17-PP-'+i,rs[i]);
 await page.screenshot({path:out+'/D17-PP-vertical.png'});await current().locator('.experiment-results').screenshot({path:out+'/D17-PP-three-conditions.png'});console.log('D17 PP vertical: done');
 await current().locator('[data-act="r2:direction-page"]').click();await page.waitForFunction(()=>{const S=window.__w6testServices;return S.lastRecord('pp-ocrv6')?.engine.page_id==='D17'&&!S.lastRecord('pp-ocrv6')?.engine.params.experiment;});await idle();const full=await page.evaluate(()=>window.__w6testServices.lastRecord('pp-ocrv6'));assert.ok(!full.engine.params.experiment);assert.ok(full.regions.length>1);await saveRun('D17-PP-full',full);await current().locator('.direction-reading').screenshot({path:out+'/D17-PP-page.png'});
 await go('D18');await lab().evaluate(l=>{l.v.lineBox='[585,225,50,825]';l.render();});
 for(let repeat=1;repeat<=2;repeat++){
  console.log('D18 pair',repeat);const old=await lab().evaluate(l=>l.experiments?.at(-1)?.engine.date);await current().locator('[data-act="r2:font-compare"]').first().click();await page.waitForFunction(old=>{const l=document.querySelector('deck-slide.current week06-lab');return l.experiments?.length===2&&l.experiments.at(-1).engine.date!==old;},old);await idle();
  const records=await lab().evaluate(l=>l.experiments);assert.equal(records.length,2);for(const r of records)await saveRun('D18-'+repeat+'-'+r.engine.name,r);await page.screenshot({path:out+'/D18-latest-'+repeat+'.png'});
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.errors.push(e.stack);console.error(e.message);}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await context.close();}
if(report.errors.length)process.exitCode=1;
