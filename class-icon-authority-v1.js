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
  /* Fandom hosts an icon for every class except Breaker, so this is the same
     repository-hosted fallback Valkyrie and Guardianknight already use. Taken
     from Bible's roster tab, with xmlns added and currentColor replaced -- an
     <img> cannot inherit currentColor and renders blank without both. */
  const BREAKER_ICON = asset('breaker-icon.svg');
  /* Fandom has no Wildsoul icon -- only the generic Specialist group icon, which
     is what this used to point at and why it looked wrong. Taken from Bible's
     roster tab like the Breaker one. */
  const WILDSOUL_ICON = asset('wildsoul-icon.svg');
  const SPECIAL = {
    valkyrie: VALKYRIE_ICON,
    wildsoul: WILDSOUL_ICON,
    guardianknight: GUARDIANKNIGHT_ICON,
    breaker: BREAKER_ICON
  };

  /* Display names for the classes we host locally. Keep in step with SPECIAL:
     an entry missing here just means the card keeps whatever alt it already had. */
  const DISPLAY_NAMES = {
    valkyrie: 'Valkyrie',
    wildsoul: 'Wildsoul',
    guardianknight: 'Guardianknight',
    breaker: 'Breaker'
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
      /* Was a ternary that fell through to 'Wildsoul' for anything unlisted, so
         adding a class to SPECIAL silently mislabelled it. Look the name up,
         and leave the existing alt alone when it is not one of ours. */
      img.alt = DISPLAY_NAMES[cls] || img.alt;
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
