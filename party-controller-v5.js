/* Lost Ark Hideout — party optimizer */
(()=>{
const KEYS=['lostark-hideout-private-v3','lostark-hideout-private-v2'],PK='lostark-hideout-party-assignments-v2';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function state(){for(const k of KEYS){try{const x=JSON.parse(localStorage.getItem(k)||'null');if(x&&Array.isArray(x.characters))return x}catch{}}return{characters:[]}}
function chars(){return state().characters.filter(c=>c&&c.profile)}
function assigns(){try{const x=JSON.parse(localStorage.getItem(PK)||'null');if(x&&Array.isArray(x.party1)&&Array.isArray(x.party2))return x}catch{}return{party1:[],party2:[]}}
const save=x=>localStorage.setItem(PK,JSON.stringify(x));

// The top roster card is the ONLY source for displayed character identity.
function rosterData(c){
  const cards=[...document.querySelectorAll('#roster article.character')];
  const target=String(c?.url||'').replace(/\/$/,'').toLowerCase();
  for(const card of cards){
    const link=card.querySelector('a.character-bible-link[href]');
    if(!link)continue;
    const href=String(link.href||'').replace(/\/$/,'').toLowerCase();
    if(href!==target)continue;
    const title=card.querySelector('.character-title');
    const classEl=card.querySelector('.class');
    const iconEl=card.querySelector('img.class-icon');
    return {name:link.textContent.trim(),class:classEl?.textContent?.trim()||'',icon:iconEl?.getAttribute('src')||'',role:''};
  }
  return null;
}
function displayData(c){return rosterData(c)||{name:'',class:'',icon:'',role:''}}
function role(c){return ['Bard','Paladin','Artist','Valkyrie'].includes(displayData(c).class)?'Support':'DPS'}
function cp(c){return Number(c?.profile?.cp)||0} function il(c){return Number(c?.profile?.ilvl)||0}
function strength(c){return cp(c)*.76+il(c)*2.5}
function partyMultiplier(p){if(!p.length)return 0;return p.some(c=>role(c)==='Support')?1.14:.84}
function score(p){return p.reduce((s,c)=>s+strength(c),0)*partyMultiplier(p)}function total(a,b){return score(a)+score(b)}function fmt(n){return Math.round(n).toLocaleString()}
function combinations(a,k,start=0,prefix=[],out=[]){if(prefix.length===k){out.push(prefix.slice());return out}for(let i=start;i<=a.length-(k-prefix.length);i++)combinations(a,k,i+1,prefix.concat(a[i]),out);return out}
function bestAssignment(a){if(a.length<=4)return{party1:a.map(c=>c.id),party2:[]};let best=null,bestScore=-Infinity;for(const p1 of combinations(a,4)){const ids=new Set(p1.map(c=>c.id)),p2=a.filter(c=>!ids.has(c.id));if(p2.length>4)continue;const s=total(p1,p2);if(s>bestScore){bestScore=s;best={party1:p1.map(c=>c.id),party2:p2.map(c=>c.id)}}}return best}
function model(){const a=chars(),m=new Map(a.map(c=>[c.id,c])),x=assigns(),valid=new Set(a.map(c=>c.id)),seen=new Set(),p1=[],p2=[];for(const id of x.party1||[])if(valid.has(id)&&!seen.has(id)&&p1.length<4){p1.push(id);seen.add(id)}for(const id of x.party2||[])if(valid.has(id)&&!seen.has(id)&&p2.length<4){p2.push(id);seen.add(id)}for(const c of a){if(seen.has(c.id))continue;if(p1.length<4)p1.push(c.id);else if(p2.length<4)p2.push(c.id);seen.add(c.id)}const n={party1:p1,party2:p2};save(n);return{chars:a,map:m,assignments:n,p1:p1.map(id=>m.get(id)).filter(Boolean),p2:p2.map(id=>m.get(id)).filter(Boolean)}}
function party(name,id,p){return `<article class="party authoritative-party" data-party="${id}"><div class="party-heading"><div><h3>${name}</h3><div class="party-score">Estimated potential: <strong>${fmt(score(p))}</strong></div></div><div class="party-meta">${p.length}/4</div></div><div class="party-dropzone authoritative-dropzone" data-drop-party="${id}">${p.length?p.map(c=>{const d=displayData(c);return`<div class="party-member authoritative-member" draggable="true" data-character-id="${esc(c.id)}"><div class="party-member-main"><a class="party-character-link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${d.icon?`<img class="class-icon" src="${esc(d.icon)}" alt="${esc(d.class)}">`:''}${esc(d.name)}</a><span>${esc(d.class)}</span></div></div>`}).join(''):'<div class="party-empty">Drop a character here</div>'}</div></article>`}
function render(){const el=$('#suggestedParties');if(!el)return;const m=model();if(!m.chars.length){el.innerHTML='<div class="empty-roster">Add specific character profiles to generate the party setup.</div>';return}el.innerHTML=`<div class="authoritative-summary"><strong>Combined estimated potential: ${fmt(total(m.p1,m.p2))}</strong></div><div class="authoritative-parties">${party('Party 1','party1',m.p1)}${party('Party 2','party2',m.p2)}</div>`}
function install(){const ob=$('#optimizeBtn');if(ob)ob.onclick=()=>{const a=chars();if(a.length){save(bestAssignment(a));render()}};const z=$('#suggestedParties');if(!z)return;let timer=0;const rerender=()=>{clearTimeout(timer);timer=setTimeout(render,100)};const roster=$('#roster');if(roster)new MutationObserver(rerender).observe(roster,{subtree:true,childList:true,characterData:true,attributes:true});setTimeout(render,1000);setTimeout(render,2000);setTimeout(render,4000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
