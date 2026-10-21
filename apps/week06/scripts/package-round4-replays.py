"""Candidate. Package public actual records; retain source archive hash for omitted duplicate tensors."""
from pathlib import Path
import gzip,json,hashlib
root=Path(__file__).resolve().parents[3];assets=root/'apps/week06/src/assets/materials';v=root/'docs/week06/verification'
NDL='ndlocr-lite:50216ccc3e600f6d0d152862c5a201fdade78112';PP='pp-ocrv6:28fe5895c24fd108c19eb3e8479f4ab385fbfc62+b8f84f0b80c529de40b4fbb3544b84fa7233a513'
def read(p):return json.loads(gzip.decompress(p.read_bytes()))
def write(name,obj):
 data=gzip.compress(json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0);(assets/name).write_bytes(data);print(name,len(data))
def evidence(r,p):
 assert r['image']['source']['material_id']=='shide_public' and not r['image']['local_only']
 r['source_archive']={'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()};r['engine']['model_id']=NDL if r['engine']['name']=='ndlocr-lite' else PP
 if 'runtime' not in r['engine']:
  r['engine']['runtime']={'browser':{'name':'Google Chrome','version':'155.0.8059.85','version_source':'第三轮 real-report.json 实际浏览器版本'},'preprocessing':{'implementation':'Canvas / OffscreenCanvas drawImage' if r['engine']['name']=='ndlocr-lite' else 'Canvas 裁切；OpenCV.js 4.10.0 INTER_LINEAR / warpPerspective','scope':'line' if r['engine']['params'].get('experiment') else 'full'}}
 return r
# The default uses the complete actual round 4 record.
p=v/'round4-real/D03-NDL.json.gz';r=evidence(read(p),p)
assert len(r['regions'])==28
# Keep complete fields / traces. Raw detector output stays in the record too.
write('shide-1926-ndl-default-record.json.gz',r)
p=v/'round3-real/D02-PP.json.gz';existing=assets/'shide-1926-default-record.json.gz';r=evidence(read(existing),p);write(existing.name,r)
legacy=[]
for name in ['D08-stitch','D08-mask']:
 p=v/'round3-real'/f'{name}.json.gz'
 for r in read(p):
  evidence(r,p);r['raw'].pop('output',None) # duplicate only; full trace/input remains in region
  legacy.append(r)
write('d08-round3-attempts.json.gz',legacy)
groups={}
for name in ['body','title','mask']:
 p=v/'round4-real'/f'D08-{name}.json.gz';g=read(p);g['mode']='保存结果回放'
 for r in g['records']:evidence(r,p);r['engine']['run_mode']='保存结果回放';r['raw'].pop('output',None)
 groups[name]=g
write('d08-round4-controlled.json.gz',groups)
