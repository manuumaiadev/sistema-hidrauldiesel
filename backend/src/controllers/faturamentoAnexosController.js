const pool = require('../config/database');
const path = require('path');
const fs   = require('fs');

const DIR_UPLOADS = path.join(__dirname, '../../uploads/faturamento');

async function listar(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome_original, nome_arquivo, mimetype, tamanho, tipo_doc, criado_em FROM faturamento_anexos WHERE faturamento_id = $1 ORDER BY criado_em',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function upload(req, res) {
  const fatId   = parseInt(req.params.id);
  const tipoDoc = req.body.tipo_doc || 'outro';

  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });

  const ext      = path.extname(req.file.originalname);
  const nome     = `fat${fatId}_${Date.now()}${ext}`;
  const destino  = path.join(DIR_UPLOADS, nome);

  try {
    if (!fs.existsSync(DIR_UPLOADS)) fs.mkdirSync(DIR_UPLOADS, { recursive: true });
    fs.writeFileSync(destino, req.file.buffer);

    const { rows } = await pool.query(
      `INSERT INTO faturamento_anexos (faturamento_id, nome_original, nome_arquivo, mimetype, tamanho, tipo_doc)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [fatId, req.file.originalname, nome, req.file.mimetype, req.file.size, tipoDoc]
    );
    res.json(rows[0]);
  } catch (err) {
    if (fs.existsSync(destino)) fs.unlinkSync(destino);
    res.status(500).json({ erro: err.message });
  }
}

async function deletar(req, res) {
  try {
    const { rows } = await pool.query(
      'DELETE FROM faturamento_anexos WHERE id = $1 RETURNING nome_arquivo',
      [req.params.anexoId]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Anexo não encontrado.' });

    const arquivo = path.join(DIR_UPLOADS, rows[0].nome_arquivo);
    if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function servir(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT nome_arquivo, nome_original, mimetype FROM faturamento_anexos WHERE id = $1',
      [req.params.anexoId]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Arquivo não encontrado.' });

    const arquivo = path.join(DIR_UPLOADS, rows[0].nome_arquivo);
    if (!fs.existsSync(arquivo)) return res.status(404).json({ erro: 'Arquivo não encontrado no disco.' });

    res.setHeader('Content-Disposition', `inline; filename="${rows[0].nome_original}"`);
    res.setHeader('Content-Type', rows[0].mimetype || 'application/octet-stream');
    res.sendFile(arquivo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = { listar, upload, deletar, servir, DIR_UPLOADS };
