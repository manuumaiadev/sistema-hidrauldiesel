const pool = require('../config/database');

const listarFuncionarios = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT f.*,
        COUNT(p.id) FILTER (WHERE p.presente = false AND DATE_TRUNC('month', p.data) = DATE_TRUNC('month', NOW())) as faltas_mes
      FROM funcionarios f
      LEFT JOIN ponto p ON p.funcionario_id = f.id
      WHERE f.ativo = true
      GROUP BY f.id
      ORDER BY f.nome
    `);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar funcionários' });
  }
};

const criarFuncionario = async (req, res) => {
  const { nome, tipo, cargo, cargo_tipo, salario_oficial, salario_adicional, adiantamento_fixo, vale_transporte, percentual_inss, data_admissao, mecanico_id, comentario_importante } = req.body;
  try {
    const resultado = await pool.query(
      `INSERT INTO funcionarios (nome, tipo, cargo, cargo_tipo, salario_oficial, salario_adicional, adiantamento_fixo, vale_transporte, percentual_inss, data_admissao, mecanico_id, comentario_importante)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [nome, tipo, cargo, cargo_tipo || 'outro', salario_oficial || 0, salario_adicional || 0, adiantamento_fixo || 0, vale_transporte || 0, percentual_inss || 0, data_admissao || null, mecanico_id || null, comentario_importante || null]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao criar funcionário:', err.message);
    res.status(500).json({ erro: 'Erro ao criar funcionário' });
  }
};

const atualizarFuncionario = async (req, res) => {
  const { id } = req.params;
  const { nome, tipo, cargo, cargo_tipo, salario_oficial, salario_adicional, adiantamento_fixo, vale_transporte, percentual_inss, percentual_comissao, data_admissao, ativo, status, mecanico_id, comentario_importante } = req.body;
  try {
    const resultado = await pool.query(
      `UPDATE funcionarios SET
        nome = COALESCE($1, nome),
        tipo = COALESCE($2, tipo),
        cargo = COALESCE($3, cargo),
        cargo_tipo = COALESCE($4, cargo_tipo),
        salario_oficial = COALESCE($5, salario_oficial),
        salario_adicional = COALESCE($6, salario_adicional),
        adiantamento_fixo = COALESCE($7, adiantamento_fixo),
        vale_transporte = COALESCE($8, vale_transporte),
        percentual_inss = COALESCE($9, percentual_inss),
        percentual_comissao = COALESCE($10, percentual_comissao),
        data_admissao = COALESCE($11, data_admissao),
        ativo = COALESCE($12, ativo),
        status = COALESCE($13, status),
        mecanico_id = $14,
        comentario_importante = COALESCE($15, comentario_importante)
       WHERE id = $16 RETURNING *`,
      [nome, tipo, cargo, cargo_tipo, salario_oficial, salario_adicional, adiantamento_fixo, vale_transporte, percentual_inss, percentual_comissao, data_admissao, ativo, status, mecanico_id || null, comentario_importante !== undefined ? (comentario_importante || null) : undefined, id]
    );
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar funcionário:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar funcionário' });
  }
};

// ── Adiantamentos ──────────────────────────────────────────────────────────────

