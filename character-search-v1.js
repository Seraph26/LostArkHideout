(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;
  const $ = (s) => document.querySelector(s);

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && Array.isArray(value.characters) ? value : null;
    } catch { return null; }
  }

  function recoverRoster() {
    const current = readObject(STORAGE_KEY);
    if (current?.characters?.length) return current;
    const candidates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.toLowerCase().includes('lostark-hideout')) continue;
      const value = readObject(key);
      if (value?.characters?.length) candidates.push(value);
    }
    if (!candidates.length) return current || { characters: [] };
    const recovered = candidates.sort((a, b) => b.characters.length - a.characters.length)[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recovered));
    return recovered;
  }

  function addCharacter() {
    const input = $('#characterName');
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = (input?.value || '').trim();
    if (!name) { $('#status').textContent = 'Enter a character name.'; return; }
    const state = recoverRoster();
    if (!Array.isArray(state.characters)) state.characters = [];
    if (state.characters.length >= MAX_CHARACTERS) { $('#status').textContent = `Maximum of ${MAX_CHARACTERS} characters reached.`; return; }
    const url = `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
    if (state.characters.some(c => c.url === url || ((c.name || '').toLowerCase() === name.toLowerCase() && (c.region || '').toUpperCase() === region))) {
      $('#status').textContent = 'That character is already added.';
      return;
    }
    state.characters.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, url, region, name, profile: null });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.reload();
  }

  function init() {
    recoverRoster();
    const input = $('#characterName');
    const button = $('#findCharacterBtn');
    if (!input || !button || button.dataset.directUrlEntry === '1') return;
    button.dataset.directUrlEntry = '1';
    button.addEventListener('click', (event) => { event.preventDefault(); addCharacter(); });
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addCharacter(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
