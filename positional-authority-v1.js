/* Lost Ark Hideout — positional build authority v5 */
(()=>{
'use strict';
const V3='lostark-hideout-build-profiles-v3',V2='lostark-hideout-build-profiles-v2';
const SUPPORTS=new Set(['bard','artist','paladin','valkyrie']);
function load(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return{}}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).toLowerCase().replace(/[’']/g,"'");
function infer(b){
 const cls=norm(b.className||b.class||b.characterClass||'');
 const t=norm([b.className,b.class,b.characterClass,b.text,...(b.engravings||[]),...(b.grid||[]).map(x=>`${x.name} ${x.type} ${x.branch}`),...(b.arkPassive||[]).map(x=>`${x.name} ${x.level}`),...(b.tripods||[]).map(x=>`${x.skill||''} ${x.name||''} ${x.tier||''}`),b.skillsText,b.skillText,b.tripodsText,b.arkGridText,b.arkPassiveText,b.rawText].filter(Boolean).join(' '));
 if(SUPPORTS.has(cls))return'N/A';
 if(/ambush master|back attack|back-attack|backattack|entropy set|entropy armor/.test(t))return'Back Attack';
 if(/master brawler|front attack|front-attack|frontattack/.test(t))return'Front Attack';
 if(/hit master|hitmaster/.test(t))return'Hit Master';
 // Berserker: both current engravings/build identities are non-ranged positional
 // builds, but their distinction is useful for determining the actual skill package.
 // Mayhem and Berserker's Technique use Back Attack-oriented Berserker skills;
 // use explicit build evidence first, then this class/build fallback.
 if(cls==='berserker' && /mayhem|berserker'?s technique|berserker technique/.test(t))return'Back Attack';
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
 if(/emperor|empress/.test(t)&&/arcanist|arcana/.test(t))return'Hit Master';
 return b.positional||'Unknown';
}
function usableClass(v){return v&&norm(v)!=='unknown'&&norm(v)!=='n/a'?v:''}
function sync(){
 const v3=load(V3),legacy=load(V2);let changed=false;
 for(const [url,b] of Object.entries(v3)){
  if(!b||typeof b!=='object')continue;
  const old=legacy[url]&&typeof legacy[url]==='object'?legacy[url]:{};
  const source={...old,...b};
  const cls=usableClass(b.className)||usableClass(old.className)||usableClass(old.class)||'';
  if(cls)source.className=cls;
  const p=infer(source);
  if(b.positional!==p){b.positional=p;changed=true}
  if(old.positional!==p){old.positional=p;changed=true}
  if(cls&&old.className!==cls){old.className=cls;changed=true}
  if(cls&&b.className!==cls){b.className=cls;changed=true}
  if(!legacy[url]){legacy[url]=old;changed=true}
 }
 if(changed){save(V3,v3);save(V2,legacy)}
 window.LostArkPositionalAuthorityV1={infer,get:url=>v3[url]||legacy[url]||null,sync};
}
function wireRefresh(){
 const btn=document.getElementById('refreshBtn');
 if(!btn||btn.dataset.positionalAuthorityRefresh==='1')return;
 btn.dataset.positionalAuthorityRefresh='1';
 btn.addEventListener('click',()=>{setTimeout(sync,300)},true);
}
sync();window.addEventListener('lostark-build-profiles-v3-ready',sync);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireRefresh,{once:true});else wireRefresh();
})();
