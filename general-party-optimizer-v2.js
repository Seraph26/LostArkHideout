/* Lost Ark Party — General Optimization v3 */
(()=>{
'use strict';
const STORE='lostark-hideout-private-v3',PARTY='lostark-hideout-party-assignments-v2',BASELINE='lostark-hideout-general-baseline-v1',SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const clean=s=>String(s??'').replace(/\s+/g,' ').trim(),num=x=>Number.isFinite(Number(x))?Number(x):0,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'null')||{characters:[]}}catch{return{characters:[]}}}
/* text() and build() are called from weight() on every effect of every scoring
   pass. A single manual swap runs ~32 full party scorings, so the raw profile
   string was being rebuilt and lowercased hundreds of times, blocking the main
   thread for seconds before the swap could paint. Memoise per character; the
   values are pure, so scoring is unchanged. Caches drop whenever the stored
   roster changes or build profiles finish loading. */
let rosterSnapshot=null;const textCache=new Map(),buildCache=new Map();
function dropCaches(){textCache.clear();buildCache.clear();for(const k of Object.keys(meanCache))delete meanCache[k]}
function cacheKey(c){return String(c&&(c.id||c.url)||'')}
function roster(){const raw=localStorage.getItem(STORE);if(raw!==rosterSnapshot){rosterSnapshot=raw;dropCaches()}return(load().characters||[]).filter(c=>c&&c.id)}
window.addEventListener('lostark-build-profiles-v3-ready',dropCaches);
function partyState(){try{const x=JSON.parse(localStorage.getItem(PARTY)||'null');if(x?.party1&&x?.party2)return x}catch{}return{party1:[],party2:[]}}
function save(x){localStorage.setItem(PARTY,JSON.stringify(x))}
function profile(c){return c.profile||c.data||{}}
function build(c){const k=cacheKey(c);if(buildCache.has(k))return buildCache.get(k);let v;try{v=window.LostArkBuildProfilesV3?.get(c.url)||window.LostArkBuildProfilesV2?.get(c.url)||{}}catch{v={}}buildCache.set(k,v);return v}
function text(c){const k=cacheKey(c);if(textCache.has(k))return textCache.get(k);const v=textUncached(c);textCache.set(k,v);return v}
function textUncached(c){const p=profile(c),b=build(c);return clean([p.rawText,p.text,p.characterText,p.arkGridText,p.arkPassiveText,p.engravingsText,p.gemsText,p.tripodsText,b.text,b.className,b.engravings?.join(' '),b.grid?.map(x=>x.name+' '+x.points).join(' '),b.arkPassive?.map(x=>x.name+' '+x.level).join(' '),b.tripods?.map(x=>x.skill+' '+x.name).join(' ')].filter(Boolean).join(' ')).toLowerCase()}
function cls(c){const p=profile(c),b=build(c),v=clean(p.class||p.className||p.characterClass||b.className);if(v&&v.toLowerCase()!=='unknown')return({'Soul Eater':'Souleater','Arcana':'Arcanist','Glavier':'Glaivier'}[v]||v);const t=text(c),m=[['Summoner',/\bsummoner\b|master summoner|ancient spear/],['Souleater',/souleater|soul eater|full moon harvester|night.?s edge/],['Arcanist',/arcanist|arcana|empress grace|emperor.?s decree/],['Glaivier',/glaivier|glavier|pinnacle|control/],['Bard',/\bbard\b|desperate salvation|true courage/],['Artist',/\bartist\b|full bloom|recurrence/],['Paladin',/\bpaladin\b|blessed aura/],['Slayer',/\bslayer\b|predator|punisher/],['Breaker',/\bbreaker\b|asura.?s path|brawl king/],['Deathblade',/\bdeathblade\b|surge|remaining energy/],['Gunlancer',/\bgunlancer\b|lone knight|combat readiness/]];for(const[n,r]of m)if(r.test(t))return n;return'Unknown'}
function role(c){const p=profile(c);return p.role==='Support'||SUPPORTS.has(cls(c))?'Support':'DPS'}
function info(c){const p=profile(c);return{name:clean(p.name||c.name)||'Unknown',cls:cls(c),role:role(c),cp:num(p.cp??p.combatPower),url:c.url||p.url||''}}
function pos(c){const b=build(c),t=text(c);if(b.positional&&b.positional!=='Unknown')return b.positional;if(b.behavior?.positioning&&b.behavior.positioning!=='flexible')return b.behavior.positioning;if(/ambush master|back attack/.test(t))return'Back Attack';if(/master brawler|front attack/.test(t))return'Front Attack';if(/hit master/.test(t))return'Hit Master';if(/master summoner|summoner/.test(t)&&/summoner/.test(t))return'Hit Master';return'Unknown'}
/* Summoner supplies party mana through Shurdi, but only with the mana tripod
   selected: skill 20160, third tripod line, choice 2. Bible exposes tripods as
   bare indices, so this is the only way to tell. Profiles imported before
   skillTripods was captured have no data -- assume the tripod is taken so an
   un-refreshed roster does not silently lose the buff. */
