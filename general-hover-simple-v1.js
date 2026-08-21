/* Lost Ark Hideout — General Optimization hover bridge
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
 */
(()=>{
'use strict';
window.LostArkGeneralHoverBridgeV2={active:true,version:2,delegatedTo:'LostArkHoverSummaryV1'};
})();
