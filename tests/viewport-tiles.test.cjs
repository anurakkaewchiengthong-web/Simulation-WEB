'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('dist/viewport-tiles.js','utf8'),ctx);
const plan=ctx.RFViewportTiles.plan;
test('near and far viewports use independent tiles with stable keys',()=>{
 const origin={lat:15.993741,lon:99.364571};
 const near=plan({bounds:{south:15.99,north:16,west:99.36,east:99.37},origin,spacingM:50,paddingTiles:0});
 const far=plan({bounds:{south:16.89,north:16.90,west:100.27,east:100.28},origin,spacingM:50,paddingTiles:0});
 assert.ok(near.count>0&&far.count>0);
 assert.equal(new Set(near.tiles.map(t=>t.key)).size,near.count);
 assert.ok(!near.tiles.some(t=>far.tiles.some(u=>u.key===t.key)));
 assert.ok(far.tiles.some(t=>t.xKm>50&&t.yKm>50));
});
test('visible tile budget blocks oversized viewports before allocation',()=>{
 assert.throws(()=>plan({bounds:{south:14,north:18,west:97,east:102},origin:{lat:16,lon:99},spacingM:50}),/VIEWPORT_TILE_BUDGET/);
});
test('invalid bounds and antimeridian crossings are rejected explicitly',()=>{
 assert.throws(()=>plan({bounds:{south:16,north:15,west:99,east:100},origin:{lat:16,lon:99},spacingM:50}),/Invalid viewport bounds/);
 assert.throws(()=>plan({bounds:{south:15,north:16,west:170,east:-170},origin:{lat:16,lon:179},spacingM:50}),/Invalid viewport bounds/);
});
