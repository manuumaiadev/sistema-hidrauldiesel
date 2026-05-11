const fmtValor = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseBRL = s => Number((s || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;

function formatarInput(input) {
  const digits = input.value.replace(/\D/g, '');
  if (!digits) { input.value = ''; return; }
  input.value = (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function bindValorInputs(root) {
  (root || document).querySelectorAll('.valor-input').forEach(i => {
    i.addEventListener('input', () => formatarInput(i));
    i.addEventListener('focus', () => i.select());
  });
}
bindValorInputs();

// ── Estado ───────────────────────────────────────────────────────────────────
let _funcionarios = [];
let tipoAtual = 'informal';

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

// ── Toggle CLT/Informal ──────────────────────────────────────────────────────
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tipoAtual = btn.dataset.val;
    document.getElementById('func-tipo').value = tipoAtual;
    atualizarCamposCLT();
  });
});

function atualizarCamposCLT() {
  const isCLT = tipoAtual === 'clt';
  document.querySelectorAll('.clt-only').forEach(el => el.classList.toggle('visible', isCLT));
}

document.getElementById('func-cargo-tipo').addEventListener('change', function() {
  atualizarCamposCargo(this.value);
});

function atualizarCamposCargo(tipo) {
  document.getElementById('field-comissao').style.display = (tipo === 'mecanico' || tipo === 'vendedor') ? '' : 'none';
}

// ── Abas do modal ─────────────────────────────────────────────────────────────
window.trocarAbaModal = function(tab) {
  document.getElementById('modal-active-tab').value = tab;
  ['dados', 'adiantamentos', 'ferias', 'rescisao'].forEach(t => {
    document.getElementById('modal-tab-' + t).style.display = t === tab ? '' : 'none';
  });
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.style.borderBottomColor = isActive ? 'var(--navy)' : 'transparent';
    btn.style.color = isActive ? 'var(--navy)' : 'var(--muted)';
  });
  const btnSalvar = document.getElementById('btn-salvar-func');
  if (tab === 'dados')         { btnSalvar.textContent = 'Salvar';              btnSalvar.style.background = ''; }
  if (tab === 'adiantamentos') { btnSalvar.textContent = 'Registrar';           btnSalvar.style.background = ''; }
  if (tab === 'ferias')        { btnSalvar.textContent = 'Registrar Férias';    btnSalvar.style.background = ''; }
  if (tab === 'rescisao')      { btnSalvar.textContent = 'Confirmar Rescisão';  btnSalvar.style.background = '#DC2626'; }

  if (tab === 'adiantamentos') carregarAdiantamentosTab();
};

// ── Modal Principal ──────────────────────────────────────────────────────────
function abrirModal(funcionario = null) {
  const isEdit = !!funcionario;

  const setValor = (id, v) => {
    const el = document.getElementById(id);
    el.value = v > 0 ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
  };

  document.getElementById('modal-func-title').textContent = isEdit ? 'Editar Funcionário' : 'Novo Funcionário';
  document.getElementById('func-id').value         = funcionario?.id || '';
  document.getElementById('func-nome').value        = funcionario?.nome || '';
  document.getElementById('func-cargo').value       = funcionario?.cargo || '';
  document.getElementById('func-admissao').value    = funcionario?.data_admissao?.slice(0, 10) || '';
  setValor('func-inss', funcionario?.percentual_inss || 0);
  document.getElementById('func-comissao').value    = funcionario?.percentual_comissao || '';
  document.getElementById('func-status').value      = funcionario?.status || 'ativo';
  document.getElementById('func-cargo-tipo').value  = funcionario?.cargo_tipo || 'outro';
  document.getElementById('func-erro').textContent  = '';

  setValor('func-salario-oficial',   funcionario?.salario_oficial   || 0);
  setValor('func-salario-adicional', funcionario?.salario_adicional || 0);
  setValor('func-adiantamento',      funcionario?.adiantamento_fixo || 0);
  setValor('func-vt',                funcionario?.vale_transporte   || 0);
  document.getElementById('func-comentario').value = funcionario?.comentario_importante || '';

  tipoAtual = funcionario?.tipo || 'informal';
  document.getElementById('func-tipo').value = tipoAtual;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.val === tipoAtual));
  atualizarCamposCLT();
  atualizarCamposCargo(funcionario?.cargo_tipo || 'outro');

  const tabsEl = document.getElementById('modal-tabs');
  tabsEl.style.display = isEdit ? 'flex' : 'none';
  document.getElementById('btn-excluir-func').style.display = isEdit ? '' : 'none';

  // Limpar adiantamentos
  document.getElementById('adiant-data').value  = '';
  document.getElementById('adiant-valor').value = '';
  document.getElementById('adiant-obs').value   = '';
  document.getElementById('adiant-info').style.display = 'none';
  document.getElementById('adiant-erro').textContent   = '';
  document.getElementById('adiant-historico-lista').innerHTML =
    '<div style="color:var(--muted);font-size:13px;padding:8px 0">Carregando…</div>';

  // Limpar férias
  document.getElementById('ferias-inicio').value = '';
  document.getElementById('ferias-fim').value    = '';
  document.getElementById('ferias-valor').value  = '';
  document.getElementById('ferias-obs').value    = '';
  document.getElementById('ferias-erro').textContent = '';

  // Limpar rescisão
  document.getElementById('rescisao-data').value = '';
  document.getElementById('rescisao-obs').value  = '';
  document.getElementById('rescisao-erro').textContent = '';
  ['rescisao-saldo','rescisao-ferias-prop','rescisao-decimo','rescisao-fgts','rescisao-outros'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('rescisao-total').textContent = 'R$ 0,00';
  if (funcionario) {
    document.getElementById('field-fgts').style.display = funcionario.tipo === 'clt' ? '' : 'none';
  }

  trocarAbaModal('dados');
  document.getElementById('modal-func').style.display = 'flex';
  document.getElementById('func-nome').focus();
}

