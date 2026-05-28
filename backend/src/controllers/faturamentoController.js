const pool = require('../config/database');

const FAT_PARA_OS_STATUS = {
  autorizado:       'autorizada_faturamento',
  nf_emitida:       'autorizada_faturamento',
  cobranca_emitida: 'autorizada_faturamento',
  enviado:          'finalizada',
  cancelado:        'cancelada',
  rejeitado:        'cancelada',
};

async function vincularOuCriarOS(client, {
  os_id, os_numero, cliente_nome, status,
  valor_servico, valor_peca, pedido_servico, pedido_peca,
  vencimentos, forma_pagamento
}) {
  const statusOS = FAT_PARA_OS_STATUS[status] || 'autorizada_faturamento';

  if (os_id) {
    await client.query(
      'UPDATE ordens_servico SET status = $1, atualizado_em = NOW() WHERE id = $2',
      [statusOS, os_id]
    );
    await _sincronizarParcelas(client, os_id, vencimentos, forma_pagamento);
    return os_id;
  }

  if (os_numero) {
    const existe = await client.query(
      'SELECT id FROM ordens_servico WHERE numero = $1 OR numero_os = $1',
      [os_numero]
    );
    if (existe.rows.length > 0) {
      const osId = existe.rows[0].id;
      await client.query(
        'UPDATE ordens_servico SET status = $1, atualizado_em = NOW() WHERE id = $2',
        [statusOS, osId]
      );
      await _sincronizarParcelas(client, osId, vencimentos, forma_pagamento);
      return osId;
    }
  }

  const numero = os_numero || `FAT-${Date.now().toString().slice(-6)}`;

  const dup = await client.query('SELECT id FROM ordens_servico WHERE numero = $1', [numero]);
  if (dup.rows.length > 0) {
    await _sincronizarParcelas(client, dup.rows[0].id, vencimentos, forma_pagamento);
    return dup.rows[0].id;
  }

  const novaOS = await client.query(
    `INSERT INTO ordens_servico
       (numero, numero_os, cliente_nome, status,
        num_pedido_servico, num_pedido_compra,
        criado_em, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id`,
    [numero, numero, cliente_nome || '', statusOS,
     pedido_servico || null, pedido_peca || null]
  );
  const novaOsId = novaOS.rows[0].id;

  if (parseFloat(valor_servico) > 0) {
    await client.query(
      `INSERT INTO itens_servico (os_id, descricao, valor, quantidade)
       VALUES ($1, 'Serviços', $2, 1)`,
      [novaOsId, valor_servico]
    );
  }

  if (parseFloat(valor_peca) > 0) {
    await client.query(
      `INSERT INTO itens_pecas (os_id, descricao, quantidade, valor_unit)
       VALUES ($1, 'Peças e insumos', 1, $2)`,
      [novaOsId, valor_peca]
    );
  }

  await _sincronizarParcelas(client, novaOsId, vencimentos, forma_pagamento);
  return novaOsId;
}

async function _sincronizarParcelas(client, osId, vencimentos, forma_pagamento) {
  if (!Array.isArray(vencimentos) || vencimentos.length === 0) return;
  await client.query('DELETE FROM os_parcelas WHERE os_id = $1', [osId]);
  for (const v of vencimentos) {
    if (!v.data_vencimento) continue;
    await client.query(
      `INSERT INTO os_parcelas (os_id, data_vencimento, valor, forma)
       VALUES ($1, $2, $3, $4)`,
      [osId, v.data_vencimento, v.valor || 0, forma_pagamento || null]
    );
  }
}

