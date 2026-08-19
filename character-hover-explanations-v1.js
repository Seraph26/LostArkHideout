/* Lost Ark Hideout — character hover explanations v7 */
(()=>{'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function enhance(){document.querySelectorAll('.character-hover-breakdown').forEach(card=>{
 const stats=card.querySelector('.chb-stats'),head=card.querySelector('.chb-head');
 const contribution=head?.querySelector('span');
 if(contribution&&/^CP\s+[\d,]+\s*[·-]\s*Contribution\s+/i.test(clean(contribution.textContent))){contribution.title='Estimated overall contribution for this character in the current encounter and party. It is an optimizer model value, not an observed Bible DPS parse and not Combat Power.';contribution.style.cursor='help'}
 if(stats)[...stats.querySelectorAll('span')].forEach(span=>{const t=clean(span.textContent);if(/^Party Synergy\s+[+−-]/i.test(t))span.title='Estimated increase to this character’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model percentage, not a direct in-game damage percentage.';else if(/^Support\s+[+−-]/i.test(t))span.title='Estimated increase to this character’s modeled potential from the party support’s applicable buffs. This is a model percentage, not a direct in-game damage percentage.'});
 card.querySelectorAll('.chb-synergy').forEach(row=>{const raw=clean(row.textContent);if(!raw)return;row.title=/observed median uptime/i.test(raw)?'Estimated contribution is the optimizer model value assigned to this effect for this character. Observed median uptime is the typical percentage of the relevant encounter for which the support effect is active, based on Bible encounter data. These are different measurements.':'Estimated contribution from a party synergy. The numeric value is a model contribution value, not a percentage and not a direct in-game damage increase.';row.style.cursor='help'});
});}
function css(){let s=document.getElementById('character-hover-explanations-style');if(!s){s=document.createElement('style');s.id='character-hover-explanations-style';document.head.appendChild(s)}s.textContent='.chb-synergy{display:block;margin:2px 0}.chb-synergy[title],.chb-detail[title]{cursor:help}'}
function start(){css();enhance();const root=document.getElementById('suggestedParties')||document.body;let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,60)}).observe(root,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();