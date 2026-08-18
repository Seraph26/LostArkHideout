/* Lost Ark Hideout — party optimization v1 */
(()=>{
'use strict';
const S=window.LostArkEncounterScoring;
if(!S)return;

/*
  Composition layer. Character encounter scores remain the primary signal;
  composition synergy is deliberately bounded so a mechanically awkward but
  much stronger character is not automatically rejected.

  This module evaluates complete 4-player parties rather than greedily taking
  the four highest individual scores. It does not alter stored CP.
*/
const clamp=(v,min=.85,max=1.15)=>Math.max(min,Math.min(max,v));
const combinations=(arr,k)=>{
 const out=[];
 const walk=(start,p)=>{
  if(p.length===k){out.push(p.slice());return}
  for(let i=start;i<=arr.length-(k-p.length);i++){p.push(arr[i]);walk(i+1,p);p.pop()}
 };
 walk(0,[]);return out;
};

function traits(c){try{return S.traits(c)||{}}catch{return{}}}
function supportQuality(t){
 if(!t.support)return 0;
 const b=t.behavior||{};
 return b.supportPlacement==='flexible'?1:b.supportPlacement==='placement-sensitive'?.98:1;
}

/* Only apply a synergy adjustment when the existing trait data establishes a
   real composition interaction. No generic class-combination bonuses. */
function compositionFit(chars){
 const ts=chars.map(traits);
 const supports=ts.filter(t=>t.support);
 const dps=ts.filter(t=>!t.support);
 let factor=1;
 const reasons=[];

 if(supports.length){
   const sq=supports.reduce((a,t)=>a+supportQuality(t),0)/supports.length;
   factor*=clamp(1+(sq-1)*.5,.98,1);
 }

 /* A party containing multiple positional DPS is not automatically penalized.
    The encounter scorer already accounts for positional uptime. This layer
    only records the composition so future verified buff/debuff interactions can
    be added without inventing a bonus today. */
 const positions={back:0,front:0,hitmaster:0};
 dps.forEach(t=>{const p=String(t.position||'').replace(/\s/g,'');if(p==='backattack')positions.back++;else if(p==='frontattack')positions.front++;else if(p==='hitmaster')positions.hitmaster++});

 return{factor:clamp(factor),reasons,positions,supportCount:supports.length,dpsCount:dps.length};
}

function scoreParty(chars){
 const list=chars||[];
 if(list.length!==4)return{score:0,characters:[],composition:null,valid:false};
 const results=list.map(c=>S.characterScore(c));
 const base=results.reduce((sum,r)=>sum+(r?.score||0),0)/results.length;
 const comp=compositionFit(list);
 return{
  score:base*comp.factor,
  baseScore:base,
  composition:comp,
  characters:results,
  valid:true
 };
}

function rankParties(chars,limit=10){
 const list=(chars||[]).filter(Boolean);
 return combinations(list,4).map(p=>scoreParty(p)).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,limit));
}

S.scoreParty=scoreParty;
S.rankParties=rankParties;
S.compositionFit=compositionFit;
window.LostArkPartyOptimizationV1={scoreParty,rankParties,compositionFit};
})();
