'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/single.html','utf8');
test('opt-in tiled page loads scheduler and RF adapter before inline application',()=>{
 const tiled=html.indexOf('<script src="tiled-coverage.js"></script>');
 const scheduler=html.indexOf('<script src="on-demand-tiles.js"></script>');
 const adapter=html.indexOf('<script src="on-demand-rf-adapter.js"></script>');
 const inline=html.indexOf('<script>const ids=');
 assert.ok(tiled>=0&&scheduler>tiled&&adapter>scheduler&&inline>adapter);
});
test('tiled build uses RF adapter and preserves scenario band indexing',()=>{
 const start=html.indexOf('async function buildTiled(token){');
 const end=html.indexOf('async function build(token)',start);
 assert.ok(start>0&&end>start);
 const body=html.slice(start,end);
 assert.match(body,/RFOnDemandAdapter\.createRFAdapter/);
 assert.match(body,/adapter\.requestTile\(tile\)/);
 assert.match(body,/scenarioValues\.manual\[mode\]\[cell\.index\]/);
 assert.match(body,/scenarioValues\.map\[mode\]\[cell\.index\]/);
 assert.match(body,/finally\{adapter\.cancelAll\(\)\}/);
});
