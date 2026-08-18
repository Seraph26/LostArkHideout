/* Lost Ark Hideout — metric change explanations v1
 * Adds hover explanations to ▲/▼ metric changes.
 * Upgrade Potential is informational and never receives a change marker.
 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const STORE='lostark-hideout-metric-snapshot-v1';
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
function metricRoot(el){
 let n=el;
 for(let i=0;i<8&&n;i++,n=n.parentElement){
  if(n.querySelectorAll?.('.party-member').length===4)return n;
 }
 return el.closest?.('.party')||el.parentElement;
}
function members(root){return [...(root?.querySelectorAll?.('.party-member')||[])].map(m=>{
 const name=clean(m.querySelector('.party-character-link')?.textContent);
 const cls=clean(m.querySelector('.party-class-label')?.textContent);
 const role=clean(m.querySelector('.party-role-label')?.textContent);
 const pos=clean(m.querySelector('.party-stat-label')?.textContent).replace(/\s*·\s*CP.*$/i,'');
 const cp=(clean(m.querySelector('.party-stat-label')?.textContent).match(/CP\s+([\d,]+)/i)||[])[1]||'';
 return{name,cls,role,pos,cp};
 }).filter(x=>x.name);
}
function readMetrics(root){
 const out={};
 root?.querySelectorAll?.('.party-metric').forEach(m=>{
  const label=clean(m.querySelector('.optimizer-definition-label')?.textContent||m.textContent).replace(/▲.*|▼.*/,'').trim();
  if(!label)return;
  out[label]=clean(m.textContent);
 });
 return out;
}
function snapshot(root){return{members:members(root),metrics:readMetrics(root)}}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
function save(s){try{localStorage.setItem(STORE,JSON.stringify(s))}catch{}}
function changedNames(before,after){const b=new Set((before?.members||[]).map(x=>x.name)),a=new Set((after?.members||[]).map(x=>x.name));return{added:[...a].filter(x=>!b.has(x)),removed:[...b].filter(x=>!a.has(x))}}
function currentSynergies(ms){return [...new Set(ms.filter(x=>x.role!=='Support').map(x=>x.cls).filter(Boolean))]}
function supportName(ms){return ms.find(x=>x.role==='Support')?.name||''}
function supportUptime(text){const m=String(text||'').match(/Support uptime\s+(\d+)%/i);return m?Number(m[1]):null}
function explain(label,before,after,delta){
 const {added,removed}=changedNames(before,after), names=[];
 if(added.length||removed.length){if(removed.length)names.push(`moved out: ${removed.join(', ')}`);if(added.length)names.push(`moved in: ${added.join(', ')}`)}
 const composition=names.length?`The party composition changed (${names.join('; ')}). `:'';
 if(label==='Base DPS Power'){
  const adds=(after.members||[]).filter(x=>added.includes(x.name));
  const rems=(before?.members||[]).filter(x=>removed.includes(x.name));
  const ac=adds.reduce((n,x)=>n+Number(String(x.cp).replace(/,/g,'')||0),0),rc=rems.reduce((n,x)=>n+Number(String(x.cp).replace(/,/g,'')||0),0);
  if(ac||rc)return composition+`Base DPS Power changed because the swapped characters have different current CP. Incoming CP: ${ac.toLocaleString()}; outgoing CP: ${rc.toLocaleString()}.`;
  return composition+'Base DPS Power is the sum of the current DPS characters’ CP, so changing which DPS characters are in the party changes this value.';
 }
 if(label==='Party Synergy'){
  const bs=currentSynergies(before?.members||[]),as=currentSynergies(after.members||[]);
  const gained=as.filter(x=>!bs.includes(x)),lost=bs.filter(x=>!as.includes(x));
  let detail='Party Synergy is recalculated from the current DPS characters’ supplied effects and how well the remaining DPS can use them.';
  if(gained.length)detail+=` New/added synergy sources: ${gained.join(', ')}.`;
  if(lost.length)detail+=` Removed synergy sources: ${lost.join(', ')}.`;
  if(composition)detail=composition+detail;
  return detail;
 }
 if(label==='Support Impact'){
  const bs=supportName(before?.members||[]),as=supportName(after.members||[]);
  const bu=supportUptime(before?.metrics?.['Support Impact']),au=supportUptime(after.metrics?.['Support Impact']);
  let detail=composition+`Support Impact is recalculated from the support’s current amplification, expected uptime, and compatibility with the party’s DPS/positioning.`;
  if(bs!==as)detail+=` Support changed from ${bs||'none'} to ${as||'none'}, so the support effect model changed.`;
  if(bu!==null&&au!==null&&bu!==au)detail+=` Expected support uptime changed from ${bu}% to ${au}%.`;
  return detail;
 }
 return composition+`This metric is recalculated from the current party composition and the optimizer’s current interaction model. The arrow shows the net change from the previous party arrangement.`;
}
function addTips(root,before,after){
 root?.querySelectorAll?.('.party-metric').forEach(m=>{
  const label=clean(m.querySelector('.optimizer-definition-label')?.textContent||'');
  const mark=m.querySelector('.metric-change');
  if(label==='Upgrade Potential'){mark?.remove();return;}
  if(!mark)return;
  const text=explain(label,before,after,mark.textContent);
  mark.classList.add('metric-change-explain');
  mark.setAttribute('tabindex','0');
  mark.setAttribute('title',text);
  mark.dataset.explanation=text;
  let tip=m.querySelector(':scope > .metric-change-tooltip');
  if(!tip){tip=document.createElement('span');tip.className='metric-change-tooltip';m.appendChild(tip)}
  tip.textContent=text;
 });
}
function styles(){if(document.getElementById('metric-change-explanations-style'))return;const s=document.createElement('style');s.id='metric-change-explanations-style';s.textContent=`.metric-change-explain{cursor:help;text-decoration:underline dotted;text-underline-offset:3px}.metric-change-tooltip{display:none;position:absolute;z-index:3100;left:0;bottom:calc(100% + 9px);width:340px;padding:10px 12px;border-radius:7px;background:#17191d;color:#eee;border:1px solid rgba(255,255,255,.18);box-shadow:0 8px 24px rgba(0,0,0,.4);font-size:11px;font-weight:400;line-height:1.5;white-space:normal;text-align:left;pointer-events:none}.party-metric:hover>.metric-change-tooltip,.metric-change-explain:focus+.metric-change-tooltip{display:block}`;document.head.appendChild(s)}
function process(){
 styles();
 const container=document.getElementById('suggestedParties');if(!container)return;
 const roots=[...container.querySelectorAll('.party-member')].map(metricRoot).filter(Boolean);
 const unique=[...new Set(roots)];
 const prev=load()||{};
 const next={parties:{}};
 unique.forEach((root,i)=>{
  const now=snapshot(root),key=String(i);
  if(prev.parties?.[key])addTips(root,prev.parties[key],now);
  next.parties[key]=now;
 });
 save(next);
}
function start(){let timer=0;const run=()=>{clearTimeout(timer);timer=setTimeout(process,120)};process();const root=document.getElementById('suggestedParties')||document.body;new MutationObserver(run).observe(root,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
