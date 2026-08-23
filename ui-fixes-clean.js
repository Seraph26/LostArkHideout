/* Lost Ark Hideout — final class/spec/icon/position display authority */
(()=>{
'use strict';
const KEY='lostark-hideout-private-v3', BUILD='lostark-hideout-build-profiles-v3';
/* Lower-cased to match norm(); mirrors CLASS_RANGED in encounter-scoring-v2. */
const RANGED=new Set(['sorceress','sharpshooter','artillerist','machinist','scouter','summoner','aeromancer','gunslinger','deadeye','arcana','arcanist','bard','artist']);
const norm=v=>String(v??'').normalize('NFKC').trim().toLowerCase().replace(/[’']/g,"'");
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
function load(k){try{return JSON.parse(localStorage.getItem(k)||'null')||{}}catch{return{}}}
function className(p,b){return clean(p?.class||p?.className||p?.characterClass||b?.className||b?.class||'')}
function specFor(p,b){
 const cls=norm(className(p,b));
 const t=norm([...(p?.enlightenment||[]),p?.engravings,p?.arkGrid,p?.arkPassive,p?.skills,p?.tripods,p?.skillsText,p?.skillText,p?.tripodsText,p?.arkGridText,p?.arkPassiveText,p?.rawText,b?.text,...(b?.engravings||[]),...(b?.grid||[]).map(x=>`${x.name} ${x.type} ${x.branch}`),...(b?.arkPassive||[]).map(x=>`${x.name} ${x.level}`)].flat().join(' '));
 const rules={berserker:[["berserker's technique","Berserker Technique"],['berserker technique','Berserker Technique'],['mayhem','Mayhem']],souleater:[['full moon harvester','Full Moon Harvester'],['full moon','Full Moon Harvester'],['full bloom','Full Bloom'],["night's edge","Night's Edge"],['night edge',"Night's Edge"]],summoner:[['master summoner','Master Summoner'],['communication overflow','Communication Overflow']],scrapper:[['shock training','Shock Training'],['taijutsu','Taijutsu']],glaivier:[['pinnacle','Pinnacle'],['control','Control']],glavier:[['pinnacle','Pinnacle'],['control','Control']],wardancer:[['first intention','First Intention'],['esoteric skill enhancement','Esoteric Skill Enhancement']],deathblade:[['surge','Surge'],['remaining energy','Remaining Energy']],reaper:[['hunger','Hunger'],['nightmare','Nightmare']],striker:[['deathblow','Deathblow'],['esoteric flurry','Esoteric Flurry']],gunslinger:[['peacemaker','Peacemaker'],['time to hunt','Time to Hunt']],deadeye:[['pistoleer','Pistoleer'],['enhanced weapon','Enhanced Weapon']],artillerist:[['barrage enhancement','Barrage Enhancement'],['firepower enhancement','Firepower Enhancement']],slayer:[['predator','Predator'],['punisher','Punisher']],breaker:[["asura's path","Asura's Path"],['asura','Asura'],['brawl king storm','Brawl King Storm']],destroyer:[['gravity training','Gravity Training'],['rage hammer','Rage Hammer']],gunlancer:[['combat readiness','Combat Readiness'],['lone knight','Lone Knight']],soulfist:[['energy overflow','Energy Overflow'],['robust spirit','Robust Spirit']],sharpshooter:[['death strike','Death Strike'],['loyal companion','Loyal Companion']],aeromancer:[['wind fury','Wind Fury'],['drizzle','Drizzle']],arcanist:[['emperor','Emperor'],['empress','Empress']],arcana:[['emperor','Emperor'],['empress','Empress']],sorceress:[['igniter','Igniter'],['reflux','Reflux']],artist:[['full bloom','Full Bloom']],bard:[['desperate salvation','Desperate Salvation'],['true courage','True Courage']],paladin:[['blessed aura','Blessed Aura'],['judgment','Judgment']],valkyrie:[['liberator','Liberator'],['shining knight','Shining Knight'],['blessed aura','Blessed Aura']]};
 for(const [needle,label] of(rules[cls]||[]))if(t.includes(needle))return label;return clean(p?.specialization||b?.specialization||'')||'';
}
function positionFor(p,b){const cls=norm(className(p,b));if(['bard','artist','paladin','valkyrie'].includes(cls))return'N/A';const explicit=clean(b?.positional||p?.positional||'');if(explicit&&!/^unknown$/i.test(explicit))return explicit;const t=norm([b?.text,p?.engravings,p?.arkGrid,p?.arkPassive,p?.tripods].flat().join(' '));if(/ambush master|back attack|entropy/.test(t))return'Back Attack';if(/master brawler|front attack/.test(t))return'Front Attack';if(/hit master/.test(t))return'Hit Master';if(cls==='berserker'&&/mayhem|berserker'?s technique|berserker technique/.test(t))return'Back Attack';if(cls==='summoner'&&/master summoner|communication overflow|ancient spear/.test(t))return'Hit Master';if(cls==='souleater'&&/full moon harvester|night.?s edge/.test(t))return'Hit Master';
 /* A ranged class has no positional requirement to begin with, so "Unknown" was
    never right for one -- it just meant the build text held no Ambush Master or
    Master Brawler evidence, which it never will. Sharpshooter (Death Strike) is
    the case that surfaced this. Positional evidence above still wins, so a build
    that does run back attacks is unaffected. */
 if(RANGED.has(cls))return'Hit Master';
 return'Unknown'}
function icon(cls){try{return window.LostArkHideoutClassData?.iconUrl?.(cls)||''}catch{return''}}
/* New Additions can hold party seats, but this map was built from the Main Group
   key alone, so their party cards were never repaired: the spec label fell back
   to the raw class name and the position stayed Unknown even though the same
   character reads correctly on their New Addition card. Take the whole eligible
   roster instead. */
/* Read the two roster keys directly rather than through CandidateRoster.getAll():
   that path normalises every New Addition on the way out, which stringifies each
   whole profile and can write back to localStorage -- far too expensive for
   something on the repair path. */
const NEW_KEY='lostark-hideout-new-additions-v1';
function rosterCharacters(){const out=[...(load(KEY).characters||[])];
 try{const extra=JSON.parse(localStorage.getItem(NEW_KEY)||'null');if(Array.isArray(extra))out.push(...extra)}catch{}
 return out}
/* repair() runs on every mutation of document.body, and this map was rebuilt from
   scratch each time -- with getBuild() re-parsing the entire build-profile cache
   once per character. That is N JSON.parses of a large blob per pass, and after a
   re-render the passes come in storms, which is how a swap ended up taking tens
   of seconds once the roster was big enough. Parse each store once per rebuild,
   and only rebuild when one of them actually changed. */
let profileCache=null,profileSig='';
function stateProfiles(){
 const raw=localStorage.getItem(KEY)||'',extra=localStorage.getItem(NEW_KEY)||'',builds=localStorage.getItem(BUILD)||'';
 const sig=`${raw.length}:${extra.length}:${builds.length}:${raw.slice(-64)}${extra.slice(-64)}${builds.slice(-64)}`;
 if(profileCache&&sig===profileSig)return profileCache;
 const cache=load(BUILD),m=new Map();
 for(const c of rosterCharacters()){const p=c?.profile||{};const url=c?.url||'';const name=norm(p.name||c.name);
  if(name&&!m.has(name))m.set(name,{p,url,b:(url&&cache[url])||null})}
 profileSig=sig;profileCache=m;return m}
function makeInline(img){img.style.display='inline-block';img.style.width='22px';img.style.height='22px';img.style.objectFit='contain';img.style.verticalAlign='middle';img.style.margin='0 7px 0 0';img.style.flex='0 0 22px';img.style.position='static'}
function applyIcon(container,cls){if(!container||!cls)return;const src=icon(cls);if(!src)return;let img=container.querySelector(':scope > img.class-icon');if(!img){img=document.createElement('img');img.className='class-icon';container.insertBefore(img,container.firstChild)}img.src=src;img.alt=cls;img.removeAttribute('srcset');makeInline(img);container.style.display='inline-flex';container.style.alignItems='center';container.style.flexWrap='nowrap'}
function repairTop(profiles){document.querySelectorAll('#roster .character').forEach(card=>{const link=card.querySelector('.character-bible-link'),key=norm(link?.textContent),x=profiles.get(key);if(!x)return;const base=className(x.p,x.b),spec=specFor(x.p,x.b),title=card.querySelector('.character-title');if(title)applyIcon(title,base);card.querySelectorAll('.class').forEach(e=>e.textContent=spec||base)})}
function repairBottom(profiles){document.querySelectorAll('#suggestedParties .party-member').forEach(card=>{const link=card.querySelector('.party-character-link');const key=norm(link?.textContent),x=profiles.get(key);if(!x)return;const base=className(x.p,x.b),spec=specFor(x.p,x.b),pos=positionFor(x.p,x.b);if(link)applyIcon(link,base);const clsEl=card.querySelector('.party-class-label');if(clsEl)clsEl.textContent=spec||base;const posEl=card.querySelector('.party-stat-label');if(posEl){const cpMatch=clean(posEl.textContent).match(/·\s*CP\s+[\d,]+.*$/i);posEl.textContent=cpMatch?`${pos} ${cpMatch[0]}`:pos}})}
function repair(){const profiles=stateProfiles();repairTop(profiles);repairBottom(profiles)}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
function start(){repair();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('lostark-build-profiles-v3-ready',()=>setTimeout(repair,100))}
/* Single source of truth for the displayed specialization, shared so Raid
   Specific shows the same label as the Main Group instead of the class name. */
window.LostArkSpecAuthority={specFor,className};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

/* General Optimize lifecycle guard. UI state only: no scoring, hover, arrow,
   or displayed optimization text is changed here. */
function installGeneralOptimizeGuard(){
 const b=document.getElementById('optimizeBtn');
 if(!b||b.dataset.generalOptimizeGuard)return;
 b.dataset.generalOptimizeGuard='1';
 let started=0,lastMutation=0,observer=null,watch=null,timeout=null;
 const clear=()=>{if(observer){observer.disconnect();observer=null}if(watch){clearInterval(watch);watch=null}if(timeout){clearTimeout(timeout);timeout=null}started=0};
 const generalActive=()=>window.LostArkOptimizerMode?.general!==false;
 const restore=()=>{b.disabled=false;b.setAttribute('aria-busy','false');b.removeAttribute('aria-disabled');b.textContent='Optimize Parties'};
 const begin=()=>{const host=document.getElementById('suggestedParties');if(!host)return;clear();started=Date.now();lastMutation=started;observer=new MutationObserver(()=>{lastMutation=Date.now()});observer.observe(host,{childList:true,subtree:true,characterData:true});watch=setInterval(()=>{if(b.getAttribute('aria-busy')!=='true'){clear();return}const now=Date.now();if(now-started>12000&&now-lastMutation>1500){clear();restore()}},250);timeout=setTimeout(()=>{if(b.getAttribute('aria-busy')==='true'){clear();restore()}},20000)};
 /* General Optimization starts on pointerdown, so the guard must arm there too;
    arming only on click leaves a window where the 250ms sweep below wipes the
    "Optimizing..." label while the run is still in progress. */
 const arm=e=>{if(e.target?.closest?.('#optimizeBtn')&&generalActive())begin()};
 document.addEventListener('pointerdown',arm,true);
 document.addEventListener('click',arm,true);
 setInterval(()=>{if(!generalActive()){clear();return}if(!started&& (b.getAttribute('aria-busy')==='true'||b.disabled))restore()},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installGeneralOptimizeGuard,0),{once:true});else setTimeout(installGeneralOptimizeGuard,0);

/* Manual-swap arrows state a delta against the previous arrangement within one
   optimization mode. Switching modes makes that comparison meaningless, so the
   residue is removed. Nothing here recalculates or reformats an arrow. */
function installModeSwitchArrowClear(){
 const sel=document.getElementById('raidSpecificSelect'),gen=document.getElementById('generalOptimization');
 if(!gen||gen.dataset.modeArrowClear)return;
 gen.dataset.modeArrowClear='1';
 const SEL='#suggestedParties .metric-change,#suggestedParties .general-top-swap-arrow,#suggestedParties .general-swap-arrow';
 const clearArrows=()=>{document.querySelectorAll(SEL).forEach(e=>e.remove());document.getElementById('raid-manual-party-summary')?.remove();document.querySelectorAll('#suggestedParties .swap-comparison').forEach(e=>e.remove())};
 /* repeat briefly: other display layers re-render shortly after a mode change */
 const sweep=()=>{clearArrows();[60,180,400].forEach(ms=>setTimeout(clearArrows,ms))};
 gen.addEventListener('change',sweep);
 sel?.addEventListener('change',sweep);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installModeSwitchArrowClear,0),{once:true});else setTimeout(installModeSwitchArrowClear,0);
})();
