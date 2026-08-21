/* New Addition build-refresh isolation.
 *
 * candidate-roster-v1 temporarily uses lostark-hideout-private-v3 because the
 * existing build-profile refresher reads that key. The refresher dispatches a
 * ready event when it finishes, and other UI layers can observe that event
 * before candidate-roster restores the real main roster. That can make the
 * optimizer render New Additions even though Optimize Parties was never run.
 *
 * This wrapper suppresses only that ready event while the private-v3 state is
 * visibly the New Addition candidate set. It restores the main state before
 * allowing the event to continue. Normal main-roster refreshes are untouched.
 * No optimizer, scoring, hover, arrow, swap, or party logic is changed.
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
 let saved=null,suppressed=false;
 const oldDispatch=window.dispatchEvent;
 try{
   saved=localStorage.getItem(STATE);
   window.dispatchEvent=function(event){
     if(event?.type===READY){suppressed=true;return true;}
     return oldDispatch.call(window,event);
   };
   const result=await original.apply(this,args);
   return result;
 }finally{
   if(saved===null)localStorage.removeItem(STATE);else localStorage.setItem(STATE,saved);
   window.dispatchEvent=oldDispatch;
   /* The original refresh has already populated the build cache. The ready
    * event is intentionally not replayed here: the candidate renderer will
    * repaint itself, while the main optimizer must remain untouched. */
   void suppressed;
 }
};
wrapped.__candidateIsolationV1=true;
window.LostArkBuildProfilesV3.refresh=wrapped;
})();