// Candidate. Observe the browser; describe existing preprocessing without altering it.
export function browserFromUA(userAgent=''){
 const m=userAgent.match(/(Edg|HeadlessChrome|Chrome|Chromium|Firefox)\/([\d.]+)/)||userAgent.match(/Version\/([\d.]+).*Safari/);
 return {name:m?(m[1]==='Edg'?'Edge':m[1]==='HeadlessChrome'?'Chrome':/^[\d.]+$/.test(m[1])?'Safari':m[1]):'未登记',version:m?m[2]||m[1]:'未登记',user_agent:userAgent,version_source:'userAgent（可能仅公开主版本）'};
}
let browser=browserFromUA(globalThis.navigator?.userAgent);
export const environmentReady=(async()=>{try{const h=await globalThis.navigator?.userAgentData?.getHighEntropyValues(['fullVersionList']);const brand=h?.fullVersionList?.find(x=>/Google Chrome|Microsoft Edge/.test(x.brand))||h?.fullVersionList?.find(x=>x.brand==='Chromium');if(brand)browser={...browser,name:brand.brand,version:brand.version,version_source:'userAgentData.fullVersionList'};}catch{}return browser;})();
export const modelIdentity=name=>name==='ndlocr-lite'?'ndlocr-lite:50216ccc3e600f6d0d152862c5a201fdade78112':name==='pp-ocrv6'?'pp-ocrv6:28fe5895c24fd108c19eb3e8479f4ab385fbfc62+b8f84f0b80c529de40b4fbb3544b84fa7233a513':name;
export function runtimeEnvironment(name,scope='full'){
 const ndl=name.includes('ndl')||name.includes('parseq')||name.includes('deim'),pp=name.startsWith('pp-')||name==='pp-ocrv6';
 return {browser:{...browser},preprocessing:{scope,implementation:ndl?'Canvas / OffscreenCanvas drawImage；浏览器默认平滑缩放；PARSeq 高>宽×0.8 时逆时针旋转90°':pp?'Canvas 裁切；OpenCV.js 4.10.0 INTER_LINEAR 缩放；竖行按上游规则旋转；全页检测框另经 warpPerspective':'Canvas 裁切（如使用）；服务端前处理未登记',code_path:ndl?(scope==='line'?'TextRecognizer.recognizeCropped → preprocess':'LayoutDetector → cropImageDataBatch → TextRecognizer.preprocess'):pp?(scope==='line'?'paddleLine → rec.preprocessSample':'paddle → cropByPoly → rec.preprocessSample'):'未登记'}};
}
