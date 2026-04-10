// shared/app.js — Gedeelde logica voor het hele dashboard

// ── OPMAAK HELPERS ────────────────────────────────────────────
const fmt       = (v, d = 2) => Number(v).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const kleur     = v => v >= 0 ? 'green' : 'red';
const teken     = v => v >= 0 ? '+' : '−';
const fmtBedrag = (v, plus = false) => (plus ? teken(v) : v < 0 ? '−' : '') + '€' + fmt(Math.abs(v));

// Valuta symbolen
const VALUTA_SYMBOOL = { EUR: '€', USD: '$', GBP: '£', GBp: 'p', CHF: 'CHF', JPY: '¥', CAD: 'C$', AUD: 'A$', NOK: 'kr', SEK: 'kr', DKK: 'kr' };

// ── AUTH ──────────────────────────────────────────────────────
function requireAuth() {
  if (!api.isLoggedIn()) window.location.href = '../login/login.html';
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

// ── NIEUWS TELLER ─────────────────────────────────────────────
async function laadNieuwsTeller() {
  try {
    const data  = await api.nieuwsTeller();
    const badge = document.getElementById('nieuws-badge');
    if (!badge) return;
    const n = data?.ongelezen || 0;
    badge.textContent  = n > 99 ? '99+' : n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  } catch { /* stil falen */ }
}

// ── SIDEBAR ───────────────────────────────────────────────────
function injectSidebar(actief) {
  const nav = document.querySelector('.sidebar');
  if (!nav) return;
  const links = [
    { href: '../home/index.html',              icon: '🏠', label: 'Home' },
    { href: '../financieel/financieel.html',   icon: '📈', label: 'Financieel' },
    { href: '../transacties/transacties.html', icon: '🔄', label: 'Transacties' },
    { href: '../nieuws/nieuws.html',           icon: '📰', label: 'Nieuws' },
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
    <div style="flex:1"></div>
    <button class="nav-btn" onclick="api.logout()"><span class="ni">🚪</span>Uitloggen</button>
    <div class="sidebar-bottom"><span id="klok"></span></div>`;
}

// ── TOPBAR ────────────────────────────────────────────────────
function injectTopbar(titel, extra = '', toonTxKnop = true) {
  const t = document.querySelector('.topbar');
  if (!t) return;
  t.innerHTML = `
    <h1>${titel}</h1>
    <div class="topbar-right">
      <div class="date-pill" id="datumpill"></div>
      ${extra}
      <a href="../nieuws/nieuws.html" class="nieuws-bell" title="Nieuws">
        📰<span class="nieuws-badge" id="nieuws-badge" style="display:none">0</span>
      </a>
      ${toonTxKnop ? '<button class="btn btn-green" onclick="openTxModal()">+ Transactie</button>' : ''}
    </div>`;
  laadNieuwsTeller();
}

// ── TRANSACTIE MODAL ──────────────────────────────────────────
let _aandelen = [];

async function openTxModal(vooringevuldAandeelId = null) {
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
          <select id="tx-aandeel" onchange="updateTxValuta(this)">
            <option value="">— Kies aandeel —</option>
            ${_aandelen.map(a => `<option value="${a.id}" data-valuta="${a.valuta || 'EUR'}">${a.ticker} — ${a.naam}</option>`).join('')}
          </select>
        </div>
        <div class="form-grid">
          <div class="form-row"><label>Aantal stuks</label><input type="number" id="tx-aantal" placeholder="10" min="0.000001" step="any"/></div>
          <div class="form-row">
            <label>Prijs per stuk</label>
            <div style="display:flex;gap:.4rem">
              <select id="tx-valuta" style="width:95px;flex-shrink:0">
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
                <option value="GBP">£ GBP</option>
                <option value="GBp">p GBp</option>
                <option value="CHF">CHF</option>
                <option value="JPY">¥ JPY</option>
                <option value="CAD">C$ CAD</option>
                <option value="AUD">A$ AUD</option>
                <option value="NOK">kr NOK</option>
                <option value="SEK">kr SEK</option>
              </select>
              <input type="number" id="tx-prijs" placeholder="100.00" min="0" step="any" style="flex:1"/>
            </div>
          </div>
        </div>
        <div class="form-row"><label>Fees (in zelfde valuta)</label><input type="number" id="tx-fees" placeholder="2.00" min="0" step="0.01"/></div>
        <div class="form-row"><label>Notitie</label><input type="text" id="tx-notitie" placeholder="Optioneel"/></div>
        <div class="totaal-box">
          <div style="font-size:.72rem;color:var(--muted);margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.06em">Totale waarde (originele valuta)</div>
          <div id="tx-totaal" style="font-size:1.1rem;font-weight:700;color:var(--accent2)">– –</div>
        </div>
        <div id="tx-fout" class="fout-banner" style="display:none;margin-top:.75rem"></div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeTxModal()">Annuleren</button>
          <button class="btn btn-green" onclick="slaaTxOp()">✓ Opslaan</button>
        </div>
      </div>
    </div>`);

  document.getElementById('tx-datum').value = new Date().toISOString().split('T')[0];

  if (vooringevuldAandeelId) {
    const sel = document.getElementById('tx-aandeel');
    sel.value = vooringevuldAandeelId;
    updateTxValuta(sel);
  }

  document.getElementById('tx-modal').addEventListener('click', e => {
    if (e.target.id === 'tx-modal') closeTxModal();
  });

  ['tx-aantal', 'tx-prijs', 'tx-fees'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', () => {
      const u   = parseFloat(document.getElementById('tx-aantal')?.value) || 0;
      const p   = parseFloat(document.getElementById('tx-prijs')?.value)  || 0;
      const f   = parseFloat(document.getElementById('tx-fees')?.value)   || 0;
      const val = document.getElementById('tx-valuta')?.value || 'EUR';
      const sym = VALUTA_SYMBOOL[val] || val;
      document.getElementById('tx-totaal').textContent = (u * p + f) > 0 ? sym + ' ' + fmt(u * p + f) : '– –';
    })
  );
}

// Zet valuta dropdown automatisch op de valuta van het gekozen aandeel
function updateTxValuta(select) {
  const opt    = select.options[select.selectedIndex];
  const valuta = opt?.dataset?.valuta || 'EUR';
  const valSel = document.getElementById('tx-valuta');
  if (valSel) valSel.value = valuta;
}

function closeTxModal() { document.getElementById('tx-modal')?.remove(); }

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
    valuta:     document.getElementById('tx-valuta')?.value || 'EUR',
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

// ── INIT ──────────────────────────────────────────────────────
function dashboardInit(config = {}) {
  requireAuth();
  if (config.actief) injectSidebar(config.actief);
  if (config.titel)  injectTopbar(config.titel, config.extra || '', config.toonTxKnop !== false);
  klokTick();
  setInterval(klokTick, 30000);
}
