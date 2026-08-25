# LostArkParty — handoff

Paste this whole file into a new chat to pick up where we left off.

## Basics

- Repo `Seraph26/LostArkParty`, live at https://seraph26.github.io/LostArkParty/ (GitHub Pages from `main`; push = deploy, ~30–60s).
- **Renamed from `LostArkHideout` on 2026-08-23.** The old Pages URL now 404s — GitHub does not
  redirect project Pages, so any link made before that date is dead. Two things were checked
  after the rename and both held: Cloudflare **Workers Builds followed it** (the GitHub app
  tracks repository ids, not names — verified by a version bump reaching `/health` 60s after a
  push), and profile fetching was unaffected because an `Origin` header is scheme+host only, so
  the path never appears in `ALLOWED_ORIGINS`. Rosters also survived: `localStorage` is keyed by
  origin, not path. If the site is ever moved to a *different host* — a custom domain, Cloudflare
  Pages — none of that holds, and `ALLOWED_ORIGINS` must be updated or every profile fetch 403s.
- Local clone: `C:\Users\<user>\Desktop\ClaudeLA`. Working tree should be clean and in sync.
- **Never borrow the Main Group key as scratch space.** `refreshCandidateBuilds()` used to
  overwrite `lostark-hideout-private-v3` with the New Additions so the build refresher — which
  only read that key — would fetch their builds, then restore it. Any interruption in that
  window (reload, closed tab, rejected promise) left the Main Group permanently replaced by the
  candidates, and importing a share link triggered it every time. Fixed on 2026-08-23 by giving
  `BuildProfilesV3.refresh(list)` an optional character list. If you need builds for some other
  set, pass a list; do not touch stored state.
- **Two things keep the old "Hideout" name on purpose.** `localStorage` keys are all
  `lostark-hideout-*` (21 of them) — renaming those would orphan every existing user's roster,
  so they stay forever. `window.LostArkHideoutClassData` / `LostArkHideoutClassAuthority` are
  cross-module globals; renaming them is a refactor with no user-visible benefit. Neither is a
  leftover to "finish".
- Every script is loaded from `index.html` with a `?v=` cache-bust. **Bump the version whenever you edit a file** or the change will not reach the browser. Two scripts (`candidate-roster-v1.js`, and others) are loaded dynamically from `visits.js` — bump there.

## Working style that matters here

This project broke repeatedly in the past because fixes were layered as new
wrapper/bridge scripts on top of working code. Rules that still apply:

- Fix the narrowest path. Don't refactor a working subsystem while fixing an unrelated one.
- Prefer a one-line gate on an existing handler over a new file.
- **Diagnose before coding.** Instrument the real page and prove where it breaks. Almost every bug this session was different from what it looked like.
- Verify with real Bible data, not assumptions, and report measured numbers.

## Local testing (important gotchas)

- **No `node`, `npx`, or working `python`.** Serve with a PowerShell `System.Net.HttpListener` script (there is one in the session scratchpad; recreate if lost) on `http://localhost:8777`.
- **Never edit `index.html` through PowerShell `Set-Content`** — it adds a BOM and double-encodes every non-ASCII character (this actually happened; `·` became `Â·` and em dashes broke). Use `sed`/`perl`, which are byte-preserving.
- The in-app browser tab reports `document.hidden === true`, so **`requestAnimationFrame` never fires** and `setTimeout` is clamped to ~1s. Shim it per test:
  `window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16)`
  Several modules gate DOM repair behind rAF with a `queued=true` latch, so once rAF stalls they never repair again in that tab. **Card text looking stale in tests is usually this, not a real bug** — confirm by calling the logic directly.
- Screenshots fail ("pane not displayed"); drive the page with `javascript_tool`.
- Seed `lostark-hideout-private-v3` then **reload** — `app-fixed.js` reads state at init and will overwrite localStorage written after load.

## Data / Bible facts (hard-won)

- WebFetch gets 403 on lostark.bible. The in-app browser loads it fine. The app's own connector:
  `https://lostark-bible-connector.seraph0226.workers.dev/character?url=<encoded bible url>`
- **The connector is origin-locked.** `/character`, `/raid-stats` and `/visits` answer only
  `https://seraph26.github.io` and `http://localhost:8777`; anything else gets 403 and the app
  reports a failed refresh. `127.0.0.1:8777` is a *different origin* and is refused — test on
  `localhost`. If the site URL ever changes (repo/account rename, custom domain, Cloudflare
  Pages), add it to `ALLOWED_ORIGINS` in `worker/src/index-support-v2.js` and push, or profile
  fetching silently stops. `/health` stays open.
