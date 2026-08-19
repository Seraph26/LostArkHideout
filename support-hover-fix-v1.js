/* Lost Ark Hideout — support hover renderer v6 */
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
function formatContribution(value,base){
  const n=Number(value),b=Number(base);
  if(!Number.isFinite(n))return 'Unavailable';
  if(!Number.isFinite(b)||b<=0)return '+'+Math.round(n).toLocaleString()+' estimated contribution';
  const pct=(n/b)*100;
  return '+'+Math.round(n).toLocaleString()+' estimated contribution · '+pct.toFixed(2)+'% of base power';
}
function isStale(el){
  const text=clean(el.textContent).toLowerCase();
  return text.includes('observed median support uptime is unavailable')||text.includes('no direct party effects detected');
}
function effectLabel(raw){
  const key=clean(raw).replace(/\s+/g,'');
  const map={crit:'Critical Rate',criticalRate:'Critical Rate',critDamage:'Critical Damage',criticalDamage:'Critical Damage',attackSpeed:'Attack Speed',attackPower:'Attack Power',supportAmplification:'Support Amplification',mana:'Mana',damage:'Damage',identity:'Identity'};
  return map[key]||clean(raw);
}
function normalizeEffectText(text){
  let s=clean(text);
  s=s.replace(/\bsupportAmplification\b/gi,'Support Amplification');
  s=s.replace(/\battackPower\b/gi,'Attack Power');
  s=s.replace(/\battackSpeed\b/gi,'Attack Speed');
  s=s.replace(/\bcritDamage\b/gi,'Critical Damage');
  s=s.replace(/\bcriticalRate\b/gi,'Critical Rate');
  s=s.replace(/\bcrit\b/gi,'Critical Rate');
  s=s.replace(/\bmana\b/gi,'Mana');
  s=s.replace(/\bidentity\b/gi,'Identity');
  return s;
}
function paint(member,summary){
  const card=member.querySelector('.character-hover-breakdown');if(!card)return;
  const base=Number((clean(member.querySelector('.party-stat-label')?.textContent).match(/CP\s*([\d,]+)/i)||[])[1]?.replace(/,/g,''));
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
  card.querySelectorAll('.chb-detail:not(.chb-support-observed)').forEach(detail=>{
    const raw=clean(detail.textContent);
    if(!raw)return;
    detail.innerHTML=detail.innerHTML.replace(/critDamage|supportAmplification|attackPower|attackSpeed|criticalRate|\bcrit\b|\bmana\b|\bidentity\b/gi,m=>effectLabel(m));
  });
}
function render(){
  const api=window.LostArkSupportStats;if(!api)return;
  document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
    const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();if(role!=='support')return;
    const cls=classFor(member);if(!cls)return;
    const summary=api.summary?.(cls);if(!summary)return;
    paint(member,summary);
  });
  document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
    const card=member.querySelector('.character-hover-breakdown');if(!card)return;
    const cpMatch=clean(member.querySelector('.party-stat-label')?.textContent).match(/CP\s*([\d,]+)/i);const base=Number(cpMatch?.[1]?.replace(/,/g,''));
    if(!Number.isFinite(base)||base<=0)return;
    card.querySelectorAll('.chb-detail').forEach(detail=>{
      if(detail.classList.contains('chb-support-observed'))return;
      const walker=document.createTreeWalker(detail,NodeFilter.SHOW_TEXT);
      const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(node=>{
        const text=node.nodeValue||'';
        const re=/(critDamage|supportAmplification|attackPower|attackSpeed|criticalRate|\bcrit\b|\bmana\b|\bidentity\b)(\s+from\s+[^:]+:\s*)([+-]?\d[\d,]*)(?=\s*(?:-|—)\s*observed median|\s*$)/gi;
        node.nodeValue=text.replace(re,(m,e,p,v)=>`${effectLabel(e)}${p}${formatContribution(v.replace(/,/g,''),base)}`);
      });
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