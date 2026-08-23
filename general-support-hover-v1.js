/* Lost Ark Party — General Optimization support hover authority */
(()=>{
'use strict';
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function general(){return document.getElementById('generalOptimization')?.checked!==false&&window.LostArkOptimizerMode?.general!==false}
function store(){try{return JSON.parse(localStorage.getItem('lostark-hideout-private-v3')||'null')||{characters:[]}}catch{return{characters:[]}}}
function roster(){return store().characters||[]}
function profile(c){return c?.profile||c?.data||{}}
function name(c){const p=profile(c);return clean(p.name||c?.name)||'Unknown'}
function cp(c){const p=profile(c);return num(p.cp??p.combatPower)}
function cls(c){const p=profile(c);const v=clean(p.class||p.className||p.characterClass);if(SUPPORTS.has(v))return v;const t=clean([p.rawText,p.text,p.characterText,p.engravingsText].filter(Boolean).join(' ')).toLowerCase();for(const [n,r] of [['Bard',/\bbard\b|desperate salvation|true courage/],['Artist',/\bartist\b|full bloom|recurrence/],['Paladin',/\bpaladin\b|blessed aura/],['Valkyrie',/\bvalkyrie\b/]])if(r.test(t))return n;return v}
function isSupportDom(m){return SUPPORTS.has(clean(m.querySelector('.party-role-label')?.textContent))||SUPPORTS.has(cls(find(m)))||/Build Effect:\s*\+0/i.test(m.querySelector('.character-hover-breakdown')?.textContent||'')}
function find(m){const id=m.dataset.characterId;return roster().find(c=>String(c.id)===String(id))}
function supportValue(s,target){const sc=cls(s);let pct=sc==='Valkyrie'?.095:.10;let uptime=(sc==='Paladin'||sc==='Valkyrie')?.94:.76;const ptarget=clean(target.querySelector('.party-stat-label')?.textContent).toLowerCase();if(/hit master/.test(ptarget)&&sc!=='Paladin'&&sc!=='Valkyrie')uptime-=.05;return cp(target)*pct*Math.max(.60,uptime)}
function render(){if(!general())return;document.querySelectorAll('#suggestedParties .party-dropzone').forEach(z=>{const members=[...z.querySelectorAll(':scope > .party-member')];const supportDom=members.find(isSupportDom);if(!supportDom)return;const s=find(supportDom);if(!s)return;const dps=members.filter(m=>m!==supportDom),rows=dps.map(m=>{const t=find(m);if(!t||!cp(t))return'';const v=supportValue(s,m);return `<div class="gf-support-row"><div>Support Amplification to ${esc(name(t))}: +${Math.round(v).toLocaleString()} estimated contribution</div><div>${(v/cp(t)*100).toFixed(2)}% of base power</div></div>`}).filter(Boolean);const total=dps.reduce((n,m)=>{const t=find(m);return t?n+supportValue(s,m):n},0);const card=supportDom.querySelector('.character-hover-breakdown');if(!card)return;const current=clean(card.textContent);const contribution=(current.match(/Contribution\s*:?\s*([\d,]+(?:\.\d+)?)/i)||[])[1];const base=cp(s);card.innerHTML=`<div class="chb-head"><strong>${esc(name(s))}</strong><span>CP ${base.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} - Contribution ${contribution||base.toLocaleString()}</span></div><div class="chb-stats"><span>Party Synergy +0.00%</span><span>Support Impact +${(total/base*100).toFixed(2)}%</span></div><div class="chb-detail">Support contribution to this party: +${Math.round(total).toLocaleString()} estimated contribution</div><div class="chb-detail">${rows.join('')||'No direct support effects detected.'}</div>`;card.dataset.generalSupportAuthority='1'})}
function start(){const run=()=>{if(general())render()};[0,100,250,500,1000,2000,4000].forEach(ms=>setTimeout(run,ms));setInterval(run,1000);new MutationObserver(()=>setTimeout(run,0)).observe(document.getElementById('suggestedParties')||document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
