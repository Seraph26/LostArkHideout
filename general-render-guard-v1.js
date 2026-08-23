/* Lost Ark Hideout — General Optimization top-potential swap indicators
 * Uses the same interaction lifecycle as general-party-metrics-v1:
 * optimize establishes the baseline; pointerdown on an authoritative member
 * captures the pre-swap state; drop/mutation observes the committed swap.
 */
(()=>{
'use strict';
let optimizing=false,armTimer=null,swapBefore=null;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=s=>{const n=Number(String(s??'').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:0};
function general(){return !!document.getElementById('generalOptimization')?.checked&&!(document.getElementById('raidSpecificSelect')?.value||'')}
function root(){return document.getElementById('suggestedParties')}
/* Raid Specific lays its parties out as .encounter-optimized-party > .slots;
   both modes carry the same swap arrows, so one selector covers them. */
function zones(){return [...document.querySelectorAll('#suggestedParties .authoritative-dropzone,#suggestedParties .encounter-optimized-party .slots')].slice(0,2)}
function active(){return zones().length===2}
function members(z){return z?[...z.querySelectorAll('.authoritative-member[data-character-id]')]:[]}
function domState(){const z=zones();return{party1:members(z[0]).map(x=>x.dataset.characterId),party2:members(z[1]).map(x=>x.dataset.characterId)}}
function sig(s=domState()){return `1:${s.party1.join(',')}|2:${s.party2.join(',')}`}
function potentials(){const r=root();if(!r)return null;const zones=[...r.querySelectorAll('.authoritative-dropzone,.encounter-optimized-party .slots')].slice(0,2);const p=zones.map(z=>{const party=z.closest('.authoritative-party,.encounter-optimized-party')||z.parentElement?.closest('.authoritative-party,.encounter-optimized-party');const e=party?.querySelector('.party-score');if(!e)return null;const strong=e.querySelector('strong');const v=num(strong?.textContent||e.textContent.match(/Estimated potential:\s*([\d,.]+)/i)?.[1]);return{e,v,strong}});
 /* The favorability average sits in the same .party-score line, in its own
    strong, so it gets its own anchor and its own arrow key. */
 const f=zones.map(z=>{const party=z.closest('.encounter-optimized-party')||z.parentElement?.closest('.encounter-optimized-party');const s=party?.querySelector('.party-score .party-fit');return s?{e:s.parentElement,v:num(s.textContent),strong:s}:null});
 const footer=r.querySelector('.authoritative-party .party-footer');let c=null;if(footer){const strong=footer.querySelector('strong');const v=num(strong?.textContent||footer.textContent.match(/Combined estimated potential:\s*([\d,.]+)/i)?.[1]);c={e:footer,v,strong}}else{const all=[...r.querySelectorAll('*')];for(const e of all){const t=clean(e.textContent);if(/^Combined estimated potential:\s*[\d,.]+/i.test(t)){const strong=e.querySelector('strong');c={e,v:num(strong?.textContent||t.match(/([\d,.]+)\s*$/)?.[1]),strong};break}}}return p.length===2&&p.every(Boolean)&&c?{p,c,f}:null}
/* Same reason as the metrics block: a swap can involve a New Addition, and the
   Main Group key alone left the tooltip printing a raw uuid. */
function names(){const m=new Map();const add=list=>{for(const c of list||[])if(c?.id)m.set(String(c.id),clean(c.profile?.name||c.name||c.id))};
 try{add(window.LostArkCandidateRoster?.getAll?.())}catch{}
 if(!m.size){try{const x=JSON.parse(localStorage.getItem('lostark-hideout-private-v3')||localStorage.getItem('lostark-hideout-private-v2')||'null');add(x?.characters)}catch{}
  try{add(JSON.parse(localStorage.getItem('lostark-hideout-new-additions-v1')||'null'))}catch{}}
 return m}
function swapNames(before,after){if(!before||!after)return'Manual party swap';const out=[];for(const party of ['party1','party2']){const a=new Set(before.state[party]||[]),b=new Set(after.state[party]||[]);for(const id of a)if(!b.has(id))out.push(id)}if(out.length!==2)return'Manual party swap';const n=names();return`${n.get(String(out[0]))||out[0]} swapped with ${n.get(String(out[1]))||out[1]}`}
/* Two shapes: a total, shown as its own change plus the relative percentage, and
   a figure that is already a percentage (Average Party Encounter Favorability),
   where the honest delta is in points -- the same wording the metrics block uses
   for its two percentage rows. */
function arrow(delta,base,title,key,points){if(Math.abs(delta)<(points?.05:.005))return'';const up=delta>0;
 const body=points?`${Math.abs(delta).toFixed(1)} pts`:`${Math.abs(Math.round(delta)).toLocaleString()} (${up?'+':'-'}${base?Math.abs(delta/base*100).toFixed(2):'0.00'}%)`;
 return` <span class="general-top-swap-arrow ${up?'general-swap-up':'general-swap-down'}" data-arrow-key="${esc(key)}" data-swap-title="${esc(title)}" aria-label="${esc(title)}">${up?'▲':'▼'} ${body}</span>`}
function clear(){root()?.querySelectorAll('.general-top-swap-arrow').forEach(e=>e.remove())}
/* Removing and re-inserting an identical arrow still fires mutation records, and
   this module's own observer reacts to them, so after any manual swap the party
   totals were being rewritten continuously (~1,000 mutations/sec). Write only
   when the arrow actually differs. */
/* Keyed, because a party's score line now carries two arrows -- the encounter
   score and the favorability average -- and an unkeyed lookup found whichever
   came first and moved it. */
function place(item,html,key){if(!item)return;const sel=`.general-top-swap-arrow[data-arrow-key="${key}"]`,cur=item.e.querySelector(sel);
 if(!html){cur?.remove();return}
 if(cur&&cur.outerHTML===html.trim())return;
 cur?.remove();const strong=item.strong;if(strong)strong.insertAdjacentHTML('afterend',html);else item.e.insertAdjacentHTML('beforeend',html)}
function render(){if(!active()||optimizing||!swapBefore)return;const now=potentials();if(!now)return;const title=swapNames(swapBefore,{state:domState()});
 place(now.p[0],arrow(now.p[0].v-swapBefore.p[0],swapBefore.p[0],title,'party1'),'party1');
 place(now.p[1],arrow(now.p[1].v-swapBefore.p[1],swapBefore.p[1],title,'party2'),'party2');
 place(now.c,arrow(now.c.v-swapBefore.c,swapBefore.c,title,'combined'),'combined');
 /* Raid Specific only: General has no favorability figure to annotate. */
 for(const i of [0,1]){const f=now.f?.[i],before=swapBefore.f?.[i];
  if(f&&Number.isFinite(before))place(f,arrow(f.v-before,before,title,`fit${i+1}`,true),`fit${i+1}`)}}
function schedule(){[0,60,180,350,600,1000].forEach(ms=>setTimeout(()=>{if(!active()||optimizing||!swapBefore)return;if(sig()!==sig(swapBefore.state))render()},ms))}
function onOptimize(){optimizing=true;swapBefore=null;clear();if(armTimer)clearTimeout(armTimer);armTimer=setTimeout(()=>{armTimer=null;/* arm() was never called, so this latch was never released: after an optimize
   click the top arrows were suppressed permanently. */optimizing=false},1200)}
function captureBefore(){if(!active()||optimizing||swapBefore)return;const p=potentials();if(!p)return;swapBefore={state:domState(),p:[p.p[0].v,p.p[1].v],c:p.c.v,f:[p.f?.[0]?.v,p.f?.[1]?.v]}}
function start(){const r=root()||document.body;document.getElementById('optimizeBtn')?.addEventListener('click',onOptimize,true);r.addEventListener('pointerdown',e=>{if(e.target.closest?.('.authoritative-member'))captureBefore()},true);r.addEventListener('dragstart',e=>{if(e.target.closest?.('.authoritative-member'))captureBefore()},true);/* Same as the metrics block: the optimizer's capture-phase drop handler on this
     root calls stopImmediatePropagation(), so this never fired and the top arrows
     waited on the observer instead. Listen at document level, which runs first. */
  document.addEventListener('drop',schedule,true);new MutationObserver(()=>{if(!active()||optimizing||!swapBefore)return;if(sig()!==sig(swapBefore.state))schedule()}).observe(r,{childList:true,subtree:true});/* Either control changes which arrangement is on screen, so a baseline captured
    against the old one is meaningless. Drop it and clear the arrows. */
 const reset=()=>{optimizing=false;swapBefore=null;clear();setTimeout(clear,50)};
 document.getElementById('generalOptimization')?.addEventListener('change',reset,true);
 document.getElementById('raidSpecificSelect')?.addEventListener('change',reset,true);
 setTimeout(clear,900)}
function css(){if(document.getElementById('general-top-swap-style'))return;const s=document.createElement('style');s.id='general-top-swap-style';s.textContent='.general-top-swap-arrow{font-weight:800!important;margin-left:5px;white-space:nowrap;cursor:help!important;position:relative}.general-top-swap-arrow.general-swap-up{color:#65c878!important}.general-top-swap-arrow.general-swap-down{color:#ef6b6b!important}.general-top-swap-arrow:hover::after{content:attr(data-swap-title);position:absolute;left:0;bottom:calc(100% + 7px);z-index:99999;background:#17191d;color:#eee;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:7px 9px;font-size:11px;font-weight:400;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.4)}';document.head.appendChild(s)}
function boot(){css();start()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,50),{once:true});else setTimeout(boot,50);
})();
