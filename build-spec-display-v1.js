/* Lost Ark Hideout — build specialization display v4 */
(()=>{
'use strict';
const KEY='lostark-hideout-build-profiles-v3';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,"'");
const itemText=x=>typeof x==='string'?x:[x?.name,x?.title,x?.label,x?.engraving,x?.skill,x?.description,x?.text].filter(Boolean).join(' ');
function text(p){return norm([
 p?.spec,p?.specialization,p?.specName,p?.buildSpec,p?.buildName,
 ...(p?.engravings||[]).map(itemText), ...(p?.engravingNames||[]).map(itemText),
 p?.engravingsText,p?.buildText,p?.raidLoadoutText,p?.skillsText,p?.skillText,
 p?.arkGridText,p?.arkPassiveText,p?.rawText
 ].filter(Boolean).join(' '))}
function specFor(p){const e=text(p);const rules=[
 [/master summoner/,'Master Summoner'],[/communication overflow/,'Communication Overflow'],[/pinnacle/,'Pinnacle'],[/control/,'Control'],[/mayhem/,'Mayhem'],[/berserker'?s technique|berserker technique/,"Berserker's Technique"],
 [/surge/,'Surge'],[/remaining energy/,'Remaining Energy'],[/igniter/,'Igniter'],[/reflux/,'Reflux'],[/hunger/,'Hunger'],[/full moon harvester/,'Full Moon Harvester'],[/night.?s edge/,"Night's Edge"],
 [/predator/,'Predator'],[/punisher/,'Punisher'],[/deathblow/,'Deathblow'],[/esoteric flurry/,'Esoteric Flurry'],[/first intention/,'First Intention'],[/esoteric skill enhancement/,'Esoteric Skill Enhancement'],[/asura.?s path/,"Asura's Path"],[/brawl king storm/,'Brawl King Storm'],
 [/peacemaker/,'Peacemaker'],[/time to hunt/,'Time to Hunt'],[/empress grace/,'Empress Grace'],[/emperor'?s decree|emperor/,"Emperor's Decree"],[/barrage enhancement/,'Barrage Enhancement'],[/firepower enhancement/,'Firepower Enhancement'],[/enhanced weapon/,'Enhanced Weapon'],[/pistoleer/,'Pistoleer'],[/death strike/,'Death Strike'],[/loyal companion/,'Loyal Companion'],[/demonic impulse/,'Demonic Impulse'],[/perfect suppression/,'Perfect Suppression'],[/wind fury/,'Wind Fury'],[/drizzle/,'Drizzle'],[/full bloom/,'Full Bloom'],[/recurrence/,'Recurrence'],[/shock training/,'Shock Training'],[/taijutsu/,'Taijutsu'],[/remaining energy/,'Remaining Energy'],[/deathblow/,'Deathblow'],[/esoteric flurry/,'Esoteric Flurry'],[/barrage enhancement/,'Barrage Enhancement'],[/firepower enhancement/,'Firepower Enhancement'],[/desperate salvation/,'Desperate Salvation'],[/true courage/,'True Courage']
 ];for(const [re,name] of rules)if(re.test(e))return name;return p?.spec||p?.specialization||''}
function normalizeUrl(x){try{return new URL(x,location.href).href.replace(/\/$/,'')}catch{return String(x||'').replace(/\/$/,'')}}
function profileFor(a,cache){const href=a.getAttribute('href');return cache[href]||cache[normalizeUrl(href)]||null}
function apply(){const cache=load();document.querySelectorAll('#suggestedParties a[href*="lostark.bible/character/"]').forEach(a=>{const p=profileFor(a,cache);if(!p)return;const spec=specFor(p);if(!spec)return;const host=a.closest('.party-member')||a.parentElement;const classEl=host?.querySelector('.party-class-label');if(classEl){classEl.textContent=spec;return}const candidates=[...(host?.children||[])].filter(x=>x!==a);const old=candidates.find(x=>{const t=norm(x.textContent);return t===norm(p.className)||t===norm(p.class)||t===norm(spec+' '+p.className)||t===norm(spec+' '+p.class)||t===norm(spec)});if(old)old.textContent=spec})}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(apply,80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
const root=document.getElementById('suggestedParties')||document.body;new MutationObserver(schedule).observe(root,{childList:true,subtree:true});window.addEventListener('lostark-build-profiles-v3-ready',schedule);
})();
