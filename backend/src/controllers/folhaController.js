const pool = require('../config/database');

// Gerar folha dia 05 (fechamento mês anterior)
const gerarFolhaDia05 = async (req, res) => {
  const { mes, ano } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    const dataPagamento = `${ano}-${String(mes).padStart(2,'0')}-05`;

    const jaExiste = await client.query(
      `SELECT 1 FROM folha_pagamento WHERE data_pagamento = $1 LIMIT 1`,
      [dataPagamento]
    );
    if (jaExiste.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: `Já existe uma folha gerada para ${String('05').padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}. Exclua-a antes de gerar novamente.` });
    }

    const funcionarios = await client.query(
      `SELECT * FROM funcionarios WHERE ativo = true AND COALESCE(status,'ativo') != 'inativo' ORDER BY nome`
    );

    // Próximo/anterior dia útil para detectar faltas consecutivas
    function nextWD(s) {
      const d = new Date(s + 'T12:00:00');
      d.setDate(d.getDate() + (d.getDay() === 5 ? 3 : 1));
      return d.toISOString().slice(0, 10);
    }
    function prevWD(s) {
      const d = new Date(s + 'T12:00:00');
      d.setDate(d.getDate() - (d.getDay() === 1 ? 3 : 1));
      return d.toISOString().slice(0, 10);
    }

    const folha = [];

    for (const f of funcionarios.rows) {
      const pontoDados = await client.query(`
        SELECT TO_CHAR(data, 'YYYY-MM-DD') as data, status
        FROM ponto
        WHERE funcionario_id = $1
        AND EXTRACT(MONTH FROM data) = $2
        AND EXTRACT(YEAR FROM data) = $3
        AND EXTRACT(DOW FROM data) BETWEEN 1 AND 5
        ORDER BY data
      `, [f.id, mesAnterior, anoAnterior]);

      const faltaSet = new Set(
        pontoDados.rows.filter(r => r.status === 'falta').map(r => r.data)
      );

      let diasDesconto = 0;
      for (const row of pontoDados.rows) {
        if (row.status === 'meia_falta') {
          diasDesconto += 1;
        } else if (row.status === 'falta') {
          // falta isolada (sem falta no dia útil anterior nem posterior) perde também o DSR (domingo)
          const isolated = !faltaSet.has(prevWD(row.data)) && !faltaSet.has(nextWD(row.data));
          diasDesconto += isolated ? 2 : 1;
        }
        // falta_justificada: sem desconto
      }
      const valorDia = (parseFloat(f.salario_oficial) + parseFloat(f.salario_adicional)) / 30;
      const descontoFaltas = valorDia * diasDesconto;

      const descontoInss = f.tipo === 'clt' ? parseFloat(f.percentual_inss) || 0 : 0;

      const adiantamentos = await client.query(`
        SELECT COALESCE(SUM(valor), 0) as total
        FROM adiantamentos
        WHERE funcionario_id = $1
        AND descontado = false
        AND desconto_em = $2
      `, [f.id, `05/${String(mes).padStart(2,'0')}/${ano}`]);

      const totalAdiantamentos = (parseFloat(adiantamentos.rows[0].total) || 0)
                               + (parseFloat(f.adiantamento_dia05) || 0);
      const propOficial   = parseFloat(f.salario_oficial)   / 2;
      const propAdicional = parseFloat(f.salario_adicional) / 2;

      const valorPago = propOficial + propAdicional - descontoInss - descontoFaltas - totalAdiantamentos;

      // Guardar detalhe das faltas (data formatada DD/MM/YYYY + status)
      const pad = n => String(n).padStart(2, '0');
      const faltasDetalhes = pontoDados.rows
        .filter(r => r.status === 'falta' || r.status === 'meia_falta')
        .map(r => {
          const [a, m, d] = r.data.split('-');
          return { data: `${d}/${m}/${a}`, status: r.status };
        });

      const registro = await client.query(
        `INSERT INTO folha_pagamento
         (funcionario_id, tipo, data_pagamento, salario_oficial, salario_adicional,
          desconto_inss, desconto_adiantamento, desconto_faltas, valor_pago, faltas_detalhes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
         RETURNING *`,
        [f.id, 'mensal', dataPagamento, propOficial, propAdicional,
         descontoInss, totalAdiantamentos, descontoFaltas, valorPago,
         JSON.stringify(faltasDetalhes)]
      );

      await client.query(`
        UPDATE adiantamentos SET descontado = true
        WHERE funcionario_id = $1 AND desconto_em = $2
      `, [f.id, `05/${String(mes).padStart(2,'0')}/${ano}`]);

      folha.push({
        funcionario_nome: f.nome,
        funcionario_tipo: f.tipo,
        ...registro.rows[0],
        dias_desconto: diasDesconto
      });
    }

    await client.query('COMMIT');
    res.status(201).json({
      data_pagamento: dataPagamento,
      funcionarios: folha,
      totais: {
        total_oficial:   folha.reduce((a, f) => a + parseFloat(f.salario_oficial), 0),
        total_adicional: folha.reduce((a, f) => a + parseFloat(f.salario_adicional), 0),
        total_descontos: folha.reduce((a, f) => a + parseFloat(f.desconto_inss) + parseFloat(f.desconto_adiantamento) + parseFloat(f.desconto_faltas), 0),
        total_pago:      folha.reduce((a, f) => a + parseFloat(f.valor_pago), 0)
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar folha dia 05' });
  } finally {
    client.release();
  }
};

// Gerar folha dia 20 (adiantamento)
const gerarFolhaDia20 = async (req, res) => {
  const { mes, ano } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const dataPagamento = `${ano}-${String(mes).padStart(2,'0')}-20`;

    const jaExiste = await client.query(
      `SELECT 1 FROM folha_pagamento WHERE data_pagamento = $1 LIMIT 1`,
      [dataPagamento]
    );
    if (jaExiste.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: `Já existe uma folha gerada para ${String('20').padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}. Exclua-a antes de gerar novamente.` });
    }

    const funcionarios = await client.query(
      `SELECT * FROM funcionarios WHERE ativo = true AND COALESCE(status,'ativo') != 'inativo' ORDER BY nome`
    );

    const folha = [];

    for (const f of funcionarios.rows) {
      const adiantamentos = await client.query(`
        SELECT COALESCE(SUM(valor), 0) as total
        FROM adiantamentos
        WHERE funcionario_id = $1
        AND descontado = false
        AND desconto_em = $2
      `, [f.id, `20/${String(mes).padStart(2,'0')}/${ano}`]);

      const totalAdiantamentos = parseFloat(adiantamentos.rows[0].total) || 0;
      const propOficial   = parseFloat(f.salario_oficial)   / 2;
      const propAdicional = parseFloat(f.salario_adicional) / 2;
      const valorPago = propOficial + propAdicional - totalAdiantamentos;

      const registro = await client.query(
        `INSERT INTO folha_pagamento
         (funcionario_id, tipo, data_pagamento, salario_oficial, salario_adicional,
          desconto_adiantamento, valor_pago)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [f.id, 'quinzena', dataPagamento, propOficial, propAdicional,
         totalAdiantamentos, valorPago]
      );

      await client.query(`
        UPDATE adiantamentos SET descontado = true
        WHERE funcionario_id = $1 AND desconto_em = $2
      `, [f.id, `20/${String(mes).padStart(2,'0')}/${ano}`]);

      folha.push({
        funcionario_nome: f.nome,
        funcionario_tipo: f.tipo,
        ...registro.rows[0]
      });
    }

    await client.query('COMMIT');
    res.status(201).json({
      data_pagamento: dataPagamento,
      funcionarios: folha,
      totais: {
        total_adiantamento: folha.reduce((a, f) => a + parseFloat(f.salario_adicional), 0),
        total_descontos:    folha.reduce((a, f) => a + parseFloat(f.desconto_adiantamento), 0),
        total_pago:         folha.reduce((a, f) => a + parseFloat(f.valor_pago), 0)
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar folha dia 20' });
  } finally {
    client.release();
  }
};

// Buscar folha por data
const buscarFolha = async (req, res) => {
  const { data_pagamento } = req.params;
  try {
    // Para dia 05: faltas são do mês anterior; para dia 20: mês atual (sem faltas)
    const resultado = await pool.query(`
      SELECT fp.*,
        f.nome  AS funcionario_nome, f.tipo AS funcionario_tipo,
        f.cargo, f.cargo_tipo, f.comentario_importante,
        COALESCE(fp.faltas_detalhes, '[]'::jsonb) AS dias_falta,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'data',        TO_CHAR(a.data, 'DD/MM/YYYY'),
              'valor',       a.valor,
              'desconto_em', a.desconto_em,
              'observacoes', a.observacoes
            )
            ORDER BY a.data
          )
          FROM adiantamentos a
          WHERE a.funcionario_id = fp.funcionario_id
            AND a.descontado = true
            AND a.desconto_em IS NOT NULL
            AND LENGTH(a.desconto_em) = 10
            AND TO_DATE(a.desconto_em, 'DD/MM/YYYY') = fp.data_pagamento
        ), '[]'::json) AS adiantamentos_detalhes
      FROM folha_pagamento fp
      JOIN funcionarios f ON f.id = fp.funcionario_id
      WHERE fp.data_pagamento = $1
      ORDER BY f.nome
    `, [data_pagamento]);

    const totais = {
      total_oficial:   resultado.rows.reduce((a, r) => a + parseFloat(r.salario_oficial), 0),
      total_adicional: resultado.rows.reduce((a, r) => a + parseFloat(r.salario_adicional), 0),
      total_descontos: resultado.rows.reduce((a, r) =>
        a + parseFloat(r.desconto_inss) + parseFloat(r.desconto_adiantamento) +
        parseFloat(r.desconto_faltas) + parseFloat(r.outros_descontos), 0),
      total_pago: resultado.rows.reduce((a, r) => a + parseFloat(r.valor_pago), 0)
    };

    res.json({ data_pagamento, funcionarios: resultado.rows, totais });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar folha' });
  }
};

// Atualizar lançamento individual
const atualizarLancamento = async (req, res) => {
  const { id } = req.params;
  const { salario_oficial, salario_adicional, desconto_inss, desconto_adiantamento,
          desconto_faltas, outros_descontos, outros_acrescimos, observacoes } = req.body;
  try {
    const valorPago = (parseFloat(salario_oficial) || 0) +
                      (parseFloat(salario_adicional) || 0) +
                      (parseFloat(outros_acrescimos) || 0) -
                      (parseFloat(desconto_inss) || 0) -
                      (parseFloat(desconto_adiantamento) || 0) -
                      (parseFloat(desconto_faltas) || 0) -
                      (parseFloat(outros_descontos) || 0);

    const resultado = await pool.query(
      `UPDATE folha_pagamento SET
        salario_oficial       = COALESCE($1, salario_oficial),
        salario_adicional     = COALESCE($2, salario_adicional),
        desconto_inss         = COALESCE($3, desconto_inss),
        desconto_adiantamento = COALESCE($4, desconto_adiantamento),
        desconto_faltas       = COALESCE($5, desconto_faltas),
        outros_descontos      = COALESCE($6, outros_descontos),
        outros_acrescimos     = COALESCE($7, outros_acrescimos),
        observacoes           = COALESCE($8, observacoes),
        valor_pago            = $9
       WHERE id = $10 RETURNING *`,
      [salario_oficial, salario_adicional, desconto_inss, desconto_adiantamento,
       desconto_faltas, outros_descontos, outros_acrescimos, observacoes, valorPago, id]
    );
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar lançamento' });
  }
};

// Listar folhas anteriores
const listarFolhas = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        data_pagamento,
        tipo,
        COUNT(*) as qtd_funcionarios,
        SUM(valor_pago) as total_pago
      FROM folha_pagamento
      GROUP BY data_pagamento, tipo
      ORDER BY data_pagamento DESC
      LIMIT 24
    `);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar folhas' });
  }
};

