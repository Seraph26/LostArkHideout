(() => {
  const originalFetch = window.fetch;
  const CONNECTOR = 'lostark-bible-connector.seraph0226.workers.dev/character';

  function extractRaidCp(html) {
    if (typeof html !== 'string') return null;

    const estimated = html.match(
      /classification:\s*"raid_merged"[\s\S]{0,5000}?combatPower:\{id:1,score:([0-9]+(?:\.[0-9]+)?)\}/i
    );
    if (estimated) return { value: Number(estimated[1]), source: 'Estimated Raid Loadout' };

    const current = html.match(
      /classification:\s*"raid"[\s\S]{0,5000}?combatPower:\{id:1,score:([0-9]+(?:\.[0-9]+)?)\}/i
    );
    if (current) return { value: Number(current[1]), source: 'Current Loadout (Raid)' };

    return null;
  }

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

    if (!url.includes(CONNECTOR)) return response;

    try {
      const data = await response.clone().json();
      const html = data.html || data.characterHtml || data.content || data.page;
      const cp = extractRaidCp(html);

      if (cp && typeof html === 'string') {
        const marker = `<div style="display:none">${cp.source} Combat Power ${cp.value}</div>`;
        if (!html.includes(marker)) data.html = marker + html;

        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers)
        });
      }
    } catch {
      // Leave non-JSON/error responses untouched.
    }

    return response;
  };
})();
