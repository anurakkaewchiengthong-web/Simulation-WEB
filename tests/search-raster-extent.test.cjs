'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({});
for(const file of ['dist/tiled-coverage.js','dist/search-raster-extent.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const {plan,rasterLimitKm}=ctx.RFSearchRasterExtent;
test('50 m grid is limited to roughly 31.6 km while ring search can reach 200 km',()=>{
 const result=plan({requestedRadiusKm:5,spacingM:50,searchResult:{searchedRadiusKm:200,lastColouredRadiusKm:120,stopReason:'max-search-radius'}});
 assert.ok(result.maxRasterRadiusKm>31&&result.maxRasterRadiusKm<32);
 assert.equal(result.searchedRadiusKm,200);assert.equal(result.lastColouredRadiusKm,120);
 assert.equal(result.rasterTruncated,true);assert.equal(result.searchBeyondRaster,true);assert.equal(result.searchComplete,false);
 assert.ok(result.rasterRadiusKm<32);
 const raster=ctx.RFTiledCoverage.plan(result.rasterRadiusKm,50);
 assert.ok(raster.cells<=ctx.RFTiledCoverage.MAX_CELLS);
});
test('approximate edge is not conflated with raster completeness',()=>{
 const result=plan({requestedRadiusKm:2,spacingM:250,searchResult:{searchedRadiusKm:12,lastColouredRadiusKm:8,stopReason:'coverage-edge-approx'}});
 assert.equal(result.searchComplete,true);assert.equal(result.rasterTruncated,false);assert.equal(result.rasterRadiusKm,8);
});
test('no coloured ring preserves requested raster radius without inventing signal',()=>{
 const result=plan({requestedRadiusKm:1,spacingM:50,searchResult:{searchedRadiusKm:5,lastColouredRadiusKm:null,stopReason:'coverage-edge-approx'}});
 assert.equal(result.lastColouredRadiusKm,null);assert.equal(result.rasterRadiusKm,1);
});
test('invalid extent and insufficient budget fail explicitly',()=>{
 assert.throws(()=>rasterLimitKm(50,8),/Invalid raster budget/);
 assert.throws(()=>plan({requestedRadiusKm:1,spacingM:50,searchResult:{searchedRadiusKm:10,lastColouredRadiusKm:11,stopReason:'max-search-radius'}}),/Invalid last signal extent/);
});
