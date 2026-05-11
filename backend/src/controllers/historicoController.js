const pool = require('../config/database');

const listarHistorico = async (req, res) => {
  try {
    const { usuario, acao, data_inicio, data_fim, busca } = req.query;

    let query = `
      SELECT
        h.id,
        h.usuario_nome,
        h.tabela,
        h.registro_id,
        h.acao,
        h.dados_anteriores,
        h.dados_novos,
        h.criado_em
      FROM historico h
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (usuario) {
      query += ` AND h.usuario_nome ILIKE $${i++}`;
      params.push(`%${usuario}%`);
    }

    if (acao) {
      query += ` AND h.acao = $${i++}`;
      params.push(acao);
    }

    if (data_inicio) {
      query += ` AND DATE(h.criado_em) >= $${i++}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ` AND DATE(h.criado_em) <= $${i++}`;
      params.push(data_fim);
    }

    if (busca) {
      query += ` AND (h.usuario_nome ILIKE $${i} OR h.tabela ILIKE $${i} OR h.acao ILIKE $${i})`;
      params.push(`%${busca}%`);
      i++;
    }

    query += ` ORDER BY h.criado_em DESC LIMIT 100`;

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar histórico' });
  }
};

module.exports = { listarHistorico };
