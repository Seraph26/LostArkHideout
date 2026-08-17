const STORAGE_KEY = 'lostark-hideout-private-v3';
const LEGACY_KEY = 'lostark-hideout-private-v2';
const REMOVE_CONFIRM_KEY = 'lostark-hideout-skip-remove-confirm-v1';
const MAX_CHARACTERS = 8;
const BIBLE_CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev/character';

const CLASS_NAMES = ['Berserker','Destroyer','Gunlancer','Paladin','Slayer','Warrior','Arcanist','Arcana','Summoner','Sorceress','Bard','Gunslinger','Deadeye','Sharpshooter','Artillerist','Machinist','Striker','Wardancer','Scrapper','Soulfist','Glavier','Deathblade','Shadowhunter','Reaper','Artist','Aeromancer','Breaker','Valkyrie'];

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatNumber(value) {
  return value == null || value === '' ? '—' : Number(value).toLocaleString(undefined, {maximumFractionDigits: 2});
}

function setStatus(message) {
  const el = $('#status');
  if (el) el.textContent = message;
}

function loadState() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (current && Array.isArray(current.characters)) return current;
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (legacy && Array.isArray(legacy.characters)) return legacy;
  } catch {}
  return { characters: [], testCharacter: null };
}

const state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseBibleUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'lostark.bible') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 3 || parts[0].toLowerCase() !== 'character') return null;
    return {
      url: url.href,
      region: parts[1],
      name: decodeURIComponent(parts.slice(2).join('/'))
    };
  } catch {
    return null;
  }
}

function makeDocument(html) {
  if (typeof html !== 'string' || !html.trim()) throw new Error('Bible returned an empty character page.');
  return new DOMParser().parseFromString(html, 'text/html');
}

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getLines(doc) {
  return (doc.body?.textContent || '').split(/\n+/).map(normalizedText).filter(Boolean);
}

function numberFrom(value) {
  if (value == null) return null;
  const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function findItemLevel(doc, lines) {
  for (let i = 0; i < lines.length; i++) {
    if (/^Item Level$/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        const n = numberFrom(lines[j]);
        if (n != null && n >= 1000 && n <= 2000) return n;
      }
    }
  }
  const text = normalizedText(doc.body?.textContent);
  const match = text.match(/Item Level\s*(\d{3,4}(?:\.\d+)?)/i);
  return match ? numberFrom(match[1]) : null;
}

function findClass(doc, lines) {
  for (const line of lines) {
    const found = CLASS_NAMES.find((name) => line.toLowerCase() === name.toLowerCase());
    if (found) return found;
  }
  const text = normalizedText(doc.body?.textContent);
  for (const name of CLASS_NAMES) {
    if (new RegExp(`(?:^|[^A-Za-z])${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?:[^A-Za-z]|$)`, 'i').test(text)) return name;
  }
  return 'Unknown';
}

function findProfileName(doc, fallback) {
  const candidates = [...doc.querySelectorAll('h1,h2,[class*="character-name"],[class*="name"]')]
    .map((el) => normalizedText(el.textContent))
    .filter(Boolean);
  return candidates[0] || fallback || 'Unknown';
}

function textOfElement(el) {
  return normalizedText(el?.textContent || el?.innerText || '');
}

function candidateNumbers(text) {
  return (String(text).match(/\b\d{4,5}(?:\.\d{1,2})?\b/g) || []).map(numberFrom).filter((n) => n >= 4000 && n <= 20000);
}

function scoreCpCandidate(number, context) {
  const lower = context.toLowerCase();
  let score = 0;
  if (/combat\s*power|combatpower/.test(lower)) score += 100;
  if (/estimated\s*raid|estimated_raid|estimatedraid|raid_merged/.test(lower)) score += 80;
  if (/current\s*loadout\s*\(\s*raid\s*\)/.test(lower)) score += 70;
  if (/chaos\s*dungeon/.test(lower)) score -= 1000;
  if (/highest|record|historical|max/.test(lower)) score -= 500;
  return score;
}

