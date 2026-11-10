const assert=require('node:assert/strict');const api=require('../dist/mw-equipment.js');const d=require('../dist/data/rtn320f-equipment.json');
assert.equal(d.profiles.length,20);
for(const p of d.profiles){assert.equal(new Set(p.rows.map(r=>r.modulation)).size,p.rows.length);for(const r of p.rows){assert(r.typicalDbm<0);assert.equal(r.throughput.length,4);for(const range of r.throughput){assert(range[0]>0);assert(range[1]>=range[0]);}}if(p.xpic)assert(!p.rows.some(r=>['4096QAM','8192QAM'].includes(r.modulation)));}
const p=api.profile(d,7,28,true),q=api.profile(d,8,56,false);
// Independently transcribed from tables 1-65, 1-192/193 and 1-61, 1-175/176.
assert.deepEqual(p.rows.find(r=>r.modulation==='32QAM'),{modulation:'32QAM',typicalDbm:-79,throughput:[[111,141],[113,186],[114,244],[116,330]]});
assert.deepEqual(q.rows.find(r=>r.modulation==='8192QAM'),{modulation:'8192QAM',typicalDbm:-51,throughput:[[566,717],[572,947],[578,1237],[587,1676]]});
assert.deepEqual(api.values(p,['QPSK Strong','32QAM'],0,0,3,20,21),[['QPSK Strong',37,20,21,-87.5,-87.5,'',''],['32QAM',111,20,21,-76,-76,'','']]);
assert.equal(api.values(p,['32QAM'],3,1,0,20,20)[0][1],330); // no implicit XPIC doubling
assert.equal(api.profile(d,7,112,true),null);
assert.throws(()=>api.values(p,['32QAM'],0,0,0,NaN,20));
assert.throws(()=>api.values(p,[],0,0,0,20,20));
assert.throws(()=>api.values(p,['32QAM'],0,0,-3,20,20));
assert.equal(api.profile(d,7,7,true).rows.at(-1).modulation,'512QAM');
assert.equal(api.profile(d,7,14,false).rows.at(-1).modulation,'2048QAM');
console.log('Equipment catalogue: 20 profiles, source spot checks, allowance, limits and missing TX checks passed');
