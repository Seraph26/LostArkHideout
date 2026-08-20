/* Lost Ark Hideout — General hover detail loader v4 */
(()=>{
'use strict';
if(document.querySelector('script[data-general-hover-detail-loader="1"]'))return;
const s=document.createElement('script');
s.src='general-hover-detail-v2.js?v=20260819generaldetail2';
s.dataset.generalHoverDetailLoader='1';
(document.head||document.documentElement).appendChild(s);
})();
