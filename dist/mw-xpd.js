/* ITU-R P.530-18 §4.1 eq.101–107. Equivalent margin, not threshold degradation. */
(function(root){'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),f=x=>finite(x)?x.toFixed(3):'—';
function calculate(o){const v={...o,errors:[],rows:[]};
for(const key of ['xpdA','xpdB'])if(!finite(o[key])||o[key]<0)v.errors.push('ต้องมี Antenna XPD A/B ≥ 0 dB');
if(!finite(o.p0Percent)||o.p0Percent<=0)v.errors.push('ต้องมี multipath p₀ > 0% ที่คำนวณได้จากลิงก์');
if(!finite(o.freq)||o.freq<=0)v.errors.push('ความถี่ต้องมากกว่า 0');
if(!['single','separate'].includes(o.layout))v.errors.push('เลือกโครงสร้าง H/V');
if(o.layout==='separate'&&['spacingA','spacingB'].some(k=>!finite(o[k])||o[k]<0))v.errors.push('กรอกระยะห่างแนวดิ่งจาน H/V ทั้งสองสถานี');
if(v.errors.length)return v;
v.xpdg=Math.min(o.xpdA,o.xpdB);v.xpd0=Math.min(v.xpdg+5,40);v.P0=o.p0Percent/100;v.eta=-Math.expm1(-.2*v.P0**.75);v.lambda=.299792458/o.freq;
for(const dir of ['ab','ba']){const rx=dir==='ab'?'B':'A',tx=dir==='ab'?'A':'B',k=o.layout==='single'?.7:1-.3*Math.exp(-4e-6*(o['spacing'+tx]/v.lambda)**2),Q=-10*Math.log10(k*v.eta/v.P0),C=v.xpd0+Q;
for(const m of o.modes){const ci=m['ci'+rx],xpif=o.xpic?o['xpif'+rx]:0,missing=[];if(!finite(ci))missing.push('C₀/I ภาครับ '+rx);if(!finite(xpif)||xpif<0)missing.push('XPIF ภาครับ '+rx);v.rows.push({name:m.name,dir,ci,xpif,k,Q,C,margin:missing.length?null:C-ci+xpif,missing});}}
return v;}
function html(v){if(!v)return '<p>คำนวณลิงก์เพื่อเตรียมค่า Mₓₚᴅ</p>';let h='<p><b>Mₓₚᴅ = C − C₀/I'+(v.xpic?' + XPIF':'')+'</b> · dB · clear-air/multipath</p>';if(v.errors.length)return h+'<p>'+v.errors.map(esc).join(' · ')+'</p>';
h+='<p>XPD A/B = '+f(v.xpdA)+' / '+f(v.xpdB)+' dB · XPIF A/B = '+f(v.xpifA)+' / '+f(v.xpifB)+' dB · '+esc(v.xpifSource)+'</p><p>XPDg = min(XPD A, XPD B) = '+f(v.xpdg)+' dB · XPD₀ = min(XPDg + 5, 40) = '+f(v.xpd0)+' dB</p><p>p₀ = '+v.p0Percent.toFixed(6)+'% → P₀ = p₀/100 = '+v.P0.toPrecision(6)+' · η = 1 − exp(−0.2 P₀^0.75) = '+v.eta.toPrecision(6)+'</p><p>Q = −10 log₁₀(kXP η/P₀) · C = XPD₀ + Q · kXP = 0.7 สำหรับจานร่วม; จานแยก: 1 − 0.3 exp[−4×10⁻⁶(sₜ/λ)²] · λ = 0.299792458/fGHz</p>';
h+='<div style="overflow:auto"><table><thead><tr>'+['Modulation','ทิศทาง','C₀/I รับ dB','XPIF ใช้ dB','kXP','Q / C dB','Mₓₚᴅ dB'].map(s=>'<th>'+s+'</th>').join('')+'</tr></thead><tbody>'+v.rows.map(r=>'<tr>'+[esc(r.name),r.dir==='ab'?'A → B':'B → A',f(r.ci),f(r.xpif),r.k.toFixed(5),f(r.Q)+' / '+f(r.C),r.margin===null?'รอ '+esc(r.missing.join(', ')):f(r.margin)].map(s=>'<td>'+s+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p>เกณฑ์ภาครับ: '+esc(v.ber)+' · '+esc(v.note)+'</p><p>Mₓₚᴅ เป็น equivalent XPD margin ไม่ใช่ XPD threshold degradation ผลนี้ยังไม่รวมใน Availability หรือคำแนะนำขนาดจาน และไม่ครอบคลุม XPD จากฝน · <a href="https://www.itu.int/rec/R-REC-P.530-18-202109-S/en" target="_blank" rel="noopener">ITU-R P.530-18 §4.1 สมการ 101–107</a></p>';return h;}
const api={calculate,html};if(typeof module!=='undefined')module.exports=api;else root.MWXPD=api;
})(globalThis);
