(() => {
  const CONNECTOR='https://lostark-bible-connector.seraph0226.workers.dev/character';
  const STORAGE_KEY='lostark-hideout-private-v3';
  const MAX_CHARACTERS=8;
  const DELAY=350;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const url=(region,name)=>`https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;
  let timer=null,request=0;

  async function fetchHtml(target){
    const r=await fetch(`${CONNECTOR}?url=${encodeURIComponent(target)}`,{cache:'no-store',headers:{Accept:'application/json'}});
    const t=await r.text(); let d;
    try{d=JSON.parse(t)}catch{throw new Error('Bible connector returned non-JSON data.')}
    if(!r.ok||d.ok===false)throw new Error(d?.error||`Bible connector returned HTTP ${r.status}.`);
    return d.html||d.characterHtml||d.content||d.page||'';
  }

  // The Bible search results are the source of truth. We do not invent an exact-name
  // result and we do not apply a second heuristic that can turn inactive profiles into matches.
  function parseResults(html,region){
    const doc=new DOMParser().parseFromString(html,'text/html'),out=[],seen=new Set();
    for(const a of doc.querySelectorAll('a[href]')){
      try{
        const u=new URL(a.href,'https://lostark.bible'),p=u.pathname.split('/').filter(Boolean);
        if(u.hostname!=='lostark.bible'||p.length<3||p[0].toLowerCase()!=='character')continue;
        const r=p[1].toUpperCase(); if(r!==region)continue;
        const name=decodeURIComponent(p.slice(2).join('/')),key=`${r}|${name}`;
        if(!seen.has(key)){seen.add(key);out.push({region:r,name,url:url(r,name)});}
      }catch{}
    }
    return out;
  }

  async function search(region,value){
    const qlist=[...new Set([value.trim(),normalize(value.trim())].filter(Boolean))];
    for(const value of qlist){
      const q=encodeURIComponent(value);
      for(const target of [`https://lostark.bible/search?query=${q}`,`https://lostark.bible/search?q=${q}`,`https://lostark.bible/characters?search=${q}`]){
        try{const results=parseResults(await fetchHtml(target),region);if(results.length)return results;}catch{}
      }
    }
    return [];
  }

  function render(boxId,results,inputId){
    const box=$(boxId);if(!box)return;
    if(!results.length){box.innerHTML='';return;}
    box.innerHTML=results.map((c,i)=>`<button type="button" class="character-candidate" data-index="${i}"><span class="character-candidate-name">${esc(c.name)}</span><small>${esc(c.region)}</small></button>`).join('');
    box.querySelectorAll('.character-candidate').forEach(b=>b.addEventListener('click',()=>{
      $(inputId).value=results[Number(b.dataset.index)].name;box.innerHTML='';$(inputId).focus();
    }));
  }

  function renderMainSuggestions(results){
    const d=$('#characterNameSuggestions');if(d)d.innerHTML=results.map(c=>`<option value="${esc(c.name)}"></option>`).join('');
    render('#characterCandidates',results,'#characterName');
  }

  async function mainLive(){
    const region=($('#characterRegion')?.value||'NA').toUpperCase(),name=($('#characterName')?.value||'').trim();
    if(name.length<2){renderMainSuggestions([]);return}
    const id=++request;try{const results=await search(region,name);if(id===request)renderMainSuggestions(results)}catch{if(id===request)renderMainSuggestions([])}
  }

  async function mainFind(){
    const region=($('#characterRegion')?.value||'NA').toUpperCase(),name=($('#characterName')?.value||'').trim();
    if(!name)return;
    const results=await search(region,name);
    renderMainSuggestions(results);
    if(!results.length){$('#status').textContent='No active Bible character matches found.';return}
    $('#status').textContent=`${results.length} matching character${results.length===1?'':'s'} found.`;
  }

  function addSelectedMain(){
    const region=($('#characterRegion')?.value||'NA').toUpperCase(),name=($('#characterName')?.value||'').trim();if(!name)return;
    const state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"characters":[]}');
    if(!Array.isArray(state.characters))state.characters=[];
    if(state.characters.length>=MAX_CHARACTERS){$('#status').textContent=`Maximum of ${MAX_CHARACTERS} characters reached.`;return}
    const u=url(region,name);
    if(state.characters.some(c=>c.url===u)){$('#status').textContent='That character is already added.';return}
    state.characters.push({id:crypto.randomUUID(),url:u,region,name,profile:null});
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));location.reload();
  }

  async function comparisonLive(){
    const region=($('#comparisonRegion')?.value||'NA').toUpperCase(),name=($('#comparisonName')?.value||'').trim();
    if(name.length<2){render('#comparisonCandidates',[],'#comparisonName');return}
    const id=++request;try{const results=await search(region,name);if(id===request)render('#comparisonCandidates',results,'#comparisonName')}catch{if(id===request)render('#comparisonCandidates',[],'#comparisonName')}
  }

  function init(){
    const main=$('#characterName'),find=$('#findCharacterBtn');
    if(main&&find){main.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(mainLive,DELAY)});main.addEventListener('keydown',e=>{if(e.key==='Enter')mainFind()});find.addEventListener('click',mainFind);$('#characterRegion')?.addEventListener('change',mainLive);document.addEventListener('dblclick',e=>{if(e.target.closest?.('#characterCandidates'))addSelectedMain()})}
    const cmp=$('#comparisonName');
    if(cmp){cmp.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(comparisonLive,DELAY)});cmp.addEventListener('keydown',e=>{if(e.key==='Enter')comparisonLive()});$('#comparisonRegion')?.addEventListener('change',comparisonLive);$('#comparisonFindBtn')?.addEventListener('click',comparisonLive)}
    // Capture phase sets the URL before app-fixed.js's Compare handler runs.
    $('#compareBtn')?.addEventListener('click',e=>{const n=($('#comparisonName')?.value||'').trim(),r=($('#comparisonRegion')?.value||'NA').toUpperCase();if(n)$('#testCharacterUrl').value=url(r,n)},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
