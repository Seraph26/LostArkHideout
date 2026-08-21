/* Class/spec identity display authority.
 *
 * The main Suggested Parties class/spec display remains authoritative.
 * New Addition / Comparison cards use the same stored class authority and
 * the same build-profile specialization rules used by the main-group spec
 * display. Manual/repository class icons always win over Fandom.
 *
 * DO NOT TOUCH optimization, scoring, hover, arrow, swap, or party behavior.
 */
(() => {
  'use strict';

  const NEW_KEYS = [
    'lostark-hideout-new-additions-v1',
    'lostark-hideout-private-v3',
    'lostark-hideout-private-v2'
  ];

  const MANUAL_ICONS = {
    valkyrie: () => new URL('valkyrie-icon.svg', document.baseURI).href,
    guardianknight: () => new URL('guardianknight-icon.svg', document.baseURI).href,
    wildsoul: () => 'https://static.wikia.nocookie.net/lostark_gamepedia/images/3/3b/ClassIcon-Specialist.png/revision/latest/scale-to-width-down/120?cb=20230901205506'
  };

  const CHARACTER_CLASS_CORRECTIONS = {
    kittyjam: 'Guardianknight',
    ryohaku: 'Glavier',
    bailsxo: 'Artist',
    diamarte: 'Souleater'
  };

  const norm = v => String(v ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'");

  const urlKey = value => {
    try { return new URL(value, location.href).href.replace(/\/$/, ''); }
    catch { return String(value || '').replace(/\/$/, ''); }
  };

  const canonical = value => {
    try { return window.LostArkHideoutClassData?.canonical?.(value) || value; }
    catch { return value; }
  };

  function manualIcon(value) {
    const key = norm(value).replace(/\s+/g, '');
    try { return MANUAL_ICONS[key]?.() || ''; } catch { return ''; }
  }

  function iconFor(value) {
    const manual = manualIcon(value);
    if (manual) return manual;
    try { return window.LostArkHideoutClassData?.iconUrl?.(value) || ''; }
    catch { return ''; }
  }

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }

  function storedCharacterMap() {
    const map = new Map();
    for (const key of NEW_KEYS) {
      const state = read(key, null);
      const list = Array.isArray(state?.characters) ? state.characters :
        (Array.isArray(state) ? state : []);
      for (const c of list) {
        const url = c?.url || c?.profile?.url;
        if (url) map.set(urlKey(url), c);
      }
    }
    return map;
  }

  /* Same specialization authority/rules used by build-spec-display-v1. */
  const itemText = x => typeof x === 'string'
    ? x
    : [x?.name, x?.title, x?.label, x?.engraving, x?.skill, x?.description, x?.text]
      .filter(Boolean).join(' ');

  function profileText(p) {
    return norm([
      p?.spec, p?.specialization, p?.specName, p?.buildSpec, p?.buildName,
      ...(p?.engravings || []).map(itemText),
      ...(p?.engravingNames || []).map(itemText),
      p?.engravingsText, p?.buildText, p?.raidLoadoutText, p?.skillsText,
      p?.skillText, p?.arkGridText, p?.arkPassiveText, p?.rawText,
      p?.text
    ].filter(Boolean).join(' '));
  }

  function buildCache() {
    return read('lostark-hideout-build-profiles-v3', {});
  }

  function buildProfileFor(character) {
    const url = character?.url || character?.profile?.url;
    const cache = buildCache();
    if (url) {
      const key = urlKey(url);
      if (cache[url]) return cache[url];
      if (cache[key]) return cache[key];
      for (const [k, v] of Object.entries(cache)) if (urlKey(k) === key) return v;
    }
    try {
      return window.LostArkBuildProfilesAuthorityV1?.get?.(url) ||
        window.LostArkBuildProfilesV3?.get?.(url) ||
        window.LostArkBuildProfilesV2?.get?.(url) || null;
    } catch { return null; }
  }

  function specialization(character) {
    const p = character?.profile || {};
    const b = buildProfileFor(character) || {};
    const explicit = p.spec || p.specialization || p.specName || p.buildSpec ||
      b.spec || b.specialization || b.specName || b.buildSpec;
    if (explicit && norm(explicit) !== '-') return String(explicit);

    const e = profileText({...b, ...p, engravings: b.engravings?.length ? b.engravings : p.engravings});
    const rules = [
      [/master summoner/,'Master Summoner'],[/communication overflow/,'Communication Overflow'],[/pinnacle/,'Pinnacle'],[/\bcontrol\b/,'Control'],[/mayhem/,'Mayhem'],
      [/berserker'?s technique|berserker technique/,"Berserker's Technique"],[/surge/,'Surge'],[/remaining energy/,'Remaining Energy'],[/igniter/,'Igniter'],[/reflux/,'Reflux'],
      [/hunger/,'Hunger'],[/full moon harvester/,'Full Moon Harvester'],[/night.?s edge/,"Night's Edge"],[/predator/,'Predator'],[/punisher/,'Punisher'],
      [/deathblow/,'Deathblow'],[/esoteric flurry/,'Esoteric Flurry'],[/first intention/,'First Intention'],[/esoteric skill enhancement/,'Esoteric Skill Enhancement'],
      [/asura.?s path/,"Asura's Path"],[/brawl king storm/,'Brawl King Storm'],[/peacemaker/,'Peacemaker'],[/time to hunt/,'Time to Hunt'],
      [/empress grace|grace of the empress/,'Grace of the Empress'],[/emperor'?s decree|emperor decree|order\s+of\s+the\s+emperor/,'Order of the Emperor'],
      [/barrage enhancement/,'Barrage Enhancement'],[/firepower enhancement/,'Firepower Enhancement'],[/enhanced weapon/,'Enhanced Weapon'],[/pistoleer/,'Pistoleer'],
      [/death strike/,'Death Strike'],[/loyal companion/,'Loyal Companion'],[/demonic impulse/,'Demonic Impulse'],[/perfect suppression/,'Perfect Suppression'],
      [/wind fury/,'Wind Fury'],[/drizzle/,'Drizzle'],[/full bloom/,'Full Bloom'],[/recurrence/,'Recurrence'],[/shock training/,'Shock Training'],
      [/taijutsu/,'Taijutsu'],[/desperate salvation/,'Desperate Salvation'],[/true courage/,'True Courage'],[/blessed aura/,'Blessed Aura'],[/judgment/,'Judgment'],
      [/liberator/,'Liberator'],[/shining knight/,'Shining Knight']
    ];
    for (const [re, name] of rules) if (re.test(e)) return name;

    const cls = canonical(CHARACTER_CLASS_CORRECTIONS[norm(p.name)] || p.className || p.class || b.className || '');
    const role = norm(p.role || b.role);
    if (cls === 'Artist') return /\brecurrence\b/i.test(e) ? 'Recurrence' : 'Full Bloom';
    if (cls === 'Valkyrie') return /\bshining knight\b/i.test(e) ? 'Shining Knight' : 'Liberator';
    if (role === 'support') return ({Paladin:'Blessed Aura', Bard:'Desperate Salvation'})[cls] || '';
    return '';
  }

  function authorityFor(character) {
    if (!character) return null;
    const p = character.profile || character;
    const name = norm(p.name || character.name);
    const cls = canonical(CHARACTER_CLASS_CORRECTIONS[name] || p.className || p.class || '');
    const spec = specialization(character);
    const icon = manualIcon(cls) || p.classIcon || iconFor(cls);
    return { className: cls, spec: spec === '-' ? '' : spec, icon };
  }

  function mainGroupAuthority() {
    const map = new Map();
    document.querySelectorAll('#suggestedParties a[href*="lostark.bible/character/"]').forEach(link => {
      const host = link.closest('.authoritative-member') || link.closest('.party-member') || link.parentElement;
      if (!host) return;
      const text = host.textContent || '';
      const icon = host.querySelector('img.class-icon');
      const specNode = host.querySelector('.party-class-label');
      const className = icon?.alt?.trim() ||
        host.querySelector('[data-character-class]')?.getAttribute('data-character-class') ||
        text.split('·')[0]?.trim() || '';
      const spec = specNode?.textContent?.trim() || '';
      if (className || spec || icon?.src) map.set(urlKey(link.href), { className: canonical(className), spec, icon: icon?.currentSrc || icon?.src || '' });
    });
    return map;
  }

  function applyToCard(root, authority) {
    if (!root || !authority) return;
    root.querySelectorAll('img.class-icon').forEach(img => {
      if (authority.icon) img.src = authority.icon;
      img.removeAttribute('srcset');
      if (authority.className) img.alt = authority.className;
    });
    if (authority.spec) {
      const label = root.querySelector('.class');
      if (label) label.textContent = authority.spec;
      root.querySelectorAll('[data-character-spec], .party-class-label, .spec').forEach(el => el.textContent = authority.spec);
    }
    if (authority.className) root.querySelectorAll('[data-character-class]').forEach(el => el.setAttribute('data-character-class', authority.className));
  }

  function apply() {
    const main = mainGroupAuthority();
    const stored = storedCharacterMap();
    document.querySelectorAll('.new-addition-card,.character-card,.comparison-card,.comparison-character,.character-comparison').forEach(root => {
      const link = root.querySelector('a[href*="lostark.bible/character/"]');
      if (!link) return;
      const key = urlKey(link.href);
      const authority = main.get(key) || authorityFor(stored.get(key));
      if (authority) applyToCard(root, authority);
    });
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(apply, 80); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('lostark-build-profiles-v3-ready', schedule);
})();