const listarFaturamentos = async (req, res) => {
  const { data_inicio, data_fim, cliente, status, os_numero, nf_servico, nf_peca, pedido_servico, pedido_peca } = req.query;
  try {
    let query = `
      SELECT f.*,
        json_agg(
          json_build_object(
            'id', fv.id,
            'data_vencimento', fv.data_vencimento,
            'valor', fv.valor,
            'pago', fv.pago
          ) ORDER BY fv.data_vencimento
        ) FILTER (WHERE fv.id IS NOT NULL) as vencimentos
      FROM faturamentos f
      LEFT JOIN faturamento_vencimentos fv ON fv.faturamento_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (data_inicio)    { params.push(data_inicio);           query += ` AND f.data_faturamento >= $${params.length}`; }
    if (data_fim)       { params.push(data_fim);              query += ` AND f.data_faturamento <= $${params.length}`; }
    if (cliente)        { params.push(`%${cliente}%`);        query += ` AND f.cliente_nome ILIKE $${params.length}`; }
    if (status)         { params.push(status);                query += ` AND f.status = $${params.length}`; }
    if (os_numero)      { params.push(`%${os_numero}%`);      query += ` AND f.os_numero ILIKE $${params.length}`; }
    if (nf_servico)     { params.push(`%${nf_servico}%`);     query += ` AND f.nf_servico ILIKE $${params.length}`; }
    if (nf_peca)        { params.push(`%${nf_peca}%`);        query += ` AND f.nf_peca ILIKE $${params.length}`; }
    if (pedido_servico) { params.push(`%${pedido_servico}%`); query += ` AND f.pedido_servico ILIKE $${params.length}`; }
    if (pedido_peca)    { params.push(`%${pedido_peca}%`);    query += ` AND f.pedido_peca ILIKE $${params.length}`; }

    query += ' GROUP BY f.id ORDER BY f.data_faturamento DESC';

    const resultado = await pool.query(query, params);

    const totais = {
      total_servicos: resultado.rows.reduce((a, r) => a + parseFloat(r.valor_servico || 0), 0),
      total_pecas:    resultado.rows.reduce((a, r) => a + parseFloat(r.valor_peca    || 0), 0),
      total_geral:    resultado.rows.reduce((a, r) => a + parseFloat(r.valor_total   || 0), 0),
    };

    res.json({ faturamentos: resultado.rows, totais });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar faturamentos' });
  }
};

const criarFaturamento = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      os_id, os_numero, cliente_nome, data_faturamento,
      nf_servico, pedido_servico, valor_servico,
      nf_peca, pedido_peca, valor_peca,
      valor_total, qtd_parcelas, valor_parcela,
      banco, forma_pagamento, observacoes, vencimentos, status
    } = req.body;

    const statusFinal = status || 'autorizado';

    // Cria ou vincula OS correspondente
    const osIdVinculado = await vincularOuCriarOS(client, {
      os_id, os_numero, cliente_nome, status: statusFinal,
      valor_servico, valor_peca, pedido_servico, pedido_peca,
      vencimentos, forma_pagamento
    });

    const resultado = await client.query(
      `INSERT INTO faturamentos (
        os_id, os_numero, cliente_nome, data_faturamento,
        nf_servico, pedido_servico, valor_servico,
        nf_peca, pedido_peca, valor_peca,
        valor_total, qtd_parcelas, valor_parcela,
        banco, forma_pagamento, observacoes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [osIdVinculado, os_numero, cliente_nome, data_faturamento,
       nf_servico, pedido_servico, valor_servico || 0,
       nf_peca, pedido_peca, valor_peca || 0,
       valor_total || 0, qtd_parcelas || 1, valor_parcela || 0,
       banco, forma_pagamento, observacoes, statusFinal]
    );

    const faturamentoId = resultado.rows[0].id;

    if (vencimentos && vencimentos.length > 0) {
      for (const v of vencimentos) {
        await client.query(
          `INSERT INTO faturamento_vencimentos (faturamento_id, data_vencimento, valor)
           VALUES ($1, $2, $3)`,
          [faturamentoId, v.data_vencimento, v.valor]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar faturamento' });
  } finally {
    client.release();
  }
};

const atualizarFaturamento = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      nf_servico, pedido_servico, valor_servico,
      nf_peca, pedido_peca, valor_peca,
      valor_total, qtd_parcelas, valor_parcela,
      banco, forma_pagamento, observacoes, vencimentos,
      os_numero, cliente_nome, data_faturamento, status
    } = req.body;

    const resultado = await client.query(
      `UPDATE faturamentos SET
        os_numero        = $1,
        cliente_nome     = $2,
        data_faturamento = $3,
        nf_servico       = $4,
        pedido_servico   = $5,
        valor_servico    = $6,
        nf_peca          = $7,
        pedido_peca      = $8,
        valor_peca       = $9,
        valor_total      = $10,
        qtd_parcelas     = $11,
        valor_parcela    = $12,
        banco            = $13,
        forma_pagamento  = $14,
        observacoes      = $15,
        status           = $16
       WHERE id = $17 RETURNING *`,
      [os_numero    || null,
       cliente_nome || null,
       data_faturamento,
       nf_servico      || null,
       pedido_servico  || null,
       valor_servico   ?? 0,
       nf_peca         || null,
       pedido_peca     || null,
       valor_peca      ?? 0,
       valor_total     ?? 0,
       qtd_parcelas    || 1,
       valor_parcela   ?? 0,
       banco           || null,
       forma_pagamento || null,
       observacoes     || null,
       status          || 'autorizado',
       id]
    );

    if (vencimentos) {
      await client.query('DELETE FROM faturamento_vencimentos WHERE faturamento_id = $1', [id]);
      for (const v of vencimentos) {
        await client.query(
          `INSERT INTO faturamento_vencimentos (faturamento_id, data_vencimento, valor, pago)
           VALUES ($1, $2, $3, $4)`,
          [id, v.data_vencimento, v.valor, v.pago || false]
        );
      }
    }

    // Sincroniza OS vinculada: status, cliente e pedidos
    const statusOS = FAT_PARA_OS_STATUS[status || 'autorizado'];
    if (statusOS) {
      await client.query(
        `UPDATE ordens_servico
            SET status = $1,
                cliente_nome = COALESCE($2, cliente_nome),
                num_pedido_servico = COALESCE($3, num_pedido_servico),
                num_pedido_compra  = COALESCE($4, num_pedido_compra),
                atualizado_em = NOW()
          WHERE id = (SELECT os_id FROM faturamentos WHERE id = $5 AND os_id IS NOT NULL)`,
        [statusOS, cliente_nome || null, pedido_servico || null, pedido_peca || null, id]
      );
    }

    await client.query('COMMIT');
    res.json(resultado.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar faturamento' });
  } finally {
    client.release();
  }
};

const marcarVencimentoPago = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE faturamento_vencimentos SET pago = true WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao marcar vencimento como pago' });
  }
};

