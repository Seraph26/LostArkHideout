/* Final party UX fixes: full-party swaps + initial Bible links. */
(() => {
  const STORAGE_KEY = 'lostark-hideout-private-v3';
  const LEGACY_KEY = 'lostark-hideout-private-v2';
  const PARTY_KEY = 'lostark-hideout-party-assignments-v1';
  const MAX = 4;
  const SUPPORTS = new Set(['Bard','Paladin','Artist']);

  const getState = () => {
    try {
      const a = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (a?.characters) return a;
      const b = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (b?.characters) return b;
    } catch {}
    return {characters:[]};
  };

  const save = (x) => localStorage.setItem(PARTY_KEY, JSON.stringify(x));
  const getAssignments = () => {
    try {
      const x = JSON.parse(localStorage.getItem(PARTY_KEY) || 'null');
      if (x?.party1 && x?.party2) return x;
    } catch {}
    return {party1:[],party2:[]};
  };
  const power = (c) => Number(c?.profile?.cp) || 0;
  const role = (c) => SUPPORTS.has(c?.profile?.class) ? 'Support' : 'DPS';
  const score = (members) => {
    const dps = members.filter(c => role(c) === 'DPS');
    const sup = members.filter(c => role(c) === 'Support');
    const raw = dps.reduce((s,c)=>s+power(c),0);
    const mult = sup.length === 0 ? 1 : sup.length === 1 ? 1.18 : 1.10;
    return raw * mult + sup.reduce((s,c)=>s+power(c)*0.20,0);
  };
  const total = (a,b) => score(a)+score(b);
  const pct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  function previewSwap(sourceId, targetId) {
    const chars = getState().characters.filter(c=>c.profile);
    const byId = new Map(chars.map(c=>[c.id,c]));
    const a = getAssignments();
    const before1 = a.party1.map(id=>byId.get(id)).filter(Boolean);
    const before2 = a.party2.map(id=>byId.get(id)).filter(Boolean);
    const p1 = [...a.party1], p2 = [...a.party2];
    const i1 = p1.indexOf(sourceId), i2 = p2.indexOf(sourceId);
    const j1 = p1.indexOf(targetId), j2 = p2.indexOf(targetId);
    if (i1 >= 0 && j2 >= 0) { p1[i1]=targetId; p2[j2]=sourceId; }
    else if (i2 >= 0 && j1 >= 0) { p2[i2]=targetId; p1[j1]=sourceId; }
    else return;
    const after1=p1.map(id=>byId.get(id)).filter(Boolean), after2=p2.map(id=>byId.get(id)).filter(Boolean);
    const before=total(before1,before2), after=total(after1,after2);
    const change=before ? ((after-before)/before)*100 : 0;
    const el=document.querySelector('#swapImpact');
    if(el){el.className=`swap-impact ${change>0.0001?'positive':change<-0.0001?'negative':'neutral'}`;el.innerHTML=`<strong>Swap preview: ${pct(change)}</strong> combined estimated potential damage (${Math.round(before).toLocaleString()} → ${Math.round(after).toLocaleString()}).`}
  }

  function commitSwap(sourceId,targetId){
    const a=getAssignments();
    const p1=[...a.party1],p2=[...a.party2];
    const i1=p1.indexOf(sourceId),i2=p2.indexOf(sourceId),j1=p1.indexOf(targetId),j2=p2.indexOf(targetId);
    if(i1>=0&&j2>=0){p1[i1]=targetId;p2[j2]=sourceId;}
    else if(i2>=0&&j1>=0){p2[i2]=targetId;p1[j1]=sourceId;}
    else return;
    save({party1:p1,party2:p2});
    // The enhancement layer's optimize button renderer can be triggered by a
    // synthetic click, but do not re-optimize. Instead re-render by dispatching
    // a custom event consumed below.
    document.dispatchEvent(new CustomEvent('lostark-party-render'));
  }

  function makeRosterNamesClickable(){
    const state=getState();
    const byId=new Map(state.characters.map(c=>[c.id,c]));
    const roster=document.querySelector('#roster');
    if(!roster)return;
    roster.querySelectorAll('.character').forEach(card=>{
      const id=card.querySelector('.remove-character')?.dataset.id;
      const c=byId.get(id), heading=card.querySelector('h3');
      if(!c||!heading||heading.querySelector('a'))return;
      const a=document.createElement('a');
      a.href=c.url;a.target='_blank';a.rel='noopener noreferrer';a.className='character-bible-link';a.textContent=heading.textContent;
      heading.replaceChildren(a);
    });
  }

  function install(){
    makeRosterNamesClickable();
    const roster=document.querySelector('#roster');
    if(roster&&!roster.dataset.linkFix){
      roster.dataset.linkFix='1';
      new MutationObserver(makeRosterNamesClickable).observe(roster,{childList:true,subtree:true});
    }
    const container=document.querySelector('#suggestedParties');
    if(!container||container.dataset.swapFix)return;
    container.dataset.swapFix='1';

    container.addEventListener('dragover',e=>{
      const target=e.target.closest('.party-member');
      const source=e.dataTransfer?.getData('text/plain');
      if(!target||!source||target.dataset.characterId===source)return;
      e.preventDefault();e.dataTransfer.dropEffect='move';
      previewSwap(source,target.dataset.characterId);
      target.classList.add('drag-over');
    });
    container.addEventListener('dragleave',e=>{
      const target=e.target.closest('.party-member');
      if(target)target.classList.remove('drag-over');
    });
    container.addEventListener('drop',e=>{
      const target=e.target.closest('.party-member');
      const source=e.dataTransfer?.getData('text/plain');
      if(!target||!source||target.dataset.characterId===source)return;
      e.preventDefault();e.stopPropagation();
      target.classList.remove('drag-over');
      commitSwap(source,target.dataset.characterId);
    },true);

    document.addEventListener('lostark-party-render',()=>{
      // party-enhancements.js is responsible for rebuilding the cards.
      // Calling the optimize button would reset assignments, so dispatch a
      // harmless click on the existing party section's first render hook by
      // reloading the DOM through a small delayed custom event if available.
      const optimize=document.querySelector('#optimizeBtn');
      if(optimize){
        // Temporarily preserve the assignment, then invoke the enhancement
        // renderer through its public UI path without changing assignments.
        const saved=getAssignments();
        optimize.onclick?.();
        save(saved);
      }
    },{once:false});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  else setTimeout(install,0);
})();
