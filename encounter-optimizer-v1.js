/* Lost Ark Hideout — encounter-aware optimizer integration v5 */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3',PARTY='lostark-hideout-party-assignments-v2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
function active(){return window.LostArkOptimizerMode&&!window.LostArkOptimizerMode.general&&window.LostArkOptimizerMode.raid&&window.LostArkEncounterScoring?.profile?.()}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'null')||{characters:[]}}catch{return{characters:[]}}}
function roster(){return(load().characters||[]).filter(c=>c&&c.id&&c.profile)}
/* build() re-reads and re-parses the build-profile cache, and info() calls it.
   Both are hit for every member of every candidate arrangement, which made
   enumeration take ~23ms per arrangement. Memoise per character; values are
   pure. Caches drop when the roster changes or build profiles finish loading. */
const buildCache=new Map(),infoCache=new Map();
function ckey(c){return String(c&&(c.id||c.url)||'')}
function dropEncCaches(){buildCache.clear();infoCache.clear();valueCache.clear()}
window.addEventListener('lostark-build-profiles-v3-ready',dropEncCaches);
function build(c){const k=ckey(c);if(buildCache.has(k))return buildCache.get(k);let v;try{v=window.LostArkBuildProfilesV3?.get(c.url)||window.LostArkBuildProfilesV2?.get(c.url)||{}}catch{v={}}buildCache.set(k,v);return v}
function info(c){const ik=ckey(c);if(infoCache.has(ik))return infoCache.get(ik);const p=c.profile||{},b=build(c);let cls=String(p.class||p.className||p.characterClass||'');if(!cls||cls==='Unknown')cls=String(window.LostArkEncounterScoring?.traits?.(c)?.className||'Unknown');/* Bible role detection often yields "Unknown", which is truthy and used to
   short-circuit the class check below -- marking every character DPS, leaving
   no valid 3+1 party, and making Raid Specific silently produce nothing. Only
   an explicit Support/DPS counts as stated. */
const stated=String(p.role||'').trim();const role=(stated==='Support'||stated==='DPS')?stated:(['Bard','Artist','Paladin','Valkyrie'].includes(cls)?'Support':'DPS');const resolved={name:String(p.name||c.name||'Unknown'),cls,role:role==='Support'?'Support':'DPS',cp:num(p.cp??p.combatPower),ilvl:num(p.ilvl??p.itemLevel),url:c.url||p.url||'',build:b};infoCache.set(ik,resolved);return resolved}
/* Per-character and independent of party composition, but called once per member
   of every candidate arrangement -- memoise it, keyed by encounter. */
const valueCache=new Map();
/* characterScore() already clamps. Re-clamping at .75 here re-imposed the floor
   the scorer just moved to .60, so two supports that now score differently were
   flattened back to an identical value for party selection -- the display would
   separate them while the optimizer still could not. */
function charValue(c){const k=String(window.LostArkOptimizerMode?.raid||'')+'|'+String(c.id);if(valueCache.has(k))return valueCache.get(k);const r=window.LostArkEncounterScoring.characterScore(c);const v=num(r.score)||1;valueCache.set(k,v);return v}
function scoreParty(p){if(p.length!==4)return-1;const dps=p.filter(c=>info(c).role==='DPS'),supports=p.filter(c=>info(c).role==='Support');if(dps.length!==3||supports.length!==1)return-1;const dpsValue=dps.reduce((s,c)=>s+info(c).cp*charValue(c),0),supportFactor=charValue(supports[0]);return dpsValue*supportFactor}
/* Horizon Cathedral and Serca are single-party (4-player) content; everything
   else fields two full parties. The manifest carries this per encounter. */
function playerCount(){const n=Number(window.LostArkOptimizerMode?.encounter?.players);return n===4?4:8}
/* Single-party content: best 1 support + 3 DPS from the eligible pool. */
function singleParties(chars){const sup=strongest(chars.filter(c=>info(c).role==='Support'),MAX_SUPPORTS),dps=strongest(chars.filter(c=>info(c).role==='DPS'),MAX_DPS);
 const out=[];
 for(const s of sup)for(const three of pickCombos(dps,3)){const a=three.concat(s),v=scoreParty(a);if(v<0)continue;out.push({a,b:[],score:v,s1:v,s2:0})}
 return out.sort((x,y)=>y.score-x.score)}
/* Two parties: 2 supports and 6 DPS chosen from the pool, then split 3+1 each.
   Enumerating by role keeps this exact at eight characters and still fast when
   un-hidden New Additions widen the pool; weaker candidates are trimmed by CP. */
