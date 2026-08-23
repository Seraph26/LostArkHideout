/* Lost Ark Hideout — General Optimization metrics: persistent Raid-style swap hover */
(()=>{
'use strict';
const STORE='lostark-general-optimization-baseline-v7';
const BASE_TITLE='Base DPS Power is the combined CP of the DPS characters in this party before modeled Party Synergy and Support Impact are applied.';
const SYNERGY_TITLE='Estimated increase to this party’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model contribution, not a direct in-game damage percentage.';
const SUPPORT_TITLE='Estimated increase to this party’s modeled potential from the party support. This is a model contribution, not a direct in-game damage percentage.';
let swapBefore=null;
const lastHtml=new WeakMap();
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=s=>{const n=Number(String(s??'').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:0};
function general(){return !!document.getElementById('generalOptimization')?.checked&&!(document.getElementById('raidSpecificSelect')?.value||'')}
/* Raid Specific renders .encounter-optimized-party > .slots > .slot instead of
   General's .authoritative-dropzone > .authoritative-member, but the raid slots
   carry the same .authoritative-member class and the same canonical hover, so
   one selector covers both modes and the metrics below are mode-agnostic. */
function zones(){return [...document.querySelectorAll('#suggestedParties .authoritative-dropzone,#suggestedParties .encounter-optimized-party .slots')].slice(0,2)}
function active(){return zones().length>0}
/* The metrics block belongs beside the party, not inside the slot grid. */
function host(z){return z.classList.contains('slots')?(z.parentElement||z):z}
function members(z){return z?[...z.querySelectorAll('.authoritative-member[data-character-id]')]:[]}
function domState(){const z=zones();return{party1:members(z[0]).map(x=>x.dataset.characterId),party2:members(z[1]).map(x=>x.dataset.characterId)}}
function sig(s=domState()){return `1:${s.party1.join(',')}|2:${s.party2.join(',')}`}
function metric(m){const t=clean(m.querySelector('.character-hover-breakdown')?.textContent||'');const cp=num((t.match(/CP\s*([\d,.]+)/i)||[])[1]);if(!cp)return null;return{cp,sy:num((t.match(/Party Synergy\s*\+?([\d.]+)%/i)||[])[1]),su:num((t.match(/Support Impact\s*\+?([\d.]+)%/i)||[])[1]),support:/Support Impact/i.test(t)&&/Support compatibility/i.test(t)&&!/Party Synergy\s+\+?[1-9]/i.test(t)}}
function calc(z){const a=members(z).map(metric).filter(Boolean),d=a.filter(x=>!x.support);if(!d.length)return null;const base=d.reduce((n,x)=>n+x.cp,0),sy=d.reduce((n,x)=>n+x.cp*x.sy/100,0),su=d.reduce((n,x)=>n+x.cp*x.su/100,0);return{base,sy:base?sy/base*100:0,su:base?su/base*100:0}}
/* One party is a legitimate layout (4-player content in either mode). */
function all(){const z=zones(),m=z.map(calc);return z.length&&m.every(Boolean)?m:null}
/* New Additions can hold a seat, so a swap can involve one. Reading the Main
   Group key alone left their id unresolved and the tooltip printed a raw uuid. */
function rosterNames(){const m=new Map();const add=list=>{for(const c of list||[])if(c?.id)m.set(String(c.id),clean(c.profile?.name||c.name||c.id))};
 try{add(window.LostArkCandidateRoster?.getAll?.())}catch{}
 if(!m.size){try{const x=JSON.parse(localStorage.getItem('lostark-hideout-private-v3')||localStorage.getItem('lostark-hideout-private-v2')||'null');add(x?.characters)}catch{}
  try{add(JSON.parse(localStorage.getItem('lostark-hideout-new-additions-v1')||'null'))}catch{}}
 return m}
function swapNames(before,after){if(!before||!after)return'Manual party swap';const out=[];for(const p of ['party1','party2']){const a=new Set(before.state[p]),b=new Set(after.state[p]);for(const id of a)if(!b.has(id))out.push(id)}if(out.length!==2)return'Manual party swap';const n=rosterNames();return`${n.get(String(out[0]))||out[0]} swapped with ${n.get(String(out[1]))||out[1]}`}
function snapshot(){const m=all();return{state:domState(),metrics:m?m.map(x=>({base:x.base,sy:x.sy,su:x.su})):[]}}
function change(current,before,key,title){if(!before)return'';const d=current[key]-before[key];if(Math.abs(d)<.005)return'';const up=d>0,label=key==='base'?Math.abs(Math.round(d)).toLocaleString():Math.abs(d).toFixed(2)+' pts';return` <span class="general-swap-arrow ${up?'general-swap-up':'general-swap-down'}" data-swap-title="${esc(title)}" aria-label="${esc(title)}">${up?'▲':'▼'} ${label}</span>`}
/* The best/worst available swap panels are gone from both optimizers. This sweep
   stays as a net for anything a stale cached script still paints, and now runs
   in Raid Specific too, where those panels also used to appear. */
function removeLegacy(){if(!active())return;document.querySelectorAll('#suggestedParties .swap-impact,#suggestedParties .manual-party-change,#suggestedParties .party-manual-summary').forEach(e=>e.remove());document.querySelectorAll('#suggestedParties *').forEach(e=>{if(e.classList.contains('general-metrics-block'))return;const t=clean(e.textContent);if(/^Manual party change\s+Best available swap:/i.test(t)&&e.children.length<8)e.remove()})}
function render(){
 if(!active())return;
 removeLegacy();
 const z=zones(),m=all();
 if(!m)return;
 const before=swapBefore?.metrics||null,changed=!!swapBefore&&sig()!==sig(swapBefore.state),title=changed?swapNames(swapBefore,{state:domState()}):'';
 z.forEach((zone,i)=>{
   const parent=host(zone);
   let box=parent.querySelector('.general-metrics-block');
   /* Raid: straight after the slot grid, which puts the block above the Synergies
      line exactly as it sits in General (where the zone is the dropzone and the
      Synergies line is its sibling). */
   if(!box){box=document.createElement('div');box.className='general-metrics-block';
    if(parent!==zone)zone.insertAdjacentElement('afterend',box);
    else{const a=parent.querySelector('.party-synergies');if(a)a.insertAdjacentElement('afterend',box);else parent.appendChild(box)}}
   const c={base:m[i].base,sy:m[i].sy,su:m[i].su},o=changed?before?.[i]:null;
   /* Compare against the exact html last written, not against tag-stripped text:
      stripping inserts spaces the rendered textContent does not have, so with a
      swap arrow present the two never matched and every pass rewrote the block.
      Idle churn is what made the page crawl, so this has to be an exact test. */
   const html=`<div class="general-metric"><span class="general-metric-label" data-metric-title="${esc(BASE_TITLE)}" aria-label="${esc(BASE_TITLE)}">Base DPS Power</span> <strong>${Math.round(c.base).toLocaleString()}</strong>${changed?change(c,o,'base',title):''}</div><div class="general-metric"><span class="general-metric-label" data-metric-title="${esc(SYNERGY_TITLE)}" aria-label="${esc(SYNERGY_TITLE)}">Party Synergy</span> <strong>+${c.sy.toFixed(2)}%</strong>${changed?change(c,o,'sy',title):''}</div><div class="general-metric"><span class="general-metric-label" data-metric-title="${esc(SUPPORT_TITLE)}" aria-label="${esc(SUPPORT_TITLE)}">Support Impact</span> <strong>+${c.su.toFixed(2)}%</strong>${changed?change(c,o,'su',title):''}</div>`;
   if(box.children.length!==3||lastHtml.get(box)!==html){box.innerHTML=html;lastHtml.set(box,html)}
 });
}
function css(){
 let s=document.getElementById('general-metrics-style');
 if(s)return;
 s=document.createElement('style');s.id='general-metrics-style';
 s.textContent=`.general-metrics-block{display:flex;flex-direction:column;gap:4px;margin-top:12px;font-size:12px;line-height:1.55}.general-metric{position:relative}.general-metric-label{position:relative;display:inline-block;border-bottom:1px dotted currentColor;cursor:help}.general-metric-label:hover::after{content:attr(data-metric-title);position:absolute;left:0;bottom:calc(100% + 8px);z-index:100000;width:350px;max-width:min(350px,80vw);padding:9px 11px;background:#17191d;color:#eee;border:1px solid rgba(255,255,255,.18);border-radius:7px;box-shadow:0 8px 24px rgba(0,0,0,.4);font-size:11px;font-weight:400;line-height:1.45;white-space:normal;pointer-events:none}.general-swap-arrow{font-weight:800!important;margin-left:5px;white-space:nowrap;cursor:help!important}.general-swap-arrow.general-swap-up{color:#65c878!important}.general-swap-arrow.general-swap-down{color:#ef6b6b!important}.general-swap-arrow:hover::after{content:attr(data-swap-title);position:absolute;left:0;bottom:calc(100% + 7px);z-index:99999;background:#17191d;color:#eee;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:7px 9px;font-size:11px;font-weight:400;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.4)}`;
 document.head.appendChild(s);
}
function arm(){swapBefore=null;try{localStorage.setItem(STORE,JSON.stringify({metrics:all(),state:domState(),sig:sig()}))}catch{}render()}
function onOptimize(){swapBefore=null;setTimeout(render,50);setTimeout(render,150);setTimeout(render,300);setTimeout(render,600);setTimeout(arm,1200)}
function captureBefore(){if(!active()||swapBefore)return;const s=snapshot();if(s.metrics.length)swapBefore=s}
/* Runs from a document-level capture listener, so the optimizer has not rewritten
   the parties yet: the first pass has to be a macrotask later. The ladder covers
   layers that rewrite the hover afterwards without waiting on the slowest one. */
function captureAfter(){if(!active()||!swapBefore)return;const beforeSig=sig(swapBefore.state);[0,60,150,400].forEach(ms=>setTimeout(()=>{if(!active()||!swapBefore)return;if(sig()!==beforeSig)render()},ms))}
function start(){
 css();
 const root=document.getElementById('suggestedParties')||document.body;
 root.addEventListener('pointerdown',e=>{if(e.target.closest?.('.authoritative-member'))captureBefore()},true);
 root.addEventListener('dragstart',e=>{if(e.target.closest?.('.authoritative-member'))captureBefore()},true);
 /* The optimizer's own drop handler is a capture listener on this same root and
    calls stopImmediatePropagation(), so a listener here never ran: the arrows
    only caught up through the observer's debounce, which is the lag after a
    manual swap. document-level capture runs before any listener on the root. */
 document.addEventListener('drop',()=>captureAfter(),true);
 document.getElementById('optimizeBtn')?.addEventListener('click',onOptimize,true);
 /* This observer used to re-render on any mutation under #suggestedParties, but
    render() writes .general-metrics-block inside that same root, so every render
    retriggered it -- roughly 4,000 DOM mutations per second, forever, which is
    what made the page crawl and kept rewriting hover text. Ignore our own
    output, suppress reentry while rendering, and debounce. */
 let rendering=false,pending=0;
 /* Also ignore hover cards: they are display-only and say nothing about party
    membership or potentials, but rewriting them used to retrigger a recompute. */
 const ownOutput=r=>{const el=r.target&&(r.target.nodeType===1?r.target:r.target.parentElement);return !!el?.closest?.('.general-metrics-block,.character-hover-breakdown')};
 const observer=new MutationObserver(recs=>{
  if(rendering||!active())return;
  if(recs.every(ownOutput))return;
  removeLegacy();
  clearTimeout(pending);
  pending=setTimeout(()=>{rendering=true;try{render()}finally{setTimeout(()=>{rendering=false},0)}},80);
 });
 observer.observe(root,{childList:true,subtree:true,characterData:true});
 [50,150,300,600,1000,2000].forEach(ms=>setTimeout(render,ms));
 /* Self-heal: if any other layer repaints #suggestedParties at a moment the
    observer has suppressed (or its debounce is mid-flight), the block would stay
    missing until the next interaction. render() writes only when a value
    actually differs, so a settled page still measures 0 idle mutations. */
 setInterval(()=>{if(!rendering)render()},1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();