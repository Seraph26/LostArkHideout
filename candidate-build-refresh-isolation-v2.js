/* New Addition build-refresh isolation v2. */
(()=>{
'use strict';
const STATE='lostark-hideout-private-v3',NEW='lostark-hideout-new-additions-v1',READY='lostark-build-profiles-v3-ready';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const url=x=>{try{return new URL(x,location.href).href.replace(/\/$/,'').toLowerCase()}catch{return String(x||'').replace(/\/$/,'').toLowerCase()}};
const ids=a=>new Set((Array.isArray(a)?a:[]).map(c=>url(c?.url||c?.profile?.url)).filter(Boolean));
const same=(a,b)=>a.size>0&&a.size===b.size&&[...a].every(x=>b.has(x));
const candidate=v=>{const a=ids(v?.characters),b=ids(read(NEW,[]));return a.size>0&&same(a,b)};
let savedMain=null,candidateWrite=false;
const originalSetItem=Storage.prototype.setItem;
if(!Storage.prototype.__candidateIsolationV3){
 Storage.prototype.setItem=function(key,value){
  if(key===STATE&&!candidateWrite){try{const cur=JSON.parse(localStorage.getItem(STATE)||'null'),inc=JSON.parse(String(value)),ci=ids(cur?.characters),ii=ids(inc?.characters);if(ci.size>0&&candidate(inc)&&!same(ci,ii))savedMain=String(localStorage.getItem(STATE))}catch{}}
  return originalSetItem.call(this,key,value)
 };
 Storage.prototype.__candidateIsolationV3=true;
}
function install(){
 const api=window.LostArkBuildProfilesV3;if(!api||typeof api.refresh!=='function'||api.refresh.__candidateIsolationV3)return !!api?.refresh?.__candidateIsolationV3;
 const original=api.refresh;
 const wrapped=async function(...args){if(!savedMain)return original.apply(this,args);const saved=savedMain;candidateWrite=true;const oldDispatch=window.dispatchEvent;try{window.dispatchEvent=function(e){if(e?.type===READY)return true;return oldDispatch.call(window,e)};return await original.apply(this,args)}finally{try{originalSetItem.call(localStorage,STATE,saved)}catch{}window.dispatchEvent=oldDispatch;candidateWrite=false;savedMain=null}};
 wrapped.__candidateIsolationV3=true;api.refresh=wrapped;return true;
}
let n=0;(function wait(){if(install())return;if(++n<200)setTimeout(wait,25)})();
})();
