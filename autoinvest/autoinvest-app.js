let _groepen = [];
let _geschiedenis = {};
let _drafts = {};
let _openEditors = {};

const rond = (waarde, decimalen = 2) => {
  const factor = Math.pow(10, decimalen);
  return Math.round((Number(waarde) || 0) * factor) / factor;
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function groepKey(groepId) {
  return encodeURIComponent(groepId);
}

function fromKey(key) {
  return decodeURIComponent(key);
}

function fmtDatum(datum) {
  if (!datum) return '–';
  return new Date(datum + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDatumTijd(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function pct(v) {
  return fmt(v, 2) + '%';
}

function dagOptiesHtml(geselecteerd = 5) {
  const huidig = Math.max(1, Math.min(28, Number(geselecteerd) || 5));
  return Array.from({ length: 28 }, (_, i) => i + 1)
    .map(d => `<option value="${d}" ${d === huidig ? 'selected' : ''}>Dag ${d}</option>`)
    .join('');
}

const VALUTA_OPTIES = ['EUR', 'USD', 'GBP', 'GBp', 'CHF', 'JPY', 'CAD', 'AUD', 'NOK', 'SEK', 'DKK'];
const FX_NAAR_EUR = { EUR: 1, USD: 0.92, GBP: 1.17, GBp: 0.0117, CHF: 1.04, JPY: 0.006, CAD: 0.68, AUD: 0.60, SEK: 0.088, NOK: 0.085, DKK: 0.134 };

function valutaOptiesHtml(geselecteerd = 'EUR') {
  return VALUTA_OPTIES.map(v => `<option value="${v}" ${v === geselecteerd ? 'selected' : ''}>${v}</option>`).join('');
}

function naarEurFrontend(bedrag, valuta) {
  const n = Number(bedrag || 0);
  const factor = FX_NAAR_EUR[valuta] || 1;
  return n * factor;
}

function vanEurFrontend(bedragEur, valuta) {
  const n = Number(bedragEur || 0);
  const factor = FX_NAAR_EUR[valuta] || 1;
  return factor ? n / factor : n;
}

function statusClass(plan) {
  if (!plan) return 'muted';
  if (!plan.validatie?.isGeldig) return 'red';
  return plan.actief ? 'green' : 'yellow';
}

function statusLabel(plan) {
  if (!plan) return 'Geen plan';
  if (!plan.validatie?.isGeldig) return 'Actie nodig';
  return plan.actief ? 'Actief' : 'Gepauzeerd';
}

function berekenVolgendeDatumVoorDraft(draft) {
  if (!draft?.uitvoerDag) return null;
  const vandaag = new Date();
  let jaar = vandaag.getFullYear();
  let maand = vandaag.getMonth();

  for (let i = 0; i < 24; i++) {
    const kandidaat = new Date(jaar, maand, Math.min(Number(draft.uitvoerDag), 28), 12, 0, 0);
    while (kandidaat.getDay() === 0 || kandidaat.getDay() === 6) kandidaat.setDate(kandidaat.getDate() + 1);
    if (kandidaat >= vandaag) {
      return kandidaat.toISOString().slice(0, 10);
    }
    maand += 1;
    if (maand > 11) {
      maand = 0;
      jaar += 1;
    }
  }
  return null;
}

function maakDraft(groep) {
  const plan = groep.plan;
  if (plan) {
    return {
      maandBedrag: plan.maandbedrag,
      maandBedragValuta: plan.maandbedragValuta || 'EUR',
      uitvoerDag: plan.uitvoerDag,
      actief: !!plan.actief,
      allocaties: plan.allocaties.map(item => ({ aandeel_id: item.aandeel_id, percentage: Number(item.percentage) })),
    };
  }

  return {
    maandBedrag: '',
    maandBedragValuta: 'EUR',
    uitvoerDag: 5,
    actief: true,
    allocaties: [],
  };
}

function getGroep(groepId) {
  return _groepen.find(item => item.groepId === groepId);
}

function getDraft(groepId) {
  if (!_drafts[groepId]) {
    const groep = getGroep(groepId);
    _drafts[groepId] = maakDraft(groep);
  }
  return _drafts[groepId];
}

function somAllocaties(draft) {
  return rond((draft.allocaties || []).reduce((som, item) => som + Number(item.percentage || 0), 0), 4);
}

function buildPreview(groep, draft) {
  return (draft.allocaties || [])
    .map(item => {
      const holding = groep.holdings.find(h => h.id === item.aandeel_id);
      if (!holding || Number(item.percentage) <= 0) return null;
      const bedragInput = Number(draft.maandBedrag || 0) * (Number(item.percentage) / 100);
      const bedragEUR = naarEurFrontend(bedragInput, draft.maandBedragValuta || 'EUR');
      const prijsEUR = Number(holding.huidigePrijsEUR || 0);
      const bedragDoelValuta = holding.voorkeurValuta || holding.valuta || 'EUR';
      const bedragDoel = vanEurFrontend(bedragEUR, bedragDoelValuta);
      const stuks = prijsEUR > 0 ? bedragEUR / prijsEUR : null;
      return {
        aandeel_id: item.aandeel_id,
        ticker: holding.ticker,
        naam: holding.naam,
        percentage: Number(item.percentage || 0),
        bedragInput: rond(bedragInput, 2),
        bedragInputValuta: draft.maandBedragValuta || 'EUR',
        bedragEUR: rond(bedragEUR, 2),
        bedragDoelValuta: rond(bedragDoel, 2),
        prijsOrigineel: holding.huidigePrijsOrigineel,
        prijsEUR: holding.huidigePrijsEUR,
        valuta: holding.valuta,
        voorkeurValuta: bedragDoelValuta,
        prijsVoorkeur: holding.huidigePrijsVoorkeur,
        stuks: stuks != null ? rond(stuks, 6) : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.percentage - a.percentage);
}

function normalizedDraftAllocaties(groep, draft) {
  const geldigeIds = new Set((groep.holdings || []).map(h => h.id));
  return (draft.allocaties || [])
    .filter(item => geldigeIds.has(item.aandeel_id))
    .map(item => ({ aandeel_id: item.aandeel_id, percentage: Number(item.percentage || 0) }));
}

function beschikbareHoldings(groep, draft) {
  const gekozen = new Set((draft.allocaties || []).map(item => item.aandeel_id));
  return (groep.holdings || []).filter(holding => !gekozen.has(holding.id));
}

async function herlaad() {
  try {
    const groepen = await api.getAutoInvestOverzicht();
    _groepen = groepen || [];
    _drafts = {};

    const histories = await Promise.all(_groepen.map(groep =>
      api.getAutoInvestHistory(groep.groepId)
        .then(data => [groep.groepId, data || []])
        .catch(() => [groep.groepId, []])
    ));
    _geschiedenis = Object.fromEntries(histories);

    renderStats();
    renderGroepen();
    renderGeschiedenis();
  } catch (e) {
    console.error(e);
    document.getElementById('autoinvest-groepen').innerHTML = `<div class="fout-banner">${escapeHtml(e.message)}</div>`;
  }
}

function renderStats() {
  const plannen = _groepen.filter(g => g.plan);
  const actievePlannen = plannen.filter(g => g.plan?.actief).length;
  const maandTotaal = plannen.filter(g => g.plan?.actief).reduce((som, g) => som + Number(g.plan.maandbedragEur || 0), 0);
  const volgende = plannen
    .filter(g => g.plan?.actief && g.plan?.volgendeUitvoering)
    .map(g => ({ groep: g.groepNaam, datum: g.plan.volgendeUitvoering }))
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];

  document.getElementById('autoinvest-stats').innerHTML = `
    <div class="card">
      <div class="card-title">Actieve plannen</div>
      <div class="stat-val">${actievePlannen}</div>
      <div class="stat-sub">van ${plannen.length} geconfigureerde groep${plannen.length === 1 ? '' : 'en'}</div>
    </div>
    <div class="card">
      <div class="card-title">Maandelijkse inleg</div>
      <div class="stat-val">€${fmt(maandTotaal)}</div>
      <div class="stat-sub">Alle actieve Auto-Invest plannen samen</div>
    </div>
    <div class="card">
      <div class="card-title">Volgende uitvoering</div>
      <div class="stat-val" style="font-size:1.2rem">${volgende ? fmtDatum(volgende.datum) : 'Nog niet gepland'}</div>
      <div class="stat-sub">${volgende ? escapeHtml(volgende.groep) : 'Maak eerst een plan aan'}</div>
    </div>`;
}

function renderPlanSamenvatting(groep) {
  if (!groep.plan) {
    return `
      <div class="leeg-state">
        <div>Voor <strong>${escapeHtml(groep.groepNaam)}</strong> is nog geen Auto-Invest plan ingesteld.</div>
        <div class="muted mt1">Maak een plan aan op basis van de huidige holdings in deze groep.</div>
      </div>`;
  }

  return `
    <div class="plan-meta-grid">
      <div class="meta-pill"><span>Maandbedrag</span><strong>€${fmt(groep.plan.maandbedragEur)}</strong></div>
      <div class="meta-pill"><span>Invoerbedrag</span><strong>${groep.plan.maandbedragValuta} ${fmt(groep.plan.maandbedrag)}</strong></div>
      <div class="meta-pill"><span>Status</span><strong class="${statusClass(groep.plan)}">${statusLabel(groep.plan)}</strong></div>
      <div class="meta-pill"><span>Volgende run</span><strong>${groep.plan.volgendeUitvoering ? fmtDatum(groep.plan.volgendeUitvoering) : '–'}</strong></div>
      <div class="meta-pill"><span>Koopdag</span><strong>Elke maand op dag ${groep.plan.uitvoerDag}</strong></div>
    </div>
    ${groep.plan.validatie?.meldingen?.length ? `
      <div class="fout-banner" style="margin-top:1rem">
        ${groep.plan.validatie.meldingen.map(m => `<div>• ${escapeHtml(m)}</div>`).join('')}
      </div>` : ''}
    <div class="allocatie-lijst mt1">
      ${groep.plan.allocaties.map(item => `
        <div class="allocatie-rij">
          <div class="allocatie-kop">
            <strong>${escapeHtml(item.ticker)}</strong>
            <span>${pct(item.percentage)}</span>
          </div>
          <div class="allocatie-balk"><span style="--alloc-width:${Math.max(0, Math.min(100, Number(item.percentage)))}%"></span></div>
          <div class="allocatie-sub">${escapeHtml(item.naam)} · ${item.huidigePrijsOrigineel != null ? `${item.valuta} ${fmt(item.huidigePrijsOrigineel)}` : 'Geen live koers'}</div>
        </div>`).join('')}
    </div>`;
}

function renderEditor(groep) {
  const open = !!_openEditors[groep.groepId];
  if (!open) return '';

  const draft = getDraft(groep.groepId);
  const totaal = somAllocaties(draft);
  const preview = buildPreview(groep, draft);
  const volgendeDatum = berekenVolgendeDatumVoorDraft(draft);
  const totaalOk = Math.abs(totaal - 100) <= 0.01;
  const key = groepKey(groep.groepId);
  const beschikbaar = beschikbareHoldings(groep, draft);

  return `
    <div class="editor-card mt1">
      <div class="form-grid">
        <div class="form-row">
          <label>Maandbedrag</label>
          <input type="number" min="0" step="0.01" value="${escapeHtml(draft.maandBedrag || '')}" oninput="updateDraftField('${key}','maandBedrag', this.value)" />
        </div>
        <div class="form-row">
          <label>Invoervaluta</label>
          <select onchange="updateDraftField('${key}','maandBedragValuta', this.value)">${valutaOptiesHtml(draft.maandBedragValuta || 'EUR')}</select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Wanneer wordt gekocht?</label>
          <select onchange="updateDraftField('${key}','uitvoerDag', this.value)">${dagOptiesHtml(draft.uitvoerDag || 5)}</select>
          <div class="muted" style="font-size:.76rem;margin-top:.4rem">Kies dag 1 t/m 28. Valt dit op een gesloten beursdag, dan schuift uitvoering door naar de eerstvolgende handelsdag.</div>
        </div>
      </div>
      <div class="toggle-row">
        <label class="toggle-label"><input type="checkbox" ${draft.actief ? 'checked' : ''} onchange="updateDraftField('${key}','actief', this.checked)" /> Plan actief</label>
        <span class="muted">Volgende geplande uitvoeringsdatum: <strong>${volgendeDatum ? fmtDatum(volgendeDatum) : '–'}</strong></span>
      </div>
      <div class="form-grid mt1">
        <div class="form-row">
          <label>Aandeel toevoegen aan verdeling</label>
          <select id="alloc-add-${key}">
            <option value="">— Kies aandeel —</option>
            ${beschikbaar.map(h => `<option value="${h.id}">${escapeHtml(h.ticker)} — ${escapeHtml(h.naam)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row" style="display:flex;align-items:flex-end">
          <button class="btn" style="height:38px" onclick="addDraftAllocation('${key}')" ${beschikbaar.length ? '' : 'disabled'}>+ Toevoegen</button>
        </div>
      </div>
      <div class="card mt1" style="padding:1rem 1.1rem">
        <div class="card-hd" style="margin-bottom:.75rem"><span class="card-title">Verdeling per ticker</span><strong class="${totaalOk ? 'green' : 'red'}">${pct(totaal)}</strong></div>
        ${(draft.allocaties || []).map(allocatie => {
          const holding = (groep.holdings || []).find(h => h.id === allocatie.aandeel_id);
          if (!holding) return '';
          return `
            <div class="alloc-input-row">
              <div>
                <strong>${escapeHtml(holding.ticker)}</strong>
                <div class="muted" style="font-size:.78rem">${escapeHtml(holding.naam)} · ${holding.huidigePrijsOrigineel != null ? `${holding.valuta} ${fmt(holding.huidigePrijsOrigineel)}` : 'Geen live koers'}</div>
              </div>
              <div class="alloc-input-wrap">
                <input type="number" min="0" max="100" step="0.01" value="${escapeHtml(allocatie.percentage)}" oninput="updateDraftAllocation('${key}','${holding.id}', this.value)" />
                <span>%</span>
                <button class="btn btn-ghost" type="button" onclick="removeDraftAllocation('${key}','${holding.id}')">✕</button>
              </div>
            </div>`;
        }).join('')}
        ${!(draft.allocaties || []).length ? '<div class="leeg-state">Voeg eerst aandelen toe aan je verdeling.</div>' : ''}
        ${!totaalOk ? '<div class="fout-banner" style="margin-top:.85rem">De totale verdeling moet exact 100% zijn.</div>' : ''}
      </div>
      <div class="card mt1" style="padding:1rem 1.1rem">
        <div class="card-hd" style="margin-bottom:.75rem"><span class="card-title">Live preview</span></div>
        ${preview.length ? preview.map(item => `
          <div class="preview-row">
            <div>
              <strong>${escapeHtml(item.ticker)}</strong>
              <div class="muted" style="font-size:.78rem">${pct(item.percentage)} van ${draft.maandBedragValuta || 'EUR'} ${fmt(draft.maandBedrag || 0)} per maand</div>
            </div>
            <div style="text-align:right">
              <strong>${item.bedragInputValuta} ${fmt(item.bedragInput)} → ${item.voorkeurValuta || item.valuta} ${fmt(item.bedragDoelValuta || 0)}</strong>
              <div class="muted" style="font-size:.78rem">${item.stuks != null ? `≈ ${fmt(item.stuks, 4)} stuks @ ${item.voorkeurValuta || item.valuta} ${fmt(item.prijsVoorkeur || item.prijsOrigineel || 0)}` : 'Geen live koers beschikbaar'}</div>
            </div>
          </div>`).join('') : '<div class="leeg-state">Voer een bedrag en verdeling in om de preview te zien.</div>'}
      </div>
      <div class="editor-actions">
        <button class="btn-cancel" onclick="closePlanEditor('${key}')">Annuleren</button>
        <button class="btn btn-green" onclick="savePlan('${key}')">${groep.plan ? '✓ Plan bijwerken' : '✓ Plan aanmaken'}</button>
      </div>
    </div>`;
}

function renderGroepen() {
  const container = document.getElementById('autoinvest-groepen');
  if (!_groepen.length) {
    container.innerHTML = '<div class="leeg">Geen groepen gevonden. Voeg eerst aandelen toe in de financiële pagina.</div>';
    return;
  }

  container.innerHTML = _groepen.map(groep => {
    const key = groepKey(groep.groepId);
    return `
      <section class="groep-card card mb1">
        <div class="groep-header">
          <div>
            <div class="groep-title-row">
              <h2>${escapeHtml(groep.groepNaam)}</h2>
              <span class="status-pill ${statusClass(groep.plan)}">${statusLabel(groep.plan)}</span>
            </div>
            <div class="muted" style="font-size:.82rem">${groep.holdings.length} holding${groep.holdings.length === 1 ? '' : 's'} in deze groep</div>
          </div>
          <div class="groep-actions">
            <button class="btn" onclick="openPlanEditor('${key}')">${groep.plan ? '✏️ Bewerk' : '➕ Nieuw plan'}</button>
            ${groep.plan ? `
              <label class="ai-switch-wrap" title="Auto-Invest aan/uit">
                <input type="checkbox" class="ai-switch-input" ${groep.plan.actief ? 'checked' : ''} onchange="togglePlanSwitch('${key}', this.checked)" />
                <span class="ai-switch-slider"></span>
                <span class="ai-switch-label ${groep.plan.actief ? 'green' : 'red'}">${groep.plan.actief ? 'Aan' : 'Uit'}</span>
              </label>
            ` : ''}
          </div>
        </div>
        <div class="holdings-strip">
          ${groep.holdings.map(holding => `
            <div class="holding-chip">
              <strong>${escapeHtml(holding.ticker)}</strong>
              <span>${escapeHtml(holding.naam)}</span>
              <small>${holding.huidigePrijsOrigineel != null ? `${holding.valuta} ${fmt(holding.huidigePrijsOrigineel)}` : 'Geen koers'}</small>
            </div>`).join('') || '<div class="leeg-state">Geen holdings gekoppeld aan deze groep.</div>'}
        </div>
        ${renderPlanSamenvatting(groep)}
        ${renderEditor(groep)}
      </section>`;
  }).join('');
}

function renderGeschiedenis() {
  const container = document.getElementById('autoinvest-history');
  const groepenMetData = _groepen.filter(groep => (_geschiedenis[groep.groepId] || []).length);

  if (!groepenMetData.length) {
    container.innerHTML = '<div class="card"><div class="leeg">Nog geen Auto-Invest uitvoeringen.</div></div>';
    return;
  }

  container.innerHTML = groepenMetData.map(groep => {
    const runs = _geschiedenis[groep.groepId] || [];
    return `
      <div class="card mb1">
        <div class="card-hd"><span class="card-title">Uitvoeringsgeschiedenis</span><strong>${escapeHtml(groep.groepNaam)}</strong></div>
        <table>
          <thead>
            <tr>
              <th>Gepland</th>
              <th>Uitgevoerd</th>
              <th>Status</th>
              <th>Totaal</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${runs.map(run => `
              <tr>
                <td>${fmtDatum(run.scheduledDate)}</td>
                <td>${fmtDatumTijd(run.executedAt)}</td>
                <td><span class="status-pill ${run.status === 'executed' ? 'green' : run.status === 'failed' ? 'red' : 'yellow'}">${escapeHtml(run.status)}</span></td>
                <td>${run.totaalBedragEur ? '€' + fmt(run.totaalBedragEur) : '–'}</td>
                <td>
                  ${run.details?.length ? run.details.map(detail => `
                    <div class="history-detail">
                      <strong>${escapeHtml(detail.ticker)}</strong>
                      <span>€${fmt(detail.bedrag_eur || 0)} · ${fmt(detail.aantal || 0, 4)} stuks @ ${escapeHtml(detail.valuta || 'EUR')} ${fmt(detail.koers_origineel || 0)}</span>
                    </div>`).join('') : `<span class="muted">${escapeHtml(run.reden || 'Geen details')}</span>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }).join('');
}

function openPlanEditor(groupKey) {
  const groepId = fromKey(groupKey);
  _openEditors[groepId] = true;
  getDraft(groepId);
  renderGroepen();
}

function closePlanEditor(groupKey) {
  const groepId = fromKey(groupKey);
  _openEditors[groepId] = false;
  renderGroepen();
}

function updateDraftField(groupKey, veld, waarde) {
  const groepId = fromKey(groupKey);
  const draft = getDraft(groepId);
  draft[veld] = waarde;
  renderGroepen();
}

function updateDraftAllocation(groupKey, aandeelId, waarde) {
  const groepId = fromKey(groupKey);
  const draft = getDraft(groepId);
  const bestaand = draft.allocaties.find(item => item.aandeel_id === aandeelId);
  if (bestaand) bestaand.percentage = Number(waarde || 0);
  else draft.allocaties.push({ aandeel_id: aandeelId, percentage: Number(waarde || 0) });
  renderGroepen();
}

function addDraftAllocation(groupKey) {
  const groepId = fromKey(groupKey);
  const draft = getDraft(groepId);
  const select = document.getElementById('alloc-add-' + groupKey);
  const aandeelId = select?.value;
  if (!aandeelId) return;
  if (draft.allocaties.some(item => item.aandeel_id === aandeelId)) return;
  draft.allocaties.push({ aandeel_id: aandeelId, percentage: 0 });
  renderGroepen();
}

function removeDraftAllocation(groupKey, aandeelId) {
  const groepId = fromKey(groupKey);
  const draft = getDraft(groepId);
  draft.allocaties = draft.allocaties.filter(item => item.aandeel_id !== aandeelId);
  renderGroepen();
}

async function savePlan(groupKey) {
  const groepId = fromKey(groupKey);
  const groep = getGroep(groepId);
  const draft = getDraft(groepId);
  const totaal = somAllocaties(draft);

  if (!groep?.holdings?.length) {
    alert('Deze groep heeft nog geen holdings.');
    return;
  }
  if (!draft.maandBedrag || Number(draft.maandBedrag) <= 0) {
    alert('Vul een geldig maandbedrag in.');
    return;
  }
  if (!Number.isInteger(Number(draft.uitvoerDag)) || Number(draft.uitvoerDag) < 1 || Number(draft.uitvoerDag) > 28) {
    alert('Uitvoeringsdag moet tussen 1 en 28 liggen.');
    return;
  }
  if (!(draft.allocaties || []).length) {
    alert('Voeg minimaal één aandeel toe aan de verdeling.');
    return;
  }
  if (Math.abs(totaal - 100) > 0.01) {
    alert('De verdeling moet exact 100% zijn.');
    return;
  }

  try {
    const allocaties = normalizedDraftAllocaties(groep, draft);
    await api.saveAutoInvestPlan(groepId, {
      maandBedrag: Number(draft.maandBedrag),
      maandBedragValuta: draft.maandBedragValuta || 'EUR',
      uitvoerDag: Number(draft.uitvoerDag),
      actief: !!draft.actief,
      allocaties,
    });
    _openEditors[groepId] = false;
    await herlaad();
  } catch (e) {
    alert(e.message);
  }
}

async function togglePlanSwitch(groupKey, actief) {
  const groepId = fromKey(groupKey);
  const groep = getGroep(groepId);
  if (!groep?.plan) return;

  try {
    await api.saveAutoInvestPlan(groepId, {
      maandBedrag: groep.plan.maandbedrag,
      maandBedragValuta: groep.plan.maandbedragValuta || 'EUR',
      uitvoerDag: groep.plan.uitvoerDag,
      actief: !!actief,
      allocaties: groep.plan.allocaties.map(item => ({ aandeel_id: item.aandeel_id, percentage: Number(item.percentage) })),
    });
    await herlaad();
  } catch (e) {
    alert(e.message);
  }
}

async function deletePlan(groupKey) {
  const groepId = fromKey(groupKey);
  if (!confirm(`Auto-Invest plan voor ${groepId} verwijderen?`)) return;
  try {
    await api.deleteAutoInvestPlan(groepId);
    await herlaad();
  } catch (e) {
    alert(e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  dashboardInit({ actief: 'Auto-Invest', titel: 'Auto-Invest', extra: `<button class="btn" onclick="herlaad()">↻ Refresh</button>` });
  herlaad();
});

window.herlaad = herlaad;
window.openPlanEditor = openPlanEditor;
window.closePlanEditor = closePlanEditor;
window.updateDraftField = updateDraftField;
window.updateDraftAllocation = updateDraftAllocation;
window.addDraftAllocation = addDraftAllocation;
window.removeDraftAllocation = removeDraftAllocation;
window.savePlan = savePlan;
window.togglePlanSwitch = togglePlanSwitch;
window.deletePlan = deletePlan;





