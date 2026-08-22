/* New Addition build-refresh isolation.
 * Candidate-only refreshes must not leak their temporary roster through the
 * global build-profile-ready event consumed by the optimizer/UI.
 * Display-only lifecycle guard; does not modify optimizer/scoring/hover/arrow/swap logic.
 */
(()=>{
'use strict';
const STATE='lostark-hideout-private-v3';
const NEW='lostark-hideout-new-additions-v1';
const READY='lostark-build-profiles-v3-ready';
const original=window.LostArkBuildProfilesV3?.refresh;
if(typeof original!=='function'||original.__candidateIsolationV1)return;
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const url=x=>{try{return new URL(x,location.href).href.replace(/\/$/,'').toLowerCase()}catch{return String(x||'').replace(/\/$/,'').toLowerCase()}};
const ids=list=>new Set((Array.isArray(list)?list:[]).map(c=>url(c?.url||c?.profile?.url)).filter(Boolean));
const isCandidateState=()=>{
 const state=read(STATE,null),newState=read(NEW,[]);
 const main=ids(state?.characters),candidate=ids(newState);
 return main.size>0&&candidate.size>0&&main.size===candidate.size&&[...main].every(x=>candidate.has(x));
};
const wrapped=async function(...args){
 if(!isCandidateState())return original.apply(this,args);
 let saved=null;
 const oldDispatch=window.dispatchEvent;
 try{
   saved=localStorage.getItem(STATE);
   window.dispatchEvent=function(event){
     if(event?.type===READY)return true;
     return oldDispatch.call(window,event);
   };
   return await original.apply(this,args);
 }finally{
   if(saved===null)localStorage.removeItem(STATE);else localStorage.setItem(STATE,saved);
   window.dispatchEvent=oldDispatch;
 }
};
wrapped.__candidateIsolationV1=true;
window.LostArkBuildProfilesV3.refresh=wrapped;
})();
