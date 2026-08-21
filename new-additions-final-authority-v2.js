/* Final New Additions authority guard. Local-only; no network work on page load. */
(()=>{
  'use strict';
  const KEY='lostark-hideout-new-additions-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const norm=v=>String(v??'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ');
  function repair(){const list=read();if(!Array.isArray(list))return;for(const c of list){const card=document.querySelector(`.new-addition-card[data-candidate-id="${CSS.escape(String(c?.id))}"]`);if(!card)continue;const spec=c?.profile?.spec;if(spec&&norm(spec)!=='-'){const el=card.querySelector('.class');if(el&&el.textContent!==spec)el.textContent=spec}}}
  const schedule=()=>requestAnimationFrame(repair); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule(); new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true}); window.addEventListener('lostark-build-profiles-v3-ready',schedule);
})();
