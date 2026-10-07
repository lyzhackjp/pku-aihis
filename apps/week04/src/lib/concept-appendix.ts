export interface ConceptTerm {term:string;en:string;definition:string;first_slide?:string;wiki?:{url:string};}
export interface ConceptCategory {label:string;terms:ConceptTerm[];}

export function parseConceptAppendix(text:string):{categories:ConceptCategory[]} {
  if(text.length>1000000)throw Error('概念原稿超过1MB，请拆分后再导入');
  const categories:ConceptCategory[]=[];
  let category:ConceptCategory,term:ConceptTerm,paragraphs:string[]=[];
  const finish=()=>{if(term){term.definition=paragraphs.join('\n').trim();if(!term.definition)throw Error('概念缺少解释：'+term.term);category.terms.push(term);}term=undefined;paragraphs=[];};
  for(const line of text.replace(/\r\n/g,'\n').split('\n')){
    if(line.startsWith('## ')){finish();category={label:line.slice(3).trim(),terms:[]};if(!category.label)throw Error('分类名称不能为空');categories.push(category);}
    else if(line.startsWith('### ')){finish();if(!category)throw Error('词条前需要 ## 分类');const [name,...english]=line.slice(4).split('|');term={term:name.trim(),en:english.join('|').trim(),definition:''};}
    else if(term&&line.startsWith('页面：')){const id=line.slice(3).trim();if(id&&!/^D\d{2}$/.test(id))throw Error('页面格式应为 Dxx：'+term.term);term.first_slide=id||undefined;}
    else if(term&&line.startsWith('参考：')){const url=line.slice(3).trim();if(!/^https?:\/\//i.test(url))throw Error('参考只支持 http/https 地址');term.wiki={url};}
    else if(term)paragraphs.push(line);
  }
  finish();return validateConcepts({categories});
}
export function validateConcepts(value:any):{categories:ConceptCategory[]} {
  if(!Array.isArray(value?.categories)||!value.categories.length)throw Error('需要非空的概念分类');
  const seen=new Set<string>();
  for(const c of value.categories){if(typeof c.label!=='string'||!Array.isArray(c.terms))throw Error('分类格式错误');for(const t of c.terms){
    if(typeof t.term!=='string'||!t.term.trim()||typeof t.definition!=='string'||!t.definition.trim())throw Error('每条概念需要名称和解释');
    if(seen.has(t.term))throw Error('重复概念：'+t.term);seen.add(t.term);
    if(t.wiki?.url&&!/^https?:\/\//i.test(t.wiki.url))throw Error('不支持的参考地址');
    if(t.first_slide&&!/^D\d{2}$/.test(t.first_slide))throw Error('页面格式错误');
  }}
  if(seen.size>600)throw Error('每次最多600个概念');
  return JSON.parse(JSON.stringify(value));
}
export function conceptMarkdown(categories:ConceptCategory[]):string {
  return '# 第四周概念讲解附录\n\n保留 ## 分类、### 中文术语 | English、页面：Dxx 格式，编辑后直接导入。\n\n'+categories.map(c=>'## '+c.label+'\n\n'+c.terms.map(t=>'### '+t.term+' | '+(t.en||'')+'\n\n页面：'+(t.first_slide||'')+'\n\n'+t.definition+'\n\n'+(t.wiki?.url?'参考：'+t.wiki.url+'\n\n':'')).join('')).join('');
}
