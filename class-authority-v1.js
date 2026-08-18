/* Bible class authority: derive the actual subclass from the page's canonical class id,
   rather than treating the broad family name (e.g. Assassin) as the subclass. */
(() => {
  const CLASS_IDS = {
    berserker:'Berserker', destroyer:'Destroyer', gunlancer:'Gunlancer', paladin:'Paladin', slayer:'Slayer', valkyrie:'Valkyrie',
    arcanist:'Arcanist', arcana:'Arcanist', bard:'Bard', sorceress:'Sorceress', summoner:'Summoner',
    glaivier:'Glaivier', glavier:'Glaivier', scrapper:'Scrapper', soulfist:'Soulfist', striker:'Striker', wardancer:'Wardancer', breaker:'Breaker',
    artillerist:'Artillerist', deadeye:'Deadeye', machinist:'Machinist', sharpshooter:'Sharpshooter', gunslinger:'Gunslinger',
    deathblade:'Deathblade', shadowhunter:'Shadowhunter', reaper:'Reaper', soul_eater:'Souleater', souleater:'Souleater',
    artist:'Artist', aeromancer:'Aeromancer', wildsoul:'Wildsoul', dragon_knight:'Guardianknight', holyknight:'Paladin', holyknight_female:'Paladin',
    weather_artist:'Aeromancer', yinyangshi:'Yinyangshi', alchemist:'Alchemist'
  };

  const SOULEATER_SVG_RE = /M524\.5,356\.5/;
  const normalizeId = v => String(v || '').trim().toLowerCase().replace(/[ -]+/g, '_');

  function classFromHtml(html) {
    const source = String(html || '');
    const patterns = [
      /class\s*:\s*["']([a-z_]+)["']/i,
      /["']class["']\s*:\s*["']([a-z_]+)["']/i,
      /classId\s*:\s*["']([a-z_]+)["']/i,
      /["']classId["']\s*:\s*["']([a-z_]+)["']/i
    ];
    for (const re of patterns) {
      const m = source.match(re);
      const name = m && CLASS_IDS[normalizeId(m[1])];
      if (name) return name;
    }
    return null;
  }

  function inject(html) {
    if (typeof html !== 'string') return html;
    const cls = classFromHtml(html);
    if (!cls) return html;
    // Make the canonical subclass visible to the existing Bible parser before it
    // falls back to incidental text such as "Reaper" elsewhere on the page.
    const marker = `<span data-bible-authoritative-class="${cls}" aria-label="${cls}"></span>`;
    return html.replace(/<body[^>]*>/i, m => `${m}${marker}`);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (!/lostark-bible-connector\.seraph0226\.workers\.dev\/character/i.test(url)) return response;
      const clone = response.clone();
      const data = await clone.json();
      const htmlKey = ['html','characterHtml','content','page'].find(k => typeof data?.[k] === 'string');
      if (!htmlKey) return response;
      const next = {...data, [htmlKey]: inject(data[htmlKey])};
      return new Response(JSON.stringify(next), {status: response.status, statusText: response.statusText, headers: {'Content-Type':'application/json'}});
    } catch {
      return response;
    }
  };

  window.LostArkHideoutClassAuthority = { CLASS_IDS, classFromHtml };
})();
