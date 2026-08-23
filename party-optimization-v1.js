/* Lost Ark Party — party optimization v2 */
(()=>{
'use strict';
const S=window.LostArkEncounterScoring;
if(!S)return;

/*
  Party composition layer.

  Important modeling rule:
  synergy is a marginal contribution, not a class bonus. A stronger DPS can
  remain preferable even when another DPS receives more synergy from the party.
  CP is never modified.

  The provider map below represents established Lost Ark party-synergy TYPES.
  Numerical encounter value is intentionally derived from the recipient's build
  traits rather than assigning every class a universal damage bonus.
*/
const combinations=(arr,k)=>{const out=[];const walk=(i,p)=>{if(p.length===k){out.push(p.slice());return}for(let n=i;n<=arr.length-(k-p.length);n++){p.push(arr[n]);walk(n+1,p);p.pop()}};walk(0,[]);return out};
const clamp=(v,min=.85,max=1.15)=>Math.max(min,Math.min(max,v));
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
function info(c){const p=c?.profile||c?.data||{};return{name:String(p.name||p.characterName||c?.name||'Unknown'),cls:String(p.class||p.className||p.characterClass||'Unknown'),role:String(p.role||'').toLowerCase()==='support'||['bard','artist','paladin','valkyrie'].includes(norm(p.class||p.className||p.characterClass))?'Support':'DPS',cp:Number(p.cp||p.combatPower||0)||0}}
function text(c){const p=c?.profile||c?.data||{};return String([p.rawText,p.text,p.engravingsText,p.arkGridText,p.arkPassiveText].filter(Boolean).join(' ')).toLowerCase()}
function build(c){try{return S.buildProfile?.(c)||window.LostArkBuildProfilesV3?.get?.(c.url)||window.LostArkBuildProfilesV2?.get?.(c.url)||{}}catch{return{}}}
function traits(c){try{return S.traits(c)||{}}catch{return{}}}

/* Verified synergy categories. Duplicate providers are not stacked here. */
const PROVIDERS={
 crit:new Set(['Arcanist','Aeromancer','Deadeye','Gunslinger','Striker','Wardancer','Glaivier']),
 damage:new Set(['Berserker','Shadowhunter','Scrapper','Sorceress','Sharpshooter','Summoner','Destroyer','Artillerist','Reaper','Slayer','Souleater','Breaker','Gunlancer']),
 positional:new Set(['Deathblade','Gunlancer']),
 attackSpeed:new Set(['Wardancer','Striker']),
 attackPower:new Set(['Soulfist','Machinist']),
 critDamage:new Set(['Glaivier']),
 mana:new Set(['Summoner'])
};
function hasClass(set,cls){return [...set].some(x=>norm(x)===norm(cls))}
function provided(c){const cls=info(c).cls;return Object.entries(PROVIDERS).filter(([,set])=>hasClass(set,cls)).map(([type])=>type)}

function recipientTraits(c){const b=build(c),t=text(c),i=info(c);return{
  crit:Math.min(1,Math.max(0,Number(b.critRate)||0)),
  keen:/keen blunt/.test(t),
  burst:!!b.burst||/igniter|full moon|punisher|surge|deathblow|burst/.test(t),
  positional:(b.positional&&b.positional!=='Unknown')?b.positional:traits(c).position||'',
  raidCaptain:/raid captain/.test(t),
  swift:/swiftness/.test(t)||Number(b.swiftness)>0,
  manaSensitive:/nightmare|boundless|mana/.test(t),
  role:i.role
}}

/*
  These are utility weights, not claims that a synergy is worth a fixed amount
  of DPS. They only determine how much of the already-established effect can be
  realized by this particular recipient. Final party value remains dominated by
  the character's own encounter score.
*/
function recipientUtility(c,type){const r=recipientTraits(c);if(r.role!=='DPS')return 0;
 if(type==='crit'){
   if(r.crit>=.95)return .05;
   if(r.keen||r.burst)return 1.15;
   return 1;
 }
 if(type==='critDamage')return r.keen||r.burst?1.15:1;
 if(type==='attackSpeed')return r.raidCaptain||r.swift?1.12:1;
 if(type==='positional')return r.positional==='Back Attack'||r.positional==='Front Attack'?1.15:r.positional==='Hit Master'?.55:.8;
 if(type==='mana')return r.manaSensitive?1.25:.2;
 if(type==='attackPower')return r.burst?1.08:1;
 if(type==='damage')return 1;
 return 0;
}

/*
  Convert a synergy effect into a bounded marginal party contribution. The
  coefficient is deliberately small because the character's encounter score
  already contains its primary performance. This prevents synergy from
  overpowering large CP/build differences.
*/
const EFFECT_SCALE={crit:.018,damage:.010,positional:.012,attackSpeed:.010,attackPower:.008,critDamage:.008,mana:.006};
function pairValue(provider,target,type){return EFFECT_SCALE[type]*(recipientUtility(target,type));}

function compositionFit(chars){
 const dps=chars.filter(c=>info(c).role==='DPS'),supports=chars.filter(c=>info(c).role==='Support');
 const contributions=[];let factor=1;
 for(const src of dps){for(const type of provided(src)){for(const target of dps){if(target===src)continue;const value=pairValue(src,target,type);if(value){contributions.push({source:info(src).name,target:info(target).name,type,value});factor+=value}}}}
 /* A party should have at most one source of each non-stacking synergy type.
    Repeated providers are therefore recorded but not multiplied. */
 const seen=new Set();let unique=0;for(const x of contributions){const key=`${x.type}:${x.target}`;if(!seen.has(key)){seen.add(key);unique+=x.value}}
 factor=1+Math.min(.08,unique);
 const supportCount=supports.length;
 return{factor:clamp(factor, .94,1.08),reasons:[],contributions,providerTypes:[...new Set(dps.flatMap(provided))],supportCount,dpsCount:dps.length};
}
function scoreParty(chars){const list=chars||[];if(list.length!==4)return{score:0,characters:[],composition:null,valid:false};const results=list.map(c=>S.characterScore(c));const base=results.reduce((n,r)=>n+(r?.score||0),0)/results.length;const comp=compositionFit(list);return{score:base*comp.factor,baseScore:base,composition:comp,characters:results,valid:true}}
function rankParties(chars,limit=10){return combinations((chars||[]).filter(Boolean),4).map(scoreParty).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,limit))}
S.scoreParty=scoreParty;S.rankParties=rankParties;S.compositionFit=compositionFit;
window.LostArkPartyOptimizationV2={scoreParty,rankParties,compositionFit,provided,recipientUtility};
})();
