const pool     = require('../config/database');
const pdfParse = require('pdf-parse');

// ─── helpers ────────────────────────────────────────────────────────────────

function parseBlingValue(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseBrDate(str) {
  if (!str) return null;
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function stripTrailingCode(str) {
  return str.replace(/\s+\d{3,10}\s*$/, '').trim();
}

// ─── parsers ────────────────────────────────────────────────────────────────

function parseServicosItems(section) {
  const m = section.match(
    /\bServi[çc]os\b\s*\n[^\n]*Valor total[^\n]*\n([\s\S]*?)(?:\bPe[çc]as\b|\bTotal\b)/i
  );
  if (!m) return [];

  const items = [];
  for (const line of m[1].split('\n')) {
    const t = line.trim();
    if (!t) continue;
    // "MAO DE OBRA DA CUICA 1 120,0000000000 120,0000000000"
    const lm = t.match(/^(.+?)\s+(\d+(?:[.,]\d*)?)\s+([\d.]+,\d{8,})\s+([\d.]+,\d{8,})\s*$/);
    if (lm) {
      items.push({
        descricao: lm[1].trim(),
        quantidade: parseFloat(lm[2].replace(',', '.')) || 1,
        valor: parseBlingValue(lm[4]),
      });
    }
  }
  return items;
}

function parsePecasItems(section) {
  const m = section.match(
    /\bPe[çc]as\b\s*\n[^\n]*Valor\s*total[^\n]*\n([\s\S]*?)(?:Total servi[çc]os|Total pe[çc]as)/i
  );
  if (!m) return [];

  const UNITS = 'UNID|UN|PC|KG|CX|LT|MT|GL|JG|PAR|KIT|47';
  const block = m[1];
  const items = [];

  // each item ends with: blingQty UNIT blingPrice shortTotal
  const rx = new RegExp(
    `([\\s\\S]+?)\\s+([\\d.]+,\\d{8,})\\s+(${UNITS})\\s+([\\d.]+,\\d{8,})\\s+([\\d.,]+)`,
    'g'
  );

  let match;
  while ((match = rx.exec(block)) !== null) {
    const rawDesc = match[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    items.push({
      descricao: stripTrailingCode(rawDesc),
      quantidade: parseBlingValue(match[2]),
      valor_unit: parseBlingValue(match[4]),
    });
  }
  return items;
}

function parseParcelas(section) {
  const block = section.match(
    /Forma de Pagamento\s*[^\n]*\n([\s\S]*?)(?:Observa[çc][õo]es do recebimento)/i
  )?.[1] || '';

  const parcelas = [];
  for (const line of block.split('\n')) {
    const pm = line.match(
      /^(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+,\d{8,})\s+(.+?)(?:\s{2,}(\S+))?\s*$/
    );
    if (pm) {
      parcelas.push({
        dias:            parseInt(pm[1]),
        data_vencimento: parseBrDate(pm[2]),
        valor:           parseBlingValue(pm[3]),
        forma:           pm[4].trim(),
        observacao:      pm[5]?.trim() || null,
      });
    }
  }
  return parcelas;
}

function parseClienteBloco(section) {
  const bloco = section.match(/\bCliente\b\s*\n([\s\S]*?)(?:Número\s*\nda OS|Número da OS)/i)?.[1] || '';
  const linhas = bloco.split('\n').map(l => l.trim()).filter(Boolean);

  const nome     = linhas[0] || '';
  const cnpjLine = linhas.find(l => /^\d{14}$/.test(l.replace(/\D/g, '')));
  const cnpj     = cnpjLine?.replace(/\D/g, '') || null;
  const telefoneLine = linhas.find(l => /\(?\d{2}\)?\s*\d{4,5}[-.]?\d{4}/.test(l));
  const telefone = telefoneLine?.match(/\(?\d{2}\)?\s*\d{4,5}[-.]?\d{4}/)?.[0]?.trim() || null;

  return { nome, cnpj, telefone };
}

function parseOsSections(text) {
  const parts = text.split(/Ordem de servi[çc]o\s*N[°oº]\s*/i);
  return parts.slice(1).map(parseOneOs).filter(Boolean);
}

function parseOneOs(section) {
  const osNumMatch = section.match(/^(\d+)/);
  if (!osNumMatch) return null;
  const os_numero = osNumMatch[1];

  const cliente = parseClienteBloco(section);

  // Data de entrada
  const dateMatch = section.match(/entrada\s*(\d{2}\/\d{2}\/\d{4})/);
  const data_entrada = parseBrDate(dateMatch?.[1]) || new Date().toISOString().slice(0, 10);

  // Problema / Queixa
  const queixaMatch = section.match(/\bProblema\b\s*\n([\s\S]*?)(?:\bServi[çc]os\b|\bPe[çc]as\b|\bTotal\b)/i);
  const queixa = queixaMatch?.[1]?.replace(/\n/g, ' ').trim() || null;

  // Totais
  const totalsBlock = section.match(/Total da ordem de servi[çc]o\s*[\n\r]+([\s\S]{0,150})/)?.[1] || '';
  const totaisNums  = totalsBlock.match(/[\d.]+,\d{8,}/g);
  const valor_servico = parseBlingValue(totaisNums?.[0]);
  const valor_peca    = parseBlingValue(totaisNums?.[1]);
  const valor_total   = parseBlingValue(totaisNums?.[3] || totaisNums?.[2]);

  // Itens
  const servicos_items = parseServicosItems(section);
  const pecas_items    = parsePecasItems(section);

  // Parcelas
  const parcelas = parseParcelas(section);
  const forma_pagamento = parcelas[0]?.forma?.replace(/\s+\w{3,}$/, '').trim() || null;

  // Identificação do veículo
  const placaMatch = section.match(/\bPLACA\b\s*\n([^\n]+)/);
  const placa = placaMatch?.[1]?.trim().replace(/^-+$/, '') || null;

  const frotaMatch = section.match(/\bFROTA\b\s*\n([^\n]+)/);
  const frota = frotaMatch?.[1]?.trim() || null;

  // Pedidos
  const pedidoMatch   = section.match(/PEDIDO DE COMPRA\s*\n([^\n]+)/);
  const pedido_compra = pedidoMatch?.[1]?.trim() || null;

  const pedServMatch  = section.match(/PEDIDO DE SERVI[ÇC]O\s*\n([^\n]+)/i);
  const pedido_servico = pedServMatch?.[1]?.trim() || null;

  return {
    os_numero,
    cliente_nome:     cliente.nome,
    cliente_cnpj:     cliente.cnpj,
    cliente_telefone: cliente.telefone,
    data_entrada,
    queixa,
    placa,
    frota,
    pedido_compra,
    pedido_servico,
    forma_pagamento,
    valor_servico,
    valor_peca,
    valor_total,
    servicos_items,
    pecas_items,
    parcelas,
  };
}

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function criarOsCompleta(client, dados) {
  const {
    os_numero, cliente_nome, cliente_cnpj, cliente_telefone,
    data_entrada, queixa, frota, placa, pedido_compra, pedido_servico,
    forma_pagamento, servicos_items, pecas_items, parcelas,
  } = dados;

  const obsParts = [];
  if (placa && !/^-+$/.test(placa)) obsParts.push(`Placa: ${placa}`);
  if (frota)                        obsParts.push(`Frota: ${frota}`);
  const obs_tecnica = obsParts.join(' | ') || null;

  const osRes = await client.query(
    `INSERT INTO ordens_servico (
       numero, numero_os, cliente_nome, cliente_cpf_cnpj, cliente_telefone,
       status, queixa, obs_tecnica, frota,
       num_pedido_compra, num_pedido_servico,
       condicao_pagamento, criado_em, atualizado_em
     ) VALUES ($1,$2,$3,$4,$5,
       'autorizada_faturamento',
       $6,$7,$8,$9,$10,$11,
       $12::DATE, NOW()
     ) RETURNING id`,
    [os_numero, os_numero, cliente_nome, cliente_cnpj || null, cliente_telefone || null,
     queixa || null, obs_tecnica, frota || null,
     pedido_compra || null, pedido_servico || null, forma_pagamento || null,
     data_entrada]
  );
  const osId = osRes.rows[0].id;

  for (const s of servicos_items) {
    await client.query(
      `INSERT INTO itens_servico (os_id, descricao, valor, quantidade) VALUES ($1,$2,$3,$4)`,
      [osId, s.descricao, s.valor, s.quantidade]
    );
  }

  for (const p of pecas_items) {
    await client.query(
      `INSERT INTO itens_pecas (os_id, descricao, quantidade, valor_unit) VALUES ($1,$2,$3,$4)`,
      [osId, p.descricao, p.quantidade, p.valor_unit]
    );
  }

  for (const par of parcelas) {
    if (!par.data_vencimento) continue;
    await client.query(
      `INSERT INTO os_parcelas (os_id, dias, data_vencimento, valor, forma, observacao)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [osId, par.dias || null, par.data_vencimento, par.valor, par.forma, par.observacao || null]
    );
  }

  return osId;
}

async function criarFaturamentoVinculado(client, osId, dados) {
  const {
    os_numero, cliente_nome, data_entrada,
    valor_servico, valor_peca, valor_total,
    forma_pagamento, pedido_compra, parcelas,
  } = dados;

  const fatRes = await client.query(
    `INSERT INTO faturamentos (
       os_id, os_numero, cliente_nome, data_faturamento,
       valor_servico, valor_peca, valor_total,
       qtd_parcelas, valor_parcela,
       forma_pagamento, pedido_peca, categoria, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Venda de Serviços','autorizado')
     RETURNING id`,
    [osId, os_numero, cliente_nome, data_entrada,
     valor_servico || 0, valor_peca || 0, valor_total || 0,
     parcelas.length || 1, parcelas[0]?.valor || valor_total || 0,
     forma_pagamento, pedido_compra || null]
  );
  const fatId = fatRes.rows[0].id;

  for (const v of parcelas) {
    if (!v.data_vencimento) continue;
    await client.query(
      `INSERT INTO faturamento_vencimentos (faturamento_id, data_vencimento, valor, pago)
       VALUES ($1,$2,$3,false)`,
      [fatId, v.data_vencimento, v.valor]
    );
  }

  return fatId;
}

// ─── controller ─────────────────────────────────────────────────────────────

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

      // Anti-duplicata: verifica OS e faturamento
      const existeOS  = await client.query(
        'SELECT id FROM ordens_servico WHERE numero = $1 OR numero_os = $1', [reg.os_numero]
      );
      const existeFat = await client.query(
        'SELECT id FROM faturamentos WHERE os_numero = $1', [reg.os_numero]
      );

      if (existeOS.rows.length > 0 || existeFat.rows.length > 0) {
        ignorados.push({ os_numero: reg.os_numero, motivo: 'Já existe' });
        await client.query('ROLLBACK');
        continue;
      }

      const osId  = await criarOsCompleta(client, reg);
      const fatId = await criarFaturamentoVinculado(client, osId, reg);

      // Atualiza faturamento com os_id já criado
      await client.query('UPDATE faturamentos SET os_id = $1 WHERE id = $2', [osId, fatId]);

      await client.query('COMMIT');
      importados.push({
        os_numero:  reg.os_numero,
        cliente:    reg.cliente_nome,
        total:      reg.valor_total,
        servicos:   reg.servicos_items.length,
        pecas:      reg.pecas_items.length,
        parcelas:   reg.parcelas.length,
      });
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
