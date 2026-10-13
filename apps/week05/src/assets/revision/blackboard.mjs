export async function runBlackboard(S,records,question,{allowCloud=false}={}){
 const board=[];
 const call=async(role,task,q)=>{const run=await S.generate(task,records,q,{allowCloud});board.push({role,...run});return run;};
 await call('中心角色发布请求','针对研究问题向共享黑板发布一个具体证据请求，说明所需能力和停止条件；不预填结论。',question);
 for(const role of ['材料与版本核对者','检索与证据整理者','批判性核读者']){
  const shared=()=>question+'\n共享黑板：'+board.map(r=>r.output).join('\n');
  const bid=await call(role+'：能力响应','你是'+role+'。独立判断能否推进当前请求。返回JSON {volunteer:true或false,reason:"理由"}。',shared());
  const p=JSON.parse(bid.output.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g,''));
  if(p.volunteer===true)await call(role,'你是'+role+'，已自愿响应。结合共享黑板和原文，追加有[片段ID]的发现与缺口，避免重复。',shared());
 }
 await call('中心角色汇总','依据共享黑板与原文汇总最终回答，每句标[ID]，说明尚未解决的请求；本轮预算到此停止。',question+'\n共享黑板：'+board.map(r=>r.output).join('\n'));
 return{board,mode:'Blackboard System：单轮发布、能力响应与汇总的课堂适配',maxCalls:8};
}
