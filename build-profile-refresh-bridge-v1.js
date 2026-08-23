/* Lost Ark Party — refresh V3 build authority whenever profiles are refreshed */
(()=>{
'use strict';
function install(){
 const btn=document.getElementById('refreshBtn');
 if(!btn||btn.dataset.buildAuthorityRefresh==='1')return;
 btn.dataset.buildAuthorityRefresh='1';
 btn.addEventListener('click',async()=>{
   try{
     if(window.LostArkBuildProfilesV3?.refresh)await window.LostArkBuildProfilesV3.refresh();
     window.dispatchEvent(new CustomEvent('lostark-build-profiles-v3-ready'));
   }catch(e){console.warn('Authoritative build refresh failed',e)}
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
