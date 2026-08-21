/* New Additions class/spec authority. Runs before candidate-roster-v1.js. */
(()=>{
  'use strict';

  const CONNECTOR='https://lostark-bible-connector.seraph0226.workers.dev/character';
  const NEW_KEY='lostark-hideout-new-additions-v1';
  // Bible's Valkyrie roster asset. Keep this as the class-wide fallback for every Valkyrie.
  const VALK_ICON='https://cms.poyoanon.fyi/assets/d3a00d6c-f439-4a8e-9a42-38f7367cc7f2.png?height=636&width=816';

  const SPECS=[
    ['full moon harvester','Full Moon Harvester'],
    ['night\'s edge',"Night's Edge"],['nights edge',"Night's Edge"],
    ['empress\'s grace',"Empress's Grace"],['empress grace',"Empress's Grace"],
    ['emperor\'s decree',"Emperor's Decree"],['emperor decree',"Emperor's Decree"],
    ['master summoner','Master Summoner'],['communication overflow','Communication Overflow'],
    ['lone knight','Lone Knight'],['combat readiness','Combat Readiness'],
    ['rage hammer','Rage Hammer'],['gravity training','Gravity Training'],
    ['mayhem','Mayhem'],['berserker\'s technique',"Berserker's Technique"],['berserkers technique',"Berserker's Technique"],
    ['predator','Predator'],['punisher','Punisher'],['igniter','Igniter'],['reflux','Reflux'],
    ['surge','Surge'],['remaining energy','Remaining Energy'],['peacemaker','Peacemaker'],['time to hunt','Time to Hunt'],
    ['death strike','Death Strike'],['loyal companion','Loyal Companion'],
    ['barrage enhancement','Barrage Enhancement'],['firepower enhancement','Firepower Enhancement'],
    ['enhanced weapon','Enhanced Weapon'],['pistoleer','Pistoleer'],
    ['demonic impulse','Demonic Impulse'],['perfect suppression','Perfect Suppression'],
    ['hunger','Hunger'],['pinnacle','Pinnacle'],['control','Control'],
    ['shock training','Shock Training'],['taijutsu','Taijutsu'],
    ['esoteric flurry','Esoteric Flurry'],['first intention','First Intention'],
    ['esoteric skill enhancement','Esoteric Skill Enhancement'],
    ['asura\'s path',"Asura's Path"],['asuras path',"Asura's Path"],['brawl king storm','Brawl King Storm'],
    ['deathblow','Deathblow'],['full bloom','Full Bloom'],['recurrence','Recurrence'],
    ['desperate salvation','Desperate Salvation'],['true courage','True Courage'],
    ['blessed aura','Blessed Aura'],['judgment','Judgment'],['liberator','Liberator'],['shining knight','Shining Knight']
  ];

  function decodeEntities(v){
    const s=String(v??'');
    try{return new DOMParser().parseFromString(s,'text/html').documentElement.textContent||s}catch{return s}
  }
  function normalized(v){return decodeEntities(v).toLowerCase().replace(/[’']/g,"'").replace(/\\s+/g,' ')}
  function textOf(v){try{return normalized(JSON.stringify(v))}catch{return normalized(v)}}
  function className(p){return String(p?.class||p?.className||'').trim()}

  function findSpec(text){
    const s=normalized(text);
    // Prefer the most specific multi-word class specialization names before short names such as Control.
    const ordered=[...SPECS].sort((a,b)=>b[0].length-a[0].length);
    for(const [needle,name] of ordered)if(s.includes(needle))return name;
    return '';
  }

  function buildProfileFor(c){
    try{
      return window.LostArkBuildProfilesAuthorityV1?.get?.(c.url)
        ||window.LostArkBuildProfilesV3?.get?.(c.url)
        ||window.LostArkBuildProfilesV2?.get?.(c.url)
        ||null;
    }catch{return null}
  }

  function specFromProfile(profile,c){
    const direct=profile?.spec||profile?.specialization||profile?.specName||profile?.buildSpec;
    if(direct)return String(direct);
    const b=c?buildProfileFor(c):null;
    const buildDirect=b?.spec||b?.specialization||b?.specName||b?.buildSpec;
    if(buildDirect)return String(buildDirect);
    const buildText=[b?.engravings,b?.arkPassive,b?.sections,b?.text,b?.raidText].map(textOf).join(' ');
    const profileText=textOf(profile);
    return findSpec(`${buildText} ${profileText}`);
  }

  function specFromHtml(html,profile){
    const spec=findSpec(html);
    if(spec)return spec;
    const cls=className(profile);
    const s=normalized(html);
    if(cls==='Artist')return /\brecurrence\b/i.test(s)?'Recurrence':'Full Bloom';
    if(cls==='Valkyrie')return /\bshining knight\b/i.test(s)?'Shining Knight':'Liberator';
    return '';
  }

  function iconFromHtml(html,profile){
    if(className(profile)!=='Valkyrie')return '';
    try{
      const d=new DOMParser().parseFromString(String(html||''),'text/html');
      const candidates=[...d.querySelectorAll('img[src],img[data-src],svg')];
      for(const el of candidates){
        const meta=[el.getAttribute?.('alt'),el.getAttribute?.('title'),el.getAttribute?.('aria-label'),el.getAttribute?.('data-class'),el.getAttribute?.('data-character-class')].filter(Boolean).join(' ');
        if(/valkyrie/i.test(meta)){
          const src=el.getAttribute?.('src')||el.getAttribute?.('data-src');
          if(src)return src;
          if(el.tagName?.toLowerCase()==='svg')return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(el.outerHTML)}`;
        }
      }
    }catch{}
    return '';
  }

  async function fetchPayload(url){
    try{
      const r=await fetch(`${CONNECTOR}?url=${encodeURIComponent(url)}`,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)return null;
      return await r.json();
    }catch{return null}
  }

  async function enrichExisting(){
    try{
      const list=JSON.parse(localStorage.getItem(NEW_KEY)||'[]');
      if(!Array.isArray(list)||!list.length)return;
      let changed=false;
      for(const c of list){
        if(!c?.profile)continue;
        const data=await fetchPayload(c.url);
        const html=data?.html||data?.characterHtml||data?.content||data?.page||'';
        const spec=specFromProfile(c.profile,c)||specFromHtml(html,c.profile);
        const icon=iconFromHtml(html,c.profile);
        if(spec&&c.profile.spec!==spec){c.profile.spec=spec;changed=true}
        if(className(c.profile)==='Valkyrie'){
          const nextIcon=icon||VALK_ICON;
          if(c.profile.classIcon!==nextIcon){c.profile.classIcon=nextIcon;changed=true}
        }
      }
      if(changed)localStorage.setItem(NEW_KEY,JSON.stringify(list));
      document.querySelectorAll('.new-addition-card[data-candidate-id]').forEach(card=>{
        const c=list.find(x=>x?.id===card.dataset.candidateId);
        if(!c?.profile)return;
        const spec=specFromProfile(c.profile,c);
        const label=card.querySelector('.class');
        if(label&&spec)label.textContent=spec;
        if(className(c.profile)==='Valkyrie'){
          const img=card.querySelector('img.class-icon');
          if(img){img.src=c.profile.classIcon||VALK_ICON;img.alt='Valkyrie'}
        }
      });
    }catch{}
  }

  window.NewAdditionsClassSpecAuthority={specFromProfile,specFromHtml,enrichExisting,VALK_ICON};

  const originalFetchCharacter=window.fetchCharacter;
  if(typeof originalFetchCharacter==='function'&&!window.__NewAdditionsSpecWrapped){
    window.__NewAdditionsSpecWrapped=true;
    window.fetchCharacter=async function(candidate){
      const profile=await originalFetchCharacter(candidate);
      if(!profile)return profile;
      const data=await fetchPayload(candidate.url);
      const html=data?.html||data?.characterHtml||data?.content||data?.page||'';
      const spec=specFromProfile(profile,candidate)||specFromHtml(html,profile);
      if(spec)profile.spec=spec;
      if(className(profile)==='Valkyrie')profile.classIcon=iconFromHtml(html,profile)||VALK_ICON;
      return profile;
    };
  }

  // Repair the already-stored New Additions once after the page has initialized.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enrichExisting,0),{once:true});
  else setTimeout(enrichExisting,0);
})();
