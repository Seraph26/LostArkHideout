/* Lost Ark Hideout UI fixes: class icons + restore the authoritative party optimizer after profile refreshes. */
(()=>{
  const CLASS_ICON_FILES = {
    Berserker: 'ClassIcon-Warrior-Berserker.png',
    Destroyer: 'ClassIcon-Warrior-Destroyer.png',
    Gunlancer: 'ClassIcon-Warrior-Gunlancer.png',
    Paladin: 'ClassIcon-Warrior-Paladin.png',
    Slayer: 'ClassIcon-Warrior-Slayer.png',
    Arcanist: 'ClassIcon-Mage-Arcanist.png',
    Arcana: 'ClassIcon-Mage-Arcanist.png',
    Summoner: 'ClassIcon-Mage-Summoner.png',
    Sorceress: 'ClassIcon-Mage-Sorceress.png',
    Bard: 'ClassIcon-Mage-Bard.png',
    Gunslinger: 'ClassIcon-Gunner-Gunslinger.png',
    Deadeye: 'ClassIcon-Gunner-Deadeye.png',
    Sharpshooter: 'ClassIcon-Gunner-Sharpshooter.png',
    Artillerist: 'ClassIcon-Gunner-Artillerist.png',
    Machinist: 'ClassIcon-Gunner-Artillerist.png',
    Striker: 'ClassIcon-Martial Artist-Striker.png',
    Wardancer: 'ClassIcon-Martial Artist-Wardancer.png',
    Scrapper: 'ClassIcon-Martial Artist-Scrapper.png',
    Soulfist: 'ClassIcon-Martial Artist-Soulfist.png',
    Glavier: 'ClassIcon-Martial Artist-Glaivier.png',
    Glaivier: 'ClassIcon-Martial Artist-Glaivier.png',
    Deathblade: 'ClassIcon-Assassin-Deathblade.png',
    Shadowhunter: 'ClassIcon-Assassin-Shadowhunter.png',
    Reaper: 'ClassIcon-Assassin-Reaper.png',
    'Soul Eater': 'ClassIcon-Assassin-Souleater.png',
    Souleater: 'ClassIcon-Assassin-Souleater.png',
    Artist: 'ClassIcon-Specialist-Artist.png',
    Aeromancer: 'ClassIcon-Specialist-Aeromancer.png'
  };

  const FALLBACK_GROUPS = {
    Valkyrie: 'ClassIcon-Warrior.png',
    Wildsoul: 'ClassIcon-Specialist.png',
    'Guardian Knight': 'ClassIcon-Warrior.png'
  };

  const FANDOM = 'https://lostark.fandom.com/wiki/Special:Redirect/file/';

  function iconUrl(cls){
    const file = CLASS_ICON_FILES[cls] || FALLBACK_GROUPS[cls];
    return file ? FANDOM + encodeURIComponent(file) : '';
  }

  function repairClassIcons(){
    document.querySelectorAll('.character-head h3').forEach(h3=>{
      const card = h3.closest('.character');
      if(!card) return;
      const classText = card.querySelector('.class')?.textContent?.trim();
      if(!classText) return;
      let img = h3.querySelector('.class-icon');
      const src = iconUrl(classText);
      if(!src) return;
      if(!img){
        img = document.createElement('img');
        img.className = 'class-icon';
        img.alt = `${classText} icon`;
        h3.prepend(img);
      }
      if(img.src !== src) img.src = src;
      img.style.display = 'inline-block';
    });

    /* Never show a second icon beside the class label. */
    document.querySelectorAll('.character .class .class-icon').forEach(img=>img.remove());
  }

  function restorePartyOptimizer(){
    const target = document.querySelector('#suggestedParties');
    const optimize = document.querySelector('#optimizeBtn');
    if(!target || !optimize) return;
    if(document.querySelector('#suggestedParties .authoritative-parties')) return;
    if(!document.querySelector('#suggestedParties .party')) return;
    if(optimize.dataset.v5 === '1') optimize.click();
  }

  let scheduled = false;
  function repair(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(()=>{
      scheduled = false;
      repairClassIcons();
      restorePartyOptimizer();
    });
  }

  const observer = new MutationObserver(repair);
  function start(){
    repair();
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
