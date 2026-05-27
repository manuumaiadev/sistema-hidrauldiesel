const fmtValor = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function sliceDate(d) { return (d || '').slice(0, 10); }

function tituloVT(dp) {
  const [ano, mes, dia] = sliceDate(dp).split('-').map(Number);
  return `Vale Transporte — ${dia} de ${MESES[mes - 1]} de ${ano}`;
}

// ── Gerar VT ──────────────────────────────────────────────────────────────────
document.getElementById('btn-vt').addEventListener('click', async () => {
  const data_pagamento = document.getElementById('input-vt-data').value;
  if (!data_pagamento) { mostrarErro('Selecione uma data para o VT.'); return; }
  const btn = document.getElementById('btn-vt');
  btn.disabled = true; btn.textContent = 'Gerando…';
  try {
    const dados = await api.gerarValeTransporte({ data_pagamento });
    await renderizarVT(dados);
    document.getElementById('vt-wrap').style.display = 'block';
    document.getElementById('vt-body').style.display = '';
    document.getElementById('vt-toggle-icon').textContent = '▲';
    await carregarHistoricoVT();
  } catch (err) {
    mostrarErro(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Gerar Vale Transporte';
  }
});

// ── Minimizar/expandir ────────────────────────────────────────────────────────
window.toggleVTBody = function() {
  const body = document.getElementById('vt-body');
  const icon = document.getElementById('vt-toggle-icon');
  const min = body.style.display === 'none';
  body.style.display = min ? '' : 'none';
  icon.textContent   = min ? '▲' : '▼';
};

// ── Renderizar tabela ─────────────────────────────────────────────────────────
let _vtFuncionarios = [];
let _todosFunc = [];

function vtRowHTML(f) {
  const nomeEsc = (f.funcionario_nome || '').replace(/'/g, "\\'");
  return `<tr id="vtr-${f.funcionario_id}">
    <td>${f.funcionario_nome}</td>
    <td class="mono" style="text-align:right">${fmtValor(f.vale_original)}</td>
    <td style="text-align:right;color:var(--muted)">${f.dias_desconto || 0}</td>
    <td class="mono" style="text-align:right;color:#DC2626">${fmtValor(f.desconto || 0)}</td>
    <td class="mono" style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(f.valor_pago)}</td>
    <td style="text-align:right;padding-right:12px;white-space:nowrap">
      <button onclick="editarVTRow(${f.funcionario_id})"
        style="background:none;border:1px solid #1B2D5B;color:#1B2D5B;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:6px">
        Editar
      </button>
      <button onclick="removerVTRow(${f.funcionario_id},'${nomeEsc}')"
        style="background:none;border:1px solid #DC2626;color:#DC2626;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit">
        Remover
      </button>
    </td>
  </tr>`;
}

function renderAddRow() {
  const jaNoVT = new Set(_vtFuncionarios.map(f => f.funcionario_id));
  const foraVT = _todosFunc.filter(f => !jaNoVT.has(f.id) && f.status !== 'inativo');
  if (!foraVT.length) return '';
  const iStyle = 'padding:5px 8px;border:1px solid #C8C5BE;border-radius:6px;font-size:13px;font-family:inherit';
  const opts = foraVT.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  return `<tr id="vt-add-row" style="border-top:2px dashed #E3E1DA;background:#F7F6F3">
    <td style="padding:10px 12px">
      <select id="add-vt-select" style="${iStyle};width:100%">
        <option value="">Selecione um funcionário…</option>
        ${opts}
      </select>
    </td>
    <td style="padding:10px 12px">
      <input id="add-vt-valor" type="number" min="0" step="0.01" placeholder="VT semanal (R$)"
        style="${iStyle};width:140px;text-align:right"/>
    </td>
    <td colspan="3"></td>
    <td style="padding:10px 12px;text-align:right;padding-right:12px">
      <button onclick="adicionarAoVTTabela()"
        style="background:#1B2D5B;border:none;color:#fff;border-radius:6px;padding:5px 14px;font-size:12px;cursor:pointer;font-family:inherit">
        Adicionar
      </button>
    </td>
  </tr>`;
}

function renderVTTabela() {
  document.getElementById('vt-tbody').innerHTML =
    _vtFuncionarios.map(vtRowHTML).join('') + renderAddRow();
}

function renderVTTotal() {
  const total = _vtFuncionarios.reduce((a, f) => a + (parseFloat(f.valor_pago) || 0), 0);
  document.getElementById('vt-total-wrap').innerHTML =
    `Total: <span style="margin-left:12px;font-family:var(--mono)">${fmtValor(total)}</span>`;
}

async function renderizarVT({ data_pagamento, funcionarios, total_pago }) {
  _vtFuncionarios = funcionarios;
  document.getElementById('vt-titulo').textContent = tituloVT(sliceDate(data_pagamento));
  try { _todosFunc = await api.listarFuncionarios(); } catch(_) {}
  renderVTTabela();
  renderVTTotal();
}

window.removerVTRow = async function(funcId, nome) {
  if (!confirm(`Remover "${nome}" do Vale Transporte?`)) return;
  try {
    await api.atualizarFuncionario(funcId, { vale_transporte: 0 });
    const f = _todosFunc.find(x => x.id === funcId);
    if (f) f.vale_transporte = 0;
    _vtFuncionarios = _vtFuncionarios.filter(f => f.funcionario_id !== funcId);
    renderVTTabela();
    renderVTTotal();
  } catch (err) { mostrarErro(err.message); }
};

window.adicionarAoVTTabela = async function() {
  const id = parseInt(document.getElementById('add-vt-select')?.value);
  const vt = parseFloat(document.getElementById('add-vt-valor')?.value) || 0;
  if (!id) { mostrarErro('Selecione um funcionário.'); return; }
  if (!vt) { mostrarErro('Informe o valor do VT semanal.'); return; }
  try {
    await api.atualizarFuncionario(id, { vale_transporte: vt });
    const f = _todosFunc.find(x => x.id === id);
    if (f) f.vale_transporte = vt;
    _vtFuncionarios.push({
      funcionario_id: id,
      funcionario_nome: f?.nome || '',
      vale_original: vt,
      dias_desconto: 0,
      desconto: 0,
      valor_pago: vt
    });
    renderVTTabela();
    renderVTTotal();
  } catch (err) { mostrarErro(err.message); }
};

window.editarVTRow = function(funcId) {
  const f = _vtFuncionarios.find(x => x.funcionario_id === funcId);
  if (!f) return;
  const iStyle = 'padding:4px 8px;border:1px solid #C8C5BE;border-radius:6px;font-size:13px;font-family:inherit;width:110px;text-align:right';
  document.getElementById(`vtr-${funcId}`).innerHTML = `
    <td>${f.funcionario_nome}</td>
    <td style="padding:6px 8px">
      <input id="edit-vt-row-${funcId}" type="number" min="0" step="0.01" value="${f.vale_original}" style="${iStyle}"/>
    </td>
    <td style="text-align:right;color:var(--muted)">${f.dias_desconto || 0}</td>
    <td class="mono" style="text-align:right;color:#DC2626">${fmtValor(f.desconto || 0)}</td>
    <td class="mono" style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(f.valor_pago)}</td>
    <td style="text-align:right;padding-right:12px;white-space:nowrap">
      <button onclick="salvarVTRow(${funcId})"
        style="background:#1B2D5B;border:none;color:#fff;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:6px">
        Salvar
      </button>
      <button onclick="cancelarVTRow(${funcId})"
        style="background:none;border:1px solid #C8C5BE;color:var(--muted);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit">
        Cancelar
      </button>
    </td>`;
  document.getElementById(`edit-vt-row-${funcId}`)?.focus();
};

window.cancelarVTRow = function(funcId) {
  const f = _vtFuncionarios.find(x => x.funcionario_id === funcId);
  if (!f) return;
  document.getElementById(`vtr-${funcId}`).outerHTML = vtRowHTML(f);
};

window.salvarVTRow = async function(funcId) {
  const novoVT = parseFloat(document.getElementById(`edit-vt-row-${funcId}`)?.value) || 0;
  const btn = document.querySelector(`#vtr-${funcId} button`);
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
  try {
    await api.atualizarFuncionario(funcId, { vale_transporte: novoVT });
    const idx = _vtFuncionarios.findIndex(x => x.funcionario_id === funcId);
    if (idx !== -1) _vtFuncionarios[idx] = { ..._vtFuncionarios[idx], vale_original: novoVT };
    cancelarVTRow(funcId);
  } catch (err) {
    mostrarErro(err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
  }
};

// ── Toast de erro ─────────────────────────────────────────────────────────────
let _toastTimer;
function mostrarErro(msg) {
  let el = document.getElementById('toast-erro-vt');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-erro-vt';
    el.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#DC2626;color:#fff;font-size:13px;padding:11px 22px;border-radius:8px;z-index:9100;box-shadow:0 4px 16px rgba(0,0,0,.18);max-width:420px;text-align:center';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ── Histórico VT ──────────────────────────────────────────────────────────────
async function carregarHistoricoVT() {
  const el = document.getElementById('vt-historico-lista');
  try {
    const lista = await api.listarVales();
    if (!lista || !lista.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px">Nenhum vale transporte gerado ainda.</div>';
      return;
    }
    el.innerHTML = lista.map(v => {
      const dp    = sliceDate(v.data_pagamento);
      const titulo = tituloVT(dp);
      return `
        <div class="vt-accordion" data-dp="${dp}" style="background:#fff;border:1px solid #E3E1DA;border-radius:10px;margin-bottom:10px;overflow:hidden">
          <div class="vt-acc-header" onclick="toggleVTAcc('${dp}')"
               style="padding:14px 20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none">
            <div>
              <div class="historico-data">${titulo}</div>
              <div class="historico-tipo">${v.qtd_funcionarios || '—'} funcionários</div>
            </div>
            <div style="display:flex;align-items:center;gap:14px">
              <span class="historico-total">${fmtValor(v.total_pago)}</span>
              <span class="vt-acc-icon" id="vt-icon-${dp}" style="font-size:12px;color:var(--muted);min-width:10px">▼</span>
              <button onclick="event.stopPropagation();imprimirVT('${dp}')"
                      style="background:none;border:1px solid #93C5FD;color:#1D4ED8;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:inherit">
                Imprimir
              </button>
              <button onclick="event.stopPropagation();excluirValeHistorico('${dp}')"
                      style="background:none;border:1px solid #DC2626;color:#DC2626;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:inherit">
                Apagar
              </button>
            </div>
          </div>
          <div id="vt-body-${dp}" style="display:none;border-top:1px solid #E3E1DA">
            <div style="padding:14px 20px;color:var(--muted);font-size:13px">Carregando…</div>
          </div>
        </div>`;
    }).join('');
  } catch (_) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px">Histórico não disponível.</div>';
  }
}

// ── Acordeão histórico ────────────────────────────────────────────────────────
const _accData = {};
const thS = 'padding:6px 0;font-weight:600;color:var(--muted);font-size:11px;text-transform:uppercase';

function accRowHTML(dp, f) {
  const nomeEsc = (f.funcionario_nome || '').replace(/'/g, "\\'");
  return `<tr id="accr-${dp}-${f.funcionario_id}">
    <td>${f.funcionario_nome}</td>
    <td style="text-align:right">${fmtValor(f.vale_original)}</td>
    <td style="text-align:right;color:var(--muted)">${f.dias_desconto || 0}</td>
    <td style="text-align:right;color:#DC2626">${fmtValor(f.desconto)}</td>
    <td style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(f.valor_pago)}</td>
    <td style="text-align:right;white-space:nowrap;padding-right:4px">
      <button onclick="editarAccRow('${dp}',${f.funcionario_id})"
        style="background:none;border:1px solid #1B2D5B;color:#1B2D5B;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:5px">Editar</button>
      <button onclick="removerAccRow('${dp}',${f.funcionario_id},'${nomeEsc}')"
        style="background:none;border:1px solid #DC2626;color:#DC2626;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;font-family:inherit">Remover</button>
    </td>
  </tr>`;
}

function renderAccAddRow(dp) {
  const jaNoVT = new Set((_accData[dp] || []).map(f => f.funcionario_id));
  const foraVT = _todosFunc.filter(f => !jaNoVT.has(f.id) && f.status !== 'inativo');
  if (!foraVT.length) return '';
  const iS = 'padding:5px 8px;border:1px solid #C8C5BE;border-radius:6px;font-size:13px;font-family:inherit';
  const opts = foraVT.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  return `<tr style="border-top:2px dashed #E3E1DA;background:#F7F6F3">
    <td style="padding:9px 8px"><select id="acc-add-sel-${dp}" style="${iS};width:100%"><option value="">Selecione…</option>${opts}</select></td>
    <td style="padding:9px 8px"><input id="acc-add-vt-${dp}" type="number" min="0" step="0.01" placeholder="VT semanal (R$)" style="${iS};width:130px;text-align:right"/></td>
    <td colspan="3"></td>
    <td style="padding:9px 4px;text-align:right">
      <button onclick="adicionarAccRow('${dp}')"
        style="background:#1B2D5B;border:none;color:#fff;border-radius:6px;padding:5px 13px;font-size:12px;cursor:pointer;font-family:inherit">Adicionar</button>
    </td>
  </tr>`;
}

function renderAccRows(dp) {
  const tbody = document.getElementById(`acc-tbody-${dp}`);
  if (!tbody) return;
  tbody.innerHTML = (_accData[dp] || []).map(f => accRowHTML(dp, f)).join('') + renderAccAddRow(dp);
}

function renderAccTotal(dp) {
  const total = (_accData[dp] || []).reduce((a, f) => a + (parseFloat(f.valor_pago) || 0), 0);
  const el = document.getElementById(`acc-total-${dp}`);
  if (el) el.textContent = fmtValor(total);
}

function renderAccTabela(dp) {
  const body = document.getElementById(`vt-body-${dp}`);
  body.innerHTML = `<div style="padding:0 20px 14px">
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px">
      <thead><tr style="border-bottom:1px solid #E3E1DA">
        <th style="${thS};text-align:left">Funcionário</th>
        <th style="${thS};text-align:right">VT semanal</th>
        <th style="${thS};text-align:right">Dias falta</th>
        <th style="${thS};text-align:right">Desconto</th>
        <th style="${thS};text-align:right">Valor pago</th>
        <th></th>
      </tr></thead>
      <tbody id="acc-tbody-${dp}"></tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;padding:8px 0;font-weight:600;font-size:14px;color:var(--navy)">
      Total: <span style="margin-left:12px;font-family:var(--mono)" id="acc-total-${dp}">—</span>
    </div>
  </div>`;
  renderAccRows(dp);
  renderAccTotal(dp);
}

window.toggleVTAcc = async function(dp) {
  const body = document.getElementById(`vt-body-${dp}`);
  const icon = document.getElementById(`vt-icon-${dp}`);
  if (!body) return;
  const aberto = body.style.display !== 'none';
  if (aberto) { body.style.display = 'none'; icon.textContent = '▼'; return; }
  body.style.display = 'block';
  icon.textContent = '▲';
  if (body.dataset.carregado) return;
  body.innerHTML = '<div style="padding:14px 20px;color:var(--muted);font-size:13px">Carregando…</div>';
  try {
    const dados = await api.buscarVale(dp);
    if (!_todosFunc.length) { try { _todosFunc = await api.listarFuncionarios(); } catch(_) {} }
    _accData[dp] = dados.funcionarios;
    body.dataset.carregado = '1';
    renderAccTabela(dp);
  } catch (err) {
    body.innerHTML = `<div style="padding:14px 20px;color:#DC2626;font-size:13px">Erro ao carregar detalhes.</div>`;
  }
};

window.editarAccRow = function(dp, funcId) {
  const f = (_accData[dp] || []).find(x => x.funcionario_id === funcId);
  if (!f) return;
  const iS = 'padding:4px 8px;border:1px solid #C8C5BE;border-radius:6px;font-size:13px;font-family:inherit;width:110px;text-align:right';
  document.getElementById(`accr-${dp}-${funcId}`).innerHTML = `
    <td>${f.funcionario_nome}</td>
    <td style="padding:5px 6px"><input id="acc-edit-vt-${dp}-${funcId}" type="number" min="0" step="0.01" value="${f.vale_original}" style="${iS}"/></td>
    <td style="text-align:right;color:var(--muted)">${f.dias_desconto || 0}</td>
    <td style="text-align:right;color:#DC2626">${fmtValor(f.desconto)}</td>
    <td style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(f.valor_pago)}</td>
    <td style="text-align:right;white-space:nowrap;padding-right:4px">
      <button onclick="salvarAccRow('${dp}',${funcId})"
        style="background:#1B2D5B;border:none;color:#fff;border-radius:6px;padding:3px 11px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:5px">Salvar</button>
      <button onclick="cancelarAccRow('${dp}',${funcId})"
        style="background:none;border:1px solid #C8C5BE;color:var(--muted);border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;font-family:inherit">Cancelar</button>
    </td>`;
  document.getElementById(`acc-edit-vt-${dp}-${funcId}`)?.focus();
};

window.cancelarAccRow = function(dp, funcId) {
  const f = (_accData[dp] || []).find(x => x.funcionario_id === funcId);
  if (!f) return;
  document.getElementById(`accr-${dp}-${funcId}`).outerHTML = accRowHTML(dp, f);
};

window.salvarAccRow = async function(dp, funcId) {
  const novoVT = parseFloat(document.getElementById(`acc-edit-vt-${dp}-${funcId}`)?.value) || 0;
  const btn = document.querySelector(`#accr-${dp}-${funcId} button`);
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
  try {
    await api.atualizarFuncionario(funcId, { vale_transporte: novoVT });
    const idx = (_accData[dp] || []).findIndex(x => x.funcionario_id === funcId);
    if (idx !== -1) _accData[dp][idx].vale_original = novoVT;
    cancelarAccRow(dp, funcId);
  } catch (err) {
    mostrarErro(err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
  }
};

window.removerAccRow = async function(dp, funcId, nome) {
  if (!confirm(`Remover "${nome}" do Vale Transporte?`)) return;
  try {
    await api.atualizarFuncionario(funcId, { vale_transporte: 0 });
    const f = _todosFunc.find(x => x.id === funcId);
    if (f) f.vale_transporte = 0;
    if (_accData[dp]) _accData[dp] = _accData[dp].filter(x => x.funcionario_id !== funcId);
    renderAccRows(dp);
    renderAccTotal(dp);
  } catch (err) { mostrarErro(err.message); }
};

window.adicionarAccRow = async function(dp) {
  const id = parseInt(document.getElementById(`acc-add-sel-${dp}`)?.value);
  const vt = parseFloat(document.getElementById(`acc-add-vt-${dp}`)?.value) || 0;
  if (!id) { mostrarErro('Selecione um funcionário.'); return; }
  if (!vt) { mostrarErro('Informe o valor do VT semanal.'); return; }
  try {
    await api.atualizarFuncionario(id, { vale_transporte: vt });
    const f = _todosFunc.find(x => x.id === id);
    if (f) f.vale_transporte = vt;
    if (!_accData[dp]) _accData[dp] = [];
    _accData[dp].push({ funcionario_id: id, funcionario_nome: f?.nome || '', vale_original: vt, dias_desconto: 0, desconto: 0, valor_pago: vt });
    renderAccRows(dp);
    renderAccTotal(dp);
  } catch (err) { mostrarErro(err.message); }
};

window.excluirValeHistorico = async function(data) {
  if (!confirm(`Apagar o vale de ${tituloVT(data).replace('Vale Transporte — ', '')}?`)) return;
  try {
    await api.excluirVale(data);
    await carregarHistoricoVT();
  } catch (err) {
    mostrarErro(err.message);
  }
};

// ── Impressão do Vale Transporte ──────────────────────────────────────────────
window.imprimirVT = async function(dp) {
  let dados;
  try { dados = await api.buscarVale(dp); }
  catch (err) { mostrarErro('Erro ao carregar vale: ' + err.message); return; }

  const { funcionarios, total_pago } = dados;
  const titulo = tituloVT(dp);
  const dataImpressao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const tbody = funcionarios.map(f => `<tr>
    <td>${f.funcionario_nome}</td>
    <td>${fmtValor(f.vale_original)}</td>
    <td>${f.dias_desconto || 0}</td>
    <td style="color:#DC2626">${fmtValor(f.desconto || 0)}</td>
    <td class="destaque">${fmtValor(f.valor_pago)}</td>
    <td class="assinatura-cell"></td>
  </tr>`).join('');

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
    th.assinatura-th{width:160px}
    td{padding:5px 8px;text-align:right;border-bottom:1px solid #E3E1DA;font-size:10.5px}
    td:first-child{text-align:left;font-weight:500}
    tr:nth-child(even) td{background:#F8F7F4}
    td.destaque{font-weight:700;color:#1B2D5B}
    td.assinatura-cell{border-bottom:1px solid #555;height:28px;width:160px}
    .totais{display:flex;justify-content:flex-end;gap:20px;background:#EFF6FF;border-radius:6px;padding:9px 14px;font-size:12px;margin-bottom:16px}
    .totais strong{color:#1B2D5B}
    .rodape{margin-top:24px;border-top:1px solid #E3E1DA;padding-top:6px;font-size:9px;color:#aaa;display:flex;justify-content:space-between}
    @media print{@page{margin:14mm}body{padding:0}}
  </style></head><body>
  <div class="cab">
    <div class="empresa">Hidrauldiesel<small>Sistema de Gestão</small></div>
    <div class="doc-info"><div class="doc-titulo">${titulo}</div><div class="doc-data">Impresso em ${dataImpressao}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Funcionário</th>
      <th>VT semanal</th>
      <th>Dias falta</th>
      <th>Desconto</th>
      <th>Valor pago</th>
      <th class="assinatura-th">Assinatura</th>
    </tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <div class="totais"><div>Total pago: <strong>${fmtValor(total_pago)}</strong></div></div>
  <div class="rodape"><span>Hidrauldiesel — documento gerado pelo sistema</span><span>${titulo}</span></div>
  <script>window.onload=()=>window.print()<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
};

carregarHistoricoVT();

// ══════════════════════════════════════════════════════════════════════════════
// VALE ALIMENTAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

function tituloVA(dp) {
  const [ano, mes, dia] = sliceDate(dp).split('-').map(Number);
  return `Vale Alimentação — ${dia} de ${MESES[mes - 1]} de ${ano}`;
}

// ── Trocar tab ────────────────────────────────────────────────────────────────
window.switchTab = function(tab) {
  document.getElementById('tab-vt-content').style.display = tab === 'vt' ? '' : 'none';
  document.getElementById('tab-va-content').style.display = tab === 'va' ? '' : 'none';
  document.getElementById('header-actions-vt').style.display = tab === 'vt' ? '' : 'none';
  document.getElementById('header-actions-va').style.display = tab === 'va' ? '' : 'none';
  document.getElementById('tab-btn-vt').classList.toggle('active', tab === 'vt');
  document.getElementById('tab-btn-va').classList.toggle('active', tab === 'va');
};

// ── Gerar VA ──────────────────────────────────────────────────────────────────
document.getElementById('btn-va').addEventListener('click', async () => {
  const data_pagamento = document.getElementById('input-va-data').value;
  if (!data_pagamento) { mostrarErro('Selecione uma data para o VA.'); return; }
  const btn = document.getElementById('btn-va');
  btn.disabled = true; btn.textContent = 'Gerando…';
  try {
    const dados = await api.gerarValeAlimentacao({ data_pagamento });
    await renderizarVA(dados);
    document.getElementById('va-wrap').style.display = 'block';
    document.getElementById('va-body').style.display = '';
    document.getElementById('va-toggle-icon').textContent = '▲';
    await carregarHistoricoVA();
  } catch (err) {
    mostrarErro(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Gerar Vale Alimentação';
  }
});

// ── Minimizar/expandir VA ─────────────────────────────────────────────────────
window.toggleVABody = function() {
  const body = document.getElementById('va-body');
  const icon = document.getElementById('va-toggle-icon');
  const min = body.style.display === 'none';
  body.style.display = min ? '' : 'none';
  icon.textContent   = min ? '▲' : '▼';
};

// ── Renderizar tabela VA ──────────────────────────────────────────────────────
let _vaFuncionarios = [];
let _todosFuncVA = [];

function vaRowHTML(f) {
  const nomeEsc = (f.funcionario_nome || '').replace(/'/g, "\\'");
  return `<tr id="var-${f.funcionario_id}">
    <td>${f.funcionario_nome}</td>
    <td class="mono" style="text-align:right">${fmtValor(f.vale_original)}</td>
    <td style="text-align:right;color:var(--muted)">${f.dias_desconto || 0}</td>
    <td class="mono" style="text-align:right;color:#DC2626">${fmtValor(f.desconto || 0)}</td>
    <td class="mono" style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(f.valor_pago)}</td>
    <td style="text-align:right;padding-right:12px;white-space:nowrap">
      <button onclick="editarVARow(${f.funcionario_id})"
        style="background:none;border:1px solid #1B2D5B;color:#1B2D5B;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:6px">
        Editar
      </button>
      <button onclick="removerVARow(${f.funcionario_id},'${nomeEsc}')"
        style="background:none;border:1px solid #DC2626;color:#DC2626;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit">
        Remover
      </button>
    </td>
  </tr>`;
}

function renderVAAddRow() {
  const jaNoVA = new Set(_vaFuncionarios.map(f => f.funcionario_id));
  const foraVA = _todosFuncVA.filter(f => !jaNoVA.has(f.id) && f.status !== 'inativo');
  if (!foraVA.length) return '';
  const iStyle = 'padding:5px 8px;border:1px solid #C8C5BE;border-radius:6px;font-size:13px;font-family:inherit';
  const opts = foraVA.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  return `<tr id="va-add-row" style="border-top:2px dashed #E3E1DA;background:#F7F6F3">
    <td style="padding:10px 12px">
      <select id="add-va-select" style="${iStyle};width:100%">
        <option value="">Selecione um funcionário…</option>
        ${opts}
      </select>
    </td>
    <td style="padding:10px 12px">
      <input id="add-va-valor" type="number" min="0" step="0.01" placeholder="VA semanal (R$)"
        style="${iStyle};width:140px;text-align:right"/>
    </td>
    <td colspan="3"></td>
    <td style="padding:10px 12px;text-align:right;padding-right:12px">
      <button onclick="adicionarAoVATabela()"
        style="background:#1B2D5B;border:none;color:#fff;border-radius:6px;padding:5px 14px;font-size:12px;cursor:pointer;font-family:inherit">
        Adicionar
      </button>
    </td>
  </tr>`;
}

function renderVATabela() {
  document.getElementById('va-tbody').innerHTML =
    _vaFuncionarios.map(vaRowHTML).join('') + renderVAAddRow();
}

function renderVATotal() {
  const total = _vaFuncionarios.reduce((a, f) => a + (parseFloat(f.valor_pago) || 0), 0);
  document.getElementById('va-total-wrap').innerHTML =
    `Total: <span style="margin-left:12px;font-family:var(--mono)">${fmtValor(total)}</span>`;
}

async function renderizarVA({ data_pagamento, funcionarios }) {
  _vaFuncionarios = funcionarios;
  document.getElementById('va-titulo').textContent = tituloVA(sliceDate(data_pagamento));
  try { _todosFuncVA = await api.listarFuncionarios(); } catch(_) {}
  renderVATabela();
  renderVATotal();
}

window.removerVARow = async function(funcId, nome) {
  if (!confirm(`Remover "${nome}" do Vale Alimentação?`)) return;
  try {
    await api.atualizarFuncionario(funcId, { vale_alimentacao: 0 });
    const f = _todosFuncVA.find(x => x.id === funcId);
    if (f) f.vale_alimentacao = 0;
    _vaFuncionarios = _vaFuncionarios.filter(f => f.funcionario_id !== funcId);
    renderVATabela();
    renderVATotal();
  } catch (err) { mostrarErro(err.message); }
};

window.adicionarAoVATabela = async function() {
  const id = parseInt(document.getElementById('add-va-select')?.value);
  const va = parseFloat(document.getElementById('add-va-valor')?.value) || 0;
  if (!id) { mostrarErro('Selecione um funcionário.'); return; }
  if (!va) { mostrarErro('Informe o valor do VA semanal.'); return; }
  try {
    await api.atualizarFuncionario(id, { vale_alimentacao: va });
    const f = _todosFuncVA.find(x => x.id === id);
    if (f) f.vale_alimentacao = va;
    _vaFuncionarios.push({
      funcionario_id: id,
      funcionario_nome: f?.nome || '',
      vale_original: va,
      dias_desconto: 0,
      desconto: 0,
      valor_pago: va
    });
    renderVATabela();
    renderVATotal();
  } catch (err) { mostrarErro(err.message); }
};

window.editarVARow = function(funcId) {
  const f = _vaFuncionarios.find(x => x.funcionario_id === funcId);
  if (!f) return;
  const iStyle = 'padding:4px 8px;border:1px solid #C8C5BE;border-radius:6px;font-size:13px;font-family:inherit;width:110px;text-align:right';
  document.getElementById(`var-${funcId}`).innerHTML = `
    <td>${f.funcionario_nome}</td>
    <td style="padding:6px 8px">
      <input id="edit-va-row-${funcId}" type="number" min="0" step="0.01" value="${f.vale_original}" style="${iStyle}"/>
    </td>
    <td style="text-align:right;color:var(--muted)">${f.dias_desconto || 0}</td>
    <td class="mono" style="text-align:right;color:#DC2626">${fmtValor(f.desconto || 0)}</td>
    <td class="mono" style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(f.valor_pago)}</td>
    <td style="text-align:right;padding-right:12px;white-space:nowrap">
      <button onclick="salvarVARow(${funcId})"
        style="background:#1B2D5B;border:none;color:#fff;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:6px">
        Salvar
      </button>
      <button onclick="cancelarVARow(${funcId})"
        style="background:none;border:1px solid #C8C5BE;color:var(--muted);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit">
        Cancelar
      </button>
    </td>`;
  document.getElementById(`edit-va-row-${funcId}`)?.focus();
};

window.cancelarVARow = function(funcId) {
  const f = _vaFuncionarios.find(x => x.funcionario_id === funcId);
  if (!f) return;
  document.getElementById(`var-${funcId}`).outerHTML = vaRowHTML(f);
};

window.salvarVARow = async function(funcId) {
  const novoVA = parseFloat(document.getElementById(`edit-va-row-${funcId}`)?.value) || 0;
  const btn = document.querySelector(`#var-${funcId} button`);
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
  try {
    await api.atualizarFuncionario(funcId, { vale_alimentacao: novoVA });
    const idx = _vaFuncionarios.findIndex(x => x.funcionario_id === funcId);
    if (idx !== -1) _vaFuncionarios[idx] = { ..._vaFuncionarios[idx], vale_original: novoVA };
    cancelarVARow(funcId);
  } catch (err) {
    mostrarErro(err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
  }
};

// ── Histórico VA ──────────────────────────────────────────────────────────────
async function carregarHistoricoVA() {
  const el = document.getElementById('va-historico-lista');
  try {
    const lista = await api.listarValesAlimentacao();
    if (!lista || !lista.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px">Nenhum vale alimentação gerado ainda.</div>';
      return;
    }
    el.innerHTML = lista.map(v => {
      const dp    = sliceDate(v.data_pagamento);
      const titulo = tituloVA(dp);
      return `
        <div style="background:#fff;border:1px solid #E3E1DA;border-radius:10px;margin-bottom:10px;overflow:hidden">
          <div onclick="toggleVAAcc('${dp}')"
               style="padding:14px 20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none">
            <div>
              <div class="historico-data">${titulo}</div>
              <div class="historico-tipo">${v.qtd_funcionarios || '—'} funcionários</div>
            </div>
            <div style="display:flex;align-items:center;gap:14px">
              <span class="historico-total">${fmtValor(v.total_pago)}</span>
              <span id="va-icon-${dp}" style="font-size:12px;color:var(--muted);min-width:10px">▼</span>
              <button onclick="event.stopPropagation();imprimirVA('${dp}')"
                      style="background:none;border:1px solid #93C5FD;color:#1D4ED8;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:inherit">
                Imprimir
              </button>
              <button onclick="event.stopPropagation();excluirVAHistorico('${dp}')"
                      style="background:none;border:1px solid #DC2626;color:#DC2626;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:inherit">
                Apagar
              </button>
            </div>
          </div>
          <div id="va-body-${dp}" style="display:none;border-top:1px solid #E3E1DA">
            <div style="padding:14px 20px;color:var(--muted);font-size:13px">Carregando…</div>
          </div>
        </div>`;
    }).join('');
  } catch (_) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px">Histórico não disponível.</div>';
  }
}

// ── Acordeão histórico VA ─────────────────────────────────────────────────────
const _accDataVA = {};

function accRowVAHTML(dp, f) {
  const nomeEsc = (f.funcionario_nome || '').replace(/'/g, "\\'");
  return `<tr id="accva-${dp}-${f.funcionario_id}">
    <td>${f.funcionario_nome}</td>
    <td style="text-align:right">${fmtValor(f.vale_original)}</td>
    <td style="text-align:right;color:var(--muted)">${f.dias_desconto || 0}</td>
    <td style="text-align:right;color:#DC2626">${fmtValor(f.desconto)}</td>
    <td style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(f.valor_pago)}</td>
    <td style="text-align:right;white-space:nowrap;padding-right:4px">
      <button onclick="editarAccVARow('${dp}',${f.funcionario_id})"
        style="background:none;border:1px solid #1B2D5B;color:#1B2D5B;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:5px">Editar</button>
      <button onclick="removerAccVARow('${dp}',${f.funcionario_id},'${nomeEsc}')"
        style="background:none;border:1px solid #DC2626;color:#DC2626;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;font-family:inherit">Remover</button>
    </td>
  </tr>`;
}

function renderAccVAAddRow(dp) {
  const jaNoVA = new Set((_accDataVA[dp] || []).map(f => f.funcionario_id));
  const foraVA = _todosFuncVA.filter(f => !jaNoVA.has(f.id) && f.status !== 'inativo');
  if (!foraVA.length) return '';
  const iS = 'padding:5px 8px;border:1px solid #C8C5BE;border-radius:6px;font-size:13px;font-family:inherit';
  const opts = foraVA.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  return `<tr style="border-top:2px dashed #E3E1DA;background:#F7F6F3">
    <td style="padding:9px 8px"><select id="acc-add-va-sel-${dp}" style="${iS};width:100%"><option value="">Selecione…</option>${opts}</select></td>
    <td style="padding:9px 8px"><input id="acc-add-va-val-${dp}" type="number" min="0" step="0.01" placeholder="VA semanal (R$)" style="${iS};width:130px;text-align:right"/></td>
    <td colspan="3"></td>
    <td style="padding:9px 4px;text-align:right">
      <button onclick="adicionarAccVARow('${dp}')"
        style="background:#1B2D5B;border:none;color:#fff;border-radius:6px;padding:5px 13px;font-size:12px;cursor:pointer;font-family:inherit">Adicionar</button>
    </td>
  </tr>`;
}

function renderAccVARows(dp) {
  const tbody = document.getElementById(`accva-tbody-${dp}`);
  if (!tbody) return;
  tbody.innerHTML = (_accDataVA[dp] || []).map(f => accRowVAHTML(dp, f)).join('') + renderAccVAAddRow(dp);
}

function renderAccVATotal(dp) {
  const total = (_accDataVA[dp] || []).reduce((a, f) => a + (parseFloat(f.valor_pago) || 0), 0);
  const el = document.getElementById(`accva-total-${dp}`);
  if (el) el.textContent = fmtValor(total);
}

function renderAccVATabela(dp) {
  const body = document.getElementById(`va-body-${dp}`);
  body.innerHTML = `<div style="padding:0 20px 14px">
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px">
      <thead><tr style="border-bottom:1px solid #E3E1DA">
        <th style="${thS};text-align:left">Funcionário</th>
        <th style="${thS};text-align:right">VA semanal</th>
        <th style="${thS};text-align:right">Dias falta</th>
        <th style="${thS};text-align:right">Desconto</th>
        <th style="${thS};text-align:right">Valor pago</th>
        <th></th>
      </tr></thead>
      <tbody id="accva-tbody-${dp}"></tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;padding:8px 0;font-weight:600;font-size:14px;color:var(--navy)">
      Total: <span style="margin-left:12px;font-family:var(--mono)" id="accva-total-${dp}">—</span>
    </div>
  </div>`;
  renderAccVARows(dp);
  renderAccVATotal(dp);
}

window.toggleVAAcc = async function(dp) {
  const body = document.getElementById(`va-body-${dp}`);
  const icon = document.getElementById(`va-icon-${dp}`);
  if (!body) return;
  const aberto = body.style.display !== 'none';
  if (aberto) { body.style.display = 'none'; icon.textContent = '▼'; return; }
  body.style.display = 'block';
  icon.textContent = '▲';
  if (body.dataset.carregado) return;
  body.innerHTML = '<div style="padding:14px 20px;color:var(--muted);font-size:13px">Carregando…</div>';
  try {
    const dados = await api.buscarValeAlimentacao(dp);
    if (!_todosFuncVA.length) { try { _todosFuncVA = await api.listarFuncionarios(); } catch(_) {} }
    _accDataVA[dp] = dados.funcionarios;
    body.dataset.carregado = '1';
    renderAccVATabela(dp);
  } catch (err) {
    body.innerHTML = `<div style="padding:14px 20px;color:#DC2626;font-size:13px">Erro ao carregar detalhes.</div>`;
  }
};

window.editarAccVARow = function(dp, funcId) {
  const f = (_accDataVA[dp] || []).find(x => x.funcionario_id === funcId);
  if (!f) return;
  const iS = 'padding:4px 8px;border:1px solid #C8C5BE;border-radius:6px;font-size:13px;font-family:inherit;width:110px;text-align:right';
  document.getElementById(`accva-${dp}-${funcId}`).innerHTML = `
    <td>${f.funcionario_nome}</td>
    <td style="padding:5px 6px"><input id="acc-edit-va-${dp}-${funcId}" type="number" min="0" step="0.01" value="${f.vale_original}" style="${iS}"/></td>
    <td style="text-align:right;color:var(--muted)">${f.dias_desconto || 0}</td>
    <td style="text-align:right;color:#DC2626">${fmtValor(f.desconto)}</td>
    <td style="text-align:right;font-weight:600;color:var(--navy)">${fmtValor(f.valor_pago)}</td>
    <td style="text-align:right;white-space:nowrap;padding-right:4px">
      <button onclick="salvarAccVARow('${dp}',${funcId})"
        style="background:#1B2D5B;border:none;color:#fff;border-radius:6px;padding:3px 11px;font-size:12px;cursor:pointer;font-family:inherit;margin-right:5px">Salvar</button>
      <button onclick="cancelarAccVARow('${dp}',${funcId})"
        style="background:none;border:1px solid #C8C5BE;color:var(--muted);border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer;font-family:inherit">Cancelar</button>
    </td>`;
  document.getElementById(`acc-edit-va-${dp}-${funcId}`)?.focus();
};

window.cancelarAccVARow = function(dp, funcId) {
  const f = (_accDataVA[dp] || []).find(x => x.funcionario_id === funcId);
  if (!f) return;
  document.getElementById(`accva-${dp}-${funcId}`).outerHTML = accRowVAHTML(dp, f);
};

window.salvarAccVARow = async function(dp, funcId) {
  const novoVA = parseFloat(document.getElementById(`acc-edit-va-${dp}-${funcId}`)?.value) || 0;
  const btn = document.querySelector(`#accva-${dp}-${funcId} button`);
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
  try {
    await api.atualizarFuncionario(funcId, { vale_alimentacao: novoVA });
    const idx = (_accDataVA[dp] || []).findIndex(x => x.funcionario_id === funcId);
    if (idx !== -1) _accDataVA[dp][idx].vale_original = novoVA;
    cancelarAccVARow(dp, funcId);
  } catch (err) {
    mostrarErro(err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
  }
};

window.removerAccVARow = async function(dp, funcId, nome) {
  if (!confirm(`Remover "${nome}" do Vale Alimentação?`)) return;
  try {
    await api.atualizarFuncionario(funcId, { vale_alimentacao: 0 });
    const f = _todosFuncVA.find(x => x.id === funcId);
    if (f) f.vale_alimentacao = 0;
    if (_accDataVA[dp]) _accDataVA[dp] = _accDataVA[dp].filter(x => x.funcionario_id !== funcId);
    renderAccVARows(dp);
    renderAccVATotal(dp);
  } catch (err) { mostrarErro(err.message); }
};

window.adicionarAccVARow = async function(dp) {
  const id = parseInt(document.getElementById(`acc-add-va-sel-${dp}`)?.value);
  const va = parseFloat(document.getElementById(`acc-add-va-val-${dp}`)?.value) || 0;
  if (!id) { mostrarErro('Selecione um funcionário.'); return; }
  if (!va) { mostrarErro('Informe o valor do VA semanal.'); return; }
  try {
    await api.atualizarFuncionario(id, { vale_alimentacao: va });
    const f = _todosFuncVA.find(x => x.id === id);
    if (f) f.vale_alimentacao = va;
    if (!_accDataVA[dp]) _accDataVA[dp] = [];
    _accDataVA[dp].push({ funcionario_id: id, funcionario_nome: f?.nome || '', vale_original: va, dias_desconto: 0, desconto: 0, valor_pago: va });
    renderAccVARows(dp);
    renderAccVATotal(dp);
  } catch (err) { mostrarErro(err.message); }
};

window.excluirVAHistorico = async function(data) {
  if (!confirm(`Apagar o vale de ${tituloVA(data).replace('Vale Alimentação — ', '')}?`)) return;
  try {
    await api.excluirValeAlimentacao(data);
    await carregarHistoricoVA();
  } catch (err) {
    mostrarErro(err.message);
  }
};

// ── Impressão do Vale Alimentação ─────────────────────────────────────────────
window.imprimirVA = async function(dp) {
  let dados;
  try { dados = await api.buscarValeAlimentacao(dp); }
  catch (err) { mostrarErro('Erro ao carregar vale: ' + err.message); return; }

  const { funcionarios, total_pago } = dados;
  const titulo = tituloVA(dp);
  const dataImpressao = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const tbody = funcionarios.map(f => `<tr>
    <td>${f.funcionario_nome}</td>
    <td>${fmtValor(f.vale_original)}</td>
    <td>${f.dias_desconto || 0}</td>
    <td style="color:#DC2626">${fmtValor(f.desconto || 0)}</td>
    <td class="destaque">${fmtValor(f.valor_pago)}</td>
    <td class="assinatura-cell"></td>
  </tr>`).join('');

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
    th.assinatura-th{width:160px}
    td{padding:5px 8px;text-align:right;border-bottom:1px solid #E3E1DA;font-size:10.5px}
    td:first-child{text-align:left;font-weight:500}
    tr:nth-child(even) td{background:#F8F7F4}
    td.destaque{font-weight:700;color:#1B2D5B}
    td.assinatura-cell{border-bottom:1px solid #555;height:28px;width:160px}
    .totais{display:flex;justify-content:flex-end;gap:20px;background:#EFF6FF;border-radius:6px;padding:9px 14px;font-size:12px;margin-bottom:16px}
    .totais strong{color:#1B2D5B}
    .rodape{margin-top:24px;border-top:1px solid #E3E1DA;padding-top:6px;font-size:9px;color:#aaa;display:flex;justify-content:space-between}
    @media print{@page{margin:14mm}body{padding:0}}
  </style></head><body>
  <div class="cab">
    <div class="empresa">Hidrauldiesel<small>Sistema de Gestão</small></div>
    <div class="doc-info"><div class="doc-titulo">${titulo}</div><div class="doc-data">Impresso em ${dataImpressao}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Funcionário</th>
      <th>VA semanal</th>
      <th>Dias falta</th>
      <th>Desconto</th>
      <th>Valor pago</th>
      <th class="assinatura-th">Assinatura</th>
    </tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <div class="totais"><div>Total pago: <strong>${fmtValor(total_pago)}</strong></div></div>
  <div class="rodape"><span>Hidrauldiesel — documento gerado pelo sistema</span><span>${titulo}</span></div>
  <script>window.onload=()=>window.print()<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
};

carregarHistoricoVA();
