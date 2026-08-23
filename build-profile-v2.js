/* Lost Ark Party — raid-focused build profile cache v2 */
(()=>{
'use strict';
const KEY='lostark-hideout-build-profiles-v2';
const STATE='lostark-hideout-private-v3';
const CONNECTOR='https://lostark-bible-connector.seraph0226.workers.dev/character';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const lines=d=>(d.body?.textContent||'').split(/\n+/).map(clean).filter(Boolean);
const sectionText=(d,label,nextLabels=[])=>{const ls=lines(d),i=ls.findIndex(x=>x.toLowerCase()===label.toLowerCase());if(i<0)return clean(d.body?.textContent||'');const out=[];for(let j=i+1;j<ls.length;j++){if(nextLabels.some(n=>ls[j].toLowerCase()===n.toLowerCase()))break;out.push(ls[j])}return out.join(' ')};
function raidText(d){const all=clean(d.body?.textContent||'');const html=clean(d.documentElement?.outerHTML||'');const candidates=[];for(const src of [all,html])for(const label of ['Estimated Raid Loadout','estimated_raid','estimatedRaid','raid_merged']){const i=src.toLowerCase().indexOf(label.toLowerCase());if(i>=0)candidates.push(src.slice(i,i+18000))}if(candidates.length)return candidates.sort((a,b)=>b.length-a.length)[0];return all}
function parse(html){const d=new DOMParser().parseFromString(html,'text/html'),t=raidText(d),ls=t.split(/\n+/).map(clean).filter(Boolean),low=t.toLowerCase();
const engr=[];for(const x of ls){const m=x.match(/^(.+?)\s+(\d+)\/20(?:\s*\+\d+)?$/);if(m)engr.push(m[1].trim())}
const grid=[];for(let i=0;i<ls.length;i++){const m=ls[i].match(/^(.*?)\s+(\d+)\s*\|\s*(Order|Chaos)\s+(Sun|Moon|Star)$/i);if(m)grid.push({name:m[1].trim(),points:+m[2],type:m[3],branch:m[4]})}
const arkPassive=[];for(const x of ls){const m=x.match(/^T(\d+)\s+(.+?)\s+Lv\.\s*(\d+)/i);if(m)arkPassive.push({tier:+m[1],name:m[2].trim(),level:+m[3]})}
const stats={crit:null,specialization:null,swiftness:null};for(const k of Object.keys(stats)){const m=low.match(new RegExp('(?:^|\\s)'+k+'\\s+(\\d+)'));if(m)stats[k]=+m[1]}
const positional=engr.some(x=>/ambush master/i.test(x))||/back attack/.test(low)?'Back Attack':engr.some(x=>/master brawler/i.test(x))||/front attack/.test(low)?'Front Attack':engr.some(x=>/hit master/i.test(x))?'Hit Master':/positional/.test(low)?'Mixed':'Unknown';
const burst=/(igniter|punisher|full moon|burst|death strike|surge|identity burst)/i.test(t);
const buildText=clean([engr.join(' '),grid.map(x=>x.name+' '+x.points+' '+x.type+' '+x.branch).join(' '),arkPassive.map(x=>x.name+' '+x.level).join(' '),t].join(' '));
return{engravings:engr,grid,arkPassive,stats,positional,burst,text:buildText,retrievedAt:new Date().toISOString()}}
async function fetchBuild(c){const r=await fetch(`${CONNECTOR}?url=${encodeURIComponent(c.url)}`,{cache:'no-store',headers:{Accept:'application/json'}});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw Error('Bible connector returned non-JSON data')}if(!r.ok||data.ok===false)throw Error(data.error||`HTTP ${r.status}`);return parse(data.html||data.characterHtml||data.content||data.page)}
async function refresh(){let state;try{state=JSON.parse(localStorage.getItem(STATE)||'null')}catch{return}if(!Array.isArray(state?.characters))return;const cache=load();for(const c of state.characters){if(!c?.url)continue;try{cache[c.url]=await fetchBuild(c)}catch(e){if(!cache[c.url])cache[c.url]={error:e.message}}}save(cache);window.dispatchEvent(new CustomEvent('lostark-build-profiles-ready'))}
window.LostArkBuildProfilesV2={get:url=>load()[url]||null,refresh};
refresh();
})();