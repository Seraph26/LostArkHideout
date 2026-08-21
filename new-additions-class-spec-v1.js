/* New Additions class/spec authority. Runs before candidate-roster-v1.js. */
(() => {
  'use strict';

  const CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';
  const NEW_KEY = 'lostark-hideout-new-additions-v1';
  const VALK_ICON = 'https://lostark.fandom.com/wiki/Special:Redirect/file/ClassIcon-Warrior-Valkyrie.png';

  const RULES = [
    [/lone knight|combat readiness/, ['Lone Knight', 'Combat Readiness']],
    [/rage hammer|gravity training/, ['Rage Hammer', 'Gravity Training']],
    [/mayhem|berserker'?s technique/, ['Mayhem', "Berserker's Technique"]],
    [/predator|punisher/, ['Predator', 'Punisher']],
    [/master summoner|communication overflow/, ['Master Summoner', 'Communication Overflow']],
    [/igniter|reflux/, ['Igniter', 'Reflux']],
    [/surge|remaining energy/, ['Surge', 'Remaining Energy']],
    [/peacemaker|time to hunt/, ['Peacemaker', 'Time to Hunt']],
    [/death strike|loyal companion/, ['Death Strike', 'Loyal Companion']],
    [/barrage enhancement|firepower enhancement/, ['Barrage Enhancement', 'Firepower Enhancement']],
    [/enhanced weapon|pistoleer/, ['Enhanced Weapon', 'Pistoleer']],
    [/demonic impulse|perfect suppression/, ['Demonic Impulse', 'Perfect Suppression']],
    [/hunger|night'?s edge/, ['Hunger', "Night's Edge"]],
    [/full moon harvester/, ['Full Moon Harvester']],
    [/empress'?s grace|empress grace|emperor'?s decree|emperor decree/, ["Empress's Grace", "Emperor's Decree"]],
    [/pinnacle|control/, ['Pinnacle', 'Control']],
    [/shock training|taijutsu/, ['Shock Training', 'Taijutsu']],
    [/esoteric flurry|first intention/, ['Esoteric Flurry', 'First Intention']],
    [/esoteric skill enhancement/, ['Esoteric Skill Enhancement']],
    [/wind fury|drizzle/, ['Wind Fury', 'Drizzle']],
    [/brawl king storm|asura'?s path/, ['Brawl King Storm', "Asura's Path"]],
    [/deathblow|esoteric flurry/, ['Deathblow', 'Esoteric Flurry']],
    [/full bloom|recurrence/, ['Full Bloom', 'Recurrence']],
    [/desperate salvation|true courage/, ['Desperate Salvation', 'True Courage']],
    [/blessed aura|judgment/, ['Blessed Aura', 'Judgment']],
    [/liberator|shining knight/, ['Liberator', 'Shining Knight']]
  ];

  const KNOWN_SPEC = /master summoner|communication overflow|lone knight|combat readiness|rage hammer|gravity training|mayhem|berserker'?s technique|igniter|reflux|surge|remaining energy|peacemaker|time to hunt|death strike|loyal companion|barrage enhancement|firepower enhancement|enhanced weapon|pistoleer|demonic impulse|perfect suppression|hunger|night'?s edge|full moon harvester|empress'?s grace|empress grace|emperor'?s decree|emperor decree|pinnacle|control|shock training|taijutsu|esoteric flurry|first intention|esoteric skill enhancement|wind fury|drizzle|brawl king storm|asura'?s path|deathblow|full bloom|recurrence|desperate salvation|true courage|blessed aura|judgment|liberator|shining knight/i;

  function textOf(v) {
    try { return JSON.stringify(v).toLowerCase().replace(/[’']/g, "'"); } catch { return ''; }
  }

  function className(profile) {
    return String(profile?.class || profile?.className || '').trim();
  }

  function findNamedSpec(text) {
    const normalized = String(text || '').toLowerCase().replace(/[’']/g, "'");
    const aliases = [
      ['full moon harvester', 'Full Moon Harvester'],
      ['empress\'s grace', "Empress's Grace"], ['empress grace', "Empress's Grace"],
      ['emperor\'s decree', "Emperor's Decree"], ['emperor decree', "Emperor's Decree"],
      ['night\'s edge', "Night's Edge"], ['nights edge', "Night's Edge"],
      ['berserker\'s technique', "Berserker's Technique"], ['berserkers technique', "Berserker's Technique"],
      ['asura\'s path', "Asura's Path"], ['asuras path', "Asura's Path"],
      ['master summoner', 'Master Summoner'], ['communication overflow', 'Communication Overflow'],
      ['lone knight', 'Lone Knight'], ['combat readiness', 'Combat Readiness'],
      ['rage hammer', 'Rage Hammer'], ['gravity training', 'Gravity Training'],
      ['mayhem', 'Mayhem'], ['igniter', 'Igniter'], ['reflux', 'Reflux'],
      ['surge', 'Surge'], ['remaining energy', 'Remaining Energy'],
      ['peacemaker', 'Peacemaker'], ['time to hunt', 'Time to Hunt'],
      ['death strike', 'Death Strike'], ['loyal companion', 'Loyal Companion'],
      ['barrage enhancement', 'Barrage Enhancement'], ['firepower enhancement', 'Firepower Enhancement'],
      ['enhanced weapon', 'Enhanced Weapon'], ['pistoleer', 'Pistoleer'],
      ['demonic impulse', 'Demonic Impulse'], ['perfect suppression', 'Perfect Suppression'],
      ['hunger', 'Hunger'], ['pinnacle', 'Pinnacle'], ['control', 'Control'],
      ['shock training', 'Shock Training'], ['taijutsu', 'Taijutsu'],
      ['esoteric flurry', 'Esoteric Flurry'], ['first intention', 'First Intention'],
      ['esoteric skill enhancement', 'Esoteric Skill Enhancement'],
      ['wind fury', 'Wind Fury'], ['drizzle', 'Drizzle'],
      ['brawl king storm', 'Brawl King Storm'], ['deathblow', 'Deathblow'],
      ['full bloom', 'Full Bloom'], ['recurrence', 'Recurrence'],
      ['desperate salvation', 'Desperate Salvation'], ['true courage', 'True Courage'],
      ['blessed aura', 'Blessed Aura'], ['judgment', 'Judgment'],
      ['liberator', 'Liberator'], ['shining knight', 'Shining Knight']
    ];
    for (const [needle, name] of aliases) if (normalized.includes(needle)) return name;
    return '';
  }

  function specFromProfile(profile) {
    const cls = className(profile);
    const text = textOf(profile);
    const direct = findNamedSpec(text);
    if (direct) return direct;
    if (cls === 'Artist') return /\brecurrence\b/i.test(text) ? 'Recurrence' : 'Full Bloom';
    if (cls === 'Valkyrie') return /\bshining knight\b/i.test(text) ? 'Shining Knight' : 'Liberator';
    return '';
  }

  function specFromHtml(html, profile) {
    const text = String(html || '').toLowerCase().replace(/[’']/g, "'");
    const direct = findNamedSpec(text);
    if (direct) return direct;
    const cls = className(profile);
    if (cls === 'Artist') return /\brecurrence\b/i.test(text) ? 'Recurrence' : 'Full Bloom';
    if (cls === 'Valkyrie') return /\bshining knight\b/i.test(text) ? 'Shining Knight' : 'Liberator';
    return '';
  }

  async function fetchPayload(url) {
    try {
      const r = await fetch(`${CONNECTOR}?url=${encodeURIComponent(url)}`, {cache:'no-store'});
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function enrichExisting() {
    try {
      const list = JSON.parse(localStorage.getItem(NEW_KEY) || '[]');
      if (!Array.isArray(list) || !list.length) return;
      let changed = false;
      for (const c of list) {
        if (!c?.profile) continue;
        let spec = c.profile.spec || c.profile.specialization || c.profile.specName || c.profile.buildSpec || specFromProfile(c.profile);
        if (!spec) {
          const data = await fetchPayload(c.url);
          if (data) {
            spec = specFromProfile(data) || specFromHtml(textOf(data), c.profile);
          }
        }
        if (spec && c.profile.spec !== spec) { c.profile.spec = spec; changed = true; }
        if (String(c.profile.class).toLowerCase() === 'valkyrie' && c.profile.classIcon !== VALK_ICON) { c.profile.classIcon = VALK_ICON; changed = true; }
      }
      if (changed) localStorage.setItem(NEW_KEY, JSON.stringify(list));
      document.querySelectorAll('.new-addition-card[data-candidate-id]').forEach(card => {
        const c = list.find(x => x?.id === card.dataset.candidateId);
        if (!c?.profile) return;
        const spec = c.profile.spec || specFromProfile(c.profile);
        const cls = className(c.profile);
        const label = card.querySelector('.class');
        if (label && spec) label.textContent = spec;
        if (cls === 'Valkyrie') {
          const img = card.querySelector('img.class-icon');
          if (img) { img.src = VALK_ICON; img.alt = 'Valkyrie'; }
        }
      });
    } catch {}
  }

  window.NewAdditionsClassSpecAuthority = { specFromProfile, specFromHtml, enrichExisting };

  const originalFetchCharacter = window.fetchCharacter;
  if (typeof originalFetchCharacter === 'function' && !window.__NewAdditionsSpecWrapped) {
    window.__NewAdditionsSpecWrapped = true;
    window.fetchCharacter = async function(candidate) {
      const profile = await originalFetchCharacter(candidate);
      if (!profile) return profile;
      let spec = profile.spec || profile.specialization || profile.specName || profile.buildSpec || specFromProfile(profile);
      if (!spec) {
        const data = await fetchPayload(candidate.url);
        if (data) spec = specFromProfile(data) || specFromHtml(textOf(data), profile);
      }
      if (spec) profile.spec = spec;
      if (className(profile) === 'Valkyrie') profile.classIcon = VALK_ICON;
      return profile;
    };
  }

  try {
    const data = window.LostArkHideoutClassData;
    if (data && typeof data.iconUrl === 'function' && !data.__newAdditionsValkIconWrapped) {
      const originalIcon = data.iconUrl.bind(data);
      data.iconUrl = cls => String(cls).toLowerCase() === 'valkyrie' ? VALK_ICON : originalIcon(cls);
      data.__newAdditionsValkIconWrapped = true;
    }
  } catch {}
})();
