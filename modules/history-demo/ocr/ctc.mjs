export function collapseCTC(tokens,blank='－') {
  if(!Array.isArray(tokens))throw Error('CTC 输入应为序列');
  const merged=tokens.filter((t,i)=>i===0||t!==tokens[i-1]),withoutBlank=merged.filter(t=>t!==blank);
  return {input:[...tokens],merged,withoutBlank,text:withoutBlank.join(''),steps:[{label:'逐条判断',tokens:[...tokens]},{label:'合并相邻重复',tokens:merged},{label:'删去空白',tokens:withoutBlank}]};
}
