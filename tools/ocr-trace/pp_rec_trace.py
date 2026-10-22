"""Candidate, UNEXECUTED. Run only after E10/trace authorization.
Adds requested intermediate tensor outputs to the fixed ONNX graph. No downloads.
"""
import argparse,hashlib,json,time,math
from pathlib import Path

def main():
    p=argparse.ArgumentParser();p.add_argument('model',type=Path);p.add_argument('line',type=Path);p.add_argument('output',type=Path);p.add_argument('--nodes',nargs='+',required=True,help='Exact tensor output names from pp-rec-graph.json');p.add_argument('--no-auto-rotate',action='store_true');a=p.parse_args()
    import onnx,onnxruntime as ort,numpy as np,yaml,cv2
    from PIL import Image
    root=Path(__file__).resolve().parents[2];spec=json.loads((root/'apps/week06/src/engines/models.json').read_text())['pp-rec'];raw=a.model.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=spec['sha256']:raise ValueError('Model SHA mismatch')
    if a.output.exists():raise FileExistsError('Use a new output directory; previous trace preserved')
    a.output.mkdir(parents=True)
    config=yaml.safe_load((root/'apps/week06/src/engines/pp-rec.yml').read_text());labels=['']+config['PostProcess']['character_dict']+[' ']
    model=onnx.shape_inference.infer_shapes(onnx.load(a.model),strict_mode=True,data_prop=True)
    values={v.name:v for v in [*model.graph.value_info,*model.graph.output]};original=[v.name for v in model.graph.output]
    if any(n not in values for n in a.nodes):raise ValueError('Unknown intermediate tensor; read static graph JSON')
    for n in a.nodes:
        if n not in original:model.graph.output.append(values[n])
    # Browser implementation uses BGR, height 48 and aspect-ratio width capped at 3200.
    im=Image.open(a.line).convert('RGB');im.save(a.output/'input.png');rotation=0
    if not a.no_auto_rotate and im.height/max(1,im.width)>=1.5:im=im.transpose(Image.Transpose.ROTATE_90);rotation=-90
    resize=next(op['RecResizeImg'] for op in config['PreProcess']['transform_ops'] if 'RecResizeImg' in op)
    channels,height,base_width=resize['image_shape'];ratio=im.width/max(1,im.height)
    if channels!=3:raise ValueError('Expected 3 channels')
    width=min(3200,max(1,int(height*max(base_width/height,ratio))));resized_width=min(width,math.ceil(height*ratio))
    rgb=cv2.resize(np.asarray(im),(resized_width,height),interpolation=cv2.INTER_LINEAR);Image.fromarray(rgb).save(a.output/'resized.png')
    bgr=rgb[:,:,::-1].astype(np.float32)/255;normalized=((bgr-.5)/.5).transpose(2,0,1)
    data=np.zeros((1,3,height,width),dtype=np.float32);data[0,:,:,:resized_width]=normalized
    session=ort.InferenceSession(model.SerializeToString(),providers=['CPUExecutionProvider']);names=[x.name for x in session.get_outputs()]
    start=time.perf_counter();outs=session.run(names,{session.get_inputs()[0].name:data});elapsed=(time.perf_counter()-start)*1000;nodes=[]
    for j,(name,out) in enumerate(zip(names,outs)):
        item={'name':name,'shape':list(out.shape),'dtype':str(out.dtype),'channels':[]}
        np.save(a.output/f'tensor-{j}.npy',out)
        if out.ndim==4 and out.shape[0]==1:
            energy=np.abs(out[0]).mean(axis=(1,2));ids=np.argsort(energy)[-min(6,len(energy)):][::-1]
            for idx in ids:
                channel=out[0,idx];low=float(channel.min());high=float(channel.max());path=f'feature-{j}-{idx}.png';Image.fromarray(np.uint8(255*(channel-low)/(high-low or 1))).save(a.output/path);item['channels'].append({'id':int(idx),'mean_abs_activation':float(energy[idx]),'min':low,'max':high,'file':path})
        nodes.append(item)
    probs=outs[names.index(original[0])][0]
    if probs.ndim!=2 or probs.shape[-1]!=len(labels):raise ValueError('Final output/dictionary dimensions differ; preserve raw tensors and investigate')
    # Fixed model exposes probabilities; never softmax a probability tensor twice.
    if not np.allclose(probs.sum(-1),1,atol=.001):raise ValueError('Output is not normalized probabilities')
    ids=probs.argmax(-1);kept=[t for t,i in enumerate(ids)if i!=0 and(t==0 or i!=ids[t-1])];text=''.join(labels[ids[t]]for t in kept)
    np.save(a.output/'probabilities.npy',probs)
    peak=np.max(probs,axis=0);heat_ids=[0]+[int(i)for i in np.argsort(peak)[::-1]if i!=0][:20]
    trace={'candidate':True,'model':spec,'image_sha256':hashlib.sha256(a.line.read_bytes()).hexdigest(),'input_shape':list(data.shape),'rotation':rotation,'preprocessing':'OpenCV INTER_LINEAR, BGR, configured height/base width, zero padding after normalization; native/WASM numerical agreement remains untested','elapsed_ms':elapsed,'backend':session.get_providers(),'nodes':nodes,'text':text,'chars':[{'text':labels[ids[t]],'prob':float(probs[t,ids[t]]),'step':t}for t in kept],'rec_score':float(np.mean([probs[t,ids[t]]for t in kept]))if kept else 0,'heatmap':{'labels':[labels[i]for i in heat_ids],'values':probs[:,heat_ids].T.tolist()},'probability_table':'probabilities.npy'}
    (a.output/'trace.json').write_text(json.dumps(trace,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
