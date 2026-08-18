(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const LEGACY_KEY = 'lostark-hideout-private-v2';
  const MAX_CHARACTERS = 8;
  const $ = (s) => document.querySelector(s);

  function readState() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (current && Array.isArray(current.characters) && current.characters.length) return current;
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy && Array.isArray(legacy.characters)) return legacy;
    } catch {}
    return { characters: [] };
  }

  function addCharacter() {
    const input = $('#characterName');
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = (input?.value || '').trim();
    if (!name) { $('#status').textContent = 'Enter a character name.'; return; }
    const url = `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
    const state = readState();
    if (!Array.isArray(state.characters)) state.characters = [];
    if (state.characters.length >= MAX_CHARACTERS) { $('#status').textContent = `Maximum of ${MAX_CHARACTERS} characters reached.`; return; }
    if (state.characters.some(c => c.url === url || ((c.name || '').toLowerCase() === name.toLowerCase() && (c.region || '').toUpperCase() === region))) { $('#status').textContent = 'That character is already added.'; return; }
    state.characters.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, url, region, name, profile: null });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.reload();
  }

  function init() {
    const input = $('#characterName');
    const find = $('#findCharacterBtn');
    if (!input || !find || find.dataset.urlEntry) return;
    find.dataset.urlEntry = '1';
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCharacter(); } });
    find.addEventListener('click', e => { e.preventDefault(); addCharacter(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
