# LostArkHideout — handoff

Paste this whole file into a new chat to pick up where we left off.

## Basics

- Repo `Seraph26/LostArkHideout`, live at https://seraph26.github.io/LostArkHideout/ (GitHub Pages from `main`; push = deploy, ~30–60s).
- Local clone: `C:\Users\<user>\Desktop\ClaudeLA`. Working tree should be clean and in sync.
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
  Pages), add it to `ALLOWED_ORIGINS` in `worker/src/index-support-v2.js` **and redeploy the
  worker**, or profile fetching silently stops. `/health` stays open.
- **The worker does not deploy with the site.** `git push` deploys Pages only. The worker is
  deployed by hand: Cloudflare dashboard → Workers & Pages → `lostark-bible-connector` → Edit
  code → paste `worker/src/index-support-v2.js` → Save and deploy. There is no `node`/`wrangler`
  on this machine.
- **Short share links.** A full roster's `#s=` link runs past 2,000 characters, which Discord's
  message limit rejects, so the worker also offers `POST /share` (store the encoded snapshot in
  KV, 30-day TTL, binding `SHARES`, id `3d2236be086d46fbb4e2cdb70c7d8ae8`) and `GET /share/:id`.
  `copyShare()` in `share-and-reset-v1.js` tries this first and silently falls back to the long
  `#s=` link on any failure, so nothing breaks if the worker is out of date. **The KV binding is
  not in the pasted worker code** — after pasting a new worker version, also confirm in
  Settings → Variables and Bindings that `SHARES` is still bound to that namespace, or `/share`
  fails with a 500 even though the code is correct. This is the one deliberate exception to
  "nothing ever reaches a server": an `#id=` link's snapshot sits in Cloudflare KV for 30 days,
  never logged, never tied to an account. Old `#s=` links are unaffected.
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
  - `window.LostArkGeneralModel = {score, hoverHtml, info, role, resolve}` from `general-party-optimizer-v2.js`
  - `window.LostArkSpecAuthority = {specFor, className}` from `ui-fixes-clean.js`
  Raid uses both for its card labels and hovers. The General model's support uptime already consults the selected encounter, so its numbers are encounter-aware.
- **Party size**: `raid-encounters.json` carries `players` (4 or 8). Horizon Cathedral and Serca are 4-player. General has its own `#generalFormatSelect` (8-player / 4-player), hidden while Raid Specific is selected, persisted in `lostark-hideout-general-format-v1`.

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
4. **Encounter Favorability** is the old per-card "Encounter N%", renamed, on the
   hover under the compatibility line. It is injected by `hover-summary-v6`'s
   encounter block via the `window.LostArkHoverExtras` hook that
   `encounter-optimizer-v1.js` registers — not by the card markup, because
   hover-summary rebuilds the card afterwards.
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
8. **Ihzanami / Bard spec.** Bible reports her Ark Passive as *True Courage* (a
   DPS spec) though she is geared as a support. Left as-is by user decision. A
   per-character override was built and **rolled back** — the user disliked it.
   If revisited, something narrower than free text (e.g. a "treat as support"
   toggle).
9. **New classes** (e.g. Warpweaver): the class *name* resolves automatically
   from the Bible header chip, but icon, support/DPS role, spec rules and synergy
   table are hardcoded lists needing manual entries.
10. **New raids** (e.g. Belgardin) do **not** appear automatically —
    `raid-encounters.json` is a static file. A new raid needs an entry with
    `players`, plus an encounter scoring profile.
11. If more than 8 New Additions are stored, the counter reads e.g. "10/8" until
    some are removed; the cap only blocks adding.
