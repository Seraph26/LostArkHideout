(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  let timer = null;

  function renderExactMatch() {
    const input = $('#characterName');
    const box = $('#characterCandidates');
    if (!input || !box) return;
    const name = input.value.trim();
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    if (name.length < 2) { box.innerHTML = ''; return; }

    const url = `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
    box.innerHTML = `<button type="button" class="character-candidate" data-url="${esc(url)}"><span class="character-candidate-main"><span class="character-candidate-name">${esc(name)}</span><small>${esc(region)} · Use this character</small></span></button>`;
    box.querySelector('.character-candidate').addEventListener('click', () => {
      input.dataset.selectedUrl = url;
      box.innerHTML = '<div class="character-candidate-status">Character selected. Click Find Character to add it.</div>';
      $('#status').textContent = 'Character selected. Click Find Character to add it.';
    });
  }

  function addCharacter() {
    const input = $('#characterName');
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = (input?.value || '').trim();
    const url = input?.dataset.selectedUrl || `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
    if (!name) { $('#status').textContent = 'Enter a character name.'; return; }

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
    if (!input || !find || find.dataset.searchV6) return;
    find.dataset.searchV6 = '1';
    input.addEventListener('input', () => {
      input.dataset.selectedUrl = '';
      clearTimeout(timer);
      timer = setTimeout(renderExactMatch, 100);
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCharacter(); } });
    find.addEventListener('click', e => { e.preventDefault(); addCharacter(); });
    $('#characterRegion')?.addEventListener('change', () => { input.dataset.selectedUrl = ''; renderExactMatch(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
