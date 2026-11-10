const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {RFPairMath:M}=require('../dist/pair-math.js'),{RFAntennas}=require('../dist/antenna-model.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
near(M.rejection(850,850,25,25,null),0);
near(M.rejection(850,850.0125,25,25,null),3.0102999566);
assert(Number.isNaN(M.rejection(850,851,25,25,null)));
near(M.rejection(850,851,25,25,42),42);
near(M.rejection(850,850,12.5,25,null),3.0102999566);
near(M.metrics(-80,-90,-100).ci,10);near(M.metrics(-80,-90,-100).sinr,9.586073148);
assert.equal(M.metrics(-80,NaN,-100),null);near(M.merge(-96,-80),-80);near(M.merge(NaN,-80),-80);assert(Number.isNaN(M.merge(NaN,NaN)));
// Two-way remains constrained to a single serving station.
near(M.merge(Math.min(-60,-100),Math.min(-95,-70)),-95);
const make=(lat=15)=>({cfg:{lat,lon:100,radius:1,mobileGain:2,mobileLoss:1,mobileHeight:1.5,mobilePattern:'omni',freq:850,noise:{down:-100},requiredSNR:10},n:3,values:{down:new Float32Array(9).fill(-80),up:new Float32Array(9).fill(-90),both:new Float32Array(9).fill(-90)},field:new Float32Array(9).fill(-81),elevation:new Float32Array(9)});
const a=make();near(M.sample(a,a.values.down,15,100),-80);assert(Number.isNaN(M.sample(a,a.values.down,16,100)));
a.values.down[4]=NaN;assert(Number.isNaN(M.sample(a,a.values.down,15,100)));
const els=new Map(),el=id=>{if(!els.has(id))els.set(id,{value:'',checked:true,disabled:false,textContent:'',style:{},classList:{toggle(){}},addEventListener(){},getContext(){},clientWidth:0,clientHeight:0});return els.get(id)};
let started=0,cancels=0,pending=[];
const engines=[0,1].map(i=>({ready:Promise.resolve(),validate(){},run(){started++;return new Promise((resolve,reject)=>pending.push({resolve,reject,i}))},cancel(){cancels++},status(){return 'working'},receiverAt:async()=>null}));
for(let i=1;i<=2;i++){el('station'+i).contentDocument={readyState:'complete'};el('station'+i).contentWindow={RFPair:engines[i-1]};el('bw'+i).value='25'}
el('display').value='merge';el('direction').value='down';
const ctx={window:{},console,RFPairMath:M,RFAntennas,Float32Array,Math,Number,Promise,performance,setTimeout,setInterval,clearInterval,localStorage:{getItem(){return null},setItem(){}},ResizeObserver:class{observe(){}},document:{getElementById:el,body:{classList:{toggle(){}}}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/multi.js','utf8'),ctx);
(async()=>{await new Promise(r=>setTimeout(r,0));let task=el('runPair').onclick();await new Promise(r=>setTimeout(r,0));assert.equal(started,2,'both engines must start before either finishes');assert(el('runPair').disabled);const r1=make(),r2=make();r1.cfg.actualGridM=r2.cfg.actualGridM=100;r1.seconds=r2.seconds=1;pending[0].resolve(r1);pending[1].resolve(r2);await task;assert.match(el('status').textContent,/สำเร็จ/);
// Cross-path adds victim antenna gain/loss to the incoming field, then subtracts FDR.
ctx.testResults=[r1,r2];vm.runInContext('results=testResults;interference=[{reject:10,pattern:null},{reject:20,pattern:null}]',ctx);const m=vm.runInContext('at(15,100,0)',ctx);near(m.i,-90);near(m.sinr,9.586073148);
vm.runInContext('results[1].field[4]=NaN',ctx);assert.equal(vm.runInContext('at(15,100,0)',ctx),null);
// Directional receiver uses bearing to interferer, not serving station's attenuation.
const pat={gain:2,h:Array(360).fill(20),v:Array(360).fill(0)};ctx.pat=pat;vm.runInContext('results[1].field[4]=-81;interference[0]={reject:10,pattern:pat};results[0].cfg.mobileOrientation="fixed";results[0].cfg.mobileAz=0',ctx);near(vm.runInContext('at(15,100,0).i',ctx),-110);
// Cancellation cannot publish partially completed combined results.
pending=[];task=el('runPair').onclick();await new Promise(r=>setTimeout(r,0));el('cancelPair').onclick();pending.forEach(p=>p.resolve(make()));await task;assert.equal(vm.runInContext('results',ctx),null);assert(cancels>=2);assert.match(el('status').textContent,/หยุด/);
// Unequal receiving heights and separated channels without FDR stay unknown.
ctx.testResults=[make(),make()];ctx.testResults[1].cfg.mobileHeight=2;vm.runInContext('results=testResults',ctx);await vm.runInContext('configureInterference()',ctx);assert.match(el('interferenceStatus').textContent,/ความสูง/);
ctx.testResults[1].cfg.mobileHeight=1.5;ctx.testResults[1].cfg.freq=851;await vm.runInContext('configureInterference()',ctx);assert.match(el('interferenceStatus').textContent,/ยังไม่มีค่า FDR/);
console.log('PASS: co/partial/non-overlapping channels, FDR, SINR, no-data, antenna direction, merge, concurrent starts and cancel');
})().catch(e=>{console.error(e);process.exitCode=1});
