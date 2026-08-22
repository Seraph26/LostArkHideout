/* Lost Ark Hideout — General Optimization metrics: persistent Raid-style swap hover */
(()=>{
'use strict';
const STORE='lostark-general-optimization-baseline-v7';
const BASE_TITLE='Base DPS Power is the combined CP of the DPS characters in this party before modeled Party Synergy and Support Impact are applied.';
const SYNERGY_TITLE='Estimated increase to this party’s modeled potential from offensive synergies supplied by the other DPS characters in the party. This is a model contribution, not a direct in-game damage percentage.';
const SUPPORT_TITLE='Estimated increase to this party’s modeled potential from the party support. This is a model contribution, not a direct in-game damage percentage.';
let swapBefore=null;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=s=>{const n=Number(String(s??'').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:0};
function general(){return !!document.getElementById('generalOptimization')?.checked&&!(document.getElementById('raidSpecificSelect')?.value||'')}
function zones(){return [...document.querySelectorAll('#suggestedParties .authoritative-dropzone')].slice(0,2)}
function members(z){return z?[...z.querySelectorAll('.authoritative-member[data-character-id]')]:[]}
function domState(){const z=zones();return{party1:members(z[0]).map(x=>x.dataset.characterId),party2:members(z[1]).map(x=>x.dataset.characterId)}}
function sig(s=domState()){return `1:${s.party1.join(',')}|2:${s.party2.join(',')}`}
function metric(m){const t=clean(m.querySelector('.character-hover-breakdown')?.textContent||'');const cp=num((t.match(/CP\s*([\d,.]+)/i)||[])[1]);if(!cp)return null;return{cp,sy:num((t.match(/Party Synergy\s*\+?([\d.]+)%/i)||[])[1]),su:num((t.match(/Support Impact\s*\+?([\d.]+)%/i)||[])[1]),support:/Support Impact/i.test(t)&&/Support compatibility/i.test(t)&&!/Party Synergy\s+\+?[1-9]/i.test(t)}}
function calc(z){const a=members(z).map(metric).filter(Boolean),d=a.filter(x=>!x.support);if(!d.length)return null;const base=d.reduce((n,x)=>n+x.cp,0),sy=d.reduce((n,x)=>n+x.cp*x.sy/100,0),su=d.reduce((n,x)=>n+x.cp*x.su/100,0);return{base,sy:base?sy/base*100:0,su:base?su/base*100:0}}
function all(){const z=zones(),m=z.map(calc);return z.length===2&&m.every(Boolean)?m:null}
function rosterNames(){try{const x=JSON.parse(localStorage.getItem('lostark-hideout-private-v3')||localStorage.getItem('lostark-hideout-private-v2')||'null');return new Map((x?.characters||[]).map(c=>[String(c.id),clean(c.profile?.name||c.name||c.id)]))}catch{return new Map()}}
function swapNames(before,after){if(!before||!after)return'Manual party swap';const out=[];for(const p of ['party1','party2']){const a=new Set(before.state[p]),b=new Set(after.state[p]);for(const id of a)if(!b.has(id))out.push(id)}if(out.length!==2)return'Manual party swap';const n=rosterNames();return`${n.get(String(out[0]))||out[0]} swapped with ${n.get(String(out[1]))||out[1]}`}
function snapshot(){const m=all();return{state:domState(),metrics:m?m.map(x=>({base:x.base,sy:x.sy,su:x.su})):[]}}
function change(current,before,key,title){if(!before)return'';const d=current[key]-before[key];if(Math.abs(d)<.005)return'';const up=d>0,label=key==='base'?Math.abs(Math.round(d)).toLocaleString():Math.abs(d).toFixed(2)+' pts';return` <span class="general-swap-arrow ${up?'general-swap-up':'general-swap-down'}" data-swap-title="${esc(title)}" aria-label="${esc(title)}">${up?'▲':'▼'} ${label}</span>`}
function removeLegacy(){if(!general())return;document.querySelectorAll('#suggestedParties .swap-impact,#suggestedParties .manual-party-change,#suggestedParties .party-manual-summary').forEach(e=>e.remove());document.querySelectorAll('#suggestedParties *').forEach(e=>{if(e.classList.contains('general-metrics-block'))return;const t=clean(e.textContent);if(/^Manual party change\s+Best available swap:/i.test(t)&&e.children.length<8)e.remove()})}
function render(){
 if(!general())return;
 removeLegacy();
 const z=zones(),m=all();
 if(!m)return;
 const before=swapBefore?.metrics||null,changed=!!swapBefore&&sig()!==sig(swapBefore.state),title=changed?swapNames(swapBefore,{state:domState()}):'';
 z.forEach((zone,i)=>{
   let box=zone.querySelector('.general-metrics-block');
   if(!box){box=document.createElement('div');box.className='general-metrics-block';const a=zone.querySelector('.party-synergies');if(a)a.insertAdjacentElement('afterend',box);else zone.appendChild(box)}
   const c={base:m[i].base,sy:m[i].sy,su:m[i].su},o=changed?before?.[i]:null;
   const existing=box.querySelectorAll('.general-metric');
   const html=`<div class="general-metric"><span class="general-metric-label" data-metric-title="${esc(BASE_TITLE)}" aria-label="${esc(BASE_TITLE)}">Base DPS Power</span> <strong>${Math.round(c.base).toLocaleString()}</strong>${changed?change(c,o,'base',title):''}</div><div class="general-metric"><span class="general-metric-label" data-metric-title="${esc(SYNERGY_TITLE)}" aria-label="${esc(SYNERGY_TITLE)}">Party Synergy</span> <strong>+${c.sy.toFixed(2)}%</strong>${changed?change(c,o,'sy',title):''}</div><div class="general-metric"><span class="general-metric-label" data-metric-title="${esc(SUPPORT_TITLE)}" aria-label="${esc(SUPPORT_TITLE)}">Support Impact</span> <strong>+${c.su.toFixed(2)}%</strong>${changed?change(c,o,'su',title):''}</div>`;
   if(existing.length!==3||clean(box.textContent)!==clean(html.replace(/<[^>]+>/g,' ')))box.innerHTML=html;
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
function onOptimize(){if(!general())return;swapBefore=null;setTimeout(render,50);setTimeout(render,150);setTimeout(render,300);setTimeout(render,600);setTimeout(arm,1200)}
function captureBefore(){if(!general()||swapBefore)return;const s=snapshot();if(s.metrics.length===2)swapBefore=s}
function captureAfter(){if(!general()||!swapBefore)return;const beforeSig=sig(swapBefore.state);setTimeout(()=>{if(!general()||!swapBefore)return;if(sig()!==beforeSig)render()},100)}
function start(){
 css();
 const root=document.getElementById('suggestedParties')||document.body;
 root.addEventListener('pointerdown',e=>{if(e.target.closest?.('.authoritative-member'))captureBefore()},true);
 root.addEventListener('dragstart',e=>{if(e.target.closest?.('.authoritative-member'))captureBefore()},true);
 root.addEventListener('drop',()=>captureAfter(),true);
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
  if(rendering||!general())return;
  if(recs.every(ownOutput))return;
  removeLegacy();
  clearTimeout(pending);
  pending=setTimeout(()=>{rendering=true;try{render()}finally{setTimeout(()=>{rendering=false},0)}},80);
 });
 observer.observe(root,{childList:true,subtree:true,characterData:true});
 [50,150,300,600,1000,2000].forEach(ms=>setTimeout(render,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();