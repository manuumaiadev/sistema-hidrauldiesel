const pool = require('./database');

const createTables = async () => {
  try {

    // Usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        email VARCHAR(200) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        perfil VARCHAR(20) NOT NULL DEFAULT 'mecanico',
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Mecânicos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mecanicos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        nome VARCHAR(200) NOT NULL,
        telefone VARCHAR(20),
        percentual_comissao DECIMAL(5,2) DEFAULT 0,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Veículos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(10) UNIQUE NOT NULL,
        modelo VARCHAR(200),
        ano VARCHAR(10),
        cor VARCHAR(50),
        chassi VARCHAR(50),
        motor VARCHAR(100),
        cliente_id INTEGER,
        cliente_nome VARCHAR(200),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ordens de Serviço
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) UNIQUE NOT NULL,
        cliente_id INTEGER,
        cliente_nome VARCHAR(200),
        veiculo_id INTEGER REFERENCES veiculos(id),
        status VARCHAR(30) NOT NULL DEFAULT 'orcamento',
        queixa TEXT,
        obs_tecnica TEXT,
        km_atual VARCHAR(20),
        bling_pedido_id INTEGER,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Itens de Serviço
    await pool.query(`
      CREATE TABLE IF NOT EXISTS itens_servico (
        id SERIAL PRIMARY KEY,
        os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
        bling_produto_id INTEGER,
        descricao VARCHAR(200) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        mecanico_id INTEGER REFERENCES mecanicos(id),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Itens de Peças
    await pool.query(`
      CREATE TABLE IF NOT EXISTS itens_pecas (
        id SERIAL PRIMARY KEY,
        os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
        bling_produto_id INTEGER,
        descricao VARCHAR(200) NOT NULL,
        quantidade DECIMAL(10,3) NOT NULL,
        valor_unit DECIMAL(10,2) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Comissões
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comissoes (
        id SERIAL PRIMARY KEY,
        mecanico_id INTEGER REFERENCES mecanicos(id),
        os_id INTEGER REFERENCES ordens_servico(id),
        item_servico_id INTEGER REFERENCES itens_servico(id),
        valor_servico DECIMAL(10,2) NOT NULL,
        percentual DECIMAL(5,2) NOT NULL,
        valor_comissao DECIMAL(10,2) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Histórico de alterações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        usuario_nome VARCHAR(200),
        tabela VARCHAR(50) NOT NULL,
        registro_id INTEGER NOT NULL,
        acao VARCHAR(20) NOT NULL,
        dados_anteriores JSONB,
        dados_novos JSONB,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Adiciona quantidade em itens_servico (idempotente)
    await pool.query(`
      ALTER TABLE itens_servico
      ADD COLUMN IF NOT EXISTS quantidade DECIMAL(10,3) NOT NULL DEFAULT 1;
    `);

    // Bling IDs podem ser > 2 bilhões — converte para BIGINT (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ALTER COLUMN bling_pedido_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ALTER COLUMN cliente_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE veiculos ALTER COLUMN cliente_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE itens_servico ALTER COLUMN bling_produto_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE itens_pecas ALTER COLUMN bling_produto_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    // Configurações do sistema (tokens OAuth, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Adiciona checklist em ordens_servico (idempotente)
    await pool.query(`
      ALTER TABLE ordens_servico
      ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}';
    `);

    // Pedido de Compra e Pedido de Serviço (idempotente)
    await pool.query(`
      ALTER TABLE ordens_servico
      ADD COLUMN IF NOT EXISTS num_pedido_compra VARCHAR(100),
      ADD COLUMN IF NOT EXISTS num_pedido_servico VARCHAR(100);
    `);

    // km_atual e frota (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN km_atual VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN frota VARCHAR(50);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Funcionários e folha de pagamento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'informal',
        cargo VARCHAR(100),
        salario_oficial DECIMAL(10,2) DEFAULT 0,
        salario_adicional DECIMAL(10,2) DEFAULT 0,
        adiantamento_fixo DECIMAL(10,2) DEFAULT 0,
        vale_transporte DECIMAL(10,2) DEFAULT 0,
        percentual_inss DECIMAL(5,2) DEFAULT 0,
        data_admissao DATE,
        ativo BOOLEAN DEFAULT true,
        mecanico_id INTEGER REFERENCES mecanicos(id),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS folha_pagamento (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        tipo VARCHAR(20) NOT NULL,
        data_pagamento DATE NOT NULL,
        salario_oficial DECIMAL(10,2) DEFAULT 0,
        salario_adicional DECIMAL(10,2) DEFAULT 0,
        desconto_inss DECIMAL(10,2) DEFAULT 0,
        desconto_adiantamento DECIMAL(10,2) DEFAULT 0,
        desconto_faltas DECIMAL(10,2) DEFAULT 0,
        outros_descontos DECIMAL(10,2) DEFAULT 0,
        outros_acrescimos DECIMAL(10,2) DEFAULT 0,
        valor_pago DECIMAL(10,2) DEFAULT 0,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vale_transporte (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data_pagamento DATE NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ponto (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data DATE NOT NULL,
        presente BOOLEAN DEFAULT true,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Anexos de fotos por OS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anexos (
        id SERIAL PRIMARY KEY,
        os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
        nome_arquivo VARCHAR(255) NOT NULL,
        nome_original VARCHAR(255),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Constraint única no vale transporte
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE vale_transporte ADD CONSTRAINT vt_funcionario_data_unique UNIQUE (funcionario_id, data_pagamento);
      EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN duplicate_table  THEN NULL;
      END $$;
    `);

    // Constraint única na folha
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE folha_pagamento ADD CONSTRAINT folha_funcionario_data_unique UNIQUE (funcionario_id, data_pagamento);
      EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN duplicate_table  THEN NULL;
      END $$;
    `);

    // Ponto: adiciona status e constraint única
    await pool.query(`ALTER TABLE ponto ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'presente';`);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ponto ADD CONSTRAINT ponto_funcionario_data_unique UNIQUE (funcionario_id, data);
      EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN duplicate_table  THEN NULL;
      END $$;
    `);

    // Colunas extras em funcionarios (idempotente)
    await pool.query(`
      ALTER TABLE funcionarios
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ativo',
      ADD COLUMN IF NOT EXISTS cargo_tipo VARCHAR(20) DEFAULT 'outro',
      ADD COLUMN IF NOT EXISTS percentual_comissao DECIMAL(5,2) DEFAULT 0;
    `);

    // Adiantamentos avulsos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS adiantamentos (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        valor DECIMAL(10,2) NOT NULL,
        data DATE NOT NULL,
        desconto_em VARCHAR(20),
        descontado BOOLEAN DEFAULT false,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Férias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ferias (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Rescisão
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rescisao (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data_rescisao DATE NOT NULL,
        valor_saldo DECIMAL(10,2) DEFAULT 0,
        valor_ferias_prop DECIMAL(10,2) DEFAULT 0,
        valor_decimo_terceiro DECIMAL(10,2) DEFAULT 0,
        valor_fgts DECIMAL(10,2) DEFAULT 0,
        outros_valores DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(10,2) DEFAULT 0,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE rescisao ADD COLUMN IF NOT EXISTS num_parcelas INTEGER DEFAULT 1;
    `);
    await pool.query(`
      ALTER TABLE rescisao ADD COLUMN IF NOT EXISTS valor_pago DECIMAL(10,2) DEFAULT 0;
    `);
    await pool.query(`
      ALTER TABLE rescisao ADD COLUMN IF NOT EXISTS saldo_restante DECIMAL(10,2) DEFAULT 0;
    `);
    await pool.query(`
      ALTER TABLE rescisao ADD COLUMN IF NOT EXISTS data_pagamento DATE;
    `);

    // Décimo terceiro — parcelas antecipadas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decimo_terceiro (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        ano INTEGER NOT NULL,
        data_pagamento DATE NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Empresas vinculadas ao vendedor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendedor_empresas (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        cliente_id BIGINT NOT NULL,
        cliente_nome VARCHAR(200) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Corrigir tipo da coluna caso a tabela já exista com INTEGER
    await pool.query(`
      ALTER TABLE vendedor_empresas ALTER COLUMN cliente_id TYPE BIGINT
    `).catch(() => {}); // ignora se já for BIGINT

    // Comissões do vendedor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comissoes_vendedor (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        os_id INTEGER REFERENCES ordens_servico(id),
        cliente_nome VARCHAR(200),
        valor_os DECIMAL(10,2) NOT NULL,
        percentual DECIMAL(5,2) NOT NULL,
        valor_comissao DECIMAL(10,2) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Número OS (aprovada em diante) — sequência separada (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN numero_os VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Dados de contato do cliente na OS (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN cliente_cpf_cnpj VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN cliente_telefone VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN cliente_email VARCHAR(100);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Comentário importante no funcionário (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE funcionarios ADD COLUMN comentario_importante TEXT;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Reseta adiantamentos marcados como descontados cuja folha correspondente não existe mais
    await pool.query(`
      UPDATE adiantamentos a
      SET descontado = false
      WHERE a.descontado = true
      AND NOT EXISTS (
        SELECT 1 FROM folha_pagamento fp
        WHERE fp.funcionario_id = a.funcionario_id
        AND TO_CHAR(fp.data_pagamento, 'DD/MM/YYYY') = a.desconto_em
      )
    `);

    // Vale Alimentação
    await pool.query(`
      ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS vale_alimentacao DECIMAL(10,2) DEFAULT 0;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vale_alimentacao (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data_pagamento DATE NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE vale_alimentacao ADD CONSTRAINT va_funcionario_data_unique UNIQUE (funcionario_id, data_pagamento);
      EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN duplicate_table  THEN NULL;
      END $$;
    `);

    // Faturamento
    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50)`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS faturamentos (
        id SERIAL PRIMARY KEY,
        os_id INTEGER REFERENCES ordens_servico(id),
        os_numero VARCHAR(20),
        cliente_nome VARCHAR(200),
        data_faturamento DATE NOT NULL,
        nf_servico VARCHAR(50),
        pedido_servico VARCHAR(50),
        valor_servico DECIMAL(10,2) DEFAULT 0,
        nf_peca VARCHAR(50),
        pedido_peca VARCHAR(50),
        valor_peca DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(10,2) DEFAULT 0,
        qtd_parcelas INTEGER DEFAULT 1,
        valor_parcela DECIMAL(10,2) DEFAULT 0,
        banco VARCHAR(100),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS faturamento_vencimentos (
        id SERIAL PRIMARY KEY,
        faturamento_id INTEGER REFERENCES faturamentos(id) ON DELETE CASCADE,
        data_vencimento DATE,
        valor DECIMAL(10,2) DEFAULT 0,
        pago BOOLEAN DEFAULT false,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'autorizado'`).catch(() => {});
    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) DEFAULT 'Venda de Serviços'`).catch(() => {});

    // Renomeia status legado caso exista
    await pool.query(`UPDATE faturamentos SET status = 'cobranca_emitida' WHERE status = 'boleto_emitido'`).catch(() => {});

    // Pagamento por OS — condição e categoria
    await pool.query(`ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS condicao_pagamento VARCHAR(200)`).catch(() => {});
    await pool.query(`ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS categoria_pagamento VARCHAR(100)`).catch(() => {});

    // Parcelas de pagamento da OS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS os_parcelas (
        id SERIAL PRIMARY KEY,
        os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
        dias INTEGER,
        data_vencimento DATE,
        valor DECIMAL(10,2) DEFAULT 0,
        forma VARCHAR(50),
        observacao TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // CNPJ do cliente no faturamento
    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS cliente_cnpj VARCHAR(20)`).catch(() => {});

    // Campos de observação e condição no faturamento
    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS obs_nfs            TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS obs_nf             TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS obs_pagamento      TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS condicao_pagamento VARCHAR(200)`).catch(() => {});

    // Copia vencimentos de faturamentos para os_parcelas das OS já vinculadas (idempotente)
    await pool.query(`
      INSERT INTO os_parcelas (os_id, dias, data_vencimento, valor, forma, observacao)
      SELECT
        f.os_id,
        NULL AS dias,
        fv.data_vencimento,
        fv.valor,
        f.forma_pagamento AS forma,
        NULL AS observacao
      FROM faturamento_vencimentos fv
      JOIN faturamentos f ON f.id = fv.faturamento_id
      WHERE f.os_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM os_parcelas op
          WHERE op.os_id = f.os_id
            AND op.data_vencimento = fv.data_vencimento
            AND op.valor = fv.valor
        )
    `).catch(() => {});

    // data_faturamento = data de emissão da NF, pode ser nula em registros importados
    await pool.query(`ALTER TABLE faturamentos ALTER COLUMN data_faturamento DROP NOT NULL`).catch(() => {});

    // Desconto fixo mensal descontado na folha do dia 05
    await pool.query(`ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS adiantamento_dia05 DECIMAL(10,2) DEFAULT 0`);

    // Data de pagamento das férias (independente do período de gozo)
    await pool.query(`ALTER TABLE ferias ADD COLUMN IF NOT EXISTS data_pagamento DATE`);

    // Justificativa de falta justificada no ponto
    await pool.query(`ALTER TABLE ponto ADD COLUMN IF NOT EXISTS justificativa TEXT`);

    // Período de férias agora é opcional — só pagamento é obrigatório
    await pool.query(`ALTER TABLE ferias ALTER COLUMN data_inicio DROP NOT NULL`).catch(() => {});
    await pool.query(`ALTER TABLE ferias ALTER COLUMN data_fim    DROP NOT NULL`).catch(() => {});

    // Detalhe das faltas geradas na folha dia 05 (datas e status)
    await pool.query(`ALTER TABLE folha_pagamento ADD COLUMN IF NOT EXISTS faltas_detalhes JSONB DEFAULT '[]'::jsonb`);

    // Backfill: preenche faltas_detalhes para folhas dia 05 geradas antes dessa coluna existir
    await pool.query(`
      UPDATE folha_pagamento fp
      SET faltas_detalhes = (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'data',   TO_CHAR(p.data, 'DD/MM/YYYY'),
              'status', p.status
            )
            ORDER BY p.data
          ),
          '[]'::jsonb
        )
        FROM ponto p
        WHERE p.funcionario_id = fp.funcionario_id
          AND p.status IN ('falta', 'meia_falta')
          AND EXTRACT(DOW FROM p.data) BETWEEN 1 AND 5
          AND EXTRACT(MONTH FROM p.data) = EXTRACT(MONTH FROM fp.data_pagamento - INTERVAL '1 month')
          AND EXTRACT(YEAR  FROM p.data) = EXTRACT(YEAR  FROM fp.data_pagamento - INTERVAL '1 month')
      )
      WHERE EXTRACT(DAY FROM fp.data_pagamento) = 5
        AND (fp.faltas_detalhes IS NULL OR fp.faltas_detalhes = '[]'::jsonb)
    `).catch(() => {});

    // Configurações do sistema (chave-valor)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave   VARCHAR(100) PRIMARY KEY,
        valor   TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Adiciona colunas extras caso a tabela já existia sem elas
    await pool.query(`ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS tipo       VARCHAR(20)  DEFAULT 'texto'`);
    await pool.query(`ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS grupo      VARCHAR(50)  DEFAULT 'geral'`);
    await pool.query(`ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS label      VARCHAR(150)`);
    await pool.query(`ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP    DEFAULT NOW()`).catch(() => {});

    // Insere defaults que ainda não existem
    await pool.query(`
      INSERT INTO configuracoes (chave, valor, tipo, grupo, label) VALUES
        ('empresa_nome',                  'Hidrauldiesel',  'texto',  'empresa',     'Razão Social'),
        ('empresa_cnpj',                  '',               'texto',  'empresa',     'CNPJ'),
        ('empresa_endereco',              '',               'texto',  'empresa',     'Endereço'),
        ('empresa_cidade',                '',               'texto',  'empresa',     'Cidade / UF'),
        ('empresa_site',                  '',               'texto',  'empresa',     'Site'),
        ('empresa_whatsapp_comercial',    '',                  'texto', 'empresa', 'WhatsApp Comercial'),
        ('empresa_email_comercial',       '',                  'texto', 'empresa', 'E-mail Comercial'),
        ('empresa_whatsapp_financeiro',   '',                  'texto', 'empresa', 'WhatsApp Financeiro'),
        ('empresa_email_financeiro',      '',                  'texto', 'empresa', 'E-mail Financeiro'),
        ('setor_comercial_equipe',        'Equipe Comercial',  'texto', 'empresa', 'Nome da equipe Comercial'),
        ('setor_comercial_telefones',     '',                  'texto', 'empresa', 'Telefones Comercial'),
        ('setor_financeiro_equipe',       'Equipe Financeira', 'texto', 'empresa', 'Nome da equipe Financeiro'),
        ('setor_financeiro_telefones',    '',                  'texto', 'empresa', 'Telefones Financeiro'),
        ('email_comercial_host',          'smtp.gmail.com', 'texto',  'email_comercial', 'Servidor SMTP'),
        ('email_comercial_port',          '587',            'numero', 'email_comercial', 'Porta'),
        ('email_comercial_secure',        'false',          'bool',   'email_comercial', 'SSL/TLS'),
        ('email_comercial_user',          '',               'texto',  'email_comercial', 'E-mail de envio'),
        ('email_comercial_pass',          '',               'senha',  'email_comercial', 'Senha de App'),
        ('email_comercial_remetente',     'Hidrauldiesel Comercial', 'texto', 'email_comercial', 'Nome do remetente'),
        ('email_financeiro_host',         'smtp.gmail.com', 'texto',  'email_financeiro', 'Servidor SMTP'),
        ('email_financeiro_port',         '587',            'numero', 'email_financeiro', 'Porta'),
        ('email_financeiro_secure',       'false',          'bool',   'email_financeiro', 'SSL/TLS'),
        ('email_financeiro_user',         '',               'texto',  'email_financeiro', 'E-mail de envio'),
        ('email_financeiro_pass',         '',               'senha',  'email_financeiro', 'Senha de App'),
        ('email_financeiro_remetente',    'Hidrauldiesel Financeiro', 'texto', 'email_financeiro', 'Nome do remetente'),
        ('banco_titular',  '', 'texto', 'banco', 'Titular da conta'),
        ('banco_nome',     '', 'texto', 'banco', 'Nome do banco'),
        ('banco_agencia',  '', 'texto', 'banco', 'Agência'),
        ('banco_conta',    '', 'texto', 'banco', 'Conta Corrente'),
        ('banco_pix',      '', 'texto', 'banco', 'Chave PIX')
      ON CONFLICT (chave) DO NOTHING;
    `);

    // E-mail do cliente no faturamento
    await pool.query(`ALTER TABLE faturamentos ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(200)`);

    // Histórico de envios ao cliente
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faturamento_envios (
        id             SERIAL PRIMARY KEY,
        faturamento_id INTEGER REFERENCES faturamentos(id) ON DELETE CASCADE,
        enviado_em     TIMESTAMP DEFAULT NOW(),
        canal          VARCHAR(50),
        destinatarios  TEXT,
        assunto        VARCHAR(500),
        documentos     TEXT,
        enviado_por    VARCHAR(200)
      );
    `);

    // Anexos de faturamento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faturamento_anexos (
        id             SERIAL PRIMARY KEY,
        faturamento_id INTEGER REFERENCES faturamentos(id) ON DELETE CASCADE,
        nome_original  VARCHAR(255) NOT NULL,
        nome_arquivo   VARCHAR(255) NOT NULL,
        mimetype       VARCHAR(100),
        tamanho        INTEGER,
        tipo_doc       VARCHAR(50) DEFAULT 'outro',
        criado_em      TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Tabelas criadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao criar tabelas:', err.message);
  }
};

createTables();
