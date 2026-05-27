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

  const thead = isQuinzena ? `
    <th>Funcionário</th>
    <th style="text-align:right">Prop. Oficial</th>
    <th style="text-align:right">Prop. Adicional</th>
    <th style="text-align:right">Adiantamentos</th>
    <th style="text-align:right">Outros desc.</th>
    <th style="text-align:right">Outros acrés.</th>
    <th style="text-align:right">Valor pago</th>
    <th></th>
  ` : `
    <th>Funcionário</th>
    <th style="text-align:right">Prop. Oficial</th>
    <th style="text-align:right">Prop. Adicional</th>
    <th style="text-align:right">INSS</th>
    <th style="text-align:right">Faltas</th>
    <th style="text-align:right">Adiantamentos</th>
    <th style="text-align:right">Outros desc.</th>
    <th style="text-align:right">Outros acrés.</th>
    <th style="text-align:right">Valor pago</th>
    <th></th>
  `;

  const tbody = funcionarios.map(f => {
    const id = f.id;
    const btnRemover = `<td style="padding:0 8px"><button onclick="removerFuncFolha(${id},'${dp}')"
      style="font-family:inherit;font-size:11px;padding:3px 8px;border-radius:5px;border:1px solid #FCA5A5;background:#FEE2E2;color:#B91C1C;cursor:pointer">✕</button></td>`;
    if (isQuinzena) {
      return `<tr data-id="${id}">
        <td class="cel-nome">${f.funcionario_nome}${f.comentario_importante ? `<span class="badge-comentario">!<span class="tooltip-box">${(f.comentario_importante||'').replace(/</g,'&lt;')}</span></span>` : ''}</td>
        <td class="cel-edit"><input type="text" data-campo="salario_oficial"       value="${fmtNum(f.salario_oficial)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="salario_adicional"     value="${fmtNum(f.salario_adicional)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="desconto_adiantamento" value="${fmtNum(f.desconto_adiantamento)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="outros_descontos"      value="${fmtNum(f.outros_descontos)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="outros_acrescimos"     value="${fmtNum(f.outros_acrescimos)}"/></td>
        <td class="cel-pago" data-pago>${fmtValor(f.valor_pago)}</td>
        ${btnRemover}
      </tr>`;
    } else {
      return `<tr data-id="${id}">
        <td class="cel-nome">${f.funcionario_nome}${f.comentario_importante ? `<span class="badge-comentario">!<span class="tooltip-box">${(f.comentario_importante||'').replace(/</g,'&lt;')}</span></span>` : ''}</td>
        <td class="cel-edit"><input type="text" data-campo="salario_oficial"       value="${fmtNum(f.salario_oficial)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="salario_adicional"     value="${fmtNum(f.salario_adicional)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="desconto_inss"         value="${fmtNum(f.desconto_inss)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="desconto_faltas"       value="${fmtNum(f.desconto_faltas)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="desconto_adiantamento" value="${fmtNum(f.desconto_adiantamento)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="outros_descontos"      value="${fmtNum(f.outros_descontos)}"/></td>
        <td class="cel-edit"><input type="text" data-campo="outros_acrescimos"     value="${fmtNum(f.outros_acrescimos)}"/></td>
        <td class="cel-pago" data-pago>${fmtValor(f.valor_pago)}</td>
        ${btnRemover}
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
    <div style="overflow-x:auto;padding:0 20px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    <div style="padding:12px 20px;border-top:1px solid #E3E1DA">
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
    <div class="totais-wrap" style="margin:0 20px 16px">${totalHTML}</div>
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
  const arrow = headerEl.querySelector('.toggle-arrow');

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
    el.innerHTML = lista.map(f => {
      const dp     = sliceDate(f.data_pagamento);
      const titulo = tituloFolha(dp);
      const tipo   = f.tipo === 'mensal' ? 'Dia 05 — Mensal' : 'Dia 20 — Quinzena';
      return `
        <div style="background:#fff;border:1px solid #E3E1DA;border-radius:10px;margin-bottom:12px;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;cursor:pointer;user-select:none"
               onclick="toggleFolhaItem('${dp}', this)">
            <div>
              <div class="historico-data">${titulo}</div>
              <div class="historico-tipo">${tipo}</div>
            </div>
            <div style="display:flex;align-items:center;gap:14px">
              <span class="historico-qtd">${f.qtd_funcionarios} funcionários</span>
              <span class="historico-total">${fmtValor(f.total_pago)}</span>
              <button onclick="event.stopPropagation();imprimirFolha('${dp}')"
                      style="font-family:inherit;font-size:11.5px;padding:4px 10px;border-radius:6px;border:1px solid #93C5FD;background:#EFF6FF;color:#1D4ED8;cursor:pointer">
                Imprimir
              </button>
              <button onclick="excluirFolhaItem('${dp}', '${titulo.replace(/'/g,"\\'")}', event)"
                      style="font-family:inherit;font-size:11.5px;padding:4px 10px;border-radius:6px;border:1px solid #FCA5A5;background:#FEE2E2;color:#B91C1C;cursor:pointer">
                Excluir
              </button>
              <span class="toggle-arrow" style="font-size:11px;color:var(--muted);min-width:10px">▼</span>
            </div>
          </div>
          <div id="folha-body-${dp}" style="display:none;border-top:1px solid #E3E1DA"></div>
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

// ── Impressão da Folha ────────────────────────────────────────────────────────
window.imprimirFolha = async function(dp) {
  let dados;
  try { dados = await api.buscarFolha(dp); }
  catch (err) { mostrarErro('Erro ao carregar folha: ' + err.message); return; }

  const { funcionarios, totais, data_pagamento } = dados;
  const titulo = tituloFolha(sliceDate(data_pagamento));
  const isQuinzena = funcionarios[0]?.tipo === 'quinzena';
  const dataImpressao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const thCols = isQuinzena
    ? ['Funcionário','Prop. Oficial','Prop. Adicional','Adiantamentos','Outros desc.','Outros acrés.','Valor pago']
    : ['Funcionário','Prop. Oficial','Prop. Adicional','INSS','Faltas','Adiantamentos','Outros desc.','Outros acrés.','Valor pago'];
  const thead = thCols.map(c => `<th>${c}</th>`).join('');

  const tbody = funcionarios.map(f => {
    const cols = isQuinzena
      ? [f.funcionario_nome, fmtValor(f.salario_oficial), fmtValor(f.salario_adicional),
         fmtValor(f.desconto_adiantamento), fmtValor(f.outros_descontos), fmtValor(f.outros_acrescimos), fmtValor(f.valor_pago)]
      : [f.funcionario_nome, fmtValor(f.salario_oficial), fmtValor(f.salario_adicional),
         fmtValor(f.desconto_inss), fmtValor(f.desconto_faltas), fmtValor(f.desconto_adiantamento),
         fmtValor(f.outros_descontos), fmtValor(f.outros_acrescimos), fmtValor(f.valor_pago)];
    return '<tr>' + cols.map((v, i) =>
      `<td${i === cols.length - 1 ? ' class="destaque"' : ''}>${v}</td>`
    ).join('') + '</tr>';
  }).join('');

  const assinaturas = funcionarios.map(f => `
    <div class="assinatura-box">
      <div class="assinatura-linha"></div>
      <div class="assinatura-nome">${f.funcionario_nome}</div>
    </div>`).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"/><title>${titulo}</title>
  <style>
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
    .totais{display:flex;justify-content:flex-end;gap:20px;background:#EFF6FF;border-radius:6px;padding:9px 14px;font-size:12px;margin-bottom:26px}
    .totais strong{color:#1B2D5B}
    .assinaturas h4{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:18px}
    .assinaturas-grid{display:flex;flex-wrap:wrap;gap:18px 36px}
    .assinatura-box{width:190px}
    .assinatura-linha{border-top:1px solid #333;margin-bottom:4px}
    .assinatura-nome{font-size:9.5px;color:#555;text-align:center}
    .rodape{margin-top:24px;border-top:1px solid #E3E1DA;padding-top:6px;font-size:9px;color:#aaa;display:flex;justify-content:space-between}
    @media print{@page{margin:14mm}body{padding:0}}
  </style></head><body>
  <div class="cab">
    <div class="empresa">Hidrauldiesel<small>Sistema de Gestão</small></div>
    <div class="doc-info"><div class="doc-titulo">${titulo}</div><div class="doc-data">Impresso em ${dataImpressao}</div></div>
  </div>
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
  <div class="totais"><div>Total a pagar: <strong>${fmtValor(totais.total_pago)}</strong></div></div>
  <div class="assinaturas">
    <h4>Assinaturas de recebimento</h4>
    <div class="assinaturas-grid">${assinaturas}</div>
  </div>
  <div class="rodape"><span>Hidrauldiesel — documento gerado pelo sistema</span><span>${titulo}</span></div>
  <script>window.onload=()=>window.print()<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
};

carregarHistorico();
