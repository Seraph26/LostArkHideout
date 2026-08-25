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

  function run() {
    const roster = window.LostArkCandidateRoster;
    const builds = window.LostArkBuildProfilesV3;
    if (!roster || typeof roster.getAll !== 'function') return false;
    if (!builds || typeof builds.refresh !== 'function') return false;

    let chars = [];
    try { chars = roster.getAll() || []; } catch { return false; }
    if (!chars.length) return false;                 /* nothing loaded yet */

    const store = cache();
    const outdated = chars.filter(c => c && c.url && stale(entryFor(store, c.url)));
    if (!outdated.length) return true;               /* done: nothing stale */

    console.info('[builds] refreshing ' + outdated.length + ' profile(s) cached before ' +
      'Ark Passive was parsed: ' + outdated.map(c => c.name || c.url).join(', '));
    Promise.resolve(builds.refresh(outdated)).catch(() => {});
    return true;
  }

  /* The roster and the profile cache are both populated by modules that load
     after this one, and a live lobby is resolved later still. Poll briefly
     rather than guess a delay, and stop as soon as one pass has something real
     to look at. A fixed timeout was tried elsewhere in this codebase and was
     consistently either too early or needlessly slow. */
  let tries = 0;
  const tick = () => { if (run()) return; if (++tries < 40) setTimeout(tick, 250); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(tick, 250), { once: true });
  else setTimeout(tick, 250);
})();
