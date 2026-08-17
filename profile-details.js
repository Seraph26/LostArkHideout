(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const SUPPORTS = new Set(['Bard', 'Paladin', 'Artist']);

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const format = (value) => value == null || value === '' ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

  function loadCharacters() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return Array.isArray(state?.characters) ? state.characters : [];
    } catch {
      return [];
    }
  }

  function effectList(items) {
    if (!Array.isArray(items) || !items.length) return '<span class="profile-empty">No parsed data</span>';
    return items.map((item) => `<span class="profile-chip">${esc(item.effect || item.name || '')}${item.value ? ` ${esc(item.value)}` : item.level != null ? ` Lv.${esc(item.level)}` : ''}</span>`).join('');
  }

  function renderDetails() {
    const characters = loadCharacters();
    const cards = document.querySelectorAll('#roster .character');
    cards.forEach((card) => {
      if (card.querySelector('.profile-details')) return;
      const id = card.querySelector('.remove-character')?.dataset.id;
      const character = characters.find((item) => item.id === id);
      const p = character?.profile;
      if (!p) return;

      const role = SUPPORTS.has(p.class) ? 'Support' : 'DPS';
      const engravings = Array.isArray(p.engravings) ? p.engravings : [];
      const arkPassive = Object.entries(p.arkPassive || {});
      const grid = Array.isArray(p.gridEffects) ? p.gridEffects : [];

      const detail = document.createElement('div');
      detail.className = 'profile-details';
      detail.innerHTML = `
        <div class="profile-role ${role.toLowerCase()}">${role}</div>
        <div class="profile-detail-section">
          <div class="profile-detail-title">Engravings</div>
          <div class="profile-chip-row">${engravings.length ? engravings.map((e) => `<span class="profile-chip">${esc(e.name)} ${esc(e.level)}/20</span>`).join('') : '<span class="profile-empty">No parsed engravings</span>'}</div>
        </div>
        <div class="profile-detail-section">
          <div class="profile-detail-title">Ark Passive</div>
          <div class="profile-chip-row">${arkPassive.length ? arkPassive.map(([name, level]) => `<span class="profile-chip">${esc(name)} Lv.${esc(level)}</span>`).join('') : '<span class="profile-empty">No parsed Ark Passive</span>'}</div>
        </div>
        <div class="profile-detail-section">
          <div class="profile-detail-title">Ark Grid Effects</div>
          <div class="profile-chip-row">${effectList(grid)}</div>
        </div>
        <div class="profile-loadout-line">Raid CP source: <strong>${esc(p.cpSource || 'Unknown')}</strong>${p.gemsIncomplete ? ' · Gems incomplete' : ''}</div>`;
      card.appendChild(detail);
    });
  }

  function schedule() {
    renderDetails();
    const roster = document.querySelector('#roster');
    if (roster && !roster.dataset.profileDetailsObserver) {
      roster.dataset.profileDetailsObserver = '1';
      new MutationObserver(() => renderDetails()).observe(roster, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
})();
