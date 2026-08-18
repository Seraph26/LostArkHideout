/* Keeps the authoritative General Optimization renderer from being overwritten by app-fixed refresh rendering. */
(()=>{
'use strict';
const root=()=>document.querySelector('#suggestedParties');
const generalActive=()=>document.querySelector('#generalOptimization')?.checked!==false && window.LostArkOptimizerMode?.general!==false;
let restoring=false;
function restore(){
  if(restoring||!generalActive())return;
  const h=root();
  if(!h)return;
  if(h.querySelector('.authoritative-party'))return;
  const store='lostark-hideout-party-assignments-v2';
  let a=null;try{a=JSON.parse(localStorage.getItem(store)||'null')}catch{}
  if(!a?.party1||!a?.party2)return;
  if(typeof window.GeneralPartyOptimizerV3?.render==='function'){
    restoring=true;
    try{window.GeneralPartyOptimizerV3.render(a,false)}finally{setTimeout(()=>{restoring=false},0)}
  }
}
function install(){
  window.__GENERAL_PARTY_RENDER_GUARD__=true;
  const h=root();
  if(h){new MutationObserver(()=>restore()).observe(h,{childList:true,subtree:false});}
  document.addEventListener('change',e=>{if(e.target?.id==='generalOptimization')setTimeout(restore,0)});
  setTimeout(restore,50);setTimeout(restore,250);setTimeout(restore,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
