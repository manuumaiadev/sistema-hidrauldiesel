const pool = require('../config/database');

// Listar mecânicos
const listarMecanicos = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        m.id,
        m.nome,
        m.telefone,
        m.percentual_comissao,
        m.ativo,
        COALESCE(SUM(c.valor_comissao), 0) AS total_comissoes,
        'mecanicos' AS origem
      FROM mecanicos m
      LEFT JOIN comissoes c ON c.mecanico_id = m.id
      WHERE m.ativo = true
      GROUP BY m.id

      UNION ALL

      SELECT
        f.id,
        f.nome,
        NULL AS telefone,
        f.percentual_comissao,
        f.ativo,
        0 AS total_comissoes,
        'funcionarios' AS origem
      FROM funcionarios f
      WHERE f.cargo_tipo = 'mecanico'
        AND f.ativo = true
        AND NOT EXISTS (SELECT 1 FROM mecanicos m2 WHERE m2.id = f.mecanico_id)

      ORDER BY nome
    `);

    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar mecânicos' });
  }
};

// Buscar mecânico por ID
const buscarMecanico = async (req, res) => {
  const { id } = req.params;

  try {
    const mecanico = await pool.query(
      'SELECT * FROM mecanicos WHERE id = $1',
      [id]
    );

    if (mecanico.rows.length === 0) {
      return res.status(404).json({ erro: 'Mecânico não encontrado' });
    }

    const comissoes = await pool.query(`
      SELECT
        c.*,
        os.numero,
        os.cliente_nome
      FROM comissoes c
      JOIN ordens_servico os ON os.id = c.os_id
      WHERE c.mecanico_id = $1
      ORDER BY c.criado_em DESC
    `, [id]);

    res.json({
      ...mecanico.rows[0],
      comissoes: comissoes.rows
    });

  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar mecânico' });
  }
};

// Criar mecânico
const criarMecanico = async (req, res) => {
  const { nome, telefone, percentual_comissao } = req.body;

  try {
    const resultado = await pool.query(
      `INSERT INTO mecanicos (nome, telefone, percentual_comissao)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nome, telefone, percentual_comissao || 0]
    );

    await pool.query(
      `INSERT INTO historico (usuario_id, usuario_nome, tabela, registro_id, acao, dados_novos)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.usuario.id, req.usuario.nome, 'mecanicos',
       resultado.rows[0].id, 'CRIOU', JSON.stringify(resultado.rows[0])]
    );

    res.status(201).json(resultado.rows[0]);

  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar mecânico' });
  }
};

// Atualizar mecânico
const atualizarMecanico = async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, percentual_comissao, ativo } = req.body;

  try {
    const anterior = await pool.query(
      'SELECT * FROM mecanicos WHERE id = $1', [id]
    );

    if (anterior.rows.length === 0) {
      return res.status(404).json({ erro: 'Mecânico não encontrado' });
    }

    const resultado = await pool.query(
      `UPDATE mecanicos
       SET nome = COALESCE($1, nome),
           telefone = COALESCE($2, telefone),
           percentual_comissao = COALESCE($3, percentual_comissao),
           ativo = COALESCE($4, ativo)
       WHERE id = $5
       RETURNING *`,
      [nome, telefone, percentual_comissao, ativo, id]
    );

    await pool.query(
      `INSERT INTO historico (usuario_id, usuario_nome, tabela, registro_id, acao, dados_anteriores, dados_novos)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.usuario.id, req.usuario.nome, 'mecanicos', id, 'EDITOU',
       JSON.stringify(anterior.rows[0]), JSON.stringify(resultado.rows[0])]
    );

    res.json(resultado.rows[0]);

  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar mecânico' });
  }
};

module.exports = { listarMecanicos, buscarMecanico, criarMecanico, atualizarMecanico };
