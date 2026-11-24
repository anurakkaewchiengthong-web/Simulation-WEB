const assert=require('node:assert/strict');const M=require('../dist/mw-math.js');global.MWMath=M;const A=require('../dist/mw-availability.js');
const near=(a,b,t)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
// Published P.838-3 Table 5, 10 GHz, horizontal/vertical.
const h=A.coefficients(10,'H'),v=A.coefficients(10,'V');near(h.k,.01217,.000005);near(h.alpha,1.2571,.00005);near(v.k,.01129,.000005);near(v.alpha,1.2156,.00005);
const rain=A.rainModel(18.278,7.575,95,'H',0);assert.ok(rain.a001>10&&rain.a001<16);
for(const p of [.001,.01,.1,1])near(A.rainOutage(rain,rain.attenuation(p)).lo,p,1e-8);
assert.deepEqual(A.rainOutage(rain,100),{lo:0,hi:.001,bound:true});assert.ok(A.rainModel(61,7,95,'H',0).error);assert.ok(A.rainModel(10,7,null,'H',0).error);
// Deep-fade arithmetic and annual conversion; continuity across the shallow/deep join.
near(A.fading(1,40),.0001,1e-12);near(A.fading(1,40,10),.00001,1e-12);
for(const p0 of [.01,1,100]){const at=25+1.2*Math.log10(p0);for(const delta of [0,6]){near(A.fading(p0,at-1e-6,delta),A.fading(p0,at+1e-6,delta),1e-5);assert.ok(A.fading(p0,10,delta)>A.fading(p0,20,delta));}}
const c={freq:7.575,rainRate:95,polarization:'H+V',xpic:'Enable',modulation:'32QAM',capacity:224,amRows:[],a:{lat:8.204688,lon:100.254997,ground:5.26,antAGL:50,power:30.5,threshold:-79},b:{lat:8.04059,lon:100.27467,ground:2.19,antAGL:50,power:30.5,threshold:-79}};
const inv=M.inverse(c.a,c.b),r={...inv,rows:[{x:0,ground:5.26},{x:inv.distance/2,ground:3},{x:inv.distance,ground:2.19}],ab:{planned:-36.15},ba:{planned:-36.15},minLOS:40,missing:0};
const s={logK:-5.34916,dN75:20,mpDeg:8.97,rainDeg:.86};let e=A.evaluate(c,r,s);assert.equal(e.rows.length,4);near(e.rows[0].flat,33.88,1e-8);assert.ok(e.rows.every(x=>x.total));
// P.530 eq.24 latitude conversion matches PDF worst-month/annual ratio ~0.286.
near(10**(-e.mp.delta/10),.286,.002);
assert.ok(A.evaluate(c,r,{...s,dN75:null}).rows.every(x=>!x.total));assert.ok(A.evaluate(c,r,{...s,mpDeg:null}).rows.every(x=>!x.total));assert.ok(A.evaluate(c,{...r,minLOS:-1},s).rows.every(x=>!x.total));
const c2=structuredClone(c);c2.b.threshold=-70;const e2=A.evaluate(c2,r,s);assert.ok(e2.rows.find(x=>x.direction==='ab').annual>e2.rows.find(x=>x.direction==='ba').annual);
assert.equal(A.multipath(c,{...r,distance:4000},{}).p0,0);
console.log('PASS availability: P.838 reference coefficients, rain inversion/bounds, multipath continuity, annual conversion, missing inputs, blockage, asymmetry');console.log('Rain A0.01 H:',rain.a001.toFixed(3),'dB; synthetic terrain p0:',e.mp.p0.toFixed(6),'%');
// Batch results must match each independently configured mode; incomplete mode stays isolated.
const batch=structuredClone(c);batch.amRows=[{name:'high',capacity:424,powerA:28.5,powerB:28.5,thresholdA:-60.3,thresholdB:-60.3},{name:'low',capacity:224,powerA:30.5,powerB:30.5,thresholdA:-79,thresholdB:-79}];
const settings={...s,modeDegradation:{high:[2.02,2.11],low:[8.97,.86]}};
const br=A.evaluate(batch,r,settings);assert.equal(br.rows.length,8);
for(const m of batch.amRows){const one=structuredClone(c);one.modulation=m.name;one.capacity=m.capacity;one.a.power=m.powerA;one.b.power=m.powerB;one.a.threshold=m.thresholdA;one.b.threshold=m.thresholdB;const rr={...r,ab:{planned:r.ab.planned+m.powerA-c.a.power},ba:{planned:r.ba.planned+m.powerB-c.b.power}};const single=A.evaluate(one,rr,{...s,mpDeg:settings.modeDegradation[m.name][0],rainDeg:settings.modeDegradation[m.name][1]});assert.deepEqual(br.rows.filter(x=>x.mode===m.name),single.rows);}
const partial=A.evaluate(batch,r,{...settings,modeDegradation:{high:[null,2.11],low:[8.97,.86]}});assert.ok(partial.rows.filter(x=>x.mode==='high').every(x=>!x.total));assert.ok(partial.rows.filter(x=>x.mode==='low').every(x=>x.total));console.log('PASS multi-modulation: batch equals independent calculations; missing degradation isolated to its mode');
