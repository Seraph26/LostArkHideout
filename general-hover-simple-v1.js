/* Lost Ark Hideout — General Optimization condensed hover authority v1 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const num=s=>{const m=clean(s).replace(/,/g,'').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
function general(){return document.getElementById('generalOptimization')?.checked!==false&&window.LostArkOptimizerMode?.general!==false}
function normalize(card){
 if(!card||!general())return;
 if(!card.classList.contains('general-dps-hover')&&!card.classList.contains('general-support-hover'))return;
 const strong=card.querySelector('strong');if(!strong)return;
 const name=clean(strong.textContent);
 const lines=[...card.querySelectorAll(':scope > div')].map(x=>clean(x.textContent)).filter(Boolean);
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
 card.replaceChildren(head,stats);
 card.dataset.generalHoverSimple='1';
}
function apply(){if(!general())return;document.querySelectorAll('#suggestedParties .character-hover-breakdown.general-dps-hover,#suggestedParties .character-hover-breakdown.general-support-hover').forEach(normalize)}
function start(){
 apply();
 const root=document.getElementById('suggestedParties')||document.body;
 let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,0)};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
 document.getElementById('optimizeBtn')?.addEventListener('click',()=>setTimeout(apply,0),true);
 [50,150,300,600,1000,2000,4000].forEach(ms=>setTimeout(apply,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
