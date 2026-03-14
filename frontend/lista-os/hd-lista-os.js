// ── Estado global ──────────────────────────────────────────
let filtroAtivo = 'todas';

// ── Filtros por status ─────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroAtivo = btn.dataset.filter;
    filtrar();
  });
});

// ── Busca por texto ────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', filtrar);

// ── Função de filtro combinado ─────────────────────────────
function filtrar() {
  const termo = document.getElementById('search-input').value.toLowerCase().trim();
  const rows  = document.querySelectorAll('#os-tbody tr');
  let visiveis = 0;

  rows.forEach(tr => {
    const status    = tr.dataset.status;
    const texto     = tr.textContent.toLowerCase();
    const passaFiltro = filtroAtivo === 'todas' || status === filtroAtivo;
    const passaBusca  = termo === '' || texto.includes(termo);

    if (passaFiltro && passaBusca) {
      tr.style.display = '';
      visiveis++;
    } else {
      tr.style.display = 'none';
    }
  });

  // Atualiza contador
  const total = rows.length;
  document.getElementById('os-count').textContent =
    visiveis === total
      ? `Mostrando ${total} de 89 ordens`
      : `${visiveis} resultado${visiveis !== 1 ? 's' : ''} encontrado${visiveis !== 1 ? 's' : ''}`;
}
