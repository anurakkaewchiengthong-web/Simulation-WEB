'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('dist/ring-search.js','utf8'),ctx);
const {search,bearings}=ctx.RFRingSearch;
test('angular sampling increases with circumference',()=>{
 assert.ok(bearings(20,1)>bearings(2,1));
 assert.equal(bearings(200,0.001),4096);
});
test('isotropic signal ends after two fully uncoloured rings',async()=>{
 const r=await search({initialRadiusKm:1,maxSearchRadiusKm:10,growthFactor:2,arcSpacingKm:1,probe:async({radiusKm})=>({demComplete:true,downlink:radiusKm<=2,uplink:false})});
 assert.equal(r.stopReason,'coverage-edge-approx');assert.equal(r.lastColouredRadiusKm,2);
 assert.equal(r.trace.length,4);assert.equal(r.trace[2].coloured,0);assert.equal(r.trace[3].coloured,0);
});
test('directional uplink lobe counts even when downlink is absent',async()=>{
 const r=await search({initialRadiusKm:1,maxSearchRadiusKm:4,growthFactor:2,probe:async({bearingDeg,radiusKm})=>({demComplete:true,downlink:false,uplink:radiusKm<=2&&bearingDeg<30})});
 assert.equal(r.stopReason,'max-search-radius');assert.ok(r.trace[1].uplinkColoured>0);
});
test('missing DEM cannot be reported as a coverage boundary',async()=>{
 const r=await search({initialRadiusKm:1,maxSearchRadiusKm:10,probe:async()=>({demComplete:false})});
 assert.equal(r.stopReason,'dem-incomplete');assert.ok(r.trace[0].missing>0);
});
test('cancelled search does not report completion',async()=>{
 const signal={aborted:false};let calls=0;
 const r=await search({initialRadiusKm:1,maxSearchRadiusKm:10,signal,probe:async()=>{if(++calls===2)signal.aborted=true;return {demComplete:true,downlink:true}}});
 assert.equal(r.stopReason,'cancelled');assert.equal(r.trace.length,0);
});
test('unsupported model and invalid configuration are explicit',async()=>{
 const r=await search({initialRadiusKm:1,maxSearchRadiusKm:10,modelSupported:false,probe:async()=>({})});
 assert.equal(r.stopReason,'unsupported-mode');
 await assert.rejects(search({initialRadiusKm:20,maxSearchRadiusKm:10,probe:async()=>({})}),/Invalid ring search/);
});
