// ── FORMATAÇÃO MONETÁRIA ──────────────────────────────────
const parseBRL = s => Number((s || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;

function formatarMoeda(input) {
  const digits = input.value.replace(/\D/g, '');
  if (!digits) { input.value = ''; return; }
  input.value = (parseInt(digits, 10) / 100)
    .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Seleciona tudo ao focar em campo monetário (para facilitar reescrita)
document.addEventListener('focus', e => {
  if (e.target.classList.contains('servico-valor-input') ||
      e.target.classList.contains('peca-valor-input')) {
    e.target.select();
  }
}, true);

// ── INJETAR MODAIS DE CRIAÇÃO ─────────────────────────────
(function () {
  document.body.insertAdjacentHTML('beforeend', `
    <!-- Modal: Novo Cliente (orcamento) -->
    <div id="modal-orca-cliente" class="modal-overlay" style="display:none">
      <div class="modal-form">
        <div class="modal-form-header">
          <div class="modal-form-title">Novo Cliente</div>
          <button class="modal-form-close" data-fechar="modal-orca-cliente">×</button>
        </div>
        <div class="modal-form-body">
          <div class="modal-form-grid">
            <div class="modal-form-field full">
              <label>Nome <span class="req">*</span></label>
              <input id="ocli-nome" type="text" placeholder="Nome completo ou razão social"/>
            </div>
            <div class="modal-form-field">
              <label>CPF / CNPJ <span class="req">*</span></label>
              <input id="ocli-doc" type="text" placeholder="000.000.000-00"/>
            </div>
            <div class="modal-form-field">
              <label>Telefone</label>
              <input id="ocli-tel" type="text" placeholder="(41) 9 9999-9999"/>
            </div>
            <div class="modal-form-field full">
              <label>E-mail</label>
              <input id="ocli-email" type="email" placeholder="email@exemplo.com"/>
            </div>
          </div>
          <div id="ocli-erro" class="modal-form-erro"></div>
        </div>
        <div class="modal-form-footer">
          <button class="btn" data-fechar="modal-orca-cliente">Cancelar</button>
          <button class="btn btn-primary" id="btn-salvar-ocli">Salvar cliente</button>
        </div>
      </div>
    </div>

    <!-- Modal: Novo Serviço -->
    <div id="modal-novo-servico" class="modal-overlay" style="display:none">
      <div class="modal-form">
        <div class="modal-form-header">
          <div class="modal-form-title">Novo Serviço</div>
          <button class="modal-form-close" data-fechar="modal-novo-servico">×</button>
        </div>
        <div class="modal-form-body">
          <div class="modal-form-grid">
            <div class="modal-form-field full">
              <label>Nome do serviço <span class="req">*</span></label>
              <input id="srv-nome" type="text" placeholder="Ex: Alinhamento e balanceamento"/>
            </div>
            <div class="modal-form-field">
              <label>Código</label>
              <input id="srv-codigo" type="text" placeholder="Ex: SRV-001"/>
            </div>
            <div class="modal-form-field">
              <label>Valor padrão (R$)</label>
              <input id="srv-valor" type="text" class="modal-valor-input" inputmode="numeric" placeholder="0,00"/>
            </div>
          </div>
          <div id="srv-erro" class="modal-form-erro"></div>
        </div>
        <div class="modal-form-footer">
          <button class="btn" data-fechar="modal-novo-servico">Cancelar</button>
          <button class="btn btn-primary" id="btn-salvar-srv">Salvar serviço</button>
        </div>
      </div>
    </div>

    <!-- Modal: Nova Peça -->
    <div id="modal-nova-peca" class="modal-overlay" style="display:none">
      <div class="modal-form">
        <div class="modal-form-header">
          <div class="modal-form-title">Nova Peça</div>
          <button class="modal-form-close" data-fechar="modal-nova-peca">×</button>
        </div>
        <div class="modal-form-body">
          <div class="modal-form-grid">
            <div class="modal-form-field full">
              <label>Nome / Descrição <span class="req">*</span></label>
              <input id="pca-nome" type="text" placeholder="Ex: Filtro de óleo"/>
            </div>
            <div class="modal-form-field">
              <label>Código / SKU</label>
              <input id="pca-codigo" type="text" placeholder="Ex: PCA-001"/>
            </div>
            <div class="modal-form-field">
              <label>Valor unitário (R$)</label>
              <input id="pca-valor" type="text" class="modal-valor-input" inputmode="numeric" placeholder="0,00"/>
            </div>
            <div class="modal-form-field">
              <label>Unidade</label>
              <select id="pca-unidade">
                <option value="UN">UN — Unidade</option>
                <option value="KG">KG — Quilograma</option>
                <option value="CX">CX — Caixa</option>
                <option value="L">L — Litro</option>
                <option value="M">M — Metro</option>
              </select>
            </div>
          </div>
          <div id="pca-erro" class="modal-form-erro"></div>
        </div>
        <div class="modal-form-footer">
          <button class="btn" data-fechar="modal-nova-peca">Cancelar</button>
          <button class="btn btn-primary" id="btn-salvar-pca">Salvar peça</button>
        </div>
      </div>
    </div>
  `);

  // Fechar via data-fechar e clique no overlay
  document.addEventListener('click', e => {
    const id = e.target.dataset?.fechar;
    if (id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    if (e.target.classList.contains('modal-overlay') &&
        ['modal-orca-cliente','modal-novo-servico','modal-nova-peca'].includes(e.target.id)) {
      e.target.style.display = 'none';
    }
  });

  // Formatação BRL nos inputs dos modais
  document.addEventListener('input', e => {
    if (e.target.classList.contains('modal-valor-input')) formatarMoeda(e.target);
  });
})();

// ── ABRIR MODAL DE CRIAÇÃO ────────────────────────────────
function abrirModalNovo(tipo, texto, onSelect) {
  if (tipo === 'cliente') {
    document.getElementById('ocli-nome').value  = texto;
    document.getElementById('ocli-doc').value   = '';
    document.getElementById('ocli-tel').value   = '';
    document.getElementById('ocli-email').value = '';
    const erroEl = document.getElementById('ocli-erro');
    erroEl.style.display = 'none';
    document.getElementById('modal-orca-cliente').style.display = 'flex';
    document.getElementById('ocli-nome').focus();

    document.getElementById('btn-salvar-ocli').onclick = async () => {
      const nome    = document.getElementById('ocli-nome').value.trim();
      const cpfCnpj = document.getElementById('ocli-doc').value.trim();
      if (!nome)    { erroEl.textContent = 'Nome é obrigatório.';        erroEl.style.display = 'block'; return; }
      if (!cpfCnpj) { erroEl.textContent = 'CPF/CNPJ é obrigatório.';   erroEl.style.display = 'block'; return; }
      erroEl.style.display = 'none';
      const btn = document.getElementById('btn-salvar-ocli');
      btn.disabled = true; btn.textContent = 'Salvando…';
      try {
        const novo = await api.blingCriarCliente({
          tipo: 'PF', nome, cpf_cnpj: cpfCnpj,
          telefone: document.getElementById('ocli-tel').value.trim(),
          email:    document.getElementById('ocli-email').value.trim(),
        });
        document.getElementById('modal-orca-cliente').style.display = 'none';
        onSelect({ id: novo.id, nome, numeroDocumento: cpfCnpj });
        mostrarToastSucesso('Criado com sucesso no Bling!');
      } catch (err) {
        erroEl.textContent = 'Erro: ' + (err.message || 'tente novamente.');
        erroEl.style.display = 'block';
      } finally {
        btn.disabled = false; btn.textContent = 'Salvar cliente';
      }
    };
  }

  else if (tipo === 'servico') {
    document.getElementById('srv-nome').value   = texto;
    document.getElementById('srv-codigo').value = '';
    document.getElementById('srv-valor').value  = '';
    const erroEl = document.getElementById('srv-erro');
    erroEl.style.display = 'none';
    document.getElementById('modal-novo-servico').style.display = 'flex';
    document.getElementById('srv-nome').focus();

    document.getElementById('btn-salvar-srv').onclick = async () => {
      const nome = document.getElementById('srv-nome').value.trim();
      if (!nome) { erroEl.textContent = 'Nome é obrigatório.'; erroEl.style.display = 'block'; return; }
      erroEl.style.display = 'none';
      const btn = document.getElementById('btn-salvar-srv');
      btn.disabled = true; btn.textContent = 'Salvando…';
      try {
        const valor = parseBRL(document.getElementById('srv-valor').value);
        const novo  = await api.blingCriarServico({
          nome, codigo: document.getElementById('srv-codigo').value.trim(), valor,
        });
        document.getElementById('modal-novo-servico').style.display = 'none';
        onSelect({ id: novo.id ?? novo.data?.id, nome, preco: valor });
        mostrarToastSucesso('Criado com sucesso no Bling!');
      } catch (err) {
        erroEl.textContent = 'Erro: ' + (err.message || 'tente novamente.');
        erroEl.style.display = 'block';
      } finally {
        btn.disabled = false; btn.textContent = 'Salvar serviço';
      }
    };
  }

  else if (tipo === 'peca') {
    document.getElementById('pca-nome').value     = texto;
    document.getElementById('pca-codigo').value   = '';
    document.getElementById('pca-valor').value    = '';
    document.getElementById('pca-unidade').value  = 'UN';
    const erroEl = document.getElementById('pca-erro');
    erroEl.style.display = 'none';
    document.getElementById('modal-nova-peca').style.display = 'flex';
    document.getElementById('pca-nome').focus();

    document.getElementById('btn-salvar-pca').onclick = async () => {
      const nome = document.getElementById('pca-nome').value.trim();
      if (!nome) { erroEl.textContent = 'Nome é obrigatório.'; erroEl.style.display = 'block'; return; }
      erroEl.style.display = 'none';
      const btn = document.getElementById('btn-salvar-pca');
      btn.disabled = true; btn.textContent = 'Salvando…';
      try {
        const valor = parseBRL(document.getElementById('pca-valor').value);
        const novo  = await api.blingCriarPeca({
          nome, codigo: document.getElementById('pca-codigo').value.trim(),
          valor, unidade: document.getElementById('pca-unidade').value,
        });
        document.getElementById('modal-nova-peca').style.display = 'none';
        onSelect({ id: novo.id ?? novo.data?.id, nome, preco: valor });
        mostrarToastSucesso('Criado com sucesso no Bling!');
      } catch (err) {
        erroEl.textContent = 'Erro: ' + (err.message || 'tente novamente.');
        erroEl.style.display = 'block';
      } finally {
        btn.disabled = false; btn.textContent = 'Salvar peça';
      }
    };
  }
}

// ── FOTOS DO DIAGNÓSTICO ─────────────────────────────────

const UPLOADS_BASE = 'http://localhost:3000/uploads/fotos';

function criarThumb(anexo) {
  const wrap = document.createElement('div');
  wrap.className = 'diag-foto-thumb';
  wrap.dataset.anexoId = anexo.id;

  const img = document.createElement('img');
  img.src = `${UPLOADS_BASE}/${anexo.nome_arquivo}`;
  img.alt = anexo.nome_original || 'foto';

  const btn = document.createElement('button');
  btn.className = 'foto-del';
  btn.title = 'Remover foto';
  btn.textContent = '✕';
  btn.addEventListener('click', async () => {
    try {
      await api.deletarAnexo(anexo.id);
      wrap.remove();
    } catch (err) {
      alert('Erro ao remover foto: ' + err.message);
    }
  });

  wrap.append(img, btn);
  return wrap;
}

function inserirThumb(anexo) {
  const container = document.querySelector('.diag-fotos');
  const addBtn    = container.querySelector('.diag-foto-add');
  container.insertBefore(criarThumb(anexo), addBtn);
}

async function carregarFotos() {
  if (!osId) return;
  try {
    const anexos = await api.listarAnexos(osId);
    anexos.forEach(a => inserirThumb(a));
  } catch (err) {
    console.warn('Não foi possível carregar fotos:', err.message);
  }
}

document.querySelector('.diag-foto-add').addEventListener('click', () => {
  if (!osId) {
    alert('Salve o orçamento primeiro para adicionar fotos.');
    return;
  }

  const input = document.createElement('input');
  input.type     = 'file';
  input.accept   = 'image/*';
  input.multiple = true;

  input.addEventListener('change', async () => {
    const files = Array.from(input.files);
    for (const file of files) {
      try {
        const anexo = await api.uploadFoto(osId, file);
        inserirThumb(anexo);
      } catch (err) {
        alert('Erro ao enviar foto: ' + err.message);
      }
    }
  });

  input.click();
});

// ── STEPPER ──────────────────────────────────────────────
// Fluxo oficial: Orçamento → Enviada para o Cliente → Aprovada → Em andamento → Autorizada para Faturamento → Finalizada
// ENVIADA_CLIENTE pode ser pulada visualmente (tracejado cinza) se o cliente aprovar direto
const STEPS = [
  { key: 'orcamento',              label: 'Orçamento',                    icon: '1' },
  { key: 'enviada_cliente',        label: 'Enviada para o Cliente',        icon: '2' },
  { key: 'aprovado',               label: 'Aprovada',                     icon: '3' },
  { key: 'em_execucao',            label: 'Em andamento',                 icon: '4' },
  { key: 'autorizada_faturamento', label: 'Autorizada para Faturamento',  icon: '5' },
  { key: 'finalizada',             label: 'Finalizada',                   icon: '6' },
];
let currentStep = 0;
// true quando OS avança de orcamento diretamente para aprovado sem passar por enviada_cliente
let enviadaSkipped = false;
// impede chamada à API enquanto a página está sendo populada com dados carregados
let _carregandoOS = false;
let osId = null;
let _osCarregada = null; // armazena OS completa para impressão

// ── CONTROLE DE ALTERAÇÕES NÃO SALVAS ────────────────────
let _temAlteracoes = false;
let _navegacaoPendente = null;

function marcarAlterado() {
  if (_carregandoOS) return;
  _temAlteracoes = true;
  document.getElementById('salvar-btn')?.classList.add('tem-alteracoes');
}

function limparAlteracoes() {
  _temAlteracoes = false;
  document.getElementById('salvar-btn')?.classList.remove('tem-alteracoes');
}

// beforeunload — fechar/recarregar aba
window.addEventListener('beforeunload', e => {
  if (_temAlteracoes) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Modal de confirmação
function abrirModalSair(callbackSair) {
  _navegacaoPendente = callbackSair;
  document.getElementById('modal-sair').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-continuar').addEventListener('click', () => {
    document.getElementById('modal-sair').style.display = 'none';
    _navegacaoPendente = null;
  });

  document.getElementById('modal-sair-btn').addEventListener('click', () => {
    limparAlteracoes();
    document.getElementById('modal-sair').style.display = 'none';
    if (_navegacaoPendente) _navegacaoPendente();
  });

  // Interceptar links do menu lateral
  document.querySelectorAll('aside nav a').forEach(link => {
    link.addEventListener('click', e => {
      if (!_temAlteracoes) return;
      e.preventDefault();
      const href = link.href;
      abrirModalSair(() => { window.location.href = href; });
    });
  });

  // Botão voltar do header
  document.querySelector('.back-btn')?.addEventListener('click', e => {
    if (!_temAlteracoes) { window.location.href = '../lista-os/'; return; }
    e.preventDefault();
    abrirModalSair(() => { window.location.href = '../lista-os/'; });
  });
});

function renderStepper() {
  const el = document.getElementById('stepper');
  el.innerHTML = '';

  // Enquanto status for orçamento, stepper é somente-leitura
  const bloqueado = currentStep === 0;

  STEPS.forEach((s, i) => {
    // enviada_cliente (idx 1) é "pulada" quando o cliente aprovou direto sem passar por essa etapa
    const isSkipped = (s.key === 'enviada_cliente' && enviadaSkipped && currentStep >= 2);
    const isDone    = !isSkipped && i < currentStep;
    const isActive  = !isSkipped && i === currentStep;

    const inner = document.createElement('div');
    inner.className = 'step-inner';
    inner.title = s.label;
    if (!isSkipped && !bloqueado) inner.addEventListener('click', () => setStep(i));

    const circle = document.createElement('div');
    circle.className = 'step-circle';
    circle.textContent = isSkipped ? '–' : (isDone ? '✓' : s.icon);

    const lbl = document.createElement('div');
    lbl.className = 'step-label';
    lbl.textContent = s.label;

    if      (isSkipped) inner.classList.add('skipped');
    else if (isDone)    inner.classList.add('done');
    else if (isActive)  inner.classList.add('active');
    if      (bloqueado) inner.classList.add('locked');

    inner.append(circle, lbl);

    const step = document.createElement('div');
    step.className = 'step';
    step.appendChild(inner);

    if (i < STEPS.length - 1) {
      const conn = document.createElement('div');
      // Conector verde só se a etapa está concluída normalmente (não pulada)
      conn.className = 'step-connector' + (isDone ? ' done' : '');
      step.appendChild(conn);
    }

    el.appendChild(step);
  });

  // Bloqueia o select de status enquanto for orçamento
  const sel = document.getElementById('status-select');
  if (sel) sel.disabled = bloqueado;
}

function setStep(idx) {
  // Pular enviada_cliente: ir de orcamento (0) direto para aprovado (2) ou além
  if (idx >= 2 && currentStep < 1) {
    enviadaSkipped = true;
  } else if (idx <= 1) {
    enviadaSkipped = false;
  }
  currentStep = idx;
  renderStepper();
  const _sel = document.getElementById('status-select');
  if (_sel) _sel.value = String(idx);
  if (!_carregandoOS) atualizarStatus(STEPS[idx].key);
}

function setStepFromSelect(val) {
  const cancelEl = document.getElementById('cancel-step');
  if (val === 'cancelada') {
    cancelEl.classList.add('active');
    return; // cancelada não altera o stepper principal
  }
  cancelEl.classList.remove('active');
  setStep(parseInt(val));
}

function cancelarOS() {
  const cancelEl = document.getElementById('cancel-step');
  cancelEl.classList.toggle('active');
  const isActive = cancelEl.classList.contains('active');
  const sel = document.getElementById('status-select');
  if (sel) sel.value = isActive ? 'cancelada' : String(currentStep);
  if (isActive) atualizarStatus('cancelada');
}

renderStepper();

// ── SELEÇÃO DE CLIENTE ────────────────────────────────────
(function () {
  const input      = document.getElementById('busca-cliente-input');
  const wrap       = input?.closest('.input-with-action');
  const pessoaCard = document.querySelector('.pessoa-card');
  const pessoaNome = document.querySelector('.pessoa-nome');
  const pessoaSub  = document.querySelector('.pessoa-sub');

  // Cria dropdown e injeta dentro do .input-with-action (que já tem position:relative)
  const dropdown = document.createElement('div');
  dropdown.className = 'cliente-dropdown';
  dropdown.style.display = 'none';
  if (wrap) wrap.appendChild(dropdown);

  function fecharDropdown() {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
  }

  function selecionarCliente(c) {
    const nome = c.nome || '—';
    const doc  = c.numeroDocumento || '';
    if (pessoaNome) pessoaNome.textContent = nome;
    if (pessoaSub)  pessoaSub.textContent  = doc;
    if (pessoaCard) {
      pessoaCard.style.display = 'flex';
      pessoaCard.dataset.clienteId = String(c.id);
      pessoaCard.dataset.telefone  = c.telefone || c.celular || '';
      pessoaCard.dataset.email     = c.email || '';
      pessoaCard.dataset.doc       = c.numeroDocumento || '';
    }
    if (input) input.value = nome;
    fecharDropdown();
    marcarAlterado();
  }

  function addCriarNovoCliente(texto) {
    if (!texto || texto.length < 1) return;
    const itemNovo = document.createElement('div');
    itemNovo.className = 'cliente-dropdown-item produto-novo';
    itemNovo.innerHTML = `<span>+ Criar "<strong>${texto}</strong>"</span><span class="tag-novo">NOVO</span>`;
    itemNovo.addEventListener('mousedown', e => {
      e.preventDefault();
      const textoCapturado = texto;
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      setTimeout(() => abrirModalNovo('cliente', textoCapturado, selecionarCliente), 0);
    });
    dropdown.appendChild(itemNovo);
  }

  function renderDropdown(clientes, status, texto) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'block';
    if (status === 'loading') {
      dropdown.innerHTML = '<div class="cliente-dropdown-msg">Buscando...</div>';
      return;
    }
    if (status === 'empty') {
      const msg = document.createElement('div');
      msg.className = 'cliente-dropdown-msg';
      msg.textContent = 'Nenhum cliente encontrado';
      dropdown.appendChild(msg);
    } else {
      clientes.forEach(c => {
        const item = document.createElement('div');
        item.className = 'cliente-dropdown-item';
        const doc = c.numeroDocumento
          ? `<span class="cliente-doc">${c.numeroDocumento}</span>`
          : '';
        item.innerHTML = `<span class="cliente-nome-item">${c.nome || '—'}</span>${doc}`;
        item.addEventListener('mousedown', e => { e.preventDefault(); selecionarCliente(c); });
        dropdown.appendChild(item);
      });
    }
    addCriarNovoCliente(texto);
  }

  let debounceTimer = null;

  async function buscar(texto) {
    renderDropdown([], 'loading', texto);
    try {
      const query = texto.length >= 2 ? texto : '';
      const todos = await api.blingBuscarClientes(query);
      const clientes = query
        ? todos
        : todos.filter(c => c.nome?.toLowerCase().includes(texto.toLowerCase()));
      if (clientes.length === 0) renderDropdown([], 'empty', texto);
      else renderDropdown(clientes, 'ok', texto);
    } catch {
      renderDropdown([], 'empty', texto);
    }
  }

  input?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const texto = input.value.trim();
    if (texto.length < 1) { fecharDropdown(); return; }
    renderDropdown([], 'loading', texto);
    debounceTimer = setTimeout(() => buscar(texto), 200);
  });

  // Botão "Buscar" — dispara imediatamente
  document.querySelector('.input-action-btn')?.addEventListener('click', () => {
    const texto = input?.value?.trim();
    if (!texto) return;
    buscar(texto);
  });

  // Fechar ao clicar fora
  document.addEventListener('click', e => {
    if (!wrap?.contains(e.target)) fecharDropdown();
  });

  // Botão ✕ — limpa cliente selecionado
  document.querySelector('.remove-btn')?.addEventListener('click', () => {
    if (pessoaNome) pessoaNome.textContent = '';
    if (pessoaSub)  pessoaSub.textContent  = '';
    if (pessoaCard) { pessoaCard.style.display = 'none'; delete pessoaCard.dataset.clienteId; }
    if (input)      input.value = '';
    fecharDropdown();
    marcarAlterado();
  });
})();

