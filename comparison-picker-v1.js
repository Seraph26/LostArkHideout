(() => {
  const CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';
  const SEARCH_DELAY = 350;
  let timer = null;
  let requestId = 0;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const stripAccents = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const makeUrl = (region, name) => `https://lostark.bible/character/${encodeURIComponent(region)}/${encodeURIComponent(name)}`;

  async function fetchHtml(url) {
    const response = await fetch(`${CONNECTOR}?url=${encodeURIComponent(url)}`, {cache:'no-store',headers:{Accept:'application/json'}});
    const text = await response.text(); let data;
    try { data = JSON.parse(text); } catch { throw new Error('Connector returned non-JSON data.'); }
    if (!response.ok || data.ok === false) throw new Error(data?.error || `Connector returned HTTP ${response.status}.`);
    return data.html || data.characterHtml || data.content || data.page || '';
  }
  function isActiveResult(a) {
    const context = `${a.textContent || ''} ${a.getAttribute('aria-label') || ''} ${a.className || ''} ${a.parentElement?.className || ''} ${a.parentElement?.parentElement?.textContent || ''}`;
    return !/inactive|deleted|retired|not\s*found|unavailable/i.test(context);
  }
  function parseCandidates(html, region) {
    const doc = new DOMParser().parseFromString(html,'text/html'), out=[], seen=new Set();
    for (const a of doc.querySelectorAll('a[href]')) {
      try {
        const u=new URL(a.href,'https://lostark.bible'), parts=u.pathname.split('/').filter(Boolean);
        if (u.hostname!=='lostark.bible'||parts.length<3||parts[0].toLowerCase()!=='character'||parts[1].toUpperCase()!==region||!isActiveResult(a)) continue;
        const name=decodeURIComponent(parts.slice(2).join('/')), key=`${region}|${name}`;
        if(!seen.has(key)){seen.add(key);out.push({region,name,url:makeUrl(region,name)});}
      } catch {}
    }
    return out;
  }
  async function search(region,value) {
    const original=value.trim(), queries=[...new Set([original,stripAccents(original)].filter(Boolean))];
    for(const query of queries){ const q=encodeURIComponent(query);
      for(const url of [`https://lostark.bible/search?query=${q}`,`https://lostark.bible/search?q=${q}`,`https://lostark.bible/characters?search=${q}`]){
        try { const results=parseCandidates(await fetchHtml(url),region); if(results.length)return results; } catch {}
      }
    }
    return [];
  }
  function render(results) {
    const box=$('#comparisonCandidates'); if(!box)return;
    if(!results.length){box.innerHTML='';return;}
    box.innerHTML=results.map((c,i)=>`<button type="button" class="character-candidate comparison-candidate" data-index="${i}"><span class="character-candidate-name">${esc(c.name)}</span></button>`).join('');
    box.querySelectorAll('.comparison-candidate').forEach(btn=>btn.addEventListener('click',()=>{const c=results[Number(btn.dataset.index)];$('#comparisonName').value=c.name;box.innerHTML='';}));
  }
  async function liveSearch(){
    const name=($('#comparisonName')?.value||'').trim(), region=($('#comparisonRegion')?.value||'NA').toUpperCase();
    if(name.length<2){render([]);return;} const id=++requestId;
    try { const results=await search(region,name); if(id===requestId)render(results); } catch { if(id===requestId)render([]); }
  }
  function doCompare(){
    const name=($('#comparisonName')?.value||'').trim(),region=($('#comparisonRegion')?.value||'NA').toUpperCase();
    if(!name){$('#status').textContent='Enter a character name first.';return;}
    $('#testCharacterUrl').value=makeUrl(region,name);
    if(typeof window.compareCharacter==='function') window.compareCharacter();
  }
  function init(){
    const input=$('#testCharacterUrl'),button=$('#compareBtn'); if(!input||!button)return;
    const row=input.closest('.import-row');
    row.innerHTML=`<select id="comparisonRegion" aria-label="Comparison character region"><option value="NA">NA</option><option value="EU">EU</option></select><input id="comparisonName" placeholder="Character name" autocomplete="off"><button id="comparisonFindBtn" type="button">Find Character</button><button id="compareBtn" type="button">Compare</button><input id="testCharacterUrl" type="hidden">`;
    const box=document.createElement('div');box.id='comparisonCandidates';box.className='character-candidates';row.parentElement.appendChild(box);
    $('#comparisonName').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(liveSearch,SEARCH_DELAY);});
    $('#comparisonName').addEventListener('keydown',e=>{if(e.key==='Enter')liveSearch();});
    $('#comparisonRegion').addEventListener('change',liveSearch);
    $('#comparisonFindBtn').addEventListener('click',liveSearch);
    $('#compareBtn').addEventListener('click',doCompare);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
