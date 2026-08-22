/* Lost Ark Hideout — encounter-aware optimizer integration v5 */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3',PARTY='lostark-hideout-party-assignments-v2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
function active(){return window.LostArkOptimizerMode&&!window.LostArkOptimizerMode.general&&window.LostArkOptimizerMode.raid&&window.LostArkEncounterScoring?.profile?.()}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'null')||{characters:[]}}catch{return{characters:[]}}}
function roster(){return(load().characters||[]).filter(c=>c&&c.id&&c.profile)}
function build(c){try{return window.LostArkBuildProfilesV3?.get(c.url)||window.LostArkBuildProfilesV2?.get(c.url)||{}}catch{return{}}}
function info(c){const p=c.profile||{},b=build(c);let cls=String(p.class||p.className||p.characterClass||'');if(!cls||cls==='Unknown')cls=String(window.LostArkEncounterScoring?.traits?.(c)?.className||'Unknown');/* Bible role detection often yields "Unknown", which is truthy and used to
   short-circuit the class check below -- marking every character DPS, leaving
   no valid 3+1 party, and making Raid Specific silently produce nothing. Only
   an explicit Support/DPS counts as stated. */
const stated=String(p.role||'').trim();const role=(stated==='Support'||stated==='DPS')?stated:(['Bard','Artist','Paladin','Valkyrie'].includes(cls)?'Support':'DPS');return{name:String(p.name||c.name||'Unknown'),cls,role:role==='Support'?'Support':'DPS',cp:num(p.cp??p.combatPower),ilvl:num(p.ilvl??p.itemLevel),url:c.url||p.url||'',build:b}}
function charValue(c){const r=window.LostArkEncounterScoring.characterScore(c);return Math.max(.75,Math.min(1.15,num(r.score)||1))}
function scoreParty(p){if(p.length!==4)return-1;const dps=p.filter(c=>info(c).role==='DPS'),supports=p.filter(c=>info(c).role==='Support');if(dps.length!==3||supports.length!==1)return-1;const dpsValue=dps.reduce((s,c)=>s+info(c).cp*charValue(c),0),supportFactor=charValue(supports[0]);return dpsValue*supportFactor}
/* Horizon Cathedral and Serca are single-party (4-player) content; everything
   else fields two full parties. The manifest carries this per encounter. */
