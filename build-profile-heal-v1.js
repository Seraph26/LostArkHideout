/* Lost Ark Party — one-time heal for build profiles cached before the Ark
   Passive nodes were parsed.

   Until 2026-08-25 `parse()` split its text on newlines that clean() had already
   collapsed, so arkPassive, grid, stats and sections came back empty for every
   character. Those profiles are still in localStorage and still being read: the
   spec label falls back to a page-wide text search that can report a spec the
   character does not have, and the optimizers score them with no engravings,
   no positional and no Ark Passive.

   A profile is stale here when it has no `enlightenment` array. That is the
   field the new parser always writes -- as `[]` when a character genuinely has
   no Enlightenment block -- so a healed profile can never look stale again and
   this cannot loop.

   Bible request volume is the binding constraint on this project, so this is
   deliberately narrow: only profiles already cached and missing the field, only
   once per page load, and nothing is fetched for a character who has no profile
   yet (something else owns that). Worst case is one refetch per roster
   character, once, ever. */
(function () {
  'use strict';

  const BUILD_KEY = 'lostark-hideout-build-profiles-v3';
  const flat = u => String(u || '').replace(/\/$/, '');

  function cache() {
    try { return JSON.parse(localStorage.getItem(BUILD_KEY) || '{}'); } catch { return {}; }
  }

  function entryFor(store, url) {
    if (store[url]) return store[url];
    const want = flat(url);
    for (const k of Object.keys(store)) if (flat(k) === want) return store[k];
    return null;
  }

  function stale(entry) {
    /* An entry that failed to fetch carries {error} and has nothing to heal --
       retrying it here would just spend a Bible request to fail again. */
    return !!entry && !entry.error && !Array.isArray(entry.enlightenment);
  }

  /* Deliberately NOT CandidateRoster.getAll(). The note above rosterCharacters()
     in ui-fixes-clean.js spells out why: getAll() normalises every New Addition
     on the way out, which stringifies each whole profile and can write back to
     localStorage. Doing that on a repeating timer froze the tab outright on a
     real roster -- the profiles are hundreds of KB each and the writes are
     synchronous. Read the two keys directly and let the live group swap them,
     which is the same cheap path the repair layer uses. */
  const MAIN_KEY = 'lostark-hideout-private-v3';
  const NEW_KEY = 'lostark-hideout-new-additions-v1';

  function rosterCharacters() {
    let out = [];
    try { const s = JSON.parse(localStorage.getItem(MAIN_KEY) || 'null');
      if (s && Array.isArray(s.characters)) out = out.concat(s.characters); } catch {}
    try { const extra = JSON.parse(localStorage.getItem(NEW_KEY) || 'null');
      if (Array.isArray(extra)) out = out.concat(extra); } catch {}
    try { const live = window.LostArkLiveGroup?.resolveRoster?.(out);
      if (Array.isArray(live)) return live; } catch {}
    return out;
  }

  function run() {
    const builds = window.LostArkBuildProfilesV3;
    if (!builds || typeof builds.refresh !== 'function') return false;

    const chars = rosterCharacters();
    if (!chars.length) return false;                 /* nothing loaded yet */

    const store = cache();
    const outdated = chars.filter(c => c && c.url && stale(entryFor(store, c.url)));
    if (!outdated.length) return true;               /* done: nothing stale */

    console.info('[builds] refreshing ' + outdated.length + ' profile(s) cached before ' +
      'Ark Passive was parsed: ' + outdated.map(c => c.name || c.url).join(', '));
    Promise.resolve(builds.refresh(outdated)).catch(() => {});
    return true;
  }

  /* The profile cache and the lobby modules load after this one, so poll --
     but every pass now only reads localStorage, with no normalisation and no
     writes, and it stops at the first pass that finds a roster. Slower interval
     and fewer attempts as well: healing is not urgent, and nothing else waits
     on it. */
  let tries = 0;
  const tick = () => { if (run()) return; if (++tries < 20) setTimeout(tick, 500); };

  /* Starts only after the load event, plus a pause. Healing is background work
     that nothing on screen waits for, so it must never be able to sit between
     the user and a rendered page -- whatever it ends up costing later. */
  /* Escape hatch, checked before anything is scheduled:
     localStorage.setItem('lostark-heal-off','1') stops this dead, so a bad
     interaction can be switched off from the console without waiting on a
     deploy to recover. */
  let off = false;
  try { off = localStorage.getItem('lostark-heal-off') === '1'; } catch {}
  if (!off) {
    const begin = () => setTimeout(tick, 2000);
    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin, { once: true });
  }
})();
