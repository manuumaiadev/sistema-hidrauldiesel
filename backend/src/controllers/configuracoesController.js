const pool = require('../config/database');
const { testarConexaoEmail } = require('../services/email');

async function listar(_req, res) {
  try {
    const { rows } = await pool.query('SELECT chave, valor, tipo, grupo, label FROM configuracoes ORDER BY grupo, chave');
    const resultado = {};
    for (const r of rows) {
      if (!resultado[r.grupo]) resultado[r.grupo] = {};
      resultado[r.grupo][r.chave] = { valor: r.valor, tipo: r.tipo, label: r.label };
    }
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function salvar(req, res) {
  const dados = req.body; // { chave: valor, ... }
  if (!dados || typeof dados !== 'object') {
    return res.status(400).json({ erro: 'Corpo inválido.' });
  }

  try {
    for (const [chave, valor] of Object.entries(dados)) {
      await pool.query(
        `UPDATE configuracoes SET valor = $1, updated_at = NOW() WHERE chave = $2`,
        [String(valor ?? ''), chave]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function testarEmail(req, res) {
  const setor = req.body?.setor || 'financeiro';
  try {
    await testarConexaoEmail(setor);
    res.json({ ok: true, mensagem: 'Conexão SMTP bem-sucedida.' });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
}

module.exports = { listar, salvar, testarEmail };
