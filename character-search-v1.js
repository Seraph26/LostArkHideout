(() => {
  const BIBLE_SEARCH = 'https://lostark.bible/_app/remote/ngsbie/search';
  const CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const MAX_CHARACTERS = 8;
  const DELAY = 250;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const normalize = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const profileUrl = (region, name) => `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;

  const CLASS_INFO = {
    berserker:['Berserker','Warrior-Berserker'], destroyer:['Destroyer','Warrior-Destroyer'], warlord:['Gunlancer','Warrior-Gunlancer'], paladin:['Paladin','Warrior-Paladin'], warrior:['Warrior','Warrior'],
    slayer:['Slayer','Warrior-Slayer'], valkyrie:['Valkyrie',null],
    arcana:['Arcanist','Mage-Arcanist'], arcanist:['Arcanist','Mage-Arcanist'], bard:['Bard','Mage-Bard'], sorceress:['Sorceress','Mage-Sorceress'], elemental_master:['Sorceress','Mage-Sorceress'], summoner:['Summoner','Mage-Summoner'],
    gunslinger:['Gunslinger','Gunner-Gunslinger'], deadeye:['Deadeye','Gunner-Deadeye'], sharpshooter:['Sharpshooter','Gunner-Sharpshooter'], artillerist:['Artillerist','Gunner-Artillerist'], machinist:['Machinist',null],
    glaivier:['Glaivier','Martial Artist-Glaivier'], lance_master:['Glaivier','Martial Artist-Glaivier'], scrapper:['Scrapper','Martial Artist-Scrapper'], soulfist:['Soulfist','Martial Artist-Soulfist'], wardancer:['Wardancer','Martial Artist-Wardancer'], battle_master:['Wardancer','Martial Artist-Wardancer'], striker:['Striker','Martial Artist-Striker'], breaker:['Breaker',null],
    deathblade:['Deathblade','Assassin-Deathblade'], shadowhunter:['Shadowhunter','Assassin-Shadowhunter'], reaper:['Reaper','Assassin-Reaper'], souleater:['Souleater',null],
    artist:['Artist','Specialist-Artist'], aeromancer:['Aeromancer','Specialist-Aeromancer'], wildsoul:['Wildsoul',null]
  };

  let timer = null;
  let requestId = 0;

  function classInfo(key) {
    return CLASS_INFO[String(key || '').toLowerCase()] || [String(key || 'Unknown').replace(/_/g,' '), null];
  }

  function iconUrl(key) {
    const file = classInfo(key)[1];
    return file ? `https://lostark.fandom.com/wiki/Special:Redirect/file/ClassIcon-${encodeURIComponent(file)}.png` : '';
  }

  function makePayload(name, region) {
    // This is the exact SvelteKit remote-function payload used by Bible's own search.
    const value = JSON.stringify([["__skrao",1],{"name":2,"region":3},String(name),String(region)]);
    return btoa(unescape(encodeURIComponent(value))).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  }

  function parseBibleResponse(body, region) {
    let outer = body;
    if (typeof outer === 'string') {
      try { outer = JSON.parse(outer); } catch { return []; }
    }
    const raw = typeof outer?.data === 'string' ? outer.data : outer?.data;
    if (!raw) return [];
    let data = raw;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return []; }
    }
    if (!Array.isArray(data)) return [];

    const results = [];
    for (let i = 3; i + 2 < data.length; i++) {
      if (Array.isArray(data[i])) {
        const name = data[i + 1];
        const classKey = data[i + 2];
        const ilvl = data[i + 3];
        if (typeof name === 'string' && typeof classKey === 'string' && typeof ilvl === 'number') {
          results.push({region, name, classKey, ilvl, url: profileUrl(region, name)});
          i += 3;
        }
      }
    }
    return results;
  }

  async function requestBibleSearch(name, region) {
    const payload = makePayload(name, region);
    const endpoint = `${BIBLE_SEARCH}?payload=${encodeURIComponent(payload)}`;

    // Bible's browser request is a GET to this exact remote-function endpoint.
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Bible search HTTP ${response.status}`);
    return parseBibleResponse(text, region);
  }

  async function search(region, value) {
    const name = String(value || '').trim();
    if (name.length < 2) return [];

    // Bible itself performs the accent-insensitive matching. We send the exact
    // text entered by the user rather than constructing fake profile names.
    return requestBibleSearch(name, region);
  }

  function render(boxId, results, inputId) {
    const box = $(boxId);
    if (!box) return;
    if (!results.length) { box.innerHTML = ''; return; }

    box.innerHTML = results.map((c, i) => {
      const icon = iconUrl(c.classKey);
      const classLabel = classInfo(c.classKey)[0];
      return `<button type="button" class="character-candidate" data-index="${i}" data-url="${esc(c.url)}" data-region="${esc(c.region)}" data-name="${esc(c.name)}">` +
        (icon ? `<img class="character-class-icon" src="${esc(icon)}" alt="${esc(classLabel)}" loading="lazy" referrerpolicy="no-referrer">` : `<span class="character-class-icon character-class-fallback" title="${esc(classLabel)}">${esc(classLabel.slice(0,1).toUpperCase())}</span>`) +
        `<span class="character-candidate-main"><span class="character-candidate-name">${esc(c.name)}</span><small>${esc(c.ilvl)} · ${esc(classLabel)}</small></span></button>`;
    }).join('');

    box.querySelectorAll('.character-candidate').forEach((button) => {
      button.addEventListener('click', () => {
        const result = results[Number(button.dataset.index)];
        if (!result) return;
        const input = $(inputId);
        if (input) { input.value = result.name; input.focus(); }
        if (inputId === '#comparisonName') {
          $('#testCharacterUrl').value = result.url;
        }
        box.innerHTML = '';
        if (inputId === '#characterName') $('#status').textContent = 'Character selected. Click Find Character to add it.';
      });
    });
  }

  function renderMainSuggestions(results) {
    const d = $('#characterNameSuggestions');
    if (d) d.innerHTML = results.map(c => `<option value="${esc(c.name)}"></option>`).join('');
    render('#characterCandidates', results, '#characterName');
  }

  async function mainLive() {
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = ($('#characterName')?.value || '').trim();
    if (name.length < 2) { renderMainSuggestions([]); return; }
    const id = ++requestId;
    try {
      const results = await search(region, name);
      if (id === requestId) renderMainSuggestions(results);
    } catch {
      if (id === requestId) renderMainSuggestions([]);
    }
  }

  async function mainFind() {
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = ($('#characterName')?.value || '').trim();
    if (!name) return;
    const results = await search(region, name);
    renderMainSuggestions(results);
    $('#status').textContent = results.length
      ? `${results.length} matching active Bible character${results.length === 1 ? '' : 's'} found.`
      : 'No active Bible character matches found.';
  }

  async function comparisonLive() {
    const region = ($('#comparisonRegion')?.value || 'NA').toUpperCase();
    const name = ($('#comparisonName')?.value || '').trim();
    if (name.length < 2) { render('#comparisonCandidates', [], '#comparisonName'); return; }
    const id = ++requestId;
    try {
      const results = await search(region, name);
      if (id === requestId) render('#comparisonCandidates', results, '#comparisonName');
    } catch {
      if (id === requestId) render('#comparisonCandidates', [], '#comparisonName');
    }
  }

  function addSelectedMain() {
    const input = $('#characterName');
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = (input?.value || '').trim();
    const selected = input?.dataset?.selectedUrl || $('#characterCandidates .character-candidate.selected')?.dataset.url || '';
    if (!name) return;

    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"characters":[]}');
    if (!Array.isArray(state.characters)) state.characters = [];
    if (state.characters.length >= MAX_CHARACTERS) { $('#status').textContent = `Maximum of ${MAX_CHARACTERS} characters reached.`; return; }

    const url = selected || profileUrl(region, name);
    if (state.characters.some(c => c.url === url)) { $('#status').textContent = 'That character is already added.'; return; }
    state.characters.push({id: crypto.randomUUID(), url, region, name, profile: null});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.reload();
  }

  function init() {
    const main = $('#characterName');
    const find = $('#findCharacterBtn');
    if (main && find) {
      main.addEventListener('input', () => {
        main.dataset.selectedUrl = '';
        clearTimeout(timer);
        timer = setTimeout(mainLive, DELAY);
      });
      main.addEventListener('keydown', e => { if (e.key === 'Enter') mainFind(); });
      find.addEventListener('click', mainFind);
      $('#characterRegion')?.addEventListener('change', () => { main.dataset.selectedUrl = ''; mainLive(); });
      document.addEventListener('dblclick', e => {
        const button = e.target.closest?.('#characterCandidates .character-candidate');
        if (!button) return;
        main.dataset.selectedUrl = button.dataset.url || '';
        addSelectedMain();
      });
      document.addEventListener('click', e => {
        const button = e.target.closest?.('#characterCandidates .character-candidate');
        if (!button) return;
        main.dataset.selectedUrl = button.dataset.url || '';
      }, true);
    }

    const cmp = $('#comparisonName');
    if (cmp) {
      cmp.addEventListener('input', () => { $('#testCharacterUrl').value = ''; clearTimeout(timer); timer = setTimeout(comparisonLive, DELAY); });
      cmp.addEventListener('keydown', e => { if (e.key === 'Enter') comparisonLive(); });
      $('#comparisonRegion')?.addEventListener('change', () => { $('#testCharacterUrl').value = ''; comparisonLive(); });
      $('#comparisonFindBtn')?.addEventListener('click', comparisonLive);
    }

    $('#compareBtn')?.addEventListener('click', () => {
      const n = ($('#comparisonName')?.value || '').trim();
      const r = ($('#comparisonRegion')?.value || 'NA').toUpperCase();
      if (n && !$('#testCharacterUrl').value) $('#testCharacterUrl').value = profileUrl(r, n);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
