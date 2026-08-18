/* Keep Suggested Party Setup class data synchronized with the authoritative top roster card. */
(()=>{
  const normalize=v=>{try{const u=new URL(v,location.href);return decodeURIComponent(u.pathname.replace(/\/$/,'')).normalize('NFC').toLowerCase()}catch{return String(v||'').replace(/\/$/,'').normalize('NFC').toLowerCase()}};
  const findTop=id=>{
    const bottom=document.querySelector(`.authoritative-member[data-character-id="${CSS.escape(id)}"]`);
    const link=bottom?.querySelector('.party-character-link');
    if(!link)return null;
    const target=normalize(link.getAttribute('href'));
    return [...document.querySelectorAll('#roster article.character')].find(card=>{
      const a=card.querySelector('a.character-bible-link[href]');
      return a&&normalize(a.getAttribute('href'))===target;
    })||null;
  };
  const sync=()=>{
    document.querySelectorAll('.authoritative-member').forEach(member=>{
      const card=findTop(member.dataset.characterId), source=card?.querySelector('.class');
      if(!source)return;
      const sourceClass=source.textContent.trim();
      if(!sourceClass)return;
      const classEl=member.querySelector('.party-class-label');
      if(classEl&&classEl.textContent.trim()!==sourceClass)classEl.textContent=sourceClass;
      const roleEl=member.querySelector('.party-role-label');
      if(roleEl){const support=['Bard','Paladin','Artist','Valkyrie'].includes(sourceClass);roleEl.textContent=support?'Support':'DPS';roleEl.style.setProperty('color',support?'#79c98b':'#e07a7a','important');}
    });
  };
  const start=()=>{
    sync();
    const host=document.querySelector('#suggestedParties');
    const roster=document.querySelector('#roster');
    if(host)new MutationObserver(sync).observe(host,{subtree:true,childList:true,characterData:true});
    if(roster)new MutationObserver(()=>setTimeout(sync,50)).observe(roster,{subtree:true,childList:true,characterData:true});
    [300,800,1500,2500].forEach(ms=>setTimeout(sync,ms));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