const SHURDI_ID='20160',SHURDI_MANA_LINE=2,SHURDI_MANA_CHOICE=2;
function summonerGivesMana(c){const t=profile(c).skillTripods;if(!t)return true;const s=t[SHURDI_ID]||t[Number(SHURDI_ID)];return Array.isArray(s)?s[SHURDI_MANA_LINE]===SHURDI_MANA_CHOICE:true}
function effects(c){
 let list=null;
 try{const x=window.LostArkPartySynergyAuthorityV1?.provided?.(info(c).cls,build(c),text(c));if(Array.isArray(x)&&x.length)list=x}catch{}
 if(!list){const m={Summoner:['damage','mana'],Glaivier:['crit','critDamage'],Arcanist:['crit'],Wardancer:['crit','attackSpeed'],Striker:['crit','attackSpeed'],Deathblade:['attackSpeed'],Gunlancer:['attackSpeed','damage'],Soulfist:['attackPower']};list=[];for(const k of(m[info(c).cls]||[]))list.push({type:k,value:k==='crit'?.10:k==='critDamage'?.08:.06})}
 /* The synergy authority reports Summoner as defenseReduction only, so her
    Shurdi mana was not modelled at all. Add it when the tripod is taken, drop
    it when it is not, whichever source supplied the list. */
 if(info(c).cls==='Summoner'){const gives=summonerGivesMana(c),has=list.some(e=>e.type==='mana');
  if(gives&&!has)list=list.concat({type:'mana',value:.06});
  else if(!gives&&has)list=list.filter(e=>e.type!=='mana')}
 return list}
/* Mana is a real constraint for a few sustained-casting builds and close to
   irrelevant for everyone else, so it is graded per class and, where the
   specialization changes the answer, per spec.
   The previous test was /summoner|mana|boundless/ against the whole profile
   text, which is why a Glaivier scored full mana need: "boundless" is an Ark
   Passive node name, and the bare word "mana" appears all over tooltips. Only
   distinctive spec names are matched here. Summoner is rated low deliberately --
   she gains little from mana despite summoning. */
/* Graded by playstyle rather than by class name: constant low-cooldown skill
   cycling with no burst window drains MP, while long animation-locked burst
   skills leave natural downtime. Only archetypes actually identified are listed;
   everything else sits at the neutral default rather than being guessed at.
   Lost Ark rebalances mana frequently, so treat these as tunable, not settled.
   Bard is listed for completeness but is inert today: supports do not receive
   contributions in this model. */
/* Summoner sits at .35 on the strength of the direct observation that she gains
   little from mana. The general archetype list groups her with high-uptime specs
   but qualifies it as summon uptime rather than the player's own MP spend, which
   is a reason to receive less, not more. This value is the hinge for pairing a
   Summoner with a Bard versus a Valkyrie: at .35 the Valkyrie wins, at .40 the
   Bard does. Worth revisiting first if support pairings look wrong. */
