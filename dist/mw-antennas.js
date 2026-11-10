/* Huawei path loss calculation.pdf: user-confirmed model/diameter/gain pairs. */
(()=>{'use strict';
const $=id=>document.getElementById(id),catalog=[{model:'A7WD06MAC-3NX',diameter:.6,gain:30.9},{model:'A7WD09MAC-3NX',diameter:.9,gain:34.9}];
const lookup=value=>catalog.find(a=>a.model===String(value).trim().toUpperCase());
function sync(side){const model=$(side+'Model'),item=lookup(model.value),select=$(side+'AntennaPreset');select.value=item?item.model:'';for(const key of ['Diameter','Gain'])$(side+key).readOnly=!!item;if(item){model.value=item.model;$(side+'Diameter').value=item.diameter;$(side+'Gain').value=item.gain}$(side+'AntennaReference').textContent=item?'อ้างอิง Huawei path loss calculation.pdf · '+item.model+' · '+item.diameter+' m · '+item.gain+' dBi ที่ 7.575 GHz · ขนาดและ Gain ผูกกับรุ่นที่เลือก':'จานรุ่นอื่น: กรอกชื่อรุ่น ขนาด และ Gain ตามเอกสารของรุ่นที่ใช้งาน';}
for(const side of ['a','b']){const label=document.createElement('label');label.textContent='เลือกรุ่นจานตามเอกสาร Path Loss';const select=document.createElement('select');select.id=side+'AntennaPreset';select.append(new Option('รุ่นอื่น / กรอกเอง',''),...catalog.map(a=>new Option(a.model+' · '+a.diameter+' m · '+a.gain+' dBi',a.model)));label.append(select);$(side+'Model').closest('label').before(label);const note=document.createElement('p');note.id=side+'AntennaReference';note.className='note';note.style.gridColumn='1 / -1';label.parentElement.append(note);
select.addEventListener('change',()=>{$(side+'Model').value=select.value;sync(side);$(side+'Model').dispatchEvent(new Event('input',{bubbles:true}))});
$(side+'Model').addEventListener('input',()=>sync(side));sync(side);}
// Capture before the form's existing dirty/save handlers and calculation snapshot.
$('mwForm').addEventListener('input',e=>{if(e.target.id.endsWith('AntennaPreset'))return;sync('a');sync('b')},true);
$('example').addEventListener('click',()=>{sync('a');sync('b')});
globalThis.MWAntennas={sync(){sync('a');sync('b')}};
// Save repaired legacy tuples so reopening cannot restore an inconsistent size.
$('aModel').dispatchEvent(new Event('input',{bubbles:true}));
})();
