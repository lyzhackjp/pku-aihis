// Pointer Events for mouse, pen and touch. The host owns updates, so no data is mutated here.
export function pointerDrag(host,onDrop,{drag:dragAttr="data-drag",drop:dropAttr="data-drop"}={}){let drag=null,over=null;
 const cleanup=()=>{drag?.node.classList.remove('dragging');over?.classList.remove('drop-target');drag=null;over=null;};
 host.addEventListener('pointerdown',e=>{const n=e.target.closest(`[${dragAttr}]`);if(!n||e.target.closest('button,input,select,textarea,summary')||e.button!==0)return;drag={node:n,id:n.getAttribute(dragAttr),x:e.clientX,y:e.clientY,active:false,pointer:e.pointerId};n.setPointerCapture(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;drag.active=true;drag.node.classList.add('dragging');e.preventDefault();const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(`[${dropAttr}]`);over?.classList.remove('drop-target');over=target&&host.contains(target)?target:null;over?.classList.add('drop-target');});
 host.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.pointer)return;const value=drag.active&&over?{id:drag.id,target:over.getAttribute(dropAttr)}:null;cleanup();if(value)onDrop(value);});host.addEventListener('pointercancel',cleanup);
}
