/* Lost Ark Hideout — raid encounter model v1 */
(()=>{
'use strict';
const CLASS_RANGED=new Set(['Sorceress','Sharpshooter','Artillerist','Machinist','Scouter','Summoner','Souleater','Soul Eater','Aeromancer','Gunslinger','Deadeye','Arcana','Arcanist']);
const CLASS_MELEE=new Set(['Berserker','Destroyer','Gunlancer','Paladin','Bard','Artist','Valkyrie','Scrapper','Wardancer','Striker','Deathblade','Reaper','Slayer','Breaker','Soulfist','Shadowhunter','Glaivier','Glavier']);
const PROFILES={
 'serca-g1':{name:'Serca — Gate 1',confidence:'verified',notes:['Frequent positional disruption and mechanic transitions','Brawl sections create short, coordinated damage windows','Shared resurrection pool makes survival/consistency material'],factors:{back:.91,front:.95,hitmaster:.96,unknown:.94,melee:.96,ranged:.96,burst:.97,mobility:1,pushImmunity:1,support:.97}},
 'serca-g2':{name:'Serca — Gate 2',confidence:'verified',notes:['High-pressure DPS check with frequent movement/pattern downtime','Pattern quality can materially change usable damage time','Rumble/Brawl phases create discrete burst windows','Corvus Tul Rak accounts for a disproportionate share of deaths'],factors:{back:.90,front:.96,hitmaster:.98,unknown:.95,melee:.96,ranged:1.0,burst:1.04,mobility:1,pushImmunity:1,support:.96}}
};
function profile(){const m=window.LostArkOptimizerMode;if(!m||m.general||!m.raid)return null;return PROFILES[m.raid]||null}
function factor(c){const p=profile();if(!p)return 1;const pr=c?.profile||c?.data||{};let cls=String(pr.class||pr.className||pr.characterClass||'');let pos='unknown';try{const b=window.LostArkBuildProfilesV2?.get(c.url)||{};if(b.positional&&b.positional!=='Unknown')pos=b.positional;else{const raw=JSON.stringify(b).toLowerCase();if(/ambush master|back attack/.test(raw))pos='Back Attack';else if(/master brawler|front attack/.test(raw))pos='Front Attack';else if(/hit master/.test(raw))pos='Hit Master'}}catch{}const f=p.factors;let x=f[pos.toLowerCase().replace(/\s+/g,'')]||f.unknown||1;if(CLASS_MELEE.has(cls))x*=f.melee||1;if(CLASS_RANGED.has(cls))x*=f.ranged||1;const text=JSON.stringify(c).toLowerCase();if(/igniter|punisher|full moon|burst/.test(text))x*=f.burst||1;return Math.max(.75,Math.min(1.15,x))}
window.LostArkEncounterModel={profiles:PROFILES,getProfile:profile,factor};
})();
