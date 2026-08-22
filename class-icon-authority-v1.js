/* Final class-icon authority for non-Fandom / special classes.
 * Manual/repository-supplied class icons always take precedence over Fandom.
 * Valkyrie and Guardianknight are repository-hosted hardcoded SVG assets.
 * Wildsoul uses the verified Specialist class icon supplied by the user.
 * This file only changes class icon identity/display; it does not touch
 * optimization, scoring, hover, arrow, swap, or party logic.
 */
(() => {
  'use strict';

  const asset = name => new URL(name, document.baseURI).href;
  const VALKYRIE_ICON = asset('valkyrie-icon.svg');
  const GUARDIANKNIGHT_ICON = asset('guardianknight-icon.svg');
  const WILDSOUL_ICON = 'https://static.wikia.nocookie.net/lostark_gamepedia/images/3/3b/ClassIcon-Specialist.png/revision/latest/scale-to-width-down/120?cb=20230901205506';
  const SPECIAL = {
    valkyrie: VALKYRIE_ICON,
    wildsoul: WILDSOUL_ICON,
    guardianknight: GUARDIANKNIGHT_ICON,
    'guardian knight': GUARDIANKNIGHT_ICON,
    guardian_knight: GUARDIANKNIGHT_ICON,
    'guardian-knight': GUARDIANKNIGHT_ICON
  };

  function iconFor(name) {
    return SPECIAL[String(name || '').trim().toLowerCase()] || '';
  }

  function patchClassData() {
    const data = window.LostArkHideoutClassData;
    if (!data || typeof data.iconUrl !== 'function' || data.__specialIconAuthorityV3) return !!data;
    const original = data.iconUrl.bind(data);
    data.iconUrl = name => iconFor(name) || original(name);
    data.__specialIconAuthorityV3 = true;
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

  function patchDom(root = document) {
    root.querySelectorAll?.('img.class-icon').forEach(img => {
      const cls = String(img.alt || '').trim().toLowerCase();
      const icon = iconFor(cls);
      if (!icon) return;
      if (img.getAttribute('src') !== icon) img.src = icon;
      img.removeAttribute('srcset');
      img.alt = cls === 'valkyrie' ? 'Valkyrie' : (cls === 'guardianknight' || cls === 'guardian knight' || cls === 'guardian_knight' || cls === 'guardian-knight') ? 'Guardianknight' : 'Wildsoul';
    });
  }

  let scheduled = false;
  function scheduleDomPatch() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      patchDom();
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
  window.addEventListener('lostark-build-profiles-v3-ready', scheduleDomPatch);

  /* Only react when new DOM nodes containing class icons are actually added.
   * The previous document-wide observer ran on every UI mutation and could
   * cause repeated icon work while the comparison/party sections rendered. */
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes || []) {
        if (node.nodeType === 1 && (node.matches?.('img.class-icon') || node.querySelector?.('img.class-icon'))) {
          scheduleDomPatch();
          return;
        }
      }
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });
})();
