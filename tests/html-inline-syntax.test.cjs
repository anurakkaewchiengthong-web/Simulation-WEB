'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const name of ['single.html','index.html','microwave.html','wifi.html']){
 test(name+' inline scripts parse',()=>{
  const html=fs.readFileSync('dist/'+name,'utf8');
  const scripts=[...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)].map(x=>x[1]).filter(x=>x.trim());
  assert.ok(scripts.length>0);
  for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script,{filename:name}));
 });
}
