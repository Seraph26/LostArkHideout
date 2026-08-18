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
  function storedProfiles(){try{const state=JSON.parse(localStorage.getItem(KEY)||'null');const map=new Map();for(const c of state?.characters||[]){const p=c?.profile;const name=normalizeName(p?.name||c?.name);if(name)map.set(name,p||{})}return map}catch{return new Map()}}
  function classIcon(cls){try{return window.LostArkHideoutClassData?.iconUrl?.(cls)||''}catch{return ''}}
  function repair(){
    const profiles=storedProfiles();
    document.querySelectorAll('#roster .character').forEach(root=>{
      const name=normalizeName(root.querySelector('.character-bible-link')?.textContent);const p=profiles.get(name);const cls=canonicalClass(p?.class);if(!cls)return;
      root.querySelectorAll('.class').forEach(e=>e.textContent=cls);const src=classIcon(cls);if(src)root.querySelectorAll('img.class-icon').forEach(img=>{img.src=src;img.removeAttribute('srcset');img.alt=cls});
    });
    const icons=new Map();document.querySelectorAll('#roster .character').forEach(card=>{const n=normalizeName(card.querySelector('.character-bible-link')?.textContent),img=card.querySelector('img.class-icon');if(n&&img?.src)icons.set(n,img.src)});
    document.querySelectorAll('#suggestedParties .party-member').forEach(member=>{const n=normalizeName(member.querySelector('.party-character-link')?.textContent||member.querySelector('.party-member-main')?.textContent),img=member.querySelector('img.class-icon'),src=icons.get(n);if(img&&src){img.src=src;img.removeAttribute('srcset')}});
  }
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
  const observer=new MutationObserver(schedule);function start(){repair();observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
