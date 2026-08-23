const VISIT_COUNTER = 'https://lostark-bible-connector.seraph0226.workers.dev/visits';
/* Count once per browser session rather than once per page load. sessionStorage
   survives a refresh and clears when the browser closes, which is exactly the
   intent: one person reloading stays at one, the same person returning later in
   a fresh browser counts again. Two caveats worth knowing when reading the
   number: sessionStorage is per-tab, so two tabs open at once count twice, and
   a private window or cleared storage always counts as new. This measures
   browser sessions, not people. */
const VISIT_SESSION_KEY = 'lostark-hideout-visit-counted-v1';

async function loadVisitCounter() {
  const counter = document.getElementById('visitCounter');
  if (!counter) return;
  let counted = false;
  try { counted = sessionStorage.getItem(VISIT_SESSION_KEY) === '1'; } catch {}
  const url = counted ? `${VISIT_COUNTER}?peek=1` : VISIT_COUNTER;
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) { counter.innerHTML = 'Page visits: <b>—</b>'; return; }
    const data = await response.json();
    const count = Number(data?.visits);
    /* Only mark the session once the count actually landed, so a failed request
       does not silently skip this visitor for the rest of their session. */
    if (!counted && data?.ok) { try { sessionStorage.setItem(VISIT_SESSION_KEY, '1'); } catch {} }
    counter.innerHTML = Number.isFinite(count) ? `Page visits: <b>${count.toLocaleString()}</b>` : 'Page visits: <b>—</b>';
  } catch { counter.innerHTML = 'Page visits: <b>—</b>'; }
}
loadVisitCounter();

const newAdditionsAuthorityScript = document.createElement('script');
newAdditionsAuthorityScript.src = 'new-additions-class-spec-v1.js?v=20260821authority5';
newAdditionsAuthorityScript.async = false;
document.head.appendChild(newAdditionsAuthorityScript);

const candidateRosterScript = document.createElement('script');
candidateRosterScript.src = 'candidate-roster-v1.js?v=20260823candidate17';
candidateRosterScript.async = false;
document.head.appendChild(candidateRosterScript);

const newAdditionsFinalAuthorityScript = document.createElement('script');
newAdditionsFinalAuthorityScript.src = 'new-additions-final-authority-v1.js?v=20260821final3';
newAdditionsFinalAuthorityScript.async = false;
document.head.appendChild(newAdditionsFinalAuthorityScript);

// Identity/spec/icon display only. No optimizer, hover, arrow, scoring, or swap logic.
const classRenderFixScript = document.createElement('script');
classRenderFixScript.src = 'class-render-fix-v2.js?v=20260821newadditions2';
classRenderFixScript.async = false;
document.head.appendChild(classRenderFixScript);

const wildsoulIconGuardScript = document.createElement('script');
wildsoulIconGuardScript.src = 'wildsoul-icon-guard-v1.js?v=20260821wildsoul3';
wildsoulIconGuardScript.async = false;
document.head.appendChild(wildsoulIconGuardScript);

// Final hard authority for the supplied Valkyrie SVG and verified Wildsoul asset.
// Must run after generic and legacy class-icon renderers.
const classIconAuthorityScript = document.createElement('script');
classIconAuthorityScript.src = 'class-icon-authority-v1.js?v=20260821icons1';
classIconAuthorityScript.async = false;
document.head.appendChild(classIconAuthorityScript);
