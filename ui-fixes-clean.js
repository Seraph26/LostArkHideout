/* UI icon/class repair only. Deliberately does not load or control the optimizer. */
(()=>{
  const KEY='lostark-hideout-private-v3';
  const normalizeName=v=>String(v||'').normalize('NFKC').trim().toLowerCase();
  const canonicalClass=v=>{const s=normalizeName(v);if(['soul eater','souleater','soul_eater','soul-eater'].includes(s))return 'Souleater';if(['guardian knight','guardianknight','guardian_knight'].includes(s))return 'Guardian Knight';return String(v||'').trim()};
  const textOf=v=>{if(v==null)return '';if(typeof v==='string'||typeof v==='number')return String(v);if(Array.isArray(v))return v.map(textOf).join(' ');if(typeof v==='object')return Object.entries(v).map(([k,x])=>`${k} ${textOf(x)}`).join(' ');return ''};
  function profiles(){try{const state=JSON.parse(localStorage.getItem(KEY)||'null');const m=new Map();for(const c of state?.characters||[]){const p=c?.profile,name=normalizeName(p?.name||c?.name);if(name)m.set(name,p||{})}return m}catch{return new Map()}}
  function icon(cls){try{return window.LostArkHideoutClassData?.iconUrl?.(cls)||''}catch{return ''}}
  function specFor(p){
    const cls=normalizeName(p?.class||p?.className||p?.characterClass||'');
    const t=normalizeName(textOf([p?.engravings,p?.arkGrid,p?.arkPassive,p?.skills,p?.tripods,p?.skillsText,p?.skillText,p?.tripodsText,p?.arkGridText,p?.arkPassiveText,p?.rawText]));
    if(['bard','artist','paladin','valkyrie'].includes(cls))return 'N/A';
    const rules={
      berserker:[['mayhem','Mayhem'],["berserker's technique",`Berserker's Technique`],['berserker technique',`Berserker's Technique`]],
      wardancer:[['first intention','First Intention'],['esoteric skill enhancement','Esoteric Skill Enhancement']],
      glaivier:[['pinnacle','Pinnacle'],['control','Control']],glavier:[['pinnacle','Pinnacle'],['control','Control']],
      scrapper:[['shock training','Shock Training'],['taijutsu','Taijutsu']],
      souleater:[['full moon harvester','Full Moon Harvester'],["night's edge",`Night's Edge`],['night edge',`Night's Edge`]],
      summoner:[['master summoner','Master Summoner'],['communication overflow','Communication Overflow']],
      sorceress:[['igniter','Igniter'],['reflux','Reflux']], arcanist:[['emperor','Emperor'],['empress','Empress']],arcana:[['emperor','Emperor'],['empress','Empress']],
      deathblade:[['surge','Surge'],['remaining energy','Remaining Energy']],reaper:[['hunger','Hunger'],['nightmare','Nightmare']],
      striker:[['deathblow','Deathblow'],['esoteric flurry','Esoteric Flurry']],gunslinger:[['peacemaker','Peacemaker'],['time to hunt','Time to Hunt']],
      deadeye:[['pistoleer','Pistoleer'],['enhanced weapon','Enhanced Weapon']],artillerist:[['barrage enhancement','Barrage Enhancement'],['firepower enhancement','Firepower Enhancement']],
      slayer:[['predator','Predator'],['punisher','Punisher']],breaker:[['asura','Asura'],["asura's path",`Asura's Path`],['brawl king storm','Brawl King Storm']],
      destroyer:[['gravity training','Gravity Training'],['rage hammer','Rage Hammer']],gunlancer:[['combat readiness','Combat Readiness'],['lone knight','Lone Knight']],
      soulfist:[['energy overflow','Energy Overflow'],['robust spirit','Robust Spirit']],sharpshooter:[['death strike','Death Strike'],['loyal companion','Loyal Companion']],
      aeromancer:[['wind fury','Wind Fury'],['drizzle','Drizzle']]
    };
    for(const [needle,label] of (rules[cls]||[]))if(t.includes(needle))return label;
    return '';
  }
  function displayClass(p){return specFor(p)||canonicalClass(p?.class||p?.className||p?.characterClass)}
  function ensureIcon(card,cls){const src=icon(cls);if(!src)return;let img=card.querySelector('img.class-icon');const link=card.querySelector('.party-character-link');if(!img){img=document.createElement('img');img.className='class-icon';img.loading='lazy'}img.src=src;img.removeAttribute('srcset');img.alt=cls;img.style.display='inline-block';img.style.width='22px';img.style.height='22px';img.style.objectFit='contain';img.style.verticalAlign='middle';img.style.marginRight='7px';img.style.flex='0 0 auto';if(link){link.style.display='inline-flex';link.style.alignItems='center';if(img.parentNode!==link)link.insertBefore(img,link.firstChild)}else if(img.parentNode!==card)card.insertBefore(img,card.firstChild)}
  function repair(){const ps=profiles();document.querySelectorAll('#roster .character').forEach(card=>{const name=normalizeName(card.querySelector('.character-bible-link')?.textContent),p=ps.get(name),base=canonicalClass(p?.class||p?.className||p?.characterClass);if(!base)return;card.querySelectorAll('.class').forEach(e=>e.textContent=displayClass(p));ensureIcon(card,base)});const icons=new Map();document.querySelectorAll('#roster .character').forEach(card=>{const name=normalizeName(card.querySelector('.character-bible-link')?.textContent),img=card.querySelector('img.class-icon');if(name&&img?.src)icons.set(name,img.src)});document.querySelectorAll('#suggestedParties .party-member').forEach(card=>{const name=normalizeName(card.querySelector('.party-character-link')?.textContent||''),img=card.querySelector('img.class-icon'),src=icons.get(name),p=ps.get(name),base=canonicalClass(p?.class||p?.className||p?.characterClass);if(img&&src){img.src=src;img.removeAttribute('srcset')}else if(!img&&base)ensureIcon(card,base);if(p)card.querySelectorAll('.class').forEach(e=>e.textContent=displayClass(p))})}
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
  const start=()=>{repair();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
