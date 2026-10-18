import {Component,h,State,Listen} from '@stencil/core';
import {getModelSettings,setModelSettings,isModelReady,chatCompletions,chatEndpoint} from '../shared/model-settings';
@Component({tag:'model-connection',shadow:false})
export class ModelConnection {
 @State() open=false;@State() c=getModelSettings();
 componentWillLoad(){(window as any).W6Chat={settings:getModelSettings,ready:isModelReady,chat:chatCompletions,endpoint:chatEndpoint};}
 @Listen('open-model-settings',{target:'window'}) show(){this.c=getModelSettings();this.open=true;}
 update(p:any){setModelSettings(p);this.c=getModelSettings();}
 render(){return this.open?<div class="model-shade"><section class="model-panel" role="dialog" aria-modal="true" aria-label="模型接入"><button class="close" onClick={()=>this.open=false}>关闭</button><h2>ChatGPT / Gemini · 兼容接口</h2><p>填写实际使用的服务地址与模型名。Key 仅留在本页内存；选定发送范围后才会调用。</p><label>API 地址<input aria-label="API地址" placeholder="兼容 OpenAI 的 API 地址" value={this.c.baseUrl} onInput={(e:any)=>this.update({baseUrl:e.target.value})}/></label><label>模型名称<input aria-label="API模型名称" value={this.c.model} onInput={(e:any)=>this.update({model:e.target.value})}/></label><label>API Key<input type="password" autoComplete="off" aria-label="API Key" value={this.c.apiKey} onInput={(e:any)=>this.update({apiKey:e.target.value})}/></label><button onClick={()=>this.update({apiKey:''})}>清除 Key</button><p role="status">{isModelReady()?'配置完整；在识读页选择范围后调用':'待接入模型'}</p></section></div>:null;}
}
