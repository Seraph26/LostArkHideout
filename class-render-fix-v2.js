/* Keep class identity/icon separate from the spec/build label shown to users.
 * This file only repairs roster/party identity display. Do not touch hover,
 * arrow, optimization, scoring, or swap behavior here.
 */
(() => {
  'use strict';
  const KEY = 'lostark-hideout-private-v3';
  const data = () => window.LostArkHideoutClassData;
  const norm = v => String(v ?? '').normalize('NFKC').trim().toLowerCase();
  const canonical = cls => { try { return data()?.canonical?.(cls) || cls; } catch { return cls; } };
  const iconFor = cls => { try { return data()?.iconUrl?.(cls) || ''; } catch { return ''; } };

  const SPEC_TO_CLASS = {
    'Brawl King Storm':'Breaker', "Asura's Path":'Breaker',
    'Berserker Technique':'Berserker', Mayhem:'Berserker',
    'Gravity Training':'Destroyer', 'Rage Hammer':'Destroyer',
    'Lone Knight':'Gunlancer', 'Combat Readiness':'Gunlancer',
    Judgment:'Paladin', 'Blessed Aura':'Paladin',
    Punisher:'Slayer', Predator:'Slayer',
    Igniter:'Sorceress', Reflux:'Sorceress',
    'Master Summoner':'Summoner', 'Communication Overflow':'Summoner',
    'True Courage':'Bard', 'Desperate Salvation':'Bard',
    Peacemaker:'Gunslinger', 'Time to Hunt':'Gunslinger',
    'Enhanced Weapon':'Deadeye', Pistoleer:'Deadeye',
    'Loyal Companion':'Sharpshooter', 'Death Strike':'Sharpshooter',
    'Barrage Enhancement':'Artillerist', 'Firepower Enhancement':'Artillerist',
    'Evolutionary Legacy':'Machinist', 'Arthetinean Skill':'Machinist',
    'Esoteric Flurry':'Striker', Deathblow:'Striker',
    'Esoteric Skill Enhancement':'Wardancer', 'First Intention':'Wardancer',
    'Shock Training':'Scrapper', 'Ultimate Skill: Taijutsu':'Scrapper',
    'Robust Spirit':'Soulfist', 'Energy Overflow':'Soulfist',
    Pinnacle:'Glavier', Control:'Glavier',
    'Remaining Energy':'Deathblade', Surge:'Deathblade',
    'Demonic Impulse':'Shadowhunter', 'Perfect Suppression':'Shadowhunter',
    Hunger:'Reaper', 'Lunar Voice':'Reaper',
    'Full Moon Harvester':'Souleater', "Night's Edge":'Souleater',
    Recurrence:'Arcanist', 'Wind Fury':'Aeromancer', Drizzle:'Aeromancer',
    Ferality:'Wildsoul', 'Phantom Beast Awakening':'Wildsoul',
    'Hellfire Successor':'Valkyrie', 'Dreadful Roar':'Valkyrie'
  };
  const ENGRAVINGS = Object.keys(SPEC_TO_CLASS);

  function authority(c) {
    try {
      const url = c?.url || c?.profile?.url;
      return window.LostArkBuildProfilesAuthorityV1?.get?.(url) ||
             window.LostArkBuildProfilesV3?.get?.(url) || {};
    } catch { return {}; }
  }

  function corpus(...values) {
    const out=[];
    const walk=(v,d=0)=>{
      if(v==null||d>7)return;
      if(typeof v==='string'){out.push(v);return;}
      if(Array.isArray(v)){v.forEach(x=>walk(x,d+1));return;}
      if(typeof v==='object')Object.entries(v).forEach(([k,x])=>{out.push(k);walk(x,d+1);});
    };
    values.forEach(v=>walk(v));
    return norm(out.join(' '));
  }

  function authoritativeSpec(c) {
    const p=c?.profile||{}, b=authority(c);
    const explicit=[b.spec,b.specName,b.specialization,b.specializationName,p.spec,p.specName,
      b.buildSpec,b.build?.spec,b.build?.specName].find(v=>String(v||'').trim());
    if(explicit)return String(explicit).trim();
    const text=corpus(b,b.engravings,b.text,p);
    for(const e of ENGRAVINGS) if(text.includes(norm(e))) return e;
    const name=norm(p.name||c?.name);
    if(name==='hismistress')return 'Liberator';
    return '';
  }

  function authoritativeClass(c, spec) {
    const p=c?.profile||{}, b=authority(c);
    // The authoritative Bible build class must beat stale/incorrect stored class.
    const buildClass=b.className||b.class||b.characterClass;
    if(buildClass && norm(buildClass)!=='unknown') return canonical(buildClass);
    if(spec && SPEC_TO_CLASS[spec]) return canonical(SPEC_TO_CLASS[spec]);
    const text=corpus(b,b.engravings,b.text,p);
    for(const e of ENGRAVINGS) if(text.includes(norm(e))) return canonical(SPEC_TO_CLASS[e]);
    // Explicit stored class is only a fallback when authoritative data is absent.
    if(p.className && norm(p.className)!=='unknown') return canonical(p.className);
    if(p.class && norm(p.class)!=='unknown') return canonical(p.class);
    const name=norm(p.name||c?.name),url=String(c?.url||'').toLowerCase();
    if(name==='diamarte'||/\/diamarte(?:\/|$)/.test(url)) return 'Souleater';
    return 'Unknown';
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY)||'null'); } catch { return null; }
  }

  function applyStored() {
    const state=readState();
    if(!state?.characters)return false;
    let changed=false;
    for(const c of state.characters){
      const p=c?.profile;if(!p)continue;
      const spec=authoritativeSpec(c), cls=authoritativeClass(c,spec), icon=iconFor(cls);
      if(spec && p.spec!==spec){p.spec=spec;changed=true;}
      if(cls!=='Unknown' && p.class!==cls){p.class=cls;changed=true;}
      if(icon && p.classIcon!==icon){p.classIcon=icon;changed=true;}
    }
    if(changed)localStorage.setItem(KEY,JSON.stringify(state));
    return changed;
  }

  function updateVisibleDom(){
    const state=readState();if(!state?.characters)return;
    const byUrl=new Map(state.characters.map(c=>[String(c.url||'').toLowerCase().replace(/\/$/,'') ,c]));
    document.querySelectorAll('a.character-bible-link[href],a.party-character-link[href]').forEach(link=>{
      const c=byUrl.get(String(link.href||'').toLowerCase().replace(/\/$/,''));if(!c?.profile)return;
      const spec=authoritativeSpec(c),cls=authoritativeClass(c,spec),display=spec||cls,icon=iconFor(cls)||c.profile.classIcon||'';
      const root=link.closest('article.character,.slot,.party,.party-card,.authoritative-party,.authoritative-member')||link.parentElement;if(!root)return;
      root.querySelectorAll('img.class-icon').forEach(img=>{if(icon)img.src=icon;img.alt=cls;});
      root.querySelectorAll('.class,.spec,[data-character-spec]').forEach(el=>el.textContent=display);
      root.querySelectorAll('small').forEach(el=>{const t=String(el.textContent||'');if(/·\s*iLvl\s/i.test(t))el.textContent=`${display} · ${t.replace(/^[^·]+·\s*/i,'')}`;});
      const main=root.querySelector('.party-member-main');
      if(main){const spans=main.querySelectorAll(':scope > span');if(spans.length)spans[0].textContent=String(spans[0].textContent||'').replace(/^[^·]+/,display);}
    });
  }

  function run(){
    const changed=applyStored();
    // The app renders New Addition cards from its in-memory state. Reload once
    // when the persisted identity/spec has actually changed so those cards use
    // the corrected values. No optimizer/hover/arrow code is involved.
    if(changed && !sessionStorage.getItem('lostark-hideout-class-render-v2-reload')){
      sessionStorage.setItem('lostark-hideout-class-render-v2-reload','1');
      window.location.reload();
      return;
    }
    updateVisibleDom();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250),{once:true});
  else setTimeout(run,250);
  window.addEventListener('lostark-build-profiles-v3-ready',()=>setTimeout(run,100));
  const observer=new MutationObserver(()=>setTimeout(updateVisibleDom,50));
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();