function chooseFromSection(section, source) {
  const numbers = candidateNumbers(section);
  if (!numbers.length) return null;
  const lower = section.toLowerCase();
  if (/chaos\s*dungeon/.test(lower) && !/estimated\s*raid|current\s*loadout\s*\(\s*raid\s*\)/.test(lower)) return null;
  const scored = numbers.map((number) => ({number, score: scoreCpCandidate(number, section)})).sort((a,b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 0) return null;
  return { value: best.number, source };
}

function findTextWindows(fullText, labels, windowSize = 2200) {
  const windows = [];
  for (const label of labels) {
    let start = 0;
    while (true) {
      const index = fullText.toLowerCase().indexOf(label.toLowerCase(), start);
      if (index < 0) break;
      windows.push(fullText.slice(index, index + windowSize));
      start = index + label.length;
    }
  }
  return windows;
}

function extractRaidCP(doc) {
  const bodyText = normalizedText(doc.body?.textContent);
  const html = doc.documentElement?.outerHTML || '';
  const scripts = [...doc.scripts].map((s) => s.textContent || '').filter(Boolean);
  const allSources = [bodyText, html, ...scripts];

  const estimatedLabels = ['Estimated Raid Loadout','estimated_raid','estimatedRaid','raid_merged'];
  const currentRaidLabels = ['Current Loadout (Raid)','current_raid','most_recent_raid'];

  // 1. Estimated Raid Loadout is mandatory priority whenever its data exists.
  for (const sourceText of allSources) {
    for (const section of findTextWindows(sourceText, estimatedLabels, 3000)) {
      const result = chooseFromSection(section, 'Estimated Raid Loadout');
      if (result) return result;
    }
  }

  // 2. If no estimated raid value exists, use Current Loadout (Raid).
  for (const sourceText of allSources) {
    for (const section of findTextWindows(sourceText, currentRaidLabels, 3000)) {
      const result = chooseFromSection(section, 'Current Loadout (Raid)');
      if (result) return result;
    }
  }

  // 3. If the page exposes the selected current raid loadout as DOM controls,
  // use the visible Combat Power associated with that selection only.
  const raidButton = [...doc.querySelectorAll('button,[role="button"]')].find((el) => /Current Loadout\s*\(Raid\)/i.test(textOfElement(el)));
  if (raidButton) {
    let parent = raidButton;
    for (let depth = 0; depth < 6 && parent; depth++, parent = parent.parentElement) {
      const context = textOfElement(parent);
      if (/Combat Power/i.test(context)) {
        const numbers = candidateNumbers(context);
        if (numbers.length) return { value: numbers[0], source: 'Current Loadout (Raid)' };
      }
    }
  }

  // Never use an unlabelled top-of-page CP. Never use Chaos Dungeon CP.
  return { value: null, source: 'No acceptable raid CP found' };
}

function detectLoadout(doc, cpSource) {
  const text = normalizedText(doc.body?.textContent) + ' ' + [...doc.scripts].map((s) => s.textContent || '').join(' ');
  const estimated = /Estimated Raid Loadout|estimated_raid|estimatedRaid|raid_merged/i.test(text);
  const current = /Current Loadout\s*\(Raid\)|current_raid|most_recent_raid/i.test(text);
  return {
    label: cpSource === 'Estimated Raid Loadout' ? 'Estimated Raid Loadout' : cpSource === 'Current Loadout (Raid)' ? 'Current Loadout (Raid)' : estimated ? 'Estimated Raid Loadout detected, CP not found' : current ? 'Current Loadout (Raid) detected, CP not found' : 'No acceptable raid loadout found',
    estimatedRaidAvailable: estimated,
    currentRaidAvailable: current,
    chaosDungeonDetected: /Chaos Dungeon Loadout/i.test(text)
  };
}

function parseProfile(html, fallbackName) {
  const doc = makeDocument(html);
  const lines = getLines(doc);
  const cp = extractRaidCP(doc);
  const loadout = detectLoadout(doc, cp.source);
  const text = lines.join('\n');

  const arkPassive = {};
  const apStart = lines.findIndex((x) => /^Ark Passive$/i.test(x));
  if (apStart >= 0) {
    for (let i = apStart + 1; i < Math.min(lines.length, apStart + 120); i++) {
      const m = lines[i].match(/^(.*?)\s+Lv\.\s*(\d+)$/i);
      if (m && m[1] && !/^T\d$/i.test(m[1]) && !/^(Evolution|Enlightenment|Leap)$/i.test(m[1].trim())) arkPassive[m[1].trim()] = Number(m[2]);
    }
  }

  const engravings = [];
  const eStart = lines.findIndex((x) => /^Engravings$/i.test(x));
  if (eStart >= 0) {
    for (let i = eStart + 1; i < Math.min(lines.length, eStart + 50); i++) {
      const m = lines[i].match(/^(.+?)\s+(\d+)\/20(?:\s*[+]?\d+)?$/);
      if (m) engravings.push({name:m[1], level:Number(m[2])});
    }
  }

  const gridEffects = [];
  for (const line of lines) {
    const m = line.match(/^Lv\.\s*(\d+)\s+(.+?)\s+([+-]\d+(?:\.\d+)?%)$/);
    if (m) gridEffects.push({level:Number(m[1]), effect:m[2], value:m[3]});
  }

  return {
    name: findProfileName(doc, fallbackName),
    class: findClass(doc, lines),
    ilvl: findItemLevel(doc, lines),
    cp: cp.value,
    cpSource: cp.source,
    loadout: loadout.label,
    loadoutSelection: loadout,
    arkPassive,
    engravings,
    gridEffects,
    gemsIncomplete: /Gems incomplete\./i.test(text),
    retrievedAt: new Date().toISOString()
  };
}

async function fetchCharacter(character) {
  const endpoint = `${BIBLE_CONNECTOR}?url=${encodeURIComponent(character.url)}`;
  let response;
  try {
    response = await fetch(endpoint, {method:'GET', cache:'no-store', headers:{Accept:'application/json'}});
  } catch (error) {
    throw new Error(`Unable to reach the Bible connector: ${error.message || 'network error'}`);
  }

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error(`Bible connector returned non-JSON data (HTTP ${response.status}).`); }
  if (!response.ok || data.ok === false) throw new Error(data.error || `Bible connector returned HTTP ${response.status}.`);

  const html = data.html || data.characterHtml || data.content || data.page;
  if (!html) throw new Error('Bible connector succeeded but did not return character HTML.');
  return parseProfile(html, character.name);
}

