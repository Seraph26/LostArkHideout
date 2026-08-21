/* New Additions class/spec authority. Runs before candidate-roster-v1.js. */
(() => {
  'use strict';

  const CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';
  const VALK_ICON = 'https://cms.poyoanon.fyi/assets/d3a00d6c-f439-4a8e-9a42-38f7367cc7f2.png?height=636&width=816';

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
    [/empress'?s grace|emperor'?s decree/, ["Empress's Grace", "Emperor's Decree"]],
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

  function textOf(v) {
    try { return JSON.stringify(v).toLowerCase().replace(/[’']/g, "'"); } catch { return ''; }
  }

  function className(profile) {
    return String(profile?.class || profile?.className || '').trim();
  }

  function specFromProfile(profile) {
    const cls = className(profile);
    const text = textOf(profile);
    for (const [re, names] of RULES) {
      if (!re.test(text)) continue;
      for (const name of names) if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(text)) return name;
    }
    if (cls === 'Artist') return /\\brecurrence\\b/i.test(text) ? 'Recurrence' : 'Full Bloom';
    if (cls === 'Valkyrie') return /\\bshining knight\\b/i.test(text) ? 'Shining Knight' : 'Liberator';
    return '';
  }

  function specFromHtml(html, profile) {
    const text = String(html || '').toLowerCase().replace(/[’']/g, "'");
    const cls = className(profile);
    const engravingNames = Array.isArray(profile?.engravings)
      ? profile.engravings.map(x => String(x?.name || x || '').trim()).filter(Boolean)
      : [];
    for (const name of engravingNames) {
      if (/master summoner|communication overflow|lone knight|combat readiness|rage hammer|gravity training|mayhem|berserker'?s technique|igniter|reflux|surge|remaining energy|peacemaker|time to hunt|death strike|loyal companion|barrage enhancement|firepower enhancement|enhanced weapon|pistoleer|demonic impulse|perfect suppression|hunger|night'?s edge|empress'?s grace|emperor'?s decree|pinnacle|control|shock training|taijutsu|esoteric flurry|first intention|esoteric skill enhancement|wind fury|drizzle|brawl king storm|asura'?s path|deathblow|full bloom|recurrence|desperate salvation|true courage|blessed aura|judgment|liberator|shining knight/i.test(name)) return name;
    }
    for (const [re, names] of RULES) {
      if (!re.test(text)) continue;
      for (const name of names) {
        const r = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
        if (r.test(text)) return name;
      }
    }
    if (cls === 'Artist') return /\\brecurrence\\b/i.test(text) ? 'Recurrence' : 'Full Bloom';
    if (cls === 'Valkyrie') return /\\bshining knight\\b/i.test(text) ? 'Shining Knight' : 'Liberator';
    return '';
  }

  const originalFetchCharacter = window.fetchCharacter;
  if (typeof originalFetchCharacter === 'function' && !window.__NewAdditionsSpecWrapped) {
    window.__NewAdditionsSpecWrapped = true;
    window.fetchCharacter = async function(candidate) {
      const profile = await originalFetchCharacter(candidate);
      if (!profile) return profile;
      let spec = profile.spec || profile.specialization || profile.specName || profile.buildSpec || specFromProfile(profile);
      if (!spec) {
        try {
          const r = await fetch(`${CONNECTOR}?url=${encodeURIComponent(candidate.url)}`, {cache:'no-store'});
          const data = await r.json();
          const html = data?.html || data?.characterHtml || data?.content || data?.page || '';
          spec = specFromHtml(html, profile);
        } catch {}
      }
      if (spec) profile.spec = spec;
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
