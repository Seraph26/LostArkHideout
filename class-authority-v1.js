/* Bible class authority: derive the actual subclass from the character's canonical
   classId/class field in the embedded page data. Never infer a subclass from the
   broad family name or incidental text elsewhere on the page. */
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
  const normalizeId = v => String(v || '').trim().toLowerCase().replace(/[ -]+/g, '_');

  function classFromHtml(html) {
    const source = String(html || '');
    // IMPORTANT: classId is the canonical subclass field used by Bible's raid
    // data. Check it before generic `class:` fields, because the page can contain
    // unrelated class text (including another roster character's class).
    const canonicalPatterns = [
      /classId\s*:\s*["']([a-z_]+)["']/ig,
      /["']classId["']\s*:\s*["']([a-z_]+)["']/ig,
      /classification\s*:\s*["']raid_merged["'][\s\S]{0,2500}?classId\s*:\s*["']([a-z_]+)["']/i,
      /classification\s*:\s*["']raid_merged["'][\s\S]{0,2500}?["']classId["']\s*:\s*["']([a-z_]+)["']/i
    ];
    for (const re of canonicalPatterns) {
      const m = source.match(re);
      if (m) {
        const name = CLASS_IDS[normalizeId(m[1])];
        if (name) return name;
      }
    }
    // Fall back only when canonical raid data is absent.
    const fallbackPatterns = [
      /class\s*:\s*["']([a-z_]+)["']/i,
      /["']class["']\s*:\s*["']([a-z_]+)["']/i
    ];
    for (const re of fallbackPatterns) {
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
