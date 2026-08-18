/* Render class identity from Bible's authoritative subclass data in both sections. */
(() => {
  const KEY = 'lostark-hideout-private-v3';
  const data = () => window.LostArkHideoutClassData;
  const iconFor = cls => { try { return data()?.iconUrl?.(cls) || ''; } catch { return ''; } };
  const canonical = cls => { try { return data()?.canonical?.(cls) || cls; } catch { return cls; } };

  function apply() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state || !Array.isArray(state.characters)) return;
      let changed = false;
      for (const c of state.characters) {
        const p = c?.profile;
        if (!p) continue;
        const cls = canonical(p.class);
        if (cls && cls !== p.class) { p.class = cls; changed = true; }
        const icon = iconFor(cls);
        // Always prefer the canonical class icon over a stale icon captured by
        // the generic SVG lookup. This is what prevents an Assassin subclass
        // such as Souleater from inheriting the Reaper icon.
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
        const p = c.profile;
        const cls = canonical(p.class) || 'Unknown';
        const icon = iconFor(cls) || p.classIcon || '';
        const root = link.closest('article.character, .slot, .party, .party-card') || link.parentElement;
        if (!root) return;
        root.querySelectorAll('img.class-icon').forEach(img => {
          if (icon) img.src = icon;
          img.alt = cls;
        });
        root.querySelectorAll('.class').forEach(el => { el.textContent = cls; });
        root.querySelectorAll('small').forEach(el => {
          const text = String(el.textContent || '');
          if (/·\s*iLvl\s/i.test(text)) {
            const rest = text.replace(/^[^·]+·\s*/i, '');
            el.textContent = `${cls} · ${rest}`;
          }
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
