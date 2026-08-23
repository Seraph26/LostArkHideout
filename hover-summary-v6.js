/* Lost Ark Hideout — compact hover summary authority v10 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const num=s=>{const m=String(s??'').replace(/,/g,'').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const members=()=>[...document.querySelectorAll('#suggestedParties .party-member, #suggestedParties .authoritative-member')];
const card=m=>m?.querySelector('.character-hover-breakdown');
function role(m){const r=clean(m?.querySelector('.party-role-label')?.textContent).toLowerCase();if(r==='support'||r==='dps')return r;const c=clean(m?.querySelector('.class-icon')?.alt||m?.dataset.class||m?.querySelector('.party-member-main span')?.textContent?.split('·')[0]);return SUPPORTS.has(c)?'support':'dps'}
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
   x=t.match(/^(.+?)\s+from\s+(.+?):\s*([+-]?[\d,]+(?:\.\d+)?)(?:\s*[·-]\s*observed\s+([\d.]+)%?)?/i);
   if(x){const value=num(x[3]);if(value>0)out.push({effect:clean(x[1]),source:clean(x[2]),value,pct:base?value/base*100:0,uptime:Number.isFinite(Number(x[4]))?Number(x[4]):null})}
  }
 }
 if(out.length)c.dataset[key]=JSON.stringify(out);return out;
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
function encounterHtml(m){if(!raidMode())return '';const label=encounterLabel();return label?`<div class="chb-compact-encounter">${esc(label)}<br>Support compatibility uses encounter data.</div>`:''}
function renderDps(m){const c=card(m);if(!c||role(m)!=='dps')return;removeLegacyCompatibility(c);const rows=parseRows(m);if(!rows.length)return;const supportNames=new Set(members().filter(x=>role(x)==='support').map(name));const groups=group(rows,'source');const synergyPct=rows.filter(r=>!supportNames.has(r.source)).reduce((a,r)=>a+r.pct,0);const supportPct=rows.filter(r=>supportNames.has(r.source)).reduce((a,r)=>a+r.pct,0);const stats=c.querySelector('.chb-stats');if(stats)stats.innerHTML=`<span>Party Synergy +${synergyPct.toFixed(2)}%</span><span>Support Impact +${supportPct.toFixed(2)}%</span>`;let html=encounterHtml(m);html+=groups.map(g=>`<div class="chb-summary-row">+${g.value.toLocaleString(undefined,{maximumFractionDigits:2})} estimated ${supportNames.has(g.name)?'support':'synergy'} contribution from ${esc(g.name)} - ${g.pct.toFixed(2)}% of base power</div>`).join('');replaceDetails(c,html)}
function renderSupport(m){const c=card(m);if(!c||role(m)!=='support')return;removeLegacyCompatibility(c);const party=m.closest('.party');const ps=party?[...party.querySelectorAll('.party-member, .authoritative-member')]:members();const rows=[];for(const dps of ps){if(dps===m||role(dps)!=='dps')continue;for(const r of parseRows(dps))if(r.source===name(m))rows.push({target:name(dps),value:r.value,pct:r.pct,uptime:r.uptime})}if(!rows.length)return;const groups=group(rows,'target'),total=groups.reduce((a,g)=>a+g.value,0),base=cp(m);const stats=c.querySelector('.chb-stats');if(stats)stats.innerHTML=`<span>Party Synergy +0.00%</span><span>Support Impact +${(base?total/base*100:0).toFixed(2)}%</span>`;let html=encounterHtml(m);html+=groups.map(g=>`<div class="chb-summary-row">+${g.value.toLocaleString(undefined,{maximumFractionDigits:2})} estimated support contribution to ${esc(g.name)} - ${g.pct.toFixed(2)}% of ${esc(g.name)}'s base power</div>`).join('');replaceDetails(c,html)}
function apply(){for(const m of members()){if(card(m))role(m)==='support'?renderSupport(m):renderDps(m)}}
function css(){let s=document.getElementById('compact-hover-style');if(!s){s=document.createElement('style');s.id='compact-hover-style';document.head.appendChild(s)}s.textContent='.chb-compact-detail{display:block!important;line-height:1.45;margin-top:6px}.chb-summary-row{display:block!important;margin:6px 0!important}.chb-compact-encounter{font-weight:600;margin:0 0 6px}.chb-compact-detail .chb-summary-row{opacity:1!important}'}
function start(){window.LostArkHoverSummaryV1={active:true,version:10};css();apply();const root=document.getElementById('suggestedParties')||document.body;let timer=0,applying=false;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{applying=true;try{apply()}finally{setTimeout(()=>{applying=false},0)}},0)};
/* apply() writes the hover cards inside #suggestedParties, so observing that
   root unconditionally made every apply retrigger the observer -- a permanent
   mutation storm that kept rewriting hover text under the cursor. Ignore our
   own output and suppress reentry. The renderer and its format are untouched. */
const ownHoverOutput=r=>{const el=r.target&&(r.target.nodeType===1?r.target:r.target.parentElement);return !!el?.closest?.('.character-hover-breakdown,.general-metrics-block')};
new MutationObserver(recs=>{if(applying)return;if(recs.every(ownHoverOutput))return;schedule()}).observe(root,{childList:true,subtree:true,characterData:true});document.getElementById('optimizeBtn')?.addEventListener('click',()=>[0,20,50,100,200,400,800,1500,3000].forEach(ms=>setTimeout(apply,ms)),true);document.getElementById('raidSpecificSelect')?.addEventListener('change',()=>setTimeout(apply,0),true);document.addEventListener('mouseover',e=>{const m=e.target.closest?.('#suggestedParties .party-member, #suggestedParties .authoritative-member');if(m)[0,50,150,300,600].forEach(ms=>setTimeout(()=>{if(card(m))apply()},ms))},true);document.addEventListener('pointerenter',e=>{const m=e.target.closest?.('#suggestedParties .party-member, #suggestedParties .authoritative-member');if(m)[0,50,150,300,600].forEach(ms=>setTimeout(()=>{if(card(m))apply()},ms))},true);[50,150,300,600,1000,2000,4000].forEach(ms=>setTimeout(apply,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
