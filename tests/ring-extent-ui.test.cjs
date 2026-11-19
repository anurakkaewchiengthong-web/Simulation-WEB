'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/single.html','utf8');
test('extent planner loaded after its tiled dependency and before app',()=>{
 const a=html.indexOf('<script src="tiled-coverage.js"></script>');
 const b=html.indexOf('<script src="search-raster-extent.js"></script>');
 const c=html.indexOf('<script>const ids=');
 assert.ok(a>=0&&b>a&&c>b);
});
test('ring search reach is independent of raster cap',()=>{
 assert.match(html,/maxSearchRadiusKm:200/);
 assert.match(html,/RFSearchRasterExtent\.plan\(/);
 assert.match(html,/c\.radius=Math\.min\(maxRadius,extent\.rasterRadiusKm\)/);
});
test('users see search and raster radius separately and incomplete rendering warning',()=>{
 assert.match(html,/id="ringExtentInfo"/);
 assert.match(html,/Ring Search '\+extent\.searchedRadiusKm/);
 assert.match(html,/Raster '\+c\.radius/);
 assert.match(html,/ยังไม่ได้แสดงสีครบ/);
});
