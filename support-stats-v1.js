/* Lost Ark Hideout — dynamic Bible support uptime data */
(()=>{
'use strict';
if(window.LostArkSupportStats)return;
const WORKER='https://lostark-bible-connector.seraph0226.workers.dev/raid-stats';
const CACHE=new Map();
const SUPPORTS=['Bard','Artist','Paladin','Valkyrie'];
const CAT={ap:/^(ap|attack.?power|atk.?power)$/i,brand:/brand/i,ha:/^(ha|h\.?a\.?|haskill|haskill)$/i,identity:/identity/i};
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const classNorm=s=>{const n=norm(s);if(n==='bard')return'Bard';if(n==='artist')return'Artist';if(n==='paladin')return'Paladin';if(n==='valkyrie')return'Valkyrie';return''};
const ALIASES={
 'horizon-cathedral-g1':['Archbishop Arsenos','Archbishop Arcenos','Horizon Cathedral Gate 1'],
 'horizon-cathedral-g2':['Vanguard of Fanaticism','Horizon Cathedral Gate 2'],
 'serca-g1':['Witch of Agony, Serca','Witch of Agony Serca','Serca - Gate 1','Serca Gate 1','Serca'],
 'serca-g2':['Corvus Tul Rak','Corvus Tul Rat','Serca - Gate 2','Serca Gate 2','Serca'],
 'kazeros-g1':['Abyss Lord Kazeros','Kazeros - Gate 1','Kazeros Gate 1','Kazeros'],
 'kazeros-g2':['Death Incarnate Kazeros','Kazeros - Gate 2','Kazeros Gate 2','Kazeros'],
 'armoche-g1':['Brelshaza, Ember in the Ashes','Brelshaza - Gate 1','Brelshaza Gate 1','Mistress of Desire Echidna','Covetous Master Echidna','Armoche - Gate 1','Armoche Gate 1'],
 'armoche-g2':['Armoche, Sentinel of the Abyss','Armoche - Gate 2','Armoche Gate 2','Armoche'],
 'extreme-aegir-g2':['Aegir, the Oppressor','Aegir - Gate 2','Aegir','Extreme Aegir Gate 2'],
 'extreme-brelshaza-g2':['Phantom Manifester Brelshaza','Brelshaza - Gate 2','Brelshaza','Extreme Brelshaza Gate 2']
};
function encodePayload(o){const bytes=new TextEncoder().encode(JSON.stringify(o));let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function payloadFor(enc,bossOverride){const boss=bossOverride||enc?.boss||'';const difficulty=enc?.difficulty||'Nightmare';const patch=enc?.patch||window.LostArkWesternDataAuthority?.patch||'jun26';const maxIlvl=Number(enc?.maxIlvl||1810),minIlvl=Number(enc?.minIlvl||1740);return encodePayload([["__skrao",1],{boss:2,difficulty:3,dpsType:4,filterBy:5,includeBus:-1,includeWeird:-1,isSupport:6,maxCombatPower:-1,maxGearScore:7,minCombatPower:-1,minGearScore:8,patch:9},boss,difficulty,'ndps','ilvl',true,maxIlvl,minIlvl,patch])}
function unflatten(data){const values=typeof data==='string'?JSON.parse(data):data;if(!Array.isArray(values))return values;const hydrated=new Array(values.length),seen=new Set();function get(i){if(i===-1)return undefined;if(!Number.isInteger(i)||i<0||i>=values.length)return i;if(hydrated[i]!==undefined)return hydrated[i];if(seen.has(i))return hydrated[i];seen.add(i);const v=values[i];if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number')return hydrated[i]=v;if(Array.isArray(v)){const a=[];hydrated[i]=a;for(const x of v)a.push(Number.isInteger(x)&&x>=0&&x<values.length?get(x):x);return a}if(v&&typeof v==='object'){const o={};hydrated[i]=o;for(const[k,x]of Object.entries(v))o[k]=(Number.isInteger(x)&&x>=0&&x<values.length)?get(x):x;return o}return hydrated[i]=v}for(let i=0;i<values.length;i++)get(i);return hydrated}
function categoryFrom(value,key){const k=norm(key),v=norm(value);for(const [cat,re]of Object.entries(CAT))if(re.test(k)||re.test(v))return cat;if(/supportap$/.test(v))return'ap';if(/supportha$/.test(v))return'ha';return''}
function collect(root){const out=[];const seen=new WeakSet();function walk(v,ctx=''){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(Array.isArray(v)){for(const x of v)walk(x,ctx);return}const cls=classNorm(v.class||v.className||v.supportClass||v.supportClassName||v.roleClass||v.name);const med=Number(v.median??v.med??v.value);if(cls&&Number.isFinite(med))out.push({class:cls,median:med,category:categoryFrom(v.stat,'stat')||categoryFrom(v.spec,'spec')||ctx||''});for(const[k,x]of Object.entries(v)){const next=categoryFrom('',k)||categoryFrom(x&&typeof x==='string'?x:'',k)||categoryFrom(v.stat,'stat')||categoryFrom(v.spec,'spec')||ctx;walk(x,next)}}walk(root);return out}
function merge(records){const result={};for(const s of SUPPORTS)result[s]={ap:null,brand:null,ha:null,identity:null};for(const r of records){if(!r.category||!result[r.class])continue;result[r.class][r.category]=r.median}return result}
function hasSupportData(stats){return SUPPORTS.some(s=>Object.values(stats[s]||{}).some(v=>Number.isFinite(Number(v))))}
function responseRoots(raw){const roots=[];const add=v=>{if(v!==undefined&&v!==null)roots.push(v)};const data=raw?.data;if(Array.isArray(data)){if(Array.isArray(data[0]))add(data[0]);if(typeof data[0]==='string')add(data[0]);add(data)}else if(data!==undefined)add(data);if(raw?.result!==undefined)add(raw.result);add(raw);return roots}
function decodeRecords(raw){const all=[];const seenRoots=new Set();for(const candidate of responseRoots(raw)){let signature='';try{signature=JSON.stringify(candidate)}catch{}if(signature&&seenRoots.has(signature))continue;if(signature)seenRoots.add(signature);try{all.push(...collect(unflatten(candidate)))}catch{}}return all}
async function fetchCandidate(enc,boss){const p=payloadFor(enc,boss);const r=await fetch(`${WORKER}?payload=${encodeURIComponent(p)}`,{cache:'no-store'});if(!r.ok)throw Error(`Bible raid stats HTTP ${r.status}`);const raw=await r.json();const records=decodeRecords(raw);const stats=merge(records);return {stats,rawCount:records.length,boss};}
async function fetchStats(enc){if(!enc)return null;const key=JSON.stringify({id:enc?.id,boss:enc?.boss,difficulty:enc?.difficulty,patch:enc?.patch,minIlvl:enc?.minIlvl,maxIlvl:enc?.maxIlvl});if(CACHE.has(key)){window.__LOSTARK_SUPPORT_STATS__=CACHE.get(key);return CACHE.get(key)}const candidates=[...(ALIASES[enc.id]||[]),enc.boss].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);let lastError=null;for(const boss of candidates){try{const result=await fetchCandidate(enc,boss);if(hasSupportData(result.stats)){const value={ok:true,key,stats:result.stats,rawCount:result.rawCount,resolvedBoss:boss,updatedAt:new Date().toISOString()};CACHE.set(key,value);window.__LOSTARK_SUPPORT_STATS__=value;return value}}catch(e){lastError=e}}if(lastError)throw lastError;const empty={ok:false,key,stats:merge([]),rawCount:0,resolvedBoss:null,updatedAt:new Date().toISOString()};CACHE.set(key,empty);window.__LOSTARK_SUPPORT_STATS__=empty;return empty}
let lastModeKey='';let loading=false;
async function ensure(){const mode=window.LostArkOptimizerMode||{};if(mode.general||!mode.encounter)return null;const enc=mode.encounter;const key=JSON.stringify({id:enc?.id,boss:enc?.boss,difficulty:enc?.difficulty,patch:enc?.patch,minIlvl:enc?.minIlvl,maxIlvl:enc?.maxIlvl});if(key===lastModeKey&&window.__LOSTARK_SUPPORT_STATS__?.key===key)return window.__LOSTARK_SUPPORT_STATS__;if(loading)return null;loading=true;try{lastModeKey=key;return await fetchStats(enc)}catch(e){lastModeKey='';window.__LOSTARK_SUPPORT_STATS_ERROR__=String(e?.message||e);console.warn('Support uptime data unavailable:',e);return null}finally{loading=false}}
function get(cls,effect){const v=window.__LOSTARK_SUPPORT_STATS__?.stats?.[classNorm(cls)]?.[effect];return Number.isFinite(Number(v))?Number(v):null}
function summary(cls){const s=window.__LOSTARK_SUPPORT_STATS__?.stats?.[classNorm(cls)];return s||null}
window.LostArkSupportStats={fetch:fetchStats,ensure,get,summary};
window.LostArkSupportStats.ready=ensure();
const tick=()=>{try{ensure()}catch{}};setTimeout(tick,250);setTimeout(tick,750);setTimeout(tick,1500);setTimeout(tick,3000);setInterval(tick,2000);
})();
