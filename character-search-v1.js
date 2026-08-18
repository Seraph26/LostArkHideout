(() => {
  const SEARCH = 'https://lostark-bible-connector.seraph0226.workers.dev/search';
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const profileUrl = (region, name) => `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
  let timer = null;
  let requestId = 0;

  function decodeResults(body, region) {
    let outer;
    try { outer = typeof body === 'string' ? JSON.parse(body) : body; } catch { return []; }
    let data = outer?.data;
    if (typeof data !== 'string') return [];
    try { data = JSON.parse(data); } catch { return []; }
    if (!Array.isArray(data)) return [];

    const results = [];
    for (let i = 0; i < data.length; i++) {
      if (!Array.isArray(data[i])) continue;
      const name = data[i + 1];
      const classKey = data[i + 2];
      const ilvl = data[i + 3];
      if (typeof name === 'string' && typeof classKey === 'string') {
        results.push({ name, classKey, ilvl: Number.isFinite(Number(ilvl)) ? Number(ilvl) : null, region, url: profileUrl(region, name) });
      }
    }
    return results;
  }

  async function search(region, name) {
    const response = await fetch(`${SEARCH}?region=${encodeURIComponent(region)}&name=${encodeURIComponent(name)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || 'Search failed');
    return decodeResults(data.data, region);
  }

  function classLabel(key) {
    const map = { berserker:'Berserker', destroyer:'Destroyer', warlord:'Gunlancer', paladin:'Paladin', slayer:'Slayer', arcana:'Arcanist', arcanist:'Arcanist', bard:'Bard', sorceress:'Sorceress', elemental_master:'Sorceress', summoner:'Summoner', gunslinger:'Gunslinger', deadeye:'Deadeye', sharpshooter:'Sharpshooter', artillerist:'Artillerist', machinist:'Machinist', glaivier:'Glaivier', lance_master:'Glaivier', scrapper:'Scrapper', soulfist:'Soulfist', wardancer:'Wardancer', battle_master:'Wardancer', striker:'Striker', breaker:'Breaker', deathblade:'Deathblade', shadowhunter:'Shadowhunter', reaper:'Reaper', souleater:'Souleater', artist:'Artist', aeromancer:'Aeromancer', wildsoul:'Wildsoul' };
    return map[String(key || '').toLowerCase()] || String(key || 'Unknown').replace(/_/g, ' ');
  }

  function render(boxId, results, inputId) {
    const box = $(boxId);
    if (!box) return;
    box.innerHTML = results.map((c, i) => `<button type="button" class="character-candidate" data-index="${i}"><span class="character-candidate-main"><span class="character-candidate-name">${esc(c.name)}</span><small>${c.ilvl ? `${esc(c.ilvl)} · ` : ''}${esc(classLabel(c.classKey))}</small></span></button>`).join('');
    box.querySelectorAll('.character-candidate').forEach(button => button.addEventListener('click', () => {
      const result = results[Number(button.dataset.index)];
      if (!result) return;
      const input = $(inputId);
      if (input) { input.value = result.name; input.dataset.selectedUrl = result.url; }
      if (inputId === '#comparisonName') $('#testCharacterUrl').value = result.url;
      box.innerHTML = '';
      if (inputId === '#characterName') $('#status').textContent = 'Character selected. Click Find Character to add it.';
    }));
  }

  async function mainLive() {
    const input = $('#characterName');
    const name = (input?.value || '').trim();
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    if (name.length < 2) { $('#characterCandidates').innerHTML = ''; return; }
    const id = ++requestId;
    try { const results = await search(region, name); if (id === requestId) render('#characterCandidates', results, '#characterName'); }
    catch { if (id === requestId) $('#characterCandidates').innerHTML = ''; }
  }

  function addCharacter() {
    const input = $('#characterName');
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = (input?.value || '').trim();
    const url = input?.dataset.selectedUrl || '';
    if (!name || !url) { $('#status').textContent = 'Select a matching Bible character first.'; return; }
    let state; try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { state = null; }
    if (!state || !Array.isArray(state.characters)) state = { characters: [] };
    if (state.characters.length >= MAX_CHARACTERS) { $('#status').textContent = `Maximum of ${MAX_CHARACTERS} characters reached.`; return; }
    if (state.characters.some(c => c.url === url)) { $('#status').textContent = 'That character is already added.'; return; }
    state.characters.push({ id: crypto.randomUUID(), url, region, name, profile: null });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.reload();
  }

  function init() {
    const main = $('#characterName');
    const find = $('#findCharacterBtn');
    if (main && find && !find.dataset.searchV3) {
      find.dataset.searchV3 = '1';
      main.addEventListener('input', () => { main.dataset.selectedUrl = ''; clearTimeout(timer); timer = setTimeout(mainLive, 250); });
      main.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCharacter(); } });
      find.addEventListener('click', e => { e.preventDefault(); addCharacter(); });
      $('#characterRegion')?.addEventListener('change', () => { main.dataset.selectedUrl = ''; mainLive(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
