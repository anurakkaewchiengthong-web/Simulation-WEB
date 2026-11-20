/* ITU-R P.530-18 §§2.3.1, 2.3.2, 2.3.4, 2.4.1; P.838-3 equations 1–5.
 * Percentages throughout, not fractions. Rain inversion restricted to 0.001–1%.
 * No frequency-selective fading, diversity, wet snow, or automatic XPD model. */
(function(root){'use strict';
const pow=x=>10**x, log=Math.log10, finite=x=>typeof x==='number'&&Number.isFinite(x);
function coefficients(f,pol,elevation=0){
 const fit=(a,b,c,m,k)=>a.reduce((s,v,i)=>s+v*Math.exp(-(((log(f)-b[i])/c[i])**2)),m*log(f)+k);
 const kh=pow(fit([-5.33980,-.35351,-.23789,-.94158],[-.10008,1.26970,.86036,.64552],[1.13098,.454,.15354,.16817],-.18961,.71147));
 const kv=pow(fit([-3.80595,-3.44965,-.39902,.50167],[.56934,-.22911,.73042,1.07319],[.81061,.51059,.11899,.27195],-.16398,.63297));
 const ah=fit([-.14318,.29591,.32177,-5.37610,16.1721],[1.82442,.77564,.63773,-.96230,-3.29980],[-.55187,.19822,.13164,1.47828,3.43990],.67849,-1.95537);
 const av=fit([-.07771,.56727,-.20238,-48.2991,48.5833],[2.33840,.95545,1.14520,.791669,.791459],[-.76284,.54039,.26809,.116226,.116479],-.053739,.83433);
 const q=Math.cos(elevation*Math.PI/180)**2*(pol==='H'?1:-1),k=(kh+kv+(kh-kv)*q)/2;
 return {k,alpha:(kh*ah+kv*av+(kh*ah-kv*av)*q)/(2*k)};
}
function rainModel(d,f,R,pol,elevation){
 if(!(d>0&&d<=60&&f>=1&&f<=100&&finite(R)&&R>=0))return {error:'ฝน: ต้องมี R0.01 ≥ 0, ความถี่ 1–100 GHz และระยะ ≤ 60 km'};
 if(R===0)return {k:0,alpha:0,gamma:0,factor:1,a001:0,attenuation:()=>0,zeroRain:true};
 const {k,alpha}=coefficients(f,pol,elevation),gamma=k*R**alpha,den=.477*d**.633*R**(.073*alpha)*f**.123-10.579*(1-Math.exp(-.024*d));
 if(!(den>0))return {error:'ฝน: distance factor ไม่อยู่ในขอบเขตใช้งาน'};
 const factor=1/den,a001=gamma*d*factor,c0=f<10?.12:.12+.4*log((f/10)**.8),c1=.07**c0*.12**(1-c0),c2=.855*c0+.546*(1-c0),c3=.139*c0+.043*(1-c0);
 const attenuation=p=>a001*c1*p**(-(c2+c3*log(p)));
 return {k,alpha,gamma,factor,a001,attenuation};
}
function rainOutage(model,margin){
 if(model.error)return {error:model.error};
 if(!(margin>0))return {error:'Fade margin หลัง degradation ต้องมากกว่า 0 dB'};
 if(model.zeroRain)return {lo:0,hi:0,bound:false};
 if(margin>model.attenuation(.001))return {lo:0,hi:.001,bound:true};
 if(margin<model.attenuation(1))return {lo:1,hi:100,bound:true};
 let lo=-3,hi=0;for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(model.attenuation(pow(mid))>margin)lo=mid;else hi=mid;}
 const p=pow((lo+hi)/2);return {lo:p,hi:p,bound:false};
}
function multipath(c,r,settings){
 const d=r.distance/1000,h1=c.a.ground+c.a.antAGL,h2=c.b.ground+c.b.antAGL,epsilon=Math.abs(h2-h1)/d;
 let integral=0;for(let i=1;i<r.rows.length;i++)integral+=(r.rows[i].x-r.rows[i-1].x)*(r.rows[i].ground+r.rows[i-1].ground)/2;
 const ht=integral/r.distance,hc=(h1+h2)/2-d*d/102-ht;
 const mid=root.MWMath?root.MWMath.direct(c.a,r.bearing,r.distance/2):{lat:(c.a.lat+c.b.lat)/2};
 const lat=Math.abs(mid.lat),delta=Math.min(10.8,10.5-5.6*log(1.1+(lat<=45?1:-1)*Math.abs(Math.cos(2*lat*Math.PI/180))**.7)-2.7*log(d)+1.7*log(1+epsilon));
 if(d<=5)return {p0:0,delta,hc,ht,epsilon,note:'ระยะ ≤ 5 km: กำหนด multipath = 0 ตาม §2.3.1'};
 if(c.freq<15/d||c.freq>45||d>300||epsilon>37)return {error:'Multipath: นอกช่วงใช้งานที่รองรับ (f ≥ 15/d ถึง 45 GHz, d ≤ 300 km, slope ≤ 37 mrad)'};
 if(!finite(settings.logK)||!finite(settings.dN75)||settings.dN75<0)return {delta,hc,ht,epsilon,error:'ยังขาด LogK หรือ dN75 ของพื้นที่ — ไม่แทนด้วยค่าทั่วไป'};
 const vsr=Math.min((settings.dN75/50)**1.8*Math.exp(-hc/(2.5*Math.sqrt(d))),settings.dN75*d**1.5*Math.sqrt(c.freq)/24730);
 const p0=pow(settings.logK)*d**3.51*(c.freq*c.freq+13)**.447*pow(-.376*Math.tanh((hc-147)/125)-.334*epsilon**.39-.00027*Math.min(h1,h2)+17.85*vsr);
 if(!(p0>0&&p0<2000))return {error:'Multipath: p0 อยู่นอกช่วงที่แบบจำลองรองรับ'};
 return {p0,delta,hc,ht,epsilon,vsr,note:(hc<26||hc>1180||Math.min(h1,h2)<17||Math.min(h1,h2)>2300||settings.dN75>54||d<7.5)?'บางพารามิเตอร์อยู่นอกช่วงข้อมูลทดลองของ P.530-18; ใช้ผลเป็นประมาณการ':''};
}
function fading(p0,A,delta=0){
 if(!(A>0))return null;if(p0===0)return 0;
 const at=25+1.2*log(p0),conversion=pow(-delta/10);
 if(A>=at)return p0*pow(-A/10)*conversion;
 const pt=p0*pow(-at/10)*conversion;
 if(!(at>0&&pt>0&&pt<100))return null;
 const qaPrime=-20*log(-Math.log1p(-pt/100))/at;
 const qt=(qaPrime-2)/((1+.3*pow(-at/20))*pow(-.016*at))-4.3*(pow(-at/20)+at/800);
 const qa=2+(1+.3*pow(-A/20))*pow(-.016*A)*(qt+4.3*(pow(-A/20)+A/800));
 return Math.max(0,Math.min(100,-100*Math.expm1(-pow(-qa*A/20))));
}
function evaluate(c,r,s){
 const mp=multipath(c,r,s),pols=c.polarization==='H+V'?['H','V']:[c.polarization];
 const h1=c.a.ground+c.a.antAGL,h2=c.b.ground+c.b.antAGL;
 const rain=Object.fromEntries(pols.map(p=>[p,rainModel(r.distance/1000,c.freq,c.rainRate,p,Math.atan2(h2-h1,r.distance)*180/Math.PI)]));
 const modes=c.amRows.length?c.amRows:[{name:c.modulation,capacity:c.capacity,powerA:c.a.power,powerB:c.b.power,thresholdA:c.a.threshold,thresholdB:c.b.threshold}];
 const rows=[];
 for(const m of modes){const deg=s.modeDegradation?.[m.name]||(c.amRows.length?[null,null]:[s.mpDeg,s.rainDeg]);
 for(const direction of ['ab','ba'])for(const pol of pols){
 const thermal=direction==='ab'?r.ab.planned+m.powerA-c.a.power-m.thresholdB:r.ba.planned+m.powerB-c.b.power-m.thresholdA;
 const errors=[];
 if(c.xpic==='Enable'&&(!finite(deg[0])||!finite(deg[1])))errors.push('XPIC: ต้องกรอก XPD degradation ของโหมดนี้ (ใส่ 0 ได้เมื่อยืนยันว่าไม่เผื่อ)');
 const flat=c.xpic==='Enable'&&!finite(deg[0])?NaN:thermal-(deg[0]??0),wet=c.xpic==='Enable'&&!finite(deg[1])?NaN:thermal-(deg[1]??0);
 const annual=mp.error?null:fading(mp.p0,flat,mp.delta),worst=mp.error?null:fading(mp.p0,flat);
 const ro=rainOutage(rain[pol],wet);
 if(mp.error)errors.push(mp.error);else if(annual===null)errors.push('Multipath fade margin ต้องมากกว่า 0');
 if(ro.error)errors.push(ro.error);
 if(r.minLOS<=0||r.missing||r.rows.some((p,i)=>i>0&&i<r.rows.length-1&&Number.isFinite(p.los)&&p.los-p.ground-c.clutter-p.x*(r.distance-p.x)/(2*(4/3)*6371000)<=0))errors.push('แนว LOS ถูกกีดขวาง/ข้อมูลขาด — ไม่สรุป availability ด้วยแบบจำลอง LOS');
 const total=errors.length?null:{lo:Math.min(100,annual+ro.lo),hi:Math.min(100,annual+ro.hi),bound:ro.bound};
 rows.push({mode:m.name,capacity:m.capacity,direction,pol,thermal,flat,wet,annual,worst,rain:ro,total,errors});
 }}return {mp,rain,rows};
}
const api={coefficients,rainModel,rainOutage,multipath,fading,evaluate};if(typeof module==='object')module.exports=api;else root.MWAvailability=api;
})(globalThis);
