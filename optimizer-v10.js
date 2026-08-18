/* UI patch: readable character synergy hover + simpler metric definitions. */
(()=>{
'use strict';
const root=document.querySelector('#suggestedParties');
if(!root)return;
if(!document.getElementById('optimizer-readable-hover')){const s=document.createElement('style');s.id='optimizer-readable-hover';s.textContent=`
.character-hover-breakdown .chb-detail{display:flex!important;flex-direction:column!important;gap:5px!important;margin-top:9px!important;line-height:1.45!important}
.character-hover-breakdown .chb-synergy{display:block!important;padding:2px 0!important}
.optimizer-definition{line-height:1.55!important}
`;document.head.appendChild(s)}
const defs={
'Base DPS CP':'The total Combat Power of the DPS characters before adding any party or build bonuses.',
'Build adjustment':'The estimated boost from how that character is built, including things like Ark Grid, Ark Passive, engravings, and gems.',
'Party synergy':'The extra damage a character gets from useful buffs provided by the other DPS characters in their party.',
'Support contribution':'The extra damage a character gets from their party support’s buffs and damage boosts.'};
function patch(){
root.querySelectorAll('.character-hover-breakdown .chb-detail').forEach(d=>{if(d.dataset.readable==='1')return;const raw=d.textContent.trim();const parts=raw.split(' · ').map(x=>x.trim()).filter(Boolean);d.innerHTML=parts.map(x=>`<div class="chb-synergy">${x}</div>`).join('');d.dataset.readable='1'});
root.querySelectorAll('.optimizer-definition').forEach(t=>{const label=t.parentElement?.querySelector('.optimizer-definition-label')?.textContent?.trim();if(label&&defs[label])t.textContent=defs[label]});
}
patch();new MutationObserver(patch).observe(root,{childList:true,subtree:true});
})();