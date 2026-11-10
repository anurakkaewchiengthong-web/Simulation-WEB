/* Same-origin bridge: every station retains its own validated RF engine/state. */
if(new URLSearchParams(location.search).has('pair')){
  const style=document.createElement('style');style.textContent='header,.intro{display:none}main{padding:8px}.layout{display:block}.layout>form{margin-bottom:12px}.config{padding:12px}';document.head.append(style);
  let busy=false;el('form').addEventListener('input',()=>window.parent.rfPairEdited?.());el('form').addEventListener('change',()=>window.parent.rfPairEdited?.());
  window.RFPair={
    ready:Promise.all([latestRestored,antennaCatalogReady]),
    validate(){if(!el('form').reportValidity())throw Error('กรอกพารามิเตอร์ให้ครบและอยู่ในช่วงที่รองรับ');return settings()},
    async run(){if(busy)throw Error('สถานีกำลังคำนวณ');busy=true;const start=performance.now();try{await run();if(!resultReady)throw Error(el('error').textContent||'หยุดคำนวณ');const field=new Float32Array(N*N).fill(NaN),elevation=new Float32Array(N*N).fill(NaN);for(const v of grid){const col=Math.round(v.x*N/(2*cfg.radius)+N/2-.5),row=Math.round(N/2-.5-v.y*N/(2*cfg.radius)),i=row*N+col,r=cfg.clutterScenario==='map'&&v.map?v.map:v;field[i]=r.down-cfg.mobileGain+v.mobilePatternLoss+cfg.mobileLoss;elevation[i]=v.mobileElevation}return {cfg:structuredClone(cfg),n:N,values:gridValues,field,elevation,seconds:(performance.now()-start)/1000}}finally{busy=false}},
    cancel(){el('cancelSimulation').click()},
    status(){return el('mapStatus').textContent},
    async receiverAt(f,c){if(c.mobilePattern!=='catalog')return null;return RFAntennas.atFrequency(await loadAntenna(c.mobileAntennaId),f)},
    zip:zipStore
  };
}