- **`git push` deploys the worker too — no manual paste needed.** Cloudflare Workers Builds is
  connected to the repo and deploys `worker/src/index-support-v2.js` (per the root
  `wrangler.toml`) on every push to `main`. **Measured: live ~80 seconds after the push**, with a
  matching "Workers Builds: lostark-bible-connector" check-run on the commit in GitHub. An
  earlier version of this file claimed deploys were manual — that was an assumption from there
  being no `node`/`wrangler` locally, and it was wrong; the build runs on Cloudflare's side.
  Check what is actually live with `curl -s <worker>/health`, which reports `WORKER_VERSION` —
  bump that constant whenever the file changes. Note the consequence: a bad worker commit is in
  production in about a minute, with no review step.
- Bindings (`VISITS`, `SHARES`) live on the Worker, not in the deployed code, and **survive an
  auto-deploy** — verified after one. They are configured in the Worker's **Bindings** tab (a
  sibling of Settings, not inside it). `worker/wrangler.jsonc` points at a different entry file
  (`src/index.js`) than the root `wrangler.toml` — the root file is the one that governs.
- **Short share links.** A full roster's `#s=` link runs past 2,000 characters, which Discord's
  message limit rejects, so the worker also offers `POST /share` (store the encoded snapshot in
  KV, 30-day TTL, binding `SHARES`, id `3d2236be086d46fbb4e2cdb70c7d8ae8`) and `GET /share/:id`.
  `copyShare()` in `share-and-reset-v1.js` tries this first and silently falls back to the long
  `#s=` link on any failure, so nothing breaks if the worker is out of date. `SHARES` must stay bound in the
  Worker's **Bindings** tab or `/share` fails with a 500 even though the code is correct. This is the one deliberate exception to
  "nothing ever reaches a server": an `#id=` link's snapshot sits in Cloudflare KV for 30 days,
  never logged, never tied to an account. Old `#s=` links are unaffected.
- **The visit counter counts browser sessions, not page loads and not people.** `visits.js` gates
  the counting call behind `sessionStorage`, so a refresh does not increment; later loads in the
  same session call `/visits?peek=1`, which reads without writing. Two tabs open at once count
  twice, and a private window always counts as new. The tally restarted under the KV key
  `unique_visits_live_v1`. Two dead keys remain in the namespace and can be deleted whenever:
  `page_visits` (the old page-load tally, 763, nearly all testing) and `unique_visits_v1` (the
  first session-based tally, reset on 2026-08-23 to drop our own test hits). Resetting is done
  by pointing `VISIT_KEY` at a fresh key and pushing, since there is no per-key write tool.
- **CP** = the right-hand Combat Power panel, priority *Estimated Raid Loadout → Current Loadout (Raid)*, never Chaos Dungeon. In the payload that is `combatPower:{id:N,score:X}`. The header `≈` figure is `maxCombatPower`/`estimatedMaxCombatPower` = **best ever**, and the **roster tab shows that max too** — do not source CP from it (Mattnx: panel 5434.14 vs roster/header 5755.2).
- **Class** comes from the class chip Bible renders in the header (a short `<p>`). The `classId` map is hand-maintained and has drifted twice: `holyknight_female` = Valkyrie (not Paladin), `alchemist` = Wildsoul (not Alchemist), `dragon_knight` = Guardianknight.
- **Specialization** = an Ark Passive **Enlightenment** node name. Its tier position varies by class (Seraphh T1, Diamarté T2, Hetawl T5), so store all node names and match them against the spec rules. `parseProfile` stores `enlightenment` for this.
- **Class icons cannot be sourced from Bible** — the character page has no class emblem, only UI chrome, item icons and character art. A new class needs a manual entry in `class-data-v1.js` (`ICON_FILES`) plus `CLASS_IDS` in `class-authority-v1.js`.
- SVGs served to `<img>` **must** declare `xmlns="http://www.w3.org/2000/svg"`, and `fill="currentColor"` cannot inherit there (this is why `guardianknight-icon.svg` never rendered).
- Tripods are bare indices per skill id, no names. Summoner's Shurdi is skill `20160`; the mana tripod is line 3, choice 2 → `tripods[2] === 2`.
- Bible ranks a character against `<Class>` or `DPS <Class>` ("Top 27.6% of 1800-1810 Bards" vs "Top 98.1% of 1780-1790 DPS Bards"). That follows the *allocated class engraving*.