// ── PLACA EM MAIÚSCULAS ───────────────────────────────────
document.getElementById('placa-input')?.addEventListener('input', function() {
  const pos = this.selectionStart;
  this.value = this.value.toUpperCase();
  this.setSelectionRange(pos, pos);
});

// ── CONSULTA DE PLACA (DETRAN) ────────────────────────────
(function () {
  const btnConsultar = document.querySelector('#painel-veiculo .input-action-btn');
  if (!btnConsultar) return;

  btnConsultar.addEventListener('click', async () => {
    const placaInput = document.getElementById('placa-input');
    const placa = placaInput?.value?.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

    if (!placa || placa.length < 7) {
      placaInput?.focus();
      return;
    }

    const textoOriginal = btnConsultar.textContent;
    btnConsultar.textContent = 'Consultando...';
    btnConsultar.disabled = true;

    try {
      const dados = await api.consultarPlaca(placa);

      // Preenche badge de placa
      const placaBadge = document.querySelector('.veiculo-header .placa');
      if (placaBadge) placaBadge.textContent = placa;

      // Modelo
      const modelo = dados.modelo || dados.name || '';
      const veiculoTitulo = document.querySelector('.veiculo-titulo');
      if (veiculoTitulo && modelo) veiculoTitulo.textContent = modelo;

      // Ano e cor
      const ano = dados.anoModelo || dados.ano || '';
      const cor = dados.cor || '';
      const veiculoSub2 = document.querySelector('.veiculo-sub2');
      if (veiculoSub2) veiculoSub2.textContent = [ano, cor].filter(Boolean).join(' · ') || '—';

      // Cor no campo span
      const getDado = lbl => [...document.querySelectorAll('#painel-veiculo .veiculo-dado')]
        .find(d => d.querySelector('label')?.textContent.trim() === lbl);
      if (cor) {
        const corDado = getDado('Cor');
        if (corDado?.querySelector('span')) corDado.querySelector('span').textContent = cor;
      }

      // Exibe tag ✓ Detran
      const detranTag = document.querySelector('.detran-tag');
      if (detranTag) detranTag.style.display = '';

      marcarAlterado();
    } catch (err) {
      const msg = err.message?.includes('404') || err.message?.includes('não encontrado')
        ? 'Veículo não encontrado — preencha manualmente'
        : 'Não foi possível consultar — preencha manualmente';

      // Feedback inline no badge
      const veiculoTitulo = document.querySelector('.veiculo-titulo');
      if (veiculoTitulo) veiculoTitulo.textContent = msg;

      const placaBadge = document.querySelector('.veiculo-header .placa');
      if (placaBadge) placaBadge.textContent = placa;
    } finally {
      btnConsultar.textContent = textoOriginal;
      btnConsultar.disabled = false;
    }
  });
})();

