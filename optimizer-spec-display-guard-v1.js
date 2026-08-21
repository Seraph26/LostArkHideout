/* Optimized-party specialization display guard.
 *
 * Display-only. It reads the same v3 build-profile cache used by the existing
 * build-spec display layer and writes only .party-class-label text inside
 * Suggested Parties. It does not alter optimizer inputs, scoring, assignments,
 * hover cards, arrows, swaps, or party behavior.
 */
(()=>{
'use strict';
const KEY='lostark-hideout-build-profiles-v3';
const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const itemText=x=>typeof x==='string'?x:[x?.name,x?.title,x?.label,x?.engraving,x?.skill,x?.description,x?.text].filter(Boolean).join(' ');
const specFor=p=>{
 const e=norm([
  p?.spec,p?.specialization,p?.specName,p?.buildSpec,p?.buildName,
  ...(p?.engravings||[]).map(itemText),...(p?.engravingNames||[]).map(itemText),
  p?.engravingsText,p?.buildText,p?.raidLoadoutText,p?.skillsText,p?.skillText,
  p?.arkGridText,p?.arkPassiveText,p?.rawText,p?.text
 ].filter(Boolean).join(' '));
 const rules=[
  [/master summoner/,'Master Summoner'],[/communication overflow/,'Communication Overflow'],
  [/pinnacle/,'Pinnacle'],[/\bcontrol\b/,'Control'],[/mayhem/,'Mayhem'],
  [/berserker'?s technique|berserker technique/,"Berserker's Technique"],
  [/surge/,'Surge'],[/remaining energy/,'Remaining Energy'],
  [/igniter/,'Igniter'],[/reflux/,'Reflux'],[/hunger/,'Hunger'],[/lunar voice/,'Lunar Voice'],
  [/full moon harvester/,'Full Moon Harvester'],[/night.?s edge/,"Night's Edge"],
  [/predator/,'Predator'],[/punisher/,'Punisher'],[/deathblow/,'Deathblow'],
  [/esoteric flurry/,'Esoteric Flurry'],[/first intention/,'First Intention'],
  [/esoteric skill enhancement/,'Esoteric Skill Enhancement'],[/asura.?s path/,"Asura's Path"],
  [/brawl king storm/,'Brawl King Storm'],[/peacemaker/,'Peacemaker'],[/time to hunt/,'Time to Hunt'],
  [/empress.?s grace|grace of the empress/,'Grace of the Empress'],
  [/order\s+of\s+the\s+emperor|emperor'?s decree|emperor decree/,'Order of the Emperor'],
  [/barrage enhancement/,'Barrage Enhancement'],[/firepower enhancement/,'Firepower Enhancement'],
  [/enhanced weapon|tactical bullet/,'Enhanced Weapon'],[/pistoleer/,'Pistoleer'],
  [/death strike/,'Death Strike'],[/loyal companion/,'Loyal Companion'],
  [/demonic impulse/,'Demonic Impulse'],[/perfect suppression/,'Perfect Suppression'],
  [/wind fury/,'Wind Fury'],[/drizzle/,'Drizzle'],[/full bloom/,'Full Bloom'],
  [/recurrence/,'Recurrence'],[/shock training/,'Shock Training'],[/taijutsu/,'Taijutsu'],
  [/desperate salvation/,'Desperate Salvation'],[/true courage/,'True Courage'],
  [/blessed aura/,'Blessed Aura'],[/judgment/,'Judgment'],[/liberator/,'Liberator'],[/shining knight/,'Shining Knight']
 ];
 for(const [re,name] of rules)if(re.test(e))return name;
 return p?.spec||p?.specialization||'';
};
const key=x=>{try{return new URL(x,location.href).href.replace(/\/$/,'').toLowerCase()}catch{return String(x||'').replace(/\/$/,'').toLowerCase()}};
function apply(){
 const root=document.getElementById('suggestedParties');if(!root)return;
 const cache=load();
 root.querySelectorAll('a.party-character-link[href*="lostark.bible/character/"]').forEach(a=>{
  const href=a.getAttribute('href'),abs=a.href,p=cache[href]||cache[abs]||cache[key(href)]||cache[key(abs)];if(!p)return;
  const spec=specFor(p);if(!spec||norm(spec)==='-')return;
  const host=a.closest('.party-member')||a.parentElement,label=host?.querySelector('.party-class-label');
  if(label&&label.textContent.trim()!==spec)label.textContent=spec;
 });
}
let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,60)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.addEventListener('lostark-build-profiles-v3-ready',schedule);
const root=document.getElementById('suggestedParties')||document.body;
new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
})();