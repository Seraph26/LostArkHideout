/* Lost Ark Party — encounter scoring bridge v3 */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3';
const btn=()=>document.getElementById('optimizeBtn');
function active(){return window.LostArkOptimizerMode&&!window.LostArkOptimizerMode.general&&window.LostArkOptimizerMode.raid}
/* This used to print "Encounter scoring: <raid> · <confidence> · <parameters>",
   which is word for word what the summary bar above the parties already says,
   so the same sentence appeared twice on screen. It also printed "Encounter
   model inactive" in General mode, where the mode label directly above it
   already reads "General Optimization".

   What is kept is the one state neither of those covers: a raid is selected but
   has no scoring profile, so the General model is quietly standing in. That is
   worth saying, and nothing else says it. Otherwise the line stays empty and
   takes no space. */
function annotate(){const label=document.getElementById('optimizerModeLabel');if(!label)return;
 let el=document.getElementById('encounterModelStatus');
 if(!el){el=document.createElement('span');el.id='encounterModelStatus';el.style.cssText='display:block;margin-top:4px;font-size:11px;color:#e0a35b';label.parentElement?.appendChild(el)}
 const p=window.LostArkEncounterScoring?.profile?.();
 if(active()&&!p){el.style.display='';el.textContent='Encounter selected · no scoring profile; General model retained';return}
 el.style.display='none';el.textContent='';}
function intercept(){const b=btn();if(!b||b.dataset.raidBridgeV3)return;b.dataset.raidBridgeV3='1';annotate();document.getElementById('raidSpecificSelect')?.addEventListener('change',()=>setTimeout(annotate,50));document.getElementById('generalOptimization')?.addEventListener('change',()=>setTimeout(annotate,50));b.addEventListener('click',()=>setTimeout(annotate,150),{capture:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',intercept,{once:true});else intercept();
})();