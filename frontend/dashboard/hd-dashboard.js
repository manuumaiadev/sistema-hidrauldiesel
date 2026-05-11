Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = '#888680';

new Chart(document.getElementById('fatChart'), {
  type: 'bar',
  data: {
    labels: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
    datasets: [{ data: [3200, 4750, 2900, 6100, 5300, 1800, 800],
      backgroundColor: ctx => ctx.dataIndex === new Date().getDay() - 1 ? '#1B2D5B' : '#E3E1DA',
      borderRadius: 5, borderSkipped: false }]
  },
  options: { responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' R$ ' + ctx.parsed.y.toLocaleString('pt-BR') } } },
    scales: { x: { grid: { display: false }, border: { display: false } }, y: { grid: { color: '#EDECEA' }, border: { display: false }, ticks: { callback: v => 'R$' + (v/1000).toFixed(0) + 'k' } } }
  }
});

const tipoChart = new Chart(document.getElementById('tipoChart'), {
  type: 'doughnut',
  data: {
    labels: [],
    datasets: [{ data: [], backgroundColor: [], borderWidth: 0, hoverOffset: 4 }]
  },
  options: { responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: { legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 3, padding: 12, font: { size: 12 } } } }
  }
});

document.querySelectorAll('.period-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Data no header ──────────────────────────────────────────
document.getElementById('page-date').textContent = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
});

// ── Usuário logado ──────────────────────────────────────────
const sidebarUser = document.getElementById('sidebar-user');
if (sidebarUser) {
  try {
    const raw = sessionStorage.getItem('hd_user');
    const user = raw ? JSON.parse(raw) : null;
    if (user && user.nome) sidebarUser.textContent = user.nome;
  } catch (_) { /* silently ignore */ }
}

// ── Helpers ─────────────────────────────────────────────────
const STATUS_CORES = {
  orcamento:              '#7C3AED',
  enviada_cliente:        '#0EA5E9',
  aprovado:               '#22C55E',
  em_execucao:            '#EAB308',
  autorizada_faturamento: '#F97316',
  finalizada:             '#DC2626',
  cancelada:              '#6B7280',
};

const STATUS_LABELS = {
  orcamento:              'Orçamento',
  enviada_cliente:        'Enviada ao cliente',
  aprovado:               'Aprovado',
  em_execucao:            'Em execução',
  autorizada_faturamento: 'A faturar',
  finalizada:             'Finalizada',
  cancelada:              'Cancelada',
};

