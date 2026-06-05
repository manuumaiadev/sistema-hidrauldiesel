const fmtValor = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Estado ───────────────────────────────────────────────────────────────────
let _funcionarios = [];

// Após salvar/excluir no modal, recarregar a lista
window._funcModalOnSave = async () => { await carregarFuncionarios(); };

// ── Filtros ──────────────────────────────────────────────────────────────────
['filtro-tipo', 'filtro-cargo', 'filtro-status'].forEach(id => {
  document.getElementById(id).addEventListener('change', aplicarFiltros);
});

function aplicarFiltros() {
  const tipo   = document.getElementById('filtro-tipo').value;
  const cargo  = document.getElementById('filtro-cargo').value;
  const status = document.getElementById('filtro-status').value;
  const lista  = _funcionarios.filter(f =>
    (!tipo   || f.tipo      === tipo)   &&
    (!cargo  || f.cargo_tipo === cargo) &&
    (!status || f.status    === status)
  );
  renderizarFuncionarios(lista);
}

// ── Botão Novo Funcionário ────────────────────────────────────────────────────
document.getElementById('btn-novo').addEventListener('click', () => abrirModalFuncionario(null));

// ── Renderizar tabela ─────────────────────────────────────────────────────────
const BADGE_STATUS = {
  ativo:   '<span style="background:#DCFCE7;color:#15803D;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px;white-space:nowrap">Ativo</span>',
  ferias:  '<span style="background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px;white-space:nowrap">Férias</span>',
  inativo: '<span style="background:#FEE2E2;color:#B91C1C;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px;white-space:nowrap">Inativo</span>',
};
const BADGE_CARGO = {
  mecanico:   '<span style="background:#F3E8FF;color:#7C3AED;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Mecânico</span>',
  vendedor:   '<span style="background:#FEF9C3;color:#92400E;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Vendedor</span>',
  financeiro: '<span style="background:#DCFCE7;color:#166534;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Financeiro</span>',
  estoquista: '<span style="background:#E0F2FE;color:#0369A1;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Estoquista</span>',
  gestao:     '<span style="background:#FEE2E2;color:#991B1B;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Gestão</span>',
  gerente:    '<span style="background:#EDE9FE;color:#5B21B6;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Gerente</span>',
  comercial:  '<span style="background:#FFF7ED;color:#C2410C;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Comercial</span>',
  motoboy:    '<span style="background:#F0FDF4;color:#166534;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Motoboy</span>',
  faxineiro:  '<span style="background:#F8FAFC;color:#475569;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Faxineiro</span>',
  outro:      '<span style="background:#F1F5F9;color:#64748B;font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px">Outro</span>',
};

function renderizarFuncionarios(lista) {
  const tbody = document.getElementById('func-tbody');
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">Nenhum funcionário encontrado</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(f => {
    const total = Number(f.salario_oficial) + Number(f.salario_adicional);
    return `<tr style="cursor:pointer" onclick="abrirModalFuncionario(${f.id})" title="Clique para editar">
      <td><strong>${f.nome}</strong>${f.comentario_importante ? `<span class="badge-comentario">!<span class="tooltip-box">${f.comentario_importante.replace(/</g,'&lt;')}</span></span>` : ''}</td>
      <td><span class="badge-${f.tipo}">${f.tipo === 'clt' ? 'CLT' : 'Informal'}</span></td>
      <td>${BADGE_CARGO[f.cargo_tipo] || BADGE_CARGO.outro}${f.cargo ? `<span style="font-size:12px;color:var(--muted);margin-left:6px">${f.cargo}</span>` : ''}</td>
      <td>${BADGE_STATUS[f.status] || BADGE_STATUS.ativo}</td>
      <td class="mono" style="text-align:right">${Number(f.vale_transporte) > 0 ? fmtValor(f.vale_transporte) : '<span style="color:var(--muted)">—</span>'}</td>
      <td class="mono" style="text-align:right">${fmtValor(f.salario_oficial)}</td>
      <td class="mono" style="text-align:right">${fmtValor(f.salario_adicional)}</td>
      <td class="mono" style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(total)}</td>
    </tr>`;
  }).join('');
}

function atualizarKPIs(lista) {
  const clt      = lista.filter(f => f.tipo === 'clt').length;
  const informal = lista.filter(f => f.tipo === 'informal').length;
  const folha    = lista.reduce((acc, f) => acc + Number(f.salario_oficial) + Number(f.salario_adicional), 0);
  document.getElementById('kpi-total').textContent    = lista.length;
  document.getElementById('kpi-clt').textContent      = clt;
  document.getElementById('kpi-informal').textContent = informal;
  document.getElementById('kpi-folha').textContent    = fmtValor(folha);
}

// ── Carregar ──────────────────────────────────────────────────────────────────
async function carregarFuncionarios() {
  try {
    _funcionarios = await api.listarFuncionarios();
    atualizarKPIs(_funcionarios);
    aplicarFiltros();
  } catch (err) {
    document.getElementById('func-tbody').innerHTML =
      `<tr><td colspan="9" style="text-align:center;padding:40px;color:#DC2626">${err.message}</td></tr>`;
  }
}


carregarFuncionarios();
