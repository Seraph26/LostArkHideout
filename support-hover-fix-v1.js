/* Lost Ark Hideout — unified hover renderer loader */
(()=>{'use strict';
const load=()=>{if(window.__LOSTARK_HOVER_FIX_V20__)return;window.__LOSTARK_HOVER_FIX_V20__=true;const s=document.createElement('script');s.src='hover-fix-v20.js?v=20260819hover20';s.async=false;document.head.appendChild(s)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
