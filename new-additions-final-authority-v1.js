/* Final New Additions authority guard. Keeps class/spec resolution data-driven. */
(()=>{
  'use strict';
  const NEW_KEY='lostark-hideout-new-additions-v1';
  const CONNECTOR='https://lostark-bible-connector.seraph0226.workers.dev/character';

  const read=()=>{try{return JSON.parse(localStorage.getItem(NEW_KEY)||'[]')}catch{return[]}};
  const write=v=>{try{localStorage.setItem(NEW_KEY,JSON.stringify(v))}catch{}};
  const cls=c=>String(c?.profile?.class||c?.profile?.className||'').trim();
  const norm=v=>String(v??'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ');

  function profileText(c){
    try{
      const p=c?.profile||{};
      return norm(JSON.stringify(p));
    }catch{return ''}
  }

  function findValkIcon(value, key=''){
    const keyText=norm(key);
    if(value==null)return '';
    if(typeof value==='string'){
      const s=value.trim();
      if(!/^https?:\/\//i.test(s))return '';
      if(!/\.(png|jpe?g|webp|svg)(\?|#|$)/i.test(s))return '';
      if(/valkyrie|class.?icon|icon/i.test(keyText))return s;
      return '';
    }
    if(Array.isArray(value)){
      for(const x of value){const hit=findValkIcon(x,key);if(hit)return hit}
      return '';
    }
    if(typeof value==='object'){
      const local=norm(JSON.stringify(value));
      const likely=/valkyrie/.test(local)&&/(icon|image|avatar|class)/.test(local);
      for(const [k,v] of Object.entries(value)){
        const hit=findValkIcon(v,likely?`${key} ${k} valkyrie`:k);
        if(hit)return hit;
      }
    }
    return '';
  }

  function findValkIconInHtml(html){
    try{
      const d=new DOMParser().parseFromString(String(html||''),'text/html');
      for(const el of d.querySelectorAll('*')){
        const meta=[el.getAttribute?.('alt'),el.getAttribute?.('title'),el.getAttribute?.('aria-label'),el.getAttribute?.('class'),el.getAttribute?.('data-class'),el.getAttribute?.('data-character-class')].filter(Boolean).join(' ');
        if(!/valkyrie/i.test(meta))continue;
        const src=el.getAttribute?.('src')||el.getAttribute?.('data-src')||el.getAttribute?.('href');
        if(src&&/^https?:\/\//i.test(src))return src;
        const style=el.getAttribute?.('style')||'';
        const m=style.match(/url\((['"]?)(https?:[^'"\)]+)\1\)/i);
        if(m)return m[2];
      }
    }catch{}
    return '';
  }

  async function payload(url){
    try{
      const r=await fetch(`${CONNECTOR}?url=${encodeURIComponent(url)}`,{cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)return null;
      return await r.json();
    }catch{return null}
  }

  async function repair(){
    const list=read();
    if(!Array.isArray(list)||!list.length)return;
    let changed=false;
    for(const c of list){
      if(!c?.profile)continue;
      const p=c.profile;
      const text=profileText(c);
      if(cls(c)==='Arcanist' && /order of the emperor/.test(text)){
        if(p.spec!=="Emperor's Decree"){p.spec="Emperor's Decree";changed=true}
      }
      if(cls(c)==='Valkyrie'){
        const data=await payload(c.url);
        const html=data?.html||data?.characterHtml||data?.content||data?.page||'';
        const icon=findValkIcon(data)||findValkIconInHtml(html)||p.classIcon||'';
        if(icon&&p.classIcon!==icon){p.classIcon=icon;changed=true}
        const card=document.querySelector(`.new-addition-card[data-candidate-id="${CSS.escape(String(c.id))}"]`);
        const img=card?.querySelector('img.class-icon');
        if(img&&icon&&img.src!==icon){img.src=icon;img.alt='Valkyrie'}
      }
    }
    if(changed)write(list);
    for(const c of list){
      const card=document.querySelector(`.new-addition-card[data-candidate-id="${CSS.escape(String(c.id))}"]`);
      if(!card)continue;
      const spec=card.querySelector('.class');
      if(spec&&c.profile?.spec)spec.textContent=c.profile.spec;
      if(cls(c)==='Valkyrie'&&c.profile?.classIcon){
        const img=card.querySelector('img.class-icon');
        if(img){img.src=c.profile.classIcon;img.alt='Valkyrie'}
      }
    }
  }

  const run=()=>setTimeout(()=>{repair().catch(()=>{})},50);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
