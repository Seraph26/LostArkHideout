// Correct known Lost Ark class names when the Bible page text contains unrelated class names.
// Character-specific corrections are intentionally limited to legacy profiles that predate
// the authoritative Bible class-id parser. New profiles use class-data-v1.js instead.
(() => {
  const KEY = 'lostark-hideout-private-v3';
  const CORRECTIONS = new Map([
    ['ryohaku', 'Glavier'],
    ['bailsxo', 'Artist']
  ]);

  function apply() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state || !Array.isArray(state.characters)) return;
      let changed = false;
      for (const character of state.characters) {
        const name = String(character?.profile?.name || character?.name || '').trim().toLowerCase();
        const corrected = CORRECTIONS.get(name);
        if (corrected && character.profile && character.profile.class !== corrected) {
          character.profile.class = corrected;
          changed = true;
        }
      }
      if (changed) localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 50), {once:true});
  else setTimeout(apply, 50);
})();
