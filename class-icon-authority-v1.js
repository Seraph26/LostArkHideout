/* Final class-icon authority for non-Fandom / special classes.
 * Valkyrie is a repository-hosted hardcoded SVG asset. Wildsoul uses the
 * verified Specialist class icon supplied by the user.
 * This file only changes class icon identity/display; it does not touch
 * optimization, scoring, hover, arrow, swap, or party logic.
 */
(() => {
  'use strict';

  const asset = name => new URL(name, document.baseURI).href;
  const VALKYRIE_ICON = asset('valkyrie-icon.svg');
  const WILDSOUL_ICON = 'https://static.wikia.nocookie.net/lostark_gamepedia/images/3/3b/ClassIcon-Specialist.png/revision/latest/scale-to-width-down/120?cb=20230901205506';
  const SPECIAL = { valkyrie: VALKYRIE_ICON, wildsoul: WILDSOUL_ICON };

  function iconFor(name) {
    return SPECIAL[String(name || '').trim().toLowerCase()] || '';
  }

  function patchClassData() {
    const data = window.LostArkHideoutClassData;
    if (!data || typeof data.iconUrl !== 'function' || data.__specialIconAuthorityV2) return !!data;
    const original = data.iconUrl.bind(data);
    data.iconUrl = name => iconFor(name) || original(name);
    data.__specialIconAuthorityV2 = true;
    return true;
  }

  function patchStored() {
    for (const key of ['lostark-hideout-private-v3', 'lostark-hideout-private-v2', 'lostark-hideout-new-additions-v1']) {
      try {
        const state = JSON.parse(localStorage.getItem(key) || 'null');
        const list = Array.isArray(state?.characters) ? state.characters : null;
        if (!list) continue;
        let changed = false;
        for (const c of list) {
          const cls = String(c?.profile?.class || c?.class || '').trim().toLowerCase();
          const icon = iconFor(cls);
          if (icon && c.profile && c.profile.classIcon !== icon) {
            c.profile.classIcon = icon;
            changed = true;
          }
        }
        if (changed) localStorage.setItem(key, JSON.stringify(state));
      } catch {}
    }
  }

  function patchDom() {
    document.querySelectorAll('img.class-icon').forEach(img => {
      const cls = String(img.alt || '').trim().toLowerCase();
      const icon = iconFor(cls);
      if (!icon) return;
      if (img.src !== icon) img.src = icon;
      img.removeAttribute('srcset');
      img.alt = cls === 'valkyrie' ? 'Valkyrie' : 'Wildsoul';
    });
  }

  function run() {
    patchClassData();
    patchStored();
    patchDom();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('load', run, { once: true });
  new MutationObserver(run).observe(document.documentElement, { subtree: true, childList: true });
})();
