const fmtValor = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Estado
let _funcionarios = [];
let _pontoMap = {};
let _justMap  = {};
let _mes, _ano;

const CICLO = ['presente', 'meia_falta', 'falta', 'falta_justificada'];
const EMOJI = { presente: '✅', meia_falta: '🟡', falta: '❌', falta_justificada: '🔵' };

// Retorna true se d2 é o próximo dia útil imediato de d1 (considera sexta→segunda)
function adjacentWorkingDay(d1Str, d2Str) {
  const d1 = new Date(d1Str + 'T12:00:00'), d2 = new Date(d2Str + 'T12:00:00');
  const diff = Math.round((d2 - d1) / 86400000);
  return diff === 1 || (diff === 3 && d1.getDay() === 5);
}

// Calcula dias de desconto aplicando regra DSR:
// falta isolada (sem falta adjacente) = 2 dias; falta corrida = 1 dia; meia falta = 1; justificada = 0
function calcDiasDesconto(funcId, diasNoMes, ano, mes) {
  const pad = n => String(n).padStart(2, '0');
  const faltaDates = [];
  for (let d = 1; d <= diasNoMes; d++) {
    const ds = `${ano}-${pad(mes)}-${pad(d)}`;
    if ((_pontoMap[`${funcId}_${ds}`] || 'presente') === 'falta') faltaDates.push(ds);
  }
  let total = 0;
  for (let d = 1; d <= diasNoMes; d++) {
    const ds = `${ano}-${pad(mes)}-${pad(d)}`;
    const s = _pontoMap[`${funcId}_${ds}`] || 'presente';
    if (s === 'meia_falta') {
      total += 1;
    } else if (s === 'falta') {
      const i = faltaDates.indexOf(ds);
      const temAnterior = i > 0 && adjacentWorkingDay(faltaDates[i - 1], ds);
      const temProxima  = i < faltaDates.length - 1 && adjacentWorkingDay(ds, faltaDates[i + 1]);
      total += (temAnterior || temProxima) ? 1 : 2;
    }
    // falta_justificada: 0
  }
  return total;
}

// Mês atual
const inputMes = document.getElementById('input-mes');
const hoje = new Date();
inputMes.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

document.getElementById('btn-carregar').addEventListener('click', () => {
  const [a, m] = inputMes.value.split('-').map(Number);
  _ano = a; _mes = m;
  carregarPonto(m, a);
});

// Auto-carregar mês atual ao abrir a página
(function() {
  const [a, m] = inputMes.value.split('-').map(Number);
  _ano = a; _mes = m;
  carregarPonto(m, a);
})();

async function carregarPonto(mes, ano) {
  const container = document.getElementById('ponto-container');
  container.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:32px;text-align:center">Carregando…</div>';
  try {
    const dados = await api.buscarPontoMes(mes, ano);
    _funcionarios = dados.funcionarios;
    _pontoMap = dados.ponto;
    _justMap  = dados.justificativas || {};
    renderizarGrade(mes, ano);
  } catch (err) {
    container.innerHTML = `<div style="color:#DC2626;font-size:13px;padding:32px;text-align:center">${err.message}</div>`;
  }
}

function calcularValorDesconto(func, diasDesconto) {
  const salarioTotal = (parseFloat(func.salario_oficial) || 0) + (parseFloat(func.salario_adicional) || 0);
  return (salarioTotal / 30) * diasDesconto;
}

function renderizarGrade(mes, ano) {
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const container = document.getElementById('ponto-container');

  // Cabeçalho de dias
  let thead = '<thead><tr><th>Funcionário</th>';
  for (let d = 1; d <= diasNoMes; d++) {
    const dow = new Date(ano, mes - 1, d).getDay();
    const fds = dow === 0 || dow === 6;
    const nomeDia = ['D','S','T','Q','Q','S','S'][dow];
    thead += `<th class="${fds ? 'fim-semana' : ''}">${d}<br><span style="font-size:9px;opacity:.6">${nomeDia}</span></th>`;
  }
  thead += '<th>Desconto (R$)</th></tr></thead>';

  // Linhas por funcionário
  let tbody = '<tbody>';
  for (const f of _funcionarios) {
    let row = `<tr><td>${f.nome}</td>`;

    for (let d = 1; d <= diasNoMes; d++) {
      const dow = new Date(ano, mes - 1, d).getDay();
      const fds = dow === 0 || dow === 6;
      const dataStr = `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const status = _pontoMap[`${f.id}_${dataStr}`] || 'presente';

      if (fds) {
        row += `<td class="fim-semana"><div class="cel-ponto fim-semana">—</div></td>`;
      } else {
        const chave = `${f.id}_${dataStr}`;
        const just  = _justMap[chave] || '';
        const title = status === 'falta_justificada' && just ? just : dataStr;
        const ind   = status === 'falta_justificada' && just
          ? `<span style="display:block;font-size:7px;line-height:1.1;color:#1D4ED8;max-width:28px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${just}</span>` : '';
        row += `<td><div class="cel-ponto ${status}" data-func="${f.id}" data-data="${dataStr}" title="${title}">${EMOJI[status]}${ind}</div></td>`;
      }
    }

    const diasDesconto = calcDiasDesconto(f.id, diasNoMes, ano, mes);
    const valorDesconto = calcularValorDesconto(f, diasDesconto);
    row += `<td class="cel-total ${diasDesconto > 0 ? 'tem-desconto' : ''}">${diasDesconto > 0 ? fmtValor(valorDesconto) : '—'}</td>`;
    row += '</tr>';
    tbody += row;
  }
  tbody += '</tbody>';

  container.innerHTML = `<table class="ponto-table">${thead}${tbody}</table>`;

  // Bind cliques
  container.querySelectorAll('.cel-ponto:not(.fim-semana)').forEach(cel => {
    cel.addEventListener('click', () => alternarPonto(cel));
  });
}

