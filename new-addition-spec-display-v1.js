/* Lost Ark Hideout — New Addition specialization display v1 */
(()=>{
'use strict';
const NEW_KEY='lostark-hideout-new-additions-v1';
const load=()=>{try{return JSON.parse(localStorage.getItem(NEW_KEY)||'[]')}catch{return[]}};
const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,"'");
const itemText=x=>typeof x==='string'?x:[x?.name,x?.title,x?.label,x?.engraving,x?.skill,x?.description,x?.text].filter(Boolean).join(' ');
function text(p){return norm([
 p?.spec,p?.specialization,p?.specName,p?.buildSpec,p?.buildName,
 ...(p?.engravings||[]).map(itemText), ...(p?.engravingNames||[]).map(itemText),
 Object.keys(p?.arkPassive||{}),
 p?.engravingsText,p?.buildText,p?.raidLoadoutText,p?.skillsText,p?.skillText,
 p?.arkGridText,p?.arkPassiveText,p?.rawText
 ].filter(Boolean).join(' '))}
function specFor(p){
 const explicit=p?.spec||p?.specialization||p?.specName||p?.buildSpec;
 if(explicit)return explicit;
 const e=text(p);
 const rules=[
  [/master summoner/,'Master Summoner'],[/communication overflow/,'Communication Overflow'],[/pinnacle/,'Pinnacle'],[/mayhem/,'Mayhem'],[/berserker'?s technique|berserker technique/,"Berserker's Technique"],
  [/surge/,'Surge'],[/remaining energy/,'Remaining Energy'],[/igniter/,'Igniter'],[/reflux/,'Reflux'],[/hunger/,'Hunger'],[/full moon harvester/,'Full Moon Harvester'],[/night.?s edge/,"Night's Edge"],
  [/predator/,'Predator'],[/punisher/,'Punisher'],[/deathblow/,'Deathblow'],[/esoteric flurry/,'Esoteric Flurry'],[/first intention/,'First Intention'],[/esoteric skill enhancement/,'Esoteric Skill Enhancement'],[/asura.?s path/,"Asura's Path"],[/brawl king storm/,'Brawl King Storm'],
  [/peacemaker/,'Peacemaker'],[/time to hunt/,'Time to Hunt'],[/empress grace/,'Empress Grace'],[/emperor'?s decree|emperor/,"Emperor's Decree"],[/barrage enhancement/,'Barrage Enhancement'],[/firepower enhancement/,'Firepower Enhancement'],[/enhanced weapon/,'Enhanced Weapon'],[/pistoleer/,'Pistoleer'],[/death strike/,'Death Strike'],[/loyal companion/,'Loyal Companion'],[/demonic impulse/,'Demonic Impulse'],[/perfect suppression/,'Perfect Suppression'],[/wind fury/,'Wind Fury'],[/drizzle/,'Drizzle'],[/full bloom/,'Full Bloom'],[/recurrence/,'Recurrence'],[/shock training/,'Shock Training'],[/taijutsu/,'Taijutsu'],[/desperate salvation/,'Desperate Salvation'],[/true courage/,'True Courage'],
  [/liberator/,'Liberator']
 ];
 for(const [re,name] of rules)if(re.test(e))return name;
 return '';
}
function apply(){
 const chars=load();
 document.querySelectorAll('.new-addition-card').forEach(card=>{
  const id=card.dataset.candidateId;
  const c=chars.find(x=>x?.id===id);
  if(!c?.profile)return;
  const spec=specFor(c.profile);
  if(!spec)return;
  const classEl=card.querySelector('.class');
  if(classEl)classEl.textContent=spec;
 });
}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(apply,50)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
const root=document.getElementById('comparison')||document.body;
new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
window.addEventListener('lostark-build-profiles-v3-ready',schedule);
})();
