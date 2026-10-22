"""Candidate. Static shape inference only: no runtime session, no downloads."""
import argparse, hashlib, json
from pathlib import Path
import onnx

def main():
    p=argparse.ArgumentParser();p.add_argument('model',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
    root=Path(__file__).resolve().parents[2];entry=json.loads((root/'apps/week06/src/engines/models.json').read_text())['pp-rec']
    digest=hashlib.sha256(a.model.read_bytes()).hexdigest()
    if digest!=entry['sha256']:raise ValueError('固定识读模型 SHA-256 不符')
    model=onnx.shape_inference.infer_shapes(onnx.load(a.model),strict_mode=True,data_prop=True)
    def shape(v):return [d.dim_value if d.HasField('dim_value') else d.dim_param or None for d in v.type.tensor_type.shape.dim]
    shapes={v.name:shape(v)for v in [*model.graph.input,*model.graph.output,*model.graph.value_info]}
    data={'candidate':True,'model':entry,'onnx_version':onnx.__version__,'operation':'static shape inference; no model inference','opsets':[{'domain':x.domain,'version':x.version}for x in model.opset_import],'inputs':[{ 'name':v.name,'shape':shape(v)}for v in model.graph.input],'outputs':[{ 'name':v.name,'shape':shape(v)}for v in model.graph.output],'nodes':[{'name':n.name,'op':n.op_type,'inputs':list(n.input),'outputs':[{'name':x,'shape':shapes.get(x)}for x in n.output]}for n in model.graph.node]}
    a.output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(data["nodes"])} nodes; weights excluded; SHA verified')
if __name__=='__main__':main()
