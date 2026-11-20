/* Dish sizing preserves the completed path and selected mode's TX/RX settings.
 * Relative aperture gain assumes unchanged frequency and efficiency (ITU-R F.2323-2).
 * A passing result must meet the target in every direction/polarization at the
 * conservative end of P.530 outage bounds. No extrapolation of rain tails. */
(function(root){'use strict';
const finite=Number.isFinite;
const modes=c=>c.amRows.length?c.amRows:[{name:c.modulation,capacity:c.capacity,powerA:c.a.power,powerB:c.b.power,thresholdA:c.a.threshold,thresholdB:c.b.threshold}];
const gain=(g,d,ref)=>g+20*Math.log10(d/ref);
function targetValid(group,t){return finite(t)&&(group==='99.9xxx'?t>=99.9&&t<99.99:group==='99.99xx'?t>=99.99&&t<100:false)&&Math.abs(t*10000-Math.round(t*10000))<1e-6}
function classify(rows,target){
 if(!rows.length||rows.some(x=>!x.total||!finite(x.total.lo)||!finite(x.total.hi)))return {status:'missing',low:null,high:null};
 const low=Math.min(...rows.map(x=>100-x.total.hi)),high=Math.min(...rows.map(x=>100-x.total.lo));
 return {status:low>=target?'pass':high<target?'fail':'uncertain',low,high,minutesLow:(100-high)*5256,minutesHigh:(100-low)*5256};
}
function evaluate(c,r,o){
 const out={...structuredClone(o),at:new Date().toISOString(),errors:[],candidates:[],recommendation:null,mode:modes(c)[o.modeIndex]};
 if(!targetValid(o.group,o.target))out.errors.push('ระบุ Target ให้ตรงกลุ่ม โดยใช้ทศนิยมไม่เกิน 4 ตำแหน่ง และต้องน้อยกว่า 100%');
 if(!out.mode||!['powerA','powerB','thresholdA','thresholdB'].every(k=>finite(out.mode[k])))out.errors.push('เลือก modulation ที่มี TX power และ RX threshold ครบทั้งสองฝั่ง');
 if(r.clear!==true||!(r.minLOS>0)||r.missing)out.errors.push('แนวลิงก์ต้องผ่าน LOS และเกณฑ์ Fresnel ที่เลือกก่อน — เพิ่มขนาดจานไม่แก้การบดบัง');
 if(!finite(c.availability?.logK)||!finite(c.availability?.dN75)||!finite(c.rainRate))out.errors.push('ต้องมี LogK, dN75 และ R₀.₀₁ ของพื้นที่ครบ');
 if(!['estimate','vendor'].includes(o.gainSource))out.errors.push('เลือกแหล่งข้อมูล gain');
 if(o.gainSource==='estimate')for(const key of ['a','b']){
  const p=c[key],eff=10**(p.gain/10)/(Math.PI*p.diameter*c.freq/0.299792458)**2;
  if(!(p.diameter>0&&finite(p.gain)&&eff>0&&eff<=1))out.errors.push('ตรวจขนาดจานและ gain อ้างอิงฝั่ง '+key.toUpperCase()+' ให้สอดคล้องกับความถี่');
 }
 if(o.gainSource==='vendor'&&!o.source?.trim())out.errors.push('ระบุรุ่นจาน / เอกสารอ้างอิง gain จากผู้ผลิต');
 if(!Array.isArray(o.sizes)||!o.sizes.length||o.sizes.some(x=>!(x.diameter>0)||!finite(x.diameter)))out.errors.push('ระบุขนาดจานที่ต้องการประเมิน');
 if(o.gainSource==='vendor'&&o.sizes.some(x=>!finite(x.gainA)||!finite(x.gainB)))out.errors.push('กรอก gain จากผู้ผลิตให้ครบทุกขนาด ทั้ง A และ B ที่ความถี่ใช้งาน');
 out.reference={frequency:c.freq,a:{diameter:c.a.diameter,gain:c.a.gain},b:{diameter:c.b.diameter,gain:c.b.gain}};
 if(out.errors.length)return out;
 const m=out.mode,s=structuredClone(c.availability),deg=s.modeDegradation?.[m.name]||(c.amRows.length?[null,null]:[s.mpDeg,s.rainDeg]);
 s.modeDegradation={[m.name]:deg};
 for(const size of [...o.sizes].sort((a,b)=>a.diameter-b.diameter)){
  const ga=o.gainSource==='estimate'?gain(c.a.gain,size.diameter,c.a.diameter):size.gainA,gb=o.gainSource==='estimate'?gain(c.b.gain,size.diameter,c.b.diameter):size.gainB;
  const delta=ga-c.a.gain+gb-c.b.gain,cc={...c,amRows:[m],a:{...c.a,gain:ga,diameter:size.diameter},b:{...c.b,gain:gb,diameter:size.diameter}};
  const rr={...r,ab:{...r.ab,planned:r.ab.planned+delta},ba:{...r.ba,planned:r.ba.planned+delta}};
  const av=root.MWAvailability.evaluate(cc,rr,s),summary=classify(av.rows,o.target);
  out.candidates.push({diameter:size.diameter,gainA:ga,gainB:gb,...summary,rows:av.rows,errors:[...new Set(av.rows.flatMap(x=>x.errors))],note:av.mp.note||'',rslAtoB:rr.ab.planned+m.powerA-c.a.power,rslBtoA:rr.ba.planned+m.powerB-c.b.power});
 }
 out.recommendation=out.candidates.find(x=>x.status==='pass')?.diameter??null;
 return out;
}
const labels={pass:'ผ่านเป้าหมาย',fail:'ไม่ผ่าน',uncertain:'ยังยืนยันไม่ได้',missing:'ข้อมูลไม่ครบ / นอกขอบเขต'};
const esc=x=>String(x??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
const f=(n,d=4)=>finite(n)?n.toFixed(d):'—';
function html(o){
 if(!o)return '<p>ยังไม่ได้ประเมินขนาดจานสำหรับผลคำนวณนี้</p>';
 let h='<p>Target availability <b>'+f(o.target)+'%</b> · Modulation ที่ต้องการรักษา: <b>'+esc(o.mode?.name||'ยังไม่เลือก')+'</b> · พิจารณาทั้ง A → B และ B → A และทุก polarization ที่เลือก</p>';
 if(o.errors.length)return h+'<ul class="warning">'+o.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>';
 h+='<div class="summary"><b>'+(o.recommendation!==null?'แนะนำจาน '+f(o.recommendation,2)+' เมตร ทั้งสถานี A และ B':'ยังไม่มีขนาดจานที่ยืนยันผ่านเป้าหมายได้')+'</b><p>'+(o.recommendation!==null?'เป็นขนาดเล็กสุดที่ยืนยันผ่านได้ในชุดที่ประเมิน โดยใช้ขอบเขต Availability ด้านต่ำ':'ตรวจสถานะและรายละเอียดด้านล่าง ไม่สรุปแนะนำขนาดนอกชุดที่ประเมิน')+'</p></div>';
 h+='<p>ยอมให้หยุดจากการแพร่คลื่นได้ไม่เกิน '+f((100-o.target)*5256,2)+' นาที/ปี/ทิศทาง/โพลาไรซ์ · 365 วัน/ปี</p><div class="dish-table"><table><thead><tr><th>จาน A / B (m)</th><th>Gain A / B (dBi)</th><th>Availability ต่ำสุดในทุกทิศทาง/โพลาไรซ์ (%)</th><th>Outage สูงสุด (นาที/ปี)</th><th>ผลประเมิน</th></tr></thead><tbody>';
 for(const x of o.candidates)h+='<tr'+(x.diameter===o.recommendation?' class="dish-recommended"':'')+'><td>'+f(x.diameter,2)+' / '+f(x.diameter,2)+'</td><td>'+f(x.gainA,2)+' / '+f(x.gainB,2)+'</td><td>'+f(x.low,6)+(x.low!==x.high?' – '+f(x.high,6):'')+'</td><td>'+f(x.minutesHigh,2)+'</td><td><b>'+labels[x.status]+'</b></td></tr>';
 h+='</tbody></table></div>';
 h+='<p class="note">TX A/B '+f(o.mode.powerA,2)+' / '+f(o.mode.powerB,2)+' dBm · RX threshold A/B '+f(o.mode.thresholdA,2)+' / '+f(o.mode.thresholdB,2)+' dBm · Capacity '+f(o.mode.capacity,1)+' Mbps ตามโหมดที่เลือก ไม่รวม 2+0 อัตโนมัติ</p>';
 h+='<p class="note">'+(o.gainSource==='estimate'?'Gain เป็นค่าประมาณ: Gใหม่ = Gอ้างอิง + 20 log₁₀(Dใหม่ / Dอ้างอิง) โดยสมมติประสิทธิภาพจานและความถี่เท่าเดิม อ้างอิง A: '+f(o.reference.a.diameter,2)+' m / '+f(o.reference.a.gain,2)+' dBi, B: '+f(o.reference.b.diameter,2)+' m / '+f(o.reference.b.gain,2)+' dBi ที่ '+f(o.reference.frequency,3)+' GHz — ต้องยืนยัน gain ของรุ่นจริงก่อนเลือกซื้อ':'Gain จากข้อมูลผู้ผลิตที่ผู้ใช้ระบุ: '+esc(o.source))+'</p>';
 h+='<p class="note">คงกำลังส่ง ความสูงจาน losses และ degradation ของโหมดเดิม ต้องตรวจ XPD/XPIC กำลังรับสูงสุด แรงลมและโครงสร้างรองรับของจานจริงอีกครั้ง · ไม่ได้เปลี่ยนจานใน Link Budget หลักให้โดยอัตโนมัติ · ผลนี้เป็น availability ด้านการแพร่คลื่น ไม่รวมไฟฟ้าและอุปกรณ์เสีย และไม่ใช่ SLA รวมสองทิศทาง</p>';
 h+='<p class="note">ช่วงค่าเกิดจากขอบเขตสมการฝน 0.001–1% หากเป้าหมายอยู่ในช่วงที่ยังแยกไม่ได้จะแสดง “ยังยืนยันไม่ได้” ไม่ extrapolate เพื่อให้ผ่าน · อ้างอิง gain: <a href="https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-F.2323-2-2023-PDF-E.pdf" target="_blank" rel="noopener">ITU-R F.2323-2</a></p>';
 for(const x of o.candidates){h+='<details><summary>รายละเอียดจาน '+f(x.diameter,2)+' m · '+labels[x.status]+'</summary><p>RSL design A→B / B→A '+f(x.rslAtoB,2)+' / '+f(x.rslBtoA,2)+' dBm</p><ul>'+x.rows.map(row=>'<li>'+esc(row.direction==='ab'?'A → B':'B → A')+' / '+esc(row.pol)+' · Availability '+(row.total?f(100-row.total.hi,6)+' – '+f(100-row.total.lo,6)+'%':esc(row.errors.join(' · ')))+'</li>').join('')+'</ul>'+(x.note?'<p>'+esc(x.note)+'</p>':'')+'</details>'}
 return h;
}
const api={modes,gain,targetValid,classify,evaluate,html};if(typeof module==='object')module.exports=api;else root.MWDish=api;
})(globalThis);
