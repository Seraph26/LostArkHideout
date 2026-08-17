```javascript
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

/* -------------------------------------------------------
   STATE
------------------------------------------------------- */

function loadState() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null');

    return x && Array.isArray(x.characters)
      ? x
      : {
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

/* -------------------------------------------------------
   GENERAL HELPERS
------------------------------------------------------- */

function esc(v) {
  return String(v ?? '').replace(
    /[&<>\"']/g,
    (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
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

/* -------------------------------------------------------
   BIBLE URL VALIDATION
------------------------------------------------------- */

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

/* -------------------------------------------------------
   TEXT PARSING HELPERS
------------------------------------------------------- */

function linesFromDoc(doc) {
  return (doc.body?.textContent || '')
    .split(/\n+/)
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function cleanNumber(value) {
  if (value == null) return null;

  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/≈/g, '')
    .replace(/[^\d.]/g, '');

  if (!normalized) return null;

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function findValueAfterLabel(lines, label, options = {}) {
  const {
    maxLookAhead = 8,
    allowApproximation = true
  } = options;

  const labelRegex = new RegExp(`^${label}$`, 'i');

  for (let i = 0; i < lines.length; i++) {
    if (!labelRegex.test(lines[i])) continue;

    for (
      let j = i + 1;
      j < Math.min(lines.length, i + 1 + maxLookAhead);
      j++
    ) {
      const value = lines[j];

      if (!value) continue;

      const cleaned = cleanNumber(value);

      if (cleaned != null) {
        if (!allowApproximation && value.includes('≈')) {
          continue;
        }

        return cleaned;
      }
    }
  }

  return null;
}

function findMetricFromDocument(doc, label) {
  /*
   * First attempt: inspect elements containing the exact label.
   *
   * Bible currently renders metrics using structures such as:
   *
   * <p>Combat Power</p>
   * <div>≈8740<span>.84</span></div>
   *
   * So we intentionally inspect nearby DOM elements instead of
   * requiring the value to be a separate text node.
   */

  const all = [...doc.querySelectorAll('p, div, span')];

  for (const element of all) {
    const labelText = (element.textContent || '').replace(/\s+/g, ' ').trim();

    if (labelText.toLowerCase() !== label.toLowerCase()) {
      continue;
    }

    let sibling = element.nextElementSibling;

    for (let i = 0; i < 5 && sibling; i++) {
      const valueText = (sibling.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();

      const value = cleanNumber(valueText);

      if (value != null) {
        return value;
      }

      sibling = sibling.nextElementSibling;
    }

    /*
     * Some layouts wrap the value inside the parent's next child.
     */

    const parent = element.parentElement;

    if (parent) {
      const children = [...parent.children];
      const index = children.indexOf(element);

      for (let i = index + 1; i < Math.min(children.length, index + 5); i++) {
        const valueText = (children[i].textContent || '')
          .replace(/\s+/g, ' ')
          .trim();

        const value = cleanNumber(valueText);

        if (value != null) {
          return value;
        }
      }
    }
  }

  return null;
}

/* -------------------------------------------------------
   LOADOUT PRIORITY
------------------------------------------------------- */

function loadoutClassificationText(loadout) {
  return String(
    loadout?.classification ||
      loadout?.type ||
      ''
  ).toLowerCase();
}

function loadoutPriority(loadout) {
  const c = loadoutClassificationText(loadout);

  if (
    c === 'raid_merged' ||
    c.includes('estimated_raid') ||
    c.includes('estimated raid')
  ) {
    return 0;
  }

  if (
    c === 'most_recent_raid' ||
    c.includes('current_raid') ||
    c.includes('current raid')
  ) {
    return 1;
  }

  if (
    c === 'most_recent_chaos_dungeon' ||
    c.includes('chaos')
  ) {
    return 99;
  }

  return 50;
}

function selectPreferredLoadout(loadouts) {
  const candidates = (Array.isArray(loadouts) ? loadouts : [])
    .filter(Boolean)
    .filter((l) => loadoutPriority(l) < 99);

  if (!candidates.length) return null;

  return candidates
    .slice()
    .sort(
      (a, b) =>
        loadoutPriority(a) - loadoutPriority(b) ||
        new Date(b.lastUpdated || 0) -
          new Date(a.lastUpdated || 0)
    )[0];
}

/* -------------------------------------------------------
   CLASS DETECTION
------------------------------------------------------- */

function detectClass(lines, name) {
  const normalizedName = String(name || '').trim().toLowerCase();

  /*
   * Look through the entire page first.
   *
   * The current Bible page clearly contains:
   *
   * North America
   * Balthorr
   * Summoner
   * Seraphh
   *
   * so there is no reason to restrict the search to only a few
   * lines around the character name.
   */

  for (const line of lines) {
    const normalized = line.toLowerCase();

    const match = CLASS_NAMES.find(
      (className) => normalized === className.toLowerCase()
    );

    if (match) {
      return match;
    }
  }

  /*
   * Fallback: search for the class name anywhere inside a line.
   */

  for (const line of lines) {
    const normalized = line.toLowerCase();

    const match = CLASS_NAMES.find((className) =>
      normalized.includes(className.toLowerCase())
    );

    if (match) {
      return match;
    }
  }

  return null;
}

/* -------------------------------------------------------
   CHARACTER PROFILE PARSER
------------------------------------------------------- */

function parseProfile(html, expectedName) {
  const doc = new DOMParser().parseFromString(
    html,
    'text/html'
  );

  const lines = linesFromDoc(doc);
  const text = lines.join('\n');

  /*
   * Character name
   */

  let name =
    doc.querySelector('h1')?.textContent?.trim() ||
    expectedName ||
    'Unknown';

  /*
   * The Bible HTML currently renders:
   *
   * <h1>Seraphh</h1>
   *
   * so this should reliably resolve to Seraphh.
   */

  if (!name || name.length > 100) {
    name = expectedName || 'Unknown';
  }

  /*
   * Class
   */

  const detectedClass = detectClass(lines, name);

  /*
   * Combat Power
   *
   * Current Bible format:
   *
   * Combat Power
   * ≈8740.84
   *
   * or a nested DOM representation where the integer and
   * decimal are separate spans.
   */

  let cp = findMetricFromDocument(doc, 'Combat Power');

  if (cp == null) {
    cp = findValueAfterLabel(lines, 'Combat Power', {
      maxLookAhead: 8,
      allowApproximation: true
    });
  }

  /*
   * Additional fallback for the exact visible text pattern.
   */

  if (cp == null) {
    const cpMatch = text.match(
      /Combat Power[\s\S]{0,100}?≈?\s*([\d,]+(?:\.\d+)?)/i
    );

    if (cpMatch) {
      cp = cleanNumber(cpMatch[1]);
    }
  }

  /*
   * Item Level
   */

  let ilvl = findMetricFromDocument(doc, 'Item Level');

  if (ilvl == null) {
    ilvl = findValueAfterLabel(lines, 'Item Level', {
      maxLookAhead: 8,
      allowApproximation: false
    });
  }

  if (ilvl == null) {
    const ilvlMatch = text.match(
      /Item Level[\s\S]{0,80}?(\d{3,4}(?:\.\d+)?)/i
    );

    if (ilvlMatch) {
      ilvl = cleanNumber(ilvlMatch[1]);
    }
  }

  /*
   * Ark Grid
   */

  const arkGrid = [];

  const gridStart = lines.findIndex(
    (x) => x === 'Ark Grid'
  );

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

  /*
   * Engravings
   */

  const engravings = [];

  const eStart = lines.findIndex(
    (x) => x === 'Engravings'
  );

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

  /*
   * Ark Passive
   */

  const arkPassive = {};

  const apStart = lines.findIndex(
    (x) => x === 'Ark Passive'
  );

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

  /*
   * Ark Grid effects
   */

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

  /*
   * Summary
   */

  const summary = {};

  for (const label of [
    'Ark Passive',
    'Ark Grid',
    'Engravings',
    'Accessory Effects',
    'Bracelet Effects',
    'Gems'
  ]) {
    const idx = lines.findIndex(
      (x) => x === label
    );

    if (
      idx >= 0 &&
      lines[idx + 1] &&
      /^[+-]\d/.test(lines[idx + 1])
    ) {
      summary[label] = lines[idx + 1];
    }
  }

  /*
   * Loadout detection
   */

  const loadoutButtons = [
    ...doc.querySelectorAll('button')
  ].map((x) => ({
    text: (x.textContent || '')
      .replace(/\s+/g, ' ')
      .trim(),
    el: x
  }));

  const estimatedButton = loadoutButtons.find((x) =>
    /estimated raid loadout/i.test(x.text)
  );

  const currentRaidButton = loadoutButtons.find((x) =>
    /current loadout\s*\(raid\)/i.test(x.text)
  );

  const chaosButton = loadoutButtons.find((x) =>
    /chaos dungeon loadout/i.test(x.text)
  );

  /*
   * IMPORTANT:
   *
   * Estimated Raid is preferred.
   * If it doesn't exist, Current Loadout (Raid) is used.
   * Chaos Dungeon is NEVER selected.
   */

  let selectedLoadout =
    'No acceptable raid loadout found';

  if (estimatedButton) {
    selectedLoadout = 'Estimated Raid Loadout';
  } else if (currentRaidButton) {
    selectedLoadout = 'Current Loadout (Raid)';
  }

  /*
   * Look for serialized loadout data.
   */

  let serializedLoadout = null;

  for (const script of [...doc.scripts]) {
    const s = script.textContent || '';

    if (
      /raid_merged|most_recent_raid|most_recent_chaos_dungeon/i.test(
        s
      )
    ) {
      serializedLoadout = s;
      break;
    }
  }

  /*
   * Return complete profile.
   */

  return {
    name,
    class: detectedClass || 'Unknown',
    cp,
    ilvl,

    arkGrid,
    gridEffects,
    arkPassive,
    engravings,

    summary,

    gemsIncomplete:
      /Gems incomplete\./i.test(text),

    loadout: selectedLoadout,

    loadoutSelection: {
      estimatedRaidAvailable: !!estimatedButton,
      currentRaidAvailable: !!currentRaidButton,
      chaosDungeonDetected: !!chaosButton,
      serializedRaidDataDetected: !!serializedLoadout
    },

    retrievedAt: new Date().toISOString()
  };
}

/* -------------------------------------------------------
   BIBLE FETCH
------------------------------------------------------- */

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

/* -------------------------------------------------------
   REFRESH
------------------------------------------------------- */

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

/* -------------------------------------------------------
   RENDER
------------------------------------------------------- */

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
        il.reduce((a, b) => a + b, 0) /
          il.length
      )
    : '—';

  $('#avgCp').textContent = cp.length
    ? Math.round(
        cp.reduce((a, b) => a + b, 0) /
          cp.length
      ).toLocaleString()
    : '—';

  $('#dataMode').textContent =
    'Bible profiles';

  $('#rosterNote').textContent =
    'Only explicitly supplied character URLs are retrieved. No roster/account-wide data is imported. Raid loadout priority: Estimated Raid → Current Loadout (Raid). Chaos Dungeon is never selected.';

  $('#roster').innerHTML = chars
    .map(
      (c) => `
        <article class="character">
          <div class="character-head">
            <div>
              <h3>${esc(
                c.profile?.name || c.name
              )}</h3>

              <div class="class">
                ${esc(
                  c.profile?.class ||
                    'Profile pending'
                )}
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
      btn.addEventListener(
        'click',
        () =>
          removeCharacter(
            btn.dataset.id
          )
      )
    );

  renderSuggestions();
}

