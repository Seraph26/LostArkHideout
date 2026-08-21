/* Keep class identity/icon separate from the spec/build label shown to users.
 * This file only repairs roster/party identity display. Do not touch hover,
 * arrow, optimization, scoring, or swap behavior here.
 */
(() => {
  const KEY = 'lostark-hideout-private-v3';
  const data = () => window.LostArkHideoutClassData;
  const iconFor = cls => { try { return data()?.iconUrl?.(cls) || ''; } catch { return ''; } };
  const canonical = cls => { try { return data()?.canonical?.(cls) || cls; } catch { return cls; } };
  const norm = v => String(v ?? '').normalize('NFKC').trim().toLowerCase();

  const SPEC_ENGRAVINGS = [
    ['Brawl King Storm', 'Brawl King Storm'], ["Asura's Path", "Asura's Path"],
    ['Berserker Technique', 'Berserker Technique'], ['Mayhem', 'Mayhem'],
    ['Gravity Training', 'Gravity Training'], ['Rage Hammer', 'Rage Hammer'],
    ['Lone Knight', 'Lone Knight'], ['Combat Readiness', 'Combat Readiness'],
    ['Judgment', 'Judgment'], ['Blessed Aura', 'Blessed Aura'],
    ['Punisher', 'Punisher'], ['Predator', 'Predator'],
    ['Igniter', 'Igniter'], ['Reflux', 'Reflux'],
    ['Master Summoner', 'Master Summoner'], ['Communication Overflow', 'Communication Overflow'],
    ['True Courage', 'True Courage'], ['Desperate Salvation', 'Desperate Salvation'],
    ['Peacemaker', 'Peacemaker'], ['Time to Hunt', 'Time to Hunt'],
    ['Enhanced Weapon', 'Enhanced Weapon'], ['Pistoleer', 'Pistoleer'],
    ['Loyal Companion', 'Loyal Companion'], ['Death Strike', 'Death Strike'],
    ['Barrage Enhancement', 'Barrage Enhancement'], ['Firepower Enhancement', 'Firepower Enhancement'],
    ['Evolutionary Legacy', 'Evolutionary Legacy'], ['Arthetinean Skill', 'Arthetinean Skill'],
    ['Esoteric Flurry', 'Esoteric Flurry'], ['Deathblow', 'Deathblow'],
    ['Esoteric Skill Enhancement', 'Esoteric Skill Enhancement'], ['First Intention', 'First Intention'],
    ['Shock Training', 'Shock Training'], ['Ultimate Skill: Taijutsu', 'Ultimate Skill: Taijutsu'],
    ['Robust Spirit', 'Robust Spirit'], ['Energy Overflow', 'Energy Overflow'],
    ['Pinnacle', 'Pinnacle'], ['Control', 'Control'],
    ['Remaining Energy', 'Remaining Energy'], ['Surge', 'Surge'],
    ['Demonic Impulse', 'Demonic Impulse'], ['Perfect Suppression', 'Perfect Suppression'],
    ['Hunger', 'Hunger'], ['Lunar Voice', 'Lunar Voice'],
    ['Full Moon Harvester', 'Full Moon Harvester'], ["Night's Edge", "Night's Edge"],
    ['Recurrence', 'Recurrence'], ['Wind Fury', 'Wind Fury'], ['Drizzle', 'Drizzle'],
    ['Ferality', 'Ferality'], ['Phantom Beast Awakening', 'Phantom Beast Awakening'],
    ['Hellfire Successor', 'Hellfire Successor'], ['Dreadful Roar', 'Dreadful Roar']
  ];

  const CLASS_ENGRAVINGS = new Map(SPEC_ENGRAVINGS.map(([e]) => [norm(e), null]));
  [
    ['Brawl King Storm','Breaker'], ["Asura's Path",'Breaker'], ['Berserker Technique','Berserker'], ['Mayhem','Berserker'],
    ['Gravity Training','Destroyer'], ['Rage Hammer','Destroyer'], ['Lone Knight','Gunlancer'], ['Combat Readiness','Gunlancer'],
    ['Judgment','Paladin'], ['Blessed Aura','Paladin'], ['Punisher','Slayer'], ['Predator','Slayer'],
    ['Igniter','Sorceress'], ['Reflux','Sorceress'], ['Master Summoner','Summoner'], ['Communication Overflow','Summoner'],
    ['True Courage','Bard'], ['Desperate Salvation','Bard'], ['Peacemaker','Gunslinger'], ['Time to Hunt','Gunslinger'],
    ['Enhanced Weapon','Deadeye'], ['Pistoleer','Deadeye'], ['Loyal Companion','Sharpshooter'], ['Death Strike','Sharpshooter'],
    ['Barrage Enhancement','Artillerist'], ['Firepower Enhancement','Artillerist'], ['Evolutionary Legacy','Machinist'], ['Arthetinean Skill','Machinist'],
    ['Esoteric Flurry','Striker'], ['Deathblow','Striker'], ['Esoteric Skill Enhancement','Wardancer'], ['First Intention','Wardancer'],
    ['Shock Training','Scrapper'], ['Ultimate Skill: Taijutsu','Scrapper'], ['Robust Spirit','Soulfist'], ['Energy Overflow','Soulfist'],
    ['Pinnacle','Glavier'], ['Control','Glavier'], ['Remaining Energy','Deathblade'], ['Surge','Deathblade'],
    ['Demonic Impulse','Shadowhunter'], ['Perfect Suppression','Shadowhunter'], ['Hunger','Reaper'], ['Lunar Voice','Reaper'],
    ['Full Moon Harvester','Souleater'], ["Night's Edge",'Souleater'], ['Recurrence','Arcanist'],
    ['Wind Fury','Aeromancer'], ['Drizzle','Aeromancer'], ['Ferality','Wildsoul'], ['Phantom Beast Awakening','Wildsoul'],
    ['Hellfire Successor','Valkyrie'], ['Dreadful Roar','Valkyrie']
  ].forEach(([e,c]) => CLASS_ENGRAVINGS.set(norm(e), c));

  function corpus(p) {
    const out=[];
    const walk=(v,d=0)=>{
      if(v==null||d>5)return;
      if(typeof v==='string'){out.push(v);return;}
      if(Array.isArray(v)){v.forEach(x=>walk(x,d+1));return;}
      if(typeof v==='object')Object.entries(v).forEach(([k,x])=>{out.push(k);walk(x,d+1)});
    };
    walk(p); return norm(out.join(' '));
  }

  const characterSpec = c => {
    const p=c?.profile||{};
    const explicit=[p.spec,p.specialization,p.specName,p.buildSpec,p.build?.spec,p.build?.specName]
      .find(v=>String(v||'').trim());
    if(explicit)return String(explicit).trim();
    const text=corpus(p);
    for(const [engraving,spec] of SPEC_ENGRAVINGS)if(text.includes(norm(engraving)))return spec;
    const name=norm(p.name||c?.name);
    if(name==='hismistress')return 'Liberator';
    return '';
  };

  const characterClass = c => {
    const p=c?.profile||{};
    const explicit=p.className||p.class;
    if(explicit&&norm(explicit)!=='unknown')return canonical(explicit);
    const text=corpus(p);
    for(const [engraving,cls] of CLASS_ENGRAVINGS)if(cls&&text.includes(engraving))return canonical(cls);
    const name=norm(p.name||c?.name),url=String(c?.url||'').toLowerCase();
    if(name==='diamarte'||/\/diamarte(?:\/|$)/i.test(url))return 'Souleater';
    return canonical(explicit)||'Unknown';
  };

  function apply(){
    try{
      const state=JSON.parse(localStorage.getItem(KEY)||'null'); if(!state?.characters)return;
      let changed=false;
      for(const c of state.characters){
        const p=c?.profile;if(!p)continue;
        const cls=characterClass(c),spec=characterSpec(c),icon=iconFor(cls);
        if(cls&&cls!=='Unknown'&&p.class!==cls){p.class=cls;changed=true;}
        if(spec&&p.spec!==spec){p.spec=spec;changed=true;}
        if(icon&&p.classIcon!==icon){p.classIcon=icon;changed=true;}
      }
      if(changed)localStorage.setItem(KEY,JSON.stringify(state));
    }catch{}
  }

  function updateVisibleDom(){
    try{
      const state=JSON.parse(localStorage.getItem(KEY)||'null');if(!state?.characters)return;
      const byUrl=new Map(state.characters.map(c=>[String(c.url||'').toLowerCase().replace(/\/$/,''),c]));
      document.querySelectorAll('a.character-bible-link[href],a.party-character-link[href]').forEach(link=>{
        const c=byUrl.get(String(link.href||'').toLowerCase().replace(/\/$/,''));if(!c?.profile)return;
        const cls=characterClass(c),spec=characterSpec(c),display=spec||cls,icon=iconFor(cls)||c.profile.classIcon||'';
        const root=link.closest('article.character,.slot,.party,.party-card,.authoritative-party,.authoritative-member')||link.parentElement;if(!root)return;
        root.querySelectorAll('img.class-icon').forEach(img=>{if(icon)img.src=icon;img.alt=cls;});
        root.querySelectorAll('.class,.spec,[data-character-spec]').forEach(el=>el.textContent=display);
        root.querySelectorAll('small').forEach(el=>{const t=String(el.textContent||'');if(/·\s*iLvl\s/i.test(t))el.textContent=`${display} · ${t.replace(/^[^·]+·\s*/i,'')}`;});
        const main=root.querySelector('.party-member-main');if(main){const spans=main.querySelectorAll(':scope > span');if(spans.length)spans[0].textContent=String(spans[0].textContent||'').replace(/^[^·]+/,display);}
      });
    }catch{}
  }

  const run=()=>{apply();updateVisibleDom();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250),{once:true});else setTimeout(run,250);
  const observer=new MutationObserver(()=>setTimeout(updateVisibleDom,50));observer.observe(document.documentElement,{subtree:true,childList:true});
})();