function render() {
  const complete = state.characters.filter((c) => c.profile);
  const ilvls = complete.map((c) => c.profile.ilvl).filter(Number.isFinite);
  const cps = complete.map((c) => c.profile.cp).filter(Number.isFinite);

  $('#playerCount').textContent = `${state.characters.length} / ${MAX_CHARACTERS}`;
  $('#avgIlvl').textContent = ilvls.length ? Math.round(ilvls.reduce((a,b)=>a+b,0)/ilvls.length) : '—';
  $('#avgCp').textContent = cps.length ? Math.round(cps.reduce((a,b)=>a+b,0)/cps.length).toLocaleString() : '—';
  $('#dataMode').textContent = 'Bible profiles';
  $('#rosterNote').textContent = 'Only explicitly supplied character URLs are retrieved. Raid CP priority: Estimated Raid Loadout → Current Loadout (Raid). Chaos Dungeon Loadout is never used.';

  $('#roster').innerHTML = state.characters.length ? state.characters.map((c) => {
    const p = c.profile;
    return `<article class="character"><div class="character-head"><div><h3>${escapeHtml(p?.name || c.name)}</h3><div class="class">${escapeHtml(p?.class || 'Profile pending')}</div></div><button class="remove-character" data-id="${escapeHtml(c.id)}" type="button">Remove</button></div><div class="stats"><div class="stat">iLvl<b>${formatNumber(p?.ilvl)}</b></div><div class="stat">CP<b>${formatNumber(p?.cp)}</b></div></div><div class="privacy-note">${p ? `Bible profile loaded · ${escapeHtml(p.loadout)} · CP source: ${escapeHtml(p.cpSource)}` : escapeHtml(c.profileError || 'Profile pending')}</div></article>`;
  }).join('') : '<div class="empty-roster">No designated main characters have been added.</div>';

  document.querySelectorAll('.remove-character').forEach((button) => button.addEventListener('click', () => removeCharacter(button.dataset.id)));
  renderSuggestions();
}

function renderSuggestions() {
  const complete = state.characters.filter((c) => c.profile);
  if (!complete.length) {
    $('#suggestedParties').innerHTML = '<div class="empty-roster">Add specific character profiles to generate the party setup.</div>';
    return;
  }
  const sorted = [...complete].sort((a,b) => (b.profile.cp || 0) - (a.profile.cp || 0));
  const a = sorted.filter((_,i)=>i%2===0).slice(0,4);
  const b = sorted.filter((_,i)=>i%2===1).slice(0,4);
  const party = (title, members) => `<article class="party"><h3>${title}</h3><div class="score">${members.length}/4 slots filled</div><div class="slots">${members.map((c)=>`<div class="slot"><h4>${escapeHtml(c.profile.name)}</h4><small>${escapeHtml(c.profile.class)} · iLvl ${formatNumber(c.profile.ilvl)} · CP ${formatNumber(c.profile.cp)}</small></div>`).join('') || '<div class="slot"><small>No characters assigned.</small></div>'}</div></article>`;
  $('#suggestedParties').innerHTML = party('Party 1',a) + party('Party 2',b);
}

async function refreshProfiles() {
  if (!state.characters.length) return setStatus('Add at least one character first.');
  setStatus('Refreshing character profiles…');
  let ok=0, failed=0;
  for (const character of state.characters) {
    try { character.profile = await fetchCharacter(character); delete character.profileError; ok++; }
    catch (error) { character.profileError = error.message; failed++; }
  }
  saveState(); render();
  setStatus(failed ? `Refreshed ${ok}; ${failed} failed.` : `Refreshed ${ok} profile${ok===1?'':'s'} from Bible.`);
}

