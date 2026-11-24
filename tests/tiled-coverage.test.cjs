const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('dist/tiled-coverage.js','utf8'),context);
const tiled=context.RFTiledCoverage;
test('tiles preserve selected spacing and cover all cells exactly once',()=>{
 const p=tiled.plan(26,100),seen=new Uint8Array(p.cells);let cells=0;
 for(const t of tiled.tiles(p)){assert.ok(t.width<=128&&t.height<=128);for(let y=t.y;y<t.y+t.height;y++)for(let x=t.x;x<t.x+t.width;x++){const k=y*p.n+x;assert.equal(seen[k],0);seen[k]=1;cells++}}
 assert.equal(cells,p.cells);assert.ok(p.spacingM<=100);
});
test('50 m grid at 25 km fits, while large radius refuses silent degradation',()=>{
 assert.ok(tiled.plan(25,50).n>1000);
 assert.throws(()=>tiled.plan(50,50),/TILE_BUDGET/);
});
