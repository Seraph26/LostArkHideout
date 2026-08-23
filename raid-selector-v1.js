/* Lost Ark Party — raid selector manifest integration v5 */
(()=>{
'use strict';
const MANIFEST='raid-encounters.json';
const MODE='lostark-hideout-optimizer-mode-v1';
const DEFAULT={general:true,raid:''};
function state(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem(MODE)||'{}')}}catch{return {...DEFAULT}}}
function save(s){localStorage.setItem(MODE,JSON.stringify(s))}
function controls(){return{select:document.getElementById('raidSpecificSelect'),general:document.getElementById('generalOptimization'),label:document.getElementById('optimizerModeLabel')}}
function setModeText(s){const c=controls();if(c.label)c.label.textContent=s.general?'General Optimization':'Raid Specific Optimization'}
function apply(s){const c=controls();if(!c.select||!c.general)return;c.general.checked=!!s.general;c.select.value=s.raid||'';c.select.disabled=!!s.general;setModeText(s);window.LostArkOptimizerMode=s}
function addGroup(select,label,items){if(!items.length)return;const g=document.createElement('optgroup');g.label=label;for(const x of items){const o=document.createElement('option');o.value=x.id;o.textContent=x.label;o.dataset.boss=x.boss||'';o.dataset.difficulty=x.difficulty||'';o.dataset.schema=x.schema||'';o.dataset.gate=x.gate==null?'':String(x.gate);o.dataset.sourceGroup=x.sourceGroup||'';o.dataset.kind=x.kind||'raid';o.dataset.players=String(Number(x.players)===4?4:8);g.appendChild(o)}select.appendChild(g)}
async function loadManifest(){const r=await fetch(MANIFEST+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Raid manifest unavailable');return r.json()}
function encounterFromOption(o){return o?{id:o.value,label:o.textContent,boss:o.dataset.boss,difficulty:o.dataset.difficulty,schema:o.dataset.schema,gate:o.dataset.gate?Number(o.dataset.gate):null,sourceGroup:o.dataset.sourceGroup,kind:o.dataset.kind,players:Number(o.dataset.players)===4?4:8}:null}
function fallback(){return{updatedAt:null,source:'fallback',raids:[
{id:'horizon-cathedral-g1',label:'Horizon Cathedral — Gate 1',boss:'Horizon Cathedral Gate 1',kind:'raid',schema:'level',players:4},
{id:'horizon-cathedral-g2',label:'Horizon Cathedral — Gate 2',boss:'Horizon Cathedral Gate 2',kind:'raid',schema:'level',players:4},
{id:'serca-g1',label:'Serca — Gate 1',boss:'Serca Gate 1',kind:'raid',players:4},
{id:'serca-g2',label:'Serca — Gate 2',boss:'Corvus Tul Rak',kind:'raid',players:4},
{id:'kazeros-g1',label:'Kazeros — Gate 1',boss:'Kazeros Gate 1',kind:'raid',players:8},
{id:'kazeros-g2',label:'Kazeros — Gate 2',boss:'Kazeros Gate 2',kind:'raid',players:8}
],optional:[
{id:'armoche-g1',label:'Armoche — Gate 1',boss:'Armoche Gate 1',kind:'optional',players:8},
{id:'armoche-g2',label:'Armoche — Gate 2',boss:'Armoche Gate 2',kind:'optional',players:8}
],events:[
{id:'extreme-brelshaza-g2',label:'[EXTREME] Brelshaza — Gate 2',boss:'Extreme Brelshaza Gate 2',kind:'event',schema:'extreme',players:8}
]}}
async function start(){const c=controls();if(!c.select||!c.general)return;let data;try{data=await loadManifest()}catch{data=fallback()}c.select.innerHTML='<option value="">Select Raid</option>';addGroup(c.select,'Current Active Raids',data.raids||[]);addGroup(c.select,'Optional Active Content',data.optional||[]);addGroup(c.select,'[EXTREME] Raids',data.events||[]);let s=state();const available=[...(data.raids||[]),...(data.optional||[]),...(data.events||[])];if(!available.some(x=>x.id===s.raid)){s={general:true,raid:''};save(s)}if(s.general)s.raid='';apply(s);c.general.addEventListener('change',()=>{const n={general:c.general.checked,raid:c.general.checked?'':c.select.value};save(n);apply(n)});c.select.addEventListener('change',()=>{const n={general:false,raid:c.select.value};save(n);apply(n);window.LostArkOptimizerMode={...n,encounter:encounterFromOption(c.select.selectedOptions[0])}});const o=c.select.selectedOptions[0];if(!s.general&&o)window.LostArkOptimizerMode={...s,encounter:encounterFromOption(o)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
