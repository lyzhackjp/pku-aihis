import presets from '../../../../../modules/history-demo/ocr/api-presets.json';
import {endpoint,buildRequest,parseResponse,redact,COORDINATES} from '../../../../../modules/history-demo/ocr/api.mjs';
export {presets,COORDINATES};
export interface ModelSettings {id:string;preset:string;baseUrl:string;apiKey:string;model:string;protocol:string;coordinates:string;proxy:boolean;vision?:any;reasoningEffort?:string}
const STORAGE_KEY='week06-model-profiles-v2';
function defaults(preset='openai',id:string=crypto.randomUUID()):ModelSettings{const p=presets.find(p=>p.id===preset)||presets[0];return {id,preset:p.id,baseUrl:p.baseUrl,model:(p as any).model||'',apiKey:'',protocol:p.protocol,coordinates:p.coordinates,proxy:false,vision:null,...((p as any).reasoning_effort?{reasoningEffort:(p as any).reasoning_effort}:{})};}
let profiles:ModelSettings[]=[];try{profiles=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]').map((p:any)=>({...defaults(p.preset,p.id),...p,apiKey:'',vision:null}));}catch{}if(!profiles.length)profiles=[defaults('kimi')];let selected=profiles[0].id;
export const getProfiles=()=>profiles.map(p=>({...p,apiKey:undefined}));
export const getModelSettings=(id=selected):ModelSettings=>({...profiles.find(p=>p.id===id)||profiles[0]});
export function selectProfile(id:string){if(!profiles.some(p=>p.id===id))throw Error('配置未登记');selected=id;window.dispatchEvent(new Event('model-settings-change'));}
/** The first profile on this preset, created if missing; used by D12 and D13 to open on Kimi K3. */
export function ensurePreset(preset:string){const found=profiles.find(p=>p.preset===preset);if(found){selected=found.id;return found.id;}return addProfile(preset).id;}
export function addProfile(preset='openai'){const p=defaults(preset);profiles.push(p);selected=p.id;persist();return p;}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(profiles.map(({apiKey,vision,...p})=>p)));}catch{}window.dispatchEvent(new Event('model-settings-change'));}
export function setModelSettings(patch:Partial<ModelSettings>,id=selected){const i=profiles.findIndex(p=>p.id===id);if(i<0)throw Error('配置未登记');let p=profiles[i];if(patch.preset&&patch.preset!==p.preset)p=defaults(patch.preset,p.id);const changed=['baseUrl','model','apiKey','protocol','proxy'].some(k=>k in patch&&(patch as any)[k]!== (p as any)[k]);profiles[i]={...p,...patch,...(changed?{vision:null}:{})};persist();}
export const isModelReady=(id=selected)=>{const c=getModelSettings(id);return !!c.model.trim()&&!!c.baseUrl.trim()&&(!!c.apiKey.trim()||/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(c.baseUrl));};
export const visionReady=(id=selected)=>!!getModelSettings(id).vision?.passed;
export const chatEndpoint=endpoint;
export function openModelSettings(){window.dispatchEvent(new Event('open-model-settings'));}
export async function chatCompletions(messages:any[],opts:{profileId?:string;maxTokens?:number;signal?:AbortSignal;visionTest?:boolean}={}){
 const c=getModelSettings(opts.profileId);if(!isModelReady(c.id))throw Error('请先填写实际服务地址、模型和Key');const hasImage=messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url'));
 if(hasImage&&!opts.visionTest&&!visionReady(c.id))throw Error('请先做看图测试（内置小图"史德 7141"），通过后才能发送材料页');
 const limit=/^kimi-k3/i.test(c.model.trim())?600000:180000,built=buildRequest(c,messages,opts),signal=opts.signal?AbortSignal.any([opts.signal,AbortSignal.timeout(limit)]):AbortSignal.timeout(limit),start=performance.now();
 const secrets=profiles.map(p=>p.apiKey),request=redact({...built.metadata,via_proxy:c.proxy},secrets),clean=(v:any)=>redact(v,secrets);let raw:any=null;
 try{const url=c.proxy?'http://127.0.0.1:8796/forward':built.url,body=c.proxy?{target:built.url,protocol:c.protocol,payload:built.body}:built.body;
  const r=await fetch(url,{method:'POST',headers:built.headers,body:JSON.stringify(body),signal,redirect:'error',credentials:'omit'});raw=clean(await r.text());if(!r.ok)throw Error('API返回HTTP '+r.status+'：'+raw.slice(0,200));let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('API回复不是合法JSON');}const answer=parseResponse(parsed,c.protocol);return {...answer,text:clean(answer.text),raw:parsed,request,model:answer.model||c.model,seconds:(performance.now()-start)/1000,profileId:c.id};
 }catch(e){const err:any=new Error(clean((e as Error).message));err.raw=raw;err.request=request;err.seconds=(performance.now()-start)/1000;err.detail=clean((e as Error).stack||String(e));throw err;}
}
export async function testVision(id=selected){setModelSettings({vision:null},id);const original=getModelSettings(id),identity=(c:ModelSettings)=>JSON.stringify([c.baseUrl,c.model,c.apiKey,c.protocol,c.proxy]);const canvas=document.createElement('canvas');canvas.width=420;canvas.height=110;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,420,110);ctx.fillStyle='#111';ctx.font='bold 56px serif';ctx.fillText('史德 7141',20,75);const messages=[{role:'user',content:[{type:'text',text:'只照录图中的全部文字和数字，不解释。'},{type:'image_url',image_url:{url:canvas.toDataURL('image/png')}}]}];const result=await chatCompletions(messages,{profileId:id,visionTest:true,maxTokens:1024}),text=result.text.normalize('NFKC').replace(/\s/g,'');const vision={passed:text.includes('史德')&&text.includes('7141'),date:new Date().toISOString(),test:'内置公开测试图：史德 7141',...result};if(identity(original)!==identity(getModelSettings(id)))throw Error('测试期间配置已变化，请重新测试');setModelSettings({vision},id);return vision;}
