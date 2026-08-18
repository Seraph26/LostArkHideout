/* Lost Ark Hideout — Upgrade Potential v2
 * Informational only. Never contributes to party scoring or optimization.
 * Only reports upgrade states that can be detected from structured/cached Bible data.
 * No gain percentage is fabricated when the available data cannot support a defensible calculation.
 */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function load(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')||f}catch{return f}}
function roster(){return(load(STORE,{characters:[]}).characters||[]).filter(c=>c&&c.url)}
function build(c){try{return window.LostArkBuildProfilesAuthorityV1?.get(c.url)||window.LostArkBuildProfilesV3?.get(c.url)||window.LostArkBuildProfilesV2?.get(c.url)||{}}catch{return{}}}
function profile(c){return c.profile||c.data||{}}
function name(c){return clean(profile(c).name||profile(c).characterName||c.name)||'Unknown'}
function gridOpportunities(c){
 const b=build(c),out=[];
 if(!Array.isArray(b.grid)||!b.grid.length)return out;
 const order=b.grid.filter(x=>String(x.type||'').toLowerCase()==='order');
 const chaos=b.grid.filter(x=>String(x.type||'').toLowerCase()==='chaos');
 const orderMax=order.length?Math.max(...order.map(x=>Number(x.points)||0)):0;
 const chaosMax=chaos.length?Math.max(...chaos.map(x=>Number(x.points)||0)):0;
 if(order.length&&orderMax<20)out.push({category:'Ark Grid',label:`Order core: ${orderMax}/20 points toward the next threshold`,gain:null,confidence:'High',reason:'The cached Bible build exposes the current Order-core point total.'});
 if(chaos.length&&chaosMax<17)out.push({category:'Ark Grid',label:`Chaos core: ${chaosMax}/17 points toward the next threshold`,gain:null,confidence:'High',reason:'The cached Bible build exposes the current Chaos-core point total.'});
 return out;
}
function arkPassiveOpportunities(c){
 const b=build(c);if(!Array.isArray(b.arkPassive)||!b.arkPassive.length)return [];
 // A higher Ark Passive level can be identified, but its damage value depends on the exact node,
 // class/build interaction, and game version. Do not assign a percentage from level alone.
 return b.arkPassive.filter(x=>Number(x.level)>0).map(x=>({category:'Ark Passive',label:`${clean(x.name)} Lv. ${x.level}: higher level may be available`,gain:null,confidence:'Low',reason:'Current node level is known, but the available profile data does not establish the next attainable level or its isolated damage contribution.'}));
}
function tripodOpportunities(c){
 const b=build(c);if(!Array.isArray(b.tripods)||!b.tripods.length)return [];
 // Presence of tripods alone does not establish which tripod levels are missing or their isolated DPS gain.
 return [];
}
function gemOpportunities(c){
 // The current Bible cache does not expose a structured gem inventory/level mapping. Do not infer gems
 // from arbitrary page text and do not estimate a gain without the actual gem, skill, and current level.
 return [];
}
function accessoryOpportunities(){return []}
function braceletOpportunities(){return []}
function stoneOpportunities(){return []}
function opportunities(c){return [...gridOpportunities(c),...arkPassiveOpportunities(c),...tripodOpportunities(c),...gemOpportunities(c),...accessoryOpportunities(c),...braceletOpportunities(c),...stoneOpportunities(c)]}
function combinedGain(items){const quantified=items.filter(x=>Number.isFinite(x.gain));if(!quantified.length)return null;return (quantified.reduce((p,x)=>p*(1+x.gain),1)-1)*100}
function character(c){const items=opportunities(c),quantified=items.filter(x=>Number.isFinite(x.gain));return{character:name(c),items,quantifiedGain:combinedGain(items)}}
function summary(){const chars=roster().map(character).filter(x=>x.items.length);return{chars,items:chars.flatMap(x=>x.items.map(i=>({...i,character:x.character}))),total:combinedGain(chars.flatMap(x=>x.items))}}
function row(x){return `<div class="upgrade-potential-row"><span><strong>${x.category}</strong> — ${clean(x.label)}<small>${clean(x.reason)}</small></span><strong>${Number.isFinite(x.gain)?'+'+(x.gain*100).toFixed(2)+'%':'Gain not quantified'}</strong></div>`}
function htmlFor(c){const items=opportunities(c);if(!items.length)return '<strong>Upgrade Potential</strong><div class="upgrade-potential-note">No specific upgrade opportunity is currently detectable from the available Bible data.</div>';
 const quantified=items.filter(x=>Number.isFinite(x.gain));
 return `<strong>Upgrade Potential</strong><div class="upgrade-potential-note">Informational only. These opportunities are not included in party optimization. A percentage is shown only when the current data supports a defensible calculation.</div>${items.map(row).join('')}<div class="upgrade-potential-total"><span>Character quantified gain</span><strong>${quantified.length? '+'+((combinedGain(items)||0).toFixed(2))+'%':'Not quantified'}</strong></div>`;
}
function tooltipHtml(){const s=summary();if(!s.items.length)return '<strong>Upgrade Potential</strong><div class="upgrade-potential-note">No specific upgrade opportunities are currently detectable from the available Bible data.</div>';return `<strong>Upgrade Potential</strong><div class="upgrade-potential-note">Informational only. Party optimization uses current character power and party compatibility, not future upgrades.</div>${s.items.map(row).join('')}<div class="upgrade-potential-total"><span>Combined quantified gain</span><strong>${s.total==null?'Not quantified':'+'+s.total.toFixed(2)+'%'}</strong></div>`}
function forCharacter(c){return{items:opportunities(c),html:htmlFor(c)}}
function styles(){if(document.getElementById('upgrade-potential-v2-style'))return;const s=document.createElement('style');s.id='upgrade-potential-v2-style';s.textContent=`.upgrade-potential-row{display:flex;justify-content:space-between;gap:14px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07)}.upgrade-potential-row>span{min-width:0}.upgrade-potential-row strong{white-space:nowrap}.upgrade-potential-row small{display:block;margin-top:2px;color:#999;font-size:10px;line-height:1.35}.upgrade-potential-note{margin:5px 0 8px;color:#aaa;font-size:11px;line-height:1.4}.upgrade-potential-total{display:flex;justify-content:space-between;gap:12px;margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.18)}`;document.head.appendChild(s)}
function apply(){styles();for(const n of document.querySelectorAll('.upgrade-potential-trigger')){const label=n.querySelector('.optimizer-definition-label');const tip=n.querySelector('.optimizer-definition');if(label&&clean(label.textContent)==='Upgrade Potential'&&tip)tip.innerHTML=tooltipHtml()}}
function start(){apply();const root=document.getElementById('suggestedParties')||document.body;let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;apply()},50)}).observe(root,{childList:true,subtree:true});window.addEventListener('lostark-build-profiles-v3-ready',()=>setTimeout(apply,100))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LostArkUpgradePotentialV1={summary,opportunities,forCharacter,tooltipHtml};
})();
