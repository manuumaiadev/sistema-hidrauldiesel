// ── Data dinâmica ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const el = document.getElementById('pageDate');
  if (el) {
    el.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).replace(/^\w/, c => c.toUpperCase());
  }
});

// ── Dados dos serviços (array em memória) ─────────────────────
// TODO: Integração Bling — substituir por fetch() à API do Bling
// para carregar os serviços cadastrados lá (nome, categoria, preço).
let servicos = Array.from(document.querySelectorAll('#tabelaServicos tbody tr')).map((tr, i) => ({
  id: i,
  nome: tr.querySelector('.servico-nome').textContent,
  cat: tr.dataset.cat,
  preco: tr.cells[2].textContent.replace('R$ ', '').replace('.', '').replace(',', '.'),
  qtd: tr.cells[3].textContent.replace('x', ''),
  faturado: tr.cells[4].textContent,
}));

// ── Estado global ─────────────────────────────────────────────
let filtroAtivo = 'todos';

// ── Filtro por categoria ──────────────────────────────────────
function setFiltro(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroAtivo = btn.dataset.filter;
  filtrarServicos();
}

// ── Filtro combinado ──────────────────────────────────────────
function filtrarServicos() {
  const termo = document.getElementById('searchInput').value.toLowerCase().trim();
  document.querySelectorAll('#tabelaServicos tbody tr').forEach(tr => {
    const cat  = tr.dataset.cat;
    const nome = tr.querySelector('.servico-nome').textContent.toLowerCase();
    const ok   = (filtroAtivo === 'todos' || cat === filtroAtivo) && (termo === '' || nome.includes(termo));
    tr.style.display = ok ? '' : 'none';
  });
}

// ── Abrir modal novo serviço ──────────────────────────────────
function novoServico() {
  document.getElementById('modalTitle').textContent = 'Novo Serviço';
  document.getElementById('formServico').reset();
  document.getElementById('editIndex').value = '';
  abrirModal();
}

// ── Abrir modal editar ────────────────────────────────────────
function editarServico(btn) {
  const tr  = btn.closest('tr');
  const idx = tr.dataset.idx;
  const s   = servicos[parseInt(idx)];

  document.getElementById('modalTitle').textContent = 'Editar Serviço';
  document.getElementById('editIndex').value = idx;
  document.getElementById('sNome').value = s.nome;
  document.getElementById('sCategoria').value = s.cat;
  document.getElementById('sPreco').value = parseFloat(s.preco);
  abrirModal();
}

// ── Salvar (criar ou editar) ──────────────────────────────────
function salvarServico(e) {
  e.preventDefault();

  const nome  = document.getElementById('sNome').value.trim();
  const cat   = document.getElementById('sCategoria').value;
  const preco = parseFloat(document.getElementById('sPreco').value);
  const idx   = document.getElementById('editIndex').value;

  const precoFmt = 'R$ ' + preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const catLabels = { mecanica: 'Mecânica', eletrica: 'Elétrica', funilaria: 'Funilaria', revisao: 'Revisão' };

  if (idx !== '') {
    // Editar linha existente
    const tr = document.querySelector(`#tabelaServicos tbody tr[data-idx="${idx}"]`);
    servicos[parseInt(idx)] = { ...servicos[parseInt(idx)], nome, cat, preco };
    tr.dataset.cat = cat;
    tr.cells[0].innerHTML = `<span class="servico-nome">${nome}</span>`;
    tr.cells[1].innerHTML = `<span class="badge badge-${cat}">${catLabels[cat]}</span>`;
    tr.cells[2].innerHTML = `<span class="mono">${precoFmt}</span>`;
  } else {
    // Criar nova linha
    const novoId = servicos.length;
    servicos.push({ id: novoId, nome, cat, preco, qtd: '0', faturado: 'R$ 0' });

    const tbody = document.querySelector('#tabelaServicos tbody');
    const tr = document.createElement('tr');
    tr.dataset.cat = cat;
    tr.dataset.idx = novoId;
    tr.innerHTML = `
      <td><span class="servico-nome">${nome}</span></td>
      <td><span class="badge badge-${cat}">${catLabels[cat]}</span></td>
      <td class="mono">${precoFmt}</td>
      <td>0x</td>
      <td class="mono">R$ 0</td>
      <td><button class="btn btn-editar" onclick="editarServico(this)">Editar</button></td>
    `;
    tbody.appendChild(tr);
  }

  closeModal();
  filtrarServicos();
}

// ── Associa data-idx às linhas existentes ─────────────────────
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('#tabelaServicos tbody tr').forEach((tr, i) => {
    tr.dataset.idx = i;
    const btn = tr.querySelector('.btn-editar');
    if (btn) btn.setAttribute('onclick', 'editarServico(this)');
  });
});

// ── Modal helpers ─────────────────────────────────────────────
function abrirModal() {
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('sNome').focus(), 50);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function fecharModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

// ── Sincronizar com Bling ─────────────────────────────────────
// TODO: Integração Bling — implementar chamada à API para sincronizar serviços
function sincronizarBling() {
  alert('Sincronização com Bling iniciada.\n(Integração ainda não implementada.)');
}
