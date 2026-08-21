/* Keep class identity/icon separate from the spec/build label shown to users.
 * This file only repairs roster/party identity display. Do not touch hover,
 * arrow, optimization, scoring, or swap behavior here.
 *
 * The main roster already has a working v3 build-profile/spec resolver.
 * New Addition and comparison cards must consume that same authority instead
 * of independently scraping/parsing Bible class text.
 */
(() => {
  'use strict';
  const KEYS = ['lostark-hideout-private-v3', 'lostark-hideout-private-v2', 'lostark-hideout-new-additions-v1'];
  const data = () => window.LostArkHideoutClassData;
  const norm = v => String(v ?? '').normalize('NFKC').trim().toLowerCase().replace(/[’']/g, "'");
  const canonical = cls => { try { return data()?.canonical?.(cls) || cls; } catch { return cls; } };
  const iconFor = cls => {
    try {
      return data()?.iconUrl?.(cls) ||
        (norm(cls) === 'guardianknight' ? data()?.iconUrl?.('Guardian Knight') : '') || '';
    } catch { return ''; }
  };

  const SPEC_TO_CLASS = {
    'Brawl King Storm':'Breaker', "Asura's Path":'Breaker',
    "Berserker's Technique":'Berserker', Mayhem:'Berserker',
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

  const CHARACTER_CLASS_CORRECTIONS = {
    kittyjam:'Guardianknight',
    ryohaku:'Glavier',
    bailsxo:'Artist',
    diamarte:'Souleater'
  };

  function loadBuildCache() {
    try { return JSON.parse(localStorage.getItem('lostark-hideout-build-profiles-v3') || '{}'); }
    catch { return {}; }
  }

  function normalizeUrl(x) {
    try { return new URL(x, location.href).href.replace(/\/$/, ''); }
    catch { return String(x || '').replace(/\/$/, ''); }
  }

  function authority(c) {
    try {
      const url = c?.url || c?.profile?.url;
      return window.LostArkBuildProfilesAuthorityV1?.get?.(url) ||
             window.LostArkBuildProfilesV3?.get?.(url) ||
             window.LostArkBuildProfilesV2?.get?.(url) ||
             loadBuildCache()[url] || loadBuildCache()[normalizeUrl(url)] || {};
    } catch { return {}; }
  }

  function itemText(x) {
    return typeof x === 'string' ? x : [x?.name,x?.title,x?.label,x?.engraving,x?.skill,x?.description,x?.text].filter(Boolean).join(' ');
  }

  /* This is intentionally the same resolution strategy used by the main
   * Suggested Parties spec display: inspect the v3 build-profile cache first,
   * then resolve the specialization from its engraving/build text. */
  function specForProfile(p) {
    const text = norm([
      p?.spec,p?.specialization,p?.specName,p?.buildSpec,p?.buildName,
      ...(p?.engravings || []).map(itemText), ...(p?.engravingNames || []).map(itemText),
      p?.engravingsText,p?.buildText,p?.raidLoadoutText,p?.skillsText,p?.skillText,
      p?.arkGridText,p?.arkPassiveText,p?.rawText
    ].filter(Boolean).join(' '));

    const rules = [
      [/master summoner/,'Master Summoner'],[/communication overflow/,'Communication Overflow'],
      [/pinnacle/,'Pinnacle'],[/control/,'Control'],[/mayhem/,'Mayhem'],
      [/berserker'?s technique|berserker technique/,"Berserker's Technique"],
      [/surge/,'Surge'],[/remaining energy/,'Remaining Energy'],[/igniter/,'Igniter'],[/reflux/,'Reflux'],
      [/hunger/,'Hunger'],[/full moon harvester/,'Full Moon Harvester'],[/night.?s edge/,"Night's Edge"],
      [/predator/,'Predator'],[/punisher/,'Punisher'],[/deathblow/,'Deathblow'],
      [/esoteric flurry/,'Esoteric Flurry'],[/first intention/,'First Intention'],
      [/esoteric skill enhancement/,'Esoteric Skill Enhancement'],[/asura.?s path/,"Asura's Path"],
      [/brawl king storm/,'Brawl King Storm'],[/peacemaker/,'Peacemaker'],[/time to hunt/,'Time to Hunt'],
      [/empress grace/,'Empress Grace'],[/emperor'?s decree|emperor/,"Emperor's Decree"],
      [/barrage enhancement/,'Barrage Enhancement'],[/firepower enhancement/,'Firepower Enhancement'],
      [/enhanced weapon/,'Enhanced Weapon'],[/pistoleer/,'Pistoleer'],[/death strike/,'Death Strike'],
      [/loyal companion/,'Loyal Companion'],[/demonic impulse/,'Demonic Impulse'],[/perfect suppression/,'Perfect Suppression'],
      [/wind fury/,'Wind Fury'],[/drizzle/,'Drizzle'],[/full bloom/,'Full Bloom'],[/recurrence/,'Recurrence'],
      [/shock training/,'Shock Training'],[/taijutsu/,'Ultimate Skill: Taijutsu'],
      [/desperate salvation/,'Desperate Salvation'],[/true courage/,'True Courage'],
      [/ferality/,'Ferality'],[/phantom beast awakening/,'Phantom Beast Awakening'],
      [/liberator/,'Liberator'],[/shining knight/,'Shining Knight']
    ];
    for (const [re,name] of rules) if (re.test(text)) return name;
    return p?.spec || p?.specialization || '';
  }

  function profileForCharacter(c) {
    const cache = loadBuildCache();
    const url = c?.url || c?.profile?.url || '';
    return cache[url] || cache[normalizeUrl(url)] || authority(c) || {};
  }

  function authoritativeSpec(c) {
    const p = c?.profile || {};
    const b = profileForCharacter(c);
    const direct = b?.spec || b?.specName || b?.specialization || b?.specializationName ||
      b?.buildSpec || b?.buildName || b?.build?.spec || b?.build?.specName;
    if (direct && norm(direct) !== '-') return String(direct).trim();
    const spec = specForProfile(b);
    if (spec && norm(spec) !== '-') return String(spec).trim();
    return specForProfile(p);
  }

  function authoritativeClass(c, spec) {
    const name = norm(c?.profile?.name || c?.name || '');
    if (CHARACTER_CLASS_CORRECTIONS[name]) return canonical(CHARACTER_CLASS_CORRECTIONS[name]);
    if (spec && SPEC_TO_CLASS[spec]) return canonical(SPEC_TO_CLASS[spec]);
    const b = profileForCharacter(c);
    const buildClass = b?.className || b?.class || b?.characterClass;
    if (buildClass && norm(buildClass) !== 'unknown' && norm(buildClass) !== '-') return canonical(buildClass);
    const p = c?.profile || {};
    if (p.className && norm(p.className) !== 'unknown' && norm(p.className) !== '-') return canonical(p.className);
    if (p.class && norm(p.class) !== 'unknown' && norm(p.class) !== '-') return canonical(p.class);
    return 'Unknown';
  }

  function readState(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }

  function applyStored() {
    for (const key of KEYS) {
      const state = readState(key);
      const list = Array.isArray(state?.characters) ? state.characters : (Array.isArray(state) ? state : null);
      if (!list) continue;
      for (const c of list) {
        const p = c?.profile;
        if (!p) continue;
        const spec = authoritativeSpec(c);
        const cls = authoritativeClass(c, spec);
        const icon = iconFor(cls) || p.classIcon || '';
        if (spec && p.spec !== spec) p.spec = spec;
        if (cls !== 'Unknown' && p.class !== cls) p.class = cls;
        if (icon && p.classIcon !== icon) p.classIcon = icon;
      }
      localStorage.setItem(key, JSON.stringify(state));
    }
  }

  function updateVisibleDom() {
    const byUrl = new Map();
    for (const key of KEYS) {
      const state = readState(key);
      const list = Array.isArray(state?.characters) ? state.characters : (Array.isArray(state) ? state : []);
      for (const c of list) byUrl.set(normalizeUrl(c.url || c.profile?.url || ''), c);
    }
    document.querySelectorAll('a.character-bible-link[href],a.party-character-link[href]').forEach(link => {
      const c = byUrl.get(normalizeUrl(link.href));
      if (!c?.profile) return;
      const spec = authoritativeSpec(c);
      const cls = authoritativeClass(c, spec);
      const display = spec || cls;
      const icon = c.profile.classIcon || iconFor(cls) || '';
      const root = link.closest('article.character,.slot,.party,.party-card,.authoritative-party,.authoritative-member,.party-member') || link.parentElement;
      if (!root) return;
      root.querySelectorAll('img.class-icon').forEach(img => {
        if (icon && img.getAttribute('src') !== icon) img.src = icon;
        img.removeAttribute('srcset');
        img.alt = cls;
      });
      root.querySelectorAll('.class,.spec,[data-character-spec],.party-class-label').forEach(el => {
        if (display && el.textContent !== display) el.textContent = display;
      });
    });
  }

  function run() { applyStored(); updateVisibleDom(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(run, 80), { once: true });
  else setTimeout(run, 80);
  window.addEventListener('lostark-build-profiles-v3-ready', () => setTimeout(run, 80));
})();
