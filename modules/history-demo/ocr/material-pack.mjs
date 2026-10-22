// 候选，未经教师确认。Week06 pages extend the shared pku-history-project/v1 ZIP.
import {validateRecord} from './record.mjs';

export const MATERIAL_PACK_VERSION = 'week06-material-pack/v1';
const idOK = id => typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id);
const hashOK = hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
const imageType = type => /^image\/(png|jpeg|webp)$/.test(type || '');
const clone = value => structuredClone(value);

/** No storage writes here. The receiver validates the shared project first. */
export async function prepareMaterialImport(project, files, {digest, readImage}) {
  const extension = project.week06_materials;
  if (extension && extension.version !== MATERIAL_PACK_VERSION) throw Error('本机材料包版本不受支持');
  if (!Array.isArray(files)) throw Error('附件表格式错误');
  const attachments = new Map(), blobs = new Map();
  for (const source of project.sources) for (const attachment of source.attachments) {
    const old = attachments.get(attachment.id);
    if (old && (old.sha256 !== attachment.sha256 || old.type !== attachment.type)) throw Error('同一附件编号的内容指纹冲突');
    attachments.set(attachment.id, attachment);
  }
  let bytes = 0;
  for (const file of files) {
    if (!(file.blob instanceof Blob) || blobs.has(file.id) || !attachments.has(file.id)) throw Error('附件缺少登记、重复或格式错误');
    const attachment = attachments.get(file.id);
    bytes += file.blob.size;
    if (bytes > 512 * 1024 * 1024) throw Error('附件总量超过 512MB，请分包导入');
    const hash = await digest(await file.blob.arrayBuffer());
    if (attachment.sha256 && hash !== attachment.sha256) throw Error('附件校验失败：' + attachment.name);
    if (extension && !hashOK(attachment.sha256)) throw Error('材料包附件缺少 SHA-256：' + attachment.name);
    blobs.set(file.id, new Blob([file.blob], {type: attachment.type || file.blob.type}));
  }
  if (extension) for (const a of attachments.values()) if (!blobs.has(a.id)) throw Error('材料包缺少附件：' + a.name);
  const pages = extension?.pages ?? project.sources.flatMap(source => source.attachments
    .filter(a => imageType(a.type) && blobs.has(a.id))
    .map(a => ({id: `imported-${source.id}-${a.id}`, sourceId: source.id, imageAttachmentId: a.id,
      identity: source.title + ' · ' + a.name, page_systems: source.page_systems || {位置: '用户导入，待填写'}, recordAttachmentIds: []})));
  if (!Array.isArray(pages) || (extension && !pages.length) || pages.length > 200) throw Error('材料包页表为空或超过 200 页');
  const ids = new Set(), entries = [];
  let firstMaterial;
  for (const page of pages) {
    if (!idOK(page.id) || ids.has(page.id)) throw Error('材料页编号缺失或重复');
    ids.add(page.id);
    const source = project.sources.find(s => s.id === page.sourceId);
    const imageAttachment = source?.attachments.find(a => a.id === page.imageAttachmentId);
    if (!imageAttachment || !imageType(imageAttachment.type) || !blobs.has(imageAttachment.id)) throw Error('材料页缺少对应图像：' + page.id);
    if (!page.page_systems || typeof page.page_systems !== 'object' || Array.isArray(page.page_systems) ||
      !Object.keys(page.page_systems).length || Object.values(page.page_systems).some(x => typeof x !== 'string')) throw Error('材料页缺少页码体系：' + page.id);
    const identity = page.identity || source.title;
    if (typeof identity !== 'string' || !identity.trim()) throw Error('材料页缺少身份说明');
    const materialSource = {id: page.id, title: identity, identity, public: false, status: 'imported',
      page_systems: clone(page.page_systems), rights: source.rights || '用户导入，仅本机',
      pack: {projectId: project.id, title: project.title, imported: true}, provenance: clone(page.provenance || {})};
    const material = await readImage(blobs.get(imageAttachment.id), materialSource, imageAttachment.name);
    if (extension && (material.image.width !== page.width || material.image.height !== page.height)) throw Error('图像尺寸与页表不符：' + page.id);
    const records = [];
    if (!Array.isArray(page.recordAttachmentIds)) throw Error('识读附件表格式错误');
    for (const recordId of page.recordAttachmentIds) {
      const a = source.attachments.find(a => a.id === recordId);
      if (!a || a.type !== 'application/json' || !blobs.has(recordId)) throw Error('缺少所登记的识读记录：' + recordId);
      const record = clone(validateRecord(JSON.parse(await blobs.get(recordId).text())));
      if (record.image.sha256 !== material.image.sha256 || record.image.width !== material.image.width || record.image.height !== material.image.height || record.image.source.material_id !== page.id) throw Error('识读记录与所登记页影不一致：' + page.id);
      record.original_run_mode ||= record.engine.run_mode;
      record.engine.run_mode = '保存结果回放';
      record.image.local_only = true;
      record.source_file = {name: a.name, sha256: a.sha256 || await digest(await blobs.get(recordId).arrayBuffer())};
      record.material_pack = {projectId: project.id, pageId: page.id};
      records.push(record);
    }
    entries.push({id: page.id, source: materialSource, image: material.image,
      imageAttachmentId: imageAttachment.id, records});
    firstMaterial ||= material;
  }
  return {entries, firstMaterial, files: [...blobs].map(([id, blob]) => ({id, blob}))};
}

export function mergeMaterialCatalog(existing, incoming) {
  const merged = clone(existing);
  for (const entry of incoming) {
    const old = merged.find(e => e.id === entry.id);
    if (old && old.image.sha256 !== entry.image.sha256) throw Error('同一材料页编号已有不同页影，旧材料保留：' + entry.id);
    if (old) old.records = appendPackRecords(old.records, entry.records);
    else merged.push(clone(entry));
  }
  return merged;
}

export function appendPackRecords(existing, incoming) {
  const records = [...existing];
  for (const record of incoming) if (!records.some(r => r.image.sha256 === record.image.sha256 &&
    (record.source_file?.sha256 && r.source_file?.sha256 === record.source_file.sha256 ||
      r.engine.name === record.engine.name && r.engine.date === record.engine.date && JSON.stringify(r.raw) === JSON.stringify(record.raw)))) records.push(clone(record));
  return records;
}