// ── MONITORAR ALTERAÇÕES ──────────────────────────────────
// Campos de texto e textarea no formulário principal
document.addEventListener('input', e => {
  const alvo = e.target;
  if (
    alvo.matches('#queixa-textarea, #obs-tecnica-textarea') ||
    alvo.matches('.cliente-info input') ||
    alvo.matches('#painel-veiculo input, #painel-equipamento input') ||
    alvo.matches('.servico-titulo-input, .servico-valor-input, .servico-quantidade-input') ||
    alvo.matches('#pecas-body input')
  ) {
    marcarAlterado();
  }
});
// Selects de serviço
document.addEventListener('change', e => {
  if (e.target.closest('#servicos-list')) marcarAlterado();
});

// ── TABS ─────────────────────────────────────────────────
document.querySelectorAll('.section-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ── TIPO DE ITEM: VEÍCULO / EQUIPAMENTO ──────────────────
function switchItemType(tipo) {
  document.querySelectorAll('.item-tab').forEach(t => t.classList.toggle('active', t.dataset.type === tipo));
  document.getElementById('painel-veiculo').style.display    = tipo === 'veiculo'     ? '' : 'none';
  document.getElementById('painel-equipamento').style.display = tipo === 'equipamento' ? '' : 'none';
  const cardTitle    = document.getElementById('card-item-title');
  const detranBadge  = document.getElementById('detran-badge');
  if (cardTitle)   cardTitle.textContent       = tipo === 'veiculo' ? 'Veículo' : 'Equipamento';
  if (detranBadge) detranBadge.style.display   = tipo === 'veiculo' ? '' : 'none';
}

// ── CHECKLIST DIAGNÓSTICO ─────────────────────────────────
const states = ['', 'ok', 'atencao', 'critico'];
const labels = ['—', 'OK', 'Atenção', 'Crítico'];
function getIdx(el) {
  for (let i = 1; i < states.length; i++) if (el.classList.contains(states[i])) return i;
  return 0;
}
document.querySelectorAll('.diag-item').forEach(item => {
  item.addEventListener('click', () => {
    let idx = (getIdx(item) + 1) % states.length;
    states.slice(1).forEach(s => item.classList.remove(s));
    if (states[idx]) item.classList.add(states[idx]);
    item.querySelector('.diag-status-btn').textContent = labels[idx] || '—';
    updateDiag();
    marcarAlterado();
  });
});
function updateDiag() {
  const ok = document.querySelectorAll('.diag-item.ok').length;
  const at = document.querySelectorAll('.diag-item.atencao').length;
  const cr = document.querySelectorAll('.diag-item.critico').length;
  const elOk      = document.getElementById('cnt-ok');
  const elAt      = document.getElementById('cnt-atencao');
  const elCr      = document.getElementById('cnt-critico');
  const elCount   = document.getElementById('diag-count');
  const alerta    = document.getElementById('alerta-critico');
  if (elOk)    elOk.textContent    = ok;
  if (elAt)    elAt.textContent    = at;
  if (elCr)    elCr.textContent    = cr;
  if (elCount) elCount.textContent = at + cr;
  if (alerta) {
    alerta.style.display = cr > 0 ? 'flex' : 'none';
    alerta.innerHTML = `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>${cr} ${cr===1?'item crítico':'itens críticos'}`;
  }
}

// ── TOAST DE SUCESSO ──────────────────────────────────────
function mostrarToastSucesso(msg) {
  const t = document.createElement('div');
  t.className = 'toast-sucesso';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2000);
}

