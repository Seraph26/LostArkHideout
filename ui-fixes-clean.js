/* Lost Ark Hideout — final class/spec/icon/position display authority */
(()=>{
'use strict';
const KEY='lostark-hideout-private-v3', BUILD='lostark-hideout-build-profiles-v3';
const norm=v=>String(v??'').normalize('NFKC').trim().toLowerCase().replace(/[’']/g,"'");
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
function load(k){try{return JSON.parse(localStorage.getItem(k)||'null')||{}}catch{return{}}}
function className(p,b){return clean(p?.class||p?.className||p?.characterClass||b?.className||b?.class||'')}
function specFor(p,b){
 const cls=norm(className(p,b));
 if(['bard','artist','paladin','valkyrie'].includes(cls))return 'N/A';
 const t=norm([p?.engravings,p?.arkGrid,p?.arkPassive,p?.skills,p?.tripods,p?.skillsText,p?.skillText,p?.tripodsText,p?.arkGridText,p?.arkPassiveText,p?.rawText,b?.text,...(b?.engravings||[]),...(b?.grid||[]).map(x=>`${x.name} ${x.type} ${x.branch}`),...(b?.arkPassive||[]).map(x=>`${x.name} ${x.level}`)].flat().join(' '));
 const rules={
  berserker:[["berserker's technique","Berserker Technique"],['berserker technique','Berserker Technique'],['mayhem','Mayhem']],
  souleater:[['full moon harvester','Full Moon Harvester'],['full moon','Full Moon Harvester'],['full bloom','Full Bloom'],["night's edge","Night's Edge"],['night edge',"Night's Edge"]],
  summoner:[['master summoner','Master Summoner'],['communication overflow','Communication Overflow']],
  scrapper:[['shock training','Shock Training'],['taijutsu','Taijutsu']],glaivier:[['pinnacle','Pinnacle'],['control','Control']],glavier:[['pinnacle','Pinnacle'],['control','Control']],
  wardancer:[['first intention','First Intention'],['esoteric skill enhancement','Esoteric Skill Enhancement']],deathblade:[['surge','Surge'],['remaining energy','Remaining Energy']],reaper:[['hunger','Hunger'],['nightmare','Nightmare']],
  striker:[['deathblow','Deathblow'],['esoteric flurry','Esoteric Flurry']],gunslinger:[['peacemaker','Peacemaker'],['time to hunt','Time to Hunt']],deadeye:[['pistoleer','Pistoleer'],['enhanced weapon','Enhanced Weapon']],
  artillerist:[['barrage enhancement','Barrage Enhancement'],['firepower enhancement','Firepower Enhancement']],slayer:[['predator','Predator'],['punisher','Punisher']],breaker:[["asura's path","Asura's Path"],['asura','Asura'],['brawl king storm','Brawl King Storm']],
  destroyer:[['gravity training','Gravity Training'],['rage hammer','Rage Hammer']],gunlancer:[['combat readiness','Combat Readiness'],['lone knight','Lone Knight']],soulfist:[['energy overflow','Energy Overflow'],['robust spirit','Robust Spirit']],
  sharpshooter:[['death strike','Death Strike'],['loyal companion','Loyal Companion']],aeromancer:[['wind fury','Wind Fury'],['drizzle','Drizzle']],arcanist:[['emperor','Emperor'],['empress','Empress']],arcana:[['emperor','Emperor'],['empress','Empress']],sorceress:[['igniter','Igniter'],['reflux','Reflux']]
 };
 for(const [needle,label] of (rules[cls]||[]))if(t.includes(needle))return label;
 return clean(p?.specialization||b?.specialization||'')||'';
}
function positionFor(p,b){
 const cls=norm(className(p,b));
 if(['bard','artist','paladin','valkyrie'].includes(cls))return 'N/A';
 const explicit=clean(b?.positional||p?.positional||'');
 if(explicit&&!/^unknown$/i.test(explicit))return explicit;
 const t=norm([b?.text,p?.engravings,p?.arkGrid,p?.arkPassive,p?.tripods].flat().join(' '));
 if(/ambush master|back attack|entropy/.test(t))return 'Back Attack';
 if(/master brawler|front attack/.test(t))return 'Front Attack';
 if(/hit master/.test(t))return 'Hit Master';
 if(cls==='berserker'&&/mayhem|berserker'?s technique|berserker technique/.test(t))return 'Back Attack';
 if(cls==='summoner'&&/master summoner|communication overflow|ancient spear/.test(t))return 'Hit Master';
 if(cls==='souleater'&&/full moon harvester|night.?s edge/.test(t))return 'Hit Master';
 return 'Unknown';
}
function icon(cls){try{return window.LostArkHideoutClassData?.iconUrl?.(cls)||''}catch{return ''}}
function getBuild(url){const cache=load(BUILD);return url&&cache[url]||null}
function stateProfiles(){const s=load(KEY),m=new Map();for(const c of s.characters||[]){const p=c?.profile||{};const url=c?.url||'';const name=norm(p.name||c.name);if(name)m.set(name,{p,url,b:getBuild(url)})}return m}
function makeInline(img){img.style.display='inline-block';img.style.width='22px';img.style.height='22px';img.style.objectFit='contain';img.style.verticalAlign='middle';img.style.margin='0 7px 0 0';img.style.flex='0 0 22px';img.style.position='static';}
function applyIcon(container,cls){if(!container||!cls)return;const src=icon(cls);if(!src)return;let img=container.querySelector(':scope > img.class-icon');if(!img){img=document.createElement('img');img.className='class-icon';container.insertBefore(img,container.firstChild)}img.src=src;img.alt=cls;img.removeAttribute('srcset');makeInline(img);container.style.display='inline-flex';container.style.alignItems='center';container.style.flexWrap='nowrap';}
function repairTop(profiles){document.querySelectorAll('#roster .character').forEach(card=>{const link=card.querySelector('.character-bible-link'),key=norm(link?.textContent),x=profiles.get(key);if(!x)return;const base=className(x.p,x.b),spec=specFor(x.p,x.b),title=card.querySelector('.character-title');if(title)applyIcon(title,base);card.querySelectorAll('.class').forEach(e=>e.textContent=spec||base)})}
function repairBottom(profiles){document.querySelectorAll('#suggestedParties .party-member').forEach(card=>{const link=card.querySelector('.party-character-link');const key=norm(link?.textContent),x=profiles.get(key);if(!x)return;const base=className(x.p,x.b),spec=specFor(x.p,x.b),pos=positionFor(x.p,x.b);if(link)applyIcon(link,base);const clsEl=card.querySelector('.party-class-label');if(clsEl)clsEl.textContent=spec||base;const posEl=card.querySelector('.party-stat-label');if(posEl){const cpMatch=clean(posEl.textContent).match(/·\s*CP\s+[\d,]+.*$/i);posEl.textContent=cpMatch?`${pos} ${cpMatch[0]}`:pos}})}
function repair(){const profiles=stateProfiles();repairTop(profiles);repairBottom(profiles)}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
function start(){repair();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('lostark-build-profiles-v3-ready',()=>setTimeout(repair,100))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