const deletarFaturamento = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM faturamentos WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir faturamento' });
  }
};

const STATUS_VALIDOS = ['autorizado', 'nf_emitida', 'cobranca_emitida', 'enviado', 'cancelado', 'rejeitado'];

const atualizarStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }
  try {
    await pool.query('UPDATE faturamentos SET status = $1 WHERE id = $2', [status, id]);
    // Sincroniza status da OS vinculada
    const statusOS = FAT_PARA_OS_STATUS[status];
    if (statusOS) {
      await pool.query(
        `UPDATE ordens_servico SET status = $1, atualizado_em = NOW()
         WHERE id = (SELECT os_id FROM faturamentos WHERE id = $2 AND os_id IS NOT NULL)`,
        [statusOS, id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
};

const atualizarStatusLote = async (req, res) => {
  const { ids, status } = req.body;
  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ erro: 'Nenhum registro selecionado' });
  }
  try {
    await pool.query(
      'UPDATE faturamentos SET status = $1 WHERE id = ANY($2::int[])',
      [status, ids]
    );
    // Sincroniza OS vinculadas
    const statusOS = FAT_PARA_OS_STATUS[status];
    if (statusOS) {
      await pool.query(
        `UPDATE ordens_servico SET status = $1, atualizado_em = NOW()
         WHERE id IN (SELECT os_id FROM faturamentos WHERE id = ANY($2::int[]) AND os_id IS NOT NULL)`,
        [statusOS, ids]
      );
    }
    res.json({ ok: true, atualizados: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar status em lote' });
  }
};

const gerarOSRetroativo = async (req, res) => {
  const pendentes = await pool.query(`
    SELECT id, os_numero, cliente_nome, status,
           valor_servico, valor_peca, pedido_servico, pedido_peca
    FROM faturamentos
    WHERE os_id IS NULL
    ORDER BY id
  `);

  if (pendentes.rows.length === 0) {
    return res.json({ mensagem: 'Nenhum faturamento sem OS vinculada.', gerados: 0 });
  }

  let gerados = 0;
  let vinculados = 0;
  const erros = [];

  for (const fat of pendentes.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const osId = await vincularOuCriarOS(client, {
        os_id:         null,
        os_numero:     fat.os_numero,
        cliente_nome:  fat.cliente_nome,
        status:        fat.status,
        valor_servico: fat.valor_servico,
        valor_peca:    fat.valor_peca,
        pedido_servico: fat.pedido_servico,
        pedido_peca:   fat.pedido_peca,
      });

      // Detecta se era vinculação (OS já existia) ou criação
      const jaExistia = fat.os_numero && (await client.query(
        'SELECT id FROM ordens_servico WHERE (numero = $1 OR numero_os = $1) AND id = $2',
        [fat.os_numero, osId]
      )).rows.length > 0;

      await client.query(
        'UPDATE faturamentos SET os_id = $1 WHERE id = $2',
        [osId, fat.id]
      );

      await client.query('COMMIT');
      jaExistia ? vinculados++ : gerados++;
    } catch (err) {
      await client.query('ROLLBACK');
      erros.push({ faturamento_id: fat.id, erro: err.message });
    } finally {
      client.release();
    }
  }

  res.json({
    mensagem: 'Geração retroativa concluída',
    gerados,
    vinculados,
    erros,
    total_processados: pendentes.rows.length,
  });
};

module.exports = { listarFaturamentos, criarFaturamento, atualizarFaturamento, marcarVencimentoPago, atualizarStatus, atualizarStatusLote, deletarFaturamento, gerarOSRetroativo };
