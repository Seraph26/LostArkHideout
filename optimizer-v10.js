/* Lost Ark Hideout — authoritative optimizer v11.
   Single execution path: no loader chain, no class inference from rendered cards.
   Uses stored Bible profile data, Ark Grid/build text when present, and explicit party
   recipient valuation. UI layout is intentionally left to the existing party CSS. */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3';
const PARTY='lostark-hideout-party-assignments-v2';
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=v=>Math.round(num(v)).toLocaleString();
const pct=v=>`${v>=0?'+':''}${v.toFixed(2)}%`;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'null')||{characters:[]}}catch{return{characters:[]}}}
function roster(){return(load().characters||[]).filter(c=>c&&c.id)}
function partyState(){try{const a=JSON.parse(localStorage.getItem(PARTY)||'null');if(a&&Array.isArray(a.party1)&&Array.isArray(a.party2))return a}catch{}return{party1:[],party2:[]}}
function save(a){localStorage.setItem(PARTY,JSON.stringify(a))}
function profile(c){return c.profile||c.data||{}}
function field(p,...keys){for(const k of keys){if(p&&p[k]!=null)return p[k]}return ''}
function info(c){const p=profile(c),name=clean(field(p,'name','characterName'))||clean(c.name)||'Unknown';const cls=clean(field(p,'class','className','characterClass'))||'Unknown';const role=field(p,'role')|| (SUPPORTS.has(cls)?'Support':'DPS');return{name,cls,role:role==='Support'||SUPPORTS.has(cls)?'Support':'DPS',cp:num(field(p,'cp','combatPower')),ilvl:num(field(p,'ilvl','itemLevel')),url:c.url||field(p,'url','profileUrl')||''}}
function text(c){const p=profile(c),b=p.optimizerBuild||p.build||{};return clean([p.rawText,p.text,p.characterText,p.arkGridText,p.arkPassiveText,p.engravingsText,p.gemsText,b.text,b.arkGridText,b.arkPassiveText,b.engravingText,b.gemsText].filter(Boolean).join(' ')).toLowerCase()}
function buildFlags(c){const t=text(c);return{summoner:/summoner|서머너/.test(t),masterSummoner:/master summoner|상급 소환사/.test(t),communicationOverflow:/communication overflow|교감/.test(t),keenBlunt:/keen blunt weapon|keen blunt/.test(t),adrenaline:/adrenaline/.test(t),ambush:/ambush master|back attack|entropy/.test(t),front:/master brawler|front attack/.test(t),raidCaptain:/raid captain/.test(t),swiftness:/swiftness|specialization/.test(t),mana:/mana|mp recovery|boundless/.test(t),burst:/burst|igniter|full moon|punisher/.test(t)}}
/* 2026 synergy families. Values are deliberately applied once to eligible recipients,
   never as a generic "party has synergy" multiplier. Exact class mechanics remain data-driven. */
