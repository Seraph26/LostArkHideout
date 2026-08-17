const KEY = 'lostark-hideout-private-v2';
const REMOVE_CONFIRM_KEY = 'lostark-hideout-skip-remove-confirm-v1';
const MAX_CHARACTERS = 8;

const BIBLE_CONNECTOR =
  'https://lostark-bible-connector.seraph0226.workers.dev/character';

const SHARE_PREFIX = '#snapshot=';

const $ = (selector) => document.querySelector(selector);

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

/* =========================================================
   STATE
   ========================================================= */

function defaultState() {
  return {
    characters: [],
    testCharacter: null,
    parties: null,
  };
}

function normalizeCharacter(character) {
  if (!character || typeof character !== 'object') return null;

  if (!character.url || !character.name) return null;

  return {
    id: character.id || crypto.randomUUID(),
    url: String(character.url),
    region: String(character.region || ''),
    name: String(character.name || ''),
    profile:
      character.profile && typeof character.profile === 'object'
        ? character.profile
        : null,
    profileError: character.profileError
      ? String(character.profileError)
      : undefined,
  };
}

function normalizeState(value) {
  const base = defaultState();

  if (!value || typeof value !== 'object') {
    return base;
  }

  if (Array.isArray(value.characters)) {
    base.characters = value.characters
      .map(normalizeCharacter)
      .filter(Boolean)
      .slice(0, MAX_CHARACTERS);
  }

  if (value.testCharacter && typeof value.testCharacter === 'object') {
    base.testCharacter = value.testCharacter;
  }

  if (value.parties && typeof value.parties === 'object') {
    base.parties = value.parties;
  }

  return base;
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) {
      return defaultState();
    }

    return normalizeState(JSON.parse(raw));
  } catch {
    /*
     * IMPORTANT:
     * Do not overwrite potentially recoverable local data here.
     * If parsing fails, start an in-memory empty state only.
     */
    return defaultState();
  }
}

const state = loadState();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /*
     * If localStorage is unavailable/full, the dashboard can still
     * operate during the current page session.
     */
  }
}

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function fmt(value) {
  if (value == null || value === '') {
    return '—';
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function setStatus(message) {
  const status = $('#status');

  if (status) {
    status.textContent = message;
  }
}

/* =========================================================
   BIBLE URL VALIDATION
   ========================================================= */

function bibleUrl(value) {
  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'lostark.bible' ||
      !url.pathname.toLowerCase().startsWith('/character/')
    ) {
      return null;
    }

    const parts = url.pathname
      .split('/')
      .filter(Boolean);

    /*
     * Expected:
     * /character/REGION/CHARACTER_NAME
     */

    if (parts.length < 3) {
      return null;
    }

    return {
      url: url.href,
      region: decodeURIComponent(parts[1]),
      name: decodeURIComponent(
        parts.slice(2).join('/')
      ),
    };
  } catch {
    return null;
  }
}

/* =========================================================
   HTML PARSING
   ========================================================= */

function linesFromDoc(doc) {
  return (doc.body?.textContent || '')
    .split(/\n+/)
    .map((value) =>
      value.replace(/\s+/g, ' ').trim()
    )
    .filter(Boolean);
}

/* =========================================================
   LOADOUT SELECTION
   ========================================================= */

function loadoutClassificationText(loadout) {
  return String(
    loadout?.classification ||
      loadout?.type ||
      ''
  ).toLowerCase();
}

function loadoutPriority(loadout) {
  const classification =
    loadoutClassificationText(loadout);

  /*
   * Estimated Raid Loadout is always preferred.
   */

  if (
    classification === 'raid_merged' ||
    classification.includes('estimated_raid') ||
    classification.includes('estimated raid')
  ) {
    return 0;
  }

  /*
   * Current Loadout (Raid) is the fallback.
   */

  if (
    classification === 'most_recent_raid' ||
    classification.includes('current_raid') ||
    classification.includes('current raid')
  ) {
    return 1;
  }

  /*
   * Chaos Dungeon is NEVER accepted.
   */

  if (
    classification === 'most_recent_chaos_dungeon' ||
    classification.includes('chaos')
  ) {
    return 99;
  }

  return 50;
}

