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

- WebFetch gets 403 on lostark.bible. The in-app browser loads it fine. The app's own connector works from any origin:
  `https://lostark-bible-connector.seraph0226.workers.dev/character?url=<encoded bible url>`
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

1. **Metrics parity between General and Raid (in progress).** The user wants the same three metric lines (Base DPS Power, Party Synergy, Support Impact) **with arrow indicators** in both modes. `general-party-metrics-v1.js` currently gates on `general()` and reads `.authoritative-dropzone` / `.authoritative-member`; raid uses `.slots` / `.slot`. Because raid cards now carry canonical hovers, `metric()` can parse them unchanged — generalising `general()`, `zones()`, `members()` and relaxing `all()`'s "exactly 2 zones" should give raid the same block. Arrows come from `general-render-guard-v1.js` (`.general-top-swap-arrow`) and the metrics block itself.
2. **User reported General's three metric lines missing.** Could not reproduce — a test right after a General optimize showed 2 blocks reading "Base DPS Power 27,791 / Party Synergy +43.52% / Support Impact +28.12%". Suspect they had not hard-refreshed. **Confirm with them before changing anything.**
3. **Raid manual-swap panel removed** (`raid-manual-party-summary-v1.js` unloaded from `index.html`) — user did not want it. It was also printing nonsense ("Combined party potential would be 2.").
4. **Raid card position reads "unknown"** where General shows Back Attack — encounter scoring's own `positionLabel`, a separate path from the positional data General uses.
5. **Manual swapping in the raid optimized layout** works for 8-player (handled inside `encounter-optimizer-v1.js`, rejects anything breaking 3 DPS + 1 support) and is deliberately inert for 4-player.
6. **Ihzanami / Bard spec.** Bible currently reports her Ark Passive as *True Courage* (a DPS spec) and scores her as a DPS Bard, though she is geared as a support. "Desperate Salvation" appears nowhere on her page. Left as-is by user decision. A per-character Pin/override was built and then **rolled back** — the user disliked it. If revisited, they suggested something narrower than free-text fields (e.g. a single "treat as support" toggle).
7. **New classes** (e.g. Warpweaver): the class *name* resolves automatically from the Bible header chip, but icon, support/DPS role, spec rules and synergy table are all hardcoded lists needing manual entries.
8. **New raids** (e.g. Belgardin) do **not** appear automatically — `raid-encounters.json` is a static file. A new raid needs an entry with `players`, plus an encounter scoring profile.
9. If the user has more than 8 New Additions stored, the counter reads e.g. "10/8" until they remove some; the cap only blocks adding.
