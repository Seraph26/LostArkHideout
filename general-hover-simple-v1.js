/* Lost Ark Party — General Optimization hover bridge
 *
 * The canonical hover-summary-v6.js renderer is the single hover formatter for
 * both Raid Specific and General Optimization. General Optimization already
 * supplies its own CP, synergy, support, and contribution values through
 * general-party-optimizer-v2.js. This bridge must not replace or strip those
 * values before the canonical renderer can format them.
 *
 * General-specific presentation rule is handled by hover-summary-v6.js:
 * - preserve General Optimization's own calculated values
 * - use the same canonical layout as Raid Specific
 * - omit the raid/gate encounter line in General mode
 *
 * Optimized General parties use the authoritative-member DOM. The canonical
 * renderer historically keyed off party-member, so mirror the harmless class
 * onto General authoritative members as they are rendered. This lets the
 * canonical renderer continue to be the sole hover formatter.
 */
(()=>{
'use strict';
window.LostArkGeneralHoverBridgeV2={active:true,version:3,delegatedTo:'LostArkHoverSummaryV1'};
const isGeneral=()=>!!document.getElementById('generalOptimization')?.checked&&!(document.getElementById('raidSpecificSelect')?.value||'');
const root=()=>document.getElementById('suggestedParties');
/* Only touch members that are actually missing the class. This ran on every
   mutation and re-added it to all eight members each time -- thousands of
   redundant calls per second feeding the page-wide mutation churn. */
function normalize(){if(!isGeneral())return;const pending=root()?.querySelectorAll('.authoritative-member:not(.party-member)');if(!pending||!pending.length)return;pending.forEach(m=>m.classList.add('party-member'));}
function start(){normalize();const r=root()||document.body;new MutationObserver(()=>{if(isGeneral())normalize()}).observe(r,{childList:true,subtree:true});document.getElementById('generalOptimization')?.addEventListener('change',normalize,true);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
