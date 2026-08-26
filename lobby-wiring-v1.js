/* Live Lobby wiring. This is the seam between the import panel and the page:
   the Party Source toggle, the review panel, the busy state on Optimize, and
   the swap between the Main Group and an imported lobby.

   Everything Bible-facing goes through the connector worker -- the browser
   cannot call lostark.bible directly, there is no CORS. See the note on `io`. */
(function () {
  'use strict';

  const G = window.LostArkLiveGroup;

  /* Profiles go through the app's own fetchCharacter so the record carries
     everything the cards and optimizers read -- CP, class, Ark Passive, tripods
     -- not just a name and an item level.

     Search is the one route that may not answer: it is written in the worker
     but is only live once that worker is deployed. Until then any name OCR did
     not read exactly stays unresolved and has to be typed. On a real lobby that
     is roughly three rows in eight. */
  const io = {
    /* Bible cannot be called from the browser (no CORS), so search goes through
       the connector like every other Bible call. It matches on the de-accented
       name, which is what lets the panel suggest a name nobody can type. If the
       route is not deployed yet this resolves to nothing and the panel says so,
       rather than failing the import. */
    search: async (query, region) => {
      try {
        const r = await fetch(CONNECTOR + '/search?name=' + encodeURIComponent(query) +
                              '&region=' + encodeURIComponent(region || 'NA'), { cache: 'no-store' });
        if (!r.ok) return [];
        return parseSearch(await r.text());
      } catch { return []; }
    },
    fetchProfile: async (name, region) => {
      const url = 'https://lostark.bible/character/' +
        encodeURIComponent(region || 'NA') + '/' + encodeURIComponent(name);
      try {
        if (typeof window.fetchCharacter !== 'function') throw Error('importer unavailable');
        return await window.fetchCharacter({ url, name, region: region || 'NA' });
      } catch {
        return { name: 'Character Not Found', ilvl: null, class: 'Unknown' };
      }
    }
  };

  const CONNECTOR = 'https://lostark-bible-connector.seraph0226.workers.dev';

  /* Bible answers in SvelteKit's devalue format: a flat array where entries
     reference each other by index. Rather than rehydrating all of it, pull out
     the (name, classId, itemLevel) triples, which is everything a suggestion
     needs. Names may carry any Latin accent, hence the wide character class. */
  function parseSearch(text) {
    const out = [];
    const re = /\\"([A-Za-zÀ-ɏ][A-Za-z0-9_À-ɏ]{1,31})\\"(?:,\\"([a-z_]+)\\")?,([0-9]+(?:\.[0-9]+)?)/g;
    let m;
    while ((m = re.exec(text))) {
      if (m[1] === 'result' || m[1] === 'data') continue;
      out.push({ name: m[1], classId: m[2] || null, itemLevel: Number(m[3]) });
    }
    return out.slice(0, 10);
  }

  const $ = s => document.querySelector(s);

  function banner() {
    const meta = G.meta();
    const host = $('#roster');
    const existing = document.querySelector('.live-lobby-banner');
    if (existing) existing.remove();
    if (!G.isLive() || !meta || !host) return;
    const bar = document.createElement('div');
    bar.className = 'live-lobby-banner';
    bar.innerHTML = '<span>Showing a live lobby: <b>' + meta.label + '</b> · ' +
      meta.players + ' players · ' + meta.region + (meta.difficulty ? ' · ' + meta.difficulty : '') + '</span>';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Back to Main Group';
    btn.addEventListener('click', () => { G.clear(); apply({ force: true }); });
    bar.appendChild(btn);
    host.parentNode.insertBefore(bar, host);
  }

  /* Raid Specific fetches raid statistics before it can score anything, so the
     parties land seconds after the click and the button gives no sign it is
     working. A freshly imported lobby always misses that cache, so it always
     takes the slow path -- which reads as "nothing happened". The page already
     styles [aria-busy=true] on these buttons; this just sets it.

     Both listeners are capture-phase and deliberately passive: General binds
     pointerdown and Raid Specific binds click, and anything that calls
     stopPropagation here would swallow the optimiser's own handler. */
  function wireBusyState() {
    const btn = $('#optimizeBtn');
    const host = $('#suggestedParties');
    if (!btn || !host || btn.__busyWired) return;
    btn.__busyWired = true;

    const original = btn.textContent;
    let timer = null;
    const stop = () => {
      clearTimeout(timer);
      btn.removeAttribute('aria-busy');
      btn.textContent = original;
    };
    const start = () => {
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = 'Optimizing…';
      clearTimeout(timer);
      /* If something goes wrong upstream the button must not stay stuck. */
      timer = setTimeout(stop, 30000);
    };

    btn.addEventListener('pointerdown', start, { capture: true });
    btn.addEventListener('click', start, { capture: true });

    /* Clear once members actually appear. This only reads #suggestedParties and
       writes to the button outside it, so it cannot feed itself the way the
       render layers can. */
    new MutationObserver(() => {
      if (btn.getAttribute('aria-busy') === 'true' && host.querySelector('[data-character-id]')) stop();
    }).observe(host, { childList: true, subtree: true });
  }

  /* The screenshot already says which fight this is, so making someone pick it
     from the dropdown afterwards is asking for information we have. Setting the
     value alone is not enough -- raid-selector-v1.js and raid-mode-bridge-v1.js
     react to change events, not to assignment. */
  function autoSelectEncounter(meta) {
    if (!meta) return;
    const fire = node => node.dispatchEvent(new Event('change', { bubbles: true }));

    const format = $('#generalFormatSelect');
    if (format && meta.players) {
      const want = String(meta.players);
      if ([...format.options].some(o => o.value === want) && format.value !== want) {
        format.value = want; fire(format);
      }
    }

    const raid = $('#raidSpecificSelect');
    const known = raid && [...raid.options].some(o => o.value === meta.encounterId);
    if (!known) return;    /* leave the mode alone for content we cannot score */

    /* Raid Specific is the mode where knowing the encounter pays off, so switch
       into it rather than optimising generically against a specific fight. */
    const general = $('#generalOptimization');
    if (general && general.checked) { general.checked = false; fire(general); }

    raid.value = meta.encounterId;
    fire(raid);
  }

  /* Build profiles are keyed by Bible URL and, left alone, are built only for
     the Main Group. An imported lobby therefore has none -- which is not just a
     display problem: encounter-scoring-v2.js and both optimizers read the same
     cache, so the lobby was being scored with no engravings, no positional and
     no Ark Passive. The class name showing where a specialization belongs was
     the visible half of that.

     BuildProfilesV3.refresh() already takes an explicit list; candidate-roster-
     v1.js does exactly this for new additions. Ask only for the ones missing
     from the cache, so toggling source or reloading the page costs Bible
     nothing -- each lobby member is fetched once, ever. */
  const BUILD_KEY = 'lostark-hideout-build-profiles-v3';
  let buildsRunning = false;
  /* refresh() dispatches lostark-build-profiles-v3-ready, and this module calls
     apply() on that event -- so this function is in its own feedback path. The
     cache check alone does terminate, but only by an argument about what
     refresh() writes on failure. Remembering what we have already asked for
     makes it terminate by construction instead, which is the rule this codebase
     keeps re-learning about layers that observe their own output. */
  const attempted = new Set();

  function ensureLiveBuilds() {
    if (buildsRunning || !G.isLive()) return;
    const refresh = window.LostArkBuildProfilesV3 && window.LostArkBuildProfilesV3.refresh;
    if (typeof refresh !== 'function') return;

    const chars = (G.characters() || []).filter(c => c && c.url);
    if (!chars.length) return;

    let cache = {};
    try { cache = JSON.parse(localStorage.getItem(BUILD_KEY) || '{}'); } catch {}
    /* Trailing slashes vary between what Bible returns and what we stored, and
       the cache is matched by href elsewhere, so compare without one. */
    const flat = u => String(u).replace(/\/$/, '');
    const keys = Object.keys(cache).map(flat);
    /* A profile cached before the Ark Passive nodes were parsed has no
       `enlightenment`, and the spec label falls back to the old page-wide text
       search that could report a spec the character does not have. Treat those
       as missing so they are rebuilt once. */
    const stale = u => { const e = cache[u] || cache[keys.find(k => k === flat(u))];
      return e && !e.error && !Array.isArray(e.enlightenment); };
    const missing = chars.filter(c => (!cache[c.url] && !keys.includes(flat(c.url)) || stale(c.url)) &&
      !attempted.has(flat(c.url)));
    if (!missing.length) return;
    missing.forEach(c => attempted.add(flat(c.url)));

    buildsRunning = true;
    Promise.resolve(refresh(missing)).then(() => { buildsRunning = false; })
      .catch(() => { buildsRunning = false; });
    /* Deliberately no render() here. refresh() fires
       lostark-build-profiles-v3-ready, and the repair layers listen for it and
       rewrite the labels in place, so a redraw was never needed for them --
       while render() *clears* #suggestedParties. Because these fetches land
       tens of seconds after the import, that wiped whatever the user had just
       optimised, which reads exactly like "I clicked Optimize and nothing
       happened". */
  }

  /* In live mode the Main Group sections are replaced rather than added to,
     which is the whole point of the toggle. */
  /* `force` means a person changed the roster -- toggled source, or imported a
     lobby -- so the cards must be redrawn. Everything else calling apply() is a
     background event (class data arriving, build profiles finishing), and those
     must NOT redraw over optimizer output: render() clears #suggestedParties,
     and the build fetches land seconds *after* an import, so an automatic redraw
     silently deleted the parties the user had just optimised. */
  function apply(opts) {
    if (!$('#sourceMainBtn')) return;
    const force = !!(opts && opts.force);
    const live = G.isLive();
    $('#sourceMainBtn').classList.toggle('is-active', !live);
    $('#sourceLiveBtn').classList.toggle('is-active', live);
    $('#lobbyImportSection').hidden = !live;

    /* `hidden` is only display:none in the browser's default stylesheet, and
       styles.css sets .roster{display:grid} and .toolbar{display:flex}, which
       win on specificity. An inline style is the one thing nothing overrides. */
    const show = (node, visible) => { if (node) node.style.display = visible ? '' : 'none'; };

    /* Selected by what it is not, rather than by position: the lobby panel is
       also an .import-panel, so an index here would depend on the order the two
       sections happen to sit in the markup. */
    show(document.querySelector('.import-panel:not(.lobby-import-section)'), !live);
    show([...document.querySelectorAll('.toolbar')]
      .find(t => t.querySelector('h2') && t.querySelector('h2').textContent.trim() === 'Main Group'), !live);
    /* #roster is no longer hidden: render() draws whichever roster is selected,
       so in live mode it already shows the imported lobby using the app's own
       cards. Hiding it would blank the thing we want to see. */
    /* "Character Comparison vs. Main Group" is about your own roster, and its
       heading would be wrong here. */
    show(document.querySelector('.comparison-panel'), !live);

    /* render() fills in the number but not the label, and the markup says
       "Main Group". */
    const firstCard = document.querySelector('.summary-grid .card span');
    if (firstCard) firstCard.textContent = live ? 'Live Lobby' : 'Main Group';

    const parties = $('#suggestedParties');
    const showingParties = !!(parties && parties.querySelector('[data-character-id]'));
    if (window.LostArkDashboard && (force || !showingParties)) window.LostArkDashboard.render();

    const note = $('#rosterSourceNote');
    if (note) note.textContent = live
      ? 'Optimizing a live lobby. Your Main Group is untouched and returns when you switch back.'
      : 'Optimize your own Main Group, or a live party finder lobby you are inspecting.';
    banner();
    ensureLiveBuilds();
  }

  function start() {
    /* If the Party Source markup is not on the page, this whole layer stays
       inert rather than throwing and taking the rest of the scripts with it. */
    if (!$('#sourceMainBtn') || !$('#sourceLiveBtn') || !$('#lobbyImportHost')) return;

    /* Land on the Main Group after a reload, always. The imported lobby is kept
       -- Live Lobby brings it straight back -- but it no longer presents itself
       as current on open. Nothing records when a lobby was captured, so one from
       days ago reads exactly like one from a minute ago, and the party it
       describes has usually long since formed and gone. User's call, 2026-08-25.

       setSource() rather than writing the key: returning to main restores the
       Main Group's parked party arrangement, which is the entire reason that
       parking exists. */
    if (G.isLive()) G.setSource('main');

    fetch('raid-encounters.json?v=1').then(r => r.json()).then(manifest => {
      window.LostArkLobbyPanel.create($('#lobbyImportHost'), {
        manifest, io,
        onImport: () => { apply({ force: true }); autoSelectEncounter(G.meta()); }
      });
    });
    $('#sourceMainBtn').addEventListener('click', () => { G.setSource('main'); apply({ force: true }); });
    /* Selecting the lobby's own fight, the same as an import does. This matters
       more now that the dashboard always opens on the Main Group: returning to
       a stored lobby is a normal thing to do, and leaving the dropdown on
       whatever was picked last means optimising that lobby against the wrong
       encounter. */
    $('#sourceLiveBtn').addEventListener('click', () => {
      G.setSource('live'); apply({ force: true }); autoSelectEncounter(G.meta());
    });

    wireBusyState();
    apply();

    /* The class authorities load after this runs, and asking them for a class
       too early gives a different answer -- a Breaker renders as Wildsoul until
       class-icon-authority-v1.js has patched LostArkHideoutClassData. Wait for
       that marker rather than guessing a delay; a fixed 1200ms was too early. */
    window.addEventListener('lostark-build-profiles-v3-ready', () => apply());
    (() => {
      let tries = 0;
      const ready = () => {
        const d = window.LostArkHideoutClassData;
        if (d && d.__specialIconAuthorityV3) { apply(); return; }
        if (++tries < 60) setTimeout(ready, 100);
        else apply();                 /* give up waiting, draw what we have */
      };
      setTimeout(ready, 100);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
