/* Lost Ark Hideout — Western party-synergy authority v1 */
(()=>{
'use strict';

/*
  Game-mechanic data only. No party-value multipliers belong here.
  The optimizer converts these actual effects into recipient-specific value.

  Primary current reference: Daloa synergy guide updated 2026-07-03.
  Cross-check: 2026 class-synergy reference and Western release notes.
  Western balance/content baseline is tracked separately by
  western-data-authority-v1.js.
*/
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
const PROVIDERS=[
  ['Guardianknight',['damage']],
  ['Berserker',['damage']],['Slayer',['damage']],['Destroyer',['defenseReduction']],
  ['Gunlancer',['positionalGeneral','positionalSpecific']],
  ['Wardancer',['crit','attackSpeed','moveSpeed']],['Striker',['crit','attackSpeed']],
  ['Scrapper',['damage']],['Breaker',['damage']],['Glaivier',['critDamage']],
  ['Soulfist',['attackPower']],
  ['Hawkeye',['damage']],['Sharpshooter',['damage']],
  ['Deadeye',['crit']],['Gunslinger',['crit']],['Artillerist',['defenseReduction']],
  ['Machinist',['attackPower']],['Scouter',['attackPower']],
  ['Summoner',['defenseReduction','mana']],['Arcanist',['crit']],['Arcana',['crit']],['Sorceress',['damage']],
  ['Deathblade',['positionalGeneral','positionalSpecific','attackSpeed','moveSpeed']],
  ['Blade',['positionalGeneral','positionalSpecific','attackSpeed','moveSpeed']],
  ['Souleater',['damage']],['Soul Eater',['damage']],['Shadowhunter',['damage']],['Demonic',['damage']],
  ['Reaper',['defenseReduction']],
  ['Aeromancer',['crit']],['Glaivier',['critDamage']],
  ['Artist',['attackPower']],['Paladin',['critDamage']],['Holy Knight',['critDamage']],
  ['Valkyrie',['critDamage']],['HwanSooSa',['defenseReduction']],['Wildsoul',['defenseReduction']],
  ['Dimensionalist',['defenseReduction']],['Gimcheon',['defenseReduction']]
];
const CLASS={};
for(const [name,effects] of PROVIDERS)CLASS[name.toLowerCase().replace(/\s+/g,'')]=effects;

function key(v){return String(v??'').toLowerCase().replace(/\s+/g,'')}
function classEffects(cls,build,text){
  const k=key(cls),out=[];
  const add=(type,when='class')=>out.push({...DEFINITIONS[type],type,when});
  if(k==='gunlancer'||k==='gunlancer'){add('positionalGeneral');add('positionalSpecific');if(/combat readiness|전투 태세/.test(text||''))add('defenseReduction','build')}
  else if(k==='deathblade'||k==='blade'){add('positionalGeneral');add('positionalSpecific');add('attackSpeed');add('moveSpeed')}
  else if(k==='wardancer'||k==='battlemaster'){add('crit');add('attackSpeed');add('moveSpeed')}
  else if(k==='striker'){add('crit');add('attackSpeed')}
  else if(k==='summoner'){add('defenseReduction');if(/mana|mp recovery|마나/.test(text||''))add('mana','trait')}
  else if(k==='aeromancer'){add('crit');if(/wind fury|질풍노도/.test(text||'')){add('attackSpeed','build');add('moveSpeed','build')}}
  else if(k==='hawk'||k==='sharpshooter'||k==='hawkeye'){add('damage');if(/loyal companion|두 번째 동료/.test(text||''))add('moveSpeed','build')}
  else if(k==='destroyer'||k==='artillerist'||k==='reaper'||k==='wildsoul'||k==='hwanSoosa'||k==='dimensionalist'){add('defenseReduction')}
  else if(k==='guardianknight'||k==='berserker'||k==='slayer'||k==='scrapper'||k==='breaker'||k==='sorceress'||k==='souleater'||k==='soul eater'||k==='shadowhunter'||k==='demonic'){add('damage')}
  else if(k==='soulfist'||k==='machinist'||k==='scouter'||k==='artist'||k==='do hwa'||k==='dohwa'){add('attackPower')}
  else if(k==='deadeye'||k==='gunslinger'||k==='arcanist'||k==='arcana'){add('crit')}
  else if(k==='glaivier'||k==='glavier'||k==='paladin'||k==='holy knight'||k==='valkyrie'){add('critDamage')}
  return out;
}

function provided(cls,build,text){return classEffects(cls,build,text)}

window.LostArkPartySynergyAuthorityV1={
  version:'2026-07-15-western-baseline',
  source:{
    primary:'Daloa synergy guide',
    primaryUpdated:'2026-07-03',
    crossCheck:'2026 2026 class synergy reference',
    rule:'game mechanics are stored here; recipient value is calculated by the optimizer'
  },
  definitions:DEFINITIONS,
  provided,
  policy:{
    unknownClass:'ignore',
    unknownBuild:'use-class-effect-only',
    duplicateSameEffect:'do-not-add-linearly',
    providerDoesNotBuffSelf:true,
    recipientSpecific:true,
    neverModifyCP:true
  }
};
})();