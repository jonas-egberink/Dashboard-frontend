async function herlaad() {
  const filters = {};
  const a = document.getElementById('f-aandeel')?.value; if(a) filters.ticker = a;
  const t = document.getElementById('f-type')?.value;    if(t) filters.type = t;
  const v = document.getElementById('f-van')?.value;     if(v) filters.van = v;
  const tot = document.getElementById('f-tot')?.value;   if(tot) filters.tot = tot;
  try {
    const txs = await api.getTransacties(filters);
    document.getElementById('tx-count').textContent = txs.length + ' transacties';
    document.getElementById('tx-tbody').innerHTML = txs.length ? txs.map(t=>`
      <tr>
        <td>${t.datum}</td>
        <td><span class="badge badge-${t.type==='Buy'?'buy':'sell'}">${t.type==='Buy'?'🟢 Koop':'🔴 Verkoop'}</span></td>
        <td><span class="ticker">${t.ticker}</span></td>
        <td style="font-size:.8rem;color:var(--muted)">${t.naam}</td>
        <td>${fmt(t.aantal,4)}</td>
        <td>€${fmt(t.prijs)}</td>
        <td>€${fmt(t.fees)}</td>
        <td>€${fmt(t.totaal)}</td>
        <td style="font-size:.8rem;color:var(--muted)">${t.notitie||'–'}</td>
        <td><button class="btn btn-red" style="padding:.2rem .5rem;font-size:.72rem" onclick="del('${t.id}')">✕</button></td>
      </tr>`).join('') : '<tr><td colspan="10" class="leeg">Geen transacties gevonden</td></tr>';
  } catch(e) { console.error(e); }
}

async function laadAandelen() {
  try {
    const aandelen = await api.getAandelen();
    const sel = document.getElementById('f-aandeel');
    aandelen.forEach(a => { const o=document.createElement('option'); o.value=a.ticker; o.textContent=a.ticker+' — '+a.naam; sel.appendChild(o); });
  } catch{}
}

async function del(id) {
  if (!confirm('Transactie verwijderen?')) return;
  try { await api.verwijderTransactie(id); herlaad(); } catch(e) { alert(e.message); }
}

function resetFilter() {
  ['f-aandeel','f-type','f-van','f-tot'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  herlaad();
}

document.addEventListener('DOMContentLoaded', () => {
  dashboardInit({ actief:'Transacties', titel:'Transacties' });
  laadAandelen();
  herlaad();
});
