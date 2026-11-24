'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({});
for(const file of ['dist/ring-search.js','dist/ring-rf-adapter.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const {createProbe,createController}=ctx.RFRingRFAdapter;
test('ring bearing 0 north and 90 east map to existing RF Cartesian km',async()=>{
 const points=[];
 const probe=createProbe({propagation:(x,y)=>{points.push([x,y]);return {down:-90,up:-110}},config:{},thresholdDbm:-105});
 const n=await probe({radiusKm:2,bearingDeg:0});
 const e=await probe({radiusKm:2,bearingDeg:90});
 assert.ok(Math.abs(points[0][0])<1e-9&&Math.abs(points[0][1]-2)<1e-9);
 assert.ok(Math.abs(points[1][0]-2)<1e-9&&Math.abs(points[1][1])<1e-9);
 assert.equal(n.downlink,true);assert.equal(e.uplink,false);
});
test('missing or nonfinite RF result is DEM incomplete rather than no signal',async()=>{
 for(const value of [null,{down:NaN,up:-110}]){
  const probe=createProbe({propagation:()=>value,config:{}});
  assert.equal((await probe({radiusKm:1,bearingDeg:30})).demComplete,false);
 }
});
test('controller searches until two clear rings with RF-derived DL and UL',async()=>{
 const controller=createController({propagation:(x,y)=>({down:Math.hypot(x,y)<=2?-90:-120,up:-120}),config:{}});
 const result=await controller.search({initialRadiusKm:1,maxSearchRadiusKm:10,growthFactor:2,arcSpacingKm:1});
 assert.equal(result.stopReason,'coverage-edge-approx');assert.equal(result.lastColouredRadiusKm,2);
});
test('controller reports max bound and never claims edge from a single clear ring',async()=>{
 const controller=createController({propagation:()=>({down:-130,up:-130}),config:{}});
 const result=await controller.search({initialRadiusKm:1,maxSearchRadiusKm:1});
 assert.equal(result.stopReason,'max-search-radius');
});
