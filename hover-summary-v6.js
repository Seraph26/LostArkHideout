/* Lost Ark Hideout — compact hover summary authority v12 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const num=s=>{const m=String(s??'').replace(/,/g,'').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const members=()=>[...document.querySelectorAll('#suggestedParties .party-member')];
const card=m=>m?.querySelector('.character-hover-breakdown');
function role(m){const r=clean(m?.querySelector('.party-role-label')?.textContent).toLowerCase();if(r==='support'||r==='dps')return r;const c=clean(m?.querySelector('.class-icon')?.alt||m?.dataset.class||'');return SUPPORTS.has(c)?'support':'dps'}
const name=m=>clean(card(m)?.querySelector('.chb-head strong')?.textContent||m?.querySelector('.party-character-link')?.textContent);
function cp(m){return num(card(m)?.querySelector('.chb-head span')?.textContent.match(/CP\s+([\d,.]+)/i)?.[1])}
function raidMode(){const o=window.LostArkOptimizerMode;return !!(o&&o.general===false&&o.raid)}
function encounterLabel(){const o=window.LostArkOptimizerMode||{};const e=o.encounter||window.LostArkEncounterModel?.getProfile?.()||null;return clean(e?.label||e?.name||'').replace(/\s*[—–]\s*/g,' - ')}
function parseRows(m){
 const c=card(m);if(!c)return[];
 const key='compactSourceRowsV7';
 try{const s=c.dataset[key];if(s){const p=JSON.parse(s);if(Array.isArray(p)&&p.length)return p}}catch{}
 const out=[];const base=cp(m);
 for(const row of c.querySelectorAll('.chb-synergy')){
  const t=clean(row.textContent);
  let x=t.match(/^(.+?)\s+from\s+(.+?):\s*([+-]?[\d,]+(?:\.\d+)?)\s+estimated contribution\s*(?:·|-)?\s*([\d.]+)%\s+of\s+base\s+power(?:\s*(?:·|-)?\s*observed median uptime\s*([\d.]+)%?)?/i);
  if(x){out.push({effect:clean(x[1]),source:clean(x[2]),value:num(x[3]),pct:Number(x[4])||0,uptime:Number.isFinite(Number(x[5]))?Number(x[5]):null});continue}
  if(raidMode()){
   x=t.match(/^(.+?)\s+from\s+(.+?):\s*([+-]?[\d,]+(?:\.\d+)?)(?:\s*[·-]\s*observed\s+median\s+([\d.]+)%?)?/i);
   if(x){const value=num(x[3]);if(value>0)out.push({effect:clean(x[1]),source:clean(x[2]),value,pct:base?value/base*100:0,uptime:Number.isFinite(Number(x[4]))?Number(x[4]):null})}
  }
 }
 if(out.length)c.dataset[key]=JSON.stringify(out);return out
}
function group(rows,key){const map=new Map();for(const r of rows){const k=r[key];if(!map.has(k))map.set(k,{name:k,value:0,pct:0,uptime:null});const g=map.get(k);g.value+=r.value;g.pct+=r.pct;if(r.uptime!=null)g.uptime=r.uptime}return[...map.values()].sort((a,b)=>b.value-a.value)}
function removeLegacyCompatibility(c){
 c.querySelectorAll('.chb-raid-support-encounter').forEach(e=>e.remove());
 c.querySelectorAll('*').forEach(e=>{
  if(e.classList.contains('chb-compact-encounter'))return;
  const t=clean(e.textContent).replace(/[.:]+$/,'');
  if(t==='Support compatibility uses encounter data')e.remove();
 });
}
function replaceDetails(c,html){c.querySelectorAll('.chb-detail,.chb-upgrade,.chb-synergy').forEach(d=>d.remove());const d=document.createElement('div');d.className='chb-detail chb-compact-detail';d.innerHTML=html;c.appendChild(d)}
function encounterHtml(){if(!raidMode())return '';const label=encounterLabel();return label?`<div class="chb-compact-encounter">${esc(label)}<br>Support compatibility uses encounter data.</div>`:''}
function renderDps(m){
 const c=card(m);if(!c||role(m)!=='dps')return;
 removeLegacyCompatibility(c);const rows=parseRows(m);if(!rows.length)return;
 const supportNames=new Set(members().filter(x=>role(x)==='support').map(name));const groups=group(rows,'source');
 const synergyPct=rows.filter(r=>!supportNames.has(r.source)).reduce((a,r)=>a+r.pct,0);const supportPct=rows.filter(r=>supportNames.has(r.source)).reduce((a,r)=>a+r.pct,0);
 const signature=JSON.stringify({mode:raidMode()?'raid':'general',encounter:encounterLabel(),rows});
 if(c.dataset.compactRenderedSignature===signature)return;
 const stats=c.querySelector('.chb-stats');if(stats)stats.innerHTML=`<span>Party Synergy +${synergyPct.toFixed(2)}%</span><span>Support Impact +${supportPct.toFixed(2)}%</span>`;
 let html=encounterHtml();html+=groups.map(g=>`<div class="chb-summary-row">+${g.value.toLocaleString(undefined,{maximumFractionDigits:2})} estimated ${supportNames.has(g.name)?'support':'synergy'} contribution from ${esc(g.name)} - ${g.pct.toFixed(2)}% of base power</div>`).join('');
 replaceDetails(c,html);c.dataset.compactRenderedSignature=signature;c.dataset.compactCanonical='1'
}
function renderSupport(m){
 const c=card(m);if(!c||role(m)!=='support')return;
 removeLegacyCompatibility(c);const party=m.closest('.party');const ps=party?[...party.querySelectorAll('.party-member')]:members();const rows=[];
 for(const dps of ps){if(dps===m||role(dps)!=='dps')continue;for(const r of parseRows(dps))if(r.source===name(m))rows.push({target:name(dps),value:r.value,pct:r.pct,uptime:r.uptime})}
 if(!rows.length)return;
 const groups=group(rows,'target'),total=groups.reduce((a,g)=>a+g.value,0),base=cp(m);const signature=JSON.stringify({mode:raidMode()?'raid':'general',encounter:encounterLabel(),rows});
 if(c.dataset.compactRenderedSignature===signature)return;
 const stats=c.querySelector('.chb-stats');if(stats)stats.innerHTML=`<span>Party Synergy +0.00%</span><span>Support Impact +${(base?total/base*100:0).toFixed(2)}%</span>`;
 let html=encounterHtml();html+=groups.map(g=>`<div class="chb-summary-row">+${g.value.toLocaleString(undefined,{maximumFractionDigits:2})} estimated support contribution to ${esc(g.name)} - ${g.pct.toFixed(2)}% of ${esc(g.name)}'s base power</div>`).join('');
 replaceDetails(c,html);c.dataset.compactRenderedSignature=signature;c.dataset.compactCanonical='1'
}
function apply(){const ms=members();ms.filter(m=>role(m)==='dps').forEach(renderDps);ms.filter(m=>role(m)==='support').forEach(renderSupport)}
function renderPartySynergyUptime(){
 const explanation='Estimated contribution is the optimizer model value assigned to this effect. Observed median uptime is the typical percentage of the relevant encounter for which the support effect is active, based on Bible encounter data.';
 document.querySelectorAll('#suggestedParties .party-synergies').forEach(el=>{
  const party=el.closest('.party');const partyMembers=party?[...party.querySelectorAll('.party-member')]:[];const support=partyMembers.find(m=>role(m)==='support');if(!support)return;
  const values=[];for(const dps of partyMembers.filter(m=>role(m)==='dps'))for(const r of parseRows(dps))if(r.source===name(support)&&r.uptime!=null){values.push(r.uptime);break}
  let uptime=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  if(uptime==null){const existing=clean(el.textContent).match(/(?:support\s+uptime|identity\s+median)\s+(\d+(?:\.\d+)?)%/i);if(existing)uptime=Number(existing[1])}
  const effectText=clean(el.textContent).replace(/^Synergies:\s*/i,'').split(/\s*[·•]\s*(?:Observed median support uptime data|identity median[^·]*)/i)[0].replace(/\s*[·•]\s*Support uptime.*$/i,'').trim();
  const effects=effectText.replace(/\s*[·•]\s*$/,'').trim();if(!effects&&uptime==null)return;
  el.removeAttribute('title');el.querySelectorAll('*').forEach(x=>{x.removeAttribute('title');x.classList.remove('optimizer-definition-trigger','optimizer-definition-label');x.style.removeProperty('text-decoration')});
  const pct=uptime==null?'Unavailable':`${Math.round(uptime)}%`;
  el.innerHTML=`<strong>Synergies:</strong> ${esc(effects)} · <span class="support-uptime-trigger" data-support-uptime-explanation="${esc(explanation)}">Support uptime ${pct}</span>`;
 });
}
function ensureTooltip(){let p=document.getElementById('support-uptime-tooltip');if(!p){p=document.createElement('div');p.id='support-uptime-tooltip';p.className='support-uptime-tooltip';document.body.appendChild(p)}return p}
function wireTooltip(){
 const root=document.getElementById('suggestedParties')||document.body;if(root.dataset.supportUptimeTooltipWired==='1')return;root.dataset.supportUptimeTooltipWired='1';const hide=()=>document.getElementById('support-uptime-tooltip')?.classList.remove('visible');
 root.addEventListener('pointerover',e=>{const t=e.target.closest?.('.support-uptime-trigger');if(!t||!root.contains(t))return;const p=ensureTooltip();p.innerHTML=`<strong>Support uptime</strong><div>${esc(t.dataset.supportUptimeExplanation||'Observed median uptime is the typical percentage of the relevant encounter for which the support effect is active, based on Bible encounter data.')}</div>`;const r=t.getBoundingClientRect();let left=r.left,top=r.bottom+8;if(left+360>innerWidth-8)left=Math.max(8,innerWidth-368);if(top+110>innerHeight)top=Math.max(8,r.top-118);p.style.left=left+'px';p.style.top=top+'px';p.classList.add('visible')});
 root.addEventListener('pointerout',e=>{const t=e.target.closest?.('.support-uptime-trigger');if(t&&!t.contains(e.relatedTarget))hide()});
}
function css(){let s=document.getElementById('compact-hover-style');if(!s){s=document.createElement('style');s.id='compact-hover-style';document.head.appendChild(s)}s.textContent='.chb-compact-detail{display:block!important;line-height:1.45;margin-top:6px}.chb-summary-row{display:block!important;margin:6px 0!important}.chb-compact-encounter{font-weight:600;margin:0 0 6px}.chb-compact-detail .chb-summary-row{opacity:1!important}.party-synergies .support-uptime-trigger{cursor:help;text-decoration:underline dotted!important;text-underline-offset:3px!important}.party-synergies>*:not(.support-uptime-trigger){text-decoration:none!important}.support-uptime-tooltip{position:fixed;z-index:2147483647;display:none;width:360px;box-sizing:border-box;padding:11px 13px;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:#17191d;color:#eee;box-shadow:0 10px 30px rgba(0,0,0,.55);font:400 11px/1.5 Arial,sans-serif;pointer-events:none}.support-uptime-tooltip.visible{display:block}.support-uptime-tooltip strong{display:block;margin-bottom:4px;color:#fff;font-size:12px}'}
function start(){window.LostArkHoverSummaryV1={active:true,version:12};css();wireTooltip();apply();renderPartySynergyUptime();const root=document.getElementById('suggestedParties')||document.body;let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{apply();renderPartySynergyUptime()},0)};new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});document.getElementById('optimizeBtn')?.addEventListener('click',()=>[0,20,50,100,200,400,800,1500,3000].forEach(ms=>setTimeout(()=>{apply();renderPartySynergyUptime()},ms)),true);document.getElementById('raidSpecificSelect')?.addEventListener('change',()=>setTimeout(()=>{apply();renderPartySynergyUptime()},0),true);[50,150,300,600,1000,2000,4000].forEach(ms=>setTimeout(()=>{apply();renderPartySynergyUptime()},ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