function fecharModal() { document.getElementById('modal-func').style.display = 'none'; }

document.getElementById('btn-novo').addEventListener('click', () => abrirModal());
document.getElementById('modal-func-close').addEventListener('click', fecharModal);
document.getElementById('modal-func-cancel').addEventListener('click', fecharModal);
document.getElementById('modal-func').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModal(); });

// ── Carregar histórico de adiantamentos ───────────────────────────────────────
async function carregarAdiantamentosTab() {
  const id = document.getElementById('func-id').value;
  if (!id) return;
  const el = document.getElementById('adiant-historico-lista');
  try {
    const lista = await api.listarAdiantamentos(id);
    if (!lista.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum adiantamento registrado.</div>';
      return;
    }
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F8F7F4">
            <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Data</th>
            <th style="text-align:right;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Valor</th>
            <th style="padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Desconto em</th>
            <th style="padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Status</th>
            <th style="padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Obs.</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(a => {
            const data = new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR');
            const badge = a.descontado
              ? '<span style="background:#DCFCE7;color:#15803D;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">Descontado</span>'
              : '<span style="background:#FEF9C3;color:#92400E;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">Pendente</span>';
            return `<tr style="border-top:1px solid #E3E1DA">
              <td style="padding:8px 10px">${data}</td>
              <td style="padding:8px 10px;text-align:right;font-family:var(--mono)">${fmtValor(a.valor)}</td>
              <td style="padding:8px 10px;color:var(--muted)">${a.desconto_em || '—'}</td>
              <td style="padding:8px 10px">${badge}</td>
              <td style="padding:8px 10px;color:var(--muted)">${a.observacoes || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (_) {
    el.innerHTML = '<div style="color:#DC2626;font-size:13px">Erro ao carregar histórico.</div>';
  }
}

// Calcular desconto_em ao mudar data
document.getElementById('adiant-data').addEventListener('change', function() {
  if (!this.value) { document.getElementById('adiant-info').style.display = 'none'; return; }
  // Parse sem timezone: "YYYY-MM-DD"
  const [anoStr, mesStr, diaStr] = this.value.split('-');
  const dia = parseInt(diaStr, 10), mes = parseInt(mesStr, 10), ano = parseInt(anoStr, 10);

  // Auto-calculado com base na data
  let sugerido;
  if (dia <= 5)       sugerido = `05/${String(mes).padStart(2,'0')}/${ano}`;
  else if (dia <= 20) sugerido = `20/${String(mes).padStart(2,'0')}/${ano}`;
  else {
    const pm = mes === 12 ? 1 : mes + 1;
    const pa = mes === 12 ? ano + 1 : ano;
    sugerido = `05/${String(pm).padStart(2,'0')}/${pa}`;
  }

  // Montar opções: Dia 05 e Dia 20 do mês atual + próximo mês
  const opcoes = [];
  for (let i = 0; i <= 1; i++) {
    const m = ((mes - 1 + i) % 12) + 1;
    const a = ano + Math.floor((mes - 1 + i) / 12);
    const mm = String(m).padStart(2,'0');
    opcoes.push(`05/${mm}/${a}`);
    opcoes.push(`20/${mm}/${a}`);
  }
  // Garantir que o sugerido está nas opções
  if (!opcoes.includes(sugerido)) opcoes.unshift(sugerido);

  const sel = document.getElementById('adiant-desconto-em');
  sel.innerHTML = opcoes.map(o =>
    `<option value="${o}" ${o === sugerido ? 'selected' : ''}>Dia ${o}</option>`
  ).join('');
  document.getElementById('adiant-info').style.display = 'block';
});

// ── Botão Excluir ─────────────────────────────────────────────────────────────
document.getElementById('btn-excluir-func').addEventListener('click', async () => {
  const id   = document.getElementById('func-id').value;
  const nome = document.getElementById('func-nome').value;
  if (!confirm(`Excluir ${nome}? O funcionário ficará inativo e não aparecerá mais na lista.`)) return;
  const btn = document.getElementById('btn-excluir-func');
  btn.disabled = true; btn.textContent = 'Excluindo…';
  try {
    await api.excluirFuncionario(id);
    fecharModal();
    await carregarFuncionarios();
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
    btn.disabled = false; btn.textContent = 'Excluir';
  }
});

// ── Botão Salvar (multi-aba) ──────────────────────────────────────────────────
document.getElementById('btn-salvar-func').addEventListener('click', async () => {
  const activeTab = document.getElementById('modal-active-tab').value;
  if (activeTab === 'dados')         return await salvarDados();
  if (activeTab === 'adiantamentos') return await salvarAdiantamento();
  if (activeTab === 'ferias')        return await salvarFerias();
  if (activeTab === 'rescisao')      return await salvarRescisao();
});

async function salvarDados() {
  const nome = document.getElementById('func-nome').value.trim();
  if (!nome) { document.getElementById('func-erro').textContent = 'Nome é obrigatório.'; return; }
  const dados = {
    nome,
    tipo:               document.getElementById('func-tipo').value,
    cargo:              document.getElementById('func-cargo').value.trim() || null,
    cargo_tipo:         document.getElementById('func-cargo-tipo').value,
    status:             document.getElementById('func-status').value,
    salario_oficial:    parseBRL(document.getElementById('func-salario-oficial').value),
    salario_adicional:  parseBRL(document.getElementById('func-salario-adicional').value),
    adiantamento_fixo:  parseBRL(document.getElementById('func-adiantamento').value),
    vale_transporte:    parseBRL(document.getElementById('func-vt').value),
    percentual_inss:    parseBRL(document.getElementById('func-inss').value),
    percentual_comissao: parseFloat(document.getElementById('func-comissao').value) || 0,
    data_admissao:      document.getElementById('func-admissao').value || null,
    comentario_importante: document.getElementById('func-comentario').value.trim() || null,
  };
  const id  = document.getElementById('func-id').value;
  const btn = document.getElementById('btn-salvar-func');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    if (id) await api.atualizarFuncionario(id, dados);
    else    await api.criarFuncionario(dados);
    fecharModal();
    await carregarFuncionarios();
  } catch (err) {
    document.getElementById('func-erro').textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}

async function salvarAdiantamento() {
  const funcionario_id = document.getElementById('func-id').value;
  const data           = document.getElementById('adiant-data').value;
  const valor          = parseBRL(document.getElementById('adiant-valor').value);
  const observacoes    = document.getElementById('adiant-obs').value;
  const desconto_em    = document.getElementById('adiant-desconto-em').value;
  if (!data || !valor) { document.getElementById('adiant-erro').textContent = 'Preencha data e valor.'; return; }
  if (!desconto_em)    { document.getElementById('adiant-erro').textContent = 'Selecione a folha de desconto.'; return; }
  const btn = document.getElementById('btn-salvar-func');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    await api.registrarAdiantamento({ funcionario_id, valor, data, observacoes, desconto_em });
    document.getElementById('adiant-data').value  = '';
    document.getElementById('adiant-valor').value = '';
    document.getElementById('adiant-obs').value   = '';
    document.getElementById('adiant-info').style.display = 'none';
    document.getElementById('adiant-erro').textContent   = '';
    await carregarAdiantamentosTab();
  } catch (err) {
    document.getElementById('adiant-erro').textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Registrar';
  }
}

async function salvarFerias() {
  const funcionario_id = document.getElementById('func-id').value;
  const data_inicio    = document.getElementById('ferias-inicio').value;
  const data_fim       = document.getElementById('ferias-fim').value;
  const valor          = parseBRL(document.getElementById('ferias-valor').value);
  const observacoes    = document.getElementById('ferias-obs').value;
  if (!data_inicio || !data_fim || !valor) {
    document.getElementById('ferias-erro').textContent = 'Preencha datas e valor.'; return;
  }
  const btn = document.getElementById('btn-salvar-func');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    await api.registrarFerias({ funcionario_id, data_inicio, data_fim, valor, observacoes });
    fecharModal();
    await carregarFuncionarios();
  } catch (err) {
    document.getElementById('ferias-erro').textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Registrar Férias';
  }
}

async function salvarRescisao() {
  const funcionario_id        = document.getElementById('func-id').value;
  const data_rescisao         = document.getElementById('rescisao-data').value;
  const valor_saldo           = parseBRL(document.getElementById('rescisao-saldo').value);
  const valor_ferias_prop     = parseBRL(document.getElementById('rescisao-ferias-prop').value);
  const valor_decimo_terceiro = parseBRL(document.getElementById('rescisao-decimo').value);
  const valor_fgts            = parseBRL(document.getElementById('rescisao-fgts').value);
  const outros_valores        = parseBRL(document.getElementById('rescisao-outros').value);
  const observacoes           = document.getElementById('rescisao-obs').value;
  const nome                  = document.getElementById('func-nome').value;
  if (!data_rescisao) { document.getElementById('rescisao-erro').textContent = 'Informe a data da rescisão.'; return; }
  if (!confirm(`Confirmar rescisão de ${nome}? Isso marcará o funcionário como inativo.`)) return;
  const btn = document.getElementById('btn-salvar-func');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    await api.registrarRescisao({ funcionario_id, data_rescisao, valor_saldo, valor_ferias_prop, valor_decimo_terceiro, valor_fgts, outros_valores, observacoes });
    fecharModal();
    await carregarFuncionarios();
  } catch (err) {
    document.getElementById('rescisao-erro').textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Confirmar Rescisão';
  }
}

// ── Rescisão: recalcular total ────────────────────────────────────────────────
document.querySelectorAll('.rescisao-input').forEach(input => {
  input.addEventListener('input', () => {
    formatarInput(input);
    const total = ['rescisao-saldo','rescisao-ferias-prop','rescisao-decimo','rescisao-fgts','rescisao-outros']
      .reduce((acc, id) => acc + parseBRL(document.getElementById(id).value), 0);
    document.getElementById('rescisao-total').textContent = fmtValor(total);
  });
  input.addEventListener('focus', () => input.select());
});

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
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--muted)">Nenhum funcionário encontrado</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(f => {
    const total = Number(f.salario_oficial) + Number(f.salario_adicional);
    return `<tr>
      <td><strong>${f.nome}</strong>${f.comentario_importante ? `<span title="${f.comentario_importante.replace(/"/g,'&quot;')}" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#F59E0B;color:#fff;font-size:10px;font-weight:700;cursor:help;margin-left:7px;vertical-align:middle;flex-shrink:0">!</span>` : ''}</td>
      <td><span class="badge-${f.tipo}">${f.tipo === 'clt' ? 'CLT' : 'Informal'}</span></td>
      <td>${BADGE_CARGO[f.cargo_tipo] || BADGE_CARGO.outro}${f.cargo ? `<span style="font-size:12px;color:var(--muted);margin-left:6px">${f.cargo}</span>` : ''}</td>
      <td>${BADGE_STATUS[f.status] || BADGE_STATUS.ativo}</td>
      <td class="mono" style="text-align:right">${Number(f.vale_transporte) > 0 ? fmtValor(f.vale_transporte) : '<span style="color:var(--muted)">—</span>'}</td>
      <td class="mono" style="text-align:right">${fmtValor(f.salario_oficial)}</td>
      <td class="mono" style="text-align:right">${fmtValor(f.salario_adicional)}</td>
      <td class="mono" style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(total)}</td>
      <td style="text-align:right">
        <button class="action-btn" onclick="editarFuncionario(${f.id})">Editar</button>
      </td>
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

window.editarFuncionario = id => {
  const f = _funcionarios.find(x => x.id === id);
  if (f) abrirModal(f);
};

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
