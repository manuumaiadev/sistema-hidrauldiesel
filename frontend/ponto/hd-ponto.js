const fmtValor = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Estado
let _funcionarios = [];
let _pontoMap = {};
let _mes, _ano;

const CICLO    = ['presente', 'meia_falta', 'falta'];
const EMOJI    = { presente: '✅', meia_falta: '🟡', falta: '❌' };
const DIAS_DESC = { presente: 0, meia_falta: 1, falta: 2 };

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
    let diasDesconto = 0;
    let row = `<tr><td>${f.nome}</td>`;

    for (let d = 1; d <= diasNoMes; d++) {
      const dow = new Date(ano, mes - 1, d).getDay();
      const fds = dow === 0 || dow === 6;
      const dataStr = `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const status = _pontoMap[`${f.id}_${dataStr}`] || 'presente';
      diasDesconto += DIAS_DESC[status] || 0;

      if (fds) {
        row += `<td class="fim-semana"><div class="cel-ponto fim-semana">—</div></td>`;
      } else {
        row += `<td><div class="cel-ponto ${status}" data-func="${f.id}" data-data="${dataStr}" title="${dataStr}">${EMOJI[status]}</div></td>`;
      }
    }

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

async function alternarPonto(cel) {
  const func_id = cel.dataset.func;
  const data    = cel.dataset.data;
  const chave   = `${func_id}_${data}`;
  const atual   = _pontoMap[chave] || 'presente';
  const proximo = CICLO[(CICLO.indexOf(atual) + 1) % CICLO.length];

  // Atualiza visual imediatamente
  cel.classList.remove(...CICLO);
  cel.classList.add(proximo);
  cel.textContent = EMOJI[proximo];
  _pontoMap[chave] = proximo;

  // Recalcula total da linha em valor R$
  const tr = cel.closest('tr');
  const func = _funcionarios.find(f => String(f.id) === String(func_id));
  if (func) {
    let diasDesconto = 0;
    const diasNoMes = new Date(_ano, _mes, 0).getDate();
    for (let d = 1; d <= diasNoMes; d++) {
      const dataStr = `${_ano}-${String(_mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const s = _pontoMap[`${func_id}_${dataStr}`] || 'presente';
      diasDesconto += DIAS_DESC[s] || 0;
    }
    const valorDesconto = calcularValorDesconto(func, diasDesconto);
    const celTotal = tr.querySelector('.cel-total');
    if (celTotal) {
      celTotal.textContent = diasDesconto > 0 ? fmtValor(valorDesconto) : '—';
      celTotal.className = `cel-total ${diasDesconto > 0 ? 'tem-desconto' : ''}`;
    }
  }

  // Salva no backend
  try {
    await api.registrarPonto({ funcionario_id: func_id, data, status: proximo });
  } catch (err) {
    console.error('Erro ao salvar ponto:', err.message);
  }
}
