/* Final party UX layer: clickable Bible names + true full-party swaps. */
(() => {
  const STORAGE_KEY='lostark-hideout-private-v3';
  const LEGACY_KEY='lostark-hideout-private-v2';
  const PARTY_KEY='lostark-hideout-party-assignments-v1';
  const SUPPORTS=new Set(['Bard','Paladin','Artist']);

  const state=()=>{
    try{
      const a=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(a?.characters)return a;
      const b=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');
      if(b?.characters)return b;
    }catch{}
    return {characters:[]};
  };
  const assignments=()=>{
    try{
      const a=JSON.parse(localStorage.getItem(PARTY_KEY)||'null');
      if(a?.party1&&a?.party2)return a;
    }catch{}
    return {party1:[],party2:[]};
  };
  const save=a=>localStorage.setItem(PARTY_KEY,JSON.stringify(a));
  const chars=()=>state().characters.filter(c=>c.profile);
  const power=c=>Number(c?.profile?.cp)||0;
  const role=c=>SUPPORTS.has(c?.profile?.class)?'Support':'DPS';
  const score=list=>{
    const dps=list.filter(c=>role(c)==='DPS');
    const supports=list.filter(c=>role(c)==='Support');
    const raw=dps.reduce((s,c)=>s+power(c),0);
    const mult=supports.length===0?1:supports.length===1?1.18:1.10;
    return raw*mult+supports.reduce((s,c)=>s+power(c)*.20,0);
  };
  const total=(a,b)=>score(a)+score(b);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function makeNamesClickable(){
    const roster=document.querySelector('#roster');
    if(!roster)return;
    const byId=new Map(state().characters.map(c=>[c.id,c]));
    roster.querySelectorAll('.character').forEach(card=>{
      const id=card.querySelector('.remove-character')?.dataset.id;
      const c=byId.get(id), heading=card.querySelector('h3');
      if(!c||!heading||heading.querySelector('a'))return;
      const a=document.createElement('a');
      a.href=c.url;a.target='_blank';a.rel='noopener noreferrer';
      a.className='character-bible-link';a.textContent=heading.textContent;
      heading.replaceChildren(a);
    });
  }

  function updatePartyTotals(){
    const all=chars(), map=new Map(all.map(c=>[c.id,c])), a=assignments();
    const p1=a.party1.map(id=>map.get(id)).filter(Boolean),p2=a.party2.map(id=>map.get(id)).filter(Boolean);
    document.querySelectorAll('.enhanced-party').forEach(card=>{
      const party=card.dataset.party==='party1'?p1:p2;
      const strong=card.querySelector('.party-score strong');
      if(strong)strong.textContent=Math.round(score(party)).toLocaleString();
      const meta=card.querySelector('.party-meta');
      if(meta)meta.textContent=`${party.length}/4 slots · ${party.filter(c=>role(c)==='Support').length} support`;
      const footer=card.querySelector('.party-footer');
      if(footer)footer.textContent=`Overall estimated potential: ${Math.round(total(p1,p2)).toLocaleString()}`;
    });
    const note=document.querySelector('.party-optimizer-note span');
    if(note)note.textContent=`Baseline: ${Math.round(total(p1,p2)).toLocaleString()}`;
  }

  function swapInDOM(sourceId,targetId){
    const source=document.querySelector(`.party-member[data-character-id="${CSS.escape(sourceId)}"]`);
    const target=document.querySelector(`.party-member[data-character-id="${CSS.escape(targetId)}"]`);
    if(!source||!target)return;
    const sourceParent=source.parentElement,targetParent=target.parentElement;
    const sourceNext=source.nextSibling,targetNext=target.nextSibling;
    const sourceHolder=document.createElement('span'),targetHolder=document.createElement('span');
    sourceHolder.style.display='none';targetHolder.style.display='none';
    sourceParent.insertBefore(sourceHolder,source);
    targetParent.insertBefore(targetHolder,target);
    targetParent.insertBefore(source, targetNext);
    sourceParent.insertBefore(target, sourceNext);
    sourceHolder.remove();targetHolder.remove();
  }

  function commitFullPartySwap(sourceId,targetId){
    const a=assignments();
    const p1=[...a.party1],p2=[...a.party2];
    const i1=p1.indexOf(sourceId),i2=p2.indexOf(sourceId),j1=p1.indexOf(targetId),j2=p2.indexOf(targetId);
    if(i1>=0&&j2>=0){p1[i1]=targetId;p2[j2]=sourceId;}
    else if(i2>=0&&j1>=0){p2[i2]=targetId;p1[j1]=sourceId;}
    else return;
    const beforeMap=new Map(chars().map(c=>[c.id,c]));
    const before1=a.party1.map(id=>beforeMap.get(id)).filter(Boolean),before2=a.party2.map(id=>beforeMap.get(id)).filter(Boolean);
    const after1=p1.map(id=>beforeMap.get(id)).filter(Boolean),after2=p2.map(id=>beforeMap.get(id)).filter(Boolean);
    const before=total(before1,before2),after=total(after1,after2);
    const change=before?((after-before)/before)*100:0;
    save({party1:p1,party2:p2});
    swapInDOM(sourceId,targetId);
    updatePartyTotals();
    const impact=document.querySelector('#swapImpact');
    if(impact){impact.className=`swap-impact ${change>0.0001?'positive':change<-0.0001?'negative':'neutral'}`;impact.innerHTML=`<strong>Swap applied: ${change>=0?'+':''}${change.toFixed(2)}%</strong> combined estimated potential damage (${Math.round(before).toLocaleString()} → ${Math.round(after).toLocaleString()}).`}
  }

  function install(){
    makeNamesClickable();
    const roster=document.querySelector('#roster');
    if(roster&&!roster.dataset.finalLinkFix){
      roster.dataset.finalLinkFix='1';
      new MutationObserver(makeNamesClickable).observe(roster,{childList:true,subtree:true});
    }

    const parties=document.querySelector('#suggestedParties');
    if(!parties||parties.dataset.finalSwapFix)return;
    parties.dataset.finalSwapFix='1';
    parties.addEventListener('dragover',e=>{
      const target=e.target.closest('.party-member');
      const source=e.dataTransfer?.getData('text/plain');
      if(!target||!source||target.dataset.characterId===source)return;
      e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('drag-over');
    });
    parties.addEventListener('dragleave',e=>{const t=e.target.closest('.party-member');if(t)t.classList.remove('drag-over');});
    parties.addEventListener('drop',e=>{
      const target=e.target.closest('.party-member');
      const source=e.dataTransfer?.getData('text/plain');
      if(!target||!source||target.dataset.characterId===source)return;
      e.preventDefault();e.stopPropagation();target.classList.remove('drag-over');
      const a=assignments();
      const sourceParty=a.party1.includes(source)?a.party1:a.party2;
      const targetParty=a.party1.includes(target.dataset.characterId)?a.party1:a.party2;
      if(sourceParty===targetParty)return;
      // Both parties are full here, so this is a true 1-for-1 swap.
      if(sourceParty.length===4&&targetParty.length===4)commitFullPartySwap(source,target.dataset.characterId);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  else setTimeout(install,0);
})();