// ── BUSCA DE PRODUTO (BLING) ──────────────────────────────
function inicializarBuscaProduto(inputEl, wrapEl, onSelect, fetchFn, tipo) {
  const dropdown = document.createElement('div');
  dropdown.className = 'produto-dropdown';
  dropdown.style.display = 'none';
  wrapEl.appendChild(dropdown);

  let timer = null;

  function fechar() {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
  }

  function addCriarNovo(texto) {
    if (!tipo || !texto || texto.length < 1) return;
    const itemNovo = document.createElement('div');
    itemNovo.className = 'produto-dropdown-item produto-novo';
    itemNovo.innerHTML = `<span>+ Criar "<strong>${texto}</strong>"</span><span class="tag-novo">NOVO</span>`;
    itemNovo.addEventListener('mousedown', e => {
      e.preventDefault();
      const textoCapturado = texto;
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      // setTimeout evita conflito de eventos ao remover o item do DOM antes do click disparar
      setTimeout(() => abrirModalNovo(tipo, textoCapturado, onSelect), 0);
    });
    dropdown.insertBefore(itemNovo, dropdown.firstChild);
  }

  function renderDropdown(produtos, status, texto) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'block';
    if (status === 'loading') {
      dropdown.innerHTML = '<div class="produto-dropdown-msg">Buscando...</div>';
      return;
    }
    if (status === 'empty') {
      const msg = document.createElement('div');
      msg.className = 'produto-dropdown-msg';
      msg.textContent = 'Nenhum produto encontrado';
      dropdown.appendChild(msg);
    } else {
      produtos.forEach(p => {
        const item = document.createElement('div');
        item.className = 'produto-dropdown-item';
        const cod   = p.codigo ? `<span class="produto-cod">${p.codigo}</span>` : '';
        const saldo = p.estoque?.saldoVirtualTotal != null
          ? `<span class="produto-estoque">Estoque: ${p.estoque.saldoVirtualTotal}</span>` : '';
        item.innerHTML = `<span class="produto-nome-item">${p.nome || '—'}</span>${cod}${saldo}`;
        item.addEventListener('mousedown', e => { e.preventDefault(); onSelect(p); fechar(); });
        dropdown.appendChild(item);
      });
    }
    addCriarNovo(texto);
  }

  async function buscar(texto) {
    renderDropdown([], 'loading', texto);
    try {
      // Bling não retorna resultados para queries de 1 char — busca tudo e filtra no cliente
      const query = texto.length >= 2 ? texto : '';
      const todos = await fetchFn(query);
      const produtos = query
        ? todos
        : todos.filter(p => p.nome?.toLowerCase().includes(texto.toLowerCase()));
      if (!produtos.length) renderDropdown([], 'empty', texto);
      else renderDropdown(produtos, 'ok', texto);
    } catch { renderDropdown([], 'empty', texto); }
  }

  inputEl.addEventListener('input', () => {
    clearTimeout(timer);
    const texto = inputEl.value.trim();
    if (texto.length < 1) { fechar(); return; }
    renderDropdown([], 'loading', texto);
    timer = setTimeout(() => buscar(texto), 200);
  });

  document.addEventListener('click', e => {
    if (!wrapEl.contains(e.target)) fechar();
  });
}

// ── ADICIONAR SERVIÇO ─────────────────────────────────────
let servicoCount = 2;

function renumerarServicos() {
  document.querySelectorAll('#servicos-list .servico-card').forEach((card, i) => {
    const numEl = card.querySelector('.servico-num');
    if (numEl) numEl.textContent = `#${i + 1}`;
  });
}

document.getElementById('add-servico-btn').addEventListener('click', () => {
  const tipos     = ['Revisão geral','Troca de óleo','Freios','Suspensão','Elétrica','Outro'];
  const mecanicos = ['João Silva','André Lima','Pedro Rocha'];
  const novoNum = document.querySelectorAll('#servicos-list .servico-card').length + 1;
  const div = document.createElement('div');
  div.className = 'servico-card';
  div.innerHTML = `
    <div class="servico-card-header">
      <span class="servico-num">#${novoNum}</span>
      <div class="servico-titulo-wrap">
        <input class="servico-titulo-input" type="text" placeholder="Nome do serviço…"/>
      </div>
      <button class="servico-del-btn">✕</button>
    </div>
    <div class="servico-card-body">
      <div class="field"><label>Tipo</label><select><option value="" disabled selected>Selecione o tipo</option>${tipos.map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Mecânico responsável</label><select><option value="" disabled selected>Selecione o mecânico</option>${mecanicos.map(m=>`<option>${m}</option>`).join('')}</select></div>
      <div class="field"><label>Quantidade</label><input type="number" class="servico-quantidade-input" value="1" min="1" step="1"/></div>
      <div class="field"><label>Valor do serviço (R$)</label><input type="text" class="servico-valor-input" placeholder="0,00" inputmode="numeric"/></div>
    </div>`;
  document.getElementById('servicos-list').appendChild(div);
  const _swrap = div.querySelector('.servico-titulo-wrap');
  const _sinput = div.querySelector('.servico-titulo-input');
  inicializarBuscaProduto(_sinput, _swrap, p => {
    _sinput.value = p.nome || '';
    div.dataset.blingId = String(p.id);
    const valorInput = div.querySelector('.servico-valor-input');
    if (valorInput && p.preco) {
      valorInput.value = Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      recalcularResumo();
    }
    marcarAlterado();
  }, q => api.blingBuscarServicos(q), 'servico');
  _sinput.focus();
});
document.getElementById('servicos-list').addEventListener('click', e => {
  if (e.target.closest('.servico-del-btn')) {
    e.target.closest('.servico-card').remove();
    renumerarServicos();
    recalcularResumo();
  }
});
document.getElementById('servicos-list').addEventListener('input', e => {
  if (e.target.classList.contains('servico-valor-input')) {
    formatarMoeda(e.target);
    recalcularResumo();
  }
  if (e.target.classList.contains('servico-quantidade-input')) recalcularResumo();
});

