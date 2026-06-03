const pool = require('../config/database');

const listarContasReceber = async (req, res) => {
  const { data_inicio, data_fim, status, cliente } = req.query;
  try {
    let query = `
      SELECT
        fv.id,
        fv.faturamento_id,
        fv.data_vencimento,
        fv.valor,
        fv.pago,
        f.os_numero,
        f.cliente_nome,
        f.cliente_cnpj,
        f.forma_pagamento,
        f.nf_servico,
        f.nf_peca,
        f.status AS status_faturamento,
        CASE
          WHEN fv.pago THEN 'pago'
          WHEN fv.data_vencimento < CURRENT_DATE THEN 'vencido'
          ELSE 'pendente'
        END AS situacao
      FROM faturamento_vencimentos fv
      JOIN faturamentos f ON f.id = fv.faturamento_id
      WHERE 1=1
    `;
    const params = [];

    if (data_inicio) { params.push(data_inicio); query += ` AND fv.data_vencimento >= $${params.length}`; }
    if (data_fim)    { params.push(data_fim);    query += ` AND fv.data_vencimento <= $${params.length}`; }
    if (cliente)     { params.push(`%${cliente}%`); query += ` AND f.cliente_nome ILIKE $${params.length}`; }

    if (status === 'pago')     query += ` AND fv.pago = true`;
    else if (status === 'pendente') query += ` AND fv.pago = false AND fv.data_vencimento >= CURRENT_DATE`;
    else if (status === 'vencido')  query += ` AND fv.pago = false AND fv.data_vencimento < CURRENT_DATE`;

    query += ' ORDER BY fv.pago ASC, fv.data_vencimento ASC';

    const resultado = await pool.query(query, params);
    const rows = resultado.rows;

    const totais = {
      total_a_receber: rows.filter(r => !r.pago).reduce((a, r) => a + parseFloat(r.valor), 0),
      total_vencido:   rows.filter(r => !r.pago && r.situacao === 'vencido').reduce((a, r) => a + parseFloat(r.valor), 0),
      total_pendente:  rows.filter(r => !r.pago && r.situacao === 'pendente').reduce((a, r) => a + parseFloat(r.valor), 0),
      total_recebido:  rows.filter(r =>  r.pago).reduce((a, r) => a + parseFloat(r.valor), 0),
    };

    res.json({ vencimentos: rows, totais });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar contas a receber' });
  }
};

const marcarPago = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE faturamento_vencimentos SET pago = true WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao marcar como pago' });
  }
};

const marcarPendente = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE faturamento_vencimentos SET pago = false WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao reverter pagamento' });
  }
};

module.exports = { listarContasReceber, marcarPago, marcarPendente };
