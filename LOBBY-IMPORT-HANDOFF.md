# Live Lobby Import — handoff

Paste this whole file into a new chat. It supplements `HANDOFF.md`, which is
still accurate and should be read too.

## What this feature is

Paste a Lost Ark party-finder screenshot into the dashboard → OCR reads it →
each character is resolved on lostark.bible → the lobby loads as a temporary
roster that replaces the Main Group → optimize it for the raid the screenshot
names. The Main Group is never touched and returns when you switch back.

**Status: wired into `index.html` and working end to end from the real
dashboard — Party Source toggle, import panel, live cards, and Raid Specific
optimize all verified locally. Still uncommitted and unpushed.**

Branch: `lobby-import`. **Nothing committed, nothing pushed.**

---

## Environment (read before testing anything)

- Serve the repo on **port 8777 specifically** — the worker's `ALLOWED_ORIGINS`
  only accepts `https://seraph26.github.io` and `http://localhost:8777`.
  `127.0.0.1` is a different origin and gets 403.
  Server script: `scratchpad/serve.ps1` (PowerShell `HttpListener`; there is no
  node/npx/python on this machine). Recreate if lost.
- Preview page: `http://localhost:8777/lobby-preview.html`, **generated** from
  `index.html` by splicing two fragments (`scratchpad/frag-markup.html`,
  `scratchpad/frag-scripts.html`). Regenerate after any `index.html` change.
- **`requestAnimationFrame` never fires in the in-app browser pane** because it
  does not composite frames. The encounter optimizer gates `optimize()` behind
  `rAF → rAF → setTimeout`, so it sets the busy label and hangs forever. This
  looks exactly like a broken optimizer and cost hours. Shim it every session:
  ```js
  window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
  ```
- Screenshots fail in the pane ("not displayed"); drive the page with
  `javascript_tool` and read state back.

---

## Files created (all untracked)

| file | what it is | tests |
|---|---|---|
| `lobby-import-v1.js` | pure logic: parse OCR text → slots, region vote, raid translation, validate, candidate selection. No DOM, no network. | `lobby-import-test.html` — **50/50** |
| `lobby-ocr-v1.js` | tesseract.js, paste-only, two-pass (locate then zoom) | `lobby-ocr-test.html` |
| `lobby-crop-v1.js` | drag-a-box crop for wide captures | — |
| `lobby-resolve-v1.js` | direct fetch → de-accented search → prefix search, item-level oracle | `lobby-resolve-test.html` — **27/27** |
| `lobby-group-v1.js` | live-group storage, source toggle, assignment parking | `lobby-group-test.html` — **19/19** |
| `lobby-panel-v1.js` | review table, per-row autocomplete, import | `lobby-panel-test.html` |
| `lobby-wiring-v1.js` | the shipped integration — Party Source toggle, panel host, busy state, encounter auto-select. Inert if the markup is absent. | — |
| `lobby-preview-wiring.js` | **superseded** by `lobby-wiring-v1.js`; kept only until `lobby-preview.html` is pruned | — |
| `breaker-icon.svg`, `wildsoul-icon.svg` | class icons Fandom does not host | — |

## Tracked files changed (uncommitted)

| file | change |
|---|---|
| `worker/src/index-support-v2.js` | **`/search` route** + **`validBibleUrl` fix**. Version bumped to `2026-08-25-search-and-name-fix`. **NOT DEPLOYED.** |
| `candidate-roster-v1.js` | the roster seam — `allCharacters()` returns the live group when active. Inert otherwise. |
| `app-fixed.js` | `render()` draws whichever roster is selected; exposes `window.LostArkDashboard.render()` |
| `class-icon-authority-v1.js` | Breaker registered; Wildsoul repointed off Fandom; `alt` ternary replaced with `DISPLAY_NAMES` lookup |
| `guardianknight-icon.svg`, `valkyrie-icon.svg` | square viewBox so all icons render one size |
| `visits.js` | cache-bust for the icon authority |

