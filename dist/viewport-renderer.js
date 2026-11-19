(function(root){
'use strict';
// Opt-in display-only tile renderer. RF values are produced by the existing
// propagation callback. No changes to link budget, DEM or export algorithms.
function create({mode='down',floor=-105,opacity=0.65}={}){
 if(!['down','up'].includes(mode)||!Number.isFinite(floor)||!(opacity>=0&&opacity<=1))throw Error('Invalid renderer options');
 const bands=[[-60,[0,0,255]],[-70,[0,169,254]],[-80,[0,254,169]],[-90,[0,254,0]],[-100,[255,169,0]],[-105,[255,0,0]]];
 function classify(dbm){
  if(!Number.isFinite(dbm)||dbm<floor)return null;
  for(const [threshold,rgb] of bands)if(dbm>=threshold)return rgb;
  return bands[bands.length-1][1];
 }
 function rgba(value){
  const dbm=value&&Number(value[mode]),rgb=classify(dbm);
  return rgb?[...rgb,Math.round(opacity*255)]:[0,0,0,0];
 }
 function draw(ctx,tiles,project){
  if(!ctx||typeof project!=='function'||!Array.isArray(tiles))throw Error('Invalid tile draw request');
  let count=0;
  for(const tile of tiles)for(const cell of tile.values){
   const p=project(cell.xKm,cell.yKm);
   if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   const [r,g,b,a]=rgba(cell.value);
   if(!a)continue;
   ctx.fillStyle='rgba('+r+','+g+','+b+','+(a/255)+')';
   ctx.fillRect(p.x,p.y,1,1);count++;
  }
  return count;
 }
 return Object.freeze({classify,rgba,draw});
}
root.RFViewportRenderer=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
