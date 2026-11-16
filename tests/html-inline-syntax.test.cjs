'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
for(const name of ['single.html','index.html','microwave.html','wifi.html']){
 test(name+' inline scripts parse',()=>{
  const html=fs.readFileSync('dist/'+name,'utf8');
  const scripts=html.split('<script').slice(1).map(x=>x.split('</script>')[0]).map(x=>x.slice(x.indexOf('>')+1)).filter(x=>x.trim());
  assert.ok(scripts.length>0);
  for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script,{filename:name}));
 });
}
