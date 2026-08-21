const VISIT_COUNTER = 'https://lostark-bible-connector.seraph0226.workers.dev/visits';

async function loadVisitCounter() {
  const counter = document.getElementById('visitCounter');
  if (!counter) return;

  try {
    const response = await fetch(VISIT_COUNTER, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      counter.innerHTML = 'Page visits: <b>—</b>';
      return;
    }

    const data = await response.json();
    const count = Number(data?.visits);

    counter.innerHTML = Number.isFinite(count)
      ? `Page visits: <b>${count.toLocaleString()}</b>`
      : 'Page visits: <b>—</b>';
  } catch {
    counter.innerHTML = 'Page visits: <b>—</b>';
  }
}

loadVisitCounter();

// Load New Additions authority before the isolated candidate-roster layer.
const newAdditionsAuthorityScript = document.createElement('script');
newAdditionsAuthorityScript.src = 'new-additions-class-spec-v1.js?v=20260821authority4';
newAdditionsAuthorityScript.async = false;
document.head.appendChild(newAdditionsAuthorityScript);

// Load the isolated candidate-roster layer without changing any optimizer,
// hover, arrow, or formatting implementation.
const candidateRosterScript = document.createElement('script');
candidateRosterScript.src = 'candidate-roster-v1.js?v=20260821candidate7';
candidateRosterScript.async = false;
document.head.appendChild(candidateRosterScript);

// Final data-driven repair for class/spec fields after candidate rendering.
const newAdditionsFinalAuthorityScript = document.createElement('script');
newAdditionsFinalAuthorityScript.src = 'new-additions-final-authority-v1.js?v=20260821final3';
newAdditionsFinalAuthorityScript.async = false;
document.head.appendChild(newAdditionsFinalAuthorityScript);
