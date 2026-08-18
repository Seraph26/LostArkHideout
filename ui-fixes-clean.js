/* UI icon/class repair only. Deliberately does not load or control the optimizer. */
(()=>{
  const KEY='lostark-hideout-private-v3';
  const normalizeName=v=>String(v||'').normalize('NFKC').trim().toLowerCase();
  const canonicalClass=v=>{const s=normalizeName(v);if(['soul eater','souleater','soul_eater','soul-eater'].includes(s))return 'Souleater';if(['guardian knight','guardianknight','guardian_knight'].includes(s))return 'Guardian Knight';return String(v||'').trim()};
  function profiles(){try{const state=JSON.parse(localStorage.getItem(KEY)||'null');const m=new Map();for(const c of state?.characters||[]){const p=c?.profile,name=normalizeName(p?.name||c?.name);if(name)m.set(name,p||{})}return m}catch{return new Map()}}
  function icon(cls){try{return window.LostArkHideoutClassData?.iconUrl?.(cls)||''}catch{return ''}}
  function repair(){const ps=profiles();document.querySelectorAll('#roster .character').forEach(card=>{const name=normalizeName(card.querySelector('.character-bible-link')?.textContent),p=ps.get(name),cls=canonicalClass(p?.class);if(!cls)return;card.querySelectorAll('.class').forEach(e=>e.textContent=cls);const src=icon(cls);if(src)card.querySelectorAll('img.class-icon').forEach(img=>{img.src=src;img.removeAttribute('srcset');img.alt=cls})});const icons=new Map();document.querySelectorAll('#roster .character').forEach(card=>{const name=normalizeName(card.querySelector('.character-bible-link')?.textContent),img=card.querySelector('img.class-icon');if(name&&img?.src)icons.set(name,img.src)});document.querySelectorAll('#suggestedParties .party-member').forEach(card=>{const name=normalizeName(card.querySelector('.party-character-link')?.textContent||''),img=card.querySelector('img.class-icon'),src=icons.get(name);if(img&&src){img.src=src;img.removeAttribute('srcset')}})}
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repair()})};
  const start=()=>{repair();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
