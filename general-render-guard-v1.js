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
function zones(){return [...document.querySelectorAll('#suggestedParties .authoritative-dropzone')].slice(0,2)}
function members(z){return z?[...z.querySelectorAll('.authoritative-member[data-character-id]')]:[]}
function domState(){const z=zones();return{party1:members(z[0]).map(x=>x.dataset.characterId),party2:members(z[1]).map(x=>x.dataset.characterId)}}
function sig(s=domState()){return `1:${s.party1.join(',')}|2:${s.party2.join(',')}`}
function potentials(){const r=root();if(!r)return null;const zones=[...r.querySelectorAll('.authoritative-dropzone')].slice(0,2);const p=zones.map(z=>{const party=z.closest('.authoritative-party')||z.parentElement?.closest('.authoritative-party');const e=party?.querySelector('.party-score');if(!e)return null;const strong=e.querySelector('strong');const v=num(strong?.textContent||e.textContent.match(/Estimated potential:\s*([\d,.]+)/i)?.[1]);return{e,v,strong}});const footer=r.querySelector('.authoritative-party .party-footer');let c=null;if(footer){const strong=footer.querySelector('strong');const v=num(strong?.textContent||footer.textContent.match(/Combined estimated potential:\s*([\d,.]+)/i)?.[1]);c={e:footer,v,strong}}else{const all=[...r.querySelectorAll('*')];for(const e of all){const t=clean(e.textContent);if(/^Combined estimated potential:\s*[\d,.]+/i.test(t)){const strong=e.querySelector('strong');c={e,v:num(strong?.textContent||t.match(/([\d,.]+)\s*$/)?.[1]),strong};break}}}return p.length===2&&p.every(Boolean)&&c?{p,c}:null}
function names(){try{const x=JSON.parse(localStorage.getItem('lostark-hideout-private-v3')||localStorage.getItem('lostark-hideout-private-v2')||'null');return new Map((x?.characters||[]).map(c=>[String(c.id),clean(c.profile?.name||c.name||c.id)]))}catch{return new Map()}}
function swapNames(before,after){if(!before||!after)return'Manual party swap';const out=[];for(const party of ['party1','party2']){const a=new Set(before.state[party]||[]),b=new Set(after.state[party]||[]);for(const id of a)if(!b.has(id))out.push(id)}if(out.length!==2)return'Manual party swap';const n=names();return`${n.get(String(out[0]))||out[0]} swapped with ${n.get(String(out[1]))||out[1]}`}
function arrow(delta,base,title){if(Math.abs(delta)<.005)return'';const up=delta>0,value=Math.abs(Math.round(delta)).toLocaleString(),pct=base?Math.abs(delta/base*100).toFixed(2):'0.00';return` <span class="general-top-swap-arrow ${up?'general-swap-up':'general-swap-down'}" data-swap-title="${esc(title)}" aria-label="${esc(title)}">${up?'▲':'▼'} ${value} (${up?'+':'-'}${pct}%)</span>`}
function clear(){root()?.querySelectorAll('.general-top-swap-arrow').forEach(e=>e.remove())}
function place(item,html){if(!item||!html)return;item.e.querySelector('.general-top-swap-arrow')?.remove();const strong=item.strong;if(strong)strong.insertAdjacentHTML('afterend',html);else item.e.insertAdjacentHTML('beforeend',html)}
function render(){if(!general()||optimizing||!swapBefore)return;const now=potentials();if(!now)return;const title=swapNames(swapBefore,{state:domState()});place(now.p[0],arrow(now.p[0].v-swapBefore.p[0],swapBefore.p[0],title));place(now.p[1],arrow(now.p[1].v-swapBefore.p[1],swapBefore.p[1],title));place(now.c,arrow(now.c.v-swapBefore.c,swapBefore.c,title))}
function schedule(){[80,180,350,600,1000].forEach(ms=>setTimeout(()=>{if(!general()||optimizing||!swapBefore)return;if(sig()!==sig(swapBefore.state))render()},ms))}
function arm(){if(!general())return;optimizing=false;swapBefore=null;const p=potentials();if(!p)return;/* The optimized values are the persistent baseline. */}
function onOptimize(){if(!general())return;optimizing=true;swapBefore=null;clear();if(armTimer)clearTimeout(armTimer);armTimer=setTimeout(()=>{armTimer=null},4500)}
function captureBefore(){if(!general()||optimizing||swapBefore)return;const p=potentials();if(!p)return;swapBefore={state:domState(),p:[p.p[0].v,p.p[1].v],c:p.c.v}}
function start(){const r=root()||document.body;document.getElementById('optimizeBtn')?.addEventListener('click',onOptimize,true);r.addEventListener('pointerdown',e=>{if(e.target.closest?.('.authoritative-member'))captureBefore()},true);r.addEventListener('dragstart',e=>{if(e.target.closest?.('.authoritative-member'))captureBefore()},true);r.addEventListener('drop',schedule,true);new MutationObserver(()=>{if(!general()||optimizing||!swapBefore)return;if(sig()!==sig(swapBefore.state))schedule()}).observe(r,{childList:true,subtree:true});document.getElementById('generalOptimization')?.addEventListener('change',()=>{if(!general()){optimizing=false;swapBefore=null;clear()}else{setTimeout(clear,50)}},true);setTimeout(clear,900)}
function css(){if(document.getElementById('general-top-swap-style'))return;const s=document.createElement('style');s.id='general-top-swap-style';s.textContent='.general-top-swap-arrow{font-weight:800!important;margin-left:5px;white-space:nowrap;cursor:help!important;position:relative}.general-top-swap-arrow.general-swap-up{color:#65c878!important}.general-top-swap-arrow.general-swap-down{color:#ef6b6b!important}.general-top-swap-arrow:hover::after{content:attr(data-swap-title);position:absolute;left:0;bottom:calc(100% + 7px);z-index:99999;background:#17191d;color:#eee;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:7px 9px;font-size:11px;font-weight:400;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.4)}';document.head.appendChild(s)}
function boot(){css();start()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,50),{once:true});else setTimeout(boot,50);
})();
