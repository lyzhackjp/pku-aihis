"""Candidate, UNEXECUTED. Pinned Kraken trace; explicit local inputs, no downloads."""
import argparse,dataclasses,hashlib,json,time,importlib.metadata
from pathlib import Path
PIN='bb487219e7d8289274443d1ad0989efb4924dc2a'

def main():
    p=argparse.ArgumentParser();p.add_argument('image',type=Path);p.add_argument('model',type=Path);p.add_argument('output',type=Path);p.add_argument('--model-doi',required=True);p.add_argument('--model-sha256',required=True);p.add_argument('--threshold',type=float,default=.17);p.add_argument('--direction',default='horizontal-lr',choices=['horizontal-lr','horizontal-rl','vertical-lr','vertical-rl']);a=p.parse_args()
    import numpy as np
    from PIL import Image,ImageDraw
    from kraken import blla,serialization
    from kraken.lib import vgsl,segmentation
    direct=importlib.metadata.distribution('kraken').read_text('direct_url.json')
    if not direct or json.loads(direct).get('vcs_info',{}).get('commit_id')!=PIN:raise RuntimeError('Install the exact git revision from README')
    if not a.model_doi.startswith('10.'):raise ValueError('Register the model DOI')
    if hashlib.sha256(a.model.read_bytes()).hexdigest()!=a.model_sha256:raise ValueError('Model SHA mismatch')
    if a.output.exists():raise FileExistsError('Use a new output directory')
    a.output.mkdir(parents=True);im=Image.open(a.image).convert('RGB');im.save(a.output/'input.png');times={};cache={};frames=[im.copy()];channels=[]
    def plain(x):
        if dataclasses.is_dataclass(x):return plain(dataclasses.asdict(x))
        if isinstance(x,dict):return {k:plain(v)for k,v in x.items()}
        if isinstance(x,(tuple,list)):return [plain(v)for v in x]
        if isinstance(x,np.ndarray):return x.tolist()
        if isinstance(x,np.generic):return x.item()
        return x
    def wrap(module,name,after):
        original=getattr(module,name)
        def call(*args,**kwargs):
            start=time.perf_counter();value=original(*args,**kwargs);times[name]=times.get(name,0)+(time.perf_counter()-start)*1000;after(value);return value
        setattr(module,name,call);return original
    def maps(value):
        cache.update(value);heat=value['heatmap'];np.save(a.output/'heatmaps.npy',heat)
        for i,ch in enumerate(heat):
            filename=f'heatmap-{i}.png';Image.fromarray(np.uint8(np.clip(ch,0,1)*255)).save(a.output/filename);channels.append({'index':i,'file':filename,'width':ch.shape[1],'height':ch.shape[0],'values':ch.tolist()})
        if len(heat):frames.append(Image.fromarray(np.uint8(np.clip(heat[-1],0,1)*255)).convert('RGB').resize(im.size))
    oldmap=wrap(blla,'compute_segmentation_map',maps)
    oldline=blla.vectorize_lines;baselines=[]
    def vector(*args,**kw):
        kw['threshold']=a.threshold;start=time.perf_counter();v=oldline(*args,**kw);times['vectorize_lines']=times.get('vectorize_lines',0)+(time.perf_counter()-start)*1000;baselines.extend(plain(v));return v
    blla.vectorize_lines=vector
    polygons=[];oldpol=wrap(blla,'calculate_polygonal_environment',lambda v:polygons.extend(plain(v)))
    start=time.perf_counter()
    try:result=blla.segment(im,model=vgsl.TorchVGSLModel.load_model(a.model),text_direction=a.direction,device='cpu',raise_on_error=True)
    finally:blla.compute_segmentation_map=oldmap;blla.vectorize_lines=oldline;blla.calculate_polygonal_environment=oldpol
    times['total']=(time.perf_counter()-start)*1000
    data=plain(result);(a.output/'page.xml').write_text(serialization.serialize(result,image_size=im.size,template='page'))
    # JSON coordinates from intermediate vectorization are in network scale; final lines in source pixels.
    regions=[]
    for i,line in enumerate(data['lines']):
        regions.append({'id':line['id'],'kind':'LINE','class':'Text','class_norm':'正文','order':i,'polygon':line['boundary'],'baseline':line['baseline'],'text':None,'det_score':None,'det_score_source':None,'rec_score':None,'rec_score_source':None,'chars':[]})
    image={'name':a.image.name,'width':im.width,'height':im.height,'sha256':hashlib.sha256(a.image.read_bytes()).hexdigest(),'source':{'material_id':'kraken-import','identity':'用户指定图像，待补题录','page_systems':{'图像文件':a.image.name}},'local_only':True}
    record={'record_version':'week06-ocr-1','image':image,'engine':{'name':'kraken','version':PIN,'run_mode':'本机服务实时','date':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'params':{'model_doi':a.model_doi,'model_sha256':a.model_sha256,'threshold':a.threshold},'elapsed_ms':times['total']},'regions':regions,'raw':data}
    for count in range(1,len(regions)+1):
        frame=im.copy();draw=ImageDraw.Draw(frame)
        for r in regions[:count]:draw.line([tuple(x)for x in r['baseline']],fill='red',width=3);draw.line([tuple(x)for x in r['polygon']]+[tuple(r['polygon'][0])],fill='blue',width=2)
        frames.append(frame)
    if regions:
        frame=frames[-1].copy();draw=ImageDraw.Draw(frame);centers=[]
        for r in regions:
            x,y=r['baseline'][0];centers.append((x,y));draw.text((x,y),str(r['order']+1),fill='red')
        if len(centers)>1:draw.line(centers,fill='orange',width=3)
        frames.append(frame)
    preview=[]
    for frame in frames:frame.thumbnail((1000,1000));preview.append(frame)
    preview[0].save(a.output/'overview.gif',save_all=True,append_images=preview[1:],duration=600,loop=0)
    trace={'candidate':True,'revision':PIN,'model_doi':a.model_doi,'model_sha256':a.model_sha256,'image':image,'threshold':a.threshold,'timings_ms':times,'channels':channels,'class_mapping':cache['cls_map'],'scale':plain(cache['scale']),'baselines_network_coordinates':baselines,'polygons_network_coordinates':polygons,'record':record,'order':[r['id']for r in regions],'overview':'overview.gif'}
    for name,value in [('trace.json',trace),('record.json',record),('baselines.json',baselines),('polygons.json',polygons)]: (a.output/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
