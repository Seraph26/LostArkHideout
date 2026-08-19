/* Lost Ark Hideout — canonical character hover effect formatting v1 */
(()=>{
'use strict';
const LABELS={crit:'Critical Rate',critDamage:'Critical Damage',attackSpeed:'Attack Speed',attackPower:'Attack Power',supportAmplification:'Support Amplification',mana:'Mana',identity:'Identity',damage:'Damage'};
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const label=k=>LABELS[k]||k;
const numberFrom=s=>{const m=String(s??'').replace(/,/g,'').match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
function formatRow(row){
  const raw=clean(row.textContent);
  if(!raw||/^No direct party effects detected\.?$/i.test(raw))return;
  const m=raw.match(/^(.+?)\s+from\s+(.+?):\s*([+-]?[\d,]+(?:\.\d+)?)(?:\s*[·-]\s*observed median(?: uptime)?\s*([\d.]+)%?)?$/i);
  if(!m)return;
  const effect=label(clean(m[1]));
  const source=clean(m[2]);
  const value=numberFrom(m[3]);
  if(!Number.isFinite(value))return;
  const head=row.closest('.character-hover-breakdown')?.querySelector('.chb-head span');
  const base=numberFrom(head?.textContent?.match(/CP\s+([\d,]+(?:\.\d+)?)/i)?.[1]);
  const pct=Number.isFinite(base)&&base>0?(value/base*100):0;
  const uptime=Number.isFinite(numberFrom(m[4]))?numberFrom(m[4]):null;
  const contribution=value>=0?`+${value.toLocaleString(undefined,{maximumFractionDigits:2})}`:value.toLocaleString(undefined,{maximumFractionDigits:2});
  row.textContent=`${effect} from ${source}: ${contribution} estimated contribution · ${pct.toFixed(2)}% of base power${uptime!==null?` · observed median uptime ${uptime.toFixed(2)}%`:''}`;
  row.style.display='block';
  row.style.margin='2px 0';
}
function render(){
  document.querySelectorAll('#suggestedParties .character-hover-breakdown .chb-synergy').forEach(formatRow);
}
function start(){
  let timer;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,25)};
  render();
  const root=document.getElementById('suggestedParties')||document.body;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  document.addEventListener('mouseover',e=>{if(e.target.closest?.('#suggestedParties .party-member'))schedule()},true);
  [0,100,250,500,1000,2000,4000,8000].forEach(ms=>setTimeout(render,ms));
  setInterval(render,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
