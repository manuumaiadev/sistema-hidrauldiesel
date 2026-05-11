// ── DATA ──────────────────────────────────────────────────
let todosClientes = [];
let filtroStatus  = 'todos';

// ── DATA HEADER ───────────────────────────────────────────
(function () {
  const d = new Date();
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const el = document.getElementById('page-date');
  if (el) el.textContent = d.toLocaleDateString('pt-BR', opts)
    .replace(/^\w/, c => c.toUpperCase());
})();

// ── AVATAR ────────────────────────────────────────────────
const CORES = ['#1B5FBF','#7C3AED','#D97706','#16A34A','#C0152A','#1B2D5B'];
function avatarColor(nome) {
  return CORES[(nome?.charCodeAt(0) || 0) % CORES.length];
}
function initials(nome) {
  if (!nome) return '?';
  const p = nome.trim().split(/\s+/);
  return (p[0][0] + (p[1]?.[0] || '')).toUpperCase();
}

// ── RENDER TABLE ──────────────────────────────────────────
function renderTabela(clientes) {
  const tbody = document.getElementById('clientesTableBody');
  if (!tbody) return;

  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted)">Nenhum cliente encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = clientes.map(c => {
    const tipo     = c.tipoPessoa === 'J' ? 'Pessoa Jurídica' : 'Pessoa Física';
    const situacao = c.situacao === 'A' ? 'Ativo' : 'Inativo';
    const badgeCls = c.situacao === 'A' ? 'badge-ativo' : 'badge-inativo';
    const doc      = c.numeroDocumento || '—';
    const tel      = c.telefone || c.celular || '—';
    const email    = c.email || '—';
    const cor      = avatarColor(c.nome);
    const ini      = initials(c.nome);

    return `
      <tr data-status="${c.situacao || ''}" data-name="${(c.nome || '').toLowerCase()}" data-doc="${doc.toLowerCase()}">
        <td>
          <div class="client-cell">
            <div class="client-avatar" style="background:${cor}">${ini}</div>
            <div>
              <div class="client-name">${c.nome || '—'}</div>
              <div class="client-type">${tipo}</div>
            </div>
          </div>
        </td>
        <td><span class="mono">${doc}</span></td>
        <td><span class="mono">${tel}</span></td>
        <td>${email}</td>
        <td><span class="${badgeCls}">${situacao}</span></td>
      </tr>`;
  }).join('');
}

// ── FILTRAR ───────────────────────────────────────────────
function filtrar() {
  const busca = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();

  const resultado = todosClientes.filter(c => {
    const matchStatus = filtroStatus === 'todos' || c.situacao === filtroStatus;
    const matchBusca  = !busca ||
      (c.nome || '').toLowerCase().includes(busca) ||
      (c.numeroDocumento || '').toLowerCase().includes(busca);
    return matchStatus && matchBusca;
  });

  renderTabela(resultado);
}

// ── KPIs ─────────────────────────────────────────────────
function atualizarKPIs(clientes) {
  const total  = clientes.length;
  const ativos = clientes.filter(c => c.situacao === 'A').length;
  const pf     = clientes.filter(c => c.tipoPessoa === 'F').length;
  const pj     = clientes.filter(c => c.tipoPessoa === 'J').length;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('kpi-total',  total);
  set('kpi-ativos', ativos);
  set('kpi-pf',     pf);
  set('kpi-pj',     pj);
}

// ── CARREGAR CLIENTES ─────────────────────────────────────
async function carregarClientes() {
  try {
    todosClientes = await api.blingListarClientes('');
    atualizarKPIs(todosClientes);
    filtrar();
  } catch (err) {
    const tbody = document.getElementById('clientesTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted)">Erro ao carregar clientes</td></tr>';
  }
}

// ── FILTROS E BUSCA ───────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroStatus = btn.dataset.filter;
    filtrar();
  });
});

document.getElementById('searchInput')?.addEventListener('input', filtrar);

// ── BLING SYNC ────────────────────────────────────────────
function sincronizarBling() {
  carregarClientes();
}

// ── MODAL: NOVO CLIENTE ───────────────────────────────────
let tipoAtual = 'PF';

function abrirModal() {
  limparFormulario();
  document.getElementById('modal-novo-cliente').style.display = 'flex';
  document.getElementById('cli-nome')?.focus();
}

function fecharModal() {
  document.getElementById('modal-novo-cliente').style.display = 'none';
}