`index.html` now carries the Party Source markup, the import section, one extra
`<style>` block and seven `<script>` tags at `?v=20260825lobby1`. The lobby
section is inserted **before** "Add a specific character"; the wiring no longer
depends on that order, it selects `.import-panel:not(.lobby-import-section)`.

`lobby-preview.html` and `lobby-preview-wiring.js` are now redundant — the real
page is the test surface. Kept pending a deliberate prune.

---

## Hard-won findings (do not re-derive these)

**Servers and regions.** 12 Western servers, 2 regions, tokens are `NA` and
**`CE`** (Central Europe — *not* `EU`). NA: Inanna, Balthorr, Nineveh, Luterra,
Vairgrys, Thaemine, Brelshaza. CE: Arcturus, Elpon, Gienah, Ortuus, Ratik. The
Aug/Sep 2026 merges are all **intra-region**, so the server→region table never
changes; keep retired names forever so old screenshots still resolve. Nearest
cross-region name distance is 4 (Nineveh/Gienah), double the d≤2 fuzzy window,
so region inference is provably safe.

**Item level is the identity oracle, not the server.** Bible's page *truncates*
item level (1739.1661 → 1739.16) while the game *rounds* (1739.17). Read the raw
`itemLevel` from the page payload and round to 2dp — then it matches the lobby
**exactly**, so this is an equality test, not a tolerance.

**Accent-variant squatting is the norm.** `Dragondeez`, `Thesickness` and
`Meteorologist` each have **three** live accented variants. Server is a weak
discriminator: `Sussybaka` and `Bussyßaka` are different real players on the
*same* server, and only item level separated them.

**Bible's search is accent-insensitive prefix matching.** Query `goldensparrow`
→ `Góldensparrow`. This is what solves multi-accent names like `Dragondëëz`
(previously unreachable) and powers the autocomplete. Endpoint id `ngsbie` is a
SvelteKit remote-function hash; the sibling `1ranzqj` has been hardcoded since
2026-08-18 without breaking.

**Bible answers a missing character with HTTP 200** and a page whose `<h1>` is
"Character Not Found" (~6.7KB vs 170–316KB). Without a guard it becomes a card
literally named after the error.

**Extreme raids: the lobby says Gate 1, the manifest says g2.** Handled by
`FIXED_GATE = { 'extreme-brelshaza': 2 }`. Build the encounter id only through
`encounterIdFor()` — rebuilding it elsewhere silently undid the pin once.

**`raid-encounters.json` has THREE arrays:** `raids`, `optional` (Armoche) and
`events` (extreme raids). Reading only `raids` loses Armoche and every extreme
lobby. Use `findEncounter()`.

**In-game act names ≠ manifest names.** Salvation Bell Tower→horizon-cathedral,
Sanctum of Frost→serca, Final Day→kazeros, Fortress of Destruction→armoche,
Sennir Basin→**extreme-brelshaza**. Anything else is refused rather than
half-imported, which is what lets party size come from the manifest by one path.

**OCR.** `eng` alone is poor — it substitutes the wrong accent. `eng+deu+fra+spa`
from `tessdata_fast` took servers 3/8→8/8 and item levels 5/8→8/8 on the
reference capture. `script/Latin` is unavailable (404/403). Dropped decimal
points are recoverable exactly (`174000`→`1740.00`).

**Fandom is abandoned for new classes** — no Breaker and no Wildsoul icon at
all. Four classes are now locally hosted. Bible's profile page has **no class
icon**; `extractBibleClassIcon()` in `app-fixed.js` is effectively dead code —
the icons live on the **roster tab**, which the worker deliberately blocks as
account-wide data.

---

## Wrong turns — do not repeat these

- **The optimizer "doing nothing" was the rAF stall**, four times over. I
  disproved three other theories (three supports, stale caches, missing class
  tables) before finding it, and HANDOFF documented it all along.