function partitions(chars){const sup=strongest(chars.filter(c=>info(c).role==='Support'),MAX_SUPPORTS),dps=strongest(chars.filter(c=>info(c).role==='DPS'),MAX_DPS);
 if(sup.length<2||dps.length<6)return[];
 const out=[];
 for(const pair of pickCombos(sup,2))for(const six of pickCombos(dps,6)){
  const anchor=six[0];
  for(const three of pickCombos(six,3)){
   if(!three.includes(anchor))continue;            /* anchor kills mirror duplicates */
   const rest=six.filter(c=>!three.includes(c));
   for(const [x,y] of [[pair[0],pair[1]],[pair[1],pair[0]]]){
    const a=three.concat(x),b=rest.concat(y),s1=scoreParty(a),s2=scoreParty(b);
    if(s1<0||s2<0)continue;out.push({a,b,score:s1+s2,s1,s2});
   }
  }
 }
 return out.sort((x,y)=>y.score-x.score)}
function saveAssignments(a,b){localStorage.setItem(PARTY,JSON.stringify({party1:a.map(c=>c.id),party2:b.map(c=>c.id)}))}
function parameterText(p){const parts=[];const pos=[['Hit Master',num(p.hitmaster)],['Front Attack',num(p.front)],['Back Attack',num(p.back)]].sort((a,b)=>b[1]-a[1]);if(pos[0][1]>0&&pos[0][1]!==pos[pos.length-1][1])parts.push(`${pos[0][0]} favored`);const range=num(p.ranged),melee=num(p.melee);if(range>melee)parts.push('Ranged favored');else if(melee>range)parts.push('Melee favored');if(num(p.burst)>1)parts.push('Burst windows favored');const mv=p.mechanics?.movement;if(mv&&mv!=='low')parts.push(`${String(mv).replace(/-/g,' ')} mobility pressure`);const fp=p.mechanics?.forcedPositioning;if(fp&&fp!=='low')parts.push(`${String(fp).replace(/-/g,' ')} forced positioning`);if(p.mechanics?.stagger==='high')parts.push('High stagger demand');if(p.mechanics?.destruction==='high')parts.push('High destruction demand');return parts.join(' · ')||'Standard encounter parameters'}
/* Present the same figures the Main Group does. The General model's contribution
   already consults the selected encounter for support uptime, so reusing it here
   is encounter-aware -- and it means one hover format rather than two. */
function generalScore(p){try{return window.LostArkGeneralModel?.score?.(p)||null}catch{return null}}
function generalHover(c,s,p){try{return window.LostArkGeneralModel?.hoverHtml?.(c,s,p)||''}catch{return''}}
function specLabel(c,fallback){try{const a=window.LostArkSpecAuthority;if(a?.specFor){const s=a.specFor(c.profile||{},build(c));if(s)return s}}catch{}return fallback}
/* The Raid Specific character card IS the General card: the General model renders
   it, so name, spec, role, position and CP come out identical and the shared
   repair layer (ui-fixes-clean repairBottom) decorates both the same way. Raid's
   own markup used <h4>/<small> with the position baked into the text, which is
   why it showed a smaller card and "unknown" where General shows Back Attack.
   The .slot class rides along only because the drag handlers and layout key
   off it. */
/* Encounter Favorability sits on the card, top right, rather than in the hover.
   100% is neutral in the model, but on real encounters nearly every character
   sits below it, so colouring against 100 would paint every card red and say
   nothing. Colour against this lineup's own average instead: green means the
   fight suits them more than the rest of the group, red less, grey within a
   third of a point either way. The figure itself is unchanged and absolute. */
function favourability(c){try{const r=window.LostArkEncounterScoring?.characterScore?.(c);return Number.isFinite(r?.score)?r.score*100:null}catch{return null}}
/* No title attribute: the card already has its own hover, and a native tooltip
   on top of it put two popups on screen at once. The label carries the meaning
   instead, and Definitions carries the detail. */
function favBadge(c,mean){const v=favourability(c);if(v===null)return'';
 const d=Number.isFinite(mean)?v-mean:0,cls=d>=.3?'fav-good':d<=-.3?'fav-bad':'fav-even';
 return `<span class="encounter-fav ${cls}"><span class="encounter-fav-label">Encounter Favorability</span><span class="encounter-fav-value">${v.toFixed(1)}%</span></span>`}
