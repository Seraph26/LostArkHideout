/* Lobby import — read a party-finder screenshot and turn it into a roster.

   Nothing here touches the Main Group. The live group gets its own storage key;
   see the note in HANDOFF about never borrowing `lostark-hideout-private-v3` as
   scratch space.

   This file is pure logic on purpose: parsing, translation and candidate
   selection have no DOM and no network, so they can be tested offline against
   recorded fixtures. OCR, fetching and UI live in later modules that call in
   here. */
(function () {
  'use strict';

  /* Server -> Bible region token. Additive: retired servers stay forever,
     because a screenshot taken before a merge still names them, and every
     Aug/Sep 2026 merge is intra-region so no entry ever changes region.
     Verified against Bible's own region selector, which offers exactly NA and
     CE. Nearest cross-region pair is Nineveh/Gienah at edit distance 4, double
     the d<=2 match window -- re-check that margin if this list ever changes. */
  const SERVERS = {
    Inanna: 'NA', Balthorr: 'NA', Nineveh: 'NA', Luterra: 'NA',
    Vairgrys: 'NA', Thaemine: 'NA', Brelshaza: 'NA',
    Arcturus: 'CE', Elpon: 'CE', Gienah: 'CE', Ortuus: 'CE', Ratik: 'CE'
  };

  /* The party finder names the in-game act; the manifest uses the community
     name. Only content the optimizer actually scores is listed -- a lobby for
     anything else is refused rather than half-imported, which is what lets
     party size come from the manifest by one path instead of being counted off
     the screenshot. Older acts (Overture/Echidna, Acts 1-3) are out of scope.
     Longer term this belongs in raid-encounters.json as an `ingameNames` field
     so a new raid is one file to edit, not two. */
  const INGAME_RAIDS = {
    'salvation bell tower': 'horizon-cathedral',
    'sanctum of frost': 'serca',
    'final day': 'kazeros',
    'fortress of destruction': 'armoche',
    /* The manifest id carries the [EXTREME] prefix for this one, so mapping to
       "brelshaza" produced brelshaza-g1/g2 and matched nothing. Verified
       against a live lobby: "[Extreme Nightmare] Sennir Basin". */
    'sennir basin': 'extreme-brelshaza'
  };

  /* Extreme raids run a single fight, but the party finder still labels it
     Gate 1 while the manifest numbers it g2 (it is the normal raid's second
     gate). Pin the gate for these rather than trusting the lobby, otherwise
     every extreme lobby resolves to an id that does not exist. */
  const FIXED_GATE = { 'extreme-brelshaza': 2 };

  /* The one place the encounter id is built. Anything that needs to rebuild it
     after merging passes must come through here, or the pinned gate above gets
     quietly undone. */
  const effectiveGateFor = (raid, gate) => (raid && FIXED_GATE[raid]) ? FIXED_GATE[raid] : gate;
  const encounterIdFor = (raid, gate) => {
    const g = effectiveGateFor(raid, gate);
    return raid && g ? `${raid}-g${g}` : null;
  };

  const lower = s => String(s || '').toLowerCase();

  function lev(a, b) {
    a = lower(a); b = lower(b);
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = [], cur = [];
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++)
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      [prev, cur] = [cur, prev];
    }
    return prev[n];
  }

  /* Bible's character search ignores diacritics, so the reliable query is the
     de-accented name -- which matters because OCR gets the base letter right
     and the mark wrong (it read Góldensparrow as Göldensparrow). NFD splits a
     letter from its combining mark; the explicit pairs cover the ones NFD does
     not decompose. */
  const LIGATURES = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ł': 'l', 'þ': 'th', 'ð': 'd' };
  function deaccent(name) {
    return String(name || '')
      .replace(/[ßæœøđłþð]/gi, ch => {
        const rep = LIGATURES[ch.toLowerCase()] || ch;
        return ch === ch.toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
      })
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /* Item levels are always NNNN.NN, so a dropped decimal point is recoverable
     exactly -- OCR returned 174000 for 1740.00 and 177583 for 1775.83. */
  function repairIlvl(token) {
    const t = String(token || '');
    if (/^[0-9]{4}\.[0-9]{2}$/.test(t)) return t;
    const digits = t.replace(/[^0-9]/g, '');
    if (digits.length === 6 && digits[0] === '1') return digits.slice(0, 4) + '.' + digits.slice(4);
    return null;
  }

  /* Bible's rendered page truncates item level (1739.1661 shows as 1739.16)
     while the game rounds it (1739.17). Reading the raw float out of the page
     payload and rounding makes the two agree exactly, so this is an equality
     test rather than a tolerance -- a tolerance window is what would let a
     near-miss impostor through, and impostors are common: three accent
     variants of Thesickness all exist on the same server. */
  const round2 = n => Math.round(Number(n) * 100) / 100;
  const ilvlMatches = (bibleValue, lobbyValue) =>
    Number.isFinite(Number(bibleValue)) && round2(bibleValue) === round2(lobbyValue);

  function nearestServer(token) {
    const t = String(token || '');
    if (t.length < 4) return null;            /* every server name is 5+ chars */
    let best = null, bd = Infinity;
    for (const s of Object.keys(SERVERS)) {
      const d = lev(t, s);
      if (d < bd) { bd = d; best = s; }
    }
    return bd <= 2 ? best : null;
  }

  /* Eight slots vote, and a wrong server still lands within the window, so this
     survives OCR noise that destroys names outright. */
  function regionFor(servers) {
    const votes = {};
    for (const s of servers) {
      const r = SERVERS[s];
      if (r) votes[r] = (votes[r] || 0) + 1;
    }
    const ranked = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);
    return ranked.length ? { region: ranked[0], votes } : { region: null, votes };
  }

  const clean = t => String(t || '')
    .replace(/^[^0-9A-Za-zÀ-ɏ]+/, '')
    .replace(/[^0-9A-Za-zÀ-ɏ.]+$/, '');

  /* "[Hard] Final Day" / "[Nightmare] Sanctum of Frost". Difficulty is read but
     not used for matching: the manifest carries it unevenly (Horizon Cathedral
     and Serca have none, Kazeros and Armoche say Hard, only Brelshaza has
     Extreme Nightmare) while lobbies say Normal/Hard/Nightmare. */
  /* Strip everything that is not a letter, digit or space so OCR debris around
     the title cannot prevent a match -- a real capture produced "Sennir Basin |"
     and an exact key lookup rejected it. */
  const normalise = s => lower(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  /* Match on containment rather than equality, because the title line also
     carries the difficulty and whatever the OCR added. */
  function raidIn(line) {
    const n = normalise(line);
    if (!n) return null;
    for (const key of Object.keys(INGAME_RAIDS))
      if (n.includes(key)) return { key, raid: INGAME_RAIDS[key] };
    return null;
  }

  function parseTitle(line) {
    const hit = raidIn(line);
    if (!hit) return null;
    /* Difficulty is whatever sits in the leading bracket, when there is one.
       It is read for display and for telling apart two entries that share a
       raid and gate; it is not required to identify the encounter. */
    const m = String(line || '').match(/[\[(]\s*([A-Za-z][A-Za-z ]*?)\s*[\])]/);
    return { difficulty: m ? m[1].trim() : null, act: hit.key, raid: hit.raid };
  }

  const parseGate = line => {
    const m = String(line || '').match(/\bgate\s*([0-9])\b/i);
    return m ? Number(m[1]) : null;
  };

  /* The panel alternates a "server + item level" row with a "names" row, two
     columns each, so a slot is column i of a consecutive pair. Anchor on the
     two machine-checkable things -- a server inside the fuzzy window and an
     item level -- then take names positionally. Icon glyphs land as 1-3 char
     noise ("ws", "Q", "(oy)"); real names are longer. */
  function parseSlots(text) {
    const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);

    /* Classify each line once. Names are anything long enough that is not
       itself a server or an item level, so a stray server on a names line
       cannot be mistaken for a player. */
    const scan = lines.map(line => {
      const toks = line.split(/\s+/);
      const servers = [], ilvls = [], names = [];
      for (const tok of toks) {
        const c = clean(tok);
        if (!c) continue;
        const il = repairIlvl(c);
        if (il) { ilvls.push(il); continue; }
        const s = nearestServer(c);
        if (s) { servers.push(s); continue; }
        const n = c.replace(/\.+$/, '');
        if (n.length >= 4) names.push(n);
      }
      return { servers, ilvls, names };
    });

    const slots = [];
    for (let i = 0; i < scan.length; i++) {
      const row = scan[i];
      /* A panel row is one or two columns, each an item level with a server
         beside it. Requiring the two counts to match discarded the entire row
         whenever a single server misread, so pair by position and allow a
         server to be missing -- the region vote has the other rows to work
         with. Item levels anchor the row because their shape is specific
         enough not to appear by accident. */
      if (!row.ilvls.length || row.ilvls.length > 2) continue;

      /* Names sit on the following line, but OCR occasionally emits a stray
         line between the two, and giving up after one line lost half the rows
         on a noisy read. Look ahead a little, stopping if the next row starts. */
      let names = null;
      for (let j = i + 1; j < Math.min(scan.length, i + 3); j++) {
        if (scan[j].ilvls.length) break;
        if (scan[j].names.length) { names = scan[j].names; i = j; break; }
      }
      for (let k = 0; k < row.ilvls.length; k++)
        slots.push({ server: row.servers[k] || null, ilvl: row.ilvls[k], name: (names && names[k]) || null });
    }
    return slots;
  }

  function parseLobby(text) {
    const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
    let title = null, gate = null, rawTitle = null;
    for (const line of lines) {
      if (!title) { const t = parseTitle(line); if (t) title = t; }
      /* Keep whatever looked like a heading even when it names content we do
         not cover, so the refusal can say which raid it was rather than
         claiming the title was unreadable. */
      if (!rawTitle) {
        const m = line.match(/[\[(]\s*[A-Za-z][A-Za-z ]*\s*[\])]\s*(.+)$/);
        if (m && m[1].trim().length > 3) rawTitle = m[1].trim();
      }
      if (gate === null) { const g = parseGate(line); if (g !== null) gate = g; }
      if (title && gate !== null) break;
    }
    const slots = parseSlots(text);
    const { region, votes } = regionFor(slots.map(s => s.server));
    const raid = title ? title.raid : null;
    /* `gate` stays as the lobby reported it; the pinned value is what names the
       encounter, so an extreme lobby saying Gate 1 still finds its entry. */
    return {
      difficulty: title ? title.difficulty : null,
      act: title ? title.act : rawTitle,
      raid,
      encounterId: encounterIdFor(raid, gate),
      gate, effectiveGate: effectiveGateFor(raid, gate),
      region, regionVotes: votes, slots
    };
  }

  /* raid-encounters.json splits entries across three arrays: `raids`,
     `optional` (Armoche) and `events` (the extreme raids). Reading only
     `raids` loses Armoche and every extreme lobby -- which is precisely the
     content this importer is most likely to meet -- so always look in all
     three. */
  const ENCOUNTER_GROUPS = ['raids', 'optional', 'events'];
  function allEncounters(manifest) {
    const out = [];
    for (const group of ENCOUNTER_GROUPS)
      if (Array.isArray(manifest && manifest[group])) out.push(...manifest[group]);
    return out;
  }
  const findEncounter = (manifest, id) =>
    id ? allEncounters(manifest).find(e => e && e.id === id) || null : null;

  /* Refuse rather than guess. Party size comes from the manifest entry, so an
     unrecognised act has no size to check against -- which is exactly why
     unsupported content is turned away instead of half-imported. */
  function validate(lobby, encounter) {
    if (!lobby.act) return { ok: false, reason: 'Could not read the lobby title.' };
    if (!lobby.raid) return { ok: false, reason: `"${lobby.act}" is not content this optimizer covers.` };
    if (!lobby.effectiveGate) return { ok: false, reason: 'Could not read which gate this lobby is for.' };
    if (!encounter) return { ok: false, reason: `No encounter found for ${lobby.encounterId}.` };
    if (!lobby.region) return { ok: false, reason: 'Could not identify the region from the server names.' };
    const want = Number(encounter.players);
    const got = lobby.slots.filter(s => s.name).length;
    if (got !== want) return { ok: false, reason: `${encounter.label} needs ${want} players; the screenshot shows ${got}. Only full lobbies can be imported.` };
    return { ok: true };
  }

  /* Search narrows, item level decides. Collisions are the norm rather than the
     exception -- Dragondeez, Thesickness and Meteorologist each have three live
     accent variants -- so a single candidate is only accepted when nothing else
     matched, and never when two survive. */
  /* Item level is the identity oracle, but it is only an oracle while Bible is
     current. Kingqi sat at 1732.50 there and 1736.67 in the lobby -- he had
     gear-upped since Bible last indexed him -- so every candidate failed the
     equality test and a character who plainly existed came back as "no such
     character".

     When item level cannot decide, fall back to what the OCR error actually
     looks like: a single wrong character. `Kinggi` is one substitution from
     `Kingqi`. Only a lone candidate within one edit is accepted, and the caller
     flags the row rather than treating it as confirmed -- accent-variant
     squatting is normal here, so a near-miss name is a strong suggestion, never
     proof. Two candidates equally close means we know nothing and say so. */
  /* One wrong character is common enough that several real players can sit one
     edit from the same misreading: `Kinggi` is one from both `Kingqi` and
     `Kinggs`. Item level breaks that tie without being trusted as an equality
     test -- Kingqi was 4.17 from the lobby figure and Kinggs 26.67.

     The gap is not Bible being stale, it is **Bible's search index lagging its
     own profile pages**: search reported Kingqi at 1732.50 while his profile
     said 1736.67, which is the lobby figure exactly. So item level from search
     is a proximity hint, and item level from a profile is still the oracle --
     which is why the winner is confirmed by fetching the profile, and usually
     comes back matching exactly.

     The lag only leaves the index *behind*, and only by what a character gains
     between indexings, so a candidate tens of levels away is a different person
     rather than an out-of-date record. MAX_DRIFT bounds that, and
     MIN_SEPARATION insists the winner is clearly nearest instead of narrowly
     luckier. Fail closed: anything less clear returns ambiguous and the row goes
     to the person. */
  const MAX_DRIFT = 40;
  const MIN_SEPARATION = 10;

  function pickByName(candidates, readName, lobbyIlvl) {
    const list = Array.isArray(candidates) ? candidates : [];
    const want = deaccent(String(readName || '')).toLowerCase();
    if (!want) return { status: 'none' };

    const near = list.filter(c => lev(deaccent(String(c.name || '')).toLowerCase(), want) <= 1);
    if (!near.length) return { status: 'none' };
    if (near.length === 1) return { status: 'name-matched', candidate: near[0] };

    const target = Number(lobbyIlvl);
    if (!Number.isFinite(target)) return { status: 'ambiguous', candidates: near };

    const ranked = near
      .map(c => ({ c, diff: Math.abs(round2(c.itemLevel) - round2(target)) }))
      .filter(x => Number.isFinite(x.diff))
      .sort((a, b) => a.diff - b.diff);

    if (!ranked.length) return { status: 'ambiguous', candidates: near };
    const [best, next] = ranked;
    if (best.diff <= MAX_DRIFT && (!next || next.diff - best.diff >= MIN_SEPARATION))
      return { status: 'name-matched', candidate: best.c };
    return { status: 'ambiguous', candidates: near };
  }

  function pickCandidate(candidates, lobbyIlvl) {
    const list = Array.isArray(candidates) ? candidates : [];
    const hits = list.filter(c => ilvlMatches(c.itemLevel, lobbyIlvl));
    if (hits.length === 1) return { status: 'matched', candidate: hits[0] };
    if (hits.length > 1) return { status: 'ambiguous', candidates: hits };
    if (list.length === 1) return { status: 'single-no-ilvl', candidate: list[0] };
    if (list.length) return { status: 'no-ilvl-match', candidates: list };
    return { status: 'none' };
  }

  window.LostArkLobbyImport = {
    SERVERS, INGAME_RAIDS, FIXED_GATE, effectiveGateFor, encounterIdFor,
    lev, deaccent, repairIlvl, round2, ilvlMatches,
    nearestServer, regionFor,
    parseTitle, parseGate, parseSlots, parseLobby,
    allEncounters, findEncounter, ENCOUNTER_GROUPS,
    validate, pickCandidate, pickByName
  };
})();
