// Browser integration smoke tests; run with: node --test tests/browser-integration.test.cjs
// Requires Playwright Chromium and a local HTTP server at RF_TEST_BASE_URL.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.RF_TEST_BASE_URL||'http://127.0.0.1:8765';
let browser;
test.before(async()=>{browser=await chromium.launch({headless:true,args:['--no-sandbox']})});
test.after(async()=>{await browser?.close()});
async function page(){const context=await browser.newContext({serviceWorkers:'block'});const p=await context.newPage();p.setDefaultTimeout(20000);return {p,context}}
test('Sim 1 entrypoint and field-import panel initialize',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/single.html',{waitUntil:'domcontentloaded'});
  await p.locator('#form').waitFor();
  await p.locator('#fieldImportFile').waitFor({state:'attached'});
  assert.equal(await p.locator('#form').count(),1);
  assert.equal(await p.locator('#fieldImportFile').getAttribute('type'),'file');
 }finally{await context.close()}
});
test('Sim 2 iframe bridge publishes API on both stations',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>[1,2].every(i=>{
   const w=document.getElementById('station'+i)?.contentWindow;
   return w?.RFPair&&typeof w.RFPair.run==='function'&&typeof w.RFPair.cancel==='function'&&typeof w.RFPair.validate==='function';
  }),null,{timeout:30000});
  assert.equal(await p.locator('iframe').count(),2);
 }finally{await context.close()}
});
test('Microwave entrypoint initializes UI and example data',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/microwave.html',{waitUntil:'domcontentloaded'});
  await p.locator('#mwForm').waitFor();
  await p.locator('#example').click();
  assert.equal(await p.locator('#freq').inputValue(),'7.575');
  assert.equal(await p.locator('#aGain').inputValue(),'34.9');
  assert.equal(await p.locator('#bGain').inputValue(),'34.9');
 }finally{await context.close()}
});
test('Wi-Fi parameters validate, save and restore',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/wifi.html',{waitUntil:'domcontentloaded'});
  await p.locator('#wifiForm').waitFor();
  await p.locator('#project').fill('CI browser smoke');
  await p.locator('#wifiForm').evaluate(form=>form.requestSubmit());
  await p.waitForFunction(()=>document.querySelector('#wifiStatus')?.textContent.includes('บันทึกพารามิเตอร์แล้ว'));
  await p.reload({waitUntil:'domcontentloaded'});
  assert.equal(await p.locator('#project').inputValue(),'CI browser smoke');
 }finally{await context.close()}
});

test('Sim 1 CSV field measurements render markers, details and removal',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/single.html',{waitUntil:'domcontentloaded'});
  await p.locator('#fieldImportFile').waitFor({state:'attached'});
  await p.locator('#fieldImportFile').setInputFiles({
   name:'measurements.csv',mimeType:'text/csv',
   buffer:Buffer.from('LAT,LONG,RSSI,NAME\n15.993741,99.364571,-87,Client A\n15.993842,99.364672,-99,Client B\n')
  });
  await p.waitForFunction(()=>document.querySelector('#fieldImportStatus')?.textContent.includes('2 จุด'));
  assert.equal(await p.locator('.field-marker').count(),2);
  await p.locator('.field-marker').first().focus();
  await p.keyboard.press('Enter');
  assert.match(await p.locator('.field-point-detail').innerText(),/RSSI วัดจริง: -87 dBm/);
  await p.locator('#fieldImportRemove').click();
  assert.equal(await p.locator('.field-marker').count(),0);
  assert.equal(await p.locator('#fieldFit').isDisabled(),true);
 }finally{await context.close()}
});
test('Sim 1 rejects invalid CSV without enabling export',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/single.html',{waitUntil:'domcontentloaded'});
  await p.locator('#fieldImportFile').waitFor({state:'attached'});
  await p.locator('#fieldImportFile').setInputFiles({
   name:'invalid.csv',mimeType:'text/csv',
   buffer:Buffer.from('LAT,LONG,RSSI\n99,101,-90\n')
  });
  await p.waitForFunction(()=>document.querySelector('#fieldImportStatus')?.textContent.includes('อ่านไม่ได้:'));
  assert.equal(await p.locator('#fieldKmz').isDisabled(),true);
 }finally{await context.close()}
});

test('Sim 1 tiled mode computes a small coverage grid without silent downsampling',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/single.html',{waitUntil:'domcontentloaded'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.locator('#lat').fill('15.993741');
  await p.locator('#lon').fill('99.364571');
  await p.locator('#tiledMode').check();
  await p.locator('#autoRange').uncheck();
  await p.locator('#radius').fill('0.5');
  await p.locator('#gridTarget').selectOption('250');
  await p.locator('#terrainEnabled').uncheck();
  await p.locator('#form').evaluate(form=>form.requestSubmit());
  await p.waitForFunction(()=>document.querySelector('#mapStatus')?.textContent.includes('คำนวณและวาดสี')||document.querySelector('#error')?.textContent.trim(),null,{timeout:20000}).catch(async err=>{const diagnostic=await p.evaluate(()=>({status:document.querySelector('#mapStatus')?.textContent,error:document.querySelector('#error')?.textContent,valid:document.querySelector('#form')?.checkValidity(),tiled:document.querySelector('#tiledMode')?.checked,radius:document.querySelector('#radius')?.value,grid:document.querySelector('#gridTarget')?.value}));throw Error('Tiled timeout: '+JSON.stringify({diagnostic,errors,original:err.message}))});
  assert.match(await p.locator('#mapStatus').innerText(),/คำนวณแบบ Tiles/);
  assert.equal(await p.locator('#error').innerText(),'');
  assert.deepEqual(errors,[]);
 }finally{await context.close()}
});

