// Candidate. Package an actual public run; omit duplicated network input tensors explicitly.
import fs from 'node:fs/promises';import path from 'node:path';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const repo=path.resolve(import.meta.dirname,'../../..'),input=repo+'/docs/week06/verification/round3-real/D02-PP.json.gz',bytes=await fs.readFile(input),record=JSON.parse(gunzipSync(bytes));
if(record.image.source.material_id!=='shide_public'||record.image.local_only||record.engine.run_mode!=='浏览器实时')throw Error('Only actual public Shide runs can be bundled');
record.original_run_mode=record.engine.run_mode;record.engine.run_mode='保存结果回放';
record.raw={probability:record.raw.probability,crops:record.raw.crops,modelManifest:record.raw.modelManifest,archive:{file:'docs/week06/verification/round3-real/D02-PP.json.gz',sha256:createHash('sha256').update(bytes).digest('hex'),note:'完整真实输出见压缩档；本默认回放省略重复逐行输出与网络输入像素数组，逐位候选、概率和实际尺寸保留。'}};
for(const region of record.regions){if(region.recognition_trace?.input){delete region.recognition_trace.input.chw;delete region.recognition_trace.input.data;region.recognition_trace.input.pixels_omitted=true;}}
const out=gzipSync(JSON.stringify(record),{level:9});await fs.writeFile(repo+'/apps/week06/src/assets/materials/shide-1926-default-record.json.gz',out);console.log({compressedBytes:out.length,lines:record.regions.length,runDate:record.engine.date});