function fmtValor(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtCompacto(v) {
  const n = Number(v || 0);
  if (n >= 1000000) return 'R$\u202F' + (n / 1000000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1000)    return 'R$\u202F' + (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return fmtValor(n);
}

function fmtTempo(dataStr) {
  const diff = Math.floor((Date.now() - new Date(dataStr)) / 1000);
  if (diff < 60)   return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)} dia(s)`;
}

function contarStatus(osPorStatus, status) {
  const row = osPorStatus.find(r => r.status === status);
  return row ? Number(row.total) : 0;
}

// ── Popular KPIs ────────────────────────────────────────────
function popularKPIs(dados) {
  const { osPorStatus, faturamentoMes, osCriadasHoje, osConcluidasHoje } = dados;

  const emExecucao   = contarStatus(osPorStatus, 'em_execucao');
  const orcamentos   = contarStatus(osPorStatus, 'orcamento');
  const totalOS      = osPorStatus.reduce((a, r) => a + Number(r.total), 0) || 1;

  document.getElementById('kpi-faturamento').textContent   = fmtCompacto(faturamentoMes);
  document.getElementById('kpi-concluidas').textContent    = osConcluidasHoje;
  document.getElementById('kpi-execucao').textContent      = emExecucao;
  document.getElementById('kpi-orcamentos').textContent    = orcamentos;
  document.getElementById('kpi-criadas-hoje').textContent  = osCriadasHoje;

  document.getElementById('kpi-exec-sub').textContent =
    emExecucao === 1 ? '1 OS em andamento' : `${emExecucao} OS em andamento`;

  document.getElementById('kpi-conc-bar').style.width  = Math.min(Number(osConcluidasHoje) / totalOS * 100, 100) + '%';
  document.getElementById('kpi-exec-bar').style.width  = Math.min(emExecucao / totalOS * 100, 100) + '%';
  document.getElementById('kpi-orc-bar').style.width   = Math.min(orcamentos  / totalOS * 100, 100) + '%';
}

// ── Gráfico OS por status ────────────────────────────────────
function atualizarTipoChart(osPorStatus) {
  const dados = osPorStatus.filter(r => Number(r.total) > 0);
  const emptyEl = document.getElementById('tipo-chart-empty');

  if (!dados.length) {
    tipoChart.canvas.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  tipoChart.canvas.style.display = '';
  tipoChart.data.labels = dados.map(r => STATUS_LABELS[r.status] || r.status);
  tipoChart.data.datasets[0].data = dados.map(r => Number(r.total));
  tipoChart.data.datasets[0].backgroundColor = dados.map(r => STATUS_CORES[r.status] || '#D1CFC8');
  tipoChart.update();
}

// ── Últimas OS ──────────────────────────────────────────────
function popularUltimasOS(lista) {
  const el = document.getElementById('os-list');
  if (!lista || !lista.length) {
    el.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:13px">Nenhuma OS registrada ainda.</div>';
    return;
  }
  el.innerHTML = lista.map(os => {
    const cls     = os.status.replace(/_/g, '-');
    const veiculo = [os.modelo, os.placa].filter(Boolean).join(' · ') || '—';
    return `
      <div class="os-item" style="cursor:pointer" onclick="window.location.href='../orcamento/?id=${os.id}'">
        <span class="os-dot ${cls}"></span>
        <div class="os-info">
          <div class="os-cliente">${os.cliente_nome || '—'}</div>
          <div class="os-detalhe">${veiculo}</div>
        </div>
        <span class="os-num">#${os.numero}</span>
      </div>`;
  }).join('');
}

// ── Em aberto agora ─────────────────────────────────────────
function popularEmAberto(lista) {
  const el = document.getElementById('aberto-list');
  if (!el) return;
  if (!lista || !lista.length) {
    el.innerHTML = '<div style="font-size:12.5px;color:var(--muted)">Nenhuma OS em aberto.</div>';
    return;
  }
  el.innerHTML = lista.map(os => {
    const cls     = os.status.replace(/_/g, '-');
    const veiculo = [os.modelo, os.placa].filter(Boolean).join(' — ') || '—';
    return `<div style="display:flex;justify-content:space-between;font-size:12.5px">
      <span style="display:flex;align-items:center;gap:6px">
        <span class="os-dot ${cls}"></span>${os.cliente_nome || '—'}
      </span>
      <span style="color:var(--muted)">${veiculo}</span>
    </div>`;
  }).join('');
}

// ── Estoque crítico ─────────────────────────────────────────
function popularEstoqueCritico(pecas, erro) {
  const el = document.getElementById('estoque-list');
  if (!el) return;

  if (erro) {
    el.innerHTML = '<div class="estoque-item" style="color:var(--muted);font-size:13px">Não foi possível carregar o estoque. <a href="../estoque/" style="color:inherit">Verificar →</a></div>';
    return;
  }
  if (!pecas || !pecas.length) {
    el.innerHTML = '<div class="estoque-item" style="color:var(--muted);font-size:13px">Nenhum item em estoque crítico.</div>';
    return;
  }

  const exibir = pecas.slice(0, 5);
  const temMais = pecas.length > 5;

  el.innerHTML = exibir.map(p => {
    const saldo = Number(p.estoque?.saldoVirtualTotal ?? p.estoque?.saldo ?? p.saldo ?? 0);
    const critico = saldo <= 2;
    const badgeClass = critico ? 'badge-critico' : 'badge-baixo';
    const badgeLabel = critico ? 'Crítico' : 'Baixo';
    const qtyColor = critico ? '#DC2626' : 'var(--aberta)';
    return `<div class="estoque-item">
      <div style="flex:1">
        <div class="estoque-nome">${p.nome || '—'}</div>
        <div class="estoque-cod">SKU: ${p.codigo || '—'}</div>
      </div>
      <span class="estoque-qty" style="color:${qtyColor}">${saldo} un.</span>
      <span class="estoque-badge ${badgeClass}">${badgeLabel}</span>
    </div>`;
  }).join('') + (temMais
    ? `<div style="padding:10px 18px 4px"><a href="../estoque/" style="font-size:12.5px;color:var(--muted);text-decoration:none">Ver todos os ${pecas.length} itens críticos →</a></div>`
    : '');
}

// ── Atividade recente ────────────────────────────────────────
function popularAtividadeRecente(historico) {
  const el = document.getElementById('ativ-list');
  if (!el) return;
  if (!historico || !historico.length) {
    el.innerHTML = '<div style="padding:8px 0;color:var(--muted);font-size:13px">Nenhuma atividade recente.</div>';
    return;
  }

  const ACAO_ICON = { criar: '✓', atualizar: '🔧', excluir: '✗' };
  const ACAO_BG   = { criar: 'var(--concluida-bg)', atualizar: 'var(--andamento-bg)', excluir: '#FEE2E2' };
  const TABELA_LABEL = {
    ordens_servico: 'OS',
    mecanicos:      'Mecânico',
    clientes:       'Cliente',
    veiculos:       'Veículo',
    itens_servico:  'Serviço',
    itens_pecas:    'Peça',
  };

  el.innerHTML = historico.slice(0, 5).map(h => {
    const icon  = ACAO_ICON[h.acao] || '📋';
    const bg    = ACAO_BG[h.acao]   || 'var(--orcamento-bg)';
    const tabela = TABELA_LABEL[h.tabela] || h.tabela;
    const desc = `${h.acao === 'criar' ? 'Novo(a)' : h.acao === 'atualizar' ? 'Atualizado(a)' : 'Removido(a)'} ${tabela} #${h.registro_id}`;
    return `<div class="ativ-item">
      <div class="ativ-icon" style="background:${bg}">${icon}</div>
      <div>
        <div class="ativ-desc">${desc}${h.usuario_nome ? ' · ' + h.usuario_nome : ''}</div>
        <div class="ativ-time">${fmtTempo(h.criado_em)}</div>
      </div>
    </div>`;
  }).join('');
}

