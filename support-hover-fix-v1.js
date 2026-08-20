/* Lost Ark Hideout — raid-specific support hover data bridge v26 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
let loadPromise=null;
const statsCache=new Map();
function isGeneralMode(){return document.getElementById('generalOptimization')?.checked!==false&&window.LostArkOptimizerMode?.general!==false}
function classFor(member){const c=[member.querySelector('.class-icon')?.alt,member.dataset.class,member.querySelector('[data-class]')?.dataset.class,member.querySelector('.party-class-label')?.dataset.class].map(clean).filter(Boolean);return c.find(x=>SUPPORTS.has(x))||''}
function encounter(){return window.LostArkOptimizerMode?.encounter||null}
function encounterKey(enc){return clean(enc?.id)||JSON.stringify({boss:enc?.boss,schema:enc?.schema,label:enc?.label})}
function resultId(result){try{const k=typeof result?.key==='string'?JSON.parse(result.key):result?.key||{};return clean(k.id)}catch{return''}}
function sameEncounter(result,enc){return !!result?.ok&&!!clean(enc?.id)&&resultId(result)===clean(enc.id)}
async function ensure(){const api=window.LostArkSupportStats;if(!api||isGeneralMode())return null;const enc=encounter();if(!enc)return null;const key=encounterKey(enc),current=window.__LOSTARK_SUPPORT_STATS__;if(sameEncounter(current,enc)){statsCache.set(key,current);return current}const cached=statsCache.get(key);if(cached?.ok){window.__LOSTARK_SUPPORT_STATS__=cached;return cached}if(loadPromise)return loadPromise;loadPromise=(async()=>{try{const result=await api.fetch(enc);if(result?.ok){statsCache.set(key,result);window.__LOSTARK_SUPPORT_STATS__=result;return result}return cached||null}catch{return cached||null}})();const out=await loadPromise;loadPromise=null;return out}
function partyMembersFor(member){let node=member.parentElement,best=null;while(node&&node!==document.body){const members=[...node.children].filter(x=>x.classList?.contains('party-member'));if(members.includes(member)&&members.length>=2&&members.length<=4)best=members;node=node.parentElement}return best||[]}
function escReg(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function supportContributionLines(member){
 const supportName=clean(member.querySelector('.chb-head strong')?.textContent);if(!supportName)return[];
 const party=partyMembersFor(member),rx=new RegExp(`^Support Amplification\\s+from\\s+${escReg(supportName)}\\s*:`,'i'),lines=[];
 for(const target of party){
  if(target===member)continue;
  if(clean(target.querySelector('.party-role-label')?.textContent).toLowerCase()!=='dps')continue;
  const targetName=clean(target.querySelector('.chb-head strong')?.textContent);if(!targetName)continue;
  const row=[...target.querySelectorAll('.chb-synergy')].find(x=>rx.test(clean(x.textContent)));if(!row)continue;
  const text=clean(row.textContent).replace(rx,`Support Amplification to ${targetName}:`);
  lines.push({text,title:row.title||'Estimated contribution from the party support. This is a model contribution, not a direct in-game damage percentage.'});
 }
 return lines;
}
function renderSupport(member){
 if(clean(member.querySelector('.party-role-label')?.textContent).toLowerCase()!=='support')return;
 const card=member.querySelector('.character-hover-breakdown');if(!card)return;
 const lines=supportContributionLines(member);if(!lines.length)return;
 const head=card.querySelector('.chb-head'),stats=card.querySelector('.chb-stats');if(!head||!stats)return;
 card.classList.add('chb-raid-support-detailed');card.dataset.raidSupportDetailed='1';card.dataset.chbGeneralDetailed='1';card.dataset.raidSupportAuthority='1';card.dataset.raidSupportContributionView='1';
 const oldSummary=stats.querySelector('.chb-raid-support-summary');
 let synergy=clean(card.dataset.partySynergy)||'+0.00%',impact=clean(card.dataset.supportImpact)||'+0.00%';
 if(oldSummary){const vals=clean(oldSummary.textContent).match(/Party Synergy\s+([+−-]?\d+(?:\.\d+)?%)\s+Support Impact\s+([+−-]?\d+(?:\.\d+)?%)/i);if(vals){synergy=vals[1];impact=vals[2]}}
 stats.innerHTML=`<div class="chb-raid-support-summary"><span class="chb-metric-label">Party Synergy</span> ${synergy} <span class="chb-metric-label">Support Impact</span> ${impact}</div>`;
 card.querySelectorAll('.chb-detail').forEach(x=>x.remove());
 const detail=document.createElement('div');detail.className='chb-detail chb-raid-support-contributions';
 for(const line of lines){const row=document.createElement('div');row.className='chb-synergy';row.textContent=line.text;row.title=line.title;row.style.display='block';row.style.margin='2px 0';detail.appendChild(row)}
 card.appendChild(detail);
}
function render(){if(isGeneralMode())return;document.querySelectorAll('#suggestedParties .party-member').forEach(renderSupport)}
async function refresh(){if(isGeneralMode())return;await ensure();render()}
function css(){let s=document.getElementById('raid-support-hover-v26-style');if(!s){s=document.createElement('style');s.id='raid-support-hover-v26-style';document.head.appendChild(s)}s.textContent='.chb-raid-support-contributions .chb-synergy{display:block!important;margin:2px 0}.chb-raid-support-contributions .chb-synergy[title]{cursor:help}.chb-raid-support-detailed .chb-raid-support-summary{line-height:1.5;margin-bottom:4px}'}
function start(){css();let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(refresh,40)};new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});document.addEventListener('mouseover',e=>{if(e.target.closest?.('#suggestedParties .party-member'))schedule()},true);document.getElementById('raidSpecificSelect')?.addEventListener('change',schedule);[0,100,250,500,1000,2000,4000,8000].forEach(ms=>setTimeout(refresh,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
