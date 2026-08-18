/* Dynamic Lost Ark class icons. The class comes from the Bible profile; no character names are hardcoded. */
(()=>{
  const ICONS={
    Berserker:'berserker',Destroyer:'destroyer',Gunlancer:'gunlancer',Paladin:'paladin',Slayer:'slayer',
    Arcanist:'arcanist',Arcana:'arcanist',Summoner:'summoner',Sorceress:'sorceress',Bard:'bard',
    Gunslinger:'gunslinger',Deadeye:'deadeye',Sharpshooter:'sharpshooter',Artillerist:'artillerist',Machinist:'machinist',
    Striker:'striker',Wardancer:'wardancer',Scrapper:'scrapper',Soulfist:'soulfist',Glavier:'glavier',Glaivier:'glavier',
    Deathblade:'deathblade',Shadowhunter:'shadowhunter',Reaper:'reaper',Artist:'artist',Aeromancer:'aeromancer',
    Breaker:'breaker',Valkyrie:'valkyrie','Soul Eater':'soul-eater',Souleater:'soul-eater',
    Wildsoul:'wildsoul',GuardianKnight:'guardian-knight','Guardian Knight':'guardian-knight'
  };
  const direct=cls=>{const key=String(cls||'').trim(),slug=ICONS[key];return slug?`https://lostark.bible/_next/image?url=%2Fimages%2Fclasses%2F${slug}.png&w=64&q=75`:''};
  const make=cls=>{const src=direct(cls);if(!src)return null;const i=document.createElement('img');i.className='class-icon';i.alt=`${cls} icon`;i.src=src;i.width=20;i.height=20;i.loading='eager';i.decoding='async';i.style.cssText='width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:6px;display:inline-block;flex:0 0 20px';i.onerror=()=>{i.remove()};return i};
  function repair(){
    document.querySelectorAll('#roster .character').forEach(card=>{
      const cls=(card.querySelector('.class')?.textContent||'').trim();
      const h=card.querySelector('.character-title,.character-head h3');
      if(!h||!cls||cls==='Profile pending'||cls==='—'||cls==='Unknown')return;
      h.querySelectorAll(':scope>.class-icon').forEach(x=>x.remove());
      const i=make(cls);if(i)h.prepend(i);
    });
    document.querySelectorAll('#suggestedParties .slot').forEach(slot=>{
      const small=slot.querySelector('small'),h=slot.querySelector('h4');if(!small||!h)return;
      const cls=(small.textContent.split('·')[0]||'').trim();if(!cls)return;
      h.querySelectorAll(':scope>.class-icon').forEach(x=>x.remove());
      const i=make(cls);if(i)h.prepend(i);
    });
  }
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
  const observer=new MutationObserver(schedule);
  function start(){repair();observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();