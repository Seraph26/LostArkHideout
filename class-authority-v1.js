/* Bible class authority: derive the actual subclass from the character's canonical
   raid profile data. Never infer a subclass from incidental page text. */
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

  function mapped(v) { return CLASS_IDS[normalizeId(v)] || null; }

  function classFromHtml(html) {
    const source = String(html || '');

    // Bible can include multiple classId values on one page. The page contains
    // raid-loadout data as well as unrelated class data, so a global first-match
    // lookup is unsafe. Prefer classId values belonging to the raid_merged object.
    const raidWindows = [];
    const raidRe = /raid_merged/ig;
    let rm;
    while ((rm = raidRe.exec(source))) raidWindows.push(source.slice(Math.max(0, rm.index - 2500), rm.index + 5000));
    for (const windowText of raidWindows) {
      const patterns = [
        /classId\s*:\s*["']([a-z_]+)["']/ig,
        /["']classId["']\s*:\s*["']([a-z_]+)["']/ig
      ];
      for (const re of patterns) {
        let m;
        while ((m = re.exec(windowText))) {
          const name = mapped(m[1]);
          if (name) return name;
        }
      }
    }

    // Prefer an explicit character/profile object if Bible exposes one.
    const profilePatterns = [
      /(?:character|profile|characterProfile)[\s\S]{0,1800}?classId\s*[:=]\s*["']([a-z_]+)["']/ig,
      /(?:character|profile|characterProfile)[\s\S]{0,1800}?["']classId["']\s*:\s*["']([a-z_]+)["']/ig
    ];
    for (const re of profilePatterns) {
      let m;
      while ((m = re.exec(source))) {
        const name = mapped(m[1]);
        if (name) return name;
      }
    }

    // Only as a last resort, inspect classId fields globally. This is preferable
    // to scanning visible page text, which may contain other classes.
    const all = /(?:classId|["']classId["'])\s*[:=]\s*["']([a-z_]+)["']/ig;
    let m;
    while ((m = all.exec(source))) {
      const name = mapped(m[1]);
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
