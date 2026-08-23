/* Lost Ark Party — General Optimization hover finalizer
   UI-only authority for General Optimization DPS hover metrics.
   Support uptime calculations remain in general-party-optimizer-v2.js untouched.
*/
(()=>{
'use strict';
const SYNERGY_TITLE='Estimated increase to this character’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model contribution, not a direct in-game damage percentage.';
const SUPPORT_TITLE='Estimated increase to this character’s modeled potential from the party support. This is a model contribution, not a direct in-game damage percentage.';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function apply(){
 document.querySelectorAll('.general-dps-hover,.chb-canonical-dps').forEach(card=>{
   [...card.children].forEach(row=>{
     const t=clean(row.textContent);
     if(/^Party Synergy\s+[+−-]/i.test(t)){
       if(!row.classList.contains('chb-general-party-synergy'))row.classList.add('chb-explained-metric','chb-general-party-synergy');
       if(row.title!==SYNERGY_TITLE)row.title=SYNERGY_TITLE;
       if(row.style.cursor!=='help')row.style.cursor='help';
     }else if(/^Support Impact\s+[+−-]/i.test(t)){
       if(!row.classList.contains('chb-general-support-impact'))row.classList.add('chb-explained-metric','chb-general-support-impact');
       if(row.title!==SUPPORT_TITLE)row.title=SUPPORT_TITLE;
       if(row.style.cursor!=='help')row.style.cursor='help';
     }
   });
 });
}
function css(){
 let s=document.getElementById('general-final-hover-style');
 if(!s){s=document.createElement('style');s.id='general-final-hover-style';document.head.appendChild(s)}
 s.textContent='.general-dps-hover .chb-general-party-synergy,.general-dps-hover .chb-general-support-impact,.chb-canonical-dps .chb-general-party-synergy,.chb-canonical-dps .chb-general-support-impact{cursor:help!important;border-bottom:1px dotted rgba(255,255,255,.45)!important;width:max-content!important;max-width:100%!important}.general-dps-hover .chb-general-party-synergy:hover,.general-dps-hover .chb-general-support-impact:hover,.chb-canonical-dps .chb-general-party-synergy:hover,.chb-canonical-dps .chb-general-support-impact:hover{border-bottom-color:currentColor!important}';
}
function start(){
 css();
 apply();
 const root=document.getElementById('suggestedParties')||document.body;
 let timer=0,frame=0;
 const schedule=()=>{
   clearTimeout(timer);
   timer=setTimeout(()=>{
     if(frame)return;
     frame=requestAnimationFrame(()=>{frame=0;apply()});
   },20);
 };
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
 [50,150,300,600,1000,2000].forEach(ms=>setTimeout(apply,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LostArkGeneralFinalHoverV1={version:'ui-authority-3',active:true};
})();
