const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const AVATAR_COLORS = ['#1B5FBF','#7C3AED','#0E7490','#92400E','#1B2D5B','#DC2626','#16A34A','#D97706'];
function avatarColor(nome) { let h=0; for (const c of nome) h=(h*31+c.charCodeAt(0))>>>0; return AVATAR_COLORS[h%AVATAR_COLORS.length]; }
function iniciais(nome) { return nome.trim().split(/\s+/).slice(0,2).map(p=>p[0].toUpperCase()).join(''); }

// ── Mecânicos ─────────────────────────────────────────────────────────────────
function renderMecanicos(lista, mecAPIMap) {
  const grid = document.getElementById('mec-grid');
  if (!lista.length) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:32px;text-align:center">Nenhum funcionário com cargo Mecânico cadastrado.</div>';
    return;
  }
  const enriquecidos = lista.map(f => ({
    ...f,
    total_comissoes: f.mecanico_id ? (mecAPIMap[f.mecanico_id]?.total_comissoes || 0) : 0
  }));
  const maxCom = Math.max(...enriquecidos.map(f => Number(f.total_comissoes)), 1);
  grid.innerHTML = enriquecidos.map(f => {
    const cor  = avatarColor(f.nome);
    const pct  = Math.round(Number(f.total_comissoes) / maxCom * 100);
    const ativo = f.status !== 'inativo';
    return `
      <div class="mec-card${ativo ? '' : ' mec-card--inactive'}">
        <div class="mec-card-top">
          <div class="mec-avatar" style="background:${cor}">${iniciais(f.nome)}</div>
          <div class="mec-info">
            <div class="mec-name">${f.nome}</div>
            <span class="mec-tag">${f.cargo || ''}</span>
          </div>
          <span class="${ativo ? 'badge-ativo' : 'badge-ferias'}">${ativo ? 'Ativo' : 'Inativo'}</span>
        </div>
        <div class="mec-stats">
          <div class="mec-stat">
            <span class="mec-stat-value">${Number(f.percentual_comissao || 0)}%</span>
            <span class="mec-stat-label">Comissão</span>
          </div>
          <div class="mec-stat">
            <span class="mec-stat-value" style="font-size:15px">${fmt(f.total_comissoes)}</span>
            <span class="mec-stat-label">Total comissões</span>
          </div>
        </div>
        <div class="mec-perf">
          <div class="mec-perf-label"><span>Participação</span><span class="mec-perf-pct">${pct}%</span></div>
          <div class="mec-perf-bar"><div class="mec-perf-fill" style="width:${pct}%;background:${cor}"></div></div>
        </div>
      </div>`;
  }).join('');
}

// ── Vendedores ────────────────────────────────────────────────────────────────
let _vendedores = [];

async function renderizarVendedores(container) {
  const html = [];
  for (const v of _vendedores) {
    const [empresas, comissao] = await Promise.all([
      api.listarEmpresasVendedor(v.id).catch(() => []),
      api.calcularComissaoVendedor(v.id).catch(() => ({ comissoes: [], total: 0 }))
    ]);
    html.push(`
      <div style="background:#fff;border:1px solid #E3E1DA;border-radius:10px;margin-bottom:16px;overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid #E3E1DA;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:15px;font-weight:600">${v.nome}</div>
            <div style="font-size:12px;color:var(--muted)">${v.percentual_comissao || 0}% comissão · ${empresas.length} empresa(s)</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:18px;font-weight:600;font-family:var(--mono);color:#1B2D5B">${fmt(comissao.total)}</span>
            <button onclick="abrirVincularEmpresa(${v.id})" style="font-family:inherit;font-size:12.5px;font-weight:500;padding:6px 12px;border-radius:7px;border:1px solid #E3E1DA;background:transparent;cursor:pointer">+ Empresa</button>
          </div>
        </div>
        ${empresas.length ? `
          <div style="padding:12px 20px;border-bottom:1px solid #E3E1DA;display:flex;flex-wrap:wrap;gap:8px">
            ${empresas.map(e => `<span style="background:#EFF6FF;color:#1D4ED8;font-size:12px;font-weight:500;padding:3px 10px;border-radius:20px">${e.cliente_nome}</span>`).join('')}
          </div>
        ` : ''}
        ${comissao.comissoes.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead><tr style="background:#F8F7F4">
              <th style="text-align:left;padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;color:#888">OS</th>
              <th style="padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;color:#888">Cliente</th>
              <th style="text-align:right;padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;color:#888">Valor OS</th>
              <th style="text-align:right;padding:8px 16px;font-size:11px;font-weight:600;text-transform:uppercase;color:#888">Comissão</th>
            </tr></thead>
            <tbody>
              ${comissao.comissoes.slice(0,5).map(c => `
                <tr style="border-top:1px solid #E3E1DA">
                  <td style="padding:9px 16px;font-weight:500">#${c.numero}</td>
                  <td style="padding:9px 16px;color:var(--muted)">${c.cliente_nome}</td>
                  <td style="padding:9px 16px;text-align:right;font-family:var(--mono)">${fmt(c.valor_total)}</td>
                  <td style="padding:9px 16px;text-align:right;font-family:var(--mono);color:#15803D">${fmt(c.valor_comissao)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        ` : '<div style="padding:16px 20px;color:var(--muted);font-size:13px">Nenhuma OS finalizada para as empresas vinculadas.</div>'}
      </div>`);
  }
  container.innerHTML = html.join('') || '<div style="color:var(--muted);font-size:13px;padding:32px;text-align:center">Nenhum funcionário com cargo Vendedor cadastrado.</div>';
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.style.borderBottomColor = 'transparent';
      b.style.color = 'var(--muted)';
    });
    btn.style.borderBottomColor = 'var(--navy)';
    btn.style.color = 'var(--navy)';
    const tab = btn.dataset.tab;
    document.getElementById('tab-mecanicos').style.display = tab === 'mecanicos' ? '' : 'none';
    document.getElementById('tab-vendedores').style.display = tab === 'vendedores' ? '' : 'none';
    if (tab === 'mecanicos') carregarMecanicosTab();
    if (tab === 'vendedores') carregarVendedoresTab();
  });
});

