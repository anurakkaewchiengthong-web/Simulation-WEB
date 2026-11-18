(function(root){
'use strict';
// Convert an RF model's Cartesian km coordinates into ring probes.
// No terrain fetching, radius mutation, or raster allocation occurs here.
function createProbe({propagation,config,thresholdDbm=-105}={}){
 if(typeof propagation!=='function'||!config||!Number.isFinite(thresholdDbm))throw Error('Invalid RF ring probe configuration');
 return async function({radiusKm,bearingDeg}){
  if(!(radiusKm>0)||!Number.isFinite(bearingDeg))throw Error('Invalid ring sample');
  const theta=bearingDeg*Math.PI/180;
  const result=propagation(radiusKm*Math.sin(theta),radiusKm*Math.cos(theta),config);
  if(!result||!Number.isFinite(result.down)||!Number.isFinite(result.up))
   return {demComplete:false,downlink:false,uplink:false};
  return {demComplete:true,downlink:result.down>=thresholdDbm,uplink:result.up>=thresholdDbm};
 };
}
function createController({propagation,config,thresholdDbm=-105}={}){
 if(!root.RFRingSearch)throw Error('RF ring search unavailable');
 const probe=createProbe({propagation,config,thresholdDbm});
 return Object.freeze({search:options=>root.RFRingSearch.search({...options,probe})});
}
root.RFRingRFAdapter=Object.freeze({createProbe,createController});
})(typeof window!=='undefined'?window:globalThis);
