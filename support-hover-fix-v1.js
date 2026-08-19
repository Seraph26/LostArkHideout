/* Lost Ark Hideout — support hover data bridge v12 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
function classFor(member){
  const candidates=[member.querySelector('.class-icon')?.alt,member.dataset.class,member.querySelector('[data-class]')?.dataset.class,member.querySelector('.party-class-label')?.dataset.class].map(clean).filter(Boolean);
  return candidates.find(c=>SUPPORTS.has(c))||'';
}
function encounterName(){
  try{const n=clean(window.LostArkEncounterScoring?.profile?.()?.name);if(n)return n}catch{}
  try{const n=clean(document.getElementById('raidSpecificSelect')?.selectedOptions?.[0]?.textContent);if(n&&n!=='Select Raid')return n}catch{}
  try{const n=clean(window.LostArkOptimizerMode?.encounter?.label);if(n)return n}catch{}
  return 'Selected encounter';
}
function pct(v){const n=Number(v);return Number.isFinite(n)?`${(n*100).toFixed(2)}%`:'Unavailable';}
function paintSupportData(member,summary){
  const card=member.querySelector('.character-hover-breakdown');
  if(!card||!summary)return;
  const detail=[...card.querySelectorAll('.chb-detail')].find(el=>/observed median support uptime/i.test(clean(el.textContent)));
  if(!detail)return;
  detail.innerHTML=`<div><strong>Observed median support uptime</strong></div><div>${clean(encounterName())}</div><div>AP: ${pct(summary.ap)} · Brand: ${pct(summary.brand)} · H.A. Skill: ${pct(summary.ha)} · Identity: ${pct(summary.identity)}</div>`;
}
function render(){
  const api=window.LostArkSupportStats;
  if(!api)return;
  document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
    const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();
    if(role!=='support')return;
    const cls=classFor(member);
    const summary=cls?api.summary?.(cls):null;
    if(summary)paintSupportData(member,summary);
  });
}
function start(){
  let timer;
  const schedule=(delay=50)=>{clearTimeout(timer);timer=setTimeout(render,delay);};
  const attach=root=>{
    if(!root||root.dataset.lahHoverObserver==='1')return;
    try{new MutationObserver(()=>schedule(50)).observe(root,{childList:true,subtree:true,characterData:true});root.dataset.lahHoverObserver='1'}catch{}
  };
  const bootstrap=()=>{attach(document.body);attach(document.getElementById('suggestedParties'));schedule(0)};
  bootstrap();
  new MutationObserver(()=>{attach(document.body);attach(document.getElementById('suggestedParties'));schedule(50)}).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('mouseover',e=>{if(e.target.closest?.('#suggestedParties .party-member')){schedule(10);[50,150,300,600,1000].forEach(ms=>setTimeout(render,ms));}},true);
  [0,100,250,500,1000,2000,4000,8000].forEach(ms=>setTimeout(render,ms));
  setInterval(render,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
