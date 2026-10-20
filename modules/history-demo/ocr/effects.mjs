// Browser-side teaching imitation, not MEDUSA's implementation. Deterministic noise.
import {binarize,otsuThreshold} from './binarize.mjs';
export const EFFECTS=['otsu','threshold','blur','noise','jpeg','contrast','brightness','color','hole','stain','bleed','stamp'];
export function pixelEffect(image,kind,amount=.5){
 const src=image.data,out=new Uint8ClampedArray(src),w=image.width,h=image.height;
 if(kind==='otsu'||kind==='threshold')return binarize(image,kind==='otsu'?otsuThreshold(image):Math.round(amount*255));
 let seed=9317;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 for(let i=0;i<out.length;i+=4){for(let c=0;c<3;c++){
  if(kind==='noise')out[i+c]=src[i+c]+(rand()-.5)*amount*170;
  if(kind==='contrast')out[i+c]=(src[i+c]-128)*(.2+amount*2.4)+128;
  if(kind==='brightness')out[i+c]=src[i+c]+(amount-.5)*200;
  if(kind==='color')out[i+c]=src[i+c]+[50,-15,-55][c]*amount;
 }}return {width:w,height:h,data:out};
}
export async function canvasEffect(source,kind,amount=.5){if(!EFFECTS.includes(kind))throw Error('未知退化类型');const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
 if(['otsu','threshold','noise','contrast','brightness','color'].includes(kind)){const p=pixelEffect(ctx.getImageData(0,0,c.width,c.height),kind,amount);ctx.putImageData(new ImageData(p.data,p.width,p.height),0,0);}
 if(kind==='blur'){ctx.clearRect(0,0,c.width,c.height);ctx.filter=`blur(${amount*8}px)`;ctx.drawImage(source,0,0);ctx.filter='none';}
 if(kind==='jpeg'){const im=await createImageBitmap(await new Promise(resolve=>source.toBlob(resolve,'image/jpeg',Math.max(.01,amount))));ctx.drawImage(im,0,0);im.close();}
 if(kind==='hole'){ctx.fillStyle='#f4e6be';ctx.beginPath();for(let i=0;i<30;i++){const a=i/30*Math.PI*2,r=Math.min(c.width,c.height)*(.04+amount*.1)*(1+.2*Math.sin(i*7));ctx.lineTo(c.width*.55+Math.cos(a)*r,c.height*.45+Math.sin(a)*r);}ctx.closePath();ctx.fill();}
 if(kind==='stain'){const g=ctx.createRadialGradient(c.width*.55,c.height*.45,0,c.width*.55,c.height*.45,c.width*.3);g.addColorStop(0,`rgba(83,49,13,${.2+amount*.65})`);g.addColorStop(1,'rgba(83,49,13,0)');ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);}
 if(kind==='bleed'){ctx.save();ctx.globalAlpha=.1+amount*.35;ctx.translate(c.width,0);ctx.scale(-1,1);ctx.drawImage(source,7,7);ctx.restore();}
 if(kind==='stamp'){ctx.save();ctx.translate(c.width*.48,c.height*.43);ctx.rotate(-.14);ctx.strokeStyle=`rgba(171,27,31,${.3+amount*.7})`;ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=Math.max(2,c.width*.005);const z=Math.min(c.width,c.height)*.18;ctx.strokeRect(-z/2,-z/2,z,z);ctx.font=`${z*.35}px serif`;ctx.textAlign='center';ctx.fillText('本課',0,-z*.06);ctx.fillText('示意',0,z*.34);ctx.restore();}
 return c;
}
