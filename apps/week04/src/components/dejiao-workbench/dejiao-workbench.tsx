import {Component,Element,Fragment,h,Listen,Prop,State,Watch} from '@stencil/core';
import {liveLibrary} from '../../lib/live-library';
import {selectedItem,selectItem} from '../../lib/research-context';
import {PatchouliRequest} from '../../lib/patchouli-pages';
const stages=[
  ['材料身份','library','从十条史料和十条研究文献选择一组；区分整期、节选、信息页和教师稿，打开实际原页。'],
  ['范围与队列','editor','记录本次问题、已读 PDF 页段和下一项动作。这个子集不是德教概念的完整史料范围。'],
  ['先独立阅读','reader','先看原页，向下进入共用阅读记录，选择页段、写自主重述并冻结本轮输入。'],
  ['机器与人工比较','reader','在本页切换到模型阅读；候选保存到本轮记录，再写自己的修订与采用理由。'],
  ['笔记与关系','search','保存来源笔记与问题索引。用“支持／限制／反例”及一句理由组织关系，不把重复出处计为独立支持。'],
  ['修订与复核','reader','在 PDF 工作台校读一处真实识别差错并提交新修订。向下检查旧判断提示，再回读并追加复核。'],
  ['备份与接续','library','从右上角材料包下载完整备份；原件、旧修订与本轮阅读记录一同保留。下次由问题和下一项任务重新进入。'],
];
@Component({tag:'dejiao-workbench',styleUrl:'dejiao-workbench.css',shadow:false})
export class DejiaoWorkbench {
  @Element() el:HTMLElement;@Prop() active=false;@State() step=0;@State() mode='workbench';@State() query='';@State() kind='全部';@State() itemId='';@State() task='';@State() note='';@State() message='';@State() tick=0;
  private off:()=>void;
  private get lib(){return liveLibrary.getLibrary();}
  componentWillLoad(){this.off=liveLibrary.subscribe(s=>{if(s==='ready'){this.tick++;this.itemId ||= selectedItem();this.loadDraft();}});}
  disconnectedCallback(){this.off?.();}
  @Watch('active') async activate(){if(this.active&&this.lib){await this.app()?.componentOnReady();await this.app()?.navigate({page:stages[this.step][1] as any,collectionId:this.collection(),keepDraft:true});}}
  @Listen('research-selection',{target:'window'}) selected(){const id=selectedItem();if(id!==this.itemId){this.itemId=id;this.loadDraft();this.tick++;}}
  @Listen('workbench-open-document',{target:'window'}) async open(e:CustomEvent){if(!this.active)return;const uri=e.detail?.uri||e.detail?.documentId;if(!uri)return;const u=new URL(uri),m=u.pathname.match(/^\/([^/]+)\/page-(\d+)\.md$/);if(!m)return;this.mode='workbench';await this.app()?.componentOnReady();await this.app()?.navigate({page:'reader',documentId:m[1],pageNumber:Number(m[2]),revisionId:u.searchParams.get('rev')||undefined,evidenceUri:uri,keepDraft:true});}
  private collection(){return this.lib?.collections().find(c=>c.name.startsWith('材料包 · 德教备用材料'))?.collection_id;}
  private app(){return this.el.querySelector('patchouli-app') as HTMLPatchouliAppElement;}
  private loadDraft(){if(!this.lib||!this.itemId)return;this.task=this.lib.toolRecord('course-dejiao-queue/'+this.itemId,{text:''}).text;this.note=this.lib.toolRecord('course-dejiao-question/'+this.itemId,{text:''}).text;}
  private async stage(i:number){this.step=i;this.mode=i===3?'model':'workbench';const current=i===2||i===5,doc=this.lib?.documents(this.itemId)[0]?.document_instance_id;await this.app()?.navigate({page:stages[i][1] as any,collectionId:this.collection(),documentId:current?doc:undefined,revisionId:current?'':undefined,evidenceUri:current?'':undefined,readerSection:'正文',keepDraft:true});}
  private async choose(id:string){this.itemId=id;selectItem(id);this.mode='workbench';this.loadDraft();await this.app()?.navigate({page:'editor',itemId:id,keepDraft:true} as PatchouliRequest);}
  private async save(kind:string,text:string){try{if(!this.itemId||!text.trim())throw Error('先选择材料，再写出具体任务或关系理由');await this.lib.saveToolRecord('course-dejiao-'+kind+'/'+this.itemId,{text,updated:new Date().toISOString()});this.message='已保存到所选题录的课程扩展记录。';}catch(e){this.message=e.message;}}
  render(){const items=this.lib?.items().filter(i=>{const origin=JSON.parse(i.custom_fields_json||'{}')['x-pku-material-origin'];return origin&&(this.kind==='全部'||origin.kind===this.kind)&&(i.title+' '+i.note).toLowerCase().includes(this.query.toLowerCase());})||[];return <div class="dejiao-layout"><div class="dejiao-main"><div class="dejiao-mode"><button class={this.mode==='workbench'?'on':''} onClick={()=>this.mode='workbench'}>助教工作台：原件与正文</button><button class={this.mode==='model'?'on':''} onClick={()=>this.mode='model'}>课程模型阅读：本轮范围</button><button onClick={()=>this.el.closest('deck-slide')?.querySelector('research-ledger')?.scrollIntoView({block:'start',behavior:'smooth'})}>阅读判断记录 ↓</button></div><div class="dejiao-surface" hidden={this.mode!=='workbench'}><patchouli-app active={this.active&&this.mode==='workbench'} /></div><div class="dejiao-surface" hidden={this.mode!=='model'}><reading-agent /></div></div><aside class="dejiao-rail"><h3>德教研究：用同一库走完研究链</h3><p>问题起点：不同材料怎样使用“德教／徳教／德敎”？哪些用法可比较，哪些尚缺依据？</p><div class="dejiao-stages">{stages.map((s,i)=><button class={this.step===i?'on':''} onClick={()=>void this.stage(i)}>{i+1}　{s[0]}</button>)}</div><p class="dejiao-current">{stages[this.step][2]}</p><input aria-label="搜索德教备用材料" placeholder="搜索德教备用题名／备注" value={this.query} onInput={(e:any)=>this.query=e.target.value}/><select aria-label="德教材料类型" onChange={(e:any)=>this.kind=e.target.value}>{['全部','史料','二手文献','教师研究产物'].map(k=><option value={k} selected={k===this.kind}>{k}</option>)}</select><select aria-label="德教备用材料" onChange={(e:any)=>void this.choose(e.target.value)}><option value="">先在右上角导入德教包</option>{items.map(i=><option value={i.item_id} selected={i.item_id===this.itemId}>{i.title}</option>)}</select><p>{items.length}条匹配 · 教师稿用于展示研究积累，不作为额外独立史料。</p>{this.step===1&&<><textarea aria-label="德教阅读队列" placeholder="本次问题：\n已读页段：\n尚缺材料：\n下一步：" value={this.task} onInput={(e:any)=>this.task=e.target.value}/><button onClick={()=>void this.save('queue',this.task)}>保存本材料的阅读接续任务</button></>}{this.step===4&&<><textarea aria-label="德教问题索引" placeholder="来源笔记／问题：\n引用的证据 URI：\n关系类型与理由：\n可能反例：\n下一步：" value={this.note} onInput={(e:any)=>this.note=e.target.value}/><button onClick={()=>void this.save('question',this.note)}>保存问题索引与关系理由</button></>}<p role="status">{this.message}</p></aside></div>;}
}
