/* Pointer orbit: wrapped yaw, bounded pitch, capture and requestAnimationFrame. */
(()=>{'use strict';const canvas=document.getElementById('view3d'),yaw=document.getElementById('yaw'),pitch=document.getElementById('pitch');let drag=null,pending=false;
const paint=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;draw3D()})};
const set=(y,p)=>{yaw.value=((y%360)+360)%360;pitch.value=Math.max(-85,Math.min(85,p));paint()};
const reset=()=>set(335,25);
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');e.preventDefault()});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;set(+yaw.value+(e.clientX-drag.x)*.45,+pitch.value-(e.clientY-drag.y)*.3);drag.x=e.clientX;drag.y=e.clientY;e.preventDefault()});
const stop=e=>{if(drag&&e.pointerId===drag.id){drag=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}};
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
canvas.addEventListener('dblclick',reset);document.getElementById('reset3d').onclick=reset;
canvas.addEventListener('keydown',e=>{const map={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,5],ArrowDown:[0,-5]};if(map[e.key]){e.preventDefault();set(+yaw.value+map[e.key][0],+pitch.value+map[e.key][1])}if(e.key==='Home'){e.preventDefault();reset()}});
})();
