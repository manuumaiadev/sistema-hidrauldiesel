const pool   = require('../config/database');
const path   = require('path');
const fs     = require('fs');
const AdmZip = require('adm-zip');

const DIR_UPLOADS = path.join(__dirname, '../../uploads/faturamento');

async function listar(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome_original, nome_arquivo, mimetype, tamanho, tipo_doc, parcela_idx, criado_em FROM faturamento_anexos WHERE faturamento_id = $1 ORDER BY criado_em',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// Salva um buffer no disco e registra no banco. Retorna a row inserida.
async function _salvarArquivo(fatId, buffer, nomeOriginal, mimetype, tipoDoc, parcelaIdx) {
  if (!fs.existsSync(DIR_UPLOADS)) fs.mkdirSync(DIR_UPLOADS, { recursive: true });
  const ext     = path.extname(nomeOriginal);
  const nome    = `fat${fatId}_${Date.now()}_${Math.random().toString(36).slice(2,7)}${ext}`;
  const destino = path.join(DIR_UPLOADS, nome);
  fs.writeFileSync(destino, buffer);
  try {
    const { rows } = await pool.query(
      `INSERT INTO faturamento_anexos (faturamento_id, nome_original, nome_arquivo, mimetype, tamanho, tipo_doc, parcela_idx)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [fatId, nomeOriginal, nome, mimetype, buffer.length, tipoDoc, parcelaIdx]
    );
    return rows[0];
  } catch (err) {
    if (fs.existsSync(destino)) fs.unlinkSync(destino);
    throw err;
  }
}

async function upload(req, res) {
  const fatId      = parseInt(req.params.id);
  const tipoDoc    = req.body.tipo_doc || 'outro';
  const parcelaIdx = req.body.parcela_idx !== undefined && req.body.parcela_idx !== ''
    ? parseInt(req.body.parcela_idx) : null;

  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });

  const isZip = req.file.mimetype === 'application/zip'
    || req.file.mimetype === 'application/x-zip-compressed'
    || path.extname(req.file.originalname).toLowerCase() === '.zip';

  try {
    if (!isZip) {
      // fluxo normal: salva o arquivo diretamente
      const row = await _salvarArquivo(fatId, req.file.buffer, req.file.originalname, req.file.mimetype, tipoDoc, parcelaIdx);
      return res.json(row);
    }

    // ZIP: extrai entradas que são PDF (ou qualquer arquivo — sem pastas)
    const zip      = new AdmZip(req.file.buffer);
    const entradas = zip.getEntries().filter(e =>
      !e.isDirectory && e.entryName && !path.basename(e.entryName).startsWith('.')
    );

    if (!entradas.length) {
      return res.status(400).json({ erro: 'O arquivo ZIP está vazio ou não contém arquivos válidos.' });
    }

    const salvos = [];
    for (const entrada of entradas) {
      const nomeBase = path.basename(entrada.entryName);
      const extArq   = path.extname(nomeBase).toLowerCase();
      // aceita pdf, xml, png, jpg, jpeg — ignora outros
      if (!['.pdf', '.xml', '.png', '.jpg', '.jpeg'].includes(extArq)) continue;
      const buf      = entrada.getData();
      const mime     = extArq === '.pdf' ? 'application/pdf'
                     : extArq === '.xml' ? 'application/xml'
                     : 'image/jpeg';
      const row = await _salvarArquivo(fatId, buf, nomeBase, mime, tipoDoc, parcelaIdx);
      salvos.push(row);
    }

    if (!salvos.length) {
      return res.status(400).json({ erro: 'O ZIP não contém PDFs, XMLs ou imagens válidas.' });
    }

    // Retorna array de anexos salvos (frontend trata array no zip)
    return res.json({ zip: true, arquivos: salvos });

  } catch (err) {
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
