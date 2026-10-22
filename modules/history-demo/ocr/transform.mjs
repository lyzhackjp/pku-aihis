// Perspective trapezoid followed by rotation, sampled back into the original extent.
// Pixel geometry is independent of OCR; callers preserve source hash and parameters.
export function transformImage(image,{rotation=0,perspective=0}={}){
 if(!image||image.data.length!==image.width*image.height*4||!Number.isFinite(rotation)||Math.abs(rotation)>45||!Number.isFinite(perspective)||Math.abs(perspective)>.45)throw Error('变形参数无效');
 const {width:w,height:h}=image,out=new Uint8ClampedArray(image.data.length);out.fill(255);
 const a=rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),p=perspective;
 // x' = ((1-2p)x + p(1-y))/(1-2py), y'=(1-2p)y/(1-2py).
 // Homogeneous transform maps unit square to symmetric trapezoid; inverse below.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const dx=x-w/2,dy=y-h/2,u=(c*dx+s*dy+w/2)/w,v=(-s*dx+c*dy+h/2)/h;
  const sy=v/(1-2*p+2*p*v),sx=(u*(1-2*p*sy)-p*(1-sy))/(1-2*p);
  if(sx>=0&&sx<1&&sy>=0&&sy<1){const source=(Math.floor(sy*h)*w+Math.floor(sx*w))*4,dest=(y*w+x)*4;out.set(image.data.subarray(source,source+4),dest);}
 }
 return {width:w,height:h,data:out,transform:{operation:'perspective_then_rotation',rotation_degrees:rotation,perspective,extent:'原尺寸，越界裁去',sampling:'nearest-neighbour'}};
}
