/* Lost Ark Hideout — General Optimization hover spacing + synergy explanation v4 */
(()=>{
'use strict';

const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const EFFECT_LABELS={
 damage:'Damage',mana:'Mana',crit:'Critical Rate',critDamage:'Critical Damage',attackSpeed:'Attack Speed',attackPower:'Attack Power',moveSpeed:'Move Speed',movementSpeed:'Move Speed',supportAmplification:'Support Amplification',positional:'Positional Damage'
};
const synergyTitle='Party synergies available from the current party. Support uptime is an optimizer estimate based on support class type and party composition, including party positioning compatibility.';
function label(v){const x=clean(v);return EFFECT_LABELS[x]||x.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}
function formatNumber(v){const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:2}):String(v??'')}
function formatPercent(v){const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n.toFixed(2)+'%':String(v??'')}
function formatSynergySummary(){
 document.querySelectorAll('#suggestedParties .party-synergies').forEach(el=>{
  el.removeAttribute('title');
  el.style.cursor='default';
  if(el.dataset.supportUptimeWrapped==='1')return;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const text=node.nodeValue||'';const match=/Support uptime/i.exec(text);if(!match)continue;
   const before=text.slice(0,match.index),after=text.slice(match.index+match[0].length),frag=document.createDocumentFragment();
   if(before)frag.appendChild(document.createTextNode(before));
   const span=document.createElement('span');
   span.className='support-uptime-label';
   span.textContent='Support Uptime';
   span.setAttribute('data-tooltip',synergyTitle);
   span.setAttribute('aria-label',synergyTitle);
   span.setAttribute('role','note');
   frag.appendChild(span);
   if(after)frag.appendChild(document.createTextNode(after));
   node.parentNode.replaceChild(frag,node);el.dataset.supportUptimeWrapped='1';break;
  }
 });
}
function rebuildRow(row){
 const raw=clean(row.textContent);if(!raw||/^No direct party effects detected\.?$/i.test(raw))return;
 const children=[...row.children].map(x=>clean(x.textContent)).filter(Boolean);
 if(children.length>=2&&/estimated contribution/i.test(children[0])&&/% of .*base power/i.test(children[1])){row.style.display='block';row.style.margin='8px 0';row.style.lineHeight='1.45';return}
 const m=raw.match(/^(.+?)\s+(from|to)\s+(.+?):\s*([+-]?[\d,]+(?:\.\d+)?)\s+estimated contribution\s*(?:[-·]?\s*)?(\d+(?:\.\d+)?)%\s+of\s+(.+?base power)(?:\s+observed median uptime\s+(\d+(?:\.\d+)?)%)?$/i);if(!m)return;
 const effect=label(m[1]),direction=m[2].toLowerCase(),source=clean(m[3]),value=formatNumber(m[4]),pct=formatPercent(m[5]),denominator=clean(m[6]),uptime=m[7]?formatPercent(m[7]):null;
 row.innerHTML=`<div class="chb-effect-line">${effect} ${direction} ${source}: ${m[4].trim().startsWith('-')?'':'+'}${value} estimated contribution</div><div class="chb-percent-line">${pct} of ${denominator}</div>${uptime?`<div class="chb-uptime-line">Observed median uptime ${uptime}</div>`:''}`;
 row.style.display='block';row.style.margin='8px 0';row.style.lineHeight='1.45';
}
function formatCards(){document.querySelectorAll('#suggestedParties .character-hover-breakdown').forEach(card=>card.querySelectorAll('.chb-synergy').forEach(rebuildRow))}
function css(){
 let s=document.getElementById('general-hover-spacing-v1-style');if(!s){s=document.createElement('style');s.id='general-hover-spacing-v1-style';document.head.appendChild(s)}
 s.textContent=`
 #suggestedParties .character-hover-breakdown{width:440px!important;max-width:min(440px,calc(100vw - 32px))!important;box-sizing:border-box!important}
 #suggestedParties .character-hover-breakdown .chb-synergy{display:block!important;margin:8px 0!important;line-height:1.45!important}
 #suggestedParties .character-hover-breakdown .chb-synergy>div{display:block!important;margin:0!important}
 #suggestedParties .character-hover-breakdown .chb-effect-line{white-space:nowrap!important}
 #suggestedParties .character-hover-breakdown .chb-percent-line,#suggestedParties .character-hover-breakdown .chb-uptime-line{display:block!important;white-space:nowrap!important;margin-top:2px!important}
 #suggestedParties .character-hover-breakdown .chb-detail{margin-top:6px!important}
 #suggestedParties .party-synergies{line-height:1.5!important}
 #suggestedParties .party-synergies .support-uptime-label{position:relative;display:inline-block;text-decoration-line:underline;text-decoration-style:dotted;text-decoration-thickness:1px;text-underline-offset:3px;cursor:help}
 #suggestedParties .party-synergies .support-uptime-label::after{content:attr(data-tooltip);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);width:360px;max-width:min(360px,calc(100vw - 32px));padding:10px 12px;border-radius:6px;background:#1f1f1f;color:#fff;font-size:12px;font-weight:400;line-height:1.45;white-space:normal;text-align:left;box-shadow:0 3px 12px rgba(0,0,0,.35);opacity:0;visibility:hidden;pointer-events:none;z-index:10000;transition:opacity .12s ease,visibility .12s ease}
 #suggestedParties .party-synergies .support-uptime-label::before{content:'';position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);border:5px solid transparent;border-top-color:#1f1f1f;opacity:0;visibility:hidden;pointer-events:none;z-index:10001}
 #suggestedParties .party-synergies .support-uptime-label:hover::after,#suggestedParties .party-synergies .support-uptime-label:hover::before{opacity:1;visibility:visible}
 `;
}
function start(){css();const run=()=>{formatSynergySummary();formatCards()};run();const root=document.getElementById('suggestedParties')||document.body;let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,30)};new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});document.addEventListener('mouseover',e=>{if(e.target.closest?.('#suggestedParties .party-member')||e.target.closest?.('#suggestedParties .party-synergies'))schedule()},true);[0,50,150,300,600,1000,2000,4000,8000].forEach(ms=>setTimeout(run,ms));setInterval(run,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
