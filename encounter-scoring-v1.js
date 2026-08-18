/* Lost Ark Hideout — encounter scoring engine v2 */
(()=>{
'use strict';

/*
  Raid Specific Optimization never changes stored CP.
  The encounter profile describes expected usable performance and is applied
  only to the candidate ranking calculation.

  Important: the selector intentionally collapses difficulty/stage variants:
  - Horizon Cathedral: one entry per gate (Levels 1/2/3 share the entry)
  - Serca: one entry per gate (Normal/Hard/Nightmare share the entry)
  - Extreme Aegir/Brelshaza: one entry each, Gate 2

  Numeric factors are conservative model estimates, not hidden game damage
  multipliers. They are kept close to 1.0 until better measured data exists.
*/

const CLASS_RANGED=new Set([
 'Sorceress','Sharpshooter','Artillerist','Machinist','Scouter','Summoner',
 'Aeromancer','Gunslinger','Deadeye','Arcana','Arcanist'
]);
const SUPPORT_CLASSES=new Set(['Bard','Artist','Paladin']);
const POSITIONAL={
 back:/ambush master|back attack|back[- ]attack/i,
 front:/master brawler|front attack|front[- ]attack/i,
 hitmaster:/hit master/i
};

const PROFILES={
 'horizon-cathedral-g1':{
  name:'Horizon Cathedral — Gate 1',category:'current',confidence:'evidence-backed',
  baseUptime:.955,back:.965,front:.975,hitmaster:.995,melee:.975,ranged:.995,
  burst:1.015,mobility:1,pushImmunity:1,support:.995,
  mechanics:{justGuard:true,movement:'moderate',forcedPositioning:'moderate',burstWindows:'moderate'},
  notes:['Cathedral Levels 1–3 are intentionally collapsed into one Gate 1 selector entry','Just Guard failures and the Impact debuff can force players away from normal uptime','Bell/hammer and safe-zone mechanics create short repositioning windows']
 },
 'horizon-cathedral-g2':{
  name:'Horizon Cathedral — Gate 2',category:'current',confidence:'evidence-backed',
  baseUptime:.94,back:.95,front:.975,hitmaster:.995,melee:.96,ranged:1,
  burst:1.025,mobility:1,pushImmunity:1,support:.99,
  mechanics:{justGuard:true,movement:'moderate-high',forcedPositioning:'high',burstWindows:'moderate'},
  notes:['Cathedral Levels 1–3 are intentionally collapsed into one Gate 2 selector entry','Gate 2 has more disruptive pattern positioning than Gate 1','The model favors flexible uptime without imposing a blanket ranged bonus']
 },
 'serca-g1':{
  name:'Serca — Gate 1',category:'current',confidence:'evidence-backed',
  baseUptime:.92,back:.91,front:.95,hitmaster:.965,melee:.955,ranged:.965,
  burst:1.015,mobility:1,pushImmunity:1,support:.97,
  mechanics:{brawl:true,movement:'high',forcedPositioning:'high',burstWindows:'high',sharedRevives:true},
  notes:['Normal/Hard/Nightmare are intentionally collapsed into one Gate 1 selector entry','Broom, anvil, wall and multiplication patterns repeatedly change safe positioning','Brawl is modeled as a coordinated burst opportunity rather than a CP multiplier','Shared Brave Hearts make survival/consistency relevant to party value']
 },
 'serca-g2':{
  name:'Serca — Gate 2',category:'current',confidence:'evidence-backed',
  baseUptime:.91,back:.90,front:.96,hitmaster:.98,melee:.95,ranged:.995,
  burst:1.04,mobility:1,pushImmunity:1,support:.96,
  mechanics:{brawl:true,movement:'high',forcedPositioning:'high',burstWindows:'very-high',sharedRevives:true},
  notes:['Normal/Hard/Nightmare are intentionally collapsed into one Gate 2 selector entry','Gate 2 has a heavier pattern/DPS burden than Gate 1','Rumble/Brawl creates a meaningful coordinated burst opportunity','Official early data shows Corvus Tul Rak accounted for 52% of Serca deaths']
 },
 'kazeros-g1':{
  name:'Kazeros — Gate 1',category:'current',confidence:'mechanics-modeled',
  baseUptime:.945,back:.945,front:.965,hitmaster:.985,melee:.935,ranged:.99,
  burst:1.035,mobility:1,pushImmunity:1.01,support:.97,
  mechanics:{movement:'moderate-high',forcedPositioning:'moderate',stagger:'high',destruction:'high',burstWindows:'high'},
  notes:['Stagger, destruction and weakness mechanics create discrete damage windows','Back access matters during portions of the encounter, but is not treated as universally available','Burst value is tied to compressed mechanic windows']
 },
 'kazeros-g2':{
  name:'Kazeros — Gate 2',category:'current',confidence:'mechanics-modeled',
  baseUptime:.925,back:.925,front:.955,hitmaster:.985,melee:.925,ranged:.99,
  burst:1.045,mobility:1,pushImmunity:1.01,support:.965,
  mechanics:{movement:'high',forcedPositioning:'high',stagger:'high',destruction:'high',burstWindows:'very-high'},
  notes:['Gimmick-heavy phases compress normal damage time','Stagger/destruction transitions create concentrated burst opportunities','Flexible uptime is valued without granting a universal ranged multiplier']
 },
 'armoche-g1':{
  name:'Armoche — Gate 1',category:'optional',confidence:'mechanics-modeled',
  baseUptime:.945,back:.945,front:.96,hitmaster:.985,melee:.94,ranged:.99,
  burst:1.03,mobility:1,pushImmunity:1,support:.975,
  mechanics:{justGuard:true,movement:'high',forcedPositioning:'moderate-high',burstWindows:'high'},
  notes:['Armoche is Act 4 / Fortress of Destruction and remains an optional active choice','Gate 1 begins with Covetous Master Echidna','Just Guard and movement mechanics create controlled downtime']
 },
 'armoche-g2':{
  name:'Armoche — Gate 2',category:'optional',confidence:'mechanics-modeled',
  baseUptime:.935,back:.935,front:.965,hitmaster:.99,melee:.935,ranged:.99,
  burst:1.04,mobility:1,pushImmunity:1.01,support:.97,
  mechanics:{justGuard:true,movement:'high',forcedPositioning:'high',stagger:'high',burstWindows:'very-high'},
  notes:['Gate 2 is Armoche, Sentinel of the Abyss','The 450/420/360/290/240/150/65-bar sequence creates distinct mechanic and damage phases','Co-op and stagger mechanics compress usable DPS windows']
 },
 'extreme-aegir-g2':{
  name:'[EXTREME] Aegir — Gate 2',category:'extreme',confidence:'mechanics-modeled',
  baseUptime:.91,back:.92,front:.95,hitmaster:.985,melee:.91,ranged:.995,
  burst:1.05,mobility:1,pushImmunity:1.01,support:.955,
  mechanics:{justGuard:true,movement:'high',forcedPositioning:'high',burstWindows:'very-high',extreme:true},
  notes:['Extreme Aegir is kept separate from retired normal Aegir','The selector intentionally represents the Extreme encounter as Gate 2 only','Extreme execution pressure is modeled through uptime/positioning, not an arbitrary CP penalty']
 },
 'extreme-brelshaza-g2':{
  name:'[EXTREME] Brelshaza — Gate 2',category:'extreme',confidence:'mechanics-modeled',
  baseUptime:.90,back:.90,front:.95,hitmaster:.99,melee:.90,ranged:1,
  burst:1.05,mobility:1,pushImmunity:1.01,support:.95,
  mechanics:{movement:'high',forcedPositioning:'very-high',burstWindows:'very-high',extreme:true},
  notes:['Extreme Brelshaza is kept separate from retired normal Brelshaza','The selector intentionally represents the Extreme encounter as Gate 2 only','High positional pressure is modeled separately from raw character CP']
 }
};

function selected(){const m=window.LostArkOptimizerMode;return m&&!m.general&&m.raid?m.raid:null}
function profile(){const id=selected();return id?PROFILES[id]||null:null}
function text(c){try{return JSON.stringify(c||{}).toLowerCase()}catch{return ''}}
function build(c){try{return window.LostArkBuildProfilesV2?.get(c.url)||{}}catch{return{}}}
function traits(c){
 const t=text(c),p=c?.profile||c?.data||{},b=build(c);
 const cls=String(p.class||p.className||p.characterClass||'');
 let position=b.positional&&b.positional!=='Unknown'?b.positional:'unknown';
 if(position==='unknown'){
  if(POSITIONAL.back.test(t))position='Back Attack';
  else if(POSITIONAL.front.test(t))position='Front Attack';
  else if(POSITIONAL.hitmaster.test(t))position='Hit Master';
 }
 const burst=Boolean(b.burst)||/igniter|punisher|full moon|surge|death strike|identity burst/i.test(t);
 const support=SUPPORT_CLASSES.has(cls);
 return {cls,position:String(position).toLowerCase().replace(/\s+/g,''),positionLabel:position,burst,support,ranged:CLASS_RANGED.has(cls)};
}
function characterScore(c){
 const p=profile();if(!p)return{score:1,components:{},reasons:[]};
 const t=traits(c);let score=p.baseUptime||1;const components={baseUptime:p.baseUptime||1};const reasons=[];
 const posKey=t.position==='backattack'?'back':t.position==='frontattack'?'front':t.position==='hitmaster'?'hitmaster':null;
 if(posKey){score*=p[posKey];components.position=p[posKey];reasons.push(`${t.positionLabel} uptime × ${p[posKey].toFixed(3)}`)}else components.position=1;
 if(t.ranged){score*=p.ranged;components.range=p.ranged;reasons.push(`Ranged uptime × ${p.ranged.toFixed(3)}`)}
 else if(t.cls){score*=p.melee;components.range=p.melee;reasons.push(`Melee uptime × ${p.melee.toFixed(3)}`)}else components.range=1;
 if(t.burst){score*=p.burst;components.burst=p.burst;reasons.push(`Burst-window value × ${p.burst.toFixed(3)}`)}else components.burst=1;
 if(t.support){score*=p.support;components.support=p.support;reasons.push(`Support encounter fit × ${p.support.toFixed(3)}`)}else components.support=1;
 /* Push-immunity is reported but is not blindly multiplied into DPS. It only
    becomes score-bearing once a character/build exposes a reliable immunity trait. */
 components.pushImmunity=p.pushImmunity||1;
 score=Math.max(.75,Math.min(1.15,score));
 return{score,components,reasons,profile:p.name,confidence:p.confidence};
}
function partyScore(chars){
 const results=(chars||[]).map(characterScore);if(!results.length)return{score:0,characters:[],partyFactors:{}};
 const avg=results.reduce((s,r)=>s+r.score,0)/results.length;
 const supports=results.filter((r,i)=>traits(chars[i]).support).length;
 const positional=results.map((r,i)=>traits(chars[i]).position).filter(x=>x!=='unknown');
 let coherence=1;if(positional.length>1&&new Set(positional).size>=3)coherence=.985;
 const partyFactors={averageEncounterFit:avg,supportCount:supports,positionalCoherence:coherence};
 return{score:avg*coherence,characters:results,partyFactors};
}
function explain(chars){const r=partyScore(chars);return{...r,encounter:profile()?.name||null,mechanics:profile()?.mechanics||{}}}
window.LostArkEncounterScoring={profiles:PROFILES,selected,profile,traits,characterScore,partyScore,explain};
})();
