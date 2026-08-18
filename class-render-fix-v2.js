/* Use the Bible roster-derived class icon as the authoritative class identity in both sections. */
(() => {
  const KEY = 'lostark-hideout-private-v3';
  const data = () => window.LostArkHideoutClassData;
  const normalize = v => String(v || '').replace(/\s+/g, '').toLowerCase();
  const iconFor = cls => { try { return data()?.iconUrl?.(cls) || ''; } catch { return ''; } };
  const isSouleaterIcon = src => { try { return data()?.isSouleaterSvg?.(decodeURIComponent(String(src || ''))) || /M524\.5,356\.5/.test(String(src || '')); } catch { return /M524\.5,356\.5/.test(String(src || '')); } };

  function apply() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state || !Array.isArray(state.characters)) return;
      let changed = false;

      for (const c of state.characters) {
        const p = c?.profile;
        if (!p) continue;

        // The class icon captured from the Bible roster is authoritative. This
        // prevents unrelated class names found elsewhere in the page from
        // changing the displayed class (the exact problem seen in the party
        // section for Diamarte).
        if (p.classIcon && isSouleaterIcon(p.classIcon)) {
          if (p.class !== 'Souleater') { p.class = 'Souleater'; changed = true; }
          const canonicalIcon = iconFor('Souleater');
          if (canonicalIcon && p.classIcon !== canonicalIcon) { p.classIcon = canonicalIcon; changed = true; }
          continue;
        }

        const canonical = data()?.canonical?.(p.class) || p.class;
        if (canonical && canonical !== p.class) { p.class = canonical; changed = true; }
        const icon = iconFor(p.class);
        if (icon && !p.classIcon) { p.classIcon = icon; changed = true; }
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
        const p = c.profile;
        const cls = p.class || 'Unknown';
        const icon = iconFor(cls) || p.classIcon || '';
        const root = link.closest('article.character, .slot, .party, .party-card') || link.parentElement;
        if (!root) return;
        root.querySelectorAll('img.class-icon').forEach(img => {
          if (icon) img.src = icon;
          img.alt = cls;
        });
        root.querySelectorAll('.class').forEach(el => { el.textContent = cls; });
        root.querySelectorAll('.party-character-title + small').forEach(el => {
          el.textContent = el.textContent.replace(/^[^·]+/, `${cls} `);
        });
      });
    } catch {}
  }

  function run() { apply(); updateVisibleDom(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(run, 250), {once:true});
  else setTimeout(run, 250);
  const observer = new MutationObserver(() => setTimeout(updateVisibleDom, 50));
  observer.observe(document.documentElement, {subtree:true, childList:true});
})();
