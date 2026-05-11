const pool = require('../config/database');
const axios = require('axios');
const { blingRequest } = require('../config/bling');

const STATUS_MAP = {
  'Em aberto':         'orcamento',
  'Enviada Para Cliente': 'enviada_cliente',
  'Aprovada':          'aprovado',
  'Em andamento':      'em_execucao',
  'Serviço concluído': 'autorizada_faturamento',
  'Faturada':          'autorizada_faturamento',
  'Finalizada':        'finalizada',
  'Cancelada':         'cancelada'
};

// Iniciar autenticação OAuth2
const autorizar = (req, res) => {
  const url = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${process.env.BLING_CLIENT_ID}&state=hidrauldiesel`;
  res.json({ url });
};

// Callback OAuth2 — recebe o code e troca pelo token
const callback = async (req, res) => {
  const { code } = req.query;

  console.log('Callback recebido, code:', code);

  if (!code) {
    return res.status(400).json({ erro: 'Code não recebido' });
  }

  try {
    const credentials = Buffer.from(
      `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
    ).toString('base64');

    console.log('Trocando code por token...');

    const response = await axios.post(
      'https://www.bling.com.br/Api/v3/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.BLING_REDIRECT_URI
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    console.log('Token recebido:', response.data);

    const { access_token, refresh_token } = response.data;

    await pool.query(
      `INSERT INTO configuracoes (chave, valor, atualizado_em)
       VALUES ('bling_access_token', $1, NOW())
       ON CONFLICT (chave) DO UPDATE SET valor = $1, atualizado_em = NOW()`,
      [access_token]
    );

    await pool.query(
      `INSERT INTO configuracoes (chave, valor, atualizado_em)
       VALUES ('bling_refresh_token', $1, NOW())
       ON CONFLICT (chave) DO UPDATE SET valor = $1, atualizado_em = NOW()`,
      [refresh_token]
    );

    console.log('Tokens salvos com sucesso!');

    res.send('<html><body><h2>✅ Bling autorizado com sucesso!</h2><script>setTimeout(() => window.close(), 2000);</script></body></html>');

  } catch (err) {
    console.error('Erro completo callback:', JSON.stringify(err.response?.data, null, 2));
    console.error('Status:', err.response?.status);
    console.error('Mensagem:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({
      erro: 'Erro ao autenticar com Bling',
      detalhe: err.response?.data || err.message
    });
  }
};

// Listar todos os clientes (percorre todas as páginas)
const listarTodosClientes = async (req, res) => {
  try {
    const { q } = req.query;
    let pagina = 1;
    let todos = [];
    let temMais = true;

    while (temMais) {
      const data = await blingRequest(pool, 'GET', '/contatos', {
        pesquisa: q || '',
        pagina,
        limite: 100
      });

      const clientes = data.data || [];
      todos = [...todos, ...clientes];

      if (clientes.length < 100) {
        temMais = false;
      } else {
        pagina++;
      }
    }

    res.json(todos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar clientes no Bling' });
  }
};

// Buscar produtos e serviços (genérico — mantido para compatibilidade)
const buscarProdutos = async (req, res) => {
  const { q } = req.query;
  try {
    const data = await blingRequest(pool, 'GET', '/produtos', { pesquisa: q });
    res.json(data.data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar produtos no Bling' });
  }
};

// Criar serviço no Bling (tipo S)
const criarServico = async (req, res) => {
  const { nome, codigo, valor } = req.body;
  try {
    const payload = { nome, codigo, tipo: 'S', preco: valor || 0, situacao: 'A' };
    const data = await blingRequest(pool, 'POST', '/produtos', {}, payload);
    res.status(201).json(data.data || data);
  } catch (err) {
    console.error('Erro ao criar serviço no Bling:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Erro ao criar serviço no Bling' });
  }
};

// Criar peça/produto no Bling (tipo P)
const criarPeca = async (req, res) => {
  const { nome, codigo, valor, unidade } = req.body;
  try {
    const payload = { nome, codigo, tipo: 'P', preco: valor || 0, unidade: unidade || 'UN', situacao: 'A' };
    const data = await blingRequest(pool, 'POST', '/produtos', {}, payload);
    res.status(201).json(data.data || data);
  } catch (err) {
    console.error('Erro ao criar peça no Bling:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Erro ao criar peça no Bling' });
  }
};

// Helper: busca todos os produtos de um tipo, com paginação quando sem pesquisa
const buscarTodosProdutosTipo = async (tipo, pesquisa) => {
  if (pesquisa) {
    const data = await blingRequest(pool, 'GET', '/produtos', { pesquisa, tipo });
    return data.data || [];
  }

  let pagina = 1;
  let todos = [];
  let temMais = true;

  while (temMais) {
    const data = await blingRequest(pool, 'GET', '/produtos', { tipo, pagina, limite: 100 });
    const itens = data.data || [];
    todos = [...todos, ...itens];
    if (itens.length < 100) temMais = false;
    else pagina++;
  }

  return todos;
};

