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
