(() => {
  const CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';
  const CACHE = new Map();

  function normalizePath(href) {
    try {
      const u = new URL(href, location.href);
      return u.pathname.replace(/\/$/, '').toLowerCase();
    } catch {
      return '';
    }
  }

  function extractBibleSvg(html, characterUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const target = normalizePath(characterUrl);
    if (!target) return '';

    for (const a of doc.querySelectorAll('a[href]')) {
      if (normalizePath(a.getAttribute('href')) !== target) continue;
      const svg = a.querySelector('svg.size-14, svg[class*="size-14"]');
      if (svg) {
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.removeAttribute('id');
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clone.outerHTML)}`;
      }
    }
    return '';
  }

  async function getIcon(characterUrl) {
    const key = normalizePath(characterUrl);
    if (!key) return '';
    if (CACHE.has(key)) return CACHE.get(key);

    const promise = (async () => {
      try {
        const r = await fetch(`${CONNECTOR}?url=${encodeURIComponent(characterUrl)}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        });
        if (!r.ok) return '';
        const data = await r.json();
        return extractBibleSvg(data.html || data.characterHtml || data.content || data.page || '', characterUrl);
      } catch {
        return '';
      }
    })();

    CACHE.set(key, promise);
    return promise;
  }

  function findCharacterUrls() {
    const urls = new Set();

    document.querySelectorAll('a.character-bible-link[href]').forEach(a => urls.add(a.href));
    document.querySelectorAll('a.party-character-link[href]').forEach(a => urls.add(a.href));

    return [...urls];
  }

  function applyIcon(url, src) {
    if (!src) return;

    const target = normalizePath(url);

    document.querySelectorAll('a.character-bible-link[href], a.party-character-link[href]').forEach(link => {
      if (normalizePath(link.href) !== target) return;
      const img = link.querySelector('img.class-icon');
      if (img) {
        if (img.src !== src) img.src = src;
      } else {
        const icon = document.createElement('img');
        icon.className = 'class-icon';
        icon.alt = '';
        icon.src = src;
        link.prepend(icon);
      }
    });
  }

  async function run() {
    for (const url of findCharacterUrls()) {
      const src = await getIcon(url);
      applyIcon(url, src);
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
