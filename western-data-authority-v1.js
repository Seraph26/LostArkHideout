/* Lost Ark Party — Western game-data authority v1 */
(()=>{
'use strict';

/*
  This file records the Western-client data baseline used by the optimizer.
  It is intentionally separate from scoring logic.

  Current baseline:
  - Western July 15, 2026 Summer of Extremes release.
  - Western June 10, 2026 Twilight Isle balance/content release.
  - Western Ark Grid system is character-applied and Order Cores are class-specific.

  When a Western balance/content release changes class, Ark Grid, support, or
  encounter behavior, update the data version here instead of changing the
  optimizer's scoring formulas.
*/
window.LostArkWesternDataAuthorityV1={
  region:'NA/EU Western client',
  baselineId:'western-2026-07-15',
  lastVerified:'2026-08-18',
  releases:[
    {id:'2026-07-15',name:'Summer of Extremes',type:'release'},
    {id:'2026-06-10',name:'The Twilight Isle',type:'release'},
    {id:'2026-01-13',name:'Guardians Rage',type:'release'}
  ],
  arkGrid:{
    appliedPerCharacter:true,
    orderCoresClassSpecific:true,
    chaosCoresUniversal:true,
    authoritative:true
  },
  classes:{
    Guardianknight:{status:'active',introduced:'2026-01-13'},
    Wildsoul:{status:'active'},
    Dimensionalist:{status:'active'},
    Warpweaver:{status:'announced',introduced:'2026-09',scoring:'conservative-until-live-western-data'}
  },
  policy:{
    unknownClass:'conservative',
    unknownBuild:'conservative',
    unknownSynergy:'ignore',
    neverModifyCharacterCP:true,
    westernDataOverridesGenericTheory:true
  }
};
})();