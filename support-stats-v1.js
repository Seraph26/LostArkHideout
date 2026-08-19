/* Lost Ark Hideout — dynamic Bible support uptime data */
(()=>{
'use strict';
if(window.LostArkSupportStats)return;
const WORKER='https://lostark-bible-connector.seraph0226.workers.dev/raid-stats';
const CACHE=new Map();
const SUPPORTS=['Bard','Artist','Paladin','Valkyrie'];
const EFFECTS=['ap','brand','ha','identity'];
const CAT={ap:/^(ap|attack.?power|atk.?power)$/i,brand:/brand/i,ha:/^(ha|h\.?a\.?|haskill|haskill)$/i,identity:/identity/i};
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const classNorm=s=>{const n=norm(s);if(n==='bard')return'Bard';if(n==='artist')return'Artist';if(n==='paladin')return'Paladin';if(n==='valkyrie')return'Valkyrie';return''};
function encodePayload(o){const bytes=new TextEncoder().encode(JSON.stringify(o));let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function payloadFor(enc){const boss=enc?.boss||'';const difficulty=enc?.difficulty||'Nightmare';const patch=enc?.patch||window.LostArkWesternDataAuthority?.patch||'jun26';const maxIlvl=Number(enc?.maxIlvl||1810),minIlvl=Number(enc?.minIlvl||1740);return encodePayload([["__skrao",1],{boss:2,difficulty:3,dpsType:4,filterBy:5,includeBus:-1,includeWeird:-1,isSupport:6,maxCombatPower:-1,maxGearScore:7,minCombatPower:-1,minGearScore:8,patch:9},boss,difficulty,'ndps','ilvl',true,maxIlvl,minIlvl,patch])}

// Bible's raidStatsSearch response is a compact reference array. Hydrate every
// top-level entry because the useful statistics object is not guaranteed to be
// at index 0.
function unflatten(data){
 const values=typeof data==='string'?JSON.parse(data):data;
 if(!Array.isArray(values))return values;
 const hydrated=new Array(values.length),seen=new Set();
 function get(i){
  if(i===-1)return undefined;
  if(!Number.isInteger(i)||i<0||i>=values.length)return i;
  if(hydrated[i]!==undefined)return hydrated[i];
  if(seen.has(i))return hydrated[i];
  seen.add(i);
  const v=values[i];
  if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number')return hydrated[i]=v;
  if(Array.isArray(v)){
   const a=[];hydrated[i]=a;
   for(const x of v)a.push(Number.isInteger(x)&&x>=0&&x<values.length?get(x):x);
   return a;
  }
  if(v&&typeof v==='object'){
   const o={};hydrated[i]=o;
   for(const[k,x]of Object.entries(v))o[k]=(Number.isInteger(x)&&x>=0&&x<values.length)?get(x):x;
   return o;
  }
  return hydrated[i]=v;
 }
 for(let i=0;i<values.length;i++)get(i);
 return hydrated;
}
function categoryFrom(value,key){const k=norm(key),v=norm(value);for(const [cat,re]of Object.entries(CAT))if(re.test(k)||re.test(v))return cat;if(/supportap$/.test(v))return'ap';if(/supportha$/.test(v))return'ha';return''}
function collect(root){
 const out=[];const seen=new WeakSet();
 function walk(v,ctx=''){
  if(!v||typeof v!=='object'||seen.has(v))return;
  seen.add(v);
  if(Array.isArray(v)){for(const x of v)walk(x,ctx);return}
  const cls=classNorm(v.class||v.className||v.supportClass||v.supportClassName||v.roleClass||v.name);
  const med=Number(v.median??v.med??v.value);
  const ownCategory=categoryFrom(v.stat,'stat')||categoryFrom(v.spec,'spec')||ctx;
  if(cls&&Number.isFinite(med))out.push({class:cls,median:med,category:ownCategory||''});
  for(const[k,x]of Object.entries(v)){
   const next=categoryFrom('',k)||categoryFrom(x&&typeof x==='string'?x:'',k)||ownCategory;
   walk(x,next);
  }
 }
 walk(root);return out;
}
function merge(records){const result={};for(const s of SUPPORTS)result[s]={ap:null,brand:null,ha:null,identity:null};for(const r of records){if(!r.category)continue;result[r.class][r.category]=r.median}return result}
async function fetchStats(enc){
 const key=JSON.stringify({id:enc?.id,boss:enc?.boss,difficulty:enc?.difficulty,patch:enc?.patch,minIlvl:enc?.minIlvl,maxIlvl:enc?.maxIlvl});
 if(CACHE.has(key))return CACHE.get(key);
 const p=payloadFor(enc);
 const r=await fetch(`${WORKER}?payload=${encodeURIComponent(p)}`,{cache:'no-store'});
 if(!r.ok)throw Error(`Bible raid stats HTTP ${r.status}`);
 const raw=await r.json();
 // raidStatsSearch currently returns the compact reference array directly;
 // older wrappers may expose it under .data. Support both forms.
 const root=unflatten(raw?.data??raw);
 const records=collect(root);
 const stats=merge(records);
 const value={ok:true,key,stats,rawCount:records.length,updatedAt:new Date().toISOString()};
 CACHE.set(key,value);window.__LOSTARK_SUPPORT_STATS__=value;return value;
}
async function ensure(){const mode=window.LostArkOptimizerMode||{};if(mode.general||!mode.encounter)return null;try{return await fetchStats(mode.encounter)}catch(e){window.__LOSTARK_SUPPORT_STATS_ERROR__=String(e?.message||e);console.warn('Support uptime data unavailable:',e);return null}}
function get(cls,effect){const v=window.__LOSTARK_SUPPORT_STATS__?.stats?.[classNorm(cls)]?.[effect];return Number.isFinite(Number(v))?Number(v)/100:null}
function summary(cls){const s=window.__LOSTARK_SUPPORT_STATS__?.stats?.[classNorm(cls)];return s||null}
window.LostArkSupportStats={fetch:fetchStats,ensure,get,summary};
window.LostArkSupportStats.ready=ensure();
})();
