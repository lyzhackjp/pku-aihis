// 候选。Injected operations allow protocol tests without downloading/running models.
export async function checkModel({id,inspect,initialize,warmup,expected=[],clock=()=>performance.now()},action='inspect'){
 const result={id,date:new Date().toISOString(),action,status:'未检查',cache:null,session:null,warmup:null};
 try{
  result.cache=await inspect();
  if(!result.cache.cached){result.status='未缓存';return result;}
  if(!result.cache.verified){result.status='SHA或字节数不符';return result;}
  result.status='文件已核验';if(action==='inspect')return result;
  const t=clock();result.session=await initialize();result.session.elapsed_ms=clock()-t;result.status='会话已建立';if(action==='session')return result;
  const start=clock(),output=await warmup();const text=output.text||'',normalized=text.replace(/\s/g,'');result.warmup={...output,elapsed_ms:clock()-start,expected,contains:expected.map(s=>normalized.includes(s))};
  result.status=expected.length?(result.warmup.contains.every(Boolean)?'热身包含预期文字':'热身文字未达预期'):'热身已执行（检测器不输出文字）';
 }catch(error){result.status='失败';result.error=error?.stack||String(error);}
 return result;
}
export function preflightMarkdown(report){return '# 第六周课前检查\n\n候选，未经教师确认。当前浏览器配置：'+report.user_agent+'\n\n'+report.results.map(r=>'## '+r.id+'\n\n'+r.status+'\n\n```json\n'+JSON.stringify(r,null,2)+'\n```').join('\n\n');}
