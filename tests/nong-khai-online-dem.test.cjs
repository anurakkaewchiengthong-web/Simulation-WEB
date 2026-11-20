'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/single.html','utf8');
const start=html.indexOf('async function loadDEM(c,token)');
const end=html.indexOf('\nfunction propagation(',start);
const loader=html.slice(start,end);
test('all areas use only the shared AWS Terrarium DEM loader',()=>{
 assert.doesNotMatch(loader,/loadNong\(/);
 assert.doesNotMatch(loader,/bundledCovers\(/);
 assert.doesNotMatch(loader,/\[\[defaultDEM/);
 assert.doesNotMatch(loader,/demSource='bundled'/);
});
test('shared AWS Terrarium loader and incomplete DEM guard are retained',()=>{
 assert.match(loader,/s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium/);
 assert.match(loader,/if\(dem\.size!==jobs\.length\)throw Error\('ข้อมูล DEM ไม่ครบ'\)/);
 assert.match(loader,/demSource='online';demReady=true/);
});
test('RF propagation implementation remains available',()=>{
 assert.match(html,/function propagation\(x,y,c\)/);
});
