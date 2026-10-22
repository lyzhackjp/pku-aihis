// 候选，未经教师确认。Build only on the teacher's machine; no network/model calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {emptyProject,validateProject} from '../../../packages/course-project/project.mjs';
import {exportArchive,importArchive} from '../../../packages/course-project/archive.mjs';
import {fromNDLXML} from '../../../modules/history-demo/ocr/record.mjs';
import {MATERIAL_PACK_VERSION} from '../../../modules/history-demo/ocr/material-pack.mjs';

const repo=path.resolve(import.meta.dirname,'../../..');
const course=process.env.WEEK06_LOCAL_MATERIALS;
if(!course)throw Error('请设置 WEEK06_LOCAL_MATERIALS 为课程根目录；只读取已登记材料');
const output=path.resolve(course,'第六周/demo/本机材料导入包');
if(output.startsWith(repo+path.sep))throw Error('本机材料不能写进仓库');
await fs.mkdir(output,{recursive:true});
const temp=await fs.mkdtemp(path.join(output,'.prepare-'));
const JSZip=createRequire(path.join(repo,'apps/material-importer/package.json'))('jszip');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceList=JSON.parse(await fs.readFile(repo+'/apps/week06/src/assets/materials/sources.json','utf8'));
try{
 const render=spawnSync(process.env.PYTHON||'python3',[path.join(import.meta.dirname,'prepare-local-materials.py'),course,temp],{stdio:'inherit'});
 if(render.status!==0)throw Error('本机页影准备失败；旧材料包未替换');
 const pages=JSON.parse(await fs.readFile(temp+'/pages.json','utf8'));
 const project=emptyProject('第六周本机材料 · 候选，未经教师确认');
 project.id='week06-local-materials-20261022';
 project.scope='仅本机与课堂；16 张已登记页影、3 份第五周保存的 NDL XML 及统一记录；其余页未识读。';
 project.week06_materials={version:MATERIAL_PACK_VERSION,created_at:new Date().toISOString(),local_only:true,pages:[]};
 const files=new Map();
 async function attach(source,name,type,bytes){
  const sha256=hash(bytes),id='file-'+sha256;
  if(!source.attachments.some(a=>a.id===id))source.attachments.push({id,name,type,bytes:bytes.length,sha256});
  files.set(id,new Blob([bytes],{type}));return id;
 }
 const inventory=[];
 for(const p of pages){
  let source=project.sources.find(s=>s.id===p.sourceId);
  if(!source){const s=sourceList.find(s=>s.id===p.sourceId);source={id:s.id,title:s.title,author:s.author,edition:s.edition,
   rights:'教师提供；仅本机与课堂，不发布',public:false,acquisition:'本机材料包；保留原页与原记录对应',attachments:[],included:true,status:'待核'};project.sources.push(source);}
  const bytes=await fs.readFile(p.imagePath),name=path.basename(p.imagePath),sha256=hash(bytes);
  const image={name,sha256,width:p.width,height:p.height,local_only:true,source:{material_id:p.id,identity:p.identity,page_systems:p.page_systems}};
  const imageAttachmentId=await attach(source,name,'image/png',bytes);
  const recordAttachmentIds=[],originalRecordAttachmentIds=[];
  let regions=0;
  if(p.xmlPath){
   const xmlBytes=await fs.readFile(p.xmlPath);
   const xml=xmlBytes.toString('utf8');
   const record=fromNDLXML(xml,{image,engine:{name:'ndlocr-lite',version:'待登记（V-08）',run_mode:'保存结果回放',
    date:'2026-10-13T00:00:00+08:00',params:{source:'第五周 2026-10-13 已保存 XML；本次仅打包，未重跑',date_precision:'day',original_run_time:'具体时分秒待登记'}}});
   originalRecordAttachmentIds.push(await attach(source,path.basename(p.xmlPath),'application/xml',xmlBytes));
   recordAttachmentIds.push(await attach(source,p.id+'-saved-ndl.json','application/json',Buffer.from(JSON.stringify(record,null,2)+'\n')));
   regions=record.regions.length;
  }
  project.week06_materials.pages.push({id:p.id,sourceId:p.sourceId,identity:p.identity,page_systems:p.page_systems,
   width:p.width,height:p.height,imageAttachmentId,recordAttachmentIds,originalRecordAttachmentIds,provenance:p.provenance});
  inventory.push({id:p.id,name,sha256,width:p.width,height:p.height,page_systems:p.page_systems,savedRecords:recordAttachmentIds.length,regions,provenance:p.provenance});
 }
 validateProject(project);
 const archive=await exportArchive(JSZip,project,id=>files.get(id));
 if(archive.missing.length)throw Error('材料包存在缺失附件');
 const check=await importArchive(JSZip,archive.blob);
 if(check.files.length!==files.size||check.missing.length)throw Error('材料包往返校验失败');
 const zip=Buffer.from(await archive.blob.arrayBuffer()),zipName='第六周本机材料_20261022.zip';
 await fs.writeFile(path.join(output,zipName+'.tmp'),zip);
 await fs.rename(path.join(output,zipName+'.tmp'),path.join(output,zipName));
 await fs.writeFile(path.join(output,'材料清单.json'),JSON.stringify({status:'候选，未经教师确认',date:project.week06_materials.created_at,
  zip:zipName,bytes:zip.length,sha256:hash(zip),pages:inventory,modelsRun:[],apiCalls:0},null,2)+'\n');
 await fs.writeFile(path.join(output,'SHA256SUMS.txt'),hash(zip)+'  '+zipName+'\n');
 await fs.writeFile(path.join(output,'重新制作材料包.command'),[
  '#!/bin/zsh','# 候选：只在本机重新生成，原页影与模型缓存不改。','set -e',
  'COURSE_DIR="${0:A:h:h:h:h}"',
  'NODE_DIR="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"',
  '[[ ! -d "$NODE_DIR" ]] || export PATH="$NODE_DIR:$PATH"',
  'export WEEK06_LOCAL_MATERIALS="$COURSE_DIR"',
  'node "$COURSE_DIR/pku-aihis/apps/week06/scripts/build-local-material-pack.mjs"',
  'print "材料包已重新生成，可返回导入页选择 ZIP。"',
 ].join('\n')+'\n',{mode:0o755});
 await fs.writeFile(path.join(output,'README.md'),`# 第六周本机材料导入包

候选，未经教师确认。生成时间：${project.week06_materials.created_at}。只在本机与课堂使用。

1. 打开第六周演示；点击“材料导入”，也可展开“材料与记录”后点“导入本机材料包”。
2. 在导入页选取本目录的 **${zipName}**（不必解压）。等“文件已保存”后，点击第四栏“送回已经连接的课件”。无需运行 OCR。
3. 返回课件。“材料与记录”的下拉框会增加“已导入本机”各页；选一页，再点“打开所选材料”。刷新后仍可用。同一浏览器、同一网址的导入结果保存在本机；换浏览器或清除网站数据后需重新导入。
4. D24 锁定材料与原始识读仍需按步骤操作；导入不会改动已锁定的贯穿记录、人工裁定或模型缓存。

## 包含什么

| 材料 | 页影 | 已有识读 |
|---|---:|---|
| 《史德》1988 影印本，PDF 页序 78 | 1 | NDL XML 及统一记录 |
| 森鷗外，教师 PDF 页序 1、2 | 2 | 各有 NDL XML 及统一记录 |
| Acton 1911 重印本，PDF 页序 48／印刷页 40 | 1 | 无，未运行 |
| 敦煌彩色图版 1995 年本，原 PDF 页序 68—79 | 12 | 无，未运行 |

共 ${pages.length} 张 PNG、3 份原始 XML、3 份统一记录；ZIP ${(zip.length/1024/1024).toFixed(1)} MiB。前四张 PNG 沿用既有文件，字节不变；敦煌单页 PDF 在本机用 PyMuPDF 渲染为 RGB 200 dpi，没有裁切或识读。原始 PDF 保持原位，不打入此包；对应路径、原 PDF 指纹与渲染方法见“材料清单.json”。

NDL 保存结果来自 2026-10-13；工具版本和确切时分秒仍待登记（V-08）。本次没有重跑模型，XML CONF 仍是检测分数，不作为识读分数。原有页码待核项保留，机器结果不充当校订参照。公开 1926 本与教师 1988 本分别登记。

## 校验与恢复

导入时逐附件校验 SHA-256，再检查图像尺寸、记录与页影的对应关系，全部通过才保存。坏包不会覆盖课件原有材料。重复导入不会重复追加识读记录。若浏览器空间不足，先保留原有贯穿导出，换有足够空间的浏览器后重新导入。

此包采用课程共用 pku-history-project/v1 ZIP；project.json 中 week06_materials 页表连接图像与识读。包内没有模型权重、API Key、API 回应或教师的贯穿操作记录。不要上传到公开仓库或发布站点。

需要重做时，双击本目录“重新制作材料包.command”。需要课程已配置的 Node、共享导入器依赖和 Python PyMuPDF；脚本不安装依赖、不下载模型。原始文件若与既有登记指纹不同，会停止并保留旧包。
`);
 console.log(JSON.stringify({output,zip:zipName,pages:pages.length,attachments:files.size,bytes:zip.length,sha256:hash(zip)}));
}finally{await fs.rm(temp,{recursive:true,force:true});}