// ── Ranking de mecânicos ────────────────────────────────────
function popularMecanicos(lista) {
  const el = document.getElementById('mec-list');
  if (!lista || !lista.length) {
    el.innerHTML = '<div style="padding:8px 0;color:var(--muted);font-size:13px">Nenhum mecânico cadastrado.</div>';
    return;
  }
  const maxComissao = Math.max(...lista.map(m => Number(m.total_comissao)), 1);
  const cores = ['var(--navy)', 'var(--red)', 'var(--andamento)', 'var(--orcamento)', 'var(--aberta)'];

  el.innerHTML = lista.map((m, i) => {
    const pct = Math.round(Number(m.total_comissao) / maxComissao * 100);
    return `
      <div class="mec-item">
        <div class="mec-row">
          <span class="mec-nome">${m.nome}</span>
          <span class="mec-count">${m.total_os} OS · ${fmtCompacto(m.total_comissao)}</span>
        </div>
        <div class="mec-progress">
          <div class="mec-fill" style="width:${pct}%;background:${cores[i % cores.length]}"></div>
        </div>
      </div>`;
  }).join('');
}

// ── Carregar dashboard ──────────────────────────────────────
function carregarDashboard() {
  const agora = new Date();
  const hj = (h, m = 0) => { const d = new Date(agora); d.setHours(h, m, 0, 0); return d.toISOString(); };

  // KPIs
  const dadosDemo = {
    faturamentoMes: 24850,
    osCriadasHoje:  4,
    osConcluidasHoje: 3,
    osPorStatus: [
      { status: 'orcamento',              total: '5' },
      { status: 'enviada_cliente',        total: '3' },
      { status: 'aprovado',               total: '2' },
      { status: 'em_execucao',            total: '4' },
      { status: 'autorizada_faturamento', total: '1' },
      { status: 'finalizada',             total: '12' },
    ],
    ultimasOS: [
      { id: 1, numero: 'ORC-0019', numero_os: null,      status: 'em_execucao',  cliente_nome: 'Transportadora Alfa Ltda',  modelo: 'Scania R450',   placa: 'BRA-2E19' },
      { id: 2, numero: 'ORC-0018', numero_os: 'OS-0005', status: 'aprovado',     cliente_nome: 'João Carlos Souza',          modelo: 'VW Delivery',   placa: 'QRS-4F02' },
      { id: 3, numero: 'ORC-0017', numero_os: null,      status: 'orcamento',    cliente_nome: 'Laticínios Bom Gosto',       modelo: 'Ford Cargo',    placa: 'DEF-5G44' },
      { id: 4, numero: 'ORC-0016', numero_os: 'OS-0004', status: 'finalizada',   cliente_nome: 'Construtora ViaRápida',      modelo: 'Mercedes Axor', placa: 'GHI-9K31' },
      { id: 5, numero: 'ORC-0015', numero_os: null,      status: 'enviada_cliente', cliente_nome: 'Frigorífico Central SA', modelo: 'Iveco Daily',   placa: 'JKL-7L88' },
    ],
    topMecanicos: [
      { nome: 'Carlos Henrique',  total_os: 11, total_comissao: 1840 },
      { nome: 'Rodrigo Marques',  total_os:  8, total_comissao: 1320 },
      { nome: 'Fábio Almeida',    total_os:  6, total_comissao:  970 },
      { nome: 'Thiago Pereira',   total_os:  4, total_comissao:  610 },
    ],
  };

  const historicoDemo = [
    { acao: 'criar',     tabela: 'ordens_servico', registro_id: 19, usuario_nome: 'Admin', criado_em: hj(8, 34) },
    { acao: 'atualizar', tabela: 'ordens_servico', registro_id: 18, usuario_nome: 'Admin', criado_em: hj(7, 55) },
    { acao: 'criar',     tabela: 'ordens_servico', registro_id: 17, usuario_nome: 'Admin', criado_em: hj(7, 12) },
    { acao: 'atualizar', tabela: 'mecanicos',       registro_id:  3, usuario_nome: 'Admin', criado_em: hj(6, 48) },
    { acao: 'criar',     tabela: 'ordens_servico', registro_id: 16, usuario_nome: 'Admin', criado_em: hj(6, 10) },
  ];

  const estoqueCriticoDemo = [
    { nome: 'Filtro de óleo Mann W940',    codigo: 'FLT-0023', saldo: 1 },
    { nome: 'Correia dentada Gates K015', codigo: 'COR-0041', saldo: 2 },
    { nome: 'Pastilha de freio Bosch BP', codigo: 'PAS-0089', saldo: 0 },
    { nome: 'Bomba d\'água GMB GWV-79A',  codigo: 'BBA-0017', saldo: 2 },
    { nome: 'Vela de ignição NGK BKR6E',  codigo: 'VLA-0055', saldo: 1 },
  ];

  popularKPIs(dadosDemo);
  popularUltimasOS(dadosDemo.ultimasOS);
  popularMecanicos(dadosDemo.topMecanicos);
  atualizarTipoChart(dadosDemo.osPorStatus);

  const osEmAberto = dadosDemo.ultimasOS.filter(
    os => os.status === 'em_execucao' || os.status === 'aprovado'
  );
  popularEmAberto(osEmAberto);
  popularAtividadeRecente(historicoDemo);
  popularEstoqueCritico(estoqueCriticoDemo.map(p => ({ ...p, estoque: { saldoVirtualTotal: p.saldo } })));
}

async function sincronizarBling() {
  const statusEl = document.getElementById('sync-status');
  if (statusEl) statusEl.textContent = 'sincronizando…';
  try {
    const pecas = await api.blingBuscarPecas('');
    if (statusEl) statusEl.textContent = 'sincronizado agora';
    const criticos = Array.isArray(pecas) ? pecas.filter(p => {
      const saldo = Number(p.estoque?.saldoVirtualTotal ?? p.estoque?.saldo ?? p.saldo ?? 0);
      return saldo <= 5;
    }) : [];
    popularEstoqueCritico(criticos);
  } catch (err) {
    if (statusEl) statusEl.textContent = 'erro ao sincronizar';
    popularEstoqueCritico([], true);
  }
}

carregarDashboard();
