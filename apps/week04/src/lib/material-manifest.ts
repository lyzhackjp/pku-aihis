export interface MaterialPack {schema:string;id:string;title:string;description?:string;records:any[];}
export function validateMaterialManifest(m:any):MaterialPack{
  if(m?.schema!=='pku-week04-material-pack/v1'||typeof m.id!=='string'||!m.id||!Array.isArray(m.records)||!m.records.length||m.records.length>150)throw Error('材料包格式或数量不正确');
  const ids=new Set(),paths=new Set();
  for(const r of m.records){if(typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.title!=='string'||!r.title.trim()||!Array.isArray(r.attachments))throw Error('材料身份重复或格式错误');ids.add(r.id);
    if(!['史料','二手文献','教师研究产物'].includes(r.kind))throw Error('材料类型须为史料、二手文献或教师研究产物');
    if(!r.attachments.length&&(typeof r.text!=='string'||!r.text.trim()))throw Error('材料没有原件或工作稿文字');
    for(const a of r.attachments){if(!/^pdf\/[\w.-]+\.pdf$/.test(a.path)||paths.has(a.path)||!/^([a-f0-9]{64})$/.test(a.sha256)||!Array.isArray(a.pages)||!a.pages.length||a.pages.length>1500)throw Error('原件路径、校验或页信息不正确');paths.add(a.path);
      for(const p of a.pages)if(![p.width,p.height].every(x=>Number.isFinite(x)&&x>0)||!Number.isFinite(p.rotation)||typeof p.text!=='string'||p.text.length>500000)throw Error('逐页文本或尺寸错误');
    }
  }return m;
}
