/* Lost Ark Hideout — raid-specific support hover renderer
 * Raid support cards intentionally mirror the General Optimization support format.
 * The contribution values come from the already-rendered DPS cards; no Bible lookup
 * is required to construct this hover.
 */
(()=>{
'use strict';

const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const num=s=>{const m=String(s??'').replace(/,/g,'').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function role(member){
 const r=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();
 if(r==='support'||r==='dps')return r;
 const cls=clean(member.querySelector('.class-icon')?.alt||member.dataset.class||member.querySelector('[data-class]')?.dataset.class||'');
 return SUPPORTS.has(cls)?'support':'dps';
}

function partyFor(member){
 let node=member.parentElement,best=null;
 while(node&&node!==document.body){
  const ms=[...node.children].filter(x=>x.classList?.contains('party-member'));
  if(ms.includes(member)&&ms.length>=2&&ms.length<=4)best=ms;
  node=node.parentElement;
 }
 return best||[...document.querySelectorAll('#suggestedParties .party-member')].filter(x=>x.closest('[data-party]')===member.closest('[data-party]'));
}

function currentEncounter(){
 try{
  const p=window.LostArkEncounterModel?.getProfile?.();
  if(p?.name)return clean(p.name).replace(/\s+—\s+/g,' - ');
 }catch{}
 return '';
}

function supportName(card){return clean(card?.querySelector('.chb-head strong')?.textContent)}

function cpFromCard(card){
 const h=clean(card?.querySelector('.chb-head span')?.textContent);
 return num(h.match(/CP\s+([\d,]+(?:\.\d+)?)/i)?.[1]);
}

function supportRows(member){
 const card=member.querySelector('.character-hover-breakdown');
 const name=supportName(card);
 if(!name)return [];
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const re=new RegExp(`^(.+?)\\s+from\\s+${escaped}\\s*:\\s*([+-]?[\\d,]+(?:\\.\\d+)?)(?:\\s*[·-]\\s*([\\d.]+)%\\s+of\\s+base\\s+power)?(?:\\s*[·-]\\s*observed\\s+median\\s+uptime\\s+[\\d.]+%)?$`,'i');
 const out=[];
 for(const target of partyFor(member)){
  if(target===member||role(target)!=='dps')continue;
  const targetCard=target.querySelector('.character-hover-breakdown');
  if(!targetCard)continue;
  const targetName=clean(targetCard.querySelector('.chb-head strong')?.textContent);
  if(!targetName)continue;
  for(const row of targetCard.querySelectorAll('.chb-synergy')){
   const raw=clean(row.textContent),m=raw.match(re);
   if(!m)continue;
   const effect=clean(m[1]),value=num(m[2]);
   const targetCp=cpFromCard(targetCard);
   const pct=targetCp>0?value/targetCp*100:num(m[3]);
   out.push({target:targetName,effect,value,pct,title:row.title||'Estimated contribution is the optimizer model value assigned to this effect. The numeric value is a model contribution, not a percentage.'});
  }
 }
 return out;
}

function render(member){
 if(role(member)!=='support')return false;
 const card=member.querySelector('.character-hover-breakdown');
 if(!card)return false;
 const name=supportName(card);
 if(!name)return false;
 const rows=supportRows(member);
 if(!rows.length)return false;
 const cp=cpFromCard(card);
 const total=rows.reduce((a,r)=>a+r.value,0);
 const supportImpact=cp>0?total/cp*100:0;
 const encounter=currentEncounter();
 const signature=[encounter,cp,total,supportImpact,...rows.map(r=>`${r.target}|${r.effect}|${r.value}|${r.pct.toFixed(4)}`)].join('\n');
 if(card.dataset.raidSupportCanonicalSignature===signature)return true;
 const synergy=`+0.00%`;
 card.classList.add('chb-general-detailed','chb-raid-support-detailed');
 card.dataset.raidSupportAuthority='1';
 card.dataset.raidSupportCanonical='1';
 card.dataset.raidSupportCanonicalSignature=signature;
 const details=rows.map(r=>`<div class="chb-synergy raid-support-row" title="${esc(r.title)}"><span class="raid-support-line"><span>${esc(r.effect)} to ${esc(r.target)}: ${r.value>=0?'+':''}${r.value.toLocaleString(undefined,{maximumFractionDigits:2})} estimated contribution</span><br><span>${r.pct.toFixed(2)}% of ${esc(r.target)}'s base power</span></span></div>`).join('');
 card.innerHTML=`<div class="chb-head"><strong>${esc(name)}</strong><span title="Estimated overall contribution for this character in the current party. It is an optimizer model value, not an observed Bible DPS parse and not Combat Power." style="cursor:help">CP ${cp.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} - Contribution ${Math.round(total).toLocaleString()}</span></div><div class="chb-stats"><span class="chb-explained-metric" title="Estimated increase to this character's modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model contribution, not a direct in-game damage percentage.">Party Synergy ${synergy}</span><span class="chb-explained-metric" title="Estimated increase to this character's modeled potential from the party support. This is a model contribution, not a direct in-game damage percentage.">Support Impact +${supportImpact.toFixed(2)}%</span>${encounter?`<span class="raid-support-encounter">${esc(encounter)}</span>`:''}<span>Support compatibility uses encounter data</span></div><div class="chb-detail raid-support-contributions">${details}</div>`;
 return true;
}

function css(){
 let s=document.getElementById('raid-support-canonical-style');
 if(!s){s=document.createElement('style');s.id='raid-support-canonical-style';document.head.appendChild(s)}
 s.textContent='.raid-support-contributions{line-height:1.45}.raid-support-row{display:block!important;margin:6px 0!important}.raid-support-row[title]{cursor:help}.raid-support-line{display:inline-block;border-bottom:1px dotted rgba(255,255,255,.45)}.raid-support-encounter{display:block;margin:2px 0}.chb-raid-support-detailed .chb-explained-metric{cursor:help;border-bottom:1px dotted rgba(255,255,255,.45)}';
}

function wireMember(member){
 if(member.dataset.raidSupportCanonicalWired)return;
 member.dataset.raidSupportCanonicalWired='1';
 const run=()=>{render(member)};
 member.addEventListener('mouseenter',run,{passive:true});
 member.addEventListener('focusin',run,{passive:true});
 new MutationObserver(()=>{if(member.dataset.raidSupportCanonical==='1')return;run()}).observe(member,{childList:true,subtree:true,characterData:true});
}

function wire(){document.querySelectorAll('#suggestedParties .party-member').forEach(wireMember)}

function start(){css();wire();const root=document.getElementById('suggestedParties')||document.body;new MutationObserver(wire).observe(root,{childList:true,subtree:true});}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
