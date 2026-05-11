let todosServicos = [];
let filtroAtivo = 'todos';

const fmtMoeda = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function situacaoServico(s) {
  const sit = s.situacao || '';
  if (sit === 'A' || sit === 'Ativo' || sit === 'ativo') return 'ativo';
  if (sit === 'I' || sit === 'Inativo' || sit === 'inativo') return 'inativo';
  return 'ativo'; // padrão
}

function renderTabela(itens) {
  const tbody = document.querySelector('#tabelaServicos tbody');
  if (!itens.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;padding:24px">Nenhum serviço encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = itens.map(s => {
    const sit = situacaoServico(s);
    const badgeClass = sit === 'ativo' ? 'badge badge-revisao' : 'badge badge-eletrica';
    const sitLabel = sit === 'ativo' ? 'Ativo' : 'Inativo';
    return `<tr>
      <td><span class="sku">${s.codigo || '—'}</span></td>
      <td><span class="servico-nome">${s.nome || '—'}</span></td>
      <td class="mono">${fmtMoeda(s.preco)}</td>
      <td><span class="${badgeClass}">${sitLabel}</span></td>
    </tr>`;
  }).join('');
}

function setFiltro(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroAtivo = btn.dataset.filter;
  filtrarServicos();
}

function filtrarServicos() {
  const termo = document.getElementById('searchInput').value.toLowerCase().trim();
  const filtrados = todosServicos.filter(s => {
    const sit = situacaoServico(s);
    const texto = `${s.codigo || ''} ${s.nome || ''}`.toLowerCase();
    return (filtroAtivo === 'todos' || sit === filtroAtivo) && (termo === '' || texto.includes(termo));
  });
  renderTabela(filtrados);
}

async function carregarDados() {
  const tbody = document.querySelector('#tabelaServicos tbody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;padding:24px">Carregando...</td></tr>';
  try {
    todosServicos = await api.blingBuscarServicos('');
    filtrarServicos();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#e74c3c;padding:24px">Erro ao carregar serviços do Bling</td></tr>';
  }
}

function sincronizarBling() {
  carregarDados();
}

document.addEventListener('DOMContentLoaded', function () {
  const el = document.getElementById('pageDate');
  if (el) {
    el.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).replace(/^\w/, c => c.toUpperCase());
  }
});

carregarDados();
