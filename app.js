const KEY = 'lostark-hideout-private-v2';
const REMOVE_CONFIRM_KEY = 'lostark-hideout-skip-remove-confirm-v1';
const MAX_CHARACTERS = 8;
const BIBLE_CONNECTOR =
  'https://lostark-bible-connector.seraph0226.workers.dev/character';

const state = loadState();

const $ = (s) => document.querySelector(s);

const CLASS_NAMES = [
  'Berserker',
  'Destroyer',
  'Gunlancer',
  'Paladin',
  'Slayer',
  'Warrior',
  'Arcanist',
  'Arcana',
  'Summoner',
  'Sorceress',
  'Bard',
  'Gunslinger',
  'Deadeye',
  'Sharpshooter',
  'Artillerist',
  'Machinist',
  'Striker',
  'Wardancer',
  'Scrapper',
  'Soulfist',
  'Glavier',
  'Deathblade',
  'Shadowhunter',
  'Reaper',
  'Artist',
  'Aeromancer',
  'Breaker',
  'Valkyrie'
];

function loadState() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null');

    if (x && Array.isArray(x.characters)) {
      return {
        characters: x.characters,
        testCharacter: x.testCharacter || null
      };
    }

    return {
      characters: [],
      testCharacter: null
    };
  } catch {
    return {
      characters: [],
      testCharacter: null
    };
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function esc(v) {
  return String(v ?? '').replace(
    /[&<>\"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c]
  );
}

function fmt(v) {
  return v == null || v === ''
    ? '—'
    : Number(v).toLocaleString(undefined, {
        maximumFractionDigits: 2
      });
}

function bibleUrl(v) {
  try {
    const u = new URL(v);

    if (
      u.protocol !== 'https:' ||
      u.hostname !== 'lostark.bible' ||
      !u.pathname.startsWith('/character/')
    ) {
      return null;
    }

    const parts = u.pathname.split('/').filter(Boolean);

    if (parts.length < 3) return null;

    return {
      url: u.href,
      region: parts[1],
      name: decodeURIComponent(parts.slice(2).join('/'))
    };
  } catch {
    return null;
  }
}

function linesFromDoc(doc) {
  return (doc.body?.textContent || '')
    .split(/\n+/)
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function cleanNumber(value) {
  if (value == null) return null;

  const match = String(value).replace(/,/g, '').match(/[\d.]+/);

  if (!match) return null;

  const n = Number(match[0]);

  return Number.isFinite(n) ? n : null;
}

function allText(doc) {
  return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
}

function findClass(doc, lines, expectedName) {
  /*
   * Bible's rendered page puts the class near the character name,
   * but the exact surrounding markup can change.
   *
   * First look through visible text.
   */
  for (const line of lines) {
    const found = CLASS_NAMES.find(
      (c) => line.toLowerCase() === c.toLowerCase()
    );

    if (found) return found;
  }

  /*
   * Then search the complete HTML/text for a known class.
   */
  const text = allText(doc);

  for (const cls of CLASS_NAMES) {
    const re = new RegExp(
      `(?:^|[^A-Za-z])${cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z]|$)`,
      'i'
    );

    if (re.test(text)) return cls;
  }

  return null;
}

function findItemLevel(doc, lines) {
  /*
   * Normal rendered Bible format:
   *
   * Item Level
   * 1800
   */
  for (let i = 0; i < lines.length; i++) {
    if (/^Item Level$/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        const value = cleanNumber(lines[j]);

        if (value != null && value >= 1000 && value <= 2000) {
          return value;
        }
      }
    }
  }

  /*
   * Fallback to the HTML itself.
   */
  const html = doc.documentElement?.outerHTML || '';

  const match = html.match(
    /Item Level[\s\S]{0,500}?>(\d{3,4}(?:\.\d+)?)</i
  );

  if (match) {
    const value = cleanNumber(match[1]);

    if (value != null) return value;
  }

  return null;
}

function findNumericAfterLabel(lines, label, validator) {
  for (let i = 0; i < lines.length; i++) {
    if (!new RegExp(`^${label}$`, 'i').test(lines[i])) continue;

    for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
      const value = cleanNumber(lines[j]);

      if (value != null && (!validator || validator(value))) {
        return value;
      }
    }
  }

  return null;
}

function extractAllNumbersNear(text, phrase) {
  const results = [];

  const lower = text.toLowerCase();
  let start = 0;

  while (true) {
    const index = lower.indexOf(phrase.toLowerCase(), start);

    if (index === -1) break;

    const section = text.slice(index, index + 1000);

    const matches = section.match(/\b\d{3,5}(?:\.\d+)?\b/g) || [];

    for (const m of matches) {
      const n = cleanNumber(m);

      if (n != null) results.push(n);
    }

    start = index + phrase.length;
  }

  return results;
}

function extractRaidCPFromHTML(doc, lines) {
  /*
   * IMPORTANT:
   *
   * The CP displayed at the top of Bible can represent the
   * character's historical/highest CP depending on the selected
   * loadout.
   *
   * We must NOT use that value blindly.
   *
   * Desired priority:
   *
   * 1. Estimated Raid Loadout CP
   * 2. Current Loadout (Raid) CP
   * 3. No CP
   *
   * Never use Chaos Dungeon CP.
   */

  const html = doc.documentElement?.outerHTML || '';
  const bodyText = allText(doc);

  /*
   * Look for explicit estimated-raid sections in the HTML.
   *
   * Bible/Svelte markup can change, so we use several patterns
   * instead of depending on a single CSS class.
   */

  const estimatedSections = [];

  const estimatedRegexes = [
    /Estimated Raid Loadout[\s\S]{0,5000}/gi,
    /estimated_raid[\s\S]{0,5000}/gi,
    /estimatedRaid[\s\S]{0,5000}/gi,
    /raid_merged[\s\S]{0,5000}/gi
  ];

  for (const regex of estimatedRegexes) {
    const matches = html.match(regex) || [];

    for (const match of matches) {
      estimatedSections.push(match);
    }
  }

  /*
   * The user's actual estimated raid CP is 8348.83.
   *
   * More generally, search estimated-raid sections for a CP-like
   * number in the normal Lost Ark combat-power range.
   */
  for (const section of estimatedSections) {
    const cpMatches =
      section.match(/\b(?:[4-9]\d{3}|1\d{4})(?:\.\d{1,2})?\b/g) || [];

    for (const raw of cpMatches) {
      const value = cleanNumber(raw);

      if (
        value != null &&
        value >= 4000 &&
        value <= 20000 &&
        /combat|power|cp/i.test(section)
      ) {
        return {
          value,
          source: 'Estimated Raid Loadout'
        };
      }
    }
  }

  /*
   * Search script contents independently. SvelteKit frequently
   * serializes page data into script tags.
   */
  const scripts = [...doc.scripts]
    .map((s) => s.textContent || '')
    .filter(Boolean);

  for (const script of scripts) {
    if (
      !/estimated_raid|estimated raid|raid_merged|estimatedRaid/i.test(
        script
      )
    ) {
      continue;
    }

    const numbers =
      script.match(/\b(?:[4-9]\d{3}|1\d{4})(?:\.\d{1,2})?\b/g) || [];

    for (const raw of numbers) {
      const value = cleanNumber(raw);

      if (
        value != null &&
        value >= 4000 &&
        value <= 20000
      ) {
        /*
         * Prefer numbers that occur near combat-power terminology.
         */
        const index = script.indexOf(raw);
        const nearby = script.slice(
          Math.max(0, index - 500),
          index + 500
        );

        if (/combat|power|cp/i.test(nearby)) {
          return {
            value,
            source: 'Estimated Raid Loadout'
          };
        }
      }
    }
  }

  /*
   * Fallback: look for the exact CP pattern in the visible HTML.
   *
   * This catches the user's current known value:
   *
   * <span class="text-red-400">8348.83</span>
   *
   * without accidentally treating 8740.84 as the raid CP if the
   * estimated value is present elsewhere.
   */
  const explicitCPValues = [];

  const cpPatterns = [
    /<span[^>]*>\s*(\d{4,5}\.\d{1,2})\s*<\/span>/gi,
    />(\d{4,5}\.\d{1,2})</gi
  ];

  for (const regex of cpPatterns) {
    let match;

    while ((match = regex.exec(html)) !== null) {
      const value = cleanNumber(match[1]);

      if (
        value != null &&
        value >= 4000 &&
        value <= 20000
      ) {
        explicitCPValues.push(value);
      }
    }
  }

  /*
   * If only one plausible decimal CP is present, it is safe to use.
   */
  const uniqueExplicit = [...new Set(explicitCPValues)];

  if (uniqueExplicit.length === 1) {
    return {
      value: uniqueExplicit[0],
      source: 'Estimated Raid Loadout'
    };
  }

  /*
   * Current Loadout (Raid) is the final acceptable fallback.
   *
   * We deliberately do NOT search anything associated with
   * Chaos Dungeon Loadout.
   */
  const currentRaidSections = [];

  const currentRaidRegexes = [
    /Current Loadout\s*\(Raid\)[\s\S]{0,5000}/gi,
    /most_recent_raid[\s\S]{0,5000}/gi,
    /current_raid[\s\S]{0,5000}/gi
  ];

  for (const regex of currentRaidRegexes) {
    const matches = html.match(regex) || [];

    for (const match of matches) {
      currentRaidSections.push(match);
    }
  }

  for (const section of currentRaidSections) {
    const cpMatches =
      section.match(/\b(?:[4-9]\d{3}|1\d{4})(?:\.\d{1,2})?\b/g) || [];

    for (const raw of cpMatches) {
      const value = cleanNumber(raw);

      if (
        value != null &&
        value >= 4000 &&
        value <= 20000 &&
        /combat|power|cp/i.test(section)
      ) {
        return {
          value,
          source: 'Current Loadout (Raid)'
        };
      }
    }
  }

  /*
   * Last-resort current raid detection.
   */
  const currentRaidButton =
    [...doc.querySelectorAll('button')].find((button) =>
      /current loadout\s*\(raid\)/i.test(
        (button.textContent || '').replace(/\s+/g, ' ').trim()
      )
    );

  if (currentRaidButton) {
    /*
     * If the page is currently displaying Current Loadout (Raid),
     * use the visible CP only as a raid value.
     */
    const visibleCP = findNumericAfterLabel(
      lines,
      'Combat Power',
      (n) => n >= 4000 && n <= 20000
    );

    if (visibleCP != null) {
      return {
        value: visibleCP,
        source: 'Current Loadout (Raid)'
      };
    }
  }

  return {
    value: null,
    source: 'No acceptable raid CP found'
  };
}

function findProfileName(doc, expectedName) {
  const heading = doc.querySelector('h1');

  if (heading) {
    const name = (heading.textContent || '').replace(/\s+/g, ' ').trim();

    if (name) return name;
  }

  /*
   * Fall back to the supplied Bible URL name.
   */
  return expectedName || 'Unknown';
}

function detectLoadout(doc) {
  const buttons = [...doc.querySelectorAll('button')].map((button) => ({
    text: (button.textContent || '').replace(/\s+/g, ' ').trim(),
    button
  }));

  const estimatedButton = buttons.find((x) =>
    /estimated raid loadout/i.test(x.text)
  );

  const currentRaidButton = buttons.find((x) =>
    /current loadout\s*\(raid\)/i.test(x.text)
  );

  const chaosButton = buttons.find((x) =>
    /chaos dungeon loadout/i.test(x.text)
  );

  const scripts = [...doc.scripts]
    .map((s) => s.textContent || '')
    .filter(Boolean);

  const estimatedData = scripts.some((s) =>
    /estimated_raid|estimated raid|raid_merged|estimatedRaid/i.test(s)
  );

  if (estimatedButton || estimatedData) {
    return {
      label: 'Estimated Raid Loadout',
      estimatedRaidAvailable: true,
      currentRaidAvailable: !!currentRaidButton,
      chaosDungeonDetected: !!chaosButton
    };
  }

  if (currentRaidButton) {
    return {
      label: 'Current Loadout (Raid)',
      estimatedRaidAvailable: false,
      currentRaidAvailable: true,
      chaosDungeonDetected: !!chaosButton
    };
  }

  return {
    label: 'No acceptable raid loadout found',
    estimatedRaidAvailable: false,
    currentRaidAvailable: false,
    chaosDungeonDetected: !!chaosButton
  };
}

function parseProfile(html, expectedName) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines = linesFromDoc(doc);

  const name = findProfileName(doc, expectedName);
  const cls = findClass(doc, lines, expectedName);
  const ilvl = findItemLevel(doc, lines);

  const raidCP = extractRaidCPFromHTML(doc, lines);
  const loadout = detectLoadout(doc);

  const text = lines.join('\n');

  const arkGrid = [];

  const gridStart = lines.findIndex((x) => x === 'Ark Grid');

  if (gridStart >= 0) {
    for (
      let i = gridStart + 1;
      i < Math.min(lines.length, gridStart + 110);
      i++
    ) {
      if (
        /^(Elemental Entwinement|Amplified Entwinement|Command Awakening|Flashy Attack|Absorbing Strike|Attack)$/.test(
          lines[i]
        )
      ) {
        arkGrid.push(lines[i]);
      }
    }
  }

  const engravings = [];

  const eStart = lines.findIndex((x) => x === 'Engravings');

  if (eStart >= 0) {
    for (
      let i = eStart + 1;
      i < Math.min(lines.length, eStart + 35);
      i++
    ) {
      const m = lines[i].match(
        /^(.+?)\s+(\d+)\/20(?:\s*[+]?\d+)?$/
      );

      if (m) {
        engravings.push({
          name: m[1],
          level: Number(m[2])
        });
      }
    }
  }

  const arkPassive = {};

  const apStart = lines.findIndex((x) => x === 'Ark Passive');

  if (apStart >= 0) {
    for (
      let i = apStart + 1;
      i < Math.min(lines.length, apStart + 110);
      i++
    ) {
      const m = lines[i].match(
        /^(.*?)\s+Lv\.\s*(\d+)$/
      );

      if (
        m &&
        m[1] &&
        !/^T\d$/i.test(m[1]) &&
        !['Evolution', 'Enlightenment', 'Leap'].includes(
          m[1].trim()
        )
      ) {
        arkPassive[m[1].trim()] = Number(m[2]);
      }
    }
  }

  const gridEffects = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(
      /^Lv\.\s*(\d+)\s+(.+?)\s+([+-]\d+(?:\.\d+)?%)$/
    );

    if (m) {
      gridEffects.push({
        level: Number(m[1]),
        effect: m[2],
        value: m[3]
      });
    }
  }

  const summary = {};

  for (const label of [
    'Ark Passive',
    'Ark Grid',
    'Engravings',
    'Accessory Effects',
    'Bracelet Effects',
    'Gems'
  ]) {
    const idx = lines.findIndex((x) => x === label);

    if (
      idx >= 0 &&
      lines[idx + 1] &&
      /^[+-]\d/.test(lines[idx + 1])
    ) {
      summary[label] = lines[idx + 1];
    }
  }

  return {
    name,
    class: cls || 'Unknown',
    cp: raidCP.value,
    cpSource: raidCP.source,
    ilvl,
    arkGrid,
    gridEffects,
    arkPassive,
    engravings,
    summary,
    gemsIncomplete: /Gems incomplete\./i.test(text),

    /*
     * Keep the selected loadout visible in the dashboard.
     */
    loadout: loadout.label,

    loadoutSelection: {
      estimatedRaidAvailable: loadout.estimatedRaidAvailable,
      currentRaidAvailable: loadout.currentRaidAvailable,
      chaosDungeonDetected: loadout.chaosDungeonDetected
    },

    retrievedAt: new Date().toISOString()
  };
}

