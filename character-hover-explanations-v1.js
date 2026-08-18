/* Lost Ark Hideout — character hover explanations v1 */
(()=>{'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function enhance(){
  document.querySelectorAll('.character-hover-breakdown').forEach(card=>{
    const stats=card.querySelector('.chb-stats');
    if(!stats)return;
    const spans=[...stats.querySelectorAll('span')];
    spans.forEach(span=>{
      const t=clean(span.textContent);
      if(/^Party Synergy\s+[+−-]/i.test(t)){
        const v=t.replace(/^Party Synergy\s*/i,'');
        span.innerHTML=`<span class="chb-metric-label">Party Synergy</span> ${v}`;
        span.title='Estimated contribution from synergies supplied by the other DPS characters in this party. The percentage is relative to this character’s current Base DPS Power and is adjusted for how well this character can benefit from each synergy.';
        span.classList.add('chb-explained-metric');
      }else if(/^Support\s+[+−-]/i.test(t)){
        const v=t.replace(/^Support\s*/i,'');
        span.innerHTML=`<span class="chb-metric-label">Support Impact</span> ${v}`;
        span.title='Estimated contribution from the party support’s buffs to this character. It includes the support effects modeled for the support class, this character’s compatibility with those effects, and the model’s expected support uptime.';
        span.classList.add('chb-explained-metric');
      }else if(/^Support uptime\s*/i.test(t)){
        const v=t.replace(/^Support uptime\s*/i,'');
        span.innerHTML=`<span class="chb-metric-label">Expected support uptime</span> ${v}`;
        span.title='Model estimate of how consistently the support’s relevant buffs are expected to benefit this party. It is based on the support class and the party’s detected positional mix (for example Back Attack, Front Attack, and Hit Master). It is not an observed in-game uptime measurement from a Bible combat log.';
        span.classList.add('chb-explained-metric');
      }
    });
    card.querySelectorAll('.chb-synergy').forEach(row=>{
      const raw=clean(row.textContent);
      row.textContent=raw
        .replace(/^supportAmplification\s+/i,'Support amplification ')
        .replace(/^attackPower\s+/i,'Attack power ')
        .replace(/^attackSpeed\s+/i,'Attack speed ')
        .replace(/^critDamage\s+/i,'Critical damage ')
        .replace(/^crit\s+/i,'Critical rate ')
        .replace(/^mana\s+/i,'Mana ')
        .replace(/\s+from\s+/i,' from ')
        .replace(/\bSupport amplification\s+from/i,'Support amplification from');
    });
  });
}
function css(){
  let s=document.getElementById('character-hover-explanations-style');
  if(!s){s=document.createElement('style');s.id='character-hover-explanations-style';document.head.appendChild(s)}
  s.textContent='.chb-explained-metric{cursor:help;border-bottom:1px dotted rgba(255,255,255,.45)}.chb-explained-metric:hover{border-bottom-color:currentColor}.chb-metric-label{font-weight:600}';
}
function start(){css();enhance();const root=document.getElementById('suggestedParties')||document.body;let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,60)}).observe(root,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();