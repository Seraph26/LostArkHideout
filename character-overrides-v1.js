/* Lost Ark Hideout — per-character spec/role overrides.
 *
 * Bible's Ark Passive read is intermittently wrong for supports: the same Bard
 * can come back correctly specced one refresh and as a DPS spec the next. When
 * that happens the honest display and the useful one disagree -- a profile
 * reading True Courage really is a DPS profile, so silently calling it a support
 * would be misleading, but treating it as DPS breaks a roster built around it.
 *
 * Neither guess is safe, so instead the answer can be pinned once per character
 * and re-applied after every refresh, overriding whatever Bible returned. A
 * character is flagged when Bible's own support/DPS marker disagrees with the
 * class default, so it is visible which ones are worth pinning.
 */
(()=>{
'use strict';
const KEY='lostark-hideout-overrides-v1',MAIN='lostark-hideout-private-v3',ADDS='lostark-hideout-new-additions-v1';
const SUPPORT_CLASSES=['Bard','Artist','Paladin','Valkyrie'];
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const all=()=>read(KEY,{})||{};
const save=o=>localStorage.setItem(KEY,JSON.stringify(o));

/* Written onto the stored profile so every consumer -- both optimizers and both
   display layers -- picks it up through the field it already reads, rather than
   each one needing to know about overrides. */
function apply(){
 const ov=all();let touched=false;
 const patch=(list)=>{let changed=false;
  for(const c of list||[]){
   if(!c?.id||!c.profile)continue;
   const o=ov[c.id];
   const spec=o?.spec?clean(o.spec):'',role=o?.role==='Support'||o?.role==='DPS'?o.role:'';
   if((c.profile.specOverride||'')!==spec){c.profile.specOverride=spec||undefined;changed=true}
   if((c.profile.roleOverride||'')!==role){c.profile.roleOverride=role||undefined;changed=true}
  }
  return changed};
 const main=read(MAIN,{characters:[]});
 if(patch(main.characters)){localStorage.setItem(MAIN,JSON.stringify(main));touched=true}
 const adds=read(ADDS,[]);
 if(Array.isArray(adds)&&patch(adds)){localStorage.setItem(ADDS,JSON.stringify(adds));touched=true}
 return touched;
}

function stored(){
 const out=new Map();
 for(const c of (read(MAIN,{characters:[]}).characters||[]))if(c?.id)out.set(String(c.id),c);
 for(const c of (read(ADDS,[])||[]))if(c?.id)out.set(String(c.id),c);
 return out;
}
function cardId(card){
 return card.getAttribute('data-candidate-id')
  ||card.querySelector('.remove-character')?.dataset.id
  ||card.querySelector('.candidate-hide')?.dataset.id
  ||card.querySelector('.candidate-remove')?.dataset.id||'';
}

function popover(id,anchor){
 document.getElementById('overridePopover')?.remove();
 const c=stored().get(String(id));if(!c)return;
 const p=c.profile||{},ov=all()[id]||{};
 const box=document.createElement('div');
 box.id='overridePopover';
 const r=anchor.getBoundingClientRect();
 box.style.cssText=`position:fixed;z-index:9999;top:${Math.round(r.bottom+6)}px;left:${Math.round(Math.min(r.left,innerWidth-266))}px;width:250px;padding:12px;border:1px solid #2f3a4d;border-radius:10px;background:#111620;color:#e8ecf5;font-size:12px;box-shadow:0 10px 30px rgba(0,0,0,.5)`;
 const bibleSpec=clean(p.spec||p.specialization||'')||'(from Ark Passive)';
 box.innerHTML=`<div style="font-weight:700;margin-bottom:6px">${clean(p.name||c.name)}</div>
  <label style="display:block;color:#8994ab;margin-bottom:3px">Specialization</label>
  <input id="ovSpec" value="${(ov.spec||'').replace(/"/g,'&quot;')}" placeholder="${bibleSpec.replace(/"/g,'&quot;')}" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid #30384b;background:#0d121b;color:#edf2fb;font:inherit">
  <label style="display:block;color:#8994ab;margin:9px 0 3px">Role</label>
  <select id="ovRole" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid #30384b;background:#0d121b;color:#edf2fb;font:inherit">
   <option value=""${ov.role?'':' selected'}>Automatic</option>
   <option value="Support"${ov.role==='Support'?' selected':''}>Support</option>
   <option value="DPS"${ov.role==='DPS'?' selected':''}>DPS</option>
  </select>
  <div style="color:#667188;margin-top:8px;line-height:1.4">Blank uses Bible. Pinned values survive Refresh Profiles.</div>
  <div style="display:flex;gap:6px;margin-top:10px">
   <button id="ovSave" type="button" style="flex:1;font:inherit;font-size:12px;padding:6px;border-radius:6px;border:1px solid #46516a;background:#6d5dfc;color:#fff;cursor:pointer">Save</button>
   <button id="ovClear" type="button" style="font:inherit;font-size:12px;padding:6px 9px;border-radius:6px;border:1px solid #46516a;background:#1a2230;color:#edf2fb;cursor:pointer">Clear</button>
  </div>`;
 document.body.appendChild(box);
 box.querySelector('#ovSpec').focus();
 const commit=(spec,role)=>{
  const o=all();
  if(spec||role)o[id]={...(spec?{spec}:{}),...(role?{role}:{})};else delete o[id];
  save(o);apply();location.reload();
 };
 box.querySelector('#ovSave').addEventListener('click',()=>commit(clean(box.querySelector('#ovSpec').value),box.querySelector('#ovRole').value));
 box.querySelector('#ovClear').addEventListener('click',()=>commit('',''));
 setTimeout(()=>document.addEventListener('pointerdown',function off(e){
  if(!box.contains(e.target)){box.remove();document.removeEventListener('pointerdown',off,true)}},true),0);
}

function decorate(){
 const map=stored(),ov=all();
 document.querySelectorAll('#roster .character,#newAdditionsRoster .candidate-character').forEach(card=>{
  const id=cardId(card);if(!id)return;
  const c=map.get(String(id));if(!c?.profile)return;
  const actions=card.querySelector('.candidate-card-actions');if(!actions)return;
  let btn=actions.querySelector('.override-btn');
  if(!btn){
   btn=document.createElement('button');btn.type='button';btn.className='override-btn';btn.title='Pin specialization or role';
   btn.textContent='Pin';
   btn.style.cssText='font:inherit;font-size:10px;padding:5px 8px;line-height:1.2;border-radius:7px;border:1px solid #46516a;background:#1a2230;color:#edf2fb;cursor:pointer;white-space:nowrap';
   btn.addEventListener('click',e=>{e.stopPropagation();popover(id,btn)});
   actions.appendChild(btn);
  }
  const pinned=!!ov[id];
  btn.style.borderColor=pinned?'#6d5dfc':'#46516a';
  btn.textContent=pinned?'Pinned':'Pin';
  /* Bible ranks against "<Class>" or "DPS <Class>"; a support class marked DPS
     means its Ark Passive currently reads as a DPS spec. */
  const conflict=!pinned&&c.profile.bibleRoleHint==='dps'&&SUPPORT_CLASSES.includes(clean(c.profile.class));
  let note=card.querySelector('.override-conflict');
  if(conflict){
   if(!note){note=document.createElement('div');note.className='override-conflict';
    note.style.cssText='margin-top:6px;font-size:10px;line-height:1.4;color:#e8b978';
    note.textContent='Bible reads this as a DPS spec. Pin the specialization or role if that is wrong.';
    card.appendChild(note)}
  }else note?.remove();
 });
}

let t=0;const schedule=()=>{clearTimeout(t);t=setTimeout(decorate,120)};
function start(){apply();decorate();
 /* The roster renders after this fires, and relying on the observer alone
    proved unreliable, so sweep a few times as the page settles. */
 [120,400,900,1800,3000].forEach(ms=>setTimeout(decorate,ms));
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 /* Refresh Profiles rewrites every stored profile, wiping the applied fields. */
 const status=document.getElementById('status');
 if(status)new MutationObserver(()=>{if(/^Refreshed /i.test(status.textContent||'')){apply();schedule()}}).observe(status,{childList:true,characterData:true,subtree:true});
}
apply();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LostArkCharacterOverrides={get:()=>all(),apply};
})();
