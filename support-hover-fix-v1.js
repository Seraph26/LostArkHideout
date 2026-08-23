/* Lost Ark Party — raid-specific support hover authority v28 */
(()=>{
'use strict';
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const num=s=>{const m=clean(s).replace(/,/g,'').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
function general(){return document.getElementById('generalOptimization')?.checked!==false&&window.LostArkOptimizerMode?.general!==false}
function supportMember(){return [...document.querySelectorAll('#suggestedParties .party-member')].find(m=>clean(m.querySelector('.party-role-label')?.textContent).toLowerCase()==='support')||null}
function partyMembers(member){if(!member)return[];let root=member.closest('#suggestedParties');if(!root)return[];const all=[...root.querySelectorAll('.party-member')];const idx=all.indexOf(member);if(idx<0)return[];const partyIndex=Math.floor(idx/4);return all.slice(partyIndex*4,partyIndex*4+4)}
function encounterLabel(){const e=window.LostArkOptimizerMode?.encounter||window.LostArkEncounterModel?.getProfile?.()||null;return clean(e?.label||e?.name||'').replace(/\s*[—–]\s*/g,' - ')}
function supportRows(member){
 const name=clean(member?.querySelector('.chb-head strong')?.textContent);if(!name)return[];
 const party=partyMembers(member),rx=new RegExp(`^(.+?)\\s+from\\s+${name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s*:`,'i'),out=[];
 for(const target of party){
  if(target===member)continue;
  if(clean(target.querySelector('.party-role-label')?.textContent).toLowerCase()!=='dps')continue;
  const targetName=clean(target.querySelector('.chb-head strong')?.textContent);if(!targetName)continue;
  const row=[...target.querySelectorAll('.chb-synergy')].find(r=>rx.test(clean(r.textContent))&&/observed median uptime/i.test(clean(r.textContent)));
  if(!row)continue;
  const raw=clean(row.textContent),m=raw.match(rx);if(!m)continue;
  const value=num(raw.match(/:\s*([+-]?[\d,]+(?:\.\d+)?)/)?.[1]);
  if(!Number.isFinite(value)||value===0)continue;
  let text=raw.replace(rx,`${m[1]} to ${targetName}:`);
  // Preserve the exact optimizer contribution/percentage/uptime wording, only reverse "from" -> "to".
  out.push({text,title:row.title||'Estimated contribution is the optimizer model value assigned to this effect. Observed median uptime is the typical percentage of the relevant encounter for which the support effect is active, based on Bible encounter data.',value,base:num(target.querySelector('.chb-head span')?.textContent)});
 }
 return out;
}
function render(member){
 if(general()||!member)return false;
 if(clean(member.querySelector('.party-role-label')?.textContent).toLowerCase()!=='support')return false;
 const card=member.querySelector('.character-hover-breakdown');if(!card)return false;
 const rows=supportRows(member);if(!rows.length)return false;
 const head=card.querySelector('.chb-head'),name=clean(head?.querySelector('strong')?.textContent)||clean(member.querySelector('.party-character-link')?.textContent);if(!head||!name)return false;
 const cp=num(head.querySelector('span')?.textContent)||num(member.querySelector('.party-stat-label')?.textContent);if(!cp)return false;
 const totalOutgoing=rows.reduce((n,r)=>n+r.value,0),impact=cp?totalOutgoing/cp*100:0;
 const label=encounterLabel();
 card.classList.add('chb-raid-support-detailed');
 card.dataset.raidSupportDetailed='1';
 card.dataset.chbGeneralDetailed='1';
 card.dataset.raidSupportAuthority='1';
 card.dataset.raidSupportContributionView='1';
 card.dataset.raidSupportRenderedSignature=JSON.stringify({label,rows:rows.map(r=>r.text)});
 head.querySelector('span').textContent=`CP ${cp.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} - Contribution ${Math.round(cp+totalOutgoing).toLocaleString()}`;
 const stats=card.querySelector('.chb-stats');
 if(!stats)return false;
 stats.innerHTML=`<span class="chb-explained-metric">Party Synergy +0.00%</span><span class="chb-explained-metric">Support Impact +${impact.toFixed(2)}%</span><span>Support compatibility uses encounter data</span>`;
 card.querySelectorAll('.chb-detail').forEach(x=>x.remove());
 const detail=document.createElement('div');detail.className='chb-detail chb-raid-support-contributions';
 if(label){const encounter=document.createElement('div');encounter.className='chb-detail chb-raid-support-encounter';encounter.textContent=label;detail.appendChild(encounter)}
 for(const r of rows){const row=document.createElement('div');row.className='chb-synergy';row.textContent=r.text;row.title=r.title;row.style.display='block';row.style.margin='2px 0';detail.appendChild(row)}
 card.appendChild(detail);
 return true;
}
function renderAll(){if(general())return;const m=supportMember();if(m)render(m)}
function scheduleBurst(){
 renderAll();
 [0,16,50,100,200,400,800,1200,2000].forEach(ms=>setTimeout(renderAll,ms));
}
function css(){let s=document.getElementById('raid-support-hover-v28-style');if(!s){s=document.createElement('style');s.id='raid-support-hover-v28-style';document.head.appendChild(s)}s.textContent='.chb-raid-support-contributions .chb-synergy{display:block!important;margin:2px 0}.chb-raid-support-contributions .chb-synergy[title]{cursor:help}.chb-raid-support-detailed .chb-raid-support-summary{line-height:1.5;margin-bottom:4px}.chb-raid-support-encounter{margin:2px 0 4px;font-weight:600}'}
function start(){
 css();
 const root=document.getElementById('suggestedParties')||document.body;
 let timer=0;
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(scheduleBurst,0)};
 new MutationObserver(muts=>{
  let relevant=false;
  for(const m of muts){
   const t=m.target?.nodeType===1?m.target:null;
   if(t?.closest?.('.chb-raid-support-detailed'))continue;
   if(t?.closest?.('.party-member')||[...m.addedNodes||[]].some(n=>n.nodeType===1&&(n.matches?.('.party-member')||n.querySelector?.('.party-member')))){relevant=true;break}
  }
  if(relevant)schedule();
 }).observe(root,{childList:true,subtree:true,characterData:true});
 document.addEventListener('mouseover',e=>{if(e.target.closest?.('#suggestedParties .party-member'))render(e.target.closest('.party-member'))},true);
 document.addEventListener('pointerenter',e=>{if(e.target.closest?.('#suggestedParties .party-member'))render(e.target.closest('.party-member'))},true);
 document.getElementById('optimizeBtn')?.addEventListener('click',scheduleBurst,true);
 document.getElementById('raidSpecificSelect')?.addEventListener('change',scheduleBurst,true);
 scheduleBurst();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LostArkRaidSupportHoverV28={active:true};
})();
