(()=>{
  const btn=document.getElementById('refreshBtn');
  if(!btn)return;
  const KEY='lostark-hideout-private-v3';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const isRateLimit=e=>/429|too many requests|rate.?limit/i.test(String(e?.message||e));
  function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');return s&&Array.isArray(s.characters)?s:null}catch{return null}}
  async function safeRefresh(){
    const state=load();
    if(!state||!state.characters.length)return;
    if(btn.dataset.refreshing==='1')return;
    btn.dataset.refreshing='1';btn.disabled=true;btn.textContent='Refreshing...';
    let ok=0,failed=0,rateLimited=false;const errors=[];
    try{
      for(let i=0;i<state.characters.length;i++){
        const c=state.characters[i];
        if(rateLimited)break;
        try{
          if(typeof window.fetchCharacter!=='function')throw new Error('Profile loader unavailable.');
          c.profile=await window.fetchCharacter(c);delete c.profileError;ok++;
        }catch(e){
          const msg=String(e?.message||e);c.profileError=msg;failed++;errors.push(`${c.name}: ${msg}`);
          if(isRateLimit(e))rateLimited=true;
          if(!rateLimited&&i<state.characters.length-1)await sleep(1200);
        }
      }
      localStorage.setItem(KEY,JSON.stringify(state));
      const remaining=state.characters.length-ok-failed;
      if(rateLimited){
        const first=errors.find(x=>/429|too many requests|rate.?limit/i.test(x))||'Bible rate limit reached.';
        document.getElementById('status').textContent=`Refreshed ${ok}; ${failed} failed. Bible rate limit reached; ${remaining} remaining profile${remaining===1?'':'s'} not requested. ${first}`;
      }else if(failed){
        document.getElementById('status').textContent=`Refreshed ${ok}; ${failed} failed. ${errors.join(' | ')}`;
      }else{
        document.getElementById('status').textContent=`Refreshed ${ok} profile${ok===1?'':'s'} from Bible.`;
      }
      setTimeout(()=>location.reload(),250);
    }finally{
      btn.dataset.refreshing='';btn.disabled=false;btn.textContent='Refresh Profiles';
    }
  }
  btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();safeRefresh();},true);
})();
