/* Lost Ark Hideout — support hover renderer v3 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
function classFor(member){
  const candidates=[member.querySelector('.class-icon')?.alt,member.dataset.class,member.querySelector('[data-class]')?.dataset.class,member.querySelector('.party-class-label')?.dataset.class].map(clean).filter(Boolean);
  for(const c of candidates)if(SUPPORTS.has(c))return c;
  return '';
}
function encounterName(){
  try{const name=clean(window.LostArkEncounterScoring?.profile?.()?.name);if(name)return name}catch{}
  try{const selected=clean(document.getElementById('raidSpecificSelect')?.selectedOptions?.[0]?.textContent);if(selected&&selected!=='Select Raid')return selected}catch{}
  try{const e=window.LostArkOptimizerMode?.encounter;if(e?.label)return clean(e.label)}catch{}
  return 'Selected encounter';
}
function format(v){
  if(v===null||v===undefined||v==='')return 'Unavailable';
  const n=Number(v);return Number.isFinite(n)?(n*100).toFixed(2)+'%':'Unavailable';
}
function paint(member,summary){
  const card=member.querySelector('.character-hover-breakdown');if(!card)return;
  card.querySelectorAll('.chb-support-unavailable').forEach(x=>x.remove());
  const old=card.querySelector('.chb-support-observed');if(old)old.remove();
  const details=document.createElement('div');
  details.className='chb-detail chb-support-observed';
  details.innerHTML=`<div><strong>Observed median support uptime</strong></div><div>${clean(encounterName())}</div><div>Attack Power: ${format(summary.ap)} - Brand: ${format(summary.brand)} - H.A. Skill: ${format(summary.ha)} - Identity: ${format(summary.identity)}</div>`;
  card.appendChild(details);
}
function render(){
  const api=window.LostArkSupportStats;if(!api)return;
  document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
    const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();if(role!=='support')return;
    const cls=classFor(member);if(!cls)return;
    const summary=api.summary?.(cls);if(!summary)return;
    paint(member,summary);
  });
}
function start(){
  const root=document.getElementById('suggestedParties')||document.body;
  let timer;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,50)};
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true});
  document.addEventListener('mouseover',e=>{const member=e.target.closest?.('#suggestedParties .party-member');if(member)setTimeout(()=>{const api=window.LostArkSupportStats;if(!api)return;const cls=classFor(member),summary=api.summary?.(cls);if(cls&&summary)paint(member,summary)},0)},true);
  render();
  [100,250,500,1000,2000,4000,8000].forEach(ms=>setTimeout(render,ms));
  setInterval(render,500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();