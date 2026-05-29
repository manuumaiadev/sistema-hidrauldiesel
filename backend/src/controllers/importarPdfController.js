const pool    = require('../config/database');
const pdfParse = require('pdf-parse');

function parseBlingValue(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseBrDate(str) {
  if (!str) return null;
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseOsSections(text) {
  const parts = text.split(/Ordem de servi[çc]o\s*N[°oº]\s*/i);
  const results = [];
  for (let i = 1; i < parts.length; i++) {
    try {
      const os = parseOneOs(parts[i]);
      if (os) results.push(os);
    } catch (_) {}
  }
  return results;
}

function parseOneOs(section) {
  const osNumMatch = section.match(/^(\d+)/);
  if (!osNumMatch) return null;
  const os_numero = osNumMatch[1];

  // Cliente: primeira linha não-numérica após "Cliente"
  const clientMatch = section.match(/\bCliente\b\s*\n([A-Za-záéíóúâêîôûãõàèìòùçÇÁÉÍÓÚÂÊÎÔÛÃÕ][^\n]{2,})/);
  const cliente_nome = clientMatch?.[1]?.trim() || '';

  // Data de entrada
  const dateMatch = section.match(/entrada\s*(\d{2}\/\d{2}\/\d{4})/);
  const data_faturamento = parseBrDate(dateMatch?.[1]) || new Date().toISOString().slice(0, 10);

  // Totais: 4 números no formato Bling (muitas casas decimais)
  // "120,0000000000 104,6100000000 0,0000000000 224,6100000000"
  const blingNum = /[\d.]+,\d{8,}/g;
  const totalsBlock = section.match(/Total da ordem de servi[çc]o\s*[\n\r]+([\s\S]{0,120})/)?.[1] || '';
  const totalsNums = totalsBlock.match(blingNum);
  const valor_servico = parseBlingValue(totalsNums?.[0]);
  const valor_peca    = parseBlingValue(totalsNums?.[1]);
  const valor_total   = parseBlingValue(totalsNums?.[3] || totalsNums?.[2]);

  // Parcelas
  const parcelasBlock = section.match(
    /Forma de Pagamento\s*[^\n]*\n([\s\S]*?)(?:Observa[çc][õo]es do recebimento|Observa[çc][aã]o do recebimento|$)/i
  )?.[1] || '';

  const vencimentos = [];
  let forma_pagamento = null;

  for (const line of parcelasBlock.split('\n')) {
    const pm = line.match(/^(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+(.+)/);
    if (pm) {
      const data_vencimento = parseBrDate(pm[2]);
      const valor = parseBlingValue(pm[3]);
      // forma é tudo antes de possível observação (palavra em caixa alta no final)
      const formaObs = pm[4].trim();
      if (!forma_pagamento) forma_pagamento = formaObs.replace(/\s+[A-Z]{3,}\s*$/, '').trim();
      vencimentos.push({ data_vencimento, valor, pago: false });
    }
  }

  // PEDIDO DE COMPRA
  const pedidoMatch = section.match(/PEDIDO DE COMPRA\s*\n([^\n]+)/);
  const pedido_peca = pedidoMatch?.[1]?.trim() || null;

  // PLACA
  const placaMatch = section.match(/PLACA\s*\n([^\n]+)/);
  const placa = placaMatch?.[1]?.trim().replace(/^-+$/, '') || null;

  return {
    os_numero,
    cliente_nome,
    data_faturamento,
    valor_servico,
    valor_peca,
    valor_total,
    qtd_parcelas: vencimentos.length || 1,
    valor_parcela: vencimentos[0]?.valor || valor_total,
    forma_pagamento,
    pedido_peca,
    observacoes: placa && !/^-+$/.test(placa) ? `Placa: ${placa}` : null,
    vencimentos,
    status: 'autorizado',
    categoria: 'Venda de Serviços',
  };
}

const importarPdfBling = async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

  let text;
  try {
    const parsed = await pdfParse(req.file.buffer);
    text = parsed.text;
  } catch (err) {
    return res.status(422).json({ erro: 'Não foi possível ler o PDF: ' + err.message });
  }

  const registros = parseOsSections(text);
  if (registros.length === 0) {
    return res.status(422).json({ erro: 'Nenhuma OS encontrada no PDF' });
  }

  const importados = [];
  const ignorados  = [];
  const erros      = [];

  for (const reg of registros) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Anti-duplicata: ignora se OS já existe
      const existe = await client.query(
        'SELECT id FROM faturamentos WHERE os_numero = $1',
        [reg.os_numero]
      );
      if (existe.rows.length > 0) {
        ignorados.push({ os_numero: reg.os_numero, motivo: 'Já existe' });
        await client.query('ROLLBACK');
        continue;
      }

      const r = await client.query(
        `INSERT INTO faturamentos (
          os_numero, cliente_nome, data_faturamento,
          valor_servico, valor_peca, valor_total,
          qtd_parcelas, valor_parcela,
          forma_pagamento, pedido_peca, observacoes,
          categoria, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id`,
        [reg.os_numero, reg.cliente_nome, reg.data_faturamento,
         reg.valor_servico, reg.valor_peca, reg.valor_total,
         reg.qtd_parcelas, reg.valor_parcela,
         reg.forma_pagamento, reg.pedido_peca, reg.observacoes,
         reg.categoria, reg.status]
      );

      const faturamentoId = r.rows[0].id;

      for (const v of reg.vencimentos) {
        if (!v.data_vencimento) continue;
        await client.query(
          `INSERT INTO faturamento_vencimentos (faturamento_id, data_vencimento, valor, pago)
           VALUES ($1, $2, $3, false)`,
          [faturamentoId, v.data_vencimento, v.valor]
        );
      }

      await client.query('COMMIT');
      importados.push({ os_numero: reg.os_numero, cliente: reg.cliente_nome, total: reg.valor_total });
    } catch (err) {
      await client.query('ROLLBACK');
      erros.push({ os_numero: reg.os_numero, motivo: err.message });
    } finally {
      client.release();
    }
  }

  res.json({
    mensagem: `Importação concluída`,
    importados,
    ignorados,
    erros,
  });
};

module.exports = { importarPdfBling };