const MANA_NEED={wildsoul:1.35,scrapper:1.25,bard:1.20,summoner:.35,artillerist:.35,gunlancer:.35};
const MANA_DEFAULT=.60;
function manaNeed(c){const cls=String(info(c).cls||'').toLowerCase(),t=text(c);
 if(cls==='sorceress')return /\breflux\b/.test(t)?1.45:.35;        /* Reflux never stops; Igniter is burst */
 if(cls==='striker')return /esoteric flurry/.test(t)?1.35:1.00;    /* Flurry spams to build meter */
 return MANA_NEED[cls]??MANA_DEFAULT}
function weight(c,type){const t=text(c),p=pos(c);let w=1;if(type==='crit'&&/keen blunt|adrenaline|burst|full moon/.test(t))w+=.35;if(type==='critDamage'&&/keen blunt|burst/.test(t))w+=.30;if(type==='attackSpeed'&&/raid captain|swiftness/.test(t))w+=.35;if(type==='positional')w=p==='Back Attack'||p==='Front Attack'?1.35:p==='Hit Master'?.55:.85;if(type==='mana')w=manaNeed(c);if(type==='damage'&&/summoner/.test(t))w+=.10;return w}
function supportEffects(c){switch(info(c).cls){case'Bard':return[{type:'supportAmplification',value:.10},{type:'mana',value:.12},{type:'attackSpeed',value:.035}];case'Artist':return[{type:'supportAmplification',value:.10},{type:'mana',value:.08},{type:'attackSpeed',value:.04}];case'Paladin':return[{type:'supportAmplification',value:.10},{type:'damage',value:.03}];case'Valkyrie':return[{type:'supportAmplification',value:.095},{type:'attackSpeed',value:.06}];default:return[{type:'supportAmplification',value:.09}]}}
function encounterProfile(){try{return window.LostArkEncounterModel?.getProfile?.()||null}catch{return null}}
/* What a character GIVES the party used to depend only on their class, so a
   better-geared character of the same class supplied exactly the same buff.
   A character's own CP already drives what they receive (contribution scales
   off it), but not what they provide. CP is the Bible-derived measure of the
   whole character -- gear, bracelet, gems, ark passive -- so scale the synergy
   and support each one supplies by their CP relative to the mean for their role.
   Square-rooted and clamped, so it shifts the choice without letting CP swamp
   the class effects themselves. */