function selectPreferredLoadout(loadouts) {
  const candidates = (
    Array.isArray(loadouts)
      ? loadouts
      : []
  )
    .filter(Boolean)
    .filter(
      (loadout) =>
        loadoutPriority(loadout) < 99
    );

  if (!candidates.length) {
    return null;
  }

  return candidates
    .slice()
    .sort(
      (a, b) =>
        loadoutPriority(a) -
          loadoutPriority(b) ||
        new Date(
          b.lastUpdated || 0
        ) -
          new Date(
            a.lastUpdated || 0
          )
    )[0];
}

/* =========================================================
   RAID LOADOUT COMBAT POWER
   ========================================================= */

/*
 * IMPORTANT:
 *
 * We NEVER use the Combat Power in the character header.
 *
 * Bible can show the character's historical/highest CP there.
 *
 * Example:
 *
 *     header CP = 8740.84
 *
 * But the actual selected raid loadout CP is:
 *
 *     <span class="text-red-400">8348.83</span>
 *
 * That 8348.83 value is what the optimizer needs.
 */

function extractRaidLoadoutCP(
  doc,
  selectedLoadout
) {
  if (
    selectedLoadout !==
      'Estimated Raid Loadout' &&
    selectedLoadout !==
      'Current Loadout (Raid)'
  ) {
    return null;
  }

  const possible = [];

  /*
   * First look for the exact visual class Bible uses
   * for the selected raid loadout CP.
   */

  for (
    const element of
    doc.querySelectorAll(
      'span.text-red-400'
    )
  ) {
    const text = (
      element.textContent || ''
    )
      .replace(/,/g, '')
      .trim();

    if (
      /^\d+(?:\.\d+)?$/.test(text)
    ) {
      const value = Number(text);

      if (
        value >= 5000 &&
        value <= 50000
      ) {
        possible.push({
          value,
          element,
        });
      }
    }
  }

  if (possible.length) {
    return possible[0].value;
  }

  /*
   * Fallback in case Bible changes the class.
   *
   * We look for plausible CP-sized spans,
   * but NEVER specifically target the header
   * "Combat Power" section.
   */

  const allPossible = [];

  for (
    const element of
    doc.querySelectorAll('span')
  ) {
    const text = (
      element.textContent || ''
    )
      .replace(/,/g, '')
      .trim();

    if (
      !/^\d+(?:\.\d+)?$/.test(text)
    ) {
      continue;
    }

    const value = Number(text);

    if (
      value >= 5000 &&
      value <= 50000
    ) {
      allPossible.push({
        value,
        element,
      });
    }
  }

  return allPossible.length
    ? allPossible[0].value
    : null;
}

/* =========================================================
   PROFILE PARSER
   ========================================================= */

