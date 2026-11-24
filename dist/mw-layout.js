(()=>{'use strict';
const $=id=>document.getElementById(id),main=document.querySelector('main'),form=$('mwForm'),results=$('results');
const intro=document.createElement('div');intro.className='mw-workflow';intro.innerHTML='<div><span class="mw-eyebrow">MICROWAVE WORKSPACE</span><h1>ตั้งค่าลิงก์ แล้วอ่านผลในส่วนเดียว</h1><p>กรอกข้อมูล → คำนวณลิงก์ → ตรวจผลและส่งออกรายงาน</p></div><a href="#mwInputZone">เริ่มกรอกข้อมูล ↓</a>';main.prepend(intro);
const nav=document.createElement('nav');nav.className='mw-jump';nav.setAttribute('aria-label','หมวดข้อมูล Microwave Link');nav.innerHTML='<strong>ไปยังส่วน</strong>';intro.after(nav);
const inputZone=document.createElement('div');inputZone.id='mwInputZone';inputZone.className='mw-zone mw-input-zone';form.before(inputZone);inputZone.innerHTML='<div class="mw-zone-heading"><span class="mw-step">01</span><div><span class="mw-eyebrow">INPUT · ข้อมูลสำหรับคำนวณ</span><h2>กรอกข้อมูลและตั้งค่าการวิเคราะห์</h2><p>ระบุพิกัดสถานี A/B เลือกอุปกรณ์และเงื่อนไข แล้วกด “อ่าน DEM และคำนวณลิงก์”</p></div></div>';inputZone.append(form,$('mxpdPanel'),$('dishSizing'));
const outZone=document.createElement('div');outZone.id='mwOutputZone';outZone.className='mw-zone mw-output-zone';inputZone.after(outZone);outZone.innerHTML='<div class="mw-zone-heading"><span class="mw-step">02</span><div><span class="mw-eyebrow">OUTPUT · ผลจากการวิเคราะห์</span><h2>ผลการคำนวณและคำแนะนำ</h2><p>ตรวจแนวลิงก์ โพรไฟล์ Link Budget และ Availability ก่อนส่งออกรายงาน</p></div><a href="#mwInputZone">กลับไปแก้ข้อมูล ↑</a></div><div id="mwEmptyResults" class="mw-empty"><b>ยังไม่มีผลการคำนวณ</b><p>กรอกข้อมูลด้านบนแล้วกดคำนวณ ผลจะแสดงในหมวดนี้</p></div>';outZone.append(results);
function outputCard(id,title,status,output){const card=document.createElement('section');card.id=id;card.className='mw-extra-result';const h=document.createElement('h2');h.textContent=title;card.append(h,$(status),$(output));outZone.append(card);return card;}
outputCard('mwXpdResult','Mₓₚᴅ · ผล Equivalent XPD margin','mxStatus','mxOutput');outputCard('mwDishResult','ผลประเมินและคำแนะนำขนาดจาน','dishStatus','dishOutput');
function resultLink(parent,target){const a=document.createElement('a');a.className='mw-result-link';a.href='#'+target;a.textContent='ดูผลการวิเคราะห์ในหมวดผลลัพธ์ ↓';parent.append(a);}
resultLink($('mxpdPanel'),'mwXpdResult');resultLink($('dishSizing'),'mwDishResult');
const linkSection=$('linkName').closest('section');linkSection.id='mwLinkInputs';
form.prepend($('endpoints'));
const groups=[['endpoints','พิกัดและข้อมูลสถานี A / B','01'],['equipmentCatalogue','อุปกรณ์','02'],['mwLinkInputs','ลิงก์และสภาพแวดล้อม','03'],['availabilityInputs','ภูมิอากาศ / Availability','04'],['modulationEditor','Modulation','05'],['mxpdPanel','XPD / C/I','06'],['dishSizing','เป้าหมายขนาดจาน','07']];
for(const [id,label,num] of groups){const node=$(id);node.classList.add('mw-input-card');node.dataset.category=num+' · '+label;const a=document.createElement('a');a.href='#'+id;a.textContent=label;nav.append(a);}
const resultNav=document.createElement('a');resultNav.href='#mwOutputZone';resultNav.className='mw-jump-output';resultNav.textContent='ผลการวิเคราะห์ ↓';nav.append(resultNav);
const resultNames=['สรุปแนวลิงก์','โพรไฟล์ 2 มิติ','ภาพ 3 มิติ','Link Budget','Availability'];[...results.children].filter(e=>e.tagName==='SECTION').forEach((e,i)=>{e.classList.add('mw-result-card');e.dataset.category='ผลการคำนวณ · '+(resultNames[i]||'รายละเอียด')});
const empty=()=>{$('mwEmptyResults').hidden=!results.hidden};new MutationObserver(empty).observe(results,{attributes:true,attributeFilter:['hidden']});empty();

// Keep all original form controls associated with the form; results precede advanced inputs.
const advanced=document.createElement('details');advanced.id='mwAdvanced';advanced.innerHTML='<summary><strong>03 · Link Budget & Availability (Optional)</strong> — เปิดเพื่อวิเคราะห์เพิ่มเติม</summary>';
const advancedFields=document.createElement('section');advancedFields.className='mw-advanced-fields';advancedFields.innerHTML='<h2>Link Budget · อุปกรณ์และการสูญเสีย</h2><div class="fields"></div>';
const fields=advancedFields.querySelector('.fields');
for(const id of ['gas','other','margin','rain','diffraction','manualDiff','protection','xpic','polarization','capacity','modulation','bandwidth','am','atpc','ber','temperature','rainRegion'])fields.append($(id).closest('label'));
for(const side of ['a','b']){
 const sec=$(side+'Power').closest('section'),group=document.createElement('section');group.className='mw-advanced-fields';group.append(sec.querySelector('.equipment-title'),$(side+'Power').closest('.fields'),$(side+'XPD').closest('details'));advanced.append(group);
}
advanced.querySelector('summary').after(advancedFields);
for(const id of ['equipmentCatalogue','availabilityInputs','modulationEditor'])advanced.append($(id));
advanced.append($('amRows').closest('details'));
const run=document.createElement('button');run.type='button';run.id='calculateBudget';run.textContent='Calculate Link Budget & Availability';advanced.append(run);
const advancedResults=document.createElement('div');advancedResults.id='mwAdvancedResults';advancedResults.hidden=true;
for(const node of [$('budget').closest('section'),$('availabilityResults'),$('mwXpdResult'),$('mwDishResult')])advancedResults.append(node);
advanced.append($('mxpdPanel'),$('dishSizing'),advancedResults);
form.append(outZone,advanced);
$('calculate').type='button';$('calculate').textContent='Calculate Path Profile';$('calculate').onclick=calculatePath;
const pathButton=document.createElement('button');pathButton.type='button';pathButton.textContent='Calculate Path Profile';pathButton.onclick=calculatePath;outZone.before(pathButton);
const submit=form.onsubmit;form.onsubmit=e=>{e.preventDefault();return advanced.open?submit(e):calculatePath(e)};
run.onclick=()=>{try{if(!result||pathSignature!==signature()){ $('status').textContent='กรุณาคำนวณ Path Profile ใหม่ก่อน';return}form.requestSubmit()}catch(e){$('status').textContent=e.message}};
globalThis.MWPathUI={invalidateBudget(){advancedResults.hidden=true},pathReady(){advancedResults.hidden=true;globalThis.MWXPDUI?.invalidate();globalThis.MWDishUI?.invalidate()},budgetReady(){advancedResults.hidden=false;advanced.open=true}};

for(const a of nav.querySelectorAll('a'))a.addEventListener('click',()=>{if(advanced.querySelector(a.getAttribute('href')))advanced.open=true});
intro.querySelector('h1').textContent='Path Profile First · วิเคราะห์แนวลิงก์ก่อน';
intro.querySelector('p').textContent='พิกัดและภูมิประเทศ → Fresnel / LOS → Link Budget (เลือกเพิ่มเติม)';
inputZone.querySelector('.mw-zone-heading p').textContent='กรอกพิกัด ความสูง ความถี่ และสภาพแวดล้อม แล้วกด Calculate Path Profile';
outZone.querySelector('.mw-zone-heading p').textContent='ตรวจ Fresnel, LOS, Obstruction และมุมตั้งจาน ก่อนเปิดการวิเคราะห์เพิ่มเติม';
const style=document.createElement('style');style.textContent='#mwAdvanced{margin-top:24px;padding:18px;border:1px solid #537484;border-radius:12px}#mwAdvanced>summary{cursor:pointer;padding:12px}#mwAdvancedResults[hidden]{display:none!important}';document.head.append(style);
})();