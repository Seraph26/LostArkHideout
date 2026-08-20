/* Lost Ark Hideout — Support Uptime party-summary authority only.
 * Intentionally isolated from DPS/support character hover-card rendering.
 * Normalizes only the party Synergies summary and owns the dotted Support uptime tooltip.
 */
(()=>{
'use strict';
const tooltipText='Party synergies available from the current party. Support uptime is an optimizer estimate based on support class type and party composition, including party positioning compatibility.';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function normalizeSummary(el){
  const text=clean(el.textContent);
  if(!/^Synergies\s*:/i.test(text))return;
  const m=text.match(/^Synergies\s*:\s*(.*)$/i);if(!m)return;
  let body=m[1].trim();
  // General: preserve the existing synergy list and expose the existing uptime value.
  // Raid-specific legacy form: convert "Observed median support uptime data · identity median XX%"
  // into the finalized "Support uptime XX%" suffix.
  const raid=body.match(/^(.*?)\s*[·•]\s*Observed median support uptime data\s*[·•]\s*identity median\s*([\d.]+)%?\s*$/i);
  if(raid)body=`${raid[1].trim()} · Support uptime ${raid[2]}%`;
  body=body.replace(/\s*[·•]\s*Observed median support uptime(?:\s+data)?\s*[·•]\s*identity median\s*([\d.]+)%?/ig,(m,p)=>` · Support uptime ${p}%`);
  body=body.replace(/\s*[·•]\s*Observed median support uptime data\s*$/i,'');
  body=body.replace(/\s*[·•]\s*identity median\s*([\d.]+)%?/ig,'');
  body=body.replace(/\s*[·•]\s*Support uptime\s*([\d.]+)%%/ig,' · Support uptime $1%');
  // Rebuild only this summary element so no hover-card DOM is touched.
  const desired=`Synergies: ${body}`;
  if(clean(el.textContent)===desired)return;
  el.textContent=desired;
}
function wrap(){
 document.querySelectorAll('#suggestedParties .party-synergies').forEach(el=>{
   normalizeSummary(el);
   if(el.querySelector('.support-uptime-label'))return;
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
   const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
   for(const node of nodes){
     const text=node.nodeValue||'';const match=/Support uptime/i.exec(text);if(!match)continue;
     const before=text.slice(0,match.index),after=text.slice(match.index+match[0].length),frag=document.createDocumentFragment();
     if(before)frag.appendChild(document.createTextNode(before));
     const span=document.createElement('span');span.className='support-uptime-label';span.textContent='Support uptime';span.setAttribute('data-tooltip',tooltipText);span.setAttribute('aria-label',tooltipText);span.setAttribute('role','note');
     frag.appendChild(span);if(after)frag.appendChild(document.createTextNode(after));node.parentNode.replaceChild(frag,node);break;
   }
 });
}
function css(){let s=document.getElementById('support-uptime-tooltip-v1-style');if(!s){s=document.createElement('style');s.id='support-uptime-tooltip-v1-style';document.head.appendChild(s)}s.textContent=`#suggestedParties .party-synergies .support-uptime-label{display:inline-block!important;text-decoration-line:underline!important;text-decoration-style:dotted!important;text-decoration-thickness:1px!important;text-underline-offset:3px!important;cursor:help!important;font:inherit!important;color:inherit!important}#lah-support-uptime-tooltip{position:fixed;display:none;width:360px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:10px 12px;border-radius:6px;background:#1f1f1f;color:#fff;font-size:12px;font-weight:400;line-height:1.45;white-space:normal;text-align:left;box-shadow:0 3px 12px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none}`}
function tooltip(){let t=document.getElementById('lah-support-uptime-tooltip');if(!t){t=document.createElement('div');t.id='lah-support-uptime-tooltip';document.body.appendChild(t)}return t}
function show(el){const t=tooltip();t.textContent=el.getAttribute('data-tooltip')||tooltipText;t.style.display='block';const r=el.getBoundingClientRect(),tw=t.offsetWidth,th=t.offsetHeight;let left=r.left+r.width/2-tw/2,top=r.top-th-10;left=Math.max(16,Math.min(left,innerWidth-tw-16));if(top<8)top=r.bottom+10;t.style.left=Math.round(left)+'px';t.style.top=Math.round(top)+'px'}
function hide(){const t=document.getElementById('lah-support-uptime-tooltip');if(t)t.style.display='none'}
function start(){css();wrap();const root=document.getElementById('suggestedParties')||document.body;let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(wrap,30)};new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});document.addEventListener('mouseover',e=>{const el=e.target.closest?.('#suggestedParties .support-uptime-label');if(el)show(el)},true);document.addEventListener('mouseout',e=>{if(e.target.closest?.('#suggestedParties .support-uptime-label'))hide()},true);window.addEventListener('scroll',hide,{passive:true});window.addEventListener('resize',hide);[0,50,150,300,600,1000,2000,4000].forEach(ms=>setTimeout(wrap,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
