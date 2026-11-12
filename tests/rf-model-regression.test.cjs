// Additional RF-model baseline invariants; run with Node 22.
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'dist');
const mw = require(path.join(root,'mw-math.js'));
const av = require(path.join(root,'mw-availability.js'));
const xpd = require(path.join(root,'mw-xpd.js'));
const terrain = require(path.join(root,'terrain-fast.js'));
const climate = require(path.join(root,'mw-climate.js'));
function near(a,b,t,label){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=t,label+': '+a+' != '+b)}
// Terrarium: (R*256+G+B/256)-32768. Native: (R*256+G)-32768.
const rgba = Uint8ClampedArray.from([128,0,0,255,128,1,128,255,0,0,0,0]);
const t = terrain.decode(rgba,false);
near(t[0],0,1e-9,'Terrarium zero');
near(t[1],1.5,1e-9,'Terrarium fractional height');
assert.ok(Number.isNaN(t[2]),'transparent pixels are NoData');
const native = terrain.decode(Uint8ClampedArray.from([128,1,255,255,128,2,0,255]),true);
near(native[0],1,1e-9,'native height');
assert.ok(Number.isNaN(native[1]),'native blue=0 is NoData');
// WGS84 round-trip and Fresnel scaling.
const origin={lat:15.993741,lon:99.364571};
const end=mw.direct(origin,45,15000);
const inv=mw.inverse(origin,end);
near(inv.distance,15000,0.02,'Vincenty round-trip distance');
near(inv.bearing,45,0.001,'Vincenty round-trip bearing');
near(mw.fresnel(7.5,7500,7500)/mw.fresnel(30,7500,7500),2,1e-10,'Fresnel scales inverse sqrt frequency');
near(mw.knife(-0.78),0,1e-12,'knife-edge no-loss threshold');
assert.ok(mw.knife(1)>mw.knife(0),'knife-edge loss increases with obstruction');
// Rain attenuation and outage boundary checks (P.530 implementation).
const noRain=av.rainModel(15,7.5,0,'H',0);
assert.equal(noRain.zeroRain,true);
near(noRain.attenuation(0.01),0,1e-12,'zero rainfall attenuation');
const rain=av.rainModel(15,7.5,40,'H',0);
assert.ok(!rain.error && rain.a001>0,'rain model must produce positive attenuation');
assert.ok(rain.attenuation(0.001)>rain.attenuation(0.01),'rarer rain is more severe');
assert.ok(rain.attenuation(0.01)>rain.attenuation(1),'rain attenuation is monotonic in exceedance percentage');
const outage=av.rainOutage(rain,rain.attenuation(0.01));
assert.ok(!outage.error && !outage.bound,'in-range inversion must be exact');
near(outage.lo,0.01,1e-7,'rain outage inversion');
near(outage.hi,0.01,1e-7,'rain outage interval');
assert.ok(av.rainModel(61,7.5,40,'H',0).error,'distance guard');
assert.ok(av.rainOutage(rain,0).error,'margin guard');
near(av.fading(0,30),0,1e-12,'no multipath gives no outage');
// XPD: invalid input and symmetric single-dish result.
const invalid=xpd.calculate({xpdA:-1,xpdB:25,p0Percent:0,freq:7.5,layout:'single',modes:[]});
assert.ok(invalid.errors.length>0,'invalid XPD inputs rejected');
const valid=xpd.calculate({xpdA:27,xpdB:28,p0Percent:1,freq:7.5,layout:'single',xpic:true,xpifA:20,xpifB:20,modes:[{name:'QPSK',ciA:20,ciB:20}]});
assert.equal(valid.errors.length,0);
assert.equal(valid.rows.length,2);
near(valid.xpdg,27,1e-12,'worst-end antenna XPD');
near(valid.xpd0,32,1e-12,'clear-air XPD');
near(valid.rows[0].margin,valid.rows[1].margin,1e-10,'symmetric XPD margins');
// Climate grid interpolation: independent of live network/ITU data.
const g={step:1,rows:3,cols:3};
const c={row:0,col:0,band:0,dx:0.5,dy:0.5};
near(climate.interpolate(Float64Array.from([0,2,4,6,8,10,12,14,16]),g,c),4,1e-12,'bilinear climate interpolation');
assert.throws(()=>climate.cell(91,0,climate.grids.logK),'latitude guard');
console.log('PASS: DEM decoding, Vincenty/Fresnel, rain P.530, XPD, climate interpolation');
