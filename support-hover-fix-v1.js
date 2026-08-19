/* Lost Ark Hideout — unified hover renderer loader */
(()=>{'use strict';
const load=()=>{if(window.__LOSTARK_HOVER_FIX_V19__)return;window.__LOSTARK_HOVER_FIX_V19__=true;const s=document.createElement('script');s.src='hover-fix-v19.js?v=20260819hover19';s.async=false;document.head.appendChild(s)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
