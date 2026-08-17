const VISIT_COUNTER = 'https://lostark-bible-connector.seraph0226.workers.dev/visits';

async function loadVisitCounter() {
  try {
    const response = await fetch(VISIT_COUNTER, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) return;

    const data = await response.json();
    const summary = document.querySelector('.summary-grid');
    if (!summary) return;

    let card = document.getElementById('visitCounterCard');
    if (!card) {
      card = document.createElement('div');
      card.className = 'card';
      card.id = 'visitCounterCard';
      card.innerHTML = '<span>Dashboard Visits</span><b id="visitCount">—</b>';
      summary.appendChild(card);
    }

    const count = Number(data.visits);
    document.getElementById('visitCount').textContent = Number.isFinite(count)
      ? count.toLocaleString()
      : '—';
  } catch {
    // The dashboard should continue working normally if the counter is unavailable.
  }
}

loadVisitCounter();
