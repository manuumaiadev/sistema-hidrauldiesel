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
  const { nome, tipo, cargo, cargo_tipo, salario_oficial, salario_adicional, adiantamento_fixo, adiantamento_dia05, vale_transporte, vale_alimentacao, percentual_inss, data_admissao, mecanico_id, comentario_importante } = req.body;
  try {
    const resultado = await pool.query(
      `INSERT INTO funcionarios (nome, tipo, cargo, cargo_tipo, salario_oficial, salario_adicional, adiantamento_fixo, adiantamento_dia05, vale_transporte, vale_alimentacao, percentual_inss, data_admissao, mecanico_id, comentario_importante)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [nome, tipo, cargo, cargo_tipo || 'outro', salario_oficial || 0, salario_adicional || 0, adiantamento_fixo || 0, adiantamento_dia05 || 0, vale_transporte || 0, vale_alimentacao || 0, percentual_inss || 0, data_admissao || null, mecanico_id || null, comentario_importante || null]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao criar funcionário:', err.message);
    res.status(500).json({ erro: 'Erro ao criar funcionário' });
  }
};

const atualizarFuncionario = async (req, res) => {
  const { id } = req.params;
  const { nome, tipo, cargo, cargo_tipo, salario_oficial, salario_adicional, adiantamento_fixo, adiantamento_dia05, vale_transporte, vale_alimentacao, percentual_inss, percentual_comissao, data_admissao, ativo, status, mecanico_id, comentario_importante } = req.body;
  try {
    // Mantém ativo e status sempre em sincronia:
    // se ativo foi explicitamente enviado, status acompanha (a menos que status também seja enviado explicitamente)
    let statusFinal = status;
    if (statusFinal === undefined && ativo !== undefined) {
      statusFinal = ativo ? 'ativo' : 'inativo';
    }

    const resultado = await pool.query(
      `UPDATE funcionarios SET
        nome = COALESCE($1, nome),
        tipo = COALESCE($2, tipo),
        cargo = COALESCE($3, cargo),
        cargo_tipo = COALESCE($4, cargo_tipo),
        salario_oficial = COALESCE($5, salario_oficial),
        salario_adicional = COALESCE($6, salario_adicional),
        adiantamento_fixo = COALESCE($7, adiantamento_fixo),
        adiantamento_dia05 = COALESCE($8, adiantamento_dia05),
        vale_transporte = COALESCE($9, vale_transporte),
        percentual_inss = COALESCE($10, percentual_inss),
        percentual_comissao = COALESCE($11, percentual_comissao),
        data_admissao = COALESCE($12, data_admissao),
        ativo = COALESCE($13, ativo),
        status = COALESCE($14, status),
        mecanico_id = $15,
        comentario_importante = COALESCE($16, comentario_importante),
        vale_alimentacao = COALESCE($17, vale_alimentacao)
       WHERE id = $18 RETURNING *`,
      [nome, tipo, cargo, cargo_tipo, salario_oficial, salario_adicional, adiantamento_fixo, adiantamento_dia05, vale_transporte, percentual_inss, percentual_comissao, data_admissao, ativo, statusFinal, mecanico_id || null, comentario_importante !== undefined ? (comentario_importante || null) : undefined, vale_alimentacao, id]
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

const editarAdiantamento = async (req, res) => {
  const { id } = req.params;
  const { valor, data, desconto_em, observacoes } = req.body;
  try {
    // Só permite editar se ainda não foi descontado
    const check = await pool.query(`SELECT descontado FROM adiantamentos WHERE id = $1`, [id]);
    if (!check.rows.length) return res.status(404).json({ erro: 'Adiantamento não encontrado' });
    if (check.rows[0].descontado) return res.status(403).json({ erro: 'Adiantamento já descontado não pode ser editado' });

    const resultado = await pool.query(
      `UPDATE adiantamentos SET valor = $1, data = $2, desconto_em = $3, observacoes = $4 WHERE id = $5 RETURNING *`,
      [valor, data, desconto_em, observacoes, id]
    );
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao editar adiantamento' });
  }
};

const deletarAdiantamento = async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query(`SELECT descontado FROM adiantamentos WHERE id = $1`, [id]);
    if (!check.rows.length) return res.status(404).json({ erro: 'Adiantamento não encontrado' });
    if (check.rows[0].descontado) return res.status(403).json({ erro: 'Adiantamento já descontado não pode ser excluído' });
    await pool.query(`DELETE FROM adiantamentos WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir adiantamento' });
  }
};

