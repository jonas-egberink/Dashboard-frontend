let _nieuws = [];
let _filter = 'alles';

async function herlaad() {
  try {
    _nieuws = await api.getNieuws({ limit: 100 }) || [];
    renderNieuws();
  } catch(e) { console.error(e); }
}

function setFilter(f) {
  _filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderNieuws();
}

function filterNieuws(items) {
  if (_filter === 'alles')      return items;
  if (_filter === 'portfolio')  return items.filter(n => n.ticker);
  if (_filter === 'watchlist')  return items.filter(n => n.naam === 'Watchlist' || (!n.ticker && n.naam !== 'Marktnieuws'));
  if (_filter === 'positief')   return items.filter(n => n.sentiment === 'positief');
  if (_filter === 'negatief')   return items.filter(n => n.sentiment === 'negatief');
  return items;
}

function sentimentKleur(s) {
  if (s === 'positief') return 'sentiment-pos';
  if (s === 'negatief') return 'sentiment-neg';
  return 'sentiment-neu';
}

function sentimentLabel(s) {
  if (s === 'positief') return '📈 Positief';
  if (s === 'negatief') return '📉 Negatief';
  return '➖ Neutraal';
}

function tijdGeleden(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 60)  return min + 'm geleden';
  const uur = Math.floor(min / 60);
  if (uur < 24)  return uur + 'u geleden';
  return Math.floor(uur / 24) + 'd geleden';
}

function renderNieuws() {
  const gefilterd = filterNieuws(_nieuws);
  const container = document.getElementById('nieuws-container');

  if (!gefilterd.length) {
    container.innerHTML = `<div class="leeg">Geen nieuws gevonden. Klik op "Vernieuwen" om nieuws op te halen.</div>`;
    return;
  }

  // Groepeer per dag
  const groepen = {};
  gefilterd.forEach(n => {
    const dag = n.gepubliceerd ? new Date(n.gepubliceerd).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Onbekende datum';
    if (!groepen[dag]) groepen[dag] = [];
    groepen[dag].push(n);
  });

  container.innerHTML = Object.entries(groepen).map(([dag, items]) => `
    <div class="nieuws-dag-groep">
      <div class="nieuws-dag-label">${dag}</div>
      ${items.map(n => `
        <a href="${n.link}" target="_blank" rel="noopener" class="nieuws-item${n.gelezen ? ' gelezen' : ''}" onclick="markeerGelezen('${n.id}', this)">
          <div class="nieuws-item-header">
            <div class="nieuws-tags">
              <span class="nieuws-tag ${sentimentKleur(n.sentiment)}">${sentimentLabel(n.sentiment)}</span>
              ${n.ticker ? `<span class="nieuws-tag ticker-tag">${n.ticker}</span>` : ''}
              ${n.naam && n.naam !== 'Marktnieuws' ? `<span class="nieuws-tag naam-tag">${n.naam}</span>` : '<span class="nieuws-tag markt-tag">Markt</span>'}
            </div>
            <span class="nieuws-tijd">${tijdGeleden(n.gepubliceerd)}</span>
          </div>
          <div class="nieuws-titel${n.gelezen ? '' : ' ongelezen'}">${n.titel}</div>
          ${n.samenvatting ? `<div class="nieuws-samenvatting">${n.samenvatting.slice(0, 200)}…</div>` : ''}
          <div class="nieuws-bron">${n.bron || 'Yahoo Finance'}</div>
        </a>`).join('')}
    </div>`).join('');
}

async function markeerGelezen(id, el) {
  try {
    await api.markeerGelezen(id);
    el?.classList.add('gelezen');
    el?.querySelector('.nieuws-titel')?.classList.remove('ongelezen');
    laadNieuwsTeller();
  } catch {}
}

async function markeerAlles() {
  try {
    await api.markeerAllesGelezen();
    _nieuws.forEach(n => n.gelezen = true);
    renderNieuws();
    laadNieuwsTeller();
  } catch(e) { alert(e.message); }
}

async function verversen() {
  const spin = document.getElementById('verversen-spin');
  spin.style.animation = 'spin 1s linear infinite';
  try {
    const res = await api.verversNieuws();
    await herlaad();
    spin.style.animation = '';
  } catch(e) {
    spin.style.animation = '';
    alert('Vernieuwen mislukt: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  dashboardInit({ actief: 'Nieuws', titel: 'Financieel Nieuws', toonTxKnop: false,
    extra: `<span id="nieuws-teller" style="font-size:.78rem;color:var(--muted)"></span>` });
  herlaad();
  // Auto-verversen elke 15 minuten
  setInterval(verversen, 15 * 60 * 1000);
});