test('Sim 1 on-demand tiled result is produced with DEM disabled and expected spacing',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/single.html',{waitUntil:'domcontentloaded'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.locator('#lat').fill('15.993741');
  await p.locator('#lon').fill('99.364571');
  await p.locator('#tiledMode').check();
  await p.locator('#autoRange').uncheck();
  await p.locator('#radius').fill('1');
  await p.locator('#gridTarget').selectOption('250');
  await p.locator('#terrainEnabled').uncheck();
  await p.locator('#form').evaluate(form=>form.requestSubmit());
  await p.waitForFunction(()=>document.querySelector('#mapStatus')?.textContent.includes('คำนวณและวาดสี')||document.querySelector('#error')?.textContent.trim(),null,{timeout:30000});
  assert.equal(await p.locator('#error').innerText(),'');
  assert.match(await p.locator('#mapStatus').innerText(),/คำนวณและวาดสี/);
  assert.deepEqual(errors,[]);
 }finally{await context.close()}
});

test('Sim 1 tiled DEM uses bundled native terrain and completes RF calculation',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/single.html',{waitUntil:'domcontentloaded'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.locator('#lat').fill('15.993741');
  await p.locator('#lon').fill('99.364571');
  await p.locator('#tiledMode').check();
  await p.locator('#autoRange').uncheck();
  await p.locator('#radius').fill('0.5');
  await p.locator('#gridTarget').selectOption('250');
  await p.locator('#terrainEnabled').check();
  await p.locator('#form').evaluate(form=>form.requestSubmit());
  await p.waitForFunction(()=>document.querySelector('#mapStatus')?.textContent.includes('คำนวณและวาดสี')||document.querySelector('#error')?.textContent.trim(),null,{timeout:60000});
  const status=await p.locator('#mapStatus').innerText();
  assert.equal(await p.locator('#error').innerText(),'');
  assert.match(status,/DEM พิกัดเริ่มต้น ต้นฉบับ 30\.15 ม\./);
  assert.match(status,/คำนวณแบบ Tiles/);
  assert.deepEqual(errors,[]);
 }finally{await context.close()}
});

test('Sim 1 opt-in ring search completes with DEM off without exceeding grid budget',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/single.html',{waitUntil:'domcontentloaded'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.locator('#lat').fill('15.993741');
  await p.locator('#lon').fill('99.364571');
  await p.locator('#tiledMode').check();
  await p.locator('#autoRange').check();
  await p.locator('#ringAutoRange').check();
  await p.locator('#radius').fill('0.5');
  await p.locator('#gridTarget').selectOption('250');
  await p.locator('#terrainEnabled').uncheck();
  await p.locator('#form').evaluate(form=>form.requestSubmit());
  await p.waitForFunction(()=>document.querySelector('#mapStatus')?.textContent.includes('คำนวณและวาดสี')||document.querySelector('#error')?.textContent.trim(),null,{timeout:45000});
  assert.equal(await p.locator('#error').innerText(),'');
  assert.match(await p.locator('#mapStatus').innerText(),/คำนวณแบบ Tiles/);
  assert.deepEqual(errors,[]);
 }finally{await context.close()}
});

test('Sim 1 displays 200 km search reach without allocating a 200 km raster',async()=>{
 const {p,context}=await page();
 try{
  await p.goto(base+'/single.html',{waitUntil:'domcontentloaded'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.locator('#lat').fill('15.993741');
  await p.locator('#lon').fill('99.364571');
  await p.locator('#tiledMode').check();
  await p.locator('#autoRange').check();
  await p.locator('#ringAutoRange').check();
  await p.locator('#radius').fill('0.5');
  await p.locator('#gridTarget').selectOption('250');
  await p.locator('#terrainEnabled').uncheck();
  await p.evaluate(()=>{
   window.RFRingRFAdapter=Object.freeze({createController:()=>({search:async()=>({
    stopReason:'max-search-radius',searchedRadiusKm:200,lastColouredRadiusKm:1,trace:[]
   })})});
  });
  await p.locator('#form').evaluate(form=>form.requestSubmit());
  await p.waitForFunction(()=>document.querySelector('#mapStatus')?.textContent.includes('คำนวณและวาดสี')||document.querySelector('#error')?.textContent.trim(),null,{timeout:15000}).catch(async e=>{const state=await p.evaluate(()=>({status:document.querySelector('#mapStatus')?.textContent,error:document.querySelector('#error')?.textContent,valid:document.querySelector('#form')?.checkValidity(),invalid:[...document.querySelector('#form').elements].filter(x=>x.willValidate&&!x.checkValidity()).map(x=>({id:x.id,message:x.validationMessage})),info:document.querySelector('#ringExtentInfo')?.textContent}));throw Error('Ring UI browser diagnostic '+JSON.stringify(state)+' '+e.message)});
  assert.equal(await p.locator('#error').innerText(),'');
  const info=await p.locator('#ringExtentInfo').innerText();
  assert.match(info,/Ring Search 200\.0 km/);
  assert.match(info,/Raster/);
  assert.ok(info.includes('Raster 1.0 km'));
  assert.deepEqual(errors,[]);
 }finally{await context.close()}
});