function parseProfile(
  html,
  expectedName
) {
  const doc =
    new DOMParser().parseFromString(
      html,
      'text/html'
    );

  const lines = linesFromDoc(doc);

  const name = (
    doc.querySelector('h1')
      ?.textContent ||
    expectedName
  ).trim();

  /*
   * Class
   */

  const nameIndex =
    lines.findIndex(
      (line) => line === name
    );

  let characterClass = null;

  for (
    let i = Math.max(
      0,
      nameIndex - 6
    );
    i <
    Math.min(
      lines.length,
      nameIndex + 8
    );
    i++
  ) {
    const hit =
      CLASS_NAMES.find(
        (className) =>
          lines[i].toLowerCase() ===
          className.toLowerCase()
      );

    if (hit) {
      characterClass = hit;
      break;
    }
  }

  /*
   * Loadout buttons
   */

  const loadoutButtons = [
    ...doc.querySelectorAll('button'),
  ].map((element) => ({
    text: (
      element.textContent || ''
    )
      .replace(/\s+/g, ' ')
      .trim(),
    element,
  }));

  const estimatedButton =
    loadoutButtons.find(
      (button) =>
        /estimated raid loadout/i.test(
          button.text
        )
    );

  const currentRaidButton =
    loadoutButtons.find(
      (button) =>
        /current loadout\s*\(raid\)/i.test(
          button.text
        )
    );

  const chaosButton =
    loadoutButtons.find(
      (button) =>
        /chaos dungeon loadout/i.test(
          button.text
        )
    );

  /*
   * Established priority:
   *
   * 1. Estimated Raid Loadout
   * 2. Current Loadout (Raid)
   * 3. No acceptable raid loadout
   *
   * Chaos Dungeon is never selected.
   */

  let selectedLoadout =
    'No acceptable raid loadout found';

  if (estimatedButton) {
    selectedLoadout =
      'Estimated Raid Loadout';
  } else if (currentRaidButton) {
    selectedLoadout =
      'Current Loadout (Raid)';
  }

  /*
   * RAID CP
   *
   * Do NOT use the header CP.
   */

  const cp =
    extractRaidLoadoutCP(
      doc,
      selectedLoadout
    );

  /*
   * Item Level
   */

  let ilvl = null;

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    if (
      /^Item Level$/i.test(
        lines[i]
      )
    ) {
      for (
        let j = i + 1;
        j <
        Math.min(
          lines.length,
          i + 4
        );
        j++
      ) {
        const match =
          lines[j].match(
            /^([\d,.]+)$/
          );

        if (match) {
          ilvl = Number(
            match[1].replace(
              /,/g,
              ''
            )
          );
          break;
        }
      }

      if (ilvl != null) {
        break;
      }
    }
  }

  /*
   * Ark Grid
   */

  const arkGrid = [];

  const gridStart =
    lines.findIndex(
      (line) =>
        line === 'Ark Grid'
    );

  if (gridStart >= 0) {
    for (
      let i = gridStart + 1;
      i <
      Math.min(
        lines.length,
        gridStart + 110
      );
      i++
    ) {
      if (
        /^(Elemental Entwinement|Amplified Entwinement|Command Awakening|Flashy Attack|Absorbing Strike|Attack)$/.test(
          lines[i]
        )
      ) {
        arkGrid.push(
          lines[i]
        );
      }
    }
  }

  /*
   * Engravings
   */

  const engravings = [];

  const engravingStart =
    lines.findIndex(
      (line) =>
        line === 'Engravings'
    );

  if (engravingStart >= 0) {
    for (
      let i =
        engravingStart + 1;
      i <
      Math.min(
        lines.length,
        engravingStart + 35
      );
      i++
    ) {
      const match =
        lines[i].match(
          /^(.+?)\s+(\d+)\/20(?:\s*[+]?\d+)?$/
        );

      if (match) {
        engravings.push({
          name: match[1],
          level: Number(
            match[2]
          ),
        });
      }
    }
  }

  /*
   * Ark Passive
   */

  const arkPassive = {};

  const arkPassiveStart =
    lines.findIndex(
      (line) =>
        line === 'Ark Passive'
    );

  if (arkPassiveStart >= 0) {
    for (
      let i =
        arkPassiveStart + 1;
      i <
      Math.min(
        lines.length,
        arkPassiveStart + 110
      );
      i++
    ) {
      const match =
        lines[i].match(
          /^(.*?)\s+Lv\.\s*(\d+)$/
        );

      if (
        match &&
        match[1] &&
        !/^T\d$/i.test(
          match[1]
        ) &&
        ![
          'Evolution',
          'Enlightenment',
          'Leap',
        ].includes(
          match[1].trim()
        )
      ) {
        arkPassive[
          match[1].trim()
        ] = Number(
          match[2]
        );
      }
    }
  }

  /*
   * Ark Grid effects
   */

  const gridEffects = [];

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const match =
      lines[i].match(
        /^Lv\.\s*(\d+)\s+(.+?)\s+([+-]\d+(?:\.\d+)?%)$/
      );

    if (match) {
      gridEffects.push({
        level: Number(
          match[1]
        ),
        effect: match[2],
        value: match[3],
      });
    }
  }

  /*
   * Summary values
   */

  const summary = {};

  for (
    const label of [
      'Ark Passive',
      'Ark Grid',
      'Engravings',
      'Accessory Effects',
      'Bracelet Effects',
      'Gems',
    ]
  ) {
    const index =
      lines.findIndex(
        (line) =>
          line === label
      );

    if (
      index >= 0 &&
      lines[index + 1] &&
      /^[+-]\d/.test(
        lines[index + 1]
      )
    ) {
      summary[label] =
        lines[index + 1];
    }
  }

  /*
   * Serialized loadout information.
   */

  let serializedLoadout = null;

  for (
    const script of
    [...doc.scripts]
  ) {
    const scriptText =
      script.textContent || '';

    if (
      /raid_merged|most_recent_raid|most_recent_chaos_dungeon/.test(
        scriptText
      )
    ) {
      serializedLoadout =
        scriptText;
      break;
    }
  }

  return {
    name,
    class:
      characterClass ||
      'Unknown',

    /*
     * This is RAID LOADOUT CP.
     *
     * It is deliberately NOT the
     * historical/header CP.
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

    loadout:
      selectedLoadout,

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

/* =========================================================
   BIBLE FETCH
   ========================================================= */

async function fetchCharacter(character) {
  const endpoint =
    `${BIBLE_CONNECTOR}?url=` +
    encodeURIComponent(
      character.url
    );

  const response =
    await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
    });

  let data;

  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      `Connector returned HTTP ${response.status}`
    );
  }

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data?.error ||
        `Connector returned HTTP ${response.status}`
    );
  }

  return parseProfile(
    data.html,
    character.name
  );
}

