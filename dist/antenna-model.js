/* Supplied Sinclair Planet PRN cuts. 2-D cut combination is an approximation,
   not a measured 3-D pattern. V: 0 horizon, 90 down, 270 up. */
(function(root){
function eligible(model,f){return Number.isFinite(f)&&f>=model.min-1e-8&&f<=model.max+1e-8}
function atFrequency(model,f){if(!eligible(model,f))throw Error('ความถี่อยู่นอกช่วงข้อมูล pattern ของรุ่นนี้');const ps=model.patterns;let hi=ps.findIndex(p=>p.f>=f-1e-8);if(hi<0)hi=ps.length-1;const b=ps[hi],a=hi&&b.f>f+1e-8?ps[hi-1]:b,t=a===b?0:(f-a.f)/(b.f-a.f),mix=(x,y)=>x+(y-x)*t;return {id:model.id,name:model.name,kind:model.kind,min:model.min,max:model.max,frequency:f,gain:mix(a.gain,b.gain),h:a.h.map((v,i)=>mix(v,b.h[i])),v:a.v.map((v,i)=>mix(v,b.v[i])),sources:a===b?[a.source]:[a.source,b.source],referenceFrequencies:a===b?[a.f]:[a.f,b.f]}}
function sample(values,angle){const x=((angle%360)+360)%360,i=Math.floor(x),t=x-i;return values[i]*(1-t)+values[(i+1)%360]*t}
function attenuation(pattern,bearing,elevation,azimuth,tilt){const r=Math.PI/180,a=(bearing-azimuth)*r,e=elevation*r,t=tilt*r,x=Math.cos(e)*Math.cos(a),y=Math.cos(e)*Math.sin(a),z=Math.sin(e),localX=Math.cos(t)*x-Math.sin(t)*z,localZ=Math.sin(t)*x+Math.cos(t)*z,h=Math.atan2(y,localX)/r,v=Math.atan2(-localZ,Math.hypot(localX,y))/r;return sample(pattern.h,h)+sample(pattern.v,v)}
root.RFAntennas={eligible,atFrequency,sample,attenuation};
})(typeof module==='object'?module.exports:window);
