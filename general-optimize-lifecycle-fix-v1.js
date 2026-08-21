/* Lost Ark Hideout — General Optimization button lifecycle guard
 * UI-only safety net. It never changes scoring, party assignments, metrics,
 * or character hover markup. It only releases a stale busy/disabled state
 * after the General Optimization render has completed.
 */
(()=>{
'use strict';
function general(){return !!document.getElementById('generalOptimization')?.checked&&!(document.getElementById('raidSpecificSelect')?.value||'')}
function button(){return document.getElementById('optimizeBtn')}
function root(){return document.getElementById('suggestedParties')}
function release(){const b=button();if(!b)return;b.removeAttribute('aria-busy');b.removeAttribute('disabled');b.classList.remove('is-busy','loading','active');}
function install(){
 const b=button();if(!b||b.dataset.generalLifecycleGuard==='1')return;
 b.dataset.generalLifecycleGuard='1';
 b.addEventListener('click',()=>{
   if(!general())return;
   const r=root(),before=r?.innerHTML||'';
   let done=false,started=performance.now();
   const finish=()=>{if(done)return;done=true;release()};
   const poll=()=>{
     if(done)return;
     const now=performance.now(),current=root()?.innerHTML||'';
     if(current!==before){setTimeout(finish,120);return;}
     if(now-started>=5000){finish();return;}
     setTimeout(poll,100);
   };
   setTimeout(poll,100);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
