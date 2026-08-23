/* Lost Ark Party — encounter model compatibility layer v3 */
(()=>{
'use strict';
/*
  The scoring engine is now authoritative. This file remains for compatibility
  with older callers that reference LostArkEncounterModel.
*/
function getProfile(){return window.LostArkEncounterScoring?.profile?.()||null}
function factor(c){return window.LostArkEncounterScoring?.characterScore?.(c)?.score??1}
Object.defineProperty(window,'LostArkEncounterModel',{configurable:true,get:()=>({profiles:window.LostArkEncounterScoring?.profiles||{},getProfile,factor})});
})();
