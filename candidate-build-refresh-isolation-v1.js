/* New Addition build-refresh isolation.
 *
 * candidate-roster-v1 temporarily uses lostark-hideout-private-v3 because the
 * existing build-profile refresher reads that key. The candidate roster writes
 * its temporary state BEFORE calling refresh(), so a refresh wrapper that only
 * inspects the state at refresh time is already too late: the original Main
 * Group has been replaced.
 *
 * This layer therefore watches only writes to private-v3. When the candidate
 * roster replaces the Main Group with the New Addition candidate set, it saves
 * the real Main Group snapshot before allowing that temporary write through.
 * During the candidate refresh it suppresses the ready event, then restores
 * the saved Main Group before any normal UI listener can observe candidate
 * state. Normal main-roster writes and refreshes are untouched.
 *
 * No optimizer, scoring, hover, arrow, swap, party, or formatting logic is
 * changed.
 */
(()=>{
'use strict';
const STATE='lostark-hideout-private-v3';
const NEW='lostark-hideout-new-additions-v1';
const READY='lostark-build-profiles-v3-ready';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const url=x=>{try{return new URL(x,location.href).href.replace(/\/$/,'').toLowerCase()}catch{return String(x||'').replace(/\/$/,'').toLowerCase()}};
const ids=list=>new Set((Array.isArray(list)?list:[]).map(c=>url(c?.url||c?.profile?.url)).filter(Boolean));
const sameIds=(a,b)=>a.size>0&&a.size===b.size&&[...a].every(x=>b.has(x));
const isCandidateList=value=>{
 const candidate=ids(Array.isArray(value?.characters)?value.characters:value);
 const newState=ids(read(NEW,[]));
 return candidate.size>0&&sameIds(candidate,newState);
};
const originalSetItem=Storage.prototype.setItem;
let pendingMainState=null;
let candidateWriteDepth=0;
Storage.prototype.setItem=function(key,value){
 if(key===STATE&&candidateWriteDepth===0){
   try{
     const current=JSON.parse(localStorage.getItem(STATE)||'null');
     const incoming=JSON.parse(String(value));
     const currentIds=ids(current?.characters);
     if(currentIds.size>0&&isCandidateList(incoming)&&!sameIds(currentIds,ids(incoming?.characters))){
       pendingMainState=String(localStorage.getItem(STATE));
     }
   }catch{}
 }
 return originalSetItem.call(this,key,value);
};
const original=window.LostArkBuildProfilesV3?.refresh;
if(typeof original!=='function'||original.__candidateIsolationV2)return;
const wrapped=async function(...args){
 if(!pendingMainState)return original.apply(this,args);
 const saved=pendingMainState;
 let suppressed=false;
 const oldDispatch=window.dispatchEvent;
 candidateWriteDepth++;
 try{
   window.dispatchEvent=function(event){
     if(event?.type===READY){suppressed=true;return true;}
     return oldDispatch.call(window,event);
   };
   return await original.apply(this,args);
 }finally{
   try{localStorage.setItem(STATE,saved)}catch{}
   window.dispatchEvent=oldDispatch;
   candidateWriteDepth--;
   pendingMainState=null;
   void suppressed;
 }
};
wrapped.__candidateIsolationV2=true;
window.LostArkBuildProfilesV3.refresh=wrapped;
})();