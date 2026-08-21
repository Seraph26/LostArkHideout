/* Keep class identity/icon separate from the spec/build label shown to users.
 * This file only repairs roster/party identity display. Do not touch hover,
 * arrow, optimization, scoring, or swap behavior here.
 *
 * IMPORTANT: the live app stores the main roster under v3. Keep the legacy
 * keys as compatibility fallbacks, but v3 is the current authoritative roster.
 */
(() => {
  'use strict';
  const KEYS = ['lostark-hideout-private-v3', 'lostark-hideout-private-v2', 'lostark-hideout-new-additions-v1'];
  const data = () => window.LostArkHideoutClassData;
  const norm = v => String(v ?? '').normalize('NFKC').trim().toLowerCase();
  const canonical = cls => { try { return data()?.canonical?.(cls) || cls; } catch { return cls; } };
  const iconFor = cls => {
    try {
      return data()?.iconUrl?.(cls) ||
        (norm(cls)==='guardianknight' ? data()?.iconUrl?.('Guardian Knight') : '') || '';
    } catch { return ''; }
  };

  /* Static spec -> class mapping supplied for the roster. */
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
    'Grace of the Empress':'Arcanist', 'Empress Grace':'Arcanist',
    'Order of the Emperor':'Arcanist', "Emperor's Decree":'Arcanist',
    Recurrence:'Arcanist',
    'Wind Fury':'Aeromancer', Drizzle:'Aeromancer',
    Ferality:'Wildsoul', 'Phantom Beast Awakening':'Wildsoul',
    Liberator:'Valkyrie', 'Shining Knight':'Valkyrie'
  };
  const ENGRAVINGS = Object.keys(SPEC_TO_CLASS);

  function authority(c) {
    try {
      const url = c?.url || c?.profile?.url;
      const direct = window.LostArkBuildProfilesAuthorityV1?.get?.(url) ||
                     window.LostArkBuildProfilesV3?.get?.(url) ||
                     window.LostArkBuildProfilesV2?.get?.(url);
      if (direct) return direct;
      try {
        const cache = JSON.parse(localStorage.getItem('lostark-hideout-build-profiles-v3') || '{}');
        return cache[url] || {};
      } catch { return {}; }
    } catch { return {}; }
  }

  function corpus(...values) {
    const out=[];
    const walk=(v,d=0)=>{
      if(v==null||d>12)return;
      if(typeof v==='string'){out.push(v);return;}
      if(Array.isArray(v)){v.forEach(x=>walk(x,d+1));return;}
      if(typeof v==='object')Object.entries(v).forEach(([k,x])=>{out.push(k);walk(x,d+1);});
    };
    values.forEach(v=>walk(v));
    return norm(out.join(' '));
  }

  function authoritativeSpec(c) {
    const p=c?.profile||{}, b=authority(c);
    const explicit=[
      b.spec,b.specName,b.specialization,b.specializationName,
      b.buildSpec,b.buildName,b.build?.spec,b.build?.specName,b.build?.name,
      p.spec,p.specName,p.specialization,p.specializationName,
      p.buildSpec,p.buildName,p.build?.spec,p.build?.specName
    ].find(v=>String(v||'').trim() && norm(v)!=='-');
    if(explicit)return String(explicit).trim();
    const engravingValues=[];
    for(const source of [b.engravings,b.engravingNames,b.engravingData,p.engravings,p.engravingNames]){
      if(Array.isArray(source))for(const x of source){
        const value=typeof x==='string'?x:(x?.name||x?.title||x?.label||x?.engraving||'');
        if(value)engravingValues.push(value);
      }
    }
    for(const value of engravingValues){
      const found=ENGRAVINGS.find(e=>norm(e)===norm(value));
      if(found)return found;
    }
    const text=corpus(b,b.engravings,b.engraving,b.engravingData,b.build,b.text,
      b.raidText,b.raidLines,b.sections,b.rawText,p,p.engravings,p.engraving,
      p.engravingData,p.loadout,p.loadoutText,p.buildText,p.rawText);
    for(const e of ENGRAVINGS) if(text.includes(norm(e))) return e;
    return '';
  }

  function authoritativeClass(c, spec) {
    const p=c?.profile||{}, b=authority(c);
    if(spec) {
      const mapped=ENGRAVINGS.find(e=>norm(e)===norm(spec));
      if(mapped) return canonical(SPEC_TO_CLASS[mapped]);
    }
    const buildClass=b.className||b.class||b.characterClass;
    if(buildClass && norm(buildClass)!=='unknown' && norm(buildClass)!=='-') return canonical(buildClass);
    const text=corpus(b,b.engravings,b.engraving,b.engravingData,b.build,b.text,
      b.raidText,b.raidLines,b.sections,b.rawText,p,p.engravings,p.engraving,
      p.engravingData,p.loadout,p.loadoutText,p.buildText,p.rawText);
    for(const e of ENGRAVINGS) if(text.includes(norm(e))) return canonical(SPEC_TO_CLASS[e]);
    if(p.className && norm(p.className)!=='unknown' && norm(p.className)!=='-') return canonical(p.className);
    if(p.class && norm(p.class)!=='unknown' && norm(p.class)!=='-') return canonical(p.class);
    return 'Unknown';
  }

  function readState(key) { try { return JSON.parse(localStorage.getItem(key)||'null'); } catch { return null; } }

  function applyStored() {
    for(const key of KEYS){
      const state=readState(key); if(!state)continue;
      const list=Array.isArray(state?.characters) ? state.characters : (Array.isArray(state) ? state : null);
      if(!list)continue;
      for(const c of list){
        const p=c?.profile;if(!p)continue;
        const spec=authoritativeSpec(c), cls=authoritativeClass(c,spec), icon=iconFor(cls);
        if(spec && p.spec!==spec)p.spec=spec;
        if(cls!=='Unknown' && p.class!==cls)p.class=cls;
        if(icon && p.classIcon!==icon)p.classIcon=icon;
      }
      localStorage.setItem(key,JSON.stringify(state));
    }
  }

  function updateVisibleDom(){
    const byUrl=new Map();
    for(const key of KEYS){
      const state=readState(key);
      const list=Array.isArray(state?.characters)?state.characters:(Array.isArray(state)?state:[]);
      for(const c of list)byUrl.set(String(c.url||'').toLowerCase().replace(/\/$/,''),c);
    }
    document.querySelectorAll('a.character-bible-link[href],a.party-character-link[href]').forEach(link=>{
      const c=byUrl.get(String(link.href||'').toLowerCase().replace(/\/$/,''));if(!c?.profile)return;
      const spec=authoritativeSpec(c),cls=authoritativeClass(c,spec),display=spec||cls,icon=iconFor(cls)||c.profile.classIcon||'';
      const root=link.closest('article.character,.slot,.party,.party-card,.authoritative-party,.authoritative-member')||link.parentElement;if(!root)return;
      root.querySelectorAll('img.class-icon').forEach(img=>{if(icon)img.src=icon;img.removeAttribute('srcset');img.alt=cls;});
      root.querySelectorAll('.class,.spec,[data-character-spec]').forEach(el=>el.textContent=display);
    });
  }

  function run(){ applyStored(); updateVisibleDom(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250),{once:true}); else setTimeout(run,250);
  window.addEventListener('lostark-build-profiles-v3-ready',()=>setTimeout(run,100));
  const observer=new MutationObserver(()=>setTimeout(updateVisibleDom,50));
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