const meanCache={};
function meanCp(r){if(meanCache[r]!=null)return meanCache[r];const all=eligible().filter(c=>role(c)===r).map(c=>info(c).cp).filter(n=>n>0);meanCache[r]=all.length>=2?all.reduce((a,b)=>a+b,0)/all.length:0;return meanCache[r]}
function strength(c){const mean=meanCp(role(c)),cp=info(c).cp;if(!mean||!cp)return 1;return Math.max(.85,Math.min(1.15,Math.sqrt(cp/mean)))}
function supportUptime(p,target){const s=p.find(x=>role(x)==='Support');if(!s)return 0;const dps=p.filter(x=>role(x)==='DPS'),sc=info(s).cls,ep=encounterProfile(),mechanics=ep?.mechanics||{},positions=dps.map(pos),known=positions.filter(x=>x!=='Unknown'),mixed=new Set(known).size>1,targetPos=pos(target);let u;if(ep){if(targetPos==='Back Attack'&&Number.isFinite(Number(ep.back)))u=Number(ep.back);else if(targetPos==='Front Attack'&&Number.isFinite(Number(ep.front)))u=Number(ep.front);else if(targetPos==='Hit Master'&&Number.isFinite(Number(ep.hitmaster)))u=Number(ep.hitmaster);else if(Number.isFinite(Number(ep.ranged))&&Number.isFinite(Number(ep.melee))){const ranged=/Sorceress|Sharpshooter|Artillerist|Machinist|Scouter|Summoner|Aeromancer|Gunslinger|Deadeye|Arcana|Arcanist/.test(info(target).cls);u=ranged?Number(ep.ranged):Number(ep.melee)}else u=Number(ep.baseUptime)||.95}else{
 /* Raid-model positional uptime, adopted here so General agrees with Raid
    Specific: Paladin and Valkyrie hold uptime far better than Bard and Artist
    across a party running mixed positions, rather than the flat mixed?.76:.95
    that treated every support class the same. */
 const uniq=[...new Set(known)],front=uniq.includes('Front Attack'),back=uniq.includes('Back Attack'),hm=uniq.includes('Hit Master');
 if(sc==='Paladin'||sc==='Valkyrie')u=uniq.length>=3?.94:front&&back?.96:.99;
 else u=uniq.length>=3?.72:front&&back?.76:hm&&(front||back)?.84:.95;
 if((sc==='Bard'||sc==='Artist')&&targetPos==='Hit Master'&&uniq.length>=2)u-=.05;
 if((sc==='Bard'||sc==='Artist')&&targetPos!=='Unknown'&&uniq.length===1)u+=.02;
 return Math.max(.60,Math.min(1,u));
}
if(sc==='Bard'){if(mixed)u*=.97;if(targetPos==='Front Attack'&&known.includes('Back Attack'))u*=.99;if(mechanics.movement==='high'||mechanics.movement==='very-high')u*=.99}else if(sc==='Artist'){if(mixed)u*=.985;if(targetPos==='Front Attack'&&known.includes('Back Attack'))u*=.995}return Math.max(.60,Math.min(1,u))}
function contribution(p,c){if(role(c)!=='DPS')return{base:0,build:0,synergy:0,support:0,total:0,uptime:0,details:[]};const cp=info(c).cp,b=build(c),fit=(b.engravings&&b.engravings.length?.004:0)+(b.grid&&b.grid.length?.004:0)+(b.arkPassive&&b.arkPassive.length?.004:0)+(/master summoner|communication overflow/.test(text(c))?.002:0);let synergy=0,support=0,details=[];for(const src of p.filter(x=>x!==c&&role(x)==='DPS')){const ss=strength(src);for(const e of effects(src)){const v=cp*num(e.magnitude??e.value)*weight(c,e.type)*ss;synergy+=v;details.push({source:info(src).name,type:e.type,value:v,direction:'from'})}}const sup=p.find(x=>role(x)==='Support');let uptime=0;/* Ally Damage / Ally Atk. Power Enhancement affixes on the support's accessories
   and bracelet amplify the buffs they hand out, so they scale the matching
   effect types. CP already counts these toward the support's own power in a
   generic way; this is what makes them count toward the party. */
if(sup){uptime=supportUptime(p,c);const ss=strength(sup),ally=profile(sup).allyEffects||{};
 const dmgMult=1+num(ally.allyDamage)/100,apMult=1+num(ally.allyAtkPower)/100;
 for(const e of supportEffects(sup)){
  const amp=(e.type==='supportAmplification'||e.type==='damage')?dmgMult:e.type==='attackPower'?apMult:1;
  const v=cp*e.value*weight(c,e.type)*uptime*ss*amp;support+=v;details.push({source:info(sup).name,type:e.type,value:v,uptime,direction:'from'})}}return{base:cp,build:cp*fit,synergy,support,total:cp+cp*fit+synergy+support,uptime,details}}
function score(p){if(p.length!==4||p.filter(x=>role(x)==='DPS').length!==3||p.filter(x=>role(x)==='Support').length!==1)return null;const c=p.filter(x=>role(x)==='DPS').map(x=>({c:x,...contribution(p,x)}));return{total:c.reduce((n,x)=>n+x.total,0),base:c.reduce((n,x)=>n+x.base,0),build:c.reduce((n,x)=>n+x.build,0),synergy:c.reduce((n,x)=>n+x.synergy,0),support:c.reduce((n,x)=>n+x.support,0),coherence:Math.round(c.reduce((n,x)=>n+x.uptime,0)/3*100),c}}
function combos(a,k){const o=[];function r(i,p){if(p.length===k){o.push(p);return}for(let j=i;j<=a.length-(k-p.length);j++)r(j+1,p.concat(a[j]))}r(0,[]);return o}
/* Optimization pool: the Main Group plus any New Addition that is not hidden,
   which is the point of the comparison section -- an outside character should be
   able to displace a current member. Hidden characters are excluded, so hiding
   all New Additions restores Main-Group-only behaviour. */
