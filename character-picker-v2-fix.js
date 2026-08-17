(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('#characterCandidates .character-candidate');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const name = button.dataset.name || button.querySelector('.character-candidate-name')?.textContent?.trim();
    const region = (button.dataset.region || document.querySelector('#characterRegion')?.value || 'NA').toUpperCase();
    const url = button.dataset.url || `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name || '')}`;
    if (!name) return;

    let state;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { state = null; }
    if (!state || !Array.isArray(state.characters)) state = { characters: [] };
    if (state.characters.length >= MAX_CHARACTERS) {
      const statusEl = document.querySelector('#status');
      if (statusEl) statusEl.textContent = `Maximum of ${MAX_CHARACTERS} characters reached.`;
      return;
    }
    if (state.characters.some(c => c.url === url)) {
      const statusEl = document.querySelector('#status');
      if (statusEl) statusEl.textContent = 'That character is already added.';
      return;
    }

    state.characters.push({ id: crypto.randomUUID(), url, region, name, profile: null });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.reload();
  }, true);
})();
