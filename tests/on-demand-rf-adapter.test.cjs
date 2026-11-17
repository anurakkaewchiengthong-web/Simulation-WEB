'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({});for(const p of ['dist/on-demand-tiles.js','dist/on-demand-rf-adapter.js'])vm.runInContext(fs.readFileSync(p,'utf8'),ctx);
test('adapter preserves legacy pixel-centre coordinate formula and RF callback',async()=>{
 const calls=[];const adapter=ctx.RFOnDemandAdapter.createRFAdapter({propagation:(x,y)=>{calls.push([x,y]);return x+y},config:{},gridSize:5,radiusKm:1});
 const values=await adapter.requestTile({x:2,y:2,width:1,height:1});
 assert.equal(values.length,1);assert.equal(values[0].index,12);assert.equal(values[0].value,0);
 assert.deepEqual(calls,[[0,0]]);
});
test('adapter excludes outside-circle pixels and deduplicates requests',async()=>{
 let calls=0;const a=ctx.RFOnDemandAdapter.createRFAdapter({propagation:()=>++calls,config:{},gridSize:5,radiusKm:1});
 const tile={x:0,y:0,width:2,height:2};const [v,w]=await Promise.all([a.requestTile(tile),a.requestTile(tile)]);
 assert.equal(v.length,1);assert.equal(w.length,1);assert.equal(calls,1);
});
test('rejects invalid tile bounds and invalid adapter configuration',async()=>{
 assert.throws(()=>ctx.RFOnDemandAdapter.createRFAdapter({config:{},gridSize:5,radiusKm:1}),/Invalid RF/);
 const a=ctx.RFOnDemandAdapter.createRFAdapter({propagation:()=>1,config:{},gridSize:5,radiusKm:1});
 await assert.rejects(a.requestTile({x:5,y:0,width:1,height:1}),/Invalid RF tile bounds/);
});
