// shared/app.js — Gedeelde logica voor het hele dashboard
// Laad op elke pagina NA shared/api.js:
//   <script src="../shared/api.js"></script>
//   <script src="../shared/app.js"></script>

// ── OPMAAK HELPERS ────────────────────────────────────────────
const fmt       = (v, d = 2) => Number(v).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const kleur     = v => v >= 0 ? 'green' : 'red';
const teken     = v => v >= 0 ? '+' : '−';
const fmtBedrag = (v, plus = false) => (plus ? teken(v) : v < 0 ? '−' : '') + '€' + fmt(Math.abs(v));

// ── AUTH ──────────────────────────────────────────────────────
function requireAuth() {
  if (!api.isLoggedIn()) {
    window.location.href = '../login/login.html';
  }
}

// ── KLOK & DATUM ──────────────────────────────────────────────
function klokTick() {
  const nu = new Date();
  document.getElementById('klok')?.replaceChildren(
    document.createTextNode(nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }))
  );
  document.getElementById('datumpill')?.replaceChildren(
    document.createTextNode(nu.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────
function injectSidebar(actief) {
  const nav = document.querySelector('.sidebar');
  if (!nav) return;
  const links = [
    { href: '../home/index.html',              icon: '🏠', label: 'Home' },
    { href: '../financieel/financieel.html',   icon: '📈', label: 'Financieel' },
    { href: '../transacties/transacties.html', icon: '🔄', label: 'Transacties' },
    { href: '../watchlist/watchlist.html',     icon: '🔭', label: 'Watchlist' },
    { href: '../projecten/editor.html',        icon: '🗂️', label: 'Projecten' },
  ];
  nav.innerHTML = `
    <div class="logo"><div class="logo-dot"></div><span class="logo-naam">Dashboard</span></div>
    <span class="nav-section">Menu</span>
    ${links.map(l => `
      <a href="${l.href}" class="nav-btn${actief === l.label ? ' active' : ''}">
        <span class="ni">${l.icon}</span>${l.label}
      </a>`).join('')}
    <span class="nav-section">Acties</span>
    <button class="nav-btn" onclick="openTxModal()"><span class="ni">➕</span>Transactie</button>
    <button class="nav-btn" style="margin-top:auto" onclick="api.logout()"><span class="ni">🚪</span>Uitloggen</button>
    <div class="sidebar-bottom"><span id="klok"></span></div>`;
}

// ── TOPBAR ────────────────────────────────────────────────────
function injectTopbar(titel, extra = '') {
  const t = document.querySelector('.topbar');
  if (!t) return;
  t.innerHTML = `
    <h1>${titel}</h1>
    <div class="topbar-right">
      <div class="date-pill" id="datumpill"></div>
      ${extra}
      <button class="btn btn-green" onclick="openTxModal()">+ Transactie</button>
    </div>`;
}

// ── TRANSACTIE MODAL ──────────────────────────────────────────
let _aandelen = [];

async function openTxModal() {
  if (!_aandelen.length) {
    try { _aandelen = await api.getAandelen() || []; } catch { _aandelen = []; }
  }
  document.getElementById('tx-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="tx-modal">
      <div class="modal" onclick="event.stopPropagation()">
        <h2>➕ Transactie toevoegen</h2>
        <div class="form-grid">
          <div class="form-row">
            <label>Type</label>
            <select id="tx-type">
              <option value="Buy">🟢 Koop</option>
              <option value="Sell">🔴 Verkoop</option>
            </select>
          </div>
          <div class="form-row"><label>Datum</label><input type="date" id="tx-datum"/></div>
        </div>
        <div class="form-row">
          <label>Aandeel</label>
          <select id="tx-aandeel">
            <option value="">— Kies aandeel —</option>
            ${_aandelen.map(a => `<option value="${a.id}">${a.ticker} — ${a.naam}</option>`).join('')}
          </select>
        </div>
        <div class="form-grid">
          <div class="form-row"><label>Aantal stuks</label><input type="number" id="tx-aantal" placeholder="10" min="0.000001" step="any"/></div>
          <div class="form-row"><label>Prijs per stuk</label><input type="number" id="tx-prijs" placeholder="100.00" min="0" step="any"/></div>
        </div>
        <div class="form-row"><label>Fees</label><input type="number" id="tx-fees" placeholder="2.00" min="0" step="0.01"/></div>
        <div class="form-row"><label>Notitie</label><input type="text" id="tx-notitie" placeholder="Optioneel"/></div>
        <div class="totaal-box">
          <div style="font-size:.72rem;color:var(--muted);margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.06em">Totale waarde</div>
          <div id="tx-totaal" style="font-size:1.1rem;font-weight:700;color:var(--accent2)">€ –</div>
        </div>
        <div id="tx-fout" class="fout-banner" style="display:none;margin-top:.75rem"></div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeTxModal()">Annuleren</button>
          <button class="btn btn-green" onclick="slaaTxOp()">✓ Opslaan</button>
        </div>
      </div>
    </div>`);

  document.getElementById('tx-datum').value = new Date().toISOString().split('T')[0];
  document.getElementById('tx-modal').addEventListener('click', e => {
    if (e.target.id === 'tx-modal') closeTxModal();
  });
  ['tx-aantal', 'tx-prijs', 'tx-fees'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', () => {
      const u = parseFloat(document.getElementById('tx-aantal')?.value) || 0;
      const p = parseFloat(document.getElementById('tx-prijs')?.value)  || 0;
      const f = parseFloat(document.getElementById('tx-fees')?.value)   || 0;
      document.getElementById('tx-totaal').textContent = (u * p + f) > 0 ? '€ ' + fmt(u * p + f) : '€ –';
    })
  );
}

function closeTxModal() {
  document.getElementById('tx-modal')?.remove();
}

async function slaaTxOp() {
  const fout = document.getElementById('tx-fout');
  fout.style.display = 'none';
  const payload = {
    aandeel_id: document.getElementById('tx-aandeel')?.value,
    type:       document.getElementById('tx-type')?.value,
    datum:      document.getElementById('tx-datum')?.value,
    aantal:     parseFloat(document.getElementById('tx-aantal')?.value),
    prijs:      parseFloat(document.getElementById('tx-prijs')?.value),
    fees:       parseFloat(document.getElementById('tx-fees')?.value) || 0,
    notitie:    document.getElementById('tx-notitie')?.value || null,
  };
  if (!payload.aandeel_id || !payload.datum || !payload.aantal || !payload.prijs) {
    fout.textContent = 'Vul alle verplichte velden in.';
    fout.style.display = 'block';
    return;
  }
  try {
    await api.voegTransactieToe(payload);
    closeTxModal();
    if (typeof herlaad === 'function') herlaad();
  } catch (e) {
    fout.textContent = e.message;
    fout.style.display = 'block';
  }
}

// ── INIT ─ roep aan bovenaan elke pagina ─────────────────────
// config = { actief: 'Home', titel: 'Overzicht', extra: '' }
function dashboardInit(config = {}) {
  requireAuth();
  if (config.actief) injectSidebar(config.actief);
  if (config.titel)  injectTopbar(config.titel, config.extra || '');
  klokTick();
  setInterval(klokTick, 30000);
}
