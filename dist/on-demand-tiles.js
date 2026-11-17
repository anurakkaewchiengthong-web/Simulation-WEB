(function(root){
'use strict';
// Infrastructure-only on-demand tile scheduler. No RF model or DEM assumptions.
function createScheduler({load,maxConcurrent=2,maxCache=32}={}){
 if(typeof load!=='function'||!Number.isInteger(maxConcurrent)||maxConcurrent<1||!Number.isInteger(maxCache)||maxCache<1)throw Error('Invalid tile scheduler configuration');
 const cache=new Map(),inflight=new Map(),queue=[];let running=0,epoch=0;
 function put(key,value){
  if(cache.has(key))cache.delete(key);
  cache.set(key,value);
  while(cache.size>maxCache)cache.delete(cache.keys().next().value);
 }
 function pump(){
  while(running<maxConcurrent&&queue.length){
   const task=queue.shift();
   if(task.epoch!==epoch){inflight.delete(task.key);task.reject(Error('TILE_CANCELLED'));continue;}
   running++;
   Promise.resolve().then(()=>load(task.key,{signal:task.signal,epoch:task.epoch})).then(value=>{
    if(task.epoch!==epoch||task.signal?.aborted)throw Error('TILE_CANCELLED');
    put(task.key,value);task.resolve(value);
   },task.reject).finally(()=>{
    running--;if(inflight.get(task.key)===task.promise)inflight.delete(task.key);pump();
   });
  }
 }
 function request(key,{signal}={}){
  if(typeof key!=='string'||!key) return Promise.reject(Error('Invalid tile key'));
  if(signal?.aborted)return Promise.reject(Error('TILE_CANCELLED'));
  if(cache.has(key)){const value=cache.get(key);put(key,value);return Promise.resolve(value);}
  if(inflight.has(key))return inflight.get(key);
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
  inflight.set(key,promise);queue.push({key,signal,epoch,promise,resolve,reject});pump();return promise;
 }
 function cancelAll(){
  epoch++;cache.clear();
  while(queue.length){const t=queue.shift();inflight.delete(t.key);t.reject(Error('TILE_CANCELLED'));}
 }
 return Object.freeze({request,cancelAll,clearCache:()=>cache.clear(),stats:()=>({running,queued:queue.length,cached:cache.size,inflight:inflight.size,epoch})});
}
root.RFOnDemandTiles=Object.freeze({createScheduler});
})(typeof window!=='undefined'?window:globalThis);