function limparFormulario() {
  ['cli-nome','cli-doc','cli-rg','cli-email','cli-telefone','cli-celular',
   'cli-cep','cli-logradouro','cli-numero','cli-complemento','cli-bairro','cli-cidade','cli-uf']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  tipoAtual = 'PF';
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.toggle('active', b.dataset.tipo === 'PF'));
  atualizarLabels();
  esconderErro();
}

function atualizarLabels() {
  const docLabel = document.getElementById('cli-doc-label');
  const rgLabel  = document.getElementById('cli-rg-label');
  const docInput = document.getElementById('cli-doc');
  if (docLabel) docLabel.innerHTML = tipoAtual === 'PF' ? 'CPF <span class="req">*</span>' : 'CNPJ <span class="req">*</span>';
  if (rgLabel)  rgLabel.textContent = tipoAtual === 'PF' ? 'RG' : 'Inscrição Estadual';
  if (docInput) docInput.placeholder = tipoAtual === 'PF' ? '000.000.000-00' : '00.000.000/0001-00';
}

function mostrarErro(msg) {
  const el = document.getElementById('cli-erro');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function esconderErro() {
  const el = document.getElementById('cli-erro');
  if (el) el.style.display = 'none';
}

// Toggle PF / PJ
document.querySelectorAll('.tipo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tipoAtual = btn.dataset.tipo;
    atualizarLabels();
  });
});

// CEP — busca automática via ViaCEP
document.getElementById('cli-cep')?.addEventListener('input', async function () {
  const cep = this.value.replace(/\D/g, '');
  if (cep.length === 8) {
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        set('cli-logradouro', data.logradouro);
        set('cli-bairro',     data.bairro);
        set('cli-cidade',     data.localidade);
        set('cli-uf',         data.uf);
        document.getElementById('cli-numero')?.focus();
      }
    } catch { /* silencioso */ }
  }
  // Formata CEP com hífen
  if (cep.length > 5) this.value = cep.slice(0,5) + '-' + cep.slice(5,8);
});

// Abrir / fechar modal
document.getElementById('btn-novo-cliente')?.addEventListener('click', abrirModal);
document.getElementById('modal-cliente-fechar')?.addEventListener('click', fecharModal);
document.getElementById('btn-cancelar-cliente')?.addEventListener('click', fecharModal);
document.getElementById('modal-novo-cliente')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModal();
});

// Salvar cliente
document.getElementById('btn-salvar-cliente')?.addEventListener('click', async () => {
  const nome    = document.getElementById('cli-nome')?.value.trim();
  const cpfCnpj = document.getElementById('cli-doc')?.value.trim();

  if (!nome)    { mostrarErro('Nome é obrigatório.'); return; }
  if (!cpfCnpj) { mostrarErro(tipoAtual === 'PF' ? 'CPF é obrigatório.' : 'CNPJ é obrigatório.'); return; }
  esconderErro();

  const btn = document.getElementById('btn-salvar-cliente');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const cep = document.getElementById('cli-cep')?.value.replace(/\D/g,'');
  const temEndereco = cep?.length === 8;

  const dados = {
    tipo: tipoAtual,
    nome,
    cpf_cnpj:  cpfCnpj,
    rg_ie:     document.getElementById('cli-rg')?.value.trim() || '',
    email:     document.getElementById('cli-email')?.value.trim() || '',
    telefone:  document.getElementById('cli-telefone')?.value.trim() || '',
    celular:   document.getElementById('cli-celular')?.value.trim() || '',
    endereco: temEndereco ? {
      cep,
      logradouro:  document.getElementById('cli-logradouro')?.value.trim() || '',
      numero:      document.getElementById('cli-numero')?.value.trim() || '',
      complemento: document.getElementById('cli-complemento')?.value.trim() || '',
      bairro:      document.getElementById('cli-bairro')?.value.trim() || '',
      cidade:      document.getElementById('cli-cidade')?.value.trim() || '',
      estado:      document.getElementById('cli-uf')?.value.trim().toUpperCase() || '',
    } : null,
  };

  try {
    await api.blingCriarCliente(dados);
    fecharModal();
    await carregarClientes();
  } catch (err) {
    mostrarErro('Erro ao salvar: ' + (err.message || 'tente novamente.'));
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Salvar cliente';
  }
});

// ── INIT ──────────────────────────────────────────────────
carregarClientes();
