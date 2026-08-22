/* Retries transient Bible connector failures and exposes exact refresh failures for diagnostics. */
(()=>{
'use strict';
if(window.__BIBLE_FETCH_RETRY_V2__)return;
window.__BIBLE_FETCH_RETRY_V2__=true;
const originalFetch=window.fetch.bind(window);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const failures=[];
window.__BIBLE_REFRESH_FAILURES__=failures;
const characterName=url=>{try{const raw=decodeURIComponent(new URL(url).searchParams.get('url')||'');return raw.split('/').filter(Boolean).pop()||'Unknown'}catch{return'Unknown'}};
/* Bible rate-limits a burst of requests; the connector surfaces that as a 502
   whose body reports "Bible returned HTTP 429". Refreshing the roster fires one
   request per character back-to-back, which reliably trips it, so connector
   calls are serialised with a minimum gap and rate-limit retries back off far
   harder than ordinary transient ones. */
const rateLimited=(status,body)=>status===429||/\b429\b/.test(String(body||''));
const MIN_GAP=650;
let chain=Promise.resolve(),lastAt=0;
function paced(run){const next=chain.then(async()=>{const wait=MIN_GAP-(Date.now()-lastAt);if(wait>0)await sleep(wait);try{return await run()}finally{lastAt=Date.now()}});chain=next.then(()=>{},()=>{});return next}
window.fetch=function(input,init){
 const url=typeof input==='string'?input:(input?.url||'');
 if(!url.includes('lostark-bible-connector.seraph0226.workers.dev/character'))return originalFetch(input,init);
 return paced(async()=>{
  let lastError=null,lastStatus=0,lastBody='';
  for(let attempt=0;attempt<4;attempt++){
   try{
    const response=await originalFetch(input,init);
    if(response.ok)return response;
    lastStatus=response.status;
    try{lastBody=(await response.clone().text()).replace(/\s+/g,' ').slice(0,220)}catch{}
    const retryable=response.status===408||response.status===425||response.status===429||response.status>=500;
    if(!retryable){failures.push({name:characterName(url),status:response.status,body:lastBody});return response}
    lastError=new Error(`Bible connector HTTP ${response.status}`);
   }catch(e){lastError=e;lastStatus=0;lastBody=String(e?.message||e)}
   if(attempt<3)await sleep((rateLimited(lastStatus,lastBody)?2500:700)*(attempt+1));
  }
  failures.push({name:characterName(url),status:lastStatus,body:lastBody||lastError?.message||'network error'});
  throw lastError||new Error('Bible connector request failed after retries.');
 });
};
const installDiagnostics=()=>{const status=document.querySelector('#status');if(!status)return;let previous='';let reported=false;new MutationObserver(()=>{const text=status.textContent||'';if(text===previous)return;previous=text;if(/^Refreshing character profiles/i.test(text)){failures.length=0;reported=false;return}if(/^Refreshed /i.test(text)&&failures.length&&!reported){reported=true;console.warn('Bible refresh failures',failures.slice());status.textContent=`${text} ${summarize(failures)}`}}).observe(status,{childList:true,subtree:true,characterData:true})};
/* Readable summary. The raw connector body is JSON and belongs in the console,
   not in the status bar. */
function summarize(fails){
 const names=x=>x.length>1?`${x.slice(0,-1).join(', ')} and ${x[x.length-1]}`:x[0];
 const limited=fails.filter(f=>rateLimited(f.status,f.body)).map(f=>f.name);
 const other=fails.filter(f=>!rateLimited(f.status,f.body));
 const bits=[];
 if(limited.length)bits.push(`${names(limited)} ${limited.length>1?'were':'was'} rate-limited by Bible — wait a moment, then Refresh Profiles again. Existing data was kept.`);
 for(const f of other)bits.push(`${f.name}: ${f.status?`HTTP ${f.status}`:'network error'}.`);
 bits.push('Details in the browser console.');
 return bits.join(' ');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installDiagnostics,{once:true});else installDiagnostics();
})();
