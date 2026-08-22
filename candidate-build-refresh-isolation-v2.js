/* New Addition build-refresh isolation v5.
 *
 * Main Group is authoritative in the legacy roster key used by the app.
 * New Additions may temporarily use private-v3 for BuildProfilesV3.refresh,
 * but that temporary candidate state must never become the Main Group.
 *
 * No optimizer, scoring, hover, arrow, swap, party, or formatting logic is
 * touched here.
 */
(()=>{
'use strict';
const STATE='lostark-hideout-private-v3';
const MAIN='lostark-hideout-private-v2';
const LEGACY=['lostark-hideout-private','lostark-hideout-characters-v1'];
const BACKUP='lostark-hideout-main-snapshot-v1';
const NEW='lostark-hideout-new-additions-v1';
const READY='lostark-build-profiles-v3-ready';
const originalSetItem=Storage.prototype.setItem;
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const chars=v=>Array.isArray(v?.characters)?v.characters:[];
const url=x=>{try{return new URL(x,location.href).href.replace(/\/$/,'').toLowerCase()}catch{return String(x||'').replace(/\/$/,'').toLowerCase()}};
const ids=a=>new Set((Array.isArray(a)?a:[]).map(c=>url(c?.url||c?.profile?.url)).filter(Boolean));
const candidate=v=>{const a=ids(chars(v)),b=ids(read(NEW,[]));return a.size>0&&a.size===b.size&&[...a].every(x=>b.has(x))};
const valid=v=>chars(v).length>0;
const canonicalMain=()=>{
  const candidates=[read(MAIN,null),...LEGACY.map(k=>read(k,null)),read(BACKUP,null)];
  return candidates.find(v=>valid(v)&&!candidate(v))||null;
};
const rawWrite=v=>originalSetItem.call(localStorage,STATE,JSON.stringify(v));
let savedMain=null;
let candidateWrite=false;

function restoreMain(){
  const main=canonicalMain();
  if(!main)return null;
  rawWrite(main);
  originalSetItem.call(localStorage,BACKUP,JSON.stringify(main));
  return JSON.stringify(main);
}

/* Always install the write guard once. If an older isolation layer already
 * installed one, this layer still gets to establish the authoritative
 * snapshot before the candidate refresh starts. */
if(!Storage.prototype.__candidateIsolationV5){
  Storage.prototype.setItem=function(key,value){
    if(key===STATE&&!candidateWrite){
      try{
        const incoming=JSON.parse(String(value));
        if(candidate(incoming)){
          const main=canonicalMain();
          if(main)savedMain=JSON.stringify(main);
        }else if(valid(incoming)){
          originalSetItem.call(localStorage,BACKUP,JSON.stringify(incoming));
        }
      }catch{}
    }
    return originalSetItem.call(this,key,value);
  };
  Storage.prototype.__candidateIsolationV5=true;
}

/* Repair the already-corrupted browser state immediately. The v2 roster is
 * the app's own Main Group source, so it takes precedence over any candidate
 * state currently sitting in private-v3. */
savedMain=restoreMain();

function install(){
  const api=window.LostArkBuildProfilesV3;
  if(!api||typeof api.refresh!=='function')return false;
  if(api.refresh.__candidateIsolationV5)return true;
  const original=api.refresh;
  const wrapped=async function(...args){
    const authoritative=savedMain||restoreMain();
    if(!authoritative)return original.apply(this,args);
    candidateWrite=true;
    const oldDispatch=window.dispatchEvent;
    try{
      window.dispatchEvent=function(e){
        if(e?.type===READY)return true;
        return oldDispatch.call(window,e);
      };
      return await original.apply(this,args);
    }finally{
      try{originalSetItem.call(localStorage,STATE,authoritative);originalSetItem.call(localStorage,BACKUP,authoritative)}catch{}
      window.dispatchEvent=oldDispatch;
      candidateWrite=false;
      savedMain=authoritative;
    }
  };
  wrapped.__candidateIsolationV5=true;
  api.refresh=wrapped;
  return true;
}
let n=0;(function wait(){if(install())return;if(++n<200)setTimeout(wait,25)})();
})();
