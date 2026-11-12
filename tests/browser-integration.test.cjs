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
  await p.locator('#fieldImportFile').waitFor();
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
