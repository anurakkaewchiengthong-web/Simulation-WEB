(function(root){
'use strict';
const relative=(c,lat,lon)=>({x:((lon-c.lon+540)%360-180)*111.195*Math.cos(c.lat*Math.PI/180),y:(lat-c.lat)*111.195});
function sample(s,values,lat,lon){const p=relative(s.cfg,lat,lon),n=s.n;if(Math.hypot(p.x,p.y)>s.cfg.radius)return NaN;const x=p.x*n/(2*s.cfg.radius)+n/2-.5,y=n/2-.5-p.y*n/(2*s.cfg.radius),x0=Math.floor(x),y0=Math.floor(y);let sum=0,weight=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const w=(dx?x-x0:1-x+x0)*(dy?y-y0:1-y+y0);if(w<1e-12)continue;const xx=x0+dx,yy=y0+dy;if(xx<0||xx>=n||yy<0||yy>=n)return NaN;const v=values[yy*n+xx];if(!Number.isFinite(v))return NaN;sum+=w*v;weight+=w}return weight?sum/weight:NaN}
function merge(a,b){return Number.isFinite(a)?(Number.isFinite(b)?Math.max(a,b):a):b}
// FDR is total frequency-dependent rejection for this transmitter/receiver pair.
// With no measured FDR, overlapping rectangular spectra give a screening estimate only.
function rejection(fVictim,fOther,bwVictim,bwOther,fdr){if(fdr!==null)return fdr;const delta=Math.abs(fVictim-fOther)*1000;const overlap=Math.max(0,Math.min(bwVictim/2,delta+bwOther/2)-Math.max(-bwVictim/2,delta-bwOther/2));return overlap>0?-10*Math.log10(overlap/bwOther):NaN}
function metrics(c,i,n){if(![c,i,n].every(Number.isFinite))return null;const m=Math.max(i,n),total=m+10*Math.log10(10**((i-m)/10)+10**((n-m)/10));return {ci:c-i,sinr:c-total,i}}
root.RFPairMath={relative,sample,merge,rejection,metrics};
})(typeof module==='object'?module.exports:window);
