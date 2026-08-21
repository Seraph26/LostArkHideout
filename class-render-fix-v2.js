/* Class/spec identity display authority.
 *
 * IMPORTANT: The main Suggested Parties cards are the canonical display source.
 * New Addition and Character Comparison cards must use the exact same class,
 * spec, and icon values already displayed there. Do not invent a second
 * resolver for those cards.
 *
 * This file changes identity/spec/icon display only. It does not touch
 * optimization, scoring, hover, arrow, swap, or party behavior.
 */
(() => {
  'use strict';

  const NEW_KEYS = [
    'lostark-hideout-new-additions-v1',
    'lostark-hideout-private-v3',
    'lostark-hideout-private-v2'
  ];

  const norm = v => String(v ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'");

  const urlKey = value => {
    try { return new URL(value, location.href).href.replace(/\/$/, ''); }
    catch { return String(value || '').replace(/\/$/, ''); }
  };

  const canonical = value => {
    try { return window.LostArkHideoutClassData?.canonical?.(value) || value; }
    catch { return value; }
  };

  const iconFor = value => {
    try {
      return window.LostArkHideoutClassData?.iconUrl?.(value) ||
        (norm(value) === 'guardianknight'
          ? window.LostArkHideoutClassData?.iconUrl?.('Guardian Knight')
          : '') || '';
    } catch { return ''; }
  };

  const CHARACTER_CLASS_CORRECTIONS = {
    kittyjam: 'Guardianknight',
    ryohaku: 'Glavier',
    bailsxo: 'Artist',
    diamarte: 'Souleater'
  };

  function storedCharacterMap() {
    const map = new Map();
    for (const key of NEW_KEYS) {
      try {
        const state = JSON.parse(localStorage.getItem(key) || 'null');
        const list = Array.isArray(state?.characters) ? state.characters :
          (Array.isArray(state) ? state : []);
        for (const c of list) {
          const url = c?.url || c?.profile?.url;
          if (url) map.set(urlKey(url), c);
        }
      } catch {}
    }
    return map;
  }

  /*
   * The main group already has the correct class/spec/icon rendering.
   * Read those rendered values directly instead of re-parsing Bible data.
   * This makes Comparison/New Addition cards follow the exact same path.
   */
  function mainGroupAuthority() {
    const map = new Map();
    document.querySelectorAll('#suggestedParties a[href*="lostark.bible/character/"]').forEach(link => {
      const host = link.closest('.party-member') || link.parentElement;
      if (!host) return;

      const icon = host.querySelector('img.class-icon');
      const specNode = host.querySelector('.party-class-label');
      const className =
        icon?.alt?.trim() ||
        host.querySelector('[data-character-class]')?.getAttribute('data-character-class') || '';
      const spec = specNode?.textContent?.trim() || '';

      if (!className && !spec && !icon?.src) return;

      map.set(urlKey(link.href), {
        className: canonical(className),
        spec,
        icon: icon?.currentSrc || icon?.src || ''
      });
    });
    return map;
  }

  function fallbackAuthority(character) {
    const profile = character?.profile || {};
    const name = norm(profile.name || character?.name);
    const corrected = CHARACTER_CLASS_CORRECTIONS[name];
    const cls = corrected || profile.className || profile.class || '';
    const icon = profile.classIcon || iconFor(cls);
    const spec = profile.spec || profile.specialization || '';
    return {
      className: canonical(cls),
      spec: spec === '-' ? '' : spec,
      icon
    };
  }

  function applyToRoot(root, authority) {
    if (!root || !authority) return;

    if (authority.icon) {
      root.querySelectorAll('img.class-icon').forEach(img => {
        if (img.getAttribute('src') !== authority.icon) img.src = authority.icon;
        img.removeAttribute('srcset');
        if (authority.className) img.alt = authority.className;
      });
    }

    if (authority.spec) {
      root.querySelectorAll('.party-class-label,[data-character-spec],.spec').forEach(el => {
        el.textContent = authority.spec;
      });

      /* New Addition cards use .class for the visible spec label. */
      if (root.matches?.('.new-addition-card')) {
        const label = root.querySelector('.class');
        if (label) label.textContent = authority.spec;
      }
    }

    if (authority.className) {
      root.querySelectorAll('[data-character-class]').forEach(el => {
        el.setAttribute('data-character-class', authority.className);
      });
    }
  }

  function apply() {
    const main = mainGroupAuthority();
    const stored = storedCharacterMap();

    /* Only cards outside the main Suggested Parties group are targets. */
    document.querySelectorAll('a[href*="lostark.bible/character/"]').forEach(link => {
      if (link.closest('#suggestedParties')) return;

      const key = urlKey(link.href);
      const authority = main.get(key) || fallbackAuthority(stored.get(key));
      if (!authority?.className && !authority?.spec && !authority?.icon) return;

      const root = link.closest(
        '.new-addition-card,.character-card,article.character,.character,.comparison-card,.comparison-character,.character-comparison'
      ) || link.parentElement;

      applyToRoot(root, authority);
    });
  }

  let timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('lostark-build-profiles-v3-ready', schedule);
})();
