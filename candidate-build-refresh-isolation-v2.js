/* New Addition build-refresh isolation v3.
 *
 * The New Addition build refresh temporarily uses private-v3 because the
 * existing BuildProfilesV3 refresher reads that key. private-v3 is the real
 * Main Group, so the candidate roster must never be allowed to replace it.
 *
 * This layer does two things:
 *  1. snapshots every legitimate Main Group write before candidate state can
 *     replace it;
 *  2. recovers a previously overwritten Main Group from the snapshot or the
 *     legacy v2 roster before the candidate layer starts.
 *
 * No optimizer, scoring, hover, arrow, swap, party, or formatting logic is
 * changed.
 */
(()=>{
'use strict';
const STATE='lostark-hideout-private-v3';
const BACKUP='lostark-hideout-main-snapshot-v1';
const LEGACY=['lostark-hideout-private-v2','lostark-hideout-private','lostark-hideout-characters-v1'];
const NEW='lostark-hideout-new-additions-v1';
const READY='lostark-build-profiles-v3-ready';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const url=x=>{try{return new URL(x,location.href).href.replace(/\/$/,'').toLowerCase()}catch{return String(x||'').replace(/\/$/,'').toLowerCase()}};
const ids=a=>new Set((Array.isArray(a)?a:[]).map(c=>url(c?.url||c?.profile?.url)).filter(Boolean));
const chars=v=>Array.isArray(v?.characters)?v.characters:[];
const same=(a,b)=>a.size>0&&a.size===b.size&&[...a].every(x=>b.has(x));
const isCandidateValue=v=>same(ids(chars(v)),ids(read(NEW,[])));
const validRoster=v=>chars(v).length>0;
const writeRaw=(value)=>originalSetItem.call(localStorage,STATE,value);
const saveBackup=(value)=>{try{const parsed=JSON.parse(String(value));if(validRoster(parsed)&&!isCandidateValue(parsed))originalSetItem.call(localStorage,BACKUP,String(value))}catch{}};

const originalSetItem=Storage.prototype.setItem;
let candidateWrite=false;
let savedMain=null;

function recoverCorruptedMain(){
  try{
    const current=read(STATE,null);
    if(!isCandidateValue(current)){
      if(validRoster(current))saveBackup(JSON.stringify(current));
      return;
    }

    const backup=read(BACKUP,null);
    if(validRoster(backup)&&!isCandidateValue(backup)){
      writeRaw(JSON.stringify(backup));
      savedMain=JSON.stringify(backup);
      return;
    }

    for(const key of LEGACY){
      const legacy=read(key,null);
      if(validRoster(legacy)&&!isCandidateValue(legacy)){
        const restored={...legacy,characters:chars(legacy)};
        writeRaw(JSON.stringify(restored));
        originalSetItem.call(localStorage,BACKUP,JSON.stringify(restored));
        savedMain=JSON.stringify(restored);
        return;
      }
    }
  }catch{}
}

if(!Storage.prototype.__candidateIsolationV4){
 Storage.prototype.setItem=function(key,value){
  if(key===STATE&&!candidateWrite){
   try{
    const current=JSON.parse(localStorage.getItem(STATE)||'null');
    const incoming=JSON.parse(String(value));
    const currentIds=ids(chars(current));
    const incomingIds=ids(chars(incoming));
    if(validRoster(current)&&!isCandidateValue(current))saveBackup(JSON.stringify(current));
    if(validRoster(incoming)&&!isCandidateValue(incoming))saveBackup(JSON.stringify(incoming));
    if(validRoster(current)&&isCandidateValue(incoming)&&!same(currentIds,incomingIds))savedMain=String(localStorage.getItem(STATE));
   }catch{}
  }
  return originalSetItem.call(this,key,value);
 };
 Storage.prototype.__candidateIsolationV4=true;
}

recoverCorruptedMain();

function install(){
 const api=window.LostArkBuildProfilesV3;
 if(!api||typeof api.refresh!=='function'||api.refresh.__candidateIsolationV4)return !!api?.refresh?.__candidateIsolationV4;
 const original=api.refresh;
 const wrapped=async function(...args){
  if(!savedMain)return original.apply(this,args);
  const saved=savedMain;
  candidateWrite=true;
  const oldDispatch=window.dispatchEvent;
  try{
   window.dispatchEvent=function(e){
    if(e?.type===READY)return true;
    return oldDispatch.call(window,e);
   };
   return await original.apply(this,args);
  }finally{
   try{writeRaw(saved);originalSetItem.call(localStorage,BACKUP,saved)}catch{}
   window.dispatchEvent=oldDispatch;
   candidateWrite=false;
   savedMain=null;
  }
 };
 wrapped.__candidateIsolationV4=true;
 api.refresh=wrapped;
 return true;
}
let n=0;
(function wait(){if(install())return;if(++n<200)setTimeout(wait,25)})();
})();