(() => {
  const CLASS_ID_TO_NAME = {
    soul_eater:'Souleater',
    souleater:'Souleater'
  };

  const ICON_FILES = {
    Berserker:'ClassIcon-Warrior-Berserker.png', Destroyer:'ClassIcon-Warrior-Destroyer.png', Gunlancer:'ClassIcon-Warrior-Gunlancer.png', Paladin:'ClassIcon-Warrior-Paladin.png', Slayer:'ClassIcon-Warrior-Slayer.png', Valkyrie:'ClassIcon-Warrior-Valkyrie.png',
    Arcanist:'ClassIcon-Mage-Arcanist.png', Bard:'ClassIcon-Mage-Bard.png', Sorceress:'ClassIcon-Mage-Sorceress.png', Summoner:'ClassIcon-Mage-Summoner.png',
    Glaivier:'ClassIcon-Martial Artist-Glaivier.png', Scrapper:'ClassIcon-Martial Artist-Scrapper.png', Soulfist:'ClassIcon-Martial Artist-Soulfist.png', Striker:'ClassIcon-Martial Artist-Striker.png', Wardancer:'ClassIcon-Martial Artist-Wardancer.png', Breaker:'ClassIcon-Martial Artist-Breaker.png',
    Artillerist:'ClassIcon-Gunner-Artillerist.png', Deadeye:'ClassIcon-Gunner-Deadeye.png', Machinist:'ClassIcon-Gunner-Machinist.png', Sharpshooter:'ClassIcon-Gunner-Sharpshooter.png', Gunslinger:'ClassIcon-Gunner-Gunslinger.png',
    Deathblade:'ClassIcon-Assassin-Deathblade.png', Shadowhunter:'ClassIcon-Assassin-Shadowhunter.png', Reaper:'ClassIcon-Assassin-Reaper.png', Souleater:'Icon Soul Eater.jpg',
    Artist:'ClassIcon-Specialist-Artist.png', Aeromancer:'ClassIcon-Specialist-Aeromancer.png', Wildsoul:'ClassIcon-Specialist-Wildsoul.png', Guardianknight:'ClassIcon-Guardianknight.png'
  };

  const canonical = id => CLASS_ID_TO_NAME[String(id || '').trim().toLowerCase()] || null;
  const iconUrl = name => ICON_FILES[name] ? `https://lostark.fandom.com/wiki/Special:Redirect/file/${encodeURIComponent(ICON_FILES[name])}` : '';

  // Bible's page payload contains an authoritative class identifier. Inject it into
  // the returned HTML before app-fixed.js parses the profile so unrelated text cannot
  // cause a false class match. This is intentionally character-agnostic.
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const clone = response.clone();
      const type = clone.headers.get('content-type') || '';
      if (!type.includes('json')) return response;
      const data = await clone.json();
      const htmlKey = ['html','characterHtml','content','page'].find(k => typeof data?.[k] === 'string');
      if (!htmlKey) return response;
      const html = data[htmlKey];
      const matches = [...html.matchAll(/(?:class|classId)\s*:\s*["']([a-z_]+)["']/g)].map(m => m[1]);
      let cls = null;
      for (const id of matches) { const c = canonical(id); if (c) { cls = c; break; } }
      if (!cls) return response;
      data[htmlKey] = html.replace(/<head([^>]*)>/i, `<head$1><meta data-character-class="${cls}">`);
      return new Response(JSON.stringify(data), {status: response.status, statusText: response.statusText, headers: response.headers});
    } catch { return response; }
  };

  window.LostArkHideoutClassData = { CLASS_ID_TO_NAME, ICON_FILES, canonical, iconUrl };
})();
