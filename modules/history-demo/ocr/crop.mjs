const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cropSVGMarkup(image,box,{transpose=false,className='line-crop',label='所选区域原图裁切'}={}) {
 if(!image||!box||box.length!==4||box.some(n=>!Number.isFinite(n))||box[2]<=0||box[3]<=0)return '';
 const [x,y,w,h]=box,W=transpose?h:w,H=transpose?w:h;
 const transform=transpose?`translate(${h},0) rotate(90) translate(${-x},${-y})`:`translate(${-x},${-y})`;
 return `<svg class="${E(className)}" role="img" aria-label="${E(label)}" data-crop-box="${box.join(',')}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="width:auto;height:auto;max-width:100%;max-height:240px;aspect-ratio:${W}/${H};overflow:hidden;display:block;margin:auto"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="hidden"><g transform="${transform}"><image href="${E(image.url)}" width="${image.width}" height="${image.height}"/></g></svg></svg>`;
}