/* =========================================================
   REFRESH PROFILES
   ========================================================= */

async function refreshProfiles() {
  if (
    !state.characters.length
  ) {
    setStatus(
      'Add at least one character first'
    );
    return;
  }

  setStatus(
    'Refreshing specific character profiles…'
  );

  let successCount = 0;
  let failedCount = 0;

  for (
    const character of
    state.characters
  ) {
    try {
      character.profile =
        await fetchCharacter(
          character
        );

      delete character.profileError;

      successCount++;
    } catch (error) {
      character.profileError =
        error?.message ||
        'Profile retrieval failed.';

      failedCount++;
    }
  }

  save();
  render();

  if (failedCount) {
    setStatus(
      `Refreshed ${successCount} profile${
        successCount === 1
          ? ''
          : 's'
      }; ${failedCount} failed.`
    );
  } else {
    setStatus(
      `Refreshed ${successCount} profile${
        successCount === 1
          ? ''
          : 's'
      } from Bible.`
    );
  }
}

/* =========================================================
   CHARACTER REMOVAL
   ========================================================= */

function performRemoveCharacter(
  character
) {
  state.characters =
    state.characters.filter(
      (item) =>
        item.id !== character.id
    );

  save();

  /*
   * Keep this as a simple status message.
   * There is deliberately NO changelog/history section.
   */

  setStatus(
    `${character.name} removed`
  );

  render();
}

function removeCharacter(id) {
  const character =
    state.characters.find(
      (item) =>
        item.id === id
    );

  if (!character) {
    return;
  }

  /*
   * If the user previously chose
   * "Don't ask me again", remove directly.
   */

  if (
    localStorage.getItem(
      REMOVE_CONFIRM_KEY
    ) === '1'
  ) {
    performRemoveCharacter(
      character
    );

    return;
  }

  showRemoveDialog(
    character
  );
}

function showRemoveDialog(
  character
) {
  document
    .querySelector(
      '.remove-modal'
    )
    ?.remove();

  const overlay =
    document.createElement(
      'div'
    );

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
        <strong>${esc(
          character.name
        )}</strong>
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

  document.body.appendChild(
    overlay
  );

  const close = () =>
    overlay.remove();

  overlay
    .querySelector(
      '.remove-cancel'
    )
    .onclick = close;

  overlay.addEventListener(
    'click',
    (event) => {
      if (
        event.target ===
        overlay
      ) {
        close();
      }
    }
  );

  overlay
    .querySelector(
      '.remove-confirm'
    )
    .onclick = () => {
      const skip =
        overlay.querySelector(
          '#remove-confirm-skip'
        ).checked;

      if (skip) {
        localStorage.setItem(
          REMOVE_CONFIRM_KEY,
          '1'
        );
      }

      close();

      performRemoveCharacter(
        character
      );
    };

  overlay
    .querySelector(
      '.remove-confirm'
    )
    .focus();
}

/* =========================================================
   PARTY / OPTIMIZATION DISPLAY
   ========================================================= */