// ── KPIs mecânicos ────────────────────────────────────────────────────────────
function atualizarKPIsMec(lista, mecAPIMap) {
  const ativos = lista.filter(f => f.status !== 'inativo').length;
  const total  = lista.reduce((a, f) => a + Number(f.mecanico_id ? (mecAPIMap[f.mecanico_id]?.total_comissoes || 0) : 0), 0);
  const media  = ativos > 0 ? total / ativos : 0;
  document.getElementById('kpi-mec-total').textContent    = lista.length;
  document.getElementById('kpi-mec-total-sub').textContent = `${ativos} ativo${ativos!==1?'s':''} · ${lista.length-ativos} inativo${(lista.length-ativos)!==1?'s':''}`;
  document.getElementById('kpi-mec-comissoes').textContent = fmt(total);
  document.getElementById('kpi-mec-media').textContent    = fmt(media);
}

// ── Carregar aba mecânicos ────────────────────────────────────────────────────
async function carregarMecanicosTab() {
  const grid = document.getElementById('mec-grid');
  grid.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:32px;text-align:center">Carregando…</div>';
  try {
    const [todos, mecAPI] = await Promise.all([
      api.listarFuncionarios(),
      api.listarMecanicos().catch(() => [])
    ]);
    const mecAPIMap = {};
    mecAPI.forEach(m => mecAPIMap[m.id] = m);
    const mecanicos = todos.filter(f => f.cargo_tipo === 'mecanico');
    atualizarKPIsMec(mecanicos, mecAPIMap);
    renderMecanicos(mecanicos, mecAPIMap);
  } catch (err) {
    grid.innerHTML = `<div style="color:#DC2626;font-size:13px;padding:32px;text-align:center">${err.message}</div>`;
  }
}

// ── Carregar aba vendedores ───────────────────────────────────────────────────
async function carregarVendedoresTab() {
  const container = document.getElementById('vendedores-lista');
  container.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:32px;text-align:center">Carregando…</div>';
  try {
    const todos = await api.listarFuncionarios();
    _vendedores = todos.filter(f => f.cargo_tipo === 'vendedor');
    document.getElementById('kpi-vend-total').textContent = _vendedores.length;
    await renderizarVendedores(container);
  } catch (err) {
    container.innerHTML = `<div style="color:#DC2626;font-size:13px;padding:32px;text-align:center">${err.message}</div>`;
  }
}

// ── Modal Vincular Empresa ────────────────────────────────────────────────────
let _empSelecionada = null;

window.abrirVincularEmpresa = (funcId) => {
  document.getElementById('emp-func-id').value = funcId;
  document.getElementById('emp-busca').value = '';
  document.getElementById('emp-resultados').style.display = 'none';
  document.getElementById('emp-selecionada').style.display = 'none';
  document.getElementById('emp-erro').textContent = '';
  _empSelecionada = null;
  document.getElementById('modal-empresa').style.display = 'flex';
};

let _buscaTimer;
document.getElementById('emp-busca').addEventListener('input', function() {
  clearTimeout(_buscaTimer);
  const q = this.value.trim();
  if (q.length < 2) { document.getElementById('emp-resultados').style.display = 'none'; return; }
  _buscaTimer = setTimeout(async () => {
    try {
      const lista = await api.blingBuscarClientes(q);
      const el = document.getElementById('emp-resultados');
      if (!lista.length) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.innerHTML = lista.map(c => `
        <div onclick="selecionarEmpresa(${c.id}, '${c.nome.replace(/'/g,"\\'")}')"
          style="padding:9px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #E3E1DA"
          onmouseover="this.style.background='#F4F3F0'" onmouseout="this.style.background=''">
          ${c.nome}
        </div>`).join('');
    } catch (_) {}
  }, 400);
});

window.selecionarEmpresa = (id, nome) => {
  _empSelecionada = { id, nome };
  document.getElementById('emp-selecionada').style.display = 'block';
  document.getElementById('emp-selecionada').textContent = `Selecionado: ${nome}`;
  document.getElementById('emp-resultados').style.display = 'none';
  document.getElementById('emp-busca').value = nome;
};

document.getElementById('btn-vincular-empresa').addEventListener('click', async () => {
  const funcionario_id = document.getElementById('emp-func-id').value;
  if (!_empSelecionada) { document.getElementById('emp-erro').textContent = 'Selecione uma empresa.'; return; }
  const btn = document.getElementById('btn-vincular-empresa');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    await api.vincularEmpresa({ funcionario_id, cliente_id: _empSelecionada.id, cliente_nome: _empSelecionada.nome });
    document.getElementById('modal-empresa').style.display = 'none';
    carregarComissionados();
  } catch (err) {
    document.getElementById('emp-erro').textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Vincular';
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
carregarMecanicosTab();
