/* Lobby import — where an imported lobby lives.

   The live group gets its own key and never borrows the Main Group's. That is
   not caution for its own sake: refreshCandidateBuilds() once overwrote
   `lostark-hideout-private-v3` with another list and restored it afterwards,
   and any interruption in that window -- a reload, a closed tab, a rejected
   promise -- left the Main Group permanently replaced. Importing a share link
   triggered it every time. Nothing here writes to that key under any
   circumstance.

   A live group is deliberately ephemeral: it is someone else's party, so it
   stays out of Save Dashboard and out of share links, both of which are about
   your own roster.

   Characters are stored in the same shape as Main Group entries
   ({id, url, region, name, profile}) so every existing layer -- the card
   renderer, the spec authority, the optimizers -- reads them without changes. */
(function () {
  'use strict';

  const LIVE_KEY = 'lostark-hideout-live-group-v1';
  const SOURCE_KEY = 'lostark-hideout-roster-source-v1';

  /* The Main Group key, named here only so the guard below can refuse to touch
     it. Nothing in this file ever writes to it. */
  const MAIN_KEY = 'lostark-hideout-private-v3';

  const MAIN = 'main', LIVE = 'live';

  /* The optimizers persist their arrangement here, as a list of character ids.
     Swap the roster underneath it and every id becomes unresolvable, so
     resolve() matches nothing and the dashboard renders two empty parties --
     which looks exactly like the optimizer silently failing. The arrangement
     belongs to whichever roster produced it, so it is parked and restored
     rather than shared. */
  const ASSIGN_KEY = 'lostark-hideout-party-assignments-v2';
  const ASSIGN_PARKED = 'lostark-hideout-party-assignments-main-parked-v1';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function write(key, value) {
    /* Belt and braces: this module has exactly one key it may write, and a
       future edit that widens it should fail loudly rather than quietly eat
       someone's roster. */
    if (key === MAIN_KEY) throw Error('lobby-group must never write the Main Group key.');
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  }

  /* Roster source is a separate axis from the General/Raid choice, which lives
     in lostark-hideout-optimizer-mode-v1. Selecting a live group does not
     change which optimizer is running. */
  const source = () => (read(SOURCE_KEY, MAIN) === LIVE ? LIVE : MAIN);
  const isLive = () => source() === LIVE;

  const dropAssignments = () => { try { localStorage.removeItem(ASSIGN_KEY); } catch {} };

  function setSource(next) {
    const value = next === LIVE ? LIVE : MAIN;
    const was = source();
    if (value === was) { write(SOURCE_KEY, value); return value; }

    if (value === LIVE) {
      /* Park the Main Group's arrangement so a manual drag-and-drop is not lost
         just because someone looked at a lobby. */
      const current = localStorage.getItem(ASSIGN_KEY);
      if (current !== null) write(ASSIGN_PARKED, current);
      dropAssignments();
    } else {
      const parked = read(ASSIGN_PARKED, null);
      dropAssignments();
      if (typeof parked === 'string') { try { localStorage.setItem(ASSIGN_KEY, parked); } catch {} }
    }
    write(SOURCE_KEY, value);
    return value;
  }

  const characters = () => {
    const list = read(LIVE_KEY, null);
    return Array.isArray(list) ? list.filter(c => c && c.id) : [];
  };

  /* Replaces the live group wholesale. An import is all-or-nothing -- only full
     lobbies are accepted -- so there is no add or remove, and therefore no
     window in which a half-written group could be read. */
  function replace(list, meta) {
    const clean = (Array.isArray(list) ? list : []).filter(c => c && c.id);
    write(LIVE_KEY, clean);
    if (meta) write(LIVE_KEY + '-meta', meta);
    /* A new lobby means the arrangement on screen refers to people who are no
       longer in the roster. Importing a second lobby without this leaves the
       first lobby's assignment in place and nothing renders. */
    dropAssignments();
    return clean;
  }

  const meta = () => read(LIVE_KEY + '-meta', null);

  /* Clearing the live group returns to the Main Group rather than leaving the
     dashboard pointed at nothing. */
  function clear() {
    write(LIVE_KEY, []);
    write(LIVE_KEY + '-meta', null);
    setSource(MAIN);
  }

  /* The single seam the roster reads through. Given whatever the Main Group
     path produced, hand back the live group instead when live mode is on.
     Keeping the decision in one function means the change inside
     candidate-roster-v1.js is a single line and is inert whenever the stored
     source is anything other than "live". */
  function resolveRoster(mainList) {
    if (!isLive()) return mainList;
    const live = characters();
    /* An empty live group would blank the dashboard, which reads as a bug
       rather than a state. Fall back rather than show nothing. */
    return live.length ? live : mainList;
  }

  window.LostArkLiveGroup = {
    LIVE_KEY, SOURCE_KEY, MAIN, LIVE,
    source, isLive, setSource,
    characters, replace, meta, clear, resolveRoster
  };
})();
