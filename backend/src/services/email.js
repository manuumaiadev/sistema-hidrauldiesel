const nodemailer = require('nodemailer');
const path = require('path');
const fs   = require('fs');
const pool = require('../config/database');

const LOGO_PATH = path.join(__dirname, '../../../frontend/imagens/Design sem nome (6).png');

async function _getConfig() {
  const { rows } = await pool.query('SELECT chave, valor FROM configuracoes');
  const cfg = {};
  for (const r of rows) cfg[r.chave] = r.valor;
  return cfg;
}

function _prefixo(setor) {
  return setor === 'comercial' ? 'email_comercial_' : 'email_financeiro_';
}

async function _criarTransporter(setor) {
  const cfg  = await _getConfig();
  const p    = _prefixo(setor);
  const user = cfg[p + 'user'];
  const pass = cfg[p + 'pass'];

  if (!user || !pass) {
    const label = setor === 'comercial' ? 'Comercial' : 'Financeiro';
    throw new Error(`E-mail ${label} não configurado. Acesse Configurações → E-mail ${label}.`);
  }

  return nodemailer.createTransport({
    host:   cfg[p + 'host']   || 'smtp.gmail.com',
    port:   parseInt(cfg[p + 'port'] || '587'),
    secure: cfg[p + 'secure'] === 'true',
    auth:   { user, pass },
  });
}

function _gerarAssinaturaHtml(cfg, setor) {
  const nomeEmpresa = cfg.empresa_nome    || 'Hidrauldiesel';
  const endereco    = [cfg.empresa_endereco, cfg.empresa_cidade].filter(Boolean).join(', ');
  const equipe      = setor === 'comercial'
    ? (cfg.setor_comercial_equipe  || 'Equipe Comercial')
    : (cfg.setor_financeiro_equipe || 'Equipe Financeira');
  const telefones   = setor === 'comercial'
    ? cfg.setor_comercial_telefones
    : cfg.setor_financeiro_telefones;
  const emailSetor  = setor === 'comercial'
    ? cfg.empresa_email_comercial
    : cfg.empresa_email_financeiro;

  const linhasTelefone = telefones
    ? telefones.split('/').map(t => t.trim()).filter(Boolean).join(' / ')
    : '';

  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333;margin-top:24px;border-top:2px solid #C0152A;padding-top:14px;width:100%;max-width:560px">
  <tr>
    <td style="vertical-align:top;padding-right:16px;width:90px">
      <img src="cid:logo_hidrauldiesel" width="80" style="display:block"/>
    </td>
    <td style="vertical-align:top;line-height:1.6">
      <div><strong>Atenciosamente,</strong></div>
      <div style="font-weight:600;color:#1B2D5B">${equipe} – ${nomeEmpresa}</div>
      ${linhasTelefone ? `<div>📞 ${linhasTelefone}</div>` : ''}
      ${emailSetor    ? `<div>✉️ <a href="mailto:${emailSetor}" style="color:#1B2D5B">${emailSetor}</a></div>` : ''}
      ${endereco      ? `<div>📍 ${endereco}</div>` : ''}
    </td>
  </tr>
</table>`;
}

function _textoParaHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

async function enviarEmail({ para, assunto, texto, setor = 'financeiro', anexos = [] }) {
  const cfg         = await _getConfig();
  const p           = _prefixo(setor);
  const transporter = await _criarTransporter(setor);
  const user        = cfg[p + 'user'];
  const nome        = cfg[p + 'remetente'] || 'Hidrauldiesel';

  // Logo como CID inline
  const logoAnexos = [];
  if (fs.existsSync(LOGO_PATH)) {
    logoAnexos.push({
      filename: 'logo.png',
      path:     LOGO_PATH,
      cid:      'logo_hidrauldiesel',
    });
  }

  const assinatura = _gerarAssinaturaHtml(cfg, setor);
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px 0;background:#f4f3f0">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:28px 32px;border-radius:10px;font-family:Arial,sans-serif">
  <div style="font-size:14px;color:#333;line-height:1.7">${_textoParaHtml(texto)}</div>
  ${assinatura}
</div>
</body></html>`;

  await transporter.sendMail({
    from:        `"${nome}" <${user}>`,
    to:          para,
    subject:     assunto,
    text:        texto,
    html,
    attachments: [...logoAnexos, ...anexos],
  });
}

async function testarConexaoEmail(setor = 'financeiro') {
  const transporter = await _criarTransporter(setor);
  await transporter.verify();
}

module.exports = { enviarEmail, testarConexaoEmail };
