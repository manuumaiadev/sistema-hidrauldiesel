const API_URL = 'http://localhost:3000/api';

const getToken = () => sessionStorage.getItem('hd_token');

const request = async (method, endpoint, body = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (response.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login/hd-login.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detalhe || data.erro || 'Erro na requisição');
  }

  return data;
};

const api = {
  // Auth
  login: (email, senha) => request('POST', '/auth/login', { email, senha }),

  // Dashboard
  dashboard: () => request('GET', '/dashboard'),

  // OS
  listarOS: () => request('GET', '/os'),
  buscarOS: (id) => request('GET', `/os/${id}`),
  criarOS: (dados) => request('POST', '/os', dados),
  atualizarOS: (id, dados) => request('PUT', `/os/${id}`, dados),
  atualizarStatusOS: (id, status) => request('PATCH', `/os/${id}/status`, { status }),
  faturarOS: (id) => request('POST', `/os/${id}/faturar`),
  excluirOS: (id) => request('DELETE', `/os/${id}`),

  // Histórico
  listarHistorico: (filtros) => request('GET', `/historico?${new URLSearchParams(filtros || {})}`),

  // Comissões
  listarComissoes: () => request('GET', '/comissoes'),

  // Bling
  blingAutorizar: () => request('GET', '/bling/autorizar'),
  blingListarClientes: (q) => request('GET', `/bling/clientes?q=${encodeURIComponent(q || '')}`),
  blingBuscarClientes: (q) => request('GET', `/bling/clientes?q=${encodeURIComponent(q || '')}`),
  blingCriarCliente: (dados) => request('POST', '/bling/clientes', dados),
  blingBuscarProdutos: (q) => request('GET', `/bling/produtos?q=${encodeURIComponent(q)}`),
  blingBuscarServicos: (q) => request('GET', `/bling/servicos?q=${encodeURIComponent(q)}`),
  blingCriarServico:   (dados) => request('POST', '/bling/servicos', dados),
  blingBuscarPecas:    (q) => request('GET', `/bling/pecas?q=${encodeURIComponent(q)}`),
  blingCriarPeca:      (dados) => request('POST', '/bling/pecas', dados),
  blingConsultarEstoque:  (id) => request('GET',  `/bling/estoque/${id}`),
  blingImportarPedidos:  ()   => request('POST', '/bling/importar-pedidos'),

  // Detran
  consultarPlaca: (placa) => request('GET', `/detran/${placa}`),

  // Anexos / Fotos
  uploadFoto: (os_id, file) => {
    const formData = new FormData();
    formData.append('foto', file);
    return fetch(`${API_URL}/anexos/${os_id}/fotos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.erro || 'Erro no upload');
      return data;
    });
  },
  listarAnexos:  (os_id) => request('GET',    `/anexos/${os_id}`),
  deletarAnexo:  (id)    => request('DELETE',  `/anexos/${id}`),

  // Funcionários
  listarFuncionarios:   ()         => request('GET',   '/funcionarios'),
  criarFuncionario:     (dados)    => request('POST',  '/funcionarios', dados),
  atualizarFuncionario: (id, dados)=> request('PATCH', `/funcionarios/${id}`, dados),
  excluirFuncionario:   (id)       => request('DELETE', `/funcionarios/${id}`),

  registrarAdiantamento:   (dados) => request('POST', '/funcionarios/adiantamento', dados),
  listarAdiantamentos:     (id)    => request('GET',  `/funcionarios/${id}/adiantamentos`),
  registrarFerias:         (dados) => request('POST', '/funcionarios/ferias', dados),
  registrarRescisao:       (dados) => request('POST', '/funcionarios/rescisao', dados),
  vincularEmpresa:         (dados) => request('POST', '/funcionarios/vendedor/empresa', dados),
  listarEmpresasVendedor:  (id)    => request('GET',  `/funcionarios/${id}/empresas`),
  calcularComissaoVendedor:(id)    => request('GET',  `/funcionarios/${id}/comissao-vendedor`),

  // Vale transporte
  gerarValeTransporte: (dados)    => request('POST',   '/vale-transporte/gerar', dados),
  listarVales:         ()         => request('GET',    '/vale-transporte'),
  buscarVale:          (data)     => request('GET',    `/vale-transporte/${data}`),
  excluirVale:         (data)     => request('DELETE', `/vale-transporte/${data}`),

  // Ponto
  buscarPontoMes:  (mes, ano)       => request('GET',  `/ponto/${mes}/${ano}`),
  registrarPonto:  (dados)          => request('POST', '/ponto', dados),

  // Folha de pagamento
  listarFolhas:        ()         => request('GET',   '/folha'),
  gerarFolhaDia05:     (dados)    => request('POST',  '/folha/gerar-dia05', dados),
  gerarFolhaDia20:     (dados)    => request('POST',  '/folha/gerar-dia20', dados),
  buscarFolha:         (data)     => request('GET',   `/folha/${data}`),
  atualizarLancamento:       (id, dados)       => request('PATCH',  `/folha/lancamento/${id}`, dados),
  removerLancamento:         (id)              => request('DELETE', `/folha/lancamento/${id}`),
  adicionarFuncionarioFolha: (data, dados)     => request('POST',   `/folha/${data}/funcionario`, dados),
  excluirFolha:              (data)            => request('DELETE', `/folha/${data}`),

  // Mecânicos
  listarMecanicos: () => request('GET', '/mecanicos'),
  buscarMecanico: (id) => request('GET', `/mecanicos/${id}`),
  criarMecanico: (dados) => request('POST', '/mecanicos', dados),
  atualizarMecanico: (id, dados) => request('PATCH', `/mecanicos/${id}`, dados),
};

window.api = api;
