/* Lost Ark Hideout — single authoritative party controller. */
(() => {
  const STATE_KEYS = ['lostark-hideout-private-v3', 'lostark-hideout-private-v2'];
  const PARTY_KEY = 'lostark-hideout-party-assignments-v2';
  const MAX_PER_PARTY = 4;
  const SUPPORTS = new Set(['Bard', 'Paladin', 'Artist']);
  const CLASS_OVERRIDES = { ryohaku: 'Glavier' };
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

  function characters() { return readState().characters.filter((c) => c && c.profile); }

  function correctClasses() {
    const state = readState();
    let changed = false;
    for (const c of state.characters || []) {
      const key = String(c?.name || c?.profile?.name || '').trim().toLowerCase();
      const override = CLASS_OVERRIDES[key];
      if (override && c.profile && c.profile.class !== override) {
        c.profile.class = override;
        changed = true;
      }
    }
    if (changed) localStorage.setItem('lostark-hideout-private-v3', JSON.stringify(state));
  }

  function readAssignments() {
    try {
      const value = JSON.parse(localStorage.getItem(PARTY_KEY) || 'null');
      if (value && Array.isArray(value.party1) && Array.isArray(value.party2)) return value;
    } catch {}
    return { party1: [], party2: [] };
  }

  function writeAssignments(value) { localStorage.setItem(PARTY_KEY, JSON.stringify(value)); }

  function role(c) { return SUPPORTS.has(c.profile?.class) ? 'Support' : 'DPS'; }
  function power(c) { return Number(c.profile?.cp) || 0; }

  // This is the dashboard's current relative potential model. It is not an in-game DPS value.
  function score(party) {
    if (!party.length) return 0;
    const dps = party.filter((c) => role(c) === 'DPS');
    const supports = party.filter((c) => role(c) === 'Support');
    const rawDps = dps.reduce((sum, c) => sum + power(c), 0);
    const supportMultiplier = supports.length === 0 ? 1 : supports.length === 1 ? 1.18 : 1.10;
    const supportContribution = supports.reduce((sum, c) => sum + power(c) * 0.20, 0);
    return rawDps * supportMultiplier + supportContribution;
  }

  function total(p1, p2) { return score(p1) + score(p2); }
  function format(n) { return Math.round(n).toLocaleString(); }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function combinations(items, choose) {
    const result = [];
    function walk(start, picked) {
      if (picked.length === choose) {
        result.push(picked.slice());
        return;
      }
      const need = choose - picked.length;
      for (let i = start; i <= items.length - need; i++) {
        picked.push(items[i]);
        walk(i + 1, picked);
        picked.pop();
      }
    }
    walk(0, []);
    return result;
  }

  // Evaluate every valid 4-person Party 1 assignment. This fixes the previous
  // CP-only sorting behavior: Optimize Parties now actually chooses the highest
  // combined potential under the same score used by the swap display.
  function optimize(chars) {
    if (chars.length <= MAX_PER_PARTY) {
      return {
        party1: chars.map((c) => c.id),
        party2: []
      };
    }

    const chooseForParty1 = MAX_PER_PARTY;
    const candidates = combinations(chars, chooseForParty1);
    let best = null;

    for (const p1 of candidates) {
      const p1Ids = new Set(p1.map((c) => c.id));
      const p2 = chars.filter((c) => !p1Ids.has(c.id));
      const value = total(p1, p2);

      if (!best || value > best.value + 1e-9) {
        best = { value, p1, p2 };
      }
    }

    return {
      party1: best.p1.map((c) => c.id),
      party2: best.p2.map((c) => c.id)
    };
  }

  function model() {
    correctClasses();
    const chars = characters();
    const map = new Map(chars.map((c) => [c.id, c]));
    const assignments = readAssignments();
    const valid = new Set(chars.map((c) => c.id));
    const seen = new Set();
    const p1 = [];
    const p2 = [];

    for (const id of assignments.party1 || []) {
      if (valid.has(id) && !seen.has(id) && p1.length < MAX_PER_PARTY) {
        p1.push(id);
        seen.add(id);
      }
    }
    for (const id of assignments.party2 || []) {
      if (valid.has(id) && !seen.has(id) && p2.length < MAX_PER_PARTY) {
        p2.push(id);
        seen.add(id);
      }
    }
    for (const c of chars) {
      if (seen.has(c.id)) continue;
      if (p1.length < MAX_PER_PARTY) p1.push(c.id);
      else if (p2.length < MAX_PER_PARTY) p2.push(c.id);
      seen.add(c.id);
    }

    const normalized = { party1: p1, party2: p2 };
    if (JSON.stringify(assignments) !== JSON.stringify(normalized)) writeAssignments(normalized);

    return {
      chars,
      map,
      assignments: normalized,
      p1: p1.map((id) => map.get(id)).filter(Boolean),
      p2: p2.map((id) => map.get(id)).filter(Boolean)
    };
  }

  function renderParty(name, id, members) {
    const supports = members.filter((c) => role(c) === 'Support').length;
    return `<article class="party authoritative-party" data-party="${id}">
      <div class="party-heading">
        <div>
          <h3>${name}</h3>
          <div class="party-score">Estimated potential: <strong>${format(score(members))}</strong></div>
        </div>
        <div class="party-meta">${members.length}/4 · ${supports} support</div>
      </div>
      <div class="party-dropzone authoritative-dropzone" data-drop-party="${id}">
        ${members.length ? members.map((c) => `
          <div class="party-member authoritative-member" draggable="true" data-character-id="${esc(c.id)}">
            <div class="party-member-main">
              <a class="party-character-link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.profile.name || c.name)}</a>
              <span>${esc(c.profile.class || 'Unknown')} · CP ${power(c).toLocaleString(undefined,{maximumFractionDigits:2})}</span>
            </div>
          </div>`).join('') : '<div class="party-empty">Drop a character here</div>'}
      </div>
    </article>`;
  }

  function render() {
    const el = $('#suggestedParties');
    if (!el) return;
    const m = model();
    if (!m.chars.length) {
      el.innerHTML = '<div class="empty-roster">Add specific character profiles to generate the party setup.</div>';
      return;
    }
    const baseline = total(m.p1, m.p2);
    el.innerHTML = `
      <div class="authoritative-summary">
        <strong>Combined estimated potential: ${format(baseline)}</strong>
        <span class="potential-explanation"> — relative damage score for both parties combined; higher is better. This is an optimizer score, not an in-game DPS value.</span>
      </div>
      <div class="authoritative-parties">
        ${renderParty('Party 1','party1',m.p1)}
        ${renderParty('Party 2','party2',m.p2)}
      </div>
      <div id="swapImpact" class="swap-impact neutral" aria-live="polite"></div>`;
  }

  function showImpact(before, after, label) {
    const change = before ? ((after - before) / before) * 100 : 0;
    const el = $('#swapImpact');
    if (!el) return;
    const cls = change > 0.0001 ? 'positive' : change < -0.0001 ? 'negative' : 'neutral';
    const number = `<strong class="swap-impact-number ${cls}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</strong>`;
    el.className = `swap-impact ${cls}`;
    el.innerHTML = `${esc(label)}: ${number} combined estimated potential damage (${format(before)} → ${format(after)}).`;
  }

  function partyFor(id, assignments) {
    if (assignments.party1.includes(id)) return 'party1';
    if (assignments.party2.includes(id)) return 'party2';
    return null;
  }

  function moveCharacter(id, destination) {
    const m = model();
    const source = partyFor(id, m.assignments);
    if (!source || source === destination) return;
    if (m.assignments[destination].length >= MAX_PER_PARTY) return;
    const before = total(m.p1, m.p2);
    m.assignments[source] = m.assignments[source].filter((x) => x !== id);
    m.assignments[destination].push(id);
    writeAssignments(m.assignments);
    render();
    const after = model();
    showImpact(before, total(after.p1, after.p2), 'Move applied');
  }

  function swapCharacters(sourceId, targetId) {
    const m = model();
    const sourceParty = partyFor(sourceId, m.assignments);
    const targetParty = partyFor(targetId, m.assignments);
    if (!sourceParty || !targetParty || sourceParty === targetParty) return;
    const before = total(m.p1, m.p2);
    const si = m.assignments[sourceParty].indexOf(sourceId);
    const ti = m.assignments[targetParty].indexOf(targetId);
    m.assignments[sourceParty][si] = targetId;
    m.assignments[targetParty][ti] = sourceId;
    writeAssignments(m.assignments);
    render();
    const after = model();
    showImpact(before, total(after.p1, after.p2), 'Swap applied');
  }

  function makeRosterNamesClickable() {
    const roster = $('#roster');
    if (!roster) return;
    roster.querySelectorAll('.character').forEach((card) => {
      const button = card.querySelector('.remove-character');
      const id = button?.dataset.id;
      const c = readState().characters.find((x) => x.id === id);
      const heading = card.querySelector('h3');
      if (!c || !heading || heading.querySelector('a')) return;
      const a = document.createElement('a');
      a.href = c.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'character-bible-link';
      a.textContent = heading.textContent;
      heading.replaceChildren(a);
    });
  }

  function install() {
    const optimizeButton = $('#optimizeBtn');
    if (optimizeButton && !optimizeButton.dataset.authoritativeOptimizer) {
      optimizeButton.dataset.authoritativeOptimizer = '1';
      optimizeButton.onclick = () => {
        const chars = characters();
        if (!chars.length) { render(); return; }
        writeAssignments(optimize(chars));
        render();
      };
    }

    const roster = $('#roster');
    if (roster && !roster.dataset.partyRosterClick) {
      roster.dataset.partyRosterClick = '1';
      makeRosterNamesClickable();
    }

    const refresh = $('#refreshBtn');
    if (refresh && !refresh.dataset.authoritativeRefresh) {
      refresh.dataset.authoritativeRefresh = '1';
      refresh.addEventListener('click', () => window.setTimeout(() => {
        correctClasses();
        render();
        makeRosterNamesClickable();
      }, 100));
    }

    const parties = $('#suggestedParties');
    if (parties && !parties.dataset.authoritativeDrag) {
      parties.dataset.authoritativeDrag = '1';
      parties.addEventListener('dragstart', (event) => {
        const member = event.target.closest('.authoritative-member');
        if (!member) return;
        event.dataTransfer.setData('text/plain', member.dataset.characterId);
        event.dataTransfer.effectAllowed = 'move';
        member.classList.add('dragging');
      });
      parties.addEventListener('dragend', (event) => {
        event.target.closest('.authoritative-member')?.classList.remove('dragging');
        parties.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over'));
      });
      parties.addEventListener('dragover', (event) => {
        const member = event.target.closest('.authoritative-member');
        const zone = event.target.closest('.authoritative-dropzone');
        if (!member && !zone) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        (member || zone).classList.add('drag-over');
      });
      parties.addEventListener('dragleave', (event) => {
        event.target.closest('.authoritative-member, .authoritative-dropzone')?.classList.remove('drag-over');
      });
      parties.addEventListener('drop', (event) => {
        const sourceId = event.dataTransfer.getData('text/plain');
        const targetMember = event.target.closest('.authoritative-member');
        const targetZone = event.target.closest('.authoritative-dropzone');
        if (!sourceId || (!targetMember && !targetZone)) return;
        event.preventDefault();
        event.stopPropagation();
        parties.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over'));
        if (targetMember) {
          const targetId = targetMember.dataset.characterId;
          if (targetId && targetId !== sourceId) swapCharacters(sourceId, targetId);
        } else {
          moveCharacter(sourceId, targetZone.dataset.dropParty);
        }
      });
    }

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