- **The repair layers were blamed twice** for mislabelling cards and were
  innocent both times — a probe card inserted into `#roster` recorded zero
  mutations. The real cause was a hardcoded ternary in
  `class-icon-authority-v1.js` that labelled anything unlisted as "Wildsoul".
- `charValue()` **is** encounter-keyed (`raid|characterId`). Stale caches were
  never the reason a raid swap kept the same lineup — the lineup was genuinely
  optimal for both fights, and every character's favorability did change.
- `ui-fixes-clean.js` and `class-render-fix-v2.js` were edited on a wrong
  diagnosis and have been **reverted**. Do not re-apply without evidence.

---

## Outstanding

1. ~~**Wire into `index.html`**~~ — **done 2026-08-25.** Verified on
   `http://localhost:8777/index.html`: panel mounts, toggle hides/restores the
   Main Group sections both ways, a persisted lobby restores with its banner and
   8 cards, and Raid Specific optimize fills 2 parties with 8 slots.
   One known gap: `autoSelectEncounter()` runs on import only, so a lobby
   restored from storage on page load leaves the raid dropdown on whatever it
   last held rather than the lobby's own fight.
2. ~~**Deploy the worker.**~~ — **done 2026-08-25**, commit `cb39a93`, live as
   `2026-08-25-search-and-name-fix` about 45s after the push. Verified against
   the deployed worker:
   - `/search?name=goldensparrow&region=NA` → `Góldensparrow`, reaper,
     1775.8334; the length and region guards return 400.
   - `/character` now fetches `Siriusaltroster` (233KB profile) while
     `…/Someone/roster` and `…/Someone/siblings` still 400, as do non-https
     and non-Bible hosts.
   - End to end through `resolveSlot()` from the page: `Goldensparrow` resolves
     to `Góldensparrow` in one search, Reaper, ilvl 1775.83 exact.

   **Deploy coupling, worth knowing:** Cloudflare builds the worker from a push
   to `main`, and `pages.yml` deploys the whole repo to Pages from that same
   push. The two cannot be separated by branch — a worker-only deploy needs a
   commit on `main` that touches only `worker/`, which is how `cb39a93` was
   done while the lobby feature stayed on `lobby-import`.
3. **Spec display regression** — live-lobby cards show the class (`Breaker`)
   instead of the specialization (`Asura's Path`), because the spec-display
   layer reads `private-v3` and cannot see imported characters. Genuine
   HANDOFF item 6 territory. Find the real seam; three previous guesses at this
   class of bug were all wrong.
4. **Untested:** ~~search end-to-end~~ (done, see item 2), multi-accent names,
   a 4-player lobby import, Bible staleness tolerance (observed up to 15 days
   stale but still matching), CE lobbies (user has no EU characters; de-risked
   analytically). **The OCR paste path has still never run in `index.html`** —
   it needs a real `Ctrl+V` of a real screenshot, which only the user can do.
   That is the one thing standing between here and calling this confirmed.
5. **Deferred by the user until the feature is finished:** updating `HANDOFF.md`,
   and adding a **new-class checklist** to it. A new class needs five things:
   name (automatic), icon, support/DPS role, spec rules, synergy table — and the
   last three affect correctness, not just appearance. Warpweaver is expected
   next month.
6. Prune or keep the five test harnesses and the OCR spike deliberately.

## Design decisions the user made

- Paste only (`Ctrl+V`); no drag-drop, no upload, no sample lobbies.
- Full lobbies only — 4 or 8, size from the manifest.
- Extreme modes always resolve to G2 regardless of the gate the lobby shows.
- Assume every character is indexed on Bible (16/16 held in testing).
- Account-wide data is acceptable in principle, **but do not add Bible request
  volume** — that is the binding constraint, and it is why icons are local SVGs
  rather than roster-tab fetches.
- Item level should flag, not reject, on mismatch.
