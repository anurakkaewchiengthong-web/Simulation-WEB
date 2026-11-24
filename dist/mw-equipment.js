/* Source-backed device catalogue. Values are per RF channel, not aggregate XPIC capacity. */
(function(root){'use strict';
const API={
 profile(data,band,bw,xpic){return data.profiles.find(p=>p.bandGHz===Number(band)&&p.bandwidthMHz===Number(bw)&&p.xpic===(xpic===true||xpic==='on'))||null},
 values(profile,names,compression,bound,allowance,txA,txB){
  if(!profile)throw Error('ไม่มี preset สำหรับเงื่อนไขนี้');
  if(![0,1,2,3].includes(compression)||![0,1].includes(bound)||!Number.isFinite(allowance)||allowance<0||allowance>20)throw Error('ค่าการเลือกไม่ถูกต้อง');
  if(![txA,txB].every(x=>typeof x==='number'&&Number.isFinite(x)))throw Error('กรอกกำลังส่งจริงของ ODU A และ B ก่อน');
  const chosen=profile.rows.filter(r=>names.includes(r.modulation));if(!chosen.length)throw Error('เลือก modulation อย่างน้อยหนึ่งรายการ');
  return chosen.map(r=>[r.modulation,r.throughput[compression][bound],txA,txB,r.typicalDbm+allowance,r.typicalDbm+allowance,'','']);
 }
};root.MWEquipment=API;if(typeof module!=='undefined')module.exports=API;if(typeof document==='undefined')return;
const $=id=>document.getElementById(id);let data,current,applied=null;
const panel=document.createElement('section');panel.id='equipmentCatalogue';panel.innerHTML=`
<div class="equipment-head"><div><span class="equipment-kicker">EQUIPMENT REFERENCE</span><h2>เลือกค่าจากคู่มืออุปกรณ์</h2><p>Huawei OptiX RTN 320F OAU 2F + XMC‑3E · Running mode IS8+ · ไม่ใช้ CA</p></div><a href="https://drive.google.com/file/d/1W5awX4acoaeMyqlCtr83cw2esG3ganvW/view" target="_blank" rel="noopener">เปิดคู่มือ ↗</a></div>
<p id="equipmentLoad" role="status">กำลังโหลดฐานข้อมูลอุปกรณ์…</p><div id="equipmentControls" hidden>
<div class="fields"><label>ย่านของ ODU<select id="eqBand"><option value="7">7 GHz</option><option value="8">8 GHz</option></select></label><label>Channel bandwidth<select id="eqBandwidth">${[7,14,28,40,56].map(n=>`<option value="${n}" ${n===28?'selected':''}>${n} MHz</option>`).join('')}</select></label><label>XPIC<select id="eqXpic"><option value="on">Enable</option><option value="off">Disable</option></select></label><label>Frame header compression<select id="eqCompression"><option value="0">ไม่บีบอัด header</option><option value="1">L2</option><option value="2">L2 + L3 IPv4</option><option value="3">L2 + L3 IPv6</option></select></label><label>ความจุที่จะนำไปใช้<select id="eqBound"><option value="0">ขอบล่างของช่วงในคู่มือ</option><option value="1">ขอบบนของช่วงในคู่มือ</option></select></label><label>เผื่อจาก Typical RX (dB)<input id="eqAllowance" type="number" value="0" min="0" max="20" step="0.1"></label></div>
<p class="note">RX อ้างอิง Typical ที่ BER 10⁻⁶; ค่าเผื่อเป็นสมมติฐานของผู้ใช้ (ไม่ใช่ Guaranteed ของ IS8+) · Capacity เป็น Mbps ต่อ RF channel ตามช่วงในคู่มือ ไม่ใช่ผลรวม 2+0 และไม่คูณสองเมื่อเปิด XPIC</p>
<p class="equipment-caution" id="equipmentRestriction"></p>
<div class="mode-actions"><button type="button" id="eqSelectAll">เลือกทุกโหมด</button><button type="button" id="eqSelectNone">ล้างการเลือก</button></div>
<div class="equipment-scroll"><table id="equipmentTable"><thead><tr><th>ใช้</th><th>Modulation / FEC</th><th>ช่วง Mbps</th><th>นำไปใช้ Mbps</th><th>Typical RX dBm</th><th>RX ที่ใช้ dBm</th></tr></thead><tbody></tbody></table></div>
<p id="equipmentReference" class="note"></p>
<div class="equipment-entry"><strong>กำลังส่งสำหรับชุดที่เลือก — กรอกจาก ODU จริง</strong><p class="note">คู่มือนี้ไม่มีตาราง TX power ตาม modulation จึงไม่เติมค่าแทนผู้ใช้ · ค่าด้านล่างจะใช้กับทุกโหมดที่เลือก หากแต่ละโหมดใช้กำลังส่งต่างกัน ให้แก้รายแถวหลังนำเข้า</p><div class="fields"><label>TX A (dBm)<input id="eqTxA" type="number" step="any" placeholder="กำลังส่งที่ใช้จริง"></label><label>TX B (dBm)<input id="eqTxB" type="number" step="any" placeholder="กำลังส่งที่ใช้จริง"></label></div></div>
<p class="note">ปุ่มด้านล่างจะใช้รุ่นเดียวกันกับ A/B, ตั้ง bandwidth และ XPIC ตามที่เลือก, เปิด AM และปิด ATPC พร้อมแทนที่ตารางเปรียบเทียบเดิม ค่าโหมดหลักใช้โหมดสูงสุดที่เลือก · ความถี่จริง, antenna gain, feeder loss, XPD และ XPIF ต้องตรวจตามอุปกรณ์หน้างาน · หากเปิด XPIC ให้กรอก XPD degradation รายโหมดในตารางด้านล่างด้วย</p>
<button type="button" id="eqApply">ใช้ค่ากับ A/B และแทนที่ตาราง modulation</button><button type="button" id="eqUndo" hidden>ย้อนกลับก่อนนำเข้า</button>
<p id="equipmentStatus" role="status" aria-live="polite"></p><input id="equipmentProvenance" type="hidden"></div>`;
$('endpoints').before(panel);
const controls=['eqBand','eqBandwidth','eqXpic','eqCompression','eqBound','eqAllowance'];
function render(){if(!data)return;current=API.profile(data,$('eqBand').value,$('eqBandwidth').value,$('eqXpic').value);const comp=Number($('eqCompression').value),bound=Number($('eqBound').value),raw=$('eqAllowance').value,allow=raw===''?NaN:Number(raw);const valid=Number.isFinite(allow)&&allow>=0&&allow<=20;
 $('eqApply').disabled=!current||!valid;
 $('equipmentTable').querySelector('tbody').innerHTML=current?current.rows.map(r=>`<tr><td><input type="checkbox" data-mode="${r.modulation}" aria-label="เลือก ${r.modulation}" checked></td><td>${r.modulation}</td><td>${r.throughput[comp].join('–')}</td><td>${r.throughput[comp][bound]}</td><td>${r.typicalDbm}</td><td>${valid?r.typicalDbm+allow:'—'}</td></tr>`).join(''):'';
 $('equipmentRestriction').textContent=$('eqXpic').value==='on'?'XPIC Enable: จำกัด preset ถึง 2048QAM (7 MHz ถึง 512QAM / 14 MHz ถึง 1024QAM) — คู่มือตาราง 1-26 กับ 1-55 ระบุเงื่อนไข 4096QAM ไม่ตรงกัน จึงไม่นำโหมดนี้มาเติมอัตโนมัติ':'XPIC Disable: 4096/8192QAM ต้องเปิด AM และปิด ATPC ตามตาราง 1-26';
 $('equipmentReference').textContent=current?`V100R022C10 · Issue 05 (10 ม.ค. 2024) · Capacity ตาราง ${current.capacityTable} · RX ตาราง ${current.sensitivityTables.join(', ')} · ODU compatibility ตาราง 1-53/1-55 · BER หน้า 181`: 'ไม่พบชุดข้อมูล';
}
controls.forEach(id=>$(id).addEventListener('input',render));
$('eqSelectAll').onclick=()=>panel.querySelectorAll('[data-mode]').forEach(e=>e.checked=true);$('eqSelectNone').onclick=()=>panel.querySelectorAll('[data-mode]').forEach(e=>e.checked=false);
const changedIds=['bandwidth','xpic','am','atpc','modulation','capacity','ber','aRadio','bRadio','aRadioFile','bRadioFile','aPower','bPower','aPowerUnit','bPowerUnit','aThreshold','bThreshold','amRows','relModes','equipmentProvenance'];let before,beforeApplied;
function signature(){return JSON.stringify(['freq',...changedIds.filter(id=>id!=='equipmentProvenance')].map(id=>$(id)?.value));}
function status(){if(!applied)return;$('equipmentStatus').textContent=applied.signature===signature()?applied.note:'มีการแก้ค่าหลังนำเข้า preset — ตรวจ bandwidth, XPIC, รุ่น ODU และค่ารายแถวอีกครั้งก่อนคำนวณ';}
$('eqApply').onclick=()=>{try{
 const tx=id=>$(id).value.trim()===''?NaN:Number($(id).value);const rows=API.values(current,[...panel.querySelectorAll('[data-mode]:checked')].map(e=>e.dataset.mode),Number($('eqCompression').value),Number($('eqBound').value),Number($('eqAllowance').value),tx('eqTxA'),tx('eqTxB'));
 beforeApplied=applied;before=Object.fromEntries(changedIds.map(id=>[id,$(id)?.value]));const top=rows.at(-1),set=(id,v)=>{if($(id))$(id).value=v};
 set('bandwidth',current.bandwidthMHz);set('xpic',current.xpic?'Enable':'Disable');set('am','Enable');set('atpc','Disable');set('modulation',top[0]);set('capacity',top[1]);set('ber','Typical BER 10^-6 + '+$('eqAllowance').value+' dB');
 for(const [i,side] of ['a','b'].entries()){set(side+'Radio',`RTN 320F / XMC-3E ${current.bandGHz}G / IS8+`);set(side+'RadioFile',`V100R022C10 Issue05; RX ${current.sensitivityTables.join('/')}`);set(side+'Threshold',top[4+i]);set(side+'PowerUnit','dBm');$(side+'PowerUnit').dataset.old='dBm';set(side+'Power',top[2+i]);}
 MWModulationsUI.replace(rows);
 const note=`นำเข้า ${rows.length} โหมด · XMC-3E ${current.bandGHz} GHz / IS8+ / ${current.bandwidthMHz} MHz / XPIC ${current.xpic?'Enable':'Disable'} · ค่าจากคู่มือ ยกเว้น TX และค่าเผื่อที่ผู้ใช้ระบุ · ตรวจความถี่จริง ${$('freq').value} GHz ให้ตรงย่าน ODU`;
 set('equipmentProvenance',JSON.stringify({profile:current.id,source:data.source.url,version:data.source.version,capacityTable:current.capacityTable,rxTables:current.sensitivityTables,compression:Number($('eqCompression').value),bound:Number($('eqBound').value),allowanceDb:Number($('eqAllowance').value),note}));
 applied={note,signature:signature()};$('eqUndo').hidden=false;dirty();saveReference();status();
 }catch(e){$('equipmentStatus').textContent=e.message;}};
function saveReference(){try{localStorage.setItem('rf-equipment-reference-v1',JSON.stringify(applied))}catch{}}
$('eqUndo').onclick=()=>{if(!before)return;for(const [id,v] of Object.entries(before))if($(id)&&v!==undefined)$(id).value=v;for(const side of ['a','b'])$(side+'PowerUnit').dataset.old=$(side+'PowerUnit').value;MWModulationsUI.restore();applied=beforeApplied;saveReference();$('eqUndo').hidden=true;$('equipmentStatus').textContent='คืนค่าก่อนนำเข้าแล้ว';dirty();};
$('mwForm').addEventListener('input',status);$('mwForm').addEventListener('change',status);
const oldExample=$('example').onclick;$('example').onclick=()=>{oldExample();applied=null;saveReference();$('equipmentProvenance').value='';$('eqUndo').hidden=true;$('equipmentStatus').textContent='ใช้ข้อมูลตัวอย่างแล้ว — ไม่ใช่ค่าจาก preset อุปกรณ์';dirty()};
fetch('data/rtn320f-equipment.json').then(r=>{if(!r.ok)throw Error('โหลดฐานข้อมูลไม่สำเร็จ');return r.json()}).then(d=>{data=d;$('equipmentLoad').textContent='20 ชุดเงื่อนไข · 7/8 GHz · 7, 14, 28, 40, 56 MHz · XPIC เปิด/ปิด';$('equipmentControls').hidden=false;try{const saved=JSON.parse(localStorage.getItem('rf-microwave-v1')||'{}');for(const id of [...controls,'eqTxA','eqTxB','equipmentProvenance'])if(saved[id]!==undefined)$(id).value=saved[id];applied=JSON.parse(localStorage.getItem('rf-equipment-reference-v1')||'null')}catch{}render();status()}).catch(()=>{$('equipmentLoad').textContent='โหลดฐานข้อมูลอุปกรณ์ไม่สำเร็จ กรุณารีเฟรชหน้า หรือเปิดคู่มือผ่านลิงก์ด้านบน';});
})(globalThis);
