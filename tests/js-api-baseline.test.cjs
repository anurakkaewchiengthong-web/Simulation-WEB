// Baseline API smoke/regression tests. Run: node tests/js-api-baseline.test.cjs
// No browser or external packages required.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'dist');
function load(name, exported) {
  const context = {console, Math, Number, Float32Array};
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context, {filename:name,timeout:2000});
  assert.ok(context[exported], name + ' must publish ' + exported);
  return context[exported];
}
function near(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual-expected)<=tolerance,
    label + ': expected ' + expected + ', got ' + actual);
}
const power = load('power-units.js','RFPower');
near(power.dbm(1,'W'),30,1e-10,'1 W = 30 dBm');
near(power.dbm(10,'W'),40,1e-10,'10 W = 40 dBm');
near(power.watts(30),1,1e-10,'30 dBm = 1 W');
near(power.convert(0,'dBm','W'),0.001,1e-12,'0 dBm = 1 mW');
assert.throws(()=>power.dbm(0,'W'));
const pair = load('pair-math.js','RFPairMath');
near(pair.merge(-80,-70),-70,1e-12,'strongest RSSI wins');
near(pair.merge(NaN,-90),-90,1e-12,'missing first station');
near(pair.metrics(-70,-90,-100).ci,20,1e-12,'C/I');
near(pair.metrics(-70,-90,-100).sinr,19.58607314841775,1e-9,'SINR');
const mw = load('mw-math.js','MWMath');
near(mw.inverse({lat:0,lon:0},{lat:0,lon:1}).distance,111319.490793,0.02,'WGS84 equatorial degree');
near(mw.inverse({lat:0,lon:0},{lat:0,lon:1}).bearing,90,1e-8,'east azimuth');
near(mw.fresnel(7.5,7500,7500),12.243211,0.01,'Fresnel radius at midpoint');
near(mw.knife(-1),0,1e-12,'clear knife-edge');
console.log('PASS: power, pair-math, microwave geometry API baselines');
