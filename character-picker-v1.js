(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';
  const MAX_CHARACTERS = 8;

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function getState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return s && Array.isArray(s.characters) ? s : { characters: [] };
    } catch {
      return { characters: [] };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setStatus(message) {
    const el = $('#status');
    if (el) el.textContent = message;
  }

  function makeUrl(region, name) {
    return `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
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
        if (!['NA','EU'].includes(region) || region !== requestedRegion) continue;
        const name = decodeURIComponent(parts.slice(2).join('/'));
        const url = `https://lostark.bible/character/${region}/${encodeURIComponent(name)}`;
        const key = `${region}|${name}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({ region, name, url });
        }
      } catch {}
    }

    return candidates;
  }

  async function connectorFetch(url) {
    const endpoint = `${CONNECTOR}?url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint, { cache: 'no-store', headers: { Accept: 'application/json' } });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Connector returned non-JSON data (HTTP ${response.status}).`); }
    if (!response.ok || data.ok === false) throw new Error(data?.error || `Connector returned HTTP ${response.status}.`);
    return data.html || data.characterHtml || data.content || data.page || '';
  }

  async function searchBible(region, name) {
    const q = encodeURIComponent(name.trim());
    const searchUrls = [
      `https://lostark.bible/search?query=${q}`,
      `https://lostark.bible/search?q=${q}`,
      `https://lostark.bible/characters?search=${q}`
    ];

    for (const searchUrl of searchUrls) {
      try {
        const html = await connectorFetch(searchUrl);
        const candidates = parseCandidates(html, region);
        if (candidates.length) return candidates;
      } catch {}
    }

    // Exact profile fallback. This keeps the picker usable even if Bible's
    // public search route changes or is unavailable.
    return [{ region, name: name.trim(), url: makeUrl(region, name.trim()), exact: true }];
  }

  function showCandidates(candidates) {
    let box = $('#characterCandidates');
    if (!box) return;

    box.innerHTML = candidates.map((c, i) => `
      <button type="button" class="character-candidate" data-index="${i}">
        <span>${esc(c.name)}</span>
        <small>${esc(c.region)}${c.exact ? ' · Exact name' : ''}</small>
      </button>
    `).join('');

    box.querySelectorAll('.character-candidate').forEach(btn => {
      btn.addEventListener('click', () => addCandidate(candidates[Number(btn.dataset.index)]));
    });
  }

  function addCandidate(candidate) {
    const state = getState();
    if (state.characters.length >= MAX_CHARACTERS) {
      setStatus(`Maximum of ${MAX_CHARACTERS} characters reached.`);
      return;
    }

    const existing = state.characters.some(c => c.url === candidate.url);
    if (existing) {
      setStatus('That character is already added.');
      return;
    }

    state.characters.push({
      id: crypto.randomUUID(),
      url: candidate.url,
      region: candidate.region,
      name: candidate.name,
      profile: null
    });
    saveState(state);

    const nameInput = $('#characterName');
    if (nameInput) nameInput.value = '';
    showCandidates([]);
    const candidateBox = $('#characterCandidates');
    if (candidateBox) candidateBox.innerHTML = '';

    // app-fixed.js owns the actual render function; reload is the safest way
    // to let its existing state/render pipeline pick up the new character.
    location.reload();
  }

  async function runSearch() {
    const region = ($('#characterRegion')?.value || 'NA').toUpperCase();
    const name = ($('#characterName')?.value || '').trim();
    if (!name) {
      setStatus('Enter a character name first.');
      return;
    }

    setStatus(`Searching Bible for ${name} (${region})…`);
    const button = $('#findCharacterBtn');
    if (button) button.disabled = true;

    try {
      const candidates = await searchBible(region, name);
      showCandidates(candidates);
      setStatus(candidates.length === 1 && candidates[0].exact ? 'Exact-name option found. Select it to add the character.' : `${candidates.length} matching character${candidates.length === 1 ? '' : 's'} found.`);
    } catch (error) {
      setStatus(`Character search failed: ${error.message}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function makeNamesClickable() {
    const state = getState();
    const roster = $('#roster');
    if (!roster) return;

    roster.querySelectorAll('.character').forEach((card, index) => {
      const character = state.characters[index];
      if (!character?.url) return;
      const heading = card.querySelector('.character-head h3');
      if (!heading || heading.querySelector('a')) return;

      const link = document.createElement('a');
      link.href = character.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = heading.textContent;
      heading.textContent = '';
      heading.appendChild(link);
    });
  }

  function init() {
    const oldInput = $('#characterUrl');
    const addButton = $('#addCharacterBtn');
    if (!oldInput || !addButton) return;

    const panel = oldInput.closest('.import-row');
    if (!panel) return;

    panel.innerHTML = `
      <select id="characterRegion" aria-label="Character region">
        <option value="NA">NA</option>
        <option value="EU">EU</option>
      </select>
      <input id="characterName" placeholder="Character name" autocomplete="off">
      <button id="findCharacterBtn" type="button">Find Character</button>
    `;

    const candidateContainer = document.createElement('div');
    candidateContainer.id = 'characterCandidates';
    candidateContainer.className = 'character-candidates';
    panel.parentElement.appendChild(candidateContainer);

    $('#findCharacterBtn').addEventListener('click', runSearch);
    $('#characterName').addEventListener('keydown', e => {
      if (e.key === 'Enter') runSearch();
    });

    // Remove the old button handler by replacing the original button if it is
    // still present elsewhere in the DOM.
    addButton.remove();

    makeNamesClickable();
    const observer = new MutationObserver(() => makeNamesClickable());
    observer.observe($('#roster'), { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