function slotHtml(c,gs,p,mean){const g=window.LostArkGeneralModel;if(g?.member)return g.member(c,gs,p,'slot').replace(/^(<div[^>]*>)/,`$1${favBadge(c,mean)}`);const i=info(c),roleClass=i.role==='Support'?'support':'dps';return `<div class="slot party-member authoritative-member" draggable="true" data-character-id="${esc(c.id)}"><a class="party-character-link" href="${esc(i.url||'')}" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a><span class="party-class-label">${esc(specLabel(c,i.cls))}</span><span class="party-role-label ${roleClass}">${esc(i.role)}</span><span class="party-stat-label">CP ${Math.round(i.cp).toLocaleString()}</span>${generalHover(c,gs,p)||'<div class="character-hover-breakdown"><strong>'+esc(i.name)+'</strong><div>CP '+Math.round(i.cp).toLocaleString()+'</div></div>'}</div>`}
/* Same Synergies line the Main Group shows, from the same model, so the two
   modes describe a party the same way. Support uptime comes off the General
   score object, which is already encounter-aware. */
function synergyLine(p,gs){let labels='';try{labels=window.LostArkGeneralModel?.partySynergyLabels?.(p)||''}catch{}
 const uptime=gs&&Number.isFinite(Number(gs.coherence))?` · Support uptime ${gs.coherence}%`:'';
 return `<div class="party-synergies"><strong>Synergies:</strong> ${esc(labels||'None')}${uptime}</div>`}
/* The encounter score is wrapped in <strong> so the swap-arrow layer has an
   anchor to place its indicator after, exactly as it does on the General
   "Estimated potential" figure. */
function renderParty(title,p,score,opts){const solo=!!(opts&&opts.solo),key=(opts&&opts.key)||'party1';const fit=(window.LostArkEncounterScoring.partyScore(p).score*100).toFixed(1);const gs=generalScore(p);return `<article class="party encounter-optimized-party${solo?' solo-encounter-party':''}"><h3>${esc(title)}</h3><div class="score party-score">Encounter score <strong>${Math.round(score).toLocaleString()}</strong> · Average Party Encounter Favorability ${fit}%</div><div class="slots" data-enc-party="${key}">${p.map(c=>slotHtml(c,gs,p,opts&&opts.mean)).join('')}</div>${synergyLine(p,gs)}</article>`}
function render(best){const root=document.getElementById('suggestedParties');if(!root)return;const model=window.LostArkEncounterScoring.profile();const params=parameterText(model);
/* The colour baseline for the favorability badges: everyone actually seated. */
const seated=[...(best.a||[]),...(best.b||[])].map(favourability).filter(v=>v!==null);
const mean=seated.length?seated.reduce((s,v)=>s+v,0)/seated.length:null;/* Single-party content renders Party 1 only: there is no second party to show,
   and no party-to-party swap to analyse. */
const solo=!best.b||!best.b.length;
root.innerHTML=`<div class="authoritative-summary"><strong>${solo?'Estimated potential':'Combined estimated potential'}: ${Math.round(best.score).toLocaleString()}</strong><span> — ${esc(model.name)} · ${esc(model.confidence)} · ${solo?'4-player content, one party. ':''}<span class="encounter-parameters">${esc(params)}</span> · actual CP unchanged.</span></div>${renderParty('Party 1',best.a,best.s1,{solo,key:'party1',mean})}${solo?'':renderParty('Party 2',best.b,best.s2,{key:'party2',mean})}<div class="encounter-optimization-note">${esc(model.name)} · ${esc(model.confidence)} · DPS uptime and support encounter fit are scored separately. Actual CP is unchanged.</div>`}
/* Same eligible pool the General optimizer uses: Main Group plus any New
   Addition that is not hidden, so an outside character can displace a current
   member here too. Requiring exactly 8 stored characters previously disabled
   Raid Specific outright. */
let poolSnapshot=null;
function pool(){const raw=localStorage.getItem(STORE)+'|'+localStorage.getItem('lostark-hideout-new-additions-v1')+'|'+localStorage.getItem('lostark-hideout-hidden-v1');
 if(raw!==poolSnapshot){poolSnapshot=raw;dropEncCaches()}
 const base=roster();let list=null;try{list=window.LostArkCandidateRoster?.getEligible?.()}catch{}
 if(!Array.isArray(list)||!list.length)list=base;
 const seen=new Set();
 return list.filter(c=>{const id=c&&c.id;if(!id||seen.has(id)||!c.profile)return false;seen.add(id);return true})}
