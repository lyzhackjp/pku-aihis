// Candidate, not teacher-confirmed. Distinct classroom adaptations of the three query flows.
export async function queryGraph(S,{graph,records,question,strategy,budget,allowCloud}){
  const trace={strategy,mode:'课堂流程适配；未声称复现原框架基准',phases:[],runs:[]};
  const call=async(task,rs,q)=>{const r=await S.generate(task,rs,q,{allowCloud});trace.runs.push(r);return r;};
  const parsed=s=>JSON.parse(s.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g,''));
  const unique=rs=>[...new Map(rs.map(r=>[r.id,r])).values()];
  S.assertCloudPermission(records,allowCloud);
  if(strategy==='GraphRAG'){
    const communities=(graph.communities||S.A.labelPropagation(graph)).filter(g=>g.length);
    const groups=communities.slice(0,budget).map(group=>({group,rs:records.filter(r=>group.some(n=>r.text.includes(n)||graph.nodes.find(x=>x.id===n)?.sources?.includes(r.id))).slice(0,budget)})).filter(x=>x.rs.length);
    if(!groups.length)throw Error('当前图没有能回查原文的社区，请先建图或调整实际词项。');
    trace.phases.push({stage:'社区范围',groups:groups.map(g=>({nodes:g.group,sourceIds:g.rs.map(r=>r.id)}))});
    const summaries=[];for(const g of groups){const summary=await call('据原文制作社区主题摘要，每句保留[片段ID]，注明范围。不得用共现推断历史影响。',g.rs,g.group.join('、'));summaries.push({...g,summary});}
    const partials=[];for(const g of summaries){const partial=await call('据社区摘要及所附原文回答问题，不能支持时明确写无法支持。返回JSON {answer:"逐句带ID",helpfulness:0到100}。',g.rs,question+'\n社区摘要：'+g.summary.output);const p=parsed(partial.output);if(Number(p.helpfulness)>0)partials.push({answer:String(p.answer),helpfulness:Number(p.helpfulness),rs:g.rs});}
    trace.phases.push({stage:'map：社区回答',partials:partials.map(({rs,...p})=>({...p,sourceIds:rs.map(r=>r.id)}))});
    partials.sort((a,b)=>b.helpfulness-a.helpfulness);const selected=unique(partials.flatMap(p=>p.rs)).slice(0,budget*2);
    if(!selected.length)return{graph,output:'各社区均未提供可支持的回答。',trace};
    const final=await call('执行reduce：依据各社区回答及原文合并最终回答。逐句标[ID]；保留各作者差异，不把局部判断推广到全库。',selected,question+'\n社区回答：'+partials.map(p=>p.answer).join('\n'));
    trace.phases.push({stage:'reduce：全局回答',sourceIds:selected.map(r=>r.id)});return{graph,output:final.output,trace};
  }
  if(strategy==='LightRAG'){
    const keywordRun=await call('仅从研究问题提取双层检索关键词。返回JSON {low:["具体人名、篇名、实体原语"],high:["主题、关系、抽象问题"]}；两层不要混为一层。',[],question),kw=parsed(keywordRun.output);
    if(!Array.isArray(kw.low)||!Array.isArray(kw.high))throw Error('双层关键词格式不正确；原始模型输出已保存。');
    const low=S.sparse(kw.low.join(' '),records).slice(0,budget),high=S.sparse(kw.high.join(' '),records).slice(0,budget);
    const hit=new Set(graph.nodes.filter(n=>kw.low.some(k=>n.id.includes(k)||k.includes(n.id))||n.sources?.some(id=>low.some(r=>r.id===id))).map(n=>n.id));
    const edges=graph.edges.filter(e=>hit.has(e.source)||hit.has(e.target));const neighbor=records.filter(r=>edges.some(e=>e.sources?.includes(r.id))).slice(0,budget);
    const short=records.slice(0,18).map(r=>({...r,text:S.A.sentences(r.text).slice(0,2).map(x=>x.text).join('')})),vectors=await S.embedding.encode([question,...short.map(r=>r.text)]),dense=S.rankDense(vectors[0],short,vectors.slice(1)).slice(0,budget);
    const ids=new Set(unique([...low,...high,...neighbor,...dense]).map(r=>r.id)),selected=records.filter(r=>ids.has(r.id)).slice(0,budget*3);
    trace.phases.push({stage:'双层关键词',low:kw.low,high:kw.high},{stage:'双层＋邻接扩展＋真实向量',low:low.map(r=>r.id),high:high.map(r=>r.id),neighbor:neighbor.map(r=>r.id),dense:dense.map(r=>({id:r.id,cosine:r.score})),edges});
    if(!selected.length)throw Error('当前范围没有命中。');const final=await call('据双层检索与邻接关系回到原文回答。逐句标[ID]；共现不是事实关系，说明两层分别贡献什么。',selected,question+'\n双层记录：'+JSON.stringify(kw));return{graph,output:final.output,trace};
  }
  // Lazy: no LLM indexing; the budget controls actual query-time relevance checks.
  const candidates=S.sparse(question,records).slice(0,budget),accepted=[];
  trace.phases.push({stage:'无生成模型建索引；查询候选',ids:candidates.map(r=>r.id),relevanceBudget:budget});
  for(const r of candidates){const run=await call('查询时相关性核读。返回JSON {relevant:true或false,facts:[{quote:"逐字原文",explanation:"该原文如何支持问题"}]}。不能支持就false。', [r],question),p=parsed(run.output);const facts=Array.isArray(p.facts)?p.facts.filter(f=>typeof f.quote==='string'&&f.quote.trim()&&r.text.includes(f.quote)):[];trace.phases.push({stage:'实际相关性核读',id:r.id,relevant:p.relevant===true,facts});if(p.relevant===true&&facts.length)accepted.push({r,facts});}
  if(!accepted.length)return{graph,output:'预算内没有通过相关性与逐字证据核验的片段。',trace};
  const final=await call('据通过核读的原文与事实回答，逐句标[ID]。保留预算限制；不声称通读全量材料。',accepted.map(x=>x.r),question+'\n已核验事实：'+JSON.stringify(accepted.map(x=>({id:x.r.id,facts:x.facts}))));return{graph,output:final.output,trace};
}