function playerCount(){const n=Number(window.LostArkOptimizerMode?.encounter?.players);return n===4?4:8}
/* Single-party content: pick the best 4 of the roster rather than splitting it. */
function singleParties(chars){const out=[];const n=chars.length;for(let mask=1;mask<(1<<n);mask++){let bits=0;for(let i=0;i<n;i++)if(mask&(1<<i))bits++;if(bits!==4)continue;const a=[];for(let i=0;i<n;i++)if(mask&(1<<i))a.push(chars[i]);const s=scoreParty(a);if(s<0)continue;out.push({a,b:[],score:s,s1:s,s2:0})}return out.sort((x,y)=>y.score-x.score)}
function partitions(chars){const out=[];if(chars.length!==8)return out;for(let mask=1;mask<(1<<8);mask++){if(!(mask&1))continue;let bits=0;for(let i=0;i<8;i++)if(mask&(1<<i))bits++;if(bits!==4)continue;const a=[],b=[];for(let i=0;i<8;i++)(mask&(1<<i)?a:b).push(chars[i]);const s1=scoreParty(a),s2=scoreParty(b);if(s1<0||s2<0)continue;out.push({a,b,score:s1+s2,s1,s2})}return out.sort((x,y)=>y.score-x.score)}
function saveAssignments(a,b){localStorage.setItem(PARTY,JSON.stringify({party1:a.map(c=>c.id),party2:b.map(c=>c.id)}))}
function swapAnalysis(p1,p2){const total=scoreParty(p1)+scoreParty(p2),rows=[];for(let i=0;i<p1.length;i++)for(let j=0;j<p2.length;j++){const a=p1.slice(),b=p2.slice();[a[i],b[j]]=[b[j],a[i]];const next=scoreParty(a)+scoreParty(b);if(next<0)continue;rows.push({a:p1[i],b:p2[j],next,pct:total?((next-total)/total)*100:0})}return rows.sort((a,b)=>b.pct-a.pct)}
function impactHtml(p1,p2){const rows=swapAnalysis(p1,p2);if(!rows.length)return'';const best=rows[0],worst=rows[rows.length-1];const fmt=(r,label)=>{const cls=r.pct>0.005?'positive':r.pct<-0.005?'negative':'neutral',arrow=r.pct>0.005?'↑':r.pct<-0.005?'↓':'→';return `<div class="swap-impact ${cls}"><strong>${label}: ${esc(info(r.a).name)} ↔ ${esc(info(r.b).name)}</strong><div class="swap-impact-number">${arrow} ${r.pct>=0?'+':''}${r.pct.toFixed(2)}%</div><span class="swap-reason">Combined encounter potential would be ${Math.round(r.next).toLocaleString()}.</span></div>`};return fmt(best,'Best available swap')+fmt(worst,'Worst available swap')}
function parameterText(p){const parts=[];const pos=[['Hit Master',num(p.hitmaster)],['Front Attack',num(p.front)],['Back Attack',num(p.back)]].sort((a,b)=>b[1]-a[1]);if(pos[0][1]>0&&pos[0][1]!==pos[pos.length-1][1])parts.push(`${pos[0][0]} favored`);const range=num(p.ranged),melee=num(p.melee);if(range>melee)parts.push('Ranged favored');else if(melee>range)parts.push('Melee favored');if(num(p.burst)>1)parts.push('Burst windows favored');const mv=p.mechanics?.movement;if(mv&&mv!=='low')parts.push(`${String(mv).replace(/-/g,' ')} mobility pressure`);const fp=p.mechanics?.forcedPositioning;if(fp&&fp!=='low')parts.push(`${String(fp).replace(/-/g,' ')} forced positioning`);if(p.mechanics?.stagger==='high')parts.push('High stagger demand');if(p.mechanics?.destruction==='high')parts.push('High destruction demand');return parts.join(' · ')||'Standard encounter parameters'}
function renderParty(title,p,score,opts){const solo=!!(opts&&opts.solo),key=(opts&&opts.key)||'party1';const model=window.LostArkEncounterScoring.profile();const fit=(window.LostArkEncounterScoring.partyScore(p).score*100).toFixed(1);return `<article class="party encounter-optimized-party${solo?' solo-encounter-party':''}"><h3>${esc(title)}</h3><div class="score">Encounter score ${Math.round(score).toLocaleString()} · Fit ${fit}%</div><div class="slots" data-enc-party="${key}">${p.map(c=>{const i=info(c),t=window.LostArkEncounterScoring.traits(c),r=window.LostArkEncounterScoring.characterScore(c),roleClass=i.role==='Support'?'support':'dps';return `<div class="slot party-member authoritative-member" draggable="true" data-character-id="${esc(c.id)}"><h4 class="party-character-title">${esc(i.name)}</h4><small>${esc(i.cls)} · <span class="party-role-label ${roleClass}">${esc(i.role)}</span> · CP ${Math.round(i.cp).toLocaleString()} · ${esc(t.positionLabel)} · Encounter ${Math.round(r.score*100)}%</small><div class="encounter-reason">${esc(r.reasons.join(' · ')||'Neutral encounter profile')}</div></div>`}).join('')}</div></article>`}
function render(best){const root=document.getElementById('suggestedParties');if(!root)return;const model=window.LostArkEncounterScoring.profile();const params=parameterText(model);/* Single-party content renders Party 1 only: there is no second party to show,
   and no party-to-party swap to analyse. */
const solo=!best.b||!best.b.length;
root.innerHTML=`<div class="authoritative-summary"><strong>${solo?'Estimated potential':'Combined estimated potential'}: ${Math.round(best.score).toLocaleString()}</strong><span> — ${esc(model.name)} · ${esc(model.confidence)} · ${solo?'4-player content, one party. ':''}<span class="encounter-parameters">${esc(params)}</span> · actual CP unchanged.</span></div>${renderParty('Party 1',best.a,best.s1,{solo,key:'party1'})}${solo?'':renderParty('Party 2',best.b,best.s2,{key:'party2'})}${solo?'':impactHtml(best.a,best.b)}<div class="encounter-optimization-note">${esc(model.name)} · ${esc(model.confidence)} · DPS uptime and support encounter fit are scored separately. Actual CP is unchanged.</div>`}
/* Same first-8 main-roster selection the General optimizer uses. Requiring the
   store to hold exactly 8 made any 9th character silently disable Raid Specific. */
function pool(){return roster().slice(0,8)}
function optimize(){if(!active())return false;const chars=pool();if(chars.length!==8)return false;const all=playerCount()===4?singleParties(chars):partitions(chars);if(!all.length)return false;const best=all[0];saveAssignments(best.a,best.b);window.LostArkEncounterOptimization={best,alternatives:all.slice(1,6),encounter:window.LostArkEncounterScoring.profile().name};render(best);return true}
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
function install(){installSwap();const b=document.getElementById('optimizeBtn');if(!b||b.dataset.encounterOptimizerV5)return;b.dataset.encounterOptimizerV5='1';b.addEventListener('click',()=>{if(!active()||pool().length!==8)return;busy(b,true);/* two frames so the busy label paints before the partition scan blocks */requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{try{if(active())optimize()}finally{busy(b,false)}},80)))});document.getElementById('raidSpecificSelect')?.addEventListener('change',()=>{window.LostArkEncounterOptimization=null});document.getElementById('generalOptimization')?.addEventListener('change',()=>{window.LostArkEncounterOptimization=null});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();