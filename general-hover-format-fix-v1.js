/* Lost Ark Hideout — General hover formatting only */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const LABELS={damage:'Damage',mana:'Mana',crit:'Critical Rate',critDamage:'Critical Damage',attackSpeed:'Attack Speed',attackPower:'Attack Power',moveSpeed:'Move Speed',movementSpeed:'Move Speed',supportAmplification:'Support Amplification',positional:'Positional Damage',positionalGeneral:'Positional Damage',positionalSpecific:'Positional Damage'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0};
function active(){return document.getElementById('generalOptimization')?.checked!==false&&window.LostArkOptimizerMode?.general!==false}
function roster(){try{return(JSON.parse(localStorage.getItem('lostark-hideout-private-v3')||'null')?.characters||[])}catch{return[]}}
function name(c){return clean(c?.profile?.name||c?.name)||'Unknown'}
function cp(c){return num(c?.profile?.cp??c?.profile?.combatPower)}
function findByName(n){const q=clean(n).toLowerCase();return roster().find(c=>name(c).toLowerCase()===q)||null}
function label(s){const k=clean(s);return LABELS[k]||k.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,x=>x.toUpperCase())}
function parseRow(row){const raw=clean(row.textContent);const m=raw.match(/^(.+?)\s+(from|to)\s+(.+?):\s*([+-]?[\d,]+(?:\.\d+)?)\s+estimated contribution(?:\s+([+-]?[\d,]+(?:\.\d+)?)%\s+of\s+(.+?)(?:'s)?\s+base power)?(?:\s*[-·]\s*observed median uptime\s+([\d.]+)%?)?$/i);if(!m)return null;return{effect:label(m[1]),direction:m[2].toLowerCase(),other:clean(m[3]),value:num(m[4]),oldPct:m[5]?num(m[5]):null,targetBaseName:clean(m[6]),uptime:m[7]?num(m[7]):null}}
function formatRow(row,owner){const p=parseRow(row);if(!p)return false;let pct=p.oldPct,targetName=p.other;if(p.direction==='to'){const target=findByName(p.other);if(target){const b=cp(target);if(b>0)pct=p.value/b*100;targetName=name(target)}}else{const b=cp(owner);if(b>0)pct=p.value/b*100}const line1=`${p.effect} ${p.direction} ${p.other}: ${p.value>=0?'+':''}${Math.round(p.value).toLocaleString()} estimated contribution`;const line2=`${pct.toFixed(2)}% of ${p.direction==='to'?targetName+"'s ":''}base power${p.uptime!=null?` · observed median uptime ${p.uptime.toFixed(2)}%`:''}`;row.innerHTML=`<div>${esc(line1)}</div><div class="chb-contribution-pct">${esc(line2)}</div>`;row.style.display='block';return true}
function renderMember(member){const card=member.querySelector('.character-hover-breakdown');if(!card)return;const owner=findByName(clean(member.querySelector('.party-character-link')?.textContent));if(!owner)return;const rows=[...card.querySelectorAll('.chb-synergy')];if(!rows.length)return;rows.forEach(r=>formatRow(r,owner));if(clean(member.querySelector('.party-role-label')?.textContent).toLowerCase()==='support'){card.querySelectorAll('.chb-stats span').forEach(s=>{if(/^Party Synergy\s*\+0\.00%$/i.test(clean(s.textContent))||/^Support Impact\s*\+0\.00%$/i.test(clean(s.textContent)))s.remove()});}}
function render(){if(!active())return;document.querySelectorAll('#suggestedParties .party-member').forEach(renderMember)}
function start(){const s=document.createElement('style');s.textContent='.chb-general-authority .chb-synergy>div:first-child,.chb-general-authority .chb-synergy>div+div{display:block}.chb-general-authority .chb-synergy{margin:5px 0;line-height:1.45}';document.head.appendChild(s);const root=document.getElementById('suggestedParties')||document.body;let t;const schedule=()=>{clearTimeout(t);t=setTimeout(render,30)};new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});[0,100,250,500,1000,2000,4000].forEach(ms=>setTimeout(render,ms));setInterval(render,750)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
