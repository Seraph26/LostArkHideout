/* Lost Ark Hideout — encounter scoring bridge v2 */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3';
const btn=()=>document.getElementById('optimizeBtn');
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'null')||{characters:[]}}catch{return{characters:[]}}}
function active(){return window.LostArkOptimizerMode&&!window.LostArkOptimizerMode.general&&window.LostArkOptimizerMode.raid}
function annotate(){
 const label=document.getElementById('optimizerModeLabel'); if(!label)return;
 let el=document.getElementById('encounterModelStatus');
 if(!el){el=document.createElement('span');el.id='encounterModelStatus';el.style.cssText='display:block;margin-top:4px;font-size:11px;color:#9aa0a6';label.parentElement?.appendChild(el)}
 const p=window.LostArkEncounterScoring?.profile?.();
 if(!active()){el.textContent='Encounter model inactive';return}
 if(p)el.textContent=`Encounter scoring: ${p.name} · ${p.confidence}`;
 else el.textContent='Encounter selected · no scoring profile; General model retained';
}
function intercept(){
 const b=btn(); if(!b||b.dataset.raidBridgeV2)return; b.dataset.raidBridgeV2='1'; annotate();
 document.getElementById('raidSpecificSelect')?.addEventListener('change',()=>setTimeout(annotate,0));
 document.getElementById('generalOptimization')?.addEventListener('change',()=>setTimeout(annotate,0));
 b.addEventListener('click',()=>{
   if(!active()||!window.LostArkEncounterScoring?.profile?.())return;
   const original=load();
   const result=window.LostArkEncounterScoring.partyScore(original.characters||[]);
   window.LostArkEncounterResult=result;
   annotate();
   /* Deliberately do not modify localStorage or character CP. The existing
      optimizer remains the source of its normal character data. Encounter
      scoring is exposed separately for the optimizer/UI integration layer. */
 },{capture:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',intercept,{once:true});else intercept();
})();
