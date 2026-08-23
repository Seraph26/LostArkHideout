/* Lost Ark Party — permanently retired Upgrade Potential UI */
(()=>{'use strict';
function clean(){const root=document.getElementById('suggestedParties');if(!root)return;
 root.querySelectorAll('.party-metric').forEach(el=>{const label=(el.querySelector('.optimizer-definition-label')?.textContent||'').trim();if(label.toLowerCase()==='upgrade potential')el.remove()});
 root.querySelectorAll('.chb-upgrade').forEach(el=>el.remove());
 [...root.querySelectorAll('.optimizer-definition')].forEach(el=>{if(/upgrade potential/i.test(el.textContent||''))el.remove()});
 [...root.querySelectorAll('*')].forEach(el=>{if(el.children.length===0&&/upgrade potential/i.test(el.textContent||'')){const p=el.closest('.party-metric,.combined-breakdown,.party-breakdown,.chb-upgrade');if(p)p.remove();}});
 const textNodes=[];const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(w.nextNode())textNodes.push(w.currentNode);textNodes.forEach(n=>{if(/upgrade potential/i.test(n.nodeValue||'')){const p=n.parentElement;const holder=p?.closest('.party-metric,.combined-breakdown,.party-breakdown,.chb-upgrade');if(holder)holder.remove();else n.nodeValue=(n.nodeValue||'').replace(/Upgrade Potential[^\n]*/gi,'')}});
}
function start(){clean();const root=document.getElementById('suggestedParties');if(!root)return;if(root.__retireUpgrade)return;root.__retireUpgrade=true;new MutationObserver(()=>clean()).observe(root,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();