/* Lost Ark Hideout — encounter-aware optimizer integration v3 */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3',PARTY='lostark-hideout-party-assignments-v2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
function active(){return window.LostArkOptimizerMode&&!window.LostArkOptimizerMode.general&&window.LostArkOptimizerMode.raid&&window.LostArkEncounterScoring?.profile?.()}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'null')||{characters:[]}}catch{return{characters:[]}}}
function roster(){return(load().characters||[]).filter(c=>c&&c.id&&c.profile)}
function info(c){const p=c.profile||{};const cls=String(p.class||p.className||p.characterClass||'Unknown');const role=p.role||(['Bard','Artist','Paladin','Valkyrie'].includes(cls)?'Support':'DPS');return{name:String(p.name||c.name||'Unknown'),cls,role:role==='Support'?'Support':'DPS',cp:num(p.cp??p.combatPower),ilvl:num(p.ilvl??p.itemLevel),url:c.url||p.url||''}}
function charValue(c){const r=window.LostArkEncounterScoring.characterScore(c);return Math.max(.75,Math.min(1.15,num(r.score)||1))}
function scoreParty(p){
 if(p.length!==4)return-1;
 const dps=p.filter(c=>info(c).role==='DPS');
 const supports=p.filter(c=>info(c).role==='Support');
 if(dps.length!==3||supports.length!==1)return-1;
 const dpsValue=dps.reduce((s,c)=>s+info(c).cp*charValue(c),0);
 /* Support CP is not treated as DPS. Its encounter contribution is represented
    by the selected profile's support-fit score instead. */
 const supportFactor=charValue(supports[0]);
 return dpsValue*supportFactor;
}
function partitions(chars){
 const out=[];if(chars.length!==8)return out;
 for(let mask=1;mask<(1<<8);mask++){
  if(!(mask&1))continue;
  let bits=0;for(let i=0;i<8;i++)if(mask&(1<<i))bits++;
  if(bits!==4)continue;
  const a=[],b=[];for(let i=0;i<8;i++)(mask&(1<<i)?a:b).push(chars[i]);
  const s1=scoreParty(a),s2=scoreParty(b);if(s1<0||s2<0)continue;
  out.push({a,b,score:s1+s2,s1,s2});
 }
 return out.sort((x,y)=>y.score-x.score);
}
function saveAssignments(a,b){localStorage.setItem(PARTY,JSON.stringify({party1:a.map(c=>c.id),party2:b.map(c=>c.id)}))}
function renderParty(title,p,score){
 const model=window.LostArkEncounterScoring.profile();
 const fit=(window.LostArkEncounterScoring.partyScore(p).score*100).toFixed(1);
 return `<article class="party encounter-optimized-party"><h3>${esc(title)}</h3><div class="score">Encounter score ${Math.round(score).toLocaleString()} · Fit ${fit}%</div><div class="slots">${p.map(c=>{const i=info(c),t=window.LostArkEncounterScoring.traits(c),r=window.LostArkEncounterScoring.characterScore(c);return `<div class="slot party-member authoritative-member" draggable="true" data-character-id="${esc(c.id)}"><h4 class="party-character-title">${esc(i.name)}</h4><small>${esc(i.cls)} · ${esc(i.role)} · CP ${Math.round(i.cp).toLocaleString()} · ${esc(t.positionLabel)} · Encounter ${Math.round(r.score*100)}%</small><div class="encounter-reason">${esc(r.reasons.join(' · ')||'Neutral encounter profile')}</div></div>`}).join('')}</div></article>`
}
function render(best){const root=document.getElementById('suggestedParties');if(!root)return;const model=window.LostArkEncounterScoring.profile();root.innerHTML=renderParty('Party 1',best.a,best.s1)+renderParty('Party 2',best.b,best.s2)+`<div class="encounter-optimization-note">${esc(model.name)} · ${esc(model.confidence)} · DPS uptime and support encounter fit are scored separately. Actual CP is unchanged.</div>`}
function optimize(){if(!active())return false;const chars=roster();if(chars.length!==8)return false;const all=partitions(chars);if(!all.length)return false;const best=all[0];saveAssignments(best.a,best.b);window.LostArkEncounterOptimization={best,alternatives:all.slice(1,6),encounter:window.LostArkEncounterScoring.profile().name};render(best);return true}
function install(){const b=document.getElementById('optimizeBtn');if(!b||b.dataset.encounterOptimizerV3)return;b.dataset.encounterOptimizerV3='1';b.addEventListener('click',()=>setTimeout(()=>{if(active())optimize()},80));document.getElementById('raidSpecificSelect')?.addEventListener('change',()=>{window.LostArkEncounterOptimization=null});document.getElementById('generalOptimization')?.addEventListener('change',()=>{window.LostArkEncounterOptimization=null});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
