function sincronizarBling() {
  alert('Sincronização com Bling em breve!');
}

function toggleDetalhe(btn) {
  const row = btn.closest('tr');
  const detalheRow = row.nextElementSibling;
  const aberto = detalheRow.classList.toggle('hidden') === false;
  btn.classList.toggle('aberto', aberto);
  btn.textContent = aberto ? 'Fechar' : 'Detalhes';
}

const fmtDataHora = (iso) => {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const h   = String(d.getHours()).padStart(2, '0');
  const m   = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${h}:${m}`;
};

const acaoClass = {
  CRIOU:          'acao-criou',
  EDITOU:         'acao-editou',
  ALTEROU_STATUS: 'acao-status',
};

const tabelaLabel = (tabela) => {
  const map = {
    ordens_servico: 'OS',
    mecanicos:      'Mecânico',
    itens_servico:  'Item serviço',
    itens_pecas:    'Item peça',
    comissoes:      'Comissão',
    usuarios:       'Usuário',
  };
  return map[tabela] || tabela;
};

const renderizarDetalhe = (antes, depois) => {
  const fmt = (obj) => obj ? JSON.stringify(obj, null, 2) : null;
  const antesStr = fmt(antes);
  const depoisStr = fmt(depois);

  if (antesStr && depoisStr) {
    return `
      <div class="detalhe-wrap">
        <div class="detalhe-col">
          <div class="detalhe-label">Antes</div>
          <pre>${antesStr}</pre>
        </div>
        <div class="detalhe-arrow">→</div>
        <div class="detalhe-col">
          <div class="detalhe-label">Depois</div>
          <pre>${depoisStr}</pre>
        </div>
      </div>`;
  }

  const dados = depoisStr || antesStr || '{}';
  const label = depoisStr ? 'Dados criados' : 'Dados anteriores';
  return `
    <div class="detalhe-wrap">
      <div class="detalhe-col detalhe-col-full">
        <div class="detalhe-label">${label}</div>
        <pre>${dados}</pre>
      </div>
    </div>`;
};

const renderizarTabela = (registros) => {
  const tbody = document.getElementById('hist-tbody');

  if (!registros || registros.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color: var(--muted); padding: 2rem;">
          Nenhum registro encontrado
        </td>
      </tr>`;
    document.getElementById('hist-count').textContent = '0 registros';
    return;
  }

  tbody.innerHTML = registros.map(r => {
    const cssAcao = acaoClass[r.acao] || '';
    const registro = `${tabelaLabel(r.tabela)} #${r.registro_id}`;
    const detalhe = renderizarDetalhe(r.dados_anteriores, r.dados_novos);

    return `
      <tr>
        <td class="mono">${fmtDataHora(r.criado_em)}</td>
        <td><span class="user-tag">${r.usuario_nome || '—'}</span></td>
        <td><span class="badge-acao ${cssAcao}">${r.acao}</span></td>
        <td><span class="registro-tag">${registro}</span></td>
        <td><button class="btn-detalhe" onclick="toggleDetalhe(this)">Detalhes</button></td>
      </tr>
      <tr class="detalhe-row hidden">
        <td colspan="5">${detalhe}</td>
      </tr>`;
  }).join('');

  document.getElementById('hist-count').textContent =
    `Mostrando ${registros.length} de ${registros.length} registros`;
};

const coletarFiltros = () => {
  const filtros = {};
  const acao    = document.getElementById('filter-acao').value;
  const usuario = document.getElementById('filter-usuario').value;
  const de      = document.getElementById('filter-de').value;
  const ate     = document.getElementById('filter-ate').value;
  const busca   = document.getElementById('search-input').value.trim();

  if (acao)    filtros.acao        = acao;
  if (usuario) filtros.usuario     = usuario;
  if (de)      filtros.data_inicio = de;
  if (ate)     filtros.data_fim    = ate;
  if (busca)   filtros.busca       = busca;

  return filtros;
};

const carregar = async () => {
  try {
    const registros = await api.listarHistorico(coletarFiltros());
    renderizarTabela(registros);
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
  }
};

// Filtros — chamam API ao mudar
document.getElementById('filter-acao').addEventListener('change', carregar);
document.getElementById('filter-usuario').addEventListener('change', carregar);
document.getElementById('filter-de').addEventListener('change', carregar);
document.getElementById('filter-ate').addEventListener('change', carregar);

// Busca em tempo real com debounce
let debounceTimer;
document.getElementById('search-input').addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(carregar, 350);
});

// Limpar filtros
document.getElementById('btn-limpar').addEventListener('click', () => {
  document.getElementById('filter-acao').value    = '';
  document.getElementById('filter-usuario').value = '';
  document.getElementById('filter-de').value      = '';
  document.getElementById('filter-ate').value     = '';
  document.getElementById('search-input').value   = '';
  carregar();
});

carregar();
