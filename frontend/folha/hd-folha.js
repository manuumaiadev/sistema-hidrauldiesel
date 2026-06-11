const fmtValor = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function confirmar(msg) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modal-confirmar');
    document.getElementById('modal-confirmar-msg').textContent = msg;
    overlay.style.display = 'flex';
    const sim = document.getElementById('modal-confirmar-sim');
    const nao = document.getElementById('modal-confirmar-nao');
    function fechar(val) {
      overlay.style.display = 'none';
      sim.removeEventListener('click', onSim);
      nao.removeEventListener('click', onNao);
      resolve(val);
    }
    function onSim() { fechar(true); }
    function onNao() { fechar(false); }
    sim.addEventListener('click', onSim);
    nao.addEventListener('click', onNao);
  });
}

let _toastTimer;
function mostrarErro(msg) {
  const el = document.getElementById('toast-erro');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, 4000);
}
const parseBRL = s => Number((s || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
const fmtNum   = v => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function sliceDate(d) { return (d || '').slice(0, 10); }

function tituloFolha(dp) {
  const [ano, mes, dia] = sliceDate(dp).split('-').map(Number);
  return `Folha de pagamento do dia ${dia} de ${MESES[mes - 1]} de ${ano}`;
}

// ── Seletor de mês ────────────────────────────────────────────────────────────
const inputMes = document.getElementById('input-mes');
const hoje = new Date();
inputMes.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

// ── Gerar Folha Dia 05 ────────────────────────────────────────────────────────
document.getElementById('btn-dia05').addEventListener('click', async () => {
  const [ano, mes] = inputMes.value.split('-').map(Number);
  const btn = document.getElementById('btn-dia05');
  btn.disabled = true; btn.textContent = 'Gerando…';
  try {
    await api.gerarFolhaDia05({ mes, ano });
    await carregarHistorico();
  } catch (err) {
    mostrarErro(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Gerar Folha Dia 05';
  }
});

// ── Gerar Folha Dia 20 ────────────────────────────────────────────────────────
document.getElementById('btn-dia20').addEventListener('click', async () => {
  const [ano, mes] = inputMes.value.split('-').map(Number);
  const btn = document.getElementById('btn-dia20');
  btn.disabled = true; btn.textContent = 'Gerando…';
  try {
    await api.gerarFolhaDia20({ mes, ano });
    await carregarHistorico();
  } catch (err) {
    mostrarErro(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Gerar Folha Dia 20';
  }
});


// ── Construir HTML da tabela ──────────────────────────────────────────────────
function buildFolhaHTML({ data_pagamento, funcionarios, totais }) {
  const isQuinzena = funcionarios.length > 0 && funcionarios[0].tipo === 'quinzena';
  const dp = sliceDate(data_pagamento);

  // Cabeçalho com duas linhas: grupos + colunas individuais
  const theadGroups = isQuinzena ? `
    <th class="th-nome" rowspan="2">Funcionário</th>
    <th class="th-group th-group-provento" colspan="3">Proventos</th>
    <th class="th-group th-group-desconto" colspan="2">Descontos</th>
    <th class="th-group th-group-resultado" colspan="1">Resultado</th>
    <th rowspan="2"></th>
  ` : `
    <th class="th-nome" rowspan="2">Funcionário</th>
    <th class="th-group th-group-provento" colspan="3">Proventos</th>
    <th class="th-group th-group-desconto" colspan="4">Descontos</th>
    <th class="th-group th-group-resultado" colspan="1">Resultado</th>
    <th rowspan="2"></th>
  `;

  const theadCols = isQuinzena ? `
    <th class="th-provento">Prop. Oficial</th>
    <th class="th-provento">Prop. Adicional</th>
    <th class="th-provento">Outros acrés.</th>
    <th class="th-desconto">Adiantamentos</th>
    <th class="th-desconto">Outros desc.</th>
    <th class="th-resultado">Valor pago</th>
  ` : `
    <th class="th-provento">Prop. Oficial</th>
    <th class="th-provento">Prop. Adicional</th>
    <th class="th-provento">Outros acrés.</th>
    <th class="th-desconto">INSS</th>
    <th class="th-desconto">Faltas</th>
    <th class="th-desconto">Adiantamentos</th>
    <th class="th-desconto">Outros desc.</th>
    <th class="th-resultado">Valor pago</th>
  `;

  const comentarioBadge = f => f.comentario_importante
    ? `<span class="badge-comentario">!<span class="tooltip-box">${(f.comentario_importante||'').replace(/</g,'&lt;')}</span></span>`
    : '';

  const nomeCell = f => `<td class="cel-nome cel-nome-link" onclick="abrirModalFuncionario(${f.funcionario_id})" title="Abrir cadastro de ${f.funcionario_nome}">${f.funcionario_nome}${comentarioBadge(f)}</td>`;

  const btnRemover = id => `<td class="cel-acoes">
    <button onclick="removerFuncFolha(${id},'${dp}')"
      style="font-family:inherit;font-size:11px;padding:3px 8px;border-radius:5px;border:1px solid #FCA5A5;background:#FEE2E2;color:#B91C1C;cursor:pointer">✕</button>
  </td>`;

  const tbody = funcionarios.map(f => {
    const id = f.id;
    if (isQuinzena) {
      return `<tr data-id="${id}">
        ${nomeCell(f)}
        <td class="cel-provento cel-edit"><input type="text" data-campo="salario_oficial"       value="${fmtNum(f.salario_oficial)}"/></td>
        <td class="cel-provento cel-edit"><input type="text" data-campo="salario_adicional"     value="${fmtNum(f.salario_adicional)}"/></td>
        <td class="cel-provento cel-edit"><input type="text" data-campo="outros_acrescimos"     value="${fmtNum(f.outros_acrescimos)}"/></td>
        <td class="cel-desconto cel-edit"><input type="text" data-campo="desconto_adiantamento" value="${fmtNum(f.desconto_adiantamento)}"/></td>
        <td class="cel-desconto cel-edit"><input type="text" data-campo="outros_descontos"      value="${fmtNum(f.outros_descontos)}"/></td>
        <td class="cel-resultado cel-pago" data-pago>${fmtValor(f.valor_pago)}</td>
        ${btnRemover(id)}
      </tr>`;
    } else {
      return `<tr data-id="${id}">
        ${nomeCell(f)}
        <td class="cel-provento cel-edit"><input type="text" data-campo="salario_oficial"       value="${fmtNum(f.salario_oficial)}"/></td>
        <td class="cel-provento cel-edit"><input type="text" data-campo="salario_adicional"     value="${fmtNum(f.salario_adicional)}"/></td>
        <td class="cel-provento cel-edit"><input type="text" data-campo="outros_acrescimos"     value="${fmtNum(f.outros_acrescimos)}"/></td>
        <td class="cel-desconto cel-edit"><input type="text" data-campo="desconto_inss"         value="${fmtNum(f.desconto_inss)}"/></td>
        <td class="cel-desconto cel-edit"><input type="text" data-campo="desconto_faltas"       value="${fmtNum(f.desconto_faltas)}"/></td>
        <td class="cel-desconto cel-edit"><input type="text" data-campo="desconto_adiantamento" value="${fmtNum(f.desconto_adiantamento)}"/></td>
        <td class="cel-desconto cel-edit"><input type="text" data-campo="outros_descontos"      value="${fmtNum(f.outros_descontos)}"/></td>
        <td class="cel-resultado cel-pago" data-pago>${fmtValor(f.valor_pago)}</td>
        ${btnRemover(id)}
      </tr>`;
    }
  }).join('');

  const totalHTML = isQuinzena ? `
    <div class="totais-item"><span class="totais-label">Total adiantamentos</span><span class="totais-valor">${fmtValor(totais.total_adicional)}</span></div>
    <div class="totais-divider"></div>
    <div class="totais-item"><span class="totais-label">Total descontos</span><span class="totais-valor totais-valor--red">${fmtValor(totais.total_descontos)}</span></div>
    <div class="totais-divider"></div>
    <div class="totais-item totais-total"><span class="totais-label">Total a pagar</span><span class="totais-valor">${fmtValor(totais.total_pago)}</span></div>
  ` : `
    <div class="totais-item"><span class="totais-label">Total descontos</span><span class="totais-valor totais-valor--red">${fmtValor(totais.total_descontos)}</span></div>
    <div class="totais-divider"></div>
    <div class="totais-item totais-total"><span class="totais-label">Total a pagar</span><span class="totais-valor">${fmtValor(totais.total_pago)}</span></div>
  `;

  return `
    <div class="folha-table-wrap">
      <table class="folha-table">
        <thead>
          <tr class="thead-groups">${theadGroups}</tr>
          <tr class="thead-cols">${theadCols}</tr>
        </thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    <div style="padding:10px 16px;border-top:1px solid #E3E1DA">
      <div id="add-func-bar-${dp}" style="display:none;align-items:center;gap:8px;margin-bottom:8px">
        <select id="add-func-sel-${dp}"
          style="font-family:inherit;font-size:13px;padding:6px 10px;border:1px solid #E3E1DA;border-radius:7px;flex:1;min-width:200px">
          <option value="">Carregando funcionários…</option>
        </select>
        <button onclick="confirmarAddFuncFolha('${dp}')"
          style="font-family:inherit;font-size:13px;font-weight:500;padding:6px 14px;border-radius:7px;border:none;background:var(--navy);color:#fff;cursor:pointer">
          Confirmar
        </button>
        <button onclick="document.getElementById('add-func-bar-${dp}').style.display='none'"
          style="font-family:inherit;font-size:13px;padding:6px 12px;border-radius:7px;border:1px solid #E3E1DA;background:#fff;cursor:pointer">
          Cancelar
        </button>
      </div>
      <button onclick="mostrarAddFuncFolha('${dp}')"
        style="font-family:inherit;font-size:12.5px;font-weight:500;padding:6px 14px;border-radius:7px;border:1px solid #E3E1DA;background:#fff;color:var(--navy);cursor:pointer">
        + Adicionar funcionário
      </button>
    </div>
    <div class="totais-wrap">${totalHTML}</div>
  `;
}

function bindFolhaInputs(container) {
  container.querySelectorAll('.cel-edit input').forEach(input => {
    input.addEventListener('focus', () => input.select());
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      if (!digits) { input.value = ''; } else {
        input.value = (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      recalcularLinha(input.closest('tr'));
    });
    input.addEventListener('change', debounce(() => salvarLinha(input.closest('tr')), 800));
  });
}

function recalcularLinha(tr) {
  if (!tr) return;
  const get = campo => parseBRL(tr.querySelector(`[data-campo="${campo}"]`)?.value || '0');
  const pago = get('salario_oficial') + get('salario_adicional') + get('outros_acrescimos')
             - get('desconto_inss') - get('desconto_adiantamento') - get('desconto_faltas') - get('outros_descontos');
  const cel = tr.querySelector('[data-pago]');
  if (cel) cel.textContent = fmtValor(pago);
}

async function salvarLinha(tr) {
  if (!tr) return;
  const id = tr.dataset.id;
  const get = campo => parseBRL(tr.querySelector(`[data-campo="${campo}"]`)?.value || '0');
  try {
    await api.atualizarLancamento(id, {
      salario_oficial:       get('salario_oficial'),
      salario_adicional:     get('salario_adicional'),
      desconto_inss:         get('desconto_inss'),
      desconto_adiantamento: get('desconto_adiantamento'),
      desconto_faltas:       get('desconto_faltas'),
      outros_descontos:      get('outros_descontos'),
      outros_acrescimos:     get('outros_acrescimos'),
    });
  } catch (err) {
    console.error('Erro ao salvar lançamento:', err.message);
  }
}

// ── Toggle expandir/recolher item ─────────────────────────────────────────────
window.toggleFolhaItem = async function(dp, headerEl) {
  const body  = document.getElementById('folha-body-' + dp);
  const arrow = headerEl.querySelector('.toggle-arrow-btn');

  if (body.style.display !== 'none') {
    body.style.display = 'none';
    if (arrow) arrow.textContent = '▼';
    return;
  }

  body.style.display = '';
  if (arrow) arrow.textContent = '▲';

  if (body.dataset.loaded) return;

  body.innerHTML = '<div style="padding:20px;color:var(--muted);font-size:13px;text-align:center">Carregando…</div>';
  try {
    const dados = await api.buscarFolha(dp);
    body.innerHTML = buildFolhaHTML(dados);
    body.dataset.loaded = '1';
    bindFolhaInputs(body);
  } catch (err) {
    body.innerHTML = `<div style="padding:16px;color:#DC2626;font-size:13px">${err.message}</div>`;
  }
};

// ── Excluir folha do histórico ────────────────────────────────────────────────
window.excluirFolhaItem = async function(dp, titulo, event) {
  event.stopPropagation();
  if (!await confirmar(`Excluir "${titulo}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await api.excluirFolha(dp);
    await carregarHistorico();
  } catch (err) {
    mostrarErro('Erro ao excluir: ' + err.message);
  }
};

// ── Histórico ─────────────────────────────────────────────────────────────────
async function carregarHistorico() {
  const el = document.getElementById('historico-lista');
  try {
    const lista = await api.listarFolhas();
    if (!lista.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px">Nenhuma folha gerada ainda.</div>';
      return;
    }
    const MABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    el.innerHTML = lista.map(f => {
      const dp     = sliceDate(f.data_pagamento);
      const titulo = tituloFolha(dp);
      const [,mes,dia] = dp.split('-').map(Number);
      const diaBadge   = String(dia).padStart(2, '0');
      const mesBadge   = MABREV[mes - 1].toUpperCase();
      return `
        <div class="historico-card">
          <div class="historico-card-header" onclick="toggleFolhaItem('${dp}', this)">
            <div class="historico-card-left">
              <div class="historico-tipo-badge">
                <span class="badge-dia">${diaBadge}</span>
                <span class="badge-tipo">${mesBadge}</span>
              </div>
              <div class="historico-info">
                <div class="historico-data">${titulo}</div>
                <div class="historico-meta">
                  <span class="historico-qtd"><strong>${f.qtd_funcionarios}</strong> funcionários</span>
                </div>
              </div>
            </div>
            <div class="historico-card-right">
              <div class="historico-total-wrap">
                <span class="historico-total-label">Total pago</span>
                <span class="historico-total">${fmtValor(f.total_pago)}</span>
              </div>
              <div class="historico-actions">
                <button class="btn-imprimir" onclick="event.stopPropagation();imprimirFolhaResumida('${dp}')">Resumida</button>
                <button class="btn-imprimir btn-imprimir-completo" onclick="event.stopPropagation();imprimirFolha('${dp}')">Completa</button>
                <button class="btn-excluir" onclick="excluirFolhaItem('${dp}', '${titulo.replace(/'/g,"\\'")}', event)">Excluir</button>
                <span class="toggle-arrow-btn">▼</span>
              </div>
            </div>
          </div>
          <div id="folha-body-${dp}" class="historico-body" style="display:none"></div>
        </div>
      `;
    }).join('');
  } catch (err) {
    el.innerHTML = `<div style="color:#DC2626;font-size:13px;padding:16px">${err.message}</div>`;
  }
}

// ── Remover funcionário da folha ──────────────────────────────────────────────
window.removerFuncFolha = async function(id, dp) {
  try {
    await api.removerLancamento(id);
    const body = document.getElementById('folha-body-' + dp);
    const dados = await api.buscarFolha(dp);
    body.innerHTML = buildFolhaHTML(dados);
    bindFolhaInputs(body);
  } catch (err) {
    mostrarErro('Erro ao remover: ' + err.message);
  }
};

// ── Mostrar barra de adicionar ────────────────────────────────────────────────
window.mostrarAddFuncFolha = async function(dp) {
  const bar = document.getElementById('add-func-bar-' + dp);
  if (bar.style.display === 'flex') { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';

  const sel = document.getElementById('add-func-sel-' + dp);
  sel.innerHTML = '<option value="">Carregando…</option>';

  try {
    const todos = await api.listarFuncionarios();
    const body = document.getElementById('folha-body-' + dp);
    const existentes = new Set([...body.querySelectorAll('tr[data-id]')].map(tr => String(tr.dataset.id)));
    const disponiveis = todos.filter(f => f.status !== 'inativo' && !existentes.has(String(f.id)));

    sel.innerHTML = disponiveis.length
      ? '<option value="">Selecionar funcionário…</option>' +
        disponiveis.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')
      : '<option value="">Todos já estão na folha</option>';
  } catch (err) {
    sel.innerHTML = '<option value="">Erro ao carregar</option>';
    mostrarErro('Erro ao carregar funcionários: ' + err.message);
  }
};

// ── Confirmar adição ──────────────────────────────────────────────────────────
window.confirmarAddFuncFolha = async function(dp) {
  const sel = document.getElementById('add-func-sel-' + dp);
  if (!sel.value) return;
  try {
    await api.adicionarFuncionarioFolha(dp, { funcionario_id: sel.value });
    const body = document.getElementById('folha-body-' + dp);
    const dados = await api.buscarFolha(dp);
    body.innerHTML = buildFolhaHTML(dados);
    bindFolhaInputs(body);
  } catch (err) {
    mostrarErro('Erro ao adicionar: ' + err.message);
  }
};

// ── Estilos base compartilhados entre impressões ──────────────────────────────
function _printBaseStyles() {
  return `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:18mm 14mm}
    .cab{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:2px solid #1B2D5B;padding-bottom:10px}
    .empresa{font-size:17px;font-weight:700;color:#1B2D5B}
    .empresa small{display:block;font-size:10px;font-weight:400;color:#555;margin-top:2px}
    .doc-info{text-align:right}
    .doc-titulo{font-size:13px;font-weight:700;color:#1B2D5B}
    .doc-data{font-size:10px;color:#777;margin-top:3px}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}
    th{background:#1B2D5B;color:#fff;padding:6px 8px;text-align:right;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em}
    th:first-child{text-align:left}
    td{padding:5px 8px;text-align:right;border-bottom:1px solid #E3E1DA;font-size:10.5px}
    td:first-child{text-align:left;font-weight:500}
    tr:nth-child(even) td{background:#F8F7F4}
    td.destaque{font-weight:700;color:#1B2D5B}
    .rodape{margin-top:24px;border-top:1px solid #E3E1DA;padding-top:6px;font-size:9px;color:#aaa;display:flex;justify-content:space-between}
    /* Quadro de observações — estilos base (detalhes usam inline styles) */
    .obs-secao{margin-top:20px;page-break-inside:avoid}
    .obs-titulo{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1B2D5B;border-bottom:2px solid #1B2D5B;padding-bottom:4px;margin-bottom:0}
    .obs-outer{width:100%;border-collapse:collapse;margin-bottom:0}
    .obs-outer th{background:#EFF6FF;color:#1D4ED8;padding:5px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;border:1px solid #BFDBFE}
    .obs-outer td{padding:6px 8px;border:1px solid #E3E1DA;vertical-align:top;text-align:left}
    @media print{@page{margin:14mm}body{padding:0}}
  `;
}

// ── Construir quadro de observações para impressão ──────────────────────────
// dp = "YYYY-MM-DD" (data_pagamento da folha)
function _buildObsBlock(funcionarios, dp) {
  const linhas = funcionarios.filter(f => {
    const temFalta  = (f.dias_falta             && f.dias_falta.length             > 0) || parseFloat(f.desconto_faltas)       > 0;
    const temAdiant = (f.adiantamentos_detalhes && f.adiantamentos_detalhes.length > 0) || parseFloat(f.desconto_adiantamento) > 0;
    const temOutros = parseFloat(f.outros_descontos) > 0;
    const temObs    = !!(f.observacoes && f.observacoes.trim());
    return temFalta || temAdiant || temOutros || temObs;
  });
  if (!linhas.length) return '';

  const MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho',
                    'julho','agosto','setembro','outubro','novembro','dezembro'];
  let mesRefFalta = '', dpFmt = '';
  if (dp) {
    const [ano, mes, dia] = dp.split('-').map(Number);
    dpFmt = `${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}`;
    let mf = mes, af = ano;
    if (dia === 5) { mf = mes === 1 ? 12 : mes - 1; af = mes === 1 ? ano - 1 : ano; }
    mesRefFalta = `${MESES_PT[mf - 1]}/${af}`;
  }

  // Seção sem bordas — só fundo e tipografia
  const secHeader = (cor, bg, titulo) =>
    `<tr><td colspan="2" style="background:${bg};color:${cor};padding:3px 10px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em">${titulo}</td></tr>`;

  const kvRow = (chave, valor, negrito = true) =>
    `<tr>
      <td style="padding:2px 10px 2px 10px;color:#777;font-size:9px;white-space:nowrap;width:1%">${chave}</td>
      <td style="padding:2px 8px;font-size:9.5px;${negrito ? 'font-weight:600;' : ''}color:#111">${valor}</td>
    </tr>`;

  const totalRow = (valor) =>
    `<tr><td colspan="2" style="padding:2px 10px 5px;font-size:9px;color:#555">
      Desconto total: <strong style="color:#B91C1C">${valor}</strong>
    </td></tr>`;

  const card = (conteudo) =>
    `<table style="width:100%;border-collapse:collapse;margin-bottom:4px">${conteudo}</table>`;

  const rows = linhas.map(f => {
    const cards = [];

    // ── Faltas ────────────────────────────────────────────────────────────────
    const diasFalta = Array.isArray(f.dias_falta) ? f.dias_falta : [];
    if (diasFalta.length > 0) {
      const sep = '<span style="color:#bbb;margin:0 5px">·</span>';
      const diaRows = diasFalta.map((d, i) => {
        const isMeia = d.status === 'meia_falta';
        const chip = isMeia
          ? `<span style="background:#FEF9C3;color:#92400E;padding:1px 5px;border-radius:3px;font-size:8.5px;font-weight:700">Meia falta</span>`
          : `<span style="background:#FEE2E2;color:#B91C1C;padding:1px 5px;border-radius:3px;font-size:8.5px;font-weight:700">Falta integral</span>`;
        const valor = i === diasFalta.length - 1
          ? `${sep}<strong style="color:#B91C1C">${fmtValor(f.desconto_faltas)}</strong>` : '';
        return `<tr><td style="padding:2px 10px;font-size:9.5px"><strong>${d.data}</strong>${valor}${sep}${chip}</td></tr>`;
      }).join('');
      cards.push(card(secHeader('#B91C1C','#FEE2E2','Faltas') + diaRows));
    } else if (parseFloat(f.desconto_faltas) > 0) {
      cards.push(card(
        secHeader('#B91C1C','#FEE2E2',`Faltas${mesRefFalta ? ' — ' + mesRefFalta : ''}`) +
        `<tr><td style="padding:3px 10px 5px;font-size:9.5px">
          Desconto: <strong style="color:#B91C1C">${fmtValor(f.desconto_faltas)}</strong>
          <span style="color:#aaa;font-size:8.5px"> · datas não registradas no ponto</span>
        </td></tr>`
      ));
    }

    // ── Adiantamentos ─────────────────────────────────────────────────────────
    const adiantamentos = Array.isArray(f.adiantamentos_detalhes) ? f.adiantamentos_detalhes : [];
    const sepA = '<span style="color:#bbb;margin:0 5px">·</span>';
    if (adiantamentos.length > 0) {
      adiantamentos.forEach(a => {
        const partes = [
          `<strong>${a.data || '—'}</strong>`,
          `<strong style="color:#5B21B6">${fmtValor(a.valor)}</strong>`,
          ...(a.observacoes && a.observacoes.trim() ? [`<em style="color:#555">${a.observacoes}</em>`] : [])
        ].join(sepA);
        const linha = `<tr><td style="padding:3px 10px 5px;font-size:9.5px">${partes}</td></tr>`;
        cards.push(card(secHeader('#5B21B6','#EDE9FE','Adiantamento') + linha));
      });
    } else if (parseFloat(f.desconto_adiantamento) > 0) {
      const partes = [
        `<strong>${dpFmt || '—'}</strong>`,
        `<strong style="color:#5B21B6">${fmtValor(f.desconto_adiantamento)}</strong>`
      ].join(sepA);
      const linha = `<tr><td style="padding:3px 10px 5px;font-size:9.5px">${partes}</td></tr>`;
      cards.push(card(secHeader('#5B21B6','#EDE9FE','Adiantamento') + linha));
    }

    // ── Outros descontos ──────────────────────────────────────────────────────
    if (parseFloat(f.outros_descontos) > 0) {
      const rows = kvRow('Em', dpFmt || '—') + kvRow('Valor', fmtValor(f.outros_descontos));
      cards.push(card(secHeader('#475569','#F1F5F9','Outros descontos') + rows));
    }

    // ── Observação livre ──────────────────────────────────────────────────────
    if (f.observacoes && f.observacoes.trim()) {
      cards.push(card(
        secHeader('#92400E','#FEF9C3','Observação') +
        `<tr><td style="padding:3px 10px 5px;font-size:9.5px">${f.observacoes}</td></tr>`
      ));
    }

    return `<tr>
      <td style="padding:7px 10px;font-weight:700;font-size:10.5px;white-space:nowrap;background:#F8F7F4;width:20%;border-right:2px solid #E3E1DA;vertical-align:top">${f.funcionario_nome}</td>
      <td style="padding:6px 8px;vertical-align:top">${cards.join('')}</td>
    </tr>`;
  }).join('');

  return `
    <div class="obs-secao">
      <div class="obs-titulo">Observações e Justificativas de Descontos</div>
      <table class="obs-outer">
        <thead><tr><th>Funcionário</th><th>Detalhes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function _printCabecalho(titulo, dataImpressao) {
  return `
    <div class="cab">
      <div class="empresa">Hidrauldiesel<small>Sistema de Gestão</small></div>
      <div class="doc-info"><div class="doc-titulo">${titulo}</div><div class="doc-data">Impresso em ${dataImpressao}</div></div>
    </div>
  `;
}

function _printRodape(titulo) {
  return `<div class="rodape"><span>Hidrauldiesel — documento gerado pelo sistema</span><span>${titulo}</span></div>`;
}

function _abrirJanela(html) {
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// ── Impressão completa ────────────────────────────────────────────────────────
window.imprimirFolha = async function(dp) {
  let dados;
  try { dados = await api.buscarFolha(dp); }
  catch (err) { mostrarErro('Erro ao carregar folha: ' + err.message); return; }

  const { funcionarios, totais, data_pagamento } = dados;
  const titulo = tituloFolha(sliceDate(data_pagamento));
  const isQuinzena = funcionarios[0]?.tipo === 'quinzena';
  const dataImpressao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const thCols = isQuinzena
    ? ['Funcionário','Prop. Oficial','Prop. Adicional','Outros acrés.','Adiantamentos','Outros desc.','Valor pago']
    : ['Funcionário','Prop. Oficial','Prop. Adicional','Outros acrés.','INSS','Faltas','Adiantamentos','Outros desc.','Valor pago'];
  const thead = thCols.map(c => `<th>${c}</th>`).join('');

  const tbody = funcionarios.map(f => {
    const cols = isQuinzena
      ? [f.funcionario_nome, fmtValor(f.salario_oficial), fmtValor(f.salario_adicional),
         fmtValor(f.outros_acrescimos), fmtValor(f.desconto_adiantamento), fmtValor(f.outros_descontos), fmtValor(f.valor_pago)]
      : [f.funcionario_nome, fmtValor(f.salario_oficial), fmtValor(f.salario_adicional),
         fmtValor(f.outros_acrescimos), fmtValor(f.desconto_inss), fmtValor(f.desconto_faltas),
         fmtValor(f.desconto_adiantamento), fmtValor(f.outros_descontos), fmtValor(f.valor_pago)];
    return '<tr>' + cols.map((v, i) =>
      `<td${i === cols.length - 1 ? ' class="destaque"' : ''}>${v}</td>`
    ).join('') + '</tr>';
  }).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"/><title>${titulo}</title>
  <style>
    ${_printBaseStyles()}
    .totais{display:flex;justify-content:flex-end;gap:20px;background:#EFF6FF;border-radius:6px;padding:9px 14px;font-size:12px;margin-bottom:8px}
    .totais strong{color:#1B2D5B}
  </style></head><body>
  ${_printCabecalho(titulo, dataImpressao)}
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
  <div class="totais">
    <div>Total descontos: <strong style="color:#B91C1C">${fmtValor(totais.total_descontos)}</strong></div>
    <div>Total a pagar: <strong>${fmtValor(totais.total_pago)}</strong></div>
  </div>
  ${_buildObsBlock(funcionarios, dp)}
  ${_printRodape(titulo)}
  <script>window.onload=()=>window.print()<\/script>
  </body></html>`;

  _abrirJanela(html);
};

// ── Impressão resumida ────────────────────────────────────────────────────────
window.imprimirFolhaResumida = async function(dp) {
  let dados;
  try { dados = await api.buscarFolha(dp); }
  catch (err) { mostrarErro('Erro ao carregar folha: ' + err.message); return; }

  const { funcionarios, totais, data_pagamento } = dados;
  const titulo = tituloFolha(sliceDate(data_pagamento));
  const dataImpressao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const tbody = funcionarios.map(f => {
    const proventos = (Number(f.salario_oficial) || 0) + (Number(f.salario_adicional) || 0) + (Number(f.outros_acrescimos) || 0);
    const descontos = (Number(f.desconto_inss) || 0) + (Number(f.desconto_faltas) || 0)
                    + (Number(f.desconto_adiantamento) || 0) + (Number(f.outros_descontos) || 0);
    return `<tr>
      <td>${f.funcionario_nome}</td>
      <td>${fmtValor(proventos)}</td>
      <td>${fmtValor(descontos)}</td>
      <td class="destaque">${fmtValor(f.valor_pago)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"/><title>Resumo — ${titulo}</title>
  <style>
    ${_printBaseStyles()}
    .badge-resumo{display:inline-block;background:#F0FDF4;border:1px solid #86EFAC;color:#166534;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:4px;margin-left:8px;vertical-align:middle}
    .totais-bloco{margin-top:4px;border:2px solid #1B2D5B;border-radius:6px;padding:12px 18px;display:flex;justify-content:flex-end;gap:36px;align-items:center}
    .totais-bloco .t-item{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
    .totais-bloco .t-label{font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;color:#777;font-weight:700}
    .totais-bloco .t-val{font-size:14px;font-weight:700;color:#1B2D5B}
    .totais-bloco .t-val.red{color:#B91C1C}
    .totais-bloco .t-val.green{color:#15803D;font-size:17px}
    .totais-bloco .divider{width:1px;height:36px;background:#E3E1DA}
  </style></head><body>
  ${_printCabecalho(`${titulo} <span class="badge-resumo">Resumida</span>`, dataImpressao)}
  <table>
    <thead><tr>
      <th>Funcionário</th>
      <th>Total proventos</th>
      <th>Total descontos</th>
      <th>Valor a receber</th>
    </tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <div class="totais-bloco">
    <div class="t-item"><span class="t-label">Funcionários</span><span class="t-val">${funcionarios.length}</span></div>
    <div class="divider"></div>
    <div class="t-item"><span class="t-label">Total descontos</span><span class="t-val red">${fmtValor(totais.total_descontos)}</span></div>
    <div class="divider"></div>
    <div class="t-item"><span class="t-label">Total a pagar</span><span class="t-val green">${fmtValor(totais.total_pago)}</span></div>
  </div>
  ${_buildObsBlock(funcionarios, dp)}
  ${_printRodape(titulo)}
  <script>window.onload=()=>window.print()<\/script>
  </body></html>`;

  _abrirJanela(html);
};

carregarHistorico();
carregarResumoMensalFolha();

// ══════════════════════════════════════════════════════════════════════════════
// GRÁFICO MENSAL
// ══════════════════════════════════════════════════════════════════════════════

const _MABREV_F = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

async function carregarResumoMensalFolha() {
  try {
    const dados = await api.resumoMensalFolha(6);
    if (!dados || !dados.length) return;
    document.getElementById('grafico-folha-card').style.display = '';
    _renderDestaqueF(dados);
    document.getElementById('grafico-folha-svg').innerHTML = _renderBarChartF(dados);
  } catch (err) {
    console.warn('[grafico-folha]', err.message);
  }
}

function _renderDestaqueF(dados) {
  const atual = dados[dados.length - 1];
  const [ano, mes] = atual.mes.split('-');
  const d05clt  = Number(atual.d05_clt)      || 0;
  const d05inf  = Number(atual.d05_informal)  || 0;
  const d20clt  = Number(atual.d20_clt)       || 0;
  const d20inf  = Number(atual.d20_informal)  || 0;
  const total   = d05clt + d05inf + d20clt + d20inf;
  const dot = (cor) => `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${cor};flex-shrink:0;margin-right:4px"></span>`;
  document.getElementById('grafico-folha-destaque').innerHTML = `
    <div class="grafico-destaque-mes">${_MABREV_F[parseInt(mes)-1].toUpperCase()} ${ano}</div>
    <div class="grafico-destaque-total">${fmtValor(total)}</div>
    <div class="grafico-destaque-divider"></div>
    <div style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Dia 05</div>
    <div class="grafico-destaque-linha">
      <span class="grafico-destaque-chave">${dot('#1B2D5B')}CLT</span>
      <span class="grafico-destaque-valor">${fmtValor(d05clt)}</span>
    </div>
    <div class="grafico-destaque-linha">
      <span class="grafico-destaque-chave">${dot('#4B8EDB')}Informal</span>
      <span class="grafico-destaque-valor">${fmtValor(d05inf)}</span>
    </div>
    <div style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:4px 0 2px">Dia 20</div>
    <div class="grafico-destaque-linha">
      <span class="grafico-destaque-chave">${dot('#7C3AED')}CLT</span>
      <span class="grafico-destaque-valor">${fmtValor(d20clt)}</span>
    </div>
    <div class="grafico-destaque-linha">
      <span class="grafico-destaque-chave">${dot('#A78BFA')}Informal</span>
      <span class="grafico-destaque-valor">${fmtValor(d20inf)}</span>
    </div>`;
}

function _renderBarChartF(dados) {
  const n = dados.length;
  const maxTotal = Math.max(...dados.map(d =>
    Number(d.d05_clt) + Number(d.d05_informal) + Number(d.d20_clt) + Number(d.d20_informal)
  ), 1);

  const VB_W = 500, VB_H = 150;
  const BAR_H = 88, TOP_PAD = 26, BASE_Y = TOP_PAD + BAR_H;
  const PAD_L = 10, PAD_R = 10;
  const SLOT_W = (VB_W - PAD_L - PAD_R) / n;
  // 2 barras por slot com gap entre elas
  const BAR_W  = Math.min(SLOT_W * 0.26, 26);
  const GAP    = Math.min(SLOT_W * 0.06, 5);

  const bars = dados.map((d, i) => {
    const d05c  = Number(d.d05_clt)      || 0;
    const d05i  = Number(d.d05_informal)  || 0;
    const d20c  = Number(d.d20_clt)       || 0;
    const d20i  = Number(d.d20_informal)  || 0;
    const total = d05c + d05i + d20c + d20i;
    const isCur = i === n - 1;
    const a     = isCur ? 'FF' : '77';

    const cx = PAD_L + i * SLOT_W + SLOT_W / 2;
    // barra esquerda = Dia 05, barra direita = Dia 20
    const x05 = cx - GAP / 2 - BAR_W;
    const x20 = cx + GAP / 2;

    const h05c = (d05c / maxTotal) * BAR_H;
    const h05i = (d05i / maxTotal) * BAR_H;
    const h20c = (d20c / maxTotal) * BAR_H;
    const h20i = (d20i / maxTotal) * BAR_H;
    const h05  = h05c + h05i;
    const h20  = h20c + h20i;

    // barra Dia 05: base CLT (navy) + topo Informal (blue)
    const r05 = h05 > 0 ? `
      <rect x="${x05}" y="${BASE_Y - h05}" width="${BAR_W}" height="${h05}" fill="#1B2D5B${a}" rx="3"/>
      ${h05i > 0 ? `<rect x="${x05}" y="${BASE_Y - h05}" width="${BAR_W}" height="${h05i}" fill="#4B8EDB${a}" rx="3"/>
      ${h05c > 0 ? `<rect x="${x05}" y="${BASE_Y - h05 + h05i - 2}" width="${BAR_W}" height="4" fill="#4B8EDB${a}"/>` : ''}` : ''}
    ` : '';

    // barra Dia 20: base CLT (purple) + topo Informal (lavender)
    const r20 = h20 > 0 ? `
      <rect x="${x20}" y="${BASE_Y - h20}" width="${BAR_W}" height="${h20}" fill="#7C3AED${a}" rx="3"/>
      ${h20i > 0 ? `<rect x="${x20}" y="${BASE_Y - h20}" width="${BAR_W}" height="${h20i}" fill="#A78BFA${a}" rx="3"/>
      ${h20c > 0 ? `<rect x="${x20}" y="${BASE_Y - h20 + h20i - 2}" width="${BAR_W}" height="4" fill="#A78BFA${a}"/>` : ''}` : ''}
    ` : '';

    const maxH = Math.max(h05, h20);
    const [ano, mes] = d.mes.split('-');
    const label    = _MABREV_F[parseInt(mes) - 1] + '/' + ano.slice(2);
    const valLabel = total > 0 ? 'R$' + Math.round(total).toLocaleString('pt-BR') : '';

    return `<g>
      ${r05}${r20}
      ${total > 0 ? `<text x="${cx}" y="${BASE_Y - maxH - 5}" text-anchor="middle" font-size="9.5" font-weight="${isCur ? 600 : 400}" fill="${isCur ? '#12151F' : '#AAAAAA'}" font-family="DM Sans,sans-serif">${valLabel}</text>` : ''}
      <text x="${cx}" y="${BASE_Y + 16}" text-anchor="middle" font-size="11" font-weight="${isCur ? 700 : 400}" fill="${isCur ? '#1B2D5B' : '#AAAAAA'}" font-family="DM Sans,sans-serif">${label}</text>
    </g>`;
  }).join('');

  return `<svg viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
    <line x1="${PAD_L}" y1="${BASE_Y}" x2="${VB_W - PAD_R}" y2="${BASE_Y}" stroke="#E3E1DA" stroke-width="1"/>
    ${bars}
  </svg>`;
}
