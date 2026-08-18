(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;
  const $ = (s) => document.querySelector(s);

  function addCharacter() {
    const input = $('#characterName');
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = (input?.value || '').trim();
    if (!name) { $('#status').textContent = 'Enter a character name.'; return; }
    const url = `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
    let state;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { state = null; }
    if (!state || !Array.isArray(state.characters)) state = { characters: [] };
    if (state.characters.length >= MAX_CHARACTERS) { $('#status').textContent = `Maximum of ${MAX_CHARACTERS} characters reached.`; return; }
    if (state.characters.some(c => c.url === url)) { $('#status').textContent = 'That character is already added.'; return; }
    state.characters.push({ id: crypto.randomUUID(), url, region, name, profile: null });
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