function eligible(){const base=roster();let list=null;try{list=window.LostArkCandidateRoster?.getEligible?.()}catch{}
 if(!Array.isArray(list)||!list.length)list=base;
 const seen=new Set();
 return list.filter(c=>{const id=c&&c.id;if(!id||seen.has(id)||!(c.profile||c.data))return false;seen.add(id);return true})}
/* Enumerate 4+4 arrangements by role. Two supports and six DPS are chosen from
   the pool, so this stays exact at eight characters and still terminates quickly
   when New Additions widen it. Candidates beyond the strongest few by CP are
   trimmed: they cannot realistically make the best six. */
/* General Optimization has no encounter to infer party size from, so the format
   is chosen explicitly. 4-player builds a single 3 DPS + 1 support party from the
   whole eligible pool, exactly as Raid Specific does for Horizon Cathedral and
   Serca; 8-player splits into two. */
const FORMAT_KEY='lostark-hideout-general-format-v1';
function format(){const el=document.getElementById('generalFormatSelect');const v=Number(el?el.value:localStorage.getItem(FORMAT_KEY));return v===4?4:8}
const MAX_SUPPORTS=4,MAX_DPS=9;
function strongest(list,n){return list.slice().sort((x,y)=>info(y).cp-info(x).cp).slice(0,n)}
function arrangements(list){
 const sup=strongest(list.filter(c=>role(c)==='Support'),MAX_SUPPORTS),dps=strongest(list.filter(c=>role(c)==='DPS'),MAX_DPS);
 if(format()===4){
  const out=[];
  for(const s of sup)for(const three of combos(dps,3))out.push([three.concat(s),[]]);
  return out;
 }
 if(sup.length<2||dps.length<6)return[];
 const out=[];
 for(const pair of combos(sup,2))for(const six of combos(dps,6)){
  const anchor=six[0];
  for(const three of combos(six,3)){
   if(!three.includes(anchor))continue;            /* anchor kills mirror duplicates */
   const rest=six.filter(c=>!three.includes(c));
   out.push([three.concat(pair[0]),rest.concat(pair[1])]);
   out.push([three.concat(pair[1]),rest.concat(pair[0])]);
  }
 }
 return out}
