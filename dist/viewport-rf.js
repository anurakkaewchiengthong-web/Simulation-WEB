(function(root){
'use strict';
// Infrastructure bridge: viewport -> tile scheduler -> existing RF propagation.
// No DEM loading, canvas rendering, or RF formula modifications.
function create({propagation,config,origin,spacingM,tileSize=128,maxConcurrent=1,maxCache=16,paddingTiles=0,maxVisibleTiles=16,onProgress}={}){
 if(!root.RFViewportTiles||!root.RFOnDemandTiles||typeof propagation!=='function'||!config||!origin||!(spacingM>0))throw Error('Invalid viewport RF configuration');
 let generation=0,active=null,completed=0;
 const scheduler=root.RFOnDemandTiles.createScheduler({maxConcurrent,maxCache,load:async(key,{signal})=>{
  const [ix,iy]=key.split(':').map(Number);
  if(!Number.isSafeInteger(ix)||!Number.isSafeInteger(iy))throw Error('Invalid viewport tile key');
  const values=[],tileKm=tileSize*spacingM/1000;
  for(let row=0;row<tileSize;row++){
   if(signal?.aborted)throw Error('TILE_CANCELLED');
   for(let col=0;col<tileSize;col++){
    const x=ix*tileKm+(col+.5)*spacingM/1000;
    const y=iy*tileKm+(row+.5)*spacingM/1000;
    values.push({col,row,xKm:x,yKm:y,value:propagation(x,y,config)});
   }
   if(row%8===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  return {key,ix,iy,values};
 }});
 async function requestViewport(bounds){
  const plan=root.RFViewportTiles.plan({bounds,origin,spacingM,tileSize,paddingTiles,maxVisibleTiles});
  if(active)active.abort();
  scheduler.cancelAll();
  const controller=new AbortController();active=controller;
  const myGeneration=++generation;completed=0;
  const tiles=[];
  for(const tile of plan.tiles){
   if(controller.signal.aborted)break;
   try{
    const result=await scheduler.request(tile.key,{signal:controller.signal});
    if(controller.signal.aborted||myGeneration!==generation)throw Error('TILE_CANCELLED');
    tiles.push(result);completed++;
    if(typeof onProgress==='function')onProgress({completed,total:plan.count,key:tile.key});
   }catch(error){if(controller.signal.aborted||myGeneration!==generation)throw Error('TILE_CANCELLED');throw error;}
  }
  if(controller.signal.aborted)throw Error('TILE_CANCELLED');
  return {plan,tiles};
 }
 function cancel(){generation++;if(active)active.abort();scheduler.cancelAll();}
 return Object.freeze({requestViewport,cancel,stats:()=>({...scheduler.stats(),generation,completed})});
}
root.RFViewportRF=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
