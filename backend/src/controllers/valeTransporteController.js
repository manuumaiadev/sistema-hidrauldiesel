const pool = require('../config/database');

// Gerar vale transporte semanal
const gerarValeTransporte = async (req, res) => {
  const { data_pagamento } = req.body; // deve ser uma segunda-feira
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Parse seguro sem timezone: "YYYY-MM-DD"
    const [anoStr, mesStr, diaStr] = (data_pagamento || '').split('T')[0].split('-');
    const dataRef = new Date(parseInt(anoStr), parseInt(mesStr) - 1, parseInt(diaStr));

    // Verifica se é segunda-feira (1 = segunda no getDay())
    if (dataRef.getDay() !== 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'Vale transporte deve ser pago às segundas-feiras' });
    }

    // Bloqueia se já existe VT para esta data
    const existente = await client.query(
      'SELECT COUNT(*) FROM vale_transporte WHERE data_pagamento = $1', [data_pagamento]
    );
    if (parseInt(existente.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: 'Já existe um Vale Transporte gerado para esta data. Exclua o existente antes de gerar um novo.' });
    }

    // Calcula semana anterior (segunda a domingo)
    const semanaAnteriorFim = new Date(dataRef);
    semanaAnteriorFim.setDate(dataRef.getDate() - 1); // domingo anterior
    const semanaAnteriorInicio = new Date(semanaAnteriorFim);
    semanaAnteriorInicio.setDate(semanaAnteriorFim.getDate() - 6); // segunda anterior

    // Busca funcionários ativos com vale transporte
    const funcionarios = await client.query(`
      SELECT * FROM funcionarios
      WHERE ativo = true
      AND status = 'ativo'
      AND vale_transporte > 0
      ORDER BY nome
    `);

    const lista = [];

    for (const f of funcionarios.rows) {
      const faltas = await client.query(`
        SELECT
          SUM(CASE WHEN status = 'falta' THEN 1
                   WHEN status = 'meia_falta' THEN 1
                   ELSE 0 END) as dias_desconto
        FROM ponto
        WHERE funcionario_id = $1
        AND data BETWEEN $2 AND $3
        AND EXTRACT(DOW FROM data) BETWEEN 1 AND 5
      `, [f.id, semanaAnteriorInicio, semanaAnteriorFim]);

      const diasDesconto = parseFloat(faltas.rows[0].dias_desconto) || 0;
      const valorDia = parseFloat(f.vale_transporte) / 5;
      const desconto = valorDia * diasDesconto;
      const valorPago = parseFloat(f.vale_transporte) - desconto;

      const registro = await client.query(
        `INSERT INTO vale_transporte
         (funcionario_id, data_pagamento, valor, observacoes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (funcionario_id, data_pagamento)
         DO UPDATE SET valor = $3
         RETURNING *`,
        [f.id, data_pagamento, valorPago,
         diasDesconto > 0 ? `Desconto de ${diasDesconto} dia(s) por falta na semana anterior` : '']
      );

      lista.push({
        funcionario_nome: f.nome,
        vale_original: parseFloat(f.vale_transporte),
        dias_desconto: diasDesconto,
        desconto,
        valor_pago: valorPago,
        ...registro.rows[0]
      });
    }

    await client.query('COMMIT');
    res.status(201).json({
      data_pagamento,
      semana_referencia: {
        inicio: semanaAnteriorInicio,
        fim: semanaAnteriorFim
      },
      funcionarios: lista,
      total_pago: lista.reduce((a, f) => a + f.valor_pago, 0)
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar vale transporte' });
  } finally {
    client.release();
  }
};

// Listar vales — retorna resumo por data (todas as datas, sem filtro de mês)
const listarVales = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        data_pagamento,
        COUNT(*) as qtd_funcionarios,
        SUM(valor) as total_pago
      FROM vale_transporte
      GROUP BY data_pagamento
      ORDER BY data_pagamento DESC
      LIMIT 52
    `);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar vales' });
  }
};

// Buscar detalhes de um vale por data
const buscarVale = async (req, res) => {
  const { data_pagamento } = req.params;
  try {
    const resultado = await pool.query(`
      SELECT vt.valor, vt.observacoes,
             f.id AS funcionario_id,
             f.nome AS funcionario_nome,
             f.vale_transporte AS vale_original
      FROM vale_transporte vt
      JOIN funcionarios f ON f.id = vt.funcionario_id
      WHERE vt.data_pagamento = $1
      ORDER BY f.nome
    `, [data_pagamento]);

    const funcionarios = resultado.rows.map(r => {
      const vale_original = parseFloat(r.vale_original);
      const valor_pago    = parseFloat(r.valor);
      const desconto      = vale_original - valor_pago;
      const match         = (r.observacoes || '').match(/Desconto de (\d+(?:\.\d+)?)/);
      const dias_desconto = match ? parseFloat(match[1]) : 0;
      return { funcionario_nome: r.funcionario_nome, vale_original, dias_desconto, desconto, valor_pago };
    });

    res.json({
      data_pagamento,
      funcionarios,
      total_pago: funcionarios.reduce((a, f) => a + f.valor_pago, 0)
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar vale transporte' });
  }
};

// Excluir vale por data de pagamento
const excluirVale = async (req, res) => {
  const { data_pagamento } = req.params;
  try {
    await pool.query('DELETE FROM vale_transporte WHERE data_pagamento = $1', [data_pagamento]);
    res.json({ mensagem: 'Vale transporte excluído' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir vale transporte' });
  }
};

module.exports = { gerarValeTransporte, listarVales, buscarVale, excluirVale };
