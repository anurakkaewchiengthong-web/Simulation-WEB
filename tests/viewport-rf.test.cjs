'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({AbortController,setTimeout,Promise});
for(const file of ['dist/on-demand-tiles.js','dist/viewport-tiles.js','dist/viewport-rf.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const create=ctx.RFViewportRF.create;
const origin={lat:15.993741,lon:99.364571};
const near={south:15.9937,north:15.9938,west:99.3645,east:99.3646};
test('viewport adapter invokes existing propagation and reports progress',async()=>{
 let calls=0,progress=[];
 const adapter=create({propagation:(x,y)=>{calls++;return {down:-60-Math.hypot(x,y),up:-70}},config:{},origin,spacingM:50,tileSize:2,maxVisibleTiles:8,onProgress:p=>progress.push(p)});
 const r=await adapter.requestViewport(near);
 assert.ok(r.tiles.length>0);assert.equal(calls,r.tiles.length*4);assert.equal(progress.length,r.tiles.length);
 assert.ok(r.tiles[0].values.every(v=>v.value.down<0));
});
test('far viewport is computed without a full-radius raster',async()=>{
 const adapter=create({propagation:(x,y)=>({down:x,up:y}),config:{},origin,spacingM:250,tileSize:4,maxVisibleTiles:8});
 const r=await adapter.requestViewport({south:16.89,north:16.8901,west:100.27,east:100.2701});
 assert.ok(r.tiles[0].values.some(v=>v.xKm>50&&v.yKm>50));
});
test('explicit cancellation is supported',async()=>{
 const adapter=create({propagation:()=>({down:-90,up:-90}),config:{},origin,spacingM:50,tileSize:64,maxVisibleTiles:8});
 const p=adapter.requestViewport(near);adapter.cancel();
 await assert.rejects(p,/TILE_CANCELLED/);
});

test('revisiting viewport reuses completed tile results and cache can be cleared',async()=>{
 let calls=0,progress=[];
 const adapter=create({propagation:()=>{calls++;return {down:-80,up:-85}},config:{},origin,spacingM:50,tileSize:2,maxCache:8,maxVisibleTiles:8,onProgress:p=>progress.push(p)});
 await adapter.requestViewport(near);const first=calls;
 await adapter.requestViewport(near);
 assert.equal(calls,first);
 assert.ok(progress.slice(-1).every(p=>p.cacheHit));
 assert.ok(adapter.stats().viewportCached>0);
 adapter.clearCache();
 assert.equal(adapter.stats().viewportCached,0);
 await adapter.requestViewport(near);
 assert.ok(calls>first);
});
test('viewport change does not cache partial cancelled tiles',async()=>{
 let calls=0;
 const adapter=create({propagation:()=>{calls++;return {down:-90,up:-90}},config:{},origin,spacingM:50,tileSize:64,maxVisibleTiles:8});
 const p=adapter.requestViewport(near);adapter.cancel();
 await assert.rejects(p,/TILE_CANCELLED/);
 assert.equal(adapter.stats().viewportCached,0);
});
