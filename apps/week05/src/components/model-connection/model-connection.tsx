import {Component,h,State,Listen} from '@stencil/core';
import {getModelSettings,setModelSettings,isModelReady,chatCompletions,chatEndpoint} from '../shared/model-settings';
@Component({tag:'model-connection',shadow:false})
export class ModelConnection {
 @State() open=false;@State() c=getModelSettings();@State() status='';
 componentWillLoad(){(window as any).W5Chat={settings:getModelSettings,ready:isModelReady,chat:chatCompletions,endpoint:chatEndpoint};}
 @Listen('open-model-settings',{target:'window'}) show(){this.c=getModelSettings();this.open=true;}
 @Listen('keydown',{target:'window'}) key(e:KeyboardEvent){if(this.open&&e.key==='Escape'){e.stopImmediatePropagation();this.open=false;}}
 update(p:any){if((window as any).W5CloudBusy){this.status='本轮正在运行，完成后再修改模型配置。';return;}setModelSettings(p);this.c=getModelSettings();this.status='已应用；端点与模型保存在本机，Key只在本页内存。';}
 render(){if(!this.open)return null;return <div class="model-overlay" role="dialog" aria-modal="true" aria-label="模型接入设置"><section class="model-dialog"><div class="lab-toolbar"><h2>模型接入</h2><button onClick={()=>this.open=false}>完成设置 ×</button></div><p>沿用课程共用的兼容API接入。HyDE、上下文补写、图检索及阅读任务使用同一配置。</p><h3>一、生成模型（OpenAI兼容 chat/completions）</h3><div class="model-fields"><label>API基础地址<input aria-label="API基础地址" placeholder="https://api.deepseek.com" value={this.c.baseUrl} onInput={(e:any)=>this.update({baseUrl:e.target.value})}/></label><label>模型名称<input aria-label="API模型名称" placeholder="deepseek-chat" value={this.c.model} onInput={(e:any)=>this.update({model:e.target.value})}/></label><label>API Key<input type="password" autoComplete="off" aria-label="API Key" value={this.c.apiKey} onInput={(e:any)=>this.update({apiKey:e.target.value})}/></label><button onClick={()=>this.update({apiKey:''})}>清除Key</button><p>{isModelReady()?'配置完整，可发起实际请求':'填端点、模型与Key；本机无认证端点可留空Key'}</p></div><a href="assets/revision/runs.html" target="_blank" rel="noopener">本机实际运行记录 ↗</a><p role="status">{this.status}</p><h3>二、浏览器嵌入</h3><p>MiniLM多语模型（paraphrase-multilingual-MiniLM-L12-v2），384维、固定q8版本；材料只在浏览器内计算。</p><embedding-status></embedding-status></section></div>;}
}
