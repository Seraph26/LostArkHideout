/* Lost Ark Hideout — support hover renderer v7 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const LABELS={crit:'Critical Rate',criticalRate:'Critical Rate',critDamage:'Critical Damage',criticalDamage:'Critical Damage',attackSpeed:'Attack Speed',attackPower:'Attack Power',supportAmplification:'Support Amplification',mana:'Mana',damage:'Damage',identity:'Identity'};
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
function formatContribution(value,base){
  const n=Number(value),b=Number(base);
  if(!Number.isFinite(n))return 'Unavailable';
  if(!Number.isFinite(b)||b<=0)return '+'+Math.round(n).toLocaleString()+' estimated contribution';
  return '+'+Math.round(n).toLocaleString()+' estimated contribution · '+((n/b)*100).toFixed(2)+'% of base power';
}
function isStale(el){
  const text=clean(el.textContent).toLowerCase();
  return text.includes('observed median support uptime is unavailable')||text.includes('no direct party effects detected');
}
function labelEffectNames(text){
  let s=text;
  Object.entries(LABELS).forEach(([key,label])=>{
    const re=new RegExp('(?<![A-Za-z])'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Za-z])','g');
    s=s.replace(re,label);
  });
  return s;
}
function formatContributionRows(detail,base){
  const walker=document.createTreeWalker(detail,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    let text=node.nodeValue||'';
    const original=text;
    text=labelEffectNames(text);
    if(/estimated contribution|of base power/i.test(text)){node.nodeValue=text;return;}
    const re=/((?:Critical Rate|Critical Damage|Attack Speed|Attack Power|Support Amplification|Mana|Damage|Identity)\s+from\s+[^:]+:\s*)([+-]?\d[\d,]*)(?=\s*(?:-|—)\s*observed median|\s*$)/i;
    text=text.replace(re,(m,p,v)=>p+formatContribution(v.replace(/,/g,''),base));
    node.nodeValue=text;
  });
}
function paintSupport(member,summary){
  const card=member.querySelector('.character-hover-breakdown');if(!card)return;
  card.querySelectorAll('.chb-support-unavailable').forEach(x=>x.remove());
  card.querySelectorAll('.chb-explained-metric').forEach(el=>{
    const label=clean(el.querySelector('.chb-metric-label')?.textContent).toLowerCase();
    if(label==='party synergy'||label==='support impact')el.remove();
  });
  card.querySelectorAll('.chb-stats > span').forEach(el=>{
    const text=clean(el.textContent).toLowerCase();
    if(text==='support impact +0.00%'||text==='party synergy +0.00%'||text==='observed median support uptime')el.remove();
  });
  card.querySelectorAll('.chb-detail').forEach(el=>{if(isStale(el))el.remove()});
  const old=card.querySelector('.chb-support-observed');if(old)old.remove();
  const details=document.createElement('div');
  details.className='chb-detail chb-support-observed';
  details.innerHTML=`<div><strong>Observed median support uptime</strong></div><div>${clean(encounterName())}</div><div>Attack Power: ${format(summary.ap)} - Brand: ${format(summary.brand)} - H.A. Skill: ${format(summary.ha)} - Identity: ${format(summary.identity)}</div>`;
  card.appendChild(details);
}
function render(){
  const api=window.LostArkSupportStats;if(!api)return;
  const members=document.querySelectorAll('#suggestedParties .party-member');
  members.forEach(member=>{
    const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();
    if(role==='support'){
      const cls=classFor(member),summary=api.summary?.(cls);if(cls&&summary)paintSupport(member,summary);
    }
    const card=member.querySelector('.character-hover-breakdown');if(!card)return;
    const cpMatch=clean(member.querySelector('.party-stat-label')?.textContent).match(/CP\s*([\d,]+)/i);
    const base=Number(cpMatch?.[1]?.replace(/,/g,''));
    card.querySelectorAll('.chb-detail:not(.chb-support-observed)').forEach(detail=>{
      const text=clean(detail.textContent);
      if(!text)return;
      if(!/from\s+[^:]+:/i.test(text)){
        const walker=document.createTreeWalker(detail,NodeFilter.SHOW_TEXT);
        const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
        nodes.forEach(node=>{node.nodeValue=labelEffectNames(node.nodeValue||'')});
      }else if(Number.isFinite(base)&&base>0){
        formatContributionRows(detail,base);
      }
    });
  });
}
function start(){
  const root=document.getElementById('suggestedParties')||document.body;
  let timer;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,50)};
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true});
  document.addEventListener('mouseover',e=>{const member=e.target.closest?.('#suggestedParties .party-member');if(member)setTimeout(render,0)},true);
  render();
  [100,250,500,1000,2000,4000,8000].forEach(ms=>setTimeout(render,ms));
  setInterval(render,500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();