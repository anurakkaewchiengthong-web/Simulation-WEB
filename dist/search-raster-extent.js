(function(root){
'use strict';
// Separates search reach from the full-raster memory budget. This module only
// plans extents; it does not fetch DEM, run RF propagation, or draw a map.
function rasterLimitKm(spacingM,maxCells=root.RFTiledCoverage?.MAX_CELLS){
 if(!(spacingM>0)||!Number.isSafeInteger(maxCells)||maxCells<9)throw Error('Invalid raster budget');
 const half=Math.floor((Math.sqrt(maxCells)-1)/2);
 if(half<1)throw Error('Raster budget too small');
 return Math.min(200,half*spacingM/1000);
}
function plan({requestedRadiusKm,searchResult,spacingM,maxCells}={}){
 if(!(requestedRadiusKm>0&&requestedRadiusKm<=200)||!searchResult||!Number.isFinite(searchResult.searchedRadiusKm)||searchResult.searchedRadiusKm<0)throw Error('Invalid search extent');
 const maxRasterRadiusKm=rasterLimitKm(spacingM,maxCells===undefined?root.RFTiledCoverage?.MAX_CELLS:maxCells);
 const lastSignalKm=searchResult.lastColouredRadiusKm;
 if(lastSignalKm!==null&&lastSignalKm!==undefined&&(!(lastSignalKm>=0)||lastSignalKm>searchResult.searchedRadiusKm))throw Error('Invalid last signal extent');
 const desiredRasterRadiusKm=Math.min(200,Math.max(requestedRadiusKm,lastSignalKm??requestedRadiusKm));
 const rasterRadiusKm=Math.min(maxRasterRadiusKm,desiredRasterRadiusKm);
 const stopReason=searchResult.stopReason;
 const searchComplete=stopReason==='coverage-edge-approx';
 const rasterTruncated=desiredRasterRadiusKm>maxRasterRadiusKm;
 return Object.freeze({searchedRadiusKm:searchResult.searchedRadiusKm,lastColouredRadiusKm:lastSignalKm??null,desiredRasterRadiusKm,rasterRadiusKm,maxRasterRadiusKm,rasterTruncated,searchComplete,stopReason,searchBeyondRaster:searchResult.searchedRadiusKm>rasterRadiusKm});
}
root.RFSearchRasterExtent=Object.freeze({plan,rasterLimitKm});
})(typeof window!=='undefined'?window:globalThis);