async function fetchCharacter(c) {
  const endpoint =
    `${BIBLE_CONNECTOR}?url=${encodeURIComponent(c.url)}`;

  const r = await fetch(endpoint, {
    cache: 'no-store'
  });

  let data;

  try {
    data = await r.json();
  } catch {
    throw new Error(
      `Connector returned HTTP ${r.status}`
    );
  }

  if (!r.ok || !data.ok) {
    throw new Error(
      data?.error ||
        `Connector returned HTTP ${r.status}`
    );
  }

  return parseProfile(data.html, c.name);
}

async function refreshProfiles() {
  if (!state.characters.length) {
    $('#status').textContent =
      'Add at least one character first';

    return;
  }

  $('#status').textContent =
    'Refreshing specific character profiles…';

  let ok = 0;
  let failed = 0;

  for (const c of state.characters) {
    try {
      c.profile = await fetchCharacter(c);
      delete c.profileError;
      ok++;
    } catch (e) {
      c.profileError = e.message;
      failed++;
    }
  }

  save();
  render();

  $('#status').textContent = failed
    ? `Refreshed ${ok} profile${ok === 1 ? '' : 's'}; ${failed} failed.`
    : `Refreshed ${ok} profile${ok === 1 ? '' : 's'} from Bible.`;
}

