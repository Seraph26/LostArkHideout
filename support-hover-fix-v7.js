/* Lost Ark Hideout — raid-specific support hover data bridge v9 */
(()=>{
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const SUPPORTS=new Set(['Bard','Artist','Paladin','Valkyrie']);
function classFor(member){
 const explicit=clean(member.querySelector('.class-icon')?.alt||member.dataset.class||member.querySelector('[data-class]')?.dataset.class||'');
 return SUPPORTS.has(explicit)?explicit:'';
}
function partyMembersFor(member){
 let node=member.parentElement;
 let best=null;
 while(node&&node!==document.body){
  const members=[...node.children].filter(x=>x.classList?.contains('party-member'));
  if(members.includes(member)&&members.length>=2&&members.length<=4)best=members;
  node=node.parentElement;
 }
 if(best)return best;
 return [...document.querySelectorAll('#suggestedParties .party-member')].filter(x=>x.closest('[data-party]')===member.closest('[data-party]'));
}
function supportLines(member){
 const supportName=clean(member.querySelector('.chb-head strong')?.textContent);
 if(!supportName)return[];
 const party=partyMembersFor(member),out=[];
 for(const target of party){
  if(target===member)continue;
  const role=clean(target.querySelector('.party-role-label')?.textContent).toLowerCase();
  if(role!=='dps')continue;
  const targetName=clean(target.querySelector('.chb-head strong')?.textContent);
  if(!targetName)continue;
  const rows=[...target.querySelectorAll('.chb-synergy')];
  const row=rows.find(r=>new RegExp(`^Support Amplification\\s+from\\s+${supportName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*:`,'i').test(clean(r.textContent)));
  if(!row)continue;
  const text=clean(row.textContent).replace(new RegExp(`^Support Amplification\\s+from\\s+${supportName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*:`,'i'),`Support Amplification to ${targetName}:`);
  out.push({text,title:row.title||'Estimated contribution from the party support. This is a model contribution, not a direct in-game damage percentage.'});
 }
 return out;
}
function renderCard(member){
 const role=clean(member.querySelector('.party-role-label')?.textContent).toLowerCase();
 if(role!=='support')return;
 const card=member.querySelector('.character-hover-breakdown');
 if(!card)return;
 const supportName=clean(card.querySelector('.chb-head strong')?.textContent);
 if(!supportName)return;
 const lines=supportLines(member);
 const stats=card.querySelector('.chb-stats');
 const head=card.querySelector('.chb-head');
 if(!stats||!head)return;
 card.classList.add('chb-general-detailed','chb-raid-support-detailed');
 card.dataset.raidSupportAuthority='1';
 card.dataset.raidSupportContributionView='1';
 [...stats.querySelectorAll('.chb-raid-support-encounter,.chb-raid-support-effect')].forEach(x=>x.remove());
 const oldDetails=[...card.querySelectorAll('.chb-detail')];
 oldDetails.forEach(x=>x.remove());
 const detail=document.createElement('div');
 detail.className='chb-detail chb-raid-support-contributions';
 if(lines.length){
  lines.forEach(({text,title})=>{
   const row=document.createElement('div');
   row.className='chb-synergy';
   row.textContent=text;
   row.title=title;
   row.style.display='block';
   row.style.margin='2px 0';
   detail.appendChild(row);
  });
 }else{
  const row=document.createElement('div');
  row.textContent='No direct party effects detected.';
  detail.appendChild(row);
 }
 card.appendChild(detail);
}
function css(){
 let s=document.getElementById('raid-support-hover-v9-style');
 if(!s){s=document.createElement('style');s.id='raid-support-hover-v9-style';document.head.appendChild(s)}
 s.textContent='.chb-raid-support-contributions .chb-synergy{display:block!important;margin:2px 0}.chb-raid-support-contributions .chb-synergy[title]{cursor:help;border-bottom:1px dotted rgba(255,255,255,.45);width:max-content;max-width:100%}';
}
function render(){document.querySelectorAll('#suggestedParties .party-member').forEach(renderCard)}
function start(){
 css();
 render();
 const root=document.getElementById('suggestedParties')||document.body;let timer;
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,40)};
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
 [0,100,300,600,1200,2500,5000].forEach(ms=>setTimeout(render,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
