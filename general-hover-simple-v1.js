/* Lost Ark Hideout — General Optimization FINAL hover authority */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const general=()=>document.getElementById('generalOptimization')?.checked!==false&&!document.getElementById('raidSpecificSelect')?.value;
function normalize(card){
 if(!card||!general()||card.dataset.generalHoverFinal==='1')return;
 if(!card.classList.contains('general-dps-hover')&&!card.classList.contains('general-support-hover'))return;
 const direct=[...card.children],text=e=>clean(e.textContent),strong=card.querySelector('strong');if(!strong)return;
 const name=clean(strong.textContent),cp=direct.map(text).find(x=>/^CP\s+/i.test(x))||'',party=direct.map(text).find(x=>/^Party Synergy\s+[+−-]/i.test(x))||'',support=direct.map(text).find(x=>/^Support Impact\s+[+−-]/i.test(x))||'';
 if(!cp||(!party&&!support))return;
 const head=document.createElement('div');head.className='chb-head';const hn=document.createElement('strong');hn.textContent=name;head.appendChild(hn);const hc=document.createElement('span');hc.textContent=cp;hc.title='Estimated overall contribution for this character in the current party. It is an optimizer model value, not an observed Bible DPS parse and not Combat Power.';hc.style.cursor='help';head.appendChild(hc);
 const stats=document.createElement('div');stats.className='chb-stats';if(party){const x=document.createElement('span');x.textContent=party;x.className='chb-explained-metric';x.title='Estimated increase to this character’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model contribution, not a direct in-game damage percentage.';stats.appendChild(x)}if(support){const x=document.createElement('span');x.textContent=support;x.className='chb-explained-metric';x.title='Estimated increase to this character’s modeled potential from the party support. This is a model contribution, not a direct in-game damage percentage.';stats.appendChild(x)}const cx=document.createElement('span');cx.textContent='Support compatibility uses encounter data';stats.appendChild(cx);
 card.replaceChildren(head,stats);card.dataset.generalHoverFinal='1';card.classList.add('chb-general-final');
}
function apply(root){if(!general())return;root.querySelectorAll('#suggestedParties .character-hover-breakdown.general-dps-hover,#suggestedParties .character-hover-breakdown.general-support-hover').forEach(normalize)}
function start(){const root=document.getElementById('suggestedParties')||document.body;apply(root);let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;apply(root)})}).observe(root,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
