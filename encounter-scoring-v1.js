/* Lost Ark Hideout — encounter scoring engine v1 */
(()=>{
'use strict';

/*
  Encounter-aware scoring is deliberately separate from Combat Power.
  CP remains the character's actual value. This engine estimates usable
  encounter performance from build traits + encounter conditions.

  The engine is conservative: an absent trait receives no invented bonus.
  Scores are normalized to a neutral 1.0 baseline so General Optimization
  remains untouched and raid-specific scoring can be inspected independently.
*/

const CLASS_RANGED=new Set(['Sorceress','Sharpshooter','Artillerist','Machinist','Scouter','Summoner','Souleater','Soul Eater','Aeromancer','Gunslinger','Deadeye','Arcana','Arcanist']);
const SUPPORT_CLASSES=new Set(['Bard','Artist','Paladin']);
const POSITIONAL={back:/ambush master|back attack|back[- ]attack/i,front:/master brawler|front attack|front[- ]attack/i,hitmaster:/hit master/i};

const PROFILES={
 'serca-g1':{name:'Serca — Gate 1',confidence:'verified',uptime:.92,back:.91,front:.95,hitmaster:.96,melee:.96,ranged:.96,burst:.97,mobility:1,support:.97,notes:['High positional disruption','Brawl creates controlled burst windows','Shared resurrection makes consistency relevant']},
 'serca-g2':{name:'Serca — Gate 2',confidence:'verified',uptime:.91,back:.90,front:.96,hitmaster:.98,melee:.96,ranged:1,burst:1.04,mobility:1,support:.96,notes:['High-pressure DPS check','Frequent movement/pattern downtime','Rumble/Brawl create discrete burst windows']},
 'horizon-cathedral-g1':{name:'Horizon Cathedral — Gate 1',confidence:'modeled',uptime:.96,back:.96,front:.97,hitmaster:.99,melee:.97,ranged:.99,burst:1.01,mobility:1,support:.99,notes:['Level variants are treated as the same encounter entry','Moderate movement and positioning demands']},
 'horizon-cathedral-g2':{name:'Horizon Cathedral — Gate 2',confidence:'modeled',uptime:.94,back:.94,front:.97,hitmaster:.99,melee:.95,ranged:.99,burst:1.02,mobility:1,support:.98,notes:['Level variants are treated as the same encounter entry','Higher pattern disruption than Gate 1']},
 'kazeros-g1':{name:'Kazeros — Gate 1',confidence:'modeled',uptime:.94,back:.94,front:.96,hitmaster:.98,melee:.93,ranged:.99,burst:1.04,mobility:1,support:.96,notes:['Mechanic phases compress usable DPS windows','Burst and flexible uptime are valuable']},
 'kazeros-g2':{name:'Kazeros — Gate 2',confidence:'modeled',uptime:.92,back:.92,front:.95,hitmaster:.98,melee:.92,ranged:.99,burst:1.05,mobility:1,support:.96,notes:['Gimmick-heavy phases create discrete damage windows','Flexible ranged uptime and burst are valuable']},
 'armoche-g1':{name:'Armoche — Gate 1',confidence:'modeled',uptime:.94,back:.94,front:.95,hitmaster:.98,melee:.93,ranged:.99,burst:1.03,mobility:1,support:.97,notes:['Repositioning and controlled mechanic downtime','Burst windows reward coordinated timing']},
 'armoche-g2':{name:'Armoche — Gate 2',confidence:'modeled',uptime:.93,back:.93,front:.96,hitmaster:.99,melee:.93,ranged:.99,burst:1.04,mobility:1,support:.97,notes:['Large-area mechanics disrupt sustained uptime','Coordinated burst windows']},
 'extreme-aegir-g2':{name:'[EXTREME] Aegir — Gate 2',confidence:'modeled',uptime:.90,back:.91,front:.94,hitmaster:.98,melee:.90,ranged:.99,burst:1.06,mobility:1,support:.95,notes:['Extreme variant is modeled independently from normal Aegir','Higher execution pressure and compressed damage windows']},
 'extreme-brelshaza-g2':{name:'[EXTREME] Brelshaza — Gate 2',confidence:'modeled',uptime:.89,back:.89,front:.94,hitmaster:.99,melee:.89,ranged:1,burst:1.06,mobility:1,support:.95,notes:['Extreme variant is modeled independently from normal Brelshaza','High positioning and pattern pressure']}
};

function selected(){const m=window.LostArkOptimizerMode;return m&&!m.general&&m.raid?m.raid:null}
function profile(){const id=selected();return id?PROFILES[id]||null:null}
function text(c){try{return JSON.stringify(c||{}).toLowerCase()}catch{return ''}}
function traits(c){
 const t=text(c); const p=c?.profile||c?.data||{};
 const cls=String(p.class||p.className||p.characterClass||'');
 let position='unknown';
 try{
  const b=window.LostArkBuildProfilesV2?.get(c.url)||{};
  if(b.positional&&b.positional!=='Unknown')position=b.positional;
  else if(POSITIONAL.back.test(t))position='back';
  else if(POSITIONAL.front.test(t))position='front';
  else if(POSITIONAL.hitmaster.test(t))position='hitmaster';
 }catch{}
 const burst=/igniter|punisher|full moon|burst/i.test(t);
 return {cls,position,burst,support:SUPPORT_CLASSES.has(cls),ranged:CLASS_RANGED.has(cls)};
}
function characterScore(c){
 const p=profile(); if(!p)return {score:1,components:{},reasons:[]};
 const t=traits(c); const pos=t.position;
 let score=p.uptime||1;
 const components={baseUptime:p.uptime||1}; const reasons=[];
 if(pos==='back'){score*=p.back;components.position=p.back;reasons.push(`Back Attack uptime × ${p.back.toFixed(2)}`)}
 else if(pos==='front'){score*=p.front;components.position=p.front;reasons.push(`Front Attack uptime × ${p.front.toFixed(2)}`)}
 else if(pos==='hitmaster'){score*=p.hitmaster;components.position=p.hitmaster;reasons.push(`Hit Master uptime × ${p.hitmaster.toFixed(2)}`)}
 else components.position=1;
 if(t.ranged){score*=p.ranged;components.range=p.ranged;reasons.push(`Ranged uptime × ${p.ranged.toFixed(2)}`)}
 else if(t.cls){score*=p.melee;components.range=p.melee;reasons.push(`Melee uptime × ${p.melee.toFixed(2)}`)}
 if(t.burst){score*=p.burst;components.burst=p.burst;reasons.push(`Burst-window value × ${p.burst.toFixed(2)}`)}else components.burst=1;
 if(t.support){score*=p.support;components.support=p.support;reasons.push(`Support encounter uptime × ${p.support.toFixed(2)}`)}else components.support=1;
 score=Math.max(.75,Math.min(1.15,score));
 return {score,components,reasons,profile:p.name};
}
function partyScore(chars){
 const results=(chars||[]).map(characterScore);
 if(!results.length)return {score:0,characters:[],partyFactors:{}};
 const avg=results.reduce((s,r)=>s+r.score,0)/results.length;
 const supports=results.filter((r,i)=>traits(chars[i]).support).length;
 const partyFactors={averageEncounterFit:avg,supportCount:supports};
 /* Do not award an arbitrary support bonus. Support is reported separately;
    later party models can use actual buff/uptime data when available. */
 return {score:avg,characters:results,partyFactors};
}
function explain(chars){const r=partyScore(chars);return {...r,encounter:profile()?.name||null}}
window.LostArkEncounterScoring={profiles:PROFILES,selected,profile,traits,characterScore,partyScore,explain};
})();
