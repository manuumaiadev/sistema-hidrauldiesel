// ── Constantes de status ────────────────────────────────────
const coresStatus = {
  orcamento:              '#7C3AED',
  enviada_cliente:        '#0EA5E9',
  aprovado:               '#22C55E',
  em_execucao:            '#EAB308',
  autorizada_faturamento: '#F97316',
  finalizada:             '#DC2626',
  cancelada:              '#6B7280'
};

const nomesStatus = {
  orcamento:              'Orçamento',
  enviada_cliente:        'Enviada para o Cliente',
  aprovado:               'Aprovada',
  em_execucao:            'Em andamento',
  autorizada_faturamento: 'Autorizada para Faturamento',
  finalizada:             'Finalizada',
  cancelada:              'Cancelada'
};

// ── Estado ──────────────────────────────────────────────────
let todasOS = [];
let filtroAtivo = 'todas';

// ── Formatadores ────────────────────────────────────────────
function formatarData(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('pt-BR');
}

function formatarValor(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Renderização ────────────────────────────────────────────
function renderizarOS(lista) {
  const tbody = document.getElementById('os-tbody');

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">
          Nenhuma OS encontrada
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = lista.map(os => {
    const cor   = coresStatus[os.status] || '#6B7280';
    const nome  = nomesStatus[os.status] || os.status;
    const veiculo = [os.modelo, os.ano, os.placa].filter(Boolean).join(' — ');
    const numeroExibido = os.numero_os || os.numero;

    return `
      <tr data-status="${os.status}">
        <td><span class="os-num">#${numeroExibido}</span></td>
        <td>
          <div class="cliente-nome">${os.cliente_nome || '—'}</div>
          <div class="cliente-veiculo">${veiculo || '—'}</div>
        </td>
        <td>
          <span class="badge" style="background:${cor}22;color:${cor};border:1px solid ${cor}55;white-space:nowrap">
            ${nome}
          </span>
        </td>
        <td class="date-cell">${formatarData(os.criado_em)}</td>
        <td class="valor" style="color:${cor}">${formatarValor(os.valor_total)}</td>
        <td style="text-align:right">
          <button class="action-btn" onclick="verOS(${os.id})">Ver</button>
        </td>
      </tr>`;
  }).join('');
}

// ── Filtro combinado ────────────────────────────────────────
function filtrar() {
  const termo = document.getElementById('search-input').value.toLowerCase().trim();
  const de    = document.getElementById('filter-de').value;
  const ate   = document.getElementById('filter-ate').value;
  const lista = todasOS.filter(os => {
    const passaFiltro = filtroAtivo === 'todas' || os.status === filtroAtivo;
    const texto = [os.numero, os.numero_os, os.cliente_nome, os.modelo, os.placa].join(' ').toLowerCase();
    const passaBusca = termo === '' || texto.includes(termo);
    const dataOS = os.criado_em ? os.criado_em.slice(0, 10) : '';
    const passaDe  = !de  || dataOS >= de;
    const passaAte = !ate || dataOS <= ate;
    return passaFiltro && passaBusca && passaDe && passaAte;
  });

  renderizarOS(lista);

  const total    = todasOS.length;
  const visiveis = lista.length;
  document.getElementById('os-count').textContent =
    visiveis === total
      ? `Mostrando ${total} de ${total} ordens`
      : `${visiveis} resultado${visiveis !== 1 ? 's' : ''} encontrado${visiveis !== 1 ? 's' : ''}`;
}

// ── Cards de resumo ─────────────────────────────────────────
function atualizarCards(lista) {
  const hoje = new Date().toDateString();

  const aprovados   = lista.filter(os => os.status === 'aprovado').length;
  const emExecucao  = lista.filter(os => os.status === 'em_execucao').length;
  const finalizadas = lista.filter(os => {
    return os.status === 'finalizada' && new Date(os.criado_em).toDateString() === hoje;
  }).length;
  const faturadoHoje = lista
    .filter(os => os.status === 'finalizada' && new Date(os.criado_em).toDateString() === hoje)
    .reduce((acc, os) => acc + Number(os.valor_total), 0);

  document.getElementById('stat-aprovados').textContent       = aprovados;
  document.getElementById('stat-em-execucao').textContent     = emExecucao;
  document.getElementById('stat-finalizadas-hoje').textContent = finalizadas;
  document.getElementById('stat-faturado-hoje').textContent   = formatarValor(faturadoHoje);
}

// ── Carregamento da API ─────────────────────────────────────
async function carregarOS() {
  const tbody = document.getElementById('os-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">
        Carregando…
      </td>
    </tr>`;

  try {
    todasOS = await api.listarOS();
    atualizarCards(todasOS);
    filtrar();
  } catch (err) {
    console.error('Erro ao carregar OS:', err.message);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:40px;color:#DC2626">
          Erro ao carregar ordens de serviço: ${err.message}
        </td>
      </tr>`;
  }
}

// ── Ação "Ver" ──────────────────────────────────────────────
window.verOS = function (id) {
  window.location.href = `../orcamento/?id=${id}`;
};

// ── Filtro por status ────────────────────────────────────────
document.getElementById('filter-status').addEventListener('change', function () {
  filtroAtivo = this.value;
  filtrar();
});

// ── Busca por texto ─────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', filtrar);

// ── Filtros de data ──────────────────────────────────────────
document.getElementById('filter-de').addEventListener('change', filtrar);
document.getElementById('filter-ate').addEventListener('change', filtrar);

// ── Limpar filtros ───────────────────────────────────────────
document.getElementById('btn-limpar').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-de').value    = '';
  document.getElementById('filter-ate').value   = '';
  document.getElementById('filter-status').value = 'todas';
  filtroAtivo = 'todas';
  filtrar();
});

// ── Init ────────────────────────────────────────────────────
carregarOS();
