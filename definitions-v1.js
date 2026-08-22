/* Lost Ark Hideout — Definitions panel.
 *
 * Plain-language explanation of every number the Optimized Party Setup shows and
 * what the optimizer is actually maximising. The worked example is built from
 * the dashboard's own hover values, so it always describes the current roster
 * rather than invented figures.
 */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=s=>{const n=Number(String(s??'').replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:0};

/* Read a rendered DPS hover card so the example uses real numbers. The canonical
   hover reads "CP 8,348.83 - Contribution 14,009" then the two percentages. */
function sample(){
 for(const m of document.querySelectorAll('#suggestedParties .party-member,#suggestedParties .authoritative-member')){
  const card=m.querySelector('.character-hover-breakdown');if(!card)continue;
  const t=(card.textContent||'').replace(/\s+/g,' ');
  const cp=t.match(/CP\s*([\d,.]+)\s*[-·]\s*Contribution\s*([\d,.]+)/i);
  const syn=t.match(/Party Synergy\s*\+?([\d.]+)%/i);
  const sup=t.match(/Support Impact\s*\+?([\d.]+)%/i);
  if(!cp||!syn||!sup)continue;
  if(num(syn[1])===0&&num(sup[1])>0)continue;              /* that shape is a support card */
  const name=(m.querySelector('.party-character-link,.party-character-title')?.textContent||'this character').trim();
  return{name,cp:num(cp[1]),total:num(cp[2]),syn:num(syn[1]),sup:num(sup[1])};
 }
 return null;
}
const fmt=n=>Math.round(n).toLocaleString();

function workedExample(){
 const s=sample();
 if(!s)return `<p class="def-note">Optimize your parties and hover a DPS character, then reopen this panel to see the sum worked through with your own numbers.</p>`;
 const synVal=s.cp*s.syn/100, supVal=s.cp*s.sup/100;
 /* Whatever is left over is the build-completeness bonus. Shown when it rounds
    to anything at all, so the column actually adds up. */
 const rest=s.total-s.cp-synVal-supVal;
 const restRow=Math.round(rest)>=1?`<tr><td>Build completeness — a small bonus for a fully filled-out build</td><td>+${fmt(rest)}</td></tr>`:'';
 return `<table class="def-table">
  <tr><th>Where it comes from</th><th>Amount</th></tr>
  <tr><td>${esc(s.name)}'s own Combat Power</td><td>${fmt(s.cp)}</td></tr>
  <tr><td>Party synergy — buffs from the other two DPS (+${s.syn.toFixed(2)}%)</td><td>+${fmt(synVal)}</td></tr>
  <tr><td>Support impact — buffs from the party's support (+${s.sup.toFixed(2)}%)</td><td>+${fmt(supVal)}</td></tr>
  ${restRow}
  <tr class="def-total"><td>Contribution</td><td>${fmt(s.total)}</td></tr>
 </table>
 <p class="def-note">So ${esc(s.name)}'s ${fmt(s.total)} means: alone, worth ${fmt(s.cp)} — and sitting in <em>this exact party</em> adds roughly ${fmt(synVal+supVal)} on top. Move that character to the other party and the number changes, because the buffs around them change. Their own gear does not.</p>`;
}

const SECTIONS=[
 ['What this whole thing is for',
  `<p>You have more characters than seats. This tool tries every legal way to split them into parties and keeps the arrangement where the group as a whole hits hardest.</p>
   <p>Every number below is an <strong>estimate from a model</strong>, not a damage meter reading. It is for comparing arrangements against each other. It is not a prediction of your DPS in a real raid.</p>`],

 ['Combat Power (CP)',
  `<p>How strong a character is on their own — gear, gems, engravings, Ark Passive, bracelet, all of it rolled into one number by Lost Ark Bible.</p>
   <p>CP is read from the <strong>Combat Power panel on the right of the Bible profile</strong>, preferring <em>Estimated Raid Loadout</em>, falling back to <em>Current Loadout (Raid)</em>. The Chaos Dungeon loadout is never used, and neither is the larger number at the top of the page — that one is a personal best, not the current loadout.</p>
   <p>The dashboard never invents or adjusts CP. It is whatever Bible reports.</p>`],

 ['Contribution — the big one',
  `<p>This is the number people ask about most. <strong>Contribution is what a DPS character is worth in the party they are currently sitting in.</strong></p>
   <p>It is their own Combat Power, plus the extra value they get from the buffs of everyone around them.</p>
   ${'%%EXAMPLE%%'}
   <p><strong>Supports always show a contribution of 0 in the party total.</strong> That is deliberate, not a bug. A support's value is already counted inside the DPS numbers they are buffing — counting it twice would make supports look better than they are.</p>`],

 ['Party Synergy',
  `<p>The share of a character's value that comes from <strong>the other two DPS in their party</strong>.</p>
   <p>Classes bring different party buffs — crit rate, attack speed, damage, and so on. The model only counts a buff if the character receiving it can actually use it. Attack speed is worth far more to someone whose build feeds on it than to someone who ignores it.</p>
   <p>How strong the giver is matters too: a better-geared character supplies a bigger version of the same buff.</p>`],

 ['Support Impact and Support Uptime',
  `<p><strong>Support Impact</strong> is the share of a DPS character's value that comes from the party's support.</p>
   <p><strong>Support Uptime</strong> is the honest part: buffs are not on you all fight. If the three DPS are stood in three different places, a support physically cannot keep everyone buffed at once, and uptime falls. If they are stacked together, it stays high.</p>
   <p>Support classes differ here. Paladin and Valkyrie hold up much better across a spread-out party than Bard and Artist do. That is why the same support can be worth noticeably more in one party than the other.</p>
   <p>A support's own gear counts as well — Combat Power, plus <em>Ally Damage Enhancement</em> and <em>Ally Atk. Power Enhancement</em> rolls, which make the buffs they hand out bigger.</p>`],

 ['Estimated potential',
  `<p><strong>Estimated potential</strong> on a party is its three DPS contributions added together.</p>
   <p><strong>Combined estimated potential</strong> at the top is both parties added together. That single number is what the optimizer is trying to make as large as possible.</p>`],

 ['What the optimizer is actually doing',
  `<p>It builds every legal arrangement, scores each one, and keeps the best. The rules it cannot break:</p>
   <ul>
    <li>Every party is <strong>exactly 3 DPS and 1 support</strong>. Never two supports, never none.</li>
    <li>8-player content fields two parties. 4-player content — Horizon Cathedral and Serca — fields one.</li>
    <li>Anyone hidden is left out. Un-hidden New Additions are considered, so an outside character can take a seat from a Main Group character.</li>
   </ul>
   <p>In Raid Specific mode each character is additionally scored against that encounter — how well their positioning and playstyle suit that fight.</p>`],

 ['What matters most',
  `<p>Roughly, from a real party on this dashboard:</p>
   <ul>
    <li><strong>Own Combat Power — around 60%.</strong> Nothing else comes close. A stronger character is a stronger pick.</li>
    <li><strong>Party synergy — around 30%.</strong> This is what makes <em>who sits with whom</em> matter.</li>
    <li><strong>Support impact — around 10%.</strong> Which support, and how well they can keep the party buffed.</li>
    <li><strong>Build completeness — a fraction of a percent.</strong> Effectively a tie-breaker.</li>
   </ul>
   <p>So if two arrangements are close together, it is usually synergy and support pairing separating them — the raw power is much the same either way.</p>`],

 ['Things it does not mean',
  `<ul>
   <li>It is <strong>not</strong> in-game DPS, and not a log parse.</li>
   <li>Contribution is <strong>not</strong> a property of a character. It only exists relative to the party they are in.</li>
   <li>Two arrangements a fraction of a percent apart are, in practice, a tie. Pick whichever you prefer to play.</li>
  </ul>`]
];

function css(){
 if(document.getElementById('definitions-style'))return;
 const s=document.createElement('style');s.id='definitions-style';
 s.textContent=`#definitionsBtn{margin-left:10px;font:inherit;font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;border:1px solid #3f8f86;background:#16302e;color:#8fe3d6;cursor:pointer;vertical-align:middle}
 #definitionsBtn:hover{background:#1c403c}
 #definitionsOverlay{position:fixed;inset:0;z-index:99998;background:rgba(4,7,12,.72);display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow:auto}
 #definitionsModal{width:min(860px,94vw);background:#0f141d;border:1px solid #2f3a4d;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.6);color:#e8ecf5}
 .def-head{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #232c3b;background:#0f141d;border-radius:14px 14px 0 0}
 .def-head h2{margin:0;font-size:19px}
 .def-close{font:inherit;font-size:13px;padding:6px 11px;border-radius:7px;border:1px solid #46516a;background:#1a2230;color:#edf2fb;cursor:pointer}
 .def-body{padding:6px 20px 22px}
 .def-body section{padding:16px 0;border-bottom:1px solid #1c2431}
 .def-body section:last-child{border-bottom:0}
 .def-body h3{margin:0 0 8px;font-size:14px;color:#8fe3d6;letter-spacing:.01em}
 .def-body p{margin:0 0 9px;font-size:13px;line-height:1.6;color:#c9d2e2}
 .def-body ul{margin:0 0 9px;padding-left:18px}
 .def-body li{font-size:13px;line-height:1.6;color:#c9d2e2;margin-bottom:5px}
 .def-body strong{color:#e8ecf5}
 .def-body em{color:#c9d2e2}
 .def-table{width:100%;border-collapse:collapse;margin:10px 0 12px;font-size:13px}
 .def-table th{text-align:left;padding:7px 10px;color:#8994ab;font-size:11px;font-weight:600;border-bottom:1px solid #2a3444}
 .def-table th:last-child,.def-table td:last-child{text-align:right;white-space:nowrap}
 .def-table td{padding:7px 10px;border-bottom:1px solid #1c2431;color:#c9d2e2}
 .def-table tr.def-total td{font-weight:700;color:#e8ecf5;border-bottom:0;border-top:1px solid #46516a}
 .def-note{color:#9aa6ba!important;font-size:12.5px!important}
 @media (max-width:600px){.def-body{padding:6px 14px 18px}.def-head{padding:14px}}`;
 document.head.appendChild(s);
}

function open(){
 close();
 const overlay=document.createElement('div');overlay.id='definitionsOverlay';
 const body=SECTIONS.map(([h,html])=>`<section><h3>${esc(h)}</h3>${html.replace('%%EXAMPLE%%',workedExample())}</section>`).join('');
 overlay.innerHTML=`<div id="definitionsModal" role="dialog" aria-modal="true" aria-label="Definitions">
   <div class="def-head"><h2>Definitions</h2><button type="button" class="def-close">Close</button></div>
   <div class="def-body">${body}</div></div>`;
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 overlay.querySelector('.def-close').addEventListener('click',close);
 document.addEventListener('keydown',onKey);
 overlay.querySelector('.def-close').focus();
}
function close(){document.getElementById('definitionsOverlay')?.remove();document.removeEventListener('keydown',onKey)}
function onKey(e){if(e.key==='Escape')close()}

function addButton(){
 const h=[...document.querySelectorAll('.optimizer-toolbar h2')].find(x=>/Optimized Party Setup/i.test(x.textContent||''));
 if(!h||document.getElementById('definitionsBtn'))return;
 const b=document.createElement('button');
 b.id='definitionsBtn';b.type='button';b.textContent='Definitions';
 b.title='What every number here means';
 b.addEventListener('click',open);
 h.appendChild(b);
}
function start(){css();addButton();[150,500,1200,2500].forEach(ms=>setTimeout(addButton,ms));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
