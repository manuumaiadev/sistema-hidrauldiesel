const pool = require('../config/database');
const path = require('path');
const fs   = require('fs');

const uploadFoto = async (req, res) => {
  const { os_id } = req.params;

  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO anexos (os_id, nome_arquivo, nome_original)
       VALUES ($1, $2, $3) RETURNING *`,
      [os_id, req.file.filename, req.file.originalname]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar anexo' });
  }
};

const listarAnexos = async (req, res) => {
  const { os_id } = req.params;
  try {
    const resultado = await pool.query(
      'SELECT * FROM anexos WHERE os_id = $1 ORDER BY criado_em ASC',
      [os_id]
    );
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar anexos' });
  }
};

const deletarAnexo = async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      'DELETE FROM anexos WHERE id = $1 RETURNING nome_arquivo',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Anexo não encontrado' });
    }

    const filePath = path.join(__dirname, '../../uploads/fotos', resultado.rows[0].nome_arquivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ mensagem: 'Anexo removido' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao deletar anexo' });
  }
};

module.exports = { uploadFoto, listarAnexos, deletarAnexo };