## Architecture: who owns what

- **`#optimizeBtn`**: General mode → `general-party-optimizer-v2.js` (fires on **pointerdown**); Raid Specific → `encounter-optimizer-v1.js` (fires on **click**). `optimizer-v17.js` no longer binds click (dead code) but its `wire()` drag/drop and initial `render()` are still live.
  Capture-phase listeners on the button run before bubble ones — General's shield used to `stopImmediatePropagation()` unconditionally and swallowed everything.
- **Eligible pool** = Main Group + un-hidden New Additions, via `window.LostArkCandidateRoster.getEligible()`. Both optimizers use it. Hidden = excluded.
- **Shared model** (added so raid stops maintaining a second one):
  - `window.LostArkGeneralModel = {score, hoverHtml, info, role, resolve, member, pos, partySynergyLabels}` from `general-party-optimizer-v2.js`.
    `member(c,s,p,extraClass)` renders the character card — **Raid Specific renders through it**, so the two
    modes cannot drift apart. Do not reintroduce a raid-side card template.
  - `window.LostArkSpecAuthority = {specFor, className}` from `ui-fixes-clean.js`
  Raid uses both for its card labels and hovers. The General model's support uptime already consults the selected encounter, so its numbers are encounter-aware.
- **Party size**: `raid-encounters.json` carries `players` (4 or 8). Horizon Cathedral and Serca are 4-player. General has its own `#generalFormatSelect` (8-player / 4-player), hidden while Raid Specific is selected, persisted in `lostark-hideout-general-format-v1`.

## Live Lobby Import

Paste a party-finder screenshot → OCR → each character resolved on Bible → the
lobby loads as a temporary roster **in place of** the Main Group, which is never
written to. Full detail, including the OCR and resolution findings, is in
`LOBBY-IMPORT-HANDOFF.md`. What the rest of the app needs to know:

- **The roster seam is `LostArkLiveGroup.resolveRoster(list)`**: give it the
  Main-Group-plus-New-Additions list and it hands back the live lobby when the
  source is live, or the list untouched otherwise. `candidate-roster-v1.js`
  `allCharacters()` goes through it, so `getAll()`/`getEligible()` are already
  live-aware and both optimizers came along for free.
  **On the repair path use `resolveRoster()` directly, not `getAll()`** —
  `getAll()` normalises New Additions and can write to localStorage.
- **Build profiles are not automatic.** They are keyed by Bible URL and were only
  ever built for the Main Group. An imported lobby with none is not merely
  missing its spec label — `encounter-scoring-v2.js` and both optimizers read the
  same cache, so it scores with no engravings, no positional and no Ark Passive.
  `lobby-wiring-v1.js` calls `BuildProfilesV3.refresh(missing)` for exactly the
  members absent from the cache, once each.
- **Anything that caches a map keyed off localStorage signatures** must include
  the live-group and source keys, *and* must not cache at all while a live lobby
  is stored but the lobby modules have not loaded yet — nothing in the signature
  changes when they arrive, so an early pass otherwise pins the wrong map for the
  life of the page. This is what `stateProfiles()` in `ui-fixes-clean.js` does.

## Render loops — read before touching any display layer

Layers observe `#suggestedParties` (or `body`) and write back into it. Unguarded this self-feeds: idle churn was **~10,480 DOM mutations every 2 seconds**, which caused the Firefox slowdown, laggy swaps and hover text rewriting itself. Now **0**.

Any observer-driven layer must: (1) ignore mutations from inside its own output, (2) suppress reentry while rendering, (3) **never assign `textContent`/`className` without checking the value actually differs** — an identical assignment still fires a mutation record.
Guarded so far: `general-party-metrics-v1`, `hover-summary-v6`, `general-hover-simple-v1`, `support-uptime-tooltip-v1`.
Verify with an idle probe: observe `document.body` for 2s untouched; it must report 0.

Also: `text()`/`build()` in the General optimizer and `build()`/`info()` in the encounter optimizer are memoised. Before that, optimize took ~15s and a swap 6.7s; now ~200ms and ~60ms.

## Refresh behaviour

