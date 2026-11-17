'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('dist/on-demand-tiles.js','utf8'),ctx);
const create=ctx.RFOnDemandTiles.createScheduler;
test('deduplicates concurrent tile requests',async()=>{
 let calls=0;const s=create({load:async k=>{calls++;return k+'-value'}});
 const [a,b]=await Promise.all([s.request('A'),s.request('A')]);
 assert.equal(a,'A-value');assert.equal(b,a);assert.equal(calls,1);
});
test('bounds concurrent loads',async()=>{
 let active=0,peak=0;const releases=[];
 const s=create({maxConcurrent:2,load:()=>new Promise(resolve=>{active++;peak=Math.max(peak,active);releases.push(()=>{active--;resolve('ok')})})});
 const pending=['a','b','c'].map(k=>s.request(k));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(peak,2);assert.equal(s.stats().queued,1);
 releases.shift()();await new Promise(resolve=>setImmediate(resolve));assert.equal(peak,2);
 while(releases.length)releases.shift()();await Promise.all(pending);
});
test('LRU cache evicts least recently used tile',async()=>{
 let count=0;const s=create({maxCache:2,load:async()=>++count});
 await s.request('a');await s.request('b');await s.request('a');await s.request('c');
 assert.equal(s.stats().cached,2);assert.equal(await s.request('b'),4);
});
test('cancelAll invalidates queued and running results',async()=>{
 let release;const s=create({maxConcurrent:1,load:()=>new Promise(r=>release=r)});
 const a=s.request('a'),b=s.request('b');
 await new Promise(resolve=>setImmediate(resolve));s.cancelAll();
 await assert.rejects(b,/TILE_CANCELLED/);
 release('stale');await assert.rejects(a,/TILE_CANCELLED/);
 assert.equal(s.stats().cached,0);
});
test('rejects invalid configuration and aborted signals',async()=>{
 assert.throws(()=>create({load:()=>1,maxConcurrent:0}),/Invalid tile/);
 const s=create({load:async()=>1});await assert.rejects(s.request('x',{signal:{aborted:true}}),/TILE_CANCELLED/);
});
