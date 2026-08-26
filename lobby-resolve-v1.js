/* Lobby import — turning an OCR'd name into a confirmed character.

   OCR gets the base letters right and the diacritics wrong, so a name often
   does not exist as read. Bible's character search ignores diacritics, which
   makes the de-accented name the reliable query, and it returns item levels
   inline so a candidate can be checked without fetching anything.

   Transports are injected rather than imported. That keeps this file testable
   against recorded payloads, and means it does not care whether the calls go
   through the worker or a stub.

   Traffic discipline (Bible's maintainers dislike scraping, and this is their
   undocumented internal endpoint):
     - direct profile fetch first, because most names read correctly and a miss
       costs 6.7KB against 230KB for a real profile
     - at most three searches per name: de-accented, then a 5- and a 4-character
       prefix, and only for a name that has already failed
     - never fetch profiles for candidates -- search already carries item level,
       so only the winner is fetched
     - no enumeration, no prefix crawling, no speculative lookups
   That works out to roughly what a person opening the same character pages by
   hand would cost, which is what this replaces. */
(function () {
  'use strict';

  /* Bible answers a missing character with HTTP 200 and a normal-looking page
     whose <h1> is "Character Not Found" -- 6.7KB against 170-316KB for a real
     profile. Without this guard a mistyped name becomes a card literally named
     after the error, which is a live bug for hand-entered URLs too. */
  const MISSING_HEADING = /character not found/i;
  function looksMissing(profile) {
    if (!profile) return true;
    if (MISSING_HEADING.test(String(profile.name || ''))) return true;
    /* A real profile always carries an item level; the not-found page has none.
       Test for absence before converting -- Number(null) is 0, which is finite,
       so a null item level would otherwise sail through this guard. */
    const ilvl = profile.ilvl;
    if (ilvl === null || ilvl === undefined || ilvl === '') return true;
    return !Number.isFinite(Number(ilvl));
  }

  const PREFIX_LEN = 5;

  /* Used only when the de-accented name finds nothing, which happens for shape
     errors rather than accent errors -- tesseract read Bussyßaka as BussyBaka,
     and "Bussybaka" de-accents to "Bussyssaka", matching nothing. A short
     prefix still finds it. */
  function prefixFor(name, deaccent, len) {
    const n = Number.isFinite(len) ? len : PREFIX_LEN;
    const flat = deaccent ? deaccent(name) : String(name || '');
    return flat.length <= n ? flat : flat.slice(0, n);
  }

  /* One slot, one answer, with the reason attached so the review UI can explain
     itself rather than silently substituting a name. */
  async function resolveSlot(slot, region, io) {
    const api = window.LostArkLobbyImport;
    const out = { slot, region, name: null, profile: null, status: 'unresolved', searches: 0, tried: [] };
    if (!slot || !slot.name) { out.status = 'no-name'; return out; }

    /* 1. As read. Most names are correct, and this costs almost nothing when
          they are not. */
    out.tried.push(slot.name);
    const direct = await io.fetchProfile(slot.name, region);
    if (!looksMissing(direct)) {
      out.name = direct.name || slot.name;
      out.profile = direct;
      out.status = api.ilvlMatches(direct.ilvl, slot.ilvl) ? 'direct' : 'direct-ilvl-mismatch';
      return out;
    }

    /* 2. De-accented, because the search sees through diacritics. */
    const flat = api.deaccent(slot.name);
    out.tried.push(flat);
    out.searches++;
    let candidates = await io.search(flat, region);
    let pick = api.pickCandidate(candidates, slot.ilvl);

    /* 3. Short prefix, for errors the search cannot see through. Two lengths,
          because the prefix only helps if it stops before the misread letter:
          `Kinggi` for `Kingqi` is wrong at position 5, so a 5-character prefix
          carries the error and finds nothing, while 4 finds him. Shorter is not
          simply better -- the search returns a bounded set ranked by item level,
          so "kin" drops him again beneath commoner names. Try both. */
    if (pick.status === 'none' || pick.status === 'no-ilvl-match') {
      const tried = new Set([flat]);
      for (const len of [PREFIX_LEN, PREFIX_LEN - 1]) {
        const prefix = prefixFor(slot.name, api.deaccent, len);
        if (!prefix || tried.has(prefix)) continue;
        tried.add(prefix);
        out.tried.push(prefix + '…');
        out.searches++;
        const more = await io.search(prefix, region);
        const second = api.pickCandidate(more, slot.ilvl);
        if (second.status === 'matched') { pick = second; candidates = more; break; }
        if (pick.status === 'none') { pick = second; candidates = more; }
        else if (more.length) candidates = candidates.concat(more);
      }
    }

    /* 4. Item level could not decide. That is not always a missing character:
          it is also what a stale Bible looks like, because item level is only an
          oracle while Bible is current. So ask what the OCR error looks like
          instead -- one wrong character -- and accept a lone near-miss name.
          Flagged, never treated as confirmed: the item level genuinely does not
          agree, and the person importing should see that. */
    if (pick.status !== 'matched' && candidates.length) {
      const byName = api.pickByName(candidates, slot.name, slot.ilvl);
      if (byName.status === 'name-matched') {
        const profile = await io.fetchProfile(byName.candidate.name, region);
        if (!looksMissing(profile)) {
          out.name = byName.candidate.name;
          out.profile = profile;
          out.candidate = byName.candidate;
          out.status = api.ilvlMatches(profile.ilvl, slot.ilvl) ? 'resolved' : 'name-ilvl-mismatch';
          return out;
        }
      }
    }

    if (pick.status === 'matched') {
      const profile = await io.fetchProfile(pick.candidate.name, region);
      if (!looksMissing(profile)) {
        out.name = pick.candidate.name;
        out.profile = profile;
        out.status = 'resolved';
        out.candidate = pick.candidate;
        return out;
      }
    }

    /* Anything else is handed to the person rather than guessed. Collisions are
       normal -- Dragondeez, Thesickness and Meteorologist each have three live
       accent variants -- so a single unverified candidate is a suggestion, not
       an answer. */
    out.status = pick.status === 'matched' ? 'unresolved' : pick.status;
    out.candidates = pick.candidates || (pick.candidate ? [pick.candidate] : []);
    return out;
  }

  /* Slots used to be resolved strictly one after another: fetch, parse, next.

     Four workers run here, but be clear about what that does and does not buy.
     It does NOT issue four requests at once: bible-fetch-retry-v1.js wraps
     window.fetch and serialises every connector /character call behind a 650ms
     pacer, so request timing is unchanged no matter what call sites do. Three
     concurrent was measured and was far worse -- Bible rate-limits the burst --
     and that is why the pacer exists. See "Refresh behaviour" in HANDOFF.

     What it buys is overlap: one slot's parsing and its de-accented search
     happen while another slot's page is still on the wire, instead of the whole
     lobby waiting on one strictly serial chain. Same requests, same order, less
     dead time between them.

     Progress counts completions rather than starts, because with workers in
     flight "starting number 5" no longer means four are finished. */
  const RESOLVE_LIMIT = 4;

  async function resolveAll(slots, region, io, onProgress) {
    const results = new Array(slots.length);
    let next = 0, done = 0;

    async function worker() {
      for (;;) {
        const i = next++;
        if (i >= slots.length) return;
        results[i] = await resolveSlot(slots[i], region, io);
        done++;
        if (onProgress) onProgress({ index: done - 1, total: slots.length, slot: slots[i], completed: done });
      }
    }

    const workers = [];
    for (let i = 0; i < Math.min(RESOLVE_LIMIT, slots.length); i++) workers.push(worker());
    await Promise.all(workers);
    return results;
  }

  const summarise = results => ({
    total: results.length,
    direct: results.filter(r => r.status === 'direct').length,
    resolved: results.filter(r => r.status === 'resolved').length,
    flagged: results.filter(r => r.status === 'direct-ilvl-mismatch').length,
    needsAttention: results.filter(r => !['direct', 'resolved'].includes(r.status)).length,
    searches: results.reduce((n, r) => n + r.searches, 0)
  });

  window.LostArkLobbyResolve = { looksMissing, prefixFor, resolveSlot, resolveAll, summarise, PREFIX_LEN };
})();
