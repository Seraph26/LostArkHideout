/* Lost Ark Hideout — Upgrade Potential v1
 * Exposes only upgrade opportunities that can be inferred from the current cached Bible build data.
 * It does not change party scoring or current-power calculations.
 */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3';
const V3='lostark-hideout-build-profiles-v3';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function load(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')||f}catch{return f}}
function roster(){return (load(STORE,{characters:[]}).characters||[]).filter(c=>c&&c.url)}
function build(c){try{return window.LostArkBuildProfilesV3?.get(c.url)||window.LostArkBuildProfilesV2?.get(c.url)||{}}catch{return{}}}
function profile(c){return c.profile||c.data||{}}
function name(c){return clean(profile(c).name||profile(c).characterName||c.name)||'Unknown'}
function cp(c){return num(profile(c).cp||profile(c).combatPower)}
function text(c){const b=build(c);return clean([b.text,b.arkGridText,b.arkPassiveText,b.engravingsText,b.gemsText].filter(Boolean).join(' '))}

// Bible's raid-loadout text is intentionally parsed conservatively. We only report a gem
// opportunity when an explicit level is visible; we never invent the skill/gem name.
function gemUpgrades(c){
 const t=text(c); if(!t)return [];
 const out=[]; const seen=new Set();
 const patterns=[
  /([A-Za-z][A-Za-z'’ -]{2,48})\s+(?:Damage|Cooldown|DMG|CD)\s*Gem[^\d]{0,12}(?:Lv\.?\s*)?(\d{1,2})/gi,
  /(?:Lv\.?\s*)?(\d{1,2})\s+(?:[A-Za-z][A-Za-z'’ -]{2,48})\s+(?:Damage|Cooldown|DMG|CD)\s*Gem/gi,
  /([A-Za-z][A-Za-z'’ -]{2,48})\s+(?:Damage|Cooldown|DMG|CD)\s*(\d{1,2})/gi
 ];
 for(const re of patterns){let m;while((m=re.exec(t))){let skill,level;if(/^\d/.test(m[1])){level=+m[1];skill=clean(m[2])}else{skill=clean(m[1]);level=+m[2]};if(level<1||level>=10||!skill)continue;const key=skill.toLowerCase()+'|'+level;if(seen.has(key))continue;seen.add(key);out.push({label:`Level ${level} ${skill} gem → Level 10 ${skill} gem`,gain:0.01*(10-level)/Math.max(level,1),confidence:'High'});}}
 }
 return out;
}
function arkGridOpportunities(c){
 const b=build(c),out=[];
 if(Array.isArray(b.grid)&&b.grid.length){
  const byType={};for(const x of b.grid){const k=String(x.type||'').toLowerCase();if(k)byType[k]=(byType[k]||[]).concat([num(x.points)])}
  for(const [type,pts] of Object.entries(byType)){const max=Math.max(...pts);if(max<20)out.push({label:`${type[0].toUpperCase()+type.slice(1)} core threshold improvement`,gain:Math.min(.005,(20-max)*.0005),confidence:'Medium'})}
 }
 return out;
}
function opportunities(c){return [...gemUpgrades(c),...arkGridOpportunities(c)].filter(x=>x.gain>0)}
function combinedGain(items){if(!items.length)return 0;return (items.reduce((p,x)=>p*(1+x.gain),1)-1)*100}
function characterData(){return roster().map(c=>({c,items:opportunities(c)})).filter(x=>x.items.length)}
function summary(){
 const chars=characterData();
 const items=chars.flatMap(x=>x.items.map(i=>({...i,character:name(x.c)})));
 const total=chars.reduce((sum,x)=>sum+combinedGain(x.items),0);
 return {chars,items,total};
}
function tooltipHtml(){
 const s=summary();
 if(!s.items.length)return '<strong>Upgrade Potential</strong><br>No high-confidence upgrade opportunities are currently detectable from the cached Bible build data.';
 const rows=s.items.map(x=>`<div class="upgrade-potential-row"><span>${esc(x.character)} — ${esc(x.label)}</span><strong>+${(x.gain*100).toFixed(2)}%</strong></div>`).join('');
 return `<strong>Upgrade Potential</strong><div class="upgrade-potential-note">Only upgrades supported by currently available profile data are included. Current power is not changed by these estimates.</div>${rows}<div class="upgrade-potential-total"><span>Combined estimated upgrade potential</span><strong>+${s.total.toFixed(2)}%</strong></div>`;
}
function styles(){if(document.getElementById('upgrade-potential-v1-style'))return;const s=document.createElement('style');s.id='upgrade-potential-v1-style';s.textContent=`.upgrade-potential-trigger{position:relative;display:inline-block}.upgrade-potential-trigger .optimizer-definition{width:420px}.upgrade-potential-row{display:flex;justify-content:space-between;gap:14px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.07)}.upgrade-potential-row strong{white-space:nowrap}.upgrade-potential-note{margin:5px 0 8px;color:#aaa;font-size:11px}.upgrade-potential-total{display:flex;justify-content:space-between;gap:12px;margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.18)}`;document.head.appendChild(s)}
function apply(){
 const nodes=[...document.querySelectorAll('.party-metric')];
 for(const n of nodes){
  const label=[...n.querySelectorAll('.optimizer-definition-label')].find(x=>clean(x.textContent)==='Build Effect');
  if(!label||n.dataset.upgradePotentialApplied==='1')continue;
  label.textContent='Upgrade Potential';
  const tip=n.querySelector('.optimizer-definition');
  if(tip)tip.innerHTML=tooltipHtml();
  n.dataset.upgradePotentialApplied='1';
 }
 // Character hover cards: rename their Build percentage to Upgrade Potential only when there is
 // a detectable upgrade for that character. The actual party score remains untouched.
 for(const n of document.querySelectorAll('.party-member')){
  if(n.dataset.upgradeCharacterApplied==='1')continue;
  const a=n.querySelector('.party-character-link');if(!a)continue;
  const c=roster().find(x=>String(x.url)===String(a.href)||String(x.url).replace(/\/$/,'')===String(a.href).replace(/\/$/,''));
  if(!c)continue;
  const items=opportunities(c);if(!items.length)continue;
  const stats=n.querySelector('.chb-stats');if(!stats)continue;
  const old=[...stats.children].find(x=>/^Build \+/.test(clean(x.textContent)));
  if(old)old.textContent=`Upgrade Potential +${combinedGain(items).toFixed(2)}%`;
  n.dataset.upgradeCharacterApplied='1';
 }
}
function start(){styles();apply();let queued=false;const root=document.getElementById('suggestedParties')||document.body;const obs=new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;apply()},50)});obs.observe(root,{childList:true,subtree:true});window.addEventListener('lostark-build-profiles-v3-ready',()=>setTimeout(apply,100));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LostArkUpgradePotentialV1={summary,opportunities};
})();