// Adicionar funcionário a uma folha existente
const adicionarFuncionarioFolha = async (req, res) => {
  const { data_pagamento } = req.params;
  const { funcionario_id } = req.body;
  try {
    const fResult = await pool.query(`SELECT * FROM funcionarios WHERE id = $1`, [funcionario_id]);
    if (!fResult.rows.length) return res.status(404).json({ erro: 'Funcionário não encontrado' });
    const f = fResult.rows[0];

    const dia  = parseInt((data_pagamento || '').split('-')[2], 10);
    const tipo = dia <= 10 ? 'mensal' : 'quinzena';

    const propOficial   = parseFloat(f.salario_oficial)   / 2;
    const propAdicional = parseFloat(f.salario_adicional) / 2;
    const valorPago     = propOficial + propAdicional;

    const resultado = await pool.query(
      `INSERT INTO folha_pagamento
       (funcionario_id, tipo, data_pagamento, salario_oficial, salario_adicional, valor_pago)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (funcionario_id, data_pagamento) DO NOTHING
       RETURNING *`,
      [funcionario_id, tipo, data_pagamento, propOficial, propAdicional, valorPago]
    );

    if (!resultado.rows.length) return res.status(409).json({ erro: 'Funcionário já está nesta folha' });
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao adicionar funcionário à folha' });
  }
};

// Remover lançamento individual
const removerLancamento = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM folha_pagamento WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover lançamento' });
  }
};

// Excluir folha por data
const excluirFolha = async (req, res) => {
  const { data_pagamento } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Converte 'YYYY-MM-DD' → 'DD/MM/YYYY' para bater com desconto_em dos adiantamentos
    const [ano, mes, dia] = data_pagamento.split('-');
    const descontoEmFmt = `${dia}/${mes}/${ano}`;

    // Reverte adiantamentos que foram marcados como descontados nesta folha
    await client.query(
      `UPDATE adiantamentos SET descontado = false WHERE desconto_em = $1`,
      [descontoEmFmt]
    );

    await client.query(`DELETE FROM folha_pagamento WHERE data_pagamento = $1`, [data_pagamento]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir folha' });
  } finally {
    client.release();
  }
};

module.exports = { gerarFolhaDia05, gerarFolhaDia20, buscarFolha, atualizarLancamento, listarFolhas, excluirFolha, adicionarFuncionarioFolha, removerLancamento };
