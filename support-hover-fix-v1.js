/* Lost Ark Hideout — support hover data bridge v1 */
(()=>{
'use strict';
function clean(s){return String(s??'').replace(/\s+/g,' ').trim()}
function summaryFor(member){
  const cls=clean(member.querySelector('.party-class-label')?.textContent);
  if(!cls)return null;
  try{return window.LostArkSupportStats?.summary?.(cls)||null}catch{return null}
}
function render(){
  document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
    const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();
    if(role!=='support')return;
    const summary=summaryFor(member);
    const detail=member.querySelector('.character-hover-breakdown .chb-detail');
    if(!detail||!summary)return;
    detail.innerHTML=`<div><strong>Observed median support uptime</strong></div><div>Selected encounter</div><div>AP: ${summary.ap!=null?(summary.ap*100).toFixed(2)+'%':'—'} · Brand: ${summary.brand!=null?(summary.brand*100).toFixed(2)+'%':'—'} · H.A. Skill: ${summary.ha!=null?(summary.ha*100).toFixed(2)+'%':'—'} · Identity: ${summary.identity!=null?(summary.identity*100).toFixed(2)+'%':'—'}</div>`;
  });
}
function start(){
  render();
  const root=document.getElementById('suggestedParties')||document.body;
  let timer;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,40)}).observe(root,{childList:true,subtree:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
