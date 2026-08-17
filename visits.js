const VISIT_COUNTER = 'https://lostark-bible-connector.seraph0226.workers.dev/visits';

async function loadVisitCounter() {
  try {
    const response = await fetch(VISIT_COUNTER, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) return;

    const data = await response.json();
    const footer = document.querySelector('footer');
    if (!footer) return;

    let counter = document.getElementById('visitCounter');
    if (!counter) {
      counter = document.createElement('span');
      counter.id = 'visitCounter';
      footer.appendChild(counter);
    }

    const count = Number(data.visits);
    counter.innerHTML = Number.isFinite(count)
      ? `Page visits: <b>${count.toLocaleString()}</b>`
      : 'Page visits: <b>—</b>';
  } catch {
    // The dashboard should continue working normally if the counter is unavailable.
  }
}

loadVisitCounter();
