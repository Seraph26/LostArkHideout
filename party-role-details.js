(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const SUPPORTS = new Set(['Bard', 'Paladin', 'Artist']);

  function load() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return Array.isArray(state?.characters) ? state.characters : [];
    } catch {
      return [];
    }
  }

  function render() {
    const characters = load();
    document.querySelectorAll('.authoritative-member[data-character-id]').forEach((member) => {
      if (member.querySelector('.party-role')) return;
      const character = characters.find((item) => item.id === member.dataset.characterId);
      const className = character?.profile?.class || '';
      if (!className) return;
      const role = SUPPORTS.has(className) ? 'Support' : 'DPS';
      const span = document.createElement('span');
      span.className = `party-role ${role.toLowerCase()}`;
      span.textContent = role;
      member.querySelector('.party-member-main')?.appendChild(span);
    });
  }

  function install() {
    render();
    const target = document.querySelector('#suggestedParties');
    if (target && !target.dataset.roleObserver) {
      target.dataset.roleObserver = '1';
      new MutationObserver(render).observe(target, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