// ── ADICIONAR PEÇA ────────────────────────────────────────
document.getElementById('add-peca-btn').addEventListener('click', () => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><div class="peca-desc-wrap"><input type="text" placeholder="Código ou nome da peça"/></div></td>
    <td class="td-qty"><input type="number" value="1" min="1"/></td>
    <td class="td-val peca-valor"><input type="text" class="peca-valor-input" placeholder="0,00" inputmode="numeric"/></td>
    <td class="td-total peca-total" style="color:var(--muted)">—</td>
    <td class="td-del print-hide"><button>✕</button></td>`;
  document.getElementById('pecas-body').appendChild(tr);
  const _pwrap  = tr.querySelector('.peca-desc-wrap');
  const _pinput = _pwrap.querySelector('input');
  inicializarBuscaProduto(_pinput, _pwrap, p => {
    _pinput.value = p.nome || '';
    tr.dataset.blingId = String(p.id);
    const valorInput = tr.querySelector('.peca-valor-input');
    if (valorInput && p.preco) {
      valorInput.value = Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const qty = Number(tr.querySelector('.td-qty input')?.value || 1);
      const val = parseBRL(valorInput.value);
      const totalCell = tr.querySelector('.td-total.peca-total');
      if (totalCell) { totalCell.style.color = ''; totalCell.textContent = fmtValor(qty * val); }
      recalcularResumo();
    }
    marcarAlterado();
  }, q => api.blingBuscarPecas(q), 'peca');
  _pinput.focus();
});
document.getElementById('pecas-body').addEventListener('click', e => {
  if (e.target.closest('.td-del button')) {
    e.target.closest('tr').remove();
    recalcularResumo();
  }
});

document.getElementById('pecas-body').addEventListener('input', e => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  if (e.target.classList.contains('peca-valor-input')) formatarMoeda(e.target);
  const qty = Number(tr.querySelector('.td-qty input')?.value || 1);
  const val = parseBRL(tr.querySelector('.peca-valor-input')?.value);
  const totalCell = tr.querySelector('.td-total.peca-total');
  if (totalCell) {
    totalCell.style.color = '';
    totalCell.textContent = fmtValor(qty * val);
  }
  recalcularResumo();
});

// ── SALVAR ────────────────────────────────────────────────
document.getElementById('salvar-btn').addEventListener('click', async function() {
  await salvarOS(null);
});

// ── APROVAR ───────────────────────────────────────────────
document.getElementById('aprovar-btn').addEventListener('click', async function() {
  if (!osId) {
    await criarESalvar('enviada_cliente');
  } else {
    this.innerHTML = '✓ Enviada!';
    this.style.background = '#0284C7';
    this.disabled = true;
    setStep(1); // avança para "Enviada para o Cliente"
  }
});

// ── MENU IMPRIMIR ─────────────────────────────────────────
const btnToggle = document.getElementById('btn-print-toggle');
const dropdown  = document.getElementById('print-dropdown');
btnToggle.addEventListener('click', e => {
  e.stopPropagation();
  dropdown.classList.toggle('open');
});
document.addEventListener('click', () => dropdown.classList.remove('open'));

function imprimirOS(versao) {
  dropdown.classList.remove('open');

  const d = coletarDadosFormulario();
  const osNum  = (_osCarregada?.numero_os || _osCarregada?.numero || (document.querySelector('.header-num')?.textContent || '').replace('#','').trim() || '—');
  const osData = _osCarregada?.criado_em
    ? new Date(_osCarregada.criado_em).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const pessoaCard  = document.querySelector('.pessoa-card');
  const clienteNome  = document.querySelector('.pessoa-nome')?.textContent?.trim() || d.cliente_nome || '—';
  const clienteDoc   = pessoaCard?.dataset.doc       || document.querySelector('.pessoa-sub')?.textContent?.trim() || '';
  const clienteTel   = pessoaCard?.dataset.telefone  || '';
  const clienteEmail = pessoaCard?.dataset.email     || '';
  const logoSrc      = document.querySelector('.logo-img')?.src || '';

  const { placa, modelo, ano, cor } = d.veiculo;
  const { servicos, pecas, obs_tecnica, km_atual, frota, num_pedido_compra, num_pedido_servico } = d;

  const fmtBRL = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalServ  = servicos.reduce((a, s) => a + (s.valor     || 0) * (s.quantidade || 1), 0);
  const totalPecas = pecas.reduce   ((a, p) => a + (p.valor_unit || 0) * (p.quantidade || 1), 0);
  const totalGeral = totalServ + totalPecas;

  const VERSAO_LABEL = { cliente: 'Via do Cliente', mecanico: 'Via do Mecânico', estoque: 'Via do Estoque (Checklist)' };
  const versaoLabel  = VERSAO_LABEL[versao] || versao;

  // ── CSS compartilhado ──────────────────────────────────────────────────────
  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body   { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 24px 32px; }
    .ph    { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #1B2D5B; margin-bottom: 20px; }
    .ph-logo { display: flex; align-items: center; gap: 12px; }
    .ph-logo img { height: 48px; object-fit: contain; }
    .ph-company strong { display: block; font-size: 17px; font-weight: 700; color: #1B2D5B; }
    .ph-company span   { font-size: 11px; color: #666; }
    .ph-os { text-align: right; }
    .ph-os .num   { font-size: 20px; font-weight: 700; color: #1B2D5B; }
    .ph-os .meta  { font-size: 11px; color: #666; margin-top: 2px; }
    .ph-os .badge { display: inline-block; margin-top: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: 2px 8px; border-radius: 20px; background: #E0E7FF; color: #1B2D5B; }
    h3  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #1B2D5B; margin-bottom: 8px; }
    .section { margin-bottom: 18px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .info-row  { display: flex; gap: 6px; font-size: 12.5px; }
    .info-row label { color: #666; min-width: 80px; flex-shrink: 0; }
    .info-row span  { font-weight: 500; }
    table  { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    thead th { background: #1B2D5B; color: #fff; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #E5E7EB; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: #F9FAFB; }
    tfoot td { padding: 7px 10px; font-weight: 600; border-top: 1px solid #D1D5DB; }
    .ta-r { text-align: right; }
    .total-box { display: flex; justify-content: flex-end; margin-top: 14px; }
    .total-inner { border: 2px solid #1B2D5B; border-radius: 8px; padding: 10px 20px; min-width: 220px; }
    .total-inner .t-row { display: flex; justify-content: space-between; gap: 24px; font-size: 12.5px; color: #555; margin-bottom: 4px; }
    .total-inner .t-grand{ display: flex; justify-content: space-between; gap: 24px; font-size: 16px; font-weight: 700; color: #1B2D5B; padding-top: 8px; border-top: 1px solid #D1D5DB; margin-top: 6px; }
    .obs-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 14px; font-size: 12.5px; color: #444; white-space: pre-wrap; }
    .pc-row  { display: flex; gap: 24px; font-size: 12.5px; }
    .pc-row span { color: #666; }
    .pc-row strong { font-weight: 600; }
    /* Checklist */
    .chk-table td:first-child { width: 28px; text-align: center; }
    .chk-box { width: 16px; height: 16px; border: 1.5px solid #555; border-radius: 3px; display: inline-block; }
    .assinatura { margin-top: 40px; display: flex; justify-content: space-between; }
    .assinatura-linha { text-align: center; width: 200px; }
    .assinatura-linha hr { border: none; border-top: 1px solid #555; margin-bottom: 6px; }
    .assinatura-linha span { font-size: 11px; color: #666; }
    @media print { body { padding: 0; } }
  `;

  // ── Header comum ───────────────────────────────────────────────────────────
  const header = `
    <div class="ph">
      <div class="ph-logo">
        ${logoSrc ? `<img src="${logoSrc}" alt="Hidrauldiesel">` : ''}
        <div class="ph-company">
          <strong>Hidrauldiesel</strong>
          <span>Oficina Mecânica</span>
        </div>
      </div>
      <div class="ph-os">
        <div class="num">OS #${osNum}</div>
        <div class="meta">Emitido em ${osData}</div>
        <span class="badge">${versaoLabel}</span>
      </div>
    </div>`;

  // ── Bloco de veículo (comum a todas as versões) ────────────────────────────
  const blocoVeiculo = (comPlaca = true) => `
    <div class="section">
      <h3>Veículo</h3>
      <div class="info-grid">
        ${comPlaca ? `<div class="info-row"><label>Placa</label><span>${placa || '—'}</span></div>` : ''}
        <div class="info-row"><label>Modelo</label><span>${modelo || '—'}</span></div>
        <div class="info-row"><label>Ano</label><span>${ano || '—'}</span></div>
        <div class="info-row"><label>Cor</label><span>${cor || '—'}</span></div>
        <div class="info-row"><label>KM atual</label><span>${km_atual || '—'}</span></div>
        ${frota ? `<div class="info-row"><label>Frota</label><span>${frota}</span></div>` : ''}
      </div>
    </div>`;

  // ── Conteúdo por versão ────────────────────────────────────────────────────
  let body = '';

  if (versao === 'cliente') {
    const linhasServ = servicos.length
      ? servicos.map(s => `
          <tr>
            <td>${s.descricao}</td>
            <td class="ta-r">${s.quantidade}</td>
            <td class="ta-r">${fmtBRL(s.valor)}</td>
            <td class="ta-r">${fmtBRL((s.valor||0) * (s.quantidade||1))}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="color:#999;text-align:center;padding:10px">Nenhum serviço</td></tr>';

    const linhasPecas = pecas.length
      ? pecas.map(p => `
          <tr>
            <td>${p.descricao}</td>
            <td class="ta-r">${p.quantidade}</td>
            <td class="ta-r">${fmtBRL(p.valor_unit)}</td>
            <td class="ta-r">${fmtBRL((p.valor_unit||0) * (p.quantidade||1))}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="color:#999;text-align:center;padding:10px">Nenhuma peça</td></tr>';

    body = `
      <div class="section">
        <h3>Cliente</h3>
        <div class="info-grid">
          <div class="info-row"><label>Nome</label><span>${clienteNome}</span></div>
          <div class="info-row"><label>CPF/CNPJ</label><span>${clienteDoc || '—'}</span></div>
          <div class="info-row"><label>Telefone</label><span>${clienteTel || '—'}</span></div>
          ${clienteEmail ? `<div class="info-row"><label>E-mail</label><span>${clienteEmail}</span></div>` : ''}
        </div>
      </div>
      ${blocoVeiculo()}
      <div class="section">
        <h3>Serviços</h3>
        <table>
          <thead><tr><th>Descrição</th><th class="ta-r">Qtd</th><th class="ta-r">Valor Unit.</th><th class="ta-r">Total</th></tr></thead>
          <tbody>${linhasServ}</tbody>
          <tfoot><tr><td colspan="3">Subtotal Serviços</td><td class="ta-r">${fmtBRL(totalServ)}</td></tr></tfoot>
        </table>
      </div>
      <div class="section">
        <h3>Peças e Insumos</h3>
        <table>
          <thead><tr><th>Descrição</th><th class="ta-r">Qtd</th><th class="ta-r">Valor Unit.</th><th class="ta-r">Total</th></tr></thead>
          <tbody>${linhasPecas}</tbody>
          <tfoot><tr><td colspan="3">Subtotal Peças</td><td class="ta-r">${fmtBRL(totalPecas)}</td></tr></tfoot>
        </table>
      </div>
      <div class="total-box">
        <div class="total-inner">
          <div class="t-row"><span>Subtotal serviços</span><span>${fmtBRL(totalServ)}</span></div>
          <div class="t-row"><span>Subtotal peças</span><span>${fmtBRL(totalPecas)}</span></div>
          <div class="t-grand"><span>Total Geral</span><span>${fmtBRL(totalGeral)}</span></div>
        </div>
      </div>
      ${(num_pedido_compra || num_pedido_servico) ? `
      <div class="section" style="margin-top:16px">
        <h3>Pedidos</h3>
        <div class="pc-row">
          ${num_pedido_compra  ? `<div><span>Nº Pedido de Compra: </span><strong>${num_pedido_compra}</strong></div>`  : ''}
          ${num_pedido_servico ? `<div><span>Nº Pedido de Serviço: </span><strong>${num_pedido_servico}</strong></div>` : ''}
        </div>
      </div>` : ''}
      ${obs_tecnica ? `
      <div class="section" style="margin-top:16px">
        <h3>Observações</h3>
        <div class="obs-box">${obs_tecnica}</div>
      </div>` : ''}
      <div class="assinatura">
        <div class="assinatura-linha"><hr><span>Assinatura do Cliente</span></div>
        <div class="assinatura-linha"><hr><span>Responsável Técnico</span></div>
      </div>`;

  } else if (versao === 'mecanico') {
    const linhasServ = servicos.length
      ? servicos.map(s => `
          <tr>
            <td>${s.descricao}</td>
            <td class="ta-r">${s.quantidade}</td>
          </tr>`).join('')
      : '<tr><td colspan="2" style="color:#999;text-align:center;padding:10px">Nenhum serviço</td></tr>';

    const linhasPecas = pecas.length
      ? pecas.map(p => `
          <tr>
            <td>${p.descricao}</td>
            <td class="ta-r">${p.quantidade}</td>
          </tr>`).join('')
      : '<tr><td colspan="2" style="color:#999;text-align:center;padding:10px">Nenhuma peça</td></tr>';

    body = `
      <div class="section">
        <h3>Cliente</h3>
        <div class="info-grid">
          <div class="info-row"><label>Nome</label><span>${clienteNome}</span></div>
          ${clienteDoc   ? `<div class="info-row"><label>CPF/CNPJ</label><span>${clienteDoc}</span></div>`   : ''}
          ${clienteTel   ? `<div class="info-row"><label>Telefone</label><span>${clienteTel}</span></div>`   : ''}
          ${clienteEmail ? `<div class="info-row"><label>E-mail</label><span>${clienteEmail}</span></div>`   : ''}
        </div>
      </div>
      ${blocoVeiculo()}
      <div class="section">
        <h3>Serviços a executar</h3>
        <table>
          <thead><tr><th>Descrição</th><th class="ta-r">Qtd</th></tr></thead>
          <tbody>${linhasServ}</tbody>
        </table>
      </div>
      <div class="section">
        <h3>Peças necessárias</h3>
        <table>
          <thead><tr><th>Descrição</th><th class="ta-r">Qtd</th></tr></thead>
          <tbody>${linhasPecas}</tbody>
        </table>
      </div>
      ${obs_tecnica ? `
      <div class="section" style="margin-top:16px">
        <h3>Observações Técnicas</h3>
        <div class="obs-box">${obs_tecnica}</div>
      </div>` : `
      <div class="section" style="margin-top:16px">
        <h3>Observações Técnicas</h3>
        <div class="obs-box" style="min-height:60px">&nbsp;</div>
      </div>`}`;

  } else if (versao === 'estoque') {
    const linhasPecas = pecas.length
      ? pecas.map((p, i) => `
          <tr>
            <td><div class="chk-box"></div></td>
            <td>${i + 1}. ${p.descricao}</td>
            <td class="ta-r">${p.quantidade}</td>
          </tr>`).join('')
      : '<tr><td colspan="3" style="color:#999;text-align:center;padding:10px">Nenhuma peça registrada</td></tr>';

    body = `
      <div class="section">
        <h3>Cliente</h3>
        <div class="info-row"><label>Nome</label><span>${clienteNome}</span></div>
      </div>
      ${blocoVeiculo()}
      <div class="section">
        <h3>Checklist de Peças e Insumos</h3>
        <table class="chk-table">
          <thead><tr><th></th><th>Descrição</th><th class="ta-r">Qtd</th></tr></thead>
          <tbody>${linhasPecas}</tbody>
        </table>
      </div>`;
  }

  // ── Abre janela de impressão ───────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>OS #${osNum} — ${versaoLabel}</title>
<style>${css}</style>
</head>
<body>
${header}
${body}
<script>
  window.onload = function() {
    window.print();
    window.onafterprint = function() { window.close(); };
  };
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=860,height=720');
  if (!win) { alert('Permita pop-ups para imprimir.'); return; }
  win.document.write(html);
  win.document.close();
}

// ── NOVO ORÇAMENTO ────────────────────────────────────────

function inicializarNovoOrcamento() {
  // Header
  const headerNum  = document.querySelector('.header-num');
  const headerCrumb = document.querySelector('.header-breadcrumb span');
  if (headerNum)   headerNum.textContent   = 'Novo Orçamento';
  if (headerCrumb) headerCrumb.textContent = '/ Novo orçamento';
  document.title = 'Hidrauldiesel — Novo Orçamento';
  // HTML já está limpo — apenas recalcula o resumo zerado
  recalcularResumo();
}

function coletarDadosFormulario() {
  // Cliente — lê do card de pessoa se estiver visível, senão usa o campo de busca
  const pessoaCard = document.querySelector('.pessoa-card');
  const pessoaVisivel = pessoaCard && pessoaCard.style.display !== 'none';
  const nomeRaw = pessoaVisivel
    ? (document.querySelector('.pessoa-nome')?.textContent?.trim() || '')
    : (document.getElementById('busca-cliente-input')?.value?.trim() || '');
  const clienteNome = (nomeRaw === '—' ? '' : nomeRaw);
  const clienteId         = pessoaCard?.dataset.clienteId   || null;
  const clienteCpfCnpj   = pessoaCard?.dataset.doc        || '';
  const clienteTelefone  = pessoaCard?.dataset.telefone   || '';
  const clienteEmailCamp = pessoaCard?.dataset.email      || '';

  // Queixa e obs
  const queixa     = document.getElementById('queixa-textarea')?.value || '';
  const obsTecnica = document.getElementById('obs-tecnica-textarea')?.value || '';

  // Veículo
  const placaInput = document.querySelector('#painel-veiculo .input-with-action input');
  const placa  = placaInput?.value?.trim() || '';
  const modelo = document.querySelector('.veiculo-titulo')?.textContent?.trim() || '';
  const partes = (document.querySelector('.veiculo-sub2')?.textContent || '').split('·').map(s => s.trim());

  const getDado  = lbl => [...document.querySelectorAll('#painel-veiculo .veiculo-dado')]
    .find(d => d.querySelector('label')?.textContent.trim() === lbl);
  const getSpan  = lbl => { const v = getDado(lbl)?.querySelector('span')?.textContent?.trim(); return (v === '—' ? '' : v) || ''; };
  const getInput = lbl => getDado(lbl)?.querySelector('input')?.value || '';

  const chassi   = getSpan('Chassi');
  const motor    = getSpan('Motor');
  const cor      = getSpan('Cor');
  const km_atual = getInput('Km atual');
  const frota    = getInput('Frota');

  // Serviços
  const servicos = [...document.querySelectorAll('#servicos-list .servico-card')].map(card => ({
    descricao:        card.querySelector('.servico-titulo-input')?.value || '',
    quantidade:       Number(card.querySelector('.servico-quantidade-input')?.value || 1),
    valor:            parseBRL(card.querySelector('.servico-valor-input')?.value),
    mecanico_id:      card.querySelector('.servico-mecanico-select')?.dataset.mecanicoId || null,
    bling_produto_id: card.dataset.blingId || null,
  })).filter(s => s.descricao);

  // Peças
  const pecas = [...document.querySelectorAll('#pecas-body tr')].map(tr => ({
    descricao:      tr.querySelector('td:first-child input')?.value || '',
    quantidade:     Number(tr.querySelector('.td-qty input')?.value || 1),
    valor_unit:     parseBRL(tr.querySelector('.peca-valor-input')?.value),
    bling_produto_id: tr.dataset.blingId || null,
  })).filter(p => p.descricao);

  // Checklist — lê estado via classe CSS (ok / atencao / critico / vazio = neutro)
  const checklist = {};
  document.querySelectorAll('.diag-item').forEach(item => {
    const label = item.querySelector('.diag-item-label')?.textContent?.trim();
    if (!label) return;
    const idx = getIdx(item);
    checklist[label] = states[idx] || 'neutro';
  });

  const num_pedido_compra  = document.getElementById('num-pedido-compra')?.value?.trim() || null;
  const num_pedido_servico = document.getElementById('num-pedido-servico')?.value?.trim() || null;

  return {
    cliente_id:        clienteId,
    cliente_nome:      clienteNome,
    cliente_cpf_cnpj:  clienteCpfCnpj  || null,
    cliente_telefone:  clienteTelefone || null,
    cliente_email:     clienteEmailCamp || null,
    veiculo: { placa, modelo, ano: partes[0] || '', cor: cor || partes[1] || '', chassi, motor },
    queixa,
    obs_tecnica: obsTecnica,
    km_atual,
    frota,
    servicos,
    pecas,
    checklist,
    num_pedido_compra,
    num_pedido_servico,
  };
}

async function salvarOS(statusAposCreate) {
  const btn = document.getElementById('salvar-btn');
  const textoOriginal = btn.innerHTML;
  btn.innerHTML = '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Salvando…';
  btn.disabled = true;

  try {
    const dados = coletarDadosFormulario();
    console.log('Payload OS:', dados);

    if (osId) {
      // Edição — atualiza OS existente
      await api.atualizarOS(osId, dados);
      limparAlteracoes();
      btn.innerHTML = '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg> Salvo!';
      setTimeout(() => { btn.innerHTML = textoOriginal; btn.disabled = false; }, 1800);
    } else {
      // Novo — cria OS e redireciona
      const novaOS = await api.criarOS(dados);
      if (statusAposCreate === 'enviada_cliente') {
        await api.atualizarStatusOS(novaOS.id, 'enviada_cliente');
      }
      limparAlteracoes();
      window.location.href = `../orcamento/?id=${novaOS.id}`;
    }
  } catch (err) {
    console.error('Erro ao salvar OS:', err.message);
    alert('Erro ao salvar: ' + err.message);
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
  }
}

// Mantém compatibilidade com o botão Aprovar (novo orçamento)
async function criarESalvar(statusAposCreate) {
  await salvarOS(statusAposCreate);
}

// ── INTEGRAÇÃO COM API ────────────────────────────────────

// Lê ?id= da URL
(function () {
  const params = new URLSearchParams(window.location.search);
  osId = params.get('id');
  if (!osId) inicializarNovoOrcamento();
  else carregarOS();
})();

function fmtValor(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function popularPagina(os) {
  _osCarregada = os;
  _carregandoOS = true;

  // Header
  const headerNum   = document.querySelector('.header-num');
  const headerCrumb = document.querySelector('.header-breadcrumb span');
  const printOsNum  = document.getElementById('print-os-num');
  const numeroExibido = os.numero_os || os.numero;
  if (headerNum)   headerNum.textContent   = `#${numeroExibido}`;
  if (headerCrumb) headerCrumb.textContent = `/ OS #${numeroExibido}`;
  if (printOsNum)  printOsNum.textContent  = `#${numeroExibido}`;
  document.title = `Hidrauldiesel — OS #${numeroExibido}`;

  // Cliente — popula card e torna visível
  const pessoaCard = document.querySelector('.pessoa-card');
  const pessoaNome = document.querySelector('.pessoa-nome');
  if (pessoaNome) pessoaNome.textContent = os.cliente_nome || '—';
  const buscaInput = document.getElementById('busca-cliente-input');
  if (buscaInput) buscaInput.value = os.cliente_nome || '';
  const pessoaSub = document.querySelector('.pessoa-sub');
  if (pessoaCard) {
    if (os.cliente_nome) pessoaCard.style.display = 'flex';
    if (os.cliente_id)   pessoaCard.dataset.clienteId = String(os.cliente_id);
    pessoaCard.dataset.doc      = os.cliente_cpf_cnpj  || '';
    pessoaCard.dataset.telefone = os.cliente_telefone   || '';
    pessoaCard.dataset.email    = os.cliente_email      || '';
  }
  if (pessoaSub) pessoaSub.textContent = os.cliente_cpf_cnpj || '';

  // Veículo — input de busca por placa
  const placaInput = document.querySelector('#painel-veiculo .input-with-action input');
  if (placaInput) placaInput.value = os.placa || '';

  // Veículo — resultado exibido
  const placaBadge = document.querySelector('.veiculo-header .placa');
  if (placaBadge) placaBadge.textContent = os.placa || '—';

  const veiculoTitulo = document.querySelector('.veiculo-titulo');
  if (veiculoTitulo) veiculoTitulo.textContent = os.modelo || '—';

  const veiculoSub2 = document.querySelector('.veiculo-sub2');
  if (veiculoSub2) veiculoSub2.textContent = [os.ano, os.cor].filter(Boolean).join(' · ') || '—';

  // Campos individuais — busca pela label dentro de .veiculo-dado
  const getDado = lbl => [...document.querySelectorAll('#painel-veiculo .veiculo-dado')]
    .find(d => d.querySelector('label')?.textContent.trim() === lbl);
  const setSpan  = (lbl, val) => { const d = getDado(lbl); if (d?.querySelector('span'))  d.querySelector('span').textContent = val || '—'; };
  const setInput = (lbl, val) => { const d = getDado(lbl); if (d?.querySelector('input')) d.querySelector('input').value    = val != null ? String(val) : ''; };

  setSpan('Chassi',    os.chassi);
  setSpan('Motor',     os.motor);
  setSpan('Cor',       os.cor);
  setInput('Km atual', os.km_atual);
  setInput('Frota',    os.frota);

  // Queixa e observações técnicas
  const queixaTA = document.getElementById('queixa-textarea');
  if (queixaTA) queixaTA.value = os.queixa || '';

  const obsTA = document.getElementById('obs-tecnica-textarea');
  if (obsTA) obsTA.value = os.obs_tecnica || '';

  // Pedidos do cliente
  const pedidoCompraEl  = document.getElementById('num-pedido-compra');
  const pedidoServicoEl = document.getElementById('num-pedido-servico');
  if (pedidoCompraEl)  pedidoCompraEl.value  = os.num_pedido_compra  || '';
  if (pedidoServicoEl) pedidoServicoEl.value = os.num_pedido_servico || '';

  // Fotos do diagnóstico
  carregarFotos();

  // Serviços, peças e resumo financeiro
  renderServicos(os.servicos || []);
  renderPecas(os.pecas || []);
  atualizarResumo(os.servicos || [], os.pecas || []);

  // Checklist — restaura estado de cada item
  if (os.checklist && typeof os.checklist === 'object') {
    document.querySelectorAll('.diag-item').forEach(item => {
      const label = item.querySelector('.diag-item-label')?.textContent?.trim();
      const estado = label && os.checklist[label];
      if (!estado || estado === 'neutro') return;
      states.slice(1).forEach(s => item.classList.remove(s));
      item.classList.add(estado);
      const btn = item.querySelector('.diag-status-btn');
      const idx = states.indexOf(estado);
      if (btn) btn.textContent = labels[idx] || '—';
    });
    updateDiag();
  }

  // Stepper — sincronizar com status atual da OS
  const idx = STEPS.findIndex(s => s.key === os.status);
  if (idx >= 0) {
    currentStep = idx;
    renderStepper();
    const selEl = document.getElementById('status-select');
    if (selEl) selEl.value = String(idx);
  }

  // Botão excluir — só aparece em OS existentes
  configurarExclusao(os);

  // Botões NF — só aparecem em autorizada_faturamento
  atualizarBotoesNF(os.status);

  _carregandoOS = false;
}

function renderServicos(servicos) {
  const list = document.getElementById('servicos-list');
  servicoCount = servicos.length;
  list.innerHTML = '';
  if (servicos.length === 0) return;

  servicos.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'servico-card';
    if (s.bling_produto_id) div.dataset.blingId = String(s.bling_produto_id);
    div.innerHTML = `
      <div class="servico-card-header">
        <span class="servico-num">#${i + 1}</span>
        <div class="servico-titulo-wrap">
          <input class="servico-titulo-input" type="text" value="${s.descricao || ''}"/>
        </div>
        <button class="servico-del-btn">✕</button>
      </div>
      <div class="servico-card-body">
        <div class="field"><label>Quantidade</label>
          <input type="number" class="servico-quantidade-input" min="1" step="1" value="${Number(s.quantidade || 1)}"/>
        </div>
        <div class="field"><label>Valor do serviço (R$)</label>
          <input type="text" class="servico-valor-input" placeholder="0,00" inputmode="numeric" value="${Number(s.valor || 0) ? Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}"/>
        </div>
      </div>`;
    list.appendChild(div);
    const wrap  = div.querySelector('.servico-titulo-wrap');
    const input = div.querySelector('.servico-titulo-input');
    inicializarBuscaProduto(input, wrap, p => {
      input.value = p.nome || '';
      div.dataset.blingId = String(p.id);
      const valorInput = div.querySelector('.servico-valor-input');
      if (valorInput && p.preco) {
        valorInput.value = Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        recalcularResumo();
      }
      marcarAlterado();
    }, q => api.blingBuscarServicos(q), 'servico');
  });
}

