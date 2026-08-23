/* Lost Ark Party — party optimizer / drag-and-drop enhancement layer
 *
 * This layer intentionally works from the locally stored character profiles.
 * It does not query roster/account data or add another external service.
 *
 * Party score is an ESTIMATED comparison score, not Bible nDPS. It uses the
 * loaded raid CP as the character-strength component and a small support-role
 * multiplier so swaps can be compared consistently. The scoring engine can be
 * replaced later with the full class/synergy model without changing the UI.
 */
(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const LEGACY_KEY = 'lostark-hideout-private-v2';
  const PARTY_KEY = 'lostark-hideout-party-assignments-v1';
  const MAX_PER_PARTY = 4;
  const SUPPORT_CLASSES = new Set(['Bard', 'Paladin', 'Artist']);

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);

  function getState() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (current && Array.isArray(current.characters)) return current;
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy && Array.isArray(legacy.characters)) return legacy;
    } catch {}
    return { characters: [] };
  }

  function getCharacters() {
    return getState().characters.filter((c) => c.profile);
  }

  function getAssignments() {
    try {
      const value = JSON.parse(localStorage.getItem(PARTY_KEY) || 'null');
      if (value && Array.isArray(value.party1) && Array.isArray(value.party2)) {
        return { party1: value.party1, party2: value.party2 };
      }
    } catch {}
    return { party1: [], party2: [] };
  }

  function saveAssignments(assignments) {
    localStorage.setItem(PARTY_KEY, JSON.stringify(assignments));
  }

  function normalizeAssignments(chars, assignments) {
    const ids = new Set(chars.map((c) => c.id));
    const seen = new Set();
    const p1 = [];
    const p2 = [];

    for (const id of assignments.party1 || []) {
      if (ids.has(id) && !seen.has(id)) {
        p1.push(id); seen.add(id);
      }
    }
    for (const id of assignments.party2 || []) {
      if (ids.has(id) && !seen.has(id)) {
        p2.push(id); seen.add(id);
      }
    }

    // Any newly added character is placed into the first party until it is
    // full, then into the second party. This preserves manual assignments.
    for (const c of chars) {
      if (seen.has(c.id)) continue;
      if (p1.length < MAX_PER_PARTY) p1.push(c.id);
      else p2.push(c.id);
      seen.add(c.id);
    }

    return { party1: p1, party2: p2 };
  }

  function optimizeAssignments(chars) {
    // A deterministic baseline: strongest four by raid CP in Party 1 and the
    // remainder in Party 2. Manual drag-and-drop changes are then persisted.
    const sorted = [...chars].sort((a, b) => (b.profile.cp || 0) - (a.profile.cp || 0));
    return {
      party1: sorted.slice(0, MAX_PER_PARTY).map((c) => c.id),
      party2: sorted.slice(MAX_PER_PARTY).map((c) => c.id)
    };
  }

  function roleOf(character) {
    return SUPPORT_CLASSES.has(character.profile?.class) ? 'Support' : 'DPS';
  }

  function characterPower(character) {
    return Number(character.profile?.cp) || 0;
  }

  function partyScore(members) {
    if (!members.length) return 0;

    const dps = members.filter((c) => roleOf(c) === 'DPS');
    const supports = members.filter((c) => roleOf(c) === 'Support');
    const rawDps = dps.reduce((sum, c) => sum + characterPower(c), 0);

    // Support contribution is modeled as a modest party multiplier for the
    // purpose of comparing swaps. One support gives a larger benefit than two;
    // additional supports do not stack linearly.
    const supportMultiplier = supports.length === 0
      ? 1
      : supports.length === 1
      ? 1.18
      : 1.10;

    // If a party is support-only, retain a small score rather than zero so the
    // UI remains meaningful while waiting for the real synergy engine.
    const supportBase = supports.reduce((sum, c) => sum + characterPower(c) * 0.20, 0);
    return rawDps * supportMultiplier + supportBase;
  }

  function totalScore(p1, p2) {
    return partyScore(p1) + partyScore(p2);
  }

  function pct(value) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  function partyCard(title, members, partyId, allMembers) {
    const score = partyScore(members);
    const overall = totalScore(allMembers.party1, allMembers.party2);
    const supportCount = members.filter((c) => roleOf(c) === 'Support').length;

    return `<article class="party enhanced-party" data-party="${partyId}">
      <div class="party-heading">
        <div>
          <h3>${title}</h3>
          <div class="party-score">Estimated potential: <strong>${Math.round(score).toLocaleString()}</strong></div>
        </div>
        <div class="party-meta">${members.length}/${MAX_PER_PARTY} slots · ${supportCount} support</div>
      </div>
      <div class="party-dropzone" data-drop-party="${partyId}">
        ${members.length ? members.map((c) => `
          <div class="party-member" draggable="true" data-character-id="${esc(c.id)}">
            <div class="party-member-main">
              <a class="party-character-link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.profile.name)}</a>
              <span>${esc(c.profile.class)} · CP ${Number(characterPower(c)).toLocaleString(undefined,{maximumFractionDigits:2})}</span>
            </div>
            <span class="drag-hint">Drag</span>
          </div>
        `).join('') : '<div class="party-empty">Drop a character here</div>'}
      </div>
      <div class="party-footer">Overall estimated potential: ${Math.round(overall).toLocaleString()}</div>
    </article>`;
  }

  function renderPartyUI() {
    const el = $('#suggestedParties');
    if (!el) return;

    const chars = getCharacters();
    if (!chars.length) {
      el.innerHTML = '<div class="empty-roster">Add specific character profiles to generate the party setup.</div>';
      return;
    }

    let assignments = normalizeAssignments(chars, getAssignments());
    saveAssignments(assignments);

    const byId = new Map(chars.map((c) => [c.id, c]));
    const p1 = assignments.party1.map((id) => byId.get(id)).filter(Boolean);
    const p2 = assignments.party2.map((id) => byId.get(id)).filter(Boolean);
    const baseline = totalScore(p1, p2);

    el.innerHTML = `
      <div class="party-optimizer-note">
        <strong>Drag and drop:</strong> Drag any character between Party 1 and Party 2 to test a swap. The percentage shown is the estimated change to the <strong>combined potential damage score</strong> of both parties.
        <span>Baseline: ${Math.round(baseline).toLocaleString()}</span>
      </div>
      <div class="parties enhanced-parties">
        ${partyCard('Party 1', p1, 'party1', {party1:p1,party2:p2})}
        ${partyCard('Party 2', p2, 'party2', {party1:p1,party2:p2})}
      </div>
      <div id="swapImpact" class="swap-impact" aria-live="polite">Drag a character to another party to see the estimated impact.</div>
    `;

    attachDragHandlers(chars);
  }

  function getPartyIds() {
    return getAssignments();
  }

  function previewMove(characterId, destination) {
    const chars = getCharacters();
    const byId = new Map(chars.map((c) => [c.id, c]));
    const assignments = normalizeAssignments(chars, getPartyIds());
    const source = destination === 'party1' ? 'party2' : 'party1';
    const sourceIds = [...assignments[source]];
    const destIds = [...assignments[destination]];

    const sourceIndex = sourceIds.indexOf(characterId);
    if (sourceIndex < 0) return;
    if (destIds.length >= MAX_PER_PARTY) {
      const impact = $('#swapImpact');
      if (impact) impact.textContent = 'That party is already full (4/4). Move a character out first.';
      return;
    }

    sourceIds.splice(sourceIndex, 1);
    destIds.push(characterId);

    const before1 = assignments.party1.map((id) => byId.get(id)).filter(Boolean);
    const before2 = assignments.party2.map((id) => byId.get(id)).filter(Boolean);
    const after1 = (destination === 'party1' ? destIds : sourceIds).map((id) => byId.get(id)).filter(Boolean);
    const after2 = (destination === 'party2' ? destIds : sourceIds).map((id) => byId.get(id)).filter(Boolean);

    const before = totalScore(before1, before2);
    const after = totalScore(after1, after2);
    const change = before ? ((after - before) / before) * 100 : 0;
    const impact = $('#swapImpact');
    if (impact) {
      impact.className = `swap-impact ${change > 0.0001 ? 'positive' : change < -0.0001 ? 'negative' : 'neutral'}`;
      impact.innerHTML = `<strong>Swap preview: ${pct(change)}</strong> combined estimated potential damage (${Math.round(before).toLocaleString()} → ${Math.round(after).toLocaleString()}).`;
    }
  }

  function commitMove(characterId, destination) {
    const chars = getCharacters();
    let assignments = normalizeAssignments(chars, getAssignments());
    const source = destination === 'party1' ? 'party2' : 'party1';
    if (assignments[destination].length >= MAX_PER_PARTY) {
      renderPartyUI();
      const impact = $('#swapImpact');
      if (impact) impact.textContent = 'That party is already full (4/4). Move a character out first.';
      return;
    }

    assignments[source] = assignments[source].filter((id) => id !== characterId);
    if (!assignments[destination].includes(characterId)) assignments[destination].push(characterId);
    saveAssignments(assignments);
    renderPartyUI();
  }

  function attachDragHandlers(chars) {
    document.querySelectorAll('.party-member').forEach((member) => {
      member.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', member.dataset.characterId);
        event.dataTransfer.effectAllowed = 'move';
      });
    });

    document.querySelectorAll('[data-drop-party]').forEach((zone) => {
      zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
        const id = event.dataTransfer.getData('text/plain');
        if (id) previewMove(id, zone.dataset.dropParty);
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', (event) => {
        event.preventDefault();
        zone.classList.remove('drag-over');
        const id = event.dataTransfer.getData('text/plain');
        if (id) commitMove(id, zone.dataset.dropParty);
      });
    });
  }

  function addStyles() {
    if ($('#partyEnhancementStyles')) return;
    const style = document.createElement('style');
    style.id = 'partyEnhancementStyles';
    style.textContent = `
      .party-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}
      .party-score{font-size:.9rem;opacity:.8;margin-top:4px}.party-meta{font-size:.85rem;opacity:.75;white-space:nowrap}
      .party-dropzone{min-height:110px;padding:8px;border:1px dashed rgba(255,255,255,.18);border-radius:12px;transition:.15s}
      .party-dropzone.drag-over{border-color:currentColor;background:rgba(255,255,255,.05)}
      .party-member{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;margin:6px 0;border-radius:9px;background:rgba(255,255,255,.045);cursor:grab}
      .party-member:active{cursor:grabbing}.party-member-main{display:flex;flex-direction:column;gap:3px}.party-member-main span{font-size:.82rem;opacity:.7}
      .party-character-link{font-weight:700;color:inherit;text-decoration:none}.party-character-link:hover{text-decoration:underline}.drag-hint{font-size:.72rem;opacity:.45}
      .party-empty{text-align:center;padding:30px 10px;opacity:.55}.party-footer{margin-top:10px;font-size:.8rem;opacity:.65}
      .party-optimizer-note{margin-bottom:12px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.035);font-size:.88rem;line-height:1.5}.party-optimizer-note span{display:block;margin-top:5px;opacity:.7}
      .enhanced-parties{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.swap-impact{margin-top:12px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.035)}
      .swap-impact.positive{border:1px solid rgba(80,200,120,.35)}.swap-impact.negative{border:1px solid rgba(230,80,80,.35)}.swap-impact.neutral{border:1px solid rgba(255,255,255,.12)}
      @media(max-width:800px){.enhanced-parties{grid-template-columns:1fr}.party-heading{flex-direction:column}.party-meta{white-space:normal}}
    `;
    document.head.appendChild(style);
  }

  function wire() {
    addStyles();

    const optimize = $('#optimizeBtn');
    if (optimize && !optimize.dataset.enhanced) {
      optimize.dataset.enhanced = '1';
      optimize.onclick = () => {
        const chars = getCharacters();
        if (!chars.length) {
          renderPartyUI();
          return;
        }
        saveAssignments(optimizeAssignments(chars));
        renderPartyUI();
      };
    }

    // Refresh Profiles changes localStorage; render the party UI after the
    // existing application render completes.
    const refresh = $('#refreshBtn');
    if (refresh && !refresh.dataset.partyEnhancement) {
      refresh.dataset.partyEnhancement = '1';
      refresh.addEventListener('click', () => setTimeout(renderPartyUI, 50));
    }

    // Available-character cards are re-rendered by app-fixed.js. Make each
    // character name a direct Bible link after every render.
    const roster = $('#roster');
    if (roster && !roster.dataset.partyEnhancement) {
      roster.dataset.partyEnhancement = '1';
      const observer = new MutationObserver(() => {
        const chars = getCharacters();
        const state = getState();
        const byId = new Map(state.characters.map((c) => [c.id, c]));
        roster.querySelectorAll('.character').forEach((card) => {
          const remove = card.querySelector('.remove-character');
          const id = remove?.dataset.id;
          const character = byId.get(id);
          const heading = card.querySelector('h3');
          if (!character || !heading || heading.closest('a')) return;
          const link = document.createElement('a');
          link.href = character.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'character-bible-link';
          link.textContent = heading.textContent;
          heading.replaceChildren(link);
        });
      });
      observer.observe(roster, {childList:true, subtree:true});
    }
  }

  // Wait until app-fixed.js has created its controls.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