function renderSuggestions() {
  const element =
    $('#suggestedParties');

  if (!element) {
    return;
  }

  if (
    !state.characters.length
  ) {
    element.innerHTML =
      `
      <div class="empty-roster">
        Add specific character profiles to generate the two-party optimization.
      </div>
      `;

    return;
  }

  const complete =
    state.characters.filter(
      (character) =>
        character.profile
    );

  let partyContent = '';

  if (
    state.parties &&
    typeof state.parties ===
      'object'
  ) {
    partyContent =
      `
      <article class="party">
        <h3>Party Setup</h3>
        <div class="score">
          ${esc(
            JSON.stringify(
              state.parties
            )
          )}
        </div>
        <p class="privacy-note">
          Shared party information is stored locally and can be included in a snapshot.
        </p>
      </article>
      `;
  }

  element.innerHTML = `
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
          complete.length
            ? complete
                .map(
                  (character) =>
                    `${esc(
                      character.profile
                        ?.name ||
                        character.name
                    )} · ${esc(
                      character.profile
                        ?.class ||
                        'Unknown'
                    )} · ${fmt(
                      character.profile
                        ?.ilvl
                    )} · CP ${fmt(
                      character.profile
                        ?.cp
                    )}`
                )
                .join('<br>')
            : 'No complete profiles yet'
        }
      </div>

      <p class="privacy-note">
        Character-specific data only.
        No roster/siblings/account-wide endpoint is used.
      </p>
    </article>

    ${partyContent}
  `;
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

function render() {
  const characters =
    state.characters;

  const ilvls =
    characters
      .map(
        (character) =>
          character.profile
            ?.ilvl
      )
      .filter(
        Number.isFinite
      );

  const cps =
    characters
      .map(
        (character) =>
          character.profile
            ?.cp
      )
      .filter(
        Number.isFinite
      );

  const playerCount =
    $('#playerCount');

  if (playerCount) {
    playerCount.textContent =
      `${characters.length} / ${MAX_CHARACTERS}`;
  }

  const avgIlvl =
    $('#avgIlvl');

  if (avgIlvl) {
    avgIlvl.textContent =
      ilvls.length
        ? Math.round(
            ilvls.reduce(
              (total, value) =>
                total + value,
              0
            ) / ilvls.length
          )
        : '—';
  }

  const avgCp =
    $('#avgCp');

  if (avgCp) {
    avgCp.textContent =
      cps.length
        ? Math.round(
            cps.reduce(
              (total, value) =>
                total + value,
              0
            ) / cps.length
          ).toLocaleString()
        : '—';
  }

  const dataMode =
    $('#dataMode');

  if (dataMode) {
    dataMode.textContent =
      'Bible profiles';
  }

  const rosterNote =
    $('#rosterNote');

  if (rosterNote) {
    rosterNote.textContent =
      'Only explicitly supplied character URLs are retrieved. No roster/account-wide data is imported. Raid loadout priority: Estimated Raid → Current Loadout (Raid). Chaos Dungeon is never selected.';
  }

  const roster =
    $('#roster');

  if (roster) {
    roster.innerHTML =
      characters
        .map(
          (character) => {
            const profile =
              character.profile;

            return `
              <article class="character">

                <div class="character-head">

                  <div>
                    <h3>
                      ${esc(
                        profile?.name ||
                          character.name
                      )}
                    </h3>

                    <div class="class">
                      ${esc(
                        profile?.class ||
                          'Profile pending'
                      )}
                    </div>
                  </div>

                  <button
                    class="remove-character"
                    data-id="${esc(
                      character.id
                    )}"
                    type="button"
                    aria-label="Remove ${esc(
                      character.name
                    )}"
                  >
                    Remove
                  </button>

                </div>

                <div class="stats">

                  <div class="stat">
                    iLvl
                    <b>
                      ${fmt(
                        profile?.ilvl
                      )}
                    </b>
                  </div>

                  <div class="stat">
                    CP
                    <b>
                      ${fmt(
                        profile?.cp
                      )}
                    </b>
                  </div>

                </div>

                <div class="privacy-note">
                  ${
                    profile
                      ? `Bible profile loaded · ${esc(
                          profile.loadout ||
                            'Raid loadout'
                        )} page data`
                      : esc(
                          character.profileError ||
                            'Profile pending'
                        )
                  }
                </div>

              </article>
            `;
          }
        )
        .join('') ||
      `
        <div class="empty-roster">
          No designated main characters have been added.
        </div>
      `;

    document
      .querySelectorAll(
        '.remove-character'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () =>
              removeCharacter(
                button.dataset.id
              )
          );
        }
      );
  }

  renderSuggestions();
}

/* =========================================================
   ADD CHARACTER
   ========================================================= */

