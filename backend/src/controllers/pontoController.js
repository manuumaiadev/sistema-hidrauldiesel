const pool = require('../config/database');

// Buscar ponto do mês
const buscarPontoMes = async (req, res) => {
  const { mes, ano } = req.params;
  try {
    const funcionarios = await pool.query(
      `SELECT id, nome, salario_oficial, salario_adicional FROM funcionarios WHERE ativo = true ORDER BY nome`
    );

    const registros = await pool.query(`
      SELECT funcionario_id, TO_CHAR(data, 'YYYY-MM-DD') as data, status
      FROM ponto
      WHERE EXTRACT(MONTH FROM data) = $1
      AND EXTRACT(YEAR FROM data) = $2
    `, [mes, ano]);

    // mapa: "funcionario_id_YYYY-MM-DD" -> status
    const pontoMap = {};
    registros.rows.forEach(r => {
      pontoMap[`${r.funcionario_id}_${r.data}`] = r.status;
    });

    res.json({ funcionarios: funcionarios.rows, ponto: pontoMap });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar ponto' });
  }
};

// Registrar/atualizar ponto
const registrarPonto = async (req, res) => {
  const { funcionario_id, data, status } = req.body;
  try {
    const resultado = await pool.query(`
      INSERT INTO ponto (funcionario_id, data, status, presente)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (funcionario_id, data)
      DO UPDATE SET status = $3, presente = $4
      RETURNING *
    `, [funcionario_id, data, status, status === 'presente']);
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao registrar ponto' });
  }
};

module.exports = { buscarPontoMes, registrarPonto };
