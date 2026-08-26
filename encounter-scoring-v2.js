/* Lost Ark Party — encounter scoring engine v5 */
(()=>{
'use strict';
const CLASS_RANGED=new Set(['Sorceress','Sharpshooter','Artillerist','Machinist','Scouter','Summoner','Aeromancer','Gunslinger','Deadeye','Arcana','Arcanist']);
const SUPPORT_CLASSES=new Set(['Bard','Artist','Paladin','Valkyrie']);
const POSITIONAL={back:/ambush master|back attack/i,front:/master brawler|front attack/i,hitmaster:/hit master/i};
const PROFILES={
'horizon-cathedral-g1':{name:'Horizon Cathedral — Gate 1',category:'current',confidence:'evidence-backed',baseUptime:.955,back:.965,front:.975,hitmaster:.995,melee:.975,ranged:.995,burst:1.015,mobility:1,pushImmunity:1,support:.995,mechanics:{justGuard:true,movement:'moderate',forcedPositioning:'moderate',burstWindows:'moderate'},notes:['Cathedral Levels 1–3 are intentionally collapsed into one Gate 1 selector entry','Just Guard failures and the Impact debuff can force players away from normal uptime']},
'horizon-cathedral-g2':{name:'Horizon Cathedral — Gate 2',category:'current',confidence:'evidence-backed',baseUptime:.94,back:.95,front:.975,hitmaster:.995,melee:.96,ranged:1,burst:1.025,mobility:1,pushImmunity:1,support:.99,mechanics:{justGuard:true,movement:'moderate-high',forcedPositioning:'high',burstWindows:'moderate'},notes:['Cathedral Levels 1–3 are intentionally collapsed into one Gate 2 selector entry','Gate 2 has more disruptive pattern positioning than Gate 1']},
'serca-g1':{name:'Serca — Gate 1',category:'current',confidence:'evidence-backed',baseUptime:.92,back:.91,front:.95,hitmaster:.965,melee:.955,ranged:.965,burst:1.015,mobility:1,pushImmunity:1,support:.97,mechanics:{brawl:true,movement:'high',forcedPositioning:'high',burstWindows:'high',sharedRevives:true},notes:['Normal/Hard/Nightmare are intentionally collapsed into one Gate 1 selector entry','Broom, anvil, wall and multiplication patterns repeatedly change safe positioning']},
'serca-g2':{name:'Serca — Gate 2',category:'current',confidence:'evidence-backed',baseUptime:.91,back:.90,front:.96,hitmaster:.98,melee:.95,ranged:.995,burst:1.04,mobility:1,pushImmunity:1,support:.96,mechanics:{brawl:true,movement:'high',forcedPositioning:'high',burstWindows:'very-high',sharedRevives:true},notes:['Normal/Hard/Nightmare are intentionally collapsed into one Gate 2 selector entry','Gate 2 has a heavier pattern/DPS burden than Gate 1','Official early data showed Corvus Tul Rak accounted for 52% of Serca deaths']},
'kazeros-g1':{name:'Kazeros — Gate 1',category:'current',confidence:'mechanics-modeled',baseUptime:.945,back:.945,front:.965,hitmaster:.985,melee:.935,ranged:.99,burst:1.035,mobility:1,pushImmunity:1.01,support:.97,mechanics:{movement:'moderate-high',forcedPositioning:'moderate',stagger:'high',destruction:'high',burstWindows:'high'},notes:['Stagger, destruction and weakness mechanics create discrete damage windows']},
'kazeros-g2':{name:'Kazeros — Gate 2',category:'current',confidence:'mechanics-modeled',baseUptime:.925,back:.925,front:.955,hitmaster:.985,melee:.925,ranged:.99,burst:1.045,mobility:1,pushImmunity:1.01,support:.965,mechanics:{movement:'high',forcedPositioning:'high',stagger:'high',destruction:'high',burstWindows:'very-high'},notes:['Gimmick-heavy phases compress normal damage time','Stagger/destruction transitions create concentrated burst opportunities']},
'armoche-g1':{name:'Armoche — Gate 1',category:'optional',confidence:'mechanics-modeled',baseUptime:.945,back:.945,front:.96,hitmaster:.985,melee:.94,ranged:.99,burst:1.03,mobility:1,pushImmunity:1,support:.975,mechanics:{justGuard:true,movement:'high',forcedPositioning:'moderate-high',burstWindows:'high'},notes:['Armoche is Act 4 / Fortress of Destruction','Just Guard and movement mechanics create controlled downtime']},
'armoche-g2':{name:'Armoche — Gate 2',category:'optional',confidence:'mechanics-modeled',baseUptime:.935,back:.935,front:.965,hitmaster:.99,melee:.935,ranged:.99,burst:1.04,mobility:1,pushImmunity:1.01,support:.97,mechanics:{justGuard:true,movement:'high',forcedPositioning:'high',stagger:'high',burstWindows:'very-high'},notes:['Gate 2 is Armoche, Sentinel of the Abyss','Co-op and stagger mechanics compress usable DPS windows']},
'extreme-aegir-g2':{name:'[EXTREME] Aegir — Gate 2',category:'extreme',confidence:'mechanics-modeled',baseUptime:.91,back:.92,front:.95,hitmaster:.985,melee:.91,ranged:.995,burst:1.05,mobility:1,pushImmunity:1.01,support:.955,mechanics:{justGuard:true,movement:'high',forcedPositioning:'high',burstWindows:'very-high',extreme:true},notes:['Extreme execution pressure is modeled through uptime/positioning, not an arbitrary CP penalty']},
'extreme-brelshaza-g2':{name:'[EXTREME] Brelshaza — Gate 2',category:'extreme',confidence:'mechanics-modeled',baseUptime:.90,back:.90,front:.95,hitmaster:.99,melee:.90,ranged:1,burst:1.05,mobility:1,pushImmunity:1.01,support:.95,mechanics:{movement:'high',forcedPositioning:'very-high',burstWindows:'very-high',extreme:true},notes:['High positional pressure is modeled separately from raw character CP']}
};
function selected(){const m=window.LostArkOptimizerMode;return m&&!m.general&&m.raid?m.raid:null}
function profile(){const id=selected();return id?PROFILES[id]||null:null}
function text(c){try{return JSON.stringify(c||{}).toLowerCase()}catch{return ''}}
function build(c){try{return window.LostArkBuildProfilesV3?.get(c.url)||window.LostArkBuildProfilesV2?.get(c.url)||{}}catch{return{}}}
function behaviorFor(cls,eng,low,bh){
 const e=eng.join(' ').toLowerCase();
 const b={mobility:bh.mobility||'standard',uptime:bh.uptime||'sustained',burstDependency:bh.burstDependency||'low',pushResilience:bh.pushResilience||'standard',supportPlacement:bh.supportPlacement||'none',evidence:Array.isArray(bh.evidence)?bh.evidence.slice():[]};
 const set=(mob,up,burst,pos,push,ev)=>{if(mob)b.mobility=mob;if(up)b.uptime=up;if(burst)b.burstDependency=burst;if(pos)b.positioning=pos;if(push)b.pushResilience=push;if(ev)b.evidence.push(ev)};
 if(/igniter/.test(e))set('low','burst','high','hitmaster','standard','Igniter stationary burst');
 else if(/reflux/.test(e))set('standard','sustained','low','hitmaster','standard','Reflux sustained Hit Master');
 if(/surge/.test(e))set('high','burst','high','back','standard','Surge burst cycle');
 else if(/remaining energy/.test(e))set('high','sustained','low','back','standard','Remaining Energy sustained back attack');
 if(/hunger/.test(e))set('high','sustained','low','back','standard','Hunger mobile sustained back attack');
 else if(/full moon harvester/.test(e))set('standard','burst','high',null,'standard','Full Moon identity burst');
 else if(/night.?s edge/.test(e))set('high','burst','high',null,'standard',"Night's Edge mobile burst");
 if(/punisher/.test(e))set('standard','burst','high',null,'standard','Punisher burst window');
 else if(/predator/.test(e))set('high','sustained','low',null,'high','Predator sustained uptime');
 if(/master summoner/.test(e)||(/summoner/.test(low)&&/ancient spear/.test(low)))set('low','burst','high','hitmaster','standard','Master Summoner stationary Ancient-skill burst');
 else if(/communication overflow/.test(e))set('standard','sustained','low',null,'standard','Communication Overflow sustained summon uptime');
 if(/death strike/.test(e))set('standard','burst','high',null,'standard','Death Strike burst cycle');
 else if(/loyal companion/.test(e))set('high','sustained','low',null,'standard','Loyal Companion sustained uptime');
 if(/pistoleer/.test(e))set('high','sustained','low','hitmaster','standard','Pistoleer mobile Hit Master');
 if(/enhanced weapon/.test(e))set('high','burst','high','back','standard','Enhanced Weapon positional shotgun burst');
 if(/barrage enhancement/.test(e))set('low','burst','high','hitmaster','high','Barrage stationary burst');
 else if(/firepower enhancement/.test(e))set('standard','sustained','low','hitmaster','standard','Firepower sustained Hit Master');
 if(/legacy of evolution/.test(e))set('standard','burst','high',null,'standard','Evolution legacy cycle');
 else if(/steady state/.test(e))set('high','sustained','low',null,'standard','Machinist sustained mobility');
 if(/shock training/.test(e))set('standard','burst','high','back','high','Shock Training back-attack burst');
 else if(/ultimate skill: taijutsu|taijutsu/.test(e))set('high','sustained','low','back','high','Taijutsu mobile sustained back attack');
 if(/robust spirit/.test(e))set('standard','burst','high',null,'standard','Robust Spirit identity burst');
 else if(/energy overflow/.test(e))set('high','sustained','low',null,'standard','Energy Overflow sustained uptime');
 if(/deathblow/.test(e))set('standard','burst','high','back','standard','Deathblow back-attack burst');
 else if(/eso striker|esoteric flurry/.test(e))set('high','sustained','low','back','standard','Esoteric mobile back attack');
 if(/first intention/.test(e))set('high','sustained','low',null,'standard','First Intention sustained uptime');
 if(/berserker technique/.test(e))set('standard','burst','high',null,'standard','Berserker Technique burst cycle');
 if(/asura.?s path/.test(e))set('high','burst','high','back','high','Asura high-mobility back-attack burst');
 else if(/brawl king storm/.test(e))set('high','burst','high',null,'high','Brawl King burst/brawler build');
 if(/emperor/.test(e))set('high','sustained','low','hitmaster','standard','Emperor mobile Hit Master cycle');
 else if(/empress/.test(e))set('standard','burst','high','hitmaster','standard','Empress card burst cycle');
 if(/predator|first intention|taijutsu|hunger|loyal companion|reflux|communication overflow|energy overflow/.test(e))b.burstDependency='low';
 if(cls==='Paladin'||/blessed aura/.test(e)){b.mobility='standard';b.supportPlacement='flexible';b.evidence.push('Paladin support profile')}
 if(cls==='Bard'){b.mobility='standard';b.supportPlacement='placement-sensitive';b.evidence.push('Bard support placement')}
 if(cls==='Artist'){b.mobility='high';b.supportPlacement='placement-sensitive';b.evidence.push('Artist mobile placement support')}
 if(cls==='Valkyrie'){b.mobility='high';b.supportPlacement='flexible';b.evidence.push('Valkyrie flexible support')}
 if(cls==='Gunlancer'){b.mobility='low';b.pushResilience='high';b.evidence.push('Gunlancer defensive/push resilience')}
 if(cls==='Destroyer'){b.mobility='low';b.pushResilience='high';b.uptime='burst';b.burstDependency='high';b.evidence.push('Destroyer slow burst profile')}
 return b;
}
function parseClassName(v){const x=String(v||'').trim().toLowerCase();const map={arcana:'Arcanist',arcanist:'Arcanist',souleater:'Souleater',soul_eater:'Souleater',guardianknight:'Guardianknight'};return map[x]||String(v||'Unknown').trim()||'Unknown'}
function traits(c){const t=text(c),p=c?.profile||c?.data||{},b=build(c),cls=parseClassName(p.class||p.className||p.characterClass||'');let position=b.positional&&b.positional!=='Unknown'?b.positional:'unknown';const bh=behaviorFor(cls,b.engravings||[],t,b.behavior||{}),runes=runeCounts(b.skills);
 if(bh.positioning)position=bh.positioning==='back'?'Back Attack':bh.positioning==='hitmaster'?'Hit Master':bh.positioning==='front'?'Front Attack':position;
 if(position==='unknown'){if(POSITIONAL.back.test(t))position='Back Attack';else if(POSITIONAL.front.test(t))position='Front Attack';else if(POSITIONAL.hitmaster.test(t))position='Hit Master'}
 const burst=Boolean(b.burst)||bh.burstDependency==='high'||/igniter|punisher|full moon|surge|death strike|identity burst|master summoner|asura.?s path|brawl king storm|robust spirit|deathblow/i.test(t);
 const support=SUPPORT_CLASSES.has(cls);
 return{cls,position:String(position).toLowerCase().replace(/\s+/g,''),positionLabel:position,burst,support,ranged:CLASS_RANGED.has(cls),behavior:statShaped(bh,b.stats,runes),runes,uptimePoints:uptimePoints(b.stats,runes)};}
/* Mobility and burst dependence were decided by class and engravings alone, so
   every character of a class scored identically no matter how they were built.
   The Ark Passive Evolution allocation is the per-character difference: 40
   points, and a dominant stat only counts here at 24 of them.

   Swiftness is cooldown and attack/move speed, which is uptime while a fight
   moves you -- exactly what mobilityFactor already models. Specialization drives
   the identity gauge, which is burst, which is what burstFactor models. Crit is
   damage rather than fit and deliberately changes nothing: it belongs to CP,
   which the optimizer already counts separately.

   One step, never more, and only upward from what the class implies. The
   factors these feed are between 0.975 and 1.012, so this refines an ordering
   rather than rewriting it. bh is the cached profile's own object, so copy it --
   mutating it would edit the stored build profile by reference. */
/* Runes are chosen per skill, so they say what a player built *for* in a way
   nothing else in the profile does. Only the ones that map to something this
   model already knows about are used:

     Overwhelm       stagger damage        -> mechanics.stagger, staggerFactor
     Vision          stagger damage on hit -> same, at half weight
     Wealth          identity generation   -> burst, as Specialization does
     Protection      shield while casting  -> push resilience
     Iron Wall       damage taken while casting
     Mountain's Face damage taken + shield while casting

   Vision counts half because it is a hybrid -- casting speed *and* stagger --
   where Overwhelm buys stagger outright, so a build leaning on Vision has not
   committed to stagger the way one stacking Overwhelm has.

   Everything else is deliberately ignored. Bleed, Poison and Rage are damage,
   which is CP's job and already counted. Focus, Conviction, Judgment and Purify
   are resource and utility with no term here to attach to. Galewind and Quick
   Recharge are uptime, which would land on the mobility axis -- left alone by
   request. */
const RUNE_STAGGER = /^overwhelm$/i;
const RUNE_STAGGER_HALF = /^vision$/i;
const RUNE_IDENTITY = /^wealth$/i;
const RUNE_GUARD = /^(protection|iron wall|mountain'?s face)$/i;
const RUNE_CONVICTION = /^conviction$/i;
const RUNE_JUDGMENT = /^judgment$/i;
/* Uptime runes, pooled rather than each granting the same step, because they all
   argue for the same thing and several of them together is a different claim
   from one of them alone. Weights are how much of the skill's slot actually buys
   uptime:
     Rage           1.0  attack *and* move speed for 6s, benefiting what follows
     Quick Recharge 0.5  chance at cooldown on that one skill
     Galewind       0.5  casting speed, that one skill only
   Rage is worth more than the other two despite being a proc, because the buff
   lands on subsequent actions rather than on the skill carrying it -- which is
   also why it is put on something short-cooldown and cast often. */
const RUNE_UPTIME = { rage: 1, 'quick recharge': .5, galewind: .5 };
function runeCounts(skills){
 const out={stagger:0,identity:0,guard:0,conviction:0,judgment:0,uptime:0};
 for(const s of (Array.isArray(skills)?skills:[])){
  const r=String(s&&s.rune||'').trim();
  if(!r)continue;
  const up=RUNE_UPTIME[r.toLowerCase()];
  if(up){out.uptime+=up;continue}
  if(RUNE_STAGGER.test(r))out.stagger+=1;
  else if(RUNE_STAGGER_HALF.test(r))out.stagger+=0.5;
  else if(RUNE_IDENTITY.test(r))out.identity++;
  else if(RUNE_GUARD.test(r))out.guard++;
  else if(RUNE_CONVICTION.test(r))out.conviction++;
  else if(RUNE_JUDGMENT.test(r))out.judgment++;
 }
 /* Conviction and Judgment are one mechanic wearing two rune slots, not two
    buffs. Conviction on skill A can proc a 3s state; Judgment on skill B can
    consume that state to open a 6s window; and only skills *cast inside* that
    window get the 15% cooldown reduction. Either rune alone does nothing at
    all, so counting them separately would credit half a combo that cannot
    fire. */
 out.judgmentCombo=out.conviction>0&&out.judgment>0;
 return out}
/* Only ever a bonus, and only on a fight that actually asks for stagger. A
   build carrying Overwhelm has given up a damage rune for it, which is a real
   choice on a gate with stagger checks and worth nothing on one without. Sized
   like the other mechanics terms in this file, which sit between 1.003 and
   1.012. */
function staggerFactor(count,mechanics){
 if(!count)return 1;
 const d=mechanics&&mechanics.stagger;
 if(d!=='high'&&d!=='very-high')return 1;
 const step=d==='very-high'?.005:.004;
 return 1+Math.min(count,2)*step}
function statShaped(bh,stats,runes){
 const dom=stats&&stats.dominant;
 const r=runes||{stagger:0,identity:0,guard:0};
 const wantsBurst=dom==='specialization'||r.identity>=2;
 /* The Judgment window is cooldown reduction, which is uptime, and uptime is the
    mobility axis here. Deliberately the same single step Swiftness gets and
    never additive with it: this is a chance to proc a state, then a chance to
    consume it, then a reward only for what is cast inside six seconds. It is a
    real build choice worth recognising, not a multiplier to stack.
    Note it therefore changes nothing for a class already at standard or high
    mobility, because mobilityFactor returns 1 for both -- the same limit that
    applies to Swiftness, and it stays until that table is widened. */
 /* Deliberately no longer promotes mobility. Class mobility and build uptime are
    different claims and were being conflated: stacking Swiftness does not turn a
    Gunlancer into an Artist, and treating it that way made seven of eight
    characters in a real lobby read `high`, which discriminates nothing. Class
    mobility stays whatever the class is; build uptime is scored separately by
    uptimeFactor, so a slow class that invested in speed keeps its penalty and
    earns a smaller bonus beside it -- which is what actually happens. */
 const wantsMobility=false;
 const wantsGuard=r.guard>=2;
 if(!wantsBurst&&!wantsMobility&&!wantsGuard)return bh;
 const out={...bh,evidence:(bh.evidence||[]).slice()};
 if(wantsMobility&&out.mobility!=='high'){
  out.mobility=out.mobility==='low'?'standard':'high';
  out.evidence.push(dom==='swiftness'
   ? `Swiftness ${stats[dom]}/${stats.total} — mobility read up one step`
   : r.judgmentCombo
     ? 'Conviction + Judgment runes paired — cooldown window'
     : `Uptime runes (${r.uptime.toFixed(1)} pts) — speed and cooldown`);
 }
 if(wantsBurst&&out.burstDependency!=='high'){
  out.burstDependency='high';
  out.evidence.push(dom==='specialization'
   ? `Specialization ${stats[dom]}/${stats.total} — identity-driven burst`
   : `${r.identity} Wealth runes — identity-driven burst`);
 }
 /* Two or more defensive runes is a build choosing to survive casts rather than
    shorten them, which is what push resilience means here. One is noise. */
 if(wantsGuard&&out.pushResilience!=='high'){
  out.pushResilience='high';
  out.evidence.push(`${r.guard} Protection / Iron Wall runes — casts defended`);
 }
 return out}
/* High mobility used to return 1, exactly like standard, so mobility could only
   ever cost a character and never earn them anything. That made every signal
   pointing at it -- Swiftness, the Conviction/Judgment pair, Rage, Quick
   Recharge, Galewind -- inert for any class not already flagged `low`, which is
   to say almost all of them.

   `high` now earns a bonus that scales with how much the fight moves you, the
   same shape burstFactor uses for burst windows, and `standard` stays the
   neutral baseline at 1.

   The bonus is deliberately about half the matching penalty: being too slow
   costs uptime directly and continuously, while extra speed past what the
   mechanics demand converts into progressively less -- you need enough to make
   the movement, and surplus beyond that buys little. Sized to sit with the
   model's other bonuses (burst 1.003-1.012, pushImmunity 1.01) rather than to
   mirror the penalty.

   `very-high` movement appears in no profile today; it is kept so the table
   stays complete if one is written. */
function mobilityFactor(level,mechanics){
 const m=mechanics?.movement||'low';
 if(level==='high'){
  if(m==='very-high')return 1.012;
  if(m==='high')return 1.01;
  if(m==='moderate-high')return 1.006;
  if(m==='moderate')return 1.003;
  return 1;
 }
 if(level==='low'){
  if(m==='very-high')return .975;
  if(m==='high')return .98;
  if(m==='moderate-high')return .985;
  if(m==='moderate')return .992;
 }
 return 1}
/* Build-bought uptime, kept separate from class mobility above. Points:
     Swiftness dominant (24+ of 40)   2
     Conviction + Judgment paired     2
     uptime runes                     Rage 1.0, Quick Recharge 0.5, Galewind 0.5
   Two points is the floor -- one incidental Galewind is not a decision -- and it
   saturates at four, because a build only has so many slots and the returns on
   piling more speed into the same rotation fall away.

   Scaled by how much the fight moves you, for the same reason mobility is: speed
   is worth little on a stationary gate. Smaller than the class-mobility bonus,
   because runes and a stat line move a character less than the class they
   picked. */
function uptimeFactor(points,mechanics){
 if(!(points>=2))return 1;
 const m=mechanics?.movement||'low';
 const scale=m==='very-high'?1:m==='high'?.8:m==='moderate-high'?.6:m==='moderate'?.4:0;
 if(!scale)return 1;
 return 1+.008*scale*(Math.min(points,4)/4)}
function uptimePoints(stats,runes){
 const r=runes||{};
 return (stats&&stats.dominant==='swiftness'?2:0)+(r.judgmentCombo?2:0)+(r.uptime||0)}
function burstFactor(level,mechanics){const w=mechanics?.burstWindows||'low';if(level==='high'){if(w==='very-high')return 1.012;if(w==='high')return 1.008;if(w==='moderate')return 1.003}return 1}
function pushFactor(level,mechanics){if(level==='high'&&mechanics?.forcedPositioning==='very-high')return 1.005;return 1}
function supportStatsFor(cls){try{const stats=window.LostArkSupportStats?.summary?.(cls);return stats&&typeof stats==='object'?stats:null}catch{return null}}
function supportUptimeFactor(cls){
 const stats=supportStatsFor(cls);if(!stats)return{factor:1,weighted:null,metrics:[],source:'encounter-model'};
 const weights={ap:.30,brand:.25,ha:.15,identity:.30};let weighted=0,totalWeight=0;
 for(const key of Object.keys(weights)){const value=Number(stats[key]);if(Number.isFinite(value)){const uptime=value>1?value/100:value;weighted+=Math.max(0,Math.min(1,uptime))*weights[key];totalWeight+=weights[key]}}
 if(!totalWeight)return{factor:1,weighted:null,metrics:[],source:'encounter-model'};
 weighted/=totalWeight;
 // Bible uptime is an empirical support-performance signal, not a direct DPS multiplier.
 // Keep the encounter model dominant while allowing real raid data to distinguish supports.
 const factor=.80+.20*weighted;
 return{factor,weighted,metrics:Object.keys(weights).filter(k=>Number.isFinite(Number(stats[k]))),source:'bible'};
}
/* How much a fight pulls the party apart, 0 (stationary) to 1 (constant movement
   plus forced repositioning). Both mechanics matter: movement scatters the party,
   forced positioning decides where they end up. */
const PRESSURE={'very-high':1,high:.75,'moderate-high':.5,moderate:.25,low:0};
function scatterPressure(p){const m=PRESSURE[p.mechanics?.movement]??0,f=PRESSURE[p.mechanics?.forcedPositioning]??0;return (m+f)/2}
/* A flexible, area-style support (Valkyrie, Paladin) keeps buffs on a party that
   is forced to spread out; a placement-sensitive one (Bard, Artist) needs the
   party to come to the buff and loses uptime when the fight will not allow it.
   That difference used to be worth +-0.5% and only on very-high forced
   positioning, so on extreme content two supports landed within 0.1 points of
   each other and then both hit the clamp floor and displayed identically. It now
   scales with the fight's scatter pressure, up to +-2%, plus a smaller term for
   the support's own mobility -- how easily they can chase the party. */
function supportFactor(t,p){if(!t.support)return 1;
 const swing=.02*scatterPressure(p),place=t.behavior.supportPlacement;
 const placed=place==='flexible'?1+swing:place==='placement-sensitive'?1-swing:1;
 const mob=t.behavior.mobility==='high'?1+swing*.25:t.behavior.mobility==='low'?1-swing*.25:1;
 const base=Math.min(1,p.support*placed*mob);
 const live=supportUptimeFactor(t.cls);return base*live.factor}
function characterScore(c){const p=profile();if(!p)return{score:1,components:{},reasons:[]};const t=traits(c);let score=p.baseUptime||1;const components={baseUptime:p.baseUptime||1};const reasons=[];
 const posKey=t.position==='backattack'?'back':t.position==='frontattack'?'front':t.position==='hitmaster'?'hitmaster':null;if(posKey){score*=p[posKey];components.position=p[posKey];reasons.push(`${t.positionLabel} uptime × ${p[posKey].toFixed(3)}`)}else components.position=1;
 if(t.ranged){score*=p.ranged;components.range=p.ranged;reasons.push(`Ranged uptime × ${p.ranged.toFixed(3)}`)}else if(t.cls){score*=p.melee;components.range=p.melee;reasons.push(`Melee uptime × ${p.melee.toFixed(3)}`)}else components.range=1;
 if(t.burst){score*=p.burst;components.burst=p.burst;reasons.push(`Burst-window value × ${p.burst.toFixed(3)}`)}else components.burst=1;
 const mf=mobilityFactor(t.behavior.mobility,p.mechanics);score*=mf;components.mobility=mf;if(mf!==1)reasons.push(`${t.behavior.mobility} mobility vs ${p.mechanics?.movement||'unknown'} movement × ${mf.toFixed(3)}`);
 const bf=burstFactor(t.behavior.burstDependency,p.mechanics);score*=bf;components.buildBurst=bf;if(bf!==1)reasons.push(`Build burst dependence vs encounter windows × ${bf.toFixed(3)}`);
 const pf=pushFactor(t.behavior.pushResilience,p.mechanics);score*=pf;components.pushResilience=pf;if(pf!==1)reasons.push(`Push resilience × ${pf.toFixed(3)}`);
 /* mechanics.stagger was carried in every encounter profile and read by nothing.
    Skill runes are the per-character half of it: a build spending rune slots on
    Overwhelm or Vision has given up damage for stagger, which is worth something
    on a gate with stagger checks and nothing on one without. */
 const upf=uptimeFactor(t.uptimePoints||0,p.mechanics);score*=upf;components.buildUptime=upf;
 if(upf!==1)reasons.push(`Build uptime (${(t.uptimePoints||0).toFixed(1)} pts) vs ${p.mechanics?.movement||'unknown'} movement × ${upf.toFixed(3)}`);
 const stf=staggerFactor(t.runes?.stagger||0,p.mechanics);score*=stf;components.stagger=stf;
 if(stf!==1)reasons.push(`Stagger runes vs ${p.mechanics?.stagger||'unknown'} stagger demand × ${stf.toFixed(3)}`);
 const sf=supportFactor(t,p);if(t.support){score*=sf;components.support=sf;const live=supportUptimeFactor(t.cls);if(live.source==='bible'){components.bibleSupportUptime=live.factor;if(live.weighted!==null)components.bibleWeightedUptime=live.weighted;reasons.push(`Bible support uptime × ${live.factor.toFixed(3)} (${(live.weighted*100).toFixed(1)}% weighted uptime)`)}else reasons.push(`Support encounter fit × ${sf.toFixed(3)}`)}else components.support=1;
 /* The floor was .75, which extreme content reached for every support, so real
    differences between them were flattened into one identical number. .60 leaves
    the guard against a runaway product while letting the model separate them. */
 score=Math.max(.60,Math.min(1.15,score));return{score,components,reasons,profile:p.name,confidence:p.confidence,traits:t};}
function partyScore(chars){const results=(chars||[]).map(characterScore);if(!results.length)return{score:0,characters:[],partyFactors:{}};const avg=results.reduce((s,r)=>s+r.score,0)/results.length;const supports=results.filter((r,i)=>traits(chars[i]).support).length;return{score:avg,characters:results,partyFactors:{averageEncounterFit:avg,supportCount:supports}}}
function explain(chars){const r=partyScore(chars);return{...r,encounter:profile()?.name||null,mechanics:profile()?.mechanics||{}}}
window.LostArkEncounterScoring={profiles:PROFILES,selected,profile,traits,characterScore,partyScore,explain};
})();