function renderPecas(pecas) {
  const tbody = document.getElementById('pecas-body');
  tbody.innerHTML = '';
  if (pecas.length === 0) return;

  pecas.forEach(p => {
    const total = Number(p.quantidade || 1) * Number(p.valor_unit || 0);
    const tr = document.createElement('tr');
    if (p.bling_produto_id) tr.dataset.blingId = String(p.bling_produto_id);
    tr.innerHTML = `
      <td><div class="peca-desc-wrap"><input type="text" value="${p.descricao || ''}"/></div></td>
      <td class="td-qty"><input type="number" value="${p.quantidade || 1}" min="1"/></td>
      <td class="td-val peca-valor"><input type="text" class="peca-valor-input" inputmode="numeric" value="${Number(p.valor_unit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"/></td>
      <td class="td-total peca-total">${fmtValor(total)}</td>
      <td class="td-del print-hide"><button>✕</button></td>`;
    tbody.appendChild(tr);
    const wrapDesc  = tr.querySelector('.peca-desc-wrap');
    const inputDesc = wrapDesc.querySelector('input');
    inicializarBuscaProduto(inputDesc, wrapDesc, prod => {
      inputDesc.value = prod.nome || '';
      tr.dataset.blingId = String(prod.id);
      const valorInput = tr.querySelector('.peca-valor-input');
      if (valorInput && prod.preco) {
        valorInput.value = Number(prod.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const qty = Number(tr.querySelector('.td-qty input')?.value || 1);
        const val = parseBRL(valorInput.value);
        const totalCell = tr.querySelector('.td-total.peca-total');
        if (totalCell) { totalCell.style.color = ''; totalCell.textContent = fmtValor(qty * val); }
        recalcularResumo();
      }
      marcarAlterado();
    }, q => api.blingBuscarPecas(q), 'peca');
  });
}

function atualizarResumo(servicos, pecas) {
  const totalServicos = servicos.reduce((a, s) => a + Number(s.quantidade || 1) * Number(s.valor || 0), 0);
  const totalPecas    = pecas.reduce((a, p) => a + Number(p.quantidade || 1) * Number(p.valor_unit || 0), 0);

  _setResumo(totalServicos, totalPecas, servicos.length);
}

// Recalcula o resumo lendo diretamente do DOM (chamado ao editar valores)
function recalcularResumo() {
  const totalServicos = [...document.querySelectorAll('#servicos-list .servico-card')]
    .reduce((a, card) => {
      const qty = Number(card.querySelector('.servico-quantidade-input')?.value || 1);
      const val = parseBRL(card.querySelector('.servico-valor-input')?.value);
      return a + qty * val;
    }, 0);

  const totalPecas = [...document.querySelectorAll('#pecas-body tr')]
    .reduce((a, tr) => {
      const qty = Number(tr.querySelector('.td-qty input')?.value || 1);
      const val = parseBRL(tr.querySelector('.peca-valor-input')?.value);
      return a + qty * val;
    }, 0);

  const nServicos = document.querySelectorAll('#servicos-list .servico-card').length;
  _setResumo(totalServicos, totalPecas, nServicos);
}

function _setResumo(totalServicos, totalPecas, nServicos) {
  const total = totalServicos + totalPecas;

  const vals = document.querySelectorAll('.card .resumo-linha .rl-val');
  if (vals[0]) vals[0].textContent = fmtValor(totalPecas);
  if (vals[1]) vals[1].textContent = fmtValor(totalServicos);

  const lbls = document.querySelectorAll('.card .resumo-linha .rl-label');
  if (lbls[1]) lbls[1].textContent = `Serviços (${nServicos})`;

  const totalEl = document.querySelector('.card .resumo-total .rl-val');
  if (totalEl) totalEl.textContent = fmtValor(total);
}

async function atualizarStatus(novoStatus) {
  if (!osId) return;
  try {
    await api.atualizarStatusOS(osId, novoStatus);
    atualizarBotoesNF(novoStatus);
  } catch (err) {
    console.error('Erro ao atualizar status:', err.message);
    alert('Erro ao atualizar status: ' + err.message);
  }
}

// ── BOTÕES DE NOTA FISCAL ─────────────────────────────────
function atualizarBotoesNF(status) {
  const box   = document.getElementById('faturamento-box');
  const btnNFe  = document.getElementById('btn-nfe');
  const btnNFSe = document.getElementById('btn-nfse');
  if (!box) return;

  if (status !== 'autorizada_faturamento') {
    box.style.display = 'none';
    return;
  }

  box.style.display = '';

  // Verifica se há peças e serviços na OS
  const temPecas    = document.querySelectorAll('#pecas-tbody tr[data-id]').length > 0;
  const temServicos = document.querySelectorAll('#servicos-tbody tr[data-id]').length > 0;

  btnNFe.style.display  = temPecas    ? '' : 'none';
  btnNFSe.style.display = temServicos ? '' : 'none';

  // Se não tem nem peças nem serviços, mostra ambos por segurança
  if (!temPecas && !temServicos) {
    btnNFe.style.display  = '';
    btnNFSe.style.display = '';
  }
}

window.abrirModalNF = function(tipo) {
  const titulos = {
    nfe:  'Emitir NF-e — Peças',
    nfse: 'Emitir NFS-e — Serviços'
  };
  document.getElementById('modal-nf-titulo').textContent = titulos[tipo] || 'Emitir Nota Fiscal';
  document.getElementById('modal-nf').style.display = 'flex';
};

// ── EXCLUIR OS ────────────────────────────────────────────
function configurarExclusao(os) {
  const btn = document.getElementById('btn-excluir-os');
  btn.style.display = 'flex';

  document.getElementById('modal-excluir-msg').textContent =
    `Tem certeza que deseja excluir a OS #${os.numero}? Esta ação não pode ser desfeita.`;

  btn.addEventListener('click', () => {
    document.getElementById('modal-excluir').style.display = 'flex';
  });

  document.getElementById('modal-excluir-cancelar').addEventListener('click', () => {
    document.getElementById('modal-excluir').style.display = 'none';
  });

  document.getElementById('modal-excluir-confirmar').addEventListener('click', async () => {
    const btnConfirmar = document.getElementById('modal-excluir-confirmar');
    btnConfirmar.textContent = 'Excluindo…';
    btnConfirmar.disabled = true;
    try {
      await api.excluirOS(osId);
      limparAlteracoes();
      window.location.href = '../lista-os/';
    } catch (err) {
      console.error('Erro ao excluir OS:', err.message);
      alert('Erro ao excluir: ' + err.message);
      btnConfirmar.textContent = 'Excluir';
      btnConfirmar.disabled = false;
    }
  });
}

async function carregarOS() {
  try {
    const os = await api.buscarOS(osId);
    popularPagina(os);
  } catch (err) {
    console.error('Erro ao carregar OS:', err.message);
    alert('Erro ao carregar OS: ' + err.message);
  }
}

;