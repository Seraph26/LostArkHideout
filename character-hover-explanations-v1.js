/* Lost Ark Hideout — character hover explanations v2 */
(()=>{'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function enhance(){
  document.querySelectorAll('.character-hover-breakdown').forEach(card=>{
    const stats=card.querySelector('.chb-stats');
    if(!stats)return;
    const head=card.querySelector('.chb-head');
    const contribution=head?.querySelector('span');
    if(contribution&&/^CP\s+[\d,]+\s*[·-]\s*Contribution\s+/i.test(clean(contribution.textContent))){
      contribution.title='Estimated overall contribution for this character in the current encounter and party. It is an optimizer model value, not an observed Bible DPS parse and not Combat Power.';
      contribution.style.cursor='help';
    }
    const spans=[...stats.querySelectorAll('span')];
    spans.forEach(span=>{
      const t=clean(span.textContent);
      if(/^Party Synergy\s+[+−-]/i.test(t)){
        const v=t.replace(/^Party Synergy\s*/i,'');
        span.innerHTML=`<span class="chb-metric-label">Party Synergy</span> ${v}`;
        span.title='Estimated increase to this character’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model percentage, not a direct in-game damage percentage.';
        span.classList.add('chb-explained-metric');
      }else if(/^Support\s+[+−-]/i.test(t)){
        const v=t.replace(/^Support\s*/i,'');
        span.innerHTML=`<span class="chb-metric-label">Support Impact</span> ${v}`;
        span.title='Estimated increase to this character’s modeled potential from the party support’s applicable buffs. The model accounts for the support effects, this character’s compatibility with them, and the support uptime data used by the encounter model. This is not a direct in-game damage percentage.';
        span.classList.add('chb-explained-metric');
      }else if(/^Support uptime\s*/i.test(t)){
        const v=t.replace(/^Support uptime\s*/i,'');
        span.innerHTML=`<span class="chb-metric-label">Expected support uptime</span> ${v}`;
        span.title='Model estimate of how consistently the support’s relevant buffs are expected to benefit this party. It is separate from the Bible observed median uptime shown on individual support effects.';
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
      const txt=clean(row.textContent);
      if(/\bobserved median\b/i.test(txt)){
        row.title='Estimated contribution is the model value assigned to this effect for this character. Observed median is the typical percentage of the relevant encounter for which the support effect is active, based on Bible encounter data. These are different measurements.';
      }else if(/\bfrom\b/i.test(txt)){
        row.title='Estimated contribution from a party synergy. The numeric value is a model contribution value, not a percentage and not a direct in-game damage increase.';
      }
      row.style.cursor='help';
    });
  });
}
function css(){
  let s=document.getElementById('character-hover-explanations-style');
  if(!s){s=document.createElement('style');s.id='character-hover-explanations-style';document.head.appendChild(s)}
  s.textContent='.chb-explained-metric{cursor:help;border-bottom:1px dotted rgba(255,255,255,.45)}.chb-explained-metric:hover{border-bottom-color:currentColor}.chb-metric-label{font-weight:600}.chb-synergy[title]{cursor:help}';
}
function start(){css();enhance();const root=document.getElementById('suggestedParties')||document.body;let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,60)}).observe(root,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();