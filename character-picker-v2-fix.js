(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('.character-candidate');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const name = button.querySelector('.character-candidate-name')?.textContent?.trim();
    const region = button.querySelector('small')?.textContent?.trim().split(' · ')[0] || ($('#characterRegion')?.value || 'NA').toUpperCase();
    const input = document.querySelector('#characterName');
    if (!name || !input) return;
    input.value = name;
    input.focus();

    const status = document.querySelector('#status')?.textContent || '';
    const isConfirmedSearch = /matching character.*found|select the character to add/i.test(status);
    if (!isConfirmedSearch) return;

    let state;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { state = null; }
    if (!state || !Array.isArray(state.characters)) state = { characters: [] };
    if (state.characters.length >= MAX_CHARACTERS) return;

    const url = `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
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
