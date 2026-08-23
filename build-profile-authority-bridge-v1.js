/* Lost Ark Party — build profile authority bridge */
(()=>{
'use strict';
function merge(url){
  let v2={},v3={};
  try{v2=window.LostArkBuildProfilesV2?.get(url)||{}}catch{}
  try{v3=window.LostArkBuildProfilesV3?.get(url)||{}}catch{}
  const merged={...v2,...v3};
  merged.engravings=v3.engravings?.length?v3.engravings:(v2.engravings||[]);
  merged.grid=v3.grid?.length?v3.grid:(v2.grid||[]);
  merged.arkPassive=v3.arkPassive?.length?v3.arkPassive:(v2.arkPassive||[]);
  merged.tripods=v3.tripods?.length?v3.tripods:(v2.tripods||[]);
  merged.text=[v2.text,v3.text,merged.engravings?.join(' '),merged.grid?.map(x=>x.name).join(' '),merged.arkPassive?.map(x=>x.name).join(' '),merged.tripods?.map(x=>`${x.skill} ${x.name}`).join(' ')].filter(Boolean).join(' ');
  if(v3.positional&&v3.positional!=='Unknown')merged.positional=v3.positional;
  if(v3.behavior)merged.behavior=v3.behavior;
  if(v3.className&&v3.className!=='Unknown')merged.className=v3.className;
  return merged;
}
function install(){
  const old=window.LostArkBuildProfilesV2?.get;
  if(typeof old!=='function')return;
  window.LostArkBuildProfilesV2.get=merge;
  window.LostArkBuildProfilesAuthorityV1={get:merge};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
