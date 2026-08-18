/* Lost Ark Hideout — Western party-synergy authority v1 */
(()=>{
'use strict';
/* Game-mechanic data only. Recipient value is calculated by the optimizer. */
const DEFINITIONS={
 damage:{magnitude:.06,unit:'damage',stack:'diminishing'},
 defenseReduction:{magnitude:.12,unit:'defenseReduction',stack:'additive'},
 crit:{magnitude:.10,unit:'critRate',stack:'diminishing'},
 critDamage:{magnitude:.08,unit:'critDamage',stack:'diminishing'},
 attackPower:{magnitude:.06,unit:'attackPower',stack:'diminishing'},
 attackSpeed:{magnitude:.08,unit:'attackSpeed',stack:'diminishing'},
 moveSpeed:{magnitude:.08,unit:'moveSpeed',stack:'diminishing'},
 positionalGeneral:{magnitude:.04,unit:'damage',stack:'diminishing'},
 positionalSpecific:{magnitude:.05,unit:'positionalDamage',stack:'diminishing'},
 mana:{magnitude:.40,unit:'manaRecovery',stack:'none'}
};
function key(v){return String(v??'').toLowerCase().replace(/\s+/g,'')}
function classEffects(cls,build,text){
 const k=key(cls),out=[];
 const add=(type,when='class',magnitude=null)=>out.push({...DEFINITIONS[type],type,when,...(magnitude==null?{}:{magnitude})});
 if(k==='gunlancer'){add('positionalGeneral');add('positionalSpecific');if(/combat readiness|전투 태세/.test(text||''))add('defenseReduction','build')}
 else if(k==='deathblade'||k==='blade'){add('positionalGeneral');add('positionalSpecific');add('attackSpeed','class',.128);add('moveSpeed','class',.128)}
 else if(k==='wardancer'||k==='battlemaster'){add('crit');add('attackSpeed','class',.08);add('moveSpeed','class',.16)}
 else if(k==='striker'){add('crit');add('attackSpeed','class',.08)}
 else if(k==='summoner'){add('defenseReduction');if(/mana|mp recovery|마나/.test(text||''))add('mana','trait')}
 else if(k==='aeromancer'){add('crit');if(/wind fury|질풍노도/.test(text||'')){add('attackSpeed','build',.12);add('moveSpeed','build',.12)}}
 else if(k==='hawk'||k==='sharpshooter'||k==='hawkeye'){add('damage');if(/loyal companion|두 번째 동료/.test(text||''))add('moveSpeed','build',.08)}
 else if(k==='destroyer'||k==='artillerist'||k==='reaper'||k==='wildsoul'||k==='hwanSoosa'||k==='dimensionalist'){add('defenseReduction')}
 else if(k==='guardianknight'||k==='berserker'||k==='slayer'||k==='scrapper'||k==='breaker'||k==='sorceress'||k==='souleater'||k==='soul eater'||k==='shadowhunter'||k==='demonic'){add('damage')}
 else if(k==='soulfist'||k==='machinist'||k==='scouter'||k==='artist'||k==='dohwa'){add('attackPower')}
 else if(k==='deadeye'||k==='gunslinger'||k==='arcanist'||k==='arcana'){add('crit')}
 else if(k==='glaivier'||k==='glavier'||k==='paladin'||k==='holy knight'||k==='valkyrie'){add('critDamage')}
 return out;
}
window.LostArkPartySynergyAuthorityV1={
 version:'2026-07-15-western-baseline',
 source:{primary:'Daloa synergy guide',primaryUpdated:'2026-07-03',crossCheck:'2026 class-synergy reference',rule:'game mechanics are stored here; recipient value is calculated by the optimizer'},
 definitions:DEFINITIONS,
 provided:classEffects,
 policy:{unknownClass:'ignore',unknownBuild:'use-class-effect-only',duplicateSameEffect:'marginal-not-linear',providerDoesNotBuffSelf:true,recipientSpecific:true,neverModifyCP:true}
};
})();