function _mostrarDialogJustificativa(cel, justAtual, callback) {
  document.getElementById('ponto-just-dialog')?.remove();

  const rect = cel.getBoundingClientRect();
  const d = document.createElement('div');
  d.id = 'ponto-just-dialog';
  d.style.cssText = `position:fixed;top:${Math.min(rect.bottom + 6, window.innerHeight - 160)}px;left:${rect.left}px;
    background:#fff;border:1px solid #E3E1DA;border-radius:10px;padding:14px;
    box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:9999;width:260px;font-family:'DM Sans',sans-serif`;
  d.innerHTML = `
    <div style="font-size:12px;font-weight:600;color:#1B2D5B;margin-bottom:8px">Justificativa da falta</div>
    <textarea id="ponto-just-input" rows="3"
      style="width:100%;box-sizing:border-box;font-family:inherit;font-size:12.5px;padding:7px 9px;
             border:1px solid #E3E1DA;border-radius:7px;resize:none;outline:none"
      placeholder="Ex: atestado médico, licença, declaração…">${justAtual || ''}</textarea>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
      <button id="ponto-just-cancel" style="font-family:inherit;font-size:12.5px;padding:5px 14px;border-radius:7px;border:1px solid #E3E1DA;background:#fff;cursor:pointer">Cancelar</button>
      <button id="ponto-just-ok" style="font-family:inherit;font-size:12.5px;font-weight:500;padding:5px 14px;border-radius:7px;border:none;background:#1B2D5B;color:#fff;cursor:pointer">Confirmar</button>
    </div>`;
  document.body.appendChild(d);

  const input = d.querySelector('#ponto-just-input');
  input.focus(); input.select();

  const fechar = (val) => { d.remove(); callback(val); };

  d.querySelector('#ponto-just-ok').addEventListener('click',     () => fechar(input.value.trim()));
  d.querySelector('#ponto-just-cancel').addEventListener('click', () => fechar(null));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape')                    fechar(null);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) fechar(input.value.trim());
  });

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener('mousedown', function onOut(e) {
      if (!d.contains(e.target)) { fechar(null); document.removeEventListener('mousedown', onOut); }
    });
  }, 50);
}

async function _aplicarStatus(cel, func_id, data, chave, status, justificativa) {
  cel.classList.remove(...CICLO);
  cel.classList.add(status);

  // Atualiza visual da célula
  const just = justificativa || '';
  const ind  = status === 'falta_justificada' && just
    ? `<span style="display:block;font-size:7px;line-height:1.1;color:#1D4ED8;max-width:28px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${just}</span>` : '';
  cel.innerHTML = EMOJI[status] + ind;
  cel.title = status === 'falta_justificada' && just ? just : data;

  _pontoMap[chave] = status;
  if (just) _justMap[chave] = just;
  else delete _justMap[chave];

  // Recalcula total
  const tr   = cel.closest('tr');
  const func = _funcionarios.find(f => String(f.id) === String(func_id));
  if (func) {
    const dias  = new Date(_ano, _mes, 0).getDate();
    const desc  = calcDiasDesconto(func_id, dias, _ano, _mes);
    const val   = calcularValorDesconto(func, desc);
    const celT  = tr.querySelector('.cel-total');
    if (celT) { celT.textContent = desc > 0 ? fmtValor(val) : '—'; celT.className = `cel-total ${desc > 0 ? 'tem-desconto' : ''}`; }
  }

  try {
    await api.registrarPonto({ funcionario_id: func_id, data, status, justificativa: just || undefined });
  } catch (err) {
    console.error('Erro ao salvar ponto:', err.message);
  }
}

async function alternarPonto(cel) {
  const func_id = cel.dataset.func;
  const data    = cel.dataset.data;
  const chave   = `${func_id}_${data}`;
  const atual   = _pontoMap[chave] || 'presente';
  const proximo = CICLO[(CICLO.indexOf(atual) + 1) % CICLO.length];

  if (proximo === 'falta_justificada') {
    _mostrarDialogJustificativa(cel, _justMap[chave] || '', (just) => {
      if (just === null) return; // cancelado
      _aplicarStatus(cel, func_id, data, chave, proximo, just);
    });
  } else {
    _aplicarStatus(cel, func_id, data, chave, proximo, null);
  }
}
