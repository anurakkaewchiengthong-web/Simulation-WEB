(function(root){
'use strict';
// Pure search controller: the caller supplies the propagation/DEM probe.
// This module does not change RF predictions or draw/export raster cells.
const STOP=Object.freeze({EDGE:'coverage-edge-approx',MAX:'max-search-radius',DEM:'dem-incomplete',CANCEL:'cancelled',UNSUPPORTED:'unsupported-mode',ERROR:'error'});
function bearings(radiusKm,arcSpacingKm,maxSamples=4096){
 if(!(radiusKm>0&&arcSpacingKm>0))throw Error('Invalid ring sampling dimensions');
 return Math.max(12,Math.min(maxSamples,Math.ceil(2*Math.PI*radiusKm/arcSpacingKm)));
}
async function search(opts){
 const {initialRadiusKm,maxSearchRadiusKm,arcSpacingKm=1,growthFactor=1.4,probe,signal,modelSupported=true,onRing}=opts||{};
 if(!(initialRadiusKm>0&&maxSearchRadiusKm>=initialRadiusKm&&maxSearchRadiusKm<=200&&arcSpacingKm>0&&growthFactor>1)||typeof probe!=='function')throw Error('Invalid ring search configuration');
 const trace=[];let lastColouredRadiusKm=null,clearRings=0,radius=initialRadiusKm;
 const result=(stopReason)=>({stopReason,searchedRadiusKm:trace.length?trace[trace.length-1].radiusKm:0,lastColouredRadiusKm,trace});
 if(!modelSupported)return result(STOP.UNSUPPORTED);
 while(true){
  if(signal?.aborted)return result(STOP.CANCEL);
  const count=bearings(radius,arcSpacingKm);
  let coloured=0,missing=0,dlColoured=0,ulColoured=0;
  for(let i=0;i<count;i++){
   if(signal?.aborted)return result(STOP.CANCEL);
   let sample;
   try{sample=await probe({radiusKm:radius,bearingDeg:360*i/count,index:i,count});}
   catch(e){if(signal?.aborted)return result(STOP.CANCEL);return {...result(STOP.ERROR),error:String(e)};}
   if(!sample||sample.demComplete===false){missing++;continue;}
   if(sample.downlink===true)dlColoured++;
   if(sample.uplink===true)ulColoured++;
   if(sample.downlink===true||sample.uplink===true)coloured++;
  }
  const entry={radiusKm:radius,samples:count,coloured,downlinkColoured:dlColoured,uplinkColoured:ulColoured,missing};
  trace.push(entry);if(typeof onRing==='function')onRing(entry);
  if(missing)return result(STOP.DEM);
  if(coloured){lastColouredRadiusKm=radius;clearRings=0;}else clearRings++;
  if(clearRings>=2)return result(STOP.EDGE);
  if(radius>=maxSearchRadiusKm)return result(STOP.MAX);
  const next=Math.min(maxSearchRadiusKm,Math.max(radius+0.001,radius*growthFactor));
  if(next<=radius)return result(STOP.MAX);
  radius=next;
 }
}
root.RFRingSearch=Object.freeze({bearings,search,STOP});
})(typeof window!=='undefined'?window:globalThis);
