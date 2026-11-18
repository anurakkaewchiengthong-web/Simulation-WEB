(function(root){
'use strict';
// Bridge between an existing synchronous RF propagation function and the
// on-demand scheduler. Does not fetch DEM or change propagation mathematics.
function createRFAdapter({propagation,config,gridSize,radiusKm,maxConcurrent=1,maxCache=16}={}){
 if(typeof propagation!=='function'||!config||!Number.isInteger(gridSize)||gridSize<1||!(radiusKm>0)||!root.RFOnDemandTiles)throw Error('Invalid RF tile adapter configuration');
 const scheduler=root.RFOnDemandTiles.createScheduler({maxConcurrent,maxCache,load:async(key,{signal})=>{
  const [xs,ys,ws,hs]=key.split(':').map(Number);
  if(![xs,ys,ws,hs].every(Number.isSafeInteger)||xs<0||ys<0||ws<1||hs<1||xs+ws>gridSize||ys+hs>gridSize)throw Error('Invalid RF tile bounds');
  const values=[];
  for(let row=ys;row<ys+hs;row++){
   if(signal?.aborted)throw Error('TILE_CANCELLED');
   for(let col=xs;col<xs+ws;col++){
    const x=(col+.5-gridSize/2)*2*radiusKm/gridSize;
    const y=(gridSize/2-row-.5)*2*radiusKm/gridSize;
    if(Math.hypot(x,y)>radiusKm)continue;
    values.push({index:row*gridSize+col,value:propagation(x,y,config)});
   }
   // Yield to permit cancellation between rows.
   await Promise.resolve();
  }
  return values;
 }});
 return Object.freeze({requestTile:(tile,opts)=>scheduler.request([tile.x,tile.y,tile.width,tile.height].join(':'),opts),cancelAll:scheduler.cancelAll,stats:scheduler.stats});
}
root.RFOnDemandAdapter=Object.freeze({createRFAdapter});
})(typeof window!=='undefined'?window:globalThis);