- Connector calls are **serialised** with a 650ms gap. Three concurrent was tried and is much worse (Bible rate-limits the burst; 10 characters took 107s vs ~21s serial). Fewer requests is the only real lever.
- Profiles fetched within **60s** are skipped (Main Group and New Additions), reported in the status. **Shift-click Refresh Profiles forces all.** This window was 10 minutes and silently skipped deliberate refreshes after a respec — don't lengthen it.
- New Additions cap is **8** (`MAX` in `candidate-roster-v1.js`); the counter reads from that constant.

## Dashboard controls (`share-and-reset-v1.js`)

- **Share link**: snapshot gzipped into the URL **fragment** (never sent to a server). ~960 chars for 8 characters. Do not carry `retrievedAt` (would make the recipient's refresh skip) and **carry `enlightenment`, not a resolved spec string** — freezing the string made shared dashboards show a stale spec forever.
- **Clear All**, **Save Dashboard** (survives Clear All, restore panel on the right).
- **Definitions** panel (`definitions-v1.js`) — plain-language explanation; its worked example is read live from the rendered hover cards, so it follows the current roster.

## Header and copy (index.html + `party-v5.css`)

- The topbar is `<h1>Lost Ark Party</h1>` followed by `<p class="topbar-tagline">`. There is no
  longer an `.eyebrow` above the title — that small-caps "RAID OPTIMIZER" line was removed on
  2026-08-23 and its words moved into the tagline.
- **The tagline's two-line break is done with width, not a `<br>`.** At 13px Inter the first
  line ("…knowing both the boss fight") measures 452px and adding the next word needs 477px, so
  `.topbar-tagline{max-width:465px}` makes the browser break there by itself. A forced `<br>`
  was tried first and looked right on a wide window, but left an orphan on phones **and on
  narrow desktop windows**, because the first line stopped fitting once the buttons took their
  share of the topbar. Do not reintroduce one. If the sentence is reworded, re-measure: the
  usable range is (width of intended line 1) to (that width + the next word).
- Below 700px the tagline drops to 12px and `max-width:none`, wrapping naturally to three lines.
- Both "paste a character URL" captions carry an `Open Bible ↗` link
  (`.bible-link-btn`, `target="_blank"`, `rel="noopener noreferrer"` — keep the rel, or the
  opened tab gets a `window.opener` handle back into the dashboard).
- `index.html` is **not** cache-busted the way the scripts are, so a copy change needs a hard
  refresh to show up. Edit it with `sed`/`perl` only, and check for mojibake afterwards —
  `grep -c "Â\|â€" index.html` should be 0. The `↗` glyph is the thing most likely to break.

## Measured model proportions (used in Definitions)

Own CP ~60%, party synergy ~30%, support impact ~10%, build completeness <1%.
Supports score 0 contribution individually by design — their value is inside the DPS numbers.

## Scoring decisions the user made

- What a character **gives** scales with their CP relative to the mean for their role (sqrt, clamped ±15%) — applies to both DPS synergy and support buffs.
- General adopted the raid model's positional support uptime (Paladin/Valkyrie hold up better than Bard/Artist in mixed-position parties).
- Support **ally-enhancement affixes** (Ally Damage / Ally Atk. Power Enhancement) scale the buffs they hand out.
- **Mana** graded by playstyle, not class name (the old test matched the Ark Passive node name "boundless" and gave a Glaivier full mana need):
  Reflux Sorceress 1.45 · Striker Esoteric Flurry 1.35 · Wildsoul 1.35 · Scrapper 1.25 · Bard 1.20 · Striker other 1.00 · **default 0.60** · Summoner / Igniter / Artillerist / Gunlancer 0.35.
  **Summoner 0.35 is the hinge** for pairing a Summoner with a Bard vs a Valkyrie: at .35 Valkyrie wins (1,509 vs 1,473), at .40 the Bard does. User confirmed 0.35.
- Summoner supplies mana only with the Shurdi mana tripod taken.

## Outstanding / in progress

1. **Metrics parity — done.** `general-party-metrics-v1.js` renders in both modes
   (`zones()` matches `.authoritative-dropzone` and `.encounter-optimized-party
   .slots`), accepts one party for 4-player content, and carries its own arrows.
2. **Raid cards are the General cards — done.** Raid renders through
   `LostArkGeneralModel.member(c,s,p,'slot')`; there is no second card template.
   Anything that decorates a General card (spec, class icon, position, hover)
   decorates the raid one automatically. Do not reintroduce a raid-side card.
3. **Best/Worst available swap panels removed from both optimizers** by user
   decision, along with the raid manual-swap panel before them. Do not add
   "what if you swapped X" panels back.
4. **Encounter Favorability** is the old per-card "Encounter N%", renamed. It
   lived briefly on the hover (via a `window.LostArkHoverExtras` hook, since
   removed) and now sits **on the card, top right**, rendered by `favBadge()` in
   `encounter-optimizer-v1.js` and injected into the General card markup. It
   carries **no `title`** — a native tooltip stacked a second popup on top of the
   card's own hover. **Its colour is relative to the lineup average, not to
   100%**: nearly every character sits below 100 on a real encounter, so an
   absolute rule painted every card red. Green = suits them more than the rest of
   the eight, red = less, grey = within a third of a point. The party header
   figure was renamed from "Fit" to **Average Party Encounter Favorability** and
   is wrapped in `<strong class="party-fit">` so the swap-arrow layer can anchor
   to it; its arrow reads in **points**, since the figure is already a percentage.
5. **Support encounter fit was flattened by the clamp.** Every support hit the
   old `.75` floor on extreme content and displayed an identical 75%. The floor
   is now `.60`, and `supportFactor` scales placement (flexible vs
   placement-sensitive) by the fight's scatter pressure up to ±2%, plus a
   quarter of that for the support's own mobility. Measured on Extreme
   Brelshaza G2: Valkyrie 75.2% vs Bard 72.4% where both read 75% before.
6. **Anything that reads the roster must read New Additions too.** Three layers
   read only `lostark-hideout-private-v3` and broke for New Additions: the card
   repair in `ui-fixes-clean.js` (raw class name and no position) and both
   swap-arrow name maps (raw uuids in the tooltip). Use
   `window.LostArkCandidateRoster.getAll()`.
7. **The optimizer's `drop` handler calls `stopImmediatePropagation()`** as a
   capture listener on `#suggestedParties`. Anything that needs the drop must
   listen on `document` — a listener on that root never fires.
8. **Ihzanami / Bard spec — resolved, and deliberately not hardcoded.** Bible used to
   report her Ark Passive as *True Courage* (a DPS spec) though she is geared as a
   support. It now reports her correctly and the app reads it with no special case:
   class Bard, *Desperate Salvation* among the Enlightenment nodes, CP 6020.25 from
   Current Loadout (Raid), ally-enhancement rolls present. Verified against the live
   profile on 2026-08-23. A per-character override was built earlier and **rolled
   back** — do not reintroduce one.
   Instead `app-fixed.js` exposes `window.LostArkProfileGuard.keepKnownSupportProfile
   (previous, incoming)`: a refresh that would turn a support-shaped profile into a
   DPS-shaped one is **refused**, keeping the last good profile, on both refresh paths,
   with the status line saying which character was kept. Support-shaped = explicit
   Support role, **or** the class's support spec among the Enlightenment nodes
   (Desperate Salvation / Blessed Aura / Full Bloom / Liberator), **or**
   ally-enhancement rolls. It engages only for the four support classes and only when
   the *previous* profile was support-shaped, so a bugged first import is never locked
   in and a bugged → good refresh always heals. The one false positive is a genuine
   respec on a support class: Remove and re-add forces it through.
9. **New classes — checklist** (e.g. Warpweaver). Only the class *name* resolves
   automatically, from the Bible header chip. Everything below is a hardcoded
   list, and the last four affect **correctness**, not just appearance. Worked
   through end to end on 2026-08-25 for Guardian Knight, which is how the
   locations below are known to be complete.

   1. **Name** — automatic. Nothing to do.
   2. **Icon** — `class-icon-authority-v1.js`. Fandom is abandoned for new
      classes (no Breaker, no Wildsoul), so expect to commit a local SVG and
      point at it. `app-fixed.js` `classIconUrl()` holds an older fallback map;
      it defers to the authority, so it does not need the entry.
   3. **Class recognition in the build parser** — the alternation in
      `build-profile-v3.js` `parse()` (`classMatch`), plus `canonicalClass()` if
      Bible's spelling differs from ours. Miss this and `className` is
      `'Unknown'`, which silently degrades everything downstream.
   4. **Spec extraction** — `KNOWN_ENGRAVINGS` in `build-profile-v3.js`. Modern
      specs read as T1 Ark Passive *Enlightenment* nodes (`Asura's Path Lv. 1`),
      and are picked up **only** because the name appears in this list — the
      `arkPassive` array is usually empty, because its line regex expects
      newlines the flattened page text does not have. If the name is not here,
      no later layer can recover it.
   5. **Spec label — two tables, both needed.**
      `ui-fixes-clean.js` `specFor()` has a **per-class** rule map and is the one
      that labels the cards (`LostArkSpecAuthority`); `build-spec-display-v1.js`
      has a **flat** rule list. A class absent from the per-class map falls back
      to showing the class name, which is exactly what "Breaker instead of
      Asura's Path" looked like.
   6. **Support/DPS role** — `SUPPORTS` is duplicated in
      `general-party-optimizer-v2.js`, `optimizer-v17.js`, `hover-summary-v6.js`,
      `general-party-label-bridge-v1.js` and `positional-authority-v1.js`
      (lower-cased there), plus `SUPPORT_SPECS` in `app-fixed.js`, which also
      drives the support-profile guard.
   7. **Positional** — `positional-authority-v1.js`, and the `RANGED` set at the
      top of `ui-fixes-clean.js` if the class is ranged.
   8. **Synergy table** — `party-synergy-authority-v1.js`.

   **Verify against a real profile, never from memory.** Guardian Knight's spec
   is **Dreadful Roar**; it was very nearly entered as "Dreadful Road". Fetch the
   character through the connector and grep the payload for the name before
   adding it anywhere.
10. **The raid list is hand-maintained, deliberately.** `raid-encounters.json` is edited
    directly; a new or departing raid needs an entry there **and** in the `fallback()` list
    inside `raid-selector-v1.js` (used when the manifest fetch fails), plus a scoring profile
    in `encounter-scoring-v2.js` for anything new. A scheduled job used to regenerate the
    manifest from Bible; it was **retired on 2026-08-23** and should not be rebuilt without
    reading why. It had reported success every 6 hours for months while never writing
    anything: it only descended into a `<select>` whose `name`/`aria-label` contained "raid",
    and Bible's selects carry neither -- only Tailwind classes -- so it collected no options
    and took its own "do not overwrite a good manifest" fallback. More importantly, syncing
    from Bible is wrong in principle: their enabled flag means "logs can be uploaded", not
    "currently runnable" (Extreme Aegir is still enabled there after its event window closed),
    their output carried **no `players` field and no `optional` group** -- so 4-player
    detection for Horizon Cathedral and Serca would silently break -- and their optgroups
    ("Epic Raid", "Kazeros Raid", "Shadow Raid") do not map to this app's grouping.
11. If more than 8 New Additions are stored, the counter reads e.g. "10/8" until
    some are removed; the cap only blocks adding.
12. **Specialization has one authority: `LostArkSpecAuthority.specFor`, which keys
    its rules by class.** `candidate-roster-v1.js` and `class-render-fix-v2.js`
    each also carry a flat first-match rule list scanned against the whole
    profile blob, where a common word beats the right answer — `\bcontrol\b` (a
    Glaivier spec) labelled a Gunlancer "Control" on its New Addition card while
    the party card correctly read "Lone Knight". Both now consult the authority
    **before** the stored `p.spec`, so `normalizeNew()` heals values the old scan
    had already written to storage. Do not add another rule list.
13. **Watch for double-clamping between the scorer and the optimizer.**
    `encounter-scoring-v2.characterScore()` clamps to `.60–1.15`;
    `encounter-optimizer-v1.charValue()` used to re-clamp at `.75`, which silently
    undid the support-fit change — the display separated two supports while party
    selection still could not. Fixed, but the shape of the bug is worth
    remembering: a second clamp downstream makes a scoring change look applied
    when it is not.
14. **The repair path is hot.** `ui-fixes-clean.repair()` runs on every mutation
    of `document.body`, and `stateProfiles()` used to rebuild its map each time
    with `getBuild()` re-parsing the entire build cache **per character** — with a
    big roster that turned a swap into tens of seconds. It now reads each store
    once and rebuilds only when the underlying localStorage actually changed.
    Never put per-character `JSON.parse`/`JSON.stringify` on that path, and do not
    call `CandidateRoster.getAll()` from it (it normalises and can write).
15. **Worker has a GitHub repo connected** (visible under Settings → Build). Build
    and deploy commands looked empty, so it appears inert and every worker change
    so far has been a manual paste — but this was never confirmed. Worth checking
    before assuming a future worker edit needs the manual step.
