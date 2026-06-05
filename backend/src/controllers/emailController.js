const path = require('path');
const fs   = require('fs');
const pool = require('../config/database');
const { enviarEmail } = require('../services/email');
const { DIR_UPLOADS } = require('./faturamentoAnexosController');

async function enviarCobranca(req, res) {
  const { para, assunto, mensagem, setor = 'financeiro', faturamento_id, anexos_ids } = req.body;

  if (!para)     return res.status(400).json({ erro: 'Campo "para" (e-mail do destinatário) é obrigatório.' });
  if (!assunto)  return res.status(400).json({ erro: 'Campo "assunto" é obrigatório.' });
  if (!mensagem) return res.status(400).json({ erro: 'Campo "mensagem" é obrigatório.' });

  // Normaliza "Nome" <email> → email, <email> → email, depois split por vírgula
  const emailsExtraidos = para
    .replace(/"[^"]*"\s*<([^>]+)>/g, '$1')
    .replace(/<([^>]+)>/g, '$1')
    .split(',').map(e => e.trim()).filter(e => e.includes('@'));
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidos  = emailsExtraidos.filter(e => !emailRegex.test(e));
  if (!emailsExtraidos.length) return res.status(400).json({ erro: 'Nenhum e-mail válido encontrado.' });
  if (invalidos.length)        return res.status(400).json({ erro: `E-mail inválido: ${invalidos.join(', ')}` });
  // Passa a string original pro nodemailer (ele entende "Nome" <email> nativamente)
  const paraFinal     = para.trim();
  // Para salvar no banco, usa só os endereços limpos
  const paraParaSalvar = emailsExtraidos.join(', ');

  // Anexos extras enviados via multipart (arquivos adicionados no modal)
  const anexosExtra = (req.files || []).map(f => ({
    filename:    f.originalname,
    content:     f.buffer,
    contentType: f.mimetype,
  }));

  // Anexos salvos no faturamento (carregados do disco)
  const anexosSalvos = [];
  if (faturamento_id) {
    try {
      const ids = Array.isArray(anexos_ids)
        ? anexos_ids.map(Number)
        : typeof anexos_ids === 'string'
          ? anexos_ids.split(',').map(Number).filter(Boolean)
          : null;

      const q = ids?.length
        ? await pool.query('SELECT * FROM faturamento_anexos WHERE faturamento_id=$1 AND id=ANY($2)', [faturamento_id, ids])
        : await pool.query('SELECT * FROM faturamento_anexos WHERE faturamento_id=$1', [faturamento_id]);

      for (const row of q.rows) {
        const filePath = path.join(DIR_UPLOADS, row.nome_arquivo);
        if (fs.existsSync(filePath)) {
          anexosSalvos.push({
            filename:    row.nome_original,
            content:     fs.readFileSync(filePath),
            contentType: row.mimetype || 'application/octet-stream',
          });
        }
      }
    } catch (e) {
      console.warn('[email] Erro ao carregar anexos salvos:', e.message);
    }
  }

  try {
    await enviarEmail({ para: paraFinal, assunto, texto: mensagem, setor, anexos: [...anexosSalvos, ...anexosExtra] });

    // Salva o e-mail no faturamento e propaga para todos os faturamentos do mesmo cliente (por CNPJ)
    if (faturamento_id) {
      try {
        const { rows: fatRows } = await pool.query(
          'SELECT cliente_cnpj FROM faturamentos WHERE id = $1', [faturamento_id]
        );
        if (fatRows.length) {
          const cnpj = fatRows[0].cliente_cnpj;
          if (cnpj) {
            await pool.query(
              'UPDATE faturamentos SET cliente_email = $1 WHERE cliente_cnpj = $2',
              [paraParaSalvar, cnpj]
            );
          } else {
            await pool.query(
              'UPDATE faturamentos SET cliente_email = $1 WHERE id = $2',
              [paraParaSalvar, faturamento_id]
            );
          }
        }
      } catch (e) {
        console.warn('[email] Não foi possível salvar e-mail do cliente:', e.message);
      }
    }

    // Registra no histórico de envios
    if (faturamento_id) {
      try {
        const nomesDocs = [
          ...anexosSalvos.map(a => a.filename),
          ...anexosExtra.map(a => a.filename),
        ].join(', ') || null;

        const nomeUsuario = req.usuario?.nome || req.usuario?.email || null;

        await pool.query(
          `INSERT INTO faturamento_envios (faturamento_id, canal, destinatarios, assunto, documentos, enviado_por)
           VALUES ($1, 'E-mail', $2, $3, $4, $5)`,
          [faturamento_id, paraParaSalvar, assunto || null, nomesDocs, nomeUsuario]
        );
      } catch (e) {
        console.warn('[email] Não foi possível registrar histórico:', e.message);
      }
    }

    res.json({ ok: true, mensagem: `E-mail enviado para ${paraParaSalvar}`, anexos_enviados: anexosSalvos.length + anexosExtra.length, cliente_email_salvo: paraParaSalvar });
  } catch (err) {
    console.error('[email] Erro ao enviar:', err.message);
    res.status(500).json({ erro: err.message || 'Erro ao enviar e-mail.' });
  }
}

module.exports = { enviarCobranca };