function addCharacter() {
  const input =
    $('#characterUrl');

  if (!input) {
    return;
  }

  if (
    state.characters.length >=
    MAX_CHARACTERS
  ) {
    setStatus(
      `Maximum of ${MAX_CHARACTERS} designated characters reached.`
    );

    return;
  }

  const value =
    input.value.trim();

  const parsed =
    bibleUrl(value);

  if (!parsed) {
    setStatus(
      'Enter a valid lostark.bible character URL'
    );

    return;
  }

  const duplicate =
    state.characters.some(
      (character) =>
        character.url ===
        parsed.url
    );

  if (duplicate) {
    setStatus(
      'That character is already added'
    );

    return;
  }

  state.characters.push({
    id: crypto.randomUUID(),
    ...parsed,
    profile: null,
  });

  save();

  input.value = '';

  setStatus(
    'Character added locally; click Refresh Profiles to retrieve it'
  );

  render();
}

/* =========================================================
   OPTIMIZE
   ========================================================= */

function optimizeParties() {
  const complete =
    state.characters.filter(
      (character) =>
        character.profile
    );

  if (
    complete.length < 2
  ) {
    setStatus(
      'Load at least two complete character profiles first'
    );

    renderSuggestions();

    return;
  }

  /*
   * The real scoring engine can populate
   * state.parties later.
   *
   * Keeping this field in state means the
   * Share Snapshot feature automatically
   * carries it when it exists.
   */

  setStatus(
    'Optimization scoring is the next layer; character retrieval is active.'
  );

  renderSuggestions();
}

/* =========================================================
   CHARACTER COMPARISON
   ========================================================= */

async function compareCharacter() {
  const input =
    $('#testCharacterUrl');

  if (!input) {
    return;
  }

  const parsed =
    bibleUrl(
      input.value.trim()
    );

  if (!parsed) {
    setStatus(
      'Enter a valid Bible character URL for the test character'
    );

    return;
  }

  const testCharacter = {
    ...parsed,
  };

  setStatus(
    `Retrieving ${parsed.name}…`
  );

  try {
    testCharacter.profile =
      await fetchCharacter(
        testCharacter
      );

    state.testCharacter =
      testCharacter;

    save();

    const comparison =
      $('#comparison');

    if (comparison) {
      comparison.innerHTML = `
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
                testCharacter.profile
                  .name
              )}
              ·
              ${esc(
                testCharacter.profile
                  .class
              )}
            </b>

            <div class="delta">
              iLvl
              ${fmt(
                testCharacter.profile
                  .ilvl
              )}
              · CP
              ${fmt(
                testCharacter.profile
                  .cp
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
                testCharacter.profile
                  .loadout
              )}.
              Optimization percentage
              will be calculated after
              the party scoring engine
              is enabled.
            </div>
          </div>

        </div>
      `;
    }

    setStatus(
      `Loaded test character ${testCharacter.profile.name}`
    );
  } catch (error) {
    setStatus(
      `Test character retrieval failed: ${
        error?.message ||
        'Unknown error'
      }`
    );
  }
}

/* =========================================================
   SHARE SNAPSHOT
   ========================================================= */

/*
 * The snapshot contains only the dashboard's
 * parsed character/profile state.
 *
 * It does NOT contain the raw Bible HTML.
 *
 * That keeps the share URL substantially smaller
 * and avoids unnecessarily copying the entire
 * source page into the URL.
 */

function createShareState() {
  return {
    version: 1,

    characters:
      state.characters.map(
        (character) => ({
          id: character.id,
          url: character.url,
          region: character.region,
          name: character.name,
          profile:
            character.profile ||
            null,
        })
      ),

    testCharacter:
      state.testCharacter ||
      null,

    parties:
      state.parties ||
      null,

    createdAt:
      new Date().toISOString(),
  };
}

