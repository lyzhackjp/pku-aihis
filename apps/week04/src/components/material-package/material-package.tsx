import {Component,Fragment,h,Prop,State,Event,EventEmitter} from '@stencil/core';
import {liveLibrary} from '../../lib/live-library';
import {prepareMaterialPack,importPreparedPack,PreparedPack} from '../../lib/material-pack';
import {browserNotes,validateBrowserNotes,restoreBrowserNotes} from '../../lib/browser-notes';
import {readRuns} from '../../lib/research-records';
import {selectItem} from '../../lib/research-context';
import {downloadBytes} from '../shared/download';
import {zipSync,strToU8} from 'fflate';
import {Library} from '../../lib/library';
import {inspectClassroomArchive,sameReadingRecords,ClassroomArchive} from '../../lib/archive-kind';
@Component({tag:'material-package',styleUrl:'material-package.css',shadow:false})
export class MaterialPackage {
  @Prop() opened=false;@Event() packageClosed:EventEmitter<void>;
  @State() prepared:PreparedPack;@State() restoration:ClassroomArchive;@State() restoreSummary='';@State() message='';@State() busy=false;
  private async prepare(data:Uint8Array){
    this.prepared=undefined;this.restoration=undefined;this.busy=true;
    try{
      const archive=inspectClassroomArchive(data);
      if(archive.kind==='material'){
        this.prepared=await prepareMaterialPack(liveLibrary.getLibrary(),data,text=>this.message=text);
        this.message='材料追加包校验通过。新增 '+this.prepared.records.length+' 条；已存在 '+this.prepared.skipped+' 条。确认后追加入库。';
      }else{
        validateBrowserNotes(archive.notes);
        this.message='已识别为'+(archive.kind==='complete'?'课程完整备份':'浏览器原生备份')+'，正在独立副本中校验…';
        const lib=liveLibrary.getLibrary(),copy=new Library();copy.sqlite=lib.sqlite;copy.persist=async()=>{};copy.db=copy.openDatabase();copy.migrate();
        try{
          await copy.restore(archive.native,true);copy.checkIntegrity();
          const runs=readRuns(copy);
          if(archive.reading&&(archive.reading.libraryId!==copy.libraryId||!sameReadingRecords(archive.reading.runs,runs)))throw Error('外层阅读记录与数据库中的原记录不一致，未写入当前库');
          for(const key of ['week04-cardbox-v1','week04-skos-datasets/v1','week04-reading-chat'])if(archive.notes.values[key])try{JSON.parse(archive.notes.values[key]);}catch{throw Error('独立草稿JSON格式错误：'+key);}
          this.restoreSummary=`${copy.items().length}条题录 · ${Object.keys(copy.files).length}份PDF · ${copy.rows('select count(*) n from pages')[0].n}页 · ${runs.length}轮阅读 · ${Object.keys(archive.notes.values).length}项独立草稿`;
          this.restoration=archive;this.message='校验通过，当前库尚未改变。确认恢复将替换书库和课程草稿。';
        }finally{copy.db.close();}
      }
    }catch(e){this.message=e.message;}finally{this.busy=false;}
  }
  private async commit(){if(!this.prepared||this.busy)return;this.busy=true;try{const ids=await importPreparedPack(liveLibrary.getLibrary(),this.prepared);if(ids[0])selectItem(ids[0]);this.message='已追加入库 '+ids.length+' 条；原有文献与编辑保留。';this.prepared=undefined;}catch(e){this.message=e.message;}finally{this.busy=false;}}
  private async backup(){this.busy=true;try{const lib=liveLibrary.getLibrary(),native=await lib.backup();downloadBytes(zipSync({'patchouli.zip':native,'browser-drafts.json':strToU8(JSON.stringify(browserNotes())),'reading-records.json':strToU8(JSON.stringify({schema:'pku-reading-records/v1',libraryId:lib.libraryId,runs:readRuns(lib)})),'README.txt':strToU8('Patchouli.zip 含SQLite与全部PDF。课程阅读记录保存在SQLite的x-pku-research扩展中，并在reading-records.json重复导出供核查。browser-drafts.json 含独立Markdown、卡片、聊天、词表及概念导入稿；不含API配置或密钥。概念原稿也可在概念附录另行下载。')},{level:0}),'week04-complete-backup.zip');this.message='完整备份已下载：SQLite、PDF、阅读轮次、候选、人工版本与复核。';}catch(e){this.message=e.message;}finally{this.busy=false;}}
  private async restore(){
    if(!this.restoration||this.busy)return;
    if(!confirm('恢复会替换当前书库、原件及课程草稿。请先下载当前完整备份。确认恢复？')){this.message='已取消恢复；当前库与草稿保持不变。';return;}
    this.busy=true;let undo:()=>void;
    try{
      undo=restoreBrowserNotes(this.restoration.notes);
      await liveLibrary.getLibrary().restore(this.restoration.native,true);
      window.dispatchEvent(new CustomEvent('course-reading-change'));
      this.message='已恢复数据库、原件与'+(this.restoration.kind==='complete'?'独立草稿':'原生层记录（独立草稿已清空）')+'；即将刷新。';
      this.restoration=undefined;setTimeout(()=>location.reload(),800);
    }catch(e){undo?.();this.message=e.message;}finally{this.busy=false;}
  }
  render(){return <div hidden={!this.opened} class="material-package-overlay" role="dialog" aria-modal="true" aria-busy={String(this.busy)} aria-label="材料包与完整备份"><section class="material-package-dialog"><header><div><h2>材料包与完整备份</h2><p>两入口自动识别：材料包确认追加；备份校验后确认替换。原件和研究稿仅在本机使用。</p></div><button disabled={this.busy} onClick={()=>this.packageClosed.emit()}>关闭 ×</button></header><div class="package-actions"><label>导入 ZIP（自动识别材料包／备份）<input aria-label="导入材料包" type="file" accept=".zip" disabled={this.busy} onChange={async(e:any)=>{const file=e.target.files?.[0];e.target.value='';if(file)await this.prepare(new Uint8Array(await file.arrayBuffer()));}}/></label></div>
    {this.prepared&&<><p>{this.prepared.manifest.title} · {this.prepared.manifest.description}</p><div class="package-preview"><table><thead><tr><th>材料</th><th>类型</th><th>实际 PDF 页数</th><th>范围提示</th></tr></thead><tbody>{this.prepared.records.map(r=><tr><td>{r.title}</td><td>{r.kind}</td><td>{r.attachments.reduce((n,a)=>n+a.pages.length,0)||'工作稿'}</td><td>{r.note||'预处理文字仍须与原页核对'}</td></tr>)}</tbody></table></div><button disabled={this.busy||!this.prepared.records.length} onClick={()=>void this.commit()}>确认追加入库</button></>}
    {this.restoration&&<section class="package-preview" aria-label="备份恢复预览"><h3>{this.restoration.kind==='complete'?'课程完整备份':'浏览器原生备份'}</h3><p>{this.restoreSummary}</p><p>{this.restoration.kind==='complete'?'包含数据库中的阅读轮次与外层独立草稿；外层阅读JSON已与数据库逐项核对。':'含SQLite内阅读记录与PDF；不含独立Markdown、卡片或词表。恢复时清空当前课程草稿，避免混入旧库。'}</p><button disabled={this.busy} onClick={()=>void this.restore()}>确认替换并恢复</button><button disabled={this.busy} onClick={()=>{this.restoration=undefined;this.message='已取消；当前库保持不变。';}}>取消恢复预览</button></section>}
    <hr/><div class="package-actions"><button disabled={this.busy} onClick={()=>void this.backup()}>下载完整备份（数据库＋原件＋阅读记录）</button><label>恢复完整备份<input aria-label="恢复完整备份" type="file" accept=".zip" disabled={this.busy} onChange={(e:any)=>{const file=e.target.files?.[0];e.target.value='';if(file)void file.arrayBuffer().then(bytes=>this.prepare(new Uint8Array(bytes)));}}/></label></div><p role="status">{this.busy?'处理中，请保留此页。 ':''}{this.message}</p></section></div>;}
}
