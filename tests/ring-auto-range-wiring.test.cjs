'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dist/single.html','utf8');
test('ring search scripts load in dependency order before inline application',()=>{
 const a=html.indexOf('<script src="ring-search.js"></script>'),b=html.indexOf('<script src="ring-rf-adapter.js"></script>'),c=html.indexOf('<script>const ids=');
 assert.ok(a>=0&&b>a&&c>b);
});
test('ring mode is opt-in and preserves terrain-enabled legacy search',()=>{
 assert.match(html,/id="ringAutoRange" type="checkbox"/);
 assert.match(html,/a\.ringAutoRange=el\('ringAutoRange'\)\.checked/);
 assert.match(html,/if\(c\.ringAutoRange&&!c\.terrain\)\{await expandRingRange\(c,token,maxRadius\);return\}/);
 assert.match(html,/let blankRings=0;/);
});
test('ring search never bypasses fixed-grid compute budget',()=>{
 assert.match(html,/maxSearchRadiusKm:maxRadius/);
 assert.match(html,/c\.radius=Math\.min\(maxRadius/);
 assert.match(html,/stopReason==='dem-incomplete'/);
});
