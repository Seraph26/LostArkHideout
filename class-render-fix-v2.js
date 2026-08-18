/* Keep both roster and party class rendering on the same character-aware resolver. */
(() => {
  const KEY = 'lostark-hideout-private-v3';
  const data = () => window.LostArkHideoutClassData;
  const iconFor = cls => { try { return data()?.iconUrl?.(cls) || ''; } catch { return ''; } };
  const canonical = cls => { try { return data()?.canonical?.(cls) || cls; } catch { return cls; } };
  const characterClass = c => {
    const name = String(c?.profile?.name || c?.name || '').trim().toLowerCase();
    const url = String(c?.url || '').toLowerCase();
    // Use the same character-specific identity that the main roster uses.
    if (name === 'diamarte' || /\/diamarte(?:\/|$)/i.test(url)) return 'Souleater';
    return canonical(c?.profile?.class) || 'Unknown';
  };

  function apply() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state || !Array.isArray(state.characters)) return;
      let changed = false;
      for (const c of state.characters) {
        const p = c?.profile;
        if (!p) continue;
        const cls = characterClass(c);
        if (cls && cls !== p.class) { p.class = cls; changed = true; }
        const icon = iconFor(cls);
        if (icon && p.classIcon !== icon) { p.classIcon = icon; changed = true; }
      }
      if (changed) localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function updateVisibleDom() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state?.characters) return;
      const byUrl = new Map(state.characters.map(c => [String(c.url || '').toLowerCase().replace(/\/$/, ''), c]));
      document.querySelectorAll('a.character-bible-link[href], a.party-character-link[href]').forEach(link => {
        const key = String(link.href || '').toLowerCase().replace(/\/$/, '');
        const c = byUrl.get(key);
        if (!c?.profile) return;
        const cls = characterClass(c);
        const icon = iconFor(cls) || c.profile.classIcon || '';
        const root = link.closest('article.character, .slot, .party, .party-card, .authoritative-party, .authoritative-member') || link.parentElement;
        if (!root) return;
        root.querySelectorAll('img.class-icon').forEach(img => {
          if (icon) img.src = icon;
          img.alt = cls;
        });
        root.querySelectorAll('.class').forEach(el => { el.textContent = cls; });
        root.querySelectorAll('small').forEach(el => {
          const text = String(el.textContent || '');
          if (/·\s*iLvl\s/i.test(text)) el.textContent = `${cls} · ${text.replace(/^[^·]+·\s*/i, '')}`;
          else if (/^${'DUMMY'}$/) el.textContent = text;
        });
        // The authoritative party renderer puts the class directly in the
        // member's second span, so update that text without disturbing CP.
        const main = root.querySelector('.party-member-main');
        if (main) {
          const spans = main.querySelectorAll(':scope > span');
          if (spans.length) {
            const current = String(spans[0].textContent || '');
            spans[0].textContent = current.replace(/^[^·]+/, cls);
          }
        }
      });
    } catch {}
  }

  function run() { apply(); updateVisibleDom(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(run, 250), {once:true});
  else setTimeout(run, 250);
  const observer = new MutationObserver(() => setTimeout(updateVisibleDom, 50));
  observer.observe(document.documentElement, {subtree:true, childList:true});
})();
