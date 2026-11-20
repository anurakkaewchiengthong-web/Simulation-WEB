(function(root){
'use strict';
const TILE_SIZE=128,MAX_CELLS=1600000;
function plan(radiusKm,spacingM,maxCells=MAX_CELLS){
 if(!(radiusKm>0&&radiusKm<=200&&spacingM>0))throw Error('Invalid tiled coverage dimensions');
 const n=2*Math.ceil(radiusKm*1000/spacingM)+1;
 const cells=n*n;
 if(!Number.isSafeInteger(cells)||cells>maxCells)throw Error('TILE_BUDGET: '+n+' × '+n+' = '+cells.toLocaleString()+' cells exceeds '+maxCells.toLocaleString()+'; select a coarser grid or smaller radius');
 return {n,cells,spacingM:2*radiusKm*1000/n,tileSize:TILE_SIZE,tilesX:Math.ceil(n/TILE_SIZE),tilesY:Math.ceil(n/TILE_SIZE)};
}
function* tiles(plan){
 for(let y=0;y<plan.n;y+=plan.tileSize)for(let x=0;x<plan.n;x+=plan.tileSize)
 yield {x,y,width:Math.min(plan.tileSize,plan.n-x),height:Math.min(plan.tileSize,plan.n-y)};
}
root.RFTiledCoverage=Object.freeze({plan,tiles,TILE_SIZE,MAX_CELLS});
})(typeof window!=='undefined'?window:globalThis);
