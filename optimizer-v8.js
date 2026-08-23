/* Lost Ark Party — build-aware party optimizer v11. */
(()=>{
const STORAGE='lostark-hideout-private-v3', PARTY='lostark-hideout-party-assignments-v2';
const CONNECTOR='https://lostark-bible-connector.seraph0226.workers.dev/character';
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(Number(n)||0).toLocaleString();
const pct=n=>`${n>=0?'+':''}${n.toFixed(2)}%`;
function state(){try{return JSON.parse(localStorage.getItem(STORAGE)||'null')||{characters:[]}}catch{return{characters:[]}}}
function chars(){return(state().characters||[]).filter(c=>c&&c.profile)}
function assignments(){try{const a=JSON.parse(localStorage.getItem(PARTY)||'null');if(a&&Array.isArray(a.party1)&&Array.isArray(a.party2))return a}catch{}return{party1:[],party2:[]}}
function save(a){localStorage.setItem(PARTY,JSON.stringify(a))}
function identity(c){const p=c.profile||{};const cls=String(p.class||'Unknown').trim();const role=p.role==='Support'||SUPPORTS.has(cls)?'Support':'DPS';return{name:String(p.name||c.name||'').trim(),cls,role,il:Number(p.ilvl)||0,cp:Number(p.cp)||0,url:c.url}}
function text(c){const b=c.profile?.optimizerBuild||{};return String(b.text||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().toLowerCase()}
function has(t,...xs){return xs.some(x=>t.includes(x))}
function build(c){const t=text(c),x=identity(c);return{
  critNeed: x.cls==='Summoner' || has(t,'adrenaline','keen blunt weapon','crit rate'),
  critCap: /(?:100|full)\s*%?\s*crit|crit rate.{0,30}100/.test(t),
  critDamageNeed:has(t,'keen blunt','crit damage','burst'),
  attackSpeedNeed:has(t,'raid captain','mass increase','attack speed','swift'),
  positionalNeed:has(t,'ambush master','master brawler','back attack','front attack','entropy'),
  manaNeed:x.cls==='Summoner'||has(t,'mana','max mp','nightmare','boundless'),
  supportNeed:has(t,'grudge','adrenaline','keen blunt','burst'),
  arkGrid:t.includes('ark grid'),
  orderCores:(t.match(/(?:sun|moon|star)[^.;]{0,80}(?:order core|core)/gi)||[]).slice(0,8),
  chaosCores:(t.match(/(?:sun|moon|star)[^.;]{0,80}chaos[^.;]{0,80}/gi)||[]).slice(0,8)
}}
const SYN={
 damage:{classes:['Berserker','Slayer','Destroyer','Gunlancer','Scrapper','Sorceress','Summoner','Sharpshooter','Artillerist','Shadowhunter','Reaper','Soul Eater','Souleater'],v:.06},
 crit:{classes:['Arcanist','Arcana','Gunslinger','Deadeye','Wardancer','Striker','Aeromancer'],v:.10},
 attackSpeed:{classes:['Wardancer','Striker'],v:.08},
 positional:{classes:['Deathblade','Gunlancer'],v:.12},
 attackPower:{classes:['Soulfist','Machinist'],v:.06},
 critDamage:{classes:['Glavier','Glaivier'],v:.06}
};
function classSyn(c){const x=identity(c),o={};for(const[k,z]of Object.entries(SYN))if(z.classes.includes(x.cls))o[k]=z.v;return o}
function recipient(c,s){const b=build(c);if(s==='crit')return b.critCap?.80:(b.critNeed?1.30:0.75);if(s==='critDamage')return b.critDamageNeed?1.30:.85;if(s==='attackSpeed')return b.attackSpeedNeed?1.25:.75;if(s==='positional')return b.positionalNeed?1.40:.60;if(s==='mana')return b.manaNeed?1.45:.20;if(s==='supportAmplification')return b.supportNeed?1.15:1;return 1}
function support(c){const cls=identity(c).cls;if(cls==='Bard')return{supportAmplification:.095,attackSpeed:.08,critDamage:.03};if(cls==='Artist')return{supportAmplification:.092,mana:.06,attackSpeed:.04};if(cls==='Paladin')return{supportAmplification:.10};if(cls==='Valkyrie')return{supportAmplification:.095,attackSpeed:.06};return{supportAmplification:.09}}
function score(p){if(p.length!==4)return 0;const sup=p.filter(c=>identity(c).role==='Support');if(sup.length!==1)return 0;const dps=p.filter(c=>identity(c).role==='DPS');const base=p.reduce((n,c)=>n+identity(c).cp,0);if(!base)return 0;let total=0;for(const c of dps)total+=identity(c).cp;
// Score DPS individually. Party synergies are additive to the receiving character,
// not a generic multiplier on the whole party. This prevents synergy inflation.
let gain=0;for(const src of dps){for(const[k,w]of Object.entries(classSyn(src))){for(const dst of dps)if(dst!==src)gain+=w*recipient(dst,k)*identity(dst).cp}}
const se=support(sup[0]);for(const[k,w]of Object.entries(se))for(const dst of dps)gain+=w*recipient(dst,k)*identity(dst).cp;
// Ark Grid is a build-defining system: use presence of actual core data as a
// small confidence/tie-break term, never as fabricated damage.
const confidence=dps.reduce((n,c)=>n+(build(c).arkGrid?1:0),0)/Math.max(1,dps.length);
return total+gain+total*confidence*.01}
function resolve(a){const m=new Map(chars().map(c=>[c.id,c])),p1=[],p2=[],used=new Set();for(const id of a.party1||[]){if(m.has(id)&&!used.has(id)&&p1.length<4){p1.push(m.get(id));used.add(id)}}for(const id of a.party2||[]){if(m.has(id)&&!used.has(id)&&p2.length<4){p2.push(m.get(id));used.add(id)}}for(const c of m.values())if(!used.has(c.id)){if(p1.length<4){p1.push(c);used.add(c.id)}else if(p2.length<4){p2.push(c);used.add(c.id)}}return{p1,p2}}
function syn(p){const out=[];for(const c of p){for(const k of Object.keys(classSyn(c)))if(!out.includes(k))out.push(k);if(identity(c).role==='Support'&&!out.includes('support amplification'))out.push('support amplification');if(identity(c).cls==='Artist'&&!out.includes('mana'))out.push('mana')}return out.map(s=>s==='supportAmplification'?'support amplification':s==='attackPower'?'attack power':s)}
function member(c){const x=identity(c),col=x.role==='DPS'?'#e07a7a':'#79c98b';return `<div class="party-member authoritative-member" draggable="true" data-character-id="${esc(c.id)}"><a class="party-character-link" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.name)}</a><span class="party-class-label">${esc(x.cls)}</span><span class="party-role-label" style="color:${col} !important">${x.role}</span><span class="party-stat-label">iLvl ${x.il} · CP ${x.cp}</span></div>`}
function render(a,msg=''){const h=document.querySelector('#suggestedParties');if(!h)return;const{p1,p2}=resolve(a),box=(n,k,p)=>`<article class="party authoritative-party" data-party="${k}"><div class="party-heading"><div><h3>${n}</h3><div class="party-score">Estimated potential: <strong>${fmt(score(p))}</strong></div></div><div class="party-meta">${p.length}/4 · ${p.filter(c=>identity(c).role==='Support').length} support</div></div><div class="party-dropzone authoritative-dropzone" data-drop-party="${k}">${p.map(member).join('')}</div><div class="party-synergies"><strong>Synergies:</strong> ${syn(p).join(', ')||'None'}</div></article>`;h.innerHTML=`<div class="authoritative-summary"><strong>Combined estimated potential: ${fmt(score(p1)+score(p2))}</strong><span> — Build-aware individual power with character-specific party synergy interactions.</span></div>${box('Party 1','party1',p1)}${box('Party 2','party2',p2)}${msg}`}
function combinations(a,k){const out=[];function r(i,p){if(p.length===k){out.push(p.slice());return}for(let j=i;j<=a.length-(k-p.length);j++)r(j+1,p.concat(a[j]))}r(0,[]);return out}
async function enrich(){const s=state();for(const c of s.characters||[]){if(!c.profile)continue;try{const r=await fetch(`${CONNECTOR}?url=${encodeURIComponent(c.url)}`,{cache:'no-store'});if(!r.ok)continue;const d=await r.json();const raw=String(d.html||d.characterHtml||d.content||'');c.profile.optimizerBuild={text:raw,updatedAt:new Date().toISOString()}}catch(e){console.warn('optimizer enrichment failed',c.name,e)}}localStorage.setItem(STORAGE,JSON.stringify(s))}
async function optimize(){const b=document.querySelector('#optimizeBtn'),list=chars();if(list.length<8){render(assignments(),'<div class="optimizer-result">Add at least 8 characters to optimize parties.</div>');return}if(b){b.disabled=true;b.textContent='Optimizing…'}try{await enrich();const fresh=chars();let best=null,high=-Infinity;for(const eight of combinations(fresh,8))for(const p1 of combinations(eight,4)){const p2=eight.filter(c=>!p1.includes(c));if(p1.filter(c=>identity(c).role==='Support').length!==1||p2.filter(c=>identity(c).role==='Support').length!==1)continue;const s=score(p1)+score(p2);if(s>high){high=s;best={party1:p1.map(c=>c.id),party2:p2.map(c=>c.id)}}}if(!best)throw Error('No valid 4/4 arrangement with one support per party.');save(best);render(best,`<div class="optimizer-result"><strong>Optimization complete.</strong> Best build-aware 8-character arrangement: <strong>${fmt(high)}</strong>.</div>`)}catch(e){console.error(e);render(assignments(),'<div class="optimizer-result">Optimization failed. Current parties preserved.</div>')}finally{if(b){b.disabled=false;b.textContent='Optimize Parties'}}}
function wire(h){h.addEventListener('dragstart',e=>{const m=e.target.closest('.party-member');if(m)e.dataTransfer.setData('text/plain',m.dataset.characterId)});h.addEventListener('dragover',e=>{if(e.target.closest('.party-dropzone'))e.preventDefault()});h.addEventListener('drop',e=>{const z=e.target.closest('.party-dropzone');if(!z)return;e.preventDefault();const id=e.dataTransfer.getData('text/plain'),a=assignments(),from=a.party1.includes(id)?'party1':a.party2.includes(id)?'party2':null,to=z.dataset.dropParty;if(!from)return;const target=e.target.closest('.party-member');if(target&&target.dataset.characterId!==id){const other=target.dataset.characterId,of=a.party1.includes(other)?'party1':a.party2.includes(other)?'party2':null;if(!of||of===from)return;const i=a[from].indexOf(id),j=a[of].indexOf(other);a[from][i]=other;a[of][j]=id}else if(to!==from&&a[to].length<4){a[from]=a[from].filter(x=>x!==id);a[to].push(id)}else return;const old=resolve(assignments()),before=score(old.p1)+score(old.p2);save(a);const now=resolve(a),after=score(now.p1)+score(now.p2),delta=before?((after-before)/before)*100:0;render(a,`<div class="swap-impact ${delta>=0?'positive':'negative'}"><span class="swap-impact-number">${pct(delta)} combined estimated potential damage.</span></div>`)})}
function start(){const h=document.querySelector('#suggestedParties'),b=document.querySelector('#optimizeBtn');if(!h||!b||h.dataset.optimizerV11)return;h.dataset.optimizerV11='1';b.addEventListener('click',optimize);wire(h);render(assignments())}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();})();