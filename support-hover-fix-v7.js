/* Lost Ark Hideout — raid-specific support hover data bridge v8 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
function classFor(member){
 const explicit=clean(member.querySelector('.class-icon')?.alt||member.dataset.class||member.querySelector('[data-class]')?.dataset.class||'');
 return SUPPORTS.has(explicit)?explicit:'';
}
function summaryFor(member){const cls=classFor(member);if(!cls)return null;try{return window.LostArkSupportStats?.summary?.(cls)||null}catch{return null}}
function encounterName(){
 try{const selected=clean(document.getElementById('raidSpecificSelect')?.selectedOptions?.[0]?.textContent);if(selected&&selected!=='Select Raid')return selected}catch{}
 try{const name=clean(window.LostArkEncounterScoring?.profile?.()?.name);if(name)return name}catch{}
 return 'Selected encounter';
}
function pct(v){return v!=null&&Number.isFinite(Number(v))?(Number(v)*100).toFixed(2)+'%':'Unavailable'}
function render(){
 document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
  const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();
  if(role!=='support')return;
  const summary=summaryFor(member);if(!summary)return;
  const details=member.querySelectorAll('.character-hover-breakdown .chb-detail');if(!details.length)return;
  const encounter=clean(encounterName()),supportClass=classFor(member);
  const effects=[
   ['Attack Power',summary.ap],
   ['Brand',summary.brand],
   ['H.A. Skill',summary.ha],
   ['Identity',summary.identity]
  ];
  details[0].innerHTML=`<div><strong>${encounter}</strong></div><div>Support compatibility uses encounter data.</div><div>Observed median support uptime by effect:</div>`;
  effects.forEach(([name,value],i)=>{
   const row=details[i+1]||document.createElement('div');
   row.className='chb-detail chb-raid-support-effect';
   row.innerHTML=`<div><strong>${name}</strong></div><div>Observed median uptime: ${pct(value)}</div>`;
   row.title=`Observed median ${name} uptime for ${supportClass} in ${encounter}. This is encounter evidence from Bible data, not a modeled contribution percentage.`;
   if(!row.parentNode)details[0].parentNode.appendChild(row);
  });
  const all=member.querySelectorAll('.character-hover-breakdown .chb-detail');
  for(const row of all){if(!row.classList.contains('chb-raid-support-effect')&&row!==details[0])row.remove()}
 });
}
function css(){
 let s=document.getElementById('raid-support-hover-v8-style');
 if(!s){s=document.createElement('style');s.id='raid-support-hover-v8-style';document.head.appendChild(s)}
 s.textContent='.chb-raid-support-effect{display:block!important;margin:4px 0;line-height:1.4}.chb-raid-support-effect strong{font-weight:600}.chb-raid-support-effect[title]{cursor:help;border-bottom:1px dotted rgba(255,255,255,.45);width:max-content;max-width:100%}';
}
function start(){
 css();
 const run=()=>render();
 run();
 const root=document.getElementById('suggestedParties')||document.body;let timer;
 new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(run,60)}).observe(root,{childList:true,subtree:true,characterData:true});
 [250,750,1500,3000,5000].forEach(ms=>setTimeout(run,ms));
 try{window.LostArkSupportStats?.ready?.then(run).catch(()=>{})}catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
