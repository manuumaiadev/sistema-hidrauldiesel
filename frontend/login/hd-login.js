// hd-login.js
// Usuários temporários (frontend only).
// Quando tiver backend: substituir a função `autenticar` por uma chamada fetch() à API.

const USUARIOS = [
  { username: 'admin',    password: 'admin123', name: 'Administrador' },
  { username: 'manuella', password: 'hd2026',   name: 'Manuella'      },
];

// ── Redirecionamento se já estiver logado ──
if (sessionStorage.getItem('hd_user')) {
  window.location.replace('../dashboard/');
}

// ── Referências DOM ──
const form        = document.getElementById('loginForm');
const inputUser   = document.getElementById('username');
const inputPass   = document.getElementById('password');
const errorBox    = document.getElementById('loginError');
const btnLogin    = document.getElementById('btnLogin');
const btnText     = document.getElementById('btnText');
const btnLoader   = document.getElementById('btnLoader');
const toggleBtn   = document.getElementById('togglePassword');
const eyeIcon     = document.getElementById('eyeIcon');

// ── Mostrar/ocultar senha ──
toggleBtn.addEventListener('click', function () {
  const isPassword = inputPass.type === 'password';
  inputPass.type = isPassword ? 'text' : 'password';
  eyeIcon.innerHTML = isPassword
    ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

// ── Submit ──
form.addEventListener('submit', function (e) {
  e.preventDefault();
  errorBox.textContent = '';

  const username = inputUser.value.trim();
  const password = inputPass.value;

  if (!username || !password) {
    errorBox.textContent = 'Preencha usuário e senha.';
    return;
  }

  // Simula loading (facilita a troca por fetch() no futuro)
  setLoading(true);

  setTimeout(function () {
    // Quando tiver backend: trocar este bloco por fetch('/api/login', { method:'POST', body: JSON.stringify({username, password}) })
    const usuario = autenticar(username, password);

    if (usuario) {
      sessionStorage.setItem('hd_user', JSON.stringify({ name: usuario.name, username: usuario.username }));
      const redirect = sessionStorage.getItem('hd_redirect') || '../dashboard/';
      sessionStorage.removeItem('hd_redirect');
      window.location.replace(redirect);
    } else {
      errorBox.textContent = 'Usuário ou senha incorretos.';
      inputPass.value = '';
      inputPass.focus();
      setLoading(false);
    }
  }, 400);
});

// ── Funções ──
function autenticar(username, password) {
  return USUARIOS.find(u => u.username === username && u.password === password) || null;
}

function setLoading(on) {
  btnLogin.disabled = on;
  btnText.style.display = on ? 'none' : 'inline';
  btnLoader.style.display = on ? 'inline-block' : 'none';
}

// ── Limpa erro ao digitar ──
[inputUser, inputPass].forEach(function (el) {
  el.addEventListener('input', function () { errorBox.textContent = ''; });
});
