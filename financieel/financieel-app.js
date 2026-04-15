let _posities = [], _rekeningen = [], _huidigAandeel = null, _periode = 'alles';
let _rekReningShowPct = {}; // Tracking welke rekeningen procenten moeten tonen

// Valuta symbool helper
const sym = v => ({ EUR: '€', USD: '$', GBP: '£', GBp: 'p', CHF: 'CHF ', JPY: '¥', CAD: 'C$', AUD: 'A$', NOK: 'kr ', SEK: 'kr ', DKK: 'kr ' }[v] || (v + ' '));

async function herlaad() {
  try {
    const data  = await api.getPortfolio();
    _posities   = data.posities   || [];
    _rekeningen = data.rekeningen || [];
    renderStats(data.totalen);
    renderRekeningen(_rekeningen);
    updateDatalijsten();
    document.getElementById('koers-tijd')?.replaceChildren(
      document.createTextNode('Live · ' + new Date().toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}))
    );
    if (_huidigAandeel) laadDetail(_huidigAandeel);
  } catch(e) { console.error(e); }
}

// ── TOTAAL STATS — altijd in EUR ─────────────────────────
function renderStats(t) {
  const rendement = t.totaleKost > 0 ? (t.ongrealiseerdGV / t.totaleKost * 100).toFixed(1) + '%' : '–';
  document.getElementById('fin-stats').innerHTML = `
    <div class="card">
      <div class="card-hd"><span class="card-title">Totale Waarde</span><span id="koers-tijd" style="font-size:.72rem;color:var(--muted)"></span></div>
      <div class="stat-val">€${fmt(t.portfolioWaarde)}</div>
      <div class="stat-sub">Alle actieve posities · in EUR</div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-title">Ongerealiseerd</span></div>
      <div class="stat-val ${kleur(t.ongrealiseerdGV)}">${fmtBedrag(t.ongrealiseerdGV, true)}</div>
      <div class="stat-sub">${rendement} rendement · in EUR</div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-title">Gerealiseerd</span></div>
      <div class="stat-val ${kleur(t.grealiseerdGV)}">${fmtBedrag(t.grealiseerdGV, true)}</div>
      <div class="stat-sub">Afgesloten posities · in EUR</div>
    </div>`;
}

