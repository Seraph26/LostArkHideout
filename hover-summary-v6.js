/* Lost Ark Hideout — compact hover summary authority v11
 *
 * General Optimization character hovers are frozen to the finalized summary:
 *   - character / CP / Contribution
 *   - Party Synergy
 *   - Support Impact
 *   - encounter compatibility note
 * Individual synergy/contribution rows are deliberately removed.
 *
 * This renderer is idempotent. It must never rewrite an already-finalized
 * hover on every MutationObserver pass, because that can create a render loop
 * during repeated optimization/manual-party cycles.
 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const members=()=>[...document.querySelectorAll('#suggestedParties .party-member')];
const card=m=>m?.querySelector('.character-hover-breakdown');
function role(m){
 const r=clean(m?.querySelector('.party-role-label')?.textContent).toLowerCase();
 if(r==='support'||r==='dps')return r;
 const c=clean(m?.querySelector('.class-icon')?.alt||m?.dataset.class||'');
 return SUPPORTS.has(c)?'support':'dps';
}
function raidMode(){
 const o=window.LostArkOptimizerMode;
 return !!(o&&o.general===false&&o.raid);
}
function removeIndividualDetails(c){
 let changed=false;
 c.querySelectorAll('.chb-synergy,.chb-upgrade,.chb-compact-detail').forEach(e=>{e.remove();changed=true});
 c.querySelectorAll('.chb-detail').forEach(e=>{
   if(!clean(e.textContent))e.remove(),changed=true;
 });
 return changed;
}
function finalizeCard(m){
 const c=card(m);if(!c)return false;
 if(raidMode())return false;
 const changed=removeIndividualDetails(c);
 c.classList.add('chb-final-general-hover');
 return changed;
}
function normalizePartySynergy(){
 document.querySelectorAll('#suggestedParties .party-synergies').forEach(el=>{
   const text=clean(el.textContent);
   if(!/^Synergies\s*:/i.test(text))return;
   if(el.querySelector('.support-uptime-label'))return;
   const raw=text.replace(/^Synergies\s*:\s*/i,'');
   const match=raw.match(/^(.*?)(?:\s*·\s*Support uptime\s*([\d.]+)%?)?$/i);
   if(!match)return;
   const body=clean(match[1]);
   const uptime=match[2];
   const parts=body.split(/\s*,\s*/).filter(Boolean);
   el.innerHTML=`<strong>Synergies:</strong> ${parts.join(', ')||'None'}${uptime?` · <span class="support-uptime-label" data-tooltip="Party synergies available from the current party. Support uptime is an optimizer estimate based on support class type and party composition, including party positioning compatibility.">Support uptime ${uptime}%</span>`:''}`;
 }
);
}
function apply(){
 if(raidMode())return;
 let changed=false;
 for(const m of members())if(finalizeCard(m))changed=true;
 normalizePartySynergy();
 return changed;
}
function css(){
 let s=document.getElementById('compact-hover-style');
 if(!s){s=document.createElement('style');s.id='compact-hover-style';document.head.appendChild(s)}
 s.textContent=`
 .chb-final-general-hover .chb-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:5px}
 .chb-final-general-hover .chb-stats{display:flex;gap:16px;margin:3px 0 5px}
 .chb-final-general-hover .chb-detail{margin-top:5px;line-height:1.45}
 #suggestedParties .support-uptime-label{display:inline-block;text-decoration-line:underline;text-decoration-style:dotted;text-decoration-thickness:1px;text-underline-offset:3px;cursor:help}
 #lah-support-uptime-tooltip{position:fixed;display:none;width:360px;max-width:calc(100vw - 32px);padding:10px 12px;border-radius:6px;background:#1f1f1f;color:#fff;font-size:12px;line-height:1.45;z-index:2147483647;pointer-events:none}`;
}
function tooltip(){
 document.addEventListener('mouseover',e=>{
   const el=e.target.closest?.('#suggestedParties .support-uptime-label');if(!el)return;
   let t=document.getElementById('lah-support-uptime-tooltip');
   if(!t){t=document.createElement('div');t.id='lah-support-uptime-tooltip';document.body.appendChild(t)}
   t.textContent=el.getAttribute('data-tooltip')||'';t.style.display='block';
   const r=el.getBoundingClientRect();
   t.style.left=Math.max(16,Math.min(r.left+r.width/2-t.offsetWidth/2,innerWidth-t.offsetWidth-16))+'px';
   t.style.top=Math.max(8,r.top-t.offsetHeight-10)+'px';
 },true);
 document.addEventListener('mouseout',e=>{
   if(e.target.closest?.('#suggestedParties .support-uptime-label'))document.getElementById('lah-support-uptime-tooltip')?.style.setProperty('display','none');
 },true);
}
function start(){
 css();apply();tooltip();
 const root=document.getElementById('suggestedParties')||document.body;
 let timer=0;
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>apply(),40)};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
 document.getElementById('optimizeBtn')?.addEventListener('click',()=>[0,50,150,300,600,1200,2000].forEach(ms=>setTimeout(apply,ms)),true);
 [50,150,300,600,1000,2000,4000].forEach(ms=>setTimeout(apply,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();