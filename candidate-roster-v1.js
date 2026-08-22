(()=>{
'use strict';
const NEW_KEY='lostark-hideout-new-additions-v1',HIDDEN_KEY='lostark-hideout-hidden-v1',MAX=8;
const $=s=>document.querySelector(s),read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}},write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v==null||v===''?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
const newChars=()=>read(NEW_KEY,[]).filter(c=>c&&c.id),hidden=()=>new Set(read(HIDDEN_KEY,[]));
const setHidden=s=>write(HIDDEN_KEY,[...s]);
function canonicalClass(c){const p=c?.profile||{},raw=String(p.class||p.className||'').trim(),name=String(p.name||c?.name||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(name==='kittyjam')return'Guardianknight';try{return window.LostArkHideoutClassData?.canonical?.(raw)||raw||'Unknown'}catch{return raw||'Unknown'}}
function classIcon(cls,p){
  /* Bible's extracted SVG is authoritative. It is the same icon source used by the main-group importer and must win over Fandom/class-data fallbacks. */
  if(p?.classIcon)return p.classIcon;
  try{const x=window.LostArkHideoutClassData?.iconUrl?.(cls);if(x)return x}catch{}
  return '';
}
const itemText=x=>typeof x==='string'?x:[x?.name,x?.title,x?.label,x?.engraving,x?.skill,x?.description,x?.text].filter(Boolean).join(' ');
function buildProfileFor(c){try{const u=c?.url,cache=read('lostark-hideout-build-profiles-v3',{});if(u){if(cache[u])return cache[u];const n=String(u).replace(/\/$/,'');for(const[k,v]of Object.entries(cache))if(String(k).replace(/\/$/,'')===n)return v}return window.LostArkBuildProfilesAuthorityV1?.get?.(u)||window.LostArkBuildProfilesV3?.get?.(u)||window.LostArkBuildProfilesV2?.get?.(u)||null}catch{return null}}
function profileText(c){const p=c?.profile||{},b=buildProfileFor(c)||{};let full='';try{full=JSON.stringify({profile:p,build:b})}catch{}return String([full,...((b.engravings||[]).map(itemText)),...((p.engravings||[]).map(itemText)),...((b.arkPassive||[]).map(itemText)),Object.keys(p.arkPassive||{}).join(' '),b.text,b.raidText,p.loadout,p.loadoutText,p.buildText].filter(Boolean).join(' ')).toLowerCase().replace(/[’']/g,"'")}
function specialization(c){const p=c?.profile||{},b=buildProfileFor(c)||{};const explicit=p.spec||p.specialization||p.specName||p.buildSpec||b.spec||b.specialization||b.specName||b.buildSpec;if(explicit&&String(explicit).trim()!=='-')return String(explicit);const e=profileText(c);const rules=[[/master summoner/,'Master Summoner'],[/communication overflow/,'Communication Overflow'],[/pinnacle/,'Pinnacle'],[/\bcontrol\b/,'Control'],[/mayhem/,'Mayhem'],[/berserker'?s technique|berserker technique/,"Berserker's Technique"],[/surge/,'Surge'],[/remaining energy/,'Remaining Energy'],[/igniter/,'Igniter'],[/reflux/,'Reflux'],[/hunger/,'Hunger'],[/full moon harvester/,'Full Moon Harvester'],[/night.?s edge/,"Night's Edge"],[/predator/,'Predator'],[/punisher/,'Punisher'],[/deathblow/,'Deathblow'],[/esoteric flurry/,'Esoteric Flurry'],[/first intention/,'First Intention'],[/esoteric skill enhancement/,'Esoteric Skill Enhancement'],[/asura.?s path/,"Asura's Path"],[/brawl king storm/,'Brawl King Storm'],[/peacemaker/,'Peacemaker'],[/time to hunt/,'Time to Hunt'],[/empress.?s grace|grace of the empress/,'Grace of the Empress'],[/order\s+of\s+the\s+emperor|emperor'?s decree|emperor decree/,'Order of the Emperor'],[/barrage enhancement/,'Barrage Enhancement'],[/firepower enhancement/,'Firepower Enhancement'],[/enhanced weapon/,'Enhanced Weapon'],[/pistoleer/,'Pistoleer'],[/death strike/,'Death Strike'],[/loyal companion/,'Loyal Companion'],[/demonic impulse/,'Demonic Impulse'],[/perfect suppression/,'Perfect Suppression'],[/wind fury/,'Wind Fury'],[/drizzle/,'Drizzle'],[/full bloom/,'Full Bloom'],[/recurrence/,'Recurrence'],[/shock training/,'Shock Training'],[/taijutsu/,'Taijutsu'],[/desperate salvation/,'Desperate Salvation'],[/true courage/,'True Courage'],[/blessed aura/,'Blessed Aura'],[/judgment/,'Judgment'],[/liberator/,'Liberator'],[/shining knight/,'Shining Knight']];for(const[re,name]of rules)if(re.test(e))return name;const role=String(p.role||b.role||'').toLowerCase(),cls=canonicalClass(c);if(cls==='Artist')return /\brecurrence\b/i.test(e)?'Recurrence':'Full Bloom';if(cls==='Valkyrie')return /\bshining knight\b/i.test(e)?'Shining Knight':'Liberator';if(role==='support')return({Paladin:'Blessed Aura',Bard:'Desperate Salvation'})[cls]||'';return ''}
function normalizeNew(){const ns=newChars();let changed=false;for(const c of ns){if(!c.profile)continue;const cls=canonicalClass(c),icon=classIcon(cls,c.profile),spec=specialization(c);if(c.profile.class!==cls){c.profile.class=cls;changed=true}if(icon&&c.profile.classIcon!==icon){c.profile.classIcon=icon;changed=true}if(spec&&c.profile.spec!==spec){c.profile.spec=spec;changed=true}}if(changed)write(NEW_KEY,ns);return ns}
function card(c){const p=c.profile||{},name=p.name||c.name||'Unknown',cls=canonicalClass(c),spec=specialization(c)||'—',icon=classIcon(cls,p),h=hidden().has(c.id);return `<article class="character candidate-character new-addition-card" data-candidate-id="${esc(c.id)}"><div class="character-head"><div><h3 class="character-title">${icon?`<img class="class-icon" src="${esc(icon)}" alt="${esc(cls)}">`:''}<a class="character-bible-link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(name)}</a></h3><div class="class">${esc(spec)}</div><div class="character-group-tag">New Addition</div></div><div class="candidate-card-actions"><button class="candidate-hide" data-id="${esc(c.id)}" type="button">${h?'Show':'Hide'}</button><button class="candidate-remove" data-id="${esc(c.id)}" type="button">Remove</button></div></div><div class="stats"><div class="stat">iLvl<b>${fmt(p.ilvl)}</b></div><div class="stat">CP<b>${fmt(p.cp)}</b></div></div><div class="privacy-note">Bible profile loaded · ${esc(p.loadout||'')} · CP source: ${esc(p.cpSource||'')}</div>${h?'<div class="candidate-hidden-note">Hidden from optimization</div>':''}</article>`}
function updateHeaderCount(){const heading=document.querySelector('.comparison-panel .toolbar h2');if(!heading)return;let label=heading.querySelector('.new-addition-count');if(!label){label=document.createElement('span');label.className='new-addition-count';label.style.marginLeft='8px';label.style.fontSize='12px';label.style.fontWeight='600';label.style.opacity='.8';heading.appendChild(label)}const next=`New Additions ${newChars().length}/${MAX}`;if(label.textContent!==next)label.textContent=next;updateHideAllButton()}
function renderNew(){const panel=$('#comparison');if(!panel)return;const arr=normalizeNew();panel.innerHTML=arr.length?`<div id="newAdditionsRoster" class="roster">${arr.map(card).join('')}</div>`:'<div id="newAdditionsRoster" class="roster"><div class="empty-roster">No New Additions have been added.</div></div>';wireNew();updateHeaderCount()}
function prepareControls(){const input=$('#comparisonUrlInput'),find=$('#comparisonFindBtn');if(find){find.textContent='Add Character';find.type='button';find.onclick=()=>addNew(input?.value.trim()||'')}if(input)input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addNew(input.value.trim())}};const compare=$('#compareBtn');if(compare)compare.style.display='none';const hiddenInput=$('#testCharacterUrl');if(hiddenInput)hiddenInput.remove()}
async function addNew(url){if(newChars().length>=MAX)return alert(`New Additions is limited to ${MAX} characters.`);if(!url)return;if(newChars().some(c=>String(c.url).toLowerCase()===String(url).toLowerCase()))return alert('That character is already a New Addition.');let parsed;try{parsed=window.parseBibleUrl?.(url)}catch{}if(!parsed){try{const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='lostark.bible')throw Error();const p=u.pathname.split('/').filter(Boolean);if(p.length<3||p[0].toLowerCase()!=='character')throw Error();parsed={url:u.href,region:p[1],name:decodeURIComponent(p.slice(2).join('/'))}}catch{return alert('Enter a valid lostark.bible character URL.')}}const candidate={id:crypto.randomUUID(),...parsed,profile:null};if(typeof window.fetchCharacter!=='function')return alert('Character profile importer is unavailable.');const find=$('#comparisonFindBtn');if(find)find.disabled=true;try{candidate.profile=await window.fetchCharacter(candidate);if(candidate.profile){candidate.profile.class=canonicalClass(candidate);candidate.profile.classIcon=classIcon(candidate.profile.class,candidate.profile);candidate.profile.spec=specialization(candidate)}delete candidate.profileError;const ns=newChars();ns.push(candidate);write(NEW_KEY,ns);renderNew();refreshCandidateBuilds()}catch(e){alert(`Character retrieval failed: ${e.message||e}`)}finally{if(find)find.disabled=false}}
let buildRefreshRunning=false;
function refreshCandidateBuilds(){if(buildRefreshRunning)return;const refresh=window.LostArkBuildProfilesV3?.refresh;if(typeof refresh!=='function')return;const ns=newChars().filter(c=>c?.url);if(!ns.length)return;const cache=read('lostark-hideout-build-profiles-v3',{}),missing=ns.some(c=>{const u=String(c.url).replace(/\/$/,'');return !cache[c.url]&&!cache[u]&&!Object.keys(cache).some(k=>String(k).replace(/\/$/,'')===u)});if(!missing)return;buildRefreshRunning=true;let original=null;try{original=localStorage.getItem('lostark-hideout-private-v3');localStorage.setItem('lostark-hideout-private-v3',JSON.stringify({characters:ns}));Promise.resolve(refresh()).then(()=>{if(original===null)localStorage.removeItem('lostark-hideout-private-v3');else localStorage.setItem('lostark-hideout-private-v3',original);buildRefreshRunning=false;renderNew();}).catch(()=>{if(original===null)localStorage.removeItem('lostark-hideout-private-v3');else localStorage.setItem('lostark-hideout-private-v3',original);buildRefreshRunning=false})}catch{if(original===null)localStorage.removeItem('lostark-hideout-private-v3');else localStorage.setItem('lostark-hideout-private-v3',original);buildRefreshRunning=false}}
function toggleHidden(id){const s=hidden();s.has(id)?s.delete(id):s.add(id);setHidden(s);applyHiddenState();patchMain()}
/* Update the affected cards in place. Re-rendering the whole list replaced each
   card with a fresh node that already carried .candidate-hidden, so the opacity
   transition never ran and New Additions snapped instead of fading like the Main
   Group cards, which are only class-toggled. */
function applyHiddenState(){
 const hs=hidden();
 document.querySelectorAll('#newAdditionsRoster .candidate-character').forEach(el=>{
  const id=el.dataset.candidateId;if(!id)return;
  const isHidden=hs.has(id);
  el.classList.toggle('candidate-hidden',isHidden);
  const b=el.querySelector('.candidate-hide');if(b)b.textContent=isHidden?'Show':'Hide';
  const note=el.querySelector('.candidate-hidden-note');
  if(isHidden&&!note){const n=document.createElement('div');n.className='candidate-hidden-note';n.textContent='Hidden from optimization';el.appendChild(n)}
  else if(!isHidden&&note)note.remove();
 });
 updateHideAllButton();
}
function toggleAllHidden(){
 const ids=newChars().map(c=>c.id),s=hidden();
 const allHidden=ids.length>0&&ids.every(id=>s.has(id));
 for(const id of ids)allHidden?s.delete(id):s.add(id);
 setHidden(s);applyHiddenState();patchMain();
}
function updateHideAllButton(){
 const heading=document.querySelector('.comparison-panel .toolbar h2');if(!heading)return;
 const ids=newChars().map(c=>c.id);
 let btn=heading.querySelector('.new-addition-toggle-all');
 if(!ids.length){btn?.remove();return}
 if(!btn){btn=document.createElement('button');btn.type='button';btn.className='new-addition-toggle-all';btn.onclick=toggleAllHidden;heading.appendChild(btn)}
 const hs=hidden();
 btn.textContent=ids.every(id=>hs.has(id))?'Show all':'Hide all';
}
function removeNew(id){write(NEW_KEY,newChars().filter(c=>c.id!==id));const s=hidden();s.delete(id);setHidden(s);renderNew()}
function wireNew(){document.querySelectorAll('.candidate-hide').forEach(b=>b.onclick=()=>toggleHidden(b.dataset.id));document.querySelectorAll('.candidate-remove').forEach(b=>b.onclick=()=>removeNew(b.dataset.id))}
function mainState(){try{return JSON.parse(localStorage.getItem('lostark-hideout-private-v3')||'null')||{characters:[]}}catch{return{characters:[]}}}
function patchMain(){const roster=$('#roster');if(!roster)return;const hs=hidden();roster.querySelectorAll('.character:not(.candidate-character)').forEach(el=>{const id=el.querySelector('.remove-character')?.dataset.id;if(!id)return;let tag=el.querySelector('.character-group-tag');if(!tag){const cls=el.querySelector('.class');tag=document.createElement('div');tag.className='character-group-tag';tag.textContent='Main Group';cls?.after(tag)}let actions=el.querySelector('.character-head .candidate-card-actions');if(!actions){actions=document.createElement('div');actions.className='candidate-card-actions';const rem=el.querySelector('.remove-character');if(rem)actions.appendChild(rem);const b=document.createElement('button');b.type='button';b.className='candidate-hide';b.dataset.id=id;actions.appendChild(b);el.querySelector('.character-head')?.appendChild(actions)}const b=actions.querySelector('.candidate-hide');if(b){b.textContent=hs.has(id)?'Show':'Hide';b.onclick=()=>toggleHidden(id)}el.classList.toggle('candidate-hidden',hs.has(id))})}
function allCharacters(){return [...(mainState().characters||[]),...normalizeNew()].filter(c=>c&&c.id)}
function eligibleCharacters(){const hs=hidden();return allCharacters().filter(c=>!hs.has(c.id))}
function expose(){window.LostArkCandidateRoster={getAll:allCharacters,getEligible:eligibleCharacters,isHidden:id=>hidden().has(id),getNew:newChars,MAX_NEW:MAX}}
function styles(){if($('#candidate-roster-style'))return;const s=document.createElement('style');s.id='candidate-roster-style';s.textContent='.character.candidate-character,#roster .character{transition:opacity .22s ease}@media (prefers-reduced-motion:reduce){.character.candidate-character,#roster .character{transition:none}}.new-addition-toggle-all{margin-left:8px;font:inherit;font-size:9px;font-weight:700;padding:3px 7px;line-height:1.2;border-radius:6px;border:1px solid #46516a;background:#1a2230;color:#edf2fb;cursor:pointer;vertical-align:middle}.new-addition-toggle-all:hover{background:#222c3d}.character-group-tag{display:inline-block;margin-top:5px;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.04em;background:rgba(120,160,220,.14);color:#8fb4ef}.candidate-card-actions{display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap}.candidate-card-actions button{font:inherit;cursor:pointer;white-space:nowrap}.candidate-card-actions .candidate-hide,.candidate-card-actions .candidate-remove,.candidate-card-actions .remove-character{font-size:10px;padding:5px 8px;line-height:1.2;border-radius:7px}.candidate-card-actions .candidate-hide{border:1px solid #46516a;background:#1a2230;color:#edf2fb}.candidate-card-actions .candidate-remove,.candidate-card-actions .remove-character{border:1px solid #4a3340;background:#20151c;color:#efb0bb}.candidate-hidden{opacity:.52}.candidate-hidden-note{margin-top:10px;color:#e0a35b;font-size:11px}.new-addition-card{margin:0}.new-addition-card .class-icon{width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-right:5px;filter:none}';document.head.appendChild(s)}
/* Refresh Profiles only ever re-imported the Main Group, so New Addition
   profiles kept whatever CP the import stored when they were first added --
   including values from before the CP extraction was fixed. Re-import them
   through the same path. Connector calls are globally paced, so these queue
   behind the Main Group rather than tripping Bible's rate limit. */
let candidateRefreshRunning=false;
async function refreshCandidates(){
 if(candidateRefreshRunning||typeof window.fetchCharacter!=='function')return;
 const list=newChars();if(!list.length)return;
 candidateRefreshRunning=true;
 let ok=0,failed=0,skipped=0;
 /* Same freshness rule as the Main Group: Bible is slow and rate-limits bursts,
    so a profile fetched minutes ago is not worth re-fetching. */
 const FRESH_MS=10*60*1000;
 const fresh=c=>{const t=Date.parse(c?.profile?.retrievedAt||'');return c?.profile&&Number.isFinite(t)&&(Date.now()-t)<FRESH_MS};
 for(const c of list){
  if(!c?.url)continue;
  if(!window.__lostarkForceRefresh&&fresh(c)){skipped++;continue}
  try{const p=await window.fetchCharacter(c);
   if(p){p.class=canonicalClass({...c,profile:p});p.classIcon=classIcon(p.class,p);p.spec=specialization({...c,profile:p});c.profile=p;delete c.profileError;ok++}
  }catch(e){c.profileError=String(e?.message||e);failed++}
 }
 write(NEW_KEY,list);renderNew();applyHiddenState();
 candidateRefreshRunning=false;
 const status=document.getElementById('status');
 if(status)status.textContent=`${status.textContent} New Additions: refreshed ${ok}${failed?`, ${failed} failed`:''}${skipped?`, ${skipped} already up to date`:''}.`;
}
function wireCandidateRefresh(){const btn=document.getElementById('refreshBtn');if(!btn||btn.dataset.candidateRefresh)return;btn.dataset.candidateRefresh='1';
 btn.addEventListener('click',()=>{
  /* wait for the Main Group pass to report before appending our own result */
  const status=document.getElementById('status');const started=Date.now();
  const poll=()=>{if(!status||/^Refreshed /i.test(status.textContent||'')||Date.now()-started>180000)refreshCandidates();else setTimeout(poll,500)};
  setTimeout(poll,500);
 });
}
function init(){styles();expose();prepareControls();renderNew();patchMain();updateHeaderCount();refreshCandidateBuilds();wireCandidateRefresh()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();