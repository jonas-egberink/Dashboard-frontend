if (api.isLoggedIn()) window.location.href = '../home/index.html';

let modus = 'login';

function toonTab(t) {
  modus = t;
  document.querySelectorAll('.tab').forEach((b, i) => b.classList.toggle('active', (i === 0) === (t === 'login')));
  document.getElementById('naam-rij').style.display = t === 'registreer' ? 'block' : 'none';
  document.getElementById('knop-tekst').textContent = t === 'login' ? 'Inloggen' : 'Account aanmaken';
  document.getElementById('fout').style.display = 'none';
}

document.getElementById('ww').addEventListener('keydown', e => { if (e.key === 'Enter') verstuur(); });

async function verstuur() {
  const f = document.getElementById('fout');
  f.style.display = 'none';
  const e = document.getElementById('email').value.trim();
  const w = document.getElementById('ww').value;
  const n = document.getElementById('naam').value.trim();
  if (!e || !w) { f.textContent = 'Vul email en wachtwoord in.'; f.style.display = 'block'; return; }
  try {
    if (modus === 'login') await api.login(e, w);
    else await api.registreer(e, w, n);
    window.location.href = '../home/index.html';
  } catch (err) { f.textContent = err.message; f.style.display = 'block'; }
}