// ── REKENINGEN — totalen in EUR ───────────────────────────
function renderRekeningen(rekeningen) {
  const container = document.getElementById('rekeningen-container');
  if (!rekeningen.length) {
    container.innerHTML = '<div class="leeg">Geen aandelen gevonden. Voeg er een toe hieronder.</div>';
    return;
  }
  container.innerHTML = rekeningen.map(r => {
    const sleutel = r.naam.replace(/\s/g,'_');
    const toonPct = _rekReningShowPct[r.naam] || false;
    const ongrPct = r.totalen.totaleKost > 0 ? (r.totalen.ongrealiseerdGV / r.totalen.totaleKost * 100).toFixed(1) : 0;
    const grPct = r.totalen.totaleKost > 0 ? (r.totalen.grealiseerdGV / r.totalen.totaleKost * 100).toFixed(1) : 0;
    const totaalPct = r.totalen.totaleKost > 0 ? ((r.totalen.ongrealiseerdGV + r.totalen.grealiseerdGV) / r.totalen.totaleKost * 100).toFixed(1) : 0;

    return `
    <div class="rekening-blok">
      <div class="rekening-header" onclick="toggleRekening('${r.naam}')">
        <div class="rekening-naam">
          <span class="rekening-pijl open" id="pijl-${sleutel}">▶</span>
          🏦 ${r.naam}
          <span style="font-size:.72rem;color:var(--muted);font-weight:400">${r.totalen.aantalAandelen} positie${r.totalen.aantalAandelen !== 1 ? 's' : ''}</span>
        </div>
        <div class="rekening-stats" id="stats-${sleutel}" onclick="toggleRekeningPct('${r.naam}'); event.stopPropagation();">
          <div class="rekening-stat">
            <div class="rekening-stat-label">Waarde (EUR)</div>
            <div class="rekening-stat-val">€${fmt(r.totalen.portfolioWaarde)}</div>
          </div>
          <div class="rekening-stat">
            <div class="rekening-stat-label">Ongerealiseerd</div>
            <div class="rekening-stat-val ${kleur(r.totalen.ongrealiseerdGV)}">${toonPct ? (ongrPct >= 0 ? '+' : '') + ongrPct + '%' : fmtBedrag(r.totalen.ongrealiseerdGV, true)}</div>
          </div>
          <div class="rekening-stat">
            <div class="rekening-stat-label">Gerealiseerd</div>
            <div class="rekening-stat-val ${kleur(r.totalen.grealiseerdGV)}">${toonPct ? (grPct >= 0 ? '+' : '') + grPct + '%' : fmtBedrag(r.totalen.grealiseerdGV, true)}</div>
          </div>
          <div class="rekening-stat">
            <div class="rekening-stat-label">Totaal G/V</div>
            <div class="rekening-stat-val ${kleur(r.totalen.totaalGV)}">${toonPct ? (totaalPct >= 0 ? '+' : '') + totaalPct + '%' : fmtBedrag(r.totalen.totaalGV, true)}</div>
          </div>
        </div>
      </div>
      <div class="rekening-tabel-wrap" id="tabel-${sleutel}">
        <table>
          <thead>
            <tr>
              <th></th><th>Ticker</th><th>Naam</th><th>Stuks</th>
              <th>Gem. kost (€)</th><th>Koers (€)</th><th>Waarde (€)</th>
              <th>Ongerealiseerd (€)</th><th>Gerealiseerd (€)</th><th>Dag %</th>
            </tr>
          </thead>
          <tbody>
            ${r.posities.map(p => `
              <tr style="cursor:pointer" onclick="toggleDetail('${p.id}','${p.ticker}','${p.naam}')">
                <td style="color:var(--muted);font-size:.7rem">${p.aantalAandelen > 0 ? '●' : ''}</td>
                <td><span class="ticker">${p.ticker}</span></td>
                <td style="font-size:.82rem;color:var(--muted)">${p.naam}</td>
                <td>${p.aantalAandelen > 0 ? fmt(p.aantalAandelen, 4) : '–'}</td>
                <td>${p.aantalAandelen > 0 ? '€' + fmt(p.gemiddeldeKostprijs) : '–'}</td>
                <td>${p.huidigePrijs != null ? '€' + fmt(p.huidigePrijs) : '–'}</td>
                <td>${p.aantalAandelen > 0 ? '€' + fmt(p.marktWaarde) : '–'}</td>
                <td class="${kleur(p.ongrealiseerdGV)}">${p.aantalAandelen > 0 ? fmtBedrag(p.ongrealiseerdGV, true) + ' (' + fmt(p.ongrealiseerdPct * 100, 1) + '%)' : '–'}</td>
                <td class="${kleur(p.grealiseerdGV)}">${p.grealiseerdGV !== 0 ? fmtBedrag(p.grealiseerdGV, true) : '–'}</td>
                <td class="${kleur(p.dagWijziging ?? 0)}">${p.dagWijzigingPct != null ? (p.dagWijzigingPct >= 0 ? '+' : '') + fmt(p.dagWijzigingPct, 2) + '%' : '–'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}

function toggleRekening(naam) {
  const sleutel = naam.replace(/\s/g, '_');
  const tabel = document.getElementById('tabel-' + sleutel);
  const pijl  = document.getElementById('pijl-' + sleutel);
  if (!tabel) return;
  const open = !tabel.classList.contains('verborgen');
  tabel.classList.toggle('verborgen', open);
  pijl.classList.toggle('open', !open);
}

function toggleRekeningPct(naam) {
  _rekReningShowPct[naam] = !(_rekReningShowPct[naam] || false);
  renderRekeningen(_rekeningen);
}

function updateDatalijsten() {
  // Rekening datalist
  const namen = [...new Set(_rekeningen.map(r => r.naam))];
  const list  = document.getElementById('rekening-lijst');
  if (list) list.innerHTML = namen.map(n => `<option value="${n}">`).join('');

  // Valuta aanpassen dropdown
  const vwSel = document.getElementById('vw-aandeel');
  if (vwSel) {
    vwSel.innerHTML = '<option value="">— Kies aandeel —</option>' +
      _posities.map(p => `<option value="${p.id}">${p.ticker} — ${p.naam}</option>`).join('');
  }
}

// ── DETAIL — prijs/fees/totaal in ORIGINELE valuta ───────
async function toggleDetail(id, ticker, naam) {
  if (_huidigAandeel === id) { sluitDetail(); return; }
  _huidigAandeel = id;
  _periode = 'alles';
  document.querySelectorAll('.periode-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.getElementById('detail-titel').textContent = `Transacties — ${ticker} (${naam})`;
  document.getElementById('detail-sectie').style.display = 'block';
  document.getElementById('detail-sectie').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  await laadDetail(id);
}

async function laadDetail(aandeelId) {
  document.getElementById('aankopen-tbody').innerHTML = '<tr><td colspan="8" class="loader"><span class="spin">⟳</span> Laden…</td></tr>';
  try {
    const alle      = await api.getTransacties({ aandeel_id: aandeelId });
    const gefilterd = filterPeriode(alle, _periode);
    renderDetailStats(gefilterd);
    renderAankopen(gefilterd);
  } catch(e) { console.error(e); }
}

function filterPeriode(txs, periode) {
  const nu = new Date();
  if (periode === 'week')  { const d = new Date(nu); d.setDate(d.getDate() - 7); return txs.filter(t => t.datum >= d.toISOString().split('T')[0]); }
  if (periode === 'maand') { const d = new Date(nu.getFullYear(), nu.getMonth(), 1); return txs.filter(t => t.datum >= d.toISOString().split('T')[0]); }
  if (periode === 'jaar')  { return txs.filter(t => t.datum >= (nu.getFullYear() + '-01-01')); }
  return txs;
}

// Detail stats — bedragen in originele valuta per valuta groep
function renderDetailStats(txs) {
  const groepen = {};
  txs.forEach(t => {
    const v = t.valuta || 'EUR';
    if (!groepen[v]) groepen[v] = { gekocht: 0, verkocht: 0, koopN: 0, verkN: 0 };
    if (t.type === 'Buy')  { groepen[v].gekocht  += t.aantal * t.prijs + (t.fees || 0); groepen[v].koopN++; }
    if (t.type === 'Sell') { groepen[v].verkocht += t.aantal * t.prijs - (t.fees || 0); groepen[v].verkN++; }
  });

  const gekochtStr  = Object.entries(groepen).filter(([,g]) => g.gekocht  > 0).map(([v,g]) => `${sym(v)}${fmt(g.gekocht)}`).join(' + ')  || '–';
  const verkochtStr = Object.entries(groepen).filter(([,g]) => g.verkocht > 0).map(([v,g]) => `${sym(v)}${fmt(g.verkocht)}`).join(' + ') || '–';

  document.getElementById('detail-stats').innerHTML = `
    <div class="card">
      <div class="card-title">Totaal gekocht</div>
      <div class="stat-val" style="font-size:.95rem">${gekochtStr}</div>
      <div class="stat-sub">${txs.filter(t => t.type === 'Buy').length} aankopen · originele valuta</div>
    </div>
    <div class="card">
      <div class="card-title">Totaal verkocht</div>
      <div class="stat-val" style="font-size:.95rem">${verkochtStr}</div>
      <div class="stat-sub">${txs.filter(t => t.type === 'Sell').length} verkopen · originele valuta</div>
    </div>
    <div class="card">
      <div class="card-title">Transacties</div>
      <div class="stat-val">${txs.length}</div>
      <div class="stat-sub">In geselecteerde periode</div>
    </div>`;
}

// Transactie rijen — prijs/fees/totaal in originele valuta met juist teken
function renderAankopen(txs) {
  document.getElementById('aankopen-tbody').innerHTML = txs.length ? txs.map(t => {
    const s              = sym(t.valuta || 'EUR');
    const totaalOrigineel = t.aantal * t.prijs + (t.fees || 0);
    const notitieVeilig  = (t.notitie || '').replace(/'/g, '').replace(/"/g, '');
    return `
      <tr>
        <td>${t.datum}</td>
        <td><span class="badge badge-${t.type === 'Buy' ? 'buy' : 'sell'}">${t.type === 'Buy' ? '🟢 Koop' : '🔴 Verkoop'}</span></td>
        <td>${fmt(t.aantal, 4)}</td>
        <td>
          <span class="valuta-badge">${t.valuta || 'EUR'}</span>
          ${s}${fmt(t.prijs)}
        </td>
        <td>${s}${fmt(t.fees || 0)}</td>
        <td style="font-weight:600">${s}${fmt(totaalOrigineel)}</td>
        <td style="color:var(--muted);font-size:.8rem">${t.notitie || '–'}</td>
        <td style="display:flex;gap:.3rem">
          <button class="btn btn-ghost" style="padding:.2rem .5rem;font-size:.72rem"
            onclick="openBewerkModal('${t.id}','${t.aandeel_id}','${t.type}','${t.datum}',${t.aantal},${t.prijs},${t.fees || 0},'${notitieVeilig}','${t.valuta || 'EUR'}')">✏️</button>
          <button class="btn btn-red" style="padding:.2rem .5rem;font-size:.72rem"
            onclick="verwijderTx('${t.id}')">✕</button>
        </td>
      </tr>`;
  }).join('') : '<tr><td colspan="8" class="leeg">Geen transacties in deze periode</td></tr>';
}

function setPeriode(p) {
  _periode = p;
  document.querySelectorAll('.periode-btn').forEach(b =>
    b.classList.toggle('active', b.textContent.toLowerCase().includes(p === 'alles' ? 'alles' : p === 'week' ? 'week' : p === 'maand' ? 'maand' : 'jaar'))
  );
  if (_huidigAandeel) laadDetail(_huidigAandeel);
}

function sluitDetail() { _huidigAandeel = null; document.getElementById('detail-sectie').style.display = 'none'; }

// ── TRANSACTIE BEWERKEN ───────────────────────────────────
function openBewerkModal(id, aandeelId, type, datum, aantal, prijs, fees, notitie, valuta) {
  document.getElementById('bewerk-modal')?.remove();
  const s = sym(valuta || 'EUR');
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="bewerk-modal">
      <div class="modal" onclick="event.stopPropagation()">
        <h2>✏️ Transactie aanpassen</h2>
        <div class="form-grid">
          <div class="form-row"><label>Type</label>
            <select id="bw-type">
              <option value="Buy" ${type === 'Buy' ? 'selected' : ''}>🟢 Koop</option>
              <option value="Sell" ${type === 'Sell' ? 'selected' : ''}>🔴 Verkoop</option>
            </select>
          </div>
          <div class="form-row"><label>Datum</label><input type="date" id="bw-datum" value="${datum}"/></div>
        </div>
        <div class="form-row"><label>Valuta</label>
          <select id="bw-valuta">
            <option value="EUR" ${valuta==='EUR'?'selected':''}>€ EUR</option>
            <option value="USD" ${valuta==='USD'?'selected':''}>$ USD</option>
            <option value="GBP" ${valuta==='GBP'?'selected':''}>£ GBP</option>
            <option value="GBp" ${valuta==='GBp'?'selected':''}>p GBp (pence)</option>
            <option value="CHF" ${valuta==='CHF'?'selected':''}>CHF</option>
            <option value="JPY" ${valuta==='JPY'?'selected':''}>¥ JPY</option>
            <option value="CAD" ${valuta==='CAD'?'selected':''}>C$ CAD</option>
            <option value="AUD" ${valuta==='AUD'?'selected':''}>A$ AUD</option>
            <option value="NOK" ${valuta==='NOK'?'selected':''}>kr NOK</option>
            <option value="SEK" ${valuta==='SEK'?'selected':''}>kr SEK</option>
          </select>
        </div>
        <div class="form-grid">
          <div class="form-row"><label>Aantal stuks</label><input type="number" id="bw-aantal" value="${aantal}" min="0.000001" step="any"/></div>
          <div class="form-row"><label>Prijs per stuk (${valuta || 'EUR'})</label><input type="number" id="bw-prijs" value="${prijs}" min="0" step="any"/></div>
        </div>
        <div class="form-row"><label>Fees (${valuta || 'EUR'})</label><input type="number" id="bw-fees" value="${fees}" min="0" step="0.01"/></div>
        <div class="form-row"><label>Notitie</label><input type="text" id="bw-notitie" value="${notitie}"/></div>
        <div id="bw-fout" class="fout-banner" style="display:none;margin-top:.75rem"></div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="document.getElementById('bewerk-modal').remove()">Annuleren</button>
          <button class="btn btn-green" onclick="slaaBewerkingOp('${id}')">✓ Opslaan</button>
        </div>
      </div>
    </div>`);
  document.getElementById('bewerk-modal').addEventListener('click', e => {
    if (e.target.id === 'bewerk-modal') document.getElementById('bewerk-modal').remove();
  });
}

async function slaaBewerkingOp(id) {
  const fout = document.getElementById('bw-fout');
  fout.style.display = 'none';
  const payload = {
    type:    document.getElementById('bw-type').value,
    datum:   document.getElementById('bw-datum').value,
    valuta:  document.getElementById('bw-valuta').value,
    aantal:  parseFloat(document.getElementById('bw-aantal').value),
    prijs:   parseFloat(document.getElementById('bw-prijs').value),
    fees:    parseFloat(document.getElementById('bw-fees').value) || 0,
    notitie: document.getElementById('bw-notitie').value || null,
  };
  try {
    await api.pasTransactieAan(id, payload);
    document.getElementById('bewerk-modal').remove();
    await herlaad();
  } catch(e) { fout.textContent = e.message; fout.style.display = 'block'; }
}

// ── VALUTA BULK AANPASSEN ─────────────────────────────────
async function pasValutaAan() {
  const fout      = document.getElementById('vw-fout');
  const aandeelId = document.getElementById('vw-aandeel').value;
  const valuta    = document.getElementById('vw-valuta').value;
  fout.style.display = 'none';
  if (!aandeelId) { fout.textContent = 'Kies een aandeel.'; fout.style.display = 'block'; return; }
  if (!confirm(`Alle transacties van dit aandeel aanpassen naar ${valuta}? Dit kan niet ongedaan worden gemaakt.`)) return;
  try {
    await api.pasValutaAanBulk(aandeelId, valuta);
    await herlaad();
    alert(`✓ Valuta bijgewerkt naar ${valuta}`);
  } catch(e) { fout.textContent = e.message; fout.style.display = 'block'; }
}

async function verwijderTx(id) {
  if (!confirm('Transactie verwijderen?')) return;
  try { await api.verwijderTransactie(id); await herlaad(); } catch(e) { alert(e.message); }
}

// ── NIEUW AANDEEL ─────────────────────────────────────────
async function zoekTicker() {
  const ticker   = document.getElementById('nieuw-ticker').value.trim().toUpperCase();
  const rekening = document.getElementById('nieuw-rekening').value.trim() || 'Standaard';
  if (!ticker) return;
  const res = document.getElementById('zoek-resultaat');
  res.style.display = 'block';
  res.innerHTML = '<span class="spin">⟳</span> Zoeken op Yahoo Finance…';
  try {
    const info = await api.zoekAandeel(ticker);
    if (!info.gevonden) {
      res.innerHTML = `<span style="color:var(--red)">❌ "${ticker}" niet gevonden. Probeer bijv. VUSA.AS</span>`;
      return;
    }
    res.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">
        <div>
          <strong>${info.ticker}</strong> — ${info.naam}<br>
          <span style="font-size:.78rem;color:var(--muted)">${info.exchange} · ${info.valuta} · Prijs: ${info.prijs != null ? '€' + fmt(info.prijs) : 'onbekend'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          <span style="font-size:.8rem;color:var(--muted)">Rekening: <strong>${rekening}</strong></span>
          <button class="btn btn-green" onclick="voegToe('${info.ticker}','${rekening}')">+ Toevoegen</button>
        </div>
      </div>`;
  } catch(e) { res.innerHTML = `<span style="color:var(--red)">Fout: ${e.message}</span>`; }
}

async function voegToe(ticker, rekening) {
  try {
    await api.voegAandeelToe(ticker, rekening);
    document.getElementById('nieuw-ticker').value   = '';
    document.getElementById('nieuw-rekening').value = '';
    document.getElementById('zoek-resultaat').style.display = 'none';
    await herlaad();
  } catch(e) { alert(e.message); }
}

document.getElementById('nieuw-ticker')?.addEventListener('keydown', e => { if (e.key === 'Enter') zoekTicker(); });

document.addEventListener('DOMContentLoaded', () => {
  dashboardInit({ actief: 'Financieel', titel: 'Financieel', extra: `<button class="btn" onclick="herlaad()">↻ Refresh</button>` });
  herlaad();
  setInterval(herlaad, 2 * 60 * 1000);
});