function removeCharacter(id) {
  const character = state.characters.find((c)=>c.id===id);
  if (!character) return;
  if (localStorage.getItem(REMOVE_CONFIRM_KEY)==='1') return performRemove(character);
  const overlay=document.createElement('div');
  overlay.className='remove-modal';
  overlay.innerHTML=`<div class="remove-modal-card" role="dialog" aria-modal="true"><h2>Remove character?</h2><p>Are you sure you want to remove <strong>${escapeHtml(character.name)}</strong>?</p><label class="remove-modal-check"><input id="remove-confirm-skip" type="checkbox"><span>Don't ask me again</span></label><div class="remove-modal-actions"><button class="remove-cancel" type="button">Cancel</button><button class="remove-confirm" type="button">Remove Character</button></div></div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('.remove-cancel').onclick=close;
  overlay.querySelector('.remove-confirm').onclick=()=>{if($('#remove-confirm-skip').checked)localStorage.setItem(REMOVE_CONFIRM_KEY,'1');close();performRemove(character);};
}

function performRemove(character) {
  state.characters=state.characters.filter((c)=>c.id!==character.id); saveState(); render();
}

function snapshot() {
  return {version:2,createdAt:new Date().toISOString(),characters:state.characters.map((c)=>({id:c.id,url:c.url,region:c.region,name:c.name,profile:c.profile||null})),testCharacter:state.testCharacter||null};
}

function encodeSnapshot(value) {
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function copyShareLink() {
  const url=new URL(location.href); url.hash=`share=${encodeSnapshot(snapshot())}`; const link=url.toString();
  try { await navigator.clipboard.writeText(link); setStatus('Share link copied to clipboard.'); }
  catch { window.prompt('Copy this private share link:',link); }
}

async function compareCharacter() {
  const parsed=parseBibleUrl($('#testCharacterUrl').value.trim());
  if(!parsed) return setStatus('Enter a valid lostark.bible character URL.');
  setStatus(`Retrieving ${parsed.name}…`);
  try {
    parsed.profile=await fetchCharacter(parsed); state.testCharacter=parsed; saveState();
    $('#comparison').innerHTML=`<div class="comparison-grid"><div class="comparison-card"><span>Test character</span><b>${escapeHtml(parsed.profile.name)}</b><div class="delta">${escapeHtml(parsed.profile.class)}</div></div><div class="comparison-card"><span>Raid iLvl</span><b>${formatNumber(parsed.profile.ilvl)}</b></div><div class="comparison-card"><span>Raid CP</span><b>${formatNumber(parsed.profile.cp)}</b><div class="delta">${escapeHtml(parsed.profile.cpSource)}</div></div></div>`;
    setStatus(`Loaded ${parsed.profile.name}.`);
  } catch(error) { $('#comparison').innerHTML=`<div class="empty-roster">${escapeHtml(error.message)}</div>`; setStatus('Test character retrieval failed.'); }
}

function loadShareSnapshot() {
  const hash=location.hash;
  if(!hash.startsWith('#share=')) return false;
  try {
    const encoded=hash.slice(7).replace(/-/g,'+').replace(/_/g,'/');
    const binary=atob(encoded); const bytes=Uint8Array.from(binary,(c)=>c.charCodeAt(0)); const data=JSON.parse(new TextDecoder().decode(bytes));
    if(!data || !Array.isArray(data.characters)) return false;
    state.characters=data.characters.slice(0,MAX_CHARACTERS); state.testCharacter=data.testCharacter||null; saveState(); history.replaceState(null,'',location.pathname+location.search); return true;
  } catch { setStatus('The share link is invalid or corrupted.'); return false; }
}

function init() {
  $('#addCharacterBtn').onclick=()=>{
    if(state.characters.length>=MAX_CHARACTERS) return setStatus(`Maximum of ${MAX_CHARACTERS} characters reached.`);
    const parsed=parseBibleUrl($('#characterUrl').value.trim());
    if(!parsed) return setStatus('Enter a valid lostark.bible character URL.');
    if(state.characters.some((c)=>c.url===parsed.url)) return setStatus('That character is already added.');
    state.characters.push({...parsed,id:crypto.randomUUID(),profile:null}); saveState(); $('#characterUrl').value=''; render(); setStatus('Character added. Click Refresh Profiles.');
  };
  $('#refreshBtn').onclick=refreshProfiles;
  $('#shareBtn').onclick=copyShareLink;
  $('#compareBtn').onclick=compareCharacter;
  $('#optimizeBtn').onclick=()=>{renderSuggestions();setStatus(state.characters.filter((c)=>c.profile).length>=2?'Parties refreshed using loaded character strength.':'Load at least two complete profiles first.');};
  loadShareSnapshot(); render();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
