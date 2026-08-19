/* Lost Ark Hideout — encounter scoring engine v5 */
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
function traits(c){const t=text(c),p=c?.profile||c?.data||{},b=build(c),cls=parseClassName(p.class||p.className||p.characterClass||'');let position=b.positional&&b.positional!=='Unknown'?b.positional:'unknown';const bh=behaviorFor(cls,b.engravings||[],t,b.behavior||{});
 if(bh.positioning)position=bh.positioning==='back'?'Back Attack':bh.positioning==='hitmaster'?'Hit Master':bh.positioning==='front'?'Front Attack':position;
 if(position==='unknown'){if(POSITIONAL.back.test(t))position='Back Attack';else if(POSITIONAL.front.test(t))position='Front Attack';else if(POSITIONAL.hitmaster.test(t))position='Hit Master'}
 const burst=Boolean(b.burst)||bh.burstDependency==='high'||/igniter|punisher|full moon|surge|death strike|identity burst|master summoner|asura.?s path|brawl king storm|robust spirit|deathblow/i.test(t);
 const support=SUPPORT_CLASSES.has(cls);
 return{cls,position:String(position).toLowerCase().replace(/\s+/g,''),positionLabel:position,burst,support,ranged:CLASS_RANGED.has(cls),behavior:bh};}
function mobilityFactor(level,mechanics){const m=mechanics?.movement||'low';if(level==='high')return 1;if(level==='low'){if(m==='very-high')return .975;if(m==='high')return .98;if(m==='moderate-high')return .985;if(m==='moderate')return .992}return 1}
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
function supportFactor(t,p){if(!t.support)return 1;const base=t.behavior.supportPlacement==='placement-sensitive'&&p.mechanics?.forcedPositioning==='very-high'?p.support*.995:t.behavior.supportPlacement==='flexible'?Math.min(1,p.support*1.002):p.support;const live=supportUptimeFactor(t.cls);return base*live.factor}
function characterScore(c){const p=profile();if(!p)return{score:1,components:{},reasons:[]};const t=traits(c);let score=p.baseUptime||1;const components={baseUptime:p.baseUptime||1};const reasons=[];
 const posKey=t.position==='backattack'?'back':t.position==='frontattack'?'front':t.position==='hitmaster'?'hitmaster':null;if(posKey){score*=p[posKey];components.position=p[posKey];reasons.push(`${t.positionLabel} uptime × ${p[posKey].toFixed(3)}`)}else components.position=1;
 if(t.ranged){score*=p.ranged;components.range=p.ranged;reasons.push(`Ranged uptime × ${p.ranged.toFixed(3)}`)}else if(t.cls){score*=p.melee;components.range=p.melee;reasons.push(`Melee uptime × ${p.melee.toFixed(3)}`)}else components.range=1;
 if(t.burst){score*=p.burst;components.burst=p.burst;reasons.push(`Burst-window value × ${p.burst.toFixed(3)}`)}else components.burst=1;
 const mf=mobilityFactor(t.behavior.mobility,p.mechanics);score*=mf;components.mobility=mf;if(mf!==1)reasons.push(`${t.behavior.mobility} mobility vs ${p.mechanics?.movement||'unknown'} movement × ${mf.toFixed(3)}`);
 const bf=burstFactor(t.behavior.burstDependency,p.mechanics);score*=bf;components.buildBurst=bf;if(bf!==1)reasons.push(`Build burst dependence vs encounter windows × ${bf.toFixed(3)}`);
 const pf=pushFactor(t.behavior.pushResilience,p.mechanics);score*=pf;components.pushResilience=pf;if(pf!==1)reasons.push(`Push resilience × ${pf.toFixed(3)}`);
 const sf=supportFactor(t,p);if(t.support){score*=sf;components.support=sf;const live=supportUptimeFactor(t.cls);if(live.source==='bible'){components.bibleSupportUptime=live.factor;if(live.weighted!==null)components.bibleWeightedUptime=live.weighted;reasons.push(`Bible support uptime × ${live.factor.toFixed(3)} (${(live.weighted*100).toFixed(1)}% weighted uptime)`)}else reasons.push(`Support encounter fit × ${sf.toFixed(3)}`)}else components.support=1;
 score=Math.max(.75,Math.min(1.15,score));return{score,components,reasons,profile:p.name,confidence:p.confidence,traits:t};}
function partyScore(chars){const results=(chars||[]).map(characterScore);if(!results.length)return{score:0,characters:[],partyFactors:{}};const avg=results.reduce((s,r)=>s+r.score,0)/results.length;const supports=results.filter((r,i)=>traits(chars[i]).support).length;return{score:avg,characters:results,partyFactors:{averageEncounterFit:avg,supportCount:supports}}}
function explain(chars){const r=partyScore(chars);return{...r,encounter:profile()?.name||null,mechanics:profile()?.mechanics||{}}}
window.LostArkEncounterScoring={profiles:PROFILES,selected,profile,traits,characterScore,partyScore,explain};
})();
