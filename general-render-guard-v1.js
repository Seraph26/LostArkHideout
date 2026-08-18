/* Preserves the authoritative General Optimization DOM when the legacy app renderer runs. */
(()=>{
'use strict';
const root=()=>document.querySelector('#suggestedParties');
const active=()=>document.querySelector('#generalOptimization')?.checked!==false && window.LostArkOptimizerMode?.general!==false;
let snapshot='';
let restoring=false;
function observe(){
 const h=root(); if(!h)return;
 const capture=()=>{if(!restoring&&h.querySelector('.authoritative-party'))snapshot=h.innerHTML};
 new MutationObserver(()=>{
   if(restoring)return;
   if(h.querySelector('.authoritative-party')){capture();return}
   if(active()&&snapshot){restoring=true;h.innerHTML=snapshot;restoring=false;}
 }).observe(h,{childList:true,subtree:false});
 capture();
}
function install(){window.__GENERAL_PARTY_RENDER_GUARD__=true;observe();document.addEventListener('change',e=>{if(e.target?.id==='generalOptimization'&&!e.target.checked)snapshot=''})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
