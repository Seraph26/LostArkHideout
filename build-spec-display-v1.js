/* Lost Ark Hideout — build specialization display */
(()=>{
'use strict';
const KEY='lostark-hideout-build-profiles-v3';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,"'");
function specFor(p){
 const e=(p?.engravings||[]).map(norm).join(' ');
 const rules=[
  [/master summoner/,'Master Summoner'],[/communication overflow/,'Communication Overflow'],[/pinnacle/,'Pinnacle'],[/control/,'Control'],[/mayhem/,'Mayhem'],[/berserker'?s technique|berserker technique/,"Berserker's Technique"],[/surge/,'Surge'],[/remaining energy/,'Remaining Energy'],[/igniter/,'Igniter'],[/reflux/,'Reflux'],[/hunger/,'Hunger'],[/full moon harvester/,'Full Moon Harvester'],[/night.?s edge/,"Night's Edge"],[/predator/,'Predator'],[/punisher/,'Punisher'],[/deathblow/,'Deathblow'],[/esoteric flurry/,'Esoteric Flurry'],[/first intention/,'First Intention'],[/esoteric skill enhancement/,'Esoteric Skill Enhancement'],[/asura.?s path/,"Asura's Path"],[/brawl king storm/,'Brawl King Storm'],[/peacemaker/,'Peacemaker'],[/time to hunt/,'Time to Hunt'],[/empress grace/,'Empress Grace'],[/emperor'?s decree|emperor/,"Emperor's Decree"],[/barrage enhancement/,'Barrage Enhancement'],[/firepower enhancement/,'Firepower Enhancement'],[/enhanced weapon/,'Enhanced Weapon'],[/pistoleer/,'Pistoleer'],[/death strike/,'Death Strike'],[/loyal companion/,'Loyal Companion'],[/demonic impulse/,'Demonic Impulse'],[/perfect suppression/,'Perfect Suppression'],[/wind fury/,'Wind Fury'],[/drizzle/,'Drizzle'],[/full bloom/,'Full Bloom'],[/recurrence/,'Recurrence']
 ];
 for(const [re,name] of rules)if(re.test(e))return name;
 return p?.spec||'';
}
function apply(){
 const cache=load();
 document.querySelectorAll('#suggestedParties a[href*="lostark.bible/character/"]').forEach(a=>{
  const href=a.getAttribute('href');
  const p=cache[href]; if(!p)return;
  const spec=specFor(p); if(!spec)return;
  const host=a.parentElement; if(!host)return;
  const classEl=host.querySelector('.class');
  if(classEl){classEl.textContent=spec+' '+(p.className||'');return;}
  const children=[...host.children];
  const old=children.find(x=>String(x.textContent||'').trim()===(p.className||'').trim());
  if(old)old.textContent=spec+' '+p.className;
 });
}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(apply,80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
new MutationObserver(schedule).observe(document.getElementById('suggestedParties')||document.body,{childList:true,subtree:true});
window.addEventListener('lostark-build-profiles-v3-ready',schedule);
})();
