(()=>{
  const btn=document.getElementById('refreshBtn');
  if(!btn)return;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const isRateLimit=e=>/429|too many requests|rate.?limit/i.test(String(e?.message||e));
  async function safeRefresh(){
    if(!window.state||!Array.isArray(window.state.characters)||!window.state.characters.length){
      if(typeof window.setStatus==='function')window.setStatus('Add at least one character first.');
      return;
    }
    if(btn.dataset.refreshing==='1')return;
    btn.dataset.refreshing='1';btn.disabled=true;btn.textContent='Refreshing...';
    let ok=0,failed=0,rateLimited=false;const errors=[];
    try{
      for(let i=0;i<window.state.characters.length;i++){
        const c=window.state.characters[i];
        if(rateLimited){break;}
        try{
          if(typeof window.fetchCharacter!=='function')throw new Error('Profile loader unavailable.');
          c.profile=await window.fetchCharacter(c);delete c.profileError;ok++;
        }catch(e){
          const msg=String(e?.message||e);
          c.profileError=msg;failed++;errors.push(`${c.name}: ${msg}`);
          if(isRateLimit(e))rateLimited=true;
          if(!rateLimited&&i<window.state.characters.length-1)await sleep(1200);
        }
      }
      if(typeof window.saveState==='function')window.saveState();
      if(typeof window.render==='function')window.render();
      const remaining=window.state.characters.length-ok-failed;
      if(rateLimited){
        const first=errors.find(x=>/429|too many requests|rate.?limit/i.test(x))||errors[errors.length-1]||'Bible rate limit reached.';
        window.setStatus(`Refreshed ${ok}; ${failed} failed. Bible rate limit reached; ${remaining} remaining profile${remaining===1?'':'s'} not requested. ${first}`);
      }else if(failed){
        window.setStatus(`Refreshed ${ok}; ${failed} failed. ${errors.join(' | ')}`);
      }else{
        window.setStatus(`Refreshed ${ok} profile${ok===1?'':'s'} from Bible.`);
      }
    }finally{
      btn.dataset.refreshing='';btn.disabled=false;btn.textContent='Refresh Profiles';
    }
  }
  btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();safeRefresh();},true);
})();
