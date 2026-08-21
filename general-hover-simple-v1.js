/* Lost Ark Hideout — General Optimization FINAL condensed hover authority
 * LOCKED FORMAT: intentionally identical to the finalized Raid-style condensed
 * character hover layout. This file may normalize only the character hover
 * markup; it must never add individual synergy contribution rows.
 */
(()=> {
'use strict';
function isGeneral(){return document.getElementById('generalOptimization')?.checked!==false&&!(document.getElementById('raidSpecificSelect')?.value||'')}
function clean(value){return String(value??'').replace(/\s+/g,' ').trim()}
function normalize(card){
 if(!card||!isGeneral()||card.dataset.generalHoverCondensed==='1')return;
 if(!card.classList.contains('general-dps-hover')&&!card.classList.contains('general-support-hover'))return;
 const strong=card.querySelector(':scope > strong');if(!strong)return;
 const name=clean(strong.textContent);
 const lines=[...card.querySelectorAll(':scope > div')].map(el=>clean(el.textContent)).filter(Boolean);
 const cp=lines.find(x=>/^CP\s+/i.test(x))||'';
 const party=lines.find(x=>/^Party Synergy\s+[+−-]/i.test(x))||'';
 const support=lines.find(x=>/^Support Impact\s+[+−-]/i.test(x))||'';
 const compat=lines.find(x=>/^Support compatibility uses encounter data/i.test(x))||'Support compatibility uses encounter data';
 if(!cp||(!party&&!support))return;
 const head=document.createElement('div');head.className='chb-head';
 const h=document.createElement('strong');h.textContent=name;head.appendChild(h);
 const c=document.createElement('span');c.textContent=cp;head.appendChild(c);
 const stats=document.createElement('div');stats.className='chb-stats';
 if(party){const x=document.createElement('span');x.textContent=party;stats.appendChild(x)}
 if(support){const x=document.createElement('span');x.textContent=support;stats.appendChild(x)}
 const x=document.createElement('span');x.textContent=compat;stats.appendChild(x);
 card.replaceChildren(head,stats);card.dataset.generalHoverCondensed='1';
}
function applyCurrent(){if(!isGeneral())return;const root=document.getElementById('suggestedParties');if(!root)return;root.querySelectorAll('.character-hover-breakdown.general-dps-hover,.character-hover-breakdown.general-support-hover').forEach(normalize)}
function start(){applyCurrent();let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;applyCurrent()})};new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});document.getElementById('optimizeBtn')?.addEventListener('click',()=>[0,50,150,300,600,1000,2000].forEach(ms=>setTimeout(applyCurrent,ms)),true);document.getElementById('generalOptimization')?.addEventListener('change',()=>setTimeout(applyCurrent,0),true);document.getElementById('raidSpecificSelect')?.addEventListener('change',()=>setTimeout(applyCurrent,0),true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
