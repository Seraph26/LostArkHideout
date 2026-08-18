/* Retries transient Bible connector failures without changing the profile parser. */
(()=>{
'use strict';
const originalFetch=window.fetch.bind(window);
if(window.__BIBLE_FETCH_RETRY_V1__)return;
window.__BIBLE_FETCH_RETRY_V1__=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
window.fetch=async function(input,init){
 const url=typeof input==='string'?input:(input?.url||'');
 if(!url.includes('lostark-bible-connector.seraph0226.workers.dev/character'))return originalFetch(input,init);
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await originalFetch(input,init);
   if(response.ok)return response;
   const retryable=response.status===408||response.status===425||response.status===429||response.status>=500;
   if(!retryable)return response;
   lastError=new Error(`Bible connector HTTP ${response.status}`);
  }catch(e){lastError=e}
  if(attempt<2)await sleep(700*(attempt+1));
 }
 throw lastError||new Error('Bible connector request failed after retries.');
};
})();
