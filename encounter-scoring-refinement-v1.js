/* Lost Ark Hideout — encounter scoring refinement v1 */
(()=>{
'use strict';

/*
  This layer refines the authoritative encounter scorer without changing the
  stored character CP or the encounter baseline factors. It translates
  encounter mechanics into interactions with the build behavior traits already
  extracted by encounter-scoring-v2.js.

  Important: these are bounded encounter-fit adjustments, not damage bonuses.
  A build only receives a benefit when its existing behavior is specifically
  compatible with the encounter mechanic; otherwise the factor remains 1.
*/
const S=window.LostArkEncounterScoring;
if(!S)return;

const clamp=(v,min=.75,max=1.15)=>Math.max(min,Math.min(max,v));
const rank=v=>({low:1,standard:2,moderate:2,high:3,'moderate-high':3,'very-high':4}[v]||0);

function mechanicFit(t,p){
 const m=p?.mechanics||{};
 const b=t?.behavior||{};
 let score=1;
 const components={movement:1,positioning:1,burstWindows:1,objectiveWindows:1,pushPressure:1,supportPlacement:1};
 const reasons=[];
 const movement=rank(m.movement), forced=rank(m.forcedPositioning), burst=rank(m.burstWindows);

 /* Movement: low-mobility builds lose a little additional usable uptime in
    encounters where repositioning is a major part of the damage loss. High
    mobility avoids that penalty; it does not receive a fabricated bonus. */
 if(b.mobility==='low'){
   const f=movement>=4?.975:movement===3?.985:movement===2?.993:1;
   components.movement=f;score*=f;
   if(f!==1)reasons.push(`Low-mobility movement interaction × ${f.toFixed(3)}`);
 }

 /* Positional builds are especially sensitive when the encounter repeatedly
    forces the character away from the preferred side. High mobility offsets
    that extra risk rather than creating a positive multiplier. */
 if((t.position==='backattack'||t.position==='frontattack')&&forced>=3){
   const f=b.mobility==='low'?.985:b.mobility==='standard'?.995:1;
   components.positioning=f;score*=f;
   if(f!==1)reasons.push(`Positional forced-movement interaction × ${f.toFixed(3)}`);
 }

 /* Sustained builds need enough continuous uptime to exploit their normal
    rotation. Highly compressed burst windows can therefore favor burst builds
    relative to sustained builds, while never penalizing sustained builds just
    because they are sustained. */
 if(b.burstDependency==='high'&&burst>=4){
   const f=1.006;components.burstWindows=f;score*=f;
   reasons.push(`High burst dependence in very-high burst-window encounter × ${f.toFixed(3)}`);
 }

 /* Stagger/destruction phases are treated as objective windows. Burst builds
    are better positioned to capitalize on compressed windows; this is kept
    very small because the actual contribution depends on the encounter and
    skill rotation. */
 if((m.stagger==='high'||m.destruction==='high')&&b.burstDependency==='high'){
   const f=1.004;components.objectiveWindows=f;score*=f;
   reasons.push(`Burst build vs stagger/destruction windows × ${f.toFixed(3)}`);
 }

 /* Push resilience only matters when the encounter's forced-positioning load
    is high. Do not turn generic class identity into a DPS multiplier. */
 if(forced>=3&&b.pushResilience==='high'){
   components.pushPressure=1;
 }else if(forced>=3&&b.pushResilience==='standard'&&b.mobility==='low'){
   const f=.995;components.pushPressure=f;score*=f;
   reasons.push(`Low-mobility standard push resilience under forced positioning × ${f.toFixed(3)}`);
 }

 /* Supports are scored separately. Placement-sensitive supports lose a small
    amount of encounter fit only when positioning is genuinely disruptive. */
 if(t.support&&b.supportPlacement==='placement-sensitive'&&forced>=4){
   const f=.99;components.supportPlacement=f;score*=f;
   reasons.push(`Placement-sensitive support under very-high forced positioning × ${f.toFixed(3)}`);
 }

 return{score:clamp(score),components,reasons};
}

const baseCharacterScore=S.characterScore.bind(S);
S.characterScore=function(c){
 const base=baseCharacterScore(c);
 if(!base||!base.traits)return base;
 const p=S.profile?.();
 if(!p)return base;
 const fit=mechanicFit(base.traits,p);
 const score=clamp(base.score*fit.score);
 return{
   ...base,
   score,
   components:{...(base.components||{}),mechanicFit:fit.score,mechanicInteractions:fit.components},
   reasons:[...(base.reasons||[]),...fit.reasons]
 };
};

/* Party scoring is deliberately an arithmetic average. There is no hidden
   positional-coherence, class-combination, or no-support bonus/penalty. */
S.partyScore=function(chars){
 const list=chars||[];
 const results=list.map(S.characterScore);
 if(!results.length)return{score:0,characters:[],partyFactors:{}};
 const avg=results.reduce((sum,r)=>sum+(r.score||1),0)/results.length;
 const supports=results.filter((r,i)=>S.traits(list[i]).support).length;
 return{
   score:avg,
   characters:results,
   partyFactors:{averageEncounterFit:avg,supportCount:supports}
 };
};

S.explain=function(chars){
 const r=S.partyScore(chars);
 return{...r,encounter:S.profile?.()?.name||null,mechanics:S.profile?.()?.mechanics||{}};
};

window.LostArkEncounterScoringRefinementV1={mechanicFit};
})();
