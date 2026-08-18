/* Lost Ark Hideout — positional build authority v3 */
(()=>{
'use strict';
const V3='lostark-hideout-build-profiles-v3',V2='lostark-hideout-build-profiles-v2';
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
function load(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return{}}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).toLowerCase().replace(/[’']/g,"'");
function infer(b){
 const cls=norm(b.className||b.class||b.characterClass||'');
 const t=norm([b.className,b.class,b.characterClass,b.text,...(b.engravings||[]),...(b.grid||[]).map(x=>`${x.name} ${x.type} ${x.branch}`),...(b.arkPassive||[]).map(x=>`${x.name} ${x.level}`),...(b.tripods||[]).map(x=>`${x.skill||''} ${x.name||''} ${x.tier||''}`),b.skillsText,b.skillText,b.tripodsText,b.arkGridText,b.arkPassiveText,b.rawText].filter(Boolean).join(' '));
 if(SUPPORTS.has(b.className||b.class||b.characterClass))return'N/A';
 if(/ambush master|back attack|back-attack|backattack|entropy set|entropy armor/.test(t))return'Back Attack';
 if(/master brawler|front attack|front-attack|frontattack/.test(t))return'Front Attack';
 if(/hit master|hitmaster/.test(t))return'Hit Master';
 if(/surge|remaining energy|hunger|moonlight/.test(t)&&/deathblade|reaper/.test(t))return'Back Attack';
 if(/taijutsu|shock training/.test(t)&&/scrapper/.test(t))return'Back Attack';
 if(/pinnacle|control/.test(t)&&/glaivier|glavier/.test(t))return'Back Attack';
 if(/deathblow|esoteric flurry/.test(t)&&/striker/.test(t))return'Back Attack';
 if(/first intention|esoteric skill enhancement/.test(t)&&/wardancer/.test(t))return'Back Attack';
 if(/predator|punisher/.test(t)&&/slayer/.test(t))return'Back Attack';
 if(/asura.?s path/.test(t)&&/breaker/.test(t))return'Back Attack';
 if(/master summoner|ancient spear/.test(t)&&/summoner/.test(t))return'Hit Master';
 if(/communication overflow/.test(t)&&/summoner/.test(t))return'Hit Master';
 if(/igniter|reflux/.test(t)&&/sorceress/.test(t))return'Hit Master';
 if(/full moon harvester|night.?s edge/.test(t)&&/souleater|soul eater/.test(t))return'Hit Master';
 if(/pistoleer|enhanced weapon/.test(t)&&/deadeye/.test(t))return'Hit Master';
 if(/peacemaker|time to hunt/.test(t)&&/gunslinger/.test(t))return'Hit Master';
 if(/barrage enhancement|firepower enhancement/.test(t)&&/artillerist/.test(t))return'Hit Master';
 if(/emperor/.test(t)&&/arcanist|arcana/.test(t))return'Hit Master';
 if(/empress/.test(t)&&/arcanist|arcana/.test(t))return'Hit Master';
 return b.positional||'Unknown';
}
function sync(){
 const v3=load(V3),legacy=load(V2);let changed=false;
 for(const [url,b] of Object.entries(v3)){
  if(!b||typeof b!=='object')continue;
  const p=infer(b);
  if(b.positional!==p){b.positional=p;changed=true}
  if(!legacy[url]||typeof legacy[url]!=='object')legacy[url]={};
  const old=legacy[url];
  if(old.positional!==p){old.positional=p;changed=true}
  if(b.className&&old.className!==b.className){old.className=b.className;changed=true}
 }
 if(changed){save(V3,v3);save(V2,legacy)}
 window.LostArkPositionalAuthorityV1={infer,get:url=>v3[url]||legacy[url]||null,sync};
}
function wireRefresh(){
 const btn=document.getElementById('refreshBtn');
 if(!btn||btn.dataset.positionalAuthorityRefresh==='1')return;
 btn.dataset.positionalAuthorityRefresh='1';
 btn.addEventListener('click',async()=>{
  try{if(window.LostArkBuildProfilesV3?.refresh)await window.LostArkBuildProfilesV3.refresh();sync()}catch(e){console.warn('Authoritative build refresh failed',e)}
 },true);
}
sync();
window.addEventListener('lostark-build-profiles-v3-ready',sync);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireRefresh,{once:true});else wireRefresh();
})();
