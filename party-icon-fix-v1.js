(() => {
  const STORAGE_KEYS = ['lostark-hideout-private-v3', 'lostark-hideout-private-v2'];

  function normalizePath(href) {
    try {
      const u = new URL(href, location.href);
      return u.pathname.replace(/\/$/, '').toLowerCase();
    } catch {
      return '';
    }
  }

  function profiles() {
    for (const key of STORAGE_KEYS) {
      try {
        const state = JSON.parse(localStorage.getItem(key) || 'null');
        if (state?.characters?.length) return state.characters;
      } catch {}
    }
    return [];
  }

  function canonicalClassForUrl(characterUrl) {
    const target = normalizePath(characterUrl);
    if (!target) return '';
    const match = profiles().find(c => normalizePath(c?.url) === target);
    return match?.profile?.class || '';
  }

  function canonicalIconForClass(cls) {
    try {
      return window.LostArkHideoutClassData?.iconUrl?.(cls) || '';
    } catch {
      return '';
    }
  }

  function replaceIcons(root, src) {
    if (!root || !src) return;
    root.querySelectorAll('img.class-icon').forEach(img => {
      if (img.src !== src) img.src = src;
    });
  }

  function applyIcon(url, src) {
    if (!src) return;
    const target = normalizePath(url);

    document.querySelectorAll('a.character-bible-link[href], a.party-character-link[href]').forEach(link => {
      if (normalizePath(link.href) !== target) return;

      // Available Characters: the icon is a sibling of the Bible link inside
      // the character article, not a child of the link itself.
      const article = link.closest('article.character');
      if (article) replaceIcons(article, src);

      // Optimized Party: the icon normally lives in the same slot/title.
      const slot = link.closest('.slot, .party, article');
      if (slot) replaceIcons(slot, src);

      // Retain the old behavior for any link that does contain its own icon.
      replaceIcons(link, src);
    });
  }

  function findCharacterUrls() {
    const urls = new Set();
    document.querySelectorAll('a.character-bible-link[href], a.party-character-link[href]').forEach(a => urls.add(a.href));
    return [...urls];
  }

  function run() {
    for (const url of findCharacterUrls()) {
      const cls = canonicalClassForUrl(url);
      const src = canonicalIconForClass(cls);
      if (src) applyIcon(url, src);
    }
  }

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(run, 100);
  });

  observer.observe(document.body, { subtree: true, childList: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
