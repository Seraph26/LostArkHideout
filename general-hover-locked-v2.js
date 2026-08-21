/* Lost Ark Hideout — General Optimization hover lock v2
 * UI-only. Uses the finalized condensed hover-card contract.
 * Does not calculate, fetch, or rewrite optimizer values.
 * IMPORTANT: this is deliberately passive after normalization; it does not
 * schedule repeated timers and does not attach an optimizer click handler.
 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const general=()=>document.getElementById('generalOptimization')?.checked!==false && !document.getElementById('raidSpecificSelect')?.value;
function normalize(card){
 if(!card||!general()||card.dataset.generalHoverLocked==='1')return;
 if(!card.classList.contains('general-dps-hover')&&!card.classList.contains('general-support-hover'))return;
 const strong=card.querySelector('strong'); if(!strong)return;
 const name=clean(strong.textContent); if(!name)return;
 const direct=[...card.children];
 const textOf=e=>clean(e.textContent);
 const cp=direct.map(textOf).find(t=>/^CP\s+/i.test(t))||'';
 const party=direct.map(textOf).find(t=>/^Party Synergy\s+[+−-]/i.test(t))||'';
 const support=direct.map(textOf).find(t=>/^Support Impact\s+[+−-]/i.test(t))||'';
 const compat='Support compatibility uses encounter data';
 if(!cp||(!party&&!support))return;
 const head=document.createElement('div');head.className='chb-head';
 const hn=document.createElement('strong');hn.textContent=name;head.appendChild(hn);
 const hc=document.createElement('span');hc.textContent=cp;hc.title='Estimated overall contribution for this character in the current party. It is an optimizer model value, not an observed Bible DPS parse and not Combat Power.';hc.style.cursor='help';head.appendChild(hc);
 const stats=document.createElement('div');stats.className='chb-stats';
 if(party){const x=document.createElement('span');x.textContent=party;x.className='chb-explained-metric';x.title='Estimated increase to this character’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model contribution, not a direct in-game damage percentage.';stats.appendChild(x)}
 if(support){const x=document.createElement('span');x.textContent=support;x.className='chb-explained-metric';x.title='Estimated increase to this character’s modeled potential from the party support. This is a model contribution, not a direct in-game damage percentage.';stats.appendChild(x)}
 const cx=document.createElement('span');cx.textContent=compat;stats.appendChild(cx);
 card.replaceChildren(head,stats);
 card.dataset.generalHoverLocked='1';
 card.classList.add('chb-general-locked');
}
function apply(root=document){if(!general())return;root.querySelectorAll?.('#suggestedParties .character-hover-breakdown.general-dps-hover,#suggestedParties .character-hover-breakdown.general-support-hover').forEach(normalize)}
function start(){
 const root=document.getElementById('suggestedParties')||document.body;
 apply(root);
 let scheduled=false;
 const observer=new MutationObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;apply(root)});
 });
 observer.observe(root,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LostArkGeneralHoverLockedV2={active:true,version:2};
})();