const registrarAdiantamento = async (req, res) => {
  const { funcionario_id, valor, data, observacoes, desconto_em: descontoEmBody } = req.body;
  try {
    // Parse seguro sem timezone: "YYYY-MM-DD" → partes numéricas direto
    const [anoStr, mesStr, diaStr] = (data || '').split('T')[0].split('-');
    const dia = parseInt(diaStr, 10);
    const mes = parseInt(mesStr, 10);
    const ano = parseInt(anoStr, 10);

    let desconto_em;
    if (descontoEmBody) {
      desconto_em = descontoEmBody;
    } else if (dia <= 5) {
      desconto_em = `05/${String(mes).padStart(2,'0')}/${ano}`;
    } else if (dia <= 20) {
      desconto_em = `20/${String(mes).padStart(2,'0')}/${ano}`;
    } else {
      const proximoMes = mes === 12 ? 1 : mes + 1;
      const proximoAno = mes === 12 ? ano + 1 : ano;
      desconto_em = `05/${String(proximoMes).padStart(2,'0')}/${proximoAno}`;
    }

    const resultado = await pool.query(
      `INSERT INTO adiantamentos (funcionario_id, valor, data, desconto_em, observacoes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [funcionario_id, valor, data, desconto_em, observacoes]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao registrar adiantamento' });
  }
};

const listarAdiantamentos = async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      `SELECT * FROM adiantamentos WHERE funcionario_id = $1 ORDER BY data DESC`,
      [id]
    );
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar adiantamentos' });
  }
};

// ── Férias ─────────────────────────────────────────────────────────────────────

const registrarFerias = async (req, res) => {
  const { funcionario_id, data_inicio, data_fim, valor, observacoes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await client.query(
      `INSERT INTO ferias (funcionario_id, data_inicio, data_fim, valor, observacoes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [funcionario_id, data_inicio, data_fim, valor, observacoes]
    );
    await client.query(`UPDATE funcionarios SET status = 'ferias' WHERE id = $1`, [funcionario_id]);
    await client.query('COMMIT');
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao registrar férias' });
  } finally {
    client.release();
  }
};

// ── Rescisão ───────────────────────────────────────────────────────────────────

const registrarRescisao = async (req, res) => {
  const { funcionario_id, data_rescisao, valor_saldo, valor_ferias_prop,
          valor_decimo_terceiro, valor_fgts, outros_valores, observacoes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const valor_total = (parseFloat(valor_saldo) || 0) +
                        (parseFloat(valor_ferias_prop) || 0) +
                        (parseFloat(valor_decimo_terceiro) || 0) +
                        (parseFloat(valor_fgts) || 0) +
                        (parseFloat(outros_valores) || 0);
    const resultado = await client.query(
      `INSERT INTO rescisao (funcionario_id, data_rescisao, valor_saldo, valor_ferias_prop,
       valor_decimo_terceiro, valor_fgts, outros_valores, valor_total, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [funcionario_id, data_rescisao, valor_saldo, valor_ferias_prop,
       valor_decimo_terceiro, valor_fgts, outros_valores, valor_total, observacoes]
    );
    await client.query(`UPDATE funcionarios SET status = 'inativo' WHERE id = $1`, [funcionario_id]);
    await client.query('COMMIT');
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao registrar rescisão' });
  } finally {
    client.release();
  }
};

// ── Vendedor ───────────────────────────────────────────────────────────────────

const vincularEmpresa = async (req, res) => {
  const { funcionario_id, cliente_id, cliente_nome } = req.body;
  try {
    const resultado = await pool.query(
      `INSERT INTO vendedor_empresas (funcionario_id, cliente_id, cliente_nome)
       VALUES ($1, $2, $3) RETURNING *`,
      [funcionario_id, cliente_id, cliente_nome]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao vincular empresa:', err.message);
    res.status(500).json({ erro: 'Erro ao vincular empresa', detalhe: err.message });
  }
};

const listarEmpresasVendedor = async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      `SELECT * FROM vendedor_empresas WHERE funcionario_id = $1 ORDER BY cliente_nome`,
      [id]
    );
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar empresas' });
  }
};

const calcularComissaoVendedor = async (req, res) => {
  const { id } = req.params;
  try {
    const funcionario = await pool.query('SELECT * FROM funcionarios WHERE id = $1', [id]);
    const empresas = await pool.query(
      'SELECT cliente_id FROM vendedor_empresas WHERE funcionario_id = $1', [id]
    );

    const clienteIds = empresas.rows.map(e => e.cliente_id);
    if (clienteIds.length === 0) return res.json({ comissoes: [], total: 0 });

    const os = await pool.query(`
      SELECT
        os.id, os.numero, os.cliente_nome, os.cliente_id, os.criado_em,
        COALESCE(SUM(s.valor * s.quantidade), 0) +
        COALESCE(SUM(p.quantidade * p.valor_unit), 0) as valor_total
      FROM ordens_servico os
      LEFT JOIN itens_servico s ON s.os_id = os.id
      LEFT JOIN itens_pecas p ON p.os_id = os.id
      WHERE os.status = 'finalizada'
      AND os.cliente_id = ANY($1)
      GROUP BY os.id
      ORDER BY os.criado_em DESC
    `, [clienteIds]);

    const percentual = parseFloat(funcionario.rows[0]?.percentual_comissao || 0);
    const comissoes = os.rows.map(o => ({
      ...o,
      percentual,
      valor_comissao: (parseFloat(o.valor_total) * percentual) / 100
    }));

    const total = comissoes.reduce((acc, c) => acc + c.valor_comissao, 0);
    res.json({ comissoes, total });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao calcular comissão' });
  }
};

const deletarFuncionario = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`UPDATE funcionarios SET ativo = false, status = 'inativo' WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir funcionário:', err.message);
    res.status(500).json({ erro: 'Erro ao excluir funcionário' });
  }
};

module.exports = {
  listarFuncionarios, criarFuncionario, atualizarFuncionario, deletarFuncionario,
  registrarAdiantamento, listarAdiantamentos,
  registrarFerias,
  registrarRescisao,
  vincularEmpresa, listarEmpresasVendedor, calcularComissaoVendedor,
};