const SYN={
 damage:{classes:['Berserker','Shadowhunter','Scrapper','Sorceress','Sharpshooter','Summoner','Destroyer','Artillerist','Reaper','Slayer','Soul Eater','Breaker','Infighter','Demonic'],value:.06},
 crit:{classes:['Arcanist','Arcana','Deadeye','Gunslinger','Wardancer','Striker','Aeromancer'],value:.10},
 critDamage:{classes:['Glaivier','Glavier','Valkyrie'],value:.08},
 attackSpeed:{classes:['Wardancer','Striker'],value:.08},
 attackPower:{classes:['Soulfist','Machinist','Scouter'],value:.06},
 positional:{classes:['Deathblade','Gunlancer'],value:.04},
 mana:{classes:['Summoner'],value:.08}
};
function classMatch(cls,list){const x=cls.toLowerCase().replace(/\s+/g,'');return list.some(v=>x===v.toLowerCase().replace(/\s+/g,''))}
function provided(c){const i=info(c),out=[];for(const[k,v]of Object.entries(SYN))if(classMatch(i.cls,v.classes))out.push({type:k,value:v.value});return out}
function recipientWeight(c,type){const i=info(c),f=buildFlags(c);if(i.role==='Support')return 0;let w=1;
if(type==='crit'){if(f.keenBlunt||f.adrenaline||f.burst)w+=.35;if(/crit rate|100.?% crit|full crit/.test(text(c)))w-=.20}
if(type==='critDamage'){if(f.keenBlunt||f.burst)w+=.30}
if(type==='attackSpeed'){if(f.raidCaptain||f.swiftness)w+=.35}
if(type==='positional'){if(f.ambush||f.front)w+=.55;else w*=.65}
if(type==='attackPower'){if(f.burst||f.adrenaline)w+=.12}
if(type==='mana'){w=f.summoner||f.mana?1.55:.35}
if(type==='damage'){if(f.summoner)w+=.10}
return Math.max(0,w)}
function supportEffects(c){const cls=info(c).cls.toLowerCase();if(cls==='artist')return[{type:'supportAmplification',value:.10},{type:'mana',value:.08},{type:'attackSpeed',value:.04}];if(cls==='bard')return[{type:'supportAmplification',value:.10},{type:'attackPower',value:.06},{type:'attackSpeed',value:.035},{type:'mana',value:.12}];if(cls==='paladin')return[{type:'supportAmplification',value:.10},{type:'damage',value:.03}];if(cls==='valkyrie')return[{type:'supportAmplification',value:.095},{type:'attackSpeed',value:.06}];return[{type:'supportAmplification',value:.09}]}
function buildFactor(c){const p=profile(c),f=buildFlags(c);let factor=1;const raw=[p.arkGrid,p.arkPassive,p.engravings,p.gems,p.optimizerBuild,p.build].filter(Boolean);if(raw.length)factor+=.01;/* build data is a confidence modifier only until exact core effects are parsed */if(f.masterSummoner)factor+=.005;if(f.communicationOverflow)factor+=.005;return factor}
function partyScore(p){if(p.length!==4)return 0;const sup=p.filter(c=>info(c).role==='Support');if(sup.length!==1)return 0;const dps=p.filter(c=>info(c).role==='DPS');let total=dps.reduce((s,c)=>s+info(c).cp*buildFactor(c),0);if(!total)return 0;
for(const src of dps){for(const syn of provided(src)){const eligible=dps.filter(t=>t!==src);for(const target of eligible)total+=info(target).cp*buildFactor(target)*syn.value*recipientWeight(target,syn.type)}}
const support=sup[0];for(const e of supportEffects(support)){for(const target of dps)total+=info(target).cp*buildFactor(target)*e.value*recipientWeight(target,e.type)}
return total}
function resolve(a){const m=new Map(roster().map(c=>[c.id,c])),p1=[],p2=[],used=new Set();for(const id of a.party1||[]){if(m.has(id)&&p1.length<4&&!used.has(id)){p1.push(m.get(id));used.add(id)}}for(const id of a.party2||[]){if(m.has(id)&&p2.length<4&&!used.has(id)){p2.push(m.get(id));used.add(id)}}for(const c of m.values())if(!used.has(c.id)){if(p1.length<4){p1.push(c);used.add(c.id)}else if(p2.length<4){p2.push(c);used.add(c.id)}}return{p1,p2}}
function synergyLabels(p){const out=[];for(const c of p)for(const s of provided(c))if(!out.includes(s.type))out.push(s.type);const sup=p.find(c=>info(c).role==='Support');if(sup&&!out.includes('support amplification'))out.push('support amplification');if(p.some(c=>info(c).role==='DPS'&&buildFlags(c).summoner)&&!out.includes('mana'))out.push('mana');return out.map(x=>x==='supportAmplification'?'support amplification':x)}
function member(c){const i=info(c),color=i.role==='Support'?'#79c98b':'#e07a7a';return `<div class="party-member authoritative-member" draggable="true" data-character-id="${esc(c.id)}"><a class="party-character-link" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a><span class="party-class-label">${esc(i.cls)}</span><span class="party-role-label" style="color:${color} !important">${i.role}</span><span class="party-stat-label">iLvl ${fmt(i.ilvl)} · CP ${fmt(i.cp)}</span></div>`}
function render(a,extra=''){const h=document.querySelector('#suggestedParties');if(!h)return;const{p1,p2}=resolve(a),box=(n,k,p)=>`<article class="party authoritative-party" data-party="${k}"><div class="party-heading"><div><h3>${n}</h3><div class="party-score">Estimated potential: <strong>${fmt(partyScore(p))}</strong></div></div><div class="party-meta">${p.length}/4 · ${p.filter(c=>info(c).role==='Support').length} support</div></div><div class="party-dropzone authoritative-dropzone" data-drop-party="${k}">${p.map(member).join('')}</div><div class="party-synergies"><strong>Synergies:</strong> ${synergyLabels(p).join(', ')||'None'}</div></article>`;h.innerHTML=`<div class="authoritative-summary"><strong>Combined estimated potential: ${fmt(partyScore(p1)+partyScore(p2))}</strong><span> — Build-aware individual power with character-specific party synergy interactions.</span></div>${box('Party 1','party1',p1)}${box('Party 2','party2',p2)}${extra}`}
function combos(a,k){const out=[];function rec(i,p){if(p.length===k){out.push(p.slice());return}for(let j=i;j<=a.length-(k-p.length);j++)rec(j+1,p.concat(a[j]))}rec(0,[]);return out}
function optimize(){const list=roster();if(list.length<8){render(partyState(),'<div class="optimizer-result">Add at least 8 characters to optimize parties.</div>');return}const b=document.querySelector('#optimizeBtn');if(b){b.disabled=true;b.textContent='Optimizing…'}try{let best=null,high=-Infinity;/* Every valid 8-character selection and 4/4 split. No strongest-12 truncation. */for(const eight of combos(list,8)){for(const p1 of combos(eight,4)){const p2=eight.filter(c=>!p1.includes(c));if(p1.filter(c=>info(c).role==='Support').length!==1||p2.filter(c=>info(c).role==='Support').length!==1)continue;const s=partyScore(p1)+partyScore(p2);if(s>high){high=s;best={party1:p1.map(c=>c.id),party2:p2.map(c=>c.id)}}}}if(!best)throw Error('No valid arrangement with exactly one support per party.');save(best);render(best,`<div class="optimizer-result"><strong>Optimization complete.</strong> Best build-aware 8-character arrangement: <strong>${fmt(high)}</strong>.</div>`)}catch(e){console.error(e);render(partyState(),'<div class="optimizer-result">Optimization failed. Current parties preserved.</div>')}finally{if(b){b.disabled=false;b.textContent='Optimize Parties'}}}
function wire(h){h.addEventListener('dragstart',e=>{const m=e.target.closest('.party-member');if(m)e.dataTransfer.setData('text/plain',m.dataset.characterId)});h.addEventListener('dragover',e=>{if(e.target.closest('.party-dropzone'))e.preventDefault()});h.addEventListener('drop',e=>{const z=e.target.closest('.party-dropzone');if(!z)return;e.preventDefault();const id=e.dataTransfer.getData('text/plain'),a=partyState(),from=a.party1.includes(id)?'party1':a.party2.includes(id)?'party2':null,to=z.dataset.dropParty;if(!from)return;const target=e.target.closest('.party-member');if(target&&target.dataset.characterId!==id){const other=target.dataset.characterId,of=a.party1.includes(other)?'party1':a.party2.includes(other)?'party2':null;if(!of||of===from)return;const i=a[from].indexOf(id),j=a[of].indexOf(other);a[from][i]=other;a[of][j]=id}else if(to!==from&&a[to].length<4){a[from]=a[from].filter(x=>x!==id);a[to].push(id)}else return;const before=partyScore(resolve(partyState()).p1)+partyScore(resolve(partyState()).p2);save(a);const now=resolve(a),after=partyScore(now.p1)+partyScore(now.p2),delta=before?((after-before)/before)*100:0;render(a,`<div class="swap-impact ${delta>=0?'positive':'negative'}"><span class="swap-impact-number">${pct(delta)} combined estimated potential damage.</span></div>`)});}
function start(){const h=document.querySelector('#suggestedParties'),b=document.querySelector('#optimizeBtn');if(!h||!b||h.dataset.authoritativeOptimizer)return;h.dataset.authoritativeOptimizer='1';b.addEventListener('click',optimize);wire(h);render(partyState())}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();