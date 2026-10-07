import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
import {SEED_CARDS} from '../src/lib/card-box.ts';
const out=path.resolve(process.env.WEEK04_ARTIFACT_DIR||'artifacts/revision');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{});const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const page=await context.newPage(),errors=[],report={};
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
const root=id=>page.locator('deck-slide[slide-id='+id+']'),base=process.env.WEEK04_URL||'http://127.0.0.1:8774/week04/';
const go=async id=>{await page.evaluate(id=>location.hash=id,id);await root(id).waitFor({state:'visible'});};
const ready=async n=>page.waitForFunction(n=>document.querySelector('.lib-status')?.textContent.includes(n+'题录'),n,{timeout:180000});
const notes=async()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/^week04-(markdown|cardbox|skos)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])));
const modal=page.locator('material-package');
const open=async()=>{await page.locator('.deck-top').getByRole('button',{name:'材料包／备份',exact:true}).click();};
const file=async(p,input='导入材料包')=>{const previous=await modal.getByRole('status').innerText();await modal.getByLabel(input,{exact:true}).setInputFiles(p);await page.waitForFunction(previous=>{const m=document.querySelector('material-package');return m?.querySelector('[aria-busy]')?.getAttribute('aria-busy')==='false'&&m.querySelector('[role=status]')?.textContent!==previous;},previous,{timeout:180000});};
const clickConfirm=async accept=>{page.once('dialog',d=>accept?d.accept():d.dismiss());await modal.getByRole('button',{name:'确认替换并恢复',exact:true}).click();};
try{
 await page.goto(base+'#D19');await ready(4);await root('D19').locator('.cm-editor').waitFor();
 await root('D19').locator('markdown-lab').evaluate(e=>e.setText('# 同步验收\n\n主线写入的同一草稿。'));
 await go('D31');await root('D31').getByRole('button',{name:'5　笔记与关系',exact:true}).click();
 await root('D31').locator('.cm-editor').waitFor();assert((await root('D31').locator('markdown-lab').evaluate(e=>e.getText())).includes('主线写入'));
 await root('D31').locator('markdown-lab').evaluate(e=>e.setText('# 同步验收\n\n主线写入的同一草稿。\n\n综合页追加。'));
 await go('D19');assert((await root('D19').locator('markdown-lab').evaluate(e=>e.getText())).includes('综合页追加'));report.markdown_shared=true;
 await go('D31');await root('D31').getByRole('button',{name:'5　笔记与关系',exact:true}).click();await root('D31').getByRole('button',{name:'问题卡片',exact:true}).click();
 await root('D31').locator('.cb-desk').waitFor();assert.equal(await root('D31').locator('.cb-desk').count(),1);
 await root('D31').getByRole('button',{name:'7　备份与接续',exact:true}).click();await root('D31').locator('backup-lab').waitFor();assert.equal(await root('D31').locator('backup-lab').count(),1);await root('D31').getByRole('button',{name:'打开课程完整备份与恢复',exact:true}).click();await modal.locator('.material-package-overlay').waitFor({state:'visible'});await modal.getByRole('button',{name:'关闭 ×',exact:true}).click();report.D31_templates_backup=true;
 await go('D25');await root('D25').getByLabel('选择词表',{exact:true}).waitFor();assert.equal(await root('D25').getByLabel('选择词表').locator('option').count(),1);
 if(process.env.WEEK04_TTL){
  await root('D25').getByLabel('导入词表',{exact:true}).setInputFiles(process.env.WEEK04_TTL);
  await page.waitForFunction(()=>document.querySelector('deck-slide[slide-id=D25] .example-toolbar')?.textContent.includes('11 个概念'));
  assert(!(await root('D25').locator('.skos-principle').innerText()).includes('太平天国'));
  await root('D25').getByRole('button',{name:'编辑词表',exact:true}).click();await root('D25').locator('.cm-content').click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.insertText('\n# 本次切换持久验收\n');
  const select=root('D25').getByLabel('选择词表',{exact:true}),local=await select.inputValue();await select.selectOption('teacher-default');await select.selectOption(local);await root('D25').locator('.cm-content').waitFor();assert((await root('D25').locator('.cm-content').innerText()).includes('本次切换持久验收'));
  await root('D25').getByRole('button',{name:'力导向预览',exact:true}).click();await root('D25').locator('.skos-graph svg').waitFor();await page.screenshot({path:path.join(out,'D25-local-graph.png')});report.skos_switch_persistence=true;
 }
 if(process.env.WEEK04_PACK){
  const before=await notes();await open();await file(process.env.WEEK04_PACK);assert((await modal.locator('[aria-label="备份恢复预览"]').innerText()).includes('30条题录'));
  await clickConfirm(false);assert.deepEqual(await notes(),before);await ready(4);report.cancel_preserves_state=true;
  // A write failure must roll back both the native library and the separately saved drafts.
  await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){if(args[1]==='readwrite'){IDBDatabase.prototype.transaction=original;throw Error('验收注入：持久化失败');}return original.apply(this,args);};});
  await clickConfirm(true);await modal.getByRole('status').getByText('验收注入：持久化失败',{exact:false}).waitFor();assert.deepEqual(await notes(),before);await ready(4);await page.reload();await ready(4);assert.deepEqual(await notes(),before);report.failed_write_and_reload_preserve_state=true;
  const entries=unzipSync(new Uint8Array(await fs.readFile(process.env.WEEK04_PACK))),reading=JSON.parse(strFromU8(entries['reading-records.json']));reading.runs[0].task='不一致验收';entries['reading-records.json']=strToU8(JSON.stringify(reading));
  const badFile=path.join(out,'mismatched-records.zip');await fs.writeFile(badFile,zipSync(entries,{level:0}));await open();await file(badFile);await modal.getByRole('status').getByText('外层阅读记录与数据库中的原记录不一致',{exact:false}).waitFor();assert.equal(await modal.getByRole('button',{name:'确认替换并恢复',exact:true}).count(),0);await ready(4);report.inconsistent_outer_records_rejected=true;
  await file(process.env.WEEK04_PACK,'恢复完整备份');const nav=page.waitForEvent('load',{timeout:180000});await clickConfirm(true);await nav;await ready(30);report.full_restore=true;
  await go('D31');await root('D31').getByRole('button',{name:'5　笔记与关系',exact:true}).click();
  for(const [label,part] of [['核验笔记','待核主张'],['来源笔记','机器候选'],['关系记录','重新检查'],['问题索引／证据矩阵','证据矩阵']]){await root('D31').getByRole('button',{name:label,exact:true}).click();const targetPage={'核验笔记':'D19','来源笔记':'D20','关系记录':'D22','问题索引／证据矩阵':'D23'}[label];await page.waitForFunction(({part,targetPage})=>{const e=document.querySelector('deck-slide[slide-id=D31] markdown-lab');return e?.pageId===targetPage&&e.querySelector('.cm-content')?.textContent.includes(part);},{part,targetPage});const actual=await root('D31').locator('markdown-lab').evaluate(async e=>({page:e.pageId,text:await e.getText(),dom:e.querySelector('.cm-content')?.textContent}));report['note_'+targetPage]={page:actual.page,has_expected_text:actual.text.includes(part),dom_contains:actual.dom?.includes(part)};assert(actual.text.includes(part),label+' '+JSON.stringify(report['note_'+targetPage]));assert.equal(new URL(page.url()).hash,'#D31');}
  await root('D31').getByRole('button',{name:'来源笔记',exact:true}).click();await page.waitForFunction(()=>document.querySelector('deck-slide[slide-id=D31] markdown-lab')?.pageId==='D20'&&document.querySelector('deck-slide[slide-id=D31] .cm-content')?.textContent.includes('机器候选'));await root('D31').getByRole('button',{name:'预览',exact:true}).click();const link=root('D31').locator('.markdown-preview a[href^="patchouli:"]').first();await link.click();await root('D31').getByRole('button',{name:'返回Markdown笔记',exact:true}).waitFor();await root('D31').locator('.reader-canvas canvas').first().waitFor();await root('D31').getByRole('button',{name:'返回Markdown笔记',exact:true}).click();assert.equal(new URL(page.url()).hash,'#D31');report.D31_evidence_returns=true;
  await root('D31').getByRole('button',{name:'问题卡片',exact:true}).click();const expectedCards=SEED_CARDS.length+JSON.parse((await notes())['week04-cardbox-v1']||'[]').length;await page.waitForFunction(n=>document.querySelector('deck-slide[slide-id=D31] .cb-desk-header span')?.textContent.trim()===n+' 张卡片',expectedCards);assert((await root('D31').locator('.cb-desk-header').innerText()).includes(expectedCards+' 张卡片'));report.local_cards_restored=expectedCards;await page.screenshot({path:path.join(out,'D31-cards.png')});
  await root('D31').getByRole('button',{name:'7　备份与接续',exact:true}).click();const nativeDownload=page.waitForEvent('download');await root('D31').getByRole('button',{name:'ZIP备份 → 独立空库恢复 → 校验',exact:true}).click();await(await nativeDownload).saveAs(path.join(out,'roundtrip-native.zip'));await root('D31').locator('backup-lab [role=status]').getByText('30条题录、27份PDF',{exact:false}).waitFor();report.D31_native_roundtrip=true;await page.screenshot({path:path.join(out,'D31-backup.png')});
  await go('D25');await root('D25').getByLabel('选择词表').waitFor();assert.equal(await root('D25').getByLabel('选择词表').locator('option').count(),2);await root('D25').getByLabel('选择词表').selectOption('teacher-default');await page.waitForFunction(()=>document.querySelector('deck-slide[slide-id=D25] .skos-principle')?.textContent.includes('太平天国'));const imported=await root('D25').getByLabel('选择词表').locator('option').evaluateAll(es=>es.find(e=>e.value!=='teacher-default')?.value);assert(imported);await root('D25').getByLabel('选择词表').selectOption(imported);await page.waitForFunction(()=>document.querySelector('deck-slide[slide-id=D25] .example-toolbar')?.textContent.includes('11 个概念'));report.restored_two_vocabularies=true;
  await open();const dl=page.waitForEvent('download');await modal.getByRole('button',{name:'下载完整备份（数据库＋原件＋阅读记录）',exact:true}).click();const backup=path.join(out,'roundtrip-complete.zip');await(await dl).saveAs(backup);await modal.locator('[aria-busy=false]').waitFor();await file(backup);assert((await modal.locator('[aria-label="备份恢复预览"]').innerText()).includes('30条题录'));const nav2=page.waitForEvent('load',{timeout:180000});await clickConfirm(true);await nav2;await ready(30);report.second_backup_restore=true;
 }
 assert.deepEqual(errors,[]);report.errors=errors;await fs.writeFile(path.join(out,'browser-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await fs.writeFile(path.join(out,'browser-result.json'),JSON.stringify(report,null,2));await browser.close();}
