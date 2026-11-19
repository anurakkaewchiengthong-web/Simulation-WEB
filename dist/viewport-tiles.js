(function(root){
'use strict';
// Pure viewport tile index planner. No DEM fetch, propagation or map rendering.
const MAX_VISIBLE_TILES=256;
function plan({bounds,origin,spacingM,tileSize=128,paddingTiles=1,maxVisibleTiles=MAX_VISIBLE_TILES}={}){
 if(!bounds||!origin||!(spacingM>0)||!Number.isInteger(tileSize)||tileSize<1||!Number.isInteger(paddingTiles)||paddingTiles<0||!Number.isInteger(maxVisibleTiles)||maxVisibleTiles<1)throw Error('Invalid viewport tile configuration');
 const {south,north,west,east}=bounds;
 if(![south,north,west,east,origin.lat,origin.lon].every(Number.isFinite)||south>north||west>east||south< -90||north>90||west< -180||east>180||Math.abs(origin.lat)>=85)throw Error('Invalid viewport bounds');
 const cos=Math.cos(origin.lat*Math.PI/180),kmPerDeg=111.195;
 const x=(lon)=>(lon-origin.lon)*kmPerDeg*cos;
 const y=(lat)=>(lat-origin.lat)*kmPerDeg;
 const tileKm=tileSize*spacingM/1000;
 const minX=Math.floor(x(west)/tileKm)-paddingTiles,maxX=Math.floor(x(east)/tileKm)+paddingTiles;
 const minY=Math.floor(y(south)/tileKm)-paddingTiles,maxY=Math.floor(y(north)/tileKm)+paddingTiles;
 const nx=maxX-minX+1,ny=maxY-minY+1,count=nx*ny;
 if(!Number.isSafeInteger(count)||count>maxVisibleTiles)throw Error('VIEWPORT_TILE_BUDGET: '+count+' tiles exceeds '+maxVisibleTiles);
 const tiles=[];
 for(let iy=minY;iy<=maxY;iy++)for(let ix=minX;ix<=maxX;ix++)tiles.push({key:ix+':'+iy,ix,iy,xKm:ix*tileKm,yKm:iy*tileKm,width:tileSize,height:tileSize});
 return {tiles,tileKm,spacingM,tileSize,origin:{lat:origin.lat,lon:origin.lon},count,bounds:{south,north,west,east}};
}
root.RFViewportTiles=Object.freeze({plan,MAX_VISIBLE_TILES});
})(typeof window!=='undefined'?window:globalThis);
