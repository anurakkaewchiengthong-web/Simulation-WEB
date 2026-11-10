/* Isobands from the full receiver grid. Linear interpolation inside triangles;
   missing samples remain missing. No averaging into coarse export cells. */
(function(root){
'use strict';
function clip(poly,level,above){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ina=above?a[2]>=level:a[2]<=level,inb=above?b[2]>=level:b[2]<=level;if(ina)out.push(a);if(ina!==inb){const t=(level-a[2])/(b[2]-a[2]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),level])}}return out}
const key=p=>Math.round(p[0]*1e8)+','+Math.round(p[1]*1e8);
function area(r){let a=0;for(let i=0;i<r.length-1;i++)a+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];return a/2}
function inside(p,r){let yes=false;for(let i=0,j=r.length-2;i<r.length-1;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes}return yes}
function isoband(values,n,low,high=Infinity){
 const edges=new Map();
 function triangle(t){if(t.some(p=>!Number.isFinite(p[2])))return;const min=Math.min(...t.map(p=>p[2])),max=Math.max(...t.map(p=>p[2]));if(max<low||min>=high)return;let p=clip(t,low,true);if(Number.isFinite(high)&&p.length)p=clip(p,high,false);if(p.length<3||Math.abs(area([...p,p[0]]))<1e-12)return;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],ka=key(a),kb=key(b);if(ka===kb)continue;const reverse=kb+'|'+ka;if(edges.has(reverse))edges.delete(reverse);else edges.set(ka+'|'+kb,{a,b,ka,kb})}}
 for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const a=[x,y,values[y*n+x]],b=[x+1,y,values[y*n+x+1]],c=[x+1,y+1,values[(y+1)*n+x+1]],d=[x,y+1,values[(y+1)*n+x]];triangle([a,b,c]);triangle([a,c,d])}
 const starts=new Map();for(const e of edges.values()){if(!starts.has(e.ka))starts.set(e.ka,[]);starts.get(e.ka).push(e)}
 const rings=[];for(const first of edges.values()){if(first.used)continue;const ring=[first.a];let e=first;while(e&&!e.used){e.used=true;ring.push(e.b);if(e.kb===first.ka)break;e=(starts.get(e.kb)||[]).find(v=>!v.used)}if(key(ring[0])!==key(ring.at(-1)))throw Error('Contour boundary is not closed');if(ring.length>=4&&Math.abs(area(ring))>1e-9)rings.push(ring)}
 const polygons=rings.filter(r=>area(r)>0).map(outer=>({outer,holes:[]}));for(const hole of rings.filter(r=>area(r)<0)){const containers=polygons.filter(p=>inside(hole[0],p.outer)).sort((a,b)=>area(a.outer)-area(b.outer));if(!containers.length)throw Error('Contour hole has no boundary');containers[0].holes.push(hole)}return polygons;
}
// Bilinear subdivision follows the raster field; this changes display, not RF samples.
function refine(values,n,factor=3){const size=(n-1)*factor+1,out=new Float32Array(size*size);out.fill(NaN);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const gx=x/factor,gy=y/factor,ix=Math.min(n-2,Math.floor(gx)),iy=Math.min(n-2,Math.floor(gy)),tx=gx-ix,ty=gy-iy;let sum=0,valid=true;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const w=(dx?tx:1-tx)*(dy?ty:1-ty);if(w<1e-12)continue;const v=values[(iy+dy)*n+ix+dx];if(!Number.isFinite(v)){valid=false;break}sum+=w*v}if(valid)out[y*size+x]=sum}return {values:out,n:size,factor}}
const api={isoband,area,refine};if(typeof module!=='undefined')module.exports=api;else root.RFContours=api;
})(globalThis);
