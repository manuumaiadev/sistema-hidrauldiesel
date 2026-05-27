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
  ['dados', 'adiantamentos', 'ferias', 'decimo', 'rescisao', 'resumo'].forEach(t => {
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
  if (tab === 'decimo')        { btnSalvar.textContent = 'Registrar Pagamento'; btnSalvar.style.background = ''; }
  if (tab === 'rescisao')      { btnSalvar.textContent = 'Confirmar Rescisão';  btnSalvar.style.background = '#DC2626'; }
  if (tab === 'resumo')        { btnSalvar.style.display = 'none'; }
  if (tab !== 'resumo')        { btnSalvar.style.display = ''; }

  if (tab === 'adiantamentos') carregarAdiantamentosTab();
  if (tab === 'decimo')        carregarDecimoTab();
  if (tab === 'resumo')        carregarResumo();
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
  setValor('func-va',                funcionario?.vale_alimentacao  || 0);
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
  document.getElementById('adiant-parcelas-wrap').style.display = 'none';
  document.getElementById('adiant-erro').textContent = '';
  selecionarNParcelas(1);
  document.getElementById('adiant-historico-lista').innerHTML =
    '<div style="color:var(--muted);font-size:13px;padding:8px 0">Carregando…</div>';

  // Limpar férias
  document.getElementById('ferias-inicio').value = '';
  document.getElementById('ferias-fim').value    = '';
  document.getElementById('ferias-valor').value  = '';
  document.getElementById('ferias-obs').value    = '';
  document.getElementById('ferias-erro').textContent = '';

  // Limpar resumo
  document.getElementById('resumo-lista').innerHTML =
    '<div style="color:var(--muted);font-size:13px;padding:8px 0">Carregando…</div>';
  document.getElementById('resumo-total-geral').textContent = '—';
  document.getElementById('resumo-custom-wrap').style.display = 'none';
  // Resetar botão ativo para "Semana"
  document.querySelectorAll('.resumo-periodo-btn').forEach(b => {
    const isAtivo = b.dataset.p === 'semana';
    b.style.background = isAtivo ? '#1B2D5B' : '#fff';
    b.style.color = isAtivo ? '#fff' : 'var(--muted)';
    b.classList.toggle('resumo-periodo-ativo', isAtivo);
  });

  // Limpar décimo
  document.getElementById('decimo-data').value  = '';
  document.getElementById('decimo-valor').value = '';
  document.getElementById('decimo-obs').value   = '';
  document.getElementById('decimo-erro').textContent = '';
  document.getElementById('decimo-historico-lista').innerHTML =
    '<div style="color:var(--muted);font-size:13px;padding:8px 0">Carregando…</div>';
  // Popular select de anos (atual e 2 anteriores)
  const anoAtual = new Date().getFullYear();
  const selAno = document.getElementById('decimo-ano-filtro');
  selAno.innerHTML = [anoAtual, anoAtual - 1, anoAtual - 2]
    .map(a => `<option value="${a}">${a}</option>`).join('');

  // Limpar rescisão
  document.getElementById('rescisao-data').value = '';
  document.getElementById('rescisao-obs').value  = '';
  document.getElementById('rescisao-erro').textContent = '';
  ['rescisao-saldo','rescisao-ferias-prop','rescisao-decimo','rescisao-fgts','rescisao-outros'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('rescisao-total').textContent = 'R$ 0,00';
  document.getElementById('rescisao-baixa-completa').checked = true;
  document.getElementById('rescisao-parcial-wrap').style.display = 'none';
  document.getElementById('rescisao-valor-pago').value = '';
  document.getElementById('rescisao-data-pagamento').value = '';
  document.getElementById('rescisao-saldo-restante').textContent = '—';
  document.getElementById('rescisao-inativo').checked = true;
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
    const thStyle = 'text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase';
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px" id="adiant-tabela">
        <thead>
          <tr style="background:#F8F7F4">
            <th style="${thStyle}">Data</th>
            <th style="${thStyle};text-align:right">Valor</th>
            <th style="${thStyle}">Desconto em</th>
            <th style="${thStyle}">Status</th>
            <th style="${thStyle}">Obs.</th>
            <th style="${thStyle}"></th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(a => {
            const dataFmt = new Date(a.data.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR');
            const badge = a.descontado
              ? '<span style="background:#DCFCE7;color:#15803D;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">Descontado</span>'
              : '<span style="background:#FEF9C3;color:#92400E;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">Pendente</span>';
            const editBtn = !a.descontado
              ? `<button onclick="iniciarEdicaoAdiant(${a.id})" title="Editar" style="background:none;border:none;padding:4px 6px;cursor:pointer;color:#6B7280;border-radius:6px;line-height:1" onmouseover="this.style.color='#2563EB'" onmouseout="this.style.color='#6B7280'">` +
                  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>` +
                `</button>` +
                `<button onclick="confirmarExclusaoAdiant(${a.id})" title="Excluir" style="background:none;border:none;padding:4px 6px;cursor:pointer;color:#9CA3AF;border-radius:6px;line-height:1" onmouseover="this.style.color='#DC2626'" onmouseout="this.style.color='#9CA3AF'">` +
                  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` +
                `</button>`
              : '';
            return `<tr id="adiant-row-${a.id}" data-id="${a.id}" data-data="${a.data.slice(0,10)}" data-valor="${a.valor}" data-desconto="${a.desconto_em || ''}" data-obs="${(a.observacoes || '').replace(/"/g,'&quot;')}" style="border-top:1px solid #E3E1DA">
              <td style="padding:8px 10px">${dataFmt}</td>
              <td style="padding:8px 10px;text-align:right;font-family:var(--mono)">${fmtValor(a.valor)}</td>
              <td style="padding:8px 10px;color:var(--muted)">${a.desconto_em || '—'}</td>
              <td style="padding:8px 10px">${badge}</td>
              <td style="padding:8px 10px;color:var(--muted)">${a.observacoes || '—'}</td>
              <td style="padding:8px 10px">${editBtn}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (_) {
    el.innerHTML = '<div style="color:#DC2626;font-size:13px">Erro ao carregar histórico.</div>';
  }
}

// ── Edição inline de adiantamento pendente ────────────────────────────────────
function iniciarEdicaoAdiant(id) {
  const row = document.getElementById(`adiant-row-${id}`);
  if (!row) return;
  const dataVal    = row.dataset.data;
  const valorVal   = row.dataset.valor;
  const descontoVal= row.dataset.desconto;
  const obsVal     = row.dataset.obs;

  const inputStyle = 'border:1px solid #D1D5DB;border-radius:6px;padding:4px 6px;font-size:12px;width:100%;box-sizing:border-box';
  row.innerHTML = `
    <td style="padding:6px 8px"><input type="date" id="edit-adiant-data-${id}" value="${dataVal}" style="${inputStyle}"></td>
    <td style="padding:6px 8px"><input type="number" id="edit-adiant-valor-${id}" value="${valorVal}" step="0.01" style="${inputStyle};text-align:right"></td>
    <td style="padding:6px 8px"><input type="text" id="edit-adiant-desconto-${id}" value="${descontoVal}" placeholder="ex: 05/06/2026" style="${inputStyle}"></td>
    <td style="padding:6px 8px"><span style="background:#FEF9C3;color:#92400E;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">Pendente</span></td>
    <td style="padding:6px 8px"><input type="text" id="edit-adiant-obs-${id}" value="${obsVal}" style="${inputStyle}"></td>
    <td style="padding:6px 8px;white-space:nowrap">
      <button onclick="salvarEdicaoAdiant(${id})" style="background:#2563EB;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;margin-right:4px">Salvar</button>
      <button onclick="carregarAdiantamentosTab()" style="background:none;border:1px solid #D1D5DB;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer">Cancelar</button>
    </td>`;
}

async function salvarEdicaoAdiant(id) {
  const data       = document.getElementById(`edit-adiant-data-${id}`)?.value;
  const valor      = parseFloat(document.getElementById(`edit-adiant-valor-${id}`)?.value);
  const desconto_em= document.getElementById(`edit-adiant-desconto-${id}`)?.value;
  const observacoes= document.getElementById(`edit-adiant-obs-${id}`)?.value;

  if (!data || isNaN(valor) || valor <= 0) { alert('Preencha data e valor corretamente.'); return; }
  try {
    await api.editarAdiantamento(id, { data, valor, desconto_em, observacoes });
    await carregarAdiantamentosTab();
  } catch (err) {
    alert(err.message);
  }
}

// ── Exclusão de adiantamento pendente ────────────────────────────────────────
window.confirmarExclusaoAdiant = async function(id) {
  if (!confirm('Excluir este adiantamento? Essa ação não pode ser desfeita.')) return;
  try {
    await api.excluirAdiantamento(id);
    await carregarAdiantamentosTab();
  } catch (err) {
    alert(err.message || 'Erro ao excluir adiantamento.');
  }
};

// ── Parcelamento de adiantamentos ────────────────────────────────────────────

let _adiantNParcelas = 1;

function proximasQuinzenas(dataStr, qtd) {
  if (!dataStr) return [];
  const [anoStr, mesStr, diaStr] = dataStr.split('-');
  const dia = parseInt(diaStr, 10), mes = parseInt(mesStr, 10), ano = parseInt(anoStr, 10);
  let cur;
  if (dia <= 5)       cur = { d: 5,  m: mes,                      a: ano };
  else if (dia <= 20) cur = { d: 20, m: mes,                      a: ano };
  else                cur = { d: 5,  m: mes===12?1:mes+1,         a: mes===12?ano+1:ano };

  const result = [];
  while (result.length < qtd + 4) {
    result.push(`${String(cur.d).padStart(2,'0')}/${String(cur.m).padStart(2,'0')}/${cur.a}`);
    if (cur.d === 5) {
      cur = { d: 20, m: cur.m, a: cur.a };
    } else {
      const nm = cur.m === 12 ? 1 : cur.m + 1;
      const na = cur.m === 12 ? cur.a + 1 : cur.a;
      cur = { d: 5, m: nm, a: na };
    }
  }
  return result;
}

function buildParcelasRows() {
  const data       = document.getElementById('adiant-data').value;
  const valorTotal = parseBRL(document.getElementById('adiant-valor').value);
  const n          = _adiantNParcelas;
  const wrap       = document.getElementById('adiant-parcelas-wrap');
  const lista      = document.getElementById('adiant-parcelas-lista');

  if (!data || !valorTotal) { wrap.style.display = 'none'; return; }

  const quinzenas = proximasQuinzenas(data, n + 3);
  const valorParcela = valorTotal / n;
  const selStyle = 'font-family:inherit;font-size:13px;padding:6px 10px;border:1px solid var(--border);border-radius:7px;background:#fff;flex:1;min-width:140px';

  lista.innerHTML = Array.from({ length: n }, (_, i) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:13px;color:var(--muted);min-width:${n>1?'74px':'0'}">
        ${n > 1 ? `Parcela ${i+1}/${n}` : ''}
      </span>
      <span style="font-size:13px;font-family:var(--mono);min-width:80px;text-align:right">${fmtValor(valorParcela)}</span>
      <select id="adiant-parcela-sel-${i}" style="${selStyle}">
        ${quinzenas.map((q, qi) => `<option value="${q}" ${qi===i?'selected':''}>${q}</option>`).join('')}
      </select>
    </div>`).join('');

  wrap.style.display = 'block';
}

window.selecionarNParcelas = function(n) {
  _adiantNParcelas = n;
  document.querySelectorAll('.adiant-num-btn').forEach(b => {
    const active = parseInt(b.dataset.n) === n;
    b.style.background = active ? '#1B2D5B' : '#fff';
    b.style.color       = active ? '#fff'    : 'var(--muted)';
    b.style.borderColor = active ? '#1B2D5B' : '#E3E1DA';
  });
  buildParcelasRows();
};

document.getElementById('adiant-data').addEventListener('change',  buildParcelasRows);
document.getElementById('adiant-valor').addEventListener('input',   buildParcelasRows);

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
  if (activeTab === 'decimo')        return await salvarDecimo();
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
    vale_alimentacao:   parseBRL(document.getElementById('func-va').value),
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
  const valorTotal     = parseBRL(document.getElementById('adiant-valor').value);
  const observacoes    = document.getElementById('adiant-obs').value.trim();
  const n              = _adiantNParcelas;
  const erroEl         = document.getElementById('adiant-erro');

  if (!data || !valorTotal) { erroEl.textContent = 'Preencha data e valor.'; return; }

  const parcelas = [];
  for (let i = 0; i < n; i++) {
    const sel = document.getElementById(`adiant-parcela-sel-${i}`);
    if (!sel || !sel.value) { erroEl.textContent = 'Selecione a quinzena de desconto para todas as parcelas.'; return; }
    parcelas.push(sel.value);
  }
  erroEl.textContent = '';

  const valorParcela = valorTotal / n;
  const btn = document.getElementById('btn-salvar-func');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    for (let i = 0; i < n; i++) {
      const obsParc = n > 1
        ? (observacoes ? `${observacoes} — Parcela ${i+1}/${n}` : `Parcela ${i+1}/${n}`)
        : observacoes;
      await api.registrarAdiantamento({ funcionario_id, valor: valorParcela, data, observacoes: obsParc, desconto_em: parcelas[i] });
    }
    document.getElementById('adiant-data').value  = '';
    document.getElementById('adiant-valor').value = '';
    document.getElementById('adiant-obs').value   = '';
    document.getElementById('adiant-parcelas-wrap').style.display = 'none';
    selecionarNParcelas(1);
    await carregarAdiantamentosTab();
  } catch (err) {
    erroEl.textContent = err.message;
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

// ── Décimo Terceiro ───────────────────────────────────────────────────────────
async function carregarDecimoTab() {
  const id  = document.getElementById('func-id').value;
  const ano = document.getElementById('decimo-ano-filtro').value;
  if (!id) return;

  // Calcula total do 13º baseado no salário atual do funcionário
  const func = _funcionarios.find(f => String(f.id) === String(id));
  const salario = (parseFloat(func?.salario_oficial) || 0) + (parseFloat(func?.salario_adicional) || 0);

  // Meses proporcionais: da admissão até dez do ano, ou o ano inteiro
  let meses = 12;
  if (func?.data_admissao) {
    const admissao = new Date(func.data_admissao.slice(0, 10) + 'T12:00:00');
    if (admissao.getFullYear() === parseInt(ano)) {
      meses = 12 - admissao.getMonth(); // mês da admissão até dez
    }
  }
  const totalCalc = (salario / 12) * meses;
  document.getElementById('decimo-total-calc').textContent = fmtValor(totalCalc);

  const el = document.getElementById('decimo-historico-lista');
  try {
    const lista = await api.listarDecimos(id, ano);
    const totalPago = lista.reduce((a, d) => a + parseFloat(d.valor), 0);
    document.getElementById('decimo-total-pago').textContent = fmtValor(totalPago);
    document.getElementById('decimo-saldo').textContent = fmtValor(Math.max(0, totalCalc - totalPago));

    if (!lista.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum pagamento registrado.</div>';
      return;
    }
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F8F7F4">
            <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Data</th>
            <th style="text-align:right;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Valor pago</th>
            <th style="padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Obs.</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(d => {
            const data = new Date(d.data_pagamento.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR');
            return `<tr style="border-top:1px solid #E3E1DA">
              <td style="padding:8px 10px">${data}</td>
              <td style="padding:8px 10px;text-align:right;font-family:var(--mono);color:#15803D;font-weight:600">${fmtValor(d.valor)}</td>
              <td style="padding:8px 10px;color:var(--muted)">${d.observacoes || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (_) {
    el.innerHTML = '<div style="color:#DC2626;font-size:13px">Erro ao carregar histórico.</div>';
  }
}

async function salvarDecimo() {
  const funcionario_id = document.getElementById('func-id').value;
  const data_pagamento = document.getElementById('decimo-data').value;
  const valor          = parseBRL(document.getElementById('decimo-valor').value);
  const observacoes    = document.getElementById('decimo-obs').value;
  const ano            = parseInt(document.getElementById('decimo-ano-filtro').value);
  const erroEl         = document.getElementById('decimo-erro');

  if (!data_pagamento) { erroEl.textContent = 'Informe a data do pagamento.'; return; }
  if (!valor)          { erroEl.textContent = 'Informe o valor pago.'; return; }
  erroEl.textContent = '';

  const btn = document.getElementById('btn-salvar-func');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    await api.registrarDecimo({ funcionario_id, ano, data_pagamento, valor, observacoes });
    document.getElementById('decimo-data').value  = '';
    document.getElementById('decimo-valor').value = '';
    document.getElementById('decimo-obs').value   = '';
    await carregarDecimoTab();
  } catch (err) {
    erroEl.textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Registrar Pagamento';
  }
}

// Recarregar ao trocar ano
document.getElementById('decimo-ano-filtro').addEventListener('change', () => {
  const id = document.getElementById('func-id').value;
  if (id && document.getElementById('modal-active-tab').value === 'decimo') carregarDecimoTab();
});

// Formatar input de valor
document.getElementById('decimo-valor').addEventListener('input', function() { formatarInput(this); });
document.getElementById('decimo-valor').addEventListener('focus', function() { this.select(); });

async function salvarRescisao() {
  const funcionario_id        = document.getElementById('func-id').value;
  const data_rescisao         = document.getElementById('rescisao-data').value;
  const valor_saldo           = parseBRL(document.getElementById('rescisao-saldo').value);
  const valor_ferias_prop     = parseBRL(document.getElementById('rescisao-ferias-prop').value);
  const valor_decimo_terceiro = parseBRL(document.getElementById('rescisao-decimo').value);
  const valor_fgts            = parseBRL(document.getElementById('rescisao-fgts').value);
  const outros_valores        = parseBRL(document.getElementById('rescisao-outros').value);
  const observacoes           = document.getElementById('rescisao-obs').value;
  const marcar_inativo        = document.getElementById('rescisao-inativo').checked;
  const nome                  = document.getElementById('func-nome').value;
  const isParcial             = document.getElementById('rescisao-parcial').checked;
  const valor_pago_agora      = isParcial ? parseBRL(document.getElementById('rescisao-valor-pago').value) : null;
  const data_pagamento_parcial = isParcial ? document.getElementById('rescisao-data-pagamento').value : null;

  const erroEl = document.getElementById('rescisao-erro');
  if (!data_rescisao) { erroEl.textContent = 'Informe a data da rescisão.'; return; }
  if (isParcial && !data_pagamento_parcial) { erroEl.textContent = 'Informe a data deste pagamento.'; return; }
  if (isParcial && !valor_pago_agora) { erroEl.textContent = 'Informe o valor pago neste pagamento.'; return; }
  erroEl.textContent = '';

  const totalStr  = document.getElementById('rescisao-total').textContent;
  const saldoStr  = document.getElementById('rescisao-saldo-restante').textContent;
  const modoStr   = isParcial
    ? `Pagamento parcial de ${fmtValor(valor_pago_agora)} (saldo restante: ${saldoStr})`
    : `Baixa completa — ${totalStr}`;
  const msg = `Confirmar rescisão de ${nome}?\n${modoStr}${marcar_inativo ? '\n\nO funcionário será marcado como inativo.' : ''}`;
  if (!confirm(msg)) return;

  const btn = document.getElementById('btn-salvar-func');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    await api.registrarRescisao({
      funcionario_id, data_rescisao, valor_saldo, valor_ferias_prop,
      valor_decimo_terceiro, valor_fgts, outros_valores, observacoes,
      pagamento_parcial: isParcial, valor_pago_agora, data_pagamento_parcial, marcar_inativo
    });
    fecharModal();
    await carregarFuncionarios();
  } catch (err) {
    erroEl.textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Confirmar Rescisão';
  }
}

// ── Rescisão: recalcular total e por-parcela ──────────────────────────────────
function atualizarTotalRescisao() {
  const total = ['rescisao-saldo','rescisao-ferias-prop','rescisao-decimo','rescisao-fgts','rescisao-outros']
    .reduce((acc, id) => acc + parseBRL(document.getElementById(id).value), 0);
  document.getElementById('rescisao-total').textContent = fmtValor(total);
  // Atualiza saldo restante se modo parcial
  const isParcial = document.getElementById('rescisao-parcial').checked;
  if (isParcial) {
    const pago = parseBRL(document.getElementById('rescisao-valor-pago').value);
    document.getElementById('rescisao-saldo-restante').textContent = fmtValor(Math.max(0, total - pago));
  }
}

document.querySelectorAll('.rescisao-input').forEach(input => {
  input.addEventListener('input', () => { formatarInput(input); atualizarTotalRescisao(); });
  input.addEventListener('focus', () => input.select());
});

// Toggle tipo de pagamento
document.querySelectorAll('input[name="rescisao-tipo-pgto"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isParcial = document.getElementById('rescisao-parcial').checked;
    document.getElementById('rescisao-parcial-wrap').style.display = isParcial ? 'flex' : 'none';
    if (!isParcial) document.getElementById('rescisao-saldo-restante').textContent = '—';
    document.getElementById('btn-salvar-func').textContent = isParcial ? 'Confirmar Pagamento' : 'Confirmar Rescisão';
    atualizarTotalRescisao();
  });
});

document.getElementById('rescisao-valor-pago').addEventListener('input', function() {
  formatarInput(this);
  atualizarTotalRescisao();
});
document.getElementById('rescisao-valor-pago').addEventListener('focus', function() { this.select(); });

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
      <td><strong>${f.nome}</strong>${f.comentario_importante ? `<span class="badge-comentario">!<span class="tooltip-box">${f.comentario_importante.replace(/</g,'&lt;')}</span></span>` : ''}</td>
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

// ── Resumo de pagamentos ───────────────────────────────────────────────────────

const RESUMO_COR = {
  'Folha de Pagamento': '#1B2D5B',
  'Vale Transporte':    '#0369A1',
  'Adiantamento':       '#92400E',
  '13º Salário':        '#6D28D9',
  'Férias':             '#0F766E',
  'Rescisão':           '#DC2626',
};

const RESUMO_BADGE = {
  'Folha de Pagamento': '#EFF6FF',
  'Vale Transporte':    '#E0F2FE',
  'Adiantamento':       '#FEF3C7',
  '13º Salário':        '#EDE9FE',
  'Férias':             '#CCFBF1',
  'Rescisão':           '#FEE2E2',
};

function periodoParaDatas(p) {
  const hoje = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (p === 'semana') {
    const dow = hoje.getDay() || 7;
    const seg = new Date(hoje); seg.setDate(hoje.getDate() - dow + 1);
    const dom = new Date(seg);  dom.setDate(seg.getDate() + 6);
    return { de: fmt(seg), ate: fmt(dom) };
  }
  if (p === 'mes') {
    return {
      de:  `${hoje.getFullYear()}-${pad(hoje.getMonth()+1)}-01`,
      ate: fmt(new Date(hoje.getFullYear(), hoje.getMonth()+1, 0))
    };
  }
  if (p === 'mes_anterior') {
    const m = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return {
      de:  `${m.getFullYear()}-${pad(m.getMonth()+1)}-01`,
      ate: fmt(m)
    };
  }
  if (p === 'ano') {
    return { de: `${hoje.getFullYear()}-01-01`, ate: `${hoje.getFullYear()}-12-31` };
  }
  return null;
}

window.selecionarPeriodoResumo = function(btn) {
  document.querySelectorAll('.resumo-periodo-btn').forEach(b => {
    b.style.background = '#fff';
    b.style.color = 'var(--muted)';
    b.classList.remove('resumo-periodo-ativo');
  });
  btn.style.background = '#1B2D5B';
  btn.style.color = '#fff';
  btn.classList.add('resumo-periodo-ativo');
  const isCustom = btn.dataset.p === 'custom';
  document.getElementById('resumo-custom-wrap').style.display = isCustom ? 'flex' : 'none';
  if (!isCustom) carregarResumo();
};

window.carregarResumo = async function() {
  const id = document.getElementById('func-id').value;
  if (!id) return;

  const periodoAtivo = document.querySelector('.resumo-periodo-ativo')?.dataset.p || 'semana';
  let de, ate;
  if (periodoAtivo === 'custom') {
    de = document.getElementById('resumo-de').value;
    ate = document.getElementById('resumo-ate').value;
    if (!de || !ate) return;
  } else if (periodoAtivo === 'tudo') {
    de = null; ate = null;
  } else {
    const datas = periodoParaDatas(periodoAtivo);
    de = datas.de; ate = datas.ate;
  }

  const el = document.getElementById('resumo-lista');
  el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">Carregando…</div>';
  document.getElementById('resumo-total-geral').textContent = '—';

  try {
    const { lancamentos, totais, total_geral } = await api.resumoPagamentos(id, de, ate);
    document.getElementById('resumo-total-geral').textContent = fmtValor(total_geral);

    if (!lancamentos.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum pagamento encontrado neste período.</div>';
      return;
    }

    // Cards por categoria
    const cats = Object.entries(totais).sort((a, b) => b[1] - a[1]);
    const cardsHTML = cats.map(([cat, val]) => `
      <div style="background:${RESUMO_BADGE[cat]||'#F8F7F4'};border-radius:8px;padding:8px 12px;min-width:110px">
        <div style="font-size:11px;font-weight:600;color:${RESUMO_COR[cat]||'#888'};margin-bottom:2px;white-space:nowrap">${cat}</div>
        <div style="font-size:14px;font-weight:700;font-family:var(--mono);color:${RESUMO_COR[cat]||'#333'}">${fmtValor(val)}</div>
      </div>`).join('');

    // Tabela
    const linhasHTML = lancamentos.map(l => {
      const data = new Date(String(l.data).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR');
      const cor  = RESUMO_COR[l.categoria] || '#333';
      const bg   = RESUMO_BADGE[l.categoria] || '#F8F7F4';
      const sub  = l.subtipo ? ` <span style="font-size:10px;color:#888;text-transform:uppercase">(${l.subtipo})</span>` : '';
      return `<tr style="border-top:1px solid #E3E1DA">
        <td style="padding:8px 10px;white-space:nowrap">${data}</td>
        <td style="padding:8px 10px">
          <span style="background:${bg};color:${cor};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;white-space:nowrap">${l.categoria}</span>${sub}
        </td>
        <td style="padding:8px 10px;text-align:right;font-family:var(--mono);font-weight:600;color:${cor}">${fmtValor(l.valor)}</td>
        <td style="padding:8px 10px;color:var(--muted);font-size:12px">${l.observacoes||'—'}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${cardsHTML}</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#F8F7F4">
          <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Data</th>
          <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Tipo</th>
          <th style="text-align:right;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Valor</th>
          <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Obs.</th>
        </tr></thead>
        <tbody>${linhasHTML}</tbody>
      </table>`;
  } catch (_) {
    el.innerHTML = '<div style="color:#DC2626;font-size:13px">Erro ao carregar histórico.</div>';
  }
};

carregarFuncionarios();
