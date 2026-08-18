/* Retries transient Bible connector failures and exposes exact refresh failures for diagnostics. */
(()=>{
'use strict';
if(window.__BIBLE_FETCH_RETRY_V1__)return;
window.__BIBLE_FETCH_RETRY_V1__=true;
const originalFetch=window.fetch.bind(window);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const failures=[];
window.__BIBLE_REFRESH_FAILURES__=failures;
const characterName=url=>{try{const raw=decodeURIComponent(new URL(url).searchParams.get('url')||'');return raw.split('/').filter(Boolean).pop()||'Unknown'}catch{return'Unknown'}};
window.fetch=async function(input,init){
 const url=typeof input==='string'?input:(input?.url||'');
 if(!url.includes('lostark-bible-connector.seraph0226.workers.dev/character'))return originalFetch(input,init);
 let lastError=null,lastStatus=0,lastBody='';
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await originalFetch(input,init);
   if(response.ok)return response;
   lastStatus=response.status;
   try{lastBody=(await response.clone().text()).replace(/\s+/g,' ').slice(0,220)}catch{}
   const retryable=response.status===408||response.status===425||response.status===429||response.status>=500;
   if(!retryable){failures.push({name:characterName(url),status:response.status,body:lastBody});return response}
   lastError=new Error(`Bible connector HTTP ${response.status}`);
  }catch(e){lastError=e;lastStatus=0;lastBody=String(e?.message||e)}
  if(attempt<2)await sleep(700*(attempt+1));
 }
 const item={name:characterName(url),status:lastStatus,body:lastBody||lastError?.message||'network error'};
 failures.push(item);
 throw lastError||new Error('Bible connector request failed after retries.');
};
const installDiagnostics=()=>{const status=document.querySelector('#status');if(!status)return;let previous='';new MutationObserver(()=>{const text=status.textContent||'';if(text!==previous){previous=text;if(/^Refreshing character profiles/i.test(text))failures.length=0;if(/^Refreshed /i.test(text)&&failures.length){const detail=failures.map(x=>`${x.name}: ${x.status?`HTTP ${x.status}`:'network error'}${x.body?` — ${x.body}`:''}`).join(' | ');status.textContent=`${text} ${detail}`}}}).observe(status,{childList:true,subtree:true,characterData:true})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installDiagnostics,{once:true});else installDiagnostics();
})();
