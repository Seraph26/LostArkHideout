/* Lost Ark Hideout — General Optimization hover spacing + synergy explanation v1 */
(()=>{
'use strict';

const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const EFFECT_LABELS={
 damage:'Damage',
 mana:'Mana',
 crit:'Critical Rate',
 critDamage:'Critical Damage',
 attackSpeed:'Attack Speed',
 attackPower:'Attack Power',
 moveSpeed:'Move Speed',
 movementSpeed:'Move Speed',
 supportAmplification:'Support Amplification',
 positional:'Positional Damage'
};

const synergyTitle='Party synergies available from the current party. Support uptime is an optimizer estimate based on support class type and party composition, including party positioning compatibility.';

function label(v){
 const x=clean(v);
 return EFFECT_LABELS[x]||x.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
}

function formatNumber(v){
 const n=Number(String(v??'').replace(/,/g,''));
 return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:2}):String(v??'');
}

function formatPercent(v){
 const n=Number(String(v??'').replace(/,/g,''));
 return Number.isFinite(n)?n.toFixed(2)+'%':String(v??'');
}

function formatSynergySummary(){
 document.querySelectorAll('#suggestedParties .party-synergies').forEach(el=>{
  el.title=synergyTitle;
  el.style.cursor='help';
 });
}

function rebuildRow(row){
 const raw=clean(row.textContent);
 if(!raw||/^No direct party effects detected\.?$/i.test(raw))return;

 /* Already correctly structured: leave the values untouched. */
 const children=[...row.children].map(x=>clean(x.textContent)).filter(Boolean);
 if(children.length>=2&&/estimated contribution/i.test(children[0])&&/(?:% of .*base power|% of base power)/i.test(children[1])){
  row.style.display='block';
  row.style.margin='8px 0';
  row.style.lineHeight='1.45';
  children.slice(2).forEach(()=>{});
  return;
 }

 const m=raw.match(/^(.+?)\s+(from|to)\s+(.+?):\s*([+-]?[\d,]+(?:\.\d+)?)\s+estimated contribution\s*(?:[-·]?\s*)?(\d+(?:\.\d+)?)%\s+of\s+(.+?base power)(?:\s+observed median uptime\s+(\d+(?:\.\d+)?)%)?$/i);
 if(!m)return;

 const effect=label(m[1]);
 const direction=m[2].toLowerCase();
 const source=clean(m[3]);
 const value=formatNumber(m[4]);
 const pct=formatPercent(m[5]);
 const denominator=clean(m[6]);
 const uptime=m[7]?formatPercent(m[7]):null;

 row.innerHTML=`<div>${effect} ${direction} ${source}: ${m[4].trim().startsWith('-')?'':'+'}${value} estimated contribution</div><div>${pct} of ${denominator}</div>${uptime?`<div>Observed median uptime ${uptime}</div>`:''}`;
 row.style.display='block';
 row.style.margin='8px 0';
 row.style.lineHeight='1.45';
}

function formatCards(){
 document.querySelectorAll('#suggestedParties .character-hover-breakdown').forEach(card=>{
  card.querySelectorAll('.chb-synergy').forEach(rebuildRow);
 });
}

function css(){
 let s=document.getElementById('general-hover-spacing-v1-style');
 if(!s){
  s=document.createElement('style');
  s.id='general-hover-spacing-v1-style';
  document.head.appendChild(s);
 }
 s.textContent=`
 #suggestedParties .character-hover-breakdown .chb-synergy{
   display:block!important;
   margin:8px 0!important;
   line-height:1.45!important;
 }
 #suggestedParties .character-hover-breakdown .chb-synergy>div{
   display:block!important;
   margin:0!important;
 }
 #suggestedParties .character-hover-breakdown .chb-detail{
   margin-top:6px!important;
 }
 #suggestedParties .party-synergies{
   line-height:1.5!important;
 }
 `;
}

function start(){
 css();
 const run=()=>{
  formatSynergySummary();
  formatCards();
 };
 run();
 const root=document.getElementById('suggestedParties')||document.body;
 let timer;
 const schedule=()=>{
  clearTimeout(timer);
  timer=setTimeout(run,30);
 };
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
 document.addEventListener('mouseover',e=>{
  if(e.target.closest?.('#suggestedParties .party-member'))schedule();
 },true);
 [0,50,150,300,600,1000,2000,4000,8000].forEach(ms=>setTimeout(run,ms));
 setInterval(run,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
