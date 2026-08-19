/* Lost Ark Hideout — character hover explanations v9 */
(()=>{'use strict';
const LABELS={crit:'Critical Rate',critDamage:'Critical Damage',attackSpeed:'Attack Speed',attackPower:'Attack Power',supportAmplification:'Support Amplification',mana:'Mana',identity:'Identity',damage:'Damage'};
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const label=k=>LABELS[k]||k;
const numberFrom=s=>{const m=String(s??'').replace(/,/g,'').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
function normalizeUptime(text){return String(text??'').replace(/\bobserved\s+median(?:\s+uptime)+/gi,'observed median');}
function humanizeEffects(text){let out=normalizeUptime(text);for(const[k,v]of Object.entries(LABELS))out=out.replace(new RegExp(`\\b${k}\\b`,'g'),v);return out.replace(/\bobserved\s+median\b/gi,'observed median uptime')}
function formatPartySynergySummary(el){
 const raw=clean(el.textContent);if(!/^Synergies\s*:/i.test(raw))return;
 let body=raw.replace(/^Synergies\s*:\s*/i,'');
 const keys=Object.keys(LABELS).sort((a,b)=>b.length-a.length);
 for(const k of keys)body=body.replace(new RegExp(`\\b${k}\\b`,'g'),LABELS[k]);
 body=body.replace(/\bobserved\s+median\s+support\s+uptime\s+data\b/gi,'Observed median support uptime data');
 body=body.replace(/\bidentity\s+median\b/gi,'Identity median');
 if(body)el.innerHTML=`<strong>Synergies:</strong> ${body}`;else el.innerHTML='<strong>Synergies:</strong> None';
 el.dataset.chbSynergySummaryDone='1';
 el.title='Party synergies available from the current party. Support uptime figures are observed encounter data and are separate from the optimizer contribution model.';
 el.style.cursor='help';
}
function formatEffectRow(row){
 const raw=clean(normalizeUptime(row.textContent));if(!raw||/^No direct party effects detected\.?$/i.test(raw))return;
 const m=raw.match(/^(.+?)\s+from\s+(.+?):\s*([+-]?[\d,]+(?:\.\d+)?)(?:\s*[·-]\s*observed median(?:\s+uptime)?\s*([\d.]+)%?)?$/i);
 if(!m){const h=humanizeEffects(raw);if(h!==clean(row.textContent))row.textContent=h;return}
 const effect=label(clean(m[1])),source=clean(m[2]),value=numberFrom(m[3]);if(!Number.isFinite(value))return;
 const head=row.closest('.character-hover-breakdown')?.querySelector('.chb-head span');
 const base=numberFrom(head?.textContent?.match(/CP\s+([\d,]+(?:\.\d+)?)/i)?.[1]);
 const pct=Number.isFinite(base)&&base>0?(value/base*100):0;
 const uptime=Number.isFinite(numberFrom(m[4]))?numberFrom(m[4]):null;
 const contribution=value>=0?`+${value.toLocaleString(undefined,{maximumFractionDigits:2})}`:value.toLocaleString(undefined,{maximumFractionDigits:2});
 row.textContent=`${effect} from ${source}: ${contribution} estimated contribution · ${pct.toFixed(2)}% of base power${uptime!==null?` · observed median uptime ${uptime.toFixed(2)}%`:''}`;
 row.style.display='block';row.style.margin='2px 0';
}
function enhance(){document.querySelectorAll('.character-hover-breakdown').forEach(card=>{
 const stats=card.querySelector('.chb-stats'),head=card.querySelector('.chb-head'),contribution=head?.querySelector('span');
 if(contribution&&/^CP\s+[\d,]+\s*[·-]\s*Contribution\s+/i.test(clean(contribution.textContent))){contribution.title='Estimated overall contribution for this character in the current encounter and party. It is an optimizer model value, not an observed Bible DPS parse and not Combat Power.';contribution.style.cursor='help'}
 if(stats)[...stats.querySelectorAll('span')].forEach(span=>{const t=clean(span.textContent);if(/^Party Synergy\s+[+−-]/i.test(t)){const v=t.replace(/^Party Synergy\s*/i,'');span.innerHTML=`<span class="chb-metric-label">Party Synergy</span> ${v}`;span.title='Estimated increase to this character’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model percentage, not a direct in-game damage percentage.';span.classList.add('chb-explained-metric')}else if(/^Support\s+[+−-]/i.test(t)){const v=t.replace(/^Support\s*/i,'');span.innerHTML=`<span class="chb-metric-label">Support Impact</span> ${v}`;span.title='Estimated increase to this character’s modeled potential from the party support’s applicable buffs. This is a model percentage, not a direct in-game damage percentage.';span.classList.add('chb-explained-metric')}});
 card.querySelectorAll('.chb-synergy').forEach(formatEffectRow);
 card.querySelectorAll('.chb-synergy').forEach(row=>{const txt=clean(row.textContent);row.title=/observed median uptime/i.test(txt)?'Estimated contribution is the optimizer model value assigned to this effect for this character. Observed median uptime is the typical percentage of the relevant encounter for which the support effect is active, based on Bible encounter data. These are different measurements.':'Estimated contribution from a party synergy. The numeric value is a model contribution value, not a percentage and not a direct in-game damage increase.';row.style.cursor='help'});
 document.querySelectorAll('.party-synergies').forEach(formatPartySynergySummary);
 card.querySelectorAll('div,span').forEach(el=>{if(el.dataset.chbSynergySummaryDone==='1')return;const raw=clean(el.textContent);if(!/^Synergies\s*:/i.test(raw))return;formatPartySynergySummary(el)});
});
 document.querySelectorAll('.party-synergies').forEach(formatPartySynergySummary);
}
function css(){let s=document.getElementById('character-hover-explanations-style');if(!s){s=document.createElement('style');s.id='character-hover-explanations-style';document.head.appendChild(s)}s.textContent='.chb-explained-metric{cursor:help;border-bottom:1px dotted rgba(255,255,255,.45)}.chb-explained-metric:hover{border-bottom-color:currentColor}.chb-metric-label{font-weight:600}.chb-synergy{display:block!important;margin:2px 0}.chb-synergy[title]{cursor:help}.chb-detail[title]{cursor:help}.party-synergies{line-height:1.5}.party-synergies strong{font-weight:600}'}
function start(){css();enhance();const root=document.getElementById('suggestedParties')||document.body;let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(enhance,25)};new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});document.addEventListener('mouseover',e=>{if(e.target.closest?.('#suggestedParties .party-member'))schedule()},true);[0,50,150,300,600,1000,2000,4000,8000].forEach(ms=>setTimeout(enhance,ms));setInterval(enhance,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();