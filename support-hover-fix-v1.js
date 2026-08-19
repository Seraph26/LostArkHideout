/* Lost Ark Hideout — support hover data bridge v3 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
function classFor(member){
  const explicit=clean(member.dataset.class||member.querySelector('[data-class]')?.dataset.class||member.querySelector('.party-class-label')?.textContent||'');
  if(SUPPORTS.has(explicit))return explicit;
  const text=clean(member.querySelector('small')?.textContent||'');
  for(const cls of SUPPORTS)if(new RegExp(`\\b${cls}\\b`,'i').test(text))return cls;
  return '';
}
function summaryFor(member){const cls=classFor(member);if(!cls)return null;try{return window.LostArkSupportStats?.summary?.(cls)||null}catch{return null}}
function render(){document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();if(role!=='support')return;const summary=summaryFor(member);const detail=member.querySelector('.character-hover-breakdown .chb-detail');if(!detail||!summary)return;detail.innerHTML=`<div><strong>Observed median support uptime</strong></div><div>Selected encounter</div><div>AP: ${summary.ap!=null?(summary.ap*100).toFixed(2)+'%':'—'} · Brand: ${summary.brand!=null?(summary.brand*100).toFixed(2)+'%':'—'} · H.A. Skill: ${summary.ha!=null?(summary.ha*100).toFixed(2)+'%':'—'} · Identity: ${summary.identity!=null?(summary.identity*100).toFixed(2)+'%':'—'}</div>`})}
function start(){render();const root=document.getElementById('suggestedParties')||document.body;let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,40)}).observe(root,{childList:true,subtree:true,characterData:true});setTimeout(render,500);setTimeout(render,1500);setTimeout(render,3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
