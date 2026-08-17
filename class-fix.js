/* Lost Ark Hideout — class correction layer
 *
 * Bible's rendered HTML can contain other class names in skills, engravings,
 * or historical/profile text. The previous parser could therefore choose the
 * first class token it encountered. For the current designated mains we use
 * the character identity as an authoritative correction.
 *
 * This layer only corrects class labels in the locally stored profile snapshot;
 * it does not retrieve any additional account/roster data.
 */
(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const LEGACY_KEY = 'lostark-hideout-private-v2';

  const CLASS_OVERRIDES = {
    ryohaku: 'Glavier'
  };

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function fixStoredProfiles() {
    let storageKey = STORAGE_KEY;
    let state;

    try {
      state = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!state || !Array.isArray(state.characters)) {
        storageKey = LEGACY_KEY;
        state = JSON.parse(localStorage.getItem(storageKey) || 'null');
      }
    } catch {
      return false;
    }

    if (!state || !Array.isArray(state.characters)) return false;

    let changed = false;

    for (const character of state.characters) {
      const identity = normalize(character?.name || character?.profile?.name);
      const override = CLASS_OVERRIDES[identity];

      if (override && character.profile && character.profile.class !== override) {
        character.profile.class = override;
        changed = true;
      }
    }

    if (!changed) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  }

  // app-fixed.js has already initialized by the time this script runs.
  // Correct the persisted snapshot and reload once so its internal state
  // picks up the corrected class value.
  const changed = fixStoredProfiles();

  if (changed && !sessionStorage.getItem('lostark-hideout-class-fix-v1')) {
    sessionStorage.setItem('lostark-hideout-class-fix-v1', '1');
    window.location.reload();
  }
})();