/* -------------------------------------------------------
   CHARACTER REMOVAL
------------------------------------------------------- */

function performRemoveCharacter(c) {
  state.characters =
    state.characters.filter(
      (x) => x.id !== c.id
    );

  save();

  /*
   * Keep the status message because the user
   * explicitly wanted the profile refresh message
   * but not a persistent changelog/history system.
   */

  $('#status').textContent =
    `${c.name} removed`;

  render();
}

function removeCharacter(id) {
  const c = state.characters.find(
    (x) => x.id === id
  );

  if (!c) return;

  if (
    localStorage.getItem(
      REMOVE_CONFIRM_KEY
    ) === '1'
  ) {
    performRemoveCharacter(c);
    return;
  }

  showRemoveDialog(c);
}

function showRemoveDialog(c) {
  document
    .querySelector('.remove-modal')
    ?.remove();

  const overlay =
    document.createElement('div');

  overlay.className =
    'remove-modal';

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

        <span>
          Don't ask me again
        </span>
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

  const close = () =>
    overlay.remove();

  overlay
    .querySelector('.remove-cancel')
    .onclick = close;

  overlay.addEventListener(
    'click',
    (e) => {
      if (e.target === overlay) {
        close();
      }
    }
  );

  overlay
    .querySelector('.remove-confirm')
    .onclick = () => {
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

/* -------------------------------------------------------
   SUGGESTIONS / OPTIMIZATION
------------------------------------------------------- */

function renderSuggestions() {
  const el =
    $('#suggestedParties');

  if (!state.characters.length) {
    el.innerHTML =
      '<div class="empty-roster">Add specific character profiles to generate the two-party optimization.</div>';

    return;
  }

  const complete =
    state.characters.filter(
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
                `${esc(
                  c.profile.name
                )} · ${esc(
                  c.profile.class
                )} · ${fmt(
                  c.profile.ilvl
                )} · CP ${fmt(
                  c.profile.cp
                )}`
            )
            .join('<br>') ||
          'No complete profiles yet'
        }
      </div>

      <p class="privacy-note">
        Character-specific data only.
        No roster/siblings/account-wide
        endpoint is used.
      </p>
    </article>
  `;
}

/* -------------------------------------------------------
   ADD CHARACTER
------------------------------------------------------- */

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

/* -------------------------------------------------------
   BUTTONS
------------------------------------------------------- */

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

$('#compareBtn').onclick =
  async () => {
    const parsed = bibleUrl(
      $('#testCharacterUrl')
        .value
        .trim()
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
              ${esc(
                test.profile.name
              )}
              ·
              ${esc(
                test.profile.class
              )}
            </b>

            <div class="delta">
              iLvl
              ${fmt(
                test.profile.ilvl
              )}
              · CP
              ${fmt(
                test.profile.cp
              )}
            </div>
          </div>

          <div class="comparison-card">
            <span>Result</span>

            <b>
              Profile loaded
            </b>

            <div class="delta">
              ${esc(
                test.profile.loadout
              )}.
              Optimization percentage will
              be calculated after the party
              scoring engine is enabled.
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

/* -------------------------------------------------------
   SHARING
------------------------------------------------------- */

$('#shareBtn').onclick = () => {
  alert(
    'Private sharing is intentionally disabled until the secure data layer is implemented. Character profiles remain local to this browser and are not committed to GitHub.'
  );
};

/* -------------------------------------------------------
   INITIAL RENDER
------------------------------------------------------- */

render();
```
