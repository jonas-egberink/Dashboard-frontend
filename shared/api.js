/* ═══════════════════════════════════════════════════════
   shared/api.js — Één API client voor het hele dashboard
   Pas alleen HIER de API_URL aan na Railway deployment.
   ═══════════════════════════════════════════════════════ */

const API_URL = 'https://dashboard-backend.up.railway.app';

const api = {
  // ── TOKEN BEHEER ──────────────────────────────────────
  getToken:    () => localStorage.getItem('db_token'),
  setToken:    (t) => localStorage.setItem('db_token', t),
  removeToken: () => localStorage.removeItem('db_token'),
  isLoggedIn:  () => !!localStorage.getItem('db_token'),

  // ── FETCH WRAPPER ─────────────────────────────────────
  async _fetch(pad, opties = {}) {
    const token = this.getToken();
    const resp = await fetch(API_URL + pad, {
      ...opties,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(opties.headers ?? {}),
      },
    });
    if (resp.status === 401) {
      this.removeToken();
      window.location.href = '../login/login.html';
      return null;
    }
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json.error || 'Onbekende fout');
    return json.data !== undefined ? json.data : json;
  },

  // ── AUTH ──────────────────────────────────────────────
  async login(email, ww) {
    const d = await this._fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, wachtwoord: ww }) });
    if (d) { this.setToken(d.token); return d.gebruiker; }
  },
  async registreer(email, ww, naam) {
    const d = await this._fetch('/api/auth/registreer', { method: 'POST', body: JSON.stringify({ email, wachtwoord: ww, naam }) });
    if (d) { this.setToken(d.token); return d.gebruiker; }
  },
  async logout() { this.removeToken(); window.location.href = '../login/login.html'; },
  async ikBen()  { return this._fetch('/api/auth/ik'); },

  // ── PORTFOLIO ─────────────────────────────────────────
  async getPortfolio() { return this._fetch('/api/portfolio'); },

  // ── AANDELEN ──────────────────────────────────────────
  async getAandelen()                        { return this._fetch('/api/aandelen'); },
  async zoekAandeel(ticker)                  { return this._fetch('/api/aandelen/zoek?ticker=' + encodeURIComponent(ticker)); },
  async voegAandeelToe(ticker, rekening = 'Standaard') { return this._fetch('/api/aandelen', { method: 'POST', body: JSON.stringify({ ticker, rekening }) }); },
  async verwijderAandeel(id)                 { return this._fetch('/api/aandelen/' + id, { method: 'DELETE' }); },

  // ── TRANSACTIES ───────────────────────────────────────
  async getTransacties(f = {}) {
    const p = new URLSearchParams(f).toString();
    return this._fetch('/api/transacties' + (p ? '?' + p : ''));
  },
  async voegTransactieToe(data) { return this._fetch('/api/transacties', { method: 'POST', body: JSON.stringify(data) }); },
  async verwijderTransactie(id) { return this._fetch('/api/transacties/' + id, { method: 'DELETE' }); },

  // ── NIEUWS ────────────────────────────────────────────
  async getNieuws(f = {}) {
    const p = new URLSearchParams(f).toString();
    return this._fetch('/api/nieuws' + (p ? '?' + p : ''));
  },
  async nieuwsTeller()             { return this._fetch('/api/nieuws/teller'); },
  async verversNieuws()            { return this._fetch('/api/nieuws/verversen', { method: 'POST' }); },
  async markeerGelezen(id)         { return this._fetch('/api/nieuws/' + id + '/gelezen', { method: 'PATCH' }); },
  async markeerAllesGelezen()      { return this._fetch('/api/nieuws/alles-gelezen', { method: 'PATCH' }); },

  // ── ADVIES ────────────────────────────────────────────
  async getAdvies()       { return this._fetch('/api/advies'); },
  async genereerAdvies()  { return this._fetch('/api/advies', { method: 'POST' }); },

  // ── PAGINA DATA ───────────────────────────────────────
  async getPaginaData(pagina)          { return this._fetch('/api/paginas/' + pagina); },
  async slaOp(pagina, sleutel, waarde) { return this._fetch('/api/paginas/' + pagina + '/' + sleutel, { method: 'PUT', body: JSON.stringify({ waarde }) }); },
  async verwijderItem(pagina, sleutel) { return this._fetch('/api/paginas/' + pagina + '/' + sleutel, { method: 'DELETE' }); },
};
