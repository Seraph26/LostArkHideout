/* UI icon/class repair layer. Keep roster and party icons consistent. */
(()=>{
  const KEY='lostark-hideout-private-v3';
  const normalizeName=v=>String(v||'').normalize('NFKC').trim().toLowerCase();
  const canonicalClass=(v)=>{
    const s=normalizeName(v);
    if(s==='soul eater'||s==='souleater'||s==='soul_eater'||s==='soul-eater')return 'Souleater';
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
  function classIcon(cls){
    try{return window.LostArkHideoutClassData?.iconUrl?.(cls)||''}catch{return ''}
  }
  function fixRosterClasses(){
    const profiles=storedProfiles();
    document.querySelectorAll('#roster .character').forEach(root=>{
      const nameEl=root.querySelector('.character-bible-link');
      if(!nameEl)return;
      const name=normalizeName(nameEl.textContent);
      const p=profiles.get(name);
      const cls=canonicalClass(p?.class);
      if(!cls)return;
      root.querySelectorAll('.class').forEach(e=>e.textContent=cls);
      const src=classIcon(cls);
      if(src)root.querySelectorAll('img.class-icon').forEach(img=>{img.src=src;img.removeAttribute('srcset');img.alt=cls;});
    });
  }
  function bridgePartyIcons(){
    const rosterIcons=new Map();
    document.querySelectorAll('#roster .character').forEach(card=>{
      const name=normalizeName(card.querySelector('.character-bible-link')?.textContent);
      const img=card.querySelector('img.class-icon');
      if(name&&img?.src)rosterIcons.set(name,img.src);
    });
    document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{
      const name=normalizeName(member.querySelector('.party-character-link')?.textContent||member.querySelector('.party-member-main')?.textContent);
      const img=member.querySelector('img.class-icon');
      const src=rosterIcons.get(name);
      if(img&&src){img.src=src;img.removeAttribute('srcset');img.alt='';}
    });
  }
  function repair(){fixRosterClasses();bridgePartyIcons()}
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
  const observer=new MutationObserver(schedule);
  function start(){repair();observer.observe(document.body,{childList:true,subtree:true});
    const load=(src)=>{const s=document.createElement('script');s.src=src;s.defer=false;document.head.appendChild(s)};
    load('build-profile-v1.js?v=20260818build1');
    load('deep-optimizer-v1.js?v=20260818deep1');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();