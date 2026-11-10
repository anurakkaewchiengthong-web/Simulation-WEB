const assert=require('node:assert/strict'),fs=require('node:fs/promises'),C=require('../dist/mw-climate.js'),refs=require('./climate-reference.json');const A=require('../dist/mw-availability.js');
(async()=>{let requests=0;const fetcher=async url=>{requests++;const b=await fs.readFile('dist/'+url);return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
for(const ref of refs){const v=await C.lookup(ref.lat,ref.lon,fetcher);for(const name of Object.keys(C.grids))assert.ok(Math.abs(v[name]-ref[name])<1e-9,JSON.stringify({ref,v,name}))}
const a=await C.lookup(18.116615,102.222684,fetcher),before=requests;await C.lookup(18.12,102.23,fetcher);assert.equal(requests,before);
for(const [lat,lon] of [[91,0],[0,181],[NaN,0],[0,Infinity]])await assert.rejects(()=>C.lookup(lat,lon,fetcher));
delete require.cache[require.resolve('../dist/mw-climate.js')];const fresh=require('../dist/mw-climate.js');await assert.rejects(()=>fresh.lookup(70,0,async()=>({ok:false,status:503})));await fresh.lookup(70,0,fetcher);
assert.deepEqual(A.rainOutage(A.rainModel(10,7,0,'H',0),20),{lo:0,hi:0,bound:false});
console.log('PASS: 27 raw-source reference points, poles, ±180 seam, band boundaries, hemisphere orientation, cache, invalid inputs, retry, zero-rain map');console.log(a)
})().catch(e=>{console.error(e);process.exit(1)});
