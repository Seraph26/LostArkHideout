(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';
  const MAX_CHARACTERS = 8;
  const MAX_PROFILE_LOOKUPS = 20;
  const LIVE_SEARCH_DELAY = 350;

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const stripAccents = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let liveSearchTimer = null;
  let liveSearchRequest = 0;

  function getState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return s && Array.isArray(s.characters) ? s : { characters: [] };
    } catch { return { characters: [] }; }
  }
  function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function setStatus(message) { const el = $('#status'); if (el) el.textContent = message; }
  function makeUrl(region, name) { return `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`; }

  function cleanNumber(value) {
    if (value == null) return null;
    const match = String(value).replace(/,/g, '').match(/[\d.]+/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  function extractItemLevel(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const lines = (doc.body?.textContent || '').split(/\n+/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (!/^Item Level$/i.test(lines[i])) continue;
      for (let j = i + 1; j < Math.min(lines.length, i + 7); j++) {
        const value = cleanNumber(lines[j]);
        if (value != null && value >= 1000 && value <= 2000) return value;
      }
    }
    const text = (doc.body?.textContent || '').replace(/\s+/g, ' ');
    const textMatch = text.match(/Item Level\s*[:\-]?\s*(\d{3,4}(?:\.\d+)?)/i);
    return textMatch ? cleanNumber(textMatch[1]) : null;
  }

  function parseCandidates(html, requestedRegion) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const candidates = [];
    const seen = new Set();
    for (const a of doc.querySelectorAll('a[href]')) {
      try {
        const u = new URL(a.href, 'https://lostark.bible');
        if (u.hostname !== 'lostark.bible') continue;
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length < 3 || parts[0].toLowerCase() !== 'character') continue;
        const region = parts[1].toUpperCase();
        if (!['NA', 'EU'].includes(region) || region !== requestedRegion) continue;
        const name = decodeURIComponent(parts.slice(2).join('/'));
        const key = `${region}|${name}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({ region, name, url: makeUrl(region, name), itemLevel: null });
        }
      } catch {}
    }
    return candidates;
  }

  async function connectorFetch(url) {
    const response = await fetch(`${CONNECTOR}?url=${encodeURIComponent(url)}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Connector returned non-JSON data (HTTP ${response.status}).`); }
    if (!response.ok || data.ok === false) throw new Error(data?.error || `Connector returned HTTP ${response.status}.`);
    return data.html || data.characterHtml || data.content || data.page || '';
  }

  async function searchBible(region, name) {
    const original = name.trim();
    const queries = [...new Set([original, stripAccents(original)].filter(Boolean))];
    for (const query of queries) {
      const q = encodeURIComponent(query);
      const searchUrls = [
        `https://lostark.bible/search?query=${q}`,
        `https://lostark.bible/search?q=${q}`,
        `https://lostark.bible/characters?search=${q}`
      ];
      for (const searchUrl of searchUrls) {
        try {
          const candidates = parseCandidates(await connectorFetch(searchUrl), region);
          if (candidates.length) return candidates;
        } catch {}
      }
    }
    return [{ region, name: original, url: makeUrl(region, original), itemLevel: null, exact: true }];
  }

  function formatItemLevel(value) {
    if (!Number.isFinite(value)) return 'iLvl —';
    return `iLvl ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  function sortCandidates(candidates) {
    return [...candidates].sort((a, b) => {
      const aKnown = Number.isFinite(a.itemLevel), bKnown = Number.isFinite(b.itemLevel);
      if (aKnown && bKnown) return b.itemLevel !== a.itemLevel ? b.itemLevel - a.itemLevel : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      if (aKnown) return -1;
      if (bKnown) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  async function enrichCandidateItemLevels(candidates) {
    await Promise.all(candidates.slice(0, MAX_PROFILE_LOOKUPS).map(async candidate => {
      try { candidate.itemLevel = extractItemLevel(await connectorFetch(candidate.url)); } catch { candidate.itemLevel = null; }
    }));
    return sortCandidates(candidates);
  }

  function updateNameSuggestions(candidates) {
    const datalist = $('#characterNameSuggestions');
    if (!datalist) return;
    datalist.innerHTML = sortCandidates(candidates).map(c => `<option value="${esc(c.name)}">${esc(c.region)}</option>`).join('');
  }

  function showCandidates(candidates, searching = false, live = false) {
    const box = $('#characterCandidates');
    if (!box) return;
    updateNameSuggestions(candidates);
    if (searching) {
      if (!live) box.innerHTML = '<div class="character-candidate-status">Finding matching names…</div>';
      return;
    }
    const sorted = sortCandidates(candidates);
    if (!sorted.length) { box.innerHTML = ''; return; }
    box.innerHTML = sorted.map((c, i) => `
      <button type="button" class="character-candidate" data-index="${i}">
        <span class="character-candidate-name">${esc(c.name)}</span>
        <small>${esc(c.region)}${Number.isFinite(c.itemLevel) ? ` · ${esc(formatItemLevel(c.itemLevel))}` : ''}${c.exact ? ' · Exact name' : ''}</small>
      </button>`).join('');
    box.querySelectorAll('.character-candidate').forEach(btn => btn.addEventListener('click', () => {
      const candidate = sorted[Number(btn.dataset.index)];
      const input = $('#characterName');
      if (input) { input.value = candidate.name; input.focus(); }
      runSearch();
    }));
  }

  function addCandidate(candidate) {
    const state = getState();
    if (state.characters.length >= MAX_CHARACTERS) { setStatus(`Maximum of ${MAX_CHARACTERS} characters reached.`); return; }
    if (state.characters.some(c => c.url === candidate.url)) { setStatus('That character is already added.'); return; }
    state.characters.push({ id: crypto.randomUUID(), url: candidate.url, region: candidate.region, name: candidate.name, profile: null });
    saveState(state);
    const nameInput = $('#characterName'); if (nameInput) nameInput.value = '';
    const candidateBox = $('#characterCandidates'); if (candidateBox) candidateBox.innerHTML = '';
    const datalist = $('#characterNameSuggestions'); if (datalist) datalist.innerHTML = '';
    location.reload();
  }

  async function runSearch() {
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = ($('#characterName')?.value || '').trim();
    if (!name) { setStatus('Enter a character name first.'); return; }
    setStatus(`Searching Bible for ${name} (${region})…`);
    const button = $('#findCharacterBtn'); if (button) button.disabled = true;
    try {
      let candidates = await searchBible(region, name);
      showCandidates(candidates, true);
      setStatus(`Found ${candidates.length} matching character${candidates.length === 1 ? '' : 's'}; checking item levels…`);
      candidates = await enrichCandidateItemLevels(candidates);
      showCandidates(candidates);
      setStatus(candidates.length === 1 && candidates[0].exact ? 'Select the character to add it.' : `${candidates.length} matching character${candidates.length === 1 ? '' : 's'} found. Highest iLvl shown first.`);
    } catch (error) {
      setStatus(`Character search failed: ${error.message}`);
      const box = $('#characterCandidates'); if (box) box.innerHTML = '';
    } finally { if (button) button.disabled = false; }
  }

  async function liveSearch() {
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = ($('#characterName')?.value || '').trim();
    if (name.length < 2) {
      const box = $('#characterCandidates'); if (box) box.innerHTML = '';
      const datalist = $('#characterNameSuggestions'); if (datalist) datalist.innerHTML = '';
      return;
    }
    const requestId = ++liveSearchRequest;
    try {
      const candidates = await searchBible(region, name);
      if (requestId !== liveSearchRequest) return;
      showCandidates(candidates, false, true);
    } catch { if (requestId === liveSearchRequest) showCandidates([], false, true); }
  }

  function makeNamesClickable() {
    const state = getState(), roster = $('#roster');
    if (!roster) return;
    roster.querySelectorAll('.character').forEach((card, index) => {
      const character = state.characters[index];
      if (!character?.url) return;
      const heading = card.querySelector('.character-head h3');
      if (!heading || heading.querySelector('a')) return;
      const link = document.createElement('a');
      link.href = character.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = heading.textContent;
      heading.textContent = ''; heading.appendChild(link);
    });
  }

  function init() {
    const nameInput = $('#characterName'), findButton = $('#findCharacterBtn');
    if (!nameInput || !findButton) return;
    if (!$('#characterNameSuggestions')) {
      const datalist = document.createElement('datalist'); datalist.id = 'characterNameSuggestions';
      nameInput.setAttribute('list', datalist.id); nameInput.insertAdjacentElement('afterend', datalist);
    }
    if (!$('#characterCandidates')) {
      const candidateContainer = document.createElement('div'); candidateContainer.id = 'characterCandidates'; candidateContainer.className = 'character-candidates';
      nameInput.closest('.import-row')?.parentElement?.appendChild(candidateContainer);
    }
    findButton.addEventListener('click', runSearch);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
    nameInput.addEventListener('input', () => { clearTimeout(liveSearchTimer); liveSearchTimer = setTimeout(liveSearch, LIVE_SEARCH_DELAY); });
    $('#characterRegion')?.addEventListener('change', () => { clearTimeout(liveSearchTimer); liveSearch(); });
    makeNamesClickable();
    const roster = $('#roster');
    if (roster) new MutationObserver(makeNamesClickable).observe(roster, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
