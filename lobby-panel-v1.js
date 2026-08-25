/* Lobby import — the panel a person actually uses.

   Flow: paste a screenshot, crop it if it is a wide capture, read it, check it
   against the manifest, resolve each name, then review and confirm.

   The review step is not a safety net bolted on afterwards; it is the feature.
   OCR reads roughly five names in eight correctly, and accent-variant squatting
   means a wrong name often resolves to a real different player -- three live
   variants each exist of Dragondeez, Thesickness and Meteorologist. So nothing
   is imported until a person has seen it, and any row the machine is unsure of
   says so rather than guessing.

   Transports are injected so this can be driven from recorded fixtures with no
   network at all. */
(function () {
  'use strict';

  const BIBLE = 'https://lostark.bible/character/';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  function styles() {
    if (document.getElementById('lobby-panel-style')) return;
    const s = document.createElement('style');
    s.id = 'lobby-panel-style';
    s.textContent =
      '.lp{font:13px/1.55 Inter,system-ui,sans-serif;color:#e7edf6}' +
      '.lp-hint{border:2px dashed #3a4760;border-radius:10px;padding:18px;text-align:center;color:#8fa0b8}' +
      '.lp-status{margin:10px 0;color:#9fb0c8;min-height:18px}' +
      '.lp-error{margin:10px 0;padding:10px 12px;border-radius:8px;background:#301418;color:#f0798f;border:1px solid #6b2c38}' +
      '.lp-head{margin:12px 0 6px;font-weight:700}' +
      '.lp table{border-collapse:collapse;width:100%;font-size:12px}' +
      '.lp th,.lp td{border-bottom:1px solid #273040;padding:6px 8px;text-align:left;vertical-align:middle}' +
      '.lp th{color:#9fb0c8;font-weight:600}' +
      '.lp input.lp-name{font:inherit;background:#0d1117;color:#e7edf6;border:1px solid #46516a;' +
        'border-radius:6px;padding:4px 7px;width:100%;max-width:220px}' +
      '.lp-tag{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.03em}' +
      '.lp-ok{background:rgba(110,231,168,.14);color:#6ee7a8}' +
      '.lp-warn{background:rgba(232,196,106,.14);color:#e8c46a}' +
      '.lp-bad{background:rgba(240,121,143,.14);color:#f0798f}' +
      '.lp-actions{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}' +
      '.lp-actions button{font:inherit;font-weight:600;padding:7px 14px;border-radius:7px;cursor:pointer;' +
        'border:1px solid #4a5a80;background:#2c5cc5;color:#fff}' +
      '.lp-actions button[disabled]{opacity:.45;cursor:default}' +
      '.lp-actions .secondary{background:#1a2230;border-color:#46516a;color:#edf2fb}' +
      '.lp-note{color:#8fa0b8;font-size:12px;margin-top:8px}' +
      '.lp-namecell{position:relative}' +
      '.lp-suggest{position:absolute;z-index:40;left:0;top:100%;margin-top:3px;min-width:260px;max-width:340px;' +
        'max-height:230px;overflow:auto;background:#141922;border:1px solid #46516a;border-radius:8px;' +
        'box-shadow:0 10px 26px rgba(0,0,0,.5)}' +
      '.lp-suggest button{display:block;width:100%;text-align:left;font:inherit;font-size:12px;padding:7px 10px;' +
        'background:none;border:0;border-bottom:1px solid #202836;color:#e7edf6;cursor:pointer}' +
      '.lp-suggest button:last-child{border-bottom:0}' +
      '.lp-suggest button:hover{background:#1c2432}' +
      '.lp-suggest .lp-s-meta{color:#8fa0b8;font-size:11px;margin-left:6px}' +
      '.lp-suggest .lp-s-hit{color:#6ee7a8;font-weight:700}' +
      '.lp-suggest .lp-s-empty{padding:8px 10px;color:#8fa0b8;font-size:12px}';
    document.head.appendChild(s);
  }

  /* One row per slot, phrased so the reason is visible rather than implied. */
  const TAGS = {
    direct:                 ['lp-ok',   'read correctly'],
    resolved:               ['lp-ok',   'found by search'],
    'direct-ilvl-mismatch': ['lp-warn', 'item level differs'],
    ambiguous:              ['lp-warn', 'several matches'],
    'single-no-ilvl':       ['lp-warn', 'unverified match'],
    'no-ilvl-match':        ['lp-warn', 'no item level match'],
    none:                   ['lp-bad',  'no such character'],
    'no-name':              ['lp-bad',  'name unreadable'],
    unresolved:             ['lp-bad',  'unresolved'],
    checking:               ['lp-warn', 'checking…'],
    chosen:                 ['lp-ok',   'confirmed']
  };

  function create(container, options) {
    const opts = options || {};
    const io = opts.io;                       /* {search, fetchProfile} */
    const manifest = opts.manifest || null;
    const api = window.LostArkLobbyImport;
    const ocr = window.LostArkLobbyOCR;
    const crop = window.LostArkLobbyCrop;
    const resolver = window.LostArkLobbyResolve;
    const store = window.LostArkLiveGroup;

    styles();
    const root = el('div', 'lp');
    const hint = el('div', 'lp-hint');
    hint.innerHTML = 'Take a screenshot of the party finder and press <b>Ctrl+V</b> here.' +
      '<div style="margin-top:6px;font-size:12px">' +
      'In game: <b>Win+Shift+S</b> to box just the party list, or <b>Alt+PrtScn</b> for the whole window.' +
      '</div>';
    const status = el('div', 'lp-status', 'Waiting for a screenshot.');
    const stage = el('div');
    const body = el('div');
    root.append(hint, status, stage, body);
    container.innerHTML = '';
    container.appendChild(root);

    let rows = [], lobby = null, encounter = null;

    const say = t => { status.textContent = t; };
    const fail = message => {
      body.innerHTML = '';
      body.appendChild(el('div', 'lp-error', message));
      say('');
    };

    async function handle(source) {
      body.innerHTML = '';
      stage.innerHTML = '';
      try {
        let input = source;
        const url = (source instanceof Blob) ? URL.createObjectURL(source) : source;
        const probe = await new Promise((res, rej) => {
          const i = new Image();
          if (typeof url === 'string' && /^https?:/i.test(url)) i.crossOrigin = 'anonymous';
          i.onload = () => res(i); i.onerror = () => rej(Error('That image could not be read.'));
          i.src = url;
        });

        /* A snip of the panel goes straight through. A wide capture needs a
           person to point at the panel: locating it automatically in a real
           full-screen frame does not work, because at native scale the text is
           too small for a first pass to find anything to anchor on. */
        if (crop.needsCrop(probe.naturalWidth)) {
          say(`${probe.naturalWidth}×${probe.naturalHeight} — drag a box around the party list.`);
          const picked = await crop.pickRegion(stage, url);
          stage.innerHTML = '';
          input = picked.canvas;
        }

        say('Reading the screenshot…');
        const read = await ocr.readLobby(input, m => say(`Reading… ${Math.round((m.progress || 0) * 100)}%`));
        lobby = read.lobby;

        encounter = api.findEncounter(manifest, lobby.encounterId);
        const check = api.validate(lobby, encounter);
        if (!check.ok) return fail(check.reason + ' Try a tighter crop around the party list if the read looks wrong.');

        say(`${encounter.label} · ${lobby.region} · resolving ${lobby.slots.length} characters…`);
        rows = await resolver.resolveAll(lobby.slots, lobby.region, io,
          p => say(`Resolving ${p.index + 1} of ${p.total}…`));
        render();
      } catch (e) {
        fail(e.message || String(e));
      }
    }

    function render() {
      body.innerHTML = '';
      const summary = resolver.summarise(rows);
      body.appendChild(el('div', 'lp-head',
        `${encounter.label} — ${encounter.players} players · ${lobby.region}` +
        (lobby.difficulty ? ` · ${lobby.difficulty}` : '')));

      const table = el('table');
      const head = el('tr');
      ['', 'server', 'name', 'item level', 'status'].forEach(h => head.appendChild(el('th', null, h)));
      table.appendChild(head);

      rows.forEach((r, i) => {
        const tr = el('tr');
        tr.appendChild(el('td', null, String(i + 1)));
        tr.appendChild(el('td', null, r.slot.server || '—'));

        /* Editable, and backed by the same search the automatic path uses.
           Typing an accented name is the thing a person cannot easily do -- no
           one reaches for ö or œ on a keyboard -- but picking it out of a list
           is trivial, so the field suggests as you type. Suggestions are
           accent-insensitive, which is the whole point: type "goldensparrow"
           and Góldensparrow comes back. */
        const nameCell = el('td', 'lp-namecell');
        const input = el('input', 'lp-name');
        input.value = r.name || r.slot.name || '';
        input.setAttribute('autocomplete', 'off');
        nameCell.appendChild(input);

        const tag = el('td');
        const tagSpan = el('span', 'lp-tag');
        tag.appendChild(tagSpan);

        const paintTag = () => {
          const [cls, label] = TAGS[r.status] || ['lp-warn', r.status];
          tagSpan.className = 'lp-tag ' + cls;
          tagSpan.textContent = label;
        };
        paintTag();

        let menu = null;
        const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };

        /* Every route to a name ends here -- picked from the list or typed by
           hand -- because a name on its own is useless. Without the profile
           there is no CP, class or build, so the character cannot be scored and
           the optimizer silently produces nothing. Typing a name used to skip
           this and import a row with no profile at all. */
        const adopt = async raw => {
          const name = String(raw || '').trim();
          closeMenu();
          if (!name) {
            r.name = null; r.profile = null; r.status = 'no-name';
            paintTag(); update(); return;
          }
          input.value = name;
          r.name = name;
          r.edited = true;
          r.status = 'checking';
          paintTag(); update();

          let profile = null;
          try { profile = await io.fetchProfile(name, lobby.region); } catch { profile = null; }
          if (profile && !resolver.looksMissing(profile)) {
            r.profile = profile;
            /* A mismatch is still worth importing -- Bible's data can lag a gear
               change by days -- but it should say so rather than pass silently. */
            r.status = api.ilvlMatches(profile.ilvl, r.slot.ilvl) ? 'chosen' : 'direct-ilvl-mismatch';
          } else {
            r.profile = null;
            r.status = 'none';
          }
          paintTag(); update();
        };

        const choose = candidate => adopt(candidate.name);

        const suggest = async () => {
          const q = input.value.trim();
          closeMenu();
          if (q.length < 3) return;
          let list = [];
          try { list = await io.search(q, lobby.region) || []; } catch { list = []; }
          menu = el('div', 'lp-suggest');
          if (!list.length) {
            menu.appendChild(el('div', 'lp-s-empty', 'No matches. Character search is unavailable.'));
          } else {
            list.slice(0, 10).forEach(c => {
              const b = el('button');
              b.type = 'button';
              b.appendChild(el('span', null, c.name));
              /* The candidate whose item level matches this row is almost
                 certainly the right person; say so rather than making someone
                 compare numbers by eye. */
              const hit = api.ilvlMatches(c.itemLevel, r.slot.ilvl);
              const meta = el('span', 'lp-s-meta' + (hit ? ' lp-s-hit' : ''),
                (c.classId ? c.classId.replace(/_/g, ' ') + ' · ' : '') +
                (Number.isFinite(Number(c.itemLevel)) ? api.round2(c.itemLevel) : '?') +
                (hit ? '  ← matches this row' : ''));
              b.appendChild(meta);
              b.addEventListener('click', () => choose(c));
              menu.appendChild(b);
            });
          }
          nameCell.appendChild(menu);
        };

        let timer = null;
        input.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(suggest, 250);   /* one request per pause, not per keystroke */
        });
        input.addEventListener('blur', () => setTimeout(closeMenu, 150));
        input.addEventListener('change', () => adopt(input.value));

        tr.appendChild(nameCell);
        tr.appendChild(el('td', null, r.slot.ilvl));
        tr.appendChild(tag);
        table.appendChild(tr);
      });
      body.appendChild(table);

      const actions = el('div', 'lp-actions');
      const importBtn = el('button', null, `Use this group (${encounter.players})`);
      const cancel = el('button', 'secondary', 'Cancel');
      actions.append(importBtn, cancel);
      body.appendChild(actions);

      const note = el('div', 'lp-note');
      note.textContent = summary.needsAttention
        ? `${summary.needsAttention} of ${summary.total} need a look. Correct any name and press Enter.`
        : `All ${summary.total} resolved. ${summary.searches} searches used.`;
      body.appendChild(note);

      /* A row needs a profile, not just a name. Importing a character with no
         profile puts something unscoreable into the roster and the optimizer
         quietly produces nothing -- which looks like the button is broken. */
      const ready = () => rows.every(r => r.name && r.profile);
      importBtn.disabled = !ready();
      importBtn.addEventListener('click', confirm);
      cancel.addEventListener('click', () => { body.innerHTML = ''; say('Cancelled.'); });

      function update() {
        importBtn.disabled = !ready();
        const missing = rows.filter(r => !r.profile).length;
        note.textContent = missing
          ? `${missing} of ${rows.length} still need a character that exists on Bible. Correct the name and press Enter.`
          : `All ${rows.length} confirmed. Ready to import.`;
      }
    }

    /* Same record shape the Main Group uses, so every existing layer -- cards,
       spec authority, both optimizers -- reads these without changes. */
    function confirm() {
      const chars = rows.map(r => {
        const name = r.name;
        const region = lobby.region;
        return {
          id: `${region}-${name}`.toLowerCase(),
          url: BIBLE + encodeURIComponent(region) + '/' + encodeURIComponent(name),
          region, name,
          profile: r.profile || null,
          lobbyParty: r.lobbyParty || null      /* captured now, displayed later */
        };
      });
      store.replace(chars, {
        encounterId: lobby.encounterId,
        label: encounter.label,
        players: encounter.players,
        region: lobby.region,
        difficulty: lobby.difficulty,
        importedAt: new Date().toISOString()
      });
      store.setSource('live');
      say(`${chars.length} characters imported. The dashboard is showing the live group.`);
      body.innerHTML = '';
      if (typeof opts.onImport === 'function') opts.onImport(chars);
    }

    const detach = ocr.onPasteImage(handle);
    return { handle, destroy: detach, rowsFor: () => rows, lobbyFor: () => lobby };
  }

  window.LostArkLobbyPanel = { create };
})();
