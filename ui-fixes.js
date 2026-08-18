/* Unified dynamic class-icon renderer. Class-driven only; never character-driven. */
(()=>{
  const EXCEPTIONS={Glaivier:'glavier',Arcana:'arcanist','Soul Eater':'soul-eater',Souleater:'soul-eater'};
  const KNOWN=['Berserker','Destroyer','Gunlancer','Paladin','Slayer','Arcanist','Arcana','Summoner','Sorceress','Bard','Gunslinger','Deadeye','Sharpshooter','Artillerist','Machinist','Striker','Wardancer','Scrapper','Soulfist','Glavier','Glaivier','Deathblade','Shadowhunter','Reaper','Artist','Aeromancer','Breaker','Valkyrie','Soul Eater','Souleater','Wildsoul','Guardian Knight','GuardianKnight'];
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const findClass=v=>{const s=clean(v);return KNOWN.slice().sort((a,b)=>b.length-a.length).find(x=>new RegExp(`(?:^|[^A-Za-z])${x.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}(?:[^A-Za-z]|$)`,'i').test(s))||''};
  const iconUrl=cls=>{const c=clean(cls);if(!c||c==='Profile pending'||c==='Unknown'||c==='—')return '';const slug=EXCEPTIONS[c]||c.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return `https://lostark.bible/_next/image?url=${encodeURIComponent(`/images/classes/${slug}.png`)}&w=64&q=75`};
  const apply=(img,cls)=>{const u=iconUrl(cls);if(!u)return;img.src=u;img.alt=`${cls} icon`;img.width=20;img.height=20;img.loading='eager';img.decoding='async';img.style.cssText='width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:6px;display:inline-block;flex:0 0 20px'};
  function repair(){
    document.querySelectorAll('#roster .character').forEach(card=>{const cls=clean(card.querySelector('.class')?.textContent),h=card.querySelector('.character-title,.character-head h3');if(!h||!cls)return;let img=h.querySelector(':scope>.class-icon');if(!img){img=document.createElement('img');img.className='class-icon';h.insertBefore(img,h.firstChild)}apply(img,cls)});
    document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{const link=member.querySelector('.party-character-link'),span=member.querySelector('.party-member-main>span'),cls=findClass(span?.textContent||'');if(!link||!cls)return;let img=link.querySelector(':scope>.class-icon');if(!img){img=document.createElement('img');img.className='class-icon';link.insertBefore(img,link.firstChild)}apply(img,cls)});
    document.querySelectorAll('#suggestedParties .slot').forEach(slot=>{const h=slot.querySelector('h4'),small=slot.querySelector('small'),cls=findClass(small?.textContent||'');if(!h||!cls)return;let img=h.querySelector(':scope>.class-icon');if(!img){img=document.createElement('img');img.className='class-icon';h.insertBefore(img,h.firstChild)}apply(img,cls)});
  }
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
  const observer=new MutationObserver(schedule);function start(){repair();observer.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();