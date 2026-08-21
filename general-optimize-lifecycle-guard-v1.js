/* Lost Ark Hideout — General Optimize lifecycle guard v1
 *
 * UI lifecycle only. This file deliberately does not modify scoring, party
 * assignments, hovers, arrows, or displayed optimization text.
 * It watches the General Optimize button for a stale busy/disabled state and
 * restores the button only after the optimizer has stopped changing the party
 * container. This keeps repeated Optimize -> manual swap -> Optimize cycles
 * usable without changing the optimization result.
 */
(()=>{
'use strict';
const BUTTON='optimizeBtn',HOST='suggestedParties';
let timer=null,watch=null,started=0,lastMutation=0;
const normal=()=>{
 const b=document.getElementById(BUTTON); if(!b)return;
 b.disabled=false;
 b.setAttribute('aria-busy','false');
 b.textContent='Optimize Parties';
};
const stopWatch=()=>{if(timer){clearTimeout(timer);timer=null}if(watch){clearInterval(watch);watch=null}};
const begin=()=>{
 const b=document.getElementById(BUTTON),h=document.getElementById(HOST);
 if(!b||!h)return;
 started=Date.now();lastMutation=started;
 stopWatch();
 const observer=new MutationObserver(()=>{lastMutation=Date.now()});
 observer.observe(h,{childList:true,subtree:true,characterData:true});
 watch=setInterval(()=>{
   const now=Date.now();
   if(b.getAttribute('aria-busy')!=='true'){
     observer.disconnect();stopWatch();return;
   }
   /* If the party DOM has settled and the button has remained busy, treat it
      as a stale lifecycle state rather than starting another optimization. */
   if(now-started>12000 && now-lastMutation>1500){
     observer.disconnect();stopWatch();normal();
   }
 },250);
 timer=setTimeout(()=>{
   if(b.getAttribute('aria-busy')==='true'){
     observer.disconnect();stopWatch();normal();
   }
 },20000);
};
function install(){
 const b=document.getElementById(BUTTON); if(!b||b.dataset.generalLifecycleGuard)return;
 b.dataset.generalLifecycleGuard='1';
 document.addEventListener('click',e=>{
   if(e.target?.closest?.('#'+BUTTON))begin();
 },true);
 /* Recover a stale state left by a prior optimization even if the click event
    itself was swallowed before this guard observed it. */
 setInterval(()=>{
   const x=document.getElementById(BUTTON);
   if(x&&x.getAttribute('aria-busy')==='true'&&started===0)normal();
 },1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
