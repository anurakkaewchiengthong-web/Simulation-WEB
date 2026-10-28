/* ITU geographic grid lookup. Values must come from licensed/official datasets. */
(function(root){
"use strict";
function parseCSV(csv){
 const lines=csv.replace(/^\uFEFF/,"").trim().split(/\r?\n/).filter(Boolean);
 const headers=lines.shift().split(",").map(s=>s.trim().replace(/^"|"$/g,"").toLowerCase());
 const lat=headers.findIndex(s=>["lat","latitude"].includes(s));
 const lon=headers.findIndex(s=>["lon","long","longitude"].includes(s));
 const val=headers.findIndex(s=>["value","logk","dn75","r001","r0.01","rain"].includes(s));
 if(lat<0||lon<0||val<0)throw Error("CSV requires latitude,longitude,value columns (or known parameter name)");
 const points=lines.map(line=>{const a=line.split(",").map(Number);return {lat:a[lat],lon:a[lon],value:a[val]}}).filter(p=>Object.values(p).every(Number.isFinite));
 if(!points.length)throw Error("CSV contains no valid numeric points");
 return points;
}
function lookup(points,lat,lon){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)throw Error("Invalid coordinates");
 const lats=[...new Set(points.map(p=>p.lat))].sort((a,b)=>a-b);
 const lons=[...new Set(points.map(p=>p.lon))].sort((a,b)=>a-b);
 const bounds=(arr,x)=>{if(x<arr[0]||x>arr[arr.length-1])throw Error("Coordinates outside dataset extent");let hi=arr.findIndex(v=>v>=x);return [arr[Math.max(0,hi-1)],arr[hi]]};
 const [a,b]=bounds(lats,lat),[c,d]=bounds(lons,lon);
 const map=new Map(points.map(p=>[p.lat+"|"+p.lon,p.value]));
 const get=(y,x)=>{const v=map.get(y+"|"+x);if(v===undefined)throw Error("Missing grid cell at "+y+","+x);return v};
 const ty=a===b?0:(lat-a)/(b-a),tx=c===d?0:(lon-c)/(d-c);
 const v0=get(a,c)*(1-tx)+get(a,d)*tx;
 const v1=get(b,c)*(1-tx)+get(b,d)*tx;
 return v0*(1-ty)+v1*ty;
}
function midpoint(lat1,lon1,lat2,lon2){
 const rad=Math.PI/180,p1=lat1*rad,p2=lat2*rad,delta=(lon2-lon1)*rad;
 const x=Math.cos(p2)*Math.cos(delta),y=Math.cos(p2)*Math.sin(delta);
 const lat=Math.atan2(Math.sin(p1)+Math.sin(p2),Math.hypot(Math.cos(p1)+x,y))/rad;
 const lon=((lon1+Math.atan2(y,Math.cos(p1)+x)/rad+540)%360)-180;
 return {lat,lon};
}
async function load(url){
 const response=await fetch(url);
 if(!response.ok)throw Error("Dataset HTTP "+response.status);
 return parseCSV(await response.text());
}
root.ITUGrid={parseCSV,lookup,midpoint,load};
})(typeof window!=="undefined"?window:globalThis);
