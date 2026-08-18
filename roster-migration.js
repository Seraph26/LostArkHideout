(() => {
  const TARGET = 'lostark-hideout-private-v3';
  const SOURCES = [
    'lostark-hideout-private-v2',
    'lostark-hideout-private',
    'lostark-hideout-characters-v1'
  ];

  function parse(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && Array.isArray(value.characters) ? value : null;
    } catch { return null; }
  }

  function normalize(source) {
    return source.characters.map((c, i) => ({
      ...c,
      id: c.id || `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      name: c.name || c.profile?.name || 'Unknown',
      url: c.url || c.profile?.url || '',
      profile: c.profile || null
    }));
  }

  const current = parse(TARGET);
  if (current?.characters?.length) return;

  for (const key of SOURCES) {
    const source = parse(key);
    if (source?.characters?.length) {
      localStorage.setItem(TARGET, JSON.stringify({
        ...source,
        characters: normalize(source)
      }));
      location.reload();
      return;
    }
  }
})();
