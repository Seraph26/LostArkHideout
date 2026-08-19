/* Lost Ark Hideout — support hover renderer */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
function classFor(member){
  const candidates=[
    member.querySelector('.class-icon')?.alt,
    member.dataset.class,
    member.querySelector('[data-class]')?.dataset.class,
    member.querySelector('.party-class-label')?.dataset.class
  ].map(clean).filter(Boolean);
  for(const c of candidates)if(SUPPORTS.has(c))return c;
  return '';
}
function encounterName(){
  try{const name=clean(window.LostArkEncounterScoring?.profile?.()?.name);if(name)return name}catch{}
  try{const selected=clean(document.getElementById('raidSpecificSelect')?.selectedOptions?.[0]?.textContent);if(selected&&selected!=='Select Raid')return selected}catch{}
  return 'Selected encounter';
}
function format(v){return Number.isFinite(Number(v))?(Number(v)*100).toFixed(2)+'%':'Unavailable'}
function paint(member,cls,summary){
  let card=member.querySelector('.character-hover-breakdown');
  if(!card)return;
  let details=card.querySelector('.chb-support-observed');
  if(!details){
    details=document.createElement('div');
    details.className='chb-detail chb-support-observed';
    card.appendChild(details);
  }
  details.innerHTML=`<div>Selected encounter: ${clean(encounterName())}</div><div>Attack Power: ${format(summary.ap)} - Brand: ${format(summary.brand)} - H.A. Skill: ${format(summary.ha)} - Identity: ${format(summary.identity)}</div>`;
  card.querySelectorAll('.chb-support-unavailable').forEach(x=>x.remove());
}
async function render(){
  const api=window.LostArkSupportStats;
  if(!api)return;
  const encounter=window.LostArkOptimizerMode?.encounter;
  if(encounter){try{await api.fetch(encounter)}catch{}}
  document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
    const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();
    if(role!=='support')return;
    const cls=classFor(member);if(!cls)return;
    const summary=api.summary?.(cls);
    if(!summary)return;
    paint(member,cls,summary);
  });
}
function start(){
  const root=document.getElementById('suggestedParties')||document.body;
  let timer;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,80)};
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true});
  render();
  [250,750,1500,3000,5000].forEach(ms=>setTimeout(render,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