function render() {
  const chars = state.characters;

  const il = chars
    .map((x) => x.profile?.ilvl)
    .filter(Number.isFinite);

  const cp = chars
    .map((x) => x.profile?.cp)
    .filter(Number.isFinite);

  $('#playerCount').textContent =
    `${chars.length} / ${MAX_CHARACTERS}`;

  $('#avgIlvl').textContent = il.length
    ? Math.round(
        il.reduce((a, b) => a + b, 0) / il.length
      )
    : '—';

  $('#avgCp').textContent = cp.length
    ? Math.round(
        cp.reduce((a, b) => a + b, 0) / cp.length
      ).toLocaleString()
    : '—';

  $('#dataMode').textContent =
    'Bible profiles';

  $('#rosterNote').textContent =
    'Only explicitly supplied character URLs are retrieved. No roster/account-wide data is imported. Raid loadout priority: Estimated Raid → Current Loadout (Raid). Chaos Dungeon is never selected.';

  $('#roster').innerHTML =
    chars
      .map(
        (c) => `
        <article class="character">
          <div class="character-head">
            <div>
              <h3>${esc(c.profile?.name || c.name)}</h3>
              <div class="class">
                ${esc(c.profile?.class || 'Profile pending')}
              </div>
            </div>

            <button
              class="remove-character"
              data-id="${esc(c.id)}"
              type="button"
              aria-label="Remove ${esc(c.name)}"
            >
              Remove
            </button>
          </div>

          <div class="stats">
            <div class="stat">
              iLvl
              <b>${fmt(c.profile?.ilvl)}</b>
            </div>

            <div class="stat">
              CP
              <b>${fmt(c.profile?.cp)}</b>
            </div>
          </div>

          <div class="privacy-note">
            ${
              c.profile
                ? `Bible profile loaded · ${esc(
                    c.profile.loadout
                  )} page data`
                : esc(
                    c.profileError ||
                      'Profile pending'
                  )
            }
          </div>
        </article>
      `
      )
      .join('') ||
    '<div class="empty-roster">No designated main characters have been added.</div>';

  document
    .querySelectorAll('.remove-character')
    .forEach((btn) =>
      btn.addEventListener('click', () =>
        removeCharacter(btn.dataset.id)
      )
    );

  renderSuggestions();
}

