/* Normalize stored class presentation after the authoritative Bible parser runs. */
(() => {
  const KEY = 'lostark-hideout-private-v3';
  const data = () => window.LostArkHideoutClassData;
  const iconFor = (cls) => { try { return data()?.iconUrl?.(cls) || ''; } catch { return ''; } };
  function apply() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state || !Array.isArray(state.characters)) return;
      let changed = false;
      for (const c of state.characters) {
        const p = c?.profile;
        if (!p || !p.class || p.class === 'Unknown') continue;
        const canonical = data()?.canonical?.(p.class) || p.class;
        if (canonical !== p.class) { p.class = canonical; changed = true; }
        const icon = iconFor(p.class);
        if (icon && p.classIcon !== icon) { p.classIcon = icon; changed = true; }
      }
      if (changed) localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 150), {once:true});
  else setTimeout(apply, 150);
})();
