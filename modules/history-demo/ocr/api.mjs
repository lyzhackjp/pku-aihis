// Candidate, pure protocol adapter. Keys are deliberately excluded from request metadata.
export const COORDINATES=[['pixel-xywh','像素 [x,y,w,h]'],['normalized-xyxy','0—1000 [xmin,ymin,xmax,ymax]'],['normalized-yxyx','0—1000 [ymin,xmin,ymax,xmax]'],['pixel-yxyx','像素 [ymin,xmin,ymax,xmax]']];
export function endpoint(base,protocol='openai'){
 if(!base||/[{}]/.test(base))throw Error('请填写实际API地址；模板占位符尚未替换');const u=new URL(base.trim());
 if(u.username||u.password||u.search||u.hash)throw Error('服务地址不能含密码、查询参数或片段');if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw Error('远程API须使用HTTPS；HTTP仅限本机');
 const path=protocol==='anthropic'?'/messages':'/chat/completions';return u.href.replace(/\/$/,'').endsWith(path)?u.href.replace(/\/$/,''):u.href.replace(/\/$/,'')+path;
}
// Only normalize known display names on the provider's own endpoint. Custom
// gateways may intentionally use a different identifier and keep it verbatim.
export function canonicalModel(c){
 const model=(c.model||'').trim();let host;try{host=new URL(c.baseUrl).hostname;}catch{return model;}
 if(c.preset==='kimi'&&['api.moonshot.cn','api.moonshot.ai'].includes(host)&&/^kimi[ _-]?k3$/i.test(model))return 'kimi-k3';
 if(c.preset==='deepseek'&&host==='api.deepseek.com'&&/^deepseek[ _-]?v?4\.1(?:[ _-]?flash)?$/i.test(model))return 'deepseek-flash';
 return model;
}
export function apiErrorMessage(status,raw,c){
 const original='API返回HTTP '+status+'：'+raw;
 if(status===404&&c.preset==='kimi')return original+'\n本次实际请求型号：'+canonicalModel(c)+'。K3 的官方型号为 kimi-k3；若型号正确仍返回此错误，请检查该 Key 所属账号是否已开通 K3（官方要求完成充值，赠送代金券不能解锁）。';
 return original;
}
export function buildRequest(config,messages,{maxTokens=2048}={}){
 const c={...config,model:canonicalModel(config)};
 if(!c.model?.trim())throw Error('请填写实际模型名');const url=endpoint(c.baseUrl,c.protocol),headers={'Content-Type':'application/json'},body={model:c.model,stream:false};
 if(c.protocol==='anthropic'){
  headers['x-api-key']=c.apiKey||'';headers['anthropic-version']='2023-06-01';headers['anthropic-dangerous-direct-browser-access']='true';body.max_tokens=maxTokens;
  const systems=messages.filter(m=>m.role==='system');if(systems.length)body.system=systems.map(m=>typeof m.content==='string'?m.content:m.content.filter(p=>p.type==='text').map(p=>p.text).join('\n')).join('\n');
  body.messages=messages.filter(m=>m.role!=='system').map(m=>({role:m.role,content:typeof m.content==='string'?m.content:m.content.map(p=>{if(p.type==='text')return p;if(p.type!=='image_url')throw Error('Claude不支持此消息片段');const url=p.image_url.url,match=url.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);if(match)return {type:'image',source:{type:'base64',media_type:match[1],data:match[2]}};if(/^https:\/\//.test(url))return {type:'image',source:{type:'url',url}};throw Error('图像需有效的data URL或公开HTTPS URL');})}));
 }else{if(c.apiKey)headers.Authorization='Bearer '+c.apiKey;body.messages=structuredClone(messages);body[c.preset==='openai'?'max_completion_tokens':'max_tokens']=maxTokens;
  // Kimi K3 always thinks before answering; the limit must leave room for the answer after the reasoning (platform.kimi.com, K3 quickstart, read 2026-10-22).
  if(/^kimi-k3/i.test(c.model.trim())){delete body.max_tokens;body.max_completion_tokens=Math.max(maxTokens,32768);body.reasoning_effort=c.reasoningEffort||'low';}
  if(c.preset==='deepseek'&&c.model==='deepseek-flash'){body.max_tokens=Math.max(maxTokens,32768);body.reasoning_effort=c.reasoningEffort||'low';}}
 return {url,headers,body,metadata:{endpoint:url,provider:c.preset,protocol:c.protocol,coordinates:c.coordinates,model:c.model,body}};
}
export function parseResponse(raw,protocol){if(protocol==='anthropic'){const text=(raw.content||[]).filter(p=>p.type==='text').map(p=>p.text).join('\n');if(!text)throw Error('Messages API未返回正文');return {text,usage:raw.usage,model:raw.model,finishReason:raw.stop_reason};}const choice=raw.choices?.[0],content=choice?.message?.content,text=typeof content==='string'?content:Array.isArray(content)?content.filter(p=>p.type==='text').map(p=>p.text).join('\n'):'';if(!text)throw Error('Chat Completions未返回正文');return {text,usage:raw.usage,model:raw.model,finishReason:choice.finish_reason};}
export function convertBox(box,kind,width,height){if(!Array.isArray(box)||box.length!==4||box.some(v=>!Number.isFinite(v)))throw Error('坐标须为四个有限数值');let [a,b,c,d]=box,xywh;if(kind==='pixel-xywh')xywh=[a,b,c,d];else{if(kind.startsWith('normalized')){if(box.some(v=>v<0||v>1000))throw Error('归一化坐标超出0—1000');if(kind.endsWith('yxyx')){a=a/1000*height;b=b/1000*width;c=c/1000*height;d=d/1000*width;}else{a=a/1000*width;b=b/1000*height;c=c/1000*width;d=d/1000*height;}}if(kind.endsWith('yxyx'))xywh=[b,a,d-b,c-a];else if(kind==='normalized-xyxy')xywh=[a,b,c-a,d-b];else throw Error('未登记的坐标约定');}if(xywh[0]<0||xywh[1]<0||xywh[2]<0||xywh[3]<0||xywh[0]+xywh[2]>width+1||xywh[1]+xywh[3]>height+1)throw Error('框超出所传图像，保留回复但不绘框');return xywh;}
export function coordinatePrompt(kind,width,height){const label=COORDINATES.find(x=>x[0]===kind)?.[1];if(!label)throw Error('坐标约定未登记');return `所传图像为${width}×${height}像素。bbox严格采用${label}，以所传图像左上角为原点。`;}
export function normalizeRegions(text,kind,width,height){const raw=JSON.parse(text.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));if(!Array.isArray(raw.regions)||!raw.regions.length)throw Error('需要非空regions数组');return {...raw,regions:raw.regions.map(r=>({...r,bbox:convertBox(r.bbox,kind,width,height)}))};}
export function redact(value,secrets){let s=typeof value==='string'?value:JSON.stringify(value);for(const key of secrets.filter(Boolean))s=s.split(key).join('[REDACTED]');return typeof value==='string'?s:JSON.parse(s);}
