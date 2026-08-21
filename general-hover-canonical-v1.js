/* Lost Ark Hideout — General Optimization hover-card canonical formatter v1
 * UI-only. General cards are normalized to the same DOM/layout contract used by
 * the finalized raid-specific hover cards. Existing card text and contribution
 * rows are preserved; this script does not recalculate or rewrite the model.
 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function general(){return !!document.getElementById('generalOptimization')?.checked&&!(document.getElementById('raidSpecificSelect')?.value||'')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function splitLines(text){return String(text||'').split(/\n|(?=Party Synergy\s+[+−-])|(?=Support Impact\s+[+−-])|(?=Support compatibility uses encounter data)/).map(clean).filter(Boolean)}
function normalize(card){
 if(!card||card.dataset.generalHoverCanonical==='1')return;
 const isDps=card.classList.contains('general-dps-hover');
 const isSupport=card.classList.contains('general-support-hover');
 if(!isDps&&!isSupport)return;
 const strong=card.querySelector(':scope > strong');
 const direct=[...card.children];
 const headerText=strong?clean(strong.textContent):'';
 if(!headerText)return;
 let cpLine='',stats=[],details=[];
 for(const el of direct){
  if(el===strong)continue;
  if(el.classList.contains('chb-synergy')){details.push(el);continue}
  const t=clean(el.textContent);
  if(!t)continue;
  if(/^CP\s+/i.test(t)){cpLine=t;continue}
  if(/^Party Synergy\s+[+−-]/i.test(t)||/^Support Impact\s+[+−-]/i.test(t)||/^Support compatibility uses encounter data/i.test(t)){stats.push(t);continue}
  const nested=[...el.querySelectorAll('.chb-synergy')];
  if(nested.length){details.push(...nested);continue}
  const lines=splitLines(t);
  for(const line of lines){
   if(/^Party Synergy\s+[+−-]/i.test(line)||/^Support Impact\s+[+−-]/i.test(line)||/^Support compatibility uses encounter data/i.test(line))stats.push(line);
   else if(/^CP\s+/i.test(line))cpLine=line;
  }
 }
 const head=document.createElement('div');head.className='chb-head';
 head.innerHTML=`<strong>${esc(headerText)}</strong><span>${esc(cpLine)}</span>`;
 const stat=document.createElement('div');stat.className='chb-stats';
 const party=stats.find(x=>/^Party Synergy/i.test(x));
 const support=stats.find(x=>/^Support Impact/i.test(x));
 const compat=stats.find(x=>/^Support compatibility/i.test(x));
 if(party){const s=document.createElement('span');s.textContent=party;stat.appendChild(s)}
 if(support){const s=document.createElement('span');s.textContent=support;stat.appendChild(s)}
 if(compat){const s=document.createElement('span');s.textContent=compat;stat.appendChild(s)}
 const detail=document.createElement('div');detail.className='chb-detail';
 details.forEach(d=>{d.classList.add('chb-synergy');detail.appendChild(d)});
 card.replaceChildren(head,stat,detail);
 card.dataset.generalHoverCanonical='1';
 card.classList.add('chb-general-canonical');
}
function apply(){if(!general())return;document.querySelectorAll('#suggestedParties .character-hover-breakdown.general-dps-hover,#suggestedParties .character-hover-breakdown.general-support-hover').forEach(normalize)}
function css(){
 let s=document.getElementById('general-hover-canonical-style');
 if(!s){s=document.createElement('style');s.id='general-hover-canonical-style';document.head.appendChild(s)}
 s.textContent='.chb-general-canonical .chb-head{display:flex;flex-direction:column}.chb-general-canonical .chb-stats{display:flex;flex-direction:column}.chb-general-canonical .chb-detail{display:block!important}.chb-general-canonical .chb-synergy{display:block!important;margin:6px 0!important;line-height:1.45}.chb-general-canonical .chb-head span{cursor:help}.chb-general-canonical .chb-stats span{display:block}';
}
function start(){
 css();apply();
 const root=document.getElementById('suggestedParties')||document.body;
 let timer=0;
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{document.querySelectorAll('#suggestedParties .character-hover-breakdown').forEach(c=>{if(!c.isConnected)delete c.dataset.generalHoverCanonical});apply()},0)};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
 [50,150,300,600,1000,2000,4000].forEach(ms=>setTimeout(apply,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
