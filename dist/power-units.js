(function(root){
function dbm(value,unit){if(String(value).trim()===''||!Number.isFinite(Number(value)))throw Error('กรอกกำลังส่งเป็นตัวเลข');const n=Number(value);if(unit==='W'){if(n<=0)throw Error('กำลังส่งวัตต์ต้องมากกว่า 0');return 10*Math.log10(n)+30}if(unit!=='dBm')throw Error('หน่วยกำลังส่งไม่ถูกต้อง');return n}
function watts(value){const w=10**((value-30)/10);if(!Number.isFinite(w)||w<=0)throw Error('กำลังส่งอยู่นอกช่วงที่แปลงได้');return w}
function convert(value,from,to){const d=dbm(value,from);return to==='W'?watts(d):d}
const api={dbm,watts,convert};if(typeof module!=='undefined')module.exports=api;else root.RFPower=api;
})(globalThis);
