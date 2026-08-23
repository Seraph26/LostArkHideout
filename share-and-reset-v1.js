/* Lost Ark Party — share snapshot + clear all.
 *
 * The share button had no handler at all: copyShareLink lives in app.js, which
 * index.html does not load. This provides both the share link and a clear-all
 * reset, working directly against the current stores.
 *
 * The snapshot travels in the URL fragment, which browsers never send to a
 * server, so character data stays between the two people sharing the link.
 * Only display-relevant profile fields are included, so a recipient sees the
 * dashboard immediately without waiting on Bible, and can still Refresh
 * Profiles for the full record.
 */
(()=>{
'use strict';
const MAIN='lostark-hideout-private-v3',ADDS='lostark-hideout-new-additions-v1',
      HIDDEN='lostark-hideout-hidden-v1',PARTY='lostark-hideout-party-assignments-v2',
      MODE='lostark-hideout-optimizer-mode-v1',BASELINE='lostark-hideout-general-baseline-v1',
      BUILDS='lostark-hideout-build-profiles-v3';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const status=m=>{const e=document.getElementById('status');if(e)e.textContent=m};

/* Keep the link short. Everything here is either rendered or read by scoring;
   anything reconstructable is left out and rebuilt on import.
   - url is dropped and rebuilt from region + name (a fixed prefix per character)
   - only Shurdi's tripods are kept; that one skill is all any scoring reads
   - the resolved specialization replaces the Ark Passive node list it came from
   - loadout duplicates cpSource, and retrievedAt would make the recipient's own
     Refresh Profiles skip everything as already fresh */
const BIBLE_PREFIX='https://lostark.bible/character/';
const SHURDI_ID='20160';
/* Full rosters push the #s= link past 2,000 characters, which Discord's message
   limit will not accept, so it could not be pasted there. The worker now stores
   the encoded snapshot for 30 days under a short id (#id=<10 chars>) as the one
   exception to "nothing ever reaches a server" -- see the comment on the worker
   itself. If that store call fails for any reason (offline, old worker not yet
   redeployed, KV outage) copyShare() falls back to the original long link, so
   sharing still works, just not shortened. */
const SHARE_ENDPOINT='https://lostark-bible-connector.seraph0226.workers.dev/share';
/* The spec as actually displayed, so the node list it was derived from can go. */
function shownSpec(c){
 const url=c?.url||'';
 for(const card of document.querySelectorAll('#roster .character,#newAdditionsRoster .candidate-character')){
  const a=card.querySelector('a[href*="lostark.bible/character/"]');
  if(!a||a.getAttribute('href')!==url)continue;
  const s=(card.querySelector('.class')?.textContent||'').trim();
  if(s&&s!=='—')return s;
 }
 return '';
}
function trimProfile(p,c){
 if(!p||typeof p!=='object')return null;
 const out={};
 for(const k of ['name','class','role','cp','ilvl','cpSource','positional','allyEffects'])
  if(p[k]!==undefined)out[k]=p[k];
 /* Carry the Ark Passive nodes, not a resolved specialization string. Freezing
    the string looked like a saving, but the spec rules read the nodes first and
    only fall back to the string -- so a shared or restored dashboard kept
    showing whatever the spec was when the link was made, even after a respec,
    until a full re-import replaced the profile. */
 if(p.enlightenment)out.enlightenment=p.enlightenment;
 else{const spec=String(p.spec||p.specialization||shownSpec(c)||'').trim();if(spec)out.specialization=spec}
 const shurdi=p.skillTripods&&(p.skillTripods[SHURDI_ID]||p.skillTripods[Number(SHURDI_ID)]);
 if(Array.isArray(shurdi))out.skillTripods={[SHURDI_ID]:shurdi};
 return out;
}
function trimChar(c){
 if(!c||!c.id)return null;
 const out={id:c.id,region:c.region,name:c.name,profile:trimProfile(c.profile,c)};
 /* Only carry the URL when it is not the standard region/name form. */
 const rebuilt=BIBLE_PREFIX+encodeURIComponent(c.region||'NA')+'/'+encodeURIComponent(c.name||'');
 if(c.url&&c.url!==rebuilt)out.url=c.url;
 return out;
}
const restoreChar=c=>c&&c.id?{...c,url:c.url||BIBLE_PREFIX+encodeURIComponent(c.region||'NA')+'/'+encodeURIComponent(c.name||'')}:null;

function snapshot(){
 return{v:1,
  main:(read(MAIN,{characters:[]}).characters||[]).map(trimChar).filter(Boolean),
  adds:(read(ADDS,[])||[]).map(trimChar).filter(Boolean),
  hidden:read(HIDDEN,[])||[],
  party:read(PARTY,null),
  mode:read(MODE,null)};
}

const b64url=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function unb64url(s){const t=s.replace(/-/g,'+').replace(/_/g,'/');const bin=atob(t+'='.repeat((4-t.length%4)%4));const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}

async function encode(obj){
 const bytes=new TextEncoder().encode(JSON.stringify(obj));
 if(typeof CompressionStream==='function'){
  try{const buf=await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
   return 'g'+b64url(new Uint8Array(buf))}catch{}
 }
 return 'p'+b64url(bytes);
}
async function decode(str){
 const tag=str[0],data=unb64url(str.slice(1));
 if(tag==='g'){const buf=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return JSON.parse(new TextDecoder().decode(buf))}
 return JSON.parse(new TextDecoder().decode(data));
}

/* Ask the worker to store the encoded snapshot and hand back a short id.
   Returns null on any failure so the caller can fall back to the long link. */
async function shorten(encoded){
 try{
  const res=await fetch(SHARE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({s:encoded})});
  if(!res.ok)return null;
  const data=await res.json();
  return data?.ok&&data.id?data.id:null;
 }catch{return null}
}

async function copyShare(){
 const snap=snapshot();
 if(!snap.main.length&&!snap.adds.length)return status('Nothing to share yet. Add characters first.');
 let encoded;
 try{encoded=await encode(snap)}
 catch(e){return status('Could not build the share link.')}
 const longLink=`${location.origin}${location.pathname}#s=${encoded}`;
 const chars=snap.main.length+snap.adds.length;
 let link=longLink,shortened=false;
 const id=await shorten(encoded);
 if(id){link=`${location.origin}${location.pathname}#id=${id}`;shortened=true}
 const sizeNote=shortened?'expires in 30 days':`${Math.round(longLink.length/1024)}KB`;
 try{await navigator.clipboard.writeText(link);status(`Share link copied — ${chars} character${chars===1?'':'s'}, ${sizeNote}.`)}
 catch{
  /* Clipboard can be blocked; show the link so it can be copied by hand. */
  const box=document.createElement('textarea');
  box.value=link;box.readOnly=true;
  box.style.cssText='position:fixed;left:50%;top:20%;transform:translateX(-50%);z-index:99999;width:min(90vw,720px);height:110px;padding:10px;border-radius:8px;border:1px solid #46516a;background:#111620;color:#edf2fb;font:12px monospace';
  const close=()=>box.remove();
  box.addEventListener('blur',close,{once:true});
  document.body.appendChild(box);box.focus();box.select();
  status('Copy the highlighted link.');
 }
}

/* Saved dashboard state. Deliberately not touched by Clear All, so the button
   pair works as save-then-wipe-then-restore. */
const SAVESTATE='lostark-hideout-savestate-v1';
function saveState(){
 const snap=snapshot(),total=snap.main.length+snap.adds.length;
 if(!total)return status('Nothing to save yet. Add characters first.');
 localStorage.setItem(SAVESTATE,JSON.stringify({saved:Date.now(),snap}));
 renderSaveState();
 status(`Dashboard saved — ${snap.main.length} Main Group, ${snap.adds.length} New Addition${snap.adds.length===1?'':'s'}.`);
}
function restoreState(){
 const rec=read(SAVESTATE,null);
 if(!rec?.snap)return status('No saved dashboard to restore.');
 const snap=rec.snap,total=snap.main.length+snap.adds.length;
 const existing=(read(MAIN,{characters:[]}).characters||[]).length+(read(ADDS,[])||[]).length;
 if(existing&&!confirm(`Restore the saved dashboard (${total} characters)?\n\nThis replaces the ${existing} currently loaded.`))return;
 localStorage.setItem(MAIN,JSON.stringify({characters:(snap.main||[]).map(restoreChar).filter(Boolean)}));
 localStorage.setItem(ADDS,JSON.stringify((snap.adds||[]).map(restoreChar).filter(Boolean)));
 localStorage.setItem(HIDDEN,JSON.stringify(snap.hidden||[]));
 if(snap.party)localStorage.setItem(PARTY,JSON.stringify(snap.party));else localStorage.removeItem(PARTY);
 if(snap.mode)localStorage.setItem(MODE,JSON.stringify(snap.mode));else localStorage.removeItem(MODE);
 localStorage.removeItem(BASELINE);
 location.reload();
}
function discardState(){
 if(!read(SAVESTATE,null))return;
 if(!confirm('Delete the saved dashboard state?'))return;
 localStorage.removeItem(SAVESTATE);renderSaveState();status('Saved dashboard deleted.');
}
function renderSaveState(){
 const host=document.querySelector('.topbar');if(!host)return;
 let panel=document.getElementById('savestatePanel');
 const rec=read(SAVESTATE,null);
 if(!rec?.snap){panel?.remove();return}
 if(!panel){
  panel=document.createElement('div');panel.id='savestatePanel';
  panel.style.cssText='position:fixed;right:14px;top:96px;z-index:40;width:190px;padding:11px 12px;border:1px solid #2f3a4d;border-radius:10px;background:#111620ee;color:#e8ecf5;font-size:11px;line-height:1.45;box-shadow:0 8px 24px rgba(0,0,0,.35)';
  document.body.appendChild(panel);
 }
 const s=rec.snap,when=new Date(rec.saved);
 panel.innerHTML=`<div style="font-weight:700;margin-bottom:3px">Saved dashboard</div>
 <div style="color:#8994ab">${s.main.length} Main Group · ${s.adds.length} New Addition${s.adds.length===1?'':'s'}</div>
 <div style="color:#667188;margin-bottom:8px">${when.toLocaleDateString()} ${when.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
 <div style="display:flex;gap:6px"><button type="button" id="savestateRestore" style="flex:1;font:inherit;font-size:11px;padding:5px 7px;border-radius:6px;border:1px solid #46516a;background:#6d5dfc;color:#fff;cursor:pointer">Restore</button>
 <button type="button" id="savestateDiscard" title="Delete saved state" style="font:inherit;font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid #4a3340;background:#20151c;color:#efb0bb;cursor:pointer">✕</button></div>`;
 panel.querySelector('#savestateRestore').addEventListener('click',restoreState);
 panel.querySelector('#savestateDiscard').addEventListener('click',discardState);
}

function clearAll(){
 const snap=snapshot(),total=snap.main.length+snap.adds.length;
 if(!total)return status('Nothing to clear.');
 if(!confirm(`Remove all ${total} character${total===1?'':'s'} (${snap.main.length} Main Group, ${snap.adds.length} New Addition${snap.adds.length===1?'':'s'}) and reset the optimizer?\n\nThis cannot be undone.`))return;
 localStorage.setItem(MAIN,JSON.stringify({characters:[]}));
 localStorage.setItem(ADDS,JSON.stringify([]));
 localStorage.setItem(HIDDEN,JSON.stringify([]));
 for(const k of [PARTY,BASELINE,MODE,BUILDS])localStorage.removeItem(k);
 location.reload();
}

/* Import runs before the rest of the app reads storage, then reloads cleanly so
   every module picks the data up through its normal path. */
/* A #id= link never carried the snapshot itself -- only the lookup key -- so it
   has to be fetched from the worker before it can be decoded. Old #s= links
   still work unchanged; this is purely additive. */
async function resolveHash(){
 const h=location.hash||'';
 const direct=h.match(/^#s=(.+)$/);
 if(direct)return direct[1];
 const idm=h.match(/^#id=([0-9a-zA-Z]{4,32})$/);
 if(!idm)return null;
 const res=await fetch(`${SHARE_ENDPOINT}/${idm[1]}`);
 const data=await res.json().catch(()=>null);
 if(!data?.ok)throw new Error(data?.error||'Share link not found.');
 return data.s;
}
async function importFromHash(){
 const h=location.hash||'';
 if(!/^#(s|id)=/.test(h))return;
 let encoded;
 try{encoded=await resolveHash()}
 catch(e){history.replaceState(null,'',location.pathname);return status(String(e?.message||'That share link could not be read.'))}
 if(!encoded)return;
 let snap;
 try{snap=await decode(encoded)}catch{history.replaceState(null,'',location.pathname);return status('That share link could not be read.')}
 if(!snap||snap.v!==1)return status('That share link is from a different version.');
 const existing=(read(MAIN,{characters:[]}).characters||[]).length+(read(ADDS,[])||[]).length;
 if(existing&&!confirm(`This link contains ${snap.main.length+snap.adds.length} characters.\n\nLoading it will replace the ${existing} already on this dashboard. Continue?`)){
  history.replaceState(null,'',location.pathname);return;
 }
 localStorage.setItem(MAIN,JSON.stringify({characters:(snap.main||[]).map(restoreChar).filter(Boolean)}));
 localStorage.setItem(ADDS,JSON.stringify((snap.adds||[]).map(restoreChar).filter(Boolean)));
 localStorage.setItem(HIDDEN,JSON.stringify(snap.hidden||[]));
 if(snap.party)localStorage.setItem(PARTY,JSON.stringify(snap.party));else localStorage.removeItem(PARTY);
 if(snap.mode)localStorage.setItem(MODE,JSON.stringify(snap.mode));else localStorage.removeItem(MODE);
 localStorage.removeItem(BASELINE);
 sessionStorage.setItem('lostark-shared-import','1');
 history.replaceState(null,'',location.pathname);
 location.reload();
}

function addButtons(){
 const actions=document.querySelector('.topbar .actions');
 if(!actions)return;
 const share=document.getElementById('shareBtn');
 const add=(id,label,css,fn)=>{
  if(document.getElementById(id))return;
  const b=document.createElement('button');
  b.id=id;b.type='button';b.textContent=label;b.style.cssText=css;
  b.addEventListener('click',fn);
  if(share)actions.insertBefore(b,share);else actions.appendChild(b);
 };
 add('saveStateBtn','Save Dashboard','border:1px solid #46516a;background:#1a2230;color:#edf2fb',saveState);
 add('clearAllBtn','Clear All','border:1px solid #4a3340;background:#20151c;color:#efb0bb',clearAll);
}

/* Dragging between parties is not discoverable. Show a one-line hint whenever two
   parties are on screen, and never for single-party 4-player content where there
   is nowhere to drag to. */
function renderDragHint(){
 const host=document.getElementById('suggestedParties');if(!host)return;
 /* Both parties must actually hold characters -- an empty dashboard still
    renders two dropzones, and there is nothing to drag there. */
 const zones=[...host.querySelectorAll('.authoritative-dropzone,.encounter-optimized-party .slots')];
 const twoParties=zones.length===2&&zones.every(z=>z.querySelectorAll('[data-character-id]').length>0);
 let hint=document.getElementById('partyDragHint');
 if(!twoParties){hint?.remove();return}
 if(!hint){
  hint=document.createElement('p');hint.id='partyDragHint';
  hint.style.cssText='margin:4px 0 0;color:#8994ab;font-size:12px';
  hint.textContent='Tip: drag a character from one party to another to see the impact. Optimize Parties returns to the best arrangement.';
  document.getElementById('optimizerModeLabel')?.insertAdjacentElement('afterend',hint);
 }
}

function start(){
 addButtons();
 renderSaveState();
 renderDragHint();
 /* Party layout changes on optimize, on a manual swap and on mode change. */
 const host=document.getElementById('suggestedParties');
 if(host){let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(renderDragHint,120)}).observe(host,{childList:true})}
 const share=document.getElementById('shareBtn');
 if(share&&!share.dataset.shareWired){share.dataset.shareWired='1';share.addEventListener('click',copyShare)}
 if(sessionStorage.getItem('lostark-shared-import')){sessionStorage.removeItem('lostark-shared-import');setTimeout(()=>status('Shared dashboard loaded. Refresh Profiles for the latest Bible data.'),800)}
}
importFromHash();
/* Pasting a share link into a tab already on the dashboard only changes the
   fragment, which does not reload, so import on hashchange as well. */
window.addEventListener('hashchange',importFromHash);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
