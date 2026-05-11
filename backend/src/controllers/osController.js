const pool = require('../config/database');
const { blingRequest } = require('../config/bling');

const STATUS_BLING = {
  'orcamento':              'Em aberto',
  'enviada_cliente':        'Enviada Para Cliente',
  'aprovado':               'Aprovada',
  'em_execucao':            'Em andamento',
  'autorizada_faturamento': 'Serviço concluído',
  'finalizada':             'Finalizada'
};

// Listar todas as OS
const listarOS = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        os.id,
        os.numero,
        os.numero_os,
        os.cliente_nome,
        os.status,
        os.km_atual,
        os.criado_em,
        os.atualizado_em,
        v.placa,
        v.modelo,
        v.ano,
        COALESCE(SUM(s.valor), 0) + COALESCE(SUM(p.quantidade * p.valor_unit), 0) AS valor_total
      FROM ordens_servico os
      LEFT JOIN veiculos v ON v.id = os.veiculo_id
      LEFT JOIN itens_servico s ON s.os_id = os.id
      LEFT JOIN itens_pecas p ON p.os_id = os.id
      GROUP BY os.id, v.placa, v.modelo, v.ano
      ORDER BY os.criado_em DESC
    `);

    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar OS' });
  }
};

// Buscar OS por ID
const buscarOS = async (req, res) => {
  const { id } = req.params;

  try {
    const os = await pool.query(
      `SELECT os.*, v.placa, v.modelo, v.ano, v.cor, v.chassi, v.motor
       FROM ordens_servico os
       LEFT JOIN veiculos v ON v.id = os.veiculo_id
       WHERE os.id = $1`,
      [id]
    );

    if (os.rows.length === 0) {
      return res.status(404).json({ erro: 'OS não encontrada' });
    }

    const servicos = await pool.query(
      'SELECT * FROM itens_servico WHERE os_id = $1',
      [id]
    );

    const pecas = await pool.query(
      'SELECT * FROM itens_pecas WHERE os_id = $1',
      [id]
    );

    res.json({
      ...os.rows[0],
      servicos: servicos.rows,
      pecas: pecas.rows
    });

  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar OS' });
  }
};

// Criar OS
const criarOS = async (req, res) => {
  const {
    cliente_id, cliente_nome, cliente_cpf_cnpj, cliente_telefone, cliente_email,
    veiculo, queixa, obs_tecnica, km_atual, frota,
    servicos, pecas, checklist, num_pedido_compra, num_pedido_servico
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Criar ou atualizar veículo
    let veiculo_id;
    if (veiculo.placa) {
      const veiculoExistente = await client.query(
        'SELECT id FROM veiculos WHERE placa = $1',
        [veiculo.placa]
      );

      if (veiculoExistente.rows.length > 0) {
        veiculo_id = veiculoExistente.rows[0].id;
      } else {
        const novoVeiculo = await client.query(
          `INSERT INTO veiculos (placa, modelo, ano, cor, chassi, motor, cliente_id, cliente_nome)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [veiculo.placa, veiculo.modelo, veiculo.ano, veiculo.cor,
           veiculo.chassi, veiculo.motor, cliente_id, cliente_nome]
        );
        veiculo_id = novoVeiculo.rows[0].id;
      }
    }

    // Gerar número da OS
    const count = await client.query('SELECT COUNT(*) FROM ordens_servico');
    const numero = `ORC-${String(parseInt(count.rows[0].count) + 1).padStart(4, '0')}`;

    // Criar OS
    const novaOS = await client.query(
      `INSERT INTO ordens_servico
       (numero, cliente_id, cliente_nome, veiculo_id, queixa, obs_tecnica, checklist, status,
        km_atual, frota, num_pedido_compra, num_pedido_servico,
        cliente_cpf_cnpj, cliente_telefone, cliente_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'orcamento', $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [numero, cliente_id, cliente_nome, veiculo_id, queixa, obs_tecnica,
       JSON.stringify(checklist || {}), km_atual || null, frota || null,
       num_pedido_compra || null, num_pedido_servico || null,
       cliente_cpf_cnpj || null, cliente_telefone || null, cliente_email || null]
    );

    const os_id = novaOS.rows[0].id;

    // Inserir serviços
    if (servicos && servicos.length > 0) {
      for (const s of servicos) {
        await client.query(
          `INSERT INTO itens_servico (os_id, bling_produto_id, descricao, valor, quantidade, mecanico_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [os_id, s.bling_produto_id, s.descricao, s.valor, s.quantidade || 1, s.mecanico_id]
        );
      }
    }

    // Inserir peças
    if (pecas && pecas.length > 0) {
      for (const p of pecas) {
        await client.query(
          `INSERT INTO itens_pecas (os_id, bling_produto_id, descricao, quantidade, valor_unit)
           VALUES ($1, $2, $3, $4, $5)`,
          [os_id, p.bling_produto_id, p.descricao, p.quantidade, p.valor_unit]
        );
      }
    }

    // Registrar histórico
    await client.query(
      `INSERT INTO historico (usuario_id, usuario_nome, tabela, registro_id, acao, dados_novos)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.usuario.id, req.usuario.nome, 'ordens_servico', os_id, 'CRIOU', JSON.stringify(novaOS.rows[0])]
    );

    await client.query('COMMIT');
    res.status(201).json(novaOS.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar OS:', err.message, err.detail || '');
    res.status(500).json({ erro: 'Erro ao criar OS', detalhe: err.message });
  } finally {
    client.release();
  }
};

// Atualizar status da OS
const atualizarStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = [
    'orcamento', 'enviada_cliente', 'aprovado',
    'em_execucao', 'autorizada_faturamento', 'finalizada', 'cancelada'
  ];

  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const osAtual = await client.query(
      'SELECT * FROM ordens_servico WHERE id = $1',
      [id]
    );

    if (osAtual.rows.length === 0) {
      return res.status(404).json({ erro: 'OS não encontrada' });
    }

    // Gerar numero_os quando aprovado pela primeira vez
    if (status === 'aprovado' && !osAtual.rows[0].numero_os) {
      const count = await client.query(
        "SELECT COUNT(*) FROM ordens_servico WHERE numero_os IS NOT NULL"
      );
      const numeroOS = `OS-${String(parseInt(count.rows[0].count) + 1).padStart(4, '0')}`;
      await client.query(
        'UPDATE ordens_servico SET numero_os = $1 WHERE id = $2',
        [numeroOS, id]
      );
    }

    const atualizado = await client.query(
      `UPDATE ordens_servico
       SET status = $1, atualizado_em = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    // Se chegou em autorizada_faturamento, calcular comissões
    if (status === 'autorizada_faturamento') {
      const servicos = await client.query(
        `SELECT s.*, m.percentual_comissao
         FROM itens_servico s
         JOIN mecanicos m ON m.id = s.mecanico_id
         WHERE s.os_id = $1`,
        [id]
      );

      for (const s of servicos.rows) {
        const valor_comissao = (s.valor * s.quantidade * s.percentual_comissao) / 100;
        await client.query(
          `INSERT INTO comissoes
           (mecanico_id, os_id, item_servico_id, valor_servico, percentual, valor_comissao)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [s.mecanico_id, id, s.id, s.valor, s.percentual_comissao, valor_comissao]
        );
      }
    }

    // Registrar histórico
    await client.query(
      `INSERT INTO historico (usuario_id, usuario_nome, tabela, registro_id, acao, dados_anteriores, dados_novos)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.usuario.id, req.usuario.nome, 'ordens_servico', id, 'ALTEROU_STATUS',
        JSON.stringify({ status: osAtual.rows[0].status }),
        JSON.stringify({ status })
      ]
    );

    await client.query('COMMIT');

    // Sincronizar com Bling se tiver pedido vinculado (não bloqueia a resposta)
    if (atualizado.rows[0].bling_pedido_id && STATUS_BLING[status]) {
      try {
        await blingRequest(pool, 'PUT',
          `/pedidos/vendas/${atualizado.rows[0].bling_pedido_id}/situacoes`,
          {},
          { situacao: { id: STATUS_BLING[status] } }
        );
      } catch (blingErr) {
        console.warn('Aviso: não foi possível sincronizar status com Bling:', blingErr.message);
      }
    }

    res.json(atualizado.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  } finally {
    client.release();
  }
};

// Atualizar OS
const atualizarOS = async (req, res) => {
  const { id } = req.params;
  const { cliente_id, cliente_nome, cliente_cpf_cnpj, cliente_telefone, cliente_email,
          veiculo, queixa, obs_tecnica, km_atual, frota,
          servicos, pecas, checklist, num_pedido_compra, num_pedido_servico } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const anterior = await client.query(
      'SELECT * FROM ordens_servico WHERE id = $1', [id]
    );

    if (anterior.rows.length === 0) {
      return res.status(404).json({ erro: 'OS não encontrada' });
    }

    // Upsert veículo se placa fornecida
    let veiculo_id = anterior.rows[0].veiculo_id;
    if (veiculo?.placa) {
      const veiculoExistente = await client.query(
        'SELECT id FROM veiculos WHERE placa = $1', [veiculo.placa]
      );
      if (veiculoExistente.rows.length > 0) {
        veiculo_id = veiculoExistente.rows[0].id;
        await client.query(
          `UPDATE veiculos SET modelo = COALESCE($1, modelo), ano = COALESCE($2, ano),
           cor = COALESCE($3, cor), chassi = COALESCE($4, chassi), motor = COALESCE($5, motor)
           WHERE id = $6`,
          [veiculo.modelo || null, veiculo.ano || null, veiculo.cor || null,
           veiculo.chassi || null, veiculo.motor || null, veiculo_id]
        );
      } else {
        const novoVeiculo = await client.query(
          `INSERT INTO veiculos (placa, modelo, ano, cor, chassi, motor, cliente_id, cliente_nome)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [veiculo.placa, veiculo.modelo, veiculo.ano, veiculo.cor,
           veiculo.chassi, veiculo.motor, cliente_id, cliente_nome]
        );
        veiculo_id = novoVeiculo.rows[0].id;
      }
    }

    await client.query(
      `UPDATE ordens_servico
       SET cliente_id = COALESCE($1, cliente_id),
           cliente_nome = COALESCE($2, cliente_nome),
           veiculo_id = COALESCE($3, veiculo_id),
           queixa = $4, obs_tecnica = $5, km_atual = $6, frota = $7,
           checklist = $8, num_pedido_compra = $9, num_pedido_servico = $10,
           cliente_cpf_cnpj = COALESCE($11, cliente_cpf_cnpj),
           cliente_telefone  = COALESCE($12, cliente_telefone),
           cliente_email     = COALESCE($13, cliente_email),
           atualizado_em = NOW()
       WHERE id = $14`,
      [cliente_id || null, cliente_nome || null, veiculo_id || null,
       queixa, obs_tecnica, km_atual || null, frota || null,
       JSON.stringify(checklist || {}),
       num_pedido_compra || null, num_pedido_servico || null,
       cliente_cpf_cnpj || null, cliente_telefone || null, cliente_email || null, id]
    );

    // Atualizar serviços — apaga e recria
    await client.query('DELETE FROM itens_servico WHERE os_id = $1', [id]);
    if (servicos && servicos.length > 0) {
      for (const s of servicos) {
        await client.query(
          `INSERT INTO itens_servico (os_id, bling_produto_id, descricao, valor, quantidade, mecanico_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, s.bling_produto_id, s.descricao, s.valor, s.quantidade || 1, s.mecanico_id]
        );
      }
    }

    // Atualizar peças — apaga e recria
    await client.query('DELETE FROM itens_pecas WHERE os_id = $1', [id]);
    if (pecas && pecas.length > 0) {
      for (const p of pecas) {
        await client.query(
          `INSERT INTO itens_pecas (os_id, bling_produto_id, descricao, quantidade, valor_unit)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, p.bling_produto_id, p.descricao, p.quantidade, p.valor_unit]
        );
      }
    }

    // Registrar histórico
    await client.query(
      `INSERT INTO historico (usuario_id, usuario_nome, tabela, registro_id, acao, dados_anteriores)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.usuario.id, req.usuario.nome, 'ordens_servico', id, 'EDITOU', JSON.stringify(anterior.rows[0])]
    );

    await client.query('COMMIT');
    res.json({ mensagem: 'OS atualizada com sucesso' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar OS' });
  } finally {
    client.release();
  }
};

// Excluir OS
const excluirOS = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const os = await client.query(
      'SELECT * FROM ordens_servico WHERE id = $1', [id]
    );

    if (os.rows.length === 0) {
      return res.status(404).json({ erro: 'OS não encontrada' });
    }

    // Registrar no histórico antes de excluir
    await client.query(
      `INSERT INTO historico (usuario_id, usuario_nome, tabela, registro_id, acao, dados_anteriores)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.usuario.id, req.usuario.nome, 'ordens_servico', id, 'EXCLUIU', JSON.stringify(os.rows[0])]
    );

    await client.query('DELETE FROM ordens_servico WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ mensagem: 'OS excluída com sucesso' });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao excluir OS' });
  } finally {
    client.release();
  }
};

// Faturar OS — cria pedido de venda no Bling e atualiza status para 'faturada'
const faturarOS = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const os = await client.query(
      `SELECT os.*, v.placa, v.modelo FROM ordens_servico os
       LEFT JOIN veiculos v ON v.id = os.veiculo_id
       WHERE os.id = $1`,
      [id]
    );

    if (os.rows.length === 0) {
      return res.status(404).json({ erro: 'OS não encontrada' });
    }

    const servicos = await client.query(
      'SELECT * FROM itens_servico WHERE os_id = $1', [id]
    );

    const pecas = await client.query(
      'SELECT * FROM itens_pecas WHERE os_id = $1', [id]
    );

    const itens = [];

    for (const s of servicos.rows) {
      itens.push({
        produto: s.bling_produto_id ? { id: s.bling_produto_id } : null,
        descricao: s.descricao,
        quantidade: s.quantidade || 1,
        valor: parseFloat(s.valor)
      });
    }

    for (const p of pecas.rows) {
      itens.push({
        produto: p.bling_produto_id ? { id: p.bling_produto_id } : null,
        descricao: p.descricao,
        quantidade: parseFloat(p.quantidade),
        valor: parseFloat(p.valor_unit)
      });
    }

    const payload = {
      contato: { id: os.rows[0].cliente_id },
      observacoes: `OS #${os.rows[0].numero} — ${os.rows[0].cliente_nome} — ${os.rows[0].modelo || ''} ${os.rows[0].placa || ''}`,
      itens
    };

    const pedido = await blingRequest(pool, 'POST', '/pedidos/vendas', {}, payload);
    const bling_pedido_id = pedido.data?.id;

    await client.query(
      `UPDATE ordens_servico
       SET status = 'autorizada_faturamento', bling_pedido_id = $1, atualizado_em = NOW()
       WHERE id = $2`,
      [bling_pedido_id, id]
    );

    await client.query(
      `INSERT INTO historico (usuario_id, usuario_nome, tabela, registro_id, acao, dados_novos)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.usuario.id, req.usuario.nome, 'ordens_servico', id, 'FATUROU',
       JSON.stringify({ bling_pedido_id, status: 'autorizada_faturamento' })]
    );

    await client.query('COMMIT');
    res.json({ mensagem: 'OS faturada com sucesso!', bling_pedido_id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao faturar OS:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Erro ao faturar OS no Bling' });
  } finally {
    client.release();
  }
};

module.exports = { listarOS, buscarOS, criarOS, atualizarOS, atualizarStatus, faturarOS, excluirOS };
