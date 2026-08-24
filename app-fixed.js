const STORAGE_KEY = 'lostark-hideout-private-v3';
const LEGACY_KEY = 'lostark-hideout-private-v2';
const REMOVE_CONFIRM_KEY = 'lostark-hideout-skip-remove-confirm-v1';
const MAX_CHARACTERS = 8;
const BIBLE_CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';
const CLASS_NAMES = ['Berserker','Destroyer','Gunlancer','Paladin','Slayer','Warrior','Arcanist','Arcana','Summoner','Sorceress','Bard','Gunslinger','Deadeye','Sharpshooter','Artillerist','Machinist','Striker','Wardancer','Scrapper','Soulfist','Glavier','Glaivier','Deathblade','Shadowhunter','Reaper','Artist','Aeromancer','Breaker','Valkyrie','Soul Eater','Souleater','Wildsoul','Guardianknight'];
const CLASS_ENGRAVINGS = {Artist:{support:['Full Bloom'],dps:['Recurrence']},Bard:{support:['Desperate Salvation'],dps:['True Courage']},Paladin:{support:['Blessed Aura'],dps:['Judgment']},Valkyrie:{support:['Blessed Aura'],dps:['Judgment']}};
const SUPPORT_ENGRAVINGS=['Expert','Awakening','Drops of Ether','Heavy Armor','Vital Point Hit','Magick Stream','Max MP Increase'];
const DPS_ENGRAVINGS=['Grudge','Adrenaline','Keen Blunt Weapon','Raid Captain','Master Brawler','Ambush Master','Cursed Doll','Mass Increase','Hit Master'];
const $=s=>document.querySelector(s);
function escapeHtml(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function formatNumber(v){return v==null||v===''?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:2})}
function setStatus(m){const e=$('#status');if(e)e.textContent=m}
function loadState(){try{const c=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(c&&Array.isArray(c.characters))return c;const l=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');if(l&&Array.isArray(l.characters))return l}catch{}return{characters:[],testCharacter:null}}
const state=loadState();function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function parseBibleUrl(v){try{const u=new URL(v);if(u.protocol!=='https:'||u.hostname!=='lostark.bible')return null;const p=u.pathname.split('/').filter(Boolean);if(p.length<3||p[0].toLowerCase()!=='character')return null;return{url:u.href,region:p[1],name:decodeURIComponent(p.slice(2).join('/'))}}catch{return null}}
function makeDocument(h){if(typeof h!=='string'||!h.trim())throw Error('Bible returned an empty character page.');return new DOMParser().parseFromString(h,'text/html')}
function normalizedText(v){return String(v||'').replace(/\s+/g,' ').trim()}
function getLines(d){return(d.body?.textContent||'').split(/\n+/).map(normalizedText).filter(Boolean)}
function numberFrom(v){const m=String(v??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m&&Number.isFinite(Number(m[0]))?Number(m[0]):null}
function findItemLevel(d,l){for(let i=0;i<l.length;i++)if(/^Item Level$/i.test(l[i]))for(let j=i+1;j<Math.min(l.length,i+8);j++){const n=numberFrom(l[j]);if(n>=1000&&n<=2000)return n}const m=normalizedText(d.body?.textContent).match(/Item Level\s*(\d{3,4}(?:\.\d+)?)/i);return m?numberFrom(m[1]):null}
function classFromText(text){const t=normalizedText(text);for(const n of [...CLASS_NAMES].sort((a,b)=>b.length-a.length)){const re=new RegExp(`(?:^|[^A-Za-z])${n.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}(?:[^A-Za-z]|$)`,'i');if(re.test(t))return n}return null}
/* class-authority-v1.js resolves the class from the Bible header and injects it.
   Honour that verdict verbatim: it is authoritative, and taking it as-is means
   newer classes do not also have to be listed in CLASS_NAMES below. */
function findClass(d,l,fallback){const authoritative=d.querySelector?.('[data-bible-authoritative-class]')?.getAttribute('data-bible-authoritative-class');if(authoritative&&authoritative.trim())return authoritative.trim();for(const el of d.querySelectorAll('[alt],[title],[aria-label],[data-class],[data-character-class]'))for(const attr of ['data-class','data-character-class','aria-label','title','alt']){const v=el.getAttribute?.(attr);const hit=classFromText(v);if(hit)return hit}for(const line of l.slice(0,40)){const hit=classFromText(line);if(hit)return hit}const body=normalizedText(d.body?.textContent||''),name=fallback?.toLowerCase(),start=name?body.toLowerCase().indexOf(name):-1,local=start>=0?body.slice(Math.max(0,start-500),start+500):'',localHit=classFromText(local);if(localHit)return localHit;for(const s of d.scripts||[]){const hit=classFromText(s.textContent||'');if(hit)return hit}return 'Unknown'}
function findProfileName(d,f){const c=[...d.querySelectorAll('h1')].map(e=>normalizedText(e.textContent)).filter(Boolean);return c[0]||f||'Unknown'}
function candidateNumbers(t){return(String(t).match(/\b\d{4,5}(?:\.\d{1,2})?\b/g)||[]).map(numberFrom).filter(n=>n>=4000&&n<=20000)}
function chooseSection(s,source){if(/chaos\s*dungeon/i.test(s)&&!/estimated\s*raid|current\s*loadout\s*\(\s*raid\s*\)/i.test(s))return null;const n=candidateNumbers(s);if(!n.length)return null;let score=/combat\s*power/i.test(s)?100:0;if(/estimated\s*raid|estimated_raid|estimatedraid|raid_merged/i.test(s))score+=80;if(/current\s*loadout\s*\(\s*raid\s*\)/i.test(s))score+=70;if(/chaos\s*dungeon/i.test(s))score-=1000;return score>=0?{value:n[0],source}:null}
/* raid-cp-fix.js prepends an authoritative "<loadout> Combat Power <value>" marker
   read straight from the Bible payload. Trust it verbatim: it is exact, and unlike
   the magnitude scan below it imposes no floor, so sub-4000 CP survives. */
function markerRaidCP(d){const t=normalizedText(d.body?.textContent||'');const m=t.match(/(Estimated Raid Loadout|Current Loadout \(Raid\)) Combat Power ([0-9]+(?:\.[0-9]+)?)/);if(!m)return null;const v=numberFrom(m[2]);return Number.isFinite(v)&&v>0?{value:v,source:m[1]}:null}
/* Same loadout-anchored read straight from the Bible payload, so a correct CP is
   still found if the marker is absent. Also floor-free. The magnitude scan below
   stays only as a last resort; it picks the first 4000-20000 number it sees and
   will happily return a bracelet stat, so it must never run first. */
function structuredRaidCP(d){const html=(d.documentElement?.outerHTML||'')+[...d.scripts].map(s=>s.textContent||'').join('');const score='combatPower:\\s*\\{\\s*id:\\s*\\d+\\s*,\\s*score:\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\}';const near=cls=>html.match(new RegExp('classification:\\s*"'+cls+'"[\\s\\S]{0,5000}?'+score,'i'));const est=near('raid_merged');if(est)return{value:numberFrom(est[1]),source:'Estimated Raid Loadout'};const cur=near('raid')||near('most_recent_raid');if(cur)return{value:numberFrom(cur[1]),source:'Current Loadout (Raid)'};return null}
function extractRaidCP(d){const marked=markerRaidCP(d)||structuredRaidCP(d);if(marked)return marked;const sources=[normalizedText(d.body?.textContent),d.documentElement?.outerHTML||'',...([...d.scripts].map(s=>s.textContent||''))];for(const src of sources)for(const label of ['Estimated Raid Loadout','estimated_raid','estimatedRaid','raid_merged']){let i=0;while((i=src.toLowerCase().indexOf(label.toLowerCase(),i))>=0){const r=chooseSection(src.slice(i,i+5000),'Estimated Raid Loadout');if(r)return r;i+=label.length}}for(const src of sources)for(const label of ['Current Loadout (Raid)','current_raid','most_recent_raid']){let i=0;while((i=src.toLowerCase().indexOf(label.toLowerCase(),i))>=0){const r=chooseSection(src.slice(i,i+5000),'Current Loadout (Raid)');if(r)return r;i+=label.length}}return{value:null,source:'No acceptable raid CP found'}}
function extractPresetSnippet(d,preferred){const sources=[d.documentElement?.outerHTML||'',normalizedText(d.body?.textContent||''),...([...d.scripts].map(s=>s.textContent||''))];const labels=preferred==='Estimated Raid Loadout'?['Estimated Raid Loadout','estimated_raid','estimatedRaid','raid_merged']:['Current Loadout (Raid)','current_raid','most_recent_raid'];for(const src of sources)for(const label of labels){const i=src.toLowerCase().indexOf(label.toLowerCase());if(i>=0)return src.slice(i,i+12000)}return ''}
function detectRole(snippet,cls){if(!snippet)return 'Unknown';const s=snippet.toLowerCase(),spec=CLASS_ENGRAVINGS[cls];if(spec){if(spec.support.some(x=>s.includes(x.toLowerCase())))return 'Support';if(spec.dps.some(x=>s.includes(x.toLowerCase())))return 'DPS'}let support=0,dps=0;for(const x of SUPPORT_ENGRAVINGS)if(s.includes(x.toLowerCase()))support++;for(const x of DPS_ENGRAVINGS)if(s.includes(x.toLowerCase()))dps++;if(support>=2&&support>dps)return 'Support';if(dps>=2&&dps>support)return 'DPS';return 'Unknown'}
function extractBibleClassIcon(d,region,name){try{const target=`/character/${region}/${encodeURIComponent(name)}`.toLowerCase();for(const a of d.querySelectorAll('a[href]')){const href=(a.getAttribute('href')||'').toLowerCase();if(href===target||decodeURIComponent(href)===`/character/${region}/${name}`.toLowerCase()){const svg=a.querySelector('svg.size-14,svg[class*="size-14"]');if(svg)return svg.outerHTML}}}catch{}return ''}
function svgDataUrl(svg){return svg?`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`:''}
/* Bible stores tripod choices as bare indices per skill id, with no names
   anywhere in the payload, e.g. {id:20160,level:11,tripods:[3,3,2]}. Keep the
   raw map so scoring can test specific tripod choices -- Summoner's Shurdi mana
   tripod, for one -- since there is no other way to detect them. */
function extractSkillTripods(html){const map={};try{for(const m of String(html||'').matchAll(/\{id:(\d+),[^{}]*?tripods:\[([0-9,]*)\]/g)){const arr=m[2]?m[2].split(',').map(Number):[];if(arr.length)map[m[1]]=arr}}catch{}return map}
/* Accessory and bracelet affixes that amplify what this character gives allies.
   These never affect CP -- CP comes from the loadout panel -- but they directly
   scale a support's buff output, which a general power number cannot express.
   Values are de-duplicated: the page renders a loadout more than once, so the
   same affix appears repeatedly and must not be counted twice. */
function extractAllyEffects(d){const t=normalizedText(d.body?.textContent||'');
 const sum=re=>{const seen=new Set();for(const m of t.matchAll(re)){const v=Number(m[1]);if(Number.isFinite(v))seen.add(v)}return[...seen].reduce((a,b)=>a+b,0)};
 return{allyDamage:sum(/Ally Damage Enhancement Effect \+([\d.]+)%/g),allyAtkPower:sum(/Ally Atk\. Power Enhancement Effect \+([\d.]+)%/g)}}
/* Ark Passive Enlightenment node names. The class engraving that defines a
   character's specialization is one of these, and nothing else the import stored
   carried it -- the spec rules had no text at all to match against, so they all
   failed and a hardcoded per-class fallback answered instead. Its tier position
   varies by class, so store the names and let the existing rules identify it. */
function extractEnlightenment(d){const t=normalizedText(d.body?.textContent||'');
 const i=t.indexOf('Enlightenment');if(i<0)return[];
 let seg=t.slice(i+'Enlightenment'.length);
 const ends=[' Evolution ',' Leap ',' Paradise',' Cards',' Skills',' Engravings'].map(k=>seg.indexOf(k)).filter(x=>x>0);
 if(ends.length)seg=seg.slice(0,Math.min(...ends));
 return[...seg.matchAll(/T\d\s+([A-Za-z][A-Za-z'’:.\- ]*?)\s+Lv\.\s*\d+/g)].map(m=>m[1].trim()).filter(Boolean)}
function parseProfile(html,fallback,region){const d=makeDocument(html),l=getLines(d),cp=extractRaidCP(d),cls=findClass(d,l,fallback),classIcon=svgDataUrl(extractBibleClassIcon(d,region,fallback));return{skillTripods:extractSkillTripods(html),allyEffects:extractAllyEffects(d),enlightenment:extractEnlightenment(d),name:findProfileName(d,fallback),class:cls,role:detectRole(extractPresetSnippet(d,cp.source==='Estimated Raid Loadout'?'Estimated Raid Loadout':'Current Loadout (Raid)'),cls),ilvl:findItemLevel(d,l),cp:cp.value,cpSource:cp.source,loadout:cp.source,classIcon,retrievedAt:new Date().toISOString()}}
async function fetchCharacter(c){let r;try{r=await fetch(`${BIBLE_CONNECTOR}?url=${encodeURIComponent(c.url)}`,{method:'GET',cache:'no-store',headers:{Accept:'application/json'}})}catch(e){throw Error(`Unable to reach the Bible connector: ${e.message||'network error'}`)}const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw Error(`Bible connector returned non-JSON data (HTTP ${r.status}).`)}if(!r.ok||data.ok===false)throw Error(data.error||`Bible connector returned HTTP ${r.status}.`);return parseProfile(data.html||data.characterHtml||data.content||data.page,c.name,c.region)}
/* Defer to the shared class-data authority, which knows the newer classes and is
   further patched by class-icon-authority-v1.js with the repository-hosted SVGs.
   The map below is an older duplicate kept only as a fallback; it has no entry for
   Valkyrie, Wildsoul or Guardianknight, which is why those rendered no icon. */
function classIconUrl(cls){try{const shared=window.LostArkHideoutClassData?.iconUrl?.(cls);if(shared)return shared}catch{}const map={Berserker:'ClassIcon-Warrior-Berserker.png',Destroyer:'ClassIcon-Warrior-Destroyer.png',Gunlancer:'ClassIcon-Warrior-Gunlancer.png',Paladin:'ClassIcon-Warrior-Paladin.png',Slayer:'ClassIcon-Warrior-Slayer.png',Arcanist:'ClassIcon-Mage-Arcanist.png',Arcana:'ClassIcon-Mage-Arcanist.png',Summoner:'ClassIcon-Mage-Summoner.png',Sorceress:'ClassIcon-Mage-Sorceress.png',Bard:'ClassIcon-Mage-Bard.png',Gunslinger:'ClassIcon-Gunner-Gunslinger.png',Deadeye:'ClassIcon-Gunner-Deadeye.png',Sharpshooter:'ClassIcon-Gunner-Sharpshooter.png',Artillerist:'ClassIcon-Gunner-Artillerist.png',Machinist:'ClassIcon-Gunner-Artillerist.png',Striker:'ClassIcon-Martial Artist-Striker.png',Wardancer:'ClassIcon-Martial Artist-Wardancer.png',Scrapper:'ClassIcon-Martial Artist-Scrapper.png',Soulfist:'ClassIcon-Martial Artist-Soulfist.png',Glavier:'ClassIcon-Martial Artist-Glaivier.png',Glaivier:'ClassIcon-Martial Artist-Glaivier.png',Deathblade:'ClassIcon-Assassin-Deathblade.png',Shadowhunter:'ClassIcon-Assassin-Shadowhunter.png',Reaper:'ClassIcon-Assassin-Reaper.png','Soul Eater':'Icon Soul Eater.jpg',Souleater:'Icon Soul Eater.jpg',Artist:'ClassIcon-Specialist-Artist.png',Aeromancer:'ClassIcon-Specialist-Aeromancer.png'};return map[cls]?`https://lostark.fandom.com/wiki/Special:Redirect/file/${encodeURIComponent(map[cls])}`:''}
/* Bible occasionally reports a support's profile as a DPS build -- a Bard read
   as True Courage rather than Desperate Salvation, with the CP and ranking that
   go with it. Accepting that overwrites a good profile with a bad one and
   changes how the optimizer scores them. So a refresh that would turn a
   support-shaped profile into a DPS-shaped one is refused, and the last profile
   in which they read as a support is kept instead.
   Deliberately narrow: only the four support classes, only when the PREVIOUS
   profile was itself support-shaped, and never for a genuine respec into a DPS
   build on a non-support class. A real respec on a support class is the one
   false positive -- the user can Remove and re-add the character to force it. */
const SUPPORT_SPECS={bard:'desperate salvation',paladin:'blessed aura',artist:'full bloom',valkyrie:'liberator'};
function supportClassOf(p){return SUPPORT_SPECS[String(p?.class||p?.className||'').trim().toLowerCase()]||null}
function supportShaped(p){
 if(!p)return false;
 if(String(p.role||'')==='Support')return true;
 const want=supportClassOf(p);
 if(!want)return false;
 const text=[...(p.enlightenment||[]),p.spec,p.specialization].filter(Boolean).join(' ').toLowerCase();
 if(text.includes(want))return true;
 const ally=p.allyEffects||{};
 return Number(ally.allyDamage)>0||Number(ally.allyAtkPower)>0;
}
function keepKnownSupportProfile(previous,incoming){
 if(!previous||!incoming)return{profile:incoming,kept:false};
 if(!supportClassOf(previous)&&!supportClassOf(incoming))return{profile:incoming,kept:false};
 if(supportShaped(previous)&&!supportShaped(incoming))return{profile:previous,kept:true};
 return{profile:incoming,kept:false};
}
window.LostArkProfileGuard={keepKnownSupportProfile,supportShaped};

/* These two used to special-case the character named "diamarte" into Souleater.
   Verified redundant on 2026-08-23: Bible reports Souleater for that character
   through classFromHtml, so the override only restated the profile. Matching on
   character NAME was also wrong once anyone else uses this -- a stranger sharing
   the name would have had their class silently rewritten. */
function correctedClassForCharacter(c){return c?.profile?.class||'Unknown'}
function iconForProfile(p){return p?.classIcon||classIconUrl(p?.class)||''}
function render(){const complete=state.characters.filter(c=>c.profile),il=complete.map(c=>c.profile.ilvl).filter(Number.isFinite),cp=complete.map(c=>c.profile.cp).filter(Number.isFinite);$('#playerCount').textContent=`${state.characters.length} / ${MAX_CHARACTERS}`;$('#avgIlvl').textContent=il.length?Math.round(il.reduce((a,b)=>a+b,0)/il.length):'—';$('#avgCp').textContent=cp.length?Math.round(cp.reduce((a,b)=>a+b,0)/cp.length).toLocaleString():'—';$('#dataMode').textContent='Bible profiles';$('#rosterNote').textContent='Only explicitly supplied character URLs are retrieved. Raid CP priority: Estimated Raid Loadout → Current Loadout (Raid). Chaos Dungeon Loadout is never used.';$('#roster').innerHTML=state.characters.length?state.characters.map(c=>{const p=c.profile||{},cls=correctedClassForCharacter(c),name=p.name||c.name,icon=iconForProfile(p);return`<article class="character"><div class="character-head"><div><h3 class="character-title">${icon?`<img class="class-icon" src="${icon}" alt="${escapeHtml(cls)}">`:''}<a class="character-bible-link" href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a></h3><div class="class">${escapeHtml(cls)}</div></div><button class="remove-character" data-id="${escapeHtml(c.id)}" type="button">Remove</button></div><div class="stats"><div class="stat">iLvl<b>${formatNumber(p.ilvl)}</b></div><div class="stat">CP<b>${formatNumber(p.cp)}</b></div></div><div class="privacy-note">${p?`Bible profile loaded · ${escapeHtml(p.loadout)} · CP source: ${escapeHtml(p.cpSource)}`:escapeHtml(c.profileError||'Profile pending')}</div></article>`}).join(''):'<div class="empty-roster">No designated main characters have been added.</div>';document.querySelectorAll('.remove-character').forEach(b=>b.addEventListener('click',()=>removeCharacter(b.dataset.id)));renderSuggestions()}
function renderSuggestions(){const complete=state.characters.filter(c=>c.profile);if(!complete.length){$('#suggestedParties').innerHTML='<div class="empty-roster">Add specific character profiles to generate the party setup.</div>';return}const s=[...complete].sort((a,b)=>(b.profile.cp||0)-(a.profile.cp||0)),a=s.filter((_,i)=>i%2===0).slice(0,4),b=s.filter((_,i)=>i%2===1).slice(0,4),party=(title,m)=>`<article class="party"><h3>${title}</h3><div class="score">${m.length}/4 slots filled</div><div class="slots">${m.map(c=>{const cls=correctedClassForCharacter(c),icon=iconForProfile({...c.profile,class:cls});return`<div class="slot"><h4 class="party-character-title">${icon?`<img class="class-icon" src="${icon}" alt="${escapeHtml(cls)}">`:''}<span>${escapeHtml(c.profile.name)}</span></h4><small>${escapeHtml(cls)} · iLvl ${formatNumber(c.profile.ilvl)} · CP ${formatNumber(c.profile.cp)}</small></div>`}).join('')||'<div class="slot"><small>No characters assigned.</small></div>'}</div></article>`;$('#suggestedParties').innerHTML=party('Party 1',a)+party('Party 2',b)}
/* Skip only a profile fetched moments ago. This exists to stop an accidental
   double-click re-fetching everything, not to second-guess a deliberate refresh:
   a ten-minute window meant clicking Refresh Profiles right after a respec
   silently skipped it and kept showing the old specialization. Shift-click still
   forces every character. */
const FRESH_MS=60*1000;
window.__lostarkForceRefresh=false;
const isFresh=c=>{const t=Date.parse(c?.profile?.retrievedAt||'');return c?.profile&&Number.isFinite(t)&&(Date.now()-t)<FRESH_MS};
/* Bible is fetched one character at a time on purpose -- concurrent calls trip
   its rate limit and end up slower -- so refresh time scales with the number of
   characters. Say so, and count down, rather than leaving a silent minute.
   Roughly 3s per character measured against the connector, New Additions
   included, since they queue behind this pass. The opening line must keep the
   "Refreshing character profiles" prefix: bible-fetch-retry keys its failure
   diagnostics off it, so the progress lines below deliberately differ. */
function refreshEta(n){const s=Math.round(n*3);return s<60?`about ${s}s`:`about ${Math.floor(s/60)} min ${s%60?`${s%60}s`:''}`.trim()}
async function refreshProfiles(){if(!state.characters.length)return setStatus('Add at least one character first.');
 let pending=0;try{pending=(window.LostArkCandidateRoster?.getNew?.()||[]).length}catch{}
 const due=state.characters.filter(c=>window.__lostarkForceRefresh||!isFresh(c)).length;
 const total=due+pending;
 setStatus(`Refreshing character profiles… ${total} to fetch, one at a time — ${refreshEta(total)}. The more characters loaded, the longer a refresh takes.`);
 let ok=0,failed=0,skipped=0,done=0;const keptSupport=[];for(const c of state.characters){if(!window.__lostarkForceRefresh&&isFresh(c)){skipped++;continue}
 done++;setStatus(`Fetching profile ${done} of ${total} — one at a time; more characters means a longer refresh.`);
 try{const fresh=await fetchCharacter(c);const guard=keepKnownSupportProfile(c.profile,fresh);c.profile=guard.profile;if(guard.kept)keptSupport.push(c.profile?.name||c.name);delete c.profileError;ok++}catch(e){c.profileError=e.message;failed++}}saveState();render();window.__lostarkForceRefresh=false;const skipNote=skipped?` ${skipped} already up to date.`:'';const keptNote=keptSupport.length?` Kept the previous profile for ${keptSupport.join(', ')} — Bible reported them as DPS.`:'';setStatus(failed?`Refreshed ${ok}; ${failed} failed.${skipNote}${keptNote}`:`Refreshed ${ok} profile${ok===1?'':'s'} from Bible.${skipNote}${keptNote}`)}
function removeCharacter(id){const c=state.characters.find(x=>x.id===id);if(!c)return;if(localStorage.getItem(REMOVE_CONFIRM_KEY)==='1')return performRemove(c);const o=document.createElement('div');o.className='remove-modal';o.innerHTML=`<div class="remove-modal-card"><h2>Remove character?</h2><p>Are you sure you want to remove <strong>${escapeHtml(c.name)}</strong>?</p><div class="remove-modal-actions"><button class="remove-cancel">Cancel</button><button class="remove-confirm">Remove Character</button></div></div>`;document.body.appendChild(o);o.querySelector('.remove-cancel').onclick=()=>o.remove();o.querySelector('.remove-confirm').onclick=()=>{o.remove();performRemove(c)}}function performRemove(c){state.characters=state.characters.filter(x=>x.id!==c.id);saveState();render()}
function init(){const add=$('#addCharacterBtn');if(add)add.onclick=()=>{if(state.characters.length>=MAX_CHARACTERS)return setStatus(`Maximum of ${MAX_CHARACTERS} characters reached.`);const p=parseBibleUrl($('#characterUrl').value.trim());if(!p)return setStatus('Enter a valid lostark.bible character URL.');if(state.characters.some(c=>c.url.toLowerCase()===p.url.toLowerCase()))return setStatus('That character is already loaded.');const c={id:`${p.region}-${p.name}`.toLowerCase(),url:p.url,region:p.region,name:p.name};state.characters.push(c);saveState();render();fetchCharacter(c).then(profile=>{c.profile=profile;delete c.profileError;saveState();render();setStatus(`${profile.name} loaded.`)}).catch(e=>{c.profileError=e.message;saveState();render();setStatus(e.message)})};const refresh=$("#refreshBtn");if(refresh)refresh.onclick=e=>{window.__lostarkForceRefresh=!!(e&&e.shiftKey);refreshProfiles()};render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
