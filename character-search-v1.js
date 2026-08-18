(() => {
  const SEARCH = 'https://lostark-bible-connector.seraph0226.workers.dev/search';
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  let timer = null, requestId = 0;
  async function search(region, name) {
    const response = await fetch(`${SEARCH}?region=${encodeURIComponent(region)}&name=${encodeURIComponent(name)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || 'Search failed');
    return Array.isArray(data.results) ? data.results : [];
  }
  function render(results) {
    const box = $('#characterCandidates'); if (!box) return;
    box.innerHTML = results.map((c, i) => `<button type="button" class="character-candidate" data-index="${i}"><span class="character-candidate-main"><span class="character-candidate-name">${esc(c.name)}</span><small>${esc(c.region || '')}${c.exact ? ' · Exact name' : ''}</small></span></button>`).join('');
    box.querySelectorAll('.character-candidate').forEach(button => button.addEventListener('click', () => {
      const c = results[Number(button.dataset.index)]; if (!c) return;
      const input = $('#characterName'); input.value = c.name; input.dataset.selectedUrl = c.url; box.innerHTML = '';
      $('#status').textContent = 'Character selected. Click Find Character to add it.';
    }));
  }
  async function liveSearch() {
    const input = $('#characterName'); const name = (input?.value || '').trim(); const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    if (name.length < 2) { $('#characterCandidates').innerHTML = ''; return; }
    const id = ++requestId; $('#characterCandidates').innerHTML = '<div class="character-candidate-status">Searching Bible…</div>';
    try { const results = await search(region, name); if (id === requestId) render(results); }
    catch { if (id === requestId) $('#characterCandidates').innerHTML = '<div class="character-candidate-status">Search unavailable.</div>'; }
  }
  function addCharacter() {
    const input = $('#characterName'); const region = ($('#characterRegion')?.value || 'NA').toUpperCase(); const name = (input?.value || '').trim(); const url = input?.dataset.selectedUrl || '';
    if (!name || !url) { $('#status').textContent = 'Select a matching Bible character first.'; return; }
    let state; try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { state = null; }
    if (!state || !Array.isArray(state.characters)) state = { characters: [] };
    if (state.characters.length >= MAX_CHARACTERS) { $('#status').textContent = `Maximum of ${MAX_CHARACTERS} characters reached.`; return; }
    if (state.characters.some(c => c.url === url)) { $('#status').textContent = 'That character is already added.'; return; }
    state.characters.push({ id: crypto.randomUUID(), url, region, name, profile: null }); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); location.reload();
  }
  function init() {
    const input = $('#characterName'), find = $('#findCharacterBtn'); if (!input || !find || find.dataset.searchV5) return; find.dataset.searchV5 = '1';
    input.addEventListener('input', () => { input.dataset.selectedUrl = ''; clearTimeout(timer); timer = setTimeout(liveSearch, 250); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCharacter(); } });
    find.addEventListener('click', e => { e.preventDefault(); addCharacter(); });
    $('#characterRegion')?.addEventListener('change', () => { input.dataset.selectedUrl = ''; liveSearch(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();