function encodeSnapshot(
  value
) {
  const json =
    JSON.stringify(value);

  /*
   * UTF-8 safe Base64.
   */

  const bytes =
    new TextEncoder().encode(
      json
    );

  let binary = '';

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        i + chunkSize
      )
    );
  }

  /*
   * URL-safe Base64.
   */

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeSnapshot(
  encoded
) {
  try {
    const normalized =
      encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const padding =
      normalized.length % 4;

    const padded =
      normalized +
      (padding
        ? '='.repeat(
            4 - padding
          )
        : '');

    const binary =
      atob(padded);

    const bytes =
      Uint8Array.from(
        binary,
        (character) =>
          character.charCodeAt(0)
      );

    const json =
      new TextDecoder().decode(
        bytes
      );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getSnapshotFromUrl() {
  const hash =
    window.location.hash || '';

  if (
    !hash.startsWith(
      SHARE_PREFIX
    )
  ) {
    return null;
  }

  const encoded =
    hash.slice(
      SHARE_PREFIX.length
    );

  if (!encoded) {
    return null;
  }

  return decodeSnapshot(
    encoded
  );
}

function applySharedSnapshot() {
  const snapshot =
    getSnapshotFromUrl();

  if (
    !snapshot ||
    !Array.isArray(
      snapshot.characters
    )
  ) {
    return false;
  }

  const imported =
    normalizeState({
      characters:
        snapshot.characters,
      testCharacter:
        snapshot.testCharacter ||
        null,
      parties:
        snapshot.parties ||
        null,
    });

  state.characters =
    imported.characters;

  state.testCharacter =
    imported.testCharacter;

  state.parties =
    imported.parties;

  save();

  /*
   * Remove the large snapshot from
   * the visible URL after importing.
   *
   * The imported data remains in localStorage.
   */

  try {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname +
        window.location.search
    );
  } catch {
    /*
     * Not fatal.
     */
  }

  return true;
}

async function shareSnapshot() {
  const snapshot =
    createShareState();

  const encoded =
    encodeSnapshot(
      snapshot
    );

  const url =
    `${window.location.origin}${window.location.pathname}${window.location.search}${SHARE_PREFIX}${encoded}`;

  /*
   * Try the modern clipboard API first.
   */

  try {
    await navigator.clipboard.writeText(
      url
    );

    setStatus(
      'Share link copied to clipboard.'
    );

    return;
  } catch {
    /*
     * Fall through to the textarea fallback.
     */
  }

  /*
   * Fallback for browsers where clipboard
   * permissions are unavailable.
   */

  const textarea =
    document.createElement(
      'textarea'
    );

  textarea.value = url;
  textarea.setAttribute(
    'readonly',
    ''
  );

  textarea.style.position =
    'fixed';
  textarea.style.left =
    '-9999px';
  textarea.style.top =
    '0';

  document.body.appendChild(
    textarea
  );

  textarea.select();

  let copied = false;

  try {
    copied =
      document.execCommand(
        'copy'
      );
  } catch {
    copied = false;
  }

  textarea.remove();

  if (copied) {
    setStatus(
      'Share link copied to clipboard.'
    );
  } else {
    /*
     * If clipboard access is blocked,
     * display the link so it can still
     * be copied manually.
     */

    window.prompt(
      'Copy this share link:',
      url
    );

    setStatus(
      'Share link generated.'
    );
  }
}

/* =========================================================
   SHARE BUTTON
   ========================================================= */

function setupShareButton() {
  const button =
    $('#shareBtn');

  if (!button) {
    return;
  }

  button.addEventListener(
    'click',
    shareSnapshot
  );
}

/* =========================================================
   EVENT HANDLERS
   ========================================================= */

function setupEventHandlers() {
  const addButton =
    $('#addCharacterBtn');

  if (addButton) {
    addButton.addEventListener(
      'click',
      addCharacter
    );
  }

  const refreshButton =
    $('#refreshBtn');

  if (refreshButton) {
    refreshButton.addEventListener(
      'click',
      refreshProfiles
    );
  }

  const optimizeButton =
    $('#optimizeBtn');

  if (optimizeButton) {
    optimizeButton.addEventListener(
      'click',
      optimizeParties
    );
  }

  const compareButton =
    $('#compareBtn');

  if (compareButton) {
    compareButton.addEventListener(
      'click',
      compareCharacter
    );
  }

  /*
   * Allow Enter in the Add Character
   * input to add the character.
   */

  const characterInput =
    $('#characterUrl');

  if (characterInput) {
    characterInput.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key ===
          'Enter'
        ) {
          event.preventDefault();
          addCharacter();
        }
      }
    );
  }

  /*
   * Allow Enter in the comparison input.
   */

  const testInput =
    $('#testCharacterUrl');

  if (testInput) {
    testInput.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key ===
          'Enter'
        ) {
          event.preventDefault();
          compareCharacter();
        }
      }
    );
  }

  setupShareButton();
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {
  /*
   * If this URL contains a snapshot,
   * import it before rendering.
   */

  const imported =
    applySharedSnapshot();

  setupEventHandlers();

  render();

  if (imported) {
    setStatus(
      'Shared snapshot loaded.'
    );
  }
}

initialize();