function resolve(a){const m=new Map(eligible().map(c=>[c.id,c])),p1=[],p2=[],u=new Set();for(const id of a.party1||[])if(m.has(id)&&!u.has(id)&&p1.length<4){p1.push(m.get(id));u.add(id)}for(const id of a.party2||[])if(m.has(id)&&!u.has(id)&&p2.length<4){p2.push(m.get(id));u.add(id)}const solo=format()===4;for(const c of m.values())if(!u.has(c.id)){if(p1.length<4)p1.push(c);else if(!solo&&p2.length<4)p2.push(c);u.add(c.id)}return{p1,p2:solo?[]:p2}}
function encounterGuidance(){try{const p=window.LostArkEncounterModel?.getProfile?.();if(!p)return'';const notes=Array.isArray(p.notes)?p.notes:[],f=[];if(p.back<.94)f.push('Back Attack uptime is constrained');else if(p.back<.97)f.push('Back Attack uptime is moderately constrained');else f.push('Back Attack uptime is relatively favorable');if(p.front>p.back+.01)f.push('Front Attack builds are favored over back attacks');if(p.hitmaster>=.985)f.push('Hit Master builds retain high uptime');else if(p.hitmaster<.97)f.push('Hit Master uptime is constrained');if(p.melee<p.ranged-.01)f.push('Ranged uptime is favored over melee');if(p.burst>1.02)f.push('Burst-window builds receive additional value');const mech=p.mechanics||{};if(mech.forcedPositioning==='high'||mech.forcedPositioning==='very-high')f.push('Forced movement/positioning is a major factor');if(mech.movement==='high'||mech.movement==='very-high')f.push('High movement demand is modeled');const lead=[...new Set(f)].slice(0,4).join('; ');return`<div class="encounter-priority-note"><strong>Raid calculation priority:</strong> ${esc(lead||'Encounter-specific uptime and positioning factors are active.')} ${notes[0]?`<span class="encounter-priority-detail">${esc(notes[0])}</span>`:''}</div>`}catch{return''}}
const EFFECT_LABELS={damage:'Damage',mana:'Mana',crit:'Critical Rate',critDamage:'Critical Damage',attackSpeed:'Attack Speed',attackPower:'Attack Power',moveSpeed:'Move Speed',movementSpeed:'Move Speed',supportAmplification:'Support Amplification',positional:'Positional Damage'};
function effectLabel(type){if(EFFECT_LABELS[type])return EFFECT_LABELS[type];return clean(type).replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())}
function contributionPercent(value,base){return base>0?value/base*100:0}
function detailRows(items,total,base,mode='from'){if(!Array.isArray(items)||!items.length||!total)return'';return items.map(d=>{const value=num(d.value);if(!value)return'';const label=effectLabel(d.type),percent=contributionPercent(value,base),direction=mode==='to'?'to':'from',uptime=d.uptime!==undefined?`<div class="chb-uptime">Observed median uptime ${(num(d.uptime)*100).toFixed(2)}%</div>`:'';return`<div class="chb-synergy"><div>${esc(label)} ${direction} ${esc(d.source)}: +${Math.round(value).toLocaleString()} estimated contribution</div><div>${percent.toFixed(2)}% of base power</div>${uptime}</div>`}).join('')}
function supportOutgoingRows(p,support){const rows=[];for(const d of p.filter(x=>role(x)==='DPS')){const x=contribution(p,d),name=info(d).name;for(const detail of x.details||[]){if(detail.source===info(support).name&&detail.uptime!==undefined)rows.push({source:name,type:detail.type,value:detail.value,uptime:detail.uptime,base:x.base})}}return rows}
function hoverHtml(c,s,p){const i=info(c),x=s?.c?.find(z=>z.c===c)||{base:i.cp,build:0,synergy:0,support:0,total:i.cp,uptime:0,details:[]};const base=num(x.base||i.cp);let hover='';if(i.role==='DPS'){const synergyDetails=x.details.filter(d=>d.uptime===undefined),supportDetails=x.details.filter(d=>d.uptime!==undefined);hover=`<div class="character-hover-breakdown general-dps-hover"><strong>${esc(i.name)}</strong><div>CP ${base.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} - Contribution ${Math.round(x.total||0).toLocaleString()}</div><div>Party Synergy +${contributionPercent(num(x.synergy),base).toFixed(2)}%</div><div>Support Impact +${contributionPercent(num(x.support),base).toFixed(2)}%</div><div>Support compatibility uses encounter data</div>${detailRows(synergyDetails,num(x.synergy),base,'from')}${detailRows(supportDetails,num(x.support),base,'from')}</div>`}else{const outgoing=supportOutgoingRows(p,c),supportTotal=outgoing.reduce((n,d)=>n+num(d.value),0);hover=`<div class="character-hover-breakdown general-support-hover"><strong>${esc(i.name)}</strong><div>CP ${base.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} - Contribution ${Math.round((base+supportTotal)||0).toLocaleString()}</div><div>Party Synergy +0.00% Support Impact +${contributionPercent(supportTotal,base).toFixed(2)}%</div><div>Support compatibility uses encounter data</div>${outgoing.map(d=>`<div class="chb-synergy"><div>${esc(effectLabel(d.type))} to ${esc(d.source)}: +${Math.round(d.value).toLocaleString()} estimated contribution</div><div>${contributionPercent(d.value,d.base).toFixed(2)}% of ${esc(d.source)}'s base power</div></div>`).join('')}</div>`}return hover}
function member(c,s,p,extra){const i=info(c),hover=hoverHtml(c,s,p);return`<div class="party-member authoritative-member${extra?" "+extra:""}" draggable="true" data-character-id="${esc(c.id)}"><a class="party-character-link" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a><span class="party-class-label">${esc(i.cls)}</span><span class="party-role-label ${i.role==='Support'?'support':'dps'}">${i.role}</span><span class="party-stat-label">${esc(pos(c))} · CP ${Math.round(i.cp).toLocaleString()}</span>${hover}</div>`}
function partySynergyLabels(p){const seen=new Set();for(const c of p)for(const e of effects(c)){if(e?.type)seen.add(e.type)}return[...seen].map(effectLabel).join(', ')}
function render(a,after=false){const h=document.querySelector('#suggestedParties');if(!h)return;const{p1,p2}=resolve(a),s1=score(p1),s2=score(p2),total=(s1?.total||0)+(s2?.total||0);const box=(n,p,s,k)=>`<article class="party authoritative-party${onlyOne?' solo-general-party':''}"><div class="party-heading"><div><h3>${n}</h3><div class="party-score">Estimated potential: <strong>${Math.round(s?.total||0).toLocaleString()}</strong></div></div><div class="party-meta">${p.length}/4 · ${p.filter(x=>role(x)==='Support').length} support</div></div><div class="party-dropzone authoritative-dropzone" data-drop-party="${k}">${p.map(c=>member(c,s,p)).join('')}</div><div class="party-synergies"><strong>Synergies:</strong> ${partySynergyLabels(p)||'None'}${s?.coherence?` · Support uptime ${s.coherence}%`:''}</div></article>`;const onlyOne=!p2.length;h.innerHTML=`<div class="authoritative-summary"><strong>${onlyOne?'Estimated potential':'Combined estimated potential'}: ${Math.round(total).toLocaleString()}</strong><span> — one General Optimization scoring model; character CP is never modified.</span></div>${encounterGuidance()}${box('Party 1',p1,s1,'party1')}${onlyOne?'':box('Party 2',p2,s2,'party2')}<div class="optimizer-result"><strong>${after?'Party arrangement updated.':'General Optimization complete.'}</strong> ${after?'The metrics under each party show how the change moved this arrangement.':'The optimizer exhaustively evaluated all valid 4/4 partitions.'}</div>`}
function busy(b,v){b.disabled=v;b.setAttribute('aria-busy',v?'true':'false');b.textContent=v?'Optimizing...':'Optimize Parties'}
function baselineKey(list){return list.map(c=>String(c.id)).sort().join('|')}
function readBaseline(key){try{const x=JSON.parse(localStorage.getItem(BASELINE)||'null');return x?.key===key&&x?.party1?.length===4&&x?.party2?.length===4?x:null}catch{return null}}
function writeBaseline(key,best){try{localStorage.setItem(BASELINE,JSON.stringify({key,party1:best.party1,party2:best.party2}))}catch{}}
function optimize(b){const list=eligible();if(list.length<(format()===4?4:8))return;const key=baselineKey(list),cached=readBaseline(key);/* Cached baseline still re-renders, which visibly churns the page, so show the
   busy label across it rather than returning with no feedback at all. */
if(cached){save({party1:cached.party1,party2:cached.party2});busy(b,true);requestAnimationFrame(()=>requestAnimationFrame(()=>{try{render({party1:cached.party1,party2:cached.party2},false)}finally{busy(b,false)}}));return}busy(b,true);requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{try{let best=null;for(const [p1,p2] of arrangements(list)){const solo=!p2.length;const a=score(p1),z=solo?{total:0}:score(p2);if(!a||!z)continue;const total=a.total+z.total;if(!best||total>best.total)best={total,party1:p1.map(c=>c.id),party2:p2.map(c=>c.id)}}if(best){writeBaseline(key,best);save(best);busy(b,false);queueMicrotask(()=>render(best,false))}else busy(b,false)}catch(e){busy(b,false);console.error('General Optimization failed',e)}},0)))}
/* The format control only applies to General Optimization -- Raid Specific takes
   its party count from the encounter -- so it is disabled while General is off,
   mirroring how the raid selector is disabled while General is on. Changing it
   clears the cached baseline, since the previous answer was for a different
   party size, but does not re-optimize on its own. */
