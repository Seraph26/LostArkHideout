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
newAdditionsAuthorityScript.src = 'new-additions-class-spec-v1.js?v=20260821authority5';
newAdditionsAuthorityScript.async = false;
document.head.appendChild(newAdditionsAuthorityScript);

const candidateRosterScript = document.createElement('script');
candidateRosterScript.src = 'candidate-roster-v1.js?v=20260822candidate16';
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
