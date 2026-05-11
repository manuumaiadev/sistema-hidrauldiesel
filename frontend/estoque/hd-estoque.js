let todosItens = [];
let filtroAtivo = 'todos';

const fmtMoeda = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function statusEstoque(saldo) {
  if (saldo <= 0) return 'critico';
  if (saldo <= 3) return 'baixo';
  return 'ok';
}

function renderTabela(itens) {
  const tbody = document.querySelector('#estoqueTable tbody');
  if (!itens.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:24px">Nenhum produto encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = itens.map(p => {
    const saldo = p.estoque?.saldoVirtualTotal ?? p.estoque?.saldo ?? p.saldo ?? 0;
    const st = statusEstoque(Number(saldo));
    const badgeMap = { critico: 'badge-critico', baixo: 'badge-baixo', ok: 'badge-ok' };
    const labelMap = { critico: 'Crítico', baixo: 'Baixo', ok: 'OK' };
    const qtyClass = st !== 'ok' ? 'qty-value qty-low' : 'qty-value';
    return `<tr data-status="${st}">
      <td><span class="sku">${p.codigo || '—'}</span></td>
      <td>${p.nome || '—'}</td>
      <td>${p.unidade || '—'}</td>
      <td><span class="${qtyClass}">${saldo}</span></td>
      <td class="mono">${fmtMoeda(p.preco)}</td>
      <td><span class="${badgeMap[st]}">${labelMap[st]}</span></td>
    </tr>`;
  }).join('');
}

function aplicarFiltros() {
  const termo = document.getElementById('searchInput').value.toLowerCase().trim();
  const filtrados = todosItens.filter(p => {
    const saldo = p.estoque?.saldoVirtualTotal ?? p.estoque?.saldo ?? p.saldo ?? 0;
    const st = statusEstoque(Number(saldo));
    const texto = `${p.codigo || ''} ${p.nome || ''}`.toLowerCase();
    return (filtroAtivo === 'todos' || st === filtroAtivo) && (termo === '' || texto.includes(termo));
  });
  renderTabela(filtrados);
}

async function carregarDados() {
  const tbody = document.querySelector('#estoqueTable tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:24px">Carregando...</td></tr>';
  try {
    todosItens = await api.blingBuscarPecas('');
    aplicarFiltros();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#e74c3c;padding:24px">Erro ao carregar produtos do Bling</td></tr>';
  }
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroAtivo = btn.dataset.filter;
    aplicarFiltros();
  });
});

document.getElementById('searchInput').addEventListener('input', aplicarFiltros);

function sincronizarBling() {
  carregarDados();
}

carregarDados();
