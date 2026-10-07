import {unzipSync,strFromU8} from 'fflate';
import {blake3} from '@noble/hashes/blake3.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import {openPdf} from './pdf';
import type {Library} from './library';
import {validateMaterialManifest,MaterialPack} from './material-manifest';
export interface PreparedPack {manifest:MaterialPack;records:any[];skipped:number;}
const fingerprint=(bytes:Uint8Array)=>bytesToHex(blake3(bytes));
const origin=(r:any)=>JSON.parse(r.custom_fields_json||'{}')['x-pku-material-origin'];
const signature=(r:any)=>JSON.stringify({title:r.title,kind:r.kind,text:r.text||'',attachments:r.attachments});
export async function prepareMaterialPack(lib:Library,data:Uint8Array,onProgress:(text:string)=>void=()=>{}):Promise<PreparedPack>{
  if(data.length>700000000)throw Error('材料包超过700MB，请拆包导入');
  const raw=unzipSync(data,{filter:f=>f.name==='manifest.json'&&f.originalSize<=16000000})['manifest.json'];if(!raw)throw Error('材料包缺少可读取的 manifest.json');
  const manifest=validateMaterialManifest(JSON.parse(strFromU8(raw))),paths=new Set(manifest.records.flatMap(r=>r.attachments.map(a=>a.path)));
  const entries=unzipSync(data,{filter:f=>paths.has(f.name)&&f.originalSize<=350000000});
  const existing=lib.rows('select item_id,custom_fields_json from items'),records=[];let skipped=0;
  for(const [index,r] of manifest.records.entries()){
    onProgress('校验 '+(index+1)+'/'+manifest.records.length+'：'+r.title);
    const sig=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature(r))),recordHash=bytesToHex(new Uint8Array(sig));
    const found=existing.find(i=>origin(i)?.packId===manifest.id&&origin(i)?.sourceId===r.id);
    if(found){if(origin(found).recordHash!==recordHash)throw Error('同一包身份内容已变：'+r.title+'。请使用新的材料包 ID，不覆盖原记录。');skipped++;continue;}
    const itemId=crypto.randomUUID(),attachments=[];
    for(const a of r.attachments){const bytes=entries[a.path];if(!bytes)throw Error('原件缺失或文件过大：'+a.path);
      const sha=bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer as ArrayBuffer)));if(sha!==a.sha256)throw Error('SHA-256 校验失败：'+a.name);
      const hash=fingerprint(bytes);if(lib.rows('select file_asset_id from file_assets where full_blake3=?',[hash]).length||records.some(x=>x.attachments.some(y=>y.hash===hash))||attachments.some(x=>x.hash===hash))throw Error('相同 PDF 已在其他题录或包中：'+a.name+'。请在原题录管理附件，不自动猜测身份。');
      const pdf=await openPdf(bytes.slice().buffer as ArrayBuffer);
      try{if(pdf.numPages!==a.pages.length)throw Error('实际 PDF 页数与材料包不符：'+a.name);for(let i=0;i<pdf.numPages;i++){const page=await pdf.getPage(i+1),v=page.getViewport({scale:1});if(Math.abs(v.width-a.pages[i].width)>1||Math.abs(v.height-a.pages[i].height)>1||page.rotate!==a.pages[i].rotation)throw Error('实际 PDF 坐标与材料包不符：'+a.name);}}finally{await pdf.destroy();}
      const documentId=crypto.randomUUID(),assetId=crypto.randomUUID(),commitId=crypto.randomUUID(),pages=[];
      for(const [index,p] of a.pages.entries()){const pageId=crypto.randomUUID(),revisionId=crypto.randomUUID(),boxId=crypto.randomUUID();const boxes=p.text.trim()?[{id:boxId,type:'text',text:p.text,x:0,y:0,width:1,height:1}]:[];
        if(boxes.length){const valid=await window.DotNet.invokeMethodAsync('CoreProbe','ValidateTree',documentId,pageId,'manual_edit',JSON.stringify(boxes));if(valid!=='ok')throw Error(valid);}
        pages.push({...p,index,pageId,revisionId,boxId});
      }
      attachments.push({...a,data:bytes,hash,documentId,assetId,commitId,pages});
    }records.push({...r,itemId,recordHash,attachments});
  }return {manifest,records,skipped};
}
export async function importPreparedPack(lib:Library,prepared:PreparedPack):Promise<string[]>{
  if(!prepared.records.length)return [];
  return lib.mutate(()=>{
    const now=new Date().toISOString(),collectionName='材料包 · '+prepared.manifest.title;let collection=lib.rows('select collection_id from collections where name=?',[collectionName])[0]?.collection_id;if(!collection){collection=crypto.randomUUID();lib.insert('collections',{collection_id:collection,library_id:lib.libraryId,name:collectionName,created_at:now,updated_at:now});}
    for(const r of prepared.records){
      // Recheck after asynchronous validation: another action may have changed the library.
      if(lib.rows('select custom_fields_json from items').some(i=>origin(i)?.packId===prepared.manifest.id&&origin(i)?.sourceId===r.id))throw Error('材料已在校验期间导入，请重新预览');
      if(r.attachments.some(a=>lib.rows('select file_asset_id from file_assets where full_blake3=?',[a.hash]).length))throw Error('PDF 已在校验期间入库，请重新预览');
      const creators=r.author?[{role:'author',literal:String(r.author)}]:[],fields={'x-pku-material-origin':{packId:prepared.manifest.id,sourceId:r.id,recordHash:r.recordHash,kind:r.kind,date:r.date||'',description:prepared.manifest.description,pages:r.attachments.map(a=>({file:a.name,sha256:a.sha256,transcriptions:a.pages.map(p=>({pdfPage:p.index+1,provenance:p.provenance||[]}))}))}};
      lib.insert('items',{item_id:r.itemId,library_id:lib.libraryId,item_type:r.id==='D041'?'book':r.id==='teacher-report'?'report':r.kind==='教师研究产物'?'manuscript':'article-journal',title:r.title,date:r.date?String(r.date):null,creators_json:JSON.stringify(creators),tags_json:JSON.stringify(['德教教学备用',r.kind]),note:[r.note,r.text].filter(Boolean).join('\n\n')||null,custom_fields_json:JSON.stringify(fields),created_at:now,updated_at:now});
      lib.run('insert into item_collections values(?,?,?)',[collection,r.itemId,now]);
      if(r.date){const year=String(r.date).match(/^(\d{4})/);lib.insert('item_dates',{date_id:crypto.randomUUID(),item_id:r.itemId,role:'issued',date_parts_json:JSON.stringify(year?[[Number(year[1])]]:[]),literal:String(r.date),circa:0,created_at:now});}
      if(r.author)lib.insert('item_creators',{creator_id:crypto.randomUUID(),item_id:r.itemId,role:'author',literal:String(r.author),sequence_index:0,created_at:now});
      for(const [j,a] of r.attachments.entries()){
        lib.insert('file_assets',{file_asset_id:a.assetId,library_id:lib.libraryId,original_path:'browser:'+a.assetId,file_name:a.name,size_bytes:a.data.length,full_blake3:a.hash,page_count:a.pages.length,status:'available',created_at:now,updated_at:now});
        lib.files[a.assetId]={name:a.name,data:a.data,hash:a.hash};
        lib.insert('document_instances',{document_instance_id:a.documentId,item_id:r.itemId,file_asset_id:a.assetId,title:a.name,instance_type:'scan',is_primary:j===0?1:0,status:'active',created_at:now,updated_at:now});
        lib.insert('document_commits',{commit_id:a.commitId,document_instance_id:a.documentId,source:'manual_edit',message:'教师材料包预处理转写；整页工作文本块，无精确OCR框；校读状态见题录扩展来源记录',created_at:now});
        for(const p of a.pages){
          lib.insert('pages',{page_id:p.pageId,document_instance_id:a.documentId,page_index:p.index,width:p.width,height:p.height,rotation:p.rotation,coordinate_basis:'pdf_points',basis_width:p.width,basis_height:p.height,renderer_basis_version:'pdfjs-browser',source_file_hash:a.hash,created_at:now,updated_at:now});
          if(!p.text.trim())continue;
          lib.insert('document_tree_revisions',{tree_revision_id:p.revisionId,document_instance_id:a.documentId,page_id:p.pageId,source:'manual_edit',status:'committed',is_current:1,source_full_blake3:a.hash,source_basis_status:'current',created_at:now,committed_at:now});
          lib.insert('document_boxes',{tree_revision_id:p.revisionId,box_id:p.boxId,document_instance_id:a.documentId,page_id:p.pageId,box_type:'text',bbox_x:0,bbox_y:0,bbox_width:1,bbox_height:1,payload_json:JSON.stringify({markdown:p.text}),suppressed:0});
          lib.insert('document_commit_pages',{commit_id:a.commitId,page_id:p.pageId,tree_revision_id:p.revisionId});
        }lib.reindex(a.documentId);
      }
    }return prepared.records.map(r=>r.itemId);
  });
}
