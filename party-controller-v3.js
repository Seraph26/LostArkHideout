/* Lost Ark Hideout — authoritative party UI controller.
 *
 * This layer sits after the older party enhancement scripts and owns the
 * visible party UI. It deliberately keeps party assignments separate from
 * character/profile storage so profile refreshes cannot erase manual party
 * choices.
 */
(() => {
  const STATE_KEYS = ['lostark-hideout-private-v3', 'lostark-hideout-private-v2'];
  const PARTY_KEY = 'lostark-hideout-party-assignments-v2';
  const MAX_PER_PARTY = 4;
  const SUPPORTS = new Set(['Bard', 'Paladin', 'Artist']);

  const $ = (s) => document.querySelector(s);

  function readState() {
    for (const key of STATE_KEYS) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        if (value && Array.isArray(value.characters)) return value;
      } catch {}
    }
    return { characters: [] };
  }

  function characters() {
    return readState().characters.filter((c) => c && c.profile);
  }

  function readAssignments() {
    try {
      const value = JSON.parse(localStorage.getItem(PARTY_KEY) || 'null');
      if (value && Array.isArray(value.party1) && Array.isArray(value.party2)) {
        return { party1: value.party1, party2: value.party2 };
      }
    } catch {}
    return { party1: [], party2: [] };
  }

  function writeAssignments(value) {
    localStorage.setItem(PARTY_KEY, JSON.stringify(value));
  }

  function normalize(chars, existing) {
    const valid = new Set(chars.map((c) => c.id));
    const seen = new Set();
    const p1 = [];
    const p2 = [];

    for (const id of existing.party1 || []) {
      if (valid.has(id) && !seen.has(id) && p1.length < MAX_PER_PARTY) {
        p1.push(id);
        seen.add(id);
      }
    }

    for (const id of existing.party2 || []) {
      if (valid.has(id) && !seen.has(id) && p2.length < MAX_PER_PARTY) {
        p2.push(id);
        seen.add(id);
      }
    }

    // New characters always fill Party 1 to four first, then Party 2.
    for (const c of chars) {
      if (seen.has(c.id)) continue;
      if (p1.length < MAX_PER_PARTY) p1.push(c.id);
      else if (p2.length < MAX_PER_PARTY) p2.push(c.id);
      seen.add(c.id);
    }

    return { party1: p1, party2: p2 };
  }

  function optimize(chars) {
    // For fewer than eight characters the required layout is always 4 + rest.
    // For eight characters it is 4 + 4. Within those constraints, strongest
    // raid CP goes into Party 1 as the deterministic baseline until the real
    // DPS/synergy optimizer replaces this scoring step.
    const sorted = [...chars].sort((a, b) =>
      (Number(b.profile?.cp) || 0) - (Number(a.profile?.cp) || 0)
    );
    return {
      party1: sorted.slice(0, MAX_PER_PARTY).map((c) => c.id),
      party2: sorted.slice(MAX_PER_PARTY, MAX_PER_PARTY * 2).map((c) => c.id)
    };
  }

  function role(c) {
    return SUPPORTS.has(c.profile?.class) ? 'Support' : 'DPS';
  }

  function power(c) {
    return Number(c.profile?.cp) || 0;
  }

  function score(party) {
    if (!party.length) return 0;
    const dps = party.filter((c) => role(c) === 'DPS');
    const supports = party.filter((c) => role(c) === 'Support');
    const raw = dps.reduce((sum, c) => sum + power(c), 0);
    const supportMultiplier = supports.length === 0 ? 1 : supports.length === 1 ? 1.18 : 1.10;
    const supportBase = supports.reduce((sum, c) => sum + power(c) * 0.20, 0);
    return raw * supportMultiplier + supportBase;
  }

  function total(p1, p2) {
    return score(p1) + score(p2);
  }

  function format(n) {
    return Math.round(n).toLocaleString();
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function currentModel() {
    const chars = characters();
    const map = new Map(chars.map((c) => [c.id, c]));
    const assignments = normalize(chars, readAssignments());
    writeAssignments(assignments);
    return {
      chars,
      map,
      assignments,
      p1: assignments.party1.map((id) => map.get(id)).filter(Boolean),
      p2: assignments.party2.map((id) => map.get(id)).filter(Boolean)
    };
  }

  function renderParty(partyName, partyId, members, overall) {
    const supportCount = members.filter((c) => role(c) === 'Support').length;

    return `
      <article class="party authoritative-party" data-party="${partyId}">
        <div class="party-heading">
          <div>
            <h3>${partyName}</h3>
            <div class="party-score">Estimated potential: <strong>${format(score(members))}</strong></div>
          </div>
          <div class="party-meta">${members.length}/4 slots · ${supportCount} support</div>
        </div>
        <div class="party-dropzone authoritative-dropzone" data-drop-party="${partyId}">
          ${members.length ? members.map((c) => `
            <div class="party-member authoritative-member" draggable="true" data-character-id="${esc(c.id)}">
              <div class="party-member-main">
                <a class="party-character-link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.profile.name || c.name)}</a>
                <span>${esc(c.profile.class || 'Unknown')} · CP ${Number(power(c)).toLocaleString(undefined,{maximumFractionDigits:2})}</span>
              </div>
              <span class="drag-hint">Drag</span>
            </div>
          `).join('') : '<div class="party-empty">Drop a character here</div>'}
        </div>
        <div class="party-footer">Combined estimated potential: ${format(overall)}</div>
      </article>
    `;
  }

  function render() {
    const el = $('#suggestedParties');
    if (!el) return;

    const model = currentModel();
    if (!model.chars.length) {
      el.innerHTML = '<div class="empty-roster">Add specific character profiles to generate the party setup.</div>';
      return;
    }

    const baseline = total(model.p1, model.p2);
    el.innerHTML = `
      <div class="party-optimizer-note">
        <strong>Party assignment:</strong> Party 1 fills to four characters first. Any remaining characters are placed in Party 2, up to four.
        <span>Drag a character onto the other party to move it. Drag directly onto a character in the other party to perform a 1-for-1 swap and see the estimated combined impact.</span>
        <span>Current combined estimated potential: <strong>${format(baseline)}</strong></span>
      </div>
      <div class="authoritative-parties">
        ${renderParty('Party 1', 'party1', model.p1, baseline)}
        ${renderParty('Party 2', 'party2', model.p2, baseline)}
      </div>
      <div id="swapImpact" class="swap-impact neutral" aria-live="polite">Drag a character to another party to see the estimated impact.</div>
    `;
  }

  function impact(before, after, label) {
    const change = before ? ((after - before) / before) * 100 : 0;
    const el = $('#swapImpact');
    if (!el) return;
    el.className = `swap-impact ${change > 0.0001 ? 'positive' : change < -0.0001 ? 'negative' : 'neutral'}`;
    el.innerHTML = `<strong>${esc(label)}: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%</strong> combined estimated potential (${format(before)} → ${format(after)}).`;
  }

  function partyFor(id, assignments) {
    if (assignments.party1.includes(id)) return 'party1';
    if (assignments.party2.includes(id)) return 'party2';
    return null;
  }

  function moveCharacter(id, destination) {
    const model = currentModel();
    const source = partyFor(id, model.assignments);
    if (!source || source === destination) return;

    if (model.assignments[destination].length >= MAX_PER_PARTY) {
      const before = total(model.p1, model.p2);
      impact(before, before, 'Move blocked');
      const el = $('#swapImpact');
      if (el) el.innerHTML = '<strong>Move blocked:</strong> that party is already full (4/4). Drop onto a character to perform a 1-for-1 swap instead.';
      return;
    }

    const before = total(model.p1, model.p2);
    model.assignments[source] = model.assignments[source].filter((x) => x !== id);
    model.assignments[destination].push(id);
    writeAssignments(model.assignments);

    const afterModel = currentModel();
    const after = total(afterModel.p1, afterModel.p2);
    render();
    impact(before, after, 'Move applied');
  }

  function swapCharacters(sourceId, targetId) {
    const model = currentModel();
    const sourceParty = partyFor(sourceId, model.assignments);
    const targetParty = partyFor(targetId, model.assignments);
    if (!sourceParty || !targetParty || sourceParty === targetParty) return;

    const before = total(model.p1, model.p2);
    const sourceIndex = model.assignments[sourceParty].indexOf(sourceId);
    const targetIndex = model.assignments[targetParty].indexOf(targetId);
    model.assignments[sourceParty][sourceIndex] = targetId;
    model.assignments[targetParty][targetIndex] = sourceId;
    writeAssignments(model.assignments);

    const afterModel = currentModel();
    const after = total(afterModel.p1, afterModel.p2);
    render();
    impact(before, after, 'Swap applied');
  }

  function installDragDrop() {
    const el = $('#suggestedParties');
    if (!el || el.dataset.authoritativeDrag) return;
    el.dataset.authoritativeDrag = '1';

    el.addEventListener('dragstart', (event) => {
      const member = event.target.closest('.authoritative-member');
      if (!member) return;
      event.dataTransfer.setData('text/plain', member.dataset.characterId);
      event.dataTransfer.effectAllowed = 'move';
      member.classList.add('dragging');
    });

    el.addEventListener('dragend', (event) => {
      event.target.closest('.authoritative-member')?.classList.remove('dragging');
      el.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over'));
    });

    el.addEventListener('dragover', (event) => {
      const member = event.target.closest('.authoritative-member');
      const zone = event.target.closest('.authoritative-dropzone');
      if (!member && !zone) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      (member || zone).classList.add('drag-over');
    });

    el.addEventListener('dragleave', (event) => {
      const target = event.target.closest('.authoritative-member, .authoritative-dropzone');
      if (target) target.classList.remove('drag-over');
    });

    el.addEventListener('drop', (event) => {
      const sourceId = event.dataTransfer.getData('text/plain');
      if (!sourceId) return;

      const targetMember = event.target.closest('.authoritative-member');
      const targetZone = event.target.closest('.authoritative-dropzone');
      if (!targetMember && !targetZone) return;

      event.preventDefault();
      event.stopPropagation();
      el.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over'));

      if (targetMember) {
        const targetId = targetMember.dataset.characterId;
        if (targetId && targetId !== sourceId) swapCharacters(sourceId, targetId);
        return;
      }

      const destination = targetZone.dataset.dropParty;
      moveCharacter(sourceId, destination);
    });
  }

  function install() {
    const optimizeButton = $('#optimizeBtn');
    if (optimizeButton && !optimizeButton.dataset.authoritativeOptimizer) {
      optimizeButton.dataset.authoritativeOptimizer = '1';
      optimizeButton.onclick = () => {
        const chars = characters();
        if (!chars.length) {
          render();
          return;
        }
        writeAssignments(optimize(chars));
        render();
      };
    }

    render();
    installDragDrop();

    const container = $('#suggestedParties');
    if (container && !container.dataset.authoritativeObserver) {
      container.dataset.authoritativeObserver = '1';
      const observer = new MutationObserver(() => {
        // app-fixed.js may redraw the basic 3+2 layout after refresh/add/remove.
        // Reassert the authoritative UI only when the enhanced markup is gone.
        if (!container.querySelector('.authoritative-party') && characters().length) {
          render();
        }
      });
      observer.observe(container, { childList: true, subtree: true });
    }

    const refresh = $('#refreshBtn');
    if (refresh && !refresh.dataset.authoritativeRefresh) {
      refresh.dataset.authoritativeRefresh = '1';
      refresh.addEventListener('click', () => setTimeout(() => {
        render();
        installDragDrop();
      }, 150));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
