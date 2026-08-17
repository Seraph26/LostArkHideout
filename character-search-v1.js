(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const profileUrl = (region, name) => `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;

  function addCharacter(region, name, url) {
    if (!name) return;
    let state;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { state = null; }
    if (!state || !Array.isArray(state.characters)) state = { characters: [] };
    if (state.characters.length >= MAX_CHARACTERS) { $('#status').textContent = `Maximum of ${MAX_CHARACTERS} characters reached.`; return; }
    if (state.characters.some(c => c.url === url)) { $('#status').textContent = 'That character is already added.'; return; }
    state.characters.push({ id: crypto.randomUUID(), url, region, name, profile: null });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.reload();
  }

  function mainFind() {
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const input = $('#characterName');
    const name = (input?.value || '').trim();
    if (!name) { $('#status').textContent = 'Enter a character name first.'; return; }
    const url = input.dataset.selectedUrl || profileUrl(region, name);
    addCharacter(region, name, url);
  }

  function comparisonFind() {
    const region = ($('#comparisonRegion')?.value || 'NA').toUpperCase();
    const input = $('#comparisonName');
    const name = (input?.value || '').trim();
    if (!name) return;
    const url = input.dataset.selectedUrl || profileUrl(region, name);
    $('#testCharacterUrl').value = url;
    const box = $('#comparisonCandidates');
    if (box) box.innerHTML = `<button type="button" class="character-candidate" data-url="${esc(url)}"><span class="character-candidate-main"><span class="character-candidate-name">${esc(name)}</span><small>Use this Bible profile</small></span></button>`;
  }

  function init() {
    const main = $('#characterName'), find = $('#findCharacterBtn');
    if (main && find && !find.dataset.searchV2) {
      find.dataset.searchV2 = '1';
      main.addEventListener('input', () => { main.dataset.selectedUrl = ''; });
      main.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); mainFind(); } });
      find.addEventListener('click', e => { e.preventDefault(); mainFind(); });
      $('#characterRegion')?.addEventListener('change', () => { main.dataset.selectedUrl = ''; });
    }
    const cmp = $('#comparisonName'), cmpFind = $('#comparisonFindBtn');
    if (cmp && cmpFind && !cmpFind.dataset.searchV2) {
      cmpFind.dataset.searchV2 = '1';
      cmp.addEventListener('input', () => { cmp.dataset.selectedUrl = ''; $('#testCharacterUrl').value = ''; });
      cmp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); comparisonFind(); } });
      cmpFind.addEventListener('click', e => { e.preventDefault(); comparisonFind(); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
