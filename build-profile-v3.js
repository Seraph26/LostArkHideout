/* Lost Ark Party — raid-focused build profile cache v6 */
(()=>{
'use strict';
const KEY='lostark-hideout-build-profiles-v3';
const STATE='lostark-hideout-private-v3';
const CONNECTOR='https://lostark-bible-connector.seraph0226.workers.dev/character';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const KNOWN_ENGRAVINGS=['Ambush Master','Master Brawler','Hit Master','Master Summoner','Communication Overflow','Igniter','Reflux','Surge','Remaining Energy','Rage Hammer','Gravity Training','Lone Knight','Combat Readiness','Predator','Punisher','Empress Grace','Emperor\'s Decree','Pinnacle','Control','Shock Training','Taijutsu','Robust Spirit','Energy Overflow','Deathblow','Esoteric Flurry','First Intention','Esoteric Skill Enhancement','Asura\'s Path','Brawl King Storm','Dreadful Roar','Barrage Enhancement','Firepower Enhancement','Enhanced Weapon','Pistoleer','Loyal Companion','Death Strike','Peacemaker','Time to Hunt','Demonic Impulse','Perfect Suppression','Hunger','Full Moon Harvester','Night\'s Edge','Full Bloom','Recurrence','Wind Fury','Drizzle','Blessed Aura','Desperate Salvation','True Courage','Adrenaline','Keen Blunt Weapon','Raid Captain','Grudge','Cursed Doll','Mass Increase','Ether Predator','Precise Dagger'];
function raidText(d){const all=clean(d.body?.textContent||'');const html=clean(d.documentElement?.outerHTML||'');const candidates=[];for(const src of [all,html])for(const label of ['Estimated Raid Loadout','estimated_raid','estimatedRaid','raid_merged','Current Loadout (Raid)']){const i=src.toLowerCase().indexOf(label.toLowerCase());if(i>=0)candidates.push(src.slice(i,i+18000))}return candidates.length?candidates.sort((a,b)=>b.length-a.length)[0]:all}
function classBehavior(cls,engr,low){const e=engr.join(' ').toLowerCase();const b={mobility:'standard',positioning:'flexible',uptime:'sustained',burstDependency:'low',pushResilience:'standard',supportPlacement:'none',evidence:[]};if(/ambush master|back attack/.test(e)){b.positioning='Back Attack';b.evidence.push('Ambush Master / Back Attack')}if(/master brawler|front attack/.test(e)){b.positioning='Front Attack';b.evidence.push('Master Brawler / Front Attack')}if(/hit master/.test(e)){b.positioning='Hit Master';b.evidence.push('Hit Master')}if(/master summoner/.test(e)||(/summoner/.test(low)&&/ancient spear/.test(low))){b.mobility='low';b.uptime='burst';b.burstDependency='high';if(b.positioning==='flexible')b.positioning='Hit Master';b.evidence.push('Master Summoner / Ancient Spear')}if(/surge/.test(e)||/night.?s edge/.test(e)||/full moon harvester/.test(e)||/punisher/.test(e)||/death strike/.test(e)||/berserker technique/.test(e)){b.uptime='burst';b.burstDependency='high'}if(/predator|taijutsu|first intention/.test(e)){b.mobility='high';b.uptime='sustained';b.burstDependency='low'}if(/asura.?s path|brawl king storm/.test(e)){b.mobility='high';b.uptime='burst';b.burstDependency='high';b.pushResilience='high'}if(cls==='Paladin'){b.supportPlacement='flexible';b.evidence.push('Paladin aura-based support')}if(cls==='Bard'){b.supportPlacement='placement-sensitive';b.evidence.push('Bard placement-sensitive support')}if(cls==='Artist'){b.mobility='high';b.supportPlacement='placement-sensitive';b.evidence.push('Artist placement-sensitive support')}if(cls==='Valkyrie'){b.mobility='high';b.supportPlacement='flexible';b.evidence.push('Valkyrie flexible support')}if(cls==='Gunlancer'){b.mobility='low';b.pushResilience='high'}if(cls==='Destroyer'){b.mobility='low';b.pushResilience='high';b.uptime='burst';b.burstDependency='high'}return b}
/* Everything below reads structure out of the DOM or out of the flat body text
   with anchored patterns, rather than splitting on newlines.

   The old extractors all did `for(const x of ls)` where `ls` came from
   `t.split(/\n+/)` -- but `t` has already been through clean(), which collapses
   every run of whitespace to a single space. There were never any newlines, so
   `ls` was always one enormous line and arkPassive, grid, stats and sections
   came back empty for **every character ever parsed**. Nothing failed loudly;
   the optimizers just scored on engravings alone. */

/* Ark Passive rows render as an icon, a tier chip and a name: "T2 Keen Sense
   Lv. 2". Requiring the tier chip is what separates them from the other
   "<name> Lv. <n>" text on the page (Gems, Roster Level, ability stones). */
function arkPassiveFrom(d,clean){const out=[];
 d.querySelectorAll('span').forEach(sp=>{const s=clean(sp.textContent);if(s.length>60)return;
  const m=s.match(/^(.+?)\s+Lv\.\s*(\d+)$/);if(!m)return;
  const row=sp.parentElement;if(!row)return;
  const tier=[...row.children].find(x=>/^T\d+$/.test(clean(x.textContent)));if(!tier)return;
  out.push({tier:+clean(tier.textContent).slice(1),name:clean(m[1]),level:+m[2]})});
 return out}
/* The list is three blocks -- Evolution, Enlightenment, Leap -- laid out one
   after another, each restarting at T1. So a block ends wherever the tier goes
   backwards. */
function arkPassiveGroups(nodes){const gs=[];let cur=[],prev=0;
 for(const n of nodes){if(cur.length&&n.tier<prev){gs.push(cur);cur=[]}cur.push(n);prev=n.tier}
 if(cur.length)gs.push(cur);return gs}
/* The Enlightenment block -- the middle one -- is where the specialization
   actually lives, so exposing it lets a spec be looked for in the few nodes
   that can hold one instead of in the whole page.

   Do NOT read the block's first node as the specialization. It looks that way
   on Breaker (Asura's Path) and Guardian Knight (Dreadful Roar), but it is a
   class-identity node, and on other classes the spec sits deeper: Deathblade
   opens with Swift Strike and carries Remaining Energy at T2, Paladin opens
   with Divine Knight and carries Judgment at T3. Tested on seven characters --
   it was right for four and wrong for three. */
function enlightenmentFrom(nodes){const gs=arkPassiveGroups(nodes);
 return gs.length>=2?gs[1].map(n=>n.name):[]}
/* "Apex 18 | Order Sun" */
function gridFrom(body,clean){const out=[];let m;
 const re=/([A-Za-z][A-Za-z' -]{1,30}?)\s+(\d+)\s*\|\s*(Order|Chaos)\s+(Sun|Moon|Star)/g;
 while((m=re.exec(body)))out.push({name:clean(m[1]),points:+m[2],type:m[3],branch:m[4]});
 return out}
/* The profile page carries no combat-stat totals at all. Reading "Crit +92" off
   it looked right and was not: that is a *bracelet* roll, one item's line rather
   than the character's build, and adjacent text runs into the numbers there
   ("Weapon Power +90" followed by "00 Outgoing" parsed as +9000).

   The real allocation is in the Ark Passive Evolution block, whose first-tier
   nodes are literally the stats -- "T1 Crit Lv. 16", "T1 Swiftness Lv. 24" --
   and which summed to exactly 40 on every character checked. That is the
   allocation itself, per character, which is what tells two Sorceresses apart. */
const STAT_NODE = /^(crit|swiftness|specialization|domination|endurance|expertise)$/;
function statsFrom(nodes){
 const out={crit:null,specialization:null,swiftness:null};
 let total=0;
 for(const n of nodes||[]){
  const k=String(n?.name||'').trim().toLowerCase();
  if(!STAT_NODE.test(k))continue;
  const lv=Number(n.level);
  if(!Number.isFinite(lv))continue;
  out[k]=lv; total+=lv;
 }
 out.total=total;
 /* The dominant stat, and only when it is a real commitment rather than a
    rounding accident. 24 of 40 is 60%: Kumamagic's 22/12/6 spread is not a
    Crit build in any meaningful sense, and should not be treated as one. */
 const named=Object.keys(out).filter(k=>k!=='total'&&Number.isFinite(out[k]));
 const top=named.sort((a,b)=>out[b]-out[a])[0];
 out.dominant=(top&&out[top]>=24)?top:null;
 return out}
/* "Lv. 10 Wild Uppercut 222 Quick Recharge" -- level, skill, tripod selections,
   rune. The rune is absent as the literal "No rune", which has to be stripped
   before matching: leave it in and the name capture stops early and the rune
   swallows the rest of the skill name ("Avenging" / "Spear No rune"). */
function skillsFrom(body,clean){const i=body.lastIndexOf('Skills');if(i<0)return[];
 let seg=body.slice(i+6);const stop=seg.search(/Made with|Got feedback|__sveltekit/);
 if(stop>0)seg=seg.slice(0,stop);
 const out=[];
 for(const chunk of seg.split(/(?=Lv\.\s*\d+\s)/)){
  let s=clean(chunk);if(!s)continue;
  const noRune=/\sNo rune$/.test(s);if(noRune)s=s.replace(/\sNo rune$/,'');
  const m=noRune?s.match(/^Lv\.\s*(\d+)\s+(.+?)(?:\s+(\d{1,3}))?$/)
                :s.match(/^Lv\.\s*(\d+)\s+(.+?)(?:\s+(\d{1,3}))?\s+([A-Z][A-Za-z' ]*)$/);
  if(!m)continue;
  out.push({name:clean(m[2]),level:+m[1],tripods:m[3]||'',rune:m[4]?clean(m[4]):''})}
 return out}
/* The page also ships a structured payload beside the rendered markup:
     skills:[{id:49110,level:10,rune:65103004,tripods:[2,2,2],tripodLevels:{}}]
   which is the only place tripod *selections* exist as data -- one index per
   tier, 1-3, in tier order. Tripod names are nowhere on the page, so a rule has
   to be written against id + tier + index; that is exactly what this supplies.

   Skill names are not in the payload, so skillsFrom() above still provides
   those. The two align on level and tripod code -- 49110 level 10 tripods
   [2,2,2] is "Lv. 10 Wild Uppercut 222" -- which is also how a skill id can be
   tied to a name if a dictionary is ever wanted.

   Only the first payload is read. A profile can carry more than one loadout and
   the raid one leads; taking them all would mix a chaos build into a raid
   reading. */
function payloadSkills(html){
 const s=String(html||'');
 const i=s.indexOf('skills:[{id:');
 if(i<0)return[];
 const seg=s.slice(i,i+6000);
 const out=[];const re=/\{id:(\d+),level:(\d+),rune:(\d+),tripods:\[([0-9,]*)\]/g;let m;
 while((m=re.exec(seg)))out.push({id:+m[1],level:+m[2],rune:+m[3],
  tripods:m[4]?m[4].split(',').map(Number):[]});
 return out}
function canonicalClass(x){const m={arcana:'Arcanist',arcanist:'Arcanist',souleater:'Souleater','soul eater':'Souleater',guardianknight:'Guardianknight',glavier:'Glaivier'};const k=String(x||'').toLowerCase();return m[k]||String(x||'').replace(/\b\w/g,x=>x.toUpperCase())}
function parse(html){const d=new DOMParser().parseFromString(html,'text/html'),t=raidText(d),full=clean(d.documentElement?.outerHTML||html),ls=t.split(/\n+/).map(clean).filter(Boolean),low=full.toLowerCase();
 const authoritative=full.match(/data-bible-authoritative-class=["']([^"']+)["']/i)?.[1]||full.match(/<[^>]*class=["'][^"']*\bclass\b[^"']*["'][^>]*>\s*([^<]+?)\s*<\//i)?.[1]||'';
 const engr=[];for(const name of KNOWN_ENGRAVINGS){if(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(t))engr.push(name)}for(const x of ls){const m=x.match(/^(.+?)\s+(\d+)\/20(?:\s*\+\d+)?$/);if(m&&!engr.some(e=>e.toLowerCase()===m[1].trim().toLowerCase()))engr.push(m[1].trim())}
 const bodyText=clean(d.body?.textContent||'');
 const grid=gridFrom(bodyText,clean);
 const arkPassive=arkPassiveFrom(d,clean);
 const enlightenment=enlightenmentFrom(arkPassive);
 const skills=skillsFrom(bodyText,clean);
 const skillData=payloadSkills(html);
 /* `tripods` used to be produced by a regex loose enough to match accessory
    rows, so every character came back with the same six entries -- Necklace,
    Earring, Earring, Ring, Ring, Stone -- and that junk was flattened into the
    text the optimizers pattern-match against. Carry the real skills instead,
    keeping the {skill, name} shape the existing consumers read. */
 const tripods=skills.map(s=>({skill:s.name,name:s.rune||s.tripods||'',tier:s.tripods||''}));
 const stats=statsFrom(arkPassive);
 const positional=engr.some(x=>/ambush master/i.test(x))?'Back Attack':engr.some(x=>/master brawler/i.test(x))?'Front Attack':engr.some(x=>/hit master/i.test(x))?'Hit Master':/back attack/.test(low)?'Back Attack':/front attack/.test(low)?'Front Attack':'Unknown';
 const burst=/(igniter|punisher|full moon|burst|death strike|surge|identity burst|master summoner|asura.?s path|brawl king storm)/i.test(t);
 const classMatch=low.match(/\b(berserker|destroyer|gunlancer|paladin|slayer|valkyrie|arcanist|arcana|bard|sorceress|summoner|glaivier|glavier|scrapper|soulfist|striker|wardancer|breaker|artillerist|deadeye|machinist|sharpshooter|gunslinger|deathblade|shadowhunter|reaper|souleater|soul eater|artist|aeromancer|wildsoul|guardianknight)\b/i);
 const className=authoritative?canonicalClass(authoritative):(classMatch?canonicalClass(classMatch[1]):'Unknown');
 const behavior=classBehavior(className,engr,t.toLowerCase());
 const buildText=clean([engr.join(' '),grid.map(x=>x.name+' '+x.points+' '+x.type+' '+x.branch).join(' '),arkPassive.map(x=>x.name+' '+x.level).join(' '),tripods.map(x=>x.skill+' '+x.name).join(' '),t].join(' '));
 const sections={};
 const sectionLabels=['Gems','Skills','Tripods','Accessories','Bracelet','Ability Stone','Ark Passive','Ark Grid','Engravings'];
 for(let i=0;i<ls.length;i++){const label=ls[i].replace(/[:：]$/,'');const known=sectionLabels.find(x=>x.toLowerCase()===label.toLowerCase());if(!known)continue;const rows=[];for(let j=i+1;j<ls.length&&rows.length<80;j++){const v=ls[j];if(sectionLabels.some(x=>x.toLowerCase()===v.replace(/[:：]$/,'').toLowerCase()))break;rows.push(v)}sections[known]=rows}
 return{className,engravings:engr,grid,arkPassive,enlightenment,skills,skillData,tripods,stats,positional,burst,behavior,text:buildText,raidText:t,raidLines:ls,sections,retrievedAt:new Date().toISOString()}}
async function fetchBuild(c){const r=await fetch(`${CONNECTOR}?url=${encodeURIComponent(c.url)}`,{cache:'no-store',headers:{Accept:'application/json'}});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw Error('Bible connector returned non-JSON data')}if(!r.ok||data.ok===false)throw Error(data.error||`HTTP ${r.status}`);return parse(data.html||data.characterHtml||data.content||data.page)}
/* Accepts an explicit character list. Without it, the only way to refresh builds
   for anyone other than the Main Group was to overwrite the Main Group key in
   localStorage, call this, and put it back afterwards -- a window in which the
   stored roster was wrong, and a permanent loss of the Main Group if the tab was
   closed or reloaded inside it. Callers pass their own list now; omitting it
   still reads the Main Group, so existing behaviour is unchanged. */
async function refresh(list){let chars;
 if(Array.isArray(list))chars=list;
 else{let state;try{state=JSON.parse(localStorage.getItem(STATE)||'null')}catch{return}chars=state?.characters}
 if(!Array.isArray(chars))return;const cache=load();
 /* Same shape as resolveAll in lobby-resolve-v1.js, and the same caveat: these
    workers do NOT issue four requests at once. bible-fetch-retry-v1.js wraps
    window.fetch and serialises every connector /character call behind a 650ms
    pacer, so request timing is identical either way -- bursting was measured as
    far worse and is exactly what the pacer prevents. The win is that parsing a
    230KB page overlaps the next page's network wait instead of following it. */
 const pending=chars.filter(c=>c?.url),LIMIT=4;let next=0;
 async function worker(){for(;;){const i=next++;if(i>=pending.length)return;const c=pending[i];
  try{cache[c.url]=await fetchBuild(c)}catch(e){if(!cache[c.url])cache[c.url]={error:e.message}}}}
 const running=[];for(let i=0;i<Math.min(LIMIT,pending.length);i++)running.push(worker());
 await Promise.all(running);
 save(cache);window.dispatchEvent(new CustomEvent('lostark-build-profiles-v3-ready'))}
/* Bible never states which skill id is which skill: the payload has ids and the
   markup has names, and nothing joins them. They can be joined anyway, because
   both carry level and tripod selections -- id 49110 level 10 tripods [2,2,2] is
   the rendered "Lv. 10 Wild Uppercut 222".

   That matters because any rule about a skill has to be keyed by id (names drift
   with translations, ids do not), and because rule sets found elsewhere use a
   different id space entirely -- 7 digits against Bible's 5 -- so a translation
   table is the only way to use them.

   Ambiguity is left visible rather than guessed: where two equipped skills share
   a level and a tripod code there is no way to tell which is which, so both are
   skipped. The dictionary grows as more characters are cached, and a class with
   distinct codes resolves completely on one profile. */
function skillNames(){
 const out={},cache=load();
 for(const url of Object.keys(cache)){
  const b=cache[url]||{};
  const named=Array.isArray(b.skills)?b.skills:[];
  const data=(Array.isArray(b.skillData)?b.skillData:[]).filter(s=>s&&s.level>1);
  const key=x=>x.level+':'+(Array.isArray(x.tripods)?x.tripods.join(''):String(x.tripods||''));
  const byKey={};
  for(const s of data){const k=key(s);byKey[k]=byKey[k]?'AMBIGUOUS':s}
  for(const n of named){
   const hit=byKey[key(n)];
   if(!hit||hit==='AMBIGUOUS')continue;
   out[hit.id]={name:n.name,class:b.className||null};
  }
 }
 return out}
window.LostArkBuildProfilesV3={get:url=>load()[url]||null,refresh,skillNames};
})();
