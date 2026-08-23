/* Lost Ark Party — permanently remove the retired Upgrade Potential UI. */
(()=>{
'use strict';
function clean(){
  const root=document.getElementById('suggestedParties');
  if(!root)return;
  root.querySelectorAll('.party-metric').forEach(m=>{
    const label=m.querySelector('.optimizer-definition-label');
    if(label && label.textContent.trim().toLowerCase()==='upgrade potential') m.remove();
  });
  root.querySelectorAll('.chb-upgrade').forEach(e=>e.remove());
  root.querySelectorAll('.upgrade-potential-note,.upgrade-potential-row,.upgrade-potential-total').forEach(e=>e.remove());
  const all=root.querySelectorAll('*');
  all.forEach(e=>{
    if(e.children.length===0 && /Upgrade Potential is informational only/i.test(e.textContent||'')) e.remove();
  });
  // The combined summary contains the retired sentence in its explanatory text.
  all.forEach(e=>{
    if(e.children.length===0 && /Upgrade Potential is informational only/i.test(e.textContent||'')) e.textContent=e.textContent.replace(/\s*Upgrade Potential is informational only\.?/i,'');
  });
}
function start(){
  clean();
  const root=document.getElementById('suggestedParties')||document.body;
  let t;
  new MutationObserver(()=>{clearTimeout(t);t=setTimeout(clean,50)}).observe(root,{childList:true,subtree:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
