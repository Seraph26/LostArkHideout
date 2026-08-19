/* Lost Ark Hideout — character hover explanations v4 */
(()=>{'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const LABELS={crit:'Critical Rate',critDamage:'Critical Damage',attackSpeed:'Attack Speed',attackPower:'Attack Power',supportAmplification:'Support Amplification',mana:'Mana',identity:'Identity',damage:'Damage'};
function humanizeEffects(text){
  let out=String(text??'');
  for(const [key,label] of Object.entries(LABELS))out=out.replace(new RegExp(`\\b${key}\\b`,'g'),label);
  return out.replace(/\bobserved median\b/gi,'Observed median uptime');
}
function formatEffectText(text){
  return humanizeEffects(text)
    .replace(/\s*-\s*observed median uptime/gi,' — observed median uptime')
    .replace(/\s+/g,' ')
    .trim();
}
function enhance(){
  document.querySelectorAll('.character-hover-breakdown').forEach(card=>{
    const stats=card.querySelector('.chb-stats');
    const head=card.querySelector('.chb-head');
    const contribution=head?.querySelector('span');
    if(contribution&&/^CP\s+[\d,]+\s*[·-]\s*Contribution\s+/i.test(clean(contribution.textContent))){
      contribution.title='Estimated overall contribution for this character in the current encounter and party. It is an optimizer model value, not an observed Bible DPS parse and not Combat Power.';
      contribution.style.cursor='help';
    }
    if(stats){
      [...stats.querySelectorAll('span')].forEach(span=>{
        const t=clean(span.textContent);
        if(/^Party Synergy\s+[+−-]/i.test(t)){
          const v=t.replace(/^Party Synergy\s*/i,'');
          span.innerHTML=`<span class="chb-metric-label">Party Synergy</span> ${v}`;
          span.title='Estimated increase to this character’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model percentage, not a direct in-game damage percentage.';
          span.classList.add('chb-explained-metric');
        }else if(/^Support\s+[+−-]/i.test(t)){
          const v=t.replace(/^Support\s*/i,'');
          span.innerHTML=`<span class="chb-metric-label">Support Impact</span> ${v}`;
          span.title='Estimated increase to this character’s modeled potential from the party support’s applicable buffs. This is a model percentage, not a direct in-game damage percentage.';
          span.classList.add('chb-explained-metric');
        }
      });
    }
    /* Effect rows are deliberately handled only at their own row level. We do
       not rewrite .chb-detail textContent because that destroys the optimizer's
       existing row boundaries and spacing. */
    card.querySelectorAll('.chb-synergy').forEach(row=>{
      const raw=clean(row.textContent);
      if(!raw)return;
      const normalized=formatEffectText(raw);
      if(normalized!==raw)row.textContent=normalized;
      const txt=clean(row.textContent);
      row.title=/observed median uptime/i.test(txt)
        ? 'Estimated contribution is the optimizer model value assigned to this effect for this character. Observed median uptime is the typical percentage of the relevant encounter for which the support effect is active, based on Bible encounter data. These are different measurements.'
        : 'Estimated contribution from a party synergy. The numeric value is a model contribution value, not a percentage and not a direct in-game damage increase.';
      row.style.cursor='help';
    });
    /* Normalize only the compact Synergies summary. Replacing this single
       summary element is safe; it is not a collection of individual rows. */
    card.querySelectorAll('div,span').forEach(el=>{
      if(el.dataset.chbSynergySummaryDone==='1')return;
      const raw=clean(el.textContent);
      if(!/^Synergies\s*:/i.test(raw))return;
      const normalized=formatEffectText(raw).replace(/\s*·\s*/g,' · ');
      el.textContent=normalized;
      el.dataset.chbSynergySummaryDone='1';
      el.title='Synergies available from this party/encounter model. Support effects may also include observed median uptime data.';
      el.style.cursor='help';
    });
  });
}
function css(){
  let s=document.getElementById('character-hover-explanations-style');
  if(!s){s=document.createElement('style');s.id='character-hover-explanations-style';document.head.appendChild(s)}
  s.textContent='.chb-explained-metric{cursor:help;border-bottom:1px dotted rgba(255,255,255,.45)}.chb-explained-metric:hover{border-bottom-color:currentColor}.chb-metric-label{font-weight:600}.chb-synergy{display:block;margin:2px 0}.chb-synergy[title]{cursor:help}.chb-detail[title]{cursor:help}';
}
function start(){
  css();enhance();
  const root=document.getElementById('suggestedParties')||document.body;let timer;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,60)}).observe(root,{childList:true,subtree:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();