function installFormat(){
 const sel=document.getElementById('generalFormatSelect');if(!sel||sel.dataset.wired)return;sel.dataset.wired='1';
 const stored=localStorage.getItem(FORMAT_KEY);if(stored==='4'||stored==='8')sel.value=stored;
 /* Hidden rather than greyed out while Raid Specific is selected: a visible
    "4-player" control that the encounter overrides reads as a contradiction. */
 const sync=()=>{const gen=document.getElementById('generalOptimization'),on=gen?gen.checked:true;
  sel.disabled=!on;
  const label=sel.closest('.general-format-control');
  if(label)label.style.display=on?'':'none'};
 sel.addEventListener('change',()=>{localStorage.setItem(FORMAT_KEY,sel.value);localStorage.removeItem(BASELINE);
  const st=partyState();if(st.party1.length||st.party2.length)render(st,false)});
 document.getElementById('generalOptimization')?.addEventListener('change',sync);
 document.getElementById('raidSpecificSelect')?.addEventListener('change',sync);
 sync();
}
function install(){installFormat();const b=document.getElementById('optimizeBtn'),h=document.getElementById('suggestedParties');if(!b||!h||h.dataset.generalV3)return;h.dataset.generalV3='1';const active=()=>window.LostArkOptimizerMode?.general!==false;
const invoke=e=>{if(!active())return;e.preventDefault();e.stopImmediatePropagation();if(b.disabled)b.disabled=false;optimize(b)};
b.addEventListener('pointerdown',e=>{if(e.target?.closest?.('#optimizeBtn'))invoke(e)},{capture:true});
b.addEventListener('click',e=>{if(active()&&e.target?.closest?.('#optimizeBtn')){e.preventDefault();e.stopImmediatePropagation()}},{capture:true});
h.addEventListener('dragstart',e=>{if(!active())return;const m=e.target.closest('.party-member');if(m)e.dataTransfer.setData('text/plain',m.dataset.characterId)},{capture:true});h.addEventListener('dragover',e=>{if(active()&&e.target.closest('.party-dropzone'))e.preventDefault()},{capture:true});h.addEventListener('drop',e=>{if(!active())return;const z=e.target.closest('.party-dropzone');if(!z)return;e.preventDefault();e.stopImmediatePropagation();const id=e.dataTransfer.getData('text/plain'),a=partyState(),from=a.party1.includes(id)?'party1':a.party2.includes(id)?'party2':null,to=z.dataset.dropParty;if(!from||from===to)return;const target=e.target.closest('.party-member'),other=target?.dataset.characterId;if(other){const of=a.party1.includes(other)?'party1':a.party2.includes(other)?'party2':null;if(of&&of!==from){a[from][a[from].indexOf(id)]=other;a[of][a[of].indexOf(other)]=id}}else if(a[to].length<4){a[from]=a[from].filter(x=>x!==id);a[to].push(id)}save(a);render(a,true)},{capture:true});const st=partyState();if(st.party1.length||st.party2.length)render(st,false)}
/* Shared so Raid Specific can present the same contribution figures rather than
   maintaining a second, thinner model. The support-uptime calculation already
   consults the selected encounter, so these numbers are encounter-aware. */
/* member() and pos() are exported so Raid Specific can render the exact same
   character card rather than maintaining a second, drifting copy of it. */
/* partySynergyLabels is exported for the same reason as member(): Raid Specific
   shows the same Synergies line rather than deriving its own. */
window.LostArkGeneralModel={score,hoverHtml,info,role,resolve,member,pos,partySynergyLabels};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
