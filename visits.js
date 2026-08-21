const VISIT_COUNTER = 'https://lostark-bible-connector.seraph0226.workers.dev/visits';

async function loadVisitCounter() {
  const counter = document.getElementById('visitCounter');
  if (!counter) return;
  try {
    const response = await fetch(VISIT_COUNTER, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) { counter.innerHTML = 'Page visits: <b>—</b>'; return; }
    const data = await response.json();
    const count = Number(data?.visits);
    counter.innerHTML = Number.isFinite(count) ? `Page visits: <b>${count.toLocaleString()}</b>` : 'Page visits: <b>—</b>';
  } catch { counter.innerHTML = 'Page visits: <b>—</b>'; }
}
loadVisitCounter();

const newAdditionsAuthorityScript = document.createElement('script');
newAdditionsAuthorityScript.src = 'new-additions-class-spec-v2.js?v=20260821authority6';
newAdditionsAuthorityScript.async = false;
document.head.appendChild(newAdditionsAuthorityScript);

// Install the build-refresh isolation wrapper BEFORE candidate-roster-v1 runs.
// candidate-roster-v1 initializes immediately and may request a build refresh
// during script evaluation, so this must be loaded first.
const candidateBuildRefreshIsolationScript = document.createElement('script');
candidateBuildRefreshIsolationScript.src = 'candidate-build-refresh-isolation-v1.js?v=20260821isolate3';
candidateBuildRefreshIsolationScript.async = false;
document.head.appendChild(candidateBuildRefreshIsolationScript);

const candidateRosterScript = document.createElement('script');
candidateRosterScript.src = 'candidate-roster-v1.js?v=20260821candidate10';
candidateRosterScript.async = false;
document.head.appendChild(candidateRosterScript);

const newAdditionsFinalAuthorityScript = document.createElement('script');
newAdditionsFinalAuthorityScript.src = 'new-additions-final-authority-v2.js?v=20260821final4';
newAdditionsFinalAuthorityScript.async = false;
document.head.appendChild(newAdditionsFinalAuthorityScript);

// Identity/spec/icon display only. No optimizer, hover, arrow, scoring, or swap behavior.
const classRenderFixScript = document.createElement('script');
classRenderFixScript.src = 'class-render-fix-v2.js?v=20260821newadditions2';
classRenderFixScript.async = false;
document.head.appendChild(classRenderFixScript);

// Re-assert the class-aware spec after the generic class renderer has finished.
const newAdditionsPostRenderSpecScript = document.createElement('script');
newAdditionsPostRenderSpecScript.src = 'new-additions-class-spec-v2.js?v=20260821authority7';
newAdditionsPostRenderSpecScript.async = false;
document.head.appendChild(newAdditionsPostRenderSpecScript);

const wildsoulIconGuardScript = document.createElement('script');
wildsoulIconGuardScript.src = 'wildsoul-icon-guard-v1.js?v=20260821wildsoul3';
wildsoulIconGuardScript.async = false;
document.head.appendChild(wildsoulIconGuardScript);

// Final hard authority for the supplied Valkyrie SVG and verified Wildsoul asset.
const classIconAuthorityScript = document.createElement('script');
classIconAuthorityScript.src = 'class-icon-authority-v1.js?v=20260821icons1';
classIconAuthorityScript.async = false;
document.head.appendChild(classIconAuthorityScript);

// Guardianknight was supplied as an exact Bible SVG, not a Fandom asset.
const guardianknightInlineAuthorityScript = document.createElement('script');
guardianknightInlineAuthorityScript.src = 'guardianknight-inline-authority-v1.js?v=20260821gk1';
guardianknightInlineAuthorityScript.async = false;
document.head.appendChild(guardianknightInlineAuthorityScript);

// Final display-only specialization authority for the Optimized Party Setup.
const optimizerSpecDisplayGuardScript = document.createElement('script');
optimizerSpecDisplayGuardScript.src = 'optimizer-spec-display-guard-v1.js?v=20260821optspec1';
optimizerSpecDisplayGuardScript.async = false;
document.head.appendChild(optimizerSpecDisplayGuardScript);
