(() => {
  const CLASS_ID_TO_NAME = {
    soul_eater:'Souleater',
    souleater:'Souleater'
  };

  const SOULEATER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 615.4 661.3" fill="currentColor"><path d="M524.5,356.5c-12.1-35.3-24.1-63.7-58.2-94.2c-34.1-30.5-71.7-39-78.8-21.3c-7.8-7.1-27-15.6-48.3-15.6c-21.3,0-49,28.4-15.6,38.3c-6.4,7.8-16.1,10.6-15.5,18.5c0.6,7.8,19.1,31.9,27.6,49c8.5,17,17,39.7,19.9,44c2.8,4.3,9.9-12.4,7.8-18.6c-2.1-6.2-4.3-13.4-9.2-15.5c14.2,2.2,17.7-2.8,20.6-5.6c2.8-2.8,3.5-7.8,5.7-9.2c-9.2-5.7-31.2-3.5-36.9-5c1.4-15.6,17-31.9,46.8-36.9c-2.1,9.2-12.8,27.7,6.4,27.7c0,8.5-5,21.3,3.5,22.7c8.5,1.4,31.2-13.5,19.2-45.4c14.2,8.5,19.2,16.3,17.7,44c-1.4,27.7-7.1,45.4-24.8,68.8c8.5-22.7,13.5-49,6.4-51.1c-9.2,10.6-25.5,17.7-31.9,33.4c-6.4,15.6-11.4,36.9-7.1,41.9c3.8,4.4,21.3-9.2,25.5-13.5c-7.8,14.2-14.1,22.1-29.8,29.9c-15.6,7.8-19.9,26.2-5,34c-1.4,8.5-14.2,14.9-5,17c9.2,2.1,24.1,1.4,46.1-31.2c-0.7,42.6-41.2,84.5-83.7,53.2c9.9-9.2,20.6-19.2,14.2-49.7c-11.4,3.5-24.8,7.8-14.9,17.7c-12.8,2.1-54.3,2.1-87.4-23.4S164,379.4,170.4,312c9.2,36.9,26.3,87.3,55.4,95.8s27,5.7,27,5.7s-6.4,16.3-3.5,28.4c13.5-14.9,16.3-20.6,18.5-24.8c9.2,0.7,24.8-1.4,34.8-5.7c-8.5,17-12.8,15.6-9.2,22c3.5,6.4,29.8,12.1,39,0c9.2-12.1,12.8-41.2,0.7-65.3c-12.1-24.1-31.2-59.6-83.7-83.7c17-5.7,25.5-2.1,30.5-7.1s7.8-22-3.5-23.4c-11.4-1.4-32.6,5.7-40.5,14.9c2.1-14.2,5-31.2,12.8-34.8c-22,2.8-44.7,14.2-68.1,34.1c9.9-24.1,31.2-49,28.4-57.5c-2.8-8.5-14.2-21.3-103.6-10.6c23.4-12.1,50.4-20.6,82.3-21.3c31.9-0.7,64.6,3.5,70.3,7.8c-9.9,7.1-13.5,12.1-11.4,16.3c12.1-1.4,53.2-9.9,110,0.7c-27-11.4-56.1-29.1-139.8-33.4c39.7-7.1,139.1-19.2,207.9,12.8S530.2,296.8,524.5,356.5z"/><path d="M386.1,458.2c0,0,15.6-22,30.3-27c23.1-7.9,37.5-25.6,41.4-35.4c-7.1-0.7-15.6,4.3-18.5,7.1c9.2-12.8,32.6-26.3,30.5-61.8c6.4,5.7,11.4,38.4,1.5,74.4c-12.1,44-40.5,64-43.4,66.9c7.1-14.2,9.2-31.9,3.5-31.9C421.5,450.4,409.2,449.8,386.1,458.2z"/><path d="M303.1,341c0,0,22.7,29.9,23.4,36.9c-17.7-0.7-26.3-3.5-38.3,5.7c-12.1,9.2-29.1,35.5-32.6,41.9C260.5,402.8,283.9,358,303.1,341z"/></svg>';

  const ICON_FILES = {
    Berserker:'ClassIcon-Warrior-Berserker.png', Destroyer:'ClassIcon-Warrior-Destroyer.png', Gunlancer:'ClassIcon-Warrior-Gunlancer.png', Paladin:'ClassIcon-Warrior-Paladin.png', Slayer:'ClassIcon-Warrior-Slayer.png', Valkyrie:'ClassIcon-Warrior-Valkyrie.png',
    Arcanist:'ClassIcon-Mage-Arcanist.png', Bard:'ClassIcon-Mage-Bard.png', Sorceress:'ClassIcon-Mage-Sorceress.png', Summoner:'ClassIcon-Mage-Summoner.png',
    Glaivier:'ClassIcon-Martial Artist-Glaivier.png', Scrapper:'ClassIcon-Martial Artist-Scrapper.png', Soulfist:'ClassIcon-Martial Artist-Soulfist.png', Striker:'ClassIcon-Martial Artist-Striker.png', Wardancer:'ClassIcon-Martial Artist-Wardancer.png', Breaker:'ClassIcon-Martial Artist-Breaker.png',
    Artillerist:'ClassIcon-Gunner-Artillerist.png', Deadeye:'ClassIcon-Gunner-Deadeye.png', Machinist:'ClassIcon-Gunner-Machinist.png', Sharpshooter:'ClassIcon-Gunner-Sharpshooter.png', Gunslinger:'ClassIcon-Gunner-Gunslinger.png',
    Deathblade:'ClassIcon-Assassin-Deathblade.png', Shadowhunter:'ClassIcon-Assassin-Shadowhunter.png', Reaper:'ClassIcon-Assassin-Reaper.png', Souleater:'Icon Soul Eater.jpg',
    Artist:'ClassIcon-Specialist-Artist.png', Aeromancer:'ClassIcon-Specialist-Aeromancer.png', Wildsoul:'ClassIcon-Specialist-Wildsoul.png', Guardianknight:'ClassIcon-Guardianknight.png'
  };

  const canonical = id => CLASS_ID_TO_NAME[String(id || '').trim().toLowerCase()] || null;
  const iconUrl = name => {
    if (String(name || '').replace(/\s+/g,'').toLowerCase() === 'souleater') {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SOULEATER_SVG)}`;
    }
    return ICON_FILES[name] ? `https://lostark.fandom.com/wiki/Special:Redirect/file/${encodeURIComponent(ICON_FILES[name])}` : '';
  };

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
      let cls = null;
      const raid = html.match(/classification:\s*["']raid_merged["']([\s\S]{0,7000}?)/i);
      const raidClass = raid?.[1]?.match(/classId:\s*["']([a-z_]+)["']/i)?.[1];
      if (raidClass) cls = canonical(raidClass);
      if (!cls) {
        const matches = [...html.matchAll(/(?:class|classId)\s*:\s*["']([a-z_]+)["']/g)].map(m => m[1]);
        for (const id of matches) { const c = canonical(id); if (c) { cls = c; break; } }
      }
      if (!cls) return response;
      data[htmlKey] = html.replace(/<head([^>]*)>/i, `<head$1><meta data-character-class="${cls}">`);
      return new Response(JSON.stringify(data), {status: response.status, statusText: response.statusText, headers: response.headers});
    } catch { return response; }
  };

  window.LostArkHideoutClassData = { CLASS_ID_TO_NAME, ICON_FILES, canonical, iconUrl };
})();
