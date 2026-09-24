// Optional browser acceptance for the simplified branch. No generative-model call.
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {values:v}=parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:8772/week03/'},output:{type:'string'},'playwright-module':{type:'string',default:'playwright'},'local-run':{type:'boolean',default:false}}});
assert(v.output,'--output required');await fs.mkdir(v.output,{recursive:true});
const {chromium}=await import(v['playwright-module']);
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
const report={checked_at:new Date().toISOString(),checks:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
const check=name=>{report.checks.push(name);console.log(name);};
const go=async id=>{await page.evaluate(id=>location.hash=id,id);const s=page.locator(`[slide-id="${id}"]`);await s.waitFor({state:'visible'});return s;};
try{
 await page.goto(v.url);await page.waitForFunction(()=>document.querySelectorAll('lesson-lab.hydrated,tool-family.hydrated').length===29);
 const ids=await page.locator('deck-slide').evaluateAll(slides=>slides.map(s=>s.getAttribute('slide-id')));
 assert.equal(ids.length,29);assert.deepEqual(ids.filter(id=>+id.slice(1)>=14&&+id.slice(1)<=20),['D14','D15','D18']);
 const corpus=await (await context.request.get(new URL('assets/data/corpus.json',v.url).href)).json();
 const tools=await (await context.request.get(new URL('assets/data/tools.json',v.url).href)).json();
 for(const size of [{width:1440,height:900},{width:390,height:844}]){
  await page.setViewportSize(size);
  for(const id of ids){const s=await go(id);assert(!/TypeError:|语料载入失败/.test(await s.innerText()),id);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${id}: horizontal overflow`);}
 }
 check('29 pages on desktop and mobile; no horizontal overflow');await page.setViewportSize({width:1440,height:900});
 for(const [id,selected] of [['D14',['D14']],['D15',['D15','D16','D17']],['D18',['D18','D19','D20']]]){
  const s=await go(id);await page.screenshot({path:`${v.output}/${id}-overview.png`});
  assert.equal(await s.locator('.family-result').count(),0);
  await s.getByRole('button',{name:'查看保存示例',exact:true}).click();
  for(const tool of selected){
   await s.getByLabel('代表工具').selectOption(tool);await page.waitForFunction(({id,name})=>document.querySelector(`[slide-id="${id}"] .mode`)?.textContent.includes(name),{id,name:tools[tool].name});
   assert((await s.locator('.mode').innerText()).includes(tools[tool].name));assert((await s.locator('.mode').innerText()).includes('保存的本机实跑结果'));
   assert.equal(await s.locator('.family-hit').count(),3);await s.locator('.family-hit').first().click();
   const expected=tools[tool].result.results?.[0].id||tools[tool].result.sources[0].text.match(/片段编号:\s*([^\s]+)/)[1];
   await page.waitForFunction(({id,expected})=>document.querySelector(`[slide-id="${id}"] .family-source`)?.textContent.includes(expected),{id,expected});
   assert.equal(await s.locator('.family-source .paper-text').textContent(),corpus.records.find(d=>d.id===expected).text);
   assert((await s.locator('.family-source').innerText()).includes(expected));
   assert((await s.innerText()).includes('不会自动更新本机应用库'));
   for(const a of await s.locator('.family-resources a').all()){
    const href=await a.getAttribute('href');assert(href.startsWith('https://github.com/')||href.startsWith('assets/guides/'));
    if(href.startsWith('assets/guides/'))assert.equal((await context.request.get(new URL(href,v.url).href)).status(),200);
   }
  }
  await s.locator('.family-source').scrollIntoViewIfNeeded();await page.screenshot({path:`${v.output}/${id}-example.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await s.locator('.family-resources').scrollIntoViewIfNeeded();assert(await s.locator('tool-family').evaluate(el=>el.scrollTop>0));await page.screenshot({path:`${v.output}/${id}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:900});
 }
 check('Seven actual saved tool results, full source text/locators and install guides');
 for(const [old,current] of [['D16','D15'],['D17','D15'],['D19','D18'],['D20','D18']]){await page.evaluate(id=>location.hash=id,old);await page.waitForURL(url=>url.hash==='#'+current);}
 await go('D15');await page.getByRole('button',{name:'下一页',exact:true}).click();await page.waitForURL(url=>url.hash==='#D18');await page.getByRole('button',{name:'下一页',exact:true}).click();await page.waitForURL(url=>url.hash==='#D21');
 check('Detailed-edition aliases and simplified next-page sequence');
 await go('D15');const opened=context.waitForEvent('page');await page.getByRole('button',{name:'演讲者视图 ↗',exact:true}).click();const presenter=await opened;await presenter.waitForFunction(()=>document.querySelector('textarea[aria-label="讲解备注"]')?.value.includes('课堂不展开接口与配置细节'));assert((await presenter.getByLabel('讲解备注').inputValue()).includes('课堂不展开接口与配置细节'));await presenter.getByRole('button',{name:'下一页 →',exact:true}).click();await page.waitForURL(url=>url.hash==='#D18');await presenter.close();check('Presenter notes and navigation follow the three families');
 if(v['local-run']){
  const s=await go('D18');await s.getByLabel('代表工具').selectOption('D18');await s.getByText('已安装：在本机重跑',{exact:true}).click();await s.getByLabel('本机应用问题').selectOption('宗教');await s.getByRole('button',{name:'本地重跑',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[slide-id="D18"] .mode')?.textContent.includes('本次实际返回')||document.querySelector('[slide-id="D18"] [role="alert"]'),null,{timeout:120000});
  assert.equal(await s.locator('[role=alert]').count(),0,await s.innerText());assert((await s.locator('.mode').innerText()).includes('本次实际返回'));assert.equal(await s.locator('.family-hit').count(),3);
  report.actual_local=JSON.parse(await s.locator('.family-result pre').textContent());await page.screenshot({path:`${v.output}/D18-local.png`,fullPage:true});
  // Failure is controlled to check UI state, not claimed as a real tool failure.
  await page.route('**/api/tool/chroma',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'受控验收：服务暂不可用'})}));
  await s.getByRole('button',{name:'本地重跑',exact:true}).click();await s.locator('[role=alert]').waitFor();assert.equal(await s.locator('.family-result').count(),0);await s.getByRole('button',{name:'查看保存示例',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[slide-id="D18"] .mode')?.textContent.includes('保存的本机实跑结果'));assert((await s.locator('.mode').innerText()).includes('保存的本机实跑结果'));await page.unroute('**/api/tool/chroma');
  check('Actual Chroma retrieval; controlled failure clears live output and saved fallback is explicit');
 }
 assert.deepEqual(report.errors,[]);await fs.writeFile(v.output+'/family-browser.json',JSON.stringify(report,null,2));
}finally{await browser.close();}
