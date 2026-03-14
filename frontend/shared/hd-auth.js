// hd-auth.js — Verificação de sessão (todas as páginas protegidas carregam este script)
// Quando tiver backend: substituir sessionStorage pela chamada à API de sessão

(function () {
  const raw = sessionStorage.getItem('hd_user');
  if (!raw) {
    sessionStorage.setItem('hd_redirect', window.location.href);
    window.location.replace('../login/');
    return;
  }

  // Injeta estilos do botão de logout
  const style = document.createElement('style');
  style.textContent = `
    .sidebar-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .sb-user-info { display: flex; flex-direction: column; }
    .sb-user-info strong { display: block; color: rgba(255,255,255,0.72); font-weight: 500; margin-bottom: 2px; font-size: 12px; }
    .sb-user-info span { font-size: 12px; color: rgba(255,255,255,0.35); }
    .btn-logout { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; color: rgba(255,255,255,0.4); display: flex; align-items: center; flex-shrink: 0; transition: background .15s, color .15s; }
    .btn-logout:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85); }
  `;
  document.head.appendChild(style);

  const user = JSON.parse(raw);

  document.addEventListener('DOMContentLoaded', function () {
    // Atualiza o nome do usuário na sidebar
    const bottom = document.querySelector('.sidebar-bottom');
    if (bottom) {
      bottom.innerHTML = `
        <div class="sb-user-info">
          <strong>${user.name}</strong>
          Hidrauldiesel
        </div>
        <button class="btn-logout" onclick="hdLogout()" title="Sair">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      `;
    }
  });

  window.hdLogout = function () {
    sessionStorage.removeItem('hd_user');
    window.location.href = '../login/';
  };
})();