function performRemoveCharacter(c) {
  state.characters = state.characters.filter(
    (x) => x.id !== c.id
  );

  save();

  /*
   * No changelog/status message is generated for removal.
   * The user specifically requested that character-removal
   * messages not appear at the top of the dashboard.
   */

  render();
}

function removeCharacter(id) {
  const c = state.characters.find(
    (x) => x.id === id
  );

  if (!c) return;

  if (
    localStorage.getItem(REMOVE_CONFIRM_KEY) === '1'
  ) {
    performRemoveCharacter(c);
    return;
  }

  showRemoveDialog(c);
}

function showRemoveDialog(c) {
  document.querySelector('.remove-modal')?.remove();

  const overlay = document.createElement('div');

  overlay.className = 'remove-modal';

  overlay.innerHTML = `
    <div
      class="remove-modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-modal-title"
    >
      <h2 id="remove-modal-title">
        Remove character?
      </h2>

      <p>
        Are you sure you want to remove
        <strong>${esc(c.name)}</strong>
        from Available Characters?
      </p>

      <label class="remove-modal-check">
        <input
          id="remove-confirm-skip"
          type="checkbox"
        >
        <span>Don't ask me again</span>
      </label>

      <div class="remove-modal-actions">
        <button
          type="button"
          class="remove-cancel"
        >
          Cancel
        </button>

        <button
          type="button"
          class="remove-confirm"
        >
          Remove Character
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector('.remove-cancel').onclick =
    close;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('.remove-confirm').onclick =
    () => {
      if (
        overlay.querySelector(
          '#remove-confirm-skip'
        ).checked
      ) {
        localStorage.setItem(
          REMOVE_CONFIRM_KEY,
          '1'
        );
      }

      close();
      performRemoveCharacter(c);
    };

  overlay
    .querySelector('.remove-confirm')
    .focus();
}

function renderSuggestions() {
  const el = $('#suggestedParties');

  if (!state.characters.length) {
    el.innerHTML =
      '<div class="empty-roster">Add specific character profiles to generate the two-party optimization.</div>';

    return;
  }

  const complete = state.characters.filter(
    (c) => c.profile
  );

  el.innerHTML = `
    <article class="party">
      <h3>Optimization engine</h3>

      <div class="score">
        ${complete.length}/${state.characters.length}
        profiles loaded
      </div>

      <p class="privacy-note">
        ${
          complete.length >= 8
            ? 'Ready for the full 4 + 4 optimizer.'
            : complete.length >= 2
            ? 'Profiles are loaded. The synergy/character-strength optimizer will be enabled as its scoring rules are added.'
            : 'Load at least two complete profiles to begin optimization.'
        }
      </p>
    </article>

    <article class="party">
      <h3>Loaded profile data</h3>

      <div class="score">
        ${
          complete
            .map(
              (c) =>
                `${esc(c.profile.name)} · ${esc(
                  c.profile.class
                )} · ${fmt(
                  c.profile.ilvl
                )} · CP ${fmt(c.profile.cp)}`
            )
            .join('<br>') ||
          'No complete profiles yet'
        }
      </div>

      <p class="privacy-note">
        Character-specific data only.
        No roster/siblings/account-wide endpoint is used.
      </p>
    </article>
  `;
}

/* ============================================================
   SHARE SNAPSHOT
   ============================================================ */

function createShareSnapshot() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),

    characters: state.characters.map((c) => ({
      id: c.id,
      url: c.url,
      region: c.region,
      name: c.name,
      profile: c.profile || null
    })),

    testCharacter: state.testCharacter
      ? {
          url: state.testCharacter.url,
          region: state.testCharacter.region,
          name: state.testCharacter.name,
          profile: state.testCharacter.profile || null
        }
      : null
  };
}

function encodeShareSnapshot(snapshot) {
  const json = JSON.stringify(snapshot);

  const bytes = new TextEncoder().encode(json);

  let binary = '';

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + 0x8000)
    );
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildShareLink() {
  const encoded = encodeShareSnapshot(
    createShareSnapshot()
  );

  const url = new URL(
    window.location.href
  );

  url.hash = `share=${encoded}`;

  return url.toString();
}

async function copyShareLink() {
  const link = buildShareLink();

  try {
    await navigator.clipboard.writeText(link);

    $('#status').textContent =
      'Share link copied to clipboard.';
  } catch {
    /*
     * Clipboard API can be blocked in some browsers.
     * Fall back to a temporary input.
     */
    const input =
      document.createElement('textarea');

    input.value = link;
    input.style.position = 'fixed';
    input.style.opacity = '0';

    document.body.appendChild(input);

    input.focus();
    input.select();

    let copied = false;

    try {
      copied =
        document.execCommand('copy');
    } catch {
      copied = false;
    }

    input.remove();

    $('#status').textContent = copied
      ? 'Share link copied to clipboard.'
      : 'Unable to copy automatically. The share link could not be copied.';
  }
}

function decodeShareSnapshot(encoded) {
  try {
    let binary = atob(
      encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/')
    );

    const bytes = new Uint8Array(
      binary.length
    );

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const json =
      new TextDecoder().decode(bytes);

    const snapshot = JSON.parse(json);

    if (
      !snapshot ||
      snapshot.version !== 1 ||
      !Array.isArray(snapshot.characters)
    ) {
      return null;
    }

    return snapshot;
  } catch {
    return null;
  }
}

function loadShareSnapshotFromURL() {
  const hash =
    window.location.hash || '';

  if (!hash.startsWith('#share=')) {
    return false;
  }

  const encoded =
    hash.slice('#share='.length);

  if (!encoded) return false;

  const snapshot =
    decodeShareSnapshot(encoded);

  if (!snapshot) {
    $('#status').textContent =
      'The share link is invalid or corrupted.';

    return false;
  }

  /*
   * Import the snapshot into this browser.
   *
   * This does not fetch Bible data automatically.
   * The recipient receives the character/profile snapshot
   * exactly as it existed when the link was created.
   */
  state.characters =
    snapshot.characters
      .slice(0, MAX_CHARACTERS)
      .map((c) => ({
        id:
          c.id ||
          crypto.randomUUID(),
        url: c.url,
        region: c.region,
        name: c.name,
        profile: c.profile || null
      }));

  state.testCharacter =
    snapshot.testCharacter || null;

  save();

  /*
   * Remove the encoded snapshot from the address bar after
   * importing it. This prevents repeated imports on refresh.
   */
  history.replaceState(
    null,
    '',
    window.location.pathname +
      window.location.search
  );

  return true;
}

/* ============================================================
   CHARACTER CONTROLS
   ============================================================ */

$('#addCharacterBtn').onclick = () => {
  if (
    state.characters.length >=
    MAX_CHARACTERS
  ) {
    alert(
      `Maximum of ${MAX_CHARACTERS} designated characters reached.`
    );

    return;
  }

  const parsed = bibleUrl(
    $('#characterUrl').value.trim()
  );

  if (!parsed) {
    $('#status').textContent =
      'Enter a valid lostark.bible character URL';

    return;
  }

  if (
    state.characters.some(
      (c) => c.url === parsed.url
    )
  ) {
    $('#status').textContent =
      'That character is already added';

    return;
  }

  state.characters.push({
    id: crypto.randomUUID(),
    ...parsed,
    profile: null
  });

  save();

  $('#characterUrl').value = '';

  $('#status').textContent =
    'Character added locally; click Refresh Profiles to retrieve it';

  render();
};

$('#refreshBtn').onclick =
  refreshProfiles;

$('#optimizeBtn').onclick = () => {
  $('#status').textContent =
    state.characters.filter(
      (c) => c.profile
    ).length < 2
      ? 'Load at least two complete character profiles first'
      : 'Optimization scoring is the next layer; character retrieval is now active.';

  renderSuggestions();
};

/* ============================================================
   HYPOTHETICAL CHARACTER COMPARISON
   ============================================================ */

$('#compareBtn').onclick = async () => {
  const parsed = bibleUrl(
    $('#testCharacterUrl').value.trim()
  );

  if (!parsed) {
    $('#status').textContent =
      'Enter a valid Bible character URL for the test character';

    return;
  }

  const test = {
    ...parsed
  };

  $('#status').textContent =
    `Retrieving ${parsed.name}…`;

  try {
    test.profile =
      await fetchCharacter(test);

    state.testCharacter = test;

    save();

    $('#comparison').innerHTML = `
      <div class="comparison-grid">
        <div class="comparison-card">
          <span>Current pool</span>
          <b>
            ${state.characters.length}
            characters
          </b>
        </div>

        <div class="comparison-card">
          <span>Test character</span>

          <b>
            ${esc(test.profile.name)}
            ·
            ${esc(test.profile.class)}
          </b>

          <div class="delta">
            iLvl ${fmt(test.profile.ilvl)}
            · CP ${fmt(test.profile.cp)}
          </div>
        </div>

        <div class="comparison-card">
          <span>Result</span>

          <b>Profile loaded</b>

          <div class="delta">
            ${esc(test.profile.loadout)}.
            Optimization percentage will be
            calculated after the party scoring
            engine is enabled.
          </div>
        </div>
      </div>
    `;

    $('#status').textContent =
      `Loaded test character ${test.profile.name}`;
  } catch (e) {
    $('#status').textContent =
      `Test character retrieval failed: ${e.message}`;
  }
};

/* ============================================================
   SHARE BUTTON
   ============================================================ */

$('#shareBtn').onclick =
  copyShareLink;

/* ============================================================
   INITIAL LOAD
   ============================================================ */

const importedShare =
  loadShareSnapshotFromURL();

render();

if (importedShare) {
  $('#status').textContent =
    'Shared character snapshot loaded.';
}
```
