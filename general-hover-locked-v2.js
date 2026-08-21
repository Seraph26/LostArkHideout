/* Lost Ark Hideout — General Optimization hover lock v3
 * UI-only. General cards use the same canonical content/layout as the frozen
 * Raid Specific hover implementation, but retain the values already produced
 * by the General Optimization model.
 *
 * General-specific rule:
 * - Never copy encounter/raid values from Raid Specific.
 * - Preserve the General CP, Party Synergy, Support Impact, and contribution
 *   values already present on the General card.
 * - Omit raid/gate identification lines from General hovers.
 * - Do not calculate, fetch, or modify optimizer/scoring values.
 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const general=()=>document.getElementById('generalOptimization')?.checked!==false && !document.getElementById('raidSpecificSelect')?.value;
const isContribution=t=>/^\+?\s*[\d,]+(?:\.\d+)?\s+estimated\s+(?:support|synergy)\s+contribution\s+from\s+/i.test(t);
const isRaidGate=t=>/(?:^|\s)(?:\[[^\]]+\]\s*)?.+\s+[—-]\s+Gate\s+\d+(?:\s|$)/i.test(t);
function normalize(card){
 if(!card||!general()||card.dataset.generalHoverCanonical==='1')return;
 if(!card.classList.contains('general-dps-hover')&&!card.classList.contains('general-support-hover'))return;
 const strong=card.querySelector(':scope > strong')||card.querySelector('strong');
 if(!strong)return;
 const name=clean(strong.textContent); if(!name)return;
 const direct=[...card.children];
 const textOf=e=>clean(e.textContent);
 let cp='',party='',support='',compat='',details=[];
 for(const row of direct){
   if(row===strong)continue;
   const t=textOf(row); if(!t)continue;
   if(/^CP\s+/i.test(t)){cp=t;continue}
   if(/^Party Synergy\s+[+−-]/i.test(t)){party=t;continue}
   if(/^Support Impact\s+[+−-]/i.test(t)){support=t;continue}
   if(/^Support compatibility uses encounter data/i.test(t)){compat=t;continue}
   if(isRaidGate(t))continue;
   if(row.classList.contains('chb-synergy')||isContribution(t)){
     details.push(row);
     continue;
   }
   const nested=[...row.querySelectorAll('.chb-synergy')];
   if(nested.length){
     nested.forEach(d=>details.push(d));
     continue;
   }
   const lines=String(row.textContent||'').split(/\n+/).map(clean).filter(Boolean);
   lines.forEach(line=>{
     if(/^CP\s+/i.test(line))cp=line;
     else if(/^Party Synergy\s+[+−-]/i.test(line))party=line;
     else if(/^Support Impact\s+[+−-]/i.test(line))support=line;
     else if(/^Support compatibility uses encounter data/i.test(line))compat=line;
     else if(!isRaidGate(line)&&isContribution(line))details.push(row);
   });
 }
 if(!cp||(!party&&!support))return;
 const head=document.createElement('div');head.className='chb-head';
 const hn=document.createElement('strong');hn.textContent=name;head.appendChild(hn);
 const hc=document.createElement('span');hc.textContent=cp;hc.title='Estimated overall contribution for this character in the current General Optimization party. It is a General Optimization model value, not an observed Bible DPS parse and not Combat Power.';hc.style.cursor='help';head.appendChild(hc);
 const stats=document.createElement('div');stats.className='chb-stats';
 if(party){const x=document.createElement('span');x.textContent=party;x.className='chb-explained-metric chb-general-party-synergy';x.title='Estimated increase to this character’s modeled potential from offensive synergies supplied by the other DPS characters in the General Optimization party. This is a General Optimization model contribution, not a direct in-game damage percentage.';stats.appendChild(x)}
 if(support){const x=document.createElement('span');x.textContent=support;x.className='chb-explained-metric chb-general-support-impact';x.title='Estimated increase to this character’s modeled potential from the party support in General Optimization. This is a General Optimization model contribution, not a direct in-game damage percentage.';stats.appendChild(x)}
 const compatibility=document.createElement('div');compatibility.className='chb-compatibility';
 if(compat){const x=document.createElement('span');x.textContent=compat;compatibility.appendChild(x)}
 const detail=document.createElement('div');detail.className='chb-detail';
 const seen=new Set();
 details.forEach(d=>{
   if(!d||seen.has(d))return;
   const t=textOf(d);
   if(!t||isRaidGate(t))return;
   seen.add(d);
   d.classList.add('chb-synergy');
   detail.appendChild(d);
 });
 card.replaceChildren(head,stats,compatibility,detail);
 card.dataset.generalHoverCanonical='1';
 card.classList.add('chb-general-canonical');
}
function apply(root=document){if(!general())return;root.querySelectorAll?.('#suggestedParties .character-hover-breakdown.general-dps-hover,#suggestedParties .character-hover-breakdown.general-support-hover').forEach(normalize)}
function css(){
 let s=document.getElementById('general-hover-canonical-style');
 if(!s){s=document.createElement('style');s.id='general-hover-canonical-style';document.head.appendChild(s)}
 s.textContent='.chb-general-canonical .chb-head{display:flex;flex-direction:column}.chb-general-canonical .chb-head strong{display:block}.chb-general-canonical .chb-stats{display:flex;flex-direction:column}.chb-general-canonical .chb-stats span{display:block}.chb-general-canonical .chb-compatibility{display:block;margin-top:6px}.chb-general-canonical .chb-detail{display:block!important;margin-top:4px}.chb-general-canonical .chb-synergy{display:block!important;margin:6px 0!important;line-height:1.45}.chb-general-canonical .chb-head span{cursor:help}.chb-general-canonical .chb-general-party-synergy,.chb-general-canonical .chb-general-support-impact{cursor:help!important;width:max-content!important;max-width:100%}';
}
function start(){
 const root=document.getElementById('suggestedParties')||document.body;
 css();apply(root);
 let scheduled=false;
 const observer=new MutationObserver(()=>{
   if(scheduled)return;
   scheduled=true;
   queueMicrotask(()=>{scheduled=false;apply(root)});
 });
 observer.observe(root,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LostArkGeneralHoverLockedV3={active:true,version:3};
})();
