const pool = require('../config/database');

const { PDFParse, VerbosityLevel } = require('pdf-parse');

async function extrairTextoPdf(buffer) {
  // pdf-parse v2: requer Uint8Array (não Buffer)
  const data   = new Uint8Array(buffer);
  const parser = new PDFParse(data, { verbosity: VerbosityLevel.ERRORS });
  await parser.load();
  const resultado = await parser.getText();
  return resultado.text;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const trunc = (s, n) => (s || '').substring(0, n) || null;

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
  // remove código numérico final do produto (ex: "11587")
  return str.replace(/\s+\d{4,8}\s*$/, '').trim();
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
    const lm = t.match(/^(.+?)\s+(\d+(?:[.,]\d*)?)\s+([\d.]+,\d{8,})\s+([\d.]+,\d{8,})\s*$/);
    if (lm) {
      items.push({
        descricao:  trunc(lm[1].trim(), 195),
        quantidade: parseFloat(lm[2].replace(',', '.')) || 1,
        valor:      parseBlingValue(lm[4]),
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
  const block  = m[1];
  const items  = [];

  const rx = new RegExp(
    `([\\s\\S]+?)\\s+([\\d.]+,\\d{8,})\\s+(${UNITS})\\s+([\\d.]+,\\d{8,})\\s+([\\d.,]+)`,
    'g'
  );

  let match;
  while ((match = rx.exec(block)) !== null) {
    const raw = match[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    items.push({
      descricao:  trunc(stripTrailingCode(raw), 195),
      quantidade: parseBlingValue(match[2]),
      valor_unit: parseBlingValue(match[4]),
    });
  }
  return items;
}

function parseParcelas(section) {
  // pára em qualquer seção de observações/técnico que venha depois das parcelas
  const block = section.match(
    /Forma de Pagamento\s*[^\n]*\n([\s\S]*?)(?:Observa[çc][õo]es|T[eé]cnico|Concordo|Vendedor)/i
  )?.[1] || '';

  const parcelas = [];
  for (const line of block.split('\n')) {
    const pm = line.match(
      /^(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+,\d+)\s+(.+?)\s*$/
    );
    if (!pm) continue;
    // a observação é o último token em caixa alta, se houver separação clara
    const formaFull = pm[4].trim();
    // tenta separar forma / observação pelo último bloco em maiúsculas separado
    const obsMatch = formaFull.match(/^(.+?)\s{2,}(\S+)$/) ||
                     formaFull.match(/^(.+?)\s+([A-Z]{3,})$/);
    const forma    = obsMatch ? obsMatch[1].trim() : formaFull;
    const observacao = obsMatch ? obsMatch[2].trim() : null;

    parcelas.push({
      dias:            parseInt(pm[1]),
      data_vencimento: parseBrDate(pm[2]),
      valor:           parseBlingValue(pm[3]),
      forma:           trunc(forma, 48),
      observacao:      trunc(observacao, 200),
    });
  }
  return parcelas;
}

function parseClienteBloco(section) {
  // pega o bloco entre "Cliente" e "Número" (com ou sem quebra de linha)
  const bloco = section.match(
    /\bCliente\b\s*\n([\s\S]*?)(?:N[uú]mero\s*\n?da OS|Hora\s*\n?In[ií]cio)/i
  )?.[1] || '';

  const linhas = bloco.split('\n').map(l => l.trim()).filter(Boolean);
  const nome   = linhas[0] || '';

  // CNPJ: linha onde os dígitos sem pontuação = 14
  const cnpjLine   = linhas.find(l => /^\d{14}$/.test(l.replace(/\D/g, '')) && l.replace(/\D/g,'').length === 14);
  const cnpj       = cnpjLine?.replace(/\D/g, '') || null;

  // Telefone
  const telLine    = linhas.find(l => /\(\d{2}\)\s*\d{4,5}[-.]?\d{4}/.test(l));
  const telefone   = telLine?.match(/\(\d{2}\)\s*\d{4,5}[-.]?\d{4}/)?.[0]?.trim() || null;

  return { nome, cnpj, telefone };
}

function parseOneOs(section) {
  try {
    const osNumMatch = section.match(/^(\d+)/);
    if (!osNumMatch) return null;
    const os_numero = osNumMatch[1];

    const cliente      = parseClienteBloco(section);
    const dateMatch    = section.match(/entrada\s*(\d{2}\/\d{2}\/\d{4})/);
    const data_entrada = parseBrDate(dateMatch?.[1]) || new Date().toISOString().slice(0, 10);

    const queixaMatch = section.match(
      /\bProblema\b\s*\n([\s\S]*?)(?:\bServi[çc]os\b|\bPe[çc]as\b|\bTotal\b)/i
    );
    const queixa = queixaMatch?.[1]?.replace(/\n/g, ' ').trim() || null;

    // Totais (4 números bling em sequência)
    const totBlock  = section.match(/Total da ordem de servi[çc]o\s*[\n\r]+([\s\S]{0,200})/)?.[1] || '';
    const totNums   = totBlock.match(/[\d.]+,\d{8,}/g);
    const valor_servico = parseBlingValue(totNums?.[0]);
    const valor_peca    = parseBlingValue(totNums?.[1]);
    const valor_total   = parseBlingValue(totNums?.[3] || totNums?.[2]);

    const servicos_items = parseServicosItems(section);
    const pecas_items    = parsePecasItems(section);
    const parcelas       = parseParcelas(section);

    // forma_pagamento: tira possível observação do final
    const forma_pagamento = parcelas[0]?.forma || null;

    const placaMatch    = section.match(/\bPLACA\b\s*\n([^\n]+)/);
    const placa         = placaMatch?.[1]?.trim().replace(/^[-\s]+$/, '') || null;
    const frotaMatch    = section.match(/\bFROTA\b\s*\n([^\n]+)/);
    const frota         = frotaMatch?.[1]?.trim() || null;
    const pedidoCompra  = section.match(/PEDIDO DE COMPRA\s*\n([^\n]+)/)?.[1]?.trim() || null;
    const pedidoServico = section.match(/PEDIDO DE SERVI[ÇC]O\s*\n([^\n]+)/i)?.[1]?.trim() || null;

    return {
      os_numero,
      cliente_nome:     cliente.nome,
      cliente_cnpj:     cliente.cnpj,
      cliente_telefone: cliente.telefone,
      data_entrada,
      queixa,
      placa:            placa || null,
      frota:            frota || null,
      pedido_compra:    pedidoCompra,
      pedido_servico:   pedidoServico,
      forma_pagamento,
      valor_servico,
      valor_peca,
      valor_total,
      servicos_items,
      pecas_items,
      parcelas,
    };
  } catch {
    return null;
  }
}

function parseOsSections(text) {
  const parts = text.split(/Ordem de servi[çc]o\s*N[°oº]\s*/i);
  return parts.slice(1).map(parseOneOs).filter(Boolean);
}

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function criarOsCompleta(client, dados) {
  const {
    os_numero, cliente_nome, cliente_cnpj, cliente_telefone,
    data_entrada, queixa, frota, placa, pedido_compra, pedido_servico,
    forma_pagamento, servicos_items, pecas_items, parcelas,
  } = dados;

  const obsParts = [];
  if (placa && !/^[-\s]+$/.test(placa)) obsParts.push(`Placa: ${placa}`);
  if (frota)                            obsParts.push(`Frota: ${frota}`);
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
    [
      trunc(os_numero, 20),
      trunc(os_numero, 20),
      trunc(cliente_nome, 200) || '',
      trunc(cliente_cnpj, 20),
      trunc(cliente_telefone, 20),
      trunc(queixa, 1000),
      trunc(obs_tecnica, 500),
      trunc(frota, 50),
      trunc(pedido_compra, 100),
      trunc(pedido_servico, 100),
      trunc(forma_pagamento, 200),
      data_entrada,
    ]
  );
  const osId = osRes.rows[0].id;

  for (const s of servicos_items) {
    await client.query(
      `INSERT INTO itens_servico (os_id, descricao, valor, quantidade) VALUES ($1,$2,$3,$4)`,
      [osId, trunc(s.descricao, 195) || 'Serviço', s.valor || 0, s.quantidade || 1]
    );
  }

  for (const p of pecas_items) {
    await client.query(
      `INSERT INTO itens_pecas (os_id, descricao, quantidade, valor_unit) VALUES ($1,$2,$3,$4)`,
      [osId, trunc(p.descricao, 195) || 'Peça', p.quantidade || 1, p.valor_unit || 0]
    );
  }

  for (const par of parcelas) {
    if (!par.data_vencimento) continue;
    await client.query(
      `INSERT INTO os_parcelas (os_id, dias, data_vencimento, valor, forma, observacao)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [osId, par.dias || null, par.data_vencimento, par.valor || 0,
       trunc(par.forma, 48), trunc(par.observacao, 200)]
    );
  }

  return osId;
}

async function criarFaturamentoVinculado(client, osId, dados) {
  const {
    os_numero, cliente_nome, data_entrada,
    valor_servico, valor_peca, valor_total,
    forma_pagamento, pedido_compra, pedido_servico, parcelas,
  } = dados;

  const fatRes = await client.query(
    `INSERT INTO faturamentos (
       os_id, os_numero, cliente_nome, data_faturamento,
       valor_servico, valor_peca, valor_total,
       qtd_parcelas, valor_parcela,
       forma_pagamento, pedido_servico, pedido_peca,
       categoria, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Venda de Serviços','autorizado')
     RETURNING id`,
    [
      osId,
      trunc(os_numero, 50),
      trunc(cliente_nome, 200),
      null, // data_faturamento = data de emissão da NF, preenchida pelo usuário ao emitir
      valor_servico || 0,
      valor_peca    || 0,
      valor_total   || 0,
      parcelas.length || 1,
      parcelas[0]?.valor || valor_total || 0,
      trunc(forma_pagamento, 50),
      trunc(pedido_servico, 100),
      trunc(pedido_compra, 100),
    ]
  );
  const fatId = fatRes.rows[0].id;

  for (const v of parcelas) {
    if (!v.data_vencimento) continue;
    await client.query(
      `INSERT INTO faturamento_vencimentos (faturamento_id, data_vencimento, valor, pago)
       VALUES ($1,$2,$3,false)`,
      [fatId, v.data_vencimento, v.valor || 0]
    );
  }

  return fatId;
}

// ─── controller ─────────────────────────────────────────────────────────────

const importarPdfBling = async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

  let text;
  try {
    text = await extrairTextoPdf(req.file.buffer);
  } catch (err) {
    return res.status(422).json({ erro: 'Não foi possível ler o PDF: ' + err.message });
  }

  let registros;
  try {
    registros = parseOsSections(text);
  } catch (err) {
    return res.status(422).json({ erro: 'Erro ao interpretar o PDF: ' + err.message });
  }

  if (!registros.length) {
    return res.status(422).json({ erro: 'Nenhuma OS encontrada no PDF. Verifique se é um PDF de OS do Bling.' });
  }

  const importados = [];
  const ignorados  = [];
  const erros      = [];

  for (const reg of registros) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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
      await client.query('UPDATE faturamentos SET os_id = $1 WHERE id = $2', [osId, fatId]);

      await client.query('COMMIT');
      importados.push({
        os_numero: reg.os_numero,
        cliente:   reg.cliente_nome,
        total:     reg.valor_total,
        servicos:  reg.servicos_items.length,
        pecas:     reg.pecas_items.length,
        parcelas:  reg.parcelas.length,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      erros.push({ os_numero: reg.os_numero, motivo: err.message });
    } finally {
      client.release();
    }
  }

  res.json({ mensagem: 'Importação concluída', importados, ignorados, erros });
};

module.exports = { importarPdfBling };