const MAX_SUPPORTS=4,MAX_DPS=10;
function strongest(list,n){return list.slice().sort((x,y)=>info(y).cp-info(x).cp).slice(0,n)}
function pickCombos(a,k){const o=[];function r(i,p){if(p.length===k){o.push(p);return}for(let j=i;j<=a.length-(k-p.length);j++)r(j+1,p.concat(a[j]))}r(0,[]);return o}
function optimize(){if(!active())return false;const chars=pool();if(chars.length<(playerCount()===4?4:8))return false;const all=playerCount()===4?singleParties(chars):partitions(chars);if(!all.length)return false;const best=all[0];saveAssignments(best.a,best.b);window.LostArkEncounterOptimization={best,alternatives:all.slice(1,6),encounter:window.LostArkEncounterScoring.profile().name};render(best);return true}
/* Manual swapping between the two Raid Specific parties. 8-player content only:
   4-player content fields a single party, so there is nowhere to swap to.
   A swap that would break 3 DPS + 1 support in either party is rejected, and
   Optimize Parties still returns to the computed optimum. */
function currentParties(){const m=new Map(pool().map(c=>[String(c.id),c]));let st={};try{st=JSON.parse(localStorage.getItem(PARTY)||'{}')}catch{}
 const pick=ids=>(Array.isArray(ids)?ids:[]).map(id=>m.get(String(id))).filter(Boolean);
 return{a:pick(st.party1),b:pick(st.party2)}}
function legalParty(p){return p.length===4&&p.filter(c=>info(c).role==='Support').length===1}
function renderArrangement(a,b){const s1=scoreParty(a),s2=scoreParty(b);render({a,b,s1,s2,score:Math.max(s1,0)+Math.max(s2,0)})}
function installSwap(){const root=document.getElementById('suggestedParties');if(!root||root.dataset.encSwapWired)return;root.dataset.encSwapWired='1';
 const swappable=()=>active()&&playerCount()===8;
 root.addEventListener('dragstart',e=>{if(!swappable())return;const slot=e.target.closest?.('.encounter-optimized-party .slot[data-character-id]');if(!slot)return;e.dataTransfer.setData('text/plain',slot.dataset.characterId);e.dataTransfer.effectAllowed='move'},{capture:true});
 root.addEventListener('dragover',e=>{if(swappable()&&e.target.closest?.('.encounter-optimized-party .slots'))e.preventDefault()},{capture:true});
 root.addEventListener('drop',e=>{
  if(!swappable())return;
  const zone=e.target.closest?.('.encounter-optimized-party .slots');if(!zone)return;
  e.preventDefault();e.stopPropagation();
  const dragged=e.dataTransfer.getData('text/plain');if(!dragged)return;
  const {a,b}=currentParties();if(a.length!==4||b.length!==4)return;
  const from=a.some(c=>String(c.id)===dragged)?'a':b.some(c=>String(c.id)===dragged)?'b':null;
  if(!from)return;
  const to=zone.dataset.encParty==='party2'?'b':'a';
  if(from===to)return;
  const target=e.target.closest?.('.slot[data-character-id]');
  const partner=target?.dataset.characterId;
  if(!partner||partner===dragged)return;
  const next={a:a.slice(),b:b.slice()};
  const i=next[from].findIndex(c=>String(c.id)===dragged),j=next[to].findIndex(c=>String(c.id)===partner);
  if(i<0||j<0)return;
  [next[from][i],next[to][j]]=[next[to][j],next[from][i]];
  if(!legalParty(next.a)||!legalParty(next.b))return;   /* keeps 3 DPS + 1 support */
  saveAssignments(next.a,next.b);
  renderArrangement(next.a,next.b);
 },{capture:true});
}
function busy(b,v){b.disabled=v;b.setAttribute('aria-busy',v?'true':'false');b.textContent=v?'Optimizing...':'Optimize Parties'}
function install(){installSwap();const b=document.getElementById('optimizeBtn');if(!b||b.dataset.encounterOptimizerV5)return;b.dataset.encounterOptimizerV5='1';b.addEventListener('click',()=>{if(!active()||pool().length<(playerCount()===4?4:8))return;busy(b,true);/* two frames so the busy label paints before the partition scan blocks */requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{try{if(active())optimize()}finally{busy(b,false)}},80)))});document.getElementById('raidSpecificSelect')?.addEventListener('change',()=>{window.LostArkEncounterOptimization=null});document.getElementById('generalOptimization')?.addEventListener('change',()=>{window.LostArkEncounterOptimization=null});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();