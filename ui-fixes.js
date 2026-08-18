/* UI icon/class repair layer. Keep roster and party icons consistent. */
(()=>{
  const KEY='lostark-hideout-private-v3';
  const SOUL_EATER_ICON='https://lostark.bible/_next/image?url=%2Fimages%2Fclasses%2Fsouleater.png&w=64&q=75';
  const normalizeName=v=>String(v||'').normalize('NFKC').trim().toLowerCase();
  const canonicalClass=v=>{
    const s=normalizeName(v);
    if(s==='soul eater'||s==='souleater'||s==='soul_eater')return 'Souleater';
    if(s==='guardian knight'||s==='guardianknight'||s==='guardian_knight')return 'Guardian Knight';
    return String(v||'').trim();
  };
  function storedProfiles(){
    try{
      const state=JSON.parse(localStorage.getItem(KEY)||'null');
      const map=new Map();
      for(const c of state?.characters||[]){
        const p=c?.profile;
        const name=normalizeName(p?.name||c?.name);
        if(name)map.set(name,p||{});
      }
      return map;
    }catch{return new Map()}
  }
  function fixKnownClasses(){
    const profiles=storedProfiles();
    document.querySelectorAll('#roster .character,#suggestedParties .party,.party .slot,.party-member').forEach(root=>{
      const nameEl=root.querySelector('.character-bible-link,.party-character-link,.party-character-title span,h3 a,h3 span');
      if(!nameEl)return;
      const name=normalizeName(nameEl.textContent);
      const p=profiles.get(name);
      if(!p)return;
      const cls=canonicalClass(p.class);
      if(!cls)return;
      root.querySelectorAll('.class').forEach(e=>e.textContent=cls);
      root.querySelectorAll('.party-member-main>span,small').forEach(e=>{
        const text=e.textContent||'';
        if(/\b(Soul Eater|Souleater|Reaper)\b/i.test(text))e.textContent=text.replace(/\b(Soul Eater|Souleater|Reaper)\b/i,cls);
      });
      if(cls==='Souleater')root.querySelectorAll('img.class-icon').forEach(img=>{img.src=SOUL_EATER_ICON;img.alt='Souleater';});
    });
  }
  function bridgePartyIcons(){
    const rosterIcons=new Map();
    document.querySelectorAll('#roster .character').forEach(card=>{
      const name=normalizeName(card.querySelector('.character-bible-link')?.textContent);
      const img=card.querySelector('img.class-icon');
      if(name&&img?.src)rosterIcons.set(name,img.src);
    });
    document.querySelectorAll('#suggestedParties .slot').forEach(slot=>{
      const name=normalizeName(slot.querySelector('h4 span')?.textContent||slot.querySelector('h4')?.textContent);
      const img=slot.querySelector('img.class-icon');
      const src=rosterIcons.get(name);
      if(img&&src){img.src=src;img.removeAttribute('srcset');img.alt='';}
    });
    document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
      const name=normalizeName(member.querySelector('.party-character-link')?.textContent||member.querySelector('.party-member-main')?.textContent);
      const img=member.querySelector('img.class-icon');
      const src=rosterIcons.get(name);
      if(img&&src){img.src=src;img.removeAttribute('srcset');img.alt='';}
    });
  }
  function repair(){fixKnownClasses();bridgePartyIcons()}
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
  const observer=new MutationObserver(schedule);
  function start(){repair();observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
