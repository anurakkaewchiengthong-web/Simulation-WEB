'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('dist/viewport-renderer.js','utf8'),ctx);
const legacy=fs.readFileSync('dist/single.html','utf8');
const match=legacy.match(/const signalBands=(\[[^;]+\]);/);
assert.ok(match,'Legacy Sim 1 bands must be present');
const bands=vm.runInNewContext(match[1]);
const shade=v=>bands.find(([min])=>v>=min)?.[1]??null;
const create=ctx.RFViewportRenderer.create;
test('viewport renderer uses exactly the legacy RSSI color boundaries',()=>{
 const renderer=create({floor:-105});
 for(let dbm=-110;dbm<=-30;dbm+=0.5){
  const actual=renderer.classify(dbm),expected=shade(dbm);
  assert.deepEqual(actual?Array.from(actual):null,expected?Array.from(expected):null,'RSSI '+dbm);
 }
});
test('uplink and downlink retain raw RF values without modification',()=>{
 const renderer=create({mode:'up',floor:-105,opacity:1});
 const value={down:-65,up:-95};
 assert.deepEqual(Array.from(renderer.rgba(value)),[254,169,0,255]);
 assert.equal(value.down,-65);assert.equal(value.up,-95);
});
test('renderer skips missing/weak signal and uses display-only alpha',()=>{
 const renderer=create({floor:-95,opacity:0.5});
 assert.deepEqual(Array.from(renderer.rgba({down:-100})),[0,0,0,0]);
 assert.equal(renderer.rgba({down:-75})[3],128);
});
