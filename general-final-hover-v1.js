/* Lost Ark Hideout — General Optimization hover finalizer
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
       row.classList.add('chb-explained-metric','chb-general-party-synergy');
       row.title=SYNERGY_TITLE;
       row.style.cursor='help';
     }else if(/^Support Impact\s+[+−-]/i.test(t)){
       row.classList.add('chb-explained-metric','chb-general-support-impact');
       row.title=SUPPORT_TITLE;
       row.style.cursor='help';
     }
   });
 });
}
function css(){
 let s=document.getElementById('general-final-hover-style');
 if(!s){s=document.createElement('style');s.id='general-final-hover-style';document.head.appendChild(s)}
 s.textContent='.general-dps-hover .chb-general-party-synergy,.general-dps-hover .chb-general-support-impact,.chb-canonical-dps .chb-general-party-synergy,.chb-canonical-dps .chb-general-support-impact{cursor:help;border-bottom:1px dotted rgba(255,255,255,.45);width:max-content;max-width:100%}.general-dps-hover .chb-general-party-synergy:hover,.general-dps-hover .chb-general-support-impact:hover,.chb-canonical-dps .chb-general-party-synergy:hover,.chb-canonical-dps .chb-general-support-impact:hover{border-bottom-color:currentColor}';
}
function start(){
 css();
 apply();
 const root=document.getElementById('suggestedParties')||document.body;
 let timer;
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,10)};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','class']});
 [0,25,50,100,250,500,1000,2000,4000,8000].forEach(ms=>setTimeout(apply,ms));
 setInterval(apply,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LostArkGeneralFinalHoverV1={version:'ui-authority-2',active:true};
})();
