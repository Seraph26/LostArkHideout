/* Lost Ark Hideout — support hover data bridge v5 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
function classFor(member){
  const explicit=clean(member.querySelector('.class-icon')?.alt||member.dataset.class||member.querySelector('[data-class]')?.dataset.class||'');
  if(SUPPORTS.has(explicit))return explicit;
  return '';
}
function summaryFor(member){const cls=classFor(member);if(!cls)return null;try{return window.LostArkSupportStats?.summary?.(cls)||null}catch{return null}}
function render(){
 document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
  const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();
  if(role!=='support')return;
  const summary=summaryFor(member); if(!summary)return;
  const details=member.querySelectorAll('.character-hover-breakdown .chb-detail');
  if(!details.length)return;
  const rows=[
   `Attack Power: ${summary.ap!=null?(summary.ap*100).toFixed(2)+'%':'Unavailable'}`,
   `Brand: ${summary.brand!=null?(summary.brand*100).toFixed(2)+'%':'Unavailable'}`,
   `H.A. Skill: ${summary.ha!=null?(summary.ha*100).toFixed(2)+'%':'Unavailable'}`,
   `Identity: ${summary.identity!=null?(summary.identity*100).toFixed(2)+'%':'Unavailable'}`
  ];
  details[0].innerHTML=`<div><strong>Observed median support uptime</strong></div><div>Selected encounter</div><div>${rows.join(' · ')}</div>`;
  for(let i=1;i<details.length;i++)details[i].remove();
 });
}
function start(){render();const root=document.getElementById('suggestedParties')||document.body;let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,40)}).observe(root,{childList:true,subtree:true,characterData:true});[500,1500,3000].forEach(ms=>setTimeout(render,ms));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
