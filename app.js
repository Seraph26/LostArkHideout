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
  'Valkyrie',
];

function loadState() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null');

    return x && Array.isArray(x.characters)
      ? x
      : {
          characters: [],
          testCharacter: null,
        };
  } catch {
    return {
      characters: [],
      testCharacter: null,
    };
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function esc(v) {
  return String(v ?? '').replace(/[&<>\"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function fmt(v) {
  return v == null || v === ''
    ? '—'
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
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
      name: decodeURIComponent(parts.slice(2).join('/')),
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

/*
 * Extracts the actual CP rendered by the currently selected loadout.
 *
 * IMPORTANT:
 * We intentionally do NOT use the character header's Combat Power.
 *
 * Bible's character header can show the character's historical/highest CP.
 * For the optimizer we need the CP belonging to the selected raid loadout.
 *
 * Estimated Raid Loadout:
 *     <span class="text-red-400">8348.83</span>
 *
 * Current Loadout (Raid) is the fallback.
 *
 * Chaos Dungeon Loadout is never accepted.
 */
function extractRaidLoadoutCP(doc, selectedLoadout) {
  if (
    selectedLoadout !== 'Estimated Raid Loadout' &&
    selectedLoadout !== 'Current Loadout (Raid)'
  ) {
    return null;
  }

  /*
   * Bible's loadout CP is rendered as a decimal number in a span.
   *
   * We deliberately avoid reading the page's header CP because that is
   * the character's historical/highest CP.
   */
  const possible = [];

  for (const el of doc.querySelectorAll('span')) {
    const text = (el.textContent || '').replace(/,/g, '').trim();

    if (/^\d+(?:\.\d+)?$/.test(text)) {
      const value = Number(text);

      /*
       * CP values for these characters are generally in the thousands.
       * This also prevents us from accidentally selecting small values
       * such as item levels, accessory levels, percentages, etc.
       */
      if (value >= 5000 && value <= 50000) {
        possible.push({
          value,
          el,
        });
      }
    }
  }

  /*
   * Prefer the exact visual pattern Bible uses for the loadout CP.
   */
  const redCP = possible.find((x) =>
    x.el.classList.contains('text-red-400')
  );

  if (redCP) {
    return redCP.value;
  }

  /*
   * Fallback: return the first plausible CP value.
   */
  return possible.length ? possible[0].value : null;
}

function parseProfile(html, expectedName) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines = linesFromDoc(doc);

  const name =
    (doc.querySelector('h1')?.textContent || expectedName).trim();

  /*
   * Determine class.
   */
  const nameIndex = lines.findIndex((x) => x === name);

  let cls = null;

  for (
    let i = Math.max(0, nameIndex - 6);
    i < Math.min(lines.length, nameIndex + 8);
    i++
  ) {
    const hit = CLASS_NAMES.find(
      (c) =>
        lines[i].toLowerCase() === c.toLowerCase()
    );

    if (hit) {
      cls = hit;
      break;
    }
  }

  /*
   * Detect available loadout buttons.
   */
  const loadoutButtons = [...doc.querySelectorAll('button')].map(
    (x) => ({
      text: (x.textContent || '')
        .replace(/\s+/g, ' ')
        .trim(),
      el: x,
    })
  );

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
   * Established loadout priority:
   *
   * 1. Estimated Raid Loadout
   * 2. Current Loadout (Raid)
   * 3. Nothing
   *
   * Chaos Dungeon is NEVER selected.
   */
  let selectedLoadout = 'No acceptable raid loadout found';

  if (estimatedButton) {
    selectedLoadout = 'Estimated Raid Loadout';
  } else if (currentRaidButton) {
    selectedLoadout = 'Current Loadout (Raid)';
  }

  /*
   * IMPORTANT:
   *
   * We do NOT read the "Combat Power" text from the character header.
   *
   * That value can represent the character's historical/highest CP.
   *
   * Instead, extract the CP belonging to the selected raid loadout.
   */
  const cp = extractRaidLoadoutCP(
    doc,
    selectedLoadout
  );

  /*
   * Item Level can safely come from the character profile because the
   * item level itself is not the historical CP value.
   */
  let ilvl = null;

  for (let i = 0; i < lines.length; i++) {
    if (/^Item Level$/i.test(lines[i])) {
      for (
        let j = i + 1;
        j < Math.min(lines.length, i + 4);
        j++
      ) {
        const m = lines[j].match(/^([\d,.]+)$/);

        if (m) {
          ilvl = Number(
            m[1].replace(/,/g, '')
          );
          break;
        }
      }

      if (ilvl != null) break;
    }
  }

  /*
   * Ark Grid.
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
   * Engravings.
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
          level: Number(m[2]),
        });
      }
    }
  }

  /*
   * Ark Passive.
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
        ![
          'Evolution',
          'Enlightenment',
          'Leap',
        ].includes(m[1].trim())
      ) {
        arkPassive[m[1].trim()] =
          Number(m[2]);
      }
    }
  }

  /*
   * Ark Grid effects.
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
        value: m[3],
      });
    }
  }

  /*
   * Small summary values.
   */
  const summary = {};

  for (const label of [
    'Ark Passive',
    'Ark Grid',
    'Engravings',
    'Accessory Effects',
    'Bracelet Effects',
    'Gems',
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
   * Detect serialized loadout information if Bible exposes it.
   */
  let serializedLoadout = null;

  for (const script of [...doc.scripts]) {
    const s = script.textContent || '';

    if (
      /raid_merged|most_recent_raid|most_recent_chaos_dungeon/.test(
        s
      )
    ) {
      serializedLoadout = s;
      break;
    }
  }

  return {
    name,
    class: cls || 'Unknown',

    /*
     * This is now RAID LOADOUT CP.
     *
     * It is intentionally NOT the historical/header CP.
     */
    cp,

    ilvl,

    arkGrid,
    gridEffects,
    arkPassive,
    engravings,
    summary,

    gemsIncomplete:
      /Gems incomplete\./i.test(
        lines.join('\n')
      ),

    loadout: selectedLoadout,

    loadoutSelection: {
      estimatedRaidAvailable:
        !!estimatedButton,

      currentRaidAvailable:
        !!currentRaidButton,

      chaosDungeonDetected:
        !!chaosButton,

      serializedRaidDataDetected:
        !!serializedLoadout,

      cpSource:
        cp != null
          ? selectedLoadout
          : 'No raid loadout CP found',
    },

    retrievedAt:
      new Date().toISOString(),
  };
}

async function fetchCharacter(c) {
  const endpoint =
    `${BIBLE_CONNECTOR}?url=` +
    encodeURIComponent(c.url);

  const r = await fetch(endpoint, {
    cache: 'no-store',
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

  return parseProfile(
    data.html,
    c.name
  );
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
    ? `Refreshed ${ok} profile${
        ok === 1 ? '' : 's'
      }; ${failed} failed.`
    : `Refreshed ${ok} profile${
        ok === 1 ? '' : 's'
      } from Bible.`;
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
        il.reduce((a, b) => a + b, 0) /
          il.length
      )
    : '—';

  $('#avgCp').textContent = cp.length
    ? Math.round(
        cp.reduce((a, b) => a + b, 0)
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
                <h3>${esc(
                  c.profile?.name ||
                    c.name
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
                aria-label="Remove ${esc(
                  c.name
                )}"
              >
                Remove
              </button>
            </div>

            <div class="stats">
              <div class="stat">
                iLvl
                <b>${fmt(
                  c.profile?.ilvl
                )}</b>
              </div>

              <div class="stat">
                CP
                <b>${fmt(
                  c.profile?.cp
                )}</b>
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

function performRemoveCharacter(c) {
  state.characters =
    state.characters.filter(
      (x) => x.id !== c.id
    );

  save();

  /*
   * Keep the normal status message, but do not
   * create a persistent changelog/history entry.
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

  document.body.appendChild(
    overlay
  );

  const close = () =>
    overlay.remove();

  overlay.querySelector(
    '.remove-cancel'
  ).onclick = close;

  overlay.addEventListener(
    'click',
    (e) => {
      if (e.target === overlay) {
        close();
      }
    }
  );

  overlay.querySelector(
    '.remove-confirm'
  ).onclick = () => {
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
    .querySelector(
      '.remove-confirm'
    )
    .focus();
}

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
      <h3>
        Optimization engine
      </h3>

      <div class="score">
        ${complete.length}/${
          state.characters.length
        } profiles loaded
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
      <h3>
        Loaded profile data
      </h3>

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
    $('#characterUrl')
      .value
      .trim()
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
    profile: null,
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
      ...parsed,
    };

    $('#status').textContent =
      `Retrieving ${parsed.name}…`;

    try {
      test.profile =
        await fetchCharacter(
          test
        );

      state.testCharacter =
        test;

      save();

      $('#comparison').innerHTML = `
        <div class="comparison-grid">

          <div class="comparison-card">
            <span>
              Current pool
            </span>

            <b>
              ${
                state.characters.length
              }
              characters
            </b>
          </div>

          <div class="comparison-card">
            <span>
              Test character
            </span>

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
            <span>
              Result
            </span>

            <b>
              Profile loaded
            </b>

            <div class="delta">
              ${esc(
                test.profile.loadout
              )}.
              Optimization percentage
              will be calculated after
              the party scoring engine
              is enabled.
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

$('#shareBtn').onclick = () => {
  alert(
    'Private sharing is intentionally disabled until the secure data layer is implemented. Character profiles remain local to this browser and are not committed to GitHub.'
  );
};

render();
```
