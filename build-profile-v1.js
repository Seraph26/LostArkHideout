/* Lost Ark Hideout — Bible build profile cache */
(()=>{
const KEY='lostark-hideout-build-profiles-v1';
const STATE='lostark-hideout-private-v3';
const CONNECTOR='https://lostark-bible-connector.seraph0226.workers.dev/character';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
const esc=s=>String(s||'').replace(/\s+/g,' ').trim();
const num=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
const lines=d=>(d.body?.textContent||'').split(/\n+/).map(esc).filter(Boolean);
const section=(ls,start,stops)=>{const i=ls.findIndex(x=>x.toLowerCase()===start.toLowerCase());if(i<0)return[];const out=[];for(let j=i+1;j<ls.length;j++){if(stops.some(s=>ls[j].toLowerCase()===s.toLowerCase()))break;out.push(ls[j])}return out};
function parse(html){const d=new DOMParser().parseFromString(html,'text/html'),ls=lines(d),text=esc(d.body?.textContent||'');
 const grid=[];let gi=ls.findIndex(x=>x.toLowerCase()==='ark grid');if(gi>=0){for(let i=gi+1;i<Math.min(ls.length,gi+130);i++){const m=ls[i].match(/^(.*?)\s+(\d+)\s*\|\s*(Order|Chaos)\s+(Sun|Moon|Star)$/i);if(m)grid.push({name:esc(m[1]),points:Number(m[2]),type:m[3],branch:m[4]})}}
 const engr=[];let ei=ls.findIndex(x=>x.toLowerCase()==='engravings');if(ei>=0){for(let i=ei+1;i<Math.min(ls.length,ei+45);i++){const m=ls[i].match(/^(.+?)\s+(\d+)\/20(?:\s*\+\d+)?$/);if(m)engr.push({name:esc(m[1]),level:Number(m[2])/4})}}
 const ap=[];let ai=ls.findIndex(x=>x.toLowerCase()==='ark passive');if(ai>=0){for(let i=ai+1;i<Math.min(ls.length,ai+120);i++){if(/^(Skills|Paradise|Popularity|Cards)$/i.test(ls[i]))break;const m=ls[i].match(/^T(\d+)\s+(.+?)\s+Lv\.\s*(\d+)/i);if(m)ap.push({tier:Number(m[1]),name:esc(m[2]),level:Number(m[3])})}}
 const skillStart=ls.findIndex(x=>x.toLowerCase()==='skills'),skills=[];if(skillStart>=0){for(let i=skillStart+1;i<Math.min(ls.length,skillStart+100);i++){const m=ls[i].match(/^(.+?)\s*Lv\.\s*(\d+)$/i);if(m)skills.push({name:esc(m[1]),level:Number(m[2])})}}
 const stats={crit:null,specialization:null,swiftness:null};for(const k of Object.keys(stats)){const m=text.match(new RegExp(k+'\\s+(\\d+)','i'));if(m)stats[k]=Number(m[1])}
 const components={};for(const label of ['Ark Passive','Ark Grid','Engravings','Accessory Effects','Bracelet Effects','Gems']){const re=new RegExp(label.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'\\s*\\+?([0-9]+(?:\\.[0-9]+)?)%','i'),m=text.match(re);if(m)components[label]=Number(m[1])}
 return {grid,engravings:engr,arkPassive:ap,skills,stats,components,retrievedAt:new Date().toISOString()};}
async function fetchBuild(c){const r=await fetch(`${CONNECTOR}?url=${encodeURIComponent(c.url)}`,{cache:'no-store',headers:{Accept:'application/json'}});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw Error('Bible connector returned non-JSON data')}if(!r.ok||data.ok===false)throw Error(data.error||`HTTP ${r.status}`);return parse(data.html||data.characterHtml||data.content||data.page);}
async function refresh(){let state;try{state=JSON.parse(localStorage.getItem(STATE)||'null')}catch{return}if(!Array.isArray(state?.characters))return;const cache=load();for(const c of state.characters){if(!c?.url)continue;const old=cache[c.url];if(old?.grid?.length||old?.engravings?.length)continue;try{cache[c.url]=await fetchBuild(c)}catch(e){cache[c.url]={error:e.message,retrievedAt:new Date().toISOString()}}}save(cache);window.dispatchEvent(new CustomEvent('lostark-build-profiles-ready'));}
window.LostArkBuildProfiles={get:(url)=>load()[url]||null,refresh};refresh();
})();