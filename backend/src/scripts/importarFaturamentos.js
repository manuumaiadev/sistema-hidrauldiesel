const pool = require('../config/database');
const xlsx = require('xlsx');
const path = require('path');

const importar = async () => {
  try {
    const filePath = path.join(__dirname, '../../Controle_Faturamento.xlsm');
    console.log(`📂 Lendo arquivo: ${filePath}`);

    const workbook = xlsx.readFile(filePath);

    console.log('📋 Abas encontradas:', workbook.SheetNames);

    const sheetName = workbook.SheetNames.find(n =>
      n.toLowerCase().includes('faturamento')
    ) || workbook.SheetNames[0];

    console.log(`📄 Usando aba: "${sheetName}"`);

    const sheet = workbook.Sheets[sheetName];
    const dados = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // Mostra as primeiras 3 linhas para diagnóstico
    console.log('\n🔍 Primeiras 3 linhas do arquivo:');
    dados.slice(0, 3).forEach((linha, i) => console.log(`  Linha ${i}:`, linha));
    console.log('');

    // Detecta onde começa os dados (pula linhas de cabeçalho vazias)
    let inicio = 0;
    for (let i = 0; i < dados.length; i++) {
      if (dados[i] && dados[i][0] && !isNaN(dados[i][0])) {
        inicio = i;
        break;
      }
    }
    console.log(`▶️  Dados começam na linha ${inicio}\n`);

    const linhas = dados.slice(inicio);

    let importados = 0;
    let ignorados  = 0;

    for (const linha of linhas) {
      // Linha vazia ou sem data
      if (!linha || !linha[0]) { ignorados++; continue; }

      // Converte data serial do Excel para Date
      const dataSerial     = linha[0];
      const dataFaturamento = dataSerial && !isNaN(dataSerial)
        ? new Date(Math.round((dataSerial - 25569) * 86400 * 1000)).toISOString().slice(0, 10)
        : null;

      if (!dataFaturamento) { ignorados++; continue; }

      const clienteNome    = linha[1]  ? String(linha[1]).trim()  : null;
      const osNumero       = linha[2]  ? String(linha[2]).trim()  : null;
      const pedidoServico  = linha[3]  ? String(linha[3]).trim()  : null;
      const nfServico      = linha[4]  ? String(linha[4]).trim()  : null;
      const valorServico   = parseFloat(linha[5])  || 0;
      const pedidoPeca     = linha[6]  ? String(linha[6]).trim()  : null;
      const nfPeca         = linha[7]  ? String(linha[7]).trim()  : null;
      const valorPeca      = parseFloat(linha[8])  || 0;
      const valorTotal     = parseFloat(linha[9])  || (valorServico + valorPeca);
      const qtdParcelas    = parseInt(linha[10])   || 1;
      const valorParcela   = parseFloat(linha[11]) || 0;
      const banco          = linha[12] ? String(linha[12]).trim() : null;
      const vencimentoRaw  = linha[13];
      const observacoes    = linha[14] ? String(linha[14]).trim() : null;

      // Converte vencimento
      let dataVencimento = null;
      if (vencimentoRaw && !isNaN(vencimentoRaw)) {
        dataVencimento = new Date(Math.round((vencimentoRaw - 25569) * 86400 * 1000))
          .toISOString().slice(0, 10);
      }

      const resultado = await pool.query(
        `INSERT INTO faturamentos (
          os_numero, cliente_nome, data_faturamento,
          nf_servico, pedido_servico, valor_servico,
          nf_peca, pedido_peca, valor_peca,
          valor_total, qtd_parcelas, valor_parcela,
          banco, observacoes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id`,
        [osNumero, clienteNome, dataFaturamento,
         nfServico, pedidoServico, valorServico,
         nfPeca, pedidoPeca, valorPeca,
         valorTotal, qtdParcelas, valorParcela,
         banco, observacoes]
      );

      if (dataVencimento) {
        await pool.query(
          `INSERT INTO faturamento_vencimentos (faturamento_id, data_vencimento, valor)
           VALUES ($1, $2, $3)`,
          [resultado.rows[0].id, dataVencimento, valorParcela || valorTotal]
        );
      }

      importados++;
      console.log(`✅ [${importados}] ${clienteNome || '(sem nome)'} — OS ${osNumero || '—'} — ${dataFaturamento}`);
    }

    console.log(`\n🎉 Concluído! ${importados} registros importados, ${ignorados} ignorados.`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro durante a importação:', err.message);
    if (err.code === 'ENOENT') {
      console.error('   → Arquivo não encontrado. Coloque o Controle_Faturamento.xlsm em: backend/Controle_Faturamento.xlsm');
    }
    process.exit(1);
  }
};

importar();
