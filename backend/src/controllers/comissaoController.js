const pool = require('../config/database');

// Listar comissões
const listarComissoes = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        c.id,
        c.valor_servico,
        c.percentual,
        c.valor_comissao,
        c.criado_em,
        m.nome as mecanico_nome,
        os.numero as os_numero,
        os.cliente_nome,
        is2.descricao as servico_descricao,
        is2.quantidade as servico_quantidade
      FROM comissoes c
      JOIN mecanicos m ON m.id = c.mecanico_id
      JOIN ordens_servico os ON os.id = c.os_id
      JOIN itens_servico is2 ON is2.id = c.item_servico_id
      ORDER BY c.criado_em DESC
    `);

    // Agrupar por mecânico
    const porMecanico = {};
    for (const row of resultado.rows) {
      if (!porMecanico[row.mecanico_nome]) {
        porMecanico[row.mecanico_nome] = {
          mecanico: row.mecanico_nome,
          total_comissao: 0,
          comissoes: []
        };
      }
      porMecanico[row.mecanico_nome].total_comissao += parseFloat(row.valor_comissao);
      porMecanico[row.mecanico_nome].comissoes.push(row);
    }

    res.json({
      resumo: Object.values(porMecanico),
      total_geral: resultado.rows.reduce((acc, r) => acc + parseFloat(r.valor_comissao), 0)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar comissões' });
  }
};

module.exports = { listarComissoes };
