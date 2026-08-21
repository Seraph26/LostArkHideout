// Character-specific class corrections and final DOM guard for legacy/stale profiles.
(() => {
  const KEY = 'lostark-hideout-private-v3';
  const CORRECTIONS = new Map([
    ['ryohaku', 'Glavier'],
    ['bailsxo', 'Artist'],
    ['diamarte', 'Souleater'],
    ['kittyjam', 'Guardianknight']
  ]);

  function correctedName(character) {
    return String(character?.profile?.name || character?.name || '').trim().toLowerCase();
  }

  function applyStoredCorrections() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state || !Array.isArray(state.characters)) return;
      let changed = false;
      for (const character of state.characters) {
        const corrected = CORRECTIONS.get(correctedName(character));
        if (corrected && character.profile && character.profile.class !== corrected) {
          character.profile.class = corrected;
          changed = true;
        }
      }
      if (changed) localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function forceDiamartePartyDisplay() {
    const root = document.querySelector('#suggestedParties');
    if (!root) return;
    root.querySelectorAll('.authoritative-member, .slot').forEach(member => {
      const text = String(member.textContent || '').toLowerCase();
      if (!text.includes('diamarte')) return;
      const classNodes = member.querySelectorAll('span, small');
      classNodes.forEach(node => {
        if (/wardancer|summoner|souleater/i.test(node.textContent || '')) {
          node.textContent = (node.textContent || '')
            .replace(/Wardancer|Summoner|Souleater/ig, 'Souleater');
        }
      });
      const img = member.querySelector('img.class-icon');
      if (img) {
        const icon = window.LostArkHideoutClassData?.iconUrl?.('Souleater');
        if (icon) {
          img.src = icon;
          img.alt = 'Souleater';
        }
      }
    });
  }

  function apply() {
    applyStoredCorrections();
    forceDiamartePartyDisplay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 50), {once:true});
  } else {
    setTimeout(apply, 50);
  }

  const rootObserver = new MutationObserver(() => forceDiamartePartyDisplay());
  const startObserver = () => {
    const root = document.querySelector('#suggestedParties');
    if (root) rootObserver.observe(root, {childList:true, subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, {once:true});
  else startObserver();
})();
