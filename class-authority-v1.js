/* Bible class authority: derive the actual subclass from the character's canonical
   profile page. The visible profile class is authoritative; never infer it from
   incidental page data when the profile itself states the class. */
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
  const mapped = v => CLASS_IDS[normalizeId(v)] || null;

  function classFromHtml(html) {
    const source = String(html || '');

    // The Bible character page itself displays the authoritative class in its
    // profile header, e.g. <div class="class">Souleater</div>. Prefer this over
    // classId fields because Bible pages can contain multiple unrelated classId
    // values for loadouts, presets, or other embedded data.
    const visibleClass = source.match(/<[^>]*class=["'][^"']*\bclass\b[^"']*["'][^>]*>\s*([^<]+?)\s*<\//i);
    if (visibleClass) {
      const text = visibleClass[1].replace(/\s+/g, ' ').trim();
      if (text && text.length < 40) return text;
    }

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
        while ((m = re.exec(windowText))) { const name = mapped(m[1]); if (name) return name; }
      }
    }

    const profilePatterns = [
      /(?:character|profile|characterProfile)[\s\S]{0,1800}?classId\s*[:=]\s*["']([a-z_]+)["']/ig,
      /(?:character|profile|characterProfile)[\s\S]{0,1800}?["']classId["']\s*:\s*["']([a-z_]+)["']/ig
    ];
    for (const re of profilePatterns) {
      let m;
      while ((m = re.exec(source))) { const name = mapped(m[1]); if (name) return name; }
    }

    const all = /(?:classId|["']classId["'])\s*[:=]\s*["']([a-z_]+)["']/ig;
    let m;
    while ((m = all.exec(source))) { const name = mapped(m[1]); if (name) return name; }
    return null;
  }

  function inject(html) {
    if (typeof html !== 'string') return html;
    const cls = classFromHtml(html);
    if (!cls) return html;
    const marker = `<span data-bible-authoritative-class="${String(cls).replace(/"/g, '&quot;')}" aria-label="${String(cls).replace(/"/g, '&quot;')}"></span>`;
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
    } catch { return response; }
  };
  window.LostArkHideoutClassAuthority = { CLASS_IDS, classFromHtml };
})();