// Buscar apenas serviços (tipo S)
const buscarServicos = async (req, res) => {
  const { q } = req.query;
  try {
    const itens = await buscarTodosProdutosTipo('S', q);
    res.json(itens);
  } catch (err) {
    console.error('Erro ao buscar serviços no Bling:', err.response?.data || err.message);
    res.json([]);
  }
};

// Buscar apenas peças/produtos físicos (tipo P)
const buscarPecas = async (req, res) => {
  const { q } = req.query;
  try {
    const itens = await buscarTodosProdutosTipo('P', q);
    res.json(itens);
  } catch (err) {
    console.error('Erro ao buscar peças no Bling:', err.response?.data || err.message);
    res.json([]);
  }
};

// Criar cliente no Bling
const criarCliente = async (req, res) => {
  const { tipo, nome, cpf_cnpj, rg_ie, email, telefone, celular, endereco } = req.body;

  try {
    const payload = {
      nome,
      tipoPessoa: tipo === 'PJ' ? 'J' : 'F',
      numeroDocumento: cpf_cnpj,
      ie: rg_ie,
      email,
      telefone,
      celular,
      enderecos: endereco ? [{
        endereco: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento,
        bairro: endereco.bairro,
        cep: endereco.cep,
        municipio: endereco.cidade,
        uf: endereco.estado,
        pais: 'Brasil',
        tipoEndereco: 'R'
      }] : []
    };

    const data = await blingRequest(pool, 'POST', '/contatos', {}, payload);
    res.status(201).json(data.data || data);
  } catch (err) {
    console.error('Erro ao criar cliente no Bling:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Erro ao criar cliente no Bling' });
  }
};

// Consultar estoque de um produto
const consultarEstoque = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await blingRequest(pool, 'GET', `/estoques/${id}`);
    res.json(data.data || {});
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao consultar estoque no Bling' });
  }
};

// Importar pedidos de venda do Bling como OS
const importarPedidosBling = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let pagina = 1;
    let todosPedidos = [];
    let temMais = true;

    while (temMais) {
      const data = await blingRequest(pool, 'GET', '/pedidos/vendas', { pagina, limite: 100 });
      const pedidos = data.data || [];
      todosPedidos = [...todosPedidos, ...pedidos];
      if (pedidos.length < 100) temMais = false;
      else pagina++;
    }

    const STATUS_IMPORT = {
      'Em aberto':            'orcamento',
      'Enviada Para Cliente': 'enviada_cliente',
      'Aprovada':             'aprovado',
      'Em andamento':         'em_execucao',
      'Servico concluido':    'autorizada_faturamento',
      'Serviço concluído':    'autorizada_faturamento',
      'Faturada':             'autorizada_faturamento',
      'Finalizada':           'finalizada',
      'Cancelada':            'cancelada'
    };

    let importados = 0;
    let atualizados = 0;

    for (const pedido of todosPedidos) {
      const existe = await client.query(
        'SELECT id FROM ordens_servico WHERE bling_pedido_id = $1',
        [pedido.id]
      );

      const status      = STATUS_IMPORT[pedido.situacao?.valor] || 'orcamento';
      const clienteId   = pedido.contato?.id   || null;
      const clienteNome = pedido.contato?.nome  || 'Cliente não identificado';
      const obs         = pedido.observacoes    || '';
      const dataCriacao = pedido.data           || new Date();

      if (existe.rows.length > 0) {
        await client.query(
          `UPDATE ordens_servico SET status = $1, atualizado_em = NOW() WHERE bling_pedido_id = $2`,
          [status, pedido.id]
        );
        atualizados++;
        continue;
      }

      const count  = await client.query('SELECT COUNT(*) FROM ordens_servico');
      const numero = `ORC-${String(parseInt(count.rows[0].count) + 1).padStart(4, '0')}`;

      await client.query(
        `INSERT INTO ordens_servico
         (numero, cliente_id, cliente_nome, status, bling_pedido_id, obs_tecnica, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [numero, clienteId, clienteNome, status, pedido.id, obs, dataCriacao]
      );
      importados++;
    }

    await client.query('COMMIT');
    res.json({
      mensagem: 'Importação concluída!',
      importados,
      atualizados,
      total: todosPedidos.length
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao importar pedidos Bling:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Erro ao importar pedidos do Bling', detalhe: err.message });
  } finally {
    client.release();
  }
};

module.exports = { autorizar, callback, listarTodosClientes, criarCliente, buscarProdutos, criarServico, buscarServicos, criarPeca, buscarPecas, consultarEstoque, importarPedidosBling };