// ── Férias ─────────────────────────────────────────────────────────────────────

// Aplica as alterações de schema na tabela ferias — roda ao carregar o módulo
(async function _fixSchemaFerias() {
  try {
    await pool.query(`ALTER TABLE ferias ADD COLUMN IF NOT EXISTS data_pagamento DATE`);
    await pool.query(`ALTER TABLE ferias ALTER COLUMN data_inicio DROP NOT NULL`);
    await pool.query(`ALTER TABLE ferias ALTER COLUMN data_fim    DROP NOT NULL`);
  } catch (_) { /* silencia erros se já aplicado */ }
})();

const registrarFerias = async (req, res) => {
  const { funcionario_id, data_inicio, data_fim, data_pagamento, valor, observacoes } = req.body;
  const temPeriodo = !!(data_inicio && data_fim);

  // Fallback: se as colunas ainda forem NOT NULL, usa data_pagamento como valor provisório
  const dinicioVal = data_inicio || data_pagamento || null;
  const dfimVal    = data_fim    || data_pagamento || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await client.query(
      `INSERT INTO ferias (funcionario_id, data_inicio, data_fim, data_pagamento, valor, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [funcionario_id, dinicioVal, dfimVal, data_pagamento || null, valor, observacoes]
    );
    if (temPeriodo) {
      await client.query(`UPDATE funcionarios SET status = 'ferias' WHERE id = $1`, [funcionario_id]);
    }
    await client.query('COMMIT');
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar férias:', err.message);
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};

// ── Rescisão ───────────────────────────────────────────────────────────────────

const registrarRescisao = async (req, res) => {
  const { funcionario_id, data_rescisao, valor_saldo, valor_ferias_prop,
          valor_decimo_terceiro, valor_fgts, outros_valores, observacoes,
          pagamento_parcial, valor_pago_agora, data_pagamento_parcial, marcar_inativo } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const valor_total = (parseFloat(valor_saldo) || 0) +
                        (parseFloat(valor_ferias_prop) || 0) +
                        (parseFloat(valor_decimo_terceiro) || 0) +
                        (parseFloat(valor_fgts) || 0) +
                        (parseFloat(outros_valores) || 0);
    // valor efetivamente pago neste momento (pode ser parcial)
    const valor_pago = pagamento_parcial ? (parseFloat(valor_pago_agora) || 0) : valor_total;
    const saldo_restante = Math.max(0, valor_total - valor_pago);
    const data_pgto = pagamento_parcial ? (data_pagamento_parcial || data_rescisao) : data_rescisao;
    const resultado = await client.query(
      `INSERT INTO rescisao (funcionario_id, data_rescisao, data_pagamento, valor_saldo, valor_ferias_prop,
       valor_decimo_terceiro, valor_fgts, outros_valores, valor_total, valor_pago, saldo_restante, observacoes, num_parcelas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [funcionario_id, data_rescisao, data_pgto, valor_saldo, valor_ferias_prop,
       valor_decimo_terceiro, valor_fgts, outros_valores, valor_total,
       valor_pago, saldo_restante, observacoes, pagamento_parcial ? 2 : 1]
    );
    if (marcar_inativo) {
      await client.query(`UPDATE funcionarios SET status = 'inativo' WHERE id = $1`, [funcionario_id]);
    }
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

// ── Décimo Terceiro ────────────────────────────────────────────────────────────

const registrarDecimo = async (req, res) => {
  const { funcionario_id, ano, data_pagamento, valor, observacoes } = req.body;
  if (!funcionario_id || !valor || !data_pagamento) {
    return res.status(400).json({ erro: 'Campos obrigatórios: funcionario_id, data_pagamento, valor' });
  }
  try {
    const anoRef = ano || new Date().getFullYear();
    const resultado = await pool.query(
      `INSERT INTO decimo_terceiro (funcionario_id, ano, data_pagamento, valor, observacoes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [funcionario_id, anoRef, data_pagamento, valor, observacoes || null]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar décimo terceiro' });
  }
};

const listarDecimos = async (req, res) => {
  const { id } = req.params;
  const { ano } = req.query;
  try {
    const params = [id];
    let where = 'WHERE funcionario_id = $1';
    if (ano) { params.push(ano); where += ` AND ano = $${params.length}`; }
    const resultado = await pool.query(
      `SELECT * FROM decimo_terceiro ${where} ORDER BY data_pagamento DESC`,
      params
    );
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar décimos' });
  }
};

// ── Resumo de pagamentos ───────────────────────────────────────────────────────

const resumoPagamentos = async (req, res) => {
  const { id } = req.params;
  const { de, ate } = req.query; // YYYY-MM-DD

  const filtroFolha = de && ate
    ? `AND data_pagamento BETWEEN '${de}' AND '${ate}'` : '';
  const filtroVT = de && ate
    ? `AND data_pagamento BETWEEN '${de}' AND '${ate}'` : '';
  const filtroAdiant = de && ate
    ? `AND data BETWEEN '${de}' AND '${ate}'` : '';
  const filtroFerias = de && ate
    ? `AND data_inicio BETWEEN '${de}' AND '${ate}'` : '';
  const filtroDecimo = de && ate
    ? `AND data_pagamento BETWEEN '${de}' AND '${ate}'` : '';
  const filtroRescisao = de && ate
    ? `AND data_rescisao BETWEEN '${de}' AND '${ate}'` : '';

  try {
    const resultado = await pool.query(`
      SELECT
        'Folha de Pagamento'            AS categoria,
        tipo                            AS subtipo,
        data_pagamento                  AS data,
        valor_pago                      AS valor,
        observacoes
      FROM folha_pagamento
      WHERE funcionario_id = $1 ${filtroFolha}

      UNION ALL

      SELECT
        'Vale Transporte'               AS categoria,
        NULL                            AS subtipo,
        data_pagamento                  AS data,
        valor                           AS valor,
        observacoes
      FROM vale_transporte
      WHERE funcionario_id = $1 ${filtroVT}

      UNION ALL

      SELECT
        'Adiantamento'                  AS categoria,
        CASE WHEN descontado THEN 'descontado' ELSE 'pendente' END AS subtipo,
        data                            AS data,
        valor                           AS valor,
        observacoes
      FROM adiantamentos
      WHERE funcionario_id = $1 ${filtroAdiant}

      UNION ALL

      SELECT
        'Férias'                        AS categoria,
        NULL                            AS subtipo,
        data_inicio                     AS data,
        valor                           AS valor,
        observacoes
      FROM ferias
      WHERE funcionario_id = $1 ${filtroFerias}

      UNION ALL

      SELECT
        '13º Salário'                   AS categoria,
        NULL                            AS subtipo,
        data_pagamento                  AS data,
        valor                           AS valor,
        observacoes
      FROM decimo_terceiro
      WHERE funcionario_id = $1 ${filtroDecimo}

      UNION ALL

      SELECT
        'Rescisão'                      AS categoria,
        CASE WHEN saldo_restante > 0 THEN 'parcial' ELSE 'completa' END AS subtipo,
        data_rescisao                   AS data,
        COALESCE(valor_pago, valor_total) AS valor,
        observacoes
      FROM rescisao
      WHERE funcionario_id = $1 ${filtroRescisao}

      ORDER BY data DESC
    `, [id]);

    // Totais por categoria
    const totais = {};
    for (const r of resultado.rows) {
      totais[r.categoria] = (totais[r.categoria] || 0) + parseFloat(r.valor || 0);
    }
    const total_geral = Object.values(totais).reduce((a, v) => a + v, 0);

    res.json({ lancamentos: resultado.rows, totais, total_geral });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar resumo de pagamentos' });
  }
};

const listarFerias = async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query(`
      SELECT id,
        TO_CHAR(data_inicio,    'DD/MM/YYYY') AS data_inicio,
        TO_CHAR(data_fim,       'DD/MM/YYYY') AS data_fim,
        TO_CHAR(data_pagamento, 'DD/MM/YYYY') AS data_pagamento,
        valor, observacoes,
        TO_CHAR(criado_em, 'DD/MM/YYYY') AS criado_em
      FROM ferias
      WHERE funcionario_id = $1
      ORDER BY COALESCE(data_pagamento, data_inicio) DESC
    `, [id]);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar férias' });
  }
};

module.exports = {
  listarFuncionarios, criarFuncionario, atualizarFuncionario, deletarFuncionario,
  registrarAdiantamento, listarAdiantamentos, editarAdiantamento, deletarAdiantamento,
  registrarFerias, listarFerias,
  registrarRescisao,
  registrarDecimo, listarDecimos,
  resumoPagamentos,
  vincularEmpresa, listarEmpresasVendedor, calcularComissaoVendedor